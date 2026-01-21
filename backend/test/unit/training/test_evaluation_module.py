"""
Unit tests for Evaluation Module (PR Metrics, Cohorts, Champion-Challenger)
Feature: 026-llm-training-pipeline
"""

from datetime import datetime

import pytest

from app.service.training.evaluation.champion_challenger import ChampionChallenger
from app.service.training.evaluation.cohort_evaluator import CohortEvaluator
from app.service.training.evaluation.evaluation_models import (
    ChallengerResult,
    CohortMetrics,
    PRCurve,
    RecallAtFPR,
)
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator


class TestPRCurve:
    """Tests for PR curve dataclass."""

    def test_pr_curve_creation(self):
        """Test creating PR curve."""
        curve = PRCurve(
            pr_auc=0.85,
            roc_auc=0.90,
            average_precision=0.82,
            precisions=[0.9, 0.85, 0.80],
            recalls=[0.5, 0.7, 0.9],
            thresholds=[0.7, 0.5, 0.3],
        )
        assert curve.pr_auc == 0.85
        assert curve.roc_auc == 0.90

    def test_pr_curve_to_dict(self):
        """Test PR curve to dict conversion."""
        curve = PRCurve(pr_auc=0.85, roc_auc=0.90)
        d = curve.to_dict()
        assert isinstance(d, dict)
        assert d["pr_auc"] == 0.85


class TestRecallAtFPR:
    """Tests for recall at FPR dataclass."""

    def test_recall_at_fpr_creation(self):
        """Test creating recall at FPR."""
        recall = RecallAtFPR(
            target_fpr=0.005,
            achieved_recall=0.72,
            actual_fpr=0.004,
            threshold_used=0.65,
        )
        assert recall.target_fpr == 0.005
        assert recall.achieved_recall == 0.72


class TestCohortMetrics:
    """Tests for cohort metrics dataclass."""

    def test_cohort_metrics_creation(self):
        """Test creating cohort metrics."""
        metrics = CohortMetrics(
            cohort_name="merchant_abc",
            cohort_dimension="merchant",
            sample_count=500,
            fraud_count=25,
            pr_auc=0.82,
            f1_score=0.75,
        )
        assert metrics.cohort_name == "merchant_abc"
        assert metrics.get_fraud_rate() == 25 / 500

    def test_cohort_metrics_to_dict(self):
        """Test cohort metrics to dict conversion."""
        metrics = CohortMetrics(
            cohort_name="US",
            cohort_dimension="region",
            sample_count=1000,
            fraud_count=50,
        )
        d = metrics.to_dict()
        assert isinstance(d, dict)
        assert d["cohort_name"] == "US"


class TestChallengerResult:
    """Tests for challenger result dataclass."""

    def test_challenger_result_creation(self):
        """Test creating challenger result."""
        result = ChallengerResult(
            challenger_id="model_v2",
            champion_id="model_v1",
            comparison_date=datetime.utcnow(),
            challenger_pr_auc=0.87,
            champion_pr_auc=0.85,
            sample_count=5000,
            improvement=0.02,
            is_promoted=True,
        )
        assert result.is_promoted is True
        assert result.improvement == 0.02

    def test_challenger_result_is_improvement(self):
        """Test is_improvement property."""
        improved = ChallengerResult(
            challenger_id="v2",
            champion_id="v1",
            comparison_date=datetime.utcnow(),
            improvement=0.02,
        )
        assert improved.is_improvement is True

        not_improved = ChallengerResult(
            challenger_id="v3",
            champion_id="v2",
            comparison_date=datetime.utcnow(),
            improvement=-0.01,
        )
        assert not_improved.is_improvement is False

    def test_challenger_result_to_dict(self):
        """Test challenger result to dict conversion."""
        result = ChallengerResult(
            challenger_id="v2",
            champion_id="v1",
            comparison_date=datetime.utcnow(),
            improvement=0.01,
            is_promoted=False,
        )
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "challenger_id" in d


class TestPRMetricsCalculator:
    """Tests for PR metrics calculator."""

    def test_pr_metrics_calculator_init(self):
        """Test PR metrics calculator initialization."""
        calc = PRMetricsCalculator()
        assert calc is not None

    def test_calculate_pr_curve(self):
        """Test calculating PR curve."""
        calc = PRMetricsCalculator()
        scores = [0.1, 0.2, 0.3, 0.6, 0.7, 0.8, 0.9]
        labels = [False, False, False, True, True, True, True]
        curve = calc.calculate_pr_curve(scores, labels)
        assert isinstance(curve, PRCurve)
        assert 0.0 <= curve.pr_auc <= 1.0
        assert 0.0 <= curve.roc_auc <= 1.0


class TestCohortEvaluator:
    """Tests for cohort evaluator."""

    def test_cohort_evaluator_init(self):
        """Test cohort evaluator initialization."""
        evaluator = CohortEvaluator()
        assert evaluator is not None


class TestChampionChallenger:
    """Tests for champion-challenger framework."""

    def test_champion_challenger_init(self):
        """Test champion-challenger initialization."""
        cc = ChampionChallenger()
        assert cc is not None

    def test_champion_challenger_is_enabled(self):
        """Test checking if enabled."""
        cc = ChampionChallenger()
        assert isinstance(cc.is_enabled(), bool)

    def test_champion_challenger_compare(self):
        """Test comparing champion and challenger."""
        cc = ChampionChallenger()
        champion_scores = [0.1, 0.2, 0.6, 0.7]
        challenger_scores = [0.15, 0.25, 0.65, 0.75]
        labels = [False, False, True, True]

        result = cc.compare(
            champion_scores=champion_scores,
            challenger_scores=challenger_scores,
            labels=labels,
            champion_id="v1",
            challenger_id="v2",
        )

        assert isinstance(result, ChallengerResult)
        assert result.champion_id == "v1"
        assert result.challenger_id == "v2"

    def test_champion_challenger_should_compare(self):
        """Test should_compare sample threshold."""
        cc = ChampionChallenger()
        assert cc.should_compare(500) is False
        assert cc.should_compare(2000) is True

    def test_champion_challenger_get_promotion_summary(self):
        """Test getting promotion summary."""
        cc = ChampionChallenger()
        summary = cc.get_promotion_summary()
        assert isinstance(summary, dict)
        assert "total_comparisons" in summary
        assert "promotion_rate" in summary
