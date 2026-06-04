import re
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import create_client
from api.middleware.auth import get_current_user

router = APIRouter()


def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class ScoreInput(BaseModel):
    transcript: str


def compute_score(transcript: str) -> dict:
    # TODO: replace with trained regression model
    words = transcript.lower().split()
    if not words:
        return {"score": 0.0, "features": {}}

    unique_words = len(set(words))
    total_words = len(words)
    type_token_ratio = unique_words / total_words

    sentences = [s.strip() for s in re.split(r"[.!?]+", transcript) if s.strip()]
    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0

    score = round(min(100.0, type_token_ratio * 100 + avg_sentence_length * 2), 1)

    return {
        "score": score,
        "features": {
            "type_token_ratio": round(type_token_ratio, 3),
            "avg_sentence_length": round(avg_sentence_length, 1),
            "unique_words": unique_words,
            "total_words": total_words,
        },
    }


@router.post("/compute")
async def compute_cognitive_score(data: ScoreInput):
    return compute_score(data.transcript)


@router.get("/{patient_id}/trend")
async def get_score_trend(patient_id: str, _user=Depends(get_current_user)):
    db = _db()
    result = (
        db.table("sessions")
        .select("session_date, cognitive_score")
        .eq("patient_id", patient_id)
        .order("session_date")
        .execute()
    )
    return [
        {"date": row["session_date"], "score": row["cognitive_score"]}
        for row in result.data
        if row["cognitive_score"] is not None
    ]
