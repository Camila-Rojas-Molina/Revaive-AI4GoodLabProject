import sounddevice as sd
import soundfile as sf
import numpy as np
import tempfile
import os
import subprocess
import sys
import time
import requests
from whisper_service import transcribe_audio
from gpt_service import get_response
from elevenlabs_service import text_to_speech
from patient_service import load_patient
from distress_detector import check_distress

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'cst'))
from cst.cst_manager import get_theme_by_score, get_difficulty

SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.015  # raised slightly so brief breath pauses don't trigger early cutoff
SILENCE_DURATION = 3       # wait 3 seconds of quiet before treating it as end of turn

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

def post_session_to_api(patient_id: str, transcript: str, duration_seconds: int,
                        theme: str, difficulty: str, flag_escalate: bool = False):
    api_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    payload = {
        "patient_id": patient_id,
        "transcript": transcript,
        "duration_seconds": duration_seconds,
        "theme": theme,
        "difficulty": difficulty,
        "flag_escalate": flag_escalate,
    }
    try:
        response = requests.post(f"{api_url}/sessions", json=payload)
        data = response.json()
        score = data.get('cognitive_score', 'N/A')
        flag_note = " — NURSE ALERTED (distress detected)" if flag_escalate else ""
        print(f"\nSession logged. Cognitive score: {score}/100{flag_note}")
    except Exception as e:
        print(f"Warning: could not post session to API: {e}")


def run_conversation(patient_id: str):
    patient_profile = load_patient(patient_id)
    print(f"Loaded profile: {patient_profile}")
    print("Revaive is ready. Start speaking...")
    conversation_history = []
    full_turns: list[str] = []
    start_time = time.time()
    flag_escalate = False

    while True:
        audio = record_until_silence()
        audio_path = save_audio(audio)

        print("Processing...")
        result = transcribe_audio(audio_path)
        os.unlink(audio_path)

        # Audio confidence gate — garbled or muffled recording
        if result is None:
            print("Audio unclear, listening again...")
            continue

        transcript = result["text"]

        if not transcript.strip():
            print("Didn't catch that, listening again...")
            continue

        print(f"You said: {transcript}")
        full_turns.append(f"Patient: {transcript}")

        # Distress detection — runs before AI responds
        is_distress, matched = check_distress(transcript)
        if is_distress:
            print(f"Distress detected: '{matched}' — flagging nurse and ending session.")
            closing = "I want to make sure you're okay — I'll let your nurse know right away."
            audio_file = text_to_speech(closing)
            subprocess.run(["afplay", audio_file])
            os.unlink(audio_file)
            full_turns.append(f"Revaive: {closing}")
            flag_escalate = True
            break

        conversation_history.append({"role": "user", "content": transcript})
        response = get_response(transcript, conversation_history[:-1], patient_profile)
        conversation_history.append({"role": "assistant", "content": response})
        full_turns.append(f"Revaive: {response}")

        print(f"Revaive: {response}")

        audio_file = text_to_speech(response)
        subprocess.run(["afplay", audio_file])
        os.unlink(audio_file)

        if any(word in transcript.lower() for word in ["goodbye", "bye", "stop", "exit"]):
            print("Session ended.")
            break

    duration_seconds = int(time.time() - start_time)
    full_transcript = "\n".join(full_turns)
    theme = get_theme_by_score(50)
    difficulty = get_difficulty(50)
    post_session_to_api(patient_id, full_transcript, duration_seconds, theme, difficulty, flag_escalate)

if __name__ == "__main__":
    run_conversation("patient_001")