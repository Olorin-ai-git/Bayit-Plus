"""Audible Integration Service

Handles OAuth authentication, library sync, and catalog browsing for Audible.
Allows users to link their Audible accounts and view their library within Bayit+.
"""

import secrets
from typing import Optional, List
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.audible_token_crypto import audible_token_crypto

logger = get_logger(__name__)


class AudibleAudiobook(BaseModel):
    """Audible audiobook data from API"""

    asin: str
    title: str
    author: str
    narrator: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    rating: Optional[float] = None
    is_owned: bool = False


class AudibleOAuthToken(BaseModel):
    """Audible OAuth token data"""

    access_token: str
    refresh_token: str
    expires_at: datetime
    user_id: str


class AudibleAPIError(Exception):
    """Raised when Audible API calls fail."""

    pass


class AudibleService:
    """Integrates with Audible API for OAuth, library fetching, catalog search."""

    def __init__(self):
        """Initialize service with configuration and HTTP client."""
        self.client_id = settings.AUDIBLE_CLIENT_ID
        self.client_secret = settings.AUDIBLE_CLIENT_SECRET
        self.redirect_uri = settings.AUDIBLE_REDIRECT_URI

        # Use configured URLs (allows environment overrides if needed)
        self.base_url = settings.AUDIBLE_API_BASE_URL
        self.auth_url = settings.AUDIBLE_AUTH_URL

        # Initialize HTTP client with timeouts and connection pooling
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                settings.AUDIBLE_HTTP_TIMEOUT_SECONDS,
                connect=settings.AUDIBLE_HTTP_CONNECT_TIMEOUT_SECONDS,
            ),
            limits=httpx.Limits(
                max_connections=settings.AUDIBLE_HTTP_MAX_CONNECTIONS,
                max_keepalive_connections=settings.AUDIBLE_HTTP_KEEPALIVE_CONNECTIONS,
            ),
            headers={
                "User-Agent": "Bayit+ Audible Integration/1.0",
                "Accept": "application/json",
            },
        )

    async def get_oauth_url(self, state: str, code_challenge: str = None) -> str:
        """Generate Audible OAuth login URL with optional PKCE.

        Args:
            state: CSRF token for security
            code_challenge: PKCE code challenge (optional)

        Returns:
            OAuth authorization URL
        """
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
            AudibleAPIError: If token exchange fails
        """
        logger.info("Exchanging Audible auth code for token")

        try:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
            }

            if code_verifier:
                data["code_verifier"] = code_verifier

            response = await self.http_client.post(
                f"{self.auth_url}/token",
                data=data,
            )
            response.raise_for_status()

            data = response.json()
            token = AudibleOAuthToken(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", ""),
                expires_at=datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
                user_id=data.get("user_id", ""),
            )

            # Encrypt tokens before returning
            token.access_token = audible_token_crypto.encrypt_token(token.access_token)
            token.refresh_token = audible_token_crypto.encrypt_token(token.refresh_token)

            return token

        except httpx.HTTPError as e:
            logger.error(f"Audible token exchange failed: {str(e)}")
            raise AudibleAPIError(f"Failed to exchange code for token: {str(e)}")

    async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
        """Refresh expired access token.

        Args:
            refresh_token: Audible refresh token

        Returns:
            New AudibleOAuthToken with updated access token

        Raises:
            AudibleAPIError: If token refresh fails
        """
        # Decrypt token for use
        decrypted_token = audible_token_crypto.decrypt_token(refresh_token)

        logger.debug("Refreshing Audible access token")

        try:
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

            data = response.json()
            token = AudibleOAuthToken(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", decrypted_token),
                expires_at=datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
                user_id=data.get("user_id", ""),
            )

            # Encrypt tokens before returning
            token.access_token = audible_token_crypto.encrypt_token(token.access_token)
            token.refresh_token = audible_token_crypto.encrypt_token(token.refresh_token)

            return token

        except httpx.HTTPError as e:
            logger.error(f"Audible token refresh failed: {str(e)}")
            raise AudibleAPIError(f"Failed to refresh access token: {str(e)}")

    async def get_user_library(
        self,
        access_token: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AudibleAudiobook]:
        """Fetch user's Audible library (audiobooks they own).

        Args:
            access_token: Audible OAuth access token
            limit: Number of items to fetch (max 100)
            offset: Pagination offset

        Returns:
            List of audiobooks in user's library

        Raises:
            AudibleAPIError: If library fetch fails
        """
        # Decrypt token for use
        decrypted_token = audible_token_crypto.decrypt_token(access_token)

        logger.debug("Fetching Audible user library", extra={"limit": limit, "offset": offset})

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/library",
                headers={"Authorization": f"Bearer {decrypted_token}"},
                params={
                    "limit": min(limit, 100),
                    "offset": offset,
                    "sort": "date_added",
                    "response_groups": "product_attrs,product_desc,reviews,series",
                },
            )
            response.raise_for_status()

            data = response.json()
            audiobooks = []

            for item in data.get("items", []):
                product = item.get("product", {})
                narrators = product.get("narrators", [])

                audiobooks.append(
                    AudibleAudiobook(
                        asin=product.get("asin", ""),
                        title=product.get("title", ""),
                        author=product.get("author_name", ""),
                        narrator=narrators[0].get("name") if narrators else None,
                        image=product.get("product_images", {}).get("500"),
                        description=product.get("product_desc"),
                        duration_minutes=int(product.get("runtime_length_ms", 0) / 60000),
                        rating=product.get("rating"),
                        is_owned=True,
                    )
                )

            logger.info(
                "Successfully fetched Audible library",
                extra={"count": len(audiobooks), "limit": limit, "offset": offset},
            )
            return audiobooks

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch Audible library: {str(e)}")
            raise AudibleAPIError(f"Failed to fetch library: {str(e)}")

    async def search_catalog(
        self,
        query: str,
        limit: int = 20,
    ) -> List[AudibleAudiobook]:
        """Search Audible catalog (not just user's library).

        Args:
            query: Search query (title, author, narrator)
            limit: Number of results (max 50)

        Returns:
            List of audiobooks matching search

        Raises:
            AudibleAPIError: If search fails
        """
        logger.info("Searching Audible catalog", extra={"query": query, "limit": limit})

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/catalog/search",
                headers={"Authorization": "Bearer GUEST"},  # Public search
                params={
                    "query": query,
                    "num_results": min(limit, 50),
                    "response_groups": "product_attrs,product_desc,reviews,series,product_images",
                },
            )
            response.raise_for_status()

            data = response.json()
            audiobooks = []

            for item in data.get("products", []):
                narrators = item.get("narrators", [])

                audiobooks.append(
                    AudibleAudiobook(
                        asin=item.get("asin", ""),
                        title=item.get("title", ""),
                        author=item.get("author_name", ""),
                        narrator=narrators[0].get("name") if narrators else None,
                        image=item.get("product_images", {}).get("500"),
                        description=item.get("product_desc"),
                        duration_minutes=int(item.get("runtime_length_ms", 0) / 60000),
                        rating=item.get("rating"),
                        is_owned=False,
                    )
                )

            logger.info(
                "Successfully searched Audible catalog",
                extra={"query": query, "results": len(audiobooks)},
            )
            return audiobooks

        except httpx.HTTPError as e:
            logger.error(f"Audible catalog search failed: {str(e)}")
            raise AudibleAPIError(f"Search failed: {str(e)}")

    async def get_audiobook_details(self, asin: str) -> Optional[AudibleAudiobook]:
        """Get detailed information about a specific Audible audiobook.

        Args:
            asin: Audible's unique identifier

        Returns:
            Detailed audiobook information or None if not found

        Raises:
            AudibleAPIError: If detail fetch fails
        """
        logger.debug("Fetching Audible audiobook details", extra={"asin": asin})

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/catalog/{asin}",
                headers={"Authorization": "Bearer GUEST"},
                params={
                    "response_groups": "product_attrs,product_desc,reviews,series,sample,product_images,rating",
                },
            )
            response.raise_for_status()

            product = response.json().get("product", {})
            if not product:
                logger.warning(f"Audiobook not found: {asin}")
                return None

            narrators = product.get("narrators", [])

            return AudibleAudiobook(
                asin=product.get("asin", ""),
                title=product.get("title", ""),
                author=product.get("author_name", ""),
                narrator=narrators[0].get("name") if narrators else None,
                image=product.get("product_images", {}).get("500"),
                description=product.get("product_desc"),
                duration_minutes=int(product.get("runtime_length_ms", 0) / 60000),
                rating=product.get("rating"),
                is_owned=False,
            )

        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch audiobook details: {str(e)}", extra={"asin": asin})
            raise AudibleAPIError(f"Failed to fetch details: {str(e)}")

    def get_audible_app_url(self, asin: str) -> str:
        """Generate URL to open audiobook in official Audible app.

        Args:
            asin: Audible's unique identifier

        Returns:
            URL to open in Audible app
        """
        web_url = f"https://www.audible.com/pd/{asin}"
        logger.debug("Generated Audible app URL", extra={"asin": asin})
        return web_url

    async def close(self) -> None:
        """Close HTTP client connection."""
        await self.http_client.aclose()


# Global service instance
audible_service = AudibleService()
