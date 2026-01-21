"""
Agent Coordination Prompts for Orchestrator

Provides specialized prompts for coordinating individual investigation agents
with handoff management and cross-domain analysis instructions.
"""

import json
from typing import Any, Dict


class AgentCoordinationManager:
    """Manager for agent-specific coordination prompts and handoff instructions"""

    def __init__(self):
        self.agent_prompts = self._initialize_agent_prompts()

    def get_agent_prompt(
        self, agent_name: str, coordination_context: Dict[str, Any]
    ) -> str:
        """Get specialized coordination prompt for specific agent"""

        if agent_name not in self.agent_prompts:
            return self._get_generic_agent_prompt(agent_name, coordination_context)

        template = self.agent_prompts[agent_name]
        return template.format(**coordination_context)

    def _initialize_agent_prompts(self) -> Dict[str, str]:
        """Initialize agent-specific coordination prompts"""

        return {
            "network": self._get_network_agent_prompt(),
            "device": self._get_device_agent_prompt(),
            "location": self._get_location_agent_prompt(),
            "logs": self._get_logs_agent_prompt(),
            "risk": self._get_risk_agent_prompt(),
        }

    def _get_network_agent_prompt(self) -> str:
        """Network agent coordination prompt"""

        return """Network Security Analyst - IP and Geographic Analysis

COORDINATION CONTEXT: {coordination_context}
HANDOFF REASON: {handoff_reason}
AVAILABLE DATA: {available_data}

ANALYSIS PRIORITIES:
1. IP reputation and threat intelligence correlation
2. Geographic feasibility and travel pattern validation
3. VPN/Proxy detection and anonymization analysis
4. Network behavior pattern identification

COORDINATION REQUIREMENTS:
- Share geographic findings with Location Agent
- Provide device correlation data to Device Agent
- Flag high-risk IPs for Risk Agent escalation"""

    def _get_device_agent_prompt(self) -> str:
        """Device agent coordination prompt"""

        return """Device Fraud Detection Specialist - Hardware and Behavioral Analysis

COORDINATION CONTEXT: {coordination_context}
HANDOFF REASON: {handoff_reason}
AVAILABLE DATA: {available_data}

ANALYSIS PRIORITIES:
1. Device fingerprinting and uniqueness assessment
2. Hardware configuration anomaly detection
3. Behavioral pattern analysis and deviation scoring
4. Device sharing and impersonation detection

COORDINATION REQUIREMENTS:
- Correlate device data with Network Agent findings
- Share behavioral patterns with Logs Agent
- Provide device risk factors to Risk Agent"""

    def _get_location_agent_prompt(self) -> str:
        """Location agent coordination prompt"""

        return """Geographic Validation Specialist - Location and Travel Analysis

COORDINATION CONTEXT: {coordination_context}
HANDOFF REASON: {handoff_reason}
AVAILABLE DATA: {available_data}

ANALYSIS PRIORITIES:
1. Geographic location validation and impossibility detection
2. Travel pattern analysis and velocity calculations
3. Location history correlation and anomaly identification
4. Time zone and regional behavior consistency

COORDINATION REQUIREMENTS:
- Cross-reference with Network Agent IP geolocation
- Validate device mobility patterns with Device Agent
- Provide location timeline to Logs Agent"""

    def _get_logs_agent_prompt(self) -> str:
        """Logs agent coordination prompt"""

        return """Activity Log Analyst - Pattern Detection and Timeline Analysis  

COORDINATION CONTEXT: {coordination_context}
HANDOFF REASON: {handoff_reason}
AVAILABLE DATA: {available_data}

ANALYSIS PRIORITIES:
1. Activity timeline construction and gap analysis
2. Behavioral pattern recognition and anomaly detection
3. Cross-system activity correlation
4. Frequency and sequence pattern analysis

COORDINATION REQUIREMENTS:
- Incorporate network findings for activity correlation
- Validate device patterns with Device Agent data
- Confirm location timeline with Location Agent"""

    def _get_risk_agent_prompt(self) -> str:
        """Risk agent coordination prompt"""

        return """Risk Assessment Coordinator - Cross-Domain Risk Analysis

COORDINATION CONTEXT: {coordination_context}
HANDOFF REASON: {handoff_reason}
AVAILABLE DATA: {available_data}

ANALYSIS PRIORITIES:
1. Multi-factor risk score calculation and weighting
2. Cross-domain risk correlation and amplification
3. Threat level assessment and escalation recommendations
4. Confidence scoring and recommendation synthesis

COORDINATION REQUIREMENTS:
- Synthesize findings from all specialized agents
- Weight risk factors based on agent confidence levels
- Provide final risk assessment with actionable recommendations"""

    def _get_generic_agent_prompt(
        self, agent_name: str, coordination_context: Dict[str, Any]
    ) -> str:
        """Generic agent prompt for unknown agents"""

        return f"""Unknown Agent ({agent_name}) - Generic Coordination

COORDINATION CONTEXT: {json.dumps(coordination_context, default=str)}

GENERAL REQUIREMENTS:
1. Perform domain-specific analysis based on agent capabilities
2. Provide structured results with confidence scoring
3. Include clear reasoning and methodology
4. Coordinate findings with other active agents
5. Maintain bulletproof operation through all scenarios"""
