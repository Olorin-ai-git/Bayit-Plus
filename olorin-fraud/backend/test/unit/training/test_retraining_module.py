"""
Unit tests for Retraining Module (Triggers, Regression, Versioning)
Feature: 026-llm-training-pipeline
"""

from datetime import datetime, timedelta

import pytest

from app.service.training.retraining.model_versioner import ModelVersioner
from app.service.training.retraining.regression_runner import RegressionRunner
from app.service.training.retraining.retrain_trigger import RetrainTrigger
from app.service.training.retraining.retraining_models import (
    ModelSnapshot,
    RegressionResult,
    RetrainEvent,
    RetrainReason,
)
from app.service.training.training_models import TrainingSample


class TestRetrainReason:
    """Tests for retrain reason enum."""

    def test_retrain_reason_values(self):
        """Test retrain reason enum values."""
        assert RetrainReason.DRIFT_DETECTED.value == "drift_detected"
        assert RetrainReason.PERFORMANCE_DEGRADATION.value == "performance_degradation"
        assert RetrainReason.SCHEDULED.value == "scheduled"
        assert RetrainReason.MANUAL.value == "manual"


class TestRetrainEvent:
    """Tests for retrain event dataclass."""

    def test_retrain_event_creation(self):
        """Test creating retrain event."""
        event = RetrainEvent(
            event_id="evt_123",
            reason=RetrainReason.DRIFT_DETECTED,
            triggered_at=datetime.utcnow(),
            details={"drift_score": 0.35},
        )
        assert event.event_id == "evt_123"
        assert event.reason == RetrainReason.DRIFT_DETECTED

    def test_retrain_event_to_dict(self):
        """Test retrain event to dict conversion."""
        event = RetrainEvent(
            event_id="evt_456",
            reason=RetrainReason.MANUAL,
            triggered_at=datetime.utcnow(),
        )
        d = event.to_dict()

        assert isinstance(d, dict)
        assert d["reason"] == "manual"


class TestRegressionResult:
    """Tests for regression result dataclass."""

    def test_regression_result_creation(self):
        """Test creating regression result."""
        result = RegressionResult(
            test_id="test_123",
            model_version="v2.0",
            run_at=datetime.utcnow(),
            passed=True,
            baseline_pr_auc=0.85,
            current_pr_auc=0.87,
            degradation=-0.02,
            sample_count=1000,
        )
        assert result.passed is True
        assert result.degradation == -0.02

    def test_regression_result_is_improvement(self):
        """Test is_improvement property."""
        improved = RegressionResult(
            test_id="t1",
            model_version="v2",
            run_at=datetime.utcnow(),
            passed=True,
            baseline_pr_auc=0.80,
            current_pr_auc=0.85,
        )
        assert improved.is_improvement is True

        degraded = RegressionResult(
            test_id="t2",
            model_version="v3",
            run_at=datetime.utcnow(),
            passed=False,
            baseline_pr_auc=0.85,
            current_pr_auc=0.80,
        )
        assert degraded.is_improvement is False


class TestModelSnapshot:
    """Tests for model snapshot dataclass."""

    def test_model_snapshot_creation(self):
        """Test creating model snapshot."""
        snapshot = ModelSnapshot(
            snapshot_id="snap_123",
            model_version="v2.0",
            created_at=datetime.utcnow(),
            pr_auc=0.87,
            f1_score=0.82,
            threshold=0.45,
        )
        assert snapshot.pr_auc == 0.87
        assert snapshot.threshold == 0.45

    def test_model_snapshot_to_dict(self):
        """Test model snapshot to dict conversion."""
        snapshot = ModelSnapshot(
            snapshot_id="snap_456",
            model_version="v3.0",
            created_at=datetime.utcnow(),
        )
        d = snapshot.to_dict()

        assert isinstance(d, dict)
        assert d["model_version"] == "v3.0"

    def test_model_snapshot_from_dict(self):
        """Test creating snapshot from dict."""
        data = {
            "snapshot_id": "snap_789",
            "model_version": "v4.0",
            "created_at": "2024-06-01T12:00:00",
            "pr_auc": 0.88,
            "f1_score": 0.83,
        }
        snapshot = ModelSnapshot.from_dict(data)

        assert snapshot.snapshot_id == "snap_789"
        assert snapshot.pr_auc == 0.88


class TestRetrainTrigger:
    """Tests for retrain trigger."""

    def test_retrain_trigger_init(self):
        """Test retrain trigger initialization."""
        trigger = RetrainTrigger()
        assert trigger is not None

    def test_check_drift_trigger(self):
        """Test checking drift trigger."""
        trigger = RetrainTrigger()
        event = trigger.check_drift_trigger()

        if event:
            assert isinstance(event, RetrainEvent)
            assert event.reason == RetrainReason.DRIFT_DETECTED

    def test_check_performance_trigger(self):
        """Test checking performance trigger."""
        trigger = RetrainTrigger()

        event = trigger.check_performance_trigger(
            current_pr_auc=0.75,
            baseline_pr_auc=0.85,
        )

        if event:
            assert isinstance(event, RetrainEvent)
            assert event.reason == RetrainReason.PERFORMANCE_DEGRADATION

    def test_create_manual_trigger(self):
        """Test creating manual trigger."""
        trigger = RetrainTrigger()
        event = trigger.create_manual_trigger(reason="Scheduled retrain")

        assert isinstance(event, RetrainEvent)
        assert event.reason == RetrainReason.MANUAL

    def test_mark_retrain_complete(self):
        """Test marking retrain complete."""
        trigger = RetrainTrigger()
        trigger.create_manual_trigger()
        trigger.mark_retrain_complete()

        pending = trigger.get_pending_events()
        assert len(pending) == 0


class TestRegressionRunner:
    """Tests for regression runner."""

    def test_regression_runner_init(self):
        """Test regression runner initialization."""
        runner = RegressionRunner()
        assert runner is not None

    def test_run_regression(self):
        """Test running regression test."""
        runner = RegressionRunner()

        samples = [
            TrainingSample(
                entity_type="EMAIL",
                entity_value=f"test{i}@example.com",
                is_fraud=(i % 3 == 0),
                features={"tx_count": i * 10},
            )
            for i in range(200)
        ]

        current_scores = [0.3 + (0.4 * (i % 3 == 0)) for i in range(200)]
        baseline_scores = [0.25 + (0.45 * (i % 3 == 0)) for i in range(200)]

        result = runner.run_regression(
            test_samples=samples,
            current_scores=current_scores,
            baseline_scores=baseline_scores,
            model_version="v2.0",
        )

        assert isinstance(result, RegressionResult)
        assert result.model_version == "v2.0"

    def test_should_block_deployment(self):
        """Test should_block_deployment check."""
        runner = RegressionRunner()

        passed_result = RegressionResult(
            test_id="t1",
            model_version="v1",
            run_at=datetime.utcnow(),
            passed=True,
        )
        assert runner.should_block_deployment(passed_result) is False

        failed_result = RegressionResult(
            test_id="t2",
            model_version="v2",
            run_at=datetime.utcnow(),
            passed=False,
        )
        assert runner.should_block_deployment(failed_result) is True

    def test_get_pass_rate(self):
        """Test getting pass rate."""
        runner = RegressionRunner()
        rate = runner.get_pass_rate()

        assert isinstance(rate, float)
        assert 0.0 <= rate <= 1.0


class TestModelVersioner:
    """Tests for model versioner."""

    def test_model_versioner_init(self):
        """Test model versioner initialization."""
        versioner = ModelVersioner()
        assert versioner is not None

    def test_create_snapshot(self):
        """Test creating model snapshot."""
        versioner = ModelVersioner()

        snapshot = versioner.create_snapshot(
            model_version="v1.0",
            pr_auc=0.85,
            f1_score=0.80,
            threshold=0.50,
        )

        assert isinstance(snapshot, ModelSnapshot)
        assert snapshot.model_version == "v1.0"
        assert snapshot.pr_auc == 0.85

    def test_get_latest(self):
        """Test getting latest snapshot."""
        versioner = ModelVersioner()

        versioner.create_snapshot(
            model_version="v1.0",
            pr_auc=0.85,
            f1_score=0.80,
            threshold=0.50,
        )

        latest = versioner.get_latest()
        assert latest is not None
        assert latest.model_version == "v1.0"

    def test_get_by_version(self):
        """Test getting snapshot by version."""
        versioner = ModelVersioner()

        versioner.create_snapshot(
            model_version="test_v1",
            pr_auc=0.85,
            f1_score=0.80,
            threshold=0.50,
        )

        snapshot = versioner.get_by_version("test_v1")
        assert snapshot is not None
        assert snapshot.model_version == "test_v1"

    def test_get_history(self):
        """Test getting snapshot history."""
        versioner = ModelVersioner()

        for i in range(3):
            versioner.create_snapshot(
                model_version=f"v{i}",
                pr_auc=0.80 + i * 0.02,
                f1_score=0.75 + i * 0.02,
                threshold=0.50,
            )

        history = versioner.get_history(limit=5)
        assert isinstance(history, list)
        assert len(history) >= 3
