"""
Core Agent Utilities - Essential helper functions for agent operations.

This module provides core utilities for config handling, context management,
and common agent operations.
"""

import logging
from typing import Any, List, Optional

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_config_value(config: Any, key_path: List[str]) -> Any:
    """
    Safely extract values from config, handling both RunnableConfig and dict.
    
    Args:
        config: Configuration object (RunnableConfig or dict)
        key_path: List of keys to navigate (e.g., ["configurable", "agent_context"])
    
    Returns:
        Extracted value or None if path doesn't exist
    """
    try:
        if hasattr(config, "configurable"):
            current = config.configurable
            for key in key_path:
                current = current[key]
            return current
        else:
            current = config
            for key in key_path:
                current = current[key]
            return current
    except (KeyError, AttributeError, TypeError):
        return None


def rehydrate_agent_context(agent_context: Any) -> Optional[AgentContext]:
    """
    Rehydrate AgentContext from dictionary format.
    
    Args:
        agent_context: AgentContext object or dictionary representation
    
    Returns:
        Properly constructed AgentContext or original if already AgentContext
    """
    if isinstance(agent_context, dict):
        # Rehydrate nested olorin_header and auth_context if needed
        ih = agent_context.get("olorin_header")
        if isinstance(ih, dict):
            ac = ih.get("auth_context")
            if isinstance(ac, dict):
                ih["auth_context"] = AuthContext(**ac)
            agent_context["olorin_header"] = OlorinHeader(**ih)
        return AgentContext(**agent_context)
    return agent_context


def validate_agent_context(agent_context: Any) -> bool:
    """Validate that agent context and nested fields are present."""
    return (
        agent_context is not None
        and getattr(agent_context, "olorin_header", None) is not None
        and getattr(agent_context.olorin_header, "auth_context", None) is not None
    )


def extract_metadata(agent_context: AgentContext) -> dict:
    """Extract additional metadata from agent context safely."""
    if not agent_context or not hasattr(agent_context, 'metadata'):
        return {}
    return getattr(agent_context.metadata, "additional_metadata", {}) or {}


def get_investigation_params(metadata: dict) -> tuple:
    """Extract common investigation parameters from metadata."""
    investigation_id = metadata.get("investigationId") or metadata.get("investigation_id")
    entity_id = metadata.get("entityId") or metadata.get("entity_id")
    entity_type = metadata.get("entityType") or metadata.get("entity_type")
    time_range = metadata.get("timeRange") or metadata.get("time_range")
    
    return investigation_id, entity_id, entity_type, time_range


def create_standard_error_response(agent_name: str, error_msg: str, response_key: str = "risk_assessment") -> dict:
    """Create a standardized error response for agent failures."""
    import json
    from datetime import datetime
    from langchain_core.messages import AIMessage
    
    logging.error(f"[{agent_name}] {error_msg}")
    
    error_response = {
        "risk_level": 0.0,
        "risk_factors": [error_msg],
        "confidence": 0.0,
        "summary": f"Error: {error_msg}",
        "thoughts": f"No LLM assessment due to {error_msg}.",
        "timestamp": str(datetime.utcnow()),
    }
    
    return {
        "messages": [
            AIMessage(content=json.dumps({response_key: error_response}))
        ]
    }


def log_agent_execution(agent_name: str, investigation_id: str, entity_id: str, action: str = "start"):
    """Log agent execution events."""
    if action == "start":
        logger.info(f"🚀 Starting {agent_name} - Investigation: {investigation_id}, Entity: {entity_id}")
    elif action == "complete":
        logger.info(f"✅ Completed {agent_name} - Investigation: {investigation_id}")
    elif action == "error":
        logger.error(f"❌ Failed {agent_name} - Investigation: {investigation_id}")


# Legacy compatibility functions
_get_config_value = get_config_value
_rehydrate_agent_context = rehydrate_agent_context