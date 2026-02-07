"""National Archives (NARA) API client for public domain documentary content."""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

from .base_client import BaseDocSourceClient

logger = logging.getLogger(__name__)


class NARAClient(BaseDocSourceClient):
    """Client for National Archives Catalog API."""

    def __init__(self):
        super().__init__("nara")

    @property
    def _base_url(self) -> str:
        return settings.NARA_API_BASE_URL

    async def search(
        self, query: str, page: int = 1, page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search NARA catalog for moving image content."""
        offset = (page - 1) * page_size
        url = self._base_url
        params = {
            "q": query,
            "resultTypes": "item",
            "type": "MovingImage",
            "rows": page_size,
            "offset": offset,
        }

        response = await self._request_with_resilience("GET", url, params=params)
        if response.status_code != 200:
            logger.warning(
                "NARA search returned non-200",
                extra={"status": response.status_code},
            )
            return []

        data = response.json()
        results_data = data.get("opaResponse", {}).get("results", {})
        result_list = results_data.get("result", [])

        results = []
        for item in result_list:
            desc = item.get("description", {}).get("item", {})
            nara_id = str(desc.get("naId", ""))

            title = desc.get("title", "")
            description_text = ""
            scope_content = desc.get("scopeAndContentNote")
            if scope_content:
                description_text = scope_content

            production_date = desc.get("productionDate", [])
            year = None
            if production_date:
                date_item = production_date[0] if isinstance(production_date, list) else production_date
                year_str = date_item.get("year") if isinstance(date_item, dict) else None
                if year_str:
                    try:
                        year = int(year_str)
                    except (ValueError, TypeError):
                        pass

            record_group = ""
            parent_series = desc.get("parentSeries", {})
            if isinstance(parent_series, dict):
                record_group = str(parent_series.get("recordGroupNumber", ""))

            results.append({
                "source_id": nara_id,
                "title": title,
                "description": description_text,
                "year": year,
                "record_group": record_group,
                "keywords": [],
            })

        return results

    async def get_item_detail(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed metadata for a NARA item."""
        url = f"{self._base_url}/{source_id}"

        response = await self._request_with_resilience("GET", url)
        if response.status_code != 200:
            return None

        data = response.json()
        result = data.get("opaResponse", {}).get("result", {})
        desc = result.get("description", {}).get("item", {})

        return {
            "source_id": str(desc.get("naId", source_id)),
            "title": desc.get("title", ""),
            "description": desc.get("scopeAndContentNote", ""),
            "record_group": str(
                desc.get("parentSeries", {}).get("recordGroupNumber", "")
            ) if isinstance(desc.get("parentSeries"), dict) else "",
            "credit": desc.get("creatingOrganization", {}).get("name", "")
            if isinstance(desc.get("creatingOrganization"), dict) else "",
        }

    async def get_video_url(self, source_id: str) -> Optional[str]:
        """Get video URL from NARA item objects."""
        url = f"{self._base_url}/{source_id}"

        response = await self._request_with_resilience("GET", url)
        if response.status_code != 200:
            return None

        data = response.json()
        result = data.get("opaResponse", {}).get("result", {})
        objects = result.get("objects", {}).get("object", [])

        if not isinstance(objects, list):
            objects = [objects]

        for obj in objects:
            file_info = obj.get("file", {})
            if isinstance(file_info, dict):
                mime = file_info.get("@mime", "")
                file_url = file_info.get("@url", "")
                if "video" in mime and file_url:
                    return file_url

        return None

    async def get_thumbnail_url(self, source_id: str) -> Optional[str]:
        """Get thumbnail URL from NARA item objects."""
        url = f"{self._base_url}/{source_id}"

        response = await self._request_with_resilience("GET", url)
        if response.status_code != 200:
            return None

        data = response.json()
        result = data.get("opaResponse", {}).get("result", {})
        thumbnail = result.get("thumbnailUrl")

        if thumbnail:
            return thumbnail

        objects = result.get("objects", {}).get("object", [])
        if not isinstance(objects, list):
            objects = [objects]

        for obj in objects:
            file_info = obj.get("file", {})
            if isinstance(file_info, dict):
                mime = file_info.get("@mime", "")
                file_url = file_info.get("@url", "")
                if "image" in mime and file_url:
                    return file_url

        return None
