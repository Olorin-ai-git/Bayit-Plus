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

    # Create initial message for investigation routing
    # Check if raw CSV data is provided in the agent context
    csv_data = None
    filename = None
    
    # Extract CSV data from metadata if available
    if hasattr(agent_context, 'metadata') and agent_context.metadata:
        additional_metadata = getattr(agent_context.metadata, 'additional_metadata', {})
        csv_data = additional_metadata.get('csv_data') or additional_metadata.get('file_content')
        filename = additional_metadata.get('filename')
    
    # Create initial message with potential CSV data
    if csv_data:
        logger.info(f"Raw CSV data detected for investigation {investigation_id}")
        init_msg = HumanMessage(
            content=f"Start investigation {investigation_id} for {entity_type} {entity_id} with raw CSV data",
            additional_kwargs={
                'csv_data': csv_data,
                'filename': filename,
                'investigation_id': investigation_id,
                'entity_id': entity_id,
                'entity_type': entity_type
            }
        )
    else:
        init_msg = HumanMessage(
            content=f"Start fraud investigation {investigation_id} for {entity_type} {entity_id}",
            additional_kwargs={
                'investigation_id': investigation_id,
                'entity_id': entity_id,
                'entity_type': entity_type
            }
        )
    
    return {"messages": [init_msg]}


async def update_investigation_with_raw_data(investigation_id: str, raw_data_results: dict) -> None:
    """
    Update investigation record with raw data processing results.
    
    Args:
        investigation_id: Investigation identifier
        raw_data_results: Results from raw data processing
    """
    try:
        from app.persistence import update_investigation
        from app.models.api_models import InvestigationUpdate
        
        # Extract key metrics from raw data results
        quality_metrics = raw_data_results.get('quality_report', {})
        
        # Prepare investigation update
        update_data = InvestigationUpdate(
            id=investigation_id
        )
        
        # Create update with raw data fields
        raw_data_update = {
            'raw_data_processed': raw_data_results.get('success', False),
            'raw_data_filename': raw_data_results.get('filename'),
            'raw_data_quality_score': quality_metrics.get('quality_score'),
            'raw_data_records_count': len(raw_data_results.get('data', [])),
            'raw_data_anomalies_count': raw_data_results.get('anomalies_count', 0),
            'raw_data_processing_results': raw_data_results
        }
        
        # Update investigation
        update_investigation(investigation_id, raw_data_update)
        
        # Emit progress update
        await websocket_manager.broadcast_progress(
            investigation_id,
            AgentPhase.ANALYSIS,
            0.3,
            f"Raw data processing completed: {quality_metrics.get('quality_score', 0):.2f} quality score"
        )
        
        logger.info(f"Updated investigation {investigation_id} with raw data results")
        
    except Exception as e:
        logger.error(f"Failed to update investigation {investigation_id} with raw data: {e}")
        
        # Emit error progress update
        await websocket_manager.broadcast_progress(
            investigation_id,
            AgentPhase.ERROR,
            0.0,
            f"Failed to save raw data results: {str(e)}"
        )