# Voice Integration: Complete Flow Documentation

## Overview

The voice integration connects the patient "Speak Now" button on the frontend to the backend ML/NLP pipeline, allowing real-time voice transcription, chatbot response generation, and audio playback.

---

## Complete Data Flow

```
Patient clicks "Speak Now" button
        ↓
Frontend opens microphone (MediaRecorder)
        ↓
Frontend records audio as WebM blob
        ↓
Patient clicks "Stop Speaking"
        ↓
Frontend uploads audio blob to POST /voice endpoint
        ↓
Backend receives audio_file + patient_id
        ↓
Backend saves audio to temp file
        ↓
Whisper API (OpenAI) transcribes audio → text
        ↓
GPT-4o-mini generates chatbot response
        ↓
ElevenLabs TTS converts response text → MP3 audio
        ↓
Backend returns JSON with transcript + text response + audio
        ↓
Frontend decodes base64 audio
        ↓
Frontend auto-plays AI voice response
```

---

## Backend Components

### 1. Voice Router (`api/routers/voice.py`)

**What it does:**
- Exposes `POST /voice` endpoint
- Receives multipart form data with `patient_id` and `audio_file`
- Orchestrates the Pillar2 backend services

**Request:**
```
POST /voice
Content-Type: multipart/form-data

patient_id: "patient_001"
audio_file: [binary audio blob]
```

**Response:**
```json
{
  "transcript": "what the patient said",
  "assistant": "AI response text",
  "audio": "[base64-encoded MP3]",
  "audioFormat": "mp3"
}
```

### 2. Voice Services Used (from Pillar2/backend)

#### `whisper_service.transcribe_audio(audio_path: str) → str`
- Takes a local audio file path
- Calls OpenAI Whisper API
- Returns the transcribed text
- **Cost:** ~$0.02 per minute of audio

#### `gpt_service.get_response(patient_message: str, conversation_history: list, patient_profile: dict) → str`
- Takes the transcribed text
- Uses patient profile for context (name, career, family info)
- Calls GPT-4o-mini API
- Returns the chatbot response
- **Cost:** ~$0.15 per 1M input tokens

#### `elevenlabs_service.text_to_speech(text: str, output_path: str) → str`
- Takes the response text
- Calls ElevenLabs TTS API
- Generates an MP3 audio file
- Returns the file path
- **Cost:** ~$3 per 1M characters

---

## Frontend Components

### 1. VoiceButton Component (`apps/dashboard/components/VoiceButton.tsx`)

**Props:**
- `patientId` (required): patient identifier for the API call
- `onTranscript` (optional): callback when transcript is received
- `onResponse` (optional): callback when AI response is received
- `onAudio` (optional): callback when audio blob is received
- `disabled` (optional): disable the button

**Usage:**
```tsx
import VoiceButton from '@/components/VoiceButton'

export default function MyPage() {
  return (
    <VoiceButton
      patientId="patient_001"
      onTranscript={(text) => console.log('You said:', text)}
      onResponse={(reply) => console.log('AI said:', reply)}
      onAudio={(base64) => console.log('Audio received')}
    />
  )
}
```

**What it does:**
1. **Start recording:** clicks button → `navigator.mediaDevices.getUserMedia()` → starts `MediaRecorder`
2. **Stop recording:** clicks button again → `recorder.stop()` → creates Blob
3. **Upload:** sends multipart form-data to `POST /voice`
4. **Parse response:** extracts transcript, assistant text, and audio
5. **Auto-play:** decodes base64 audio and plays it via `Audio` element
6. **Error handling:** displays error messages if recording/API fails

**State management:**
- `recording`: true while mic is active
- `loading`: true while API request is in flight
- `error`: error message if anything fails

---

## Example Integration

Here's how to use the VoiceButton in a patient session page:

```tsx
'use client'

import { useState } from 'react'
import VoiceButton from '@/components/VoiceButton'

export default function PatientSessionPage() {
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([])
  const patientId = 'patient_001' // from URL or session

  return (
    <div>
      <h1>Cognitive Session</h1>
      
      {/* Display conversation history */}
      <div>
        {messages.map((msg, i) => (
          <div key={i} style={{marginBottom: 16}}>
            <strong>{msg.role}:</strong> {msg.text}
          </div>
        ))}
      </div>

      {/* Voice button */}
      <VoiceButton
        patientId={patientId}
        onTranscript={(transcript) => 
          setMessages(prev => [...prev, {role: 'Patient', text: transcript}])
        }
        onResponse={(response) => 
          setMessages(prev => [...prev, {role: 'Revaive', text: response}])
        }
      />
    </div>
  )
}
```

---

## Authentication & Authorization

- `POST /voice` is **open** (no JWT required) — the Pillar2 backend can call it
- Patient authentication happens separately via Supabase Auth
- The frontend obtains the patient ID from the logged-in user session
- The patient ID is sent in the POST request to ensure data isolation

---

## Audio Format Details

### Input (from browser)
- Format: `audio/webm`
- Codec: default browser codec (Opus)
- Sample rate: system default (typically 48kHz)
- Whisper API handles these natively

### Output (to browser)
- Format: `application/mpeg` (MP3)
- Codec: MPEG-1 Audio Layer III
- Bitrate: 128 kbps
- Encoded as base64 in JSON response
- Decoded and played via `<Audio>` element

---

## Error Handling

The VoiceButton displays errors to the user:

1. **Microphone access denied** → `"Failed to access microphone"`
2. **No audio recorded** → `"No audio recorded"`
3. **Patient not found** → `"Patient not found"` (HTTP 404)
4. **OpenAI Whisper error** → API error message
5. **GPT-4o error** → API error message
6. **ElevenLabs error** → API error message
7. **Network error** → `"Failed to process voice"`

---

## Performance & Limits

| Step | Time | Notes |
|------|------|-------|
| Record audio | user-dependent | 5–60 seconds typical |
| Upload | <1s | depends on network + audio length |
| Transcribe (Whisper) | 2–10s | depends on audio length + API load |
| Generate response (GPT) | 1–5s | depends on response length |
| Generate audio (ElevenLabs) | 1–3s | depends on response length |
| **Total round-trip** | **5–30s** | end-to-end user experience |

---

## Testing the Endpoint Manually

Test the `/voice` endpoint without the frontend:

```bash
# Create a test audio file (or use an existing one)
ffmpeg -f lavfi -i anullsrc -t 2 test_audio.wav

# Send to the backend
curl -X POST "http://localhost:8000/voice" \
  -F "patient_id=patient_001" \
  -F "audio_file=@test_audio.wav"

# Response should be:
# {
#   "transcript": "...",
#   "assistant": "...",
#   "audio": "[base64]",
#   "audioFormat": "mp3"
# }
```

---

## What's Required to Run

1. **Backend services running:**
   - FastAPI at `http://localhost:8000`
   - Python dependencies installed: `pip install -r requirements.txt`
   - Pillar2 dependencies: see `Pillar2/backend` setup

2. **Environment variables set:**
   - `OPENAI_API_KEY` (Whisper + GPT)
   - `ELEVENLABS_API_KEY` (TTS)
   - `NEXT_PUBLIC_API_URL` (frontend URL to backend, e.g., `http://localhost:8000`)
   - `NEXT_PUBLIC_SUPABASE_URL` (patient auth)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (patient auth)

3. **Frontend app running:**
   - Next.js at `http://localhost:3000`
   - Patient authenticated via Supabase

4. **Patient must exist:**
   - Patient ID must exist in `Pillar2/data/patients.json`
   - Patient data used for context in GPT prompts

---

## Debugging

### No audio recorded
- Check browser microphone permissions
- Check browser console for errors
- Test mic with system audio app first

### Whisper returns empty transcript
- Check audio quality (min 3 seconds recommended)
- Ensure `OPENAI_API_KEY` is valid
- Check OpenAI API status

### GPT returns generic response
- Verify patient profile exists in `Pillar2/data/patients.json`
- Check that patient ID is correct
- Review the prompt in `Pillar2/backend/cst/cst_manager.py`

### ElevenLabs audio not playing
- Check `ELEVENLABS_API_KEY` is valid
- Ensure browser audio is not muted
- Check base64 decoding in browser console

### API returns 404
- Verify patient ID exists
- Check `Pillar2/data/patients.json` for the ID

---

## Summary

**The integration is now complete:**

✅ Backend receives audio upload  
✅ Transcribes with Whisper  
✅ Generates response with GPT  
✅ Converts response to audio with ElevenLabs  
✅ Frontend button records and sends audio  
✅ Frontend receives and auto-plays response  

**To use it:**
1. Run `uvicorn api.main:app --reload`
2. Run `npm run dev` in `apps/dashboard`
3. Log in as a patient
4. Use the `VoiceButton` component on any page
5. Click "Speak Now" → speak → click "Stop Speaking" → AI replies with voice + text
