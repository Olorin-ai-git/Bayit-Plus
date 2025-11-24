"""
Fraud Detection ML Tool

Advanced machine learning tool for fraud detection using ensemble methods.
Legacy wrapper that delegates to specialized detection modules.

@deprecated Direct usage. Use specialized processors for better modularity:
- fraud_detection_input: Input validation
- fraud_detection_preprocessor: Data preprocessing
- fraud_detection_rules: Rule-based detection
- fraud_detection_behavioral: Behavioral analysis
- fraud_detection_statistical: Statistical analysis
- fraud_detection_ensemble: Ensemble methods
- fraud_detection_scoring: Scoring and decisions
- fraud_detection_recommendations: Recommendations
"""

from typing import Any, Dict, Optional, List
from langchain.tools import BaseTool
import json
from datetime import datetime
from app.service.logging import get_bridge_logger

# Import specialized modules
from .fraud_detection_input import FraudDetectionInput
from .fraud_detection_preprocessor import FraudDataPreprocessor
from .fraud_detection_rules import FraudDetectionRules
from .fraud_detection_behavioral import FraudBehavioralAnalysis
from .fraud_detection_statistical import FraudStatisticalAnalysis
from .fraud_detection_ensemble import FraudEnsembleMethods
from .fraud_detection_scoring import FraudScoringDecision
from .fraud_detection_recommendations import FraudRecommendations

logger = get_bridge_logger(__name__)

class FraudDetectionTool(BaseTool):
    """Advanced fraud detection using ML ensemble methods.

    Detects: payment fraud, identity fraud, account takeover, synthetic fraud.
    Uses: ensemble ML, rule-based systems, behavioral analysis, statistical methods.
    """
    name: str = "fraud_detection_ml"
    description: str = """
    Performs comprehensive fraud detection using advanced machine learning
    ensemble methods to identify fraudulent activities across multiple vectors
    including payment fraud, identity fraud, account takeover, and synthetic fraud.

    Combines rule-based systems, behavioral analysis, statistical methods, and
    machine learning models for accurate fraud detection with configurable
    sensitivity levels to balance false positives and detection rates.
    """
    args_schema: type = FraudDetectionInput

    def _run(
        self,
        transaction_data: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]] = None,
        detection_models: Optional[List[str]] = None,
        fraud_types: Optional[List[str]] = None,
        sensitivity_level: str = "balanced",
        historical_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> str:
        """Execute fraud detection analysis using specialized modules."""
        try:
            logger.info(
                f"Starting fraud detection with sensitivity: {sensitivity_level}"
            )

            # Set defaults
            if detection_models is None:
                detection_models = [
                    "ensemble",
                    "rule_based",
                    "behavioral",
                    "statistical",
                ]

            if fraud_types is None:
                fraud_types = [
                    "payment_fraud",
                    "identity_fraud",
                    "account_takeover",
                    "synthetic_fraud",
                ]

            # Validate input
            if not transaction_data:
                return json.dumps(
                    {
                        "success": False,
                        "error": "No transaction data provided for fraud detection",
                        "sensitivity_level": sensitivity_level,
                    }
                )

            # Initialize results
            fraud_results: Dict[str, Any] = {
                "detection_timestamp": datetime.utcnow().isoformat(),
                "sensitivity_level": sensitivity_level,
                "models_used": detection_models,
                "fraud_types_checked": fraud_types,
                "fraud_scores": {},
                "fraud_indicators": {},
                "model_results": {},
                "final_decision": {},
                "recommendations": [],
            }

            # Preprocess data
            processed_data = FraudDataPreprocessor.preprocess_fraud_data(
                transaction_data, user_profile, historical_data
            )
            fraud_results["data_summary"] = (
                FraudDataPreprocessor.generate_fraud_data_summary(processed_data)
            )

            # Apply detection models
            if "rule_based" in detection_models:
                rule_results = FraudDetectionRules.apply_rule_based_detection(
                    processed_data, fraud_types, sensitivity_level
                )
                fraud_results["model_results"]["rule_based"] = rule_results

            if "behavioral" in detection_models:
                behavioral_results = (
                    FraudBehavioralAnalysis.apply_behavioral_fraud_detection(
                        processed_data, user_profile, historical_data, sensitivity_level
                    )
                )
                fraud_results["model_results"]["behavioral"] = behavioral_results

            if "statistical" in detection_models:
                statistical_results = (
                    FraudStatisticalAnalysis.apply_statistical_fraud_detection(
                        processed_data, historical_data, sensitivity_level
                    )
                )
                fraud_results["model_results"]["statistical"] = statistical_results

            if "ensemble" in detection_models:
                ensemble_results = FraudEnsembleMethods.apply_ensemble_fraud_detection(
                    processed_data, fraud_results["model_results"], sensitivity_level
                )
                fraud_results["model_results"]["ensemble"] = ensemble_results

            # Calculate fraud scores
            fraud_scores = FraudScoringDecision.calculate_fraud_scores(
                fraud_results["model_results"], fraud_types, sensitivity_level
            )
            fraud_results["fraud_scores"] = fraud_scores

            # Identify fraud indicators
            fraud_indicators = FraudScoringDecision.identify_fraud_indicators(
                fraud_results["model_results"], processed_data
            )
            fraud_results["fraud_indicators"] = fraud_indicators

            # Make final decision
            final_decision = FraudScoringDecision.make_final_fraud_decision(
                fraud_scores, fraud_indicators, sensitivity_level
            )
            fraud_results["final_decision"] = final_decision

            # Generate recommendations
            recommendations = FraudRecommendations.generate_fraud_recommendations(
                final_decision, fraud_indicators, fraud_scores
            )
            fraud_results["recommendations"] = recommendations

            logger.info(
                f"Fraud detection completed. Decision: {final_decision.get('decision', 'unknown')}"
            )
            return json.dumps(fraud_results, indent=2)

        except Exception as e:
            logger.error(f"Error in fraud detection: {str(e)}")
            return json.dumps(
                {
                    "success": False,
                    "error": f"Fraud detection failed: {str(e)}",
                    "sensitivity_level": sensitivity_level,
                }
            )

    async def _arun(self, **kwargs: Any) -> str:
        """Async version of the run method."""
        return self._run(**kwargs)
