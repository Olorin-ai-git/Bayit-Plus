"""
Confidence Value Extraction

This module extracts confidence values from various sources including
investigation state, agent results, and investigation context.
"""

from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .confidence_models import ConfidenceFieldType

logger = get_bridge_logger(__name__)


class ConfidenceExtractor:
    """Extracts confidence values from multiple sources."""

    def extract_confidence_values(
        self,
        state: Dict[str, Any],
        agent_results: Optional[List] = None,
        investigation_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[ConfidenceFieldType, float]:
        """
        Extract confidence values from all available sources.

        Args:
            state: Investigation state containing various confidence fields
            agent_results: List of agent results with confidence scores
            investigation_context: Additional context data

        Returns:
            Dictionary mapping confidence field types to their values
        """
        confidence_values = {}

        try:
            # Extract from investigation state
            state_confidences = self._extract_from_state(state)
            confidence_values.update(state_confidences)

            # Extract from agent results
            if agent_results:
                agent_confidences = self._extract_from_agent_results(agent_results)
                confidence_values.update(agent_confidences)

            # Extract from investigation context
            if investigation_context:
                context_confidences = self._extract_from_context(investigation_context)
                confidence_values.update(context_confidences)

            logger.debug(
                f"Extracted {len(confidence_values)} confidence values from sources"
            )

        except Exception as e:
            logger.error(f"Error extracting confidence values: {e}")

        return confidence_values

    def _extract_from_state(
        self, state: Dict[str, Any]
    ) -> Dict[ConfidenceFieldType, float]:
        """Extract confidence values from investigation state."""
        confidences = {}

        if not state:
            return confidences

        # AI confidence from hybrid state
        ai_conf = self._safe_get_confidence(state, "ai_confidence")
        if ai_conf is not None:
            confidences[ConfidenceFieldType.AI_CONFIDENCE] = float(ai_conf)

        # Confidence score from orchestrator
        conf_score = self._safe_get_confidence(state, "confidence_score")
        if conf_score is not None:
            confidences[ConfidenceFieldType.CONFIDENCE_SCORE] = float(conf_score)

        # Generic confidence
        conf = self._safe_get_confidence(state, "confidence")
        if conf is not None:
            confidences[ConfidenceFieldType.CONFIDENCE] = float(conf)

        # Evidence confidence
        ev_conf = self._safe_get_confidence(state, "evidence_confidence")
        if ev_conf is not None:
            confidences[ConfidenceFieldType.EVIDENCE_CONFIDENCE] = float(ev_conf)

        return confidences

    def _extract_from_agent_results(
        self, agent_results: List
    ) -> Dict[ConfidenceFieldType, float]:
        """Extract confidence values from agent results."""
        tool_confidences = []
        domain_confidences = []

        for result in agent_results:
            if not result:
                continue

            # Extract confidence from agent result attributes
            result_confidences = self._extract_from_single_result(result)
            tool_confidences.extend(result_confidences.get("tool", []))
            domain_confidences.extend(result_confidences.get("domain", []))

        # Calculate averages
        confidences = {}
        if tool_confidences:
            confidences[ConfidenceFieldType.TOOL_CONFIDENCE] = sum(
                tool_confidences
            ) / len(tool_confidences)

        if domain_confidences:
            confidences[ConfidenceFieldType.DOMAIN_CONFIDENCE] = sum(
                domain_confidences
            ) / len(domain_confidences)

        return confidences

    def _extract_from_single_result(self, result) -> Dict[str, List[float]]:
        """Extract confidence values from a single agent result."""
        tool_confidences = []
        domain_confidences = []

        # Check for confidence in agent result attributes
        if hasattr(result, "confidence") and result.confidence is not None:
            tool_confidences.append(float(result.confidence))
        elif (
            hasattr(result, "confidence_score") and result.confidence_score is not None
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

        # Check for nested confidence data
        if hasattr(result, "data") and isinstance(result.data, dict):
            nested_conf = result.data.get("confidence")
            if nested_conf is not None:
                tool_confidences.append(float(nested_conf))

        return {"tool": tool_confidences, "domain": domain_confidences}

    def _extract_from_context(
        self, investigation_context: Dict[str, Any]
    ) -> Dict[ConfidenceFieldType, float]:
        """Extract confidence values from investigation context."""
        confidences = {}

        if "overall_confidence" in investigation_context:
            overall_confidence = investigation_context["overall_confidence"]
            if overall_confidence is not None:
                confidences[ConfidenceFieldType.OVERALL_CONFIDENCE] = float(
                    overall_confidence
                )

        # Check for other context-specific confidence fields
        context_confidence_fields = [
            ("evidence_confidence", ConfidenceFieldType.EVIDENCE_CONFIDENCE),
            ("tool_confidence", ConfidenceFieldType.TOOL_CONFIDENCE),
            ("domain_confidence", ConfidenceFieldType.DOMAIN_CONFIDENCE),
        ]

        for field_name, field_type in context_confidence_fields:
            if field_name in investigation_context:
                confidence_value = investigation_context[field_name]
                if confidence_value is not None:
                    confidences[field_type] = float(confidence_value)

        return confidences

    def _safe_get_confidence(self, source, field_name):
        """Safely get confidence value from source (supports both dict and object)."""
        try:
            # Try dictionary access first
            if isinstance(source, dict):
                return source.get(field_name)
            # Try attribute access for objects
            elif hasattr(source, field_name):
                return getattr(source, field_name)
            else:
                return None
        except Exception as e:
            logger.debug(f"Failed to get {field_name} from source: {e}")
            return None
