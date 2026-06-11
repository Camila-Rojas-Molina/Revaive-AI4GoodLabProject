# Voice Frontend-Backend Integration Guide

This document explains how the frontend UI and the Pillar2 backend voice/chatbot logic were connected in the project.

## Goal

Connect the browser "Speak now" interaction to the existing Pillar2 voice pipeline so that:
- the browser records the user’s voice,
- the audio is sent to the backend,
- the backend transcribes the audio,
- the backend generates an assistant response,
- the browser receives the reply.

## Why this is needed

The existing `Pillar2/backend/conversation_loop.py` is a local Python script that:
- listens to the microphone with `sounddevice`,
- writes audio to a temporary WAV file,
- calls Whisper and GPT,
- plays audio locally with `afplay`.

That script cannot be directly invoked from the browser. A web frontend must instead send audio over HTTP to a backend endpoint.

## Step 1: Examine the existing backend voice services

I inspected the Pillar2 backend files to reuse existing components:
- `Pillar2/backend/conversation_loop.py` — local recording + process loop
- `Pillar2/backend/whisper_service.py` — audio transcription
- `Pillar2/backend/gpt_service.py` — GPT response generation
- `Pillar2/backend/patient_service.py` — load patient profile data
- `Pillar2/backend/elevenlabs_service.py` — text-to-speech output

### Purpose

This step ensures the new HTTP endpoint can reuse the same business logic already present in Pillar2 instead of rewriting the NLP/chat code.

## Step 2: Create a new FastAPI endpoint for voice uploads

Added a new backend file:
- `api/routers/voice.py`

This router does the following:
- accepts a `POST /voice` request,
- receives `patient_id` as form data,
- receives `audio_file` as an uploaded audio blob,
- saves the uploaded file to a temporary local file,
- calls `transcribe_audio(...)` from `Pillar2/backend/whisper_service.py`,
- calls `get_response(...)` from `Pillar2/backend/gpt_service.py`,
- returns JSON with `transcript` and `assistant` response.

### Purpose

Expose the Pillar2 voice/chat logic via HTTP so the browser can use it. This makes the frontend/backend connection possible.

## Step 3: Wire the new route into the API app

Updated `api/main.py` to include the new router:
- imported `voice` from `api.routers`
- added `app.include_router(voice.router, prefix="", tags=["voice"])`

### Purpose

Registering the router enables FastAPI to serve the new `/voice` endpoint alongside the existing API routes.

## Step 4: Validate the backend code

Verified that the new backend files compile cleanly with Python:
- `python -m py_compile /Users/norahnjonjo/ai4g/AI4GoodLab_M2/api/main.py /Users/norahnjonjo/ai4g/AI4GoodLab_M2/api/routers/voice.py`

### Purpose

Ensure the code is syntactically valid before attempting to run the backend.

## Step 5: Frontend integration approach

The browser side needs to: 
1. request microphone permission,
2. start `MediaRecorder`,
3. stop recording when the button is pressed again,
4. upload the captured audio to `POST /voice`,
5. display the returned transcript and assistant text.

Example frontend workflow:
- `startRecording()` opens microphone access and starts recording,
- `stopRecording()` stops `MediaRecorder`, creates a `Blob`, and sends it to the backend,
- the backend responds with JSON,
- the frontend updates the UI.

### Purpose

This defines the exact user flow for the button: record audio until stop, then send it to the backend for transcription/chat.

## Practical endpoint details

### Endpoint
`POST /voice`

### Form fields
- `patient_id`: patient identifier
- `audio_file`: recorded audio file blob

### Response JSON
- `transcript`: the transcribed text
- `assistant`: the generated chatbot response

## Next steps

To complete the integration, the frontend must implement the button state and upload logic. The backend is already prepared to receive the audio and reply with text.

If you want, I can also add a ready-made React component for the `Speak now` button and the `POST /voice` upload flow.
