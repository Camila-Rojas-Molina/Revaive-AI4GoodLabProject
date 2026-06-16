# Revaive

Revaive — an AI prototype that detects postoperative delirium (POD) risk and provides a patient-facing cognitive companion to collect voice sessions and track cognitive scores over time.

**Purpose:** Combine a clinical risk model with an interactive patient app so nurses can identify high-risk patients and monitor cognitive changes longitudinally.

**What it does:** Runs a risk-prediction model on admission data and hosts a patient voice session pipeline that produces a 0–100 cognitive score stored and visualized on the nurse dashboard.

**Key features:** POD risk scoring, Supabase-backed persistence, daily patient voice sessions (Whisper → GPT → scoring), dashboard visualizations, and CI for reproducible builds.

**Tech stack:** FastAPI (backend), Next.js / React (frontend), Supabase (DB/auth), Whisper/OpenAI + ElevenLabs (voice + LLM), Python tooling for models.

**Tech stack:**

*Machine Learning & Data Processing (Python)*
- **scikit-learn** — Random Forest classifier for POD risk prediction
- **sentence-transformers, spaCy, NLTK** — NLP pipeline for cognitive scoring
- **pandas, NumPy** — data wrangling and feature engineering
- **Matplotlib, seaborn** — exploratory data analysis and visualisation

*Backend*
- **FastAPI + Uvicorn** — REST API and voice session endpoints
- **OpenAI** (Whisper + GPT-4o) — speech-to-text and conversational AI
- **ElevenLabs** — text-to-speech for patient sessions
- **Supabase** — PostgreSQL database, row-level security, and authentication

*Frontend (TypeScript)*
- **Next.js + React** — app router, server components, client interactivity
- **Recharts** — cognitive score trend charts
- **Tailwind CSS** — utility base (extended with custom CSS design tokens)

**Quick dev run:** create a Python venv, `pip install -r requirements-api.txt`, run the API with `uvicorn api.main:app --reload`, and start the frontend from `apps/dashboard` with `npm ci && npm run dev`.

**Demo note:** For the hackathon we deploy a single Next.js app (merged into dashboard) and expose one Vercel link for the demo

**Team:**  Amy Dao, Camila Rojas, Joyanne Ma, Norah Njonjo.

## Architecture

- **Pillar 1** — Risk prediction: nurse enters patient features at admission; Random Forest classifier outputs High / Medium / Low POD risk.
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

    There should be a `.env.local` file inside `apps/dashboard/` with the Supabase keys, and a `.env` in the repo root with the OpenAI and ElevenLabs keys. See the **Environment variables** section below for the full list.

5. Install frontend dependencies and run the servers (commands below).

6. In VS Code: open the repository, then run the Command Palette → "Python: Select Interpreter" → choose the `.venv` interpreter. New terminals will auto-activate the environment if `python.terminal.activateEnvironment` is enabled.

Notes:
- Each teammate should create their own `.venv` (do not share the `.venv` folder in version control).
- Keep `.env` and `.venv/` in `.gitignore`; do not commit secrets or local environments.
- It's convenient to commit a project `.vscode/settings.json` that contains `python.envFile` and `python.terminal.activateEnvironment` so VS Code loads `.env` and auto-activates environments for everyone — but DO NOT commit `python.pythonPath` (interpreter path) because that is machine-specific.


### API (FastAPI)

```bash
uvicorn api.main:app --reload
```

API docs available at `http://localhost:8000/docs`.

### Dashboard (nurses + patients)

```bash
cd apps/dashboard
npm ci
npm run dev
```

Opens on `http://localhost:3000`. Both nurses and patients log in here — the app detects the role from Supabase and routes accordingly.

### Continuous Integration

This repo includes a GitHub Actions workflow at [.github/workflows/ci.yml](.github/workflows/ci.yml).

It runs automatically on pushes and pull requests and does the following:

- installs Python dependencies from `requirements.txt`
- runs `npm ci` and `npm run build` in `apps/dashboard`

For local clean installs that match CI, run:

```bash
cd apps/dashboard && npm ci
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

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `apps/dashboard/.env.local` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/dashboard/.env.local` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/dashboard/.env.local` | Supabase service role key (server-side only, never expose to client) |
| `NEXT_PUBLIC_API_URL` | `apps/dashboard/.env.local` | FastAPI base URL (e.g. `http://localhost:8000`) |
| `OPENAI_API_KEY` | `.env` | OpenAI key (Whisper + GPT-4o) |
| `ELEVENLABS_API_KEY` | `.env` | ElevenLabs TTS key |
| `API_BASE_URL` | `.env` | Same FastAPI URL, used by Pillar 2 backend |

## Database setup

### 1. Run the schema

Paste the full contents of `database/schema.sql` into the **Supabase SQL Editor** and click Run. This creates all tables (`profiles`, `patients`, `sessions`, `session_features`, `reports`), row-level security policies, and a trigger that auto-creates a `profiles` row whenever a new auth user is created with a `role` field in their metadata.

### 2. Grant read access to the profiles table

Run this in the SQL Editor:

```sql
GRANT SELECT ON public.profiles TO authenticated;
```

Then add an RLS policy so users can read their own profile:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());
```

### 3. Create user accounts

**Nurses** must be created manually in Supabase → Authentication → Users. After creating a nurse account, insert their profiles row in the SQL Editor:

```sql
insert into profiles (id, role)
values ('paste-nurse-uuid-here', 'nurse');
```

The UUID is shown on the user's detail page in Authentication → Users.

**Patients** are created automatically when a nurse fills in the optional email field on the New Assessment form. This creates a Supabase account for the patient (no confirmation email sent) and links their clinical record to their login. Patients can then sign in using "Send me a code" on the login page.

## Login flow

Both nurses and patients use the same login page at `/login`:

- **Email + password** — use the Sign in button. The app reads `profiles.role` after login and routes nurses to `/dashboard` and patients to `/session`.
- **Send me a code** — sends a magic link to the email (useful for patients who don't have a password set).
- The role toggle (I'm a patient / I'm a clinician) is enforced — logging in with the wrong role shows an error.
