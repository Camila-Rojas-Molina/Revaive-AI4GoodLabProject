import os
import sys
import tempfile
import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# Add the Pillar2 backend folder to imports so we can reuse the existing voice services.
sys.path.append(os.path.join(os.path.dirname(__file__), "../../Pillar2/backend"))

try:
    from whisper_service import transcribe_audio
    from gpt_service import get_response
    from patient_service import load_patient
    from elevenlabs_service import text_to_speech
except ImportError as exc:
    raise ImportError(
        "Could not import voice backend services. Make sure Pillar2/backend is present and dependencies are installed."
    ) from exc

router = APIRouter()


@router.post("/voice")
async def voice_session(
    patient_id: str = Form(...),
    audio_file: UploadFile = File(...),
):
    """Receive a voice recording from the frontend, transcribe it, generate a response, and return both text and audio."""

    patient_profile = load_patient(patient_id)
    if patient_profile is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    tmp_file = tempfile.NamedTemporaryFile(suffix=os.path.splitext(audio_file.filename)[1] or ".webm", delete=False)
    try:
        tmp_file.write(await audio_file.read())
        tmp_file.flush()

        # Transcribe the patient's voice
        transcript = transcribe_audio(tmp_file.name)
        
        # Generate the chatbot response
        response_text = get_response(transcript, [], patient_profile)
        
        # Convert response to audio (MP3)
        audio_file_path = text_to_speech(response_text)
        
        # Read the generated audio file and encode as base64
        with open(audio_file_path, "rb") as f:
            audio_bytes = f.read()
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        # Clean up the generated audio file
        try:
            os.unlink(audio_file_path)
        except Exception:
            pass

        return JSONResponse({
            "transcript": transcript,
            "assistant": response_text,
            "audio": audio_base64,
            "audioFormat": "mp3",
        })
    finally:
        try:
            tmp_file.close()
            os.unlink(tmp_file.name)
        except Exception:
            pass
