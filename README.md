# Revaive

AI prototype for Postoperative Delirium (POD) detection and cognitive monitoring, built for AI4Good Lab 2025.

Team: Joyanne Ma, Amy Dao, Norah Njonjo, Camila Rojas

## Architecture

- **Pillar 1** — Risk prediction: nurse enters patient features at admission; XGBoost classifier outputs High / Medium / Low POD risk.
- **Pillar 2** — Cognitive Companion: patients do a daily voice session; a scoring model produces a 0–100 cognitive state score tracked over time on the nurse dashboard.

## Running the project

### Prerequisites

This is described underneath (env secrets set up)


### Teammate setup (recommended)

Follow these ordered steps so each teammate can get a working local development environment.

1. Clone the repo (if you haven't already):

```bash
git clone https://github.com/Camila-Rojas-Molina/AI4GoodLab_M2.git
cd AI4GoodLab_M2
```

2. Create and activate a Python virtual environment in the repository root (each developer should create their own `.venv`):

```bash
python -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Create your local env file and add secrets (do NOT commit this file):

    There should be a .env.local file with two supabase keys, and .env in you main folder with the OpenAI and ElevenLabs keys.

5. Install frontend dependencies (dashboard and patient):

(This is underneath, keep scrolling)

6. In VS Code: open the repository, then run the Command Palette → "Python: Select Interpreter" → choose the `.venv` interpreter. New terminals will auto-activate the environment if `python.terminal.activateEnvironment` is enabled.

Notes:
- Each teammate should create their own `.venv` (do not share the `.venv` folder in version control).
- Keep `.env` and `.venv/` in `.gitignore`; do not commit secrets or local environments. Consider adding a `.env.example` with placeholders if one is not present.
- It's convenient to commit a project `.vscode/settings.json` that contains `python.envFile` and `python.terminal.activateEnvironment` so VS Code loads `.env` and auto-activates environments for everyone — but DO NOT commit `python.pythonPath` (interpreter path) because that is machine-specific.


### API (FastAPI)

```bash
uvicorn api.main:app --reload
```

API docs available at `http://localhost:8000/docs`.

### Nurse Dashboard

```bash
cd apps/dashboard
npm ci
npm run dev
```

Opens on `http://localhost:3000`.

### Patient App

```bash
cd apps/patient
npm ci
npm run dev
```

Opens on `http://localhost:3001`.

### Continuous Integration Use Description

This repo includes a GitHub Actions workflow at [.github/workflows/ci.yml](.github/workflows/ci.yml).

It runs automatically on pushes and pull requests and does the following:

- installs Python dependencies from `requirements.txt`
- runs `npm ci` and `npm run build` in `apps/dashboard`
- runs `npm ci` and `npm run build` in `apps/patient`

For local clean installs that match CI, run:

```bash
cd apps/dashboard && npm ci
cd ../patient && npm ci
```

Use `npm install` only when you intentionally need to update the lockfile.

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
