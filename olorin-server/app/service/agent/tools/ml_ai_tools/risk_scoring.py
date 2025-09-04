"""
Risk Scoring ML Tool

Advanced machine learning tool for comprehensive risk scoring and assessment
combining multiple risk factors, predictive modeling, and dynamic risk
calculation for real-time risk management and decision support.
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


class RiskScoringInput(BaseModel):
    """Input schema for Risk Scoring ML Tool."""
    
    risk_data: Dict[str, Any] = Field(..., description="Data for risk assessment including transaction, user, and contextual information")
    risk_factors: List[str] = Field(
        default=["fraud", "credit", "operational", "behavioral", "contextual"],
        description="Types of risk factors to assess"
    )
    scoring_models: List[str] = Field(
        default=["composite", "weighted", "ml_based", "rule_based"],
        description="Risk scoring models to apply"
    )
    risk_tolerance: str = Field(
        default="medium",
        description="Risk tolerance level: 'low', 'medium', 'high'"
    )
    time_horizon: str = Field(
        default="short_term",
        description="Risk assessment horizon: 'immediate', 'short_term', 'medium_term', 'long_term'"
    )
    historical_risk_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Historical risk data for trend analysis and model training"
    )


class RiskScoringTool(BaseTool):
    """
    Advanced risk scoring using machine learning and statistical methods.
    
    Assesses multiple types of risk:
    - Fraud risk assessment
    - Credit and financial risk
    - Operational risk factors
    - Behavioral risk patterns
    - Contextual risk elements
    - Market and environmental risks
    
    Uses multiple scoring approaches:
    - Composite risk scoring combining multiple factors
    - Weighted scoring based on factor importance
    - Machine learning-based predictive scoring
    - Rule-based expert system scoring
    - Dynamic risk adjustment based on context
    - Real-time risk monitoring and updates
    """
    
    name: str = "risk_scoring_ml"
    description: str = """
    Performs comprehensive risk scoring and assessment using advanced machine
    learning algorithms to evaluate multiple risk dimensions including fraud,
    credit, operational, behavioral, and contextual risks.
    
    Provides dynamic risk scores, confidence intervals, risk factor analysis,
    and actionable recommendations for risk management and mitigation strategies
    tailored to different risk tolerance levels and time horizons.
    """
    args_schema: type = RiskScoringInput
    
    def _run(
        self,
        risk_data: Dict[str, Any],
        risk_factors: List[str] = None,
        scoring_models: List[str] = None,
        risk_tolerance: str = "medium",
        time_horizon: str = "short_term",
        historical_risk_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> str:
        """Execute comprehensive risk scoring analysis."""
        try:
            logger.info(f"Starting risk scoring with tolerance: {risk_tolerance}, horizon: {time_horizon}")
            
            if risk_factors is None:
                risk_factors = ["fraud", "credit", "operational", "behavioral", "contextual"]
            
            if scoring_models is None:
                scoring_models = ["composite", "weighted", "ml_based", "rule_based"]
            
            # Validate input data
            if not risk_data:
                return json.dumps({
                    "success": False,
                    "error": "No risk data provided for scoring",
                    "risk_tolerance": risk_tolerance
                })
            
            # Initialize risk scoring results
            risk_results = {
                "scoring_timestamp": datetime.utcnow().isoformat(),
                "risk_tolerance": risk_tolerance,
                "time_horizon": time_horizon,
                "risk_factors_assessed": risk_factors,
                "scoring_models_used": scoring_models,
                "risk_factor_scores": {},
                "model_scores": {},
                "overall_risk_assessment": {},
                "risk_breakdown": {},
                "recommendations": [],
                "confidence_metrics": {}
            }
            
            # Preprocess data for risk scoring
            processed_data = self._preprocess_risk_data(risk_data, historical_risk_data)
            risk_results["data_summary"] = self._generate_risk_data_summary(processed_data)
            
            # Assess individual risk factors
            for risk_factor in risk_factors:
                factor_score = self._assess_risk_factor(
                    risk_factor, processed_data, risk_tolerance, time_horizon
                )
                risk_results["risk_factor_scores"][risk_factor] = factor_score
            
            # Apply different scoring models
            if "rule_based" in scoring_models:
                rule_score = self._apply_rule_based_risk_scoring(
                    processed_data, risk_results["risk_factor_scores"], risk_tolerance
                )
                risk_results["model_scores"]["rule_based"] = rule_score
            
            if "weighted" in scoring_models:
                weighted_score = self._apply_weighted_risk_scoring(
                    risk_results["risk_factor_scores"], risk_tolerance, time_horizon
                )
                risk_results["model_scores"]["weighted"] = weighted_score
            
            if "ml_based" in scoring_models:
                ml_score = self._apply_ml_risk_scoring(
                    processed_data, historical_risk_data, risk_tolerance
                )
                risk_results["model_scores"]["ml_based"] = ml_score
            
            if "composite" in scoring_models:
                composite_score = self._apply_composite_risk_scoring(
                    risk_results["model_scores"], risk_results["risk_factor_scores"]
                )
                risk_results["model_scores"]["composite"] = composite_score
            
            # Calculate overall risk assessment
            overall_assessment = self._calculate_overall_risk_assessment(
                risk_results["model_scores"], risk_results["risk_factor_scores"], risk_tolerance
            )
            risk_results["overall_risk_assessment"] = overall_assessment
            
            # Generate risk breakdown analysis
            risk_breakdown = self._generate_risk_breakdown(
                risk_results["risk_factor_scores"], overall_assessment
            )
            risk_results["risk_breakdown"] = risk_breakdown
            
            # Calculate confidence metrics
            confidence_metrics = self._calculate_risk_confidence_metrics(
                risk_results["model_scores"], processed_data
            )
            risk_results["confidence_metrics"] = confidence_metrics
            
            # Generate risk management recommendations
            recommendations = self._generate_risk_recommendations(
                overall_assessment, risk_breakdown, risk_tolerance, time_horizon
            )
            risk_results["recommendations"] = recommendations
            
            logger.info(f"Risk scoring completed. Overall risk level: {overall_assessment.get('risk_level', 'unknown')}")
            return json.dumps(risk_results, indent=2)
            
        except Exception as e:
            logger.error(f"Error in risk scoring: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"Risk scoring failed: {str(e)}",
                "risk_tolerance": risk_tolerance
            })
    
    def _preprocess_risk_data(self, risk_data: Dict[str, Any], historical_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Preprocess data for risk scoring analysis."""
        processed = {
            "financial_data": {},
            "behavioral_data": {},
            "contextual_data": {},
            "historical_patterns": {},
            "risk_indicators": {},
            "external_factors": {},
            "temporal_data": {}
        }
        
        # Categorize risk data by type
        for key, value in risk_data.items():
            key_lower = key.lower()
            
            # Financial and transaction data
            if any(fin_key in key_lower for fin_key in ["amount", "balance", "income", "debt", "credit", "payment"]):
                processed["financial_data"][key] = value
            
            # Behavioral indicators
            elif any(behav_key in key_lower for behav_key in ["frequency", "pattern", "habit", "behavior", "usage"]):
                processed["behavioral_data"][key] = value
            
            # Contextual factors
            elif any(context_key in key_lower for context_key in ["location", "device", "ip", "browser", "environment"]):
                processed["contextual_data"][key] = value
            
            # Risk indicators
            elif any(risk_key in key_lower for risk_key in ["failed", "fraud", "suspicious", "alert", "violation"]):
                processed["risk_indicators"][key] = value
            
            # Temporal data
            elif any(time_key in key_lower for time_key in ["time", "date", "timestamp", "duration", "age"]):
                processed["temporal_data"][key] = value
            
            # External factors
            elif any(ext_key in key_lower for ext_key in ["market", "economic", "regulatory", "industry", "external"]):
                processed["external_factors"][key] = value
            
            else:
                # Default categorization
                if isinstance(value, (int, float)):
                    processed["financial_data"][key] = value
                else:
                    processed["contextual_data"][key] = value
        
        # Process historical data if available
        if historical_data:
            processed["historical_patterns"] = self._extract_historical_patterns(historical_data)
        
        return processed
    
    def _generate_risk_data_summary(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary of data available for risk scoring."""
        summary = {
            "data_categories": {},
            "data_quality": {},
            "completeness_score": 0.0,
            "risk_data_richness": "low"
        }
        
        total_features = 0
        non_empty_features = 0
        
        for category, data in processed_data.items():
            if isinstance(data, dict):
                category_size = len(data)
                category_non_empty = sum(1 for v in data.values() if v is not None and str(v).strip() != "")
                
                summary["data_categories"][category] = category_size
                summary["data_quality"][category] = category_non_empty / category_size if category_size > 0 else 0
                
                total_features += category_size
                non_empty_features += category_non_empty
        
        # Calculate overall completeness
        summary["completeness_score"] = non_empty_features / total_features if total_features > 0 else 0
        
        # Assess data richness
        if summary["completeness_score"] > 0.8 and total_features > 20:
            summary["risk_data_richness"] = "high"
        elif summary["completeness_score"] > 0.6 and total_features > 10:
            summary["risk_data_richness"] = "medium"
        else:
            summary["risk_data_richness"] = "low"
        
        return summary
    
    def _extract_historical_patterns(self, historical_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract patterns from historical risk data."""
        patterns = {
            "risk_trends": {},
            "seasonal_patterns": {},
            "event_correlations": {},
            "baseline_metrics": {}
        }
        
        # This is a simplified pattern extraction
        # In a real implementation, this would involve sophisticated time series analysis
        
        for key, value in historical_data.items():
            if isinstance(value, list) and len(value) > 3:
                # Calculate trend
                numeric_values = [v for v in value if isinstance(v, (int, float))]
                if len(numeric_values) > 3:
                    # Simple trend calculation
                    first_half = numeric_values[:len(numeric_values)//2]
                    second_half = numeric_values[len(numeric_values)//2:]
                    
                    first_avg = sum(first_half) / len(first_half)
                    second_avg = sum(second_half) / len(second_half)
                    
                    if second_avg > first_avg * 1.2:
                        patterns["risk_trends"][key] = "increasing"
                    elif second_avg < first_avg * 0.8:
                        patterns["risk_trends"][key] = "decreasing"
                    else:
                        patterns["risk_trends"][key] = "stable"
                    
                    # Baseline metrics
                    patterns["baseline_metrics"][key] = {
                        "mean": sum(numeric_values) / len(numeric_values),
                        "min": min(numeric_values),
                        "max": max(numeric_values)
                    }
        
        return patterns
    
    def _assess_risk_factor(self, risk_factor: str, processed_data: Dict[str, Any], risk_tolerance: str, time_horizon: str) -> Dict[str, Any]:
        """Assess a specific risk factor."""
        assessment = {
            "factor_type": risk_factor,
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        # Route to specific risk factor assessment
        if risk_factor == "fraud":
            assessment = self._assess_fraud_risk(processed_data, risk_tolerance)
        elif risk_factor == "credit":
            assessment = self._assess_credit_risk(processed_data, risk_tolerance)
        elif risk_factor == "operational":
            assessment = self._assess_operational_risk(processed_data, risk_tolerance)
        elif risk_factor == "behavioral":
            assessment = self._assess_behavioral_risk(processed_data, risk_tolerance)
        elif risk_factor == "contextual":
            assessment = self._assess_contextual_risk(processed_data, risk_tolerance)
        else:
            # Generic risk assessment
            assessment = self._assess_generic_risk(risk_factor, processed_data, risk_tolerance)
        
        # Adjust for time horizon
        assessment = self._adjust_for_time_horizon(assessment, time_horizon)
        
        # Set factor type
        assessment["factor_type"] = risk_factor
        
        return assessment
    
    def _assess_fraud_risk(self, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess fraud-specific risk factors."""
        fraud_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        risk_score = 0.0
        contributing_factors = []
        
        # Analyze financial data for fraud indicators
        financial_data = processed_data.get("financial_data", {})
        for field, value in financial_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Large amounts
                if "amount" in field_lower and value > 10000:
                    risk_increase = min(value / 50000, 0.3)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "large_transaction_amount",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
                
                # High velocity
                elif "velocity" in field_lower and value > 10:
                    risk_increase = min(value / 50, 0.4)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "high_transaction_velocity",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Analyze risk indicators
        risk_indicators = processed_data.get("risk_indicators", {})
        for field, value in risk_indicators.items():
            if isinstance(value, (int, float)) and value > 0:
                if "failed" in field.lower():
                    risk_increase = min(value / 10, 0.5)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "failed_attempts",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
                elif "fraud" in field.lower():
                    risk_increase = min(value, 0.8)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "fraud_indicator",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Analyze contextual data
        contextual_data = processed_data.get("contextual_data", {})
        for field, value in contextual_data.items():
            if isinstance(value, str):
                value_lower = value.lower()
                if any(suspicious in value_lower for suspicious in ["vpn", "proxy", "tor", "anonymous"]):
                    risk_increase = 0.3
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "suspicious_network",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Finalize fraud assessment
        fraud_assessment["risk_score"] = min(risk_score, 1.0)
        fraud_assessment["contributing_factors"] = contributing_factors
        fraud_assessment["confidence"] = min(len(contributing_factors) / 5.0, 1.0)
        
        # Determine risk level
        if fraud_assessment["risk_score"] >= 0.7:
            fraud_assessment["risk_level"] = "high"
        elif fraud_assessment["risk_score"] >= 0.4:
            fraud_assessment["risk_level"] = "medium"
        else:
            fraud_assessment["risk_level"] = "low"
        
        fraud_assessment["factor_details"] = {
            "financial_risk_indicators": len([f for f in contributing_factors if "amount" in f["factor"] or "velocity" in f["factor"]]),
            "security_risk_indicators": len([f for f in contributing_factors if "failed" in f["factor"] or "fraud" in f["factor"]]),
            "network_risk_indicators": len([f for f in contributing_factors if "network" in f["factor"]])
        }
        
        return fraud_assessment
    
    def _assess_credit_risk(self, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess credit-specific risk factors."""
        credit_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        risk_score = 0.0
        contributing_factors = []
        
        financial_data = processed_data.get("financial_data", {})
        
        # Analyze financial health indicators
        for field, value in financial_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Credit score
                if "credit" in field_lower and "score" in field_lower:
                    if value < 600:
                        risk_increase = (600 - value) / 600 * 0.8
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "low_credit_score",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
                
                # Debt-to-income ratio
                elif "debt" in field_lower and "ratio" in field_lower:
                    if value > 0.4:  # 40% debt-to-income ratio
                        risk_increase = min((value - 0.4) * 2, 0.6)
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "high_debt_ratio",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
                
                # Income stability
                elif "income" in field_lower:
                    if value < 30000:  # Low income threshold
                        risk_increase = min((30000 - value) / 30000 * 0.4, 0.4)
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "low_income",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
        
        # Check temporal factors
        temporal_data = processed_data.get("temporal_data", {})
        for field, value in temporal_data.items():
            if isinstance(value, (int, float)):
                if "employment" in field.lower() and "years" in field.lower():
                    if value < 2:  # Less than 2 years employment
                        risk_increase = (2 - value) / 2 * 0.3
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "short_employment_history",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
        
        # Finalize credit assessment
        credit_assessment["risk_score"] = min(risk_score, 1.0)
        credit_assessment["contributing_factors"] = contributing_factors
        credit_assessment["confidence"] = min(len(contributing_factors) / 4.0, 1.0)
        
        # Determine risk level
        if credit_assessment["risk_score"] >= 0.6:
            credit_assessment["risk_level"] = "high"
        elif credit_assessment["risk_score"] >= 0.3:
            credit_assessment["risk_level"] = "medium"
        else:
            credit_assessment["risk_level"] = "low"
        
        credit_assessment["factor_details"] = {
            "credit_metrics_count": len([f for f in contributing_factors if "credit" in f["factor"]]),
            "income_factors_count": len([f for f in contributing_factors if "income" in f["factor"] or "debt" in f["factor"]]),
            "stability_factors_count": len([f for f in contributing_factors if "employment" in f["factor"]])
        }
        
        return credit_assessment
    
    def _assess_operational_risk(self, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess operational risk factors."""
        operational_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        risk_score = 0.0
        contributing_factors = []
        
        # Check for system/process indicators
        risk_indicators = processed_data.get("risk_indicators", {})
        for field, value in risk_indicators.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)) and value > 0:
                # System failures
                if "error" in field_lower or "failure" in field_lower:
                    risk_increase = min(value / 10, 0.4)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "system_errors",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
                
                # Processing delays
                elif "delay" in field_lower or "timeout" in field_lower:
                    risk_increase = min(value / 20, 0.3)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "processing_delays",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Check contextual factors
        contextual_data = processed_data.get("contextual_data", {})
        for field, value in contextual_data.items():
            if isinstance(value, str):
                value_lower = value.lower()
                # Old or unsupported systems
                if "legacy" in value_lower or "deprecated" in value_lower:
                    risk_increase = 0.3
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "legacy_system",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Check temporal factors for operational patterns
        temporal_data = processed_data.get("temporal_data", {})
        for field, value in temporal_data.items():
            if isinstance(value, (int, float)):
                if "downtime" in field.lower() and value > 60:  # More than 1 hour downtime
                    risk_increase = min(value / 300, 0.5)  # 5 hours = max risk
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "system_downtime",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Finalize operational assessment
        operational_assessment["risk_score"] = min(risk_score, 1.0)
        operational_assessment["contributing_factors"] = contributing_factors
        operational_assessment["confidence"] = min(len(contributing_factors) / 3.0, 1.0)
        
        # Determine risk level
        if operational_assessment["risk_score"] >= 0.6:
            operational_assessment["risk_level"] = "high"
        elif operational_assessment["risk_score"] >= 0.3:
            operational_assessment["risk_level"] = "medium"
        else:
            operational_assessment["risk_level"] = "low"
        
        operational_assessment["factor_details"] = {
            "system_reliability_issues": len([f for f in contributing_factors if "system" in f["factor"] or "error" in f["factor"]]),
            "performance_issues": len([f for f in contributing_factors if "delay" in f["factor"] or "downtime" in f["factor"]]),
            "technology_risks": len([f for f in contributing_factors if "legacy" in f["factor"]])
        }
        
        return operational_assessment
    
    def _assess_behavioral_risk(self, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess behavioral risk factors."""
        behavioral_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        risk_score = 0.0
        contributing_factors = []
        
        # Analyze behavioral patterns
        behavioral_data = processed_data.get("behavioral_data", {})
        for field, value in behavioral_data.items():
            field_lower = field.lower()
            if isinstance(value, (int, float)):
                # Unusual frequency patterns
                if "frequency" in field_lower:
                    if value > 100:  # Very high frequency
                        risk_increase = min(value / 500, 0.4)
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "unusual_frequency",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
                    elif value < 1:  # Very low frequency
                        risk_increase = 0.2
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "low_activity_frequency",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
                
                # Usage patterns
                elif "usage" in field_lower or "activity" in field_lower:
                    # Extreme usage could indicate automation or suspicious behavior
                    if value > 1000:
                        risk_increase = min(value / 5000, 0.3)
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "extreme_usage_pattern",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
        
        # Check for behavioral inconsistencies
        historical_patterns = processed_data.get("historical_patterns", {})
        baseline_metrics = historical_patterns.get("baseline_metrics", {})
        
        for field, current_value in behavioral_data.items():
            if field in baseline_metrics and isinstance(current_value, (int, float)):
                baseline = baseline_metrics[field]
                baseline_mean = baseline.get("mean", current_value)
                
                if baseline_mean > 0:
                    deviation_ratio = current_value / baseline_mean
                    if deviation_ratio > 5 or deviation_ratio < 0.2:
                        risk_increase = min(abs(math.log(deviation_ratio)) / 5, 0.4)
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "behavioral_deviation",
                            "field": field,
                            "current_value": current_value,
                            "baseline_mean": baseline_mean,
                            "deviation_ratio": deviation_ratio,
                            "risk_contribution": risk_increase
                        })
        
        # Finalize behavioral assessment
        behavioral_assessment["risk_score"] = min(risk_score, 1.0)
        behavioral_assessment["contributing_factors"] = contributing_factors
        behavioral_assessment["confidence"] = min(len(contributing_factors) / 4.0, 1.0)
        
        # Determine risk level
        if behavioral_assessment["risk_score"] >= 0.5:
            behavioral_assessment["risk_level"] = "high"
        elif behavioral_assessment["risk_score"] >= 0.25:
            behavioral_assessment["risk_level"] = "medium"
        else:
            behavioral_assessment["risk_level"] = "low"
        
        behavioral_assessment["factor_details"] = {
            "frequency_anomalies": len([f for f in contributing_factors if "frequency" in f["factor"]]),
            "usage_anomalies": len([f for f in contributing_factors if "usage" in f["factor"]]),
            "behavioral_deviations": len([f for f in contributing_factors if "deviation" in f["factor"]])
        }
        
        return behavioral_assessment
    
    def _assess_contextual_risk(self, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess contextual risk factors."""
        contextual_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        risk_score = 0.0
        contributing_factors = []
        
        # Analyze contextual data
        contextual_data = processed_data.get("contextual_data", {})
        
        for field, value in contextual_data.items():
            field_lower = field.lower()
            
            # Geographic risk factors
            if "location" in field_lower or "country" in field_lower:
                if isinstance(value, str):
                    # High-risk countries/regions (simplified list)
                    high_risk_locations = ["unknown", "anonymous", "restricted", "sanctioned"]
                    if any(risk_loc in value.lower() for risk_loc in high_risk_locations):
                        risk_increase = 0.6
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "high_risk_location",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
            
            # Device and technology risk factors
            elif "device" in field_lower or "browser" in field_lower:
                if isinstance(value, str):
                    value_lower = value.lower()
                    # Unusual or risky device/browser patterns
                    if any(risk_term in value_lower for risk_term in ["bot", "automated", "script", "unknown"]):
                        risk_increase = 0.4
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "suspicious_device",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
            
            # IP and network risk factors
            elif "ip" in field_lower:
                if isinstance(value, str):
                    # Check for suspicious IP patterns
                    if any(ip_risk in value.lower() for ip_risk in ["vpn", "proxy", "tor", "datacenter"]):
                        risk_increase = 0.5
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "suspicious_ip",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
                    # Private IP addresses in certain contexts can be risky
                    elif value.startswith(("192.168.", "10.0.", "172.16.")):
                        risk_increase = 0.2
                        risk_score += risk_increase
                        contributing_factors.append({
                            "factor": "private_ip_usage",
                            "value": value,
                            "risk_contribution": risk_increase
                        })
        
        # Check external factors
        external_factors = processed_data.get("external_factors", {})
        for field, value in external_factors.items():
            if isinstance(value, (int, float)):
                # Market volatility or economic indicators
                if "volatility" in field.lower() and value > 0.3:
                    risk_increase = min(value, 0.4)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "market_volatility",
                        "value": value,
                        "risk_contribution": risk_increase
                    })
                elif "risk" in field.lower() and value > 0.5:
                    risk_increase = min(value * 0.6, 0.5)
                    risk_score += risk_increase
                    contributing_factors.append({
                        "factor": "external_risk_factor",
                        "field": field,
                        "value": value,
                        "risk_contribution": risk_increase
                    })
        
        # Finalize contextual assessment
        contextual_assessment["risk_score"] = min(risk_score, 1.0)
        contextual_assessment["contributing_factors"] = contributing_factors
        contextual_assessment["confidence"] = min(len(contributing_factors) / 3.0, 1.0)
        
        # Determine risk level
        if contextual_assessment["risk_score"] >= 0.6:
            contextual_assessment["risk_level"] = "high"
        elif contextual_assessment["risk_score"] >= 0.3:
            contextual_assessment["risk_level"] = "medium"
        else:
            contextual_assessment["risk_level"] = "low"
        
        contextual_assessment["factor_details"] = {
            "geographic_risks": len([f for f in contributing_factors if "location" in f["factor"]]),
            "technology_risks": len([f for f in contributing_factors if "device" in f["factor"] or "ip" in f["factor"]]),
            "external_risks": len([f for f in contributing_factors if "external" in f["factor"] or "market" in f["factor"]])
        }
        
        return contextual_assessment
    
    def _assess_generic_risk(self, risk_factor: str, processed_data: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Assess a generic risk factor."""
        generic_assessment = {
            "risk_score": 0.0,
            "contributing_factors": [],
            "risk_level": "low",
            "confidence": 0.0,
            "factor_details": {}
        }
        
        # Generic risk assessment based on available data
        risk_score = 0.0
        contributing_factors = []
        
        # Look for any risk indicators related to this factor
        for category, data in processed_data.items():
            if isinstance(data, dict):
                for field, value in data.items():
                    field_lower = field.lower()
                    # If field contains the risk factor name, consider it
                    if risk_factor.lower() in field_lower:
                        if isinstance(value, (int, float)) and value > 0:
                            risk_increase = min(value / 10, 0.3)
                            risk_score += risk_increase
                            contributing_factors.append({
                                "factor": f"{risk_factor}_indicator",
                                "field": field,
                                "value": value,
                                "risk_contribution": risk_increase
                            })
        
        # Finalize generic assessment
        generic_assessment["risk_score"] = min(risk_score, 1.0)
        generic_assessment["contributing_factors"] = contributing_factors
        generic_assessment["confidence"] = min(len(contributing_factors) / 2.0, 0.5)  # Lower confidence for generic
        
        # Determine risk level
        if generic_assessment["risk_score"] >= 0.5:
            generic_assessment["risk_level"] = "high"
        elif generic_assessment["risk_score"] >= 0.25:
            generic_assessment["risk_level"] = "medium"
        else:
            generic_assessment["risk_level"] = "low"
        
        generic_assessment["factor_details"] = {
            f"{risk_factor}_indicators": len(contributing_factors)
        }
        
        return generic_assessment
    
    def _adjust_for_time_horizon(self, assessment: Dict[str, Any], time_horizon: str) -> Dict[str, Any]:
        """Adjust risk assessment based on time horizon."""
        adjustment_factors = {
            "immediate": 1.2,    # Higher risk for immediate decisions
            "short_term": 1.0,   # Baseline
            "medium_term": 0.8,  # Lower risk with more time
            "long_term": 0.6     # Much lower risk with long-term planning
        }
        
        factor = adjustment_factors.get(time_horizon, 1.0)
        
        # Adjust risk score
        original_score = assessment.get("risk_score", 0)
        adjusted_score = min(original_score * factor, 1.0)
        assessment["risk_score"] = adjusted_score
        
        # Add time horizon adjustment to factor details
        if "factor_details" not in assessment:
            assessment["factor_details"] = {}
        
        assessment["factor_details"]["time_horizon_adjustment"] = {
            "horizon": time_horizon,
            "adjustment_factor": factor,
            "original_score": original_score,
            "adjusted_score": adjusted_score
        }
        
        return assessment
    
    def _apply_rule_based_risk_scoring(self, processed_data: Dict[str, Any], risk_factor_scores: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Apply rule-based risk scoring."""
        rule_score = {
            "overall_score": 0.0,
            "triggered_rules": [],
            "rule_categories": {},
            "confidence": 0.0
        }
        
        triggered_rules = []
        
        # Rule 1: High fraud risk with low credit risk = High overall risk
        fraud_score = risk_factor_scores.get("fraud", {}).get("risk_score", 0)
        credit_score = risk_factor_scores.get("credit", {}).get("risk_score", 0)
        
        if fraud_score > 0.7 and credit_score < 0.3:
            triggered_rules.append({
                "rule": "high_fraud_low_credit",
                "description": "High fraud risk with good credit standing",
                "risk_contribution": 0.8,
                "confidence": 0.9
            })
        
        # Rule 2: Multiple high-risk factors
        high_risk_factors = [
            factor for factor, data in risk_factor_scores.items()
            if data.get("risk_score", 0) > 0.6
        ]
        
        if len(high_risk_factors) >= 3:
            triggered_rules.append({
                "rule": "multiple_high_risk_factors",
                "description": f"Multiple high-risk factors: {', '.join(high_risk_factors)}",
                "risk_contribution": 0.7,
                "confidence": 0.8
            })
        
        # Rule 3: Contextual and behavioral alignment
        contextual_score = risk_factor_scores.get("contextual", {}).get("risk_score", 0)
        behavioral_score = risk_factor_scores.get("behavioral", {}).get("risk_score", 0)
        
        if contextual_score > 0.5 and behavioral_score > 0.5:
            triggered_rules.append({
                "rule": "contextual_behavioral_alignment",
                "description": "Both contextual and behavioral risks are elevated",
                "risk_contribution": 0.6,
                "confidence": 0.7
            })
        
        # Rule 4: Risk tolerance adjustment
        tolerance_multipliers = {"low": 1.3, "medium": 1.0, "high": 0.7}
        tolerance_multiplier = tolerance_multipliers.get(risk_tolerance, 1.0)
        
        # Calculate overall rule score
        if triggered_rules:
            max_contribution = max(rule["risk_contribution"] for rule in triggered_rules)
            avg_contribution = sum(rule["risk_contribution"] for rule in triggered_rules) / len(triggered_rules)
            rule_score["overall_score"] = (max_contribution + avg_contribution) / 2 * tolerance_multiplier
            rule_score["overall_score"] = min(rule_score["overall_score"], 1.0)
            
            # Calculate confidence
            avg_confidence = sum(rule["confidence"] for rule in triggered_rules) / len(triggered_rules)
            rule_score["confidence"] = avg_confidence
        else:
            # No rules triggered
            rule_score["overall_score"] = 0.1  # Baseline risk
            rule_score["confidence"] = 0.3
        
        rule_score["triggered_rules"] = triggered_rules
        
        # Categorize rules
        rule_categories = Counter(rule.get("rule", "").split("_")[0] for rule in triggered_rules)
        rule_score["rule_categories"] = dict(rule_categories)
        
        return rule_score
    
    def _apply_weighted_risk_scoring(self, risk_factor_scores: Dict[str, Any], risk_tolerance: str, time_horizon: str) -> Dict[str, Any]:
        """Apply weighted risk scoring."""
        weighted_score = {
            "overall_score": 0.0,
            "factor_weights": {},
            "weighted_contributions": {},
            "confidence": 0.0
        }
        
        # Define base weights for different risk factors
        base_weights = {
            "fraud": 0.35,
            "credit": 0.25,
            "operational": 0.15,
            "behavioral": 0.15,
            "contextual": 0.10
        }
        
        # Adjust weights based on risk tolerance
        tolerance_adjustments = {
            "low": {"fraud": 1.2, "credit": 1.1, "operational": 1.0, "behavioral": 0.9, "contextual": 0.8},
            "medium": {"fraud": 1.0, "credit": 1.0, "operational": 1.0, "behavioral": 1.0, "contextual": 1.0},
            "high": {"fraud": 0.8, "credit": 0.9, "operational": 1.2, "behavioral": 1.1, "contextual": 1.2}
        }
        
        # Adjust weights based on time horizon
        horizon_adjustments = {
            "immediate": {"fraud": 1.3, "behavioral": 1.2},
            "short_term": {"fraud": 1.1, "credit": 1.1},
            "medium_term": {"credit": 1.2, "operational": 1.1},
            "long_term": {"credit": 1.3, "operational": 1.2}
        }
        
        # Apply adjustments
        adjusted_weights = {}
        tolerance_adj = tolerance_adjustments.get(risk_tolerance, {})
        horizon_adj = horizon_adjustments.get(time_horizon, {})
        
        for factor, base_weight in base_weights.items():
            tolerance_mult = tolerance_adj.get(factor, 1.0)
            horizon_mult = horizon_adj.get(factor, 1.0)
            adjusted_weights[factor] = base_weight * tolerance_mult * horizon_mult
        
        # Normalize weights
        total_weight = sum(adjusted_weights.values())
        if total_weight > 0:
            adjusted_weights = {k: v / total_weight for k, v in adjusted_weights.items()}
        
        weighted_score["factor_weights"] = adjusted_weights
        
        # Calculate weighted score
        total_score = 0.0
        total_confidence = 0.0
        contributing_factors = 0
        
        for factor, weight in adjusted_weights.items():
            if factor in risk_factor_scores:
                factor_data = risk_factor_scores[factor]
                factor_score = factor_data.get("risk_score", 0)
                factor_confidence = factor_data.get("confidence", 0)
                
                contribution = factor_score * weight
                total_score += contribution
                total_confidence += factor_confidence * weight
                
                weighted_score["weighted_contributions"][factor] = {
                    "weight": weight,
                    "factor_score": factor_score,
                    "contribution": contribution
                }
                
                if factor_score > 0:
                    contributing_factors += 1
        
        weighted_score["overall_score"] = min(total_score, 1.0)
        weighted_score["confidence"] = min(total_confidence, 1.0)
        
        return weighted_score
    
    def _apply_ml_risk_scoring(self, processed_data: Dict[str, Any], historical_data: Optional[Dict[str, Any]], risk_tolerance: str) -> Dict[str, Any]:
        """Apply machine learning-based risk scoring."""
        ml_score = {
            "overall_score": 0.0,
            "feature_importance": {},
            "model_confidence": 0.0,
            "prediction_details": {}
        }
        
        # This is a simplified ML scoring implementation
        # In a real system, this would use trained ML models
        
        # Extract features for ML scoring
        features = self._extract_ml_features(processed_data)
        ml_score["prediction_details"]["feature_count"] = len(features)
        
        # Simplified "ML" scoring using feature-based rules
        risk_score = 0.0
        feature_importance = {}
        
        for feature_name, feature_value in features.items():
            if isinstance(feature_value, (int, float)):
                # Normalize feature value
                normalized_value = min(abs(feature_value) / 100, 1.0)
                
                # Calculate feature importance (simplified)
                if "fraud" in feature_name.lower():
                    importance = 0.3
                elif "credit" in feature_name.lower():
                    importance = 0.25
                elif "amount" in feature_name.lower():
                    importance = 0.2
                elif "frequency" in feature_name.lower():
                    importance = 0.15
                else:
                    importance = 0.1
                
                feature_importance[feature_name] = importance
                risk_score += normalized_value * importance
        
        # Add historical pattern influence
        if historical_data:
            historical_patterns = processed_data.get("historical_patterns", {})
            trend_influence = 0.0
            
            for pattern_type, trend in historical_patterns.get("risk_trends", {}).items():
                if trend == "increasing":
                    trend_influence += 0.1
                elif trend == "decreasing":
                    trend_influence -= 0.05
            
            risk_score += trend_influence
        
        # Apply risk tolerance adjustment
        tolerance_adjustments = {"low": 1.2, "medium": 1.0, "high": 0.8}
        risk_score *= tolerance_adjustments.get(risk_tolerance, 1.0)
        
        ml_score["overall_score"] = min(risk_score, 1.0)
        ml_score["feature_importance"] = feature_importance
        
        # Calculate model confidence based on feature availability
        data_completeness = len(features) / 20.0  # Assume 20 is ideal feature count
        ml_score["model_confidence"] = min(data_completeness, 1.0)
        
        ml_score["prediction_details"]["risk_components"] = {
            "feature_risk": min(risk_score * 0.8, 1.0),
            "historical_trend_risk": min(abs(trend_influence), 0.2) if historical_data else 0,
            "tolerance_adjustment": tolerance_adjustments.get(risk_tolerance, 1.0)
        }
        
        return ml_score
    
    def _extract_ml_features(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features for ML-based risk scoring."""
        features = {}
        
        # Extract numerical features from all categories
        for category, data in processed_data.items():
            if isinstance(data, dict):
                for field, value in data.items():
                    if isinstance(value, (int, float)):
                        feature_name = f"{category}_{field}"
                        features[feature_name] = value
        
        # Create derived features
        financial_data = processed_data.get("financial_data", {})
        
        # Amount-based features
        amounts = [v for k, v in financial_data.items() if "amount" in k.lower() and isinstance(v, (int, float))]
        if amounts:
            features["total_amount"] = sum(amounts)
            features["max_amount"] = max(amounts)
            features["avg_amount"] = sum(amounts) / len(amounts)
            features["amount_variance"] = sum((x - features["avg_amount"]) ** 2 for x in amounts) / len(amounts)
        
        # Risk indicator features
        risk_indicators = processed_data.get("risk_indicators", {})
        risk_count = sum(1 for v in risk_indicators.values() if isinstance(v, (int, float)) and v > 0)
        features["risk_indicator_count"] = risk_count
        
        return features
    
    def _apply_composite_risk_scoring(self, model_scores: Dict[str, Any], risk_factor_scores: Dict[str, Any]) -> Dict[str, Any]:
        """Apply composite risk scoring combining multiple models."""
        composite_score = {
            "overall_score": 0.0,
            "model_contributions": {},
            "ensemble_confidence": 0.0,
            "score_variance": 0.0
        }
        
        # Define model weights
        model_weights = {
            "rule_based": 0.25,
            "weighted": 0.35,
            "ml_based": 0.4
        }
        
        # Calculate composite score
        total_score = 0.0
        total_weight = 0.0
        model_scores_list = []
        
        for model_name, weight in model_weights.items():
            if model_name in model_scores:
                model_data = model_scores[model_name]
                model_score = model_data.get("overall_score", 0)
                model_confidence = model_data.get("confidence", 0.5)
                
                # Weight by confidence
                effective_weight = weight * model_confidence
                contribution = model_score * effective_weight
                
                total_score += contribution
                total_weight += effective_weight
                model_scores_list.append(model_score)
                
                composite_score["model_contributions"][model_name] = {
                    "weight": weight,
                    "score": model_score,
                    "confidence": model_confidence,
                    "effective_weight": effective_weight,
                    "contribution": contribution
                }
        
        # Normalize score
        if total_weight > 0:
            composite_score["overall_score"] = total_score / total_weight
        
        # Calculate ensemble confidence
        if model_scores_list:
            # Confidence based on score agreement
            avg_score = sum(model_scores_list) / len(model_scores_list)
            variance = sum((score - avg_score) ** 2 for score in model_scores_list) / len(model_scores_list)
            
            composite_score["score_variance"] = variance
            # Lower variance = higher confidence
            composite_score["ensemble_confidence"] = max(0.1, 1.0 - variance)
        
        return composite_score
    
    def _calculate_overall_risk_assessment(self, model_scores: Dict[str, Any], risk_factor_scores: Dict[str, Any], risk_tolerance: str) -> Dict[str, Any]:
        """Calculate overall risk assessment."""
        assessment = {
            "overall_risk_score": 0.0,
            "risk_level": "low",
            "confidence": 0.0,
            "primary_risk_factors": [],
            "risk_distribution": {},
            "decision_recommendation": ""
        }
        
        # Get the best composite score
        composite_data = model_scores.get("composite", {})
        if composite_data:
            assessment["overall_risk_score"] = composite_data.get("overall_score", 0)
            assessment["confidence"] = composite_data.get("ensemble_confidence", 0)
        else:
            # Fallback to highest individual model score
            individual_scores = [
                model_data.get("overall_score", 0) 
                for model_data in model_scores.values()
                if isinstance(model_data, dict)
            ]
            if individual_scores:
                assessment["overall_risk_score"] = max(individual_scores)
                assessment["confidence"] = 0.5  # Medium confidence without ensemble
        
        # Determine risk level
        risk_score = assessment["overall_risk_score"]
        if risk_score >= 0.7:
            assessment["risk_level"] = "high"
            assessment["decision_recommendation"] = "reject_or_require_additional_verification"
        elif risk_score >= 0.4:
            assessment["risk_level"] = "medium"
            assessment["decision_recommendation"] = "proceed_with_enhanced_monitoring"
        else:
            assessment["risk_level"] = "low"
            assessment["decision_recommendation"] = "proceed_with_standard_monitoring"
        
        # Identify primary risk factors
        primary_factors = []
        for factor_name, factor_data in risk_factor_scores.items():
            if isinstance(factor_data, dict):
                factor_score = factor_data.get("risk_score", 0)
                if factor_score > 0.5:
                    primary_factors.append({
                        "factor": factor_name,
                        "score": factor_score,
                        "level": factor_data.get("risk_level", "unknown")
                    })
        
        # Sort by score
        primary_factors.sort(key=lambda x: x["score"], reverse=True)
        assessment["primary_risk_factors"] = primary_factors[:5]  # Top 5
        
        # Risk distribution
        factor_scores = {
            factor: data.get("risk_score", 0) 
            for factor, data in risk_factor_scores.items() 
            if isinstance(data, dict)
        }
        
        if factor_scores:
            total_factor_score = sum(factor_scores.values())
            if total_factor_score > 0:
                assessment["risk_distribution"] = {
                    factor: score / total_factor_score 
                    for factor, score in factor_scores.items()
                }
        
        return assessment
    
    def _generate_risk_breakdown(self, risk_factor_scores: Dict[str, Any], overall_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed risk breakdown analysis."""
        breakdown = {
            "factor_analysis": {},
            "risk_correlations": {},
            "critical_factors": [],
            "risk_progression": {}
        }
        
        # Analyze each risk factor
        for factor_name, factor_data in risk_factor_scores.items():
            if isinstance(factor_data, dict):
                factor_score = factor_data.get("risk_score", 0)
                factor_level = factor_data.get("risk_level", "low")
                contributing_factors = factor_data.get("contributing_factors", [])
                
                breakdown["factor_analysis"][factor_name] = {
                    "score": factor_score,
                    "level": factor_level,
                    "contributing_factor_count": len(contributing_factors),
                    "top_contributors": contributing_factors[:3],  # Top 3 contributors
                    "factor_details": factor_data.get("factor_details", {})
                }
                
                # Identify critical factors
                if factor_score > 0.6:
                    breakdown["critical_factors"].append({
                        "factor": factor_name,
                        "score": factor_score,
                        "reason": f"High {factor_name} risk score of {factor_score:.2f}"
                    })
        
        # Risk correlations (simplified)
        factor_scores = [
            (factor, data.get("risk_score", 0)) 
            for factor, data in risk_factor_scores.items() 
            if isinstance(data, dict)
        ]
        
        # Find correlations between high-scoring factors
        high_risk_factors = [factor for factor, score in factor_scores if score > 0.5]
        if len(high_risk_factors) > 1:
            breakdown["risk_correlations"]["high_risk_cluster"] = {
                "factors": high_risk_factors,
                "description": f"Multiple high-risk factors detected: {', '.join(high_risk_factors)}",
                "correlation_strength": "high"
            }
        
        # Risk progression analysis
        overall_score = overall_assessment.get("overall_risk_score", 0)
        if overall_score > 0.8:
            breakdown["risk_progression"]["status"] = "critical"
            breakdown["risk_progression"]["trajectory"] = "immediate_attention_required"
        elif overall_score > 0.6:
            breakdown["risk_progression"]["status"] = "escalating"
            breakdown["risk_progression"]["trajectory"] = "monitoring_required"
        elif overall_score > 0.3:
            breakdown["risk_progression"]["status"] = "emerging"
            breakdown["risk_progression"]["trajectory"] = "watchlist"
        else:
            breakdown["risk_progression"]["status"] = "stable"
            breakdown["risk_progression"]["trajectory"] = "routine_monitoring"
        
        return breakdown
    
    def _calculate_risk_confidence_metrics(self, model_scores: Dict[str, Any], processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate confidence metrics for risk scoring."""
        confidence_metrics = {
            "overall_confidence": 0.0,
            "data_quality_score": 0.0,
            "model_agreement": 0.0,
            "prediction_stability": 0.0,
            "confidence_intervals": {}
        }
        
        # Data quality assessment
        data_summary = processed_data.get("data_summary") or self._generate_risk_data_summary(processed_data)
        data_quality = data_summary.get("completeness_score", 0)
        confidence_metrics["data_quality_score"] = data_quality
        
        # Model agreement assessment
        model_scores_values = []
        for model_name, model_data in model_scores.items():
            if isinstance(model_data, dict) and "overall_score" in model_data:
                model_scores_values.append(model_data["overall_score"])
        
        if len(model_scores_values) > 1:
            avg_score = sum(model_scores_values) / len(model_scores_values)
            variance = sum((score - avg_score) ** 2 for score in model_scores_values) / len(model_scores_values)
            agreement = 1.0 - min(variance, 1.0)  # Lower variance = higher agreement
            confidence_metrics["model_agreement"] = agreement
        else:
            confidence_metrics["model_agreement"] = 0.5  # Default for single model
        
        # Prediction stability (based on data richness and model agreement)
        stability_factors = [data_quality, confidence_metrics["model_agreement"]]
        confidence_metrics["prediction_stability"] = sum(stability_factors) / len(stability_factors)
        
        # Overall confidence
        confidence_factors = [
            confidence_metrics["data_quality_score"],
            confidence_metrics["model_agreement"],
            confidence_metrics["prediction_stability"]
        ]
        confidence_metrics["overall_confidence"] = sum(confidence_factors) / len(confidence_factors)
        
        # Confidence intervals for overall risk score
        if model_scores_values:
            avg_score = sum(model_scores_values) / len(model_scores_values)
            if len(model_scores_values) > 1:
                std_dev = math.sqrt(sum((score - avg_score) ** 2 for score in model_scores_values) / len(model_scores_values))
                margin_of_error = 1.96 * std_dev  # 95% confidence interval
            else:
                margin_of_error = 0.1  # Default margin for single score
            
            confidence_metrics["confidence_intervals"] = {
                "lower_bound": max(0, avg_score - margin_of_error),
                "upper_bound": min(1, avg_score + margin_of_error),
                "confidence_level": 0.95
            }
        
        return confidence_metrics
    
    def _generate_risk_recommendations(self, overall_assessment: Dict[str, Any], risk_breakdown: Dict[str, Any], risk_tolerance: str, time_horizon: str) -> List[Dict[str, Any]]:
        """Generate risk management recommendations."""
        recommendations = []
        
        overall_score = overall_assessment.get("overall_risk_score", 0)
        risk_level = overall_assessment.get("risk_level", "low")
        primary_factors = overall_assessment.get("primary_risk_factors", [])
        
        # High-level risk recommendations
        if risk_level == "high":
            recommendations.append({
                "priority": "critical",
                "category": "immediate_action",
                "action": "comprehensive_risk_mitigation",
                "description": f"High overall risk score ({overall_score:.2f}) requires immediate attention",
                "implementation": "Implement all available risk controls and consider rejecting or requiring additional verification",
                "timeframe": "immediate"
            })
        elif risk_level == "medium":
            recommendations.append({
                "priority": "high",
                "category": "enhanced_monitoring",
                "action": "implement_enhanced_controls",
                "description": f"Medium risk score ({overall_score:.2f}) requires enhanced monitoring",
                "implementation": "Apply additional verification steps and increased monitoring frequency",
                "timeframe": "within_24_hours"
            })
        
        # Factor-specific recommendations
        for factor_data in primary_factors[:3]:  # Top 3 risk factors
            factor_name = factor_data["factor"]
            factor_score = factor_data["score"]
            
            if factor_name == "fraud":
                recommendations.append({
                    "priority": "high",
                    "category": "fraud_prevention",
                    "action": "activate_fraud_controls",
                    "description": f"High fraud risk detected ({factor_score:.2f})",
                    "implementation": "Enable fraud detection algorithms, require additional authentication, flag for manual review"
                })
            
            elif factor_name == "credit":
                recommendations.append({
                    "priority": "medium",
                    "category": "credit_management",
                    "action": "review_credit_terms",
                    "description": f"Credit risk concerns ({factor_score:.2f})",
                    "implementation": "Review credit limits, require additional financial verification, consider modified terms"
                })
            
            elif factor_name == "operational":
                recommendations.append({
                    "priority": "medium",
                    "category": "operational_controls",
                    "action": "strengthen_operational_procedures",
                    "description": f"Operational risk issues ({factor_score:.2f})",
                    "implementation": "Review operational procedures, implement additional monitoring, ensure system redundancy"
                })
            
            elif factor_name == "behavioral":
                recommendations.append({
                    "priority": "medium",
                    "category": "behavioral_monitoring",
                    "action": "increase_behavioral_analysis",
                    "description": f"Behavioral risk patterns detected ({factor_score:.2f})",
                    "implementation": "Implement continuous behavioral monitoring, establish baseline patterns, alert on deviations"
                })
        
        # Risk tolerance and time horizon specific recommendations
        if risk_tolerance == "low" and overall_score > 0.3:
            recommendations.append({
                "priority": "high",
                "category": "conservative_approach",
                "action": "apply_strict_risk_controls",
                "description": "Low risk tolerance requires strict controls even for medium risk",
                "implementation": "Apply most restrictive risk controls available"
            })
        
        if time_horizon == "immediate" and overall_score > 0.5:
            recommendations.append({
                "priority": "critical",
                "category": "time_sensitive",
                "action": "expedite_risk_decision",
                "description": "Immediate time horizon requires quick risk decision",
                "implementation": "Fast-track risk assessment, apply conservative decision criteria"
            })
        
        # Critical factors recommendations
        critical_factors = risk_breakdown.get("critical_factors", [])
        if len(critical_factors) > 2:
            recommendations.append({
                "priority": "critical",
                "category": "multi_factor_risk",
                "action": "address_multiple_critical_factors",
                "description": f"Multiple critical risk factors detected: {len(critical_factors)}",
                "implementation": "Comprehensive risk review required, consider escalation to senior risk management"
            })
        
        # Confidence-based recommendations
        # This would typically use confidence metrics, but we'll add a generic recommendation
        if overall_score > 0.4:
            recommendations.append({
                "priority": "low",
                "category": "continuous_improvement",
                "action": "enhance_risk_models",
                "description": "Consider improving risk detection capabilities",
                "implementation": "Review model performance, collect additional data, retrain algorithms"
            })
        
        return recommendations

    async def _arun(self, **kwargs: Any) -> str:
        """Async version of the run method."""
        return self._run(**kwargs)