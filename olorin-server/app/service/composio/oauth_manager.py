"""
OAuth flow management for Composio connections.

Handles OAuth initiation, callback processing, token refresh, and connection status management.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.composio_connection import ComposioConnection
from app.persistence.database import get_db_session
from app.service.composio.client import ComposioClient
from app.service.composio.encryption import ComposioEncryption
from app.service.composio.exceptions import (
    ComposioConnectionError,
    ComposioOAuthError,
    ComposioTokenExpiredError,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OAuthManager:
    """
    Manages OAuth flows for Composio toolkit connections.

    Handles:
    - OAuth URL generation
    - Callback processing and token storage
    - Token refresh
    - Connection status management
    """

    def __init__(
        self,
        composio_client: Optional[ComposioClient] = None,
        encryption: Optional[ComposioEncryption] = None,
    ):
        """
        Initialize OAuth manager.

        Args:
            composio_client: Optional Composio client instance
            encryption: Optional encryption instance for token storage
        """
        self.composio_client = composio_client or ComposioClient()
        self.encryption = encryption or ComposioEncryption()

    def initiate_oauth(
        self,
        toolkit: str,
        tenant_id: str,
        redirect_uri: str,
        scopes: Optional[list] = None,
    ) -> str:
        """
        Initiate OAuth flow and return authorization URL.

        Args:
            toolkit: Toolkit name (e.g., 'stripe', 'shopify')
            tenant_id: Tenant ID
            redirect_uri: Callback URL after authorization
            scopes: Optional OAuth scopes

        Returns:
            OAuth authorization URL
        """
        try:
            oauth_url = self.composio_client.get_oauth_url(
                toolkit=toolkit,
                tenant_id=tenant_id,
                redirect_uri=redirect_uri,
                scopes=scopes or [],
            )

            logger.info(
                f"Initiated OAuth flow for toolkit {toolkit}, tenant {tenant_id}"
            )
            return oauth_url

        except Exception as e:
            logger.error(f"Failed to initiate OAuth flow: {e}")
            raise ComposioOAuthError(f"Failed to initiate OAuth: {e}") from e

    def process_callback(
        self,
        toolkit: str,
        code: str,
        redirect_uri: str,
        tenant_id: str,
        state: Optional[str] = None,
    ) -> ComposioConnection:
        """
        Process OAuth callback and store connection.

        Args:
            toolkit: Toolkit name
            code: Authorization code from callback
            redirect_uri: Callback URL used in OAuth flow
            tenant_id: Tenant ID (verified from state if provided)
            state: Optional state parameter from OAuth callback

        Returns:
            ComposioConnection model instance

        Raises:
            ComposioOAuthError: If callback processing fails
        """
        try:
            # Verify tenant_id from state if provided
            if state:
                # Extract tenant_id from state (format: "tenant_id=xxx")
                state_tenant_id = None
                for param in state.split("&"):
                    if param.startswith("tenant_id="):
                        state_tenant_id = param.split("=", 1)[1]
                        break

                if state_tenant_id and state_tenant_id != tenant_id:
                    raise ComposioOAuthError("Tenant ID mismatch in OAuth callback")

            # Exchange code for token
            token_data = self.composio_client.exchange_code_for_token(
                toolkit=toolkit,
                code=code,
                redirect_uri=redirect_uri,
                tenant_id=tenant_id,
            )

            connection_id = token_data["connection_id"]
            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")
            expires_at_str = token_data.get("expires_at")

            # Encrypt tokens before storage
            encrypted_access_token = self.encryption.encrypt(access_token)
            encrypted_refresh_token = None
            if refresh_token:
                encrypted_refresh_token = self.encryption.encrypt(refresh_token)

            # Parse expires_at
            expires_at = None
            if expires_at_str:
                expires_at = datetime.fromisoformat(
                    expires_at_str.replace("Z", "+00:00")
                )

            # Store connection in database
            with get_db_session() as db:
                # Check if connection already exists
                existing = (
                    db.query(ComposioConnection)
                    .filter(
                        and_(
                            ComposioConnection.tenant_id == tenant_id,
                            ComposioConnection.toolkit_name == toolkit,
                            ComposioConnection.connection_id == connection_id,
                        )
                    )
                    .first()
                )

                if existing:
                    # Update existing connection
                    existing.status = "active"
                    existing.encrypted_access_token = encrypted_access_token
                    existing.refresh_token = encrypted_refresh_token
                    existing.expires_at = expires_at
                    existing.updated_at = datetime.utcnow()
                    db.commit()
                    db.refresh(existing)
                    logger.info(
                        f"Updated existing connection {connection_id} for tenant {tenant_id}"
                    )
                    return existing
                else:
                    # Create new connection
                    connection = ComposioConnection(
                        tenant_id=tenant_id,
                        toolkit_name=toolkit,
                        connection_id=connection_id,
                        status="active",
                        encrypted_access_token=encrypted_access_token,
                        refresh_token=encrypted_refresh_token,
                        expires_at=expires_at,
                    )
                    db.add(connection)
                    db.commit()
                    db.refresh(connection)
                    logger.info(
                        f"Created new connection {connection_id} for tenant {tenant_id}"
                    )
                    return connection

        except Exception as e:
            logger.error(f"Failed to process OAuth callback: {e}")
            raise ComposioOAuthError(f"Failed to process callback: {e}") from e

    def refresh_connection_token(
        self, connection_id: str, tenant_id: str
    ) -> ComposioConnection:
        """
        Refresh an expired connection token.

        Args:
            connection_id: Composio connection ID
            tenant_id: Tenant ID

        Returns:
            Updated ComposioConnection instance

        Raises:
            ComposioConnectionError: If connection not found or refresh fails
        """
        try:
            with get_db_session() as db:
                # Find connection
                connection = (
                    db.query(ComposioConnection)
                    .filter(
                        and_(
                            ComposioConnection.connection_id == connection_id,
                            ComposioConnection.tenant_id == tenant_id,
                        )
                    )
                    .first()
                )

                if not connection:
                    raise ComposioConnectionError(
                        f"Connection {connection_id} not found for tenant {tenant_id}"
                    )

                if not connection.refresh_token:
                    raise ComposioConnectionError(
                        f"Connection {connection_id} has no refresh token"
                    )

                # Decrypt refresh token
                refresh_token = self.encryption.decrypt(connection.refresh_token)

                # Refresh token via Composio
                token_data = self.composio_client.refresh_token(
                    toolkit=connection.toolkit_name,
                    connection_id=connection_id,
                    refresh_token=refresh_token,
                    tenant_id=tenant_id,
                )

                # Encrypt new tokens
                new_access_token = token_data["access_token"]
                new_refresh_token = token_data.get("refresh_token") or refresh_token
                expires_at_str = token_data.get("expires_at")

                encrypted_access_token = self.encryption.encrypt(new_access_token)
                encrypted_refresh_token = self.encryption.encrypt(new_refresh_token)

                expires_at = None
                if expires_at_str:
                    expires_at = datetime.fromisoformat(
                        expires_at_str.replace("Z", "+00:00")
                    )

                # Update connection
                connection.encrypted_access_token = encrypted_access_token
                connection.refresh_token = encrypted_refresh_token
                connection.expires_at = expires_at
                connection.status = "active"
                connection.updated_at = datetime.utcnow()

                db.commit()
                db.refresh(connection)

                logger.info(
                    f"Refreshed token for connection {connection_id}, tenant {tenant_id}"
                )
                return connection

        except ComposioConnectionError:
            raise
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            raise ComposioConnectionError(f"Failed to refresh token: {e}") from e

    def check_connection_status(
        self, connection_id: str, tenant_id: str
    ) -> Dict[str, Any]:
        """
        Check connection status and refresh if expired.

        Args:
            connection_id: Composio connection ID
            tenant_id: Tenant ID

        Returns:
            Dictionary with status, is_expired, is_active
        """
        try:
            with get_db_session() as db:
                connection = (
                    db.query(ComposioConnection)
                    .filter(
                        and_(
                            ComposioConnection.connection_id == connection_id,
                            ComposioConnection.tenant_id == tenant_id,
                        )
                    )
                    .first()
                )

                if not connection:
                    return {
                        "status": "not_found",
                        "is_expired": True,
                        "is_active": False,
                    }

                is_expired = connection.is_expired()
                is_active = connection.is_active()

                # Auto-refresh if expired but has refresh token
                if is_expired and connection.refresh_token:
                    try:
                        connection = self.refresh_connection_token(
                            connection_id, tenant_id
                        )
                        is_expired = False
                        is_active = True
                    except Exception as e:
                        logger.warning(
                            f"Auto-refresh failed for connection {connection_id}: {e}"
                        )
                        # Update status to expired
                        connection.status = "expired"
                        db.commit()

                return {
                    "status": connection.status,
                    "is_expired": is_expired,
                    "is_active": is_active,
                    "expires_at": (
                        connection.expires_at.isoformat()
                        if connection.expires_at
                        else None
                    ),
                }

        except Exception as e:
            logger.error(f"Failed to check connection status: {e}")
            return {
                "status": "error",
                "is_expired": True,
                "is_active": False,
                "error": str(e),
            }
