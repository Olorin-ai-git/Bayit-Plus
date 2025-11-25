"""
Evidence Configuration - Unified evidence validation thresholds and settings.

This module provides centralized configuration for evidence validation, quality
assessment, and gating logic across the hybrid investigation system.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EvidenceQualityLevel(Enum):
    """Evidence quality classification levels"""

    EXCELLENT = "excellent"  # ≥0.8 - High confidence decisions
    GOOD = "good"  # 0.6-0.8 - Standard validation
    ADEQUATE = "adequate"  # 0.4-0.6 - Requires additional validation
    POOR = "poor"  # 0.2-0.4 - Safety-first approach
    INSUFFICIENT = "insufficient"  # <0.2 - Investigation should fail


@dataclass
class EvidenceThresholds:
    """Unified evidence validation thresholds"""

    # Primary evidence quality thresholds
    minimum_acceptable: float = 0.3  # Below this = insufficient evidence
    safety_trigger: float = 0.4  # Below this = safety concerns
    adequate_threshold: float = 0.6  # Standard validation threshold
    high_confidence: float = 0.8  # Allow optimizations above this

    # Domain completion requirements
    minimum_domains_basic: int = 1  # Minimum for basic investigations
    minimum_domains_standard: int = 3  # Standard investigation requirement
    minimum_domains_comprehensive: int = 5  # Comprehensive analysis

    # Tool execution requirements
    minimum_tools_basic: int = 0  # Basic can rely on Snowflake only
    minimum_tools_standard: int = 2  # Standard requires additional tools
    minimum_tools_comprehensive: int = 4  # Comprehensive analysis

    # Quality assessment weights
    snowflake_weight: float = 0.5  # Primary data source weight
    tools_weight: float = 0.3  # Tool evidence weight
    domains_weight: float = 0.2  # Domain analysis weight


class EvidenceValidator:
    """
    Unified evidence validation logic for all hybrid investigation components.

    Provides consistent evidence quality assessment and validation gates
    across all system components to ensure investigation reliability.
    """

    def __init__(self, custom_thresholds: EvidenceThresholds = None):
        """Initialize with optional custom thresholds."""
        self.thresholds = custom_thresholds or EvidenceThresholds()

    def get_evidence_quality_level(self, quality_score: float) -> EvidenceQualityLevel:
        """Get evidence quality level classification."""
        if quality_score >= self.thresholds.high_confidence:
            return EvidenceQualityLevel.EXCELLENT
        elif quality_score >= self.thresholds.adequate_threshold:
            return EvidenceQualityLevel.GOOD
        elif quality_score >= self.thresholds.safety_trigger:
            return EvidenceQualityLevel.ADEQUATE
        elif quality_score >= self.thresholds.minimum_acceptable:
            return EvidenceQualityLevel.POOR
        else:
            return EvidenceQualityLevel.INSUFFICIENT

    def validate_evidence_for_completion(
        self,
        evidence_quality: float,
        domains_completed: int,
        tools_used: int,
        strategy: str = "standard",
    ) -> tuple[bool, str, Dict[str, Any]]:
        """
        Validate if evidence is sufficient for investigation completion.

        Args:
            evidence_quality: Overall evidence quality score (0.0-1.0)
            domains_completed: Number of domains completed
            tools_used: Number of tools successfully executed
            strategy: Investigation strategy (basic, standard, comprehensive)

        Returns:
            Tuple of (is_valid, reason, metrics)
        """
        # CRITICAL FIX: Ensure evidence_quality is never None to prevent formatting errors
        evidence_quality = evidence_quality if evidence_quality is not None else 0.0

        validation_result = {
            "evidence_quality": evidence_quality,
            "quality_level": self.get_evidence_quality_level(evidence_quality).value,
            "domains_completed": domains_completed,
            "tools_used": tools_used,
            "strategy": strategy,
        }

        # Check minimum evidence quality
        if evidence_quality < self.thresholds.minimum_acceptable:
            return (
                False,
                f"Evidence quality {evidence_quality:.3f} below minimum threshold {self.thresholds.minimum_acceptable}",
                validation_result,
            )

        # Strategy-specific validation
        if strategy == "basic":
            min_domains = self.thresholds.minimum_domains_basic
            min_tools = self.thresholds.minimum_tools_basic
        elif strategy == "comprehensive":
            min_domains = self.thresholds.minimum_domains_comprehensive
            min_tools = self.thresholds.minimum_tools_comprehensive
        else:  # standard
            min_domains = self.thresholds.minimum_domains_standard
            min_tools = self.thresholds.minimum_tools_standard

        # Validate domain completion
        if domains_completed < min_domains:
            return (
                False,
                f"Insufficient domains completed: {domains_completed} < {min_domains} required for {strategy} strategy",
                validation_result,
            )

        # Validate tool execution (flexible for basic strategy)
        if strategy != "basic" and tools_used < min_tools:
            return (
                False,
                f"Insufficient tools executed: {tools_used} < {min_tools} required for {strategy} strategy",
                validation_result,
            )

        # Additional quality checks for higher strategies
        if (
            strategy == "comprehensive"
            and evidence_quality < self.thresholds.adequate_threshold
        ):
            return (
                False,
                f"Comprehensive strategy requires evidence quality ≥ {self.thresholds.adequate_threshold}, got {evidence_quality:.3f}",
                validation_result,
            )

        validation_result["validation_passed"] = True
        return True, "Evidence validation passed", validation_result

    def should_trigger_safety_concerns(
        self, evidence_quality: float, loops_completed: int
    ) -> bool:
        """Check if evidence quality should trigger safety concerns."""
        return evidence_quality < self.thresholds.safety_trigger and loops_completed > 5

    def can_enable_optimizations(self, evidence_quality: float) -> bool:
        """Check if evidence quality allows AI optimizations."""
        return evidence_quality >= self.thresholds.high_confidence


# Global evidence validator instance
evidence_validator = EvidenceValidator()


def get_evidence_validator() -> EvidenceValidator:
    """Get the global evidence validator instance."""
    return evidence_validator


def get_evidence_thresholds() -> EvidenceThresholds:
    """Get the current evidence thresholds configuration."""
    return evidence_validator.thresholds
