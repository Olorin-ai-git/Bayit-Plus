"""
A/B Testing Framework for Fraud Detection Models.

Enables testing different models or ensemble strategies against each other.

Week 8 Phase 3 implementation.
"""

import logging
import os
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path

from app.service.analytics.experiment_storage import (
    load_experiments_data,
    save_experiments_data,
    ensure_experiments_directory
)
from app.service.analytics.experiment_helpers import (
    assign_variant,
    calculate_experiment_stats
)

logger = logging.getLogger(__name__)


@dataclass
class ABExperiment:
    """A/B test experiment configuration and metrics."""
    experiment_id: str
    name: str
    description: str
    variant_a: Dict[str, Any]
    variant_b: Dict[str, Any]
    traffic_split: float
    status: str
    created_at: str
    metrics: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class ABTestingFramework:
    """A/B testing framework for model experiments."""

    def __init__(self, experiments_path: Optional[str] = None):
        """Initialize A/B testing framework."""
        self.experiments_path = experiments_path or os.getenv(
            "AB_EXPERIMENTS_PATH",
            str(Path.home() / ".olorin" / "ab_experiments")
        )
        ensure_experiments_directory(self.experiments_path)
        self.experiments_file = os.path.join(self.experiments_path, "experiments.json")
        self.experiments = self._load_experiments()
        logger.info(f"📊 ABTestingFramework: {len(self.experiments)} experiments")

    def _load_experiments(self) -> Dict[str, ABExperiment]:
        """Load experiments from storage."""
        data = load_experiments_data(self.experiments_file)
        return {exp_id: ABExperiment(**exp_dict) for exp_id, exp_dict in data.items()}

    def _save_experiments(self) -> None:
        """Save experiments to storage."""
        data = {exp_id: exp.to_dict() for exp_id, exp in self.experiments.items()}
        save_experiments_data(self.experiments_file, data)

    def create_experiment(
        self,
        name: str,
        description: str,
        variant_a: Dict[str, Any],
        variant_b: Dict[str, Any],
        traffic_split: float = 0.5
    ) -> str:
        """Create a new A/B test experiment."""
        experiment_id = hashlib.md5(
            f"{name}_{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]

        experiment = ABExperiment(
            experiment_id=experiment_id,
            name=name,
            description=description,
            variant_a=variant_a,
            variant_b=variant_b,
            traffic_split=traffic_split,
            status="active",
            created_at=datetime.utcnow().isoformat(),
            metrics={
                "variant_a": {"count": 0, "total_score": 0.0, "errors": 0},
                "variant_b": {"count": 0, "total_score": 0.0, "errors": 0}
            }
        )

        self.experiments[experiment_id] = experiment
        self._save_experiments()

        logger.info(f"✓ Created experiment {experiment_id}: {name}")
        return experiment_id

    def get_variant(
        self,
        experiment_id: str,
        entity_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get variant assignment for an entity using consistent hashing."""
        if experiment_id not in self.experiments:
            return None

        experiment = self.experiments[experiment_id]
        if experiment.status != "active":
            logger.debug(f"Experiment {experiment_id} not active")
            return None

        return assign_variant(
            experiment_id,
            entity_id,
            experiment.traffic_split,
            experiment.variant_a,
            experiment.variant_b
        )

    def record_metric(
        self,
        experiment_id: str,
        variant: str,
        score: float,
        error: bool = False
    ) -> None:
        """Record prediction metric for a variant."""
        if experiment_id not in self.experiments:
            return

        metrics = self.experiments[experiment_id].metrics[variant]
        metrics["count"] += 1
        if not error:
            metrics["total_score"] += score
        else:
            metrics["errors"] += 1
        self._save_experiments()

    def get_experiment_results(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get experiment results and statistics."""
        if experiment_id not in self.experiments:
            return None

        experiment = self.experiments[experiment_id]
        stats = calculate_experiment_stats(
            experiment.metrics["variant_a"],
            experiment.metrics["variant_b"]
        )

        return {
            "experiment_id": experiment_id,
            "name": experiment.name,
            "status": experiment.status,
            **stats
        }

    def pause_experiment(self, experiment_id: str) -> bool:
        """Pause an experiment."""
        return self._update_status(experiment_id, "paused", "⏸️  Paused")

    def resume_experiment(self, experiment_id: str) -> bool:
        """Resume a paused experiment."""
        return self._update_status(experiment_id, "active", "▶️  Resumed")

    def complete_experiment(self, experiment_id: str) -> bool:
        """Mark an experiment as completed."""
        return self._update_status(experiment_id, "completed", "✓ Completed")

    def _update_status(self, experiment_id: str, status: str, log_prefix: str) -> bool:
        """Update experiment status."""
        if experiment_id not in self.experiments:
            return False
        self.experiments[experiment_id].status = status
        self._save_experiments()
        logger.info(f"{log_prefix} experiment {experiment_id}")
        return True

    def list_experiments(self, status: Optional[str] = None) -> List[ABExperiment]:
        """List experiments, optionally filtered by status."""
        experiments = list(self.experiments.values())

        if status:
            experiments = [e for e in experiments if e.status == status]

        return sorted(experiments, key=lambda e: e.created_at, reverse=True)
