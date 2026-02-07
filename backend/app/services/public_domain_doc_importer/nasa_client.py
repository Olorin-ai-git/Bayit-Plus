"""NASA Images API client for public domain documentary content."""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

from .base_client import BaseDocSourceClient

logger = logging.getLogger(__name__)


class NASAClient(BaseDocSourceClient):
    """Client for NASA Image and Video Library API."""

    def __init__(self):
        super().__init__("nasa")

    @property
    def _base_url(self) -> str:
        return settings.NASA_API_BASE_URL

    async def search(
        self, query: str, page: int = 1, page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search NASA video library."""
        url = f"{self._base_url}/search"
        params = {
            "q": query,
            "media_type": "video",
            "page": page,
            "page_size": page_size,
        }

        response = await self._request_with_resilience("GET", url, params=params)
        if response.status_code != 200:
            logger.warning(
                "NASA search returned non-200",
                extra={"status": response.status_code},
            )
            return []

        data = response.json()
        items = data.get("collection", {}).get("items", [])

        results = []
        for item in items:
            item_data = item.get("data", [{}])[0] if item.get("data") else {}
            links = item.get("links", [])
            thumbnail = next(
                (link["href"] for link in links if link.get("rel") == "preview"),
                None,
            )

            results.append({
                "source_id": item_data.get("nasa_id", ""),
                "title": item_data.get("title", ""),
                "description": item_data.get("description", ""),
                "date_created": item_data.get("date_created", ""),
                "center": item_data.get("center", ""),
                "keywords": item_data.get("keywords", []),
                "thumbnail_url": thumbnail,
            })

        return results

    async def get_item_detail(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed metadata for a NASA item."""
        url = f"{self._base_url}/search"
        params = {"nasa_id": source_id}

        response = await self._request_with_resilience("GET", url, params=params)
        if response.status_code != 200:
            return None

        data = response.json()
        items = data.get("collection", {}).get("items", [])
        if not items:
            return None

        item = items[0]
        item_data = item.get("data", [{}])[0] if item.get("data") else {}
        links = item.get("links", [])
        thumbnail = next(
            (link["href"] for link in links if link.get("rel") == "preview"),
            None,
        )

        return {
            "source_id": item_data.get("nasa_id", ""),
            "title": item_data.get("title", ""),
            "description": item_data.get("description", ""),
            "date_created": item_data.get("date_created", ""),
            "center": item_data.get("center", ""),
            "keywords": item_data.get("keywords", []),
            "thumbnail_url": thumbnail,
        }

    async def get_video_url(self, source_id: str) -> Optional[str]:
        """Get highest quality MP4 URL for a NASA video asset."""
        url = f"{self._base_url}/asset/{source_id}"

        response = await self._request_with_resilience("GET", url)
        if response.status_code != 200:
            return None

        data = response.json()
        items = data.get("collection", {}).get("items", [])

        mp4_urls = [
            item["href"]
            for item in items
            if item.get("href", "").endswith(".mp4")
        ]

        if not mp4_urls:
            return None

        # Prefer highest quality: "orig" > "large" > "medium" > first
        selected = mp4_urls[0]
        for quality in ["~orig.mp4", "~large.mp4", "~medium.mp4"]:
            for mp4_url in mp4_urls:
                if quality in mp4_url:
                    selected = mp4_url
                    break
            else:
                continue
            break

        # NASA asset API returns http:// URLs; upgrade to https://
        if selected.startswith("http://"):
            selected = "https://" + selected[len("http://"):]
        return selected

    async def get_thumbnail_url(self, source_id: str) -> Optional[str]:
        """Get thumbnail URL from search result links."""
        detail = await self.get_item_detail(source_id)
        if not detail:
            return None
        thumb = detail.get("thumbnail_url")
        if thumb and thumb.startswith("http://"):
            thumb = "https://" + thumb[len("http://"):]
        return thumb

    async def get_captions_url(self, source_id: str) -> Optional[str]:
        """Get captions/subtitles URL if available."""
        url = f"{self._base_url}/captions/{source_id}"

        try:
            response = await self._request_with_resilience("GET", url)
            if response.status_code == 200:
                return url
        except Exception:
            pass

        return None
