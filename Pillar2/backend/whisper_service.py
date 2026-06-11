import openai
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


NO_SPEECH_THRESHOLD = 0.6  # reject if avg no_speech_prob across segments exceeds this
MIN_SPEECH_DURATION = 0.8  # reject clips shorter than this many seconds

def transcribe_audio(audio_file_path: str) -> dict | None:
    """
    Returns transcription dict, or None if audio confidence is too low.
    Callers should treat None as "garbled/no real speech — skip this turn".
    """
    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
            language="en",
        )

    segments = transcript.segments or []
    text = transcript.text.strip()

    if not segments or not text:
        return None

    start = segments[0].start
    end   = segments[-1].end
    duration = end - start

    # Gate 1: too short to be real speech
    if duration < MIN_SPEECH_DURATION:
        return None

    # Gate 2: Whisper's own confidence — high no_speech_prob means garbled/noise
    avg_no_speech = sum(s.no_speech_prob for s in segments) / len(segments)
    if avg_no_speech > NO_SPEECH_THRESHOLD:
        return None

    return {
        "text":  text,
        "start": start,
        "end":   end,
    }
