"""Audible library management service.

Handles fetching and syncing user's Audible library.
"""

from typing import List

import httpx
from pydantic import BaseModel

from app.core.logging_config import get_logger
from app.services.audible_token_crypto import audible_token_crypto

logger = get_logger(__name__)


class AudibleAudiobook(BaseModel):
    """Audible audiobook data from API"""

    asin: str
    title: str
    author: str
    narrator: str | None = None
    image: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    rating: float | None = None
    is_owned: bool = False


class AudibleLibraryService:
    """Handles Audible library fetching and syncing operations."""

    def __init__(self, http_client: httpx.AsyncClient, base_url: str):
        """Initialize library service with HTTP client.

        Args:
            http_client: Configured httpx AsyncClient
            base_url: Audible API base URL
        """
        self.http_client = http_client
        self.base_url = base_url

    async def get_user_library(
        self,
        access_token: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AudibleAudiobook]:
        """Fetch user's Audible library (audiobooks they own).

        Args:
            access_token: Audible OAuth access token (encrypted)
            limit: Number of items to fetch (max 100)
            offset: Pagination offset

        Returns:
            List of audiobooks in user's library

        Raises:
            Exception: If library fetch fails
        """
        # Decrypt token for use
        decrypted_token = audible_token_crypto.decrypt_token(access_token)

        logger.debug("Fetching Audible user library", extra={"limit": limit, "offset": offset})

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
