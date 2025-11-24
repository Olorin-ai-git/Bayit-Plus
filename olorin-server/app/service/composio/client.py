"""
Composio SDK client wrapper for unified OAuth and action execution.

This module provides a wrapper around the Composio SDK with tenant scoping
and connection management.
"""

import os
import logging
from typing import Optional, Dict, Any, List

from composio_client import Composio as ComposioSDKClient

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader
from app.service.composio.exceptions import (
    ComposioError,
    ComposioConnectionError,
    ComposioActionError,
    ComposioRateLimitError,
    ComposioConfigurationError
)

logger = get_bridge_logger(__name__)


class ComposioClient:
    """
    Wrapper around Composio SDK with tenant scoping and error handling.
    
    Provides unified interface for OAuth flows and action execution
    with tenant isolation.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Composio client with API key.
        
        Args:
            api_key: Optional Composio API key. If not provided, loads from config.
            
        Raises:
            ComposioConfigurationError: If API key cannot be loaded
        """
        config_loader = get_config_loader()
        
        # Load API key from config or environment
        self.api_key = api_key or os.getenv("COMPOSIO_API_KEY")
        if not self.api_key:
            self.api_key = config_loader.load_secret("COMPOSIO_API_KEY")
        
        if not self.api_key:
            raise ComposioConfigurationError(
                "COMPOSIO_API_KEY not configured. Set environment variable or configure secret."
            )
        
        # Initialize Composio SDK client
        try:
            self._sdk_client = ComposioSDKClient(api_key=self.api_key)
        except Exception as e:
            raise ComposioConfigurationError(f"Failed to initialize Composio client: {e}") from e
    
    def get_oauth_url(
        self,
        toolkit: str,
        tenant_id: str,
        redirect_uri: str,
        scopes: Optional[List[str]] = None
    ) -> str:
        """
        Get OAuth authorization URL for a toolkit.
        
        Args:
            toolkit: Toolkit name (e.g., 'stripe', 'shopify', 'okta')
            tenant_id: Tenant ID for scoping
            redirect_uri: Callback URL after authorization
            scopes: Optional list of OAuth scopes
            
        Returns:
            OAuth authorization URL
            
        Raises:
            ComposioError: If URL generation fails
        """
        try:
            # Use Composio SDK to get OAuth URL
            # Include tenant_id in state parameter for callback verification
            state = f"tenant_id={tenant_id}"
            
            # Use connected_accounts.create to initiate OAuth flow
            # Note: API changed in composio 0.9.x - using create with auth_config
            from composio_client.types.connected_account_create_params import AuthConfig, Connection
            
            # Create auth config for OAuth flow
            auth_config = AuthConfig(
                redirect_uri=redirect_uri,
                scopes=scopes or [],
                state=state
            )
            
            # Create connection config
            connection = Connection(
                entity=toolkit
            )
            
            result = self._sdk_client.connected_accounts.create(
                auth_config=auth_config,
                connection=connection
            )
            
            # Extract OAuth URL from result
            # The result structure may have changed - try multiple possible fields
            if hasattr(result, 'url'):
                oauth_url = result.url
            elif hasattr(result, 'oauth_url'):
                oauth_url = result.oauth_url
            elif hasattr(result, 'auth_url'):
                oauth_url = result.auth_url
            elif isinstance(result, dict):
                oauth_url = result.get("url") or result.get("oauth_url") or result.get("auth_url")
            else:
                # Try to get URL from response object
                oauth_url = str(result)
            
            logger.info(f"Generated OAuth URL for toolkit {toolkit}, tenant {tenant_id}")
            return oauth_url
            
        except Exception as e:
            # Catch all exceptions since ComposioSDKError may not exist
            raise ComposioError(f"Failed to generate OAuth URL: {e}") from e
    
    def exchange_code_for_token(
        self,
        toolkit: str,
        code: str,
        redirect_uri: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Exchange OAuth authorization code for access token.
        
        Args:
            toolkit: Toolkit name
            code: Authorization code from OAuth callback
            redirect_uri: Callback URL used in OAuth flow
            tenant_id: Tenant ID for verification
            
        Returns:
            Dictionary with connection_id, access_token, refresh_token, expires_at
            
        Raises:
            ComposioOAuthError: If token exchange fails
        """
        try:
            # Exchange code for token via Composio SDK
            # Note: API changed in composio 0.9.x - use create with code in auth_config
            from composio_client.types.connected_account_create_params import AuthConfig, Connection
            
            auth_config = AuthConfig(
                redirect_uri=redirect_uri,
                code=code
            )
            
            connection = Connection(
                entity=toolkit
            )
            
            result = self._sdk_client.connected_accounts.create(
                auth_config=auth_config,
                connection=connection
            )
            
            # Extract connection details from result
            connection_id = getattr(result, 'id', None) or result.get("id") or result.get("connection_id")
            access_token = getattr(result, 'access_token', None) or result.get("access_token")
            refresh_token = getattr(result, 'refresh_token', None) or result.get("refresh_token")
            expires_in = getattr(result, 'expires_in', None) or result.get("expires_in")  # seconds
            
            if not connection_id:
                # Try alternative field names
                connection_id = getattr(result, 'connection_id', None) or result.get("connection_id")
            
            if not connection_id:
                raise ComposioError("Invalid token exchange response: missing connection_id")
            
            # Calculate expiration timestamp
            from datetime import datetime, timedelta
            expires_at = None
            if expires_in:
                expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            logger.info(f"Exchanged code for token, toolkit {toolkit}, tenant {tenant_id}, connection {connection_id}")
            
            return {
                "connection_id": str(connection_id),
                "access_token": str(access_token) if access_token else None,
                "refresh_token": str(refresh_token) if refresh_token else None,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "expires_in": expires_in
            }
            
        except Exception as e:
            from app.service.composio.exceptions import ComposioOAuthError
            raise ComposioOAuthError(f"Failed to exchange code for token: {e}") from e
    
    def execute_action(
        self,
        toolkit: str,
        action: str,
        connection_id: str,
        parameters: Dict[str, Any],
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Execute a Composio action with tenant scoping.
        
        Args:
            toolkit: Toolkit name (e.g., 'stripe', 'shopify', 'veriphone')
            action: Action name (e.g., 'void_payment', 'cancel_order', 'verify_phone')
            connection_id: Composio connection ID
            parameters: Action parameters
            tenant_id: Tenant ID for verification
            
        Returns:
            Action execution result
            
        Raises:
            ComposioActionError: If action execution fails
            ComposioTokenExpiredError: If connection token has expired
        """
        try:
            # For Veriphone toolkit, inject credentials from environment/config if not in parameters
            if toolkit.lower() == "veriphone":
                # Try to load from config loader first (supports Firebase Secrets), then fallback to env
                veriphone_account_id = (
                    config_loader.load_secret("COMPOSIO_VERIPHONE_ACCOUNT_ID") or
                    os.getenv("COMPOSIO_VERIPHONE_ACCOUNT_ID")
                )
                veriphone_api_key = (
                    config_loader.load_secret("COMPOSIO_VERIPHONE_API_KEY") or
                    os.getenv("COMPOSIO_VERIPHONE_API_KEY")
                )
                veriphone_user_id = (
                    config_loader.load_secret("COMPOSIO_VERIPHONE_USER_ID") or
                    os.getenv("COMPOSIO_VERIPHONE_USER_ID")
                )
                
                if veriphone_account_id and veriphone_api_key and veriphone_user_id:
                    # Add Veriphone credentials to parameters if not already present
                    if "account_id" not in parameters and veriphone_account_id:
                        parameters["account_id"] = veriphone_account_id
                    if "api_key" not in parameters and veriphone_api_key:
                        parameters["api_key"] = veriphone_api_key
                    if "user_id" not in parameters and veriphone_user_id:
                        parameters["user_id"] = veriphone_user_id
                    
                    logger.debug(f"Injected Veriphone credentials for action {action}")
                else:
                    logger.warning(
                        "Veriphone credentials not fully configured. "
                        "Set COMPOSIO_VERIPHONE_ACCOUNT_ID, COMPOSIO_VERIPHONE_API_KEY, "
                        "and COMPOSIO_VERIPHONE_USER_ID in environment or Firebase Secrets."
                    )
            
            # Verify connection belongs to tenant (done at database level)
            # Execute action via Composio SDK
            # Note: API changed in composio 0.9.x - use tools.execute with tool_slug
            # Tool slug format: "{toolkit}/{action}" or just "{action}" if toolkit is implied
            tool_slug = f"{toolkit}/{action}" if "/" not in action else action
            
            result = self._sdk_client.tools.execute(
                tool_slug=tool_slug,
                connected_account_id=connection_id,
                arguments=parameters
            )
            
            logger.info(
                f"Executed action {action} for toolkit {toolkit}, "
                f"tenant {tenant_id}, connection {connection_id}"
            )
            
            # Convert result to dict if needed
            if hasattr(result, '__dict__'):
                return result.__dict__
            elif hasattr(result, 'dict'):
                return result.dict()
            else:
                return result if isinstance(result, dict) else {"result": result}
            
        except Exception as e:
            error_msg = str(e).lower()
            
            # Check for token expiration
            if "expired" in error_msg or "401" in error_msg or "403" in error_msg:
                from app.service.composio.exceptions import ComposioTokenExpiredError
                raise ComposioTokenExpiredError(f"Connection token expired: {e}") from e
            
            # Check for rate limiting
            if "rate limit" in error_msg or "429" in error_msg:
                raise ComposioRateLimitError(f"Rate limit exceeded: {e}") from e
            
            raise ComposioActionError(
                f"Failed to execute action {action}: {e}",
                action_name=action,
                toolkit_name=toolkit
            ) from e
    
    def refresh_token(
        self,
        toolkit: str,
        connection_id: str,
        refresh_token: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Refresh an expired access token.
        
        Args:
            toolkit: Toolkit name
            connection_id: Composio connection ID
            refresh_token: Refresh token
            tenant_id: Tenant ID for verification
            
        Returns:
            Dictionary with new access_token, refresh_token, expires_at
            
        Raises:
            ComposioOAuthError: If token refresh fails
        """
        try:
            # Use connected_accounts.refresh to refresh token
            # Note: API changed in composio 0.9.x - use refresh method directly
            result = self._sdk_client.connected_accounts.refresh(
                connected_account_id=connection_id
            )
            
            new_access_token = getattr(result, 'access_token', None) or result.get("access_token")
            new_refresh_token = getattr(result, 'refresh_token', None) or result.get("refresh_token")
            expires_in = getattr(result, 'expires_in', None) or result.get("expires_in")
            
            if not new_access_token:
                raise ComposioError("Invalid refresh response: missing access_token")
            
            from datetime import datetime, timedelta
            expires_at = None
            if expires_in:
                expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            logger.info(
                f"Refreshed token for toolkit {toolkit}, "
                f"tenant {tenant_id}, connection {connection_id}"
            )
            
            return {
                "access_token": str(new_access_token),
                "refresh_token": str(new_refresh_token) if new_refresh_token else refresh_token,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "expires_in": expires_in
            }
            
        except Exception as e:
            from app.service.composio.exceptions import ComposioOAuthError
            raise ComposioOAuthError(f"Failed to refresh token: {e}") from e
    
    def list_toolkits(self) -> List[Dict[str, Any]]:
        """
        List available Composio toolkits.
        
        Returns:
            List of toolkit dictionaries with name, description, etc.
        """
        try:
            # Note: API changed in composio 0.9.x - use toolkits.list() instead of apps.get()
            toolkits_response = self._sdk_client.toolkits.list()
            
            # Extract toolkits from response
            toolkits = []
            if hasattr(toolkits_response, 'data'):
                toolkits = toolkits_response.data
            elif hasattr(toolkits_response, '__iter__'):
                toolkits = list(toolkits_response)
            else:
                toolkits = [toolkits_response] if toolkits_response else []
            
            # Convert to list of dicts
            result = []
            for toolkit in toolkits:
                if hasattr(toolkit, 'model_dump'):
                    result.append(toolkit.model_dump())
                elif hasattr(toolkit, 'dict'):
                    result.append(toolkit.dict())
                elif hasattr(toolkit, '__dict__'):
                    result.append(toolkit.__dict__)
                else:
                    result.append({"name": str(toolkit)})
            
            return result
        except Exception as e:
            logger.warning(f"Failed to list toolkits: {e}")
            return []
    
    def list_actions(self, toolkit: str) -> List[Dict[str, Any]]:
        """
        List available actions for a toolkit.
        
        Args:
            toolkit: Toolkit name
            
        Returns:
            List of action dictionaries with name, description, parameters, etc.
        """
        try:
            # Note: API changed in composio 0.9.x - use tools.list() instead of actions.get()
            # Filter by toolkit/entity if possible
            tools_response = self._sdk_client.tools.list()
            
            # Extract tools from response
            tools = []
            if hasattr(tools_response, 'data'):
                tools = tools_response.data
            elif hasattr(tools_response, '__iter__'):
                tools = list(tools_response)
            else:
                tools = [tools_response] if tools_response else []
            
            # Filter by toolkit if needed (tools may have entity/toolkit field)
            filtered_tools = []
            for tool in tools:
                tool_entity = None
                if hasattr(tool, 'entity'):
                    tool_entity = tool.entity
                elif hasattr(tool, 'toolkit'):
                    tool_entity = tool.toolkit
                elif isinstance(tool, dict):
                    tool_entity = tool.get('entity') or tool.get('toolkit')
                
                # If toolkit filter matches or no filter needed
                if not toolkit or tool_entity == toolkit:
                    filtered_tools.append(tool)
            
            # Convert to list of dicts
            result = []
            for tool in filtered_tools:
                if hasattr(tool, 'model_dump'):
                    result.append(tool.model_dump())
                elif hasattr(tool, 'dict'):
                    result.append(tool.dict())
                elif hasattr(tool, '__dict__'):
                    result.append(tool.__dict__)
                else:
                    result.append({"name": str(tool)})
            
            return result
        except Exception as e:
            logger.warning(f"Failed to list actions for toolkit {toolkit}: {e}")
            return []

