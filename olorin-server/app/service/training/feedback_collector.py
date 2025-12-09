"""
Feedback Collector
Feature: 026-llm-training-pipeline

Collects feedback from confusion matrix results for prompt optimization.
Tracks misclassifications and triggers optimization when thresholds are breached.
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from app.service.logging import get_bridge_logger
from app.service.training.training_pipeline import PredictionResult, TrainingMetrics

logger = get_bridge_logger(__name__)


@dataclass
class FeedbackEntry:
    """Single feedback entry from a prediction."""

    timestamp: str
    entity_type: str
    entity_value: str
    predicted_fraud: bool
    actual_fraud: bool
    risk_score: float
    confidence: float
    reasoning: str
    error_type: Optional[str] = None
    prompt_version: Optional[str] = None


@dataclass
class FeedbackSummary:
    """Summary of collected feedback."""

    total_entries: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    needs_optimization: bool = False
    optimization_reason: Optional[str] = None


class FeedbackCollector:
    """Collects and manages feedback for prompt optimization."""

    def __init__(self):
        """Initialize feedback collector."""
        self._load_config()
        self._entries: List[FeedbackEntry] = []
        self._ensure_storage_directory()

    def _load_config(self) -> None:
        """Load feedback configuration from YAML."""
        config_path = os.getenv(
            "LLM_FEEDBACK_CONFIG_PATH", "config/feedback_config.yaml"
        )
        path = Path(config_path)
        if not path.is_absolute():
            path = Path(__file__).parent.parent.parent.parent / config_path

        if path.exists():
            with open(path, "r") as f:
                raw = yaml.safe_load(f)
            self._config = raw.get("feedback", {})
        else:
            self._config = {}

        self._enabled = self._get_config_value("enabled", True)
        self._min_precision = self._get_config_value("thresholds.min_precision", 0.85)
        self._min_recall = self._get_config_value("thresholds.min_recall", 0.80)
        self._min_f1 = self._get_config_value("thresholds.min_f1_score", 0.82)
        self._min_samples = self._get_config_value(
            "collection.min_samples_for_optimization", 50
        )
        self._max_samples = self._get_config_value(
            "collection.max_samples_per_version", 1000
        )
        self._storage_dir = self._get_config_value(
            "storage.feedback_directory", "data/feedback"
        )

    def _resolve_env_placeholder(self, value: Any) -> Any:
        """Resolve ${VAR:default} placeholders in config values."""
        import re

        if not isinstance(value, str):
            return value

        pattern = r"\$\{([^}:]+)(?::([^}]*))?\}"
        match = re.match(pattern, value)
        if match:
            env_var = match.group(1)
            default_val = match.group(2) if match.group(2) is not None else ""
            resolved = os.getenv(env_var, default_val)
            if resolved.lower() in ("true", "false"):
                return resolved.lower() == "true"
            try:
                return float(resolved) if "." in resolved else int(resolved)
            except ValueError:
                return resolved
        return value

    def _get_config_value(self, key: str, default: Any) -> Any:
        """Get nested config value with env var override."""
        env_key = f"LLM_FEEDBACK_{key.upper().replace('.', '_')}"
        env_value = os.getenv(env_key)
        if env_value is not None:
            if env_value.lower() in ("true", "false"):
                return env_value.lower() == "true"
            try:
                return float(env_value)
            except ValueError:
                return env_value

        parts = key.split(".")
        value = self._config
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return default

        if value is None:
            return default

        return self._resolve_env_placeholder(value)

    def _ensure_storage_directory(self) -> None:
        """Ensure feedback storage directory exists."""
        path = Path(self._storage_dir)
        if not path.is_absolute():
            path = Path(__file__).parent.parent.parent.parent / self._storage_dir
        path.mkdir(parents=True, exist_ok=True)
        self._storage_path = path

    def is_enabled(self) -> bool:
        """Check if feedback collection is enabled."""
        return self._enabled

    def collect_from_metrics(
        self, metrics: TrainingMetrics, prompt_version: str
    ) -> FeedbackSummary:
        """
        Collect feedback from training metrics.

        Args:
            metrics: TrainingMetrics from training evaluation
            prompt_version: Version of prompt used

        Returns:
            FeedbackSummary with optimization recommendations
        """
        if not self.is_enabled():
            return FeedbackSummary()

        for result in metrics.prediction_results:
            if not result.is_correct:
                self._add_entry_from_result(result, prompt_version)

        summary = self._create_summary(metrics)
        self._check_optimization_needed(summary)

        if len(self._entries) > 0:
            self._save_entries(prompt_version)

        return summary

    def _add_entry_from_result(
        self, result: PredictionResult, prompt_version: str
    ) -> None:
        """Add feedback entry from prediction result."""
        error_type = None
        if result.predicted_fraud and not result.sample.is_fraud:
            error_type = "false_positive"
        elif not result.predicted_fraud and result.sample.is_fraud:
            error_type = "false_negative"

        entry = FeedbackEntry(
            timestamp=datetime.utcnow().isoformat(),
            entity_type=result.sample.entity_type,
            entity_value=result.sample.entity_value,
            predicted_fraud=result.predicted_fraud,
            actual_fraud=result.sample.is_fraud,
            risk_score=result.assessment.risk_score,
            confidence=result.assessment.confidence,
            reasoning=result.assessment.reasoning,
            error_type=error_type,
            prompt_version=prompt_version,
        )

        self._entries.append(entry)

        if len(self._entries) > self._max_samples:
            self._entries = self._entries[-self._max_samples:]

    def _create_summary(self, metrics: TrainingMetrics) -> FeedbackSummary:
        """Create feedback summary from metrics."""
        return FeedbackSummary(
            total_entries=len(self._entries),
            false_positives=metrics.false_positives,
            false_negatives=metrics.false_negatives,
            precision=metrics.precision,
            recall=metrics.recall,
            f1_score=metrics.f1_score,
        )

    def _check_optimization_needed(self, summary: FeedbackSummary) -> None:
        """Check if optimization is needed based on thresholds."""
        if summary.total_entries < self._min_samples:
            return

        reasons = []

        if summary.precision < self._min_precision:
            reasons.append(f"precision={summary.precision:.3f} < {self._min_precision}")

        if summary.recall < self._min_recall:
            reasons.append(f"recall={summary.recall:.3f} < {self._min_recall}")

        if summary.f1_score < self._min_f1:
            reasons.append(f"f1={summary.f1_score:.3f} < {self._min_f1}")

        if reasons:
            summary.needs_optimization = True
            summary.optimization_reason = "; ".join(reasons)
            logger.warning(f"Optimization needed: {summary.optimization_reason}")

    def _save_entries(self, prompt_version: str) -> None:
        """Save feedback entries to storage."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"feedback_{prompt_version}_{timestamp}.json"
        filepath = self._storage_path / filename

        data = {
            "prompt_version": prompt_version,
            "collected_at": datetime.utcnow().isoformat(),
            "entry_count": len(self._entries),
            "entries": [self._entry_to_dict(e) for e in self._entries],
        }

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        logger.debug(f"Saved {len(self._entries)} feedback entries to {filepath}")

    def _entry_to_dict(self, entry: FeedbackEntry) -> Dict[str, Any]:
        """Convert feedback entry to dictionary."""
        return {
            "timestamp": entry.timestamp,
            "entity_type": entry.entity_type,
            "entity_value": entry.entity_value,
            "predicted_fraud": entry.predicted_fraud,
            "actual_fraud": entry.actual_fraud,
            "risk_score": entry.risk_score,
            "confidence": entry.confidence,
            "reasoning": entry.reasoning[:200] if entry.reasoning else "",
            "error_type": entry.error_type,
            "prompt_version": entry.prompt_version,
        }

    def get_misclassifications(
        self, error_type: Optional[str] = None
    ) -> List[FeedbackEntry]:
        """Get misclassified entries, optionally filtered by type."""
        if error_type:
            return [e for e in self._entries if e.error_type == error_type]
        return [e for e in self._entries if e.error_type is not None]

    def get_false_positives(self) -> List[FeedbackEntry]:
        """Get false positive entries."""
        return self.get_misclassifications("false_positive")

    def get_false_negatives(self) -> List[FeedbackEntry]:
        """Get false negative entries."""
        return self.get_misclassifications("false_negative")

    def clear_entries(self) -> None:
        """Clear collected entries."""
        self._entries.clear()


_feedback_collector: Optional[FeedbackCollector] = None


def get_feedback_collector() -> FeedbackCollector:
    """Get cached feedback collector instance."""
    global _feedback_collector
    if _feedback_collector is None:
        _feedback_collector = FeedbackCollector()
    return _feedback_collector
