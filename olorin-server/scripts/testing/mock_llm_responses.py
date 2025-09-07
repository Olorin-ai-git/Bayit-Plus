#!/usr/bin/env python3
"""
Mock LLM Response System for Autonomous Investigation Testing

This module provides realistic mock responses for all agent types during testing.
Mock responses ONLY activate when TestMode.MOCK is specified in the test configuration.

The mock system generates realistic fraud detection responses that:
1. Follow the exact format expected by Olorin prompts
2. Include proper risk scores and confidence levels
3. Vary based on scenario type (device_spoofing, impossible_travel, etc.)
4. Work with the UnifiedSchemaValidator for parsing
5. Provide different risk levels for comprehensive testing
"""

import random
import json
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class ScenarioType(Enum):
    """Investigation scenario types"""
    DEVICE_SPOOFING = "device_spoofing"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    VELOCITY_ABUSE = "velocity_abuse"
    ACCOUNT_TAKEOVER = "account_takeover"
    SUSPICIOUS_PAYMENT = "suspicious_payment"
    LOCATION_FRAUD = "location_fraud"
    BEHAVIORAL_ANOMALY = "behavioral_anomaly"
    DEFAULT = "default"

@dataclass
class MockRiskProfile:
    """Risk profile for generating consistent mock responses"""
    network_risk: float
    device_risk: float
    location_risk: float
    logs_risk: float
    overall_risk: float
    threat_level: str
    confidence_base: int

class MockLLMResponseGenerator:
    """
    Generates realistic mock LLM responses for autonomous investigation testing.
    
    ONLY ACTIVATED when TestMode.MOCK is specified.
    """
    
    def __init__(self):
        self.logger = logger
        self.risk_profiles = self._initialize_risk_profiles()
        self.response_templates = self._initialize_response_templates()
    
    def _initialize_risk_profiles(self) -> Dict[ScenarioType, MockRiskProfile]:
        """Initialize risk profiles for different investigation scenarios"""
        return {
            ScenarioType.DEVICE_SPOOFING: MockRiskProfile(
                network_risk=0.45, device_risk=0.75, location_risk=0.35, logs_risk=0.55,
                overall_risk=0.68, threat_level="High", confidence_base=82
            ),
            ScenarioType.IMPOSSIBLE_TRAVEL: MockRiskProfile(
                network_risk=0.55, device_risk=0.25, location_risk=0.85, logs_risk=0.40,
                overall_risk=0.72, threat_level="High", confidence_base=88
            ),
            ScenarioType.VELOCITY_ABUSE: MockRiskProfile(
                network_risk=0.35, device_risk=0.40, location_risk=0.30, logs_risk=0.80,
                overall_risk=0.65, threat_level="High", confidence_base=75
            ),
            ScenarioType.ACCOUNT_TAKEOVER: MockRiskProfile(
                network_risk=0.60, device_risk=0.70, location_risk=0.50, logs_risk=0.85,
                overall_risk=0.78, threat_level="Critical", confidence_base=90
            ),
            ScenarioType.SUSPICIOUS_PAYMENT: MockRiskProfile(
                network_risk=0.40, device_risk=0.35, location_risk=0.45, logs_risk=0.60,
                overall_risk=0.58, threat_level="Medium", confidence_base=70
            ),
            ScenarioType.LOCATION_FRAUD: MockRiskProfile(
                network_risk=0.50, device_risk=0.30, location_risk=0.90, logs_risk=0.35,
                overall_risk=0.75, threat_level="High", confidence_base=85
            ),
            ScenarioType.BEHAVIORAL_ANOMALY: MockRiskProfile(
                network_risk=0.25, device_risk=0.45, location_risk=0.20, logs_risk=0.70,
                overall_risk=0.52, threat_level="Medium", confidence_base=68
            ),
            ScenarioType.DEFAULT: MockRiskProfile(
                network_risk=0.30, device_risk=0.25, location_risk=0.20, logs_risk=0.35,
                overall_risk=0.42, threat_level="Medium", confidence_base=65
            )
        }
    
    def _initialize_response_templates(self) -> Dict[str, Dict]:
        """Initialize response templates for each agent type"""
        return {
            "network": {
                "indicators": [
                    "VPN usage detected from anonymization service",
                    "Connection through Tor exit node identified",
                    "Multiple proxy chains in connection path",
                    "IP reputation shows previous malicious activity",
                    "Geolocation mismatch with stated location",
                    "Suspicious port scanning activity detected",
                    "Connection from known botnet infrastructure",
                    "Multiple rapid IP address changes"
                ],
                "mitigations": [
                    "Block IP address immediately",
                    "Implement additional verification steps",
                    "Monitor for continued suspicious activity",
                    "Require device re-authentication",
                    "Flag for manual security review",
                    "Apply rate limiting to IP range"
                ]
            },
            "device": {
                "indicators": [
                    "Device fingerprint inconsistencies detected",
                    "Multiple user agent strings from same session",
                    "Browser automation tools signatures found",
                    "Screen resolution changes indicating emulation",
                    "Hardware specifications mismatch patterns",
                    "Missing expected device capabilities",
                    "Rapid device fingerprint modifications",
                    "Virtual machine environment indicators"
                ],
                "actions": [
                    "Block device and require re-registration",
                    "Implement enhanced device fingerprinting",
                    "Flag for manual review and verification",
                    "Apply additional authentication challenges",
                    "Monitor for continued spoofing attempts",
                    "Require hardware token verification"
                ]
            },
            "location": {
                "anomalies": [
                    "Impossible travel detected between locations",
                    "GPS coordinates inconsistent with IP geolocation",
                    "Multiple simultaneous logins from different continents",
                    "Location data manipulation indicators found",
                    "Timezone inconsistencies in activity patterns",
                    "Rapid geographic transitions beyond physical possibility",
                    "VPN exit point differs from claimed location",
                    "Mobile carrier location mismatch"
                ],
                "verification": [
                    "Request additional location verification",
                    "Implement geo-fencing restrictions",
                    "Require location-based authentication",
                    "Flag for travel pattern analysis",
                    "Apply location-based rate limiting",
                    "Request proof of travel documentation"
                ]
            },
            "logs": {
                "patterns": [
                    "Automated bot-like behavior patterns detected",
                    "Unusual access frequency and timing patterns",
                    "Multiple simultaneous sessions from same user",
                    "Privilege escalation attempts identified",
                    "Account enumeration activities detected",
                    "Rapid sequential failed login attempts",
                    "Suspicious API usage patterns observed",
                    "Data exfiltration behavior indicators"
                ],
                "monitoring": [
                    "Implement enhanced session monitoring",
                    "Apply behavioral analytics algorithms",
                    "Set up real-time alerting for anomalies",
                    "Enable detailed audit logging",
                    "Monitor for continued suspicious patterns",
                    "Implement user behavior baseline tracking"
                ]
            }
        }
    
    def generate_network_response(self, scenario: ScenarioType, investigation_id: str, entity_risk_score: Optional[float] = None) -> str:
        """Generate mock network analysis response"""
        self.logger.warning("⚠️ ⚠️ ⚠️  USING MOCK LLM - NOT REAL CLAUDE/GPT ANALYSIS ⚠️ ⚠️ ⚠️")
        self.logger.warning("    This is a MOCK response for testing only - NO actual LLM reasoning")
        
        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["network"]
        
        # Use entity's actual risk score if provided, otherwise use profile
        if entity_risk_score is not None:
            # Network agent should detect high network risk for high-risk entities
            risk_score = entity_risk_score * 0.85 + random.uniform(-0.05, 0.05)
            self.logger.warning(f"    Using entity risk score from Snowflake: {entity_risk_score:.4f} -> Network risk: {risk_score:.4f}")
        else:
            risk_score = profile.network_risk + random.uniform(-0.05, 0.05)
            self.logger.warning(f"    Using hardcoded profile risk: {risk_score:.4f}")
        risk_score = max(0.0, min(1.0, risk_score))  # Clamp to valid range
        confidence = profile.confidence_base + random.randint(-8, 8)
        
        # Select random indicators and mitigations
        num_indicators = random.randint(2, 4)
        indicators = random.sample(templates["indicators"], min(num_indicators, len(templates["indicators"])))
        mitigations = random.sample(templates["mitigations"], min(2, len(templates["mitigations"])))
        
        risk_level = self._get_risk_level(risk_score)
        
        response = f"""1. Risk Level: {risk_level}
2. risk_score: {risk_score:.2f}
3. Network red flags identified: {', '.join(indicators)}
4. Confidence score: {confidence}
5. Technical evidence summary: Network analysis for investigation {investigation_id} shows {len(indicators)} critical indicators including {indicators[0].lower()}. Connection patterns suggest coordinated malicious activity with anonymization layers.
6. Suggested mitigation measures: {', '.join(mitigations)}

Additional Analysis:
- IP reputation score: {random.randint(15, 85)}/100
- Connection stability: {'Unstable' if risk_score > 0.5 else 'Stable'}
- Threat classification: {profile.threat_level} priority investigation
- Recommended action timeline: {'Immediate' if risk_score > 0.7 else 'Within 24 hours'}"""

        self.logger.info(f"Generated mock network response for {scenario.value}: risk={risk_score:.2f}")
        return response
    
    def generate_device_response(self, scenario: ScenarioType, investigation_id: str, entity_risk_score: Optional[float] = None) -> str:
        """Generate mock device analysis response"""
        self.logger.warning("⚠️ ⚠️ ⚠️  USING MOCK LLM - NOT REAL CLAUDE/GPT ANALYSIS ⚠️ ⚠️ ⚠️")
        
        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["device"]
        
        if entity_risk_score is not None:
            # Device agent should detect device anomalies for high-risk entities
            risk_score = entity_risk_score * 0.75 + random.uniform(-0.05, 0.05)
            self.logger.warning(f"    Device risk adjusted for entity risk {entity_risk_score:.4f} -> {risk_score:.4f}")
        else:
            risk_score = profile.device_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))
        confidence = profile.confidence_base + random.randint(-8, 8)
        
        num_indicators = random.randint(2, 3)
        indicators = random.sample(templates["indicators"], min(num_indicators, len(templates["indicators"])))
        actions = random.sample(templates["actions"], min(2, len(templates["actions"])))
        
        risk_level = self._get_risk_level(risk_score)
        
        response = f"""1. Risk Level: {risk_level}
2. risk_score: {risk_score:.2f}
3. Specific fraud indicators found: {', '.join(indicators)}
4. Confidence score: {confidence}
5. Detailed reasoning: Device analysis for investigation {investigation_id} reveals {len(indicators)} significant anomalies. {indicators[0]} combined with {indicators[1] if len(indicators) > 1 else 'related patterns'} suggests coordinated device spoofing attempt.
6. Recommended actions: {', '.join(actions)}

Device Fingerprint Analysis:
- Consistency score: {random.randint(20, 80)}/100
- Spoofing probability: {risk_score * 100:.0f}%
- Hardware authenticity: {'Questionable' if risk_score > 0.6 else 'Verified'}
- Device trust level: {self._get_trust_level(risk_score)}"""

        self.logger.info(f"Generated mock device response for {scenario.value}: risk={risk_score:.2f}")
        return response
    
    def generate_location_response(self, scenario: ScenarioType, investigation_id: str, entity_risk_score: Optional[float] = None) -> str:
        """Generate mock location analysis response"""
        self.logger.warning("⚠️ ⚠️ ⚠️  USING MOCK LLM - NOT REAL CLAUDE/GPT ANALYSIS ⚠️ ⚠️ ⚠️")
        
        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["location"]
        
        if entity_risk_score is not None:
            # Location agent should detect location anomalies for high-risk entities
            risk_score = entity_risk_score * 0.70 + random.uniform(-0.05, 0.05)
            self.logger.warning(f"    Location risk adjusted for entity risk {entity_risk_score:.4f} -> {risk_score:.4f}")
        else:
            risk_score = profile.location_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))
        confidence = profile.confidence_base + random.randint(-8, 8)
        
        num_anomalies = random.randint(1, 3)
        anomalies = random.sample(templates["anomalies"], min(num_anomalies, len(templates["anomalies"])))
        verification = random.sample(templates["verification"], min(2, len(templates["verification"])))
        
        risk_level = self._get_risk_level(risk_score)
        
        response = f"""1. Risk Level: {risk_level}
2. risk_score: {risk_score:.2f}
3. Geographic anomalies detected: {', '.join(anomalies)}
4. Confidence score: {confidence}
5. Evidence of location manipulation: Investigation {investigation_id} shows {len(anomalies)} critical location inconsistencies. Primary concern: {anomalies[0].lower()}. Pattern analysis indicates sophisticated location spoofing techniques.
6. Recommended verification steps: {', '.join(verification)}

Geographic Analysis Details:
- Location consistency score: {random.randint(25, 75)}/100
- Travel feasibility: {'Impossible' if risk_score > 0.7 else 'Questionable' if risk_score > 0.4 else 'Possible'}
- Geographic risk assessment: {profile.threat_level} priority
- Location verification required: {'Yes' if risk_score > 0.5 else 'Recommended'}"""

        self.logger.info(f"Generated mock location response for {scenario.value}: risk={risk_score:.2f}")
        return response
    
    def generate_logs_response(self, scenario: ScenarioType, investigation_id: str, entity_risk_score: Optional[float] = None) -> str:
        """Generate mock logs analysis response"""
        self.logger.warning("⚠️ ⚠️ ⚠️  USING MOCK LLM - NOT REAL CLAUDE/GPT ANALYSIS ⚠️ ⚠️ ⚠️")
        
        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["logs"]
        
        if entity_risk_score is not None:
            # Logs agent should detect suspicious patterns for high-risk entities
            risk_score = entity_risk_score * 0.80 + random.uniform(-0.05, 0.05)
            self.logger.warning(f"    Logs risk adjusted for entity risk {entity_risk_score:.4f} -> {risk_score:.4f}")
        else:
            risk_score = profile.logs_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))
        confidence = profile.confidence_base + random.randint(-8, 8)
        
        num_patterns = random.randint(2, 4)
        patterns = random.sample(templates["patterns"], min(num_patterns, len(templates["patterns"])))
        monitoring = random.sample(templates["monitoring"], min(2, len(templates["monitoring"])))
        
        risk_level = self._get_risk_level(risk_score)
        
        # Generate timeline
        timeline_events = [
            "Initial anomaly detected: 14:30 UTC",
            f"Pattern escalation observed: {14 + random.randint(1, 3)}:{random.randint(15, 45)} UTC", 
            f"Suspicious activity peak: {15 + random.randint(0, 2)}:{random.randint(10, 50)} UTC"
        ]
        
        response = f"""1. Risk Level: {risk_level}
2. risk_score: {risk_score:.2f}
3. Suspicious patterns identified: {', '.join(patterns)}
4. Confidence score: {confidence}
5. Timeline of suspicious events: {'; '.join(timeline_events)}. Investigation {investigation_id} logs show {len(patterns)} distinct suspicious behavior patterns over {random.randint(2, 8)} hour timeframe.
6. Recommended monitoring actions: {', '.join(monitoring)}

Behavioral Analysis Summary:
- Activity pattern score: {random.randint(30, 85)}/100
- Automation likelihood: {risk_score * 100:.0f}%
- User behavior deviation: {self._get_deviation_level(risk_score)}
- Monitoring priority: {profile.threat_level}"""

        self.logger.info(f"Generated mock logs response for {scenario.value}: risk={risk_score:.2f}")
        return response
    
    def generate_risk_assessment_response(self, scenario: ScenarioType, investigation_id: str, 
                                        device_analysis: str, location_analysis: str, 
                                        network_analysis: str, logs_analysis: str) -> str:
        """Generate mock risk assessment response"""
        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        
        # Add variance to overall risk
        risk_score = profile.overall_risk + random.uniform(-0.03, 0.03)
        risk_score = max(0.0, min(1.0, risk_score))
        confidence = profile.confidence_base + random.randint(-5, 5)
        
        risk_classification = self._get_risk_level(risk_score)
        
        # Generate correlation analysis
        correlation_insights = [
            f"All domains show coordinated suspicious activity within {random.randint(2, 6)}-hour window",
            f"Cross-domain pattern correlation score: {random.randint(75, 95)}/100",
            f"Multi-vector attack indicators suggest {profile.threat_level.lower()} sophistication level"
        ]
        
        critical_indicators = [
            f"Primary threat vector: {scenario.value.replace('_', ' ').title()}",
            f"Secondary indicators: Multi-domain anomalies",
            f"Attack sophistication: {profile.threat_level} level"
        ]
        
        immediate_actions = [
            "Suspend user account pending verification",
            "Implement enhanced monitoring protocols", 
            "Flag for immediate security team review",
            "Apply additional authentication requirements"
        ]
        
        long_term_strategies = [
            "Enhance behavioral analytics baselines",
            "Implement cross-domain correlation monitoring",
            "Develop scenario-specific detection rules",
            "Schedule periodic risk assessment reviews"
        ]
        
        response = f"""1. overall_risk_score: {risk_score:.2f}
2. Final risk classification: {risk_classification}
3. Most critical fraud indicators identified: {', '.join(critical_indicators)}
4. Cross-domain correlation analysis: {correlation_insights[0]}. {correlation_insights[1]}. {correlation_insights[2]}.
5. Immediate actions recommended: {', '.join(immediate_actions[:2])}
6. Long-term monitoring strategies suggested: {', '.join(long_term_strategies[:2])}

Comprehensive Risk Assessment for Investigation {investigation_id}:

Domain Analysis Summary:
- Network Risk Contribution: {profile.network_risk:.2f}
- Device Risk Contribution: {profile.device_risk:.2f}  
- Location Risk Contribution: {profile.location_risk:.2f}
- Logs Risk Contribution: {profile.logs_risk:.2f}

Threat Intelligence:
- Overall Threat Level: {profile.threat_level}
- Investigation Priority: {'Critical' if risk_score > 0.7 else 'High' if risk_score > 0.5 else 'Medium'}
- Risk Assessment Confidence: {confidence}%
- Recommended Response Timeline: {'Immediate' if risk_score > 0.7 else '< 4 hours' if risk_score > 0.5 else '< 24 hours'}

The investigation reveals a {risk_classification.lower()}-risk scenario with strong indicators of {scenario.value.replace('_', ' ')}. 
Cross-domain correlation analysis shows consistent patterns across all investigation domains, 
confirming the validity of the risk assessment."""

        self.logger.info(f"Generated mock risk assessment for {scenario.value}: overall_risk={risk_score:.2f}")
        return response
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.7:
            return "Critical"
        elif risk_score >= 0.5:
            return "High"
        elif risk_score >= 0.3:
            return "Medium"
        else:
            return "Low"
    
    def _get_trust_level(self, risk_score: float) -> str:
        """Convert risk score to trust level"""
        if risk_score >= 0.7:
            return "Untrusted"
        elif risk_score >= 0.5:
            return "Low Trust"
        elif risk_score >= 0.3:
            return "Medium Trust"
        else:
            return "Trusted"
    
    def _get_deviation_level(self, risk_score: float) -> str:
        """Convert risk score to behavioral deviation level"""
        if risk_score >= 0.7:
            return "Extreme deviation"
        elif risk_score >= 0.5:
            return "High deviation" 
        elif risk_score >= 0.3:
            return "Moderate deviation"
        else:
            return "Minor deviation"
    
    def get_scenario_type(self, scenario_name: str) -> ScenarioType:
        """Convert scenario name to ScenarioType enum"""
        try:
            return ScenarioType(scenario_name.lower())
        except ValueError:
            self.logger.warning(f"Unknown scenario: {scenario_name}, using default")
            return ScenarioType.DEFAULT

# Global instance for use in test runner
mock_response_generator = MockLLMResponseGenerator()

def generate_mock_response(agent_type: str, scenario: str, investigation_id: str, 
                          context_data: Optional[Dict[str, Any]] = None,
                          entity_risk_score: Optional[float] = None) -> str:
    """
    Generate mock response for specified agent type and scenario.
    
    ONLY USED when TestMode.MOCK is active.
    
    Args:
        agent_type: Type of agent (network, device, location, logs, risk)
        scenario: Investigation scenario name
        investigation_id: Unique investigation identifier
        context_data: Additional context for risk assessment (contains other agent responses)
        entity_risk_score: Actual risk score from Snowflake for the entity being investigated
        
    Returns:
        Realistic mock response following Olorin prompt format
    """
    logger.warning("="*80)
    logger.warning("🚨🚨🚨 MOCK LLM MODE ACTIVE - NOT USING REAL AI/LLM 🚨🚨🚨")
    logger.warning(f"    Agent Type: {agent_type}")
    logger.warning(f"    Scenario: {scenario}")
    logger.warning("    This is MOCK data for testing - NO chain of thought, NO tool reasoning")
    logger.warning("    To use REAL LLM: Remove --mode mock from test command")
    logger.warning("="*80)
    
    if entity_risk_score is not None:
        logger.warning(f"📊 Entity has REAL risk score from Snowflake: {entity_risk_score:.4f}")
        logger.warning(f"    Mock responses will be adjusted to reflect this high risk")
    
    scenario_type = mock_response_generator.get_scenario_type(scenario)
    
    if agent_type == "network":
        return mock_response_generator.generate_network_response(scenario_type, investigation_id, entity_risk_score)
    elif agent_type == "device":
        return mock_response_generator.generate_device_response(scenario_type, investigation_id, entity_risk_score)
    elif agent_type == "location":
        return mock_response_generator.generate_location_response(scenario_type, investigation_id, entity_risk_score)
    elif agent_type == "logs":
        return mock_response_generator.generate_logs_response(scenario_type, investigation_id, entity_risk_score)
    elif agent_type == "risk":
        # Risk assessment requires other agent responses
        if context_data:
            device_analysis = context_data.get("device_analysis", "[No device analysis available]")
            location_analysis = context_data.get("location_analysis", "[No location analysis available]") 
            network_analysis = context_data.get("network_analysis", "[No network analysis available]")
            logs_analysis = context_data.get("logs_analysis", "[No logs analysis available]")
            
            return mock_response_generator.generate_risk_assessment_response(
                scenario_type, investigation_id, device_analysis, location_analysis, 
                network_analysis, logs_analysis
            )
        else:
            logger.warning("Risk assessment requested without context data, using minimal response")
            return mock_response_generator.generate_risk_assessment_response(
                scenario_type, investigation_id, 
                "[Device analysis not available]", "[Location analysis not available]",
                "[Network analysis not available]", "[Logs analysis not available]"
            )
    else:
        logger.error(f"Unknown agent type for mock response: {agent_type}")
        return f"Mock response error: Unknown agent type '{agent_type}'"