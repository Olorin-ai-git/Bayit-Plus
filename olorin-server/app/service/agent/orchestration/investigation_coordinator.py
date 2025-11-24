"""
Investigation Coordinator - Manages investigation startup and coordination.

This module handles the initialization of fraud investigations and coordinates
the overall investigation workflow.
"""

from datetime import datetime
from typing import Annotated, List

from langchain_core.messages import HumanMessage, BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from app.service.logging import get_bridge_logger

# Define MessagesState since it's not available in langchain_core.messages
class MessagesState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

from app.service.agent.core import get_config_value, rehydrate_agent_context, extract_metadata
from app.service.logging.investigation_log_context import set_investigation_context

logger = get_bridge_logger(__name__)


async def start_investigation(state: MessagesState, config) -> dict:
    """Initialize and start a fraud investigation workflow.
    
    Compatible with both legacy AgentContext and hybrid HybridInvestigationState structures.
    """
    logger.info("🔥 START_INVESTIGATION FUNCTION CALLED 🔥")
    logger.info("[start_investigation] initiating fraud investigation flow")
    
    # Try to get agent_context from config (legacy path)
    agent_context = rehydrate_agent_context(get_config_value(config, ["configurable", "agent_context"]))
    
    # Handle both legacy and hybrid state structures
    if agent_context is not None:
        # Legacy path: extract from agent_context
        logger.info("[start_investigation] Using legacy agent_context structure")
        metadata = extract_metadata(agent_context)
        entity_id = metadata.get("entity_id") or metadata.get("entityId")
        entity_type = metadata.get("entity_type") or metadata.get("entityType")
        investigation_id = metadata.get("investigation_id") or metadata.get("investigationId")
        
        logger.info(f"🔍 Legacy metadata: {metadata}")
    else:
        # Hybrid path: extract directly from state
        logger.info("[start_investigation] Using hybrid state structure - extracting from state")
        entity_id = state.get("entity_id")
        entity_type = state.get("entity_type")
        investigation_id = state.get("investigation_id")
        
        # Create metadata dictionary for compatibility
        metadata = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_id": investigation_id
        }
        
        logger.info(f"🔍 Hybrid state parameters: entity_id={entity_id}, entity_type={entity_type}, investigation_id={investigation_id}")
    
    # Generate investigation_id if missing
    if not investigation_id:
        from uuid import uuid4
        investigation_id = str(uuid4())
        logger.info(f"🔍 Generated new investigation_id: {investigation_id}")
        # Update metadata for consistency
        metadata["investigation_id"] = investigation_id
        metadata["investigationId"] = investigation_id

    from app.models.api_models import InvestigationCreate
    from app.persistence import create_investigation

    # WebSocket progress updates removed per spec 005 - using polling instead

    # Create investigation record
    create_investigation(
        InvestigationCreate(
            id=investigation_id, entity_id=entity_id, entity_type=entity_type
        )
    )
    
<<<<<<< HEAD
=======
    # Set investigation context for logging (ensures context is available for all async operations)
    try:
        set_investigation_context(investigation_id, metadata)
        logger.info(f"Set investigation context for {investigation_id}")
    except Exception as e:
        logger.warning(f"Failed to set investigation context: {e}", exc_info=True)
        # Don't fail investigation if context setting fails
    
>>>>>>> 001-modify-analyzer-method
    # Update metadata with investigation ID (only for legacy path)
    if agent_context is not None:
        agent_context.metadata.additional_metadata["investigation_id"] = investigation_id
        agent_context.metadata.additional_metadata["investigationId"] = investigation_id

    # WebSocket progress updates removed per spec 005 - using polling instead

    # Create initial message for investigation routing
    # Check if raw CSV data is provided in the agent context
    csv_data = None
    filename = None
    
    # Extract CSV data from metadata if available (legacy path only)
    if agent_context is not None and hasattr(agent_context, 'metadata') and agent_context.metadata:
        additional_metadata = getattr(agent_context.metadata, 'additional_metadata', {})
        csv_data = additional_metadata.get('csv_data') or additional_metadata.get('file_content')
        filename = additional_metadata.get('filename')
    else:
        # Hybrid path: CSV data would be handled differently if needed
        csv_data = None
        filename = None
    
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

        # WebSocket progress updates removed per spec 005 - using polling instead

        logger.info(f"Updated investigation {investigation_id} with raw data results")

    except Exception as e:
        logger.error(f"Failed to update investigation {investigation_id} with raw data: {e}")