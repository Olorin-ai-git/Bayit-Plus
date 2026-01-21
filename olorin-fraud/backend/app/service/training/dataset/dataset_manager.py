"""
Dataset Manager
Feature: 026-llm-training-pipeline

Orchestrates dataset creation, versioning, and management for training.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.dataset.dataset_models import (
    DatasetMetadata,
    DatasetSplit,
    SamplingConfig,
)
from app.service.training.dataset.dataset_splitter import DatasetSplitter
from app.service.training.dataset.stratified_sampler import StratifiedSampler
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class DatasetManager:
    """Manages training datasets with versioning and metadata."""

    def __init__(self):
        """Initialize dataset manager with config-driven settings."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize components from configuration."""
        dataset_config = getattr(self._config, "dataset", None)

        target_fraud = int(os.getenv("LLM_TARGET_FRAUD_ENTITIES", "500"))
        max_fraud = int(os.getenv("LLM_MAX_FRAUD_ENTITIES", "1000"))
        legit_mult = int(os.getenv("LLM_LEGIT_MULTIPLIER", "20"))
        stratify = os.getenv("LLM_STRATIFY_MERCHANT", "true").lower() == "true"
        min_per_merchant = int(os.getenv("LLM_MIN_SAMPLES_MERCHANT", "10"))

        if dataset_config:
            target_fraud = getattr(dataset_config, "target_fraud_entities", target_fraud)
            max_fraud = getattr(dataset_config, "max_fraud_entities", max_fraud)
            legit_mult = getattr(dataset_config, "legit_multiplier", legit_mult)
            stratify = getattr(dataset_config, "stratify_by_merchant", stratify)
            min_per_merchant = getattr(dataset_config, "min_samples_per_merchant", min_per_merchant)

        gmv_strat = os.getenv("TRAINING_GMV_STRATIFICATION_ENABLED", "false").lower() == "true"
        score_strat = os.getenv("TRAINING_SCORE_STRATIFICATION_ENABLED", "false").lower() == "true"

        self._sampling_config = SamplingConfig(
            target_fraud_entities=target_fraud,
            max_fraud_entities=max_fraud,
            legit_multiplier=legit_mult,
            stratify_by_merchant=stratify,
            min_samples_per_merchant=min_per_merchant,
            gmv_stratification_enabled=gmv_strat,
            score_stratification_enabled=score_strat,
        )

        train_ratio = float(os.getenv("LLM_TRAIN_RATIO", "0.70"))
        val_ratio = float(os.getenv("LLM_VALIDATION_RATIO", "0.15"))
        test_ratio = float(os.getenv("LLM_TEST_RATIO", "0.15"))

        if dataset_config:
            train_ratio = getattr(dataset_config, "train_ratio", train_ratio)
            val_ratio = getattr(dataset_config, "validation_ratio", val_ratio)
            test_ratio = getattr(dataset_config, "test_ratio", test_ratio)

        self._sampler = StratifiedSampler(self._sampling_config)
        self._splitter = DatasetSplitter(train_ratio, val_ratio, test_ratio)

        self._snapshot_dir = os.getenv("LLM_DATASET_SNAPSHOT_DIR", "data/datasets")

    def create_dataset(
        self,
        samples: List[TrainingSample],
        version: Optional[str] = None,
        random_seed: Optional[int] = None,
    ) -> DatasetSplit:
        """
        Create a stratified, split dataset from raw samples.

        Args:
            samples: List of all available samples
            version: Optional version identifier
            random_seed: Optional seed for reproducibility

        Returns:
            DatasetSplit with train/validation/test sets
        """
        sampled = self._sampler.sample(samples, random_seed)
        split = self._splitter.split_random(sampled, random_seed, stratify_by_class=True)

        if version:
            metadata = self._create_metadata(version, split, samples)
            self._save_metadata(metadata)

        logger.info(
            f"Created dataset: train={split.get_train_count()}, "
            f"val={split.get_validation_count()}, test={split.get_test_count()}"
        )

        return split

    def _create_metadata(
        self,
        version: str,
        split: DatasetSplit,
        original_samples: List[TrainingSample],
    ) -> DatasetMetadata:
        """Create metadata for dataset version."""
        merchants = list(
            set(s.merchant_name for s in original_samples if s.merchant_name)
        )
        fraud_counts = split.get_fraud_counts()

        return DatasetMetadata(
            version=version,
            created_at=datetime.utcnow(),
            total_samples=split.get_total_count(),
            fraud_samples=sum(fraud_counts.values()),
            legit_samples=split.get_total_count() - sum(fraud_counts.values()),
            train_samples=split.get_train_count(),
            validation_samples=split.get_validation_count(),
            test_samples=split.get_test_count(),
            merchants=merchants,
            config=self._sampling_config,
        )

    def _save_metadata(self, metadata: DatasetMetadata) -> None:
        """Save metadata to disk."""
        Path(self._snapshot_dir).mkdir(parents=True, exist_ok=True)
        filepath = os.path.join(
            self._snapshot_dir, f"dataset_{metadata.version}_metadata.json"
        )

        with open(filepath, "w") as f:
            json.dump(metadata.to_dict(), f, indent=2)

        logger.info(f"Saved dataset metadata to {filepath}")

    def get_sampling_config(self) -> SamplingConfig:
        """Get current sampling configuration."""
        return self._sampling_config


_dataset_manager: Optional[DatasetManager] = None


def get_dataset_manager() -> DatasetManager:
    """Get cached dataset manager instance."""
    global _dataset_manager
    if _dataset_manager is None:
        _dataset_manager = DatasetManager()
    return _dataset_manager
