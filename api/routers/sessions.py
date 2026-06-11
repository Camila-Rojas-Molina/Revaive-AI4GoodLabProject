import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user

# compute_score is no longer called here — scoring now happens in the
# voice pipeline (cognitive_scorer.py) before the POST is made.
# This router just persists what it receives.

router = APIRouter()


def _db():
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


class SessionFeatures(BaseModel):
    speech_rate_wpm: Optional[float] = None
    type_token_ratio: Optional[float] = None
    recall_accuracy: Optional[float] = None
    coherence_score: Optional[float] = None
    avg_response_latency_s: Optional[float] = None
    avg_word_length: Optional[float] = None


class SessionCreate(BaseModel):
    patient_id: str
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    theme: Optional[str] = None
    difficulty: Optional[str] = None
    # scored fields sent by the voice pipeline
    cognitive_score: Optional[float] = None
    flag_escalate: Optional[bool] = None
    component_scores: Optional[dict] = None
    features: Optional[SessionFeatures] = None


@router.post("")
async def create_session(session: SessionCreate):
    # POST /sessions is open so the Pillar 2 voice pipeline can call it
    # without a JWT. TODO: secure with a shared service key.
    db = _db()

    # ── Persist the session row ───────────────────────────────────────────
    result = db.table("sessions").insert({
        "patient_id":      session.patient_id,
        "transcript":      session.transcript,
        "duration_seconds": session.duration_seconds,
        "theme":           session.theme,
        "difficulty":      session.difficulty,
        "cognitive_score": session.cognitive_score,
        "flag_escalate":   session.flag_escalate or False,
        "component_scores": session.component_scores,
    }).execute()

    session_row = result.data[0]
    session_id = session_row["id"]

    # ── Persist the feature breakdown ─────────────────────────────────────
    if session.features:
        f = session.features
        db.table("session_features").insert({
            "session_id":       session_id,
            "speech_rate_wpm":  f.speech_rate_wpm,
            "type_token_ratio": f.type_token_ratio,
            "recall_accuracy":  f.recall_accuracy,
            "coherence_score":        f.coherence_score,
            "avg_response_latency_s": f.avg_response_latency_s,
            "avg_word_length":        f.avg_word_length,
        }).execute()

    return {**session_row, "cognitive_score": session.cognitive_score}


@router.get("/{patient_id}/latest")
async def get_latest_session(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("sessions")
        .select("*, session_features(*)")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No sessions found")
    return result.data[0]


@router.get("/{patient_id}")
async def list_sessions(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("sessions")
        .select("*, session_features(*)")
        .eq("patient_id", patient_id)
        .order("session_date", desc=True)
        .execute()
    )
    return result.data