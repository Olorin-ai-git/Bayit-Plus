"""Orchestrator service for public domain documentary content imports."""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

from .base_client import BaseDocSourceClient
from .curated_lists import CuratedItem, get_curated_items
from .dedup_service import DocumentaryDeduplicationService
from .dvids_client import DVIDSClient
from .item_builder import build_and_insert_content
from .nara_client import NARAClient
from .nasa_client import NASAClient
from .sync_tracker import update_sync_state

logger = logging.getLogger(__name__)


class PublicDomainDocImporter:
    """Orchestrates importing public domain documentaries from multiple sources."""

    def __init__(self):
        self._clients: Dict[str, BaseDocSourceClient] = {}
        self._dedup = DocumentaryDeduplicationService()

    def _get_client(self, source: str) -> Optional[BaseDocSourceClient]:
        """Get or create API client for a source."""
        if source in self._clients:
            return self._clients[source]

        client: Optional[BaseDocSourceClient] = None
        if source == "nasa" and settings.NASA_IMPORT_ENABLED:
            client = NASAClient()
        elif source == "dvids" and settings.DVIDS_IMPORT_ENABLED:
            client = DVIDSClient()
        elif source == "nara" and settings.NARA_IMPORT_ENABLED:
            client = NARAClient()

        if client:
            self._clients[source] = client
        return client

    async def close(self) -> None:
        """Close all API clients."""
        for client in self._clients.values():
            await client.close()
        self._clients.clear()

    async def import_curated(
        self,
        source: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Import curated documentary items."""
        curated = get_curated_items(source)
        total_imported = 0
        total_skipped = 0
        all_errors: List[str] = []

        for src, items in curated.items():
            result = await self._import_items_for_source(src, items, dry_run)
            total_imported += result["imported_count"]
            total_skipped += result["skipped_count"]
            all_errors.extend(result["errors"])

        return {
            "imported_count": total_imported,
            "skipped_count": total_skipped,
            "error_count": len(all_errors),
            "errors": all_errors[:50],
            "dry_run": dry_run,
        }

    async def _import_items_for_source(
        self,
        source: str,
        items: List[CuratedItem],
        dry_run: bool,
    ) -> Dict[str, Any]:
        """Import a list of curated items from a specific source."""
        client = self._get_client(source)
        if not client:
            return {
                "imported_count": 0,
                "skipped_count": len(items),
                "errors": [f"Source '{source}' is disabled or not configured"],
            }

        imported = 0
        skipped = 0
        errors: List[str] = []

        for item in items:
            try:
                result = await self._import_single_item(client, source, item, dry_run)
                if result == "imported":
                    imported += 1
                elif result == "skipped":
                    skipped += 1
            except Exception as exc:
                errors.append(f"{item.title}: {str(exc)[:200]}")
                logger.error(
                    "Failed to import curated item",
                    extra={"source": source, "source_id": item.source_id, "error": str(exc)},
                )

        if not dry_run and imported > 0:
            await update_sync_state(
                source=source,
                items_synced=imported,
                sync_result={"curated_imported": imported, "skipped": skipped},
            )

        return {"imported_count": imported, "skipped_count": skipped, "errors": errors}

    async def _import_single_item(
        self,
        client: BaseDocSourceClient,
        source: str,
        item: CuratedItem,
        dry_run: bool,
    ) -> str:
        """Import a single documentary item. Returns 'imported' or 'skipped'."""
        if await self._dedup.is_duplicate(
            source_provider=source,
            source_id=item.source_id,
            title=item.title,
            year=item.year,
        ):
            return "skipped"

        if dry_run:
            return "imported"

        content = await build_and_insert_content(
            client=client,
            source=source,
            source_id=item.source_id,
            title=item.title,
            year=item.year,
            topic_tags=item.topic_tags if item.topic_tags else None,
        )
        return "imported" if content else "skipped"

    async def import_specific(
        self,
        source: str,
        source_ids: List[str],
    ) -> Dict[str, Any]:
        """Import specific items by source ID."""
        items = [CuratedItem(source_id=sid, title=sid) for sid in source_ids]
        return await self._import_items_for_source(source, items, dry_run=False)

    async def search_source(
        self,
        source: str,
        query: str,
        page: int = 1,
        page_size: int = 20,
    ) -> List[Dict[str, Any]]:
        """Search a source for documentary content (preview, no import)."""
        client = self._get_client(source)
        if not client:
            return []

        return await client.search(query, page, page_size)
