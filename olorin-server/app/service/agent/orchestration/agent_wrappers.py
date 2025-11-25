"""
Agent Wrappers for LangGraph Integration

This module provides wrapper functions that ensure agents receive proper
investigation context when called as LangGraph nodes.
"""

from typing import Any, Dict

from langchain_core.runnables.config import RunnableConfig

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def wrap_agent_for_graph(agent_func):
    """
    Wrap an agent function to ensure it receives proper context from state.

    This wrapper extracts investigation context from the state and ensures
    it's available in the config for the agent.
    """

    async def wrapped(state: Dict[str, Any], config: RunnableConfig) -> Dict[str, Any]:
        logger.info(
            f"Wrapper called for {agent_func.__name__}, state keys: {state.keys()}"
        )

        # Extract investigation context from state
        investigation_id = state.get("investigation_id")
        entity_id = state.get("entity_id")
        entity_type = state.get("entity_type", "ip")

        # If not in state directly, check messages for context
        if not investigation_id or not entity_id:
            logger.info("Context not in state, checking messages...")
            for msg in state.get("messages", []):
                if hasattr(msg, "additional_kwargs"):
                    kwargs = msg.additional_kwargs
                    if not investigation_id:
                        investigation_id = kwargs.get("investigation_id")
                    if not entity_id:
                        entity_id = kwargs.get("entity_id")
                    if not entity_type:
                        entity_type = kwargs.get("entity_type", "ip")
                    if investigation_id and entity_id:
                        break

        logger.info(
            f"Extracted context - investigation_id: {investigation_id}, entity_id: {entity_id}"
        )

        # Get existing configurable or create new
        configurable = config.get("configurable", {}) if config else {}

        # Check if agent_context exists and has needed fields
        agent_context = configurable.get("agent_context")

        # Determine if we need to create/update agent_context
        needs_context = False
        if not agent_context:
            needs_context = True
        elif isinstance(agent_context, dict):
            # Check dict fields
            if not agent_context.get("investigation_id") or not agent_context.get(
                "entity_id"
            ):
                needs_context = True
        else:
            # It's an object, check attributes
            if not getattr(agent_context, "investigation_id", None) or not getattr(
                agent_context, "entity_id", None
            ):
                # Can't modify the object, need to create a dict
                needs_context = True

        if needs_context:
            # Create simple dict context that agents can work with
            configurable["agent_context"] = {
                "investigation_id": investigation_id,
                "entity_id": entity_id,
                "entity_type": entity_type,
            }
            logger.info(
                f"Created/replaced agent_context for {agent_func.__name__}: {investigation_id}"
            )

        # Create new config with updated configurable
        wrapped_config = RunnableConfig(configurable=configurable)

        # Call the original agent function
        return await agent_func(state, wrapped_config)

    # Preserve the original function name for debugging
    wrapped.__name__ = f"wrapped_{agent_func.__name__}"
    return wrapped


# Create wrapped versions of all agents
async def wrapped_network_agent(
    state: Dict[str, Any], config: RunnableConfig
) -> Dict[str, Any]:
    """Wrapped network agent that ensures proper context."""
    from app.service.agent.network_agent import structured_network_agent

    return await wrap_agent_for_graph(structured_network_agent)(state, config)


async def wrapped_device_agent(
    state: Dict[str, Any], config: RunnableConfig
) -> Dict[str, Any]:
    """Wrapped device agent that ensures proper context."""
    from app.service.agent.device_agent import structured_device_agent

    return await wrap_agent_for_graph(structured_device_agent)(state, config)


async def wrapped_location_agent(
    state: Dict[str, Any], config: RunnableConfig
) -> Dict[str, Any]:
    """Wrapped location agent that ensures proper context."""
    from app.service.agent.location_agent import structured_location_agent

    return await wrap_agent_for_graph(structured_location_agent)(state, config)


async def wrapped_logs_agent(
    state: Dict[str, Any], config: RunnableConfig
) -> Dict[str, Any]:
    """Wrapped logs agent that ensures proper context."""
    from app.service.agent.logs_agent import structured_logs_agent

    return await wrap_agent_for_graph(structured_logs_agent)(state, config)


async def wrapped_risk_agent(
    state: Dict[str, Any], config: RunnableConfig
) -> Dict[str, Any]:
    """Wrapped risk agent that ensures proper context."""
    from app.service.agent.risk_agent import structured_risk_agent

    return await wrap_agent_for_graph(structured_risk_agent)(state, config)
