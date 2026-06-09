import openai
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def transcribe_audio(audio_file_path: str) -> dict:
    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = transcript.segments or []
    text = transcript.text.strip()
    start = segments[0].start if segments else 0.0
    end   = segments[-1].end  if segments else 0.0

    return {
        "text":  text,
        "start": start,
        "end":   end,
    }
