"""
Agent Service Module - Compatibility wrapper for legacy agent invocation.

This module provides backward compatibility for the legacy agent service API
while using the new clean graph orchestration system under the hood.
"""

import logging
from typing import Optional, Tuple

from fastapi import Request

from app.models.agent_context import AgentContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def ainvoke_agent(
    request: Request, agent_context: AgentContext
) -> Tuple[str, Optional[str]]:
    """
    Legacy compatibility function for agent invocation.

    This function maintains backward compatibility with the old agent_service API
    while using the new clean graph orchestration system internally.

    Args:
        request: FastAPI request object
        agent_context: Agent context containing input and metadata

    Returns:
        Tuple of (response_string, trace_id)
    """
    try:
        logger.info(f"🔄 Legacy agent invocation for agent: {agent_context.agent_name}")

        # Use the same implementation as in agent_router.py
        if agent_context.agent_name == "fraud_investigation":
            # Use clean graph orchestration system
            logger.info("🚀 Using Clean Graph Orchestration for fraud investigation")

            from langchain_core.messages import HumanMessage

            from app.service.agent.orchestration.hybrid.migration_utilities import (
                get_feature_flags,
                get_investigation_graph,
            )
            from app.service.agent.orchestration.state_schema import (
                create_initial_state,
            )

            # Create investigation ID from context
            investigation_id = f"LEGACY_AGENT_{agent_context.thread_id}"

            # Extract entity info from agent context metadata or input
            entity_id = getattr(agent_context.metadata, "additionalMetadata", {}).get(
                "entity_id", "unknown"
            )
            entity_type = getattr(agent_context.metadata, "additionalMetadata", {}).get(
                "entity_type", "user_id"
            )

            # Create initial state for clean graph execution
            initial_state = create_initial_state(
                investigation_id=investigation_id,
                entity_id=entity_id,
                entity_type=entity_type,
                parallel_execution=True,
                max_tools=52,
            )

            # Add investigation query to messages
            investigation_query = (
                agent_context.input
                or f"Investigate {entity_type}: {entity_id} for fraud patterns"
            )
            initial_state["messages"] = [HumanMessage(content=investigation_query)]

            # Get appropriate graph (hybrid or clean based on feature flags)
            graph = await get_investigation_graph(
                investigation_id=investigation_id, entity_type=entity_type
            )

            # Set recursion limit for production mode
            recursion_limit = 100
            config = {"recursion_limit": recursion_limit}

            # Add thread configuration if using hybrid graph
            feature_flags = get_feature_flags()
            if feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
                config["configurable"] = {"thread_id": investigation_id}
                logger.info(
                    f"🧠 Using Hybrid Intelligence graph for investigation: {investigation_id}"
                )
            else:
                logger.info(
                    f"🔄 Using Clean graph orchestration for investigation: {investigation_id}"
                )

            # Execute the clean graph system
            langgraph_result = await graph.ainvoke(initial_state, config=config)

            # Extract result from LangGraph execution
            response_str = str(
                langgraph_result.get("messages", [])[-1].content
                if langgraph_result.get("messages")
                else "Investigation completed"
            )
            trace_id = investigation_id  # Use investigation ID as trace ID

            return response_str, trace_id
        else:
            # For other agents, use simple echo response
            logger.info(f"🔄 Simple response for agent: {agent_context.agent_name}")
            response_str = agent_context.input or "Agent response generated"
            return response_str, None

    except Exception as e:
        logger.error(f"❌ Error in legacy agent invocation: {e}", exc_info=True)
        # Return error response instead of raising exception for compatibility
        error_response = f"Agent invocation failed: {str(e)}"
        return error_response, None
