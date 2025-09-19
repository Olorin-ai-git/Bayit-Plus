"""Device Fingerprint Agent implementation."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..clients.splunk_client import SplunkClient
from ..clients.tmx_client import TMXClient
from ..interfaces import DeviceFingerprintAgent, RiskAssessment
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class DeviceContext:
    tmx_client: TMXClient
    splunk_client: SplunkClient
    config: Dict[str, Any]


class DeviceFingerprintAgentImpl(Agent[DeviceContext]):
    """Implementation of DeviceFingerprintAgent."""

    def __init__(
        self,
        tmx_client: TMXClient,
        splunk_client: SplunkClient,
        config: Dict[str, Any],
    ):
        self.tmx_client = tmx_client
        self.splunk_client = splunk_client
        self.config = config

        # Configure thresholds
        self.device_change_threshold = config.get(
            "device_change_threshold", 3
        )  # Max device changes per day
        self.browser_change_threshold = config.get(
            "browser_change_threshold", 2
        )  # Max browser changes per day

        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing DeviceFingerprintAgent")

        super().__init__(
            name="DeviceFingerprintAgent",
            instructions="""I am a device fingerprint agent that can help you analyze device patterns.
            I can:
            1. Get device information
            2. Analyze device patterns
            3. Detect device anomalies
            4. Monitor device changes
            5. Track browser fingerprints
            
            When analyzing devices:
            1. Check for device spoofing
            2. Monitor rapid device changes
            3. Analyze browser patterns
            4. Identify potential device-based attacks""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize connections to all data sources."""
        logger.info("Initializing DeviceFingerprintAgent...")

        await self.tmx_client.connect()
        await self.splunk_client.connect()

        logger.info("DeviceFingerprintAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down DeviceFingerprintAgent...")

        await self.tmx_client.disconnect()
        await self.splunk_client.disconnect()

        logger.info("DeviceFingerprintAgent shut down successfully")

    async def get_device_info(self, user_id: str) -> Dict[str, Any]:
        """Get current device information for a user from REAL data sources: TMX, Splunk, and Snowflake."""
        logger.info(f"Getting device info for user_id: {user_id}")

        try:
            # Initialize aggregated device info
            device_info = {
                "device_id": "Unknown",
                "device_type": "Unknown", 
                "user_agent": "",
                "device_fingerprint": "",
                "ip_address": "",
                "location": "",
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "proxy_risk_score": 0.0,
                "risk_level": "LOW",
                "data_sources": []
            }

            # 1. Get device fingerprint from TMX client
            try:
                tmx_fingerprint = await self.tmx_client.get_device_fingerprint(user_id)
                if tmx_fingerprint and isinstance(tmx_fingerprint, dict):
                    device_info.update({
                        "device_fingerprint": tmx_fingerprint.get("fingerprint", device_info["device_fingerprint"]),
                        "tmx_device_id": tmx_fingerprint.get("device_id", ""),
                        "tmx_risk_score": tmx_fingerprint.get("risk_score", 0.0),
                        "tmx_confidence": tmx_fingerprint.get("confidence", 0.0)
                    })
                    device_info["data_sources"].append("TMX")
                    logger.info(f"Retrieved device fingerprint from TMX for user_id: {user_id}")
            except Exception as e:
                logger.debug(f"TMX fingerprint retrieval failed for {user_id}: {str(e)}")

            # 2. Get device activity from Splunk logs
            try:
                splunk_device_logs = await self.splunk_client.search_device_logs(user_id)
                if splunk_device_logs and isinstance(splunk_device_logs, list):
                    # Extract most recent device activity from logs
                    recent_logs = splunk_device_logs[:5]  # Get 5 most recent logs
                    device_activities = [log.get("device_info", {}) for log in recent_logs if log.get("device_info")]
                    
                    if device_activities:
                        latest_activity = device_activities[0]
                        device_info.update({
                            "user_agent": latest_activity.get("user_agent", device_info["user_agent"]),
                            "splunk_device_count": len(set(act.get("device_id") for act in device_activities if act.get("device_id"))),
                            "splunk_activity_score": sum(act.get("risk_score", 0.0) for act in device_activities) / len(device_activities)
                        })
                        device_info["data_sources"].append("Splunk")
                        logger.info(f"Retrieved device activity from Splunk for user_id: {user_id}")
            except Exception as e:
                logger.debug(f"Splunk device logs retrieval failed for {user_id}: {str(e)}")

            # 3. Get comprehensive transaction device data from Snowflake
            try:
                from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
                
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for latest device information for this user
                device_query = f"""
                SELECT DISTINCT 
                    DEVICE_ID,
                    DEVICE_TYPE,
                    USER_AGENT,
                    DEVICE_FINGERPRINT,
                    IP,
                    IP_COUNTRY_CODE,
                    IP_CITY,
                    TX_DATETIME as LAST_SEEN,
                    PROXY_RISK_SCORE,
                    MODEL_SCORE
                FROM TRANSACTIONS_ENRICHED 
                WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                ORDER BY TX_DATETIME DESC
                LIMIT 5
                """
                
                device_results = await snowflake_client.execute_query(device_query)
                await snowflake_client.disconnect()
                
                if device_results:
                    # Process the most recent device info from Snowflake
                    latest_device = device_results[0]
                    
                    device_info.update({
                        "device_id": latest_device.get('DEVICE_ID', device_info["device_id"]),
                        "device_type": latest_device.get('DEVICE_TYPE', device_info["device_type"]),
                        "user_agent": latest_device.get('USER_AGENT', device_info["user_agent"]),
                        "device_fingerprint": latest_device.get('DEVICE_FINGERPRINT', device_info.get("device_fingerprint", "")),
                        "ip_address": latest_device.get('IP', ''),
                        "location": f"{latest_device.get('IP_CITY', '')}, {latest_device.get('IP_COUNTRY_CODE', '')}",
                        "last_seen": latest_device.get('LAST_SEEN', device_info["last_seen"]),
                        "proxy_risk_score": latest_device.get('PROXY_RISK_SCORE', 0.0),
                        "snowflake_model_score": latest_device.get('MODEL_SCORE', 0.0),
                        "total_devices_found": len(device_results),
                        "device_list": [d.get('DEVICE_ID', 'Unknown') for d in device_results]
                    })
                    device_info["data_sources"].append("Snowflake")
                    logger.info(f"Retrieved device data from Snowflake for user_id: {user_id} - Found {len(device_results)} device records")
            except Exception as e:
                logger.debug(f"Snowflake device data retrieval failed for {user_id}: {str(e)}")

            # 4. Calculate aggregated risk level from ALL REAL data sources
            risk_scores = []
            if "tmx_risk_score" in device_info and device_info["tmx_risk_score"]:
                risk_scores.append(device_info["tmx_risk_score"])
            if "splunk_activity_score" in device_info and device_info["splunk_activity_score"]:
                risk_scores.append(device_info["splunk_activity_score"])
            if device_info["proxy_risk_score"]:
                risk_scores.append(device_info["proxy_risk_score"])
            if "snowflake_model_score" in device_info and device_info["snowflake_model_score"]:
                risk_scores.append(device_info["snowflake_model_score"])

            if risk_scores:
                avg_risk = sum(risk_scores) / len(risk_scores)
                max_risk = max(risk_scores)
                # Use weighted average favoring the highest risk
                calculated_risk = (avg_risk * 0.6) + (max_risk * 0.4)
                device_info["aggregated_risk_score"] = calculated_risk
                device_info["risk_level"] = "HIGH" if calculated_risk > 0.7 else "MEDIUM" if calculated_risk > 0.3 else "LOW"
            else:
                device_info["risk_level"] = "UNKNOWN"
                device_info["reason"] = "No risk data available from any source"

            # Add data source summary
            device_info["data_source_count"] = len(device_info["data_sources"])
            device_info["primary_data_sources"] = ", ".join(device_info["data_sources"]) if device_info["data_sources"] else "No sources available"

            logger.info(f"Successfully retrieved REAL device info from {device_info['data_source_count']} sources for user_id: {user_id}")
            return device_info

        except Exception as e:
            logger.error(f"Error getting device info for {user_id}: {str(e)}")
            # Return error info instead of raising to prevent agent failure
            return {
                "device_id": "Error",
                "device_type": "Error", 
                "risk_level": "ERROR",
                "error": str(e),
                "reason": "Device data retrieval failed",
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "data_sources": []
            }

    async def analyze_device_patterns(
        self, user_id: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Analyze device usage patterns over time using real Snowflake data."""
        logger.info(f"Analyzing device patterns for user_id: {user_id} over last {days} days")

        try:
            # Get device patterns from Snowflake
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            snowflake_client = SnowflakeClient()
            await snowflake_client.connect()
            
            # Query for device pattern analysis over time window
            patterns_query = f"""
            SELECT 
                TX_DATETIME as timestamp,
                DEVICE_ID,
                DEVICE_TYPE,
                USER_AGENT,
                DEVICE_FINGERPRINT,
                IP,
                IP_COUNTRY_CODE,
                IP_CITY,
                PAID_AMOUNT_VALUE,
                MODEL_SCORE,
                PROXY_RISK_SCORE,
                IS_FRAUD_TX
            FROM TRANSACTIONS_ENRICHED 
            WHERE (EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}')
                AND TX_DATETIME >= DATEADD(day, -{days}, CURRENT_TIMESTAMP())
            ORDER BY TX_DATETIME DESC
            LIMIT 100
            """
            
            pattern_results = await snowflake_client.execute_query(patterns_query)
            await snowflake_client.disconnect()
            
            if not pattern_results:
                logger.warning(f"No device pattern data found for user_id: {user_id}")
                return [{
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "device_id": "Unknown",
                    "device_type": "Unknown",
                    "reason": "No device pattern data available",
                    "risk_level": "MEDIUM"
                }]
            
            # Process real device patterns
            patterns = []
            for result in pattern_results:
                pattern = {
                    "timestamp": result.get('TIMESTAMP', datetime.now(timezone.utc)).isoformat(),
                    "device_id": result.get('DEVICE_ID', 'Unknown'),
                    "device_type": result.get('DEVICE_TYPE', 'Unknown'),
                    "user_agent": result.get('USER_AGENT', ''),
                    "device_fingerprint": result.get('DEVICE_FINGERPRINT', ''),
                    "location": f"{result.get('IP_CITY', '')}, {result.get('IP_COUNTRY_CODE', '')}",
                    "ip_address": result.get('IP', ''),
                    "transaction_amount": result.get('PAID_AMOUNT_VALUE', 0.0),
                    "fraud_score": result.get('MODEL_SCORE', 0.0),
                    "proxy_risk_score": result.get('PROXY_RISK_SCORE', 0.0),
                    "is_fraud": result.get('IS_FRAUD_TX', 0) == 1,
                    "risk_level": "HIGH" if result.get('MODEL_SCORE', 0) > 0.7 else "MEDIUM" if result.get('MODEL_SCORE', 0) > 0.3 else "LOW"
                }
                patterns.append(pattern)

            logger.info(f"Successfully analyzed REAL device patterns for user_id: {user_id} - Found {len(patterns)} patterns")
            return patterns

        except Exception as e:
            logger.error(f"Error analyzing device patterns for {user_id}: {str(e)}")
            return [{
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "device_id": "Error",
                "device_type": "Error",
                "error": str(e),
                "reason": "Device pattern analysis failed",
                "risk_level": "MEDIUM"
            }]

    async def detect_device_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious device activity using real transaction data."""
        logger.info(f"Detecting device anomalies for user_id: {user_id}")

        try:
            # Get real device patterns from Snowflake
            patterns = await self.analyze_device_patterns(user_id)

            if not patterns or patterns[0].get('error'):
                logger.warning(f"No device patterns available for anomaly detection: {user_id}")
                return []

            # Real anomaly detection based on actual transaction data
            anomalies = []
            current_time = datetime.now(timezone.utc)

            # Device change anomaly - analyze actual device_id patterns
            unique_devices = set(p.get("device_id", "Unknown") for p in patterns if p.get("device_id") != "Unknown")
            if len(unique_devices) > self.device_change_threshold:
                high_fraud_devices = [p for p in patterns if p.get("is_fraud", False)]
                fraud_rate = len(high_fraud_devices) / len(patterns) if patterns else 0
                device_excess_ratio = len(unique_devices) / max(self.device_change_threshold, 1)
                
                # Calculate risk level based on REAL data metrics
                risk_level = min(0.95, 0.5 + (fraud_rate * 0.4) + (min(device_excess_ratio - 1, 2) * 0.2))
                
                # Calculate confidence based on data quality and volume
                data_volume_factor = min(len(patterns) / 10, 1.0)  # More data = higher confidence
                device_diversity_factor = min(len(unique_devices) / 5, 1.0)  # More devices = higher confidence
                calculated_confidence = 0.5 + (data_volume_factor * 0.3) + (device_diversity_factor * 0.2)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"Multiple devices detected: {len(unique_devices)} devices",
                            f"Device IDs: {', '.join(list(unique_devices)[:5])}{'...' if len(unique_devices) > 5 else ''}",
                            f"Exceeds device change threshold ({self.device_change_threshold})",
                            f"Fraud rate: {fraud_rate:.1%} ({len(high_fraud_devices)}/{len(patterns)} transactions)"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # User agent change anomaly - analyze actual user_agent patterns
            unique_user_agents = set(p.get("user_agent", "Unknown")[:50] for p in patterns if p.get("user_agent"))  # Limit to first 50 chars
            if len(unique_user_agents) > self.browser_change_threshold:
                user_agent_excess_ratio = len(unique_user_agents) / max(self.browser_change_threshold, 1)
                fraud_with_ua_changes = [p for p in patterns if p.get("is_fraud", False) and p.get("user_agent")]
                ua_fraud_rate = len(fraud_with_ua_changes) / len(patterns) if patterns else 0
                
                # Calculate risk level based on REAL user agent analysis
                risk_level = min(0.9, 0.4 + (ua_fraud_rate * 0.3) + (min(user_agent_excess_ratio - 1, 3) * 0.15))
                
                # Calculate confidence based on user agent analysis quality
                ua_data_quality = len([p for p in patterns if p.get("user_agent") and len(p.get("user_agent", "")) > 10]) / len(patterns)
                calculated_confidence = 0.4 + (ua_data_quality * 0.4) + (min(len(unique_user_agents) / 5, 1.0) * 0.2)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"Multiple user agents detected: {len(unique_user_agents)} variants",
                            f"User agent changes exceed threshold ({self.browser_change_threshold})",
                            f"User agent fraud correlation: {ua_fraud_rate:.1%}",
                            "Browser/device spoofing pattern detected" if ua_fraud_rate > 0.2 else "User agent inconsistency detected"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # Location mismatch anomaly - analyze actual IP location patterns
            locations = set(p.get("location", "Unknown, Unknown") for p in patterns if p.get("location") and p.get("location") != ", ")
            if len(locations) > 2:
                # Check for impossible travel (rapid location changes)
                location_times = [(p.get("location"), p.get("timestamp")) for p in patterns if p.get("location") and p.get("timestamp")]
                rapid_changes = len(location_times) > 1 and len(set(loc for loc, _ in location_times)) > 2
                
                # Calculate risk level based on location analysis
                location_fraud_patterns = [p for p in patterns if p.get("is_fraud", False) and p.get("location")]
                location_fraud_rate = len(location_fraud_patterns) / len(patterns) if patterns else 0
                location_diversity_factor = min(len(locations) / 5, 1.0)
                risk_level = min(0.95, 0.4 + (location_fraud_rate * 0.3) + (location_diversity_factor * 0.25) + (0.2 if rapid_changes else 0))
                
                # Calculate confidence based on location data quality
                valid_locations = [loc for loc in locations if loc and "Unknown" not in loc and ", " in loc]
                location_data_quality = len(valid_locations) / max(len(locations), 1)
                temporal_data_quality = len(location_times) / max(len(patterns), 1)
                calculated_confidence = 0.3 + (location_data_quality * 0.4) + (temporal_data_quality * 0.3)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"Multiple geographic locations: {len(locations)} locations",
                            f'Locations: {", ".join(list(valid_locations)[:3])}{"..." if len(locations) > 3 else ""}',
                            f"Location fraud correlation: {location_fraud_rate:.1%}",
                            "Rapid geographic changes detected" if rapid_changes else "Geographic inconsistency detected",
                            "Possible device/location spoofing" if location_fraud_rate > 0.3 else "Location pattern anomaly"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # High-risk proxy/VPN detection anomaly
            high_proxy_risk_patterns = [p for p in patterns if p.get("proxy_risk_score", 0.0) > 0.7]
            if high_proxy_risk_patterns:
                avg_proxy_score = sum(p.get("proxy_risk_score", 0.0) for p in high_proxy_risk_patterns) / len(high_proxy_risk_patterns)
                proxy_coverage_ratio = len(high_proxy_risk_patterns) / len(patterns)
                proxy_fraud_correlation = len([p for p in high_proxy_risk_patterns if p.get("is_fraud", False)]) / len(high_proxy_risk_patterns)
                
                # Calculate risk level based on REAL proxy analysis
                risk_level = min(0.95, avg_proxy_score + (proxy_coverage_ratio * 0.2) + (proxy_fraud_correlation * 0.15))
                
                # Calculate confidence based on proxy data quality and volume
                proxy_data_completeness = len([p for p in patterns if "proxy_risk_score" in p and p.get("proxy_risk_score") is not None]) / len(patterns)
                proxy_score_distribution = len(set(p.get("proxy_risk_score", 0.0) for p in patterns)) / max(len(patterns), 1)
                calculated_confidence = 0.4 + (proxy_data_completeness * 0.3) + (min(proxy_score_distribution, 1.0) * 0.3)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"High proxy/VPN risk detected: {len(high_proxy_risk_patterns)} of {len(patterns)} transactions",
                            f"Average proxy risk score: {avg_proxy_score:.3f}",
                            f"Proxy coverage ratio: {proxy_coverage_ratio:.1%}",
                            f"Proxy-fraud correlation: {proxy_fraud_correlation:.1%}",
                            "Connection anonymization infrastructure detected"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # Fraud pattern correlation anomaly
            fraud_patterns = [p for p in patterns if p.get("is_fraud", False)]
            if fraud_patterns:
                fraud_rate = len(fraud_patterns) / len(patterns)
                if fraud_rate > 0.3:  # More than 30% fraud transactions
                    # Analyze fraud pattern consistency and timing
                    fraud_scores = [p.get("fraud_score", 0.0) for p in fraud_patterns if p.get("fraud_score")]
                    avg_fraud_score = sum(fraud_scores) / len(fraud_scores) if fraud_scores else fraud_rate
                    fraud_score_consistency = 1.0 - (len(set(fraud_scores)) / max(len(fraud_scores), 1)) if fraud_scores else 0.5
                    
                    # Calculate risk level based on REAL fraud analysis
                    risk_level = min(0.95, 0.5 + (fraud_rate * 0.35) + (avg_fraud_score * 0.1))
                    
                    # Calculate confidence based on fraud data quality
                    fraud_data_completeness = len([p for p in fraud_patterns if p.get("fraud_score") is not None]) / len(fraud_patterns)
                    pattern_volume_factor = min(len(fraud_patterns) / 5, 1.0)
                    calculated_confidence = 0.5 + (fraud_data_completeness * 0.25) + (fraud_score_consistency * 0.15) + (pattern_volume_factor * 0.1)
                    
                    anomalies.append(
                        RiskAssessment(
                            risk_level=risk_level,
                            risk_factors=[
                                f"High fraud correlation: {fraud_rate:.1%} fraud rate",
                                f"Fraud transactions: {len(fraud_patterns)} of {len(patterns)} total",
                                f"Average fraud score: {avg_fraud_score:.3f}",
                                f"Fraud pattern consistency: {fraud_score_consistency:.2f}",
                                "Device associated with confirmed fraud patterns"
                            ],
                            confidence=calculated_confidence,
                            timestamp=current_time,
                            source="DeviceFingerprintAgent",
                        )
                    )

            logger.info(f"Successfully detected {len(anomalies)} REAL device anomalies for user_id: {user_id}")
            return anomalies

        except Exception as e:
            logger.error(f"Error detecting device anomalies for {user_id}: {str(e)}")
            # Return empty list instead of raising to prevent investigation failure
            return []
