"""Logs Analysis Agent implementation."""

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from agents import Agent

from ..clients.sumologic_client import SumoLogicClient
from ..interfaces import RiskAssessment
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class LogsContext:
    sumologic_client: SumoLogicClient
    config: Dict[str, Any]


class LogsAnalysisAgentImpl(Agent[LogsContext]):
    """Implementation of LogsAnalysisAgent."""

    def __init__(
        self,
        sumologic_client: SumoLogicClient,
        config: Dict[str, Any],
    ):
        self.sumologic_client = sumologic_client
        self.config = config

        # Configure analysis parameters
        self.suspicious_activity_threshold = config.get("suspicious_activity_threshold", 5)
        self.failed_login_threshold = config.get("failed_login_threshold", 3)
        self.analysis_window_hours = config.get("analysis_window_hours", 24)

        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing LogsAnalysisAgent")

        super().__init__(
            name="LogsAnalysisAgent",
            instructions="""I am a logs analysis agent that can help you analyze system and security logs.
            I can:
            1. Analyze authentication logs
            2. Detect suspicious login patterns
            3. Identify failed authentication attempts
            4. Monitor system access patterns
            5. Analyze transaction logs
            
            When analyzing logs:
            1. Look for failed authentication attempts
            2. Identify suspicious IP addresses
            3. Monitor unusual access patterns
            4. Detect potential brute force attacks
            5. Analyze geographic anomalies in access logs""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize connections to log data sources."""
        logger.info("Initializing LogsAnalysisAgent...")

        await self.sumologic_client.connect()

        logger.info("LogsAnalysisAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down LogsAnalysisAgent...")

        await self.sumologic_client.disconnect()

        logger.info("LogsAnalysisAgent shut down successfully")

    async def get_authentication_logs(self, user_id: str) -> Dict[str, Any]:
        """Get authentication logs for a user from REAL data sources: SumoLogic and Snowflake."""
        logger.info(f"Getting authentication logs for user_id: {user_id}")

        try:
            auth_data = {
                "user_id": user_id,
                "authentication_events": [],
                "failed_attempts": [],
                "suspicious_patterns": [],
                "data_sources": []
            }

            # 1. Get authentication logs from SumoLogic
            try:
                # Query SumoLogic for authentication events
                sumologic_query = f"""
                _sourceCategory=auth* OR _sourceCategory=login*
                | where user_id="{user_id}" OR email="{user_id}"
                | where _messageTime > now() - {self.analysis_window_hours}h
                | fields _messageTime, user_id, email, ip_address, user_agent, auth_result, location
                | sort by _messageTime desc
                | limit 100
                """
                
                auth_logs = await self.sumologic_client.search_logs(sumologic_query, self.analysis_window_hours)
                
                if auth_logs and isinstance(auth_logs, list):
                    for log_entry in auth_logs:
                        auth_event = {
                            "timestamp": log_entry.get("_messageTime", ""),
                            "user_id": log_entry.get("user_id", user_id),
                            "email": log_entry.get("email", ""),
                            "ip_address": log_entry.get("ip_address", ""),
                            "user_agent": log_entry.get("user_agent", ""),
                            "auth_result": log_entry.get("auth_result", ""),
                            "location": log_entry.get("location", ""),
                            "source": "SumoLogic"
                        }
                        auth_data["authentication_events"].append(auth_event)
                        
                        # Identify failed attempts
                        if log_entry.get("auth_result", "").lower() in ["failed", "denied", "rejected"]:
                            auth_data["failed_attempts"].append(auth_event)
                    
                    auth_data["data_sources"].append("SumoLogic")
                    logger.info(f"Retrieved {len(auth_logs)} authentication events from SumoLogic for user_id: {user_id}")
            except Exception as e:
                logger.debug(f"SumoLogic authentication logs retrieval failed for {user_id}: {str(e)}")

            # 2. Get authentication patterns from Snowflake transaction logs
            try:
                from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
                
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for authentication-related transaction patterns
                auth_transaction_query = f"""
                SELECT 
                    TX_DATETIME,
                    EMAIL,
                    DEVICE_ID,
                    IP,
                    IP_COUNTRY_CODE,
                    IP_CITY,
                    USER_AGENT,
                    FRAUD_RULES_TRIGGERED,
                    IS_FRAUD_TX,
                    MODEL_SCORE
                FROM TRANSACTIONS_ENRICHED
                WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                    AND TX_DATETIME >= DATEADD(hour, -{self.analysis_window_hours}, CURRENT_TIMESTAMP())
                ORDER BY TX_DATETIME DESC
                LIMIT 50
                """
                
                transaction_logs = await snowflake_client.execute_query(auth_transaction_query)
                await snowflake_client.disconnect()
                
                if transaction_logs:
                    for tx_log in transaction_logs:
                        auth_event = {
                            "timestamp": tx_log.get('TX_DATETIME', '').isoformat() if tx_log.get('TX_DATETIME') else '',
                            "user_id": user_id,
                            "email": tx_log.get('EMAIL', ''),
                            "device_id": tx_log.get('DEVICE_ID', ''),
                            "ip_address": tx_log.get('IP', ''),
                            "location": f"{tx_log.get('IP_CITY', '')}, {tx_log.get('IP_COUNTRY_CODE', '')}",
                            "user_agent": tx_log.get('USER_AGENT', ''),
                            "fraud_rules": tx_log.get('FRAUD_RULES_TRIGGERED', ''),
                            "is_fraud": tx_log.get('IS_FRAUD_TX', 0) == 1,
                            "risk_score": tx_log.get('MODEL_SCORE', 0.0),
                            "source": "Snowflake"
                        }
                        auth_data["authentication_events"].append(auth_event)
                        
                        # Flag suspicious patterns
                        if tx_log.get('IS_FRAUD_TX', 0) == 1 or tx_log.get('MODEL_SCORE', 0) > 0.7:
                            auth_data["suspicious_patterns"].append(auth_event)
                    
                    auth_data["data_sources"].append("Snowflake")
                    logger.info(f"Retrieved {len(transaction_logs)} transaction authentication events from Snowflake for user_id: {user_id}")
            except Exception as e:
                logger.debug(f"Snowflake authentication logs retrieval failed for {user_id}: {str(e)}")

            # 3. Analyze patterns and generate insights
            auth_data["total_events"] = len(auth_data["authentication_events"])
            auth_data["failed_attempts_count"] = len(auth_data["failed_attempts"])
            auth_data["suspicious_patterns_count"] = len(auth_data["suspicious_patterns"])
            
            # Calculate failure rate
            if auth_data["total_events"] > 0:
                auth_data["failure_rate"] = auth_data["failed_attempts_count"] / auth_data["total_events"]
            else:
                auth_data["failure_rate"] = 0.0

            # Identify unique IP addresses
            unique_ips = set(event["ip_address"] for event in auth_data["authentication_events"] if event["ip_address"])
            auth_data["unique_ip_count"] = len(unique_ips)
            auth_data["unique_ips"] = list(unique_ips)[:10]  # Limit to top 10

            # Identify unique locations
            unique_locations = set(event["location"] for event in auth_data["authentication_events"] if event["location"] and event["location"] != ", ")
            auth_data["unique_location_count"] = len(unique_locations)
            auth_data["unique_locations"] = list(unique_locations)[:5]  # Limit to top 5

            logger.info(f"Successfully analyzed authentication logs for user_id: {user_id} - {auth_data['total_events']} events from {len(auth_data['data_sources'])} sources")
            return auth_data

        except Exception as e:
            logger.error(f"Error getting authentication logs for {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "error": str(e),
                "authentication_events": [],
                "failed_attempts": [],
                "suspicious_patterns": [],
                "data_sources": []
            }

    async def analyze_system_access_patterns(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Analyze system access patterns using REAL log data."""
        logger.info(f"Analyzing system access patterns for user_id: {user_id} over last {days} days")

        try:
            patterns = []
            
            # Get system access logs from SumoLogic
            try:
                # Query for system access patterns
                access_query = f"""
                _sourceCategory=system* OR _sourceCategory=access*
                | where user_id="{user_id}" OR email="{user_id}"
                | where _messageTime > now() - {days * 24}h
                | fields _messageTime, user_id, email, ip_address, action, resource, status, session_id
                | sort by _messageTime desc
                | limit 200
                """
                
                access_logs = await self.sumologic_client.search_logs(access_query, days * 24)
                
                if access_logs and isinstance(access_logs, list):
                    for log_entry in access_logs:
                        pattern = {
                            "timestamp": log_entry.get("_messageTime", ""),
                            "user_id": log_entry.get("user_id", user_id),
                            "ip_address": log_entry.get("ip_address", ""),
                            "action": log_entry.get("action", ""),
                            "resource": log_entry.get("resource", ""),
                            "status": log_entry.get("status", ""),
                            "session_id": log_entry.get("session_id", ""),
                            "source": "SumoLogic System Logs"
                        }
                        patterns.append(pattern)
                    
                    logger.info(f"Retrieved {len(access_logs)} system access patterns from SumoLogic for user_id: {user_id}")
            except Exception as e:
                logger.debug(f"SumoLogic system access logs retrieval failed for {user_id}: {str(e)}")

            # If no SumoLogic data, supplement with Snowflake transaction patterns
            if not patterns:
                try:
                    from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
                    
                    snowflake_client = SnowflakeClient()
                    await snowflake_client.connect()
                    
                    # Query for system-like transaction patterns
                    system_pattern_query = f"""
                    SELECT 
                        TX_DATETIME,
                        EMAIL,
                        DEVICE_ID,
                        IP,
                        MERCHANT_NAME,
                        PAID_AMOUNT_VALUE,
                        FRAUD_RULES_TRIGGERED,
                        IS_FRAUD_TX
                    FROM TRANSACTIONS_ENRICHED
                    WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                        AND TX_DATETIME >= DATEADD(day, -{days}, CURRENT_TIMESTAMP())
                    ORDER BY TX_DATETIME DESC
                    LIMIT 100
                    """
                    
                    system_results = await snowflake_client.execute_query(system_pattern_query)
                    await snowflake_client.disconnect()
                    
                    if system_results:
                        for result in system_results:
                            pattern = {
                                "timestamp": result.get('TX_DATETIME', '').isoformat() if result.get('TX_DATETIME') else '',
                                "user_id": user_id,
                                "ip_address": result.get('IP', ''),
                                "action": "transaction",
                                "resource": result.get('MERCHANT_NAME', ''),
                                "amount": result.get('PAID_AMOUNT_VALUE', 0.0),
                                "status": "fraud" if result.get('IS_FRAUD_TX', 0) == 1 else "normal",
                                "fraud_rules": result.get('FRAUD_RULES_TRIGGERED', ''),
                                "source": "Snowflake Transaction Patterns"
                            }
                            patterns.append(pattern)
                        
                        logger.info(f"Retrieved {len(system_results)} system access patterns from Snowflake for user_id: {user_id}")
                except Exception as e:
                    logger.debug(f"Snowflake system patterns retrieval failed for {user_id}: {str(e)}")

            if not patterns:
                logger.warning(f"No system access patterns found for user_id: {user_id}")
                return [{
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "user_id": user_id,
                    "reason": "No system access data available",
                    "source": "LogsAnalysisAgent"
                }]

            logger.info(f"Successfully analyzed {len(patterns)} REAL system access patterns for user_id: {user_id}")
            return patterns

        except Exception as e:
            logger.error(f"Error analyzing system access patterns for {user_id}: {str(e)}")
            return [{
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
                "error": str(e),
                "reason": "System access pattern analysis failed",
                "source": "LogsAnalysisAgent"
            }]

    async def detect_logs_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious log activity using REAL data analysis."""
        logger.info(f"Detecting log anomalies for user_id: {user_id}")

        try:
            # Get authentication logs
            auth_data = await self.get_authentication_logs(user_id)
            
            if not auth_data or auth_data.get('error'):
                logger.warning(f"No authentication data available for anomaly detection: {user_id}")
                return []

            anomalies = []
            current_time = datetime.now(timezone.utc)

            # 1. Failed authentication attempts anomaly
            failed_count = auth_data.get("failed_attempts_count", 0)
            total_events = auth_data.get("total_events", 0)
            
            if failed_count > self.failed_login_threshold:
                failure_rate = auth_data.get("failure_rate", 0.0)
                
                # Calculate risk level based on failure patterns
                risk_level = min(0.95, 0.5 + (failure_rate * 0.3) + (min(failed_count / 10, 1.0) * 0.2))
                
                # Calculate confidence based on data volume and patterns
                data_volume_factor = min(total_events / 20, 1.0)
                pattern_consistency = min(failed_count / max(total_events, 1), 1.0)
                calculated_confidence = 0.6 + (data_volume_factor * 0.2) + (pattern_consistency * 0.2)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"High failed authentication attempts: {failed_count} failures",
                            f"Authentication failure rate: {failure_rate:.1%}",
                            f"Total authentication events: {total_events}",
                            f"Data sources: {', '.join(auth_data.get('data_sources', []))}"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="LogsAnalysisAgent",
                    )
                )

            # 2. Suspicious IP address patterns
            unique_ip_count = auth_data.get("unique_ip_count", 0)
            if unique_ip_count > 5:  # More than 5 unique IPs in analysis window
                suspicious_patterns = auth_data.get("suspicious_patterns", [])
                suspicious_rate = len(suspicious_patterns) / max(total_events, 1)
                
                # Calculate risk level based on IP diversity and suspicious activity
                ip_diversity_factor = min(unique_ip_count / 10, 1.0)
                risk_level = min(0.9, 0.4 + (ip_diversity_factor * 0.3) + (suspicious_rate * 0.3))
                
                # Calculate confidence based on pattern consistency
                ip_distribution_factor = min(len(set(event["ip_address"] for event in suspicious_patterns)) / max(unique_ip_count, 1), 1.0)
                calculated_confidence = 0.5 + (ip_distribution_factor * 0.3) + (min(unique_ip_count / 15, 1.0) * 0.2)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            f"Multiple IP addresses detected: {unique_ip_count} unique IPs",
                            f"Suspicious pattern rate: {suspicious_rate:.1%}",
                            f"Top IPs: {', '.join(auth_data.get('unique_ips', [])[:3])}",
                            f"Suspicious events: {len(suspicious_patterns)}"
                        ],
                        confidence=calculated_confidence,
                        timestamp=current_time,
                        source="LogsAnalysisAgent",
                    )
                )

            # 3. Geographic anomalies in authentication logs
            unique_location_count = auth_data.get("unique_location_count", 0)
            if unique_location_count > 3:  # More than 3 unique locations
                # Check for rapid location changes in authentication events
                sorted_events = sorted(
                    [event for event in auth_data.get("authentication_events", []) if event.get("location") and event.get("timestamp")],
                    key=lambda x: x.get("timestamp", "")
                )
                
                rapid_location_changes = 0
                for i in range(1, len(sorted_events)):
                    prev_location = sorted_events[i-1].get("location", "")
                    curr_location = sorted_events[i].get("location", "")
                    
                    if prev_location != curr_location and prev_location and curr_location:
                        rapid_location_changes += 1
                
                if rapid_location_changes >= 2:
                    location_change_rate = rapid_location_changes / max(len(sorted_events), 1)
                    
                    # Calculate risk level based on location patterns
                    location_diversity = min(unique_location_count / 8, 1.0)
                    risk_level = min(0.85, 0.5 + (location_diversity * 0.2) + (location_change_rate * 0.25))
                    
                    # Calculate confidence based on temporal data quality
                    temporal_data_quality = len(sorted_events) / max(total_events, 1)
                    location_data_completeness = len([e for e in sorted_events if e.get("location") and ", " in e.get("location", "")]) / max(len(sorted_events), 1)
                    calculated_confidence = 0.4 + (temporal_data_quality * 0.3) + (location_data_completeness * 0.3)
                    
                    anomalies.append(
                        RiskAssessment(
                            risk_level=risk_level,
                            risk_factors=[
                                f"Multiple geographic locations: {unique_location_count} locations",
                                f"Rapid location changes: {rapid_location_changes} transitions",
                                f"Location change rate: {location_change_rate:.1%}",
                                f"Locations: {', '.join(auth_data.get('unique_locations', [])[:3])}"
                            ],
                            confidence=calculated_confidence,
                            timestamp=current_time,
                            source="LogsAnalysisAgent",
                        )
                    )

            logger.info(f"Successfully detected {len(anomalies)} REAL log anomalies for user_id: {user_id}")
            return anomalies

        except Exception as e:
            logger.error(f"Error detecting log anomalies for {user_id}: {str(e)}")
            # Return empty list instead of raising to prevent investigation failure
            return []

    async def get_logs_info(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive logs information for a user from all REAL data sources."""
        logger.info(f"Getting comprehensive logs info for user_id: {user_id}")

        try:
            # Get authentication logs
            auth_data = await self.get_authentication_logs(user_id)
            
            # Get system access patterns
            access_patterns = await self.analyze_system_access_patterns(user_id)
            
            # Compile comprehensive logs information
            logs_info = {
                "user_id": user_id,
                "authentication_summary": {
                    "total_events": auth_data.get("total_events", 0),
                    "failed_attempts": auth_data.get("failed_attempts_count", 0),
                    "failure_rate": auth_data.get("failure_rate", 0.0),
                    "unique_ips": auth_data.get("unique_ip_count", 0),
                    "unique_locations": auth_data.get("unique_location_count", 0),
                    "suspicious_patterns": auth_data.get("suspicious_patterns_count", 0)
                },
                "access_patterns_summary": {
                    "total_access_events": len(access_patterns),
                    "unique_resources": len(set(pattern.get("resource", "") for pattern in access_patterns if pattern.get("resource"))),
                    "failed_access_attempts": len([p for p in access_patterns if p.get("status", "").lower() in ["failed", "denied", "error"]])
                },
                "data_sources": list(set(auth_data.get("data_sources", []) + [pattern.get("source", "") for pattern in access_patterns])),
                "analysis_window_hours": self.analysis_window_hours,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully compiled comprehensive logs info for user_id: {user_id}")
            return logs_info

        except Exception as e:
            logger.error(f"Error getting comprehensive logs info for {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "error": str(e),
                "authentication_summary": {},
                "access_patterns_summary": {},
                "data_sources": [],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }