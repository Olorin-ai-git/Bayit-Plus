#!/usr/bin/env python3
"""
Enhanced Mock LLM Response Generator with Chain-of-Thought Reasoning
====================================================================

This module extends the base MockLLMResponseGenerator with:
1. Detailed chain-of-thought reasoning (LLM reasoning process)
2. Granular risk scoring breakdowns (component-level metrics)
3. Evidence-based scoring explanations
4. Confidence intervals and uncertainty quantification

ONLY ACTIVATED when TEST_MODE=mock environment variable is set.
"""

import random
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass

from scripts.testing.mock_llm_responses import (
    MockLLMResponseGenerator,
    ScenarioType,
    MockRiskProfile
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class RiskComponentScore:
    """Risk score with component breakdown and reasoning"""
    score: float
    confidence: int
    components: Dict[str, float]  # e.g., {"VPN detection": 0.80, "proxy chains": 0.65}
    reasoning: str
    evidence: List[str]


class EnhancedMockLLMResponseGenerator(MockLLMResponseGenerator):
    """
    Enhanced mock LLM that generates responses with:
    - Chain-of-thought reasoning (detailed LLM thoughts)
    - Component-level risk score breakdowns
    - Evidence-based scoring explanations
    - Confidence intervals
    """

    def __init__(self):
        super().__init__()
        self.thought_templates = self._initialize_thought_templates()
        self.component_weights = self._initialize_component_weights()

    def _initialize_thought_templates(self) -> Dict[str, List[str]]:
        """Initialize chain-of-thought reasoning templates"""
        return {
            "network": [
                "Analyzing network traffic patterns for anomalies...",
                "Comparing IP reputation against known malicious databases...",
                "Evaluating connection anonymization techniques...",
                "Assessing geographic location consistency with IP geolocation...",
                "Checking for patterns indicative of coordinated infrastructure...",
            ],
            "device": [
                "Extracting device fingerprint characteristics...",
                "Comparing current fingerprint against historical baselines...",
                "Detecting browser automation and emulation signatures...",
                "Analyzing device capability consistency...",
                "Evaluating hardware specifications for spoofing indicators...",
            ],
            "location": [
                "Calculating travel feasibility between locations...",
                "Comparing GPS coordinates with IP geolocation...",
                "Evaluating timezone consistency across transactions...",
                "Analyzing location cluster patterns for anomalies...",
                "Assessing impossibility of travel distance/time combinations...",
            ],
            "logs": [
                "Extracting behavioral patterns from activity logs...",
                "Comparing access frequency against user baselines...",
                "Detecting automation signatures in event sequences...",
                "Analyzing privilege escalation attempts...",
                "Evaluating session characteristics for manipulation indicators...",
            ],
            "risk": [
                "Synthesizing findings across all investigation domains...",
                "Calculating correlation scores between domain indicators...",
                "Assessing attack sophistication levels...",
                "Determining primary threat vectors...",
                "Evaluating cross-domain pattern consistency...",
            ]
        }

    def _initialize_component_weights(self) -> Dict[str, Dict[str, float]]:
        """Initialize component weights for risk scoring"""
        return {
            "network": {
                "vpn_detection": 0.15,
                "proxy_chains": 0.15,
                "ip_reputation": 0.20,
                "geolocation_consistency": 0.20,
                "connection_patterns": 0.15,
                "anonymization_layers": 0.15,
            },
            "device": {
                "fingerprint_consistency": 0.20,
                "user_agent_anomalies": 0.15,
                "automation_signatures": 0.25,
                "emulation_indicators": 0.20,
                "hardware_authenticity": 0.20,
            },
            "location": {
                "travel_feasibility": 0.30,
                "geolocation_consistency": 0.25,
                "timezone_coherence": 0.20,
                "location_clustering": 0.15,
                "gps_accuracy": 0.10,
            },
            "logs": {
                "behavior_baseline_deviation": 0.20,
                "access_frequency": 0.15,
                "automation_likelihood": 0.25,
                "privilege_escalation": 0.20,
                "session_manipulation": 0.20,
            },
            "risk": {
                "domain_correlation": 0.25,
                "attack_sophistication": 0.25,
                "threat_vector_alignment": 0.25,
                "cross_domain_consistency": 0.25,
            },
        }

    def _calculate_component_risk_scores(
        self,
        domain: str,
        base_risk: float,
        entity_risk_score: Optional[float] = None
    ) -> RiskComponentScore:
        """Calculate detailed component-level risk scores"""

        components = {}
        weights = self.component_weights.get(domain, {})

        # Generate component scores with some randomness
        for component_name, weight in weights.items():
            # If entity has high risk, skew components higher
            if entity_risk_score and entity_risk_score > 0.7:
                component_score = base_risk + random.uniform(0.0, 0.2)
            else:
                component_score = base_risk + random.uniform(-0.1, 0.1)

            component_score = max(0.0, min(1.0, component_score))
            components[component_name] = round(component_score, 2)

        # Calculate confidence based on consistency of components
        component_values = list(components.values())
        variance = sum((x - base_risk) ** 2 for x in component_values) / len(component_values)
        consistency = max(0, 1 - variance)
        confidence = int(70 + consistency * 25)  # 70-95% range

        # Generate evidence-based reasoning
        reasoning = self._generate_component_reasoning(
            domain, components, base_risk, entity_risk_score
        )

        # Extract evidence items
        evidence = self._extract_evidence_items(domain, components)

        return RiskComponentScore(
            score=round(base_risk, 2),
            confidence=confidence,
            components=components,
            reasoning=reasoning,
            evidence=evidence
        )

    def _generate_component_reasoning(
        self,
        domain: str,
        components: Dict[str, float],
        overall_risk: float,
        entity_risk_score: Optional[float]
    ) -> str:
        """Generate evidence-based reasoning for risk score"""

        high_components = [
            (name, score) for name, score in components.items()
            if score >= 0.7
        ]
        medium_components = [
            (name, score) for name, score in components.items()
            if 0.4 <= score < 0.7
        ]

        reasoning_parts = []

        if high_components:
            high_items = ", ".join([f"{name} ({score:.2f})" for name, score in high_components])
            reasoning_parts.append(f"High-risk components detected: {high_items}")

        if medium_components:
            medium_items = ", ".join([f"{name} ({score:.2f})" for name, score in medium_components])
            reasoning_parts.append(f"Medium-risk indicators identified: {medium_items}")

        if entity_risk_score and entity_risk_score > 0.7:
            reasoning_parts.append(
                f"Entity carries known risk score ({entity_risk_score:.2f}); "
                f"current investigation corroborates malicious indicators"
            )

        reasoning_parts.append(
            f"Overall {domain} risk assessment: {overall_risk:.2f} "
            f"({self._get_risk_level(overall_risk).lower()})"
        )

        return " ".join(reasoning_parts)

    def _extract_evidence_items(self, domain: str, components: Dict[str, float]) -> List[str]:
        """Extract evidence items from components"""
        evidence = []

        for component_name, score in components.items():
            if score >= 0.7:
                evidence.append(f"Strong evidence: {component_name} at {score:.2f}")
            elif score >= 0.5:
                evidence.append(f"Moderate evidence: {component_name} at {score:.2f}")

        return evidence if evidence else ["Analysis completed with measured risk indicators"]

    def generate_chain_of_thought(self, domain: str, scenario: ScenarioType) -> List[str]:
        """Generate chain-of-thought reasoning steps"""
        templates = self.thought_templates.get(domain, [])

        if not templates:
            return ["Analyzing investigation context..."]

        # Select 3-4 random reasoning steps
        num_steps = random.randint(3, 4)
        selected_steps = random.sample(templates, min(num_steps, len(templates)))

        return selected_steps

    def generate_enhanced_network_response(
        self,
        scenario: ScenarioType,
        investigation_id: str,
        entity_risk_score: Optional[float] = None
    ) -> str:
        """Generate enhanced network analysis response with chain-of-thought"""

        logger.warning("⚠️  USING ENHANCED MOCK LLM - WITH CHAIN-OF-THOUGHT REASONING")

        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["network"]

        # Calculate base risk
        if entity_risk_score is not None:
            risk_score = entity_risk_score * 0.85 + random.uniform(-0.05, 0.05)
        else:
            risk_score = profile.network_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))

        # Get detailed component scores
        component_risk = self._calculate_component_risk_scores(
            "network", risk_score, entity_risk_score
        )

        # Generate chain-of-thought
        thoughts = self.generate_chain_of_thought("network", scenario)

        # Select indicators and mitigations
        num_indicators = random.randint(2, 4)
        indicators = random.sample(templates["indicators"], min(num_indicators, len(templates["indicators"])))
        mitigations = random.sample(templates["mitigations"], min(2, len(templates["mitigations"])))

        risk_level = self._get_risk_level(component_risk.score)

        # Format component breakdown
        component_breakdown = "\n".join([
            f"  - {name}: {score:.2f}"
            for name, score in component_risk.components.items()
        ])

        thought_process = "\n".join([f"  • {thought}" for thought in thoughts])

        response = f"""DOMAIN_RISK_SCORE: {component_risk.score:.2f}
CONFIDENCE: {component_risk.confidence}

[CHAIN-OF-THOUGHT REASONING]
{thought_process}

[DETAILED RISK ANALYSIS]
1. Risk Level: {risk_level}
2. Risk Score: {component_risk.score:.2f} (Confidence: {component_risk.confidence}%)
3. Network Indicators Identified: {', '.join(indicators)}
4. Risk Score Breakdown:
{component_breakdown}

[EVIDENCE-BASED REASONING]
{component_risk.reasoning}

5. Supporting Evidence:
{chr(10).join(['  - ' + evidence for evidence in component_risk.evidence])}

6. Recommended Mitigations: {', '.join(mitigations)}

[DETAILED FINDINGS]
- IP Reputation Score: {random.randint(15, 85)}/100
- Connection Stability: {'Unstable' if component_risk.score > 0.5 else 'Stable'}
- Threat Classification: {profile.threat_level} priority investigation
- Recommended Action Timeline: {'Immediate' if component_risk.score > 0.7 else 'Within 24 hours'}
- Confidence Assessment: {component_risk.confidence}% confident in this assessment

Investigation {investigation_id}: Network analysis shows {len(indicators)} critical indicators.
Pattern analysis indicates {'coordinated malicious activity' if component_risk.score > 0.7 else 'suspicious patterns'}."""

        logger.info(f"Generated enhanced network response: risk={component_risk.score:.2f}")
        return response

    def generate_enhanced_device_response(
        self,
        scenario: ScenarioType,
        investigation_id: str,
        entity_risk_score: Optional[float] = None
    ) -> str:
        """Generate enhanced device analysis response with chain-of-thought"""

        logger.warning("⚠️  USING ENHANCED MOCK LLM - WITH CHAIN-OF-THOUGHT REASONING")

        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["device"]

        # Calculate base risk
        if entity_risk_score is not None:
            risk_score = entity_risk_score * 0.75 + random.uniform(-0.05, 0.05)
        else:
            risk_score = profile.device_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))

        # Get detailed component scores
        component_risk = self._calculate_component_risk_scores(
            "device", risk_score, entity_risk_score
        )

        # Generate chain-of-thought
        thoughts = self.generate_chain_of_thought("device", scenario)

        # Select indicators
        num_indicators = random.randint(2, 3)
        indicators = random.sample(templates["indicators"], min(num_indicators, len(templates["indicators"])))
        actions = random.sample(templates["actions"], min(2, len(templates["actions"])))

        risk_level = self._get_risk_level(component_risk.score)

        # Format component breakdown
        component_breakdown = "\n".join([
            f"  - {name}: {score:.2f}"
            for name, score in component_risk.components.items()
        ])

        thought_process = "\n".join([f"  • {thought}" for thought in thoughts])

        response = f"""DOMAIN_RISK_SCORE: {component_risk.score:.2f}
CONFIDENCE: {component_risk.confidence}

[CHAIN-OF-THOUGHT REASONING]
{thought_process}

[DETAILED RISK ANALYSIS]
1. Risk Level: {risk_level}
2. Risk Score: {component_risk.score:.2f} (Confidence: {component_risk.confidence}%)
3. Fraud Indicators Found: {', '.join(indicators)}
4. Risk Score Breakdown:
{component_breakdown}

[EVIDENCE-BASED REASONING]
{component_risk.reasoning}

5. Supporting Evidence:
{chr(10).join(['  - ' + evidence for evidence in component_risk.evidence])}

6. Recommended Actions: {', '.join(actions)}

[DEVICE FINGERPRINT ANALYSIS]
- Consistency Score: {random.randint(20, 80)}/100
- Spoofing Probability: {component_risk.score * 100:.0f}%
- Hardware Authenticity: {'Questionable' if component_risk.score > 0.6 else 'Verified'}
- Device Trust Level: {self._get_trust_level(component_risk.score)}
- Assessment Confidence: {component_risk.confidence}%

Investigation {investigation_id}: Device analysis reveals {len(indicators)} significant anomalies.
The combination of indicators strongly suggests {'device spoofing' if component_risk.score > 0.7 else 'device anomalies'}."""

        logger.info(f"Generated enhanced device response: risk={component_risk.score:.2f}")
        return response

    def generate_enhanced_location_response(
        self,
        scenario: ScenarioType,
        investigation_id: str,
        entity_risk_score: Optional[float] = None
    ) -> str:
        """Generate enhanced location analysis response with chain-of-thought"""

        logger.warning("⚠️  USING ENHANCED MOCK LLM - WITH CHAIN-OF-THOUGHT REASONING")

        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["location"]

        # Calculate base risk
        if entity_risk_score is not None:
            risk_score = entity_risk_score * 0.70 + random.uniform(-0.05, 0.05)
        else:
            risk_score = profile.location_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))

        # Get detailed component scores
        component_risk = self._calculate_component_risk_scores(
            "location", risk_score, entity_risk_score
        )

        # Generate chain-of-thought
        thoughts = self.generate_chain_of_thought("location", scenario)

        # Select anomalies
        num_anomalies = random.randint(1, 3)
        anomalies = random.sample(templates["anomalies"], min(num_anomalies, len(templates["anomalies"])))
        verification = random.sample(templates["verification"], min(2, len(templates["verification"])))

        risk_level = self._get_risk_level(component_risk.score)

        # Format component breakdown
        component_breakdown = "\n".join([
            f"  - {name}: {score:.2f}"
            for name, score in component_risk.components.items()
        ])

        thought_process = "\n".join([f"  • {thought}" for thought in thoughts])

        response = f"""DOMAIN_RISK_SCORE: {component_risk.score:.2f}
CONFIDENCE: {component_risk.confidence}

[CHAIN-OF-THOUGHT REASONING]
{thought_process}

[DETAILED RISK ANALYSIS]
1. Risk Level: {risk_level}
2. Risk Score: {component_risk.score:.2f} (Confidence: {component_risk.confidence}%)
3. Geographic Anomalies Detected: {', '.join(anomalies)}
4. Risk Score Breakdown:
{component_breakdown}

[EVIDENCE-BASED REASONING]
{component_risk.reasoning}

5. Supporting Evidence:
{chr(10).join(['  - ' + evidence for evidence in component_risk.evidence])}

6. Recommended Verification Steps: {', '.join(verification)}

[GEOGRAPHIC ANALYSIS DETAILS]
- Location Consistency Score: {random.randint(25, 75)}/100
- Travel Feasibility: {'Impossible' if component_risk.score > 0.7 else 'Questionable' if component_risk.score > 0.4 else 'Possible'}
- Geographic Risk Assessment: {profile.threat_level} priority
- Location Verification Required: {'Yes' if component_risk.score > 0.5 else 'Recommended'}
- Assessment Confidence: {component_risk.confidence}%

Investigation {investigation_id}: Location analysis shows {len(anomalies)} critical inconsistencies.
Pattern analysis indicates {'sophisticated location spoofing' if component_risk.score > 0.7 else 'location anomalies'}."""

        logger.info(f"Generated enhanced location response: risk={component_risk.score:.2f}")
        return response

    def generate_enhanced_logs_response(
        self,
        scenario: ScenarioType,
        investigation_id: str,
        entity_risk_score: Optional[float] = None
    ) -> str:
        """Generate enhanced logs analysis response with chain-of-thought"""

        logger.warning("⚠️  USING ENHANCED MOCK LLM - WITH CHAIN-OF-THOUGHT REASONING")

        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])
        templates = self.response_templates["logs"]

        # Calculate base risk
        if entity_risk_score is not None:
            risk_score = entity_risk_score * 0.80 + random.uniform(-0.05, 0.05)
        else:
            risk_score = profile.logs_risk + random.uniform(-0.05, 0.05)
        risk_score = max(0.0, min(1.0, risk_score))

        # Get detailed component scores
        component_risk = self._calculate_component_risk_scores(
            "logs", risk_score, entity_risk_score
        )

        # Generate chain-of-thought
        thoughts = self.generate_chain_of_thought("logs", scenario)

        # Select patterns
        num_patterns = random.randint(2, 4)
        patterns = random.sample(templates["patterns"], min(num_patterns, len(templates["patterns"])))
        monitoring = random.sample(templates["monitoring"], min(2, len(templates["monitoring"])))

        risk_level = self._get_risk_level(component_risk.score)

        # Format component breakdown
        component_breakdown = "\n".join([
            f"  - {name}: {score:.2f}"
            for name, score in component_risk.components.items()
        ])

        thought_process = "\n".join([f"  • {thought}" for thought in thoughts])

        # Generate timeline events
        timeline_events = [
            "Initial anomaly detected: 14:30 UTC",
            f"Pattern escalation observed: {14 + random.randint(1, 3)}:{random.randint(15, 45)} UTC",
            f"Suspicious activity peak: {15 + random.randint(0, 2)}:{random.randint(10, 50)} UTC"
        ]

        response = f"""DOMAIN_RISK_SCORE: {component_risk.score:.2f}
CONFIDENCE: {component_risk.confidence}

[CHAIN-OF-THOUGHT REASONING]
{thought_process}

[DETAILED RISK ANALYSIS]
1. Risk Level: {risk_level}
2. Risk Score: {component_risk.score:.2f} (Confidence: {component_risk.confidence}%)
3. Suspicious Patterns Identified: {', '.join(patterns)}
4. Risk Score Breakdown:
{component_breakdown}

[EVIDENCE-BASED REASONING]
{component_risk.reasoning}

5. Supporting Evidence:
{chr(10).join(['  - ' + evidence for evidence in component_risk.evidence])}

6. Timeline of Suspicious Events:
{chr(10).join(['  - ' + event for event in timeline_events])}

7. Recommended Monitoring Actions: {', '.join(monitoring)}

[BEHAVIORAL ANALYSIS SUMMARY]
- Activity Pattern Score: {random.randint(30, 85)}/100
- Automation Likelihood: {component_risk.score * 100:.0f}%
- User Behavior Deviation: {self._get_deviation_level(component_risk.score)}
- Monitoring Priority: {profile.threat_level}
- Assessment Confidence: {component_risk.confidence}%

Investigation {investigation_id}: Logs analysis over {random.randint(2, 8)} hour timeframe shows {len(patterns)} distinct suspicious patterns.
The behavioral signatures indicate {'highly automated coordinated attack' if component_risk.score > 0.7 else 'suspicious behavioral anomalies'}."""

        logger.info(f"Generated enhanced logs response: risk={component_risk.score:.2f}")
        return response

    def generate_enhanced_risk_assessment(
        self,
        scenario: ScenarioType,
        investigation_id: str,
        device_analysis: str,
        location_analysis: str,
        network_analysis: str,
        logs_analysis: str
    ) -> str:
        """Generate enhanced risk assessment with cross-domain reasoning"""

        logger.warning("⚠️  USING ENHANCED MOCK LLM - WITH CROSS-DOMAIN SYNTHESIS")

        profile = self.risk_profiles.get(scenario, self.risk_profiles[ScenarioType.DEFAULT])

        # Calculate overall risk with variance
        risk_score = profile.overall_risk + random.uniform(-0.03, 0.03)
        risk_score = max(0.0, min(1.0, risk_score))

        # Get detailed component scores
        component_risk = self._calculate_component_risk_scores(
            "risk", risk_score, None
        )

        # Generate cross-domain reasoning
        thoughts = [
            "Synthesizing findings across all investigation domains...",
            "Calculating correlation scores between domain indicators...",
            f"Assessing attack sophistication: {profile.threat_level} level",
            "Evaluating cross-domain pattern consistency...",
            "Determining primary and secondary threat vectors...",
        ]

        risk_classification = self._get_risk_level(component_risk.score)

        # Component breakdown for cross-domain analysis
        component_breakdown = "\n".join([
            f"  - {name}: {score:.2f}"
            for name, score in component_risk.components.items()
        ])

        thought_process = "\n".join([f"  • {thought}" for thought in thoughts])

        critical_indicators = [
            f"Primary threat vector: {scenario.value.replace('_', ' ').title()}",
            "Secondary indicators: Multi-domain anomalies",
            f"Attack sophistication: {profile.threat_level} level"
        ]

        immediate_actions = [
            "Suspend user account pending verification",
            "Implement enhanced monitoring protocols",
            "Flag for immediate security team review",
            "Apply additional authentication requirements"
        ]

        response = f"""OVERALL_RISK_SCORE: {component_risk.score:.2f}
CONFIDENCE: {component_risk.confidence}
RISK_CLASSIFICATION: {risk_classification}

[CROSS-DOMAIN SYNTHESIS]
{thought_process}

[COMPREHENSIVE RISK ASSESSMENT]
1. Overall Risk Score: {component_risk.score:.2f}
2. Final Risk Classification: {risk_classification}
3. Assessment Confidence: {component_risk.confidence}%
4. Cross-Domain Consistency Score: {random.randint(75, 95)}/100

[CRITICAL INDICATORS]
{chr(10).join(['  - ' + indicator for indicator in critical_indicators])}

[RISK SCORE BREAKDOWN BY DOMAIN]
{component_breakdown}

[EVIDENCE-BASED SYNTHESIS]
{component_risk.reasoning}

[SUPPORTING EVIDENCE ACROSS DOMAINS]
{chr(10).join(['  - ' + evidence for evidence in component_risk.evidence])}

[IMMEDIATE ACTIONS RECOMMENDED]
{chr(10).join(['  - ' + action for action in immediate_actions[:2]])}

[DOMAIN ANALYSIS SUMMARY]
Network Risk Contribution: {profile.network_risk:.2f}
Device Risk Contribution: {profile.device_risk:.2f}
Location Risk Contribution: {profile.location_risk:.2f}
Logs Risk Contribution: {profile.logs_risk:.2f}
Overall Synthesized Risk: {component_risk.score:.2f} ({risk_classification.lower()})

[THREAT INTELLIGENCE]
- Overall Threat Level: {profile.threat_level}
- Investigation Priority: {'Critical' if component_risk.score > 0.7 else 'High' if component_risk.score > 0.5 else 'Medium'}
- Assessment Confidence: {component_risk.confidence}%
- Recommended Response Timeline: {'Immediate' if component_risk.score > 0.7 else '< 4 hours' if component_risk.score > 0.5 else '< 24 hours'}

[CONCLUSION]
Investigation {investigation_id}: The investigation reveals a {risk_classification.lower()}-risk scenario
with strong indicators of {scenario.value.replace('_', ' ')}. Cross-domain correlation analysis shows
consistent patterns across all investigation domains (Network: {profile.network_risk:.2f}, Device: {profile.device_risk:.2f},
Location: {profile.location_risk:.2f}, Logs: {profile.logs_risk:.2f}), confirming the validity of the
risk assessment at {component_risk.confidence}% confidence level."""

        logger.info(f"Generated enhanced risk assessment: risk={component_risk.score:.2f}")
        return response


# Global instance for use in test runner
enhanced_mock_response_generator = EnhancedMockLLMResponseGenerator()


def generate_enhanced_mock_response(
    agent_type: str,
    scenario: str,
    investigation_id: str,
    context_data: Optional[Dict[str, Any]] = None,
    entity_risk_score: Optional[float] = None,
    use_enhanced: bool = True
) -> str:
    """
    Generate enhanced mock response with chain-of-thought reasoning.

    Args:
        agent_type: Type of agent (network, device, location, logs, risk)
        scenario: Investigation scenario name
        investigation_id: Unique investigation identifier
        context_data: Additional context for risk assessment
        entity_risk_score: Actual risk score from Snowflake
        use_enhanced: Whether to use enhanced responses (default True)

    Returns:
        Enhanced mock response with chain-of-thought and risk breakdowns
    """

    if not use_enhanced:
        # Fall back to base generator if enhanced mode disabled
        from scripts.testing.mock_llm_responses import generate_mock_response
        return generate_mock_response(agent_type, scenario, investigation_id, context_data, entity_risk_score)

    logger.warning("="*80)
    logger.warning("🧠 ENHANCED MOCK LLM MODE - WITH CHAIN-OF-THOUGHT REASONING 🧠")
    logger.warning(f"    Agent Type: {agent_type}")
    logger.warning(f"    Scenario: {scenario}")
    logger.warning(f"    With Detailed Risk Breakdowns: Yes")
    logger.warning(f"    Chain-of-Thought Reasoning: Enabled")
    logger.warning("="*80)

    if entity_risk_score is not None:
        logger.warning(f"📊 Entity Risk Score (Snowflake): {entity_risk_score:.4f}")

    scenario_type = enhanced_mock_response_generator.get_scenario_type(scenario)

    if agent_type == "network":
        return enhanced_mock_response_generator.generate_enhanced_network_response(
            scenario_type, investigation_id, entity_risk_score
        )
    elif agent_type == "device":
        return enhanced_mock_response_generator.generate_enhanced_device_response(
            scenario_type, investigation_id, entity_risk_score
        )
    elif agent_type == "location":
        return enhanced_mock_response_generator.generate_enhanced_location_response(
            scenario_type, investigation_id, entity_risk_score
        )
    elif agent_type == "logs":
        return enhanced_mock_response_generator.generate_enhanced_logs_response(
            scenario_type, investigation_id, entity_risk_score
        )
    elif agent_type == "risk":
        if context_data:
            device_analysis = context_data.get("device_analysis", "[No device analysis available]")
            location_analysis = context_data.get("location_analysis", "[No location analysis available]")
            network_analysis = context_data.get("network_analysis", "[No network analysis available]")
            logs_analysis = context_data.get("logs_analysis", "[No logs analysis available]")

            return enhanced_mock_response_generator.generate_enhanced_risk_assessment(
                scenario_type, investigation_id, device_analysis, location_analysis,
                network_analysis, logs_analysis
            )
        else:
            logger.warning("Risk assessment requested without context data")
            return enhanced_mock_response_generator.generate_enhanced_risk_assessment(
                scenario_type, investigation_id,
                "[Device analysis not available]", "[Location analysis not available]",
                "[Network analysis not available]", "[Logs analysis not available]"
            )
    else:
        logger.error(f"Unknown agent type for enhanced mock response: {agent_type}")
        return f"Enhanced mock response error: Unknown agent type '{agent_type}'"
