"""
Multi-Agent Coordinator

Coordinates investigation flow between specialized fraud detection agents.
"""

import asyncio
from typing import Any, Dict, List


class MultiAgentCoordinator:
    """Coordinates investigation flow between specialized fraud detection agents"""
    
    def __init__(self, openai_client, tools, ws_streaming=None):
        self.client = openai_client
        self.tools = tools
        self.ws_streaming = ws_streaming
        self.domain_agents = {
            "network": {"name": "Network Analysis Agent", "specialization": "IP analysis, VPN/proxy detection, network patterns"},
            "device": {"name": "Device Analysis Agent", "specialization": "Device fingerprinting, browser analysis, hardware patterns"},
            "location": {"name": "Location Analysis Agent", "specialization": "Geographic analysis, timezone validation, location patterns"},
            "logs": {"name": "Logs Analysis Agent", "specialization": "Event log analysis, behavioral patterns, anomaly detection"}
        }
    
    async def route_investigation(self, context: Dict[str, Any]) -> List[str]:
        """Intelligently route investigation to appropriate agents based on context"""
        required_agents = []
        
        investigation_type = context.get("investigation_type", "general")
        available_data = context.get("data_types", [])
        
        # Route based on investigation type
        if investigation_type in ["ato", "account_takeover"]:
            required_agents.extend(["network", "device", "location", "logs"])
        elif investigation_type == "login_anomaly":
            required_agents.extend(["network", "location", "logs"])
        elif investigation_type == "device_fraud":
            required_agents.extend(["device", "network"])
        else:
            # Default comprehensive investigation
            required_agents.extend(["network", "device", "location", "logs"])
        
        # Filter based on available data
        if "ip" not in available_data and "network" in required_agents:
            required_agents.remove("network")
        if "device_fingerprint" not in available_data and "device" in required_agents:
            required_agents.remove("device")
        
        return required_agents
    
    async def determine_execution_strategy(self, agents: List[str], context: Dict[str, Any]) -> str:
        """Determine if agents should run parallel or sequential"""
        priority = context.get("priority", "normal")
        data_dependencies = context.get("data_dependencies", [])
        
        # High priority investigations run in parallel for speed
        if priority == "high":
            return "parallel"
        
        # Sequential if there are clear data dependencies
        if data_dependencies:
            return "sequential"
        
        # Default to parallel for efficiency
        return "parallel"


class HandoffManager:
    """Manages intelligent handoffs between domain agents"""
    
    def __init__(self, openai_client):
        self.client = openai_client
        self.handoff_history = []
    
    async def create_handoff_context(self, from_agent: str, to_agent: str, 
                                   investigation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create context for agent handoff with relevant investigation data"""
        
        handoff_context = {
            "from_agent": from_agent,
            "to_agent": to_agent,
            "handoff_time": asyncio.get_event_loop().time(),
            "investigation_id": investigation_data.get("investigation_id"),
            "user_id": investigation_data.get("user_id"),
            "findings_summary": investigation_data.get("findings", {}),
            "priority_areas": self._identify_priority_areas(from_agent, investigation_data)
        }
        
        self.handoff_history.append(handoff_context)
        return handoff_context
    
    def _identify_priority_areas(self, from_agent: str, data: Dict[str, Any]) -> List[str]:
        """Identify priority areas for the next agent based on previous findings"""
        priorities = []
        findings = data.get("findings", {})
        
        if from_agent == "network" and findings.get("vpn_detected"):
            priorities.append("device_consistency_check")
        if from_agent == "device" and findings.get("device_anomaly"):
            priorities.append("location_correlation")
        if from_agent == "location" and findings.get("location_mismatch"):
            priorities.append("log_pattern_analysis")
            
        return priorities