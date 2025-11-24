"""
Fraud Detection Ensemble Methods

Implements ensemble model weighting and consensus finding for fraud detection.
"""

from typing import Any, Dict, List
from collections import Counter


class FraudEnsembleMethods:
    """Ensemble methods for combining multiple fraud detection models."""

    @staticmethod
    def apply_ensemble_fraud_detection(
        processed_data: Dict[str, Any],
        model_results: Dict[str, Any],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Apply ensemble fraud detection combining multiple models."""
        ensemble_results: Dict[str, Any] = {
            "ensemble_score": 0.0,
            "model_weights": {},
            "weighted_scores": {},
            "consensus_indicators": [],
            "confidence_level": "low",
        }

        # Define base weights
        base_weights = {
            "rule_based": 0.3,
            "behavioral": 0.35,
            "statistical": 0.25,
            "ensemble": 0.1,
        }

        # Adjust weights based on data quality
        adjusted_weights = FraudEnsembleMethods.adjust_model_weights(
            base_weights, processed_data
        )
        ensemble_results["model_weights"] = adjusted_weights

        # Calculate weighted scores
        total_weight: float = 0
        weighted_sum: float = 0

        for model_name, weight in adjusted_weights.items():
            if model_name in model_results and model_name != "ensemble":
                model_score = model_results[model_name].get("overall_score", 0)
                weighted_score = model_score * weight
                ensemble_results["weighted_scores"][model_name] = weighted_score

                weighted_sum += weighted_score
                total_weight += weight

        # Calculate final ensemble score
        if total_weight > 0:
            ensemble_results["ensemble_score"] = weighted_sum / total_weight

        # Find consensus indicators
        consensus_indicators = FraudEnsembleMethods.find_consensus_indicators(
            model_results
        )
        ensemble_results["consensus_indicators"] = consensus_indicators

        # Determine confidence level
        confidence_level = FraudEnsembleMethods.calculate_ensemble_confidence(
            model_results, consensus_indicators, ensemble_results["ensemble_score"]
        )
        ensemble_results["confidence_level"] = confidence_level

        return ensemble_results

    @staticmethod
    def adjust_model_weights(
        base_weights: Dict[str, float], data_summary: Dict[str, Any]
    ) -> Dict[str, float]:
        """Adjust model weights based on data quality and availability."""
        adjusted_weights = base_weights.copy()

        # Increase behavioral weight if user profile available
        behavioral_features = data_summary.get("behavioral_features", {})
        if behavioral_features:
            adjusted_weights["behavioral"] = min(
                adjusted_weights["behavioral"] * 1.2, 0.5
            )

        # Increase statistical weight if historical data is rich
        historical_features = data_summary.get("historical_features", {})
        if historical_features:
            adjusted_weights["statistical"] = min(
                adjusted_weights["statistical"] * 1.3, 0.4
            )

        # Normalize weights
        total_weight = sum(adjusted_weights.values())
        if total_weight > 0:
            for model in adjusted_weights:
                adjusted_weights[model] = adjusted_weights[model] / total_weight

        return adjusted_weights

    @staticmethod
    def find_consensus_indicators(
        model_results: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Find indicators that are detected by multiple models."""
        consensus_indicators = []

        indicator_counts: Counter[str] = Counter()
        all_indicators: Dict[str, Dict[str, Any]] = {}

        # Collect indicators from all models
        for model_name, results in model_results.items():
            if isinstance(results, dict):
                model_indicators = []

                if "triggered_rules" in results:
                    model_indicators.extend(results["triggered_rules"])
                if "behavioral_anomalies" in results:
                    model_indicators.extend(results["behavioral_anomalies"])
                if "statistical_anomalies" in results:
                    model_indicators.extend(results["statistical_anomalies"])

                # Count indicator types
                for indicator in model_indicators:
                    indicator_type = indicator.get("type", "unknown")
                    indicator_counts[indicator_type] += 1
                    if indicator_type not in all_indicators:
                        all_indicators[indicator_type] = indicator

        # Find indicators detected by multiple models
        for indicator_type, count in indicator_counts.items():
            if count >= 2:  # Detected by at least 2 models
                indicator = all_indicators[indicator_type].copy()
                indicator["consensus_count"] = count
                indicator["consensus_confidence"] = min(count / 3.0, 1.0)
                consensus_indicators.append(indicator)

        return consensus_indicators

    @staticmethod
    def calculate_ensemble_confidence(
        model_results: Dict[str, Any],
        consensus_indicators: List[Dict[str, Any]],
        ensemble_score: float,
    ) -> str:
        """Calculate confidence level for ensemble decision."""
        # Count models with significant results
        active_models = 0
        for model_name, results in model_results.items():
            if isinstance(results, dict) and results.get("overall_score", 0) > 0.1:
                active_models += 1

        # Calculate confidence factors
        consensus_factor = len(consensus_indicators) / 5.0
        score_factor = ensemble_score
        model_factor = active_models / len(model_results)

        overall_confidence = (consensus_factor + score_factor + model_factor) / 3.0

        if overall_confidence >= 0.7:
            return "high"
        elif overall_confidence >= 0.4:
            return "medium"
        else:
            return "low"
