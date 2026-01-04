"""
SOAR + Composio Integration Service

Provides integration between SOAR playbooks and Composio actions.
Handles webhook signature validation and tenant-scoped action execution.
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.models.composio_connection import ComposioConnection
from app.persistence.database import get_db_session
from app.service.composio.action_executor import ActionExecutor
from app.service.composio.exceptions import ComposioActionError, ComposioConnectionError
from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComposioIntegration:
    """
    Integrates SOAR playbooks with Composio actions.

    Features:
    - SOAR webhook signature validation
    - Tenant-scoped action execution
    - Graceful handling of missing connections
    - Action result formatting for SOAR
    """

    def __init__(self, action_executor: Optional[ActionExecutor] = None):
        """
        Initialize Composio integration.

        Args:
            action_executor: Optional action executor instance
        """
        self.config_loader = get_config_loader()
        self.action_executor = action_executor or ActionExecutor()
        self.soar_webhook_secret = self._load_webhook_secret()

    def _load_webhook_secret(self) -> str:
        """Load SOAR webhook secret for signature validation."""
        secret = self.config_loader.load_secret("SOAR_WEBHOOK_SECRET")
        if not secret:
            raise ValueError(
                "SOAR_WEBHOOK_SECRET not configured. Set environment variable or configure secret."
            )
        return secret

    def validate_soar_signature(self, payload: str, signature: str) -> bool:
        """
        Validate SOAR webhook signature.

        Args:
            payload: Request payload (JSON string)
            signature: SOAR signature header

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Compute expected signature
            expected_signature = hmac.new(
                self.soar_webhook_secret.encode(), payload.encode(), hashlib.sha256
            ).hexdigest()

            # Compare signatures (constant-time comparison)
            return hmac.compare_digest(expected_signature, signature)

        except Exception as e:
            logger.error(f"Signature validation failed: {e}")
            return False

    async def execute_soar_action(
        self,
        toolkit: str,
        action: str,
        connection_id: str,
        parameters: Dict[str, Any],
        tenant_id: str,
        execution_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute Composio action from SOAR playbook.

        Args:
            toolkit: Toolkit name
            action: Action name
            connection_id: Composio connection ID
            parameters: Action parameters
            tenant_id: Tenant ID
            execution_id: Optional SOAR execution ID

        Returns:
            Action execution result formatted for SOAR

        Raises:
            ComposioActionError: If action execution fails
            ComposioConnectionError: If connection not found
        """
        try:
            # Check if tenant has connection for this toolkit
            connection = self._get_tenant_connection(tenant_id, toolkit, connection_id)

            if not connection:
                error_msg = (
                    f"Tenant {tenant_id} has no active connection for toolkit {toolkit}"
                )
                logger.warning(error_msg)
                return {
                    "status": "failed",
                    "error": error_msg,
                    "action_id": f"{toolkit}_{action}",
                    "executed_at": datetime.utcnow().isoformat(),
                }

            # Execute action
            result = self.action_executor.execute_action(
                toolkit=toolkit,
                action=action,
                connection_id=connection.connection_id,
                parameters=parameters,
                tenant_id=tenant_id,
                execution_id=execution_id,
            )

            # Format result for SOAR
            return {
                "status": "success",
                "action_id": f"{toolkit}_{action}",
                "toolkit": toolkit,
                "action": action,
                "result": result,
                "executed_at": datetime.utcnow().isoformat(),
            }

        except ComposioConnectionError as e:
            logger.warning(f"Connection error for SOAR action: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "action_id": f"{toolkit}_{action}",
                "executed_at": datetime.utcnow().isoformat(),
            }
        except ComposioActionError as e:
            logger.error(f"Action execution failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "action_id": f"{toolkit}_{action}",
                "executed_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Unexpected error executing SOAR action: {e}", exc_info=True)
            return {
                "status": "failed",
                "error": str(e),
                "action_id": f"{toolkit}_{action}",
                "executed_at": datetime.utcnow().isoformat(),
            }

    def _get_tenant_connection(
        self, tenant_id: str, toolkit: str, connection_id: Optional[str] = None
    ) -> Optional[ComposioConnection]:
        """
        Get tenant connection for toolkit.

        Args:
            tenant_id: Tenant ID
            toolkit: Toolkit name
            connection_id: Optional specific connection ID

        Returns:
            ComposioConnection instance or None if not found
        """
        try:
            with get_db_session() as db:
                if connection_id:
                    connection = (
                        db.query(ComposioConnection)
                        .filter(
                            ComposioConnection.tenant_id == tenant_id,
                            ComposioConnection.toolkit_name == toolkit,
                            ComposioConnection.connection_id == connection_id,
                            ComposioConnection.status == "active",
                        )
                        .first()
                    )
                else:
                    # Get first active connection for toolkit
                    connection = (
                        db.query(ComposioConnection)
                        .filter(
                            ComposioConnection.tenant_id == tenant_id,
                            ComposioConnection.toolkit_name == toolkit,
                            ComposioConnection.status == "active",
                        )
                        .first()
                    )

                return connection

        except Exception as e:
            logger.error(f"Failed to get tenant connection: {e}", exc_info=True)
            return None
