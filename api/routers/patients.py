import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from api.middleware.auth import get_current_user
from api.routers.risk import _predict_with_routing
import pandas as pd

# Maps from UI form labels → numeric values the LabelEncoder assigned during training
# (LabelEncoder sorts values alphabetically on the MIMIC-IV training data)
_GENDER = {
    "Female":                      0,  # F
    "Non-binary / Prefer not to say": 0,
    "Male":                        1,  # M
}
_ADMISSION = {
    "Direct emergency":  0,  # DIRECT EMER.
    "Elective":          1,  # ELECTIVE
    "Emergency":         2,  # EW EMER.
    "Same-day surgery":  3,  # SURGICAL SAME DAY ADMISSION
    "Urgent":            4,  # URGENT
}

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
    label, confidence, model_used = _predict_with_routing(
        anchor_age     = patient.anchor_age or 0,
        gender_enc     = _GENDER.get(patient.gender or "", 0),
        admission_enc  = _ADMISSION.get(patient.admission_type or "", 1),
        prior_delirium = patient.prior_delirium,
        dementia       = patient.dementia,
        service_label  = patient.surgical_category or "Unknown / Other",
    )
    # `confidence` is already returned as a rounded float from the risk routing helper.

    db = _db()
    # Ensure the nurse has a profiles row (accounts created without the trigger won't have one)
    db.table("profiles").upsert(
        {"id": str(user.id), "role": "nurse"},
        on_conflict="id",
    ).execute()

    result = db.table("patients").insert({
        "name": patient.name,
        "age": patient.anchor_age,
        "sex": patient.gender,
        "surgery_type": patient.surgical_category,
        "comorbidity_count": (patient.prior_delirium or 0) + (patient.dementia or 0),
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


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    anchor_age: Optional[int] = None
    gender: Optional[str] = None
    surgical_category: Optional[str] = None
    admission_type: Optional[str] = None
    prior_delirium: Optional[int] = None
    dementia: Optional[int] = None


@router.patch("/{patient_id}")
async def update_patient(patient_id: str, data: PatientUpdate, user=Depends(get_current_user)):
    db = _db()
    updates: dict = {}
    if data.name is not None: updates["name"] = data.name
    if data.anchor_age is not None: updates["age"] = data.anchor_age
    if data.gender is not None: updates["sex"] = data.gender
    if data.surgical_category is not None: updates["surgery_type"] = data.surgical_category
    if data.prior_delirium is not None or data.dementia is not None:
        updates["comorbidity_count"] = (data.prior_delirium or 0) + (data.dementia or 0)

    # Re-run ML model if enough fields are present
    model_fields = {
        "anchor_age": data.anchor_age,
        "gender": data.gender,
        "admission_type": data.admission_type,
        "prior_delirium": data.prior_delirium,
        "dementia": data.dementia,
        "surgical_category": data.surgical_category,
    }
    if all(v is not None for v in model_fields.values()):
        label, confidence, model_used = _predict_with_routing(
            anchor_age     = model_fields["anchor_age"],
            gender_enc     = _GENDER.get(model_fields["gender"] or "", 0),
            admission_enc  = _ADMISSION.get(model_fields["admission_type"] or "", 1),
            prior_delirium = model_fields["prior_delirium"],
            dementia       = model_fields["dementia"],
            service_label  = model_fields["surgical_category"] or "Unknown / Other",
        )
        updates["pod_risk_label"] = label
        updates["pod_risk_score"] = confidence

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        db.table("patients").update(updates)
        .eq("id", patient_id)
        .eq("assigned_nurse_id", str(user.id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return result.data[0]


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, user=Depends(get_current_user)):
    db = _db()
    check = (
        db.table("patients")
        .select("id")
        .eq("id", patient_id)
        .eq("assigned_nurse_id", str(user.id))
        .limit(1)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.table("patients").delete().eq("id", patient_id).execute()
    return {"deleted": True}