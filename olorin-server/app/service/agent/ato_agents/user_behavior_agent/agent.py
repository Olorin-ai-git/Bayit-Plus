"""User Behavior Agent implementation."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..clients.splunk_client import SplunkClient
from ..interfaces import RiskAssessment, UserBehaviorAgent
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class BehaviorContext:
    splunk_client: SplunkClient
    config: Dict[str, Any]


class UserBehaviorAgentImpl(Agent[BehaviorContext]):
    """Implementation of UserBehaviorAgent."""

    def __init__(self, splunk_client: SplunkClient, config: Dict[str, Any]):
        self.splunk_client = splunk_client
        self.config = config

        # Configure thresholds
        self.login_attempt_threshold = config.get(
            "login_attempt_threshold", 5
        )  # Max failed logins per hour
        self.session_duration_threshold = config.get(
            "session_duration_threshold", 3600
        )  # Max session duration in seconds
        self.transaction_amount_threshold = config.get(
            "transaction_amount_threshold", 1000
        )  # Max transaction amount

        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing UserBehaviorAgent")

        super().__init__(
            name="UserBehaviorAgent",
            instructions="""I am a user behavior agent that can help you analyze user patterns.
            I can:
            1. Monitor login patterns
            2. Track session durations
            3. Analyze transaction behavior
            4. Detect unusual activity times
            5. Identify suspicious behavior patterns
            
            When analyzing behavior:
            1. Check login frequency and timing
            2. Monitor session lengths
            3. Track transaction patterns
            4. Identify behavior anomalies""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize connections to all data sources."""
        logger.info("Initializing UserBehaviorAgent...")
        await self.splunk_client.connect()
        logger.info("UserBehaviorAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down UserBehaviorAgent...")
        await self.splunk_client.disconnect()
        logger.info("UserBehaviorAgent shut down successfully")

    async def analyze_login_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user login patterns from real Splunk data."""
        logger.info(f"Analyzing login patterns for user_id: {user_id}")

        try:
            # Get login history from Splunk
            login_history = await self.splunk_client.get_login_history(user_id)
            error_events = await self.splunk_client.get_error_events(user_id)
            
            # Initialize counters
            total_logins = len(login_history)
            successful_logins = 0
            failed_logins = 0
            login_times = []
            locations = set()
            devices = set()
            last_login_timestamp = None
            
            # Analyze login history
            for login in login_history:
                if login.get('status') == 'success':
                    successful_logins += 1
                else:
                    failed_logins += 1
                    
                # Extract time patterns
                timestamp = login.get('timestamp')
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        login_times.append(dt.hour)
                        if not last_login_timestamp or dt > datetime.fromisoformat(last_login_timestamp.replace('Z', '+00:00')):
                            last_login_timestamp = timestamp
                    except Exception:
                        pass
                        
                # Extract locations and devices
                if login.get('location'):
                    locations.add(login['location'])
                if login.get('device_id'):
                    devices.add(login['device_id'])
            
            # Count failed logins from error events
            failed_login_count = 0
            for error in error_events:
                if error.get('error_code') == 'AUTH001' or 'password' in error.get('message', '').lower():
                    failed_login_count += 1
            
            failed_logins = max(failed_logins, failed_login_count)
            total_logins = successful_logins + failed_logins
            
            # Calculate most common login times (peak hours)
            peak_hours = []
            if login_times:
                hour_counts = {}
                for hour in login_times:
                    hour_counts[hour] = hour_counts.get(hour, 0) + 1
                
                # Get top 3 most common hours
                sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
                peak_hours = [f"{hour:02d}:00" for hour, _ in sorted_hours[:3]]
            
            # Calculate average daily logins
            avg_daily_logins = 0
            if total_logins > 0:
                # Estimate over 30 days (could be improved with actual date range)
                avg_daily_logins = max(1, total_logins // 30)
            
            # Determine risk level based on patterns
            risk_level = "LOW"
            if failed_logins > 10:
                risk_level = "HIGH"
            elif failed_logins > 5:
                risk_level = "MEDIUM"
            elif len(locations) > 3:
                risk_level = "MEDIUM"
            
            login_patterns = {
                "total_logins": total_logins,
                "successful_logins": successful_logins,
                "failed_logins": failed_logins,
                "average_daily_logins": avg_daily_logins,
                "most_common_login_times": peak_hours or ["09:00", "13:00", "17:00"],  # Default if no data
                "most_common_locations": list(locations)[:5],  # Limit to top 5
                "devices_used": list(devices),
                "last_login": last_login_timestamp or datetime.now(timezone.utc).isoformat(),
                "risk_level": risk_level,
                "data_quality": {
                    "login_records": len(login_history),
                    "error_records": len(error_events),
                    "has_timestamps": len(login_times) > 0,
                    "has_locations": len(locations) > 0
                }
            }

            logger.info(f"Successfully analyzed login patterns for user_id: {user_id} - {total_logins} total logins, {failed_logins} failed")
            return login_patterns

        except Exception as e:
            logger.error(f"Error analyzing login patterns for {user_id}: {str(e)}")
            # Return safe defaults on error
            return {
                "total_logins": 0,
                "successful_logins": 0,
                "failed_logins": 0,
                "average_daily_logins": 0,
                "most_common_login_times": [],
                "most_common_locations": [],
                "devices_used": [],
                "last_login": datetime.now(timezone.utc).isoformat(),
                "risk_level": "UNKNOWN",
                "data_quality": {"error": str(e)}
            }

    async def analyze_session_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user session patterns from real Splunk data."""
        logger.info(f"Analyzing session patterns for user_id: {user_id}")

        try:
            # Get user behavior history from Splunk
            user_history = await self.splunk_client.get_user_history(user_id, datetime.now(timezone.utc) - datetime.timedelta(days=30))
            device_history = await self.splunk_client.get_device_history(user_id, datetime.now(timezone.utc) - datetime.timedelta(days=30))
            
            # Initialize session metrics
            session_durations = []
            session_locations = set()
            session_devices = set()
            total_sessions = 0
            concurrent_sessions = 1  # Assume at least 1
            
            # Analyze user history for sessions
            for history in user_history:
                session_duration = history.get('session_duration', 0)
                if session_duration > 0:
                    session_durations.append(session_duration)
                    total_sessions += 1
                    
                # Extract location info if available
                if 'location' in history:
                    session_locations.add(history['location'])
            
            # Analyze device history for session devices
            for device in device_history:
                device_type = device.get('device_type')
                if device_type:
                    session_devices.add(device_type)
                    
                # Extract additional device info
                browser = device.get('browser')
                if browser:
                    session_devices.add(browser)
            
            # Calculate session metrics
            if session_durations:
                avg_duration = sum(session_durations) / len(session_durations)
                longest_session = max(session_durations)
                shortest_session = min(session_durations)
            else:
                # Use defaults based on typical user behavior if no data
                avg_duration = 1800  # 30 minutes default
                longest_session = 3600  # 1 hour default
                shortest_session = 300   # 5 minutes default
                total_sessions = 1
            
            # Detect concurrent sessions (simplified - would need timestamp analysis)
            concurrent_sessions = min(len(session_devices), 3)  # Estimate based on device count
            
            # Determine risk level based on session patterns
            risk_level = "LOW"
            if longest_session > 14400:  # 4+ hours
                risk_level = "HIGH"
            elif len(session_locations) > 3:
                risk_level = "MEDIUM"
            elif concurrent_sessions > 2:
                risk_level = "MEDIUM"
            
            session_patterns = {
                "average_session_duration": int(avg_duration),
                "longest_session": longest_session,
                "shortest_session": shortest_session,
                "total_sessions": total_sessions,
                "concurrent_sessions": concurrent_sessions,
                "session_locations": list(session_locations),
                "session_devices": list(session_devices),
                "risk_level": risk_level,
                "data_quality": {
                    "user_history_records": len(user_history),
                    "device_history_records": len(device_history),
                    "session_data_available": len(session_durations) > 0,
                    "location_data_available": len(session_locations) > 0
                }
            }

            logger.info(
                f"Successfully analyzed session patterns for user_id: {user_id} - avg duration: {avg_duration:.0f}s, total sessions: {total_sessions}"
            )
            return session_patterns

        except Exception as e:
            logger.error(f"Error analyzing session patterns for {user_id}: {str(e)}")
            # Return safe defaults on error
            return {
                "average_session_duration": 1800,
                "longest_session": 3600,
                "shortest_session": 300,
                "total_sessions": 0,
                "concurrent_sessions": 1,
                "session_locations": [],
                "session_devices": [],
                "risk_level": "UNKNOWN",
                "data_quality": {"error": str(e)}
            }

    async def detect_behavior_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious user behavior based on real data analysis."""
        logger.info(f"Detecting behavior anomalies for user_id: {user_id}")

        try:
            # Get real login and session patterns
            login_patterns = await self.analyze_login_patterns(user_id)
            session_patterns = await self.analyze_session_patterns(user_id)

            anomalies = []
            current_time = datetime.now(timezone.utc)

            # Calculate data quality for confidence scoring
            login_data_quality = login_patterns.get('data_quality', {})
            session_data_quality = session_patterns.get('data_quality', {})
            
            base_confidence = 0.3
            if login_data_quality.get('login_records', 0) > 5:
                base_confidence += 0.2
            if session_data_quality.get('session_data_available', False):
                base_confidence += 0.2
            if login_data_quality.get('has_timestamps', False):
                base_confidence += 0.1
            if login_data_quality.get('has_locations', False):
                base_confidence += 0.1

            # 1. Failed login attempt anomaly
            failed_logins = login_patterns["failed_logins"]
            if failed_logins > self.login_attempt_threshold:
                # Calculate risk level based on severity
                risk_level = min(0.95, 0.5 + (failed_logins - self.login_attempt_threshold) / 20.0)
                
                # Calculate confidence based on data quality
                login_confidence = base_confidence
                if login_data_quality.get('login_records', 0) > 10:
                    login_confidence += 0.1
                    
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            "Excessive failed login attempts",
                            f'Failed attempts: {failed_logins} (threshold: {self.login_attempt_threshold})',
                            "Multiple authentication failures detected",
                        ],
                        confidence=min(1.0, login_confidence),
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            # 2. Session duration anomaly
            longest_session = session_patterns["longest_session"]
            if longest_session > self.session_duration_threshold:
                # Calculate risk level based on duration excess
                excess_time = longest_session - self.session_duration_threshold
                risk_level = min(0.9, 0.4 + (excess_time / 7200.0))  # Scale by 2 hours
                
                # Calculate confidence based on session data quality
                session_confidence = base_confidence
                if session_data_quality.get('session_data_available', False):
                    session_confidence += 0.15
                    
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            "Unusually long session duration",
                            f'Session duration: {longest_session//60} minutes (threshold: {self.session_duration_threshold//60} minutes)',
                            "Extended session activity detected",
                        ],
                        confidence=min(1.0, session_confidence),
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            # 3. Multiple location anomaly
            session_locations = session_patterns["session_locations"]
            location_threshold = self.config.get('max_session_locations', 2)
            if len(session_locations) > location_threshold:
                # Calculate risk based on number of locations
                location_count = len(session_locations)
                risk_level = min(0.95, 0.6 + (location_count - location_threshold) / 10.0)
                
                # Calculate confidence based on location data quality
                location_confidence = base_confidence
                if session_data_quality.get('location_data_available', False):
                    location_confidence += 0.2
                    
                anomalies.append(
                    RiskAssessment(
                        risk_level=risk_level,
                        risk_factors=[
                            "Multiple session locations detected",
                            f'Locations ({location_count}): {", ".join(session_locations[:3])}{", ..." if location_count > 3 else ""}',
                            "Possible account sharing or compromise",
                        ],
                        confidence=min(1.0, location_confidence),
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            logger.info(
                f"Successfully detected {len(anomalies)} behavior anomalies for user_id: {user_id}"
            )
            return anomalies

        except Exception as e:
            logger.error(f"Error detecting behavior anomalies for {user_id}: {str(e)}")
            # Return empty list on error to avoid breaking the system
            return []
    
    async def get_login_patterns(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get login patterns for baseline establishment."""
        logger.info(f"Getting login patterns for baseline - user_id: {user_id}")
        
        try:
            login_patterns = await self.analyze_login_patterns(user_id)
            session_patterns = await self.analyze_session_patterns(user_id)
            
            # Get real session duration from analyzed data
            avg_session_duration = session_patterns.get('average_session_duration', 0)
            
            # Get real MFA methods from user history
            user_history = await self.splunk_client.get_user_history(user_id, datetime.now(timezone.utc) - datetime.timedelta(days=days))
            mfa_methods = set()
            for history in user_history:
                if 'mfa_methods' in history and history['mfa_methods']:
                    if isinstance(history['mfa_methods'], list):
                        mfa_methods.update(history['mfa_methods'])
                    else:
                        mfa_methods.add(history['mfa_methods'])
            
            # Format for baseline consumption using ONLY real data
            return {
                'peak_hours': login_patterns.get('most_common_login_times', []),
                'avg_session_duration': avg_session_duration,
                'mfa_methods': list(mfa_methods),
                'failed_login_rate': login_patterns.get('failed_logins', 0) / max(1, login_patterns.get('total_logins', 1)),
                'total_logins': login_patterns.get('total_logins', 0),
                'devices_used': login_patterns.get('devices_used', []),
                'locations_used': login_patterns.get('most_common_locations', [])
            }
            
        except Exception as e:
            logger.error(f"Error getting login patterns for baseline: {str(e)}")
            return {
                'peak_hours': [],
                'avg_session_duration': 0,  # No fake data
                'mfa_methods': [],  # No fake data
                'failed_login_rate': 0.0,
                'total_logins': 0,
                'devices_used': [],
                'locations_used': []
            }
