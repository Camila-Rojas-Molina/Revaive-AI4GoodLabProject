import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user
from api.routers.risk import compute_risk_rule_based

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    sex: Optional[str] = None
    surgery_type: Optional[str] = None
    anesthesia_duration_min: Optional[float] = None
    comorbidity_count: Optional[int] = 0
    baseline_orientation_score: Optional[float] = None


@router.post("")
async def create_patient(patient: PatientCreate, user=Depends(get_current_user)):
    risk = compute_risk_rule_based(patient.model_dump())
    db = _db()
    result = db.table("patients").insert({
        **patient.model_dump(),
        "pod_risk_label": risk["label"],
        "pod_risk_score": risk["score"],
        "assigned_nurse_id": str(user.id),
    }).execute()
    return result.data[0]


@router.get("/me")
async def get_my_patient_record(user=Depends(get_current_user)):
    """Returns the patient record for the currently authenticated patient user."""
    db = _db()
    result = (
        db.table("patients")
        .select("*")
        .eq("profile_id", str(user.id))
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return result.data[0]


@router.get("")
async def list_patients(user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("patients")
        .select("*, sessions(cognitive_score, session_date, flag_escalate, created_at)")
        .eq("assigned_nurse_id", str(user.id))
        .execute()
    )
    return result.data


@router.get("/{patient_id}")
async def get_patient(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    patient_res = (
        db.table("patients")
        .select("*")
        .eq("id", patient_id)
        .limit(1)
        .execute()
    )
    if not patient_res.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    sessions_res = (
        db.table("sessions")
        .select("*")
        .eq("patient_id", patient_id)
        .order("session_date", desc=True)
        .execute()
    )
    return {**patient_res.data[0], "sessions": sessions_res.data}
