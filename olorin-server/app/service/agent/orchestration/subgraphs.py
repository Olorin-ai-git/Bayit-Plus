"""
Subgraph Patterns - Domain-specific investigation subgraphs for modular orchestration.

This module implements Phase 2 of the LangGraph enhancement plan, providing:
- Modular subgraphs for each investigation domain
- Specialized validation logic per domain
- Domain-specific error handling
- Cross-subgraph communication patterns
"""

from typing import Dict, Any, List, Optional, Annotated
from abc import ABC, abstractmethod

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Import clean graph domain agents directly
from app.service.agent.orchestration.domain_agents.network_agent import network_agent_node
from app.service.agent.orchestration.domain_agents.device_agent import device_agent_node
from app.service.agent.orchestration.domain_agents.location_agent import location_agent_node
from app.service.agent.orchestration.domain_agents.logs_agent import logs_agent_node
from app.service.logging import get_bridge_logger
from app.service.agent.investigators.domain_agents import (
    network_agent, location_agent, logs_agent, device_agent
)

logger = get_bridge_logger(__name__)


class DomainState(TypedDict):
    """State for domain-specific subgraphs."""
    messages: Annotated[List[BaseMessage], add_messages]
    entity_id: str
    entity_type: str
    investigation_id: str
    domain_findings: Dict[str, Any]
    domain_risk_score: float
    domain_confidence: float


class BaseDomainSubgraph(ABC):
    """Base class for domain-specific investigation subgraphs."""
    
    def __init__(self, domain_name: str, autonomous: bool = True):
        """
        Initialize domain subgraph.
        
        Args:
            domain_name: Name of the investigation domain
            autonomous: Whether to use autonomous agents
        """
        self.domain_name = domain_name
        self.autonomous = autonomous
        self.graph = None
        
    @abstractmethod
    def create_graph(self) -> StateGraph:
        """Create the domain-specific graph."""
        pass
    
    @abstractmethod
    def validate_domain_data(self, state: DomainState) -> bool:
        """
        Validate domain-specific data.
        
        Args:
            state: Current investigation state
            
        Returns:
            True if data is valid for this domain
        """
        pass
    
    def handle_domain_error(self, error: Exception, state: DomainState) -> DomainState:
        """
        Handle domain-specific errors.
        
        Args:
            error: Exception that occurred
            state: Current state
            
        Returns:
            Updated state with error information
        """
        logger.error(f"Error in {self.domain_name} subgraph: {error}")
        state["domain_findings"][f"{self.domain_name}_error"] = str(error)
        state["domain_confidence"] = 0.0
        return state
    
    def compile(self, checkpointer=None):
        """
        Compile the subgraph.
        
        Args:
            checkpointer: Optional checkpointer for state persistence
            
        Returns:
            Compiled subgraph
        """
        if not self.graph:
            self.graph = self.create_graph()
        return self.graph.compile(checkpointer=checkpointer)


class DeviceAnalysisSubgraph(BaseDomainSubgraph):
    """Subgraph for device fingerprint analysis."""
    
    def __init__(self, autonomous: bool = True):
        """Initialize device analysis subgraph."""
        super().__init__("device", autonomous)
        
    def create_graph(self) -> StateGraph:
        """Create device analysis graph with specialized tools and validation."""
        graph = StateGraph(DomainState)
        
        # Add nodes
        graph.add_node("validate_device_data", self.validate_device_data_node)
        graph.add_node("analyze_fingerprint", self.analyze_fingerprint_node)
        graph.add_node("detect_spoofing", self.detect_spoofing_node)
        graph.add_node("calculate_device_risk", self.calculate_device_risk_node)
        
        # Define edges
        graph.set_entry_point("validate_device_data")
        graph.add_edge("validate_device_data", "analyze_fingerprint")
        graph.add_edge("analyze_fingerprint", "detect_spoofing")
        graph.add_edge("detect_spoofing", "calculate_device_risk")
        graph.add_edge("calculate_device_risk", END)
        
        return graph
    
    def validate_domain_data(self, state: DomainState) -> bool:
        """Validate device-specific data."""
        # Check for required device data
        if "entity_id" not in state or not state["entity_id"]:
            return False
        
        # Additional device-specific validation
        return True
    
    async def validate_device_data_node(self, state: DomainState) -> DomainState:
        """Validate device data before analysis."""
        if not self.validate_domain_data(state):
            return self.handle_domain_error(
                ValueError("Invalid device data"), 
                state
            )
        
        state["domain_findings"]["validation"] = "passed"
        return state
    
    async def analyze_fingerprint_node(self, state: DomainState) -> DomainState:
        """Analyze device fingerprint patterns."""
        try:
            # Use appropriate agent based on autonomous setting
            if self.autonomous:
                result = await device_agent_node(state)
            else:
                result = await device_agent(state)
            
            state["domain_findings"]["fingerprint_analysis"] = result
            return state
            
        except Exception as e:
            return self.handle_domain_error(e, state)
    
    async def detect_spoofing_node(self, state: DomainState) -> DomainState:
        """Detect potential device spoofing."""
        # Specialized spoofing detection logic
        spoofing_indicators = []
        
        # Check for suspicious patterns
        if "fingerprint_analysis" in state["domain_findings"]:
            analysis = state["domain_findings"]["fingerprint_analysis"]
            # Add spoofing detection logic here
            
        state["domain_findings"]["spoofing_indicators"] = spoofing_indicators
        return state
    
    async def calculate_device_risk_node(self, state: DomainState) -> DomainState:
        """Calculate domain-specific risk score."""
        risk_score = 0.0
        confidence = 0.0
        
        # Calculate based on findings
        if "spoofing_indicators" in state["domain_findings"]:
            indicators = state["domain_findings"]["spoofing_indicators"]
            if indicators:
                risk_score += len(indicators) * 0.2
        
        # Normalize risk score
        risk_score = min(1.0, max(0.0, risk_score))
        confidence = 0.8 if state["domain_findings"].get("validation") == "passed" else 0.3
        
        state["domain_risk_score"] = risk_score
        state["domain_confidence"] = confidence
        
        return state


class NetworkAnalysisSubgraph(BaseDomainSubgraph):
    """Subgraph for network pattern analysis."""
    
    def __init__(self, autonomous: bool = True):
        """Initialize network analysis subgraph."""
        super().__init__("network", autonomous)
        
    def create_graph(self) -> StateGraph:
        """Create network analysis graph with specialized investigation logic."""
        graph = StateGraph(DomainState)
        
        # Add nodes
        graph.add_node("validate_network_data", self.validate_network_data_node)
        graph.add_node("analyze_traffic_patterns", self.analyze_traffic_patterns_node)
        graph.add_node("detect_anomalies", self.detect_anomalies_node)
        graph.add_node("identify_vpn_proxy", self.identify_vpn_proxy_node)
        graph.add_node("calculate_network_risk", self.calculate_network_risk_node)
        
        # Define edges
        graph.set_entry_point("validate_network_data")
        graph.add_edge("validate_network_data", "analyze_traffic_patterns")
        graph.add_edge("analyze_traffic_patterns", "detect_anomalies")
        graph.add_edge("detect_anomalies", "identify_vpn_proxy")
        graph.add_edge("identify_vpn_proxy", "calculate_network_risk")
        graph.add_edge("calculate_network_risk", END)
        
        return graph
    
    def validate_domain_data(self, state: DomainState) -> bool:
        """Validate network-specific data."""
        return "entity_id" in state and state["entity_id"]
    
    async def validate_network_data_node(self, state: DomainState) -> DomainState:
        """Validate network data before analysis."""
        if not self.validate_domain_data(state):
            return self.handle_domain_error(
                ValueError("Invalid network data"), 
                state
            )
        
        state["domain_findings"]["validation"] = "passed"
        return state
    
    async def analyze_traffic_patterns_node(self, state: DomainState) -> DomainState:
        """Analyze network traffic patterns."""
        try:
            # Use appropriate agent
            if self.autonomous:
                result = await network_agent_node(state)
            else:
                result = await network_agent(state)
            
            state["domain_findings"]["traffic_analysis"] = result
            return state
            
        except Exception as e:
            return self.handle_domain_error(e, state)
    
    async def detect_anomalies_node(self, state: DomainState) -> DomainState:
        """Detect network anomalies."""
        anomalies = []
        
        # Analyze for anomalies
        if "traffic_analysis" in state["domain_findings"]:
            # Add anomaly detection logic
            pass
        
        state["domain_findings"]["anomalies"] = anomalies
        return state
    
    async def identify_vpn_proxy_node(self, state: DomainState) -> DomainState:
        """Identify VPN or proxy usage."""
        vpn_indicators = {
            "vpn_detected": False,
            "proxy_detected": False,
            "tor_detected": False,
            "confidence": 0.0
        }
        
        # VPN/Proxy detection logic
        state["domain_findings"]["vpn_proxy"] = vpn_indicators
        return state
    
    async def calculate_network_risk_node(self, state: DomainState) -> DomainState:
        """Calculate network risk score."""
        risk_score = 0.0
        
        # Factor in anomalies
        if state["domain_findings"].get("anomalies"):
            risk_score += 0.3
        
        # Factor in VPN/Proxy
        vpn_proxy = state["domain_findings"].get("vpn_proxy", {})
        if vpn_proxy.get("vpn_detected") or vpn_proxy.get("proxy_detected"):
            risk_score += 0.2
        if vpn_proxy.get("tor_detected"):
            risk_score += 0.4
        
        # Normalize
        risk_score = min(1.0, max(0.0, risk_score))
        
        state["domain_risk_score"] = risk_score
        state["domain_confidence"] = 0.75
        
        return state


class LocationAnalysisSubgraph(BaseDomainSubgraph):
    """Subgraph for geographic location analysis."""
    
    def __init__(self, autonomous: bool = True):
        """Initialize location analysis subgraph."""
        super().__init__("location", autonomous)
        
    def create_graph(self) -> StateGraph:
        """Create location analysis graph."""
        graph = StateGraph(DomainState)
        
        # Add nodes
        graph.add_node("validate_location_data", self.validate_location_data_node)
        graph.add_node("analyze_geographic_patterns", self.analyze_geographic_patterns_node)
        graph.add_node("detect_impossible_travel", self.detect_impossible_travel_node)
        graph.add_node("calculate_location_risk", self.calculate_location_risk_node)
        
        # Define edges
        graph.set_entry_point("validate_location_data")
        graph.add_edge("validate_location_data", "analyze_geographic_patterns")
        graph.add_edge("analyze_geographic_patterns", "detect_impossible_travel")
        graph.add_edge("detect_impossible_travel", "calculate_location_risk")
        graph.add_edge("calculate_location_risk", END)
        
        return graph
    
    def validate_domain_data(self, state: DomainState) -> bool:
        """Validate location-specific data."""
        return True  # Basic validation
    
    async def validate_location_data_node(self, state: DomainState) -> DomainState:
        """Validate location data."""
        if not self.validate_domain_data(state):
            return self.handle_domain_error(
                ValueError("Invalid location data"), 
                state
            )
        
        state["domain_findings"]["validation"] = "passed"
        return state
    
    async def analyze_geographic_patterns_node(self, state: DomainState) -> DomainState:
        """Analyze geographic patterns."""
        try:
            if self.autonomous:
                result = await location_agent_node(state)
            else:
                result = await location_agent(state)
            
            state["domain_findings"]["geographic_analysis"] = result
            return state
            
        except Exception as e:
            return self.handle_domain_error(e, state)
    
    async def detect_impossible_travel_node(self, state: DomainState) -> DomainState:
        """Detect impossible travel scenarios."""
        impossible_travel = {
            "detected": False,
            "locations": [],
            "time_delta": None
        }
        
        # Impossible travel detection logic
        state["domain_findings"]["impossible_travel"] = impossible_travel
        return state
    
    async def calculate_location_risk_node(self, state: DomainState) -> DomainState:
        """Calculate location risk score."""
        risk_score = 0.0
        
        # Factor in impossible travel
        if state["domain_findings"].get("impossible_travel", {}).get("detected"):
            risk_score += 0.6
        
        # Normalize
        risk_score = min(1.0, max(0.0, risk_score))
        
        state["domain_risk_score"] = risk_score
        state["domain_confidence"] = 0.7
        
        return state


class LogsAnalysisSubgraph(BaseDomainSubgraph):
    """Subgraph for activity logs analysis."""
    
    def __init__(self, autonomous: bool = True):
        """Initialize logs analysis subgraph."""
        super().__init__("logs", autonomous)
        
    def create_graph(self) -> StateGraph:
        """Create logs analysis graph."""
        graph = StateGraph(DomainState)
        
        # Add nodes
        graph.add_node("validate_logs_data", self.validate_logs_data_node)
        graph.add_node("analyze_activity_patterns", self.analyze_activity_patterns_node)
        graph.add_node("detect_suspicious_activity", self.detect_suspicious_activity_node)
        graph.add_node("calculate_logs_risk", self.calculate_logs_risk_node)
        
        # Define edges
        graph.set_entry_point("validate_logs_data")
        graph.add_edge("validate_logs_data", "analyze_activity_patterns")
        graph.add_edge("analyze_activity_patterns", "detect_suspicious_activity")
        graph.add_edge("detect_suspicious_activity", "calculate_logs_risk")
        graph.add_edge("calculate_logs_risk", END)
        
        return graph
    
    def validate_domain_data(self, state: DomainState) -> bool:
        """Validate logs-specific data."""
        return True
    
    async def validate_logs_data_node(self, state: DomainState) -> DomainState:
        """Validate logs data."""
        if not self.validate_domain_data(state):
            return self.handle_domain_error(
                ValueError("Invalid logs data"), 
                state
            )
        
        state["domain_findings"]["validation"] = "passed"
        return state
    
    async def analyze_activity_patterns_node(self, state: DomainState) -> DomainState:
        """Analyze activity patterns in logs."""
        try:
            if self.autonomous:
                result = await logs_agent_node(state)
            else:
                result = await logs_agent(state)
            
            state["domain_findings"]["activity_analysis"] = result
            return state
            
        except Exception as e:
            return self.handle_domain_error(e, state)
    
    async def detect_suspicious_activity_node(self, state: DomainState) -> DomainState:
        """Detect suspicious activity patterns."""
        suspicious_patterns = []
        
        # Suspicious activity detection
        state["domain_findings"]["suspicious_patterns"] = suspicious_patterns
        return state
    
    async def calculate_logs_risk_node(self, state: DomainState) -> DomainState:
        """Calculate logs risk score."""
        risk_score = 0.0
        
        # Factor in suspicious patterns
        if state["domain_findings"].get("suspicious_patterns"):
            risk_score += len(state["domain_findings"]["suspicious_patterns"]) * 0.15
        
        # Normalize
        risk_score = min(1.0, max(0.0, risk_score))
        
        state["domain_risk_score"] = risk_score
        state["domain_confidence"] = 0.65
        
        return state


class SubgraphOrchestrator:
    """Orchestrates multiple domain subgraphs for comprehensive investigation."""
    
    def __init__(self, autonomous: bool = True):
        """
        Initialize subgraph orchestrator.
        
        Args:
            autonomous: Whether to use autonomous agents
        """
        self.autonomous = autonomous
        self.subgraphs = {
            "device": DeviceAnalysisSubgraph(autonomous),
            "network": NetworkAnalysisSubgraph(autonomous),
            "location": LocationAnalysisSubgraph(autonomous),
            "logs": LogsAnalysisSubgraph(autonomous)
        }
        
    async def run_parallel_investigation(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run all domain subgraphs in parallel.
        
        Args:
            state: Initial investigation state
            
        Returns:
            Combined results from all domains
        """
        import asyncio
        
        # Create tasks for each subgraph
        tasks = []
        for domain_name, subgraph in self.subgraphs.items():
            # Compile and run subgraph
            compiled = subgraph.compile()
            domain_state = DomainState(
                messages=state.get("messages", []),
                entity_id=state.get("entity_id", ""),
                entity_type=state.get("entity_type", ""),
                investigation_id=state.get("investigation_id", ""),
                domain_findings={},
                domain_risk_score=0.0,
                domain_confidence=0.0
            )
            tasks.append(compiled.ainvoke(domain_state))
        
        # Run all subgraphs in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        combined_findings = {}
        combined_risk_scores = {}
        
        for domain_name, result in zip(self.subgraphs.keys(), results):
            if isinstance(result, Exception):
                logger.error(f"Subgraph {domain_name} failed: {result}")
                combined_findings[domain_name] = {"error": str(result)}
                combined_risk_scores[domain_name] = {"score": 0.0, "confidence": 0.0}
            else:
                combined_findings[domain_name] = result.get("domain_findings", {})
                combined_risk_scores[domain_name] = {
                    "score": result.get("domain_risk_score", 0.0),
                    "confidence": result.get("domain_confidence", 0.0)
                }
        
        return {
            "domain_findings": combined_findings,
            "domain_risk_scores": combined_risk_scores,
            "overall_risk": self._calculate_overall_risk(combined_risk_scores)
        }
    
    def _calculate_overall_risk(self, risk_scores: Dict[str, Dict[str, float]]) -> float:
        """
        Calculate overall risk from domain scores.
        
        Args:
            risk_scores: Domain risk scores with confidence
            
        Returns:
            Weighted overall risk score
        """
        total_weighted_score = 0.0
        total_confidence = 0.0
        
        for domain, scores in risk_scores.items():
            score = scores.get("score", 0.0)
            confidence = scores.get("confidence", 0.0)
            
            total_weighted_score += score * confidence
            total_confidence += confidence
        
        if total_confidence > 0:
            return total_weighted_score / total_confidence
        return 0.0
    
    async def run_sequential_investigation(self, state: Dict[str, Any], 
                                          domain_order: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Run domain subgraphs sequentially with data passing.
        
        Args:
            state: Initial investigation state
            domain_order: Optional order for domain execution
            
        Returns:
            Combined results from sequential execution
        """
        if not domain_order:
            domain_order = ["device", "network", "location", "logs"]
        
        combined_findings = {}
        combined_risk_scores = {}
        current_state = state.copy()
        
        for domain_name in domain_order:
            if domain_name not in self.subgraphs:
                logger.warning(f"Unknown domain: {domain_name}")
                continue
            
            subgraph = self.subgraphs[domain_name]
            compiled = subgraph.compile()
            
            # Create domain state with previous findings
            domain_state = DomainState(
                messages=current_state.get("messages", []),
                entity_id=current_state.get("entity_id", ""),
                entity_type=current_state.get("entity_type", ""),
                investigation_id=current_state.get("investigation_id", ""),
                domain_findings=combined_findings.copy(),  # Pass previous findings
                domain_risk_score=0.0,
                domain_confidence=0.0
            )
            
            try:
                result = await compiled.ainvoke(domain_state)
                
                # Update combined findings
                combined_findings[domain_name] = result.get("domain_findings", {})
                combined_risk_scores[domain_name] = {
                    "score": result.get("domain_risk_score", 0.0),
                    "confidence": result.get("domain_confidence", 0.0)
                }
                
                # Update state for next domain
                current_state["previous_findings"] = combined_findings
                
            except Exception as e:
                logger.error(f"Subgraph {domain_name} failed: {e}")
                combined_findings[domain_name] = {"error": str(e)}
                combined_risk_scores[domain_name] = {"score": 0.0, "confidence": 0.0}
        
        return {
            "domain_findings": combined_findings,
            "domain_risk_scores": combined_risk_scores,
            "overall_risk": self._calculate_overall_risk(combined_risk_scores)
        }