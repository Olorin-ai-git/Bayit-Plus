"""
Rolling Windows Manager
Feature: 026-llm-training-pipeline

Manages multiple rolling time windows for feature extraction and evaluation.
"""

import os
from datetime import datetime
from typing import List, Optional

from dateutil.relativedelta import relativedelta

from app.service.logging import get_bridge_logger
from app.service.training.temporal.temporal_models import TemporalWindow, WindowPair
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class RollingWindowManager:
    """Manages rolling time windows for temporal analysis."""

    def __init__(self):
        """Initialize rolling window manager from config."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize windows from configuration."""
        temporal_config = getattr(self._config, "temporal", None)

        windows_str = os.getenv("LLM_ROLLING_WINDOWS", "1,3,6,12")
        self._window_months = [int(w) for w in windows_str.split(",")]

        if temporal_config:
            windows = getattr(temporal_config, "rolling_windows_months", None)
            if windows:
                self._window_months = windows

        holdout = self._config.temporal_holdout
        self._feature_months = holdout.feature_period_months if holdout else 6
        self._observation_months = holdout.observation_period_months if holdout else 6

    def get_rolling_windows(
        self,
        reference_time: Optional[datetime] = None,
    ) -> List[TemporalWindow]:
        """
        Generate rolling windows from reference time.

        Args:
            reference_time: Reference point (defaults to now)

        Returns:
            List of TemporalWindow objects
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        windows = []
        for months in self._window_months:
            end_date = reference_time
            start_date = end_date - relativedelta(months=months)

            window = TemporalWindow(
                window_id=f"rolling_{months}m",
                start_date=start_date,
                end_date=end_date,
                window_months=months,
                purpose="feature",
            )
            windows.append(window)

        logger.debug(f"Generated {len(windows)} rolling windows")
        return windows

    def get_historical_window_pairs(
        self,
        num_pairs: int,
        reference_time: Optional[datetime] = None,
    ) -> List[WindowPair]:
        """
        Generate multiple historical feature-observation window pairs.

        Args:
            num_pairs: Number of window pairs to generate
            reference_time: Reference point (defaults to now)

        Returns:
            List of WindowPair objects for training across time
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        pairs = []
        total_months = self._feature_months + self._observation_months

        for i in range(num_pairs):
            offset = i * total_months
            obs_end = reference_time - relativedelta(months=offset)
            obs_start = obs_end - relativedelta(months=self._observation_months)
            feat_end = obs_start
            feat_start = feat_end - relativedelta(months=self._feature_months)

            feature_window = TemporalWindow(
                window_id=f"feature_pair_{i}",
                start_date=feat_start,
                end_date=feat_end,
                window_months=self._feature_months,
                purpose="feature",
            )

            observation_window = TemporalWindow(
                window_id=f"observation_pair_{i}",
                start_date=obs_start,
                end_date=obs_end,
                window_months=self._observation_months,
                purpose="observation",
            )

            pair = WindowPair(
                feature_window=feature_window,
                observation_window=observation_window,
                pair_id=f"pair_{i}",
            )
            pairs.append(pair)

        logger.info(f"Generated {len(pairs)} historical window pairs")
        return pairs

    def get_current_window_pair(
        self,
        reference_time: Optional[datetime] = None,
    ) -> WindowPair:
        """
        Get current feature-observation window pair.

        Args:
            reference_time: Reference point (defaults to now)

        Returns:
            WindowPair for current period
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        obs_end = reference_time
        obs_start = obs_end - relativedelta(months=self._observation_months)
        feat_end = obs_start
        feat_start = feat_end - relativedelta(months=self._feature_months)

        return WindowPair(
            feature_window=TemporalWindow(
                window_id="feature_current",
                start_date=feat_start,
                end_date=feat_end,
                window_months=self._feature_months,
                purpose="feature",
            ),
            observation_window=TemporalWindow(
                window_id="observation_current",
                start_date=obs_start,
                end_date=obs_end,
                window_months=self._observation_months,
                purpose="observation",
            ),
            pair_id="current",
        )
