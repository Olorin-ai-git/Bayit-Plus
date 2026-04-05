"""Golden-set grader agreement tests (FND-03, D-20).

Two entry points:
  - test_grader_agreement_recorded: runs harness with a mocked scorer that
    echoes each tuple's expected score. Wiring test — validates the harness
    plumbs against the real fixture JSON. No live LLM API calls.
  - test_grader_agreement_live: runs harness against the real Haiku API via
    rubric_scoring_service.score. Gated behind `@pytest.mark.live`; skipped
    in CI by default.

Phase 1 MEASURES agreement. Phase 4 PILOT-03 GATES at >=85% (0.85).
No threshold is asserted here — Phase 1 is measurement only.
"""
import json
import pathlib

import pytest

from app.schemas.comprehension import RubricScore
from app.services.olorin.comprehension.eval_harness import run_golden_set_eval

FIXTURE_DIR = (
    pathlib.Path(__file__).parent.parent
    / "fixtures"
    / "comprehension_golden_set"
)


def _load_fixture():
    with open(FIXTURE_DIR / "his_girl_friday_tuples.json") as f:
        data = json.load(f)
    rubric = (FIXTURE_DIR / "his_girl_friday_rubric.md").read_text()
    return data["tuples"], rubric


@pytest.mark.asyncio
async def test_grader_agreement_recorded(capsys):
    """Wiring test: harness end-to-end with a scorer mock that echoes expected.

    Asserts 100% agreement (mock echoes expected); validates harness plumbing
    against the real fixture JSON. Does not hit any LLM API.
    """
    tuples, rubric = _load_fixture()
    assert len(tuples) >= 50, (
        f"FND-03 requires >=50 tuples, got {len(tuples)}"
    )

    idx = {"i": 0}

    async def echo_scorer(rubric, scene_context, question, student_answer):
        t = tuples[idx["i"]]
        idx["i"] += 1
        return RubricScore(
            score=t["expected_score"],
            rationale="mocked for wiring test",
        )

    result = await run_golden_set_eval(tuples, rubric, echo_scorer)
    print(result.summary_report())
    assert result.total == len(tuples)
    assert result.exact_score_matches == len(tuples)
    assert result.score_agreement_pct == 100.0
    assert result.mismatches == []


@pytest.mark.asyncio
@pytest.mark.live
async def test_grader_agreement_live(capsys):
    """Live grader eval against real Haiku API. Skipped in CI by default.

    Run with:
        poetry run pytest \
            tests/eval/test_grader_golden_set.py::test_grader_agreement_live \
            -m live -s

    Phase 1 ONLY MEASURES. No threshold asserted here.
    Phase 4 PILOT-03 requires >=85% (0.85) agreement before partner rollout.
    """
    from app.services.olorin.comprehension.scorer import (  # noqa: E501
        rubric_scoring_service,
    )
    tuples, rubric = _load_fixture()
    result = await run_golden_set_eval(
        tuples, rubric, rubric_scoring_service.score
    )
    print(result.summary_report())
    # No agreement assertion — Phase 1 measures only.
    # Phase 4 PILOT-03 gates at >=85% (0.85) before partner rollout.
    assert result.total == len(tuples)
