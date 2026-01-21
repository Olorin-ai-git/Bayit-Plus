"""
Feedback Models
Feature: 026-llm-training-pipeline

Dataclass models for feedback collection.
"""

from dataclasses import dataclass
from typing import Optional


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
