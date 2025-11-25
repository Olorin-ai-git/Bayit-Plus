"""
Model Registry for Fraud Detection Models.

Manages model versioning, storage, and lifecycle.

Week 8 Phase 3 implementation.
"""

import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.analytics.registry_storage import (
    ensure_directory_exists,
    load_registry_data,
    save_registry_data,
)

logger = logging.getLogger(__name__)


@dataclass
class ModelMetadata:
    """
    Metadata for a registered model.

    Attributes:
        model_name: Unique model name
        model_version: Version identifier
        model_type: Type of model (rule_based, xgboost, lightgbm, etc.)
        model_path: Path to model artifact
        created_at: When model was registered
        metrics: Performance metrics (accuracy, precision, recall, etc.)
        status: Model status (active, deprecated, archived)
        description: Model description
    """

    model_name: str
    model_version: str
    model_type: str
    model_path: str
    created_at: str
    metrics: Dict[str, float]
    status: str
    description: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class ModelRegistry:
    """
    Registry for managing fraud detection model versions.

    Stores model metadata, tracks versions, and manages model lifecycle.
    """

    def __init__(self, registry_path: Optional[str] = None):
        """Initialize model registry."""
        self.registry_path = registry_path or os.getenv(
            "MODEL_REGISTRY_PATH", str(Path.home() / ".olorin" / "model_registry")
        )
        ensure_directory_exists(self.registry_path)
        self.metadata_file = os.path.join(self.registry_path, "registry.json")
        self.models = self._load_registry()
        logger.info(f"📊 ModelRegistry: {len(self.models)} models")

    def _load_registry(self) -> Dict[str, ModelMetadata]:
        """Load model registry from storage."""
        data = load_registry_data(self.metadata_file)
        return {key: ModelMetadata(**model_dict) for key, model_dict in data.items()}

    def _save_registry(self) -> None:
        """Save model registry to storage."""
        data = {key: metadata.to_dict() for key, metadata in self.models.items()}
        save_registry_data(self.metadata_file, data)

    def register_model(
        self,
        model_name: str,
        model_version: str,
        model_type: str,
        model_path: str,
        metrics: Optional[Dict[str, float]] = None,
        description: str = "",
    ) -> bool:
        """Register a new model version."""
        key = f"{model_name}_{model_version}"

        if key in self.models:
            logger.warning(f"Model {key} already registered, skipping")
            return False

        metadata = ModelMetadata(
            model_name=model_name,
            model_version=model_version,
            model_type=model_type,
            model_path=model_path,
            created_at=datetime.utcnow().isoformat(),
            metrics=metrics or {},
            status="active",
            description=description,
        )

        self.models[key] = metadata
        self._save_registry()

        logger.info(f"✓ Registered model {key} at {model_path}")
        return True

    def get_model(
        self, model_name: str, model_version: Optional[str] = None
    ) -> Optional[ModelMetadata]:
        """Get model metadata (latest active if version not specified)."""
        if model_version:
            key = f"{model_name}_{model_version}"
            return self.models.get(key)

        # Get latest active version
        matching_models = [
            (k, m)
            for k, m in self.models.items()
            if m.model_name == model_name and m.status == "active"
        ]

        if not matching_models:
            return None

        # Sort by creation date and return latest
        latest = sorted(matching_models, key=lambda x: x[1].created_at, reverse=True)[0]
        return latest[1]

    def list_models(
        self, model_name: Optional[str] = None, status: Optional[str] = None
    ) -> List[ModelMetadata]:
        """List registered models with optional filters."""
        models = list(self.models.values())

        if model_name:
            models = [m for m in models if m.model_name == model_name]

        if status:
            models = [m for m in models if m.status == status]

        return sorted(models, key=lambda m: m.created_at, reverse=True)

    def deprecate_model(self, model_name: str, model_version: str) -> bool:
        """Mark a model as deprecated."""
        key = f"{model_name}_{model_version}"
        if key not in self.models:
            logger.warning(f"Model {key} not found")
            return False
        self.models[key].status = "deprecated"
        self._save_registry()
        logger.info(f"✗ Deprecated {key}")
        return True

    def archive_model(self, model_name: str, model_version: str) -> bool:
        """Archive a model (mark as inactive)."""
        key = f"{model_name}_{model_version}"
        if key not in self.models:
            logger.warning(f"Model {key} not found")
            return False
        self.models[key].status = "archived"
        self._save_registry()
        logger.info(f"📦 Archived {key}")
        return True

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics."""
        models_by_type = {}
        models_by_status = {}

        for metadata in self.models.values():
            models_by_type[metadata.model_type] = (
                models_by_type.get(metadata.model_type, 0) + 1
            )
            models_by_status[metadata.status] = (
                models_by_status.get(metadata.status, 0) + 1
            )

        return {
            "total_models": len(self.models),
            "models_by_type": models_by_type,
            "models_by_status": models_by_status,
            "registry_path": self.registry_path,
        }
