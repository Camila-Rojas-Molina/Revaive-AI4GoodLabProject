import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client
from api.middleware.auth import get_current_user

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@router.post("/generate/{patient_id}")
async def generate_report(patient_id: str, _user=Depends(get_current_user)):
    db = _db()

    sessions = (
        db.table("sessions")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(2)
        .execute()
    )

    if not sessions.data:
        raise HTTPException(status_code=404, detail="No sessions found for this patient")

    latest = sessions.data[0]
    score_today = latest.get("cognitive_score")

    score_delta = None
    trend_direction = "stable"

    if len(sessions.data) > 1:
        prev_score = sessions.data[1].get("cognitive_score")
        if score_today is not None and prev_score is not None:
            score_delta = round(score_today - prev_score, 1)
            if score_delta > 5:
                trend_direction = "improving"
            elif score_delta < -5:
                trend_direction = "declining"

    recommendations = {
        "improving": "Continue current therapy plan. Patient showing positive cognitive trends.",
        "declining": "Review therapy intensity. Consider increasing session frequency or scheduling a nurse check-in.",
        "stable": "Maintain current care plan. Monitor for changes over the next 48 hours.",
    }
    recommendation = recommendations[trend_direction]

    delta_str = (
        f"+{score_delta:.1f}" if score_delta is not None and score_delta > 0
        else f"{score_delta:.1f}" if score_delta is not None
        else "N/A"
    )

    body_text = f"""# Cognitive Report — {date.today().isoformat()}

**Patient ID:** {patient_id}
**Score Today:** {score_today}/100
**Change from Last Session:** {delta_str}
**Trend:** {trend_direction.capitalize()}

## Recommendation
{recommendation}

## Session Details
- Theme: {latest.get('theme') or 'N/A'}
- Difficulty: {latest.get('difficulty') or 'N/A'}
- Duration: {latest.get('duration_seconds') or 'N/A'} seconds
- Escalation Flag: {'Yes' if latest.get('flag_escalate') else 'No'}
"""
    # TODO: add Brevo email delivery here

    result = db.table("reports").insert({
        "patient_id": patient_id,
        "session_id": latest["id"],
        "score_today": score_today,
        "score_delta": score_delta,
        "trend_direction": trend_direction,
        "recommendation": recommendation,
        "body_text": body_text,
    }).execute()

    return result.data[0]


@router.get("/{patient_id}")
async def get_reports(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("reports")
        .select("*")
        .eq("patient_id", patient_id)
        .order("report_date", desc=True)
        .execute()
    )
    return result.data
