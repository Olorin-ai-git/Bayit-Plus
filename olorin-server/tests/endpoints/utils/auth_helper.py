"""
Authentication Helper for Olorin Endpoint Testing.

Provides utilities to authenticate with the Olorin API and manage JWT tokens
for protected endpoint testing. Uses REAL authentication - NO MOCK DATA.
"""

import json
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timezone, timedelta

from ..conftest import EndpointTestClient

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when authentication fails."""
    pass


class TokenManager:
    """Manages JWT tokens for API authentication."""
    
    def __init__(self):
        self.current_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.refresh_token: Optional[str] = None
    
    def is_token_valid(self) -> bool:
        """Check if current token is valid and not expired."""
        if not self.current_token:
            return False
        
        if not self.token_expires_at:
            return True  # Assume valid if no expiry info
        
        # Check if token expires in next 5 minutes
        now = datetime.now(timezone.utc)
        return self.token_expires_at > now.replace(second=0, microsecond=0)
    
    def store_token(self, token: str, expires_in: Optional[int] = None) -> None:
        """Store JWT token with optional expiration."""
        self.current_token = token
        
        if expires_in:
            self.token_expires_at = datetime.now(timezone.utc).replace(
                second=0, microsecond=0
            ) + timedelta(seconds=expires_in - 300)  # 5 min buffer
        else:
            # Default 1 hour if no expiry provided
            self.token_expires_at = datetime.now(timezone.utc).replace(
                second=0, microsecond=0
            ) + timedelta(hours=1)
        
        logger.info(f"Stored JWT token (expires: {self.token_expires_at})")
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers with current token."""
        if not self.current_token:
            raise AuthenticationError("No authentication token available")
        
        return {
            "Authorization": f"Bearer {self.current_token}",
            "Content-Type": "application/json",
        }


# Global token manager
_token_manager = TokenManager()


async def authenticate_with_credentials(
    client: EndpointTestClient,
    username: str,
    password: str
) -> Tuple[str, Optional[str]]:
    """
    Authenticate with username/password and return JWT token.
    
    Args:
        client: HTTP client for making requests
        username: Username for authentication
        password: Password for authentication
        
    Returns:
        Tuple of (access_token, refresh_token)
        
    Raises:
        AuthenticationError: If authentication fails
    """
    try:
        # Try JSON login first
        logger.info(f"Attempting JSON authentication for user: {username}")
        
        response, metrics = await client.post(
            "/auth/login-json",
            json_data={
                "username": username,
                "password": password
            }
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                access_token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                token_type = data.get("token_type", "bearer")
                
                if not access_token:
                    raise AuthenticationError("No access token in response")
                
                logger.info(f"JSON authentication successful - token type: {token_type}")
                return access_token, refresh_token
                
            except json.JSONDecodeError:
                logger.error("Invalid JSON response from login endpoint")
                raise AuthenticationError("Invalid JSON response from authentication")
        
        # If JSON login failed, try form-based login
        logger.info("JSON login failed, trying form-based authentication")
        
        response, metrics = await client.post(
            "/auth/login",
            data={
                "username": username,
                "password": password,
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                access_token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                
                if access_token:
                    logger.info("Form-based authentication successful")
                    return access_token, refresh_token
                
            except json.JSONDecodeError:
                pass
        
        # If both methods failed, raise error with details
        logger.error(f"Authentication failed with status {response.status_code}")
        if response.content:
            try:
                error_data = response.json()
                error_msg = error_data.get("detail", "Authentication failed")
            except json.JSONDecodeError:
                error_msg = response.text if response.text else "Unknown authentication error"
        else:
            error_msg = f"HTTP {response.status_code} - No response content"
        
        raise AuthenticationError(f"Authentication failed: {error_msg}")
        
    except Exception as e:
        if isinstance(e, AuthenticationError):
            raise
        
        logger.error(f"Authentication request failed: {str(e)}")
        raise AuthenticationError(f"Authentication request error: {str(e)}")


async def get_test_auth_headers(client: EndpointTestClient) -> Dict[str, str]:
    """
    Get authentication headers for test requests.
    
    Uses real test credentials to authenticate and returns headers
    with valid JWT token.
    
    Args:
        client: HTTP client for authentication requests
        
    Returns:
        Dictionary with Authorization and other headers
        
    Raises:
        AuthenticationError: If authentication fails
    """
    # Check if we have a valid token
    if _token_manager.is_token_valid():
        logger.debug("Using cached authentication token")
        return _token_manager.get_auth_headers()
    
    # Need to authenticate
    logger.info("Authenticating with test credentials")
    
    # Use real test credentials from Firebase secrets
    from app.test.firebase_secrets_test_config import TEST_SECRETS
    
    # Try multiple credential sets
    credential_sets = [
        # Primary test user
        ("olorin_test_user", TEST_SECRETS.get("TEST_USER_PWD", "test_password")),
        # Alternative test users for redundancy
        ("testuser", "testpass"),
        ("test_user", "test_password"),
    ]
    
    last_error = None
    
    for username, password in credential_sets:
        try:
            access_token, refresh_token = await authenticate_with_credentials(
                client, username, password
            )
            
            # Store token in manager
            _token_manager.store_token(access_token)
            if refresh_token:
                _token_manager.refresh_token = refresh_token
            
            # Return headers with additional Olorin-specific headers
            headers = _token_manager.get_auth_headers()
            headers.update({
                "olorin_experience_id": "olorin-endpoint-test-experience",
                "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
                "olorin_tid": f"test-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "User-Agent": "Olorin-Endpoint-Test-Client/1.0",
            })
            
            logger.info(f"Authentication successful with credentials: {username}")
            return headers
            
        except AuthenticationError as e:
            logger.warning(f"Authentication failed for {username}: {e}")
            last_error = e
            continue
    
    # If all credential sets failed
    raise AuthenticationError(f"All authentication attempts failed. Last error: {last_error}")


async def test_authentication(client: EndpointTestClient) -> Dict[str, any]:
    """
    Test authentication endpoints and return user info.
    
    Args:
        client: HTTP client for testing
        
    Returns:
        User information from /auth/me endpoint
    """
    try:
        # Get auth headers
        headers = await get_test_auth_headers(client)
        
        # Test /auth/me endpoint
        response, metrics = await client.get("/auth/me", headers=headers)
        
        if response.status_code == 200:
            user_info = response.json()
            logger.info(f"Authentication test successful - user: {user_info}")
            return user_info
        else:
            logger.error(f"/auth/me failed with status {response.status_code}")
            raise AuthenticationError(f"/auth/me returned {response.status_code}")
            
    except Exception as e:
        logger.error(f"Authentication test failed: {e}")
        raise AuthenticationError(f"Authentication test failed: {e}")


async def refresh_token_if_needed(client: EndpointTestClient) -> None:
    """
    Refresh authentication token if needed.
    
    Args:
        client: HTTP client for refresh requests
    """
    if _token_manager.is_token_valid():
        return
    
    if not _token_manager.refresh_token:
        logger.info("No refresh token available, re-authenticating")
        await get_test_auth_headers(client)
        return
    
    try:
        logger.info("Refreshing authentication token")
        
        response, metrics = await client.post(
            "/auth/refresh",
            json_data={"refresh_token": _token_manager.refresh_token}
        )
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            
            if access_token:
                _token_manager.store_token(access_token)
                logger.info("Token refresh successful")
                return
        
        logger.warning("Token refresh failed, re-authenticating")
        await get_test_auth_headers(client)
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        await get_test_auth_headers(client)