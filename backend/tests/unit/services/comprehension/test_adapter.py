"""Unit tests for the 2-level adapt state machine (D-12, D-13)."""
from app.schemas.comprehension import AdaptLevel
from app.services.olorin.comprehension.adapter import next_adapt_level


class TestNextAdaptLevel:
    """D-12, D-13 pure function — no LLM calls."""

    def test_a1_initial_score3_to_harder(self) -> None:
        assert (
            next_adapt_level(AdaptLevel.INITIAL, last_score=3, prior_wrong_streak=0)
            == AdaptLevel.HARDER
        )

    def test_a2_initial_score2_to_harder(self) -> None:
        assert (
            next_adapt_level(AdaptLevel.INITIAL, last_score=2, prior_wrong_streak=0)
            == AdaptLevel.HARDER
        )

    def test_a3_initial_score1_to_simpler_retry(self) -> None:
        assert (
            next_adapt_level(AdaptLevel.INITIAL, last_score=1, prior_wrong_streak=0)
            == AdaptLevel.SIMPLER_RETRY
        )

    def test_a4_initial_score0_to_simpler_retry(self) -> None:
        assert (
            next_adapt_level(AdaptLevel.INITIAL, last_score=0, prior_wrong_streak=0)
            == AdaptLevel.SIMPLER_RETRY
        )

    def test_a5_simpler_retry_score0_to_answer_reveal(self) -> None:
        assert (
            next_adapt_level(
                AdaptLevel.SIMPLER_RETRY, last_score=0, prior_wrong_streak=1,
            )
            == AdaptLevel.ANSWER_REVEAL
        )

    def test_a6_simpler_retry_score1_to_answer_reveal(self) -> None:
        assert (
            next_adapt_level(
                AdaptLevel.SIMPLER_RETRY, last_score=1, prior_wrong_streak=1,
            )
            == AdaptLevel.ANSWER_REVEAL
        )

    def test_a7_simpler_retry_score2_recovers_to_harder(self) -> None:
        assert (
            next_adapt_level(
                AdaptLevel.SIMPLER_RETRY, last_score=2, prior_wrong_streak=1,
            )
            == AdaptLevel.HARDER
        )

    def test_a8_answer_reveal_resets_to_initial(self) -> None:
        assert (
            next_adapt_level(
                AdaptLevel.ANSWER_REVEAL, last_score=0, prior_wrong_streak=2,
            )
            == AdaptLevel.INITIAL
        )

    def test_harder_correct_stays_harder_branch(self) -> None:
        # From HARDER with a correct answer, we escalate again.
        assert (
            next_adapt_level(AdaptLevel.HARDER, last_score=3, prior_wrong_streak=0)
            == AdaptLevel.HARDER
        )

    def test_harder_wrong_goes_simpler_retry_first_time(self) -> None:
        # From HARDER with wrong answer (streak=0), go to simpler retry — not
        # straight to reveal, since the student hasn't been wrong in a row.
        assert (
            next_adapt_level(AdaptLevel.HARDER, last_score=1, prior_wrong_streak=0)
            == AdaptLevel.SIMPLER_RETRY
        )
