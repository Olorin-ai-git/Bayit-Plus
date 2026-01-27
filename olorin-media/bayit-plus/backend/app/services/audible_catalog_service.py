"""Audible catalog search service.

Handles catalog searching and fetching audiobook details.
"""

from typing import List, Optional

import httpx

from app.core.logging_config import get_logger
from app.services.audible_library_service import AudibleAudiobook

logger = get_logger(__name__)


class AudibleCatalogService:
    """Handles Audible catalog search and details operations."""

    def __init__(self, http_client: httpx.AsyncClient, base_url: str):
        """Initialize catalog service with HTTP client.

        Args:
            http_client: Configured httpx AsyncClient
            base_url: Audible API base URL
        """
        self.http_client = http_client
        self.base_url = base_url

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
            Exception: If search fails
        """
        logger.info("Searching Audible catalog", extra={"query": query, "limit": limit})

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

    async def get_audiobook_details(self, asin: str) -> Optional[AudibleAudiobook]:
        """Get detailed information about a specific Audible audiobook.

        Args:
            asin: Audible's unique identifier

        Returns:
            Detailed audiobook information or None if not found

        Raises:
            Exception: If detail fetch fails
        """
        logger.debug("Fetching Audible audiobook details", extra={"asin": asin})

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
