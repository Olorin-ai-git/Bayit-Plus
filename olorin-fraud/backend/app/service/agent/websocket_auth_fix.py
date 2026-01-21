"""
WebSocket Authentication Fix

Fixes the 403 Forbidden error by adding proper JWT authentication to WebSocket connections.
This addresses the symptom: "Handshake status 403 Forbidden"
Root cause: Missing/invalid auth header in WebSocket connection
"""

import logging
import os
import urllib.parse
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt

logger = logging.getLogger(__name__)


class WebSocketAuthFixer:
    """Handles WebSocket authentication setup and token generation"""

    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode
        self.demo_jwt_secret = "olorin-demo-jwt-secret-key-for-testing-only"

    def generate_demo_jwt_token(self, user_id: str = "autonomous_test_runner") -> str:
        """Generate a demo JWT token for WebSocket authentication"""

        # Always try to get the same secret key that the server uses
        secret_key = None
        try:
            # Use the same method as the server to get JWT secret
            from app.service.config_loader import get_config_loader

            config_loader = get_config_loader()
            jwt_config = config_loader.load_jwt_config()
            secret_key = jwt_config.get("secret_key")
            logger.info("Successfully retrieved JWT secret from config loader")
        except Exception as e:
            logger.warning(f"Could not get server JWT secret: {e}")

        # If server secret failed, try environment variable
        if not secret_key:
            secret_key = os.environ.get("JWT_SECRET_KEY")
            if secret_key:
                logger.info("Using JWT secret from environment variable")

        # Final fallback to demo secret (must match auth.py fallback)
        if not secret_key:
            secret_key = "olorin-development-jwt-secret-key-fallback-for-testing-only"
            logger.warning("Using development JWT secret fallback")

        # Create JWT payload (minimal to match server expectations)
        payload = {
            "sub": user_id,  # Subject (user identifier) - required by server
            "iat": datetime.utcnow(),  # Issued at
            "exp": datetime.utcnow() + timedelta(hours=24),  # Expires in 24 hours
        }

        # Generate JWT token
        token = jwt.encode(payload, secret_key, algorithm="HS256")

        logger.info(
            f"Generated {'demo' if self.demo_mode else 'production'} JWT token for WebSocket auth"
        )
        return token

    def create_authenticated_websocket_url(
        self, base_server_url: str, investigation_id: str, parallel: bool = False
    ) -> str:
        """Create WebSocket URL with proper authentication token"""

        # Generate JWT token
        jwt_token = self.generate_demo_jwt_token()

        # Convert HTTP URL to WebSocket URL
        ws_url = base_server_url.replace("http://", "ws://").replace(
            "https://", "wss://"
        )

        # Build WebSocket endpoint with investigation ID
        # Use the correct endpoint path: /ws/{investigation_id} (matches websocket_router.py)
        ws_endpoint = f"{ws_url}/ws/{investigation_id}"

        # Add query parameters for authentication and configuration
        params = {"token": jwt_token, "parallel": str(parallel).lower()}

        # URL encode parameters
        query_string = urllib.parse.urlencode(params)
        authenticated_ws_url = f"{ws_endpoint}?{query_string}"

        logger.info(
            f"Created authenticated WebSocket URL for investigation {investigation_id}"
        )
        logger.debug(f"WebSocket URL: {authenticated_ws_url}")

        return authenticated_ws_url

    def get_websocket_headers(self) -> Dict[str, str]:
        """Get headers for WebSocket connection"""

        headers = {
            "User-Agent": "Olorin-Autonomous-Investigation-Runner/1.0",
            # Remove Origin header to prevent duplicate Origin header error
            # The websocket-client library will add this automatically
        }

        # Add demo mode indicator
        if self.demo_mode:
            headers["X-Olorin-Mode"] = "demo"

        return headers

    def validate_jwt_token(self, token: str) -> bool:
        """Validate a JWT token (for testing purposes)"""
        try:
            # Get the same secret key that the server uses
            secret_key = None
            try:
                from app.service.config_loader import get_config_loader

                config_loader = get_config_loader()
                jwt_config = config_loader.load_jwt_config()
                secret_key = jwt_config.get("secret_key")
            except:
                pass

            if not secret_key:
                secret_key = os.environ.get(
                    "JWT_SECRET_KEY",
                    "olorin-development-jwt-secret-key-fallback-for-testing-only",
                )

            # Decode and verify token (same as server does)
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])

            # Check that subject exists (same as server check)
            username = payload.get("sub")
            if username is None:
                logger.warning("JWT token missing subject")
                return False

            logger.info("JWT token validation passed")
            return True

        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return False
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return False
        except Exception as e:
            logger.error(f"JWT token validation error: {e}")
            return False


def create_websocket_connection_config(
    server_url: str,
    investigation_id: str,
    demo_mode: bool = True,
    parallel: bool = False,
) -> Dict[str, Any]:
    """Create complete WebSocket connection configuration with authentication"""

    auth_fixer = WebSocketAuthFixer(demo_mode=demo_mode)

    # Create authenticated URL
    authenticated_url = auth_fixer.create_authenticated_websocket_url(
        base_server_url=server_url, investigation_id=investigation_id, parallel=parallel
    )

    # Get headers
    headers = auth_fixer.get_websocket_headers()

    return {
        "url": authenticated_url,
        "headers": headers,
        "demo_mode": demo_mode,
        "investigation_id": investigation_id,
        "parallel": parallel,
        "auth_fixer": auth_fixer,
    }


def patch_websocket_client_with_auth(websocket_app_class):
    """Patch WebSocket client to include authentication"""

    original_init = websocket_app_class.__init__

    def patched_init(
        self,
        url,
        header=None,
        on_open=None,
        on_message=None,
        on_error=None,
        on_close=None,
        on_ping=None,
        on_pong=None,
        on_cont_message=None,
        keep_running=True,
        get_mask_key=None,
        cookie=None,
        subprotocols=None,
        on_data=None,
    ):

        # Add authentication headers if not already present
        if header is None:
            header = {}

        # Remove Origin header logic to prevent duplicate headers
        # The websocket-client library will handle Origin automatically

        # Add demo mode header
        if "X-Olorin-Mode" not in header:
            header["X-Olorin-Mode"] = "demo"

        # Call original init with enhanced headers
        original_init(
            self,
            url,
            header,
            on_open,
            on_message,
            on_error,
            on_close,
            on_ping,
            on_pong,
            on_cont_message,
            keep_running,
            get_mask_key,
            cookie,
            subprotocols,
            on_data,
        )

    websocket_app_class.__init__ = patched_init
    return websocket_app_class


# Example usage pattern for the test runner:
"""
# In unified_autonomous_test_runner.py, replace the WebSocket setup:

# OLD CODE:
ws_url = self.config.server_url.replace('http://', 'ws://').replace('https://', 'wss://')
if not ws_url.endswith('/ws/investigation'):
    ws_url += '/ws/investigation'

self.websocket_client = websocket.WebSocketApp(
    ws_url,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close,
    on_open=on_open
)

# NEW CODE:
from app.service.agent.websocket_auth_fix import create_websocket_connection_config

# Create authenticated WebSocket configuration
ws_config = create_websocket_connection_config(
    server_url=self.config.server_url,
    investigation_id='investigation_monitor',
    demo_mode=True,
    parallel=False
)

self.websocket_client = websocket.WebSocketApp(
    ws_config['url'],
    header=ws_config['headers'],
    on_message=on_message,
    on_error=on_error,
    on_close=on_close,
    on_open=on_open
)
"""
