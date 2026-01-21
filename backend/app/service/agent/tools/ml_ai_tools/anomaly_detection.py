"""
Anomaly Detection ML Tool

Advanced machine learning tool for detecting anomalies across multiple dimensions
including statistical, temporal, behavioral, and contextual anomalies using various
ML algorithms and ensemble methods.
"""

import json
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AnomalyDetectionInput(BaseModel):
    """Input schema for Anomaly Detection ML Tool."""

    data: Dict[str, Any] = Field(..., description="Data to analyze for anomalies")
    detection_type: str = Field(
        default="comprehensive",
        description="Type of anomaly detection: 'comprehensive', 'statistical', 'temporal', 'behavioral', 'contextual', 'network'",
    )
    sensitivity: str = Field(
        default="medium",
        description="Detection sensitivity level: 'low', 'medium', 'high'",
    )
    baseline_data: Optional[Dict[str, Any]] = Field(
        default=None, description="Historical baseline data for comparison"
    )
    algorithms: List[str] = Field(
        default=["isolation_forest", "local_outlier_factor", "statistical_z_score"],
        description="ML algorithms to use for detection",
    )
    time_window: Optional[int] = Field(
        default=24, description="Time window in hours for temporal anomaly detection"
    )


class AnomalyDetectionTool(BaseTool):
    """
    Advanced anomaly detection using ensemble machine learning methods.

    Detects various types of anomalies:
    - Statistical outliers and deviations
    - Temporal pattern anomalies
    - Behavioral anomalies
    - Contextual anomalies
    - Network and relationship anomalies
    - Multi-dimensional anomalies

    Uses multiple ML algorithms:
    - Isolation Forest for unsupervised detection
    - Local Outlier Factor (LOF) for density-based detection
    - Statistical methods (Z-score, IQR)
    - Time series anomaly detection
    - Ensemble methods for improved accuracy
    """

    name: str = "anomaly_detection_ml"
    description: str = """
    Performs comprehensive anomaly detection using advanced machine learning algorithms
    to identify outliers, unusual patterns, and suspicious behaviors across multiple
    dimensions including statistical, temporal, behavioral, and contextual anomalies.
    
    Uses ensemble methods combining multiple algorithms for robust detection including
    Isolation Forest, Local Outlier Factor, statistical methods, and custom ML models
    tailored for fraud detection and security monitoring.
    """
    args_schema: type = AnomalyDetectionInput

    def _run(
        self,
        data: Dict[str, Any],
        detection_type: str = "comprehensive",
        sensitivity: str = "medium",
        baseline_data: Optional[Dict[str, Any]] = None,
        algorithms: List[str] = None,
        time_window: int = 24,
        **kwargs: Any,
    ) -> str:
        """Execute anomaly detection analysis."""
        try:
            logger.info(f"Starting anomaly detection with type: {detection_type}")

            if algorithms is None:
                algorithms = [
                    "isolation_forest",
                    "local_outlier_factor",
                    "statistical_z_score",
                ]

            # Validate input data
            if not data:
                return json.dumps(
                    {
                        "success": False,
                        "error": "No data provided for anomaly detection",
                        "detection_type": detection_type,
                    }
                )

            # Initialize detection results
            detection_results = {
                "detection_type": detection_type,
                "sensitivity": sensitivity,
                "timestamp": datetime.utcnow().isoformat(),
                "algorithms_used": algorithms,
                "anomaly_detection": {},
                "detected_anomalies": [],
                "confidence_scores": {},
                "recommendations": [],
            }

            # Preprocess data for analysis
            processed_data = self._preprocess_data(data)
            detection_results["data_summary"] = self._generate_data_summary(
                processed_data
            )

            # Execute detection based on type
            if detection_type in ["comprehensive", "statistical"]:
                statistical_anomalies = self._detect_statistical_anomalies(
                    processed_data, sensitivity, algorithms
                )
                detection_results["anomaly_detection"][
                    "statistical"
                ] = statistical_anomalies

            if detection_type in ["comprehensive", "temporal"]:
                temporal_anomalies = self._detect_temporal_anomalies(
                    processed_data, time_window, baseline_data
                )
                detection_results["anomaly_detection"]["temporal"] = temporal_anomalies

            if detection_type in ["comprehensive", "behavioral"]:
                behavioral_anomalies = self._detect_behavioral_anomalies(
                    processed_data, baseline_data
                )
                detection_results["anomaly_detection"][
                    "behavioral"
                ] = behavioral_anomalies

            if detection_type in ["comprehensive", "contextual"]:
                contextual_anomalies = self._detect_contextual_anomalies(
                    processed_data, baseline_data
                )
                detection_results["anomaly_detection"][
                    "contextual"
                ] = contextual_anomalies

            if detection_type in ["comprehensive", "network"]:
                network_anomalies = self._detect_network_anomalies(
                    processed_data, baseline_data
                )
                detection_results["anomaly_detection"]["network"] = network_anomalies

            # Aggregate all detected anomalies
            all_anomalies = self._aggregate_anomalies(
                detection_results["anomaly_detection"]
            )
            detection_results["detected_anomalies"] = all_anomalies

            # Calculate confidence scores using ensemble method
            confidence_scores = self._calculate_ensemble_confidence(
                detection_results["anomaly_detection"], algorithms
            )
            detection_results["confidence_scores"] = confidence_scores

            # Generate recommendations
            recommendations = self._generate_anomaly_recommendations(
                all_anomalies, confidence_scores, detection_type
            )
            detection_results["recommendations"] = recommendations

            # Calculate overall anomaly score
            overall_score = self._calculate_overall_anomaly_score(
                all_anomalies, confidence_scores
            )
            detection_results["overall_anomaly_score"] = overall_score

            logger.info(
                f"Anomaly detection completed. Found {len(all_anomalies)} anomalies"
            )
            return json.dumps(detection_results, indent=2)

        except Exception as e:
            logger.error(f"Error in anomaly detection: {str(e)}")
            return json.dumps(
                {
                    "success": False,
                    "error": f"Anomaly detection failed: {str(e)}",
                    "detection_type": detection_type,
                }
            )

    def _preprocess_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess data for anomaly detection algorithms."""
        processed = {
            "numerical_features": {},
            "categorical_features": {},
            "temporal_features": {},
            "text_features": {},
            "metadata": {},
        }

        for key, value in data.items():
            if isinstance(value, (int, float)):
                processed["numerical_features"][key] = float(value)
            elif isinstance(value, str):
                # Check if it's a timestamp
                if self._is_timestamp(value):
                    processed["temporal_features"][key] = value
                else:
                    processed["categorical_features"][key] = value
                    # Also store as text feature for text analysis
                    processed["text_features"][key] = value
            elif isinstance(value, (list, dict)):
                # Store as metadata for structural analysis
                processed["metadata"][key] = value
            else:
                processed["metadata"][key] = str(value)

        return processed

    def _generate_data_summary(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary statistics of the processed data."""
        summary = {"feature_counts": {}, "data_types": {}, "completeness": {}}

        for category, features in processed_data.items():
            if isinstance(features, dict):
                summary["feature_counts"][category] = len(features)
                summary["data_types"][category] = category

                # Calculate completeness
                non_empty_features = sum(
                    1 for v in features.values() if v is not None and v != ""
                )
                completeness = non_empty_features / len(features) if features else 0
                summary["completeness"][category] = completeness

        return summary

    def _detect_statistical_anomalies(
        self, processed_data: Dict[str, Any], sensitivity: str, algorithms: List[str]
    ) -> Dict[str, Any]:
        """Detect statistical anomalies using various algorithms."""
        statistical_results = {
            "algorithm_results": {},
            "detected_outliers": [],
            "statistical_measures": {},
        }

        numerical_features = processed_data.get("numerical_features", {})
        if not numerical_features:
            statistical_results["status"] = "insufficient_numerical_data"
            return statistical_results

        # Extract numerical values for analysis
        values = list(numerical_features.values())
        feature_names = list(numerical_features.keys())

        # Statistical Z-Score method
        if "statistical_z_score" in algorithms:
            z_score_results = self._apply_z_score_detection(
                values, feature_names, sensitivity
            )
            statistical_results["algorithm_results"]["z_score"] = z_score_results

        # Interquartile Range (IQR) method
        if "iqr" in algorithms:
            iqr_results = self._apply_iqr_detection(values, feature_names, sensitivity)
            statistical_results["algorithm_results"]["iqr"] = iqr_results

        # Isolation Forest (simplified implementation)
        if "isolation_forest" in algorithms:
            isolation_results = self._apply_isolation_forest_detection(
                values, feature_names, sensitivity
            )
            statistical_results["algorithm_results"][
                "isolation_forest"
            ] = isolation_results

        # Local Outlier Factor (simplified implementation)
        if "local_outlier_factor" in algorithms:
            lof_results = self._apply_lof_detection(values, feature_names, sensitivity)
            statistical_results["algorithm_results"][
                "local_outlier_factor"
            ] = lof_results

        # Aggregate outliers from all algorithms
        all_outliers = []
        for algorithm_name, results in statistical_results["algorithm_results"].items():
            if "outliers" in results:
                for outlier in results["outliers"]:
                    outlier["algorithm"] = algorithm_name
                    all_outliers.append(outlier)

        statistical_results["detected_outliers"] = all_outliers

        # Calculate statistical measures
        if values:
            statistical_results["statistical_measures"] = {
                "mean": sum(values) / len(values),
                "std_dev": self._calculate_std_dev(values),
                "min": min(values),
                "max": max(values),
                "median": self._calculate_median(values),
                "count": len(values),
            }

        return statistical_results

    def _detect_temporal_anomalies(
        self,
        processed_data: Dict[str, Any],
        time_window: int,
        baseline_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Detect temporal pattern anomalies."""
        temporal_results = {
            "time_series_anomalies": [],
            "pattern_breaks": [],
            "trend_anomalies": [],
            "seasonal_anomalies": [],
        }

        temporal_features = processed_data.get("temporal_features", {})
        if not temporal_features:
            temporal_results["status"] = "no_temporal_data"
            return temporal_results

        # Analyze temporal patterns
        for feature_name, timestamp_value in temporal_features.items():
            # Convert timestamp to datetime for analysis
            try:
                dt = self._parse_timestamp(timestamp_value)
                current_hour = dt.hour
                current_day = dt.weekday()

                # Check for unusual timing patterns
                if current_hour < 6 or current_hour > 22:  # Outside normal hours
                    temporal_results["time_series_anomalies"].append(
                        {
                            "type": "unusual_hour",
                            "feature": feature_name,
                            "value": timestamp_value,
                            "anomaly_score": 0.6,
                            "description": f"Activity detected at unusual hour: {current_hour}:00",
                        }
                    )

                # Weekend activity (potentially unusual for business applications)
                if current_day in [5, 6]:  # Saturday, Sunday
                    temporal_results["pattern_breaks"].append(
                        {
                            "type": "weekend_activity",
                            "feature": feature_name,
                            "value": timestamp_value,
                            "anomaly_score": 0.4,
                            "description": "Activity detected during weekend",
                        }
                    )

            except Exception as e:
                logger.warning(f"Could not parse timestamp {timestamp_value}: {str(e)}")

        # Compare with baseline if available
        if baseline_data and "temporal_features" in baseline_data:
            baseline_temporal = baseline_data["temporal_features"]
            temporal_comparison = self._compare_temporal_patterns(
                temporal_features, baseline_temporal
            )
            temporal_results["trend_anomalies"] = temporal_comparison

        return temporal_results

    def _detect_behavioral_anomalies(
        self, processed_data: Dict[str, Any], baseline_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect behavioral pattern anomalies."""
        behavioral_results = {
            "behavior_changes": [],
            "pattern_deviations": [],
            "frequency_anomalies": [],
        }

        numerical_features = processed_data.get("numerical_features", {})
        categorical_features = processed_data.get("categorical_features", {})

        # Analyze frequency patterns in categorical data
        for feature_name, feature_value in categorical_features.items():
            if feature_name in ["user_agent", "ip", "device_id"]:
                # Check for suspicious patterns
                if self._is_suspicious_pattern(feature_value):
                    behavioral_results["behavior_changes"].append(
                        {
                            "type": "suspicious_pattern",
                            "feature": feature_name,
                            "value": feature_value,
                            "anomaly_score": 0.7,
                            "description": f"Suspicious pattern detected in {feature_name}",
                        }
                    )

        # Analyze numerical behavior patterns
        for feature_name, feature_value in numerical_features.items():
            if feature_name in [
                "login_attempts",
                "failed_attempts",
                "session_duration",
            ]:
                # Check for unusual values
                if feature_name == "failed_attempts" and feature_value > 5:
                    behavioral_results["frequency_anomalies"].append(
                        {
                            "type": "excessive_failures",
                            "feature": feature_name,
                            "value": feature_value,
                            "anomaly_score": 0.8,
                            "description": f"Excessive failed attempts: {feature_value}",
                        }
                    )
                elif (
                    feature_name == "session_duration" and feature_value > 28800
                ):  # 8 hours
                    behavioral_results["frequency_anomalies"].append(
                        {
                            "type": "unusually_long_session",
                            "feature": feature_name,
                            "value": feature_value,
                            "anomaly_score": 0.5,
                            "description": f"Unusually long session: {feature_value} seconds",
                        }
                    )

        # Compare with baseline behavior if available
        if baseline_data:
            baseline_comparison = self._compare_behavioral_patterns(
                processed_data, baseline_data
            )
            behavioral_results["pattern_deviations"] = baseline_comparison

        return behavioral_results

    def _detect_contextual_anomalies(
        self, processed_data: Dict[str, Any], baseline_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect contextual anomalies based on relationships between features."""
        contextual_results = {
            "context_mismatches": [],
            "relationship_anomalies": [],
            "consistency_issues": [],
        }

        numerical_features = processed_data.get("numerical_features", {})
        categorical_features = processed_data.get("categorical_features", {})

        # Geographic context anomalies
        if "ip" in categorical_features and "location" in categorical_features:
            ip_location_mismatch = self._check_ip_location_consistency(
                categorical_features["ip"], categorical_features["location"]
            )
            if ip_location_mismatch:
                contextual_results["context_mismatches"].append(ip_location_mismatch)

        # Time-based context anomalies
        temporal_features = processed_data.get("temporal_features", {})
        if temporal_features and categorical_features:
            time_context_anomalies = self._check_time_context_consistency(
                temporal_features, categorical_features
            )
            contextual_results["consistency_issues"].extend(time_context_anomalies)

        # Device-behavior context anomalies
        if "device_type" in categorical_features and numerical_features:
            device_behavior_anomalies = self._check_device_behavior_consistency(
                categorical_features["device_type"], numerical_features
            )
            contextual_results["relationship_anomalies"].extend(
                device_behavior_anomalies
            )

        return contextual_results

    def _detect_network_anomalies(
        self, processed_data: Dict[str, Any], baseline_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect network and relationship-based anomalies."""
        network_results = {
            "connection_anomalies": [],
            "traffic_anomalies": [],
            "relationship_anomalies": [],
        }

        categorical_features = processed_data.get("categorical_features", {})
        numerical_features = processed_data.get("numerical_features", {})

        # IP address anomalies
        if "ip" in categorical_features:
            ip_anomalies = self._analyze_ip_anomalies(categorical_features["ip"])
            network_results["connection_anomalies"].extend(ip_anomalies)

        # Network traffic patterns
        if "bytes_transferred" in numerical_features:
            bytes_value = numerical_features["bytes_transferred"]
            if bytes_value > 1000000:  # Large data transfer
                network_results["traffic_anomalies"].append(
                    {
                        "type": "large_data_transfer",
                        "feature": "bytes_transferred",
                        "value": bytes_value,
                        "anomaly_score": 0.6,
                        "description": f"Large data transfer detected: {bytes_value} bytes",
                    }
                )

        # Connection frequency anomalies
        if "connection_count" in numerical_features:
            connection_count = numerical_features["connection_count"]
            if connection_count > 100:  # High connection frequency
                network_results["connection_anomalies"].append(
                    {
                        "type": "high_connection_frequency",
                        "feature": "connection_count",
                        "value": connection_count,
                        "anomaly_score": 0.7,
                        "description": f"High connection frequency: {connection_count} connections",
                    }
                )

        return network_results

    def _aggregate_anomalies(
        self, detection_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Aggregate all detected anomalies from different detection methods."""
        all_anomalies = []

        for detection_type, results in detection_results.items():
            if isinstance(results, dict):
                # Handle statistical anomalies
                if "detected_outliers" in results:
                    for outlier in results["detected_outliers"]:
                        outlier["detection_category"] = detection_type
                        all_anomalies.append(outlier)

                # Handle other anomaly types
                for key, anomaly_list in results.items():
                    if isinstance(anomaly_list, list) and key.endswith("anomalies"):
                        for anomaly in anomaly_list:
                            anomaly["detection_category"] = detection_type
                            anomaly["detection_subcategory"] = key
                            all_anomalies.append(anomaly)

        # Sort by anomaly score (highest first)
        all_anomalies.sort(key=lambda x: x.get("anomaly_score", 0), reverse=True)

        return all_anomalies

    def _calculate_ensemble_confidence(
        self, detection_results: Dict[str, Any], algorithms: List[str]
    ) -> Dict[str, Any]:
        """Calculate confidence scores using ensemble methods."""
        confidence = {
            "overall_confidence": 0.0,
            "algorithm_agreement": 0.0,
            "detection_consistency": 0.0,
            "reliability_score": 0.0,
        }

        # Count detections from each algorithm
        algorithm_detections = {}
        total_detections = 0

        for detection_type, results in detection_results.items():
            if isinstance(results, dict) and "algorithm_results" in results:
                for algorithm_name, algorithm_results in results[
                    "algorithm_results"
                ].items():
                    outlier_count = len(algorithm_results.get("outliers", []))
                    algorithm_detections[algorithm_name] = (
                        algorithm_detections.get(algorithm_name, 0) + outlier_count
                    )
                    total_detections += outlier_count

        # Calculate algorithm agreement
        if len(algorithm_detections) > 1:
            detection_values = list(algorithm_detections.values())
            mean_detections = sum(detection_values) / len(detection_values)
            variance = sum((x - mean_detections) ** 2 for x in detection_values) / len(
                detection_values
            )
            agreement = max(0, 1 - (variance / (mean_detections + 1)))
            confidence["algorithm_agreement"] = agreement

        # Overall confidence based on multiple factors
        base_confidence = min(
            total_detections / 10.0, 1.0
        )  # Scale based on detection count
        confidence["overall_confidence"] = (
            base_confidence + confidence["algorithm_agreement"]
        ) / 2

        # Detection consistency
        if total_detections > 0:
            confidence["detection_consistency"] = min(
                len(algorithm_detections) / len(algorithms), 1.0
            )

        # Reliability score combines all factors
        reliability_factors = [
            confidence["overall_confidence"],
            confidence["algorithm_agreement"],
            confidence["detection_consistency"],
        ]
        confidence["reliability_score"] = sum(reliability_factors) / len(
            reliability_factors
        )

        return confidence

    def _generate_anomaly_recommendations(
        self,
        anomalies: List[Dict[str, Any]],
        confidence_scores: Dict[str, Any],
        detection_type: str,
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on detected anomalies."""
        recommendations = []

        # High-confidence anomaly recommendations
        if confidence_scores.get("reliability_score", 0) > 0.7:
            high_score_anomalies = [
                a for a in anomalies if a.get("anomaly_score", 0) > 0.7
            ]
            if high_score_anomalies:
                recommendations.append(
                    {
                        "priority": "high",
                        "category": "security",
                        "action": "immediate_investigation",
                        "description": f"Investigate {len(high_score_anomalies)} high-confidence anomalies",
                        "affected_features": [
                            a.get("feature", "unknown")
                            for a in high_score_anomalies[:5]
                        ],
                    }
                )

        # Behavioral anomaly recommendations
        behavioral_anomalies = [
            a for a in anomalies if a.get("detection_category") == "behavioral"
        ]
        if behavioral_anomalies:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "monitoring",
                    "action": "enhanced_behavioral_monitoring",
                    "description": f"Monitor behavioral patterns - {len(behavioral_anomalies)} anomalies detected",
                    "implementation": "Increase monitoring frequency for behavioral indicators",
                }
            )

        # Temporal anomaly recommendations
        temporal_anomalies = [
            a for a in anomalies if a.get("detection_category") == "temporal"
        ]
        if temporal_anomalies:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "access_control",
                    "action": "time_based_restrictions",
                    "description": f"Review access patterns - {len(temporal_anomalies)} temporal anomalies",
                    "implementation": "Consider implementing time-based access controls",
                }
            )

        # Network anomaly recommendations
        network_anomalies = [
            a for a in anomalies if a.get("detection_category") == "network"
        ]
        if network_anomalies:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "network_security",
                    "action": "network_investigation",
                    "description": f"Investigate network activity - {len(network_anomalies)} network anomalies",
                    "implementation": "Review firewall logs and network traffic patterns",
                }
            )

        # General recommendations
        if len(anomalies) > 5:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "analysis",
                    "action": "comprehensive_review",
                    "description": f"Comprehensive review needed - {len(anomalies)} total anomalies detected",
                    "implementation": "Conduct thorough security assessment and update detection baselines",
                }
            )

        return recommendations

    def _calculate_overall_anomaly_score(
        self, anomalies: List[Dict[str, Any]], confidence_scores: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall anomaly score and risk assessment."""
        overall_assessment = {
            "anomaly_score": 0.0,
            "risk_level": "low",
            "confidence": "low",
            "total_anomalies": len(anomalies),
            "severity_distribution": {"low": 0, "medium": 0, "high": 0},
        }

        if not anomalies:
            return overall_assessment

        # Calculate weighted anomaly score
        weighted_scores = []
        for anomaly in anomalies:
            score = anomaly.get("anomaly_score", 0.0)
            # Weight by detection category importance
            category_weights = {
                "network": 1.2,
                "behavioral": 1.1,
                "contextual": 1.0,
                "temporal": 0.9,
                "statistical": 0.8,
            }
            category = anomaly.get("detection_category", "statistical")
            weighted_score = score * category_weights.get(category, 1.0)
            weighted_scores.append(weighted_score)

        # Calculate overall score
        if weighted_scores:
            overall_assessment["anomaly_score"] = min(
                sum(weighted_scores) / len(weighted_scores), 1.0
            )

        # Determine risk level
        anomaly_score = overall_assessment["anomaly_score"]
        if anomaly_score >= 0.8:
            overall_assessment["risk_level"] = "critical"
        elif anomaly_score >= 0.6:
            overall_assessment["risk_level"] = "high"
        elif anomaly_score >= 0.4:
            overall_assessment["risk_level"] = "medium"
        else:
            overall_assessment["risk_level"] = "low"

        # Set confidence based on reliability score
        reliability = confidence_scores.get("reliability_score", 0)
        if reliability >= 0.8:
            overall_assessment["confidence"] = "high"
        elif reliability >= 0.6:
            overall_assessment["confidence"] = "medium"
        else:
            overall_assessment["confidence"] = "low"

        # Count severity distribution
        for anomaly in anomalies:
            score = anomaly.get("anomaly_score", 0.0)
            if score >= 0.7:
                overall_assessment["severity_distribution"]["high"] += 1
            elif score >= 0.4:
                overall_assessment["severity_distribution"]["medium"] += 1
            else:
                overall_assessment["severity_distribution"]["low"] += 1

        return overall_assessment

    # Helper methods for statistical algorithms

    def _apply_z_score_detection(
        self, values: List[float], feature_names: List[str], sensitivity: str
    ) -> Dict[str, Any]:
        """Apply Z-score based outlier detection."""
        results = {"outliers": [], "parameters": {"method": "z_score"}}

        if len(values) < 3:
            results["status"] = "insufficient_data"
            return results

        mean = sum(values) / len(values)
        std_dev = self._calculate_std_dev(values)

        if std_dev == 0:
            results["status"] = "no_variance"
            return results

        # Set threshold based on sensitivity
        thresholds = {"low": 3.0, "medium": 2.5, "high": 2.0}
        threshold = thresholds.get(sensitivity, 2.5)

        for i, value in enumerate(values):
            z_score = abs((value - mean) / std_dev)
            if z_score > threshold:
                feature_name = (
                    feature_names[i] if i < len(feature_names) else f"feature_{i}"
                )
                results["outliers"].append(
                    {
                        "type": "statistical_outlier",
                        "feature": feature_name,
                        "value": value,
                        "z_score": z_score,
                        "anomaly_score": min(z_score / 5.0, 1.0),
                        "description": f"Statistical outlier (Z-score: {z_score:.2f})",
                    }
                )

        results["parameters"]["threshold"] = threshold
        results["parameters"]["mean"] = mean
        results["parameters"]["std_dev"] = std_dev

        return results

    def _apply_iqr_detection(
        self, values: List[float], feature_names: List[str], sensitivity: str
    ) -> Dict[str, Any]:
        """Apply Interquartile Range based outlier detection."""
        results = {"outliers": [], "parameters": {"method": "iqr"}}

        if len(values) < 4:
            results["status"] = "insufficient_data"
            return results

        sorted_values = sorted(values)
        n = len(sorted_values)

        q1_idx = n // 4
        q3_idx = 3 * n // 4
        q1 = sorted_values[q1_idx]
        q3 = sorted_values[q3_idx]
        iqr = q3 - q1

        if iqr == 0:
            results["status"] = "no_variance"
            return results

        # Set multiplier based on sensitivity
        multipliers = {"low": 3.0, "medium": 1.5, "high": 1.0}
        multiplier = multipliers.get(sensitivity, 1.5)

        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr

        for i, value in enumerate(values):
            if value < lower_bound or value > upper_bound:
                feature_name = (
                    feature_names[i] if i < len(feature_names) else f"feature_{i}"
                )
                distance = max(lower_bound - value, value - upper_bound, 0)
                anomaly_score = min(distance / (iqr + 1), 1.0)

                results["outliers"].append(
                    {
                        "type": "iqr_outlier",
                        "feature": feature_name,
                        "value": value,
                        "anomaly_score": anomaly_score,
                        "description": f"IQR outlier (bounds: {lower_bound:.2f} - {upper_bound:.2f})",
                    }
                )

        results["parameters"]["q1"] = q1
        results["parameters"]["q3"] = q3
        results["parameters"]["iqr"] = iqr
        results["parameters"]["multiplier"] = multiplier

        return results

    def _apply_isolation_forest_detection(
        self, values: List[float], feature_names: List[str], sensitivity: str
    ) -> Dict[str, Any]:
        """Apply simplified Isolation Forest detection."""
        results = {"outliers": [], "parameters": {"method": "isolation_forest"}}

        if len(values) < 10:
            results["status"] = "insufficient_data_for_isolation_forest"
            return results

        # Simplified implementation - use statistical approach as approximation
        mean = sum(values) / len(values)
        std_dev = self._calculate_std_dev(values)

        # Create isolation scores based on distance from mean
        isolation_scores = []
        for value in values:
            if std_dev > 0:
                normalized_distance = abs(value - mean) / std_dev
                # Convert to isolation score (0 = normal, 1 = anomalous)
                isolation_score = min(normalized_distance / 3.0, 1.0)
            else:
                isolation_score = 0.0
            isolation_scores.append(isolation_score)

        # Set threshold based on sensitivity
        thresholds = {"low": 0.8, "medium": 0.6, "high": 0.4}
        threshold = thresholds.get(sensitivity, 0.6)

        for i, (value, score) in enumerate(zip(values, isolation_scores)):
            if score > threshold:
                feature_name = (
                    feature_names[i] if i < len(feature_names) else f"feature_{i}"
                )
                results["outliers"].append(
                    {
                        "type": "isolation_outlier",
                        "feature": feature_name,
                        "value": value,
                        "isolation_score": score,
                        "anomaly_score": score,
                        "description": f"Isolation Forest outlier (score: {score:.2f})",
                    }
                )

        results["parameters"]["threshold"] = threshold
        return results

    def _apply_lof_detection(
        self, values: List[float], feature_names: List[str], sensitivity: str
    ) -> Dict[str, Any]:
        """Apply simplified Local Outlier Factor detection."""
        results = {"outliers": [], "parameters": {"method": "local_outlier_factor"}}

        if len(values) < 5:
            results["status"] = "insufficient_data_for_lof"
            return results

        # Simplified LOF implementation using local density estimation
        k = min(3, len(values) - 1)  # Number of neighbors
        lof_scores = []

        for i, value in enumerate(values):
            # Calculate distances to k nearest neighbors
            distances = []
            for j, other_value in enumerate(values):
                if i != j:
                    distances.append(abs(value - other_value))

            distances.sort()
            k_distance = distances[k - 1] if len(distances) >= k else distances[-1]

            # Calculate local density (simplified)
            if k_distance > 0:
                local_density = 1.0 / (k_distance + 1)
            else:
                local_density = float("inf")

            # Calculate LOF score (simplified)
            neighbor_densities = []
            for j in range(min(k, len(distances))):
                neighbor_distance = distances[j]
                if neighbor_distance > 0:
                    neighbor_densities.append(1.0 / (neighbor_distance + 1))
                else:
                    neighbor_densities.append(float("inf"))

            if neighbor_densities and local_density != float("inf"):
                avg_neighbor_density = sum(neighbor_densities) / len(neighbor_densities)
                if avg_neighbor_density > 0:
                    lof_score = avg_neighbor_density / local_density
                else:
                    lof_score = 1.0
            else:
                lof_score = 1.0

            lof_scores.append(lof_score)

        # Set threshold based on sensitivity
        thresholds = {"low": 2.0, "medium": 1.5, "high": 1.2}
        threshold = thresholds.get(sensitivity, 1.5)

        for i, (value, lof_score) in enumerate(zip(values, lof_scores)):
            if lof_score > threshold:
                feature_name = (
                    feature_names[i] if i < len(feature_names) else f"feature_{i}"
                )
                anomaly_score = min((lof_score - 1.0) / 2.0, 1.0)

                results["outliers"].append(
                    {
                        "type": "lof_outlier",
                        "feature": feature_name,
                        "value": value,
                        "lof_score": lof_score,
                        "anomaly_score": anomaly_score,
                        "description": f"Local Outlier Factor outlier (LOF: {lof_score:.2f})",
                    }
                )

        results["parameters"]["threshold"] = threshold
        results["parameters"]["k_neighbors"] = k

        return results

    # Helper utility methods

    def _calculate_std_dev(self, values: List[float]) -> float:
        """Calculate standard deviation."""
        if len(values) < 2:
            return 0.0

        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)

    def _calculate_median(self, values: List[float]) -> float:
        """Calculate median value."""
        sorted_values = sorted(values)
        n = len(sorted_values)
        if n % 2 == 0:
            return (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
        else:
            return sorted_values[n // 2]

    def _is_timestamp(self, value: str) -> bool:
        """Check if a string value is a timestamp."""
        timestamp_indicators = ["T", ":", "-", "Z", "+"]
        return (
            any(indicator in value for indicator in timestamp_indicators)
            and len(value) > 10
        )

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string to datetime object."""
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue

        # If no format matches, try to extract just the date/time components
        raise ValueError(f"Unable to parse timestamp: {timestamp_str}")

    def _is_suspicious_pattern(self, value: str) -> bool:
        """Check if a value contains suspicious patterns."""
        suspicious_patterns = [
            "bot",
            "crawler",
            "spider",
            "automated",
            "test",
            "script",
            "tool",
            "proxy",
            "vpn",
            "tor",
            "anonymous",
        ]
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in suspicious_patterns)

    def _compare_temporal_patterns(
        self, current: Dict[str, str], baseline: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Compare current temporal patterns with baseline."""
        anomalies = []

        # This is a simplified comparison
        # In a real implementation, this would involve more sophisticated time series analysis
        current_count = len(current)
        baseline_count = len(baseline)

        if current_count > baseline_count * 2:
            anomalies.append(
                {
                    "type": "increased_activity",
                    "anomaly_score": 0.6,
                    "description": f"Activity increased from {baseline_count} to {current_count}",
                }
            )
        elif current_count < baseline_count * 0.5:
            anomalies.append(
                {
                    "type": "decreased_activity",
                    "anomaly_score": 0.4,
                    "description": f"Activity decreased from {baseline_count} to {current_count}",
                }
            )

        return anomalies

    def _compare_behavioral_patterns(
        self, current: Dict[str, Any], baseline: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Compare current behavioral patterns with baseline."""
        deviations = []

        # Compare numerical features
        current_numerical = current.get("numerical_features", {})
        baseline_numerical = baseline.get("numerical_features", {})

        for feature_name in current_numerical:
            if feature_name in baseline_numerical:
                current_value = current_numerical[feature_name]
                baseline_value = baseline_numerical[feature_name]

                if baseline_value > 0:
                    deviation_ratio = (
                        abs(current_value - baseline_value) / baseline_value
                    )
                    if deviation_ratio > 0.5:  # 50% deviation threshold
                        deviations.append(
                            {
                                "type": "behavioral_deviation",
                                "feature": feature_name,
                                "current_value": current_value,
                                "baseline_value": baseline_value,
                                "deviation_ratio": deviation_ratio,
                                "anomaly_score": min(deviation_ratio, 1.0),
                                "description": f"{feature_name} deviated by {deviation_ratio:.1%} from baseline",
                            }
                        )

        return deviations

    def _check_ip_location_consistency(
        self, ip: str, location: str
    ) -> Optional[Dict[str, Any]]:
        """Check consistency between IP address and claimed location."""
        # This is a placeholder for actual geolocation checking
        # In a real implementation, this would use IP geolocation services

        # For demonstration, flag certain patterns as suspicious
        if "vpn" in ip.lower() or "proxy" in location.lower():
            return {
                "type": "ip_location_mismatch",
                "feature": "ip_location_consistency",
                "anomaly_score": 0.8,
                "description": "Potential VPN/Proxy usage detected",
                "ip": ip,
                "claimed_location": location,
            }

        return None

    def _check_time_context_consistency(
        self, temporal_features: Dict[str, str], categorical_features: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Check consistency between time and contextual data."""
        anomalies = []

        # Check for business hours consistency with location
        for time_feature, timestamp_value in temporal_features.items():
            try:
                dt = self._parse_timestamp(timestamp_value)
                hour = dt.hour

                # If location suggests a timezone where this would be unusual hours
                location = categorical_features.get("location", "")
                if "asia" in location.lower() and 2 <= hour <= 5:  # Very early morning
                    anomalies.append(
                        {
                            "type": "unusual_time_location",
                            "feature": time_feature,
                            "anomaly_score": 0.5,
                            "description": f"Activity at {hour}:00 unusual for {location}",
                            "timestamp": timestamp_value,
                            "location": location,
                        }
                    )
            except:
                continue

        return anomalies

    def _check_device_behavior_consistency(
        self, device_type: str, numerical_features: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Check consistency between device type and behavioral patterns."""
        anomalies = []

        # Mobile devices with very long sessions might be suspicious
        if "mobile" in device_type.lower() and "session_duration" in numerical_features:
            session_duration = numerical_features["session_duration"]
            if session_duration > 14400:  # 4 hours for mobile
                anomalies.append(
                    {
                        "type": "device_behavior_mismatch",
                        "feature": "session_duration",
                        "device_type": device_type,
                        "value": session_duration,
                        "anomaly_score": 0.6,
                        "description": f"Unusually long session ({session_duration}s) for mobile device",
                    }
                )

        return anomalies

    def _analyze_ip_anomalies(self, ip: str) -> List[Dict[str, Any]]:
        """Analyze IP address for potential anomalies."""
        anomalies = []

        # Check for suspicious IP patterns
        suspicious_indicators = ["10.0.0.", "192.168.", "127.0.0.", "169.254."]
        for indicator in suspicious_indicators:
            if ip.startswith(indicator):
                anomalies.append(
                    {
                        "type": "private_ip_usage",
                        "feature": "ip",
                        "value": ip,
                        "anomaly_score": 0.3,
                        "description": f"Private/internal IP address detected: {ip}",
                    }
                )
                break

        # Check for known suspicious patterns
        if any(pattern in ip.lower() for pattern in ["unknown", "null", "0.0.0.0"]):
            anomalies.append(
                {
                    "type": "invalid_ip",
                    "feature": "ip",
                    "value": ip,
                    "anomaly_score": 0.7,
                    "description": f"Invalid or suspicious IP address: {ip}",
                }
            )

        return anomalies

    async def _arun(self, **kwargs: Any) -> str:
        """Async version of the run method."""
        return self._run(**kwargs)
