"""
Structured Device Analysis Agent

Device domain structured investigation agent using LLM-driven tool selection.
"""

import json
import time

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _create_error_response,
    _extract_investigation_info,
    _get_or_create_structured_context,
    get_context_with_retry,
)
from app.service.logging import get_bridge_logger

# Lazy import to avoid circular dependencies
# from app.service.agent.agent_factory import create_rag_agent, create_agent_with_intelligent_tools

# RAG imports with graceful fallback
try:
    from app.service.agent.rag import ContextAugmentationConfig

    RAG_AVAILABLE = True
except ImportError as e:
    logger = get_bridge_logger(__name__)
    logger.warning(f"RAG modules not available: {e}")
    RAG_AVAILABLE = False
from app.service.agent.journey_tracker import (
    NodeStatus,
    NodeType,
    get_journey_tracker,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


# Lazy import functions to avoid circular dependencies
def _import_agent_factory():
    """Lazy import agent factory to avoid circular dependencies."""
    try:
        from app.service.agent.agent_factory import (
            create_agent_with_intelligent_tools,
            create_rag_agent,
        )

        return create_rag_agent, create_agent_with_intelligent_tools
    except ImportError:
        return None, None


async def structured_device_agent(state, config) -> dict:
    """Structured device analysis using LLM-driven tool selection with optional RAG enhancement"""

    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")

    # Import configuration utilities and initialize RAG stats
    from .device_agent_config import (
        create_device_agent_metadata,
        create_device_rag_config,
        get_device_objectives,
        initialize_rag_stats,
        update_rag_stats_on_success,
    )

    rag_stats = initialize_rag_stats()

    # Track execution start time
    start_time = time.perf_counter()

    # Track device agent node execution start with RAG metadata
    start_metadata = create_device_agent_metadata(
        RAG_AVAILABLE, rag_stats, False
    )  # MCP not yet initialized
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="device_agent",
        node_type=NodeType.AGENT,
        input_state={
            "entity_id": entity_id,
            "device_analysis": "starting",
            "investigation_phase": "device_domain",
            "rag_enabled": RAG_AVAILABLE,
        },
        output_state={
            "device_analysis": "in_progress",
            "agent_status": "active",
            "rag_enhancement": "initializing",
        },
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name=(
            "RAG-Enhanced-DeviceAgent" if RAG_AVAILABLE else "StructuredDeviceAgent"
        ),
        metadata=start_metadata,
    )

    # Create or get structured context with retry logic
    structured_context = await get_context_with_retry(investigation_id, entity_id)
    if not structured_context:
        logger.error(
            f"Failed to get investigation context after retries: {investigation_id}"
        )
        return _create_error_response(
            "Unable to access investigation context - race condition"
        )

    structured_context.start_domain_analysis("device")

    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools

        # Configure RAG for device domain if available
        rag_config = create_device_rag_config()
        if rag_config:
            rag_stats = update_rag_stats_on_success(rag_stats)

        # Check if enhanced MCP infrastructure is available
        MCP_ENHANCED = False
        try:
            from .enhanced_agent_factory import create_enhanced_device_agent

            MCP_ENHANCED = True
            logger.info("🔗 Enhanced MCP infrastructure available for device agent")
        except ImportError:
            logger.info(
                "🔗 Enhanced MCP infrastructure not available, using standard agent"
            )

        # Create agent with MCP enhancement if available, otherwise fallback to RAG/standard
        if MCP_ENHANCED:
            device_agent = await create_enhanced_device_agent()
            logger.info(
                "🔧 Created MCP-enhanced device agent with connection pooling, caching, and circuit breakers"
            )
        elif RAG_AVAILABLE and rag_config:
            create_rag_agent, create_agent_with_intelligent_tools = (
                _import_agent_factory()
            )
            if create_agent_with_intelligent_tools is None:
                logger.error("Agent factory not available")
                return _create_error_response("Agent factory not available")

            device_agent = await create_agent_with_intelligent_tools(
                domain="device",
                investigation_context=structured_context,
                fallback_tools=tools,
                enable_rag=True,
                categories=[
                    "threat_intelligence",
                    "ml_ai",
                    "blockchain",
                    "intelligence",
                    "web",
                ],
            )
            logger.info(
                "🔧 Created device agent with intelligent RAG-enhanced tool selection"
            )
        else:
            # Fallback to standard agent creation
            create_rag_agent, create_agent_with_intelligent_tools = (
                _import_agent_factory()
            )
            if create_agent_with_intelligent_tools is None:
                logger.error("Agent factory not available for fallback")
                return _create_error_response("Agent factory not available")

            # Use create_agent_with_intelligent_tools for fallback as well
            device_agent = await create_agent_with_intelligent_tools(
                "device", tools, agent_context
            )
            logger.info("🔧 Created standard device agent (RAG not available)")

        # Get enhanced objectives with MCP/RAG-augmented threat intelligence focus
        device_objectives = get_device_objectives(
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            mcp_enhanced=MCP_ENHANCED,
        )

        findings = await device_agent.structured_investigate(
            context=structured_context,
            config=config,
            specific_objectives=device_objectives,
        )

        # Update RAG statistics from agent if available
        if RAG_AVAILABLE and hasattr(device_agent, "get_rag_stats"):
            try:
                agent_rag_stats = device_agent.get_rag_stats()
                rag_stats.update(
                    {
                        "knowledge_retrieval_count": agent_rag_stats.get(
                            "knowledge_retrieval_count", 0
                        ),
                        "context_augmentation_success": agent_rag_stats.get(
                            "context_augmentation_success", False
                        ),
                    }
                )
            except Exception:
                pass  # Gracefully handle missing RAG stats

        # Record findings in context
        structured_context.record_domain_findings("device", findings)

        # Track device agent completion with RAG metrics
        completion_metadata = create_device_agent_metadata(
            RAG_AVAILABLE and rag_config is not None, rag_stats, MCP_ENHANCED
        )
        completion_metadata.update(
            {
                "findings_generated": len(findings.key_findings),
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
            }
        )

        # Calculate actual execution duration
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)

        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="device_agent",
            node_type=NodeType.AGENT,
            input_state={
                "entity_id": entity_id,
                "device_analysis": "starting",
                "investigation_phase": "device_domain",
                "rag_enabled": RAG_AVAILABLE,
            },
            output_state={
                "device_analysis": "completed",
                "findings_count": len(findings.key_findings),
                "risk_score": findings.risk_score,
                "rag_enhancement": "completed" if RAG_AVAILABLE else "unavailable",
                "knowledge_retrievals": rag_stats["knowledge_retrieval_count"],
            },
            duration_ms=duration_ms,
            status=NodeStatus.COMPLETED,
            agent_name=(
                "RAG-Enhanced-DeviceAgent" if RAG_AVAILABLE else "StructuredDeviceAgent"
            ),
            metadata=completion_metadata,
        )

        # Return structured result with RAG enhancement metadata
        from .device_agent_config import create_result_structure

        result = create_result_structure(
            findings=findings,
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            rag_stats=rag_stats,
            mcp_enhanced=MCP_ENHANCED,
        )

        return {"messages": [AIMessage(content=json.dumps(result))]}

    except Exception as e:
        # Enhanced error handling with RAG context
        error_context = f"{'RAG-enhanced' if RAG_AVAILABLE else 'Standard'} device agent failed: {str(e)}"
        if RAG_AVAILABLE and rag_stats.get("context_augmentation_success", False):
            error_context += (
                f" (RAG context: {rag_stats['knowledge_retrieval_count']} retrievals)"
            )

        logger.error(error_context)
        structured_context.fail_domain_analysis("device", str(e))

        # Track failure with RAG metadata
        error_metadata = create_device_agent_metadata(
            RAG_AVAILABLE, rag_stats, MCP_ENHANCED
        )
        error_metadata.update({"error_type": "execution_failure"})

        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="device_agent",
            node_type=NodeType.AGENT,
            input_state={
                "entity_id": entity_id,
                "device_analysis": "starting",
                "investigation_phase": "device_domain",
            },
            output_state={
                "device_analysis": "failed",
                "error": str(e),
                "rag_enabled": RAG_AVAILABLE,
            },
            duration_ms=0,
            status=NodeStatus.FAILED,
            agent_name=(
                "RAG-Enhanced-DeviceAgent" if RAG_AVAILABLE else "StructuredDeviceAgent"
            ),
            metadata=error_metadata,
        )

        return _create_error_response(f"Device analysis failed: {str(e)}")
