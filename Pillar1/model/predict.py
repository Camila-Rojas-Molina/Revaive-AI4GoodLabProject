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
SURGICAL_CATEGORY_MAP = {"Neurosurgery": 0, "Other": 1, "Unknown": 2}


def predict(features: dict) -> dict:
    df = pd.DataFrame([{
        "anchor_age": features["anchor_age"],
        "gender": GENDER_MAP[features["gender"]],
        "admission_type": ADMISSION_TYPE_MAP[features["admission_type"]],
        "prior_delirium": features["prior_delirium"],
        "dementia": features["dementia"],
        "surgical_category": SURGICAL_CATEGORY_MAP[features["surgical_category"]],
    }])
    prediction = model.predict(df)[0]
    proba = model.predict_proba(df)[0]
    label = {0: "low", 1: "high"}[int(prediction)]
    return {"label": label, "confidence": round(float(max(proba)), 3)}