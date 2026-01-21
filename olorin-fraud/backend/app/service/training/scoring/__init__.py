"""
Scoring Module
Feature: 026-llm-training-pipeline

Provides classical model scoring, calibration, and hybrid LLM integration.
"""

from app.service.training.scoring.classical_scorer import (
    ClassicalScorer,
    get_classical_scorer,
)
from app.service.training.scoring.hybrid_models import (
    ExplanationRequest,
    HybridAssessment,
    ScoringMode,
)
from app.service.training.scoring.hybrid_scorer import (
    HybridScorer,
    get_hybrid_scorer,
)
from app.service.training.scoring.score_calibrator import ScoreCalibrator
from app.service.training.scoring.scorer_models import (
    CalibrationResult,
    ScorerResult,
    ThresholdResult,
)
from app.service.training.scoring.threshold_optimizer import ThresholdOptimizer

__all__ = [
    "ClassicalScorer",
    "get_classical_scorer",
    "ScoreCalibrator",
    "ThresholdOptimizer",
    "HybridScorer",
    "get_hybrid_scorer",
    "ScorerResult",
    "CalibrationResult",
    "ThresholdResult",
    "HybridAssessment",
    "ExplanationRequest",
    "ScoringMode",
]
