"""
Autonomous Network Analysis Agent

Network domain autonomous investigation agent using LLM-driven tool selection.
"""

import json

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
)
from app.service.logging import get_bridge_logger
from app.service.agent.agent_factory import create_rag_agent, create_agent_with_intelligent_tools

# RAG imports with graceful fallback
try:
    from app.service.agent.rag import ContextAugmentationConfig
    RAG_AVAILABLE = True
except ImportError as e:
    logger = get_bridge_logger(__name__)
    logger.warning(f"RAG modules not available: {e}")
    RAG_AVAILABLE = False
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import (
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


async def autonomous_network_agent(state, config) -> dict:
    """Autonomous network analysis using LLM-driven tool selection with optional RAG enhancement"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Import configuration utilities and initialize RAG stats
    from .network_agent_config import (
        initialize_rag_stats, create_network_rag_config, update_rag_stats_on_success,
        create_network_agent_metadata, get_network_objectives
    )
    rag_stats = initialize_rag_stats()
    
    # Track network agent node execution start with RAG metadata
    start_metadata = create_network_agent_metadata(RAG_AVAILABLE, rag_stats)
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="network_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "network_analysis": "starting", "investigation_phase": "network_domain", "rag_enabled": RAG_AVAILABLE},
        output_state={"network_analysis": "in_progress", "agent_status": "active", "rag_enhancement": "initializing"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="RAG-Enhanced-NetworkAgent" if RAG_AVAILABLE else "AutonomousNetworkAgent",
        metadata=start_metadata
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    autonomous_context.start_domain_analysis("network")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.NETWORK_ANALYSIS,
        0.1,
        "Starting autonomous network analysis..."
    )
    
    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools
        
        # Configure RAG for network domain if available
        rag_config = create_network_rag_config()
        if rag_config:
            rag_stats = update_rag_stats_on_success(rag_stats)
        
        # Create agent with intelligent tool selection and RAG enhancement
        if RAG_AVAILABLE and rag_config:
            network_agent = await create_agent_with_intelligent_tools(
                domain="network",
                investigation_context=autonomous_context,
                fallback_tools=tools,
                enable_rag=True,
                categories=["threat_intelligence", "web", "blockchain", "intelligence", "ml_ai"]
            )
            logger.info("🤖 Created network agent with intelligent RAG-enhanced tool selection")
        else:
            # Fallback to standard agent creation
            from app.service.agent.agent_factory import create_autonomous_agent
            network_agent = create_autonomous_agent("network", tools)
            logger.info("🤖 Created standard network agent (RAG not available)")
        
        # Get enhanced objectives with RAG-augmented threat intelligence focus
        network_objectives = get_network_objectives(rag_enabled=(RAG_AVAILABLE and rag_config is not None))
        
        findings = await network_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=network_objectives
        )
        
        # Update RAG statistics from agent if available
        if RAG_AVAILABLE and hasattr(network_agent, 'get_rag_stats'):
            try:
                agent_rag_stats = network_agent.get_rag_stats()
                rag_stats.update({
                    "knowledge_retrieval_count": agent_rag_stats.get("knowledge_retrieval_count", 0),
                    "context_augmentation_success": agent_rag_stats.get("context_augmentation_success", False)
                })
            except Exception:
                pass  # Gracefully handle missing RAG stats
        
        # Record findings in context
        autonomous_context.record_domain_findings("network", findings)
        
        # Emit completion update with RAG enhancement info
        from .network_agent_config import format_completion_message
        completion_message = format_completion_message(
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            findings_count=len(findings.key_findings),
            risk_score=findings.risk_score,
            rag_stats=rag_stats
        )
        
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.NETWORK_ANALYSIS,
            findings.raw_data or {},
            completion_message
        )
        
        # Track network agent completion with RAG metrics
        completion_metadata = create_network_agent_metadata(RAG_AVAILABLE and rag_config is not None, rag_stats)
        completion_metadata.update({
            "findings_generated": len(findings.key_findings), 
            "risk_level": findings.risk_score, 
            "confidence": findings.confidence
        })
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="network_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "network_analysis": "starting", "investigation_phase": "network_domain", "rag_enabled": RAG_AVAILABLE},
            output_state={
                "network_analysis": "completed", 
                "findings_count": len(findings.key_findings), 
                "risk_score": findings.risk_score,
                "rag_enhancement": "completed" if RAG_AVAILABLE else "unavailable",
                "knowledge_retrievals": rag_stats["knowledge_retrieval_count"]
            },
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="RAG-Enhanced-NetworkAgent" if RAG_AVAILABLE else "AutonomousNetworkAgent",
            metadata=completion_metadata
        )
        
        # Return structured result with RAG enhancement metadata
        from .network_agent_config import create_result_structure
        result = create_result_structure(
            findings=findings,
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            rag_stats=rag_stats
        )
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        # Enhanced error handling with RAG context
        error_context = f"{'RAG-enhanced' if RAG_AVAILABLE else 'Standard'} network agent failed: {str(e)}"
        if RAG_AVAILABLE and rag_stats.get("context_augmentation_success", False):
            error_context += f" (RAG context: {rag_stats['knowledge_retrieval_count']} retrievals)"
        
        logger.error(error_context)
        autonomous_context.fail_domain_analysis("network", str(e))
        
        # Track failure with RAG metadata
        error_metadata = create_network_agent_metadata(RAG_AVAILABLE, rag_stats)
        error_metadata.update({"error_type": "execution_failure"})
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="network_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "network_analysis": "starting", "investigation_phase": "network_domain"},
            output_state={"network_analysis": "failed", "error": str(e), "rag_enabled": RAG_AVAILABLE},
            duration_ms=0,
            status=NodeStatus.FAILED,
            agent_name="RAG-Enhanced-NetworkAgent" if RAG_AVAILABLE else "AutonomousNetworkAgent",
            metadata=error_metadata
        )
        
        return _create_error_response(f"Network analysis failed: {str(e)}")