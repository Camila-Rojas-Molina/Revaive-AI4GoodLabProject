from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.middleware.auth import get_current_user
import joblib
import pandas as pd
import os

router = APIRouter()

# ---------------------------------------------------------------------------
# Load model once at startup
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../Pillar1/model/model.pkl")

try:
    model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    raise RuntimeError(f"model.pkl not found at {MODEL_PATH}")

# ---------------------------------------------------------------------------
# Encoding maps — must match LabelEncoder order from training (alphabetical)
# ---------------------------------------------------------------------------
GENDER_MAP = {"F": 0, "M": 1}

ADMISSION_TYPE_MAP = {
    "DIRECT EMER.": 0,
    "ELECTIVE": 1,
    "EW EMER.": 2,
    "SURGICAL SAME DAY ADMISSION": 3,
    "URGENT": 4,
}

SURGICAL_CATEGORY_MAP = {
    "Neurosurgery": 0,
    "Other": 1,
    "Unknown": 2,
}

# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class RiskInput(BaseModel):
    anchor_age: int
    gender: str           # "F" or "M"
    admission_type: str   # "ELECTIVE", "EW EMER.", "URGENT", "DIRECT EMER.", "SURGICAL SAME DAY ADMISSION"
    prior_delirium: int   # 0 or 1
    dementia: int         # 0 or 1
    surgical_category: str  # "Neurosurgery", "Other", "Unknown"

# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
@router.post("/predict")
async def predict_risk(data: RiskInput, _user=Depends(get_current_user)):
    if data.gender not in GENDER_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid gender '{data.gender}'. Use 'F' or 'M'.")
    if data.admission_type not in ADMISSION_TYPE_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid admission_type. Options: {list(ADMISSION_TYPE_MAP.keys())}")
    if data.surgical_category not in SURGICAL_CATEGORY_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid surgical_category. Options: {list(SURGICAL_CATEGORY_MAP.keys())}")

    features = pd.DataFrame([{
        "anchor_age": data.anchor_age,
        "gender": GENDER_MAP[data.gender],
        "admission_type": ADMISSION_TYPE_MAP[data.admission_type],
        "prior_delirium": data.prior_delirium,
        "dementia": data.dementia,
        "surgical_category": SURGICAL_CATEGORY_MAP[data.surgical_category],
    }])

    prediction = model.predict(features)[0]
    proba = model.predict_proba(features)[0]
    label = {0: "low", 1: "high"}[int(prediction)]

    return {
        "label": label,
        "confidence": round(float(max(proba)), 3),
    }