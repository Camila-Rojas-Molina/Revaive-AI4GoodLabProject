import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user

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


class SessionCreate(BaseModel):
    patient_id: str
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    theme: Optional[str] = None
    difficulty: Optional[str] = None
    cognitive_score: Optional[float] = None
    flag_escalate: Optional[bool] = None
    component_scores: Optional[dict] = None
    features: Optional[SessionFeatures] = None


@router.post("")
async def create_session(session: SessionCreate):
    db = _db()

    result = db.table("sessions").insert({
        "patient_id":       session.patient_id,
        "transcript":       session.transcript,
        "duration_seconds": session.duration_seconds,
        "theme":            session.theme,
        "difficulty":       session.difficulty,
        "cognitive_score":  session.cognitive_score,
        "flag_escalate":    session.flag_escalate or False,
        "component_scores": session.component_scores,
    }).execute()

    session_row = result.data[0]
    session_id = session_row["id"]

    if session.features:
        f = session.features
        db.table("session_features").insert({
            "session_id":             session_id,
            "speech_rate_wpm":        f.speech_rate_wpm,
            "type_token_ratio":       f.type_token_ratio,
            "recall_accuracy":        f.recall_accuracy,
            "coherence_score":        f.coherence_score,
            "avg_response_latency_s": f.avg_response_latency_s,
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
