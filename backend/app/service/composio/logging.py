"""
Logging configuration for Composio integration.
"""

import logging

from app.service.logging import get_bridge_logger

# Create logger for Composio integration
logger = get_bridge_logger(__name__)

# Set log level for Composio operations
logger.setLevel(logging.INFO)


def log_composio_action(
    action_name: str,
    toolkit_name: str,
    tenant_id: str,
    status: str,
    details: dict = None,
):
    """
    Log Composio action execution.

    Args:
        action_name: Name of the action executed
        toolkit_name: Name of the toolkit
        tenant_id: Tenant ID
        status: Execution status ('success', 'failed', etc.)
        details: Optional additional details
    """
    log_data = {
        "action": action_name,
        "toolkit": toolkit_name,
        "tenant_id": tenant_id,
        "status": status,
    }
    if details:
        log_data.update(details)

    if status == "success":
        logger.info(f"Composio action executed: {action_name}", extra=log_data)
    else:
        logger.warning(f"Composio action failed: {action_name}", extra=log_data)


def log_oauth_flow(
    tenant_id: str, toolkit_name: str, stage: str, success: bool, details: dict = None
):
    """
    Log OAuth flow progress.

    Args:
        tenant_id: Tenant ID
        toolkit_name: Name of the toolkit
        stage: OAuth stage ('initiated', 'callback', 'completed', 'failed')
        success: Whether the stage was successful
        details: Optional additional details
    """
    log_data = {
        "oauth_stage": stage,
        "toolkit": toolkit_name,
        "tenant_id": tenant_id,
        "success": success,
    }
    if details:
        log_data.update(details)

    if success:
        logger.info(f"OAuth flow {stage} for {toolkit_name}", extra=log_data)
    else:
        logger.warning(f"OAuth flow {stage} failed for {toolkit_name}", extra=log_data)
