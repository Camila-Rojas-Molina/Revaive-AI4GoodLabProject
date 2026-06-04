# CogBridge

AI prototype for Postoperative Delirium (POD) detection and cognitive monitoring, built for AI4Good Lab 2025.

Team: Joyanne Ma, Ken Sun, Amy Dao, Norah Njonjo, Camila Rojas

## Architecture

- **Pillar 1** — Risk prediction: nurse enters patient features at admission; XGBoost classifier outputs High / Medium / Low POD risk.
- **Pillar 2** — Cognitive Companion: patients do a daily voice session; a scoring model produces a 0–100 cognitive state score tracked over time on the nurse dashboard.

## Running the project

### Prerequisites

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### API (FastAPI)

```bash
uvicorn api.main:app --reload
```

API docs available at `http://localhost:8000/docs`.

### Nurse Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

Opens on `http://localhost:3000`.

### Patient App

```bash
cd apps/patient
npm install
npm run dev
```

Opens on `http://localhost:3001`.

### Pillar 2 voice session

```bash
cd Pillar2/backend
python conversation_loop.py
```

At session end the script automatically POSTs the result to `API_BASE_URL/sessions`.

## Environment variables

See `.env.example` for the full list. Required keys:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | OpenAI key (Whisper + GPT-4o) |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `API_BASE_URL` | Base URL for the FastAPI backend |
| `NEXT_PUBLIC_API_URL` | Same URL, exposed to Next.js frontend |

## Database

Run `database/schema.sql` against your Supabase project SQL editor to create all tables and RLS policies.
