"""
Agent Communication Utilities

Communication and context management utilities for autonomous investigation agents.
"""

import logging
from typing import Any, Dict, Optional, Tuple

from langchain_core.messages import AIMessage
from langchain_core.runnables.config import RunnableConfig

from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    EntityType,
    InvestigationPhase,
)
from app.service.websocket_manager import AgentPhase, websocket_manager

logger = logging.getLogger(__name__)
_investigation_contexts: Dict[str, AutonomousInvestigationContext] = {}


def _extract_investigation_info(config: RunnableConfig) -> Tuple[Optional[Any], Optional[str], Optional[str]]:
    """Extract investigation context information from LangGraph config."""
    try:
        configurable = config.get("configurable", {})
        agent_context = configurable.get("agent_context")
        
        investigation_id = entity_id = None
        if agent_context:
            investigation_id = getattr(agent_context, 'investigation_id', None)
            entity_id = getattr(agent_context, 'entity_id', None)
            
            if not investigation_id and hasattr(agent_context, 'get'):
                investigation_id = agent_context.get('investigation_id')
            if not entity_id and hasattr(agent_context, 'get'):
                entity_id = agent_context.get('entity_id')
        
        logger.debug(f"Extracted investigation info: id={investigation_id}, entity={entity_id}")
        return agent_context, investigation_id, entity_id
        
    except Exception as e:
        logger.error(f"Failed to extract investigation info: {str(e)}")
        return None, None, None


def _get_or_create_autonomous_context(
    investigation_id: str,
    entity_id: str,
    entity_type: Optional[EntityType] = None,
    investigation_type: str = "fraud_investigation"
) -> AutonomousInvestigationContext:
    """Get existing or create new autonomous investigation context."""
    try:
        context_key = f"{investigation_id}_{entity_id}"
        
        if context_key in _investigation_contexts:
            return _investigation_contexts[context_key]
        
        # Auto-detect entity type if not provided
        if entity_type is None:
            if "device" in entity_id.lower():
                entity_type = EntityType.DEVICE_ID
            elif "user" in entity_id.lower():
                entity_type = EntityType.USER_ID
            elif "account" in entity_id.lower():
                entity_type = EntityType.ACCOUNT_ID
            elif "transaction" in entity_id.lower():
                entity_type = EntityType.TRANSACTION_ID
            elif "@" in entity_id:
                entity_type = EntityType.EMAIL
            else:
                entity_type = EntityType.USER_ID  # Default fallback
        
        context = AutonomousInvestigationContext(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type,
            investigation_type=investigation_type
        )
        
        _investigation_contexts[context_key] = context
        logger.info(f"Created autonomous context for investigation {investigation_id}, entity {entity_id}")
        
        return context
        
    except Exception as e:
        logger.error(f"Failed to create autonomous context: {str(e)}")
        
        return AutonomousInvestigationContext(
            investigation_id=investigation_id or "unknown",
            entity_id=entity_id or "unknown",
            entity_type=EntityType.USER_ID,
            investigation_type=investigation_type
        )


def _create_error_response(error_message: str) -> Dict[str, Any]:
    """Create standardized error response for agent failures."""
    error_response = {
        "error": True,
        "message": error_message,
        "risk_assessment": {
            "risk_level": 0.0,
            "confidence": 0.0,
            "risk_factors": [],
            "suspicious_indicators": [],
            "summary": f"Agent execution failed: {error_message}",
            "thoughts": "Error occurred during autonomous agent execution",
            "timestamp": None,
            "autonomous_execution": False,
            "domain": "unknown"
        }
    }
    
    logger.error(f"Created error response: {error_message}")
    return {"messages": [AIMessage(content=str(error_response))]}


async def _broadcast_agent_progress(
    investigation_id: str,
    phase: AgentPhase,
    progress: float,
    message: str
) -> None:
    """Broadcast agent progress update via WebSocket."""
    try:
        await websocket_manager.broadcast_progress(investigation_id, phase, progress, message)
        logger.debug(f"Broadcasted progress: {investigation_id} - {phase} - {progress:.2f} - {message}")
    except Exception as e:
        logger.error(f"Failed to broadcast progress: {str(e)}")


async def _broadcast_agent_result(
    investigation_id: str,
    phase: AgentPhase,
    result_data: Dict[str, Any],
    summary_message: str
) -> None:
    """Broadcast agent result via WebSocket."""
    try:
        await websocket_manager.broadcast_agent_result(investigation_id, phase, result_data, summary_message)
        logger.debug(f"Broadcasted result: {investigation_id} - {phase} - {summary_message}")
    except Exception as e:
        logger.error(f"Failed to broadcast result: {str(e)}")


def cleanup_investigation_context(investigation_id: str, entity_id: str) -> None:
    """Clean up investigation context to free memory."""
    try:
        context_key = f"{investigation_id}_{entity_id}"
        if context_key in _investigation_contexts:
            del _investigation_contexts[context_key]
            logger.info(f"Cleaned up context for investigation {investigation_id}, entity {entity_id}")
    except Exception as e:
        logger.error(f"Failed to cleanup context: {str(e)}")


def get_investigation_contexts() -> Dict[str, AutonomousInvestigationContext]:
    """Get all active investigation contexts (for debugging/monitoring)."""
    return _investigation_contexts.copy()