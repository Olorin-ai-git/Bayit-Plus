"""Audible Integration Service

Coordinates OAuth, library, and catalog operations with Audible API.
Manages HTTP client, configuration, and service orchestration.
"""

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.audible_oauth_service import AudibleOAuthService, AudibleOAuthToken
from app.services.audible_library_service import AudibleLibraryService, AudibleAudiobook
from app.services.audible_catalog_service import AudibleCatalogService

logger = get_logger(__name__)


class AudibleAPIError(Exception):
    """Raised when Audible API calls fail."""

    pass


class AudibleService:
    """Main coordinator for Audible API integration.

    Orchestrates OAuth, library, and catalog services with a shared HTTP client.
    """

    def __init__(self):
        """Initialize service with configuration and HTTP client."""
        self.client_id = settings.AUDIBLE_CLIENT_ID
        self.client_secret = settings.AUDIBLE_CLIENT_SECRET
        self.redirect_uri = settings.AUDIBLE_REDIRECT_URI

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

        # Initialize sub-services with shared HTTP client
        self.oauth = AudibleOAuthService(
            self.http_client,
            settings.AUDIBLE_AUTH_URL,
            self.client_id,
            self.client_secret,
            self.redirect_uri,
        )
        self.library = AudibleLibraryService(self.http_client, settings.AUDIBLE_API_BASE_URL)
        self.catalog = AudibleCatalogService(self.http_client, settings.AUDIBLE_API_BASE_URL)

    # OAuth methods (delegated to oauth service)
    async def get_oauth_url(self, state: str, code_challenge: str = None) -> str:
        """Generate OAuth authorization URL with optional PKCE."""
        return self.oauth.get_oauth_url(state, code_challenge)

    async def exchange_code_for_token(self, code: str, code_verifier: str = None) -> AudibleOAuthToken:
        """Exchange authorization code for access token."""
        try:
            return await self.oauth.exchange_code_for_token(code, code_verifier)
        except Exception as e:
            logger.error(f"Audible token exchange failed: {str(e)}")
            raise AudibleAPIError(f"Failed to exchange code for token: {str(e)}")

    async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
        """Refresh expired access token."""
        try:
            return await self.oauth.refresh_access_token(refresh_token)
        except Exception as e:
            logger.error(f"Audible token refresh failed: {str(e)}")
            raise AudibleAPIError(f"Failed to refresh access token: {str(e)}")

    # Library methods (delegated to library service)
    async def get_user_library(self, access_token: str, limit: int = 50, offset: int = 0):
        """Fetch user's Audible library."""
        try:
            return await self.library.get_user_library(access_token, limit, offset)
        except Exception as e:
            logger.error(f"Failed to fetch Audible library: {str(e)}")
            raise AudibleAPIError(f"Failed to fetch library: {str(e)}")

    # Catalog methods (delegated to catalog service)
    async def search_catalog(self, query: str, limit: int = 20):
        """Search Audible catalog."""
        try:
            return await self.catalog.search_catalog(query, limit)
        except Exception as e:
            logger.error(f"Audible catalog search failed: {str(e)}")
            raise AudibleAPIError(f"Search failed: {str(e)}")

    async def get_audiobook_details(self, asin: str):
        """Get detailed audiobook information."""
        try:
            return await self.catalog.get_audiobook_details(asin)
        except Exception as e:
            logger.error(f"Failed to fetch audiobook details: {str(e)}", extra={"asin": asin})
            raise AudibleAPIError(f"Failed to fetch details: {str(e)}")

    def get_audible_app_url(self, asin: str) -> str:
        """Generate Audible app deep link URL."""
        return self.catalog.get_audible_app_url(asin)

    async def close(self) -> None:
        """Close HTTP client connection."""
        await self.http_client.aclose()


# Global service instance
audible_service = AudibleService()
