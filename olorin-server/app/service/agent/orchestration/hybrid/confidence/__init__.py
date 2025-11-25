"""
Confidence Management Components

This package provides modular components for confidence score consolidation
while maintaining backward compatibility with existing ConfidenceConsolidator usage.
"""

import time
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .confidence_applicator import ConfidenceApplicator
from .confidence_calculator import ConfidenceCalculator
from .confidence_extractor import ConfidenceExtractor

# Import all components
from .confidence_models import (
    CONFIDENCE_THRESHOLDS,
    DEFAULT_COMPONENT_WEIGHTS,
    FALLBACK_CONFIDENCE,
    FALLBACK_LEVEL,
    ConfidenceFieldType,
    ConsolidatedConfidence,
)
from .confidence_validator import ConfidenceValidator

logger = get_bridge_logger(__name__)


class ConfidenceConsolidator:
    """
    Main consolidator class that orchestrates all confidence management components.

    This maintains the original interface while using modular components internally.
    """

    def __init__(self):
        """Initialize the confidence consolidator with all components."""
        self.component_weights = DEFAULT_COMPONENT_WEIGHTS.copy()
        self.confidence_thresholds = CONFIDENCE_THRESHOLDS.copy()

        # Initialize all components
        self.extractor = ConfidenceExtractor()
        self.validator = ConfidenceValidator()
        self.calculator = ConfidenceCalculator(self.component_weights)
        self.applicator = ConfidenceApplicator()

    def consolidate_confidence_scores(
        self,
        state: Dict[str, Any],
        agent_results: Optional[List] = None,
        investigation_context: Optional[Dict[str, Any]] = None,
    ) -> ConsolidatedConfidence:
        """
        Consolidate all confidence scores from state and agent results.

        Args:
            state: Investigation state containing various confidence fields
            agent_results: List of agent results with confidence scores
            investigation_context: Additional context data

        Returns:
            ConsolidatedConfidence with standardized scores
        """
        try:
            start_time = time.time()

            # Extract confidence values from different sources
            confidence_values = self.extractor.extract_confidence_values(
                state, agent_results, investigation_context
            )

            # Detect inconsistencies between confidence sources
            consistency_issues = self.validator.detect_confidence_inconsistencies(
                confidence_values
            )

            # Calculate weighted overall confidence
            overall_confidence = self.calculator.calculate_weighted_confidence(
                confidence_values
            )

            # Assess confidence reliability
            reliability_score = self.validator.assess_confidence_reliability(
                confidence_values, consistency_issues
            )

            # Calculate consistency score
            consistency_score = self.validator.calculate_consistency_score(
                confidence_values
            )

            # Determine confidence level description
            level_description = self.calculator.determine_confidence_level(
                overall_confidence
            )

            # Extract component confidences
            ai_confidence = confidence_values.get(ConfidenceFieldType.AI_CONFIDENCE)
            evidence_confidence = confidence_values.get(
                ConfidenceFieldType.EVIDENCE_CONFIDENCE
            )
            tool_confidence = confidence_values.get(ConfidenceFieldType.TOOL_CONFIDENCE)
            domain_confidence = confidence_values.get(
                ConfidenceFieldType.DOMAIN_CONFIDENCE
            )

            consolidation_time = time.time() - start_time

            consolidated = ConsolidatedConfidence(
                overall_score=overall_confidence,
                level_description=level_description,
                ai_confidence=ai_confidence,
                evidence_confidence=evidence_confidence,
                tool_confidence=tool_confidence,
                domain_confidence=domain_confidence,
                consistency_score=consistency_score,
                reliability_score=reliability_score,
                data_quality_issues=consistency_issues,
                source_fields={
                    field_type.value: value
                    for field_type, value in confidence_values.items()
                },
                consolidation_method="weighted_average_with_consistency_check",
            )

            logger.debug(
                f"✅ Confidence consolidated: {overall_confidence:.3f} ({level_description})"
            )
            logger.debug(
                f"   Consistency: {consistency_score:.3f} | Reliability: {reliability_score:.3f}"
            )
            if consistency_issues:
                logger.warning(
                    f"   Data quality issues: {len(consistency_issues)} detected"
                )
            logger.debug(f"   Consolidation time: {consolidation_time*1000:.1f}ms")

            return consolidated

        except Exception as e:
            logger.error(f"❌ Confidence consolidation failed: {e}")

            # Return fallback confidence
            return ConsolidatedConfidence(
                overall_score=FALLBACK_CONFIDENCE,
                level_description=FALLBACK_LEVEL,
                consistency_score=0.0,
                reliability_score=0.0,
                data_quality_issues=[f"Consolidation failed: {str(e)}"],
                consolidation_method="fallback",
            )

    def apply_consolidated_confidence(
        self, state: Dict[str, Any], consolidated: ConsolidatedConfidence
    ) -> Dict[str, Any]:
        """
        Apply consolidated confidence back to the investigation state.

        This standardizes all confidence fields to use the consolidated values.
        """
        return self.applicator.apply_consolidated_confidence(state, consolidated)


# Export all public interfaces for backward compatibility
__all__ = [
    # Main class (backward compatibility)
    "ConfidenceConsolidator",
    # Data models
    "ConfidenceFieldType",
    "ConsolidatedConfidence",
    # Component classes
    "ConfidenceExtractor",
    "ConfidenceValidator",
    "ConfidenceCalculator",
    "ConfidenceApplicator",
    # Constants
    "DEFAULT_COMPONENT_WEIGHTS",
    "CONFIDENCE_THRESHOLDS",
    "FALLBACK_CONFIDENCE",
    "FALLBACK_LEVEL",
]
