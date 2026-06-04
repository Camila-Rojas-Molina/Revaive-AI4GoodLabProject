import os
import pickle
from Pillar1.model.features import RISK_FEATURES

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")


def _rule_based(features: dict) -> dict:
    """Fallback scorer used when model.pkl is not present."""
    points = 0
    top_features = []

    age = features.get("age") or 0
    if age >= 75:
        points += 3
        top_features.append({"feature": "age", "contribution": 3})

    comorbidities = features.get("comorbidity_count") or 0
    if comorbidities >= 3:
        points += 2
        top_features.append({"feature": "comorbidity_count", "contribution": 2})

    anesthesia = features.get("anesthesia_duration_min") or 0
    if anesthesia >= 180:
        points += 2
        top_features.append({"feature": "anesthesia_duration_min", "contribution": 2})

    orientation = features.get("baseline_orientation_score")
    if orientation is not None and orientation <= 5:
        points += 3
        top_features.append({"feature": "baseline_orientation_score", "contribution": 3})

    if points >= 7:
        label = "high"
    elif points >= 4:
        label = "medium"
    else:
        label = "low"

    return {"label": label, "score": round(min(points / 10.0, 1.0), 3), "top_features": top_features}


def predict(features: dict) -> dict:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        feature_values = [[features.get(k) for k in RISK_FEATURES]]
        prob = float(model.predict_proba(feature_values)[0][1])
        label = "high" if prob >= 0.7 else "medium" if prob >= 0.4 else "low"
        return {"label": label, "score": round(prob, 3), "top_features": []}
    return _rule_based(features)
