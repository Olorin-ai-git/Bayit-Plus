"""
Segment Thresholds Manager
Feature: 026-llm-training-pipeline

Manages merchant/channel-specific threshold overrides.
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional

from app.service.logging import get_bridge_logger
from app.service.training.decision.decision_models import SegmentConfig
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class SegmentThresholdManager:
    """Manages segment-specific threshold configurations."""

    def __init__(self):
        """Initialize segment threshold manager from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._segments: Dict[str, SegmentConfig] = {}
        self._load_segments()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._enabled = os.getenv("LLM_SEGMENTATION_ENABLED", "true").lower() == "true"
        self._config_path = os.getenv(
            "LLM_SEGMENT_CONFIG", "config/segment_thresholds.json"
        )
        self._default_threshold = float(os.getenv("LLM_FRAUD_THRESHOLD", "0.5"))

    def _load_segments(self) -> None:
        """Load segment configurations from file."""
        if not os.path.exists(self._config_path):
            logger.info(f"No segment config found at {self._config_path}")
            return

        try:
            with open(self._config_path, "r") as f:
                data = json.load(f)

            for segment_data in data.get("segments", []):
                config = SegmentConfig(
                    segment_id=segment_data["segment_id"],
                    segment_name=segment_data.get("segment_name", segment_data["segment_id"]),
                    threshold_override=segment_data.get("threshold_override"),
                    band_overrides=segment_data.get("band_overrides", {}),
                    is_high_risk=segment_data.get("is_high_risk", False),
                    notes=segment_data.get("notes", ""),
                )
                self._segments[config.segment_id] = config

            logger.info(f"Loaded {len(self._segments)} segment configurations")

        except Exception as e:
            logger.warning(f"Failed to load segment config: {e}")

    def is_enabled(self) -> bool:
        """Check if segmentation is enabled."""
        return self._enabled

    def get_threshold(self, segment: str) -> float:
        """
        Get threshold for a segment.

        Args:
            segment: Segment identifier (merchant name, channel, etc.)

        Returns:
            Threshold for segment (or default if not found)
        """
        if not self._enabled:
            return self._default_threshold

        config = self._segments.get(segment)
        if config:
            return config.get_threshold(self._default_threshold)

        return self._default_threshold

    def get_segment_config(self, segment: str) -> Optional[SegmentConfig]:
        """Get full configuration for a segment."""
        return self._segments.get(segment)

    def is_high_risk_segment(self, segment: str) -> bool:
        """Check if segment is marked as high risk."""
        config = self._segments.get(segment)
        return config.is_high_risk if config else False

    def add_segment(self, config: SegmentConfig) -> None:
        """Add or update a segment configuration."""
        self._segments[config.segment_id] = config
        logger.info(f"Added segment config: {config.segment_id}")

    def remove_segment(self, segment_id: str) -> bool:
        """Remove a segment configuration."""
        if segment_id in self._segments:
            del self._segments[segment_id]
            logger.info(f"Removed segment config: {segment_id}")
            return True
        return False

    def save_segments(self) -> None:
        """Save segment configurations to file."""
        Path(os.path.dirname(self._config_path)).mkdir(parents=True, exist_ok=True)

        data = {
            "segments": [config.to_dict() for config in self._segments.values()]
        }

        with open(self._config_path, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved {len(self._segments)} segment configs")

    def get_all_segments(self) -> Dict[str, SegmentConfig]:
        """Get all segment configurations."""
        return dict(self._segments)

    def get_adjusted_threshold(
        self,
        segment: str,
        base_score: float,
    ) -> float:
        """
        Get risk-adjusted threshold for segment.

        High-risk segments get lower thresholds (more strict).

        Args:
            segment: Segment identifier
            base_score: Base threshold

        Returns:
            Adjusted threshold for segment
        """
        config = self._segments.get(segment)
        if not config:
            return base_score

        if config.threshold_override is not None:
            return config.threshold_override

        if config.is_high_risk:
            return base_score * 0.8

        return base_score
