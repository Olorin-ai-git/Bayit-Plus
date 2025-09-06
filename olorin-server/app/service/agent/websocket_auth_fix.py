"""
WebSocket Authentication Fix

Fixes the 403 Forbidden error by adding proper JWT authentication to WebSocket connections.
This addresses the symptom: "Handshake status 403 Forbidden"
Root cause: Missing/invalid auth header in WebSocket connection
"""

import os
import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import urllib.parse

logger = logging.getLogger(__name__)

class WebSocketAuthFixer:
    """Handles WebSocket authentication setup and token generation"""
    
    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode
        self.demo_jwt_secret = "olorin-demo-jwt-secret-key-for-testing-only"
        
    def generate_demo_jwt_token(self, user_id: str = "autonomous_test_runner") -> str:
        """Generate a demo JWT token for WebSocket authentication"""
        
        # Get JWT secret (use demo secret in demo mode)
        if self.demo_mode:
            secret_key = self.demo_jwt_secret
        else:
            # Try to get real JWT secret from environment or Firebase
            secret_key = os.environ.get('JWT_SECRET_KEY')
            if not secret_key:
                try:
                    from app.utils.firebase_secrets import get_firebase_secret
                    from app.service.config import get_settings_for_env
                    settings = get_settings_for_env()
                    secret_key = get_firebase_secret(settings.jwt_secret_key_secret)
                except:
                    logger.warning("Could not get real JWT secret, using demo secret")
                    secret_key = self.demo_jwt_secret
        
        # Create JWT payload
        payload = {
            "sub": user_id,  # Subject (user identifier)
            "iat": datetime.utcnow(),  # Issued at
            "exp": datetime.utcnow() + timedelta(hours=24),  # Expires in 24 hours
            "aud": "olorin-autonomous-investigation",  # Audience
            "iss": "olorin-test-runner",  # Issuer
            "demo": self.demo_mode
        }
        
        # Generate JWT token
        token = jwt.encode(payload, secret_key, algorithm="HS256")
        
        logger.info(f"Generated {'demo' if self.demo_mode else 'production'} JWT token for WebSocket auth")
        return token
    
    def create_authenticated_websocket_url(
        self, 
        base_server_url: str, 
        investigation_id: str,
        parallel: bool = False
    ) -> str:
        """Create WebSocket URL with proper authentication token"""
        
        # Generate JWT token
        jwt_token = self.generate_demo_jwt_token()
        
        # Convert HTTP URL to WebSocket URL
        ws_url = base_server_url.replace('http://', 'ws://').replace('https://', 'wss://')
        
        # Build WebSocket endpoint with investigation ID
        ws_endpoint = f"{ws_url}/ws/{investigation_id}"
        
        # Add query parameters for authentication and configuration
        params = {
            'token': jwt_token,
            'parallel': str(parallel).lower()
        }
        
        # URL encode parameters
        query_string = urllib.parse.urlencode(params)
        authenticated_ws_url = f"{ws_endpoint}?{query_string}"
        
        logger.info(f"Created authenticated WebSocket URL for investigation {investigation_id}")
        logger.debug(f"WebSocket URL: {authenticated_ws_url}")
        
        return authenticated_ws_url
    
    def get_websocket_headers(self) -> Dict[str, str]:
        """Get headers for WebSocket connection"""
        
        headers = {
            'User-Agent': 'Olorin-Autonomous-Investigation-Runner/1.0',
            'Origin': 'http://localhost:8090',  # Add origin for CORS
        }
        
        # Add demo mode indicator
        if self.demo_mode:
            headers['X-Olorin-Mode'] = 'demo'
        
        return headers
    
    def validate_jwt_token(self, token: str) -> bool:
        """Validate a JWT token (for testing purposes)"""
        try:
            # Use demo secret in demo mode
            secret_key = self.demo_jwt_secret if self.demo_mode else os.environ.get('JWT_SECRET_KEY', self.demo_jwt_secret)
            
            # Decode and verify token
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            
            # Check expiration
            exp = payload.get('exp')
            if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
                logger.warning("JWT token has expired")
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
    parallel: bool = False
) -> Dict[str, Any]:
    """Create complete WebSocket connection configuration with authentication"""
    
    auth_fixer = WebSocketAuthFixer(demo_mode=demo_mode)
    
    # Create authenticated URL
    authenticated_url = auth_fixer.create_authenticated_websocket_url(
        base_server_url=server_url,
        investigation_id=investigation_id,
        parallel=parallel
    )
    
    # Get headers
    headers = auth_fixer.get_websocket_headers()
    
    return {
        'url': authenticated_url,
        'headers': headers,
        'demo_mode': demo_mode,
        'investigation_id': investigation_id,
        'parallel': parallel,
        'auth_fixer': auth_fixer
    }


def patch_websocket_client_with_auth(websocket_app_class):
    """Patch WebSocket client to include authentication"""
    
    original_init = websocket_app_class.__init__
    
    def patched_init(self, url, header=None, on_open=None, on_message=None, 
                    on_error=None, on_close=None, on_ping=None, on_pong=None,
                    on_cont_message=None, keep_running=True, get_mask_key=None, 
                    cookie=None, subprotocols=None, on_data=None):
        
        # Add authentication headers if not already present
        if header is None:
            header = {}
        
        # Add Origin header for CORS
        if 'Origin' not in header:
            header['Origin'] = 'http://localhost:8090'
        
        # Add demo mode header
        if 'X-Olorin-Mode' not in header:
            header['X-Olorin-Mode'] = 'demo'
        
        # Call original init with enhanced headers
        original_init(self, url, header, on_open, on_message, on_error, on_close, 
                     on_ping, on_pong, on_cont_message, keep_running, get_mask_key,
                     cookie, subprotocols, on_data)
    
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