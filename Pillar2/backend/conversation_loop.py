import sounddevice as sd
import soundfile as sf
import numpy as np
import tempfile
import os
import subprocess
from whisper_service import transcribe_audio
from gpt_service import get_response
from elevenlabs_service import text_to_speech
from patient_service import load_patient

SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.01
SILENCE_DURATION = 2

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

def run_conversation(patient_id: str):
    patient_profile = load_patient(patient_id)
    print(f"Loaded profile: {patient_profile}")
    print("CogBridge is ready. Start speaking...")
    conversation_history = []

    while True:
        audio = record_until_silence()
        audio_path = save_audio(audio)

        print("Processing...")
        transcript = transcribe_audio(audio_path)
        os.unlink(audio_path)

        if not transcript.strip():
            print("Didn't catch that, listening again...")
            continue

        print(f"You said: {transcript}")

        conversation_history.append({"role": "user", "content": transcript})
        response = get_response(transcript, conversation_history[:-1], patient_profile)
        conversation_history.append({"role": "assistant", "content": response})

        print(f"CogBridge: {response}")

        audio_file = text_to_speech(response)
        subprocess.run(["afplay", audio_file])

        if any(word in transcript.lower() for word in ["goodbye", "bye", "stop", "exit"]):
            print("Session ended.")
            break

if __name__ == "__main__":
    run_conversation("patient_001")