"""
Edge Configurator - Defines workflow edges and routing for hybrid intelligence.

This module configures all edges and routing logic for the hybrid intelligence
investigation graph workflow.
"""

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import tools_condition

from app.service.agent.orchestration.enhanced_routing import raw_data_or_investigation_routing
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EdgeConfigurator:
    """
    Configures edges and routing for the hybrid intelligence graph.
    
    Handles all workflow connections and conditional routing logic.
    """
    
    def __init__(self, components: dict):
        """Initialize with graph foundation components."""
        self.components = components
        self.intelligent_router = components["intelligent_router"]
        
    def define_workflow_edges(
        self, 
        builder: StateGraph, 
        use_enhanced_tools: bool = False
    ) -> None:
        """
        Define the complete hybrid workflow edge configuration.
        
        Args:
            builder: StateGraph builder to configure
            use_enhanced_tools: Whether enhanced tool tracking is enabled
        """
        logger.debug("🔗 Configuring hybrid workflow edges")
        
        # Start with investigation
        builder.add_edge(START, "start_investigation")
        
        # Configure investigation routing
        self._configure_investigation_routing(builder)
        
        # Configure tool routing
        self._configure_tool_routing(builder, use_enhanced_tools)
        
        # Configure intelligence and safety routing
        self._configure_intelligence_routing(builder)
        
        # Configure orchestrator routing
        self._configure_orchestrator_routing(builder)
        
        # Configure domain agent routing
        self._configure_domain_agent_routing(builder)
        
        # Configure completion routing
        self._configure_completion_routing(builder)
        
        logger.debug("✅ Hybrid workflow edges configured")
        
    def _configure_investigation_routing(self, builder: StateGraph) -> None:
        """Configure initial investigation routing."""
        # Raw data or investigation routing
        builder.add_conditional_edges(
            "start_investigation",
            raw_data_or_investigation_routing,
            {
                "raw_data_node": "raw_data_node",
                "fraud_investigation": "fraud_investigation"
            }
        )
        
        # Raw data flows to fraud investigation
        builder.add_edge("raw_data_node", "fraud_investigation")
        
    def _configure_tool_routing(self, builder: StateGraph, use_enhanced_tools: bool) -> None:
        """Configure tool execution routing."""
        # Add tools_condition routing from fraud_investigation
        builder.add_conditional_edges(
            "fraud_investigation",
            tools_condition,
            {
                "tools": "tools",
                "__end__": "ai_confidence_assessment"  # Only continue when NO tools are called
            }
        )
        
        # Tool flow depends on whether enhanced tracking is enabled
        if use_enhanced_tools:
            # Enhanced flow: tools -> metadata tracking -> orchestrator
            builder.add_edge("tools", "track_tools")
            builder.add_edge("track_tools", "hybrid_orchestrator")
        else:
            # Standard flow: tools -> orchestrator directly
            builder.add_edge("tools", "hybrid_orchestrator")
            
    def _configure_intelligence_routing(self, builder: StateGraph) -> None:
        """Configure AI intelligence and safety routing."""
        # AI confidence flows to safety validation
        builder.add_edge("ai_confidence_assessment", "safety_validation")
        
        # Safety validation flows to hybrid orchestrator
        builder.add_edge("safety_validation", "hybrid_orchestrator")
        
    def _configure_orchestrator_routing(self, builder: StateGraph) -> None:
        """Configure hybrid orchestrator intelligent routing."""
        # Hybrid orchestrator uses intelligent routing
        builder.add_conditional_edges(
            "hybrid_orchestrator",
            self.intelligent_router.hybrid_routing_function,
            {
                # Phase routing
                "ai_confidence_assessment": "ai_confidence_assessment",
                "safety_validation": "safety_validation", 
                "fraud_investigation": "fraud_investigation",
                "summary": "summary",
                "complete": "complete",
                
                # Domain agents
                "network_agent": "network_agent",
                "device_agent": "device_agent",
                "location_agent": "location_agent",
                "logs_agent": "logs_agent",
                "authentication_agent": "authentication_agent",
                "risk_agent": "risk_agent",
                
                # Tools
                "tools": "tools"
            }
        )
        
    def _configure_domain_agent_routing(self, builder: StateGraph) -> None:
        """Configure domain agent return routing."""
        # Domain agents flow back to orchestrator for coordination
        domain_agents = [
            "network_agent", "device_agent", "location_agent", 
            "logs_agent", "authentication_agent", "risk_agent"
        ]
        for agent in domain_agents:
            builder.add_edge(agent, "hybrid_orchestrator")
            
    def _configure_completion_routing(self, builder: StateGraph) -> None:
        """Configure final completion routing."""
        # Summary flows to complete
        builder.add_edge("summary", "complete")
        
        # Complete ends the graph
        builder.add_edge("complete", END)
        
    def get_routing_strategy_info(self) -> dict:
        """Get information about routing strategies."""
        return {
            "orchestrator_routing": "intelligent_hybrid_routing",
            "tool_routing": "conditional_tools_execution",
            "investigation_routing": "raw_data_or_fraud_investigation",
            "domain_routing": "return_to_orchestrator",
            "completion_routing": "summary_to_complete_to_end"
        }