"""
Pattern Recognition Orchestrator.

Coordinates all pattern recognition algorithms and manages their execution.
"""

from typing import Any, Dict, Optional, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PatternRecognizers:
    """Orchestrates pattern recognition across different algorithm types."""

    def __init__(self):
        """Initialize the pattern recognizers."""
        # Lazy load recognizers to avoid circular imports
        self._recognizers = {}

    def recognize_patterns(
        self,
        processed_data: Dict[str, Any],
        pattern_types: List[str],
        minimum_support: float,
        historical_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute pattern recognition for specified types."""
        results = {}

        for pattern_type in pattern_types:
            try:
                if pattern_type == "sequence":
                    results["sequence"] = self._recognize_sequence_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "behavioral":
                    results["behavioral"] = self._recognize_behavioral_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "temporal":
                    results["temporal"] = self._recognize_temporal_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "frequency":
                    results["frequency"] = self._recognize_frequency_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "fraud":
                    results["fraud"] = self._recognize_fraud_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "network":
                    results["network"] = self._recognize_network_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                elif pattern_type == "textual":
                    results["textual"] = self._recognize_textual_patterns(
                        processed_data, minimum_support, historical_patterns
                    )
                else:
                    logger.warning(f"Unknown pattern type: {pattern_type}")

            except Exception as e:
                logger.error(f"Error recognizing {pattern_type} patterns: {e}")
                results[pattern_type] = {
                    "success": False,
                    "error": str(e),
                    "patterns": []
                }

        return results

    def _get_recognizer(self, recognizer_type: str):
        """Get or create a specific recognizer."""
        if recognizer_type not in self._recognizers:
            if recognizer_type == "sequence":
                from .sequence_recognizer import SequencePatternRecognizer
                self._recognizers[recognizer_type] = SequencePatternRecognizer()
            elif recognizer_type == "behavioral":
                from .behavioral_recognizer import BehavioralPatternRecognizer
                self._recognizers[recognizer_type] = BehavioralPatternRecognizer()
            elif recognizer_type == "temporal":
                from .temporal_recognizer import TemporalPatternRecognizer
                self._recognizers[recognizer_type] = TemporalPatternRecognizer()
            elif recognizer_type == "frequency":
                from .frequency_recognizer import FrequencyPatternRecognizer
                self._recognizers[recognizer_type] = FrequencyPatternRecognizer()
            elif recognizer_type == "fraud":
                from .fraud_recognizer import FraudPatternRecognizer
                self._recognizers[recognizer_type] = FraudPatternRecognizer()
            elif recognizer_type == "network":
                from .network_recognizer import NetworkPatternRecognizer
                self._recognizers[recognizer_type] = NetworkPatternRecognizer()
            elif recognizer_type == "textual":
                from .textual_recognizer import TextualPatternRecognizer
                self._recognizers[recognizer_type] = TextualPatternRecognizer()

        return self._recognizers.get(recognizer_type)

    def _recognize_sequence_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize sequence patterns."""
        recognizer = self._get_recognizer("sequence")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_behavioral_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize behavioral patterns."""
        recognizer = self._get_recognizer("behavioral")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_temporal_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize temporal patterns."""
        recognizer = self._get_recognizer("temporal")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_frequency_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize frequency patterns."""
        recognizer = self._get_recognizer("frequency")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_fraud_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize fraud patterns."""
        recognizer = self._get_recognizer("fraud")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_network_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize network patterns."""
        recognizer = self._get_recognizer("network")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)

    def _recognize_textual_patterns(self, processed_data, minimum_support, historical_patterns):
        """Recognize textual patterns."""
        recognizer = self._get_recognizer("textual")
        return recognizer.recognize(processed_data, minimum_support, historical_patterns)