"""
CogBridge – Cognitive Scorer: Tests & Demo
------------------------------------------
Run with:  python test_cognitive_scorer.py

These tests use mocked timestamps and toy transcripts so you don't
need a running Whisper/GPT pipeline to verify the scoring logic.
"""

from datetime import datetime, timedelta
from cognitive_scorer import (
    Turn, score_session, session_to_dict,
    DEFAULT_WEIGHTS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ts(offset_s: float) -> datetime:
    """Datetime offset from an arbitrary base."""
    base = datetime(2026, 6, 10, 9, 0, 0)
    return base + timedelta(seconds=offset_s)


def make_turn(
    speaker: str,
    text: str,
    start_s: float,
    end_s: float,
    prompt: str = "",
    entities: list[str] | None = None,
) -> Turn:
    return Turn(
        speaker=speaker,
        text=text,
        timestamp_start=_ts(start_s),
        timestamp_end=_ts(end_s),
        prompt_text=prompt,
        entities_in_prompt=entities or [],
    )


# ---------------------------------------------------------------------------
# Test transcripts
# ---------------------------------------------------------------------------

HEALTHY_TRANSCRIPT = [
    make_turn("bot",
              "Good morning! Can you tell me what day of the week it is today?",
              0, 4),
    make_turn("patient",
              "It's Tuesday morning. I remember because my daughter Maria visits on Tuesdays.",
              5, 11, entities=["Maria"]),

    make_turn("bot",
              "That's wonderful. Can you describe a favourite memory from your childhood?",
              12, 18),
    make_turn("patient",
              "I grew up in a small town. Every summer we would gather at the lake, "
              "swimming and laughing until sunset. My grandmother baked fresh bread on Sundays.",
              20, 35),

    make_turn("bot",
              "Beautiful. Now, I mentioned your daughter Maria earlier. What does she like to do?",
              36, 42, entities=["Maria"]),
    make_turn("patient",
              "Maria loves gardening. She has the most wonderful roses in her backyard. "
              "We sometimes cook together when she visits.",
              43, 52, entities=["Maria"]),
]

IMPAIRED_TRANSCRIPT = [
    make_turn("bot",
              "Good morning! Can you tell me what day of the week it is today?",
              0, 4),
    make_turn("patient",
              "I don't know. It is a day.",
              7, 12, entities=[]),

    make_turn("bot",
              "That's okay. Can you describe a favourite memory from your childhood?",
              13, 19),
    make_turn("patient",
              "I had a house. It was nice.",
              25, 30),

    make_turn("bot",
              "I mentioned your daughter Maria earlier. What does she like to do?",
              31, 37, entities=["Maria"]),
    make_turn("patient",
              "I have children. They come sometimes.",
              45, 52, entities=["Maria"]),  # Maria not recalled
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_healthy_scores_higher():
    healthy = score_session(HEALTHY_TRANSCRIPT, "P001", "S001")
    impaired = score_session(IMPAIRED_TRANSCRIPT, "P002", "S002")

    print("\n── Healthy patient ──")
    print(f"  CRI: {healthy.cognitive_recovery_index}")
    print(f"  Components: {healthy.component_scores}")

    print("\n── Impaired patient ──")
    print(f"  CRI: {impaired.cognitive_recovery_index}")
    print(f"  Components: {impaired.component_scores}")

    assert healthy.cognitive_recovery_index > impaired.cognitive_recovery_index, (
        f"Expected healthy ({healthy.cognitive_recovery_index}) > "
        f"impaired ({impaired.cognitive_recovery_index})"
    )
    print("\n✓ Healthy scores higher than impaired")


def test_flag_on_drop():
    session = score_session(
        IMPAIRED_TRANSCRIPT, "P003", "S003",
        baseline_cri=75.0,          # previous session was 75
        flag_drop_threshold=10.0,
    )
    assert session.flag_for_review is True, "Should flag when CRI drops 10+ points"
    print("✓ Flag triggered on CRI drop")


def test_no_flag_if_stable():
    # Score a healthy transcript but pretend baseline was only slightly higher
    session = score_session(
        HEALTHY_TRANSCRIPT, "P001", "S001",
        baseline_cri=session_to_dict(
            score_session(HEALTHY_TRANSCRIPT, "P001", "S000")
        )["cognitive_recovery_index"] + 5,   # just 5 pts above
        flag_drop_threshold=10.0,
    )
    assert session.flag_for_review is False
    print("✓ No flag when drop is below threshold")


def test_serialisation():
    session = score_session(HEALTHY_TRANSCRIPT, "P001", "S001")
    d = session_to_dict(session)
    assert "cognitive_recovery_index" in d
    assert "features" in d
    assert isinstance(d["session_datetime"], str)
    print("✓ Serialisation to dict works")


def test_empty_transcript():
    """Should not crash on an empty or bot-only transcript."""
    bot_only = [make_turn("bot", "Hello!", 0, 3)]
    session = score_session(bot_only, "P999", "S999")
    assert session.cognitive_recovery_index == 0.0
    print("✓ Empty / bot-only transcript handled gracefully")


# ---------------------------------------------------------------------------
# Demo: print a full scored session
# ---------------------------------------------------------------------------

def demo():
    print("\n" + "=" * 55)
    print("  CogBridge – Cognitive Scorer Demo")
    print("=" * 55)

    result = score_session(
        HEALTHY_TRANSCRIPT,
        patient_id="P001",
        session_id="SESSION_20260610_090000",
        baseline_cri=68.0,
    )

    import json
    print(json.dumps(session_to_dict(result), indent=2))


if __name__ == "__main__":
    print("Running tests...")
    test_healthy_scores_higher()
    test_flag_on_drop()
    test_no_flag_if_stable()
    test_serialisation()
    test_empty_transcript()
    print("\n✅ All tests passed")
    demo()
