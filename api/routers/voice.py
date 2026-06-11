import os
import sys
import tempfile
import base64

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from supabase import create_client

# Add the Pillar2 backend folder to imports so we can reuse the existing voice services.
sys.path.append(os.path.join(os.path.dirname(__file__), "../../Pillar2/backend"))

try:
    from whisper_service import transcribe_audio
    from gpt_service import get_response
    from elevenlabs_service import text_to_speech
except ImportError as exc:
    raise ImportError(
        "Could not import voice backend services. Make sure Pillar2/backend is present and dependencies are installed."
    ) from exc

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@router.post("/voice")
async def voice_session(
    patient_id: str = Form(...),
    audio_file: UploadFile = File(...),
):
    # Load patient profile from Supabase instead of a local JSON file
    db = _db()
    result = db.table("patients").select("name, age, sex, surgery_type").eq("id", patient_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_profile = result.data[0]

    tmp_file = tempfile.NamedTemporaryFile(
        suffix=os.path.splitext(audio_file.filename or "")[1] or ".webm",
        delete=False,
    )
    try:
        tmp_file.write(await audio_file.read())
        tmp_file.flush()

        transcript = transcribe_audio(tmp_file.name)
        response_text = get_response(transcript, [], patient_profile)
        audio_file_path = text_to_speech(response_text)

        with open(audio_file_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode("utf-8")

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
