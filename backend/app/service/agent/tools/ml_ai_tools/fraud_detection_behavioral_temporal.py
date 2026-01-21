"""
Fraud Detection Behavioral Temporal Analysis

Implements temporal behavior pattern analysis for fraud detection.
"""

from typing import Any, Dict, List, Optional


class FraudBehavioralTemporalAnalysis:
    """Temporal behavior pattern analysis for fraud detection."""

    @staticmethod
    def analyze_temporal_behavior(
        temporal_features: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]],
        historical_data: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Analyze temporal behavior patterns."""
        anomalies = []

        # Extract time information
        for field, value in temporal_features.items():
            if isinstance(value, str):
                try:
                    if ":" in value:
                        time_parts = value.split(":")
                        if len(time_parts) >= 2:
                            hour = int(time_parts[0])

                            # Unusual hours
                            if hour < 6 or hour > 22:
                                anomalies.append(
                                    {
                                        "type": "behavioral_unusual_time",
                                        "hour": hour,
                                        "time_value": value,
                                        "severity_score": 0.4,
                                        "description": f"Activity at unusual hour: {hour}:xx",
                                    }
                                )
                except:
                    continue

        # Check against user profile
        if user_profile:
            typical_hours = user_profile.get(
                "typical_activity_hours", [9, 10, 11, 12, 13, 14, 15, 16, 17]
            )

            for field, value in temporal_features.items():
                if isinstance(value, str) and ":" in value:
                    try:
                        hour = int(value.split(":")[0])
                        if hour not in typical_hours:
                            anomalies.append(
                                {
                                    "type": "behavioral_atypical_time",
                                    "hour": hour,
                                    "typical_hours": typical_hours,
                                    "severity_score": 0.5,
                                    "description": f"Activity outside typical hours: {hour}:xx",
                                }
                            )
                    except:
                        continue

        return anomalies
