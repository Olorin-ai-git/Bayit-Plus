"""
Core Agent Module - Initialization and exports.
"""

from app.service.agent.core.agent_utils import (
    get_config_value,
    rehydrate_agent_context,
    validate_agent_context,
    extract_metadata,
    get_investigation_params,
    create_standard_error_response,
    log_agent_execution,
    # Legacy compatibility
    _get_config_value,
    _rehydrate_agent_context
)

__all__ = [
    "get_config_value",
    "rehydrate_agent_context", 
    "validate_agent_context",
    "extract_metadata",
    "get_investigation_params",
    "create_standard_error_response",
    "log_agent_execution",
    "_get_config_value",
    "_rehydrate_agent_context"
]