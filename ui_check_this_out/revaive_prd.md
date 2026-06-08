 # revaive

### Risk. Stimulate. Track.

**AI4Good Lab — 2026 · Confidential**

> A two-week prototype with two ML models: one that predicts which surgical patients are at risk of Postoperative Delirium, and one that scores cognitive state from speech — both feeding a nurse dashboard that updates with every session.
> 

---

## 1. The Problem

Postoperative Delirium (POD) is sudden-onset confusion after surgery. It's common, it's dangerous, and it's consistently missed — because nurses don't have a systematic way to identify who's at risk or track whether a patient is getting better or worse cognitively.

POD affects up to 50% of ICU patients following surgery, with higher rates in elderly patients and those undergoing cardiac or major abdominal procedures.

Patients who develop postoperative delirium face significantly higher risks of prolonged ICU stays, long-term cognitive decline, accelerated progression to dementia, and increased mortality. It also drives substantial healthcare costs

---

## 2. The Two Pillars

### Pillar 1 — Risk Prediction (Classification)

A nurse enters a few patient features at admission. A trained ML model outputs a risk level: **High / Medium / Low**. This tells the care team who to watch closely from day one.

- **Input:** Patient features from intake (age, procedure type, comorbidities, etc. — exact features determined by dataset)
- **Model:** Binary or multiclass classifier (XGBoost or logistic regression)
- **Output:** Risk label — High / Medium / Low — displayed on the dashboard

### Pillar 2 — Cognitive State Scoring (Regression)

Each day, the patient does a short voice session with an AI companion on a bedside tablet. The system extracts features from what they say and how they say it, then produces a cognitive score between 0 and 100.

- **Input:** Audio + transcript from the voice session
- **Features:** Acoustic (speech rate, pauses, energy) + linguistic (vocabulary, coherence, recall accuracy)
- **Model:** Regression model trained on a labeled speech/cognitive dataset (database made by our Agent)
- **Output:** Score 0–100, updated after every session, plotted over time on the dashboard

---

## 3. What the Nurse Sees

A single dashboard. One row per patient. Updated after every session.

| Patient | Risk | Today's Score | Trend | Last Session | Action |
| --- | --- | --- | --- | --- | --- |
| M.L., 71F | 🔴 High | 74 / 100 | ▲ +11 | 2h ago | View report |
| R.T., 68M | 🟠 Medium | 41 / 100 | ▼ −19 | 3h ago | ⚠️ Review now |
| A.K., 55F | 🟢 Low | 88 / 100 | ▲ +3 | 1h ago | View report |

Clicking a patient opens their full view:

- Risk score + the features that drove it
- Score trend graph (day by day)
- Latest session transcript excerpt
- Auto-generated recommendation (monitor / escalate)

---

## 4. The Demo Flow

This is exactly what we show on demo day — nothing more.

```
1. Nurse logs in → sees patient dashboard

2. Nurse admits new patient → fills 5–8 field intake form
   → Risk model runs → "High Risk" label appears instantly

3. Patient (played by teammate) taps tablet → 2min voice session with AI companion
   → Session ends → cognitive score generated → dashboard updates

4. Nurse opens patient profile → sees:
      Risk: High
      Score today: 41/100  ▼ −19 from yesterday
      Trend graph: 3-day decline
      Recommendation: "Flag for in-person assessment"
```

That's the story. It's tight, it's visual, and both ML models are live in the loop.

---

## 5. ML Models — What We Need to Train

### Model 1 — Risk Classifier

| Item | Detail |
| --- | --- |
| Task | Predict POD risk from structured patient features |
| Type | Classification (High / Medium / Low, or binary High vs. not) |
| Algorithm | XGBoost (first choice) or logistic regression |
| Input features | TBD based on dataset — likely: age, surgery type, anesthesia duration, comorbidity count, baseline labs |
| Label | POD occurrence (yes/no) from dataset |
| Evaluation | AUC-ROC, precision/recall on test split |
| Dataset | TBD — MIMIC-IV (preferred) or alternative postoperative dataset |

### Model 2 — Cognitive Scorer

| Item | Detail |
| --- | --- |
| Task | Score cognitive state from a voice session (0–100) |
| Type | Regression |
| Algorithm | XGBoost or ridge regression on extracted features |
| Input features | Acoustic: speech rate, pause frequency, energy variance / Linguistic: type-token ratio, sentence completion rate, recall accuracy |
| Label | Cognitive score or impairment severity from dataset |
| Evaluation | MAE, Pearson r on test split |
| Dataset | TBD — DementiaBank (preferred) or alternative speech/cognitive dataset |

> **Dataset note:** We are actively evaluating datasets for both models. The model architecture and feature pipeline are designed to be dataset-agnostic — once a dataset is confirmed, we slot it in and train. If access takes longer than expected, we prototype with synthetic data and flag the real dataset as the production upgrade path.
> 

---

## 6. Features — Scoped for 2 Weeks

| # | Feature | Description | Priority |
| --- | --- | --- | --- |
| F1 | Patient intake form | 5–8 fields → triggers risk model | Must have |
| F2 | Risk score display | High / Medium / Low badge on dashboard | Must have |
| F3 | Nurse dashboard | Patient list, risk badges, score column, trend indicator | Must have |
| F4 | Voice session (tablet) | One-button start, AI conducts session, session ends automatically | Must have |
| F5 | Cognitive score output | Score generated from session, logged to patient record | Must have |
| F6 | Score trend graph | Line chart of daily scores per patient | Must have |
| F7 | Patient detail view | Risk breakdown + score history + transcript excerpt + recommendation | Must have |
| F8 | Escalation flag | Auto-flag when score drops significantly | Nice to have |
| F9 | Session email report | Morning summary email to nurse | Nice to have |

---

## 7. Tech Stack

| Layer | Tool | Why |
| --- | --- | --- |
| Risk Model | XGBoost (Python) | Strong on tabular clinical data, fast to train |
| Cognitive Scoring | XGBoost / ridge regression | Interpretable, works well on small feature sets |
| Speech-to-Text | OpenAI Whisper | Best open-source transcription quality |
| Conversation AI | GPT-4o | Runs the CST session dialogue |
| Text-to-Speech | ElevenLabs | Natural, warm voice for the companion |
| Feature Extraction | librosa + spaCy | Audio features + NLP features |
| Frontend | Next.js + Tailwind CSS | Dashboard + tablet UI |
| Backend | FastAPI (Python) | Model serving + session orchestration |
| Database | Supabase (PostgreSQL) | Patient records + session logs + scores |
| Auth | Supabase Auth | Nurse login + roles |
| Deployment | Vercel + Railway | Fast CI/CD for demo |

---

## 8. Two-Week Plan

### Week 1 — Models + Core Pipeline

| Day | Focus | Done When |
| --- | --- | --- |
| 1 | Repo setup, DB schema, auth, env | Nurse can log in |
| 2 | Patient intake form + risk score API (stub) | Form submits, returns mock score |
| 3–4 | Dataset confirmed → risk model trained + evaluated | AUC reported on test split |
| 5 | Voice session: Whisper + GPT-4o + ElevenLabs loop | Patient can complete a 5-min session |
| 6 | Feature extraction (audio + text) → cognitive score | Session produces a number |
| 7 | Score logged to DB + displayed on dashboard | End-to-end: session → score → visible |

### Week 2 — Connect + Polish + Demo

| Day | Focus | Done When |
| --- | --- | --- |
| 8 | Dashboard: patient list, risk badges, score column | Nurse sees all patients at a glance |
| 9 | Score trend graph + patient detail view | Click patient → see their history |
| 10 | Dataset confirmed for Model 2 → cognitive model trained | Real scores replacing stubs |
| 11 | Escalation flag + recommendation text | Declining patient shows a warning |
| 12 | Full end-to-end test run | Demo flow works without manual fixes |
| 13 | Polish: UI, tablet UX, loading states, edge cases | Looks good on a projector |
| 14 | **Demo day** | ✅ |

---

## 9. What We're Not Doing

- ❌ Clinical validation — this is a proof of concept
- ❌ Real patient data — demo uses MIMIC-IV (de-identified) or synthetic
- ❌ EHR integration
- ❌ Mobile app
- ❌ Multi-language support
- ❌ Proving delirium outcomes — that's a future hospital pilot

---

## 10. Open Items (Resolve by Day 3)

| Question | Why It Matters |
| --- | --- |
| Which dataset for the risk model? | Determines features, labels, and training time |
| Which dataset for cognitive scoring? | Determines whether we use speech or structured assessments |
| What device runs the tablet UI? | iPad / Android tablet / desktop kiosk changes UI constraints |
| Voice agent — teammate's stack? | Need API contract before Day 5 |

---

*CogBridge · AI4Good Lab 2026 · Last updated June 2026*