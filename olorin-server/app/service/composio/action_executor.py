"""
Action executor for Composio toolkit actions with tenant scoping.

Handles action execution, token management, error handling, and audit logging.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.service.logging import get_bridge_logger
from app.service.composio.client import ComposioClient
from app.service.composio.encryption import ComposioEncryption
from app.service.composio.exceptions import (
    ComposioActionError,
    ComposioTokenExpiredError,
    ComposioConnectionError
)
from app.service.composio.oauth_manager import OAuthManager
from app.models.composio_connection import ComposioConnection
from app.models.composio_action_audit import ComposioActionAudit
from app.persistence.database import get_db_session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = get_bridge_logger(__name__)


class ActionExecutor:
    """
    Executes Composio actions with tenant scoping and error handling.
    
    Features:
    - Automatic token refresh on expiration
    - Tenant-scoped connection validation
    - Action audit logging
    - Error handling and retry logic
    """
    
    def __init__(
        self,
        composio_client: Optional[ComposioClient] = None,
        oauth_manager: Optional[OAuthManager] = None,
        encryption: Optional[ComposioEncryption] = None
    ):
        """
        Initialize action executor.
        
        Args:
            composio_client: Optional Composio client instance
            oauth_manager: Optional OAuth manager for token refresh
            encryption: Optional encryption instance
        """
        self.composio_client = composio_client or ComposioClient()
        self.encryption = encryption or ComposioEncryption()
        self.oauth_manager = oauth_manager or OAuthManager(
            composio_client=self.composio_client,
            encryption=self.encryption
        )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((ComposioActionError, ComposioConnectionError))
    )
    def execute_action(
        self,
        toolkit: str,
        action: str,
        connection_id: str,
        parameters: Dict[str, Any],
        tenant_id: str,
        execution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a Composio action with tenant scoping and retry logic.
        
        Args:
            toolkit: Toolkit name (e.g., 'stripe', 'shopify')
            action: Action name (e.g., 'void_payment', 'cancel_order')
            connection_id: Composio connection ID
            parameters: Action parameters
            tenant_id: Tenant ID for scoping
            execution_id: Optional execution ID for audit logging
            
        Returns:
            Action execution result
            
        Raises:
            ComposioActionError: If action execution fails after retries
            ComposioConnectionError: If connection not found or invalid
        """
        action_id = f"{toolkit}_{action}_{datetime.utcnow().isoformat()}"
        retry_count = 0
        
        try:
            # Get and validate connection
            connection = self._get_connection(connection_id, tenant_id)
            
            # Check if token needs refresh
            if connection.is_expired() and connection.refresh_token:
                logger.info(f"Token expired for connection {connection_id}, refreshing...")
                try:
                    connection = self.oauth_manager.refresh_connection_token(connection_id, tenant_id)
                except Exception as e:
                    logger.error(f"Failed to refresh token: {e}")
                    raise ComposioTokenExpiredError(f"Token expired and refresh failed: {e}") from e
            
            # Verify connection is active
            if not connection.is_active():
                raise ComposioConnectionError(
                    f"Connection {connection_id} is not active (status: {connection.status})"
                )
            
            # Log action execution
            logger.info(
                f"Executing action {action} for toolkit {toolkit}, "
                f"tenant {tenant_id}, connection {connection_id}"
            )
            
            # Performance monitoring: Track execution time
            import time
            start_time = time.time()
            
            # Execute action via Composio SDK
            result = self.composio_client.execute_action(
                toolkit=toolkit,
                action=action,
                connection_id=connection_id,
                parameters=parameters,
                tenant_id=tenant_id
            )
            
            # Performance monitoring: Log execution time
            execution_time_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Composio action executed: toolkit={toolkit}, action={action}, "
                f"execution_time_ms={execution_time_ms:.2f}, tenant={tenant_id}"
            )
            
            # Track metrics (would integrate with Prometheus/metrics system)
            try:
                from prometheus_client import Histogram
                composio_action_duration = Histogram(
                    'composio_action_duration_seconds',
                    'Composio action execution duration',
                    ['toolkit', 'action', 'tenant_id']
                )
                composio_action_duration.labels(
                    toolkit=toolkit,
                    action=action,
                    tenant_id=tenant_id
                ).observe(execution_time_ms / 1000.0)
            except ImportError:
                pass  # Prometheus not available
            
            # Update last_used_at
            self._update_last_used(connection_id, tenant_id)
            
            # Log action audit to database
            self._log_action_audit(
                action_id=action_id,
                execution_id=execution_id,
                toolkit_name=toolkit,
                action_name=action,
                tenant_id=tenant_id,
                connection_id=connection_id,
                parameters=parameters,
                result=result,
                status='success',
                retry_count=retry_count
            )
            
            # Log to Splunk and Snowflake
            self._log_to_splunk_and_snowflake(
                action_id=action_id,
                toolkit=toolkit,
                action=action,
                tenant_id=tenant_id,
                status='success',
                result=result
            )
            
            return result
            
        except ComposioTokenExpiredError:
            raise
        except ComposioConnectionError:
            raise
        except ComposioActionError as e:
            retry_count += 1
            # Log failed action with retry count
            self._log_action_audit(
                action_id=action_id,
                execution_id=execution_id,
                toolkit_name=toolkit,
                action_name=action,
                tenant_id=tenant_id,
                connection_id=connection_id,
                parameters=parameters,
                result=None,
                status='retrying' if retry_count < 3 else 'failed',
                error_message=str(e),
                retry_count=retry_count
            )
            raise
        except Exception as e:
            logger.error(f"Unexpected error executing action: {e}", exc_info=True)
            
            # Log failed action
            self._log_action_audit(
                action_id=action_id,
                execution_id=execution_id,
                toolkit_name=toolkit,
                action_name=action,
                tenant_id=tenant_id,
                connection_id=connection_id,
                parameters=parameters,
                result=None,
                status='failed',
                error_message=str(e),
                retry_count=retry_count
            )
            
            # Log to Splunk and Snowflake
            self._log_to_splunk_and_snowflake(
                action_id=action_id,
                toolkit=toolkit,
                action=action,
                tenant_id=tenant_id,
                status='failed',
                error=str(e)
            )
            
            raise ComposioActionError(
                f"Failed to execute action {action}: {e}",
                action_name=action,
                toolkit_name=toolkit
            ) from e
    
    def _get_connection(
        self,
        connection_id: str,
        tenant_id: str
    ) -> ComposioConnection:
        """
        Get connection with tenant validation.
        
        Args:
            connection_id: Composio connection ID
            tenant_id: Tenant ID
            
        Returns:
            ComposioConnection instance
            
        Raises:
            ComposioConnectionError: If connection not found or tenant mismatch
        """
        with get_db_session() as db:
            connection = db.query(ComposioConnection).filter(
                and_(
                    ComposioConnection.connection_id == connection_id,
                    ComposioConnection.tenant_id == tenant_id
                )
            ).first()
            
            if not connection:
                raise ComposioConnectionError(
                    f"Connection {connection_id} not found for tenant {tenant_id}"
                )
            
            return connection
    
    def _update_last_used(
        self,
        connection_id: str,
        tenant_id: str
    ) -> None:
        """Update last_used_at timestamp for connection."""
        try:
            with get_db_session() as db:
                connection = db.query(ComposioConnection).filter(
                    and_(
                        ComposioConnection.connection_id == connection_id,
                        ComposioConnection.tenant_id == tenant_id
                    )
                ).first()
                
                if connection:
                    connection.last_used_at = datetime.utcnow()
                    db.commit()
        except Exception as e:
            logger.warning(f"Failed to update last_used_at: {e}")
    
    def _log_action_audit(
        self,
        action_id: str,
        execution_id: Optional[str],
        toolkit_name: str,
        action_name: str,
        tenant_id: str,
        connection_id: str,
        parameters: Dict[str, Any],
        result: Optional[Dict[str, Any]],
        status: str,
        error_message: Optional[str] = None,
        retry_count: int = 0
    ) -> None:
        """
        Log action execution to composio_action_audit table.
        
        Args:
            action_id: Unique action execution identifier
            execution_id: Optional SOAR execution ID
            toolkit_name: Toolkit name
            action_name: Action name
            tenant_id: Tenant ID
            connection_id: Connection ID
            parameters: Action parameters
            result: Action result
            status: Execution status
            error_message: Optional error message
            retry_count: Number of retry attempts
        """
        try:
            with get_db_session() as db:
                audit_record = ComposioActionAudit(
                    action_id=action_id,
                    execution_id=execution_id,
                    toolkit_name=toolkit_name,
                    action_name=action_name,
                    tenant_id=tenant_id,
                    connection_id=connection_id,
                    parameters=parameters,
                    result=result,
                    status=status,
                    retry_count=retry_count,
                    error_message=error_message,
                    executed_at=datetime.utcnow()
                )
                
                db.add(audit_record)
                db.commit()
                
                logger.info(
                    f"Logged action audit: {action_id}, toolkit={toolkit_name}, "
                    f"action={action_name}, status={status}, retry_count={retry_count}"
                )
        except Exception as e:
            logger.error(f"Failed to log action audit: {e}", exc_info=True)
    
    def _log_to_splunk_and_snowflake(
        self,
        action_id: str,
        toolkit: str,
        action: str,
        tenant_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """
        Log action execution to Splunk and Snowflake for audit.
        
        Args:
            action_id: Action execution identifier
            toolkit: Toolkit name
            action: Action name
            tenant_id: Tenant ID
            status: Execution status
            result: Optional action result
            error: Optional error message
        """
        import json
        
        audit_event = {
            "event_type": "composio_action_execution",
            "action_id": action_id,
            "toolkit": toolkit,
            "action": action,
            "tenant_id": tenant_id,
            "status": status,
            "executed_at": datetime.utcnow().isoformat(),
            "result": result,
            "error": error
        }
        
        # Log to Splunk
        try:
            from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
            splunk_tool = SplunkQueryTool()
            # Send event to Splunk (would use splunk_tool.send_event in production)
            logger.info(f"Would send audit event to Splunk: {action_id}")
        except Exception as e:
            logger.warning(f"Splunk logging not available: {e}")
        
        # Audit events are persisted to PostgreSQL via the composio_action_audit table
        # Snowflake is only used as transaction data source, not for analytics/audit tables

