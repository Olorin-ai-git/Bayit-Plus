"""
Confidence Validation and Consistency Checking

This module validates confidence values and detects inconsistencies
between different confidence sources to ensure data quality.
"""

from typing import Dict, List

from app.service.logging import get_bridge_logger

from .confidence_models import (
    AI_SCORE_DIFF_THRESHOLD,
    HIGH_VARIANCE_THRESHOLD,
    ConfidenceFieldType,
)

logger = get_bridge_logger(__name__)


class ConfidenceValidator:
    """Validates confidence values and detects inconsistencies."""

    def detect_confidence_inconsistencies(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """
        Detect inconsistencies between different confidence sources.

        Args:
            confidence_values: Dictionary of confidence values by type

        Returns:
            List of detected issues/inconsistencies
        """
        issues = []

        if not confidence_values:
            issues.append("No confidence values found in investigation")
            return issues

        # Check for range violations
        range_issues = self._check_confidence_ranges(confidence_values)
        issues.extend(range_issues)

        # Check for high variance between sources
        variance_issues = self._check_confidence_variance(confidence_values)
        issues.extend(variance_issues)

        # Check for suspicious patterns
        pattern_issues = self._check_suspicious_patterns(confidence_values)
        issues.extend(pattern_issues)

        # Check for AI vs orchestrator discrepancies
        ai_issues = self._check_ai_orchestrator_discrepancies(confidence_values)
        issues.extend(ai_issues)

        if issues:
            logger.warning(f"Detected {len(issues)} confidence inconsistencies")

        return issues

    def _check_confidence_ranges(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """Check for confidence values outside valid range (0.0-1.0)."""
        issues = []

        for field_type, value in confidence_values.items():
            if not (0.0 <= value <= 1.0):
                issues.append(
                    f"Invalid confidence range for {field_type.value}: {value}"
                )

        return issues

    def _check_confidence_variance(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """Check for extreme variance between confidence sources."""
        issues = []

        if len(confidence_values) < 2:
            return issues

        values = list(confidence_values.values())
        min_conf = min(values)
        max_conf = max(values)
        variance = max_conf - min_conf

        if variance > HIGH_VARIANCE_THRESHOLD:
            issues.append(
                f"High confidence variance detected: {variance:.3f} "
                f"(min: {min_conf:.3f}, max: {max_conf:.3f})"
            )

        return issues

    def _check_suspicious_patterns(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """Check for suspicious confidence patterns."""
        issues = []

        values = list(confidence_values.values())

        # Check for all values being identical (suspicious uniformity)
        if len(set(values)) == 1 and len(values) > 2:
            issues.append(
                f"Suspicious uniformity: all {len(values)} confidence values are identical ({values[0]})"
            )

        # Check for extreme clustering at boundaries
        extreme_low = sum(1 for v in values if v < 0.1)
        extreme_high = sum(1 for v in values if v > 0.9)

        if extreme_low > len(values) * 0.8:
            issues.append(
                f"Suspicious clustering: {extreme_low}/{len(values)} values below 0.1"
            )

        if extreme_high > len(values) * 0.8:
            issues.append(
                f"Suspicious clustering: {extreme_high}/{len(values)} values above 0.9"
            )

        return issues

    def _check_ai_orchestrator_discrepancies(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> List[str]:
        """Check for discrepancies between AI and orchestrator confidence."""
        issues = []

        # Check AI confidence vs confidence score discrepancy
        ai_conf = confidence_values.get(ConfidenceFieldType.AI_CONFIDENCE)
        score_conf = confidence_values.get(ConfidenceFieldType.CONFIDENCE_SCORE)

        if ai_conf is not None and score_conf is not None:
            diff = abs(ai_conf - score_conf)
            if diff > AI_SCORE_DIFF_THRESHOLD:
                issues.append(
                    f"AI confidence ({ai_conf:.3f}) significantly differs from "
                    f"confidence score ({score_conf:.3f}) - difference: {diff:.3f}"
                )

        # Check for AI confidence vs generic confidence discrepancy
        generic_conf = confidence_values.get(ConfidenceFieldType.CONFIDENCE)
        if ai_conf is not None and generic_conf is not None:
            diff = abs(ai_conf - generic_conf)
            if diff > AI_SCORE_DIFF_THRESHOLD:
                issues.append(
                    f"AI confidence ({ai_conf:.3f}) significantly differs from "
                    f"generic confidence ({generic_conf:.3f}) - difference: {diff:.3f}"
                )

        return issues

    def assess_confidence_reliability(
        self,
        confidence_values: Dict[ConfidenceFieldType, float],
        consistency_issues: List[str],
    ) -> float:
        """
        Assess how reliable the confidence scores are.

        Args:
            confidence_values: Dictionary of confidence values
            consistency_issues: List of detected consistency issues

        Returns:
            Reliability score (0.0-1.0)
        """
        reliability = 1.0

        # Reduce reliability for consistency issues
        reliability -= len(consistency_issues) * 0.2

        # Reduce reliability if we have very few confidence sources
        if len(confidence_values) < 2:
            reliability -= 0.3

        # Reduce reliability for extreme values without supporting evidence
        values = list(confidence_values.values())
        if values:
            extreme_values = [v for v in values if v > 0.9 or v < 0.1]
            if extreme_values and len(values) < 3:
                reliability -= 0.2

        # Reduce reliability for missing critical confidence types
        critical_types = [
            ConfidenceFieldType.AI_CONFIDENCE,
            ConfidenceFieldType.EVIDENCE_CONFIDENCE,
        ]

        missing_critical = sum(
            1 for ctype in critical_types if ctype not in confidence_values
        )
        reliability -= missing_critical * 0.15

        return max(0.0, reliability)

    def calculate_consistency_score(
        self, confidence_values: Dict[ConfidenceFieldType, float]
    ) -> float:
        """
        Calculate how consistent the confidence values are.

        Args:
            confidence_values: Dictionary of confidence values

        Returns:
            Consistency score (0.0-1.0, where 1.0 is perfect consistency)
        """
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

    def validate_consolidated_confidence(self, overall_score: float) -> List[str]:
        """
        Validate the final consolidated confidence score.

        Args:
            overall_score: The consolidated confidence score

        Returns:
            List of validation issues
        """
        issues = []

        if not (0.0 <= overall_score <= 1.0):
            issues.append(
                f"Consolidated confidence score out of range: {overall_score}"
            )

        # Check for suspicious edge values
        if overall_score == 0.0:
            issues.append(
                "Consolidated confidence is exactly 0.0 - may indicate calculation error"
            )

        if overall_score == 1.0:
            issues.append(
                "Consolidated confidence is exactly 1.0 - may indicate over-confidence"
            )

        return issues
