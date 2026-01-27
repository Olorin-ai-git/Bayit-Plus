"""Audible OAuth token management service.

Handles OAuth authorization flows, token exchange, and token refresh.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.services.audible_token_crypto import audible_token_crypto

logger = get_logger(__name__)


class AudibleOAuthToken(BaseModel):
    """Audible OAuth token data"""

    access_token: str
    refresh_token: str
    expires_at: datetime
    user_id: str


class AudibleOAuthService:
    """Handles Audible OAuth authorization and token management."""

    def __init__(self, http_client: httpx.AsyncClient, auth_url: str, client_id: str, client_secret: str, redirect_uri: str):
        """Initialize OAuth service with HTTP client and configuration.

        Args:
            http_client: Configured httpx AsyncClient
            auth_url: Audible auth endpoint URL
            client_id: OAuth client ID
            client_secret: OAuth client secret
            redirect_uri: OAuth redirect URI
        """
        self.http_client = http_client
        self.auth_url = auth_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def get_oauth_url(self, state: str, code_challenge: str = None) -> str:
        """Generate Audible OAuth login URL with optional PKCE.

        Args:
            state: CSRF token for security
            code_challenge: PKCE code challenge (optional)

        Returns:
            OAuth authorization URL
        """
        from urllib.parse import urlencode

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "library profile",
        }

        if code_challenge:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"

        query_string = urlencode(params)
        oauth_url = f"{self.auth_url}/authorize?{query_string}"

        logger.info("Generated Audible OAuth URL", extra={"state": state[:10]})
        return oauth_url

    async def exchange_code_for_token(self, code: str, code_verifier: str = None) -> AudibleOAuthToken:
        """Exchange authorization code for access token.

        Args:
            code: Authorization code from OAuth redirect
            code_verifier: PKCE code verifier (optional)

        Returns:
            AudibleOAuthToken with access and refresh tokens

        Raises:
            Exception: If token exchange fails
        """
        logger.info("Exchanging Audible auth code for token")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
        }

        if code_verifier:
            data["code_verifier"] = code_verifier

        response = await self.http_client.post(f"{self.auth_url}/token", data=data)
        response.raise_for_status()

        token_data = response.json()
        token = AudibleOAuthToken(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600)),
            user_id=token_data.get("user_id", ""),
        )

        # Encrypt tokens before returning
        token.access_token = audible_token_crypto.encrypt_token(token.access_token)
        token.refresh_token = audible_token_crypto.encrypt_token(token.refresh_token)

        return token

    async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
        """Refresh expired access token.

        Args:
            refresh_token: Audible refresh token (encrypted)

        Returns:
            New AudibleOAuthToken with updated access token

        Raises:
            Exception: If token refresh fails
        """
        # Decrypt token for use
        decrypted_token = audible_token_crypto.decrypt_token(refresh_token)

        logger.debug("Refreshing Audible access token")

        response = await self.http_client.post(
            f"{self.auth_url}/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": decrypted_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        response.raise_for_status()

        token_data = response.json()
        token = AudibleOAuthToken(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", decrypted_token),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600)),
            user_id=token_data.get("user_id", ""),
        )

        # Encrypt tokens before returning
        token.access_token = audible_token_crypto.encrypt_token(token.access_token)
        token.refresh_token = audible_token_crypto.encrypt_token(token.refresh_token)

        return token
