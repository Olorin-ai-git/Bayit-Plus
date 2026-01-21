"""
Model Versioner
Feature: 026-llm-training-pipeline

Manages model snapshots, versioning, and rollback capabilities.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.retraining.retraining_models import ModelSnapshot
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class ModelVersioner:
    """Manages model versioning and snapshots."""

    def __init__(self):
        """Initialize model versioner from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._snapshots: List[ModelSnapshot] = []

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._snapshot_dir = Path(os.getenv("LLM_SNAPSHOT_DIR", "data/model_snapshots"))
        self._max_snapshots = int(os.getenv("LLM_MAX_SNAPSHOTS", "10"))
        self._snapshot_dir.mkdir(parents=True, exist_ok=True)

    def create_snapshot(
        self,
        model_version: str,
        pr_auc: float,
        f1_score: float,
        threshold: float,
        prompt_version: Optional[str] = None,
        model_path: Optional[str] = None,
        calibrator_path: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ModelSnapshot:
        """
        Create a new model snapshot.

        Args:
            model_version: Version identifier
            pr_auc: PR-AUC score
            f1_score: F1 score
            threshold: Decision threshold
            prompt_version: Prompt version used
            model_path: Path to saved model
            calibrator_path: Path to saved calibrator
            metadata: Additional metadata

        Returns:
            Created ModelSnapshot
        """
        config_hash = self._compute_config_hash()

        snapshot = ModelSnapshot(
            snapshot_id=str(uuid.uuid4()),
            model_version=model_version,
            created_at=datetime.utcnow(),
            pr_auc=pr_auc,
            f1_score=f1_score,
            threshold=threshold,
            prompt_version=prompt_version,
            model_path=model_path,
            calibrator_path=calibrator_path,
            config_hash=config_hash,
            metadata=metadata or {},
        )

        self._snapshots.append(snapshot)
        self._save_snapshot(snapshot)
        self._enforce_max_snapshots()

        logger.info(f"Created snapshot: version={model_version}, pr_auc={pr_auc:.4f}")
        return snapshot

    def _compute_config_hash(self) -> str:
        """Compute hash of current configuration."""
        config_str = json.dumps(
            {
                "model_type": os.getenv("LLM_MODEL_TYPE", "logistic_regression"),
                "calibration": os.getenv("LLM_CALIBRATION_METHOD", "isotonic"),
                "features": os.getenv("LLM_VELOCITY_FEATURES_ENABLED", "true"),
            },
            sort_keys=True,
        )
        return hashlib.sha256(config_str.encode()).hexdigest()[:12]

    def _save_snapshot(self, snapshot: ModelSnapshot) -> None:
        """Save snapshot metadata to disk."""
        snapshot_path = self._snapshot_dir / f"{snapshot.snapshot_id}.json"
        with open(snapshot_path, "w") as f:
            json.dump(snapshot.to_dict(), f, indent=2)

    def _enforce_max_snapshots(self) -> None:
        """Remove old snapshots if exceeding max."""
        if len(self._snapshots) > self._max_snapshots:
            to_remove = self._snapshots[: -self._max_snapshots]
            self._snapshots = self._snapshots[-self._max_snapshots :]

            for old in to_remove:
                snapshot_path = self._snapshot_dir / f"{old.snapshot_id}.json"
                if snapshot_path.exists():
                    snapshot_path.unlink()
                logger.info(f"Removed old snapshot: {old.snapshot_id}")

    def get_latest(self) -> Optional[ModelSnapshot]:
        """Get most recent snapshot."""
        if not self._snapshots:
            self._load_snapshots()
        return self._snapshots[-1] if self._snapshots else None

    def get_by_version(self, version: str) -> Optional[ModelSnapshot]:
        """Get snapshot by version."""
        if not self._snapshots:
            self._load_snapshots()
        for snapshot in reversed(self._snapshots):
            if snapshot.model_version == version:
                return snapshot
        return None

    def get_history(self, limit: int = 10) -> List[ModelSnapshot]:
        """Get snapshot history."""
        if not self._snapshots:
            self._load_snapshots()
        return self._snapshots[-limit:]

    def _load_snapshots(self) -> None:
        """Load snapshots from disk."""
        if not self._snapshot_dir.exists():
            return

        snapshot_files = sorted(self._snapshot_dir.glob("*.json"))
        for path in snapshot_files:
            try:
                with open(path) as f:
                    data = json.load(f)
                snapshot = ModelSnapshot.from_dict(data)
                self._snapshots.append(snapshot)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to load snapshot {path}: {e}")

        self._snapshots.sort(key=lambda s: s.created_at)

    def rollback_to(self, version: str) -> Optional[ModelSnapshot]:
        """Rollback to a specific version."""
        snapshot = self.get_by_version(version)
        if snapshot:
            logger.info(f"Rollback to version {version}")
        return snapshot


_model_versioner: Optional[ModelVersioner] = None


def get_model_versioner() -> ModelVersioner:
    """Get cached model versioner instance."""
    global _model_versioner
    if _model_versioner is None:
        _model_versioner = ModelVersioner()
    return _model_versioner
