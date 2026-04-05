"""Golden-set eval harness for the rubric scorer (FND-03, D-19, D-20).

Runs the scorer against a set of (scene_context, question, student_answer,
expected_score) tuples and reports grader-vs-human agreement. Used by
tests/eval/test_grader_golden_set.py and pre-pilot gating — Phase 4 PILOT-03
requires >=85% agreement before partner rollout.

Phase 1 ONLY MEASURES. No threshold enforced here.

DEV/TEST ONLY. Never invoke from production request path.
"""
from dataclasses import dataclass, field
from typing import Awaitable, Callable, List

from app.schemas.comprehension import RubricScore, ScoreBand


ScorerFn = Callable[..., Awaitable[RubricScore]]


def _score_to_band(score: int) -> str:
    """Map numeric score to band string value per D-03."""
    if score >= 3:
        return ScoreBand.HIGH.value
    if score == 2:
        return ScoreBand.MED.value
    return ScoreBand.LOW.value


@dataclass
class TupleMismatch:
    """Single disagreement between expected and actual score for one tuple."""

    tuple_id: str
    scene_id: str
    expected_score: int
    actual_score: int
    expected_band: str
    actual_band: str
    actual_rationale: str


@dataclass
class GoldenSetResult:
    """Aggregate agreement stats + per-tuple mismatch records."""

    total: int
    exact_score_matches: int
    band_matches: int
    score_agreement_pct: float
    band_agreement_pct: float
    mismatches: List[TupleMismatch] = field(default_factory=list)

    def summary_report(self) -> str:
        """Human-readable report, capped to first 20 mismatches."""
        lines = [
            f"Golden-set eval: {self.total} tuples",
            (
                f"  Exact score agreement: {self.exact_score_matches}/{self.total} "
                f"= {self.score_agreement_pct:.1f}%"
            ),
            (
                f"  Band agreement:        {self.band_matches}/{self.total} "
                f"= {self.band_agreement_pct:.1f}%"
            ),
            "  Phase 4 pilot gate: >=85% (PILOT-03). Phase 1 measures only.",
        ]
        if self.mismatches:
            lines.append("  Mismatches (first 20):")
            for m in self.mismatches[:20]:
                rationale = m.actual_rationale[:100]
                lines.append(
                    f"    {m.tuple_id} [{m.scene_id}]: "
                    f"expected score={m.expected_score} band={m.expected_band}, "
                    f"got score={m.actual_score} band={m.actual_band} "
                    f"| rationale: {rationale}"
                )
        return "\n".join(lines)


async def run_golden_set_eval(
    tuples: List[dict],
    rubric: str,
    scorer_fn: ScorerFn,
) -> GoldenSetResult:
    """Run scorer against every tuple; compute agreement.

    scorer_fn signature matches RubricScoringService.score:
        (rubric, scene_context, question, student_answer) -> RubricScore

    Tuples match the JSON fixture shape from his_girl_friday_tuples.json —
    every tuple MUST contain tuple_id, scene_id, scene_context, question,
    student_answer, expected_score, expected_band.
    """
    total = len(tuples)
    exact = 0
    band_match = 0
    mismatches: List[TupleMismatch] = []

    for t in tuples:
        result: RubricScore = await scorer_fn(
            rubric=rubric,
            scene_context=t["scene_context"],
            question=t["question"],
            student_answer=t["student_answer"],
        )
        expected_score = t["expected_score"]
        expected_band = t["expected_band"]
        actual_band = _score_to_band(result.score)
        is_exact = result.score == expected_score
        is_band = actual_band == expected_band
        if is_exact:
            exact += 1
        if is_band:
            band_match += 1
        if not is_exact:
            mismatches.append(
                TupleMismatch(
                    tuple_id=t["tuple_id"],
                    scene_id=t["scene_id"],
                    expected_score=expected_score,
                    actual_score=result.score,
                    expected_band=expected_band,
                    actual_band=actual_band,
                    actual_rationale=result.rationale,
                )
            )

    score_pct = (exact / total * 100.0) if total else 0.0
    band_pct = (band_match / total * 100.0) if total else 0.0
    return GoldenSetResult(
        total=total,
        exact_score_matches=exact,
        band_matches=band_match,
        score_agreement_pct=score_pct,
        band_agreement_pct=band_pct,
        mismatches=mismatches,
    )
