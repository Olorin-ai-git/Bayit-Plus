"""
Audible Integration Service

Handles OAuth authentication, library sync, and catalog browsing for Audible.
Allows users to link their Audible accounts and view their library within Bayit+.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from pydantic import BaseModel

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
        # In production, use environment variables for these
        self.client_id = None  # Set via config
        self.client_secret = None  # Set via config
        self.redirect_uri = None  # Set via config

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
        oauth_url = f"https://www.audible.com/auth/oauth2/authorize?{query_string}"

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
        """
        logger.info(
            "Exchanging Audible auth code for token",
            extra={"code": code[:10] + "..."}
        )

        # In production, make actual HTTP request to Audible API
        # This is a mock implementation
        token = AudibleOAuthToken(
            access_token="mock_access_token",
            refresh_token="mock_refresh_token",
            expires_at=datetime.utcnow(),
            user_id="audible_user_123",
        )

        return token

    async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
        """
        Refresh expired access token.

        Args:
            refresh_token: Audible refresh token

        Returns:
            New AudibleOAuthToken with updated access token
        """
        logger.debug(
            "Refreshing Audible access token",
            extra={"refresh_token": refresh_token[:10] + "..."}
        )

        # In production, make actual HTTP request to Audible API
        token = AudibleOAuthToken(
            access_token="mock_new_access_token",
            refresh_token=refresh_token,  # Usually stays the same
            expires_at=datetime.utcnow(),
            user_id="audible_user_123",
        )

        return token

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
            limit: Number of items to fetch
            offset: Pagination offset

        Returns:
            List of audiobooks in user's library
        """
        logger.debug(
            "Fetching Audible user library",
            extra={"limit": limit, "offset": offset}
        )

        # In production, make actual HTTP request to Audible API
        # GET https://api.audible.com/1.0/library

        mock_library = [
            AudibleAudiobook(
                asin="B00ABC123",
                title="The Great Gatsby",
                author="F. Scott Fitzgerald",
                narrator="Tim Seely",
                image="https://example.audible.com/image.jpg",
                description="A classic novel",
                duration_minutes=540,
                rating=4.5,
                is_owned=True,
            ),
            AudibleAudiobook(
                asin="B00ABC124",
                title="1984",
                author="George Orwell",
                narrator="Simon Prebble",
                image="https://example.audible.com/image2.jpg",
                description="Dystopian novel",
                duration_minutes=660,
                rating=4.3,
                is_owned=True,
            ),
        ]

        return mock_library

    async def search_catalog(
        self,
        query: str,
        limit: int = 20,
    ) -> List[AudibleAudiobook]:
        """
        Search Audible catalog (not just user's library).

        Args:
            query: Search query (title, author, narrator)
            limit: Number of results

        Returns:
            List of audiobooks matching search
        """
        logger.info(
            "Searching Audible catalog",
            extra={"query": query, "limit": limit}
        )

        # In production, make actual HTTP request to Audible API
        # GET https://api.audible.com/1.0/catalog/search

        mock_results = [
            AudibleAudiobook(
                asin="B00XYZ001",
                title=f"{query} - Sample Result 1",
                author="Author Name",
                narrator="Narrator Name",
                image="https://example.audible.com/result1.jpg",
                description="Audiobook description",
                duration_minutes=480,
                rating=4.2,
                is_owned=False,
            ),
        ]

        return mock_results

    async def get_audiobook_details(self, asin: str) -> Optional[AudibleAudiobook]:
        """
        Get detailed information about a specific Audible audiobook.

        Args:
            asin: Audible's unique identifier

        Returns:
            Detailed audiobook information or None if not found
        """
        logger.debug(
            "Fetching Audible audiobook details",
            extra={"asin": asin}
        )

        # In production, make actual HTTP request to Audible API
        # GET https://api.audible.com/1.0/catalog/{asin}

        audiobook = AudibleAudiobook(
            asin=asin,
            title="Audible Audiobook",
            author="Author Name",
            narrator="Narrator Name",
            image="https://example.audible.com/image.jpg",
            description="Detailed description",
            duration_minutes=500,
            rating=4.4,
            is_owned=False,
        )

        return audiobook

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


# Global service instance
audible_service = AudibleService()
