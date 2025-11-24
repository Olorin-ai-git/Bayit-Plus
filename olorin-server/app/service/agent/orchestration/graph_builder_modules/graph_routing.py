"""
Graph Routing Module

Extracted routing logic from clean_graph_builder.py
"""

from typing import Dict, Any
from langgraph.graph import StateGraph
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState

logger = get_bridge_logger(__name__)


class GraphRouter:
    """Handles routing logic for the investigation graph"""
    
    def __init__(self):
        self.logger = logger
    
    def route_from_orchestrator(self, state: InvestigationState) -> str:
        """
        Route from orchestrator to appropriate next node.
        
        Returns:
            Name of next node to execute
        """
        from app.service.agent.orchestration.clean_graph_builder import route_from_orchestrator
        
        return route_from_orchestrator(state)
    
    def setup_graph_edges(
        self,
        graph: StateGraph
    ) -> None:
        """Setup all graph edges and routing"""
        # Start from data ingestion
        graph.set_entry_point("data_ingestion")
        
        # Data ingestion -> Orchestrator
        graph.add_edge("data_ingestion", "orchestrator")
        
        # Orchestrator -> Route based on state
        graph.add_conditional_edges(
            "orchestrator",
            self.route_from_orchestrator,
            {
                "tools": "tools",
                "network": "network",
                "device": "device",
                "location": "location",
                "logs": "logs",
                "authentication": "authentication",
                "web": "web",
                "merchant": "merchant",
                "risk": "risk",
                "summary": "summary",
                "end": END
            }
        )
        
        # Tools -> Orchestrator (after tool execution)
        graph.add_edge("tools", "orchestrator")
        
        # Domain agents -> Orchestrator (after domain analysis)
        for agent in ["network", "device", "location", "logs", "authentication", "web", "merchant"]:
            graph.add_edge(agent, "orchestrator")
        
        # Risk -> Summary (final step)
        graph.add_edge("risk", "summary")
        
        # Summary -> End
        graph.add_edge("summary", END)
        
        self.logger.debug("✅ Graph edges configured")

