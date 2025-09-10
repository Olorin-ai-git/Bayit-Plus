"""
Assistant - Main LLM coordinator for fraud investigations.

This module handles the primary LLM coordination for fraud investigation workflows,
including tool invocation and message processing.
"""

import asyncio
from typing import Annotated, List

from langchain_core.messages import SystemMessage, BaseMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from app.service.logging import get_bridge_logger

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.core import get_config_value, rehydrate_agent_context

logger = get_bridge_logger(__name__)


# System message for fraud investigation
SYSTEM_MESSAGE = SystemMessage(
    content="""
    You are a helpful fraud investigator who can help with questions.
    Use the results from the available tools to answer the question.
    """
)


def assistant(state: MessagesState, config: RunnableConfig):
    """
    Main assistant function for fraud investigation coordination.
    
    Handles LLM invocation with tools and progress reporting.
    """
    # Safely extract agent context and header
    agent_context = get_config_value(config, ["configurable", "agent_context"])
    if agent_context and hasattr(agent_context, 'get_header'):
        olorin_header = agent_context.get_header()
    else:
        # For hybrid graphs or when agent_context is not available, use empty header
        logger.debug("No agent_context available or missing get_header method, using empty header")
        olorin_header = {}
    
    logger.debug(f"LangGraph State={state}")

    # Extract investigation_id for progress reporting (reuse agent_context from above)
    if agent_context:
        agent_context = rehydrate_agent_context(agent_context)
        md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
        investigation_id = md.get("investigationId") or md.get("investigation_id")

        # Emit progress update for fraud investigation coordination
        if investigation_id:
            try:
                # Check if there's an event loop running before creating task
                try:
                    loop = asyncio.get_running_loop()
                    asyncio.create_task(
                        websocket_manager.broadcast_progress(
                            investigation_id,
                            AgentPhase.ANOMALY_DETECTION,
                            0.5,
                            "Coordinating fraud investigation analysis...",
                        )
                    )
                except RuntimeError:
                    # No event loop running, skip progress update
                    logger.debug(f"No event loop running, skipping progress update for investigation {investigation_id}")
            except Exception as e:
                logger.error(f"Failed to emit progress update: {e}")

    # Prepare messages
    messages = []
    messages_from_checkpoint = state["messages"]
    messages.extend(messages_from_checkpoint)

    # Get LLM with tools and invoke
    llm_with_tools = _get_llm_with_tools()
    
    return {
        "messages": [
            llm_with_tools.invoke(
                [SYSTEM_MESSAGE] + messages,
                config=config,
                extra_headers=olorin_header,
            )
        ]
    }


def _get_llm_with_tools():
    """Get configured LLM with tools for graph-based tool execution."""
    from app.service.config import get_settings_for_env
    from langchain_anthropic import ChatAnthropic
    from app.utils.firebase_secrets import get_firebase_secret
    
    settings = get_settings_for_env()
    
    # Get API key from Firebase Secrets Manager ONLY
    api_key = get_firebase_secret(settings.anthropic_api_key_secret)
    if not api_key:
        raise RuntimeError(f"Anthropic API key must be configured in Firebase Secrets Manager as '{settings.anthropic_api_key_secret}'")
    
    # Create LLM with Claude Opus 4.1
    llm = ChatAnthropic(
        api_key=api_key,
        model="claude-opus-4-1-20250805",  # Claude Opus 4.1
        temperature=0.7,
        max_tokens=4000,
        timeout=60,
    )
    
    # Get tools from the graph configuration - these are already configured
    from app.service.agent.orchestration.graph_builder import _get_configured_tools
    tools = _get_configured_tools()
    
    # Bind tools to LLM for graph-based execution
    # The graph's tools node will handle actual tool execution
    try:
        return llm.bind_tools(tools)
    except Exception as e:
        logger.error(f"Failed to bind tools to LLM: {str(e)}")
        # Filter to working tools
        from app.service.agent.orchestration.graph_builder import _filter_working_tools
        working_tools = _filter_working_tools(tools)
        return llm.bind_tools(working_tools) if working_tools else llm