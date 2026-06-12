import os
import sys
import json
import tempfile
import base64
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from supabase import create_client
from datetime import datetime, timedelta

sys.path.append(os.path.join(os.path.dirname(__file__), "../../Pillar2/backend"))

# Ensure NLTK data is available before cognitive_scorer runs word_tokenize
try:
    import nltk
    for _pkg in ("punkt", "punkt_tab", "averaged_perceptron_tagger", "stopwords"):
        nltk.download(_pkg, quiet=True)
except Exception:
    pass

try:
    from whisper_service import transcribe_audio
    from gpt_service import get_response
    from elevenlabs_service import text_to_speech
    from cognitive_scorer import Turn, score_session, session_to_dict
    from distress_detector import check_distress
    from cst.cst_manager import get_difficulty, get_prompts
except ImportError as exc:
    raise ImportError(
        "Could not import voice backend services. Make sure Pillar2/backend is present and dependencies are installed."
    ) from exc

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def _tts_base64(text: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        tts_path = f.name
    audio_path = text_to_speech(text, output_path=tts_path)
    with open(audio_path, "rb") as f:
        result = base64.b64encode(f.read()).decode("utf-8")
    try:
        os.unlink(audio_path)
    except Exception:
        pass
    return result


@router.post("/voice/start")
async def start_voice_session(patient_id: str = Form(...)):
    """Generate the bot's opening message to kick off the session."""
    db = _db()
    result = db.table("patients").select("name, age, sex, surgery_type").eq("id", patient_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_profile = result.data[0]

    opening_text = get_response(
        "[The session is starting. Greet the patient warmly by name and ask your first question.]",
        [],
        patient_profile,
    )
    return JSONResponse({
        "assistant": opening_text,
        "audio": _tts_base64(opening_text),
        "audioFormat": "mp3",
    })


@router.post("/voice")
async def voice_turn(
    patient_id: str = Form(...),
    audio_file: UploadFile = File(...),
    conversation_history: str = Form(default="[]"),
):
    """Process one patient turn: transcribe → respond → return audio."""
    db = _db()
    result = db.table("patients").select("name, age, sex, surgery_type").eq("id", patient_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_profile = result.data[0]

    history = json.loads(conversation_history)

    tmp = tempfile.NamedTemporaryFile(
        suffix=os.path.splitext(audio_file.filename or "")[1] or ".webm",
        delete=False,
    )
    try:
        tmp.write(await audio_file.read())
        tmp.flush()
        transcription = transcribe_audio(tmp.name)
    finally:
        try:
            tmp.close()
            os.unlink(tmp.name)
        except Exception:
            pass

    if transcription is None:
        raise HTTPException(status_code=422, detail="Could not transcribe audio — please speak clearly and try again.")

    patient_text = transcription["text"]

    # Check for distress words on every patient turn
    is_distress, matched = check_distress(patient_text)
    flag_escalate = is_distress

    if is_distress:
        response_text = "I want to make sure you're okay — I'll let your nurse know right away."
    else:
        response_text = get_response(patient_text, history, patient_profile)

    return JSONResponse({
        "transcript": patient_text,
        "assistant": response_text,
        "audio": _tts_base64(response_text),
        "audioFormat": "mp3",
        "flag_escalate": flag_escalate,
    })


@router.post("/voice/end")
async def end_voice_session(
    patient_id: str = Form(...),
    conversation_history: str = Form(default="[]"),
    duration_seconds: int = Form(default=0),
):
    """Score and save the completed session transcript."""
    history = json.loads(conversation_history)

    WORDS_PER_SEC = 130 / 60
    LATENCY_S = 1.0

    session_base = datetime.utcnow() - timedelta(seconds=max(duration_seconds, 1))
    offset = 0.0
    turns: list[Turn] = []
    plain_turns: list[str] = []
    flag_escalate = False

    for entry in history:
        role = entry.get("role", "")
        text = entry.get("content", "").strip()
        if not text:
            continue
        word_count = len(text.split())
        turn_duration = max(word_count / WORDS_PER_SEC, 1.0)
        t_start = session_base + timedelta(seconds=offset)
        offset += LATENCY_S
        t_end = session_base + timedelta(seconds=offset + turn_duration)
        offset += turn_duration
        speaker = "patient" if role == "user" else "bot"
        turns.append(Turn(
            speaker=speaker, text=text,
            timestamp_start=t_start, timestamp_end=t_end,
            entities_in_prompt=[],
        ))
        plain_turns.append(f"{'Patient' if speaker == 'patient' else 'Revaive'}: {text}")
        if speaker == "patient":
            is_distress, _ = check_distress(text)
            if is_distress:
                flag_escalate = True

    full_transcript = "\n".join(plain_turns)
    session_id = f"{patient_id}_{int(time.time())}"
    db = _db()

    # Fetch previous score for baseline comparison
    baseline_cri = None
    try:
        prev = db.table("sessions").select("cognitive_score").eq("patient_id", patient_id).order("created_at", desc=True).limit(1).execute()
        if prev.data:
            baseline_cri = prev.data[0].get("cognitive_score")
    except Exception:
        pass

    # Score session — fall back to null score if NLP fails
    cognitive_score = None
    component_scores = None
    features_row = None
    flag_for_review = False
    try:
        scored = score_session(turns, patient_id=patient_id, session_id=session_id, baseline_cri=baseline_cri)
        d = session_to_dict(scored)
        cognitive_score = d["cognitive_recovery_index"]
        component_scores = d["component_scores"]
        flag_for_review = d["flag_for_review"]
        features_row = {
            "speech_rate_wpm":        d["features"]["speech_rate_wpm"],
            "type_token_ratio":       d["features"]["type_token_ratio"],
            "recall_accuracy":        d["features"]["entity_recall_rate"],
            "coherence_score":        d["features"]["coherence_score"],
            "avg_response_latency_s": d["features"]["avg_response_latency_s"],
            "avg_word_length":        d["features"]["avg_word_length"],
        }
    except Exception as e:
        print(f"[voice/end] scoring failed: {e}")

    score_for_cst = cognitive_score if cognitive_score is not None else 50.0
    theme, difficulty, _ = get_prompts(score_for_cst)

    session_result = db.table("sessions").insert({
        "patient_id":       patient_id,
        "transcript":       full_transcript,
        "duration_seconds": duration_seconds,
        "cognitive_score":  cognitive_score,
        "flag_escalate":    flag_escalate or flag_for_review,
        "component_scores": component_scores,
        "theme":            theme,
        "difficulty":       difficulty,
    }).execute()

    session_row = session_result.data[0]

    if features_row:
        try:
            db.table("session_features").insert({"session_id": session_row["id"], **features_row}).execute()
        except Exception as e:
            print(f"[voice/end] session_features insert failed: {e}")

    return JSONResponse({
        "cognitive_score": cognitive_score,
        "flag_escalate":   flag_escalate or flag_for_review,
        "session_id":      session_row["id"],
    })
