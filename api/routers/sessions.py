import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user
from api.routers.scores import compute_score

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class SessionCreate(BaseModel):
    patient_id: str
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    theme: Optional[str] = None
    difficulty: Optional[str] = None


@router.post("")
async def create_session(session: SessionCreate):
    # POST /sessions is open so the Pillar2 voice pipeline can call it without a JWT.
    # TODO: secure with a shared service key once the pipeline supports it.
    db = _db()

    score_result = compute_score(session.transcript or "")
    cognitive_score = score_result["score"]

    prev = (
        db.table("sessions")
        .select("cognitive_score")
        .eq("patient_id", session.patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    flag_escalate = False
    if prev.data and prev.data[0]["cognitive_score"] is not None:
        if prev.data[0]["cognitive_score"] - cognitive_score > 15:
            flag_escalate = True

    result = db.table("sessions").insert({
        "patient_id": session.patient_id,
        "transcript": session.transcript,
        "duration_seconds": session.duration_seconds,
        "theme": session.theme,
        "difficulty": session.difficulty,
        "cognitive_score": cognitive_score,
        "flag_escalate": flag_escalate,
    }).execute()

    return {**result.data[0], "cognitive_score": cognitive_score}


@router.get("/{patient_id}/latest")
async def get_latest_session(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("sessions")
        .select("*")
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
        .select("*")
        .eq("patient_id", patient_id)
        .order("session_date", desc=True)
        .execute()
    )
    return result.data
