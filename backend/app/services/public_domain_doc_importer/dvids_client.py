"""DVIDS (Defense Visual Information Distribution Service) API client."""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

from .base_client import BaseDocSourceClient

logger = logging.getLogger(__name__)


class DVIDSClient(BaseDocSourceClient):
    """Client for DVIDS API - U.S. military public domain content."""

    def __init__(self):
        super().__init__("dvids")

    @property
    def _base_url(self) -> str:
        return settings.DVIDS_API_BASE_URL

    @property
    def _api_key(self) -> str:
        return settings.DVIDS_API_KEY

    def _is_configured(self) -> bool:
        """Check if DVIDS API key is configured."""
        return bool(self._api_key)

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with API key."""
        return {"api_key": self._api_key}

    async def search(
        self, query: str, page: int = 1, page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search DVIDS video content."""
        if not self._is_configured():
            logger.info("DVIDS API key not configured, skipping search")
            return []

        offset = (page - 1) * page_size
        url = f"{self._base_url}/search"
        params = {
            "q": query,
            "type": "video",
            "max_results": page_size,
            "offset": offset,
        }

        response = await self._request_with_resilience(
            "GET", url, params=params, headers=self._get_headers()
        )
        if response.status_code != 200:
            logger.warning(
                "DVIDS search returned non-200",
                extra={"status": response.status_code},
            )
            return []

        data = response.json()
        results_list = data.get("results", [])

        results = []
        for item in results_list:
            results.append({
                "source_id": str(item.get("id", "")),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "date_published": item.get("date_published", ""),
                "branch": item.get("branch", ""),
                "keywords": item.get("keywords", "").split(",") if item.get("keywords") else [],
                "thumbnail_url": item.get("thumbnail", ""),
                "duration_seconds": item.get("duration"),
            })

        return results

    async def get_item_detail(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed metadata for a DVIDS item."""
        if not self._is_configured():
            return None

        url = f"{self._base_url}/video/{source_id}"

        response = await self._request_with_resilience(
            "GET", url, headers=self._get_headers()
        )
        if response.status_code != 200:
            return None

        item = response.json()

        return {
            "source_id": str(item.get("id", "")),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "date_published": item.get("date_published", ""),
            "branch": item.get("branch", ""),
            "credit": item.get("credit", ""),
            "keywords": item.get("keywords", "").split(",") if item.get("keywords") else [],
            "thumbnail_url": item.get("thumbnail", ""),
            "duration_seconds": item.get("duration"),
            "has_captions": bool(item.get("captions")),
        }

    async def get_video_url(self, source_id: str) -> Optional[str]:
        """Get video URL for a DVIDS item."""
        detail = await self.get_item_detail(source_id)
        if not detail:
            return None

        return f"https://cdn.dvidshub.net/media/video/{source_id}/{source_id}.mp4"

    async def get_thumbnail_url(self, source_id: str) -> Optional[str]:
        """Get thumbnail URL for a DVIDS item."""
        detail = await self.get_item_detail(source_id)
        if detail:
            return detail.get("thumbnail_url")
        return None
