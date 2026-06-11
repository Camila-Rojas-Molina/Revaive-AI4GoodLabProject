"""
CogBridge – Pillar 2: Cognitive Scoring Pipeline
-------------------------------------------------
Extracts NLP features from a conversation transcript and computes a
weighted Cognitive Recovery Index (CRI) in [0, 100].

Designed to slot in after each CST session and feed the nurse dashboard.

Dependencies:
    pip install nltk spacy sentence-transformers
    python -m spacy download en_core_web_sm
    python -m nltk.downloader punkt averaged_perceptron_tagger stopwords
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import nltk
import spacy
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer, util

# ---------------------------------------------------------------------------
# Lazy singletons – loaded once per process
# ---------------------------------------------------------------------------

_nlp: Optional[spacy.Language] = None
_embedder: Optional[SentenceTransformer] = None


def _get_nlp() -> spacy.Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Turn:
    """
    A single exchange in a session transcript.

    speaker            : "patient" or "bot"
    text               : transcribed or generated text
    timestamp_start    : absolute datetime when the speaker started
    timestamp_end      : absolute datetime when the speaker finished
    prompt_text        : the bot's question this turn is responding to
    entities_in_prompt : reserved for future entity recall scoring
    """
    speaker: str
    text: str
    timestamp_start: datetime
    timestamp_end: datetime
    prompt_text: str = ""
    entities_in_prompt: list[str] = field(default_factory=list)


@dataclass
class SessionFeatures:
    """Raw extracted features before weighting."""
    type_token_ratio: float = 0.0
    avg_word_length: float = 0.0
    speech_rate_wpm: float = 0.0
    coherence_score: float = 0.0
    entity_recall_rate: float = 0.0
    avg_response_latency_s: float = 0.0
    patient_turns: int = 0
    total_patient_words: int = 0


@dataclass
class ScoredSession:
    """Final output sent to the dashboard."""
    session_id: str
    patient_id: str
    session_datetime: datetime
    features: SessionFeatures
    component_scores: dict[str, float]
    weights: dict[str, float]
    cognitive_recovery_index: float
    flag_for_review: bool
    notes: str = ""


# ---------------------------------------------------------------------------
# Feature weights  (must sum to 1.0)
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS: dict[str, float] = {
    "coherence":        0.30,
    "type_token_ratio": 0.20,
    "latency":          0.20,
    "speech_rate":      0.20,
    "lexical_complex":  0.10,
}


# ---------------------------------------------------------------------------
# Feature extraction helpers
# ---------------------------------------------------------------------------

def _patient_turns(transcript: list[Turn]) -> list[Turn]:
    return [t for t in transcript if t.speaker == "patient"]


def _preceding_bot_turn(transcript: list[Turn], idx: int) -> Optional[Turn]:
    for t in reversed(transcript[:idx]):
        if t.speaker == "bot":
            return t
    return None


def compute_vocabulary_features(turns: list[Turn]) -> tuple[float, float]:
    all_words: list[str] = []
    for t in turns:
        tokens = word_tokenize(t.text.lower())
        FILLERS = {"um", "uh", "like", "yeah", "okay", "ok", "just", "so", "well", "you know", "i mean"}
        words = [w for w in tokens if w.isalpha() and w not in FILLERS]
        all_words.extend(words)
    if not all_words:
        return 0.0, 0.0
    ttr = len(set(all_words)) / len(all_words)
    avg_len = sum(len(w) for w in all_words) / len(all_words)
    return ttr, avg_len


def compute_speech_rate(turns: list[Turn]) -> float:
    rates = []
    for t in turns:
        duration_s = (t.timestamp_end - t.timestamp_start).total_seconds()
        if duration_s <= 0:
            continue
        words = len(word_tokenize(t.text))
        rates.append((words / duration_s) * 60)
    return sum(rates) / len(rates) if rates else 0.0


def compute_coherence(transcript: list[Turn]) -> float:
    embedder = _get_embedder()
    sims = []
    for i, turn in enumerate(transcript):
        if turn.speaker != "patient":
            continue
        bot = _preceding_bot_turn(transcript, i)
        if bot is None or not bot.text.strip():
            continue
        emb_prompt = embedder.encode(bot.text, convert_to_tensor=True)
        emb_resp = embedder.encode(turn.text, convert_to_tensor=True)
        cos = float(util.cos_sim(emb_prompt, emb_resp))
        sims.append(max(0.0, cos))
    return sum(sims) / len(sims) if sims else 0.0


def compute_response_latency(transcript: list[Turn]) -> float:
    latencies = []
    for i, turn in enumerate(transcript):
        if turn.speaker != "patient":
            continue
        bot = _preceding_bot_turn(transcript, i)
        if bot is None:
            continue
        lag = (turn.timestamp_start - bot.timestamp_end).total_seconds()
        if lag >= 0:
            latencies.append(lag)
    return sum(latencies) / len(latencies) if latencies else 0.0


# ---------------------------------------------------------------------------
# Scaling functions  (raw feature → [0, 100])
# Ranges recalibrated for realistic conversational speech.
# ---------------------------------------------------------------------------

def scale_ttr(ttr: float) -> float:
    """TTR range 0.30–0.65 maps to 0–100."""
    return _clamp_scale(ttr, 0.30, 0.65)


def scale_avg_word_length(awl: float) -> float:
    """Avg word length 3.5–5.2 chars maps to 0–100."""
    return _clamp_scale(awl, 3.2, 5.0)


def scale_speech_rate(wpm: float) -> float:
    if wpm <= 0:
        return 0.0
    if wpm >= 150:
        return 100.0
    return _clamp_scale(wpm, 40.0, 150.0)


def scale_coherence(cos_sim: float) -> float:
    """
    Q&A cosine similarity typically 0.15–0.65.
    Map this range to 0–100 rather than raw 0–1 scale.
    """
    return _clamp_scale(cos_sim, 0.10, 0.55)


def scale_latency(latency_s: float) -> float:
    """
    1–10 s maps to 0–100, then inverted (shorter = better).
    """
    raw = _clamp_scale(latency_s, 1.0, 10.0)
    return 100.0 - raw


def _clamp_scale(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    scaled = (value - lo) / (hi - lo) * 100.0
    return max(0.0, min(100.0, scaled))


# ---------------------------------------------------------------------------
# Main scoring entry point
# ---------------------------------------------------------------------------

def score_session(
    transcript: list[Turn],
    patient_id: str,
    session_id: str,
    weights: dict[str, float] = DEFAULT_WEIGHTS,
    baseline_cri: Optional[float] = None,
    flag_drop_threshold: float = 10.0,
) -> ScoredSession:
    patient = _patient_turns(transcript)

    # --- Guard: no patient speech → return a zero score ---
    if not patient:
        return ScoredSession(
            session_id=session_id,
            patient_id=patient_id,
            session_datetime=datetime.utcnow(),
            features=SessionFeatures(),
            component_scores={k: 0.0 for k in weights},
            weights=weights,
            cognitive_recovery_index=0.0,
            flag_for_review=False,
        )

    # --- Extract raw features ---
    ttr, awl = compute_vocabulary_features(patient)
    speech_rate = compute_speech_rate(patient)
    coherence = compute_coherence(transcript)
    latency = compute_response_latency(transcript)

    features = SessionFeatures(
        type_token_ratio=ttr,
        avg_word_length=awl,
        speech_rate_wpm=speech_rate,
        coherence_score=coherence,
        entity_recall_rate=0.0,
        avg_response_latency_s=latency,
        patient_turns=len(patient),
        total_patient_words=sum(len(word_tokenize(t.text)) for t in patient),
    )

    # --- Scale to [0, 100] ---
    component_scores: dict[str, float] = {
        "coherence":        scale_coherence(coherence),
        "type_token_ratio": scale_ttr(ttr),
        "latency":          scale_latency(latency),
        "speech_rate":      scale_speech_rate(speech_rate),
        "lexical_complex":  scale_avg_word_length(awl),
    }

    # --- Weighted sum ---
    cri = sum(component_scores[k] * weights.get(k, 0.0) for k in component_scores)
    cri = round(max(0.0, min(100.0, cri)), 2)

    # --- Flag for review ---
    flag = (
        baseline_cri is not None and (baseline_cri - cri) >= flag_drop_threshold
    )

    return ScoredSession(
        session_id=session_id,
        patient_id=patient_id,
        session_datetime=datetime.utcnow(),
        features=features,
        component_scores=component_scores,
        weights=weights,
        cognitive_recovery_index=cri,
        flag_for_review=flag,
    )


# ---------------------------------------------------------------------------
# Serialisation helper (for API / dashboard)
# ---------------------------------------------------------------------------

def session_to_dict(s: ScoredSession) -> dict:
    return {
        "session_id": s.session_id,
        "patient_id": s.patient_id,
        "session_datetime": s.session_datetime.isoformat(),
        "cognitive_recovery_index": s.cognitive_recovery_index,
        "flag_for_review": s.flag_for_review,
        "component_scores": s.component_scores,
        "weights": s.weights,
        "features": {
            "type_token_ratio":       s.features.type_token_ratio,
            "avg_word_length":        s.features.avg_word_length,
            "speech_rate_wpm":        s.features.speech_rate_wpm,
            "coherence_score":        s.features.coherence_score,
            "entity_recall_rate":     s.features.entity_recall_rate,
            "avg_response_latency_s": s.features.avg_response_latency_s,
            "patient_turns":          s.features.patient_turns,
            "total_patient_words":    s.features.total_patient_words,
        },
        "notes": s.notes,
    }