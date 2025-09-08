"""Anomaly Detection Agent implementation."""

import asyncio
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from agents import Agent

from ..interfaces import (
    AnomalyDetectionAgent,
    DeviceFingerprintAgent,
    Location,
    NetworkAnalysisAgent,
    RiskAssessment,
    UserBehaviorAgent,
)
from app.service.logging import get_bridge_logger
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AnomalyContext:
    network_agent: NetworkAnalysisAgent
    device_agent: DeviceFingerprintAgent
    behavior_agent: UserBehaviorAgent
    config: Dict[str, Any]


@dataclass
class AggregatedRiskScore:
    """Aggregated risk score with detailed analysis."""

    overall_risk: float
    confidence: float
    risk_factors: List[str]
    agent_scores: Dict[str, float]
    timestamp: datetime


class AnomalyDetectionAgentImpl(Agent[AnomalyContext]):
    """Implementation of AnomalyDetectionAgent."""

    def __init__(
        self,
        network_agent: NetworkAnalysisAgent,
        device_agent: DeviceFingerprintAgent,
        behavior_agent: UserBehaviorAgent,
        config: Dict[str, Any],
    ):
        self.network_agent = network_agent
        self.device_agent = device_agent
        self.behavior_agent = behavior_agent
        self.config = config

        # Configure risk thresholds and weights
        self.high_risk_threshold = config.get("high_risk_threshold", 0.8)
        self.medium_risk_threshold = config.get("medium_risk_threshold", 0.6)

        # Weights for different types of risks (should sum to 1.0)
        self.risk_weights = {
            "network": config.get("network_weight", 0.25),
            "device": config.get("device_weight", 0.25),
            "behavior": config.get("behavior_weight", 0.25),
            "location": config.get("location_weight", 0.25),
        }

        # Configure correlation thresholds
        self.correlation_threshold = config.get(
            "correlation_threshold", 2
        )  # Minimum correlated anomalies

        # Store baseline data
        self._baselines = {}
        self._risk_history = []  # Store historical risk assessments

        self.logger = get_bridge_logger(__name__)
        self.risk_assessments = []  # Store recent risk assessments
        self.logger.info("Initializing AnomalyDetectionAgent")

        super().__init__(
            name="AnomalyDetectionAgent",
            instructions="""I am an anomaly detection agent that can help you detect and analyze suspicious patterns.
            I can:
            1. Establish behavior baselines
            2. Calculate risk scores
            3. Filter false positives
            4. Detect legitimate scenarios
            5. Correlate anomalies across agents
            
            When analyzing anomalies:
            1. Compare against established baselines
            2. Consider multiple data sources
            3. Look for correlated events
            4. Filter out known false positives
            5. Calculate confidence scores""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize all dependent agents."""
        logger.info("Initializing AnomalyDetectionAgent...")

        await self.network_agent.initialize()
        await self.device_agent.initialize()
        await self.behavior_agent.initialize()

        logger.info("AnomalyDetectionAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down AnomalyDetectionAgent...")

        await self.network_agent.shutdown()
        await self.device_agent.shutdown()
        await self.behavior_agent.shutdown()

        logger.info("AnomalyDetectionAgent shut down successfully")

    async def establish_baseline(self, user_id: str) -> Dict[str, Any]:
        """Establish a baseline of normal behavior for a user based on real data."""
        logger.info(f"Establishing baseline for user_id: {user_id}")

        try:
            # Gather real data from agents to establish baseline
            network_data = await self.network_agent.get_networks_used(user_id)
            device_data = await self.device_agent.get_device_info(user_id)
            behavior_data = await self.behavior_agent.get_login_patterns(user_id)
            
            # Analyze network patterns
            network_ips = set()
            network_isps = set()
            network_locations = set()
            vpn_count = 0
            proxy_count = 0
            
            for record in network_data:
                if record.get('TRUE_IP'):
                    network_ips.add(record['TRUE_IP'])
                if record.get('TRUE_ISP'):
                    network_isps.add(record['TRUE_ISP'])
                if record.get('ip_country'):
                    network_locations.add(record['ip_country'])
                if record.get('is_vpn'):
                    vpn_count += 1
                if record.get('is_proxy'):
                    proxy_count += 1
            
            total_network_records = len(network_data) if network_data else 1
            
            # Analyze device patterns
            device_types = set()
            browsers = set()
            os_types = set()
            device_count = 0
            
            if isinstance(device_data, list):
                for device in device_data:
                    if device.get('device_type'):
                        device_types.add(device['device_type'])
                    if device.get('browser'):
                        browsers.add(device['browser'])
                    if device.get('os_type'):
                        os_types.add(device['os_type'])
                    device_count += 1
            
            # Analyze behavior patterns from real data
            usual_login_times = []
            session_duration = 3600  # Default
            mfa_methods = set()
            failed_login_rate = 0.0
            
            if isinstance(behavior_data, dict):
                usual_login_times = behavior_data.get('peak_hours', [])
                session_duration = behavior_data.get('avg_session_duration', 3600)
                mfa_methods = set(behavior_data.get('mfa_methods', []))
                failed_login_rate = behavior_data.get('failed_login_rate', 0.0)
            
            # Calculate frequencies based on actual data
            vpn_frequency = vpn_count / total_network_records if total_network_records > 0 else 0.0
            proxy_frequency = proxy_count / total_network_records if total_network_records > 0 else 0.0
            device_change_frequency = min(1.0, device_count / 30.0) if device_count > 0 else 0.0
            
            baseline = {
                "network": {
                    "usual_ips": list(network_ips)[:10],  # Limit to 10 most common
                    "usual_isps": list(network_isps),
                    "usual_locations": list(network_locations),
                    "vpn_usage_frequency": vpn_frequency,
                    "proxy_usage_frequency": proxy_frequency,
                    "total_network_records": total_network_records
                },
                "device": {
                    "usual_devices": list(device_types),
                    "usual_browsers": list(browsers),
                    "usual_os": list(os_types),
                    "device_change_frequency": device_change_frequency,
                    "total_device_count": device_count
                },
                "behavior": {
                    "usual_login_times": usual_login_times,
                    "usual_session_duration": session_duration,
                    "usual_mfa_methods": list(mfa_methods),
                    "failed_login_rate": failed_login_rate,
                },
                "data_quality": {
                    "network_data_points": len(network_data) if network_data else 0,
                    "device_data_points": device_count,
                    "behavior_data_available": isinstance(behavior_data, dict)
                },
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }

            # Store baseline
            self._baselines[user_id] = baseline

            logger.info(f"Successfully established baseline for user_id: {user_id} with {baseline['data_quality']}")
            return baseline

        except Exception as e:
            logger.error(f"Error establishing baseline for {user_id}: {str(e)}")
            raise

    async def calculate_risk_score(
        self, user_id: str, location_risk: float = 0.0, location_factors: list = None
    ) -> RiskAssessment:
        """Calculate overall risk score based on real data from all agents."""
        logger.info(f"Calculating risk score for user_id: {user_id}")

        try:
            # Get baseline
            if user_id not in self._baselines:
                await self.establish_baseline(user_id)
            baseline = self._baselines[user_id]

            current_time = datetime.now(timezone.utc)
            
            # Get real data from agents
            network_anomalies = await self.network_agent.get_vpn_proxy_usage(user_id)
            device_anomalies = await self.device_agent.detect_device_anomalies(user_id)
            behavior_anomalies = await self.behavior_agent.detect_behavior_anomalies(user_id)
            
            # Calculate Network risk (25%)
            network_risk = 0.0
            network_factors = []
            
            if network_anomalies:
                proxy_results = network_anomalies.get('proxy_results', [])
                vpn_detected = any(result.get('proxyType') for result in proxy_results if result.get('proxyType'))
                multiple_locations = len(set(result.get('dnsIpGeo', '') for result in proxy_results)) > 2
                
                if vpn_detected:
                    network_risk += 0.4
                    network_factors.append("VPN/Proxy usage detected")
                    
                if multiple_locations:
                    network_risk += 0.3
                    network_factors.append("Multiple geographic locations detected")
                    
                # Compare against baseline
                baseline_vpn_freq = baseline.get('network', {}).get('vpn_usage_frequency', 0.0)
                if baseline_vpn_freq > 0.5:  # Unusual VPN usage
                    network_risk += 0.1
                    network_factors.append("Unusual VPN usage pattern")
            
            # Calculate Device risk (25%)
            device_risk = 0.0
            device_factors = []
            
            if isinstance(device_anomalies, list):
                for anomaly in device_anomalies:
                    if anomaly.risk_level > 0.5:
                        device_risk = max(device_risk, anomaly.risk_level)
                        device_factors.extend(anomaly.risk_factors)
            
            # Calculate Behavior risk (25%)
            behavior_risk = 0.0
            behavior_factors = []
            
            if isinstance(behavior_anomalies, list):
                for anomaly in behavior_anomalies:
                    if anomaly.risk_level > 0.5:
                        behavior_risk = max(behavior_risk, anomaly.risk_level)
                        behavior_factors.extend(anomaly.risk_factors)
            
            # Location risk (25%)
            if location_factors is None:
                location_factors = []

            # Calculate weighted average
            overall_risk = (
                network_risk * self.risk_weights["network"]
                + device_risk * self.risk_weights["device"]
                + behavior_risk * self.risk_weights["behavior"]
                + location_risk * self.risk_weights["location"]
            )
            
            # Ensure risk is between 0 and 1
            overall_risk = max(0.0, min(1.0, overall_risk))

            # Combine all risk factors
            all_risk_factors = network_factors + device_factors + behavior_factors + location_factors
            
            # Calculate confidence based on data quality and consistency
            data_quality_scores = []
            
            # Network data quality
            network_data_points = baseline.get('data_quality', {}).get('network_data_points', 0)
            data_quality_scores.append(min(1.0, network_data_points / 10.0))
            
            # Device data quality
            device_data_points = baseline.get('data_quality', {}).get('device_data_points', 0)
            data_quality_scores.append(min(1.0, device_data_points / 5.0))
            
            # Behavior data quality
            behavior_available = baseline.get('data_quality', {}).get('behavior_data_available', False)
            data_quality_scores.append(1.0 if behavior_available else 0.0)
            
            # Calculate overall confidence
            avg_data_quality = sum(data_quality_scores) / len(data_quality_scores) if data_quality_scores else 0.0
            factor_consistency = min(1.0, len(all_risk_factors) / 3.0)  # More factors = higher confidence
            calculated_confidence = 0.3 + (avg_data_quality * 0.4) + (factor_consistency * 0.3)
            calculated_confidence = max(0.0, min(1.0, calculated_confidence))
            
            # Determine location info from real data if available
            location_city = None
            location_country = None
            location_risk_level = "LOW"
            
            if location_risk > 0.7:
                location_risk_level = "HIGH"
            elif location_risk > 0.4:
                location_risk_level = "MEDIUM"
                
            # Try to get location from network data
            if network_anomalies and network_anomalies.get('proxy_results'):
                first_result = network_anomalies['proxy_results'][0]
                location_country = first_result.get('dnsIpGeo', 'Unknown')

            # Create risk assessment
            assessment = RiskAssessment(
                risk_level=overall_risk,
                risk_factors=all_risk_factors,
                confidence=calculated_confidence,
                timestamp=current_time,
                source="AnomalyDetectionAgent",
                location=Location(
                    city=location_city, 
                    state=None, 
                    country=location_country or "Unknown", 
                    risk_level=location_risk_level
                ),
            )

            # Store assessment
            self._risk_history.append(assessment)

            logger.info(f"Successfully calculated risk score for user_id: {user_id}, risk={overall_risk:.3f}, confidence={calculated_confidence:.3f}")
            return assessment

        except Exception as e:
            logger.error(f"Error calculating risk score for {user_id}: {str(e)}")
            # Return safe default assessment on error
            return RiskAssessment(
                risk_level=0.0,
                risk_factors=["Error in risk calculation"],
                confidence=0.0,
                timestamp=datetime.now(timezone.utc),
                source="AnomalyDetectionAgent",
                location=Location(city=None, state=None, country="Unknown", risk_level="UNKNOWN"),
            )

    async def filter_false_positives(
        self, risk_assessments: List[RiskAssessment]
    ) -> List[RiskAssessment]:
        """Filter out likely false positive detections using intelligent analysis."""
        logger.info(
            f"Filtering {len(risk_assessments)} risk assessments for false positives"
        )

        try:
            filtered = []

            for assessment in risk_assessments:
                # Calculate filtering score based on multiple criteria
                keep_assessment = True
                filter_reasons = []
                
                # Filter by confidence threshold
                min_confidence = self.config.get('min_confidence_threshold', 0.4)
                if assessment.confidence < min_confidence:
                    keep_assessment = False
                    filter_reasons.append(f"Low confidence ({assessment.confidence:.3f} < {min_confidence})")

                # Filter by risk level threshold
                min_risk = self.config.get('min_risk_threshold', 0.3)
                if assessment.risk_level < min_risk:
                    keep_assessment = False
                    filter_reasons.append(f"Low risk level ({assessment.risk_level:.3f} < {min_risk})")

                # Require minimum number of risk factors for high confidence
                min_factors = self.config.get('min_risk_factors', 1)
                if len(assessment.risk_factors) < min_factors:
                    keep_assessment = False
                    filter_reasons.append(f"Insufficient risk factors ({len(assessment.risk_factors)} < {min_factors})")
                
                # Check for known false positive patterns
                false_positive_patterns = [
                    "Error in risk calculation",
                    "No data available",
                    "Connection timeout"
                ]
                
                for pattern in false_positive_patterns:
                    if any(pattern in factor for factor in assessment.risk_factors):
                        keep_assessment = False
                        filter_reasons.append(f"Known false positive pattern: {pattern}")
                        break
                
                # Advanced filtering: Check risk factor correlation
                if keep_assessment and len(assessment.risk_factors) > 1:
                    # Look for correlated risk factors that strengthen the assessment
                    network_factors = [f for f in assessment.risk_factors if 'VPN' in f or 'IP' in f or 'location' in f]
                    device_factors = [f for f in assessment.risk_factors if 'device' in f or 'browser' in f or 'OS' in f]
                    behavior_factors = [f for f in assessment.risk_factors if 'login' in f or 'session' in f or 'MFA' in f]
                    
                    # If factors span multiple categories, it's likely legitimate
                    factor_categories = sum([
                        1 if network_factors else 0,
                        1 if device_factors else 0,
                        1 if behavior_factors else 0
                    ])
                    
                    if factor_categories >= 2:
                        # Multi-category factors increase legitimacy
                        assessment.confidence = min(1.0, assessment.confidence + 0.1)
                
                if keep_assessment:
                    filtered.append(assessment)
                else:
                    logger.debug(f"Filtered assessment due to: {'; '.join(filter_reasons)}")

            logger.info(
                f"Filtered out {len(risk_assessments) - len(filtered)} false positives, kept {len(filtered)} assessments"
            )
            return filtered

        except Exception as e:
            logger.error(f"Error filtering false positives: {str(e)}")
            raise

    async def detect_legitimate_scenarios(
        self, user_id: str, risk_assessment: RiskAssessment
    ) -> bool:
        """Check if suspicious activity matches known legitimate scenarios based on real baseline data."""
        logger.info(f"Checking legitimate scenarios for user_id: {user_id}")

        try:
            # Get user baseline to understand normal patterns
            if user_id not in self._baselines:
                await self.establish_baseline(user_id)
            baseline = self._baselines[user_id]
            
            current_time = datetime.now(timezone.utc)
            current_hour = current_time.hour
            
            # Define legitimate scenarios based on user's actual baseline
            legitimate_checks = []
            
            # 1. Check VPN usage legitimacy
            baseline_vpn_freq = baseline.get('network', {}).get('vpn_usage_frequency', 0.0)
            if baseline_vpn_freq > 0.1:  # User regularly uses VPN
                vpn_factors = [f for f in risk_assessment.risk_factors if 'VPN' in f or 'Proxy' in f]
                if vpn_factors and risk_assessment.risk_level <= 0.6:
                    legitimate_checks.append({
                        'scenario': 'Regular VPN user',
                        'matched': True,
                        'reason': f'User has baseline VPN usage of {baseline_vpn_freq:.1%}'
                    })
            
            # 2. Check device usage legitimacy
            usual_devices = baseline.get('device', {}).get('usual_devices', [])
            device_factors = [f for f in risk_assessment.risk_factors if 'device' in f.lower()]
            if device_factors and len(usual_devices) > 2:  # Multi-device user
                legitimate_checks.append({
                    'scenario': 'Multi-device user',
                    'matched': True,
                    'reason': f'User typically uses {len(usual_devices)} different device types'
                })
            
            # 3. Check time-based legitimacy
            usual_login_times = baseline.get('behavior', {}).get('usual_login_times', [])
            time_factors = [f for f in risk_assessment.risk_factors if 'hours' in f or 'time' in f]
            if time_factors and usual_login_times:
                # Check if current hour matches any usual login times
                for usual_time in usual_login_times:
                    try:
                        usual_hour = int(usual_time.split(':')[0]) if ':' in str(usual_time) else int(usual_time)
                        if abs(current_hour - usual_hour) <= 2:  # Within 2 hours
                            legitimate_checks.append({
                                'scenario': 'Normal login time',
                                'matched': True,
                                'reason': f'Current time {current_hour}:00 matches usual pattern'
                            })
                            break
                    except (ValueError, AttributeError):
                        continue
            
            # 4. Check location legitimacy
            usual_locations = baseline.get('network', {}).get('usual_locations', [])
            location_factors = [f for f in risk_assessment.risk_factors if 'location' in f.lower() or 'country' in f.lower()]
            if location_factors and usual_locations:
                assessment_location = risk_assessment.location.country if risk_assessment.location else 'Unknown'
                if assessment_location in usual_locations:
                    legitimate_checks.append({
                        'scenario': 'Known location',
                        'matched': True,
                        'reason': f'Location {assessment_location} is in user\'s usual locations'
                    })
            
            # 5. Check overall risk level against baseline patterns
            if risk_assessment.risk_level <= 0.5 and risk_assessment.confidence >= 0.6:
                legitimate_checks.append({
                    'scenario': 'Low overall risk',
                    'matched': True,
                    'reason': f'Risk level {risk_assessment.risk_level:.3f} is below moderate threshold'
                })
            
            # Determine if scenario is legitimate
            matched_scenarios = [check for check in legitimate_checks if check['matched']]
            
            if matched_scenarios:
                # Log all matched legitimate scenarios
                for scenario in matched_scenarios:
                    logger.info(f"Matched legitimate scenario '{scenario['scenario']}': {scenario['reason']}")
                
                # Consider legitimate if multiple scenarios match or single strong match
                is_legitimate = (
                    len(matched_scenarios) >= 2 or  # Multiple scenarios
                    any('Regular' in s['scenario'] or 'Known' in s['scenario'] for s in matched_scenarios)  # Strong single match
                )
                
                logger.info(f"Assessment deemed {'legitimate' if is_legitimate else 'suspicious'} based on {len(matched_scenarios)} matched scenarios")
                return is_legitimate
            
            logger.info("No legitimate scenarios matched - assessment remains suspicious")
            return False

        except Exception as e:
            logger.error(
                f"Error detecting legitimate scenarios for {user_id}: {str(e)}"
            )
            # On error, err on the side of caution and don't mark as legitimate
            return False
