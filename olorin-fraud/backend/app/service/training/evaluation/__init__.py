"""
Evaluation Module
Feature: 026-llm-training-pipeline

Provides advanced evaluation metrics, cohort analysis, and champion-challenger.
"""

from app.service.training.evaluation.champion_challenger import (
    ChampionChallenger,
    get_champion_challenger,
)
from app.service.training.evaluation.cohort_evaluator import CohortEvaluator
from app.service.training.evaluation.evaluation_models import (
    ChallengerResult,
    CohortMetrics,
    PRCurve,
)
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator

__all__ = [
    "PRMetricsCalculator",
    "CohortEvaluator",
    "ChampionChallenger",
    "get_champion_challenger",
    "PRCurve",
    "CohortMetrics",
    "ChallengerResult",
]
