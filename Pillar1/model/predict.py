import os
import joblib
import pandas as pd
from Pillar1.model.features import RISK_FEATURES

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
model = joblib.load(MODEL_PATH)

GENDER_MAP = {"F": 0, "M": 1}
ADMISSION_TYPE_MAP = {
    "DIRECT EMER.": 0, "ELECTIVE": 1, "EW EMER.": 2,
    "SURGICAL SAME DAY ADMISSION": 3, "URGENT": 4,
}
# LabelEncoder alphabetical order over training data (CMED,CSURG,GYN,MED,NMED,NSURG,SURG,TRAUM,TSURG,VSURG)
# Services absent from training data fall back to MED (3) — most general category
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
    # Not in training data → fallback MED
    "DENT – Dental":             3,
    "ENT – Ear, Nose & Throat":  3,
    "EYE – Eye / Ophthalmology": 3,
    "GU – Genitourinary":        3,
    "NB – Newborn":              3,
    "NBB – Newborn Baby":        3,
    "OBS – Obstetrics":          3,
    "ORTHO – Orthopaedic":       3,
    "OMED – Oncologic Medical":  3,
    "PSURG – Plastic Surgery":   3,
    "PSYCH – Psychiatric":       3,
}


def predict(features: dict) -> dict:
    df = pd.DataFrame([{
        "anchor_age": features["anchor_age"],
        "gender": GENDER_MAP[features["gender"]],
        "admission_type": ADMISSION_TYPE_MAP[features["admission_type"]],
        "prior_delirium": features["prior_delirium"],
        "dementia": features["dementia"],
        "curr_service": SERVICE_MAP[features["curr_service"]],
    }])
    prediction = model.predict(df)[0]
    proba = model.predict_proba(df)[0]
    label = {0: "low", 1: "high"}[int(prediction)]
    return {"label": label, "confidence": round(float(max(proba)), 3)}