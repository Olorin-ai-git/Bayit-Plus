"""
Pattern Recognition Integration for Risk Agent.

Integrates 5 pattern recognizers with per-transaction risk scoring:
1. Fraud Pattern Recognizer
2. Behavioral Pattern Recognizer
3. Temporal Pattern Recognizer
4. Network Pattern Recognizer
5. Frequency Pattern Recognizer

Strategy: Aggressive high-recall (>85% recall target)
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def recognize_all_patterns(
    transactions: List[Dict[str, Any]],
    minimum_support: float = 0.1,
    historical_patterns: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run all 5 pattern recognizers on transaction data.

    Args:
        transactions: List of transaction dictionaries
        minimum_support: Minimum support threshold (0.0-1.0)
        historical_patterns: Optional historical pattern data

    Returns:
        Dictionary containing all detected patterns and metadata
    """
    if not transactions:
        logger.warning("⚠️ No transactions provided for pattern recognition")
        return _empty_recognition_result()

    logger.info(f"🔍 Starting pattern recognition on {len(transactions)} transactions")

    all_patterns = []
    recognizer_results = {}

    try:
        # Import all 5 recognizers
        from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.behavioral_recognizer import (
            BehavioralPatternRecognizer,
        )
        from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.fraud_recognizer import (
            FraudPatternRecognizer,
        )
        from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.frequency_recognizer import (
            FrequencyPatternRecognizer,
        )
        from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.network_recognizer import (
            NetworkPatternRecognizer,
        )
        from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.temporal_recognizer import (
            TemporalPatternRecognizer,
        )

        processed_data = {"events": transactions}

        # 1. Fraud Pattern Recognition
        try:
            fraud_recognizer = FraudPatternRecognizer()
            fraud_result = fraud_recognizer.recognize(
                processed_data, minimum_support, historical_patterns
            )
            recognizer_results["fraud"] = fraud_result
            if fraud_result.get("success") and fraud_result.get("patterns"):
                all_patterns.extend(fraud_result["patterns"])
                logger.info(
                    f"✅ Fraud recognizer: {len(fraud_result['patterns'])} patterns detected"
                )
        except Exception as e:
            logger.error(f"❌ Fraud pattern recognition failed: {e}", exc_info=True)
            recognizer_results["fraud"] = {"success": False, "error": str(e)}

        # 2. Behavioral Pattern Recognition
        try:
            behavioral_recognizer = BehavioralPatternRecognizer()
            behavioral_result = behavioral_recognizer.recognize(
                processed_data, minimum_support, historical_patterns
            )
            recognizer_results["behavioral"] = behavioral_result
            if behavioral_result.get("success") and behavioral_result.get("patterns"):
                all_patterns.extend(behavioral_result["patterns"])
                logger.info(
                    f"✅ Behavioral recognizer: {len(behavioral_result['patterns'])} patterns detected"
                )
        except Exception as e:
            logger.error(
                f"❌ Behavioral pattern recognition failed: {e}", exc_info=True
            )
            recognizer_results["behavioral"] = {"success": False, "error": str(e)}

        # 3. Temporal Pattern Recognition
        try:
            temporal_recognizer = TemporalPatternRecognizer()
            temporal_result = temporal_recognizer.recognize(
                processed_data, minimum_support, historical_patterns
            )
            recognizer_results["temporal"] = temporal_result
            if temporal_result.get("success") and temporal_result.get("patterns"):
                all_patterns.extend(temporal_result["patterns"])
                logger.info(
                    f"✅ Temporal recognizer: {len(temporal_result['patterns'])} patterns detected"
                )
        except Exception as e:
            logger.error(f"❌ Temporal pattern recognition failed: {e}", exc_info=True)
            recognizer_results["temporal"] = {"success": False, "error": str(e)}

        # 4. Network Pattern Recognition
        try:
            network_recognizer = NetworkPatternRecognizer()
            network_result = network_recognizer.recognize(
                processed_data, minimum_support, historical_patterns
            )
            recognizer_results["network"] = network_result
            if network_result.get("success") and network_result.get("patterns"):
                all_patterns.extend(network_result["patterns"])
                logger.info(
                    f"✅ Network recognizer: {len(network_result['patterns'])} patterns detected"
                )
        except Exception as e:
            logger.error(f"❌ Network pattern recognition failed: {e}", exc_info=True)
            recognizer_results["network"] = {"success": False, "error": str(e)}

        # 5. Frequency Pattern Recognition
        try:
            frequency_recognizer = FrequencyPatternRecognizer()
            frequency_result = frequency_recognizer.recognize(
                processed_data, minimum_support, historical_patterns
            )
            recognizer_results["frequency"] = frequency_result
            if frequency_result.get("success") and frequency_result.get("patterns"):
                all_patterns.extend(frequency_result["patterns"])
                logger.info(
                    f"✅ Frequency recognizer: {len(frequency_result['patterns'])} patterns detected"
                )
        except Exception as e:
            logger.error(f"❌ Frequency pattern recognition failed: {e}", exc_info=True)
            recognizer_results["frequency"] = {"success": False, "error": str(e)}

        # Calculate overall statistics
        total_patterns = len(all_patterns)
        total_risk_adjustment = sum(p.get("risk_adjustment", 0.0) for p in all_patterns)
        max_risk_adjustment = max(
            (p.get("risk_adjustment", 0.0) for p in all_patterns), default=0.0
        )

        # Calculate ensemble confidence
        pattern_confidences = [p.get("confidence", 0.0) for p in all_patterns]
        avg_confidence = (
            sum(pattern_confidences) / len(pattern_confidences)
            if pattern_confidences
            else 0.0
        )

        # Unique pattern types
        unique_pattern_types = len(set(p.get("pattern_type") for p in all_patterns))

        logger.info(
            f"🎯 Pattern recognition complete: {total_patterns} patterns detected "
            f"(max risk adjustment: +{max_risk_adjustment*100:.0f}%)"
        )

        return {
            "success": True,
            "patterns": all_patterns,
            "total_patterns": total_patterns,
            "unique_pattern_types": unique_pattern_types,
            "total_risk_adjustment": round(total_risk_adjustment, 3),
            "max_risk_adjustment": round(max_risk_adjustment, 3),
            "avg_confidence": round(avg_confidence, 3),
            "recognizer_results": recognizer_results,
            "transaction_count": len(transactions),
        }

    except Exception as e:
        logger.error(f"❌ Pattern recognition failed: {e}", exc_info=True)
        return {"success": False, "error": str(e), "patterns": [], "total_patterns": 0}


def apply_pattern_adjustments(
    base_score: float, patterns: List[Dict[str, Any]], transaction: Dict[str, Any]
) -> tuple[float, List[str]]:
    """
    Apply pattern-based risk adjustments to a transaction score.

    Args:
        base_score: Base transaction risk score (0.0-1.0)
        patterns: List of detected patterns with risk_adjustments
        transaction: Transaction dictionary for pattern matching

    Returns:
        Tuple of (adjusted_score, applied_patterns)
    """
    if not patterns:
        return base_score, []

    adjusted_score = base_score
    applied_patterns = []

    try:
        tx_id = transaction.get("TX_ID_KEY", "unknown")

        # Apply all pattern risk adjustments (additive)
        for pattern in patterns:
            pattern_type = pattern.get("pattern_type")
            risk_adjustment = pattern.get("risk_adjustment", 0.0)
            pattern_name = pattern.get("pattern_name", pattern_type)

            if risk_adjustment > 0:
                # Apply adjustment
                adjusted_score += risk_adjustment
                applied_patterns.append(pattern_name)

        # Cap at 1.0 (100% risk)
        adjusted_score = min(1.0, adjusted_score)

        if applied_patterns:
            logger.debug(
                f"📊 Applied {len(applied_patterns)} pattern adjustments to {tx_id}: "
                f"{base_score:.3f} → {adjusted_score:.3f} "
                f"(patterns: {', '.join(applied_patterns[:3])})"
            )

        return adjusted_score, applied_patterns

    except Exception as e:
        logger.error(f"❌ Failed to apply pattern adjustments: {e}", exc_info=True)
        return base_score, []


def get_pattern_summary_for_llm(patterns: List[Dict[str, Any]]) -> str:
    """
    Generate a human-readable summary of detected patterns for LLM synthesis.

    Args:
        patterns: List of detected patterns

    Returns:
        String summary suitable for LLM input
    """
    if not patterns:
        return "No fraud patterns detected."

    try:
        # Group patterns by type
        pattern_groups = {}
        for pattern in patterns:
            pattern_type = pattern.get("pattern_type", "unknown")
            if pattern_type not in pattern_groups:
                pattern_groups[pattern_type] = []
            pattern_groups[pattern_type].append(pattern)

        # Build summary
        summary_lines = [
            f"🔍 **Pattern Recognition Results** ({len(patterns)} patterns detected):"
        ]

        for pattern_type, type_patterns in pattern_groups.items():
            for pattern in type_patterns:
                pattern_name = pattern.get("pattern_name", pattern_type)
                confidence = pattern.get("confidence", 0.0)
                risk_adj = pattern.get("risk_adjustment", 0.0)
                description = pattern.get("description", "")

                summary_lines.append(
                    f"• **{pattern_name}**: {description} "
                    f"(confidence: {confidence:.0%}, risk: +{risk_adj*100:.0f}%)"
                )

        return "\n".join(summary_lines)

    except Exception as e:
        logger.error(f"❌ Failed to generate pattern summary: {e}", exc_info=True)
        return "Pattern recognition completed but summary generation failed."


def _empty_recognition_result() -> Dict[str, Any]:
    """Return empty recognition result structure."""
    return {
        "success": True,
        "patterns": [],
        "total_patterns": 0,
        "unique_pattern_types": 0,
        "total_risk_adjustment": 0.0,
        "max_risk_adjustment": 0.0,
        "avg_confidence": 0.0,
        "recognizer_results": {},
        "transaction_count": 0,
    }
