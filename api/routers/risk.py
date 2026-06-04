from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Any
from api.middleware.auth import get_current_user

router = APIRouter()


class RiskInput(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None
    surgery_type: Optional[str] = None
    anesthesia_duration_min: Optional[float] = None
    comorbidity_count: Optional[int] = 0
    baseline_orientation_score: Optional[float] = None


def compute_risk_rule_based(features: dict[str, Any]) -> dict[str, Any]:
    # TODO: replace with trained XGBoost model
    points = 0
    top_features: list[dict] = []

    age = features.get("age") or 0
    if age >= 75:
        points += 3
        top_features.append({"feature": "age", "contribution": 3, "value": age})

    comorbidities = features.get("comorbidity_count") or 0
    if comorbidities >= 3:
        points += 2
        top_features.append({"feature": "comorbidity_count", "contribution": 2, "value": comorbidities})

    anesthesia = features.get("anesthesia_duration_min") or 0
    if anesthesia >= 180:
        points += 2
        top_features.append({"feature": "anesthesia_duration_min", "contribution": 2, "value": anesthesia})

    orientation = features.get("baseline_orientation_score")
    if orientation is not None and orientation <= 5:
        points += 3
        top_features.append({"feature": "baseline_orientation_score", "contribution": 3, "value": orientation})

    if points >= 7:
        label = "high"
    elif points >= 4:
        label = "medium"
    else:
        label = "low"

    return {
        "label": label,
        "score": round(min(points / 10.0, 1.0), 3),
        "top_features": top_features,
    }


@router.post("/predict")
async def predict_risk(data: RiskInput, _user=Depends(get_current_user)):
    return compute_risk_rule_based(data.model_dump())
