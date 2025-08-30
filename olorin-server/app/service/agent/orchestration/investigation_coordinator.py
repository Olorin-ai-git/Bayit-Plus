"""
Investigation Coordinator - Manages investigation startup and coordination.

This module handles the initialization of fraud investigations and coordinates
the overall investigation workflow.
"""

import logging
from datetime import datetime
from typing import Annotated, List

from langchain_core.messages import HumanMessage, BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.core import get_config_value, rehydrate_agent_context, extract_metadata

logger = logging.getLogger(__name__)


async def start_investigation(state: MessagesState, config) -> dict:
    """Initialize and start a fraud investigation workflow."""
    logger.error("🔥🔥🔥 START_INVESTIGATION FUNCTION CALLED 🔥🔥🔥")
    logger.info("[start_investigation] initiating fraud investigation flow")
    
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    metadata = extract_metadata(agent_context)
    entity_id = metadata.get("entity_id") or metadata.get("entityId")
    entity_type = metadata.get("entity_type") or metadata.get("entityType")
    
    # Debug logging
    logger.error(f"🔍 start_investigation received metadata: {metadata}")
    logger.error(f"🔍 agent_context.metadata: {agent_context.metadata}")
    
    # Extract or generate investigation_id
    investigation_id = metadata.get("investigation_id") or metadata.get("investigationId")
    logger.error(f"🔍 extracted investigation_id: {investigation_id}")
    if not investigation_id:
        from uuid import uuid4
        investigation_id = str(uuid4())
        logger.error(f"🔍 generated new UUID investigation_id: {investigation_id}")

    from app.models.api_models import InvestigationCreate
    from app.persistence import create_investigation

    # Emit progress update: Starting investigation
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.INITIALIZATION,
        0.1,
        f"Starting investigation for {entity_type} {entity_id}",
    )

    # Create investigation record
    create_investigation(
        InvestigationCreate(
            id=investigation_id, entity_id=entity_id, entity_type=entity_type
        )
    )
    
    # Update metadata with investigation ID
    agent_context.metadata.additional_metadata["investigation_id"] = investigation_id
    agent_context.metadata.additional_metadata["investigationId"] = investigation_id

    # Emit progress update: Investigation initialized
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.INITIALIZATION,
        1.0,
        "Investigation initialized successfully",
    )

    # Create initial message for fraud_investigation node
    init_msg = HumanMessage(
        content=f"Start fraud investigation {investigation_id} for {entity_type} {entity_id}"
    )
    return {"messages": [init_msg]}