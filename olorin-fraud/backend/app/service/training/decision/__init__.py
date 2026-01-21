"""
Decision Module
Feature: 026-llm-training-pipeline

Provides risk bands and segment-specific threshold management.
"""

from app.service.training.decision.decision_models import (
    DecisionAction,
    RiskBand,
    SegmentedDecision,
)
from app.service.training.decision.risk_bands import (
    RiskBandManager,
    get_risk_band_manager,
)
from app.service.training.decision.segment_thresholds import SegmentThresholdManager

__all__ = [
    "RiskBand",
    "DecisionAction",
    "SegmentedDecision",
    "RiskBandManager",
    "get_risk_band_manager",
    "SegmentThresholdManager",
]
