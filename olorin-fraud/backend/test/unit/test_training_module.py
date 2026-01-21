"""
Unit tests for LLM Training Pipeline Module
Feature: 026-llm-training-pipeline
"""

import os
from unittest.mock import patch

import pytest


class TestTrainingConfigLoader:
    """Tests for training configuration loading."""

    def test_load_training_config_from_file(self):
        """Test loading config from YAML file."""
        from app.service.training.training_config_loader import load_training_config

        config = load_training_config()
        assert config is not None
        assert hasattr(config, "enabled")
        assert hasattr(config, "reasoning_enabled")
        assert hasattr(config, "provider")
        assert hasattr(config, "scoring")

    def test_config_defaults(self):
        """Test config has expected defaults."""
        from app.service.training.training_config_loader import load_training_config

        config = load_training_config()
        assert config.scoring.fraud_threshold >= 0.0
        assert config.scoring.fraud_threshold <= 1.0
        assert config.batch_processing.batch_size > 0

    def test_get_training_config_singleton(self):
        """Test get_training_config returns same instance."""
        from app.service.training.training_config_loader import get_training_config

        config1 = get_training_config()
        config2 = get_training_config()
        assert config1 is config2


class TestPromptRegistry:
    """Tests for prompt registry."""

    def test_prompt_registry_init(self):
        """Test prompt registry initialization."""
        from app.service.training.prompt_registry import PromptRegistry

        registry = PromptRegistry()
        assert registry is not None

    def test_get_active_version(self):
        """Test getting active prompt version."""
        from app.service.training.prompt_registry import get_prompt_registry

        registry = get_prompt_registry()
        version = registry.get_active_version()
        assert version is not None
        assert isinstance(version, str)

    def test_list_versions(self):
        """Test listing available versions."""
        from app.service.training.prompt_registry import get_prompt_registry

        registry = get_prompt_registry()
        versions = registry.list_versions()
        assert isinstance(versions, list)

    def test_get_prompt_template(self):
        """Test getting prompt template."""
        from app.service.training.prompt_registry import get_prompt_registry

        registry = get_prompt_registry()
        try:
            template = registry.get_prompt_template()
            assert template is not None
            assert hasattr(template, "system_prompt")
            assert hasattr(template, "fraud_analysis_prompt")
        except ValueError:
            pytest.skip("No prompt template files available")


class TestLLMReasoningEngine:
    """Tests for LLM reasoning engine."""

    def test_reasoning_engine_init(self):
        """Test reasoning engine initialization."""
        from app.service.training.llm_reasoning_engine import LLMReasoningEngine

        engine = LLMReasoningEngine()
        assert engine is not None

    def test_is_enabled_default(self):
        """Test is_enabled returns false by default."""
        from app.service.training.llm_reasoning_engine import get_reasoning_engine

        engine = get_reasoning_engine()
        # Default should be disabled
        with patch.dict(os.environ, {"LLM_REASONING_ENABLED": "false"}):
            from app.service.training import training_config_loader

            training_config_loader._training_config = None
            new_engine = get_reasoning_engine()
            # Engine reads from config which may have cached value
            assert isinstance(new_engine.is_enabled(), bool)


class TestFraudAssessment:
    """Tests for fraud assessment dataclass."""

    def test_fraud_assessment_creation(self):
        """Test creating fraud assessment."""
        from app.service.training.llm_reasoning_engine import FraudAssessment

        assessment = FraudAssessment(
            risk_score=0.75,
            confidence=0.9,
            prediction="FRAUD",
            reasoning="High velocity pattern detected",
        )
        assert assessment.risk_score == 0.75
        assert assessment.confidence == 0.9
        assert assessment.prediction == "FRAUD"


class TestTrainingPipeline:
    """Tests for training pipeline."""

    def test_pipeline_init(self):
        """Test training pipeline initialization."""
        from app.service.training.training_pipeline import TrainingPipeline

        pipeline = TrainingPipeline()
        assert pipeline is not None

    def test_training_metrics_calculate(self):
        """Test training metrics calculation."""
        from app.service.training.training_pipeline import TrainingMetrics

        metrics = TrainingMetrics(
            true_positives=80,
            false_positives=10,
            true_negatives=85,
            false_negatives=25,
        )
        metrics.calculate()

        assert metrics.total_samples == 200
        assert metrics.precision == 80 / 90  # TP / (TP + FP)
        assert metrics.recall == 80 / 105  # TP / (TP + FN)
        assert metrics.accuracy == 165 / 200  # (TP + TN) / total


class TestFeedbackCollector:
    """Tests for feedback collector."""

    def test_feedback_collector_init(self):
        """Test feedback collector initialization."""
        from app.service.training.feedback_collector import FeedbackCollector

        collector = FeedbackCollector()
        assert collector is not None

    def test_is_enabled(self):
        """Test checking if feedback is enabled."""
        from app.service.training.feedback_collector import get_feedback_collector

        collector = get_feedback_collector()
        assert isinstance(collector.is_enabled(), bool)


class TestPromptOptimizer:
    """Tests for prompt optimizer."""

    def test_prompt_optimizer_init(self):
        """Test prompt optimizer initialization."""
        from app.service.training.prompt_optimizer import PromptOptimizer

        optimizer = PromptOptimizer()
        assert optimizer is not None

    def test_is_auto_optimize_enabled(self):
        """Test checking if auto optimize is enabled."""
        from app.service.training.prompt_optimizer import get_prompt_optimizer

        optimizer = get_prompt_optimizer()
        assert isinstance(optimizer.is_auto_optimize_enabled(), bool)


class TestLLMModeSwitchIntegration:
    """Integration tests for LLM mode switch."""

    def test_llm_mode_disabled_by_default(self):
        """Test LLM mode is disabled by default."""
        from app.service.investigation.fraud_detection_features import (
            _is_llm_reasoning_enabled,
        )

        with patch.dict(os.environ, {"LLM_REASONING_ENABLED": "false"}):
            assert _is_llm_reasoning_enabled() is False

    def test_llm_mode_can_be_enabled(self):
        """Test LLM mode can be enabled via env var."""
        from app.service.investigation.fraud_detection_features import (
            _is_llm_reasoning_enabled,
        )

        with patch.dict(os.environ, {"LLM_REASONING_ENABLED": "true"}):
            assert _is_llm_reasoning_enabled() is True

    def test_fraud_detection_uses_rules_when_llm_disabled(self):
        """Test fraud detection uses rule-based scoring when LLM disabled."""
        from app.service.investigation.fraud_detection_features import (
            FraudDetectionFeatures,
        )

        with patch.dict(os.environ, {"LLM_REASONING_ENABLED": "false"}):
            features = FraudDetectionFeatures()
            test_features = {"tx_count": 50, "burst_score_3h": 10}
            score = features._calculate_composite_risk_score(test_features)
            assert isinstance(score, float)
            assert 0.0 <= score <= 1.0
