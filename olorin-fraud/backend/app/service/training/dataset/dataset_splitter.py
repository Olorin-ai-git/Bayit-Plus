"""
Dataset Splitter
Feature: 026-llm-training-pipeline

Provides time-separated train/validation/test splits for fraud detection training.
"""

import random
from datetime import datetime
from typing import List, Optional, Tuple

from app.service.logging import get_bridge_logger
from app.service.training.dataset.dataset_models import DatasetSplit
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class DatasetSplitter:
    """Splits datasets into train/validation/test sets."""

    def __init__(
        self,
        train_ratio: float,
        validation_ratio: float,
        test_ratio: float,
    ):
        """
        Initialize dataset splitter.

        Args:
            train_ratio: Proportion for training set (e.g., 0.70)
            validation_ratio: Proportion for validation set (e.g., 0.15)
            test_ratio: Proportion for test set (e.g., 0.15)
        """
        total = train_ratio + validation_ratio + test_ratio
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"Ratios must sum to 1.0, got {total}")

        self._train_ratio = train_ratio
        self._validation_ratio = validation_ratio
        self._test_ratio = test_ratio

    def split_random(
        self,
        samples: List[TrainingSample],
        random_seed: Optional[int] = None,
        stratify_by_class: bool = True,
    ) -> DatasetSplit:
        """
        Split samples randomly with optional class stratification.

        Args:
            samples: List of samples to split
            random_seed: Optional seed for reproducibility
            stratify_by_class: Whether to maintain fraud ratio in splits

        Returns:
            DatasetSplit with train/validation/test sets
        """
        if random_seed is not None:
            random.seed(random_seed)

        if stratify_by_class:
            return self._stratified_split(samples)
        return self._random_split(samples)

    def split_temporal(
        self,
        samples: List[TrainingSample],
        validation_cutoff: datetime,
        test_cutoff: datetime,
    ) -> DatasetSplit:
        """
        Split samples by time (older for train, recent for eval).

        Args:
            samples: List of samples with tx_datetime
            validation_cutoff: Boundary between train and validation
            test_cutoff: Boundary between validation and test

        Returns:
            DatasetSplit with time-separated sets
        """
        train = []
        validation = []
        test = []

        for sample in samples:
            sample_time = self._get_sample_time(sample)
            if sample_time is None:
                train.append(sample)
            elif sample_time >= test_cutoff:
                test.append(sample)
            elif sample_time >= validation_cutoff:
                validation.append(sample)
            else:
                train.append(sample)

        logger.info(
            f"Temporal split: train={len(train)}, "
            f"val={len(validation)}, test={len(test)}"
        )

        return DatasetSplit(train=train, validation=validation, test=test)

    def _stratified_split(
        self, samples: List[TrainingSample]
    ) -> DatasetSplit:
        """Split maintaining fraud ratio in each set."""
        fraud = [s for s in samples if s.is_fraud]
        legit = [s for s in samples if not s.is_fraud]

        random.shuffle(fraud)
        random.shuffle(legit)

        fraud_train, fraud_val, fraud_test = self._ratio_split(fraud)
        legit_train, legit_val, legit_test = self._ratio_split(legit)

        train = fraud_train + legit_train
        validation = fraud_val + legit_val
        test = fraud_test + legit_test

        random.shuffle(train)
        random.shuffle(validation)
        random.shuffle(test)

        logger.info(
            f"Stratified split: train={len(train)} "
            f"({sum(1 for s in train if s.is_fraud)} fraud), "
            f"val={len(validation)}, test={len(test)}"
        )

        return DatasetSplit(train=train, validation=validation, test=test)

    def _random_split(
        self, samples: List[TrainingSample]
    ) -> DatasetSplit:
        """Simple random split without stratification."""
        shuffled = list(samples)
        random.shuffle(shuffled)

        train, validation, test = self._ratio_split(shuffled)

        logger.info(
            f"Random split: train={len(train)}, "
            f"val={len(validation)}, test={len(test)}"
        )

        return DatasetSplit(train=train, validation=validation, test=test)

    def _ratio_split(
        self, items: List[TrainingSample]
    ) -> Tuple[List[TrainingSample], List[TrainingSample], List[TrainingSample]]:
        """Split list by configured ratios."""
        n = len(items)
        train_end = int(n * self._train_ratio)
        val_end = train_end + int(n * self._validation_ratio)

        return items[:train_end], items[train_end:val_end], items[val_end:]

    def _get_sample_time(self, sample: TrainingSample) -> Optional[datetime]:
        """Extract datetime from sample."""
        if sample.tx_datetime:
            return sample.tx_datetime
        last_tx = sample.features.get("last_tx_date")
        if last_tx and isinstance(last_tx, str):
            try:
                return datetime.fromisoformat(last_tx.replace("Z", "+00:00"))
            except ValueError:
                pass
        return None
