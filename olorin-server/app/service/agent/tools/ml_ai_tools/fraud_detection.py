"""
Fraud Detection ML Tool

Advanced machine learning tool specifically designed for fraud detection
using ensemble methods, feature engineering, and specialized fraud detection
algorithms to identify fraudulent activities with high accuracy.
"""

from typing import Any, Dict, Optional, List, Tuple
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
import json
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import math
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FraudDetectionInput(BaseModel):
    """Input schema for Fraud Detection ML Tool."""
    
    transaction_data: Dict[str, Any] = Field(..., description="Transaction or activity data to analyze for fraud")
    user_profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="User profile data for behavioral analysis"
    )
    detection_models: List[str] = Field(
        default=["ensemble", "rule_based", "behavioral", "statistical"],
        description="Fraud detection models to use"
    )
    fraud_types: List[str] = Field(
        default=["payment_fraud", "identity_fraud", "account_takeover", "synthetic_fraud"],
        description="Types of fraud to detect"
    )
    sensitivity_level: str = Field(
        default="balanced",
        description="Detection sensitivity: 'conservative', 'balanced', 'aggressive'"
    )
    historical_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Historical fraud patterns and user behavior data"
    )


class FraudDetectionTool(BaseTool):
    """
    Advanced fraud detection using machine learning ensemble methods.
    
    Detects various types of fraud:
    - Payment and transaction fraud
    - Identity fraud and impersonation
    - Account takeover attempts
    - Synthetic identity fraud
    - Application fraud
    - Behavioral fraud patterns
    
    Uses multiple detection methods:
    - Ensemble ML models combining multiple algorithms
    - Rule-based expert systems
    - Behavioral analysis and deviation detection
    - Statistical anomaly detection
    - Graph-based relationship analysis
    - Real-time risk scoring
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
        detection_models: List[str] = None,
        fraud_types: List[str] = None,
        sensitivity_level: str = "balanced",
        historical_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> str:
        """Execute fraud detection analysis."""
        try:
            logger.info(f"Starting fraud detection with sensitivity: {sensitivity_level}")
            
            if detection_models is None:
                detection_models = ["ensemble", "rule_based", "behavioral", "statistical"]
            
            if fraud_types is None:
                fraud_types = ["payment_fraud", "identity_fraud", "account_takeover", "synthetic_fraud"]
            
            # Validate input data
            if not transaction_data:
                return json.dumps({
                    "success": False,
                    "error": "No transaction data provided for fraud detection",
                    "sensitivity_level": sensitivity_level
                })
            
            # Initialize fraud detection results
            fraud_results = {
                "detection_timestamp": datetime.utcnow().isoformat(),
                "sensitivity_level": sensitivity_level,
                "models_used": detection_models,
                "fraud_types_checked": fraud_types,
                "fraud_scores": {},
                "fraud_indicators": {},
                "model_results": {},
                "final_decision": {},
                "recommendations": []
            }
            
            # Preprocess data for fraud detection
            processed_data = self._preprocess_fraud_data(
                transaction_data, user_profile, historical_data
            )
            fraud_results["data_summary"] = self._generate_fraud_data_summary(processed_data)
            
            # Apply different fraud detection models
            if "rule_based" in detection_models:
                rule_results = self._apply_rule_based_detection(
                    processed_data, fraud_types, sensitivity_level
                )
                fraud_results["model_results"]["rule_based"] = rule_results
            
            if "behavioral" in detection_models:
                behavioral_results = self._apply_behavioral_fraud_detection(
                    processed_data, user_profile, historical_data, sensitivity_level
                )
                fraud_results["model_results"]["behavioral"] = behavioral_results
            
            if "statistical" in detection_models:
                statistical_results = self._apply_statistical_fraud_detection(
                    processed_data, historical_data, sensitivity_level
                )
                fraud_results["model_results"]["statistical"] = statistical_results
            
            if "ensemble" in detection_models:
                ensemble_results = self._apply_ensemble_fraud_detection(
                    processed_data, fraud_results["model_results"], sensitivity_level
                )
                fraud_results["model_results"]["ensemble"] = ensemble_results
            
            # Calculate fraud scores for each type
            fraud_scores = self._calculate_fraud_scores(
                fraud_results["model_results"], fraud_types, sensitivity_level
            )
            fraud_results["fraud_scores"] = fraud_scores
            
            # Identify specific fraud indicators
            fraud_indicators = self._identify_fraud_indicators(
                fraud_results["model_results"], processed_data
            )
            fraud_results["fraud_indicators"] = fraud_indicators
            
            # Make final fraud decision
            final_decision = self._make_final_fraud_decision(
                fraud_scores, fraud_indicators, sensitivity_level
            )
            fraud_results["final_decision"] = final_decision
            
            # Generate fraud-specific recommendations
            recommendations = self._generate_fraud_recommendations(
                final_decision, fraud_indicators, fraud_scores
            )
            fraud_results["recommendations"] = recommendations
            
            logger.info(f"Fraud detection completed. Decision: {final_decision.get('decision', 'unknown')}")
            return json.dumps(fraud_results, indent=2)
            
        except Exception as e:
            logger.error(f"Error in fraud detection: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"Fraud detection failed: {str(e)}",
                "sensitivity_level": sensitivity_level
            })
    
    def _preprocess_fraud_data(self, transaction_data: Dict[str, Any], user_profile: Optional[Dict[str, Any]], historical_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Preprocess data for fraud detection analysis."""
        processed = {
            "transaction_features": {},
            "user_features": {},
            "temporal_features": {},
            "risk_features": {},
            "network_features": {},
            "behavioral_features": {},
            "historical_features": {}
        }
        
        # Process transaction data
        for key, value in transaction_data.items():
            key_lower = key.lower()
            
            # Categorize features by type
            if any(money_key in key_lower for money_key in ["amount", "value", "price", "cost", "fee"]):
                processed["transaction_features"][key] = float(value) if isinstance(value, (int, float)) else 0.0
            
            elif any(time_key in key_lower for time_key in ["time", "date", "timestamp"]):
                processed["temporal_features"][key] = value
            
            elif any(network_key in key_lower for network_key in ["ip", "location", "device", "browser", "agent"]):
                processed["network_features"][key] = str(value)
            
            elif any(risk_key in key_lower for risk_key in ["failed", "attempt", "error", "velocity"]):
                processed["risk_features"][key] = value
            
            else:
                # General transaction features
                if isinstance(value, (int, float)):
                    processed["transaction_features"][key] = float(value)
                else:
                    processed["transaction_features"][key] = str(value)
        
        # Process user profile if available
        if user_profile:
            for key, value in user_profile.items():
                key_lower = key.lower()
                
                if any(behavior_key in key_lower for behavior_key in ["habit", "pattern", "frequency", "preference"]):
                    processed["behavioral_features"][key] = value
                else:
                    processed["user_features"][key] = value
        
        # Process historical data if available
        if historical_data:
            processed["historical_features"] = historical_data
        
        return processed
    
    def _generate_fraud_data_summary(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary of data available for fraud detection."""
        summary = {
            "feature_categories": {},
            "data_completeness": {},
            "risk_indicators": 0
        }
        
        for category, features in processed_data.items():
            if isinstance(features, dict):
                summary["feature_categories"][category] = len(features)
                
                # Calculate data completeness
                non_empty = sum(1 for v in features.values() if v is not None and str(v).strip() != "")
                completeness = non_empty / len(features) if features else 0
                summary["data_completeness"][category] = completeness
                
                # Count potential risk indicators
                if category == "risk_features":
                    summary["risk_indicators"] = len(features)
        
        return summary
    
    def _apply_rule_based_detection(self, processed_data: Dict[str, Any], fraud_types: List[str], sensitivity_level: str) -> Dict[str, Any]:
        """Apply rule-based fraud detection."""
        rule_results = {
            "triggered_rules": [],
            "fraud_indicators": {},
            "rule_scores": {},
            "overall_score": 0.0
        }
        
        transaction_features = processed_data.get("transaction_features", {})
        risk_features = processed_data.get("risk_features", {})
        network_features = processed_data.get("network_features", {})
        
        # Set thresholds based on sensitivity level
        thresholds = self._get_sensitivity_thresholds(sensitivity_level)
        
        # Payment fraud rules
        if "payment_fraud" in fraud_types:
            payment_rules = self._apply_payment_fraud_rules(
                transaction_features, thresholds
            )
            rule_results["fraud_indicators"]["payment_fraud"] = payment_rules
            rule_results["triggered_rules"].extend(payment_rules)
        
        # Identity fraud rules
        if "identity_fraud" in fraud_types:
            identity_rules = self._apply_identity_fraud_rules(
                network_features, transaction_features, thresholds
            )
            rule_results["fraud_indicators"]["identity_fraud"] = identity_rules
            rule_results["triggered_rules"].extend(identity_rules)
        
        # Account takeover rules
        if "account_takeover" in fraud_types:
            takeover_rules = self._apply_account_takeover_rules(
                risk_features, network_features, thresholds
            )
            rule_results["fraud_indicators"]["account_takeover"] = takeover_rules
            rule_results["triggered_rules"].extend(takeover_rules)
        
        # Synthetic fraud rules
        if "synthetic_fraud" in fraud_types:
            synthetic_rules = self._apply_synthetic_fraud_rules(
                transaction_features, network_features, thresholds
            )
            rule_results["fraud_indicators"]["synthetic_fraud"] = synthetic_rules
            rule_results["triggered_rules"].extend(synthetic_rules)
        
        # Calculate rule scores
        for fraud_type, indicators in rule_results["fraud_indicators"].items():
            if indicators:
                scores = [indicator.get("confidence", 0) for indicator in indicators]
                rule_results["rule_scores"][fraud_type] = max(scores) if scores else 0
        
        # Calculate overall rule score
        if rule_results["rule_scores"]:
            rule_results["overall_score"] = max(rule_results["rule_scores"].values())
        
        return rule_results
    
    def _apply_behavioral_fraud_detection(self, processed_data: Dict[str, Any], user_profile: Optional[Dict[str, Any]], historical_data: Optional[Dict[str, Any]], sensitivity_level: str) -> Dict[str, Any]:
        """Apply behavioral fraud detection."""
        behavioral_results = {
            "behavioral_anomalies": [],
            "deviation_scores": {},
            "behavioral_risk_factors": [],
            "overall_score": 0.0
        }
        
        transaction_features = processed_data.get("transaction_features", {})
        behavioral_features = processed_data.get("behavioral_features", {})
        temporal_features = processed_data.get("temporal_features", {})
        
        # Analyze transaction behavior patterns
        transaction_behavior = self._analyze_transaction_behavior(
            transaction_features, historical_data
        )
        behavioral_results["behavioral_anomalies"].extend(transaction_behavior)
        
        # Analyze temporal behavior patterns
        temporal_behavior = self._analyze_temporal_behavior(
            temporal_features, user_profile, historical_data
        )
        behavioral_results["behavioral_anomalies"].extend(temporal_behavior)
        
        # Analyze user behavior deviations
        if user_profile:
            behavior_deviations = self._analyze_behavior_deviations(
                processed_data, user_profile
            )
            behavioral_results["behavioral_anomalies"].extend(behavior_deviations)
        
        # Calculate deviation scores
        if behavioral_results["behavioral_anomalies"]:
            for anomaly in behavioral_results["behavioral_anomalies"]:
                behavior_type = anomaly.get("type", "unknown")
                score = anomaly.get("severity_score", 0)
                
                if behavior_type not in behavioral_results["deviation_scores"]:
                    behavioral_results["deviation_scores"][behavior_type] = []
                behavioral_results["deviation_scores"][behavior_type].append(score)
        
        # Identify behavioral risk factors
        risk_factors = self._identify_behavioral_risk_factors(
            behavioral_results["behavioral_anomalies"], sensitivity_level
        )
        behavioral_results["behavioral_risk_factors"] = risk_factors
        
        # Calculate overall behavioral score
        all_scores = [anomaly.get("severity_score", 0) for anomaly in behavioral_results["behavioral_anomalies"]]
        if all_scores:
            behavioral_results["overall_score"] = max(all_scores)
        
        return behavioral_results
    
    def _apply_statistical_fraud_detection(self, processed_data: Dict[str, Any], historical_data: Optional[Dict[str, Any]], sensitivity_level: str) -> Dict[str, Any]:
        """Apply statistical fraud detection methods."""
        statistical_results = {
            "statistical_anomalies": [],
            "z_scores": {},
            "outlier_analysis": {},
            "overall_score": 0.0
        }
        
        transaction_features = processed_data.get("transaction_features", {})
        
        # Statistical analysis of transaction amounts
        amount_analysis = self._perform_statistical_amount_analysis(
            transaction_features, historical_data, sensitivity_level
        )
        statistical_results["statistical_anomalies"].extend(amount_analysis)
        
        # Frequency analysis
        frequency_analysis = self._perform_frequency_analysis(
            processed_data, historical_data, sensitivity_level
        )
        statistical_results["statistical_anomalies"].extend(frequency_analysis)
        
        # Velocity analysis
        velocity_analysis = self._perform_velocity_analysis(
            processed_data, sensitivity_level
        )
        statistical_results["statistical_anomalies"].extend(velocity_analysis)
        
        # Calculate Z-scores for numerical features
        z_scores = self._calculate_statistical_z_scores(
            transaction_features, historical_data
        )
        statistical_results["z_scores"] = z_scores
        
        # Outlier analysis
        outlier_analysis = self._perform_outlier_analysis(
            transaction_features, z_scores, sensitivity_level
        )
        statistical_results["outlier_analysis"] = outlier_analysis
        
        # Calculate overall statistical score
        all_scores = [anomaly.get("anomaly_score", 0) for anomaly in statistical_results["statistical_anomalies"]]
        if all_scores:
            statistical_results["overall_score"] = max(all_scores)
        
        return statistical_results
    
    def _apply_ensemble_fraud_detection(self, processed_data: Dict[str, Any], model_results: Dict[str, Any], sensitivity_level: str) -> Dict[str, Any]:
        """Apply ensemble fraud detection combining multiple models."""
        ensemble_results = {
            "ensemble_score": 0.0,
            "model_weights": {},
            "weighted_scores": {},
            "consensus_indicators": [],
            "confidence_level": "low"
        }
        
        # Define model weights based on performance and reliability
        base_weights = {
            "rule_based": 0.3,
            "behavioral": 0.35,
            "statistical": 0.25,
            "ensemble": 0.1  # Prevent recursive weighting
        }
        
        # Adjust weights based on data availability and quality
        data_summary = processed_data
        adjusted_weights = self._adjust_model_weights(base_weights, data_summary)
        ensemble_results["model_weights"] = adjusted_weights
        
        # Calculate weighted scores
        total_weight = 0
        weighted_sum = 0
        
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
        
        # Find consensus indicators (indicators found by multiple models)
        consensus_indicators = self._find_consensus_indicators(model_results)
        ensemble_results["consensus_indicators"] = consensus_indicators
        
        # Determine confidence level
        confidence_level = self._calculate_ensemble_confidence(
            model_results, consensus_indicators, ensemble_results["ensemble_score"]
        )
        ensemble_results["confidence_level"] = confidence_level
        
        return ensemble_results
    
    def _calculate_fraud_scores(self, model_results: Dict[str, Any], fraud_types: List[str], sensitivity_level: str) -> Dict[str, Any]:
        """Calculate fraud scores for each fraud type."""
        fraud_scores = {
            "by_fraud_type": {},
            "by_model": {},
            "overall_fraud_score": 0.0,
            "confidence_interval": {}
        }
        
        # Calculate scores by fraud type
        for fraud_type in fraud_types:
            type_scores = []
            
            # Collect scores from different models for this fraud type
            for model_name, results in model_results.items():
                if isinstance(results, dict):
                    # Rule-based model
                    if model_name == "rule_based" and "fraud_indicators" in results:
                        if fraud_type in results["fraud_indicators"]:
                            indicators = results["fraud_indicators"][fraud_type]
                            if indicators:
                                max_confidence = max(ind.get("confidence", 0) for ind in indicators)
                                type_scores.append(max_confidence)
                    
                    # Other models - look for overall score
                    elif "overall_score" in results:
                        type_scores.append(results["overall_score"])
            
            # Calculate fraud type score
            if type_scores:
                fraud_scores["by_fraud_type"][fraud_type] = {
                    "score": max(type_scores),  # Use maximum score for conservative approach
                    "average_score": sum(type_scores) / len(type_scores),
                    "model_count": len(type_scores)
                }
        
        # Calculate scores by model
        for model_name, results in model_results.items():
            if isinstance(results, dict) and "overall_score" in results:
                fraud_scores["by_model"][model_name] = results["overall_score"]
        
        # Calculate overall fraud score
        if fraud_scores["by_fraud_type"]:
            max_type_score = max(
                fraud_data["score"] 
                for fraud_data in fraud_scores["by_fraud_type"].values()
            )
            fraud_scores["overall_fraud_score"] = max_type_score
        elif fraud_scores["by_model"]:
            fraud_scores["overall_fraud_score"] = max(fraud_scores["by_model"].values())
        
        # Calculate confidence interval
        fraud_scores["confidence_interval"] = self._calculate_score_confidence_interval(
            fraud_scores
        )
        
        return fraud_scores
    
    def _identify_fraud_indicators(self, model_results: Dict[str, Any], processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Identify specific fraud indicators from all models."""
        indicators = {
            "high_risk_indicators": [],
            "medium_risk_indicators": [],
            "low_risk_indicators": [],
            "indicator_categories": {},
            "total_indicators": 0
        }
        
        # Collect indicators from all models
        all_indicators = []
        
        for model_name, results in model_results.items():
            if isinstance(results, dict):
                # Rule-based indicators
                if "triggered_rules" in results:
                    for rule in results["triggered_rules"]:
                        rule["source_model"] = model_name
                        all_indicators.append(rule)
                
                # Behavioral indicators
                if "behavioral_anomalies" in results:
                    for anomaly in results["behavioral_anomalies"]:
                        anomaly["source_model"] = model_name
                        all_indicators.append(anomaly)
                
                # Statistical indicators
                if "statistical_anomalies" in results:
                    for anomaly in results["statistical_anomalies"]:
                        anomaly["source_model"] = model_name
                        all_indicators.append(anomaly)
                
                # Consensus indicators (from ensemble)
                if "consensus_indicators" in results:
                    for consensus in results["consensus_indicators"]:
                        consensus["source_model"] = model_name
                        all_indicators.append(consensus)
        
        # Categorize indicators by risk level
        for indicator in all_indicators:
            confidence = indicator.get("confidence", 0)
            severity_score = indicator.get("severity_score", 0)
            risk_score = max(confidence, severity_score)
            
            if risk_score >= 0.7:
                indicators["high_risk_indicators"].append(indicator)
            elif risk_score >= 0.4:
                indicators["medium_risk_indicators"].append(indicator)
            else:
                indicators["low_risk_indicators"].append(indicator)
        
        # Group indicators by category
        category_counts = Counter()
        for indicator in all_indicators:
            category = indicator.get("type", "unknown")
            category_counts[category] += 1
        
        indicators["indicator_categories"] = dict(category_counts)
        indicators["total_indicators"] = len(all_indicators)
        
        return indicators
    
    def _make_final_fraud_decision(self, fraud_scores: Dict[str, Any], fraud_indicators: Dict[str, Any], sensitivity_level: str) -> Dict[str, Any]:
        """Make final fraud detection decision."""
        decision = {
            "decision": "approve",  # Default
            "confidence": 0.0,
            "risk_level": "low",
            "primary_concerns": [],
            "decision_factors": {},
            "recommended_actions": []
        }
        
        overall_score = fraud_scores.get("overall_fraud_score", 0)
        high_risk_count = len(fraud_indicators.get("high_risk_indicators", []))
        medium_risk_count = len(fraud_indicators.get("medium_risk_indicators", []))
        
        # Set decision thresholds based on sensitivity level
        if sensitivity_level == "aggressive":
            decline_threshold = 0.4
            review_threshold = 0.25
        elif sensitivity_level == "conservative":
            decline_threshold = 0.8
            review_threshold = 0.6
        else:  # balanced
            decline_threshold = 0.6
            review_threshold = 0.4
        
        # Make decision based on score and indicators
        if overall_score >= decline_threshold or high_risk_count >= 3:
            decision["decision"] = "decline"
            decision["risk_level"] = "high"
            decision["confidence"] = min(overall_score + 0.2, 1.0)
            
        elif overall_score >= review_threshold or high_risk_count >= 1 or medium_risk_count >= 3:
            decision["decision"] = "review"
            decision["risk_level"] = "medium"
            decision["confidence"] = overall_score
            
        else:
            decision["decision"] = "approve"
            decision["risk_level"] = "low"
            decision["confidence"] = 1 - overall_score
        
        # Identify primary concerns
        primary_concerns = []
        high_risk_indicators = fraud_indicators.get("high_risk_indicators", [])
        
        for indicator in high_risk_indicators[:5]:  # Top 5 concerns
            concern = {
                "type": indicator.get("type", "unknown"),
                "description": indicator.get("description", ""),
                "confidence": indicator.get("confidence", 0),
                "source": indicator.get("source_model", "unknown")
            }
            primary_concerns.append(concern)
        
        decision["primary_concerns"] = primary_concerns
        
        # Decision factors
        decision["decision_factors"] = {
            "fraud_score": overall_score,
            "high_risk_indicators": high_risk_count,
            "medium_risk_indicators": medium_risk_count,
            "sensitivity_level": sensitivity_level,
            "decision_threshold": decline_threshold
        }
        
        # Recommended actions
        if decision["decision"] == "decline":
            decision["recommended_actions"] = [
                "Block transaction/activity immediately",
                "Flag account for investigation",
                "Require additional verification",
                "Contact fraud team"
            ]
        elif decision["decision"] == "review":
            decision["recommended_actions"] = [
                "Route to manual review",
                "Request additional information",
                "Apply additional monitoring",
                "Consider step-up authentication"
            ]
        else:
            decision["recommended_actions"] = [
                "Allow transaction to proceed",
                "Continue normal monitoring",
                "Update user behavior baseline"
            ]
        
        return decision
    
    def _generate_fraud_recommendations(self, final_decision: Dict[str, Any], fraud_indicators: Dict[str, Any], fraud_scores: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fraud-specific recommendations."""
        recommendations = []
        
        decision_type = final_decision.get("decision", "approve")
        risk_level = final_decision.get("risk_level", "low")
        
        # High-risk recommendations
        if risk_level == "high":
            recommendations.append({
                "priority": "critical",
                "category": "immediate_action",
                "action": "block_and_investigate",
                "description": "Immediate blocking and fraud investigation required",
                "implementation": "Auto-block transaction and escalate to fraud team",
                "timeframe": "immediate"
            })
        
        # Model-specific recommendations
        high_risk_indicators = fraud_indicators.get("high_risk_indicators", [])
        
        # Payment fraud recommendations
        payment_indicators = [ind for ind in high_risk_indicators if "payment" in ind.get("type", "")]
        if payment_indicators:
            recommendations.append({
                "priority": "high",
                "category": "payment_security",
                "action": "enhance_payment_monitoring",
                "description": f"Enhanced payment monitoring - {len(payment_indicators)} payment fraud indicators",
                "implementation": "Implement real-time payment verification and velocity checks"
            })
        
        # Account takeover recommendations
        takeover_indicators = [ind for ind in high_risk_indicators if "takeover" in ind.get("type", "")]
        if takeover_indicators:
            recommendations.append({
                "priority": "high",
                "category": "account_security",
                "action": "secure_account",
                "description": f"Account security measures - {len(takeover_indicators)} takeover indicators",
                "implementation": "Force password reset and enable 2FA"
            })
        
        # Behavioral recommendations
        behavioral_indicators = [ind for ind in high_risk_indicators if "behavioral" in ind.get("type", "")]
        if behavioral_indicators:
            recommendations.append({
                "priority": "medium",
                "category": "behavioral_monitoring",
                "action": "enhance_behavioral_analysis",
                "description": f"Behavioral analysis - {len(behavioral_indicators)} behavioral anomalies",
                "implementation": "Implement continuous behavioral monitoring and profiling"
            })
        
        # General fraud prevention recommendations
        total_indicators = fraud_indicators.get("total_indicators", 0)
        if total_indicators > 10:
            recommendations.append({
                "priority": "medium",
                "category": "fraud_prevention",
                "action": "comprehensive_fraud_review",
                "description": f"Comprehensive fraud review - {total_indicators} total indicators detected",
                "implementation": "Conduct thorough fraud assessment and update detection rules"
            })
        
        # Model improvement recommendations
        confidence_level = final_decision.get("confidence", 0)
        if confidence_level < 0.6:
            recommendations.append({
                "priority": "low",
                "category": "model_improvement",
                "action": "enhance_detection_models",
                "description": f"Low confidence in decision ({confidence_level:.1%})",
                "implementation": "Review and retrain fraud detection models with additional data"
            })
        
        return recommendations
    
    # Helper methods for specific fraud detection techniques
    
    def _get_sensitivity_thresholds(self, sensitivity_level: str) -> Dict[str, float]:
        """Get threshold values based on sensitivity level."""
        thresholds = {
            "aggressive": {
                "amount_threshold": 1000,
                "velocity_threshold": 5,
                "failed_attempts_threshold": 2,
                "confidence_threshold": 0.3
            },
            "balanced": {
                "amount_threshold": 5000,
                "velocity_threshold": 10,
                "failed_attempts_threshold": 3,
                "confidence_threshold": 0.5
            },
            "conservative": {
                "amount_threshold": 10000,
                "velocity_threshold": 20,
                "failed_attempts_threshold": 5,
                "confidence_threshold": 0.7
            }
        }
        return thresholds.get(sensitivity_level, thresholds["balanced"])
    
    def _apply_payment_fraud_rules(self, transaction_features: Dict[str, Any], thresholds: Dict[str, float]) -> List[Dict[str, Any]]:
        """Apply payment fraud detection rules."""
        rules = []
        
        # Large amount rule
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                if value > thresholds["amount_threshold"]:
                    rules.append({
                        "type": "large_amount_payment_fraud",
                        "field": field,
                        "value": value,
                        "threshold": thresholds["amount_threshold"],
                        "confidence": min(value / thresholds["amount_threshold"] / 10, 1.0),
                        "description": f"Large payment amount: {value} exceeds threshold {thresholds['amount_threshold']}"
                    })
        
        # Round amount rule (common in fraud)
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                if value > 0 and value % 100 == 0 and value >= 1000:  # Round hundreds
                    rules.append({
                        "type": "round_amount_payment_fraud",
                        "field": field,
                        "value": value,
                        "confidence": 0.4,
                        "description": f"Suspicious round amount: {value}"
                    })
        
        # Unusual currency or payment method
        currency_field = transaction_features.get("currency") or transaction_features.get("payment_method")
        if currency_field:
            unusual_methods = ["crypto", "bitcoin", "gift_card", "prepaid"]
            if any(method in str(currency_field).lower() for method in unusual_methods):
                rules.append({
                    "type": "unusual_payment_method_fraud",
                    "field": "payment_method",
                    "value": currency_field,
                    "confidence": 0.6,
                    "description": f"Unusual payment method: {currency_field}"
                })
        
        return rules
    
    def _apply_identity_fraud_rules(self, network_features: Dict[str, str], transaction_features: Dict[str, Any], thresholds: Dict[str, float]) -> List[Dict[str, Any]]:
        """Apply identity fraud detection rules."""
        rules = []
        
        # VPN/Proxy detection
        for field, value in network_features.items():
            if "ip" in field.lower() or "location" in field.lower():
                vpn_indicators = ["vpn", "proxy", "tor", "anonymous"]
                if any(indicator in str(value).lower() for indicator in vpn_indicators):
                    rules.append({
                        "type": "vpn_proxy_identity_fraud",
                        "field": field,
                        "value": value,
                        "confidence": 0.7,
                        "description": f"VPN/Proxy detected: {value}"
                    })
        
        # Geographic inconsistencies
        user_location = network_features.get("location") or network_features.get("country")
        ip_location = network_features.get("ip_location") or network_features.get("ip_country")
        
        if user_location and ip_location and user_location != ip_location:
            rules.append({
                "type": "geographic_inconsistency_fraud",
                "user_location": user_location,
                "ip_location": ip_location,
                "confidence": 0.6,
                "description": f"Geographic mismatch: User in {user_location}, IP from {ip_location}"
            })
        
        # Device fingerprint inconsistencies
        device_info = network_features.get("device_id") or network_features.get("user_agent")
        if device_info and "unknown" in str(device_info).lower():
            rules.append({
                "type": "unknown_device_identity_fraud",
                "field": "device",
                "value": device_info,
                "confidence": 0.5,
                "description": f"Unknown or masked device: {device_info}"
            })
        
        return rules
    
    def _apply_account_takeover_rules(self, risk_features: Dict[str, Any], network_features: Dict[str, str], thresholds: Dict[str, float]) -> List[Dict[str, Any]]:
        """Apply account takeover detection rules."""
        rules = []
        
        # Multiple failed login attempts
        failed_attempts = 0
        for field, value in risk_features.items():
            if "failed" in field.lower() and isinstance(value, (int, float)):
                failed_attempts += value
        
        if failed_attempts > thresholds["failed_attempts_threshold"]:
            rules.append({
                "type": "multiple_failed_attempts_takeover",
                "failed_attempts": failed_attempts,
                "threshold": thresholds["failed_attempts_threshold"],
                "confidence": min(failed_attempts / thresholds["failed_attempts_threshold"] / 3, 1.0),
                "description": f"Multiple failed attempts: {failed_attempts}"
            })
        
        # Login from new location
        if "new_location" in str(network_features).lower() or "unusual_location" in str(network_features).lower():
            rules.append({
                "type": "new_location_takeover",
                "confidence": 0.5,
                "description": "Login from new or unusual location"
            })
        
        # Unusual login time
        # This would typically use temporal features, but we'll check if any time-related risk features exist
        for field, value in risk_features.items():
            if "time" in field.lower() or "hour" in field.lower():
                if isinstance(value, (int, float)) and (value < 6 or value > 22):
                    rules.append({
                        "type": "unusual_time_takeover",
                        "field": field,
                        "value": value,
                        "confidence": 0.4,
                        "description": f"Login at unusual time: {value}"
                    })
        
        return rules
    
    def _apply_synthetic_fraud_rules(self, transaction_features: Dict[str, Any], network_features: Dict[str, str], thresholds: Dict[str, float]) -> List[Dict[str, Any]]:
        """Apply synthetic identity fraud detection rules."""
        rules = []
        
        # New account with high-value transaction
        account_age = transaction_features.get("account_age") or transaction_features.get("days_since_signup")
        transaction_amount = 0
        
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                transaction_amount = max(transaction_amount, value)
        
        if account_age is not None and isinstance(account_age, (int, float)):
            if account_age < 30 and transaction_amount > 2000:  # New account, large transaction
                rules.append({
                    "type": "new_account_large_transaction_synthetic",
                    "account_age": account_age,
                    "transaction_amount": transaction_amount,
                    "confidence": 0.7,
                    "description": f"New account ({account_age} days) with large transaction ({transaction_amount})"
                })
        
        # Perfect credit score (synthetic identities often have perfect scores initially)
        credit_score = transaction_features.get("credit_score")
        if credit_score is not None and isinstance(credit_score, (int, float)):
            if credit_score >= 800 and account_age is not None and account_age < 90:
                rules.append({
                    "type": "perfect_credit_new_account_synthetic",
                    "credit_score": credit_score,
                    "account_age": account_age,
                    "confidence": 0.6,
                    "description": f"Perfect credit score ({credit_score}) for new account ({account_age} days)"
                })
        
        # Inconsistent information patterns
        email = transaction_features.get("email") or network_features.get("email")
        phone = transaction_features.get("phone") or network_features.get("phone")
        
        if email and phone:
            # Check for pattern mismatches (simplified)
            if "temp" in str(email).lower() or "disposable" in str(email).lower():
                rules.append({
                    "type": "disposable_email_synthetic",
                    "email": email,
                    "confidence": 0.5,
                    "description": f"Disposable email detected: {email}"
                })
        
        return rules
    
    def _analyze_transaction_behavior(self, transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze transaction behavior patterns for anomalies."""
        anomalies = []
        
        # Analyze transaction amounts
        amounts = []
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)) and value > 0:
                amounts.append(value)
        
        if amounts:
            # Check for unusual amount patterns
            avg_amount = sum(amounts) / len(amounts)
            
            for amount in amounts:
                if amount > avg_amount * 10:  # 10x average
                    anomalies.append({
                        "type": "behavioral_amount_spike",
                        "amount": amount,
                        "average": avg_amount,
                        "severity_score": 0.7,
                        "description": f"Transaction amount ({amount}) much higher than average ({avg_amount:.2f})"
                    })
        
        # Check transaction frequency if historical data available
        if historical_data:
            historical_frequency = historical_data.get("transaction_frequency", 0)
            current_frequency = len(amounts)
            
            if historical_frequency > 0 and current_frequency > historical_frequency * 5:
                anomalies.append({
                    "type": "behavioral_frequency_spike",
                    "current_frequency": current_frequency,
                    "historical_frequency": historical_frequency,
                    "severity_score": 0.6,
                    "description": f"Transaction frequency spike: {current_frequency} vs historical {historical_frequency}"
                })
        
        return anomalies
    
    def _analyze_temporal_behavior(self, temporal_features: Dict[str, Any], user_profile: Optional[Dict[str, Any]], historical_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze temporal behavior patterns."""
        anomalies = []
        
        # Extract time information
        for field, value in temporal_features.items():
            if isinstance(value, str):
                # Try to parse time information
                try:
                    if ":" in value:  # Likely time format
                        time_parts = value.split(":")
                        if len(time_parts) >= 2:
                            hour = int(time_parts[0])
                            
                            # Check for unusual hours
                            if hour < 6 or hour > 22:
                                anomalies.append({
                                    "type": "behavioral_unusual_time",
                                    "hour": hour,
                                    "time_value": value,
                                    "severity_score": 0.4,
                                    "description": f"Activity at unusual hour: {hour}:xx"
                                })
                except:
                    continue
        
        # Check against user profile if available
        if user_profile:
            typical_hours = user_profile.get("typical_activity_hours", [9, 10, 11, 12, 13, 14, 15, 16, 17])
            
            for field, value in temporal_features.items():
                if isinstance(value, str) and ":" in value:
                    try:
                        hour = int(value.split(":")[0])
                        if hour not in typical_hours:
                            anomalies.append({
                                "type": "behavioral_atypical_time",
                                "hour": hour,
                                "typical_hours": typical_hours,
                                "severity_score": 0.5,
                                "description": f"Activity outside typical hours: {hour}:xx"
                            })
                    except:
                        continue
        
        return anomalies
    
    def _analyze_behavior_deviations(self, processed_data: Dict[str, Any], user_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze deviations from established user behavior."""
        deviations = []
        
        transaction_features = processed_data.get("transaction_features", {})
        
        # Compare transaction amounts with user profile
        profile_avg_amount = user_profile.get("average_transaction_amount", 0)
        current_amounts = []
        
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                current_amounts.append(value)
        
        if current_amounts and profile_avg_amount > 0:
            current_avg = sum(current_amounts) / len(current_amounts)
            deviation_ratio = current_avg / profile_avg_amount
            
            if deviation_ratio > 3 or deviation_ratio < 0.33:
                deviations.append({
                    "type": "behavioral_amount_deviation",
                    "current_average": current_avg,
                    "profile_average": profile_avg_amount,
                    "deviation_ratio": deviation_ratio,
                    "severity_score": min(abs(math.log(deviation_ratio)) / 2, 1.0),
                    "description": f"Amount pattern deviation: {deviation_ratio:.2f}x normal"
                })
        
        # Compare transaction frequency
        profile_frequency = user_profile.get("typical_daily_transactions", 1)
        current_frequency = len(current_amounts)
        
        if profile_frequency > 0 and current_frequency > profile_frequency * 10:
            deviations.append({
                "type": "behavioral_frequency_deviation",
                "current_frequency": current_frequency,
                "profile_frequency": profile_frequency,
                "severity_score": 0.6,
                "description": f"Transaction frequency deviation: {current_frequency} vs typical {profile_frequency}"
            })
        
        return deviations
    
    def _identify_behavioral_risk_factors(self, behavioral_anomalies: List[Dict[str, Any]], sensitivity_level: str) -> List[Dict[str, Any]]:
        """Identify behavioral risk factors from anomalies."""
        risk_factors = []
        
        # Group anomalies by type
        anomaly_types = Counter(anomaly.get("type", "unknown") for anomaly in behavioral_anomalies)
        
        # High-frequency anomaly types are risk factors
        for anomaly_type, count in anomaly_types.items():
            if count >= 2:
                risk_factors.append({
                    "risk_factor": f"multiple_{anomaly_type}",
                    "count": count,
                    "risk_level": "high" if count >= 3 else "medium",
                    "description": f"Multiple {anomaly_type} anomalies detected ({count})"
                })
        
        # High-severity anomalies are risk factors
        high_severity_anomalies = [
            anomaly for anomaly in behavioral_anomalies 
            if anomaly.get("severity_score", 0) > 0.7
        ]
        
        if high_severity_anomalies:
            risk_factors.append({
                "risk_factor": "high_severity_behavioral_anomalies",
                "count": len(high_severity_anomalies),
                "risk_level": "high",
                "description": f"{len(high_severity_anomalies)} high-severity behavioral anomalies"
            })
        
        return risk_factors
    
    def _perform_statistical_amount_analysis(self, transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]], sensitivity_level: str) -> List[Dict[str, Any]]:
        """Perform statistical analysis of transaction amounts."""
        anomalies = []
        
        # Collect all amounts
        amounts = []
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)) and value > 0:
                amounts.append(value)
        
        if len(amounts) < 2:
            return anomalies
        
        # Calculate statistics
        mean_amount = sum(amounts) / len(amounts)
        variance = sum((x - mean_amount) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance) if variance > 0 else 0
        
        # Find statistical outliers
        if std_dev > 0:
            threshold = 2.0 if sensitivity_level == "aggressive" else 3.0
            
            for amount in amounts:
                z_score = abs(amount - mean_amount) / std_dev
                if z_score > threshold:
                    anomalies.append({
                        "type": "statistical_amount_outlier",
                        "amount": amount,
                        "z_score": z_score,
                        "anomaly_score": min(z_score / 5.0, 1.0),
                        "description": f"Statistical outlier: amount {amount} (Z-score: {z_score:.2f})"
                    })
        
        # Compare with historical data if available
        if historical_data:
            historical_mean = historical_data.get("mean_transaction_amount", 0)
            if historical_mean > 0 and mean_amount > historical_mean * 5:
                anomalies.append({
                    "type": "statistical_historical_deviation",
                    "current_mean": mean_amount,
                    "historical_mean": historical_mean,
                    "deviation_ratio": mean_amount / historical_mean,
                    "anomaly_score": 0.7,
                    "description": f"Mean amount deviation from historical: {mean_amount:.2f} vs {historical_mean:.2f}"
                })
        
        return anomalies
    
    def _perform_frequency_analysis(self, processed_data: Dict[str, Any], historical_data: Optional[Dict[str, Any]], sensitivity_level: str) -> List[Dict[str, Any]]:
        """Perform frequency analysis of activities."""
        anomalies = []
        
        # Count different types of activities
        activity_counts = Counter()
        
        # Count transaction types
        transaction_features = processed_data.get("transaction_features", {})
        for field, value in transaction_features.items():
            if "type" in field.lower():
                activity_counts[f"transaction_{value}"] += 1
        
        # Count network activities
        network_features = processed_data.get("network_features", {})
        for field, value in network_features.items():
            if "action" in field.lower() or "event" in field.lower():
                activity_counts[f"network_{value}"] += 1
        
        # Analyze frequencies
        total_activities = sum(activity_counts.values())
        if total_activities > 0:
            for activity, count in activity_counts.items():
                frequency = count / total_activities
                
                # High frequency of single activity type might indicate automation
                if frequency > 0.8 and count > 5:
                    anomalies.append({
                        "type": "statistical_high_frequency",
                        "activity": activity,
                        "count": count,
                        "frequency": frequency,
                        "anomaly_score": frequency,
                        "description": f"High frequency of {activity}: {frequency:.1%} ({count} times)"
                    })
        
        return anomalies
    
    def _perform_velocity_analysis(self, processed_data: Dict[str, Any], sensitivity_level: str) -> List[Dict[str, Any]]:
        """Perform velocity analysis."""
        anomalies = []
        
        # Simple velocity analysis based on available data
        transaction_features = processed_data.get("transaction_features", {})
        risk_features = processed_data.get("risk_features", {})
        
        # Check for velocity indicators in features
        velocity_indicators = {}
        for field, value in {**transaction_features, **risk_features}.items():
            if "velocity" in field.lower() and isinstance(value, (int, float)):
                velocity_indicators[field] = value
        
        # Analyze velocity indicators
        threshold = 10 if sensitivity_level == "aggressive" else 20
        
        for field, value in velocity_indicators.items():
            if value > threshold:
                anomalies.append({
                    "type": "statistical_high_velocity",
                    "field": field,
                    "velocity": value,
                    "threshold": threshold,
                    "anomaly_score": min(value / (threshold * 2), 1.0),
                    "description": f"High velocity detected: {field} = {value}"
                })
        
        return anomalies
    
    def _calculate_statistical_z_scores(self, transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate Z-scores for numerical features."""
        z_scores = {}
        
        if not historical_data:
            return z_scores
        
        # Calculate Z-scores against historical data
        for field, value in transaction_features.items():
            if isinstance(value, (int, float)):
                historical_mean = historical_data.get(f"{field}_mean", 0)
                historical_std = historical_data.get(f"{field}_std", 0)
                
                if historical_std > 0:
                    z_score = abs(value - historical_mean) / historical_std
                    z_scores[field] = z_score
        
        return z_scores
    
    def _perform_outlier_analysis(self, transaction_features: Dict[str, Any], z_scores: Dict[str, float], sensitivity_level: str) -> Dict[str, Any]:
        """Perform comprehensive outlier analysis."""
        outlier_analysis = {
            "outliers_detected": [],
            "outlier_fields": [],
            "outlier_score": 0.0
        }
        
        threshold = 2.0 if sensitivity_level == "aggressive" else 3.0
        
        for field, z_score in z_scores.items():
            if z_score > threshold:
                outlier_analysis["outliers_detected"].append({
                    "field": field,
                    "value": transaction_features.get(field, 0),
                    "z_score": z_score
                })
                outlier_analysis["outlier_fields"].append(field)
        
        if outlier_analysis["outliers_detected"]:
            max_z_score = max(outlier["z_score"] for outlier in outlier_analysis["outliers_detected"])
            outlier_analysis["outlier_score"] = min(max_z_score / 5.0, 1.0)
        
        return outlier_analysis
    
    def _adjust_model_weights(self, base_weights: Dict[str, float], data_summary: Dict[str, Any]) -> Dict[str, float]:
        """Adjust model weights based on data quality and availability."""
        adjusted_weights = base_weights.copy()
        
        # This is a simplified adjustment mechanism
        # In a real implementation, this would be more sophisticated
        
        # Increase behavioral weight if user profile is available
        behavioral_features = data_summary.get("behavioral_features", {})
        if behavioral_features:
            adjusted_weights["behavioral"] = min(adjusted_weights["behavioral"] * 1.2, 0.5)
        
        # Increase statistical weight if historical data is rich
        historical_features = data_summary.get("historical_features", {})
        if historical_features:
            adjusted_weights["statistical"] = min(adjusted_weights["statistical"] * 1.3, 0.4)
        
        # Normalize weights
        total_weight = sum(adjusted_weights.values())
        if total_weight > 0:
            for model in adjusted_weights:
                adjusted_weights[model] = adjusted_weights[model] / total_weight
        
        return adjusted_weights
    
    def _find_consensus_indicators(self, model_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find indicators that are detected by multiple models."""
        consensus_indicators = []
        
        # This is a simplified consensus mechanism
        # In a real implementation, this would involve more sophisticated indicator matching
        
        indicator_counts = Counter()
        all_indicators = {}
        
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
    
    def _calculate_ensemble_confidence(self, model_results: Dict[str, Any], consensus_indicators: List[Dict[str, Any]], ensemble_score: float) -> str:
        """Calculate confidence level for ensemble decision."""
        # Count models with significant results
        active_models = 0
        for model_name, results in model_results.items():
            if isinstance(results, dict) and results.get("overall_score", 0) > 0.1:
                active_models += 1
        
        # Calculate confidence factors
        consensus_factor = len(consensus_indicators) / 5.0  # More consensus = higher confidence
        score_factor = ensemble_score
        model_factor = active_models / len(model_results)
        
        overall_confidence = (consensus_factor + score_factor + model_factor) / 3.0
        
        if overall_confidence >= 0.7:
            return "high"
        elif overall_confidence >= 0.4:
            return "medium"
        else:
            return "low"
    
    def _calculate_score_confidence_interval(self, fraud_scores: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate confidence interval for fraud scores."""
        confidence_interval = {
            "lower_bound": 0.0,
            "upper_bound": 0.0,
            "confidence_level": 0.95
        }
        
        # Simplified confidence interval calculation
        overall_score = fraud_scores.get("overall_fraud_score", 0)
        
        # Use model agreement as a measure of uncertainty
        model_scores = list(fraud_scores.get("by_model", {}).values())
        if len(model_scores) > 1:
            score_variance = sum((score - overall_score) ** 2 for score in model_scores) / len(model_scores)
            score_std = math.sqrt(score_variance)
            
            # 95% confidence interval (approximately 2 standard deviations)
            margin_of_error = 2 * score_std
            confidence_interval["lower_bound"] = max(0, overall_score - margin_of_error)
            confidence_interval["upper_bound"] = min(1, overall_score + margin_of_error)
        else:
            # If only one model, use a default margin
            margin = 0.1
            confidence_interval["lower_bound"] = max(0, overall_score - margin)
            confidence_interval["upper_bound"] = min(1, overall_score + margin)
        
        return confidence_interval

    async def _arun(self, **kwargs: Any) -> str:
        """Async version of the run method."""
        return self._run(**kwargs)