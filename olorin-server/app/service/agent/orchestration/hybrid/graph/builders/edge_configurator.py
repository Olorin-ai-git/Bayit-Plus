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


def force_tools_routing(state):
    """
    Custom routing function that forces tool usage.
    
    Returns "tools" if tool calls exist, otherwise returns "fraud_investigation" 
    to retry with stronger prompts (up to a limit).
    
    CRITICAL: To prevent infinite recursion, we check how many times we've been to
    fraud_investigation without calling tools by counting consecutive non-tool messages.
    """
    messages = state.get("messages", [])
    if not messages:
        return "fraud_investigation"  # Retry if no messages
    
    last_message = messages[-1]
    
    # Check if the last message has tool calls
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        logger.info(f"✅ Tool calls detected: {len(last_message.tool_calls)} tools")
        return "tools"
    
    # Count consecutive AIMessages without tool calls to prevent infinite loops
    # This is more reliable than retry_count since routing functions can't modify state
    consecutive_ai_messages = 0
    for msg in reversed(messages[-10:]):  # Check last 10 messages
        from langchain_core.messages import AIMessage
        if isinstance(msg, AIMessage):
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                break  # Found a tool call, reset count
            consecutive_ai_messages += 1
    
    max_retries = 2  # Maximum retries before giving up
    
    if consecutive_ai_messages >= max_retries:
        logger.warning(f"⚠️ Max retries ({max_retries}) reached for tool calls ({consecutive_ai_messages} consecutive AI messages without tools). Proceeding without tools.")
        return "ai_confidence_assessment"
    
    # No tool calls - retry with stronger prompts
    logger.warning(f"⚠️ No tool calls detected ({consecutive_ai_messages} consecutive attempts). Retrying fraud_investigation with stronger prompts.")
    # Set flag in state for the node to pick up (routing functions can't modify state, but we can check it)
    return "fraud_investigation"


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
        # CRITICAL FIX A0.2: Add database fetch before conditional routing
        # Ensures agents have access to transaction data
        builder.add_edge("start_investigation", "fetch_database_data")

        # Raw data or investigation routing (now from fetch_database_data)
        builder.add_conditional_edges(
            "fetch_database_data",
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
        # CRITICAL FIX: Use custom routing that forces tool usage with retry logic
        # This ensures the LLM is given multiple chances to call tools before proceeding
        # However, to prevent infinite recursion, we limit retries and ensure proper state updates
        builder.add_conditional_edges(
            "fraud_investigation",
            force_tools_routing,
            {
                "tools": "tools",
                "fraud_investigation": "fraud_investigation",  # Retry if no tools (max 2 times)
                "ai_confidence_assessment": "ai_confidence_assessment"  # Only after max retries
            }
        )
        
        # CRITICAL: After tools execute, reset retry count to prevent loops
        # This ensures that if tools are successfully executed, we don't retry again
        if use_enhanced_tools:
            # Enhanced flow: tools -> track_tools -> hybrid_orchestrator
            # The track_tools node should reset retry count
            pass  # Retry reset will happen in track_tools or tools node
        else:
            # Standard flow: tools -> hybrid_orchestrator
            # Retry reset will happen in tools node
            pass
        
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
                "merchant_agent": "merchant_agent",
                "risk_agent": "risk_agent",
                "remediation_agent": "remediation_agent",
                
                # Tools
                "tools": "tools"
            }
        )
        
    def _configure_domain_agent_routing(self, builder: StateGraph) -> None:
        """Configure domain agent return routing."""
        # Domain agents flow back to orchestrator for coordination
        # EXCEPTION: risk_agent flows to remediation_agent first, then to summary
        domain_agents = [
            "network_agent", "device_agent", "location_agent", 
            "logs_agent", "authentication_agent", "web_agent", "merchant_agent"
        ]
        for agent in domain_agents:
            builder.add_edge(agent, "hybrid_orchestrator")
        
        # Risk agent flows to remediation agent (for labeling), then to summary
        builder.add_edge("risk_agent", "remediation_agent")
        builder.add_edge("remediation_agent", "summary")
            
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