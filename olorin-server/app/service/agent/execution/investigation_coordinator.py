"""
Investigation Coordinator - Handles investigation initialization and coordination.

This module manages the startup and coordination of fraud investigations,
including investigation creation and progress tracking.
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

from app.service.agent.agent_utils import _get_config_value, _rehydrate_agent_context

logger = get_bridge_logger(__name__)


async def start_investigation(state: MessagesState, config) -> dict:
    """
    Initialize and start a fraud investigation workflow.
    
    Args:
        state: Current message state
        config: Configuration object containing agent context and metadata
        
    Returns:
        Dictionary with initial investigation message
    """
    logger.error("🔥🔥🔥 START_INVESTIGATION FUNCTION CALLED 🔥🔥🔥")
    logger.info("[start_investigation] initiating fraud investigation flow")
    
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    md = agent_context.metadata.additional_metadata or {}
    entity_id = md.get("entity_id") or md.get("entityId")
    entity_type = md.get("entity_type") or md.get("entityType")
    
    # Debug: Log what metadata we actually received
    logger.error(f"🔍 start_investigation received metadata: {md}")
    logger.error(f"🔍 agent_context.metadata: {agent_context.metadata}")
    
    # Extract investigation_id from metadata or generate if not provided
    investigation_id = md.get("investigation_id") or md.get("investigationId")
    logger.error(f"🔍 extracted investigation_id: {investigation_id}")
    if not investigation_id:
        from uuid import uuid4
        investigation_id = str(uuid4())
        logger.error(f"🔍 generated new UUID investigation_id: {investigation_id}")

    from app.models.api_models import InvestigationCreate
    from app.persistence import create_investigation

    # WebSocket progress updates removed per spec 005 - using polling instead

    # Create a new investigation record
    create_investigation(
        InvestigationCreate(
            id=investigation_id, entity_id=entity_id, entity_type=entity_type
        )
    )
    
    # Store the investigation ID for downstream nodes
    agent_context.metadata.additional_metadata["investigation_id"] = investigation_id
    agent_context.metadata.additional_metadata["investigationId"] = investigation_id

    # WebSocket progress updates removed per spec 005 - using polling instead

    # Emit initial user message to kick off LLM in fraud_investigation node
    init_msg = HumanMessage(
        content=f"Start fraud investigation {investigation_id} for {entity_type} {entity_id}"
    )
    return {"messages": [init_msg]}


def extract_investigation_metadata(agent_context):
    """
    Extract and validate investigation metadata from agent context.
    
    Args:
        agent_context: Agent context containing metadata
        
    Returns:
        Dictionary with extracted metadata
    """
    if not agent_context or not hasattr(agent_context, 'metadata'):
        logger.error("Missing agent context or metadata")
        return {}
    
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    
    # Extract common investigation parameters
    investigation_metadata = {
        "entity_id": md.get("entity_id") or md.get("entityId"),
        "entity_type": md.get("entity_type") or md.get("entityType"),
        "investigation_id": md.get("investigation_id") or md.get("investigationId"),
        "time_range": md.get("time_range") or md.get("timeRange")
    }
    
    logger.debug(f"Extracted investigation metadata: {investigation_metadata}")
    return investigation_metadata


async def coordinate_investigation_phase(
    phase: AgentPhase,
    investigation_id: str,
    progress: float,
    message: str,
    result_data: dict = None
):
    """
    Coordinate investigation phase transitions and progress updates.
    
    Args:
        phase: Investigation phase
        investigation_id: Investigation identifier
        progress: Progress percentage (0.0 to 1.0)
        message: Progress message
        result_data: Optional result data to broadcast
    """
    try:
        # WebSocket progress updates removed per spec 005 - using polling instead

        logger.info(f"Investigation phase coordinated: {phase} - {message}")
        
    except Exception as e:
        logger.error(f"Failed to coordinate investigation phase {phase}: {e}")


def generate_investigation_summary(agent_results: dict) -> dict:
    """
    Generate a summary of investigation results from all agents.
    
    Args:
        agent_results: Dictionary of agent results
        
    Returns:
        Investigation summary dictionary
    """
    summary = {
        "investigation_summary": {
            "timestamp": str(datetime.utcnow()),
            "total_agents": len(agent_results),
            "completed_phases": list(agent_results.keys()),
            "overall_risk_score": 0.0,
            "confidence_score": 0.0,
            "key_findings": [],
            "recommendations": []
        }
    }
    
    # Calculate aggregate metrics
    total_risk = 0
    total_confidence = 0
    agent_count = 0
    
    for agent_name, result in agent_results.items():
        if isinstance(result, dict):
            agent_count += 1
            
            # Extract risk scores
            risk_score = result.get("risk_level", 0.0)
            confidence = result.get("confidence", 0.0)
            
            total_risk += risk_score
            total_confidence += confidence
            
            # Collect findings
            if result.get("summary"):
                summary["investigation_summary"]["key_findings"].append({
                    "agent": agent_name,
                    "finding": result["summary"]
                })
    
    # Calculate averages
    if agent_count > 0:
        summary["investigation_summary"]["overall_risk_score"] = total_risk / agent_count
        summary["investigation_summary"]["confidence_score"] = total_confidence / agent_count
    
    return summary