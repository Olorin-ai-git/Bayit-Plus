"""
Structured Location Analysis Agent

Location domain structured investigation agent using LLM-driven tool selection.
"""

import json
import time

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _create_error_response,
    _extract_investigation_info,
    _get_or_create_structured_context,
)
from app.service.agent.agent_factory import (
    create_agent_with_intelligent_tools,
    create_rag_agent,
)
from app.service.logging import get_bridge_logger

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


async def structured_location_agent(state, config) -> dict:
    """Structured location analysis using LLM-driven tool selection with optional RAG enhancement"""

    # Track execution start time
    start_time = time.perf_counter()

    # Track execution start time
    start_time = time.perf_counter()

    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")

    # Import configuration utilities and initialize RAG stats
    from .location_agent_config import (
        create_location_agent_metadata,
        create_location_rag_config,
        get_location_objectives,
        initialize_rag_stats,
        update_rag_stats_on_success,
    )

    rag_stats = initialize_rag_stats()

    # Track location agent node execution start with RAG metadata
    start_metadata = create_location_agent_metadata(RAG_AVAILABLE, rag_stats)
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="location_agent",
        node_type=NodeType.AGENT,
        input_state={
            "entity_id": entity_id,
            "location_analysis": "starting",
            "investigation_phase": "location_domain",
            "rag_enabled": RAG_AVAILABLE,
        },
        output_state={
            "location_analysis": "in_progress",
            "agent_status": "active",
            "rag_enhancement": "initializing",
        },
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name=(
            "RAG-Enhanced-LocationAgent" if RAG_AVAILABLE else "StructuredLocationAgent"
        ),
        metadata=start_metadata,
    )

    # Create or get structured context
    structured_context = _get_or_create_structured_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    structured_context.start_domain_analysis("location")

    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools

        # Configure RAG for location domain if available
        rag_config = create_location_rag_config()
        if rag_config:
            rag_stats = update_rag_stats_on_success(rag_stats)

        # Create agent with intelligent tool selection and RAG enhancement
        if RAG_AVAILABLE and rag_config:
            location_agent = await create_agent_with_intelligent_tools(
                domain="location",
                investigation_context=structured_context,
                fallback_tools=tools,
                enable_rag=True,
                categories=[
                    "intelligence",
                    "threat_intelligence",
                    "ml_ai",
                    "web",
                    "olorin",
                ],
            )
            logger.info(
                "🗺️ Created location agent with intelligent RAG-enhanced tool selection"
            )
        else:
            # Fallback to standard agent creation
            from app.service.agent.agent_factory import create_structured_agent

            location_agent = create_structured_agent("location", tools)
            logger.info("🗺️ Created standard location agent (RAG not available)")

        # Get enhanced objectives with RAG-augmented threat intelligence focus
        location_objectives = get_location_objectives(
            rag_enabled=(RAG_AVAILABLE and rag_config is not None)
        )

        findings = await location_agent.structured_investigate(
            context=structured_context,
            config=config,
            specific_objectives=location_objectives,
        )

        # Update RAG statistics from agent if available
        if RAG_AVAILABLE and hasattr(location_agent, "get_rag_stats"):
            try:
                agent_rag_stats = location_agent.get_rag_stats()
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
        structured_context.record_domain_findings("location", findings)

        # Track location agent completion with RAG metrics
        completion_metadata = create_location_agent_metadata(
            RAG_AVAILABLE and rag_config is not None, rag_stats
        )
        completion_metadata.update(
            {
                "findings_generated": len(findings.key_findings),
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
            }
        )

        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="location_agent",
            node_type=NodeType.AGENT,
            input_state={
                "entity_id": entity_id,
                "location_analysis": "starting",
                "investigation_phase": "location_domain",
                "rag_enabled": RAG_AVAILABLE,
            },
            output_state={
                "location_analysis": "completed",
                "findings_count": len(findings.key_findings),
                "risk_score": findings.risk_score,
                "rag_enhancement": "completed" if RAG_AVAILABLE else "unavailable",
                "knowledge_retrievals": rag_stats["knowledge_retrieval_count"],
            },
            duration_ms=int((time.perf_counter() - start_time) * 1000),
            status=NodeStatus.COMPLETED,
            agent_name=(
                "RAG-Enhanced-LocationAgent"
                if RAG_AVAILABLE
                else "StructuredLocationAgent"
            ),
            metadata=completion_metadata,
        )

        # Return structured result with RAG enhancement metadata
        from .location_agent_config import create_result_structure

        result = create_result_structure(
            findings=findings,
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            rag_stats=rag_stats,
        )

        return {"messages": [AIMessage(content=json.dumps(result))]}

    except Exception as e:
        # Enhanced error handling with RAG context
        error_context = f"{'RAG-enhanced' if RAG_AVAILABLE else 'Standard'} location agent failed: {str(e)}"
        if RAG_AVAILABLE and rag_stats.get("context_augmentation_success", False):
            error_context += (
                f" (RAG context: {rag_stats['knowledge_retrieval_count']} retrievals)"
            )

        logger.error(error_context)
        structured_context.fail_domain_analysis("location", str(e))

        # Track failure with RAG metadata
        error_metadata = create_location_agent_metadata(RAG_AVAILABLE, rag_stats)
        error_metadata.update({"error_type": "execution_failure"})

        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="location_agent",
            node_type=NodeType.AGENT,
            input_state={
                "entity_id": entity_id,
                "location_analysis": "starting",
                "investigation_phase": "location_domain",
            },
            output_state={
                "location_analysis": "failed",
                "error": str(e),
                "rag_enabled": RAG_AVAILABLE,
            },
            duration_ms=0,
            status=NodeStatus.FAILED,
            agent_name=(
                "RAG-Enhanced-LocationAgent"
                if RAG_AVAILABLE
                else "StructuredLocationAgent"
            ),
            metadata=error_metadata,
        )

        return _create_error_response(f"Location analysis failed: {str(e)}")
