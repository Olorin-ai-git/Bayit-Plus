"""
Confidence Score Consolidation System

This module consolidates and standardizes confidence scoring across different
components of the investigation system to ensure consistency and prevent
data quality issues identified in the hybrid graph analysis.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ConfidenceFieldType(Enum):
    """Types of confidence fields in the system."""

    AI_CONFIDENCE = "ai_confidence"  # Hybrid state AI confidence
    CONFIDENCE_SCORE = "confidence_score"  # Orchestrator confidence score
    CONFIDENCE = "confidence"  # Raw confidence value
    EVIDENCE_CONFIDENCE = "evidence_confidence"  # Evidence quality confidence
    TOOL_CONFIDENCE = "tool_confidence"  # Tool output confidence
    DOMAIN_CONFIDENCE = "domain_confidence"  # Domain analysis confidence
    OVERALL_CONFIDENCE = "overall_confidence"  # Final aggregated confidence


@dataclass
class ConsolidatedConfidence:
    """Standardized confidence representation."""

    # Core confidence values
    overall_score: float  # Primary confidence (0.0-1.0)
    level_description: str  # Human-readable level

    # Component breakdown
    ai_confidence: Optional[float] = None  # AI routing confidence
    evidence_confidence: Optional[float] = None  # Evidence quality confidence
    tool_confidence: Optional[float] = None  # Tool reliability confidence
    domain_confidence: Optional[float] = None  # Domain analysis confidence

    # Quality indicators
    consistency_score: float = 1.0  # How consistent different scores are
    reliability_score: float = 1.0  # How reliable the confidence is
    data_quality_issues: List[str] = field(default_factory=list)

    # Metadata
    source_fields: Dict[str, float] = field(default_factory=dict)
    calculation_timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )
    consolidation_method: str = "weighted_average"


class ConfidenceConsolidator:
    """
    Consolidates confidence scores from multiple sources into a standardized format.

    Addresses the confidence field inconsistencies identified in investigation failures
    where different confidence values were being updated separately.
    """

    def __init__(self):
        """Initialize the confidence consolidator with default weights."""
        self.component_weights = {
            ConfidenceFieldType.AI_CONFIDENCE: 0.35,  # AI routing decisions
            ConfidenceFieldType.EVIDENCE_CONFIDENCE: 0.25,  # Evidence quality
            ConfidenceFieldType.TOOL_CONFIDENCE: 0.20,  # Tool reliability
            ConfidenceFieldType.DOMAIN_CONFIDENCE: 0.20,  # Domain analysis
        }

        self.confidence_thresholds = {
            "CRITICAL": 0.9,
            "HIGH": 0.75,
            "MEDIUM": 0.5,
            "LOW": 0.25,
            "MINIMAL": 0.0,
        }

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
            confidence_values = self._extract_confidence_values(
                state, agent_results, investigation_context
            )

            # Detect inconsistencies between confidence sources
            consistency_issues = self._detect_confidence_inconsistencies(
                confidence_values
            )

            # Calculate weighted overall confidence
            overall_confidence = self._calculate_weighted_confidence(confidence_values)

            # Assess confidence reliability
            reliability_score = self._assess_confidence_reliability(
                confidence_values, consistency_issues
            )

            # Calculate consistency score
            consistency_score = self._calculate_consistency_score(confidence_values)

            # Determine confidence level description
            level_description = self._determine_confidence_level(overall_confidence)

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
                overall_score=0.5,
                level_description="MEDIUM_FALLBACK",
                consistency_score=0.0,
                reliability_score=0.0,
                data_quality_issues=[f"Consolidation failed: {str(e)}"],
                consolidation_method="fallback",
            )

    def _extract_confidence_values(
        self,
        state: Dict[str, Any],
        agent_results: Optional[List],
        investigation_context: Optional[Dict[str, Any]],
    ) -> Dict[ConfidenceFieldType, float]:
        """Extract confidence values from all available sources."""
        confidence_values = {}

        # Extract from investigation state (defensive access for both dict and object types)
        if state:
            # AI confidence from hybrid state
            ai_conf = self._safe_get_confidence(state, "ai_confidence")
            if ai_conf is not None:
                confidence_values[ConfidenceFieldType.AI_CONFIDENCE] = float(ai_conf)

            # Confidence score from orchestrator
            conf_score = self._safe_get_confidence(state, "confidence_score")
            if conf_score is not None:
                confidence_values[ConfidenceFieldType.CONFIDENCE_SCORE] = float(
                    conf_score
                )

            # Generic confidence
            conf = self._safe_get_confidence(state, "confidence")
            if conf is not None:
                confidence_values[ConfidenceFieldType.CONFIDENCE] = float(conf)

            # Evidence confidence
            ev_conf = self._safe_get_confidence(state, "evidence_confidence")
            if ev_conf is not None:
                confidence_values[ConfidenceFieldType.EVIDENCE_CONFIDENCE] = float(
                    ev_conf
                )

        # Extract from agent results
        if agent_results:
            tool_confidences = []
            domain_confidences = []

            for result in agent_results:
                if not result:
                    continue

                # Check for confidence in agent result attributes
                if hasattr(result, "confidence") and result.confidence is not None:
                    tool_confidences.append(float(result.confidence))
                elif (
                    hasattr(result, "confidence_score")
                    and result.confidence_score is not None
                ):
                    tool_confidences.append(float(result.confidence_score))

                # Check for domain-specific confidence
                if (
                    hasattr(result, "domain")
                    and hasattr(result, "confidence")
                    and result.confidence is not None
                ):
                    domain_confidences.append(float(result.confidence))

                # Check tool outputs for confidence scores
                if hasattr(result, "tool_outputs"):
                    for tool_output in result.tool_outputs:
                        if (
                            hasattr(tool_output, "confidence")
                            and tool_output.confidence is not None
                        ):
                            tool_confidences.append(float(tool_output.confidence))

            # Average tool and domain confidences
            if tool_confidences:
                confidence_values[ConfidenceFieldType.TOOL_CONFIDENCE] = sum(
                    tool_confidences
                ) / len(tool_confidences)

            if domain_confidences:
                confidence_values[ConfidenceFieldType.DOMAIN_CONFIDENCE] = sum(
                    domain_confidences
                ) / len(domain_confidences)

        # Extract from investigation context
        if investigation_context:
            if "overall_confidence" in investigation_context:
                overall_confidence = investigation_context["overall_confidence"]
                if overall_confidence is not None:
                    confidence_values[ConfidenceFieldType.OVERALL_CONFIDENCE] = float(
                        overall_confidence
                    )

        return confidence_values

    def _safe_get_confidence(self, state, field_name):
        """Safely get confidence value from state (supports both dict and object)."""
        try:
            # Try dictionary access first
            if isinstance(state, dict):
                return state.get(field_name)
            # Try attribute access for objects
            elif hasattr(state, field_name):
                return getattr(state, field_name)
            else:
                return None
        except Exception:
            return None

    def _safe_set_confidence(self, state, field_name, value):
        """Safely set confidence value in state (supports both dict and object)."""
        try:
            # Try dictionary access first
            if isinstance(state, dict):
                state[field_name] = value
            # Try attribute access for objects
            elif hasattr(state, field_name):
                setattr(state, field_name, value)
            # If object doesn't have the attribute, try to set it anyway
            else:
                try:
                    setattr(state, field_name, value)
                except AttributeError:
                    # If we can't set as attribute, treat as dict
                    if hasattr(state, "__setitem__"):
                        state[field_name] = value
        except Exception as e:
            logger.warning(f"Failed to set confidence field {field_name}: {e}")

    def _detect_confidence_inconsistencies(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """Detect inconsistencies between different confidence sources."""
        issues = []

        if not confidence_values:
            issues.append("No confidence values found in investigation")
            return issues

        values = list(confidence_values.values())

        # Check for extreme variance between confidence sources
        if len(values) > 1:
            min_conf = min(values)
            max_conf = max(values)
            variance = max_conf - min_conf

            if variance > 0.5:  # 50% difference between highest and lowest
                issues.append(
                    f"High confidence variance detected: {variance:.3f} (min: {min_conf:.3f}, max: {max_conf:.3f})"
                )

        # Check for confidence values outside valid range
        for field_type, value in confidence_values.items():
            if not (0.0 <= value <= 1.0):
                issues.append(
                    f"Invalid confidence range for {field_type.value}: {value}"
                )

        # Check for suspicious patterns
        if (
            ConfidenceFieldType.AI_CONFIDENCE in confidence_values
            and ConfidenceFieldType.CONFIDENCE_SCORE in confidence_values
        ):
            ai_conf = confidence_values[ConfidenceFieldType.AI_CONFIDENCE]
            score_conf = confidence_values[ConfidenceFieldType.CONFIDENCE_SCORE]

            # Safe null check before formatting
            if (
                ai_conf is not None
                and score_conf is not None
                and abs(ai_conf - score_conf) > 0.3
            ):  # 30% difference
                ai_conf_safe = ai_conf if ai_conf is not None else 0.0
                score_conf_safe = score_conf if score_conf is not None else 0.0
                issues.append(
                    f"AI confidence ({ai_conf_safe:.3f}) significantly differs from confidence score ({score_conf_safe:.3f})"
                )

        return issues

    def _calculate_weighted_confidence(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> float:
        """Calculate weighted overall confidence from available sources."""
        if not confidence_values:
            return 0.5  # Default moderate confidence

        # If overall confidence is already calculated, use it
        if ConfidenceFieldType.OVERALL_CONFIDENCE in confidence_values:
            return confidence_values[ConfidenceFieldType.OVERALL_CONFIDENCE]

        # Calculate weighted average of available confidence types
        weighted_sum = 0.0
        total_weight = 0.0

        for field_type, value in confidence_values.items():
            if field_type in self.component_weights:
                weight = self.component_weights[field_type]
                weighted_sum += value * weight
                total_weight += weight

        # If no weighted components, use simple average
        if total_weight == 0:
            return sum(confidence_values.values()) / len(confidence_values)

        # Normalize by actual weights used
        return min(1.0, max(0.0, weighted_sum / total_weight))

    def _assess_confidence_reliability(
        self,
        confidence_values: Dict[ConfidenceFieldType, float],
        consistency_issues: List[str],
    ) -> float:
        """Assess how reliable the confidence scores are."""
        reliability = 1.0

        # Reduce reliability for consistency issues
        reliability -= len(consistency_issues) * 0.2

        # Reduce reliability if we have very few confidence sources
        if len(confidence_values) < 2:
            reliability -= 0.3

        # Reduce reliability for extreme values without supporting evidence
        values = list(confidence_values.values())
        if values:
            if (max(values) > 0.9 or min(values) < 0.1) and len(values) < 3:
                reliability -= 0.2

        return max(0.0, reliability)

    def _calculate_consistency_score(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> float:
        """Calculate how consistent the confidence values are."""
        if len(confidence_values) < 2:
            return 1.0  # Perfect consistency if only one value

        values = list(confidence_values.values())

        # Calculate coefficient of variation (std dev / mean)
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            return 1.0

        variance = sum((x - mean_val) ** 2 for x in values) / len(values)
        std_dev = variance**0.5

        coefficient_of_variation = std_dev / mean_val

        # Convert to consistency score (1.0 = perfect consistency, 0.0 = high variance)
        consistency = max(0.0, 1.0 - (coefficient_of_variation * 2))

        return consistency

    def _determine_confidence_level(self, confidence: float) -> str:
        """Determine human-readable confidence level."""
        for level, threshold in self.confidence_thresholds.items():
            if confidence >= threshold:
                return level
        return "MINIMAL"

    def apply_consolidated_confidence(
        self, state: Dict[str, Any], consolidated: ConsolidatedConfidence
    ) -> Dict[str, Any]:
        """
        Apply consolidated confidence back to the investigation state.

        This standardizes all confidence fields to use the consolidated values.
        """
        # Update primary confidence fields (defensive for both dict and object types)
        self._safe_set_confidence(state, "confidence", consolidated.overall_score)
        self._safe_set_confidence(state, "confidence_score", consolidated.overall_score)
        self._safe_set_confidence(
            state,
            "ai_confidence",
            consolidated.ai_confidence or consolidated.overall_score,
        )

        # Add consolidation metadata
        state["confidence_consolidation"] = {
            "overall_score": consolidated.overall_score,
            "level_description": consolidated.level_description,
            "consistency_score": consolidated.consistency_score,
            "reliability_score": consolidated.reliability_score,
            "data_quality_issues": consolidated.data_quality_issues,
            "component_breakdown": {
                "ai_confidence": consolidated.ai_confidence,
                "evidence_confidence": consolidated.evidence_confidence,
                "tool_confidence": consolidated.tool_confidence,
                "domain_confidence": consolidated.domain_confidence,
            },
            "source_fields": consolidated.source_fields,
            "timestamp": consolidated.calculation_timestamp,
            "method": consolidated.consolidation_method,
        }

        logger.debug(
            f"✅ Applied consolidated confidence {consolidated.overall_score:.3f} to investigation state"
        )

        return state
