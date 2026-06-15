from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.middleware.auth import get_current_user
import joblib
import pandas as pd
import os

router = APIRouter()

# ---------------------------------------------------------------------------
# Load models once at startup
# ---------------------------------------------------------------------------
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../Pillar1/model")

try:
    model = joblib.load(os.path.join(_MODEL_DIR, "model.pkl"))
except FileNotFoundError as e:
    raise RuntimeError(f"model.pkl not found: {e}")

try:
    model_no_service = joblib.load(os.path.join(_MODEL_DIR, "model_no_service.pkl"))
except FileNotFoundError as e:
    raise RuntimeError(f"model_no_service.pkl not found: {e}")

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

# Only services present in training data — everything else uses the fallback model
SERVICE_MAP = {
    "CMED – Cardiac Medical":    0,
    "CSURG – Cardiac Surgery":   1,
    "GYN – Gynecological":       2,
    "MED – General Medicine":    3,
    "NMED – Neurologic Medical": 4,
    "NSURG – Neurologic Surgery":5,
    "SURG – General Surgery":    6,
    "TRAUM – Trauma":            7,
    "TSURG – Thoracic Surgery":  8,
    "VSURG – Vascular Surgery":  9,
}

KNOWN_SERVICES = set(SERVICE_MAP.keys())


def _predict_with_routing(anchor_age, gender_enc, admission_enc, prior_delirium, dementia, service_label):
    """Route to main model if service is known, fallback model otherwise."""
    if service_label in KNOWN_SERVICES:
        features = pd.DataFrame([{
            "anchor_age":      anchor_age,
            "gender":          gender_enc,
            "admission_type":  admission_enc,
            "prior_delirium":  prior_delirium,
            "dementia":        dementia,
            "curr_service":    SERVICE_MAP[service_label],
        }])
        prediction = model.predict(features)[0]
        proba = model.predict_proba(features)[0]
    else:
        features = pd.DataFrame([{
            "anchor_age":      anchor_age,
            "gender":          gender_enc,
            "admission_type":  admission_enc,
            "prior_delirium":  prior_delirium,
            "dementia":        dementia,
        }])
        prediction = model_no_service.predict(features)[0]
        proba = model_no_service.predict_proba(features)[0]
    return int(prediction), proba


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class RiskInput(BaseModel):
    anchor_age: int
    gender: str         # "F" or "M"
    admission_type: str # "ELECTIVE", "EW EMER.", "URGENT", "DIRECT EMER.", "SURGICAL SAME DAY ADMISSION"
    prior_delirium: int # 0 or 1
    dementia: int       # 0 or 1
    curr_service: str   # clinical service label (e.g. "CSURG – Cardiac Surgery") or "Unknown / Other"

# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
@router.post("/predict")
async def predict_risk(data: RiskInput, _user=Depends(get_current_user)):
    if data.gender not in GENDER_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid gender. Use 'F' or 'M'.")
    if data.admission_type not in ADMISSION_TYPE_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid admission_type. Options: {list(ADMISSION_TYPE_MAP.keys())}")

    prediction, proba = _predict_with_routing(
        anchor_age     = data.anchor_age,
        gender_enc     = GENDER_MAP[data.gender],
        admission_enc  = ADMISSION_TYPE_MAP[data.admission_type],
        prior_delirium = data.prior_delirium,
        dementia       = data.dementia,
        service_label  = data.curr_service,
    )
    return {
        "label":      {0: "low", 1: "high"}[prediction],
        "confidence": round(float(max(proba)), 3),
    }
