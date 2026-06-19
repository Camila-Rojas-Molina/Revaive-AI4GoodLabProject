import sounddevice as sd
import soundfile as sf
import numpy as np
import tempfile
import os
import subprocess
import sys
import time
import requests
from datetime import datetime, timedelta
from whisper_service import transcribe_audio
from gpt_service import get_response
from elevenlabs_service import text_to_speech
from patient_service import load_patient
from cognitive_scorer import Turn, score_session, session_to_dict
from distress_detector import check_distress

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'cst'))
from cst.cst_manager import get_prompts, get_difficulty

def fetch_selected_domains(patient_id: str) -> list:
    """Return the nurse-configured domain list from Supabase, or [] to run all domains."""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        if not url or not key:
            return []
        client = create_client(url, key)
        result = client.table("patients").select("selected_domains").eq("id", patient_id).single().execute()
        domains = result.data.get("selected_domains") if result.data else None
        return domains if domains else []
    except Exception as e:
        print(f"Warning: could not fetch selected_domains from Supabase: {e}")
        return []


SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.050  # raised slightly so brief breath pauses don't trigger early cutoff
SILENCE_DURATION = 0.5       # wait 0.5 seconds of quiet before treating it as end of turn


def record_until_silence():
    print("Listening...")
    audio_chunks = []
    silent_chunks = 0
    chunks_per_second = 10
    silence_limit = SILENCE_DURATION * chunks_per_second

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='float32') as stream:
        while True:
            chunk, _ = stream.read(SAMPLE_RATE // chunks_per_second)
            audio_chunks.append(chunk)
            volume = np.abs(chunk).mean()
            if volume < SILENCE_THRESHOLD:
                silent_chunks += 1
            else:
                silent_chunks = 0
            if silent_chunks >= silence_limit and len(audio_chunks) > chunks_per_second:
                break

    audio = np.concatenate(audio_chunks)
    return audio


def save_audio(audio):
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, audio, SAMPLE_RATE)
    return tmp.name

def post_session_to_api(
    patient_id: str,
    scored,
    duration_seconds: int,
    theme: str,
    difficulty: str,
    full_transcript: str,
    flag_escalate: bool = False,
):
    api_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    d = session_to_dict(scored)

    payload = {
        "patient_id": patient_id,
        "transcript": full_transcript,
        "duration_seconds": duration_seconds,
        "theme": theme,
        "difficulty": difficulty,
        "cognitive_score": d["cognitive_recovery_index"],
        "flag_escalate": flag_escalate,
        "component_scores": d["component_scores"],
        "features": {
            "speech_rate_wpm":  d["features"]["speech_rate_wpm"],
            "type_token_ratio": d["features"]["type_token_ratio"],
            "recall_accuracy":  d["features"]["entity_recall_rate"],
            "coherence_score":  d["features"]["coherence_score"],
            "avg_response_latency_s": d["features"]["avg_response_latency_s"],
            "avg_word_length":        d["features"]["avg_word_length"],
        },
    }

    try:
        response = requests.post(f"{api_url}/sessions", json=payload)
        data = response.json()
        score = data.get('cognitive_score', d["cognitive_recovery_index"])
        flag_note = " — NURSE ALERTED (distress detected)" if flag_escalate else ""
        print(f"\nSession logged. Cognitive score: {score}/100{flag_note}")
        if d["flag_for_review"]:
            print("⚠️  Score dropped significantly — flagged for nurse review.")
    except Exception as e:
        print(f"Warning: could not post session to API: {e}")


def run_conversation(patient_id: str):
    patient_profile = load_patient(patient_id)
    print(f"Loaded profile: {patient_profile}")

    # Fetch nurse-selected domains before building the system prompt.
    # An empty list means the nurse made no selection — fall back to all domains.
    selected_domains = fetch_selected_domains(patient_id)
    cognitive_score = patient_profile.get("last_cri") or 50
    theme, difficulty, _ = get_prompts(cognitive_score, selected_domains=selected_domains)
    patient_profile["selected_domains"] = selected_domains

    print("CogBridge is ready. Start speaking...")

    conversation_history = []
    transcript_turns: list[Turn] = []  # structured turns for scoring
    plain_turns: list[str] = []        # human-readable transcript for the DB
    session_base = datetime.utcnow()   # anchor for Whisper's relative timestamps
    start_time = time.time()
    elapsed_seconds = 0.0              # running offset so timestamps stay monotonic
    flag_escalate = False

    while True:
        # ── Record patient audio ──────────────────────────────────────────
        record_start = datetime.utcnow()
        audio = record_until_silence()
        record_end = datetime.utcnow()
        audio_path = save_audio(audio)

        print("Processing...")
        result = transcribe_audio(audio_path)
        os.unlink(audio_path)

        # Audio confidence gate — garbled or muffled recording
        if result is None:
            print("Audio unclear, listening again...")
            continue

        patient_text = result["text"]
        if not patient_text.strip():
            print("Didn't catch that, listening again...")
            continue

        # Whisper returns timestamps relative to the clip start.
        # We offset them by elapsed_seconds so they're relative to
        # the session start instead.
        clip_duration = (record_end - record_start).total_seconds()
        seg_start = elapsed_seconds + result["start"]
        seg_end   = elapsed_seconds + result["end"]
        elapsed_seconds += clip_duration

        print(f"You said: {patient_text}")
        plain_turns.append(f"Patient: {patient_text}")

        # Distress detection — runs before AI responds
        is_distress, matched = check_distress(patient_text)
        if is_distress:
            print(f"Distress detected: '{matched}' — flagging nurse and ending session.")
            closing = "I want to make sure you're okay — I'll let your nurse know right away."
            audio_file = text_to_speech(closing)
            subprocess.run(["afplay", audio_file])
            os.unlink(audio_file)
            plain_turns.append(f"Revaive: {closing}")
            flag_escalate = True
            break

        # ── Build patient Turn ────────────────────────────────────────────
        transcript_turns.append(Turn(
            speaker="patient",
            text=patient_text,
            timestamp_start=session_base + timedelta(seconds=seg_start),
            timestamp_end=session_base + timedelta(seconds=seg_end),
        ))

        # ── GPT response ──────────────────────────────────────────────────
        conversation_history.append({"role": "user", "content": patient_text})
        bot_start = datetime.utcnow()
        response_text = get_response(patient_text, conversation_history[:-1], patient_profile)
        bot_end = datetime.utcnow()
        conversation_history.append({"role": "assistant", "content": response_text})

        plain_turns.append(f"CogBridge: {response_text}")

        # ── Build bot Turn ────────────────────────────────────────────────
        # entities_in_prompt: names or places the bot explicitly mentions
        # that the patient should recall later in the session.
        # These are left empty for now — populate from CST theme config
        # once that's wired up (e.g. orientation tab might inject ["Monday", "June"]).
        transcript_turns.append(Turn(
            speaker="bot",
            text=response_text,
            timestamp_start=bot_start,
            timestamp_end=bot_end,
            entities_in_prompt=[],
        ))

        print(f"CogBridge: {response_text}")
        audio_file = text_to_speech(response_text)
        subprocess.run(["afplay", audio_file])
        os.unlink(audio_file)

        if any(word in patient_text.lower() for word in ["goodbye", "bye", "stop", "exit"]):
            print("Session ended.")
            break

    # ── Score the session ─────────────────────────────────────────────────
    duration_seconds = int(time.time() - start_time)
    session_id = f"{patient_id}_{int(start_time)}"

    # baseline_cri: the patient's CRI from their last session, used to
    # detect significant drops and trigger the nurse alert flag.
    # load_patient should return this from the DB; None on first session.
    baseline_cri = patient_profile.get("last_cri")

    scored = score_session(
        transcript_turns,
        patient_id=patient_id,
        session_id=session_id,
        baseline_cri=baseline_cri,
    )

    full_transcript = "\n".join(plain_turns)

    post_session_to_api(
        patient_id=patient_id,
        scored=scored,
        duration_seconds=duration_seconds,
        theme=theme,
        difficulty=difficulty,
        full_transcript=full_transcript,
        flag_escalate=flag_escalate,
    )

if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # python-dotenv not installed; fall back to already-exported env vars

    patient_id = os.getenv("PATIENT_ID")
    if not patient_id:
        print("Error: PATIENT_ID is not set. Add PATIENT_ID=<uuid> to your .env file and retry.")
        sys.exit(1)

    run_conversation(patient_id)