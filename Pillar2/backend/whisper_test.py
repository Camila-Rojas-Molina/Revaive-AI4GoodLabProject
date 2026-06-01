from whisper_service import transcribe_audio
from gpt_service import get_response
from elevenlabs_service import text_to_speech
import subprocess

transcript = transcribe_audio("/Users/joyannema/Desktop/202 Av Coolbreeze 104.m4a")
print(f"You said: {transcript}")

response = get_response(transcript, [])
print(f"CogBridge: {response}")

audio_file = text_to_speech(response)
print(f"Audio saved to: {audio_file}")
subprocess.run(["afplay", audio_file])