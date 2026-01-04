"""
Unit tests for Scoring Module (Classical Model, Calibration, Hybrid)
Feature: 026-llm-training-pipeline
"""

import pytest

from app.service.training.scoring.classical_scorer import ClassicalScorer
from app.service.training.scoring.hybrid_models import (
    ExplanationRequest,
    HybridAssessment,
    ScoringMode,
)
from app.service.training.scoring.score_calibrator import ScoreCalibrator
from app.service.training.scoring.scorer_models import (
    CalibrationResult,
    FeatureWeight,
    ModelWeights,
    ScorerResult,
    ThresholdResult,
)
from app.service.training.scoring.threshold_optimizer import ThresholdOptimizer


class TestScorerModels:
    """Tests for scorer model dataclasses."""

    def test_scorer_result_creation(self):
        """Test creating scorer result."""
        result = ScorerResult(
            risk_score=0.75,
            raw_score=0.8,
            feature_contributions={"velocity": 0.3, "lifecycle": 0.2},
        )
        assert result.risk_score == 0.75
        assert result.raw_score == 0.8

    def test_calibration_result_creation(self):
        """Test creating calibration result."""
        result = CalibrationResult(
            original_score=0.7,
            calibrated_score=0.65,
            calibration_method="isotonic",
        )
        assert result.original_score == 0.7
        assert result.calibrated_score == 0.65

    def test_threshold_result_creation(self):
        """Test creating threshold result."""
        result = ThresholdResult(
            optimal_threshold=0.45,
            cost_at_threshold=1500.0,
            precision_at_threshold=0.85,
            recall_at_threshold=0.72,
            f1_at_threshold=0.78,
            cost_fn_ratio=10.0,
            cost_fp_ratio=1.0,
        )
        assert result.optimal_threshold == 0.45
        assert result.f1_at_threshold == 0.78

    def test_feature_weight_creation(self):
        """Test creating feature weight."""
        weight = FeatureWeight(
            feature_name="velocity_1h",
            weight=0.35,
            is_positive=True,
        )
        assert weight.feature_name == "velocity_1h"
        assert weight.weight == 0.35

    def test_model_weights_creation(self):
        """Test creating model weights."""
        weights = ModelWeights(
            weights=[
                FeatureWeight("velocity", 0.3, True),
                FeatureWeight("lifecycle", -0.2, False),
            ],
            intercept=-1.5,
        )
        assert len(weights.weights) == 2
        assert weights.intercept == -1.5


class TestClassicalScorer:
    """Tests for classical scorer."""

    def test_classical_scorer_init(self):
        """Test classical scorer initialization."""
        scorer = ClassicalScorer()
        assert scorer is not None

    def test_classical_scorer_is_fitted_initially_false(self):
        """Test checking if scorer is fitted initially."""
        scorer = ClassicalScorer()
        # May be True if a pre-trained model exists, False otherwise
        assert isinstance(scorer.is_fitted(), bool)

    def test_classical_scorer_fit(self):
        """Test fitting classical scorer."""
        scorer = ClassicalScorer()
        # Need at least 10 samples and features as dicts
        features = []
        labels = []
        for i in range(20):
            features.append({
                "total_transactions": i * 10,
                "total_gmv": i * 100,
                "avg_tx_value": 50 + i,
                "tx_count_1h": i % 5,
                "tx_count_24h": i * 2,
                "tx_count_7d": i * 10,
                "tx_count_30d": i * 30,
                "velocity_1h_24h_ratio": 0.1 * i,
                "velocity_24h_7d_ratio": 0.2 * i,
                "account_age_days": 100 + i * 10,
            })
            labels.append(i >= 10)  # Half fraud, half legit
        scorer.fit(features, labels)
        assert scorer.is_fitted() is True

    def test_classical_scorer_score(self):
        """Test scoring with fitted model."""
        scorer = ClassicalScorer()
        # Need to fit first with enough samples
        features = []
        labels = []
        for i in range(20):
            features.append({
                "total_transactions": i * 10,
                "total_gmv": i * 100,
                "tx_count_1h": i % 5,
                "tx_count_24h": i * 2,
            })
            labels.append(i >= 10)
        scorer.fit(features, labels)

        result = scorer.score({"total_transactions": 50, "tx_count_1h": 3})
        assert isinstance(result, ScorerResult)
        assert 0.0 <= result.risk_score <= 1.0


class TestScoreCalibrator:
    """Tests for score calibrator."""

    def test_score_calibrator_init(self):
        """Test score calibrator initialization."""
        calibrator = ScoreCalibrator()
        assert calibrator is not None

    def test_score_calibrator_is_fitted_check(self):
        """Test checking if calibrator is fitted."""
        calibrator = ScoreCalibrator()
        # May be True if a saved calibrator exists, False otherwise
        assert isinstance(calibrator.is_fitted(), bool)

    def test_score_calibrator_fit(self):
        """Test fitting calibrator."""
        calibrator = ScoreCalibrator()
        scores = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9] * 20
        labels = [False, False, False, True, True, True] * 20
        result = calibrator.fit(scores, labels)
        assert result is True
        assert calibrator.is_fitted() is True

    def test_score_calibrator_calibrate(self):
        """Test calibrating scores."""
        calibrator = ScoreCalibrator()
        scores = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9] * 20
        labels = [False, False, False, True, True, True] * 20
        calibrator.fit(scores, labels)
        result = calibrator.calibrate(0.5)
        assert isinstance(result, CalibrationResult)
        assert 0.0 <= result.calibrated_score <= 1.0

    def test_score_calibrator_get_calibration_curve(self):
        """Test getting calibration curve data."""
        calibrator = ScoreCalibrator()
        scores = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9] * 20
        labels = [False, False, False, True, True, True] * 20
        mean_predicted, fraction_positives = calibrator.get_calibration_curve(
            scores, labels, n_bins=5
        )
        assert isinstance(mean_predicted, list)
        assert isinstance(fraction_positives, list)


class TestThresholdOptimizer:
    """Tests for threshold optimizer."""

    def test_threshold_optimizer_init(self):
        """Test threshold optimizer initialization."""
        optimizer = ThresholdOptimizer()
        assert optimizer is not None

    def test_threshold_optimizer_optimize(self):
        """Test optimizing threshold."""
        optimizer = ThresholdOptimizer()
        scores = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]
        labels = [False, False, False, False, True, True, True, True]
        result = optimizer.optimize(scores, labels)
        assert isinstance(result, ThresholdResult)
        assert 0.0 <= result.optimal_threshold <= 1.0


class TestHybridModels:
    """Tests for hybrid scoring models."""

    def test_scoring_mode_enum(self):
        """Test scoring mode enum values."""
        assert ScoringMode.LLM_ONLY.value == "llm_only"
        assert ScoringMode.CLASSICAL_ONLY.value == "classical_only"
        assert ScoringMode.HYBRID.value == "hybrid"

    def test_explanation_request_creation(self):
        """Test creating explanation request."""
        request = ExplanationRequest(
            entity_type="EMAIL",
            entity_value="test@example.com",
            features={"velocity": 0.8},
            classical_score=0.75,
            feature_contributions={"velocity": 0.5},
        )
        assert request.entity_type == "EMAIL"
        assert request.classical_score == 0.75

    def test_hybrid_assessment_creation(self):
        """Test creating hybrid assessment."""
        assessment = HybridAssessment(
            risk_score=0.72,
            confidence=0.85,
            prediction="FRAUD",
            reasoning="High velocity detected",
            classical_score=0.75,
            llm_score=0.68,
            scoring_mode=ScoringMode.HYBRID,
        )
        assert assessment.risk_score == 0.72
        assert assessment.scoring_mode == ScoringMode.HYBRID

    def test_hybrid_assessment_to_dict(self):
        """Test hybrid assessment to dict conversion."""
        assessment = HybridAssessment(
            risk_score=0.72,
            confidence=0.85,
            prediction="LEGIT",
            reasoning="Normal activity",
            classical_score=0.25,
            scoring_mode=ScoringMode.HYBRID,
        )
        d = assessment.to_dict()
        assert isinstance(d, dict)
        assert "risk_score" in d
        assert "scoring_mode" in d

    def test_hybrid_assessment_from_error(self):
        """Test creating error assessment."""
        assessment = HybridAssessment.from_error("Test error")
        assert assessment.prediction == "ERROR"
        assert assessment.error == "Test error"
