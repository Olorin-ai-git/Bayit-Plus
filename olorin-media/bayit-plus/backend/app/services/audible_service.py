"""
Audible Integration Service

Handles OAuth authentication, library sync, and catalog browsing for Audible.
Allows users to link their Audible accounts and view their library within Bayit+.
"""

import logging
from typing import Optional, List
from datetime import datetime, timedelta

import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class AudibleAudiobook(BaseModel):
    """Audible audiobook data from API"""
    asin: str  # Audible's unique ID
    title: str
    author: str
    narrator: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    rating: Optional[float] = None
    is_owned: bool = False  # Whether user owns it


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
    """
    Integrates with Audible API for:
    - User authentication (OAuth)
    - Library fetching
    - Catalog search
    - Account metadata

    Note: Audio playback redirects to official Audible app (DRM protection)
    """

    def __init__(self):
        self.base_url = "https://api.audible.com"
        self.auth_url = "https://www.audible.com/auth/oauth2"

        # Load from configuration
        self.client_id = settings.AUDIBLE_CLIENT_ID
        self.client_secret = settings.AUDIBLE_CLIENT_SECRET
        self.redirect_uri = settings.AUDIBLE_REDIRECT_URI

        # Initialize HTTP client with timeout and connection pooling
        # 30s total timeout, 10s per connection, 5 max connections
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=5, max_keepalive_connections=2),
            headers={
                "User-Agent": "Bayit+ Audible Integration/1.0",
                "Accept": "application/json",
            }
        )

    async def get_oauth_url(self, state: str) -> str:
        """
        Generate Audible OAuth login URL.

        Args:
            state: CSRF token for security

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

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        oauth_url = f"{self.auth_url}/authorize?{query_string}"

        logger.info(
            "Generated Audible OAuth URL",
            extra={"state": state}
        )

        return oauth_url

    async def exchange_code_for_token(self, code: str) -> AudibleOAuthToken:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from OAuth redirect

        Returns:
            AudibleOAuthToken with access and refresh tokens

        Raises:
            AudibleAPIError: If token exchange fails
        """
        logger.info(
            "Exchanging Audible auth code for token",
            extra={"code": code[:10] + "..."}
        )

        try:
            response = await self.http_client.post(
                f"{self.auth_url}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                }
            )
            response.raise_for_status()

            data = response.json()
            return AudibleOAuthToken(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", ""),
                expires_at=datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
                user_id=data.get("user_id", ""),
            )

        except httpx.HTTPError as e:
            logger.error(
                f"Audible token exchange failed: {str(e)}",
                extra={"code": code[:10] + "..."}
            )
            raise AudibleAPIError(f"Failed to exchange code for token: {str(e)}")

    async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
        """
        Refresh expired access token.

        Args:
            refresh_token: Audible refresh token

        Returns:
            New AudibleOAuthToken with updated access token

        Raises:
            AudibleAPIError: If token refresh fails
        """
        logger.debug(
            "Refreshing Audible access token",
            extra={"refresh_token": refresh_token[:10] + "..."}
        )

        try:
            response = await self.http_client.post(
                f"{self.auth_url}/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                }
            )
            response.raise_for_status()

            data = response.json()
            return AudibleOAuthToken(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", refresh_token),
                expires_at=datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
                user_id=data.get("user_id", ""),
            )

        except httpx.HTTPError as e:
            logger.error(
                f"Audible token refresh failed: {str(e)}",
            )
            raise AudibleAPIError(f"Failed to refresh access token: {str(e)}")

    async def get_user_library(
        self,
        access_token: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AudibleAudiobook]:
        """
        Fetch user's Audible library (audiobooks they own).

        Args:
            access_token: Audible OAuth access token
            limit: Number of items to fetch (max 100)
            offset: Pagination offset

        Returns:
            List of audiobooks in user's library

        Raises:
            AudibleAPIError: If library fetch fails
        """
        logger.debug(
            "Fetching Audible user library",
            extra={"limit": limit, "offset": offset}
        )

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/library",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "limit": min(limit, 100),
                    "offset": offset,
                    "sort": "date_added",
                    "response_groups": "product_attrs,product_desc,reviews,series",
                }
            )
            response.raise_for_status()

            data = response.json()
            audiobooks = []

            for item in data.get("items", []):
                product = item.get("product", {})
                narrators = product.get("narrators", [])

                audiobooks.append(AudibleAudiobook(
                    asin=product.get("asin", ""),
                    title=product.get("title", ""),
                    author=product.get("author_name", ""),
                    narrator=narrators[0].get("name") if narrators else None,
                    image=product.get("product_images", {}).get("500"),
                    description=product.get("product_desc"),
                    duration_minutes=int(product.get("runtime_length_ms", 0) / 60000),
                    rating=product.get("rating"),
                    is_owned=True,
                ))

            logger.info(
                "Successfully fetched Audible library",
                extra={"count": len(audiobooks), "limit": limit, "offset": offset}
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
        """
        Search Audible catalog (not just user's library).

        Args:
            query: Search query (title, author, narrator)
            limit: Number of results (max 50)

        Returns:
            List of audiobooks matching search

        Raises:
            AudibleAPIError: If search fails
        """
        logger.info(
            "Searching Audible catalog",
            extra={"query": query, "limit": limit}
        )

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/catalog/search",
                headers={"Authorization": "Bearer GUEST"},  # Public search
                params={
                    "query": query,
                    "num_results": min(limit, 50),
                    "response_groups": "product_attrs,product_desc,reviews,series,product_images",
                }
            )
            response.raise_for_status()

            data = response.json()
            audiobooks = []

            for item in data.get("products", []):
                narrators = item.get("narrators", [])

                audiobooks.append(AudibleAudiobook(
                    asin=item.get("asin", ""),
                    title=item.get("title", ""),
                    author=item.get("author_name", ""),
                    narrator=narrators[0].get("name") if narrators else None,
                    image=item.get("product_images", {}).get("500"),
                    description=item.get("product_desc"),
                    duration_minutes=int(item.get("runtime_length_ms", 0) / 60000),
                    rating=item.get("rating"),
                    is_owned=False,
                ))

            logger.info(
                "Successfully searched Audible catalog",
                extra={"query": query, "results": len(audiobooks)}
            )
            return audiobooks

        except httpx.HTTPError as e:
            logger.error(f"Audible catalog search failed: {str(e)}")
            raise AudibleAPIError(f"Search failed: {str(e)}")

    async def get_audiobook_details(self, asin: str) -> Optional[AudibleAudiobook]:
        """
        Get detailed information about a specific Audible audiobook.

        Args:
            asin: Audible's unique identifier

        Returns:
            Detailed audiobook information or None if not found

        Raises:
            AudibleAPIError: If detail fetch fails
        """
        logger.debug(
            "Fetching Audible audiobook details",
            extra={"asin": asin}
        )

        try:
            response = await self.http_client.get(
                f"{self.base_url}/1.0/catalog/{asin}",
                headers={"Authorization": "Bearer GUEST"},
                params={
                    "response_groups": "product_attrs,product_desc,reviews,series,sample,product_images,rating",
                }
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
        """
        Generate URL to open audiobook in official Audible app.

        This allows seamless redirect to Audible for DRM-protected playback.

        Args:
            asin: Audible's unique identifier

        Returns:
            URL to open in Audible app
        """
        # Mobile app deep links
        ios_url = f"audible://www.audible.com/pd/{asin}"
        android_url = f"audible://www.audible.com/pd/{asin}"

        # Web URL (fallback)
        web_url = f"https://www.audible.com/pd/{asin}"

        logger.debug(
            "Generated Audible app URLs",
            extra={"asin": asin, "ios_url": ios_url, "android_url": android_url}
        )

        return web_url  # Return web URL; client determines iOS/Android/web

    async def close(self) -> None:
        """Close HTTP client connection."""
        await self.http_client.aclose()

    def __del__(self):
        """Ensure HTTP client is closed on service destruction."""
        import asyncio
        try:
            asyncio.run(self.close())
        except RuntimeError:
            pass  # Event loop may be closed already


# Global service instance
audible_service = AudibleService()
