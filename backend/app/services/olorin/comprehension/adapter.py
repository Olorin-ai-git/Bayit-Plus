"""2-level adapt state machine (D-12, D-13). Pure — no LLM calls.

D-12: score>=2 -> HARDER. score<=1 from INITIAL -> SIMPLER_RETRY.
D-13: score<=1 from SIMPLER_RETRY (prior_wrong_streak>=1) -> ANSWER_REVEAL.
After ANSWER_REVEAL, next turn resets to INITIAL for a new concept.
"""
from app.schemas.comprehension import AdaptLevel


def next_adapt_level(
    current: AdaptLevel,
    last_score: int,
    prior_wrong_streak: int,
) -> AdaptLevel:
    """Compute next adapt level from scoring outcome.

    Args:
        current: The adapt level of the turn just scored.
        last_score: Numeric rubric score 0-3 from that turn.
        prior_wrong_streak: Count of consecutive score<=1 turns ending
            immediately BEFORE the one just scored (i.e. from the
            prior turn's perspective).

    Returns:
        Adapt level for the NEXT turn.
    """
    if current == AdaptLevel.ANSWER_REVEAL:
        # After reveal, reset for a new concept on the next trigger.
        return AdaptLevel.INITIAL

    is_correct = last_score >= 2
    if is_correct:
        return AdaptLevel.HARDER

    # Incorrect branch (score <= 1).
    if current == AdaptLevel.SIMPLER_RETRY and prior_wrong_streak >= 1:
        # D-13: retry fall-through — student wrong twice in a row, reveal answer.
        return AdaptLevel.ANSWER_REVEAL
    return AdaptLevel.SIMPLER_RETRY
