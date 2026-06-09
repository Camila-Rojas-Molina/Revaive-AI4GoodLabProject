import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user
from api.routers.risk import model, GENDER_MAP, ADMISSION_TYPE_MAP, SURGICAL_CATEGORY_MAP
import pandas as pd

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class PatientCreate(BaseModel):
    name: str
    anchor_age: Optional[int] = None
    gender: Optional[str] = None
    admission_type: Optional[str] = None
    prior_delirium: Optional[int] = 0
    dementia: Optional[int] = 0
    surgical_category: Optional[str] = None


@router.post("")
async def create_patient(patient: PatientCreate, user=Depends(get_current_user)):
    # Run real model prediction
    features = pd.DataFrame([{
        "anchor_age": patient.anchor_age or 0,
        "gender": GENDER_MAP.get(patient.gender, 0),
        "admission_type": ADMISSION_TYPE_MAP.get(patient.admission_type, 2),
        "prior_delirium": patient.prior_delirium,
        "dementia": patient.dementia,
        "surgical_category": SURGICAL_CATEGORY_MAP.get(patient.surgical_category, 1),
    }])
    prediction = model.predict(features)[0]
    proba = model.predict_proba(features)[0]
    label = {0: "low", 1: "high"}[int(prediction)]
    confidence = round(float(max(proba)), 3)

    db = _db()
    result = db.table("patients").insert({
        **patient.model_dump(),
        "pod_risk_label": label,
        "pod_risk_score": confidence,
        "assigned_nurse_id": str(user.id),
    }).execute()
    return result.data[0]


@router.get("/me")
async def get_my_patient_record(user=Depends(get_current_user)):
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