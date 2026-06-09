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

import math
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import nltk
import spacy
from nltk.corpus import stopwords
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
        # Lightweight model, good balance of speed and accuracy
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Turn:
    """
    A single exchange in a session transcript.

    speaker         : "patient" or "bot"
    text            : transcribed or generated text
    timestamp_start : absolute datetime when the speaker started
    timestamp_end   : absolute datetime when the speaker finished
    prompt_text     : the bot's question this turn is responding to
                      (only relevant when speaker == "patient")
    entities_in_prompt : named entities the bot explicitly mentioned
                         (names, places, dates) that the patient *should*
                         recall — used for entity recall scoring
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
    # Vocabulary
    type_token_ratio: float = 0.0        # unique words / total words  [0-1]
    avg_word_length: float = 0.0         # proxy for lexical complexity

    # Fluency
    speech_rate_wpm: float = 0.0         # words per minute

    # Coherence
    coherence_score: float = 0.0         # cosine sim between response & prompt [0-1]

    # Memory / recall
    entity_recall_rate: float = 0.0      # % of bot-mentioned entities patient repeated

    # Timing
    avg_response_latency_s: float = 0.0  # seconds from bot end → patient start

    # Metadata
    patient_turns: int = 0
    total_patient_words: int = 0


@dataclass
class ScoredSession:
    """Final output sent to the dashboard."""
    session_id: str
    patient_id: str
    session_datetime: datetime
    features: SessionFeatures
    component_scores: dict[str, float]   # each feature scaled to [0, 100]
    weights: dict[str, float]
    cognitive_recovery_index: float      # final weighted score [0, 100]
    flag_for_review: bool                # True if CRI drops significantly vs baseline
    notes: str = ""


# ---------------------------------------------------------------------------
# Feature weights
# Adjust as evidence accumulates; should sum to 1.0
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS: dict[str, float] = {
    "coherence":        0.25,
    "type_token_ratio": 0.20,
    "latency":          0.20,
    "speech_rate":      0.15,
    "entity_recall":    0.10,
    "lexical_complex":  0.10,
}


# ---------------------------------------------------------------------------
# Feature extraction helpers
# ---------------------------------------------------------------------------

def _patient_turns(transcript: list[Turn]) -> list[Turn]:
    return [t for t in transcript if t.speaker == "patient"]


def _preceding_bot_turn(transcript: list[Turn], idx: int) -> Optional[Turn]:
    """Return the most recent bot turn before transcript[idx]."""
    for t in reversed(transcript[:idx]):
        if t.speaker == "bot":
            return t
    return None


def compute_vocabulary_features(turns: list[Turn]) -> tuple[float, float]:
    """Returns (type_token_ratio, avg_word_length) for all patient speech."""
    all_words: list[str] = []
    for t in turns:
        tokens = word_tokenize(t.text.lower())
        words = [w for w in tokens if w.isalpha()]
        all_words.extend(words)

    if not all_words:
        return 0.0, 0.0

    ttr = len(set(all_words)) / len(all_words)
    avg_len = sum(len(w) for w in all_words) / len(all_words)
    return ttr, avg_len


def compute_speech_rate(turns: list[Turn]) -> float:
    """Words per minute averaged across patient turns."""
    rates = []
    for t in turns:
        duration_s = (t.timestamp_end - t.timestamp_start).total_seconds()
        if duration_s <= 0:
            continue
        words = len(word_tokenize(t.text))
        rates.append((words / duration_s) * 60)
    return sum(rates) / len(rates) if rates else 0.0


def compute_coherence(transcript: list[Turn]) -> float:
    """
    Average cosine similarity between each patient response and the
    bot's prompt that preceded it.

    A score near 1.0 means the patient's answers are semantically on-topic.
    A score near 0.0 suggests tangential or confused responses.
    """
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
        # Clamp to [0, 1] — negative cosine is treated as 0
        sims.append(max(0.0, cos))

    return sum(sims) / len(sims) if sims else 0.0


def compute_entity_recall(transcript: list[Turn]) -> float:
    """
    Check whether named entities explicitly introduced by the bot
    (stored in Turn.entities_in_prompt) are later mentioned by the patient.

    A recall of 1.0 means the patient echoed back every entity they were told.
    Used as a lightweight episodic memory proxy.
    """
    nlp = _get_nlp()
    total_entities = 0
    recalled = 0

    patient_text_all = " ".join(
        t.text for t in transcript if t.speaker == "patient"
    ).lower()

    for t in transcript:
        if t.speaker != "patient":
            continue
        for entity in t.entities_in_prompt:
            total_entities += 1
            if entity.lower() in patient_text_all:
                recalled += 1

    if total_entities == 0:
        # If the bot didn't introduce any entities, skip this feature
        return None  # type: ignore[return-value]

    return recalled / total_entities


def compute_response_latency(transcript: list[Turn]) -> float:
    """
    Average seconds between bot turn ending and patient turn starting.
    Lower latency = faster processing (within reason).
    """
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
# Scaling functions  (raw feature → [0, 100] component score)
# ---------------------------------------------------------------------------
# These reference ranges are based on published norms for older adults;
# they should be recalibrated once you have real patient data.

def scale_ttr(ttr: float) -> float:
    """
    TTR in older adult spontaneous speech typically 0.35–0.70.
    Cognitively impaired speakers often fall below 0.40.
    """
    lo, hi = 0.30, 0.72
    return _clamp_scale(ttr, lo, hi)


def scale_avg_word_length(awl: float) -> float:
    """
    Average word length 3.5–5.5 chars is a reasonable range.
    Very short avg length → simplified vocabulary.
    """
    lo, hi = 3.2, 5.8
    return _clamp_scale(awl, lo, hi)


def scale_speech_rate(wpm: float) -> float:
    """
    Normal conversational speech: 110–160 wpm.
    Dementia patients may drop to 60–90 wpm.
    Very fast isn't necessarily better; cap benefit above 160.
    """
    if wpm <= 0:
        return 0.0
    if wpm >= 160:
        return 100.0
    lo, hi = 60.0, 160.0
    return _clamp_scale(wpm, lo, hi)


def scale_coherence(cos_sim: float) -> float:
    """Cosine similarity is already [0, 1]; just scale to 100."""
    return cos_sim * 100.0


def scale_entity_recall(recall: float) -> float:
    """Already [0, 1]."""
    return recall * 100.0


def scale_latency(latency_s: float) -> float:
    """
    Latency of 1–3 s is typical; beyond 8 s suggests processing difficulty.
    Inverted: shorter latency → higher score.
    """
    lo, hi = 1.0, 10.0
    raw = _clamp_scale(latency_s, lo, hi)
    return 100.0 - raw  # invert


def _clamp_scale(value: float, lo: float, hi: float) -> float:
    """Linear map [lo, hi] → [0, 100], clamped."""
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
    """
    Full pipeline: transcript → ScoredSession.

    Parameters
    ----------
    transcript          : ordered list of Turn objects for the session
    patient_id          : hospital / system patient identifier
    session_id          : unique identifier for this session
    weights             : feature weight dict (must sum to 1.0)
    baseline_cri        : patient's CRI from a previous session, for change detection
    flag_drop_threshold : flag for nurse review if CRI dropped by this many points

    Returns
    -------
    ScoredSession ready to serialise to JSON and push to the dashboard
    """
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
    entity_recall_raw = compute_entity_recall(transcript)
    latency = compute_response_latency(transcript)

    features = SessionFeatures(
        type_token_ratio=ttr,
        avg_word_length=awl,
        speech_rate_wpm=speech_rate,
        coherence_score=coherence,
        entity_recall_rate=entity_recall_raw if entity_recall_raw is not None else 0.0,
        avg_response_latency_s=latency,
        patient_turns=len(patient),
        total_patient_words=sum(
            len(word_tokenize(t.text)) for t in patient
        ),
    )

    # --- Scale to [0, 100] ---
    entity_score = (
        scale_entity_recall(entity_recall_raw)
        if entity_recall_raw is not None
        else None
    )

    component_scores: dict[str, float] = {
        "coherence":        scale_coherence(coherence),
        "type_token_ratio": scale_ttr(ttr),
        "latency":          scale_latency(latency),
        "speech_rate":      scale_speech_rate(speech_rate),
        "entity_recall":    entity_score if entity_score is not None else 0.0,
        "lexical_complex":  scale_avg_word_length(awl),
    }

    # --- Redistribute weight if entity recall is unavailable ---
    effective_weights = dict(weights)
    if entity_score is None:
        freed = effective_weights.pop("entity_recall", 0.0)
        # Spread freed weight proportionally among remaining features
        remaining_total = sum(effective_weights.values())
        if remaining_total > 0:
            for k in effective_weights:
                effective_weights[k] += freed * (effective_weights[k] / remaining_total)

    # --- Weighted sum ---
    cri = sum(
        component_scores[k] * effective_weights.get(k, 0.0)
        for k in component_scores
    )
    cri = round(max(0.0, min(100.0, cri)), 2)

    # --- Flag for review ---
    flag = False
    if baseline_cri is not None and (baseline_cri - cri) >= flag_drop_threshold:
        flag = True

    return ScoredSession(
        session_id=session_id,
        patient_id=patient_id,
        session_datetime=datetime.utcnow(),
        features=features,
        component_scores=component_scores,
        weights=effective_weights,
        cognitive_recovery_index=cri,
        flag_for_review=flag,
    )


# ---------------------------------------------------------------------------
# Serialisation helper (for API / dashboard)
# ---------------------------------------------------------------------------

def session_to_dict(s: ScoredSession) -> dict:
    """Convert ScoredSession to a JSON-serialisable dict for the dashboard API."""
    return {
        "session_id": s.session_id,
        "patient_id": s.patient_id,
        "session_datetime": s.session_datetime.isoformat(),
        "cognitive_recovery_index": s.cognitive_recovery_index,
        "flag_for_review": s.flag_for_review,
        "component_scores": s.component_scores,
        "weights": s.weights,
        "features": {
            "type_token_ratio": s.features.type_token_ratio,
            "avg_word_length": s.features.avg_word_length,
            "speech_rate_wpm": s.features.speech_rate_wpm,
            "coherence_score": s.features.coherence_score,
            "entity_recall_rate": s.features.entity_recall_rate,
            "avg_response_latency_s": s.features.avg_response_latency_s,
            "patient_turns": s.features.patient_turns,
            "total_patient_words": s.features.total_patient_words,
        },
        "notes": s.notes,
    }
