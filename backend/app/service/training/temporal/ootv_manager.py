"""
Out-of-Time Validation Manager
Feature: 026-llm-training-pipeline

Manages out-of-time validation splits for temporal model evaluation.
"""

import os
from datetime import datetime
from typing import List, Optional, Tuple

from dateutil.relativedelta import relativedelta

from app.service.logging import get_bridge_logger
from app.service.training.temporal.temporal_models import OOTVConfig, TemporalWindow
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class OOTVManager:
    """Manages out-of-time validation for temporal evaluation."""

    def __init__(self):
        """Initialize OOTV manager from config."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize OOTV settings from configuration."""
        temporal_config = getattr(self._config, "temporal", None)

        enabled = os.getenv("LLM_OOTV_ENABLED", "true").lower() == "true"
        train_months = int(os.getenv("LLM_OOTV_TRAIN_MONTHS", "9"))
        eval_months = int(os.getenv("LLM_OOTV_EVAL_MONTHS", "3"))

        if temporal_config:
            enabled = getattr(temporal_config, "ootv_enabled", enabled)
            train_months = getattr(temporal_config, "ootv_train_months", train_months)
            eval_months = getattr(temporal_config, "ootv_eval_months", eval_months)

        self._ootv_config = OOTVConfig(
            enabled=enabled,
            train_months=train_months,
            eval_months=eval_months,
        )

    def is_enabled(self) -> bool:
        """Check if OOTV is enabled."""
        return self._ootv_config.enabled

    def get_ootv_windows(
        self,
        reference_time: Optional[datetime] = None,
    ) -> Tuple[TemporalWindow, TemporalWindow]:
        """
        Get train and evaluation windows for OOTV.

        Args:
            reference_time: Reference point (defaults to now)

        Returns:
            Tuple of (train_window, eval_window)
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        eval_end = reference_time
        eval_start = eval_end - relativedelta(months=self._ootv_config.eval_months)
        train_end = eval_start
        train_start = train_end - relativedelta(months=self._ootv_config.train_months)

        train_window = TemporalWindow(
            window_id="ootv_train",
            start_date=train_start,
            end_date=train_end,
            window_months=self._ootv_config.train_months,
            purpose="train",
        )

        eval_window = TemporalWindow(
            window_id="ootv_eval",
            start_date=eval_start,
            end_date=eval_end,
            window_months=self._ootv_config.eval_months,
            purpose="eval",
        )

        logger.info(
            f"OOTV windows: train {train_start} to {train_end}, "
            f"eval {eval_start} to {eval_end}"
        )

        return train_window, eval_window

    def split_by_time(
        self,
        samples: List[TrainingSample],
        reference_time: Optional[datetime] = None,
    ) -> Tuple[List[TrainingSample], List[TrainingSample]]:
        """
        Split samples into train and evaluation sets by time.

        Args:
            samples: List of samples with timestamps
            reference_time: Reference point for window calculation

        Returns:
            Tuple of (train_samples, eval_samples)
        """
        train_window, eval_window = self.get_ootv_windows(reference_time)

        train_samples = []
        eval_samples = []

        for sample in samples:
            sample_time = self._get_sample_time(sample)
            if sample_time is None:
                train_samples.append(sample)
            elif eval_window.contains(sample_time):
                eval_samples.append(sample)
            elif train_window.contains(sample_time):
                train_samples.append(sample)

        logger.info(
            f"OOTV split: {len(train_samples)} train, {len(eval_samples)} eval"
        )

        return train_samples, eval_samples

    def _get_sample_time(self, sample: TrainingSample) -> Optional[datetime]:
        """Extract timestamp from sample."""
        if sample.tx_datetime:
            return sample.tx_datetime

        last_tx = sample.features.get("last_tx_date")
        if last_tx and isinstance(last_tx, str):
            try:
                return datetime.fromisoformat(last_tx.replace("Z", "+00:00"))
            except ValueError:
                pass
        return None

    def validate_leakage(
        self,
        train_samples: List[TrainingSample],
        eval_samples: List[TrainingSample],
    ) -> bool:
        """
        Validate no temporal leakage between train and eval sets.

        Args:
            train_samples: Training set samples
            eval_samples: Evaluation set samples

        Returns:
            True if no leakage detected
        """
        train_times = [self._get_sample_time(s) for s in train_samples]
        eval_times = [self._get_sample_time(s) for s in eval_samples]

        train_times = [t for t in train_times if t is not None]
        eval_times = [t for t in eval_times if t is not None]

        if not train_times or not eval_times:
            return True

        max_train = max(train_times)
        min_eval = min(eval_times)

        if max_train >= min_eval:
            logger.error(
                f"Temporal leakage detected: max_train={max_train}, min_eval={min_eval}"
            )
            return False

        logger.info("No temporal leakage detected")
        return True
