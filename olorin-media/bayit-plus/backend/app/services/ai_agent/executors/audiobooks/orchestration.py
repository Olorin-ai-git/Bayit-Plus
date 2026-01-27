"""
AI Agent Executors - Audiobook Orchestration

High-level workflow functions that orchestrate multiple audiobook operations.
"""

import logging
from typing import Any, Optional

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run

from .discovery import execute_find_multi_part_audiobooks
from .metadata import (fetch_google_books_metadata, fetch_open_library_metadata)
from .streams import execute_verify_audiobook_streams, execute_sync_audiobook_posters
from .unification import execute_unify_multi_part_audiobooks

logger = logging.getLogger(__name__)


async def execute_organize_all_audiobooks(
    limit: Optional[int] = None,
    fetch_metadata: bool = True,
    verify_streams: bool = True,
    *,
    audit_id: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Comprehensive audiobook organization workflow.

    This orchestrates:
    1. Find multi-part audiobooks and group them
    2. Unify multi-part audiobooks into parent entries
    3. Fetch and apply metadata/posters from Google Books / Open Library
    4. Verify stream URLs are accessible
    5. Sync posters from parents to parts
    """
    dry_run_result = handle_dry_run(dry_run, "organize all audiobooks")
    if dry_run_result:
        return dry_run_result

    results = {
        "success": True,
        "multi_part_groups_found": 0,
        "parents_created": 0,
        "parts_linked": 0,
        "metadata_enriched": 0,
        "posters_synced": 0,
        "streams_verified": 0,
        "streams_broken": 0,
        "errors": [],
    }

    try:
        # Step 1: Find multi-part audiobooks
        logger.info("Step 1: Finding multi-part audiobooks...")
        find_result = await execute_find_multi_part_audiobooks(limit=limit or 1000)

        if find_result.get("success"):
            results["multi_part_groups_found"] = find_result.get("multi_part_groups", 0)
            logger.info(f"Found {results['multi_part_groups_found']} multi-part groups")
        else:
            results["errors"].append(f"Find multi-part failed: {find_result.get('error')}")

        # Step 2: Unify multi-part audiobooks
        logger.info("Step 2: Unifying multi-part audiobooks...")
        unify_result = await execute_unify_multi_part_audiobooks(
            fetch_metadata=fetch_metadata,
            audit_id=audit_id,
            dry_run=False,
        )

        if unify_result.get("success"):
            results["parents_created"] = unify_result.get("parents_created", 0)
            results["parts_linked"] = unify_result.get("parts_linked", 0)
            logger.info(
                f"Created {results['parents_created']} parents, "
                f"linked {results['parts_linked']} parts"
            )
        else:
            results["errors"].append(f"Unify failed: {unify_result.get('error')}")

        # Step 3: Enrich metadata for audiobooks missing posters
        if fetch_metadata:
            logger.info("Step 3: Enriching audiobook metadata...")
            audiobooks = await Content.find({
                "content_format": "audiobook",
                "$or": [
                    {"thumbnail": None},
                    {"thumbnail": ""},
                    {"thumbnail": {"$exists": False}},
                ],
            }).limit(limit or 100).to_list()

            enriched = 0
            for audiobook in audiobooks:
                title = audiobook.title or ""
                author = audiobook.author

                # Try Google Books
                metadata = await fetch_google_books_metadata(title, author)

                # Fallback to Open Library
                if not metadata or not metadata.get("thumbnail"):
                    ol_metadata = await fetch_open_library_metadata(title, author)
                    if ol_metadata:
                        if not metadata:
                            metadata = ol_metadata
                        elif not metadata.get("thumbnail"):
                            metadata["thumbnail"] = ol_metadata.get("thumbnail")

                if metadata and metadata.get("thumbnail"):
                    updates = {"thumbnail": metadata["thumbnail"]}
                    if not audiobook.poster_url:
                        updates["poster_url"] = metadata["thumbnail"]
                    if not audiobook.description and metadata.get("description"):
                        updates["description"] = metadata["description"]
                    if not audiobook.year and metadata.get("year"):
                        updates["year"] = metadata["year"]

                    await audiobook.set(updates)
                    enriched += 1

            results["metadata_enriched"] = enriched
            logger.info(f"Enriched metadata for {enriched} audiobooks")

        # Step 4: Verify streams
        if verify_streams:
            logger.info("Step 4: Verifying audiobook streams...")
            verify_result = await execute_verify_audiobook_streams(limit=limit or 100)

            if verify_result.get("success"):
                results["streams_verified"] = verify_result.get("total_verified", 0)
                results["streams_broken"] = verify_result.get("total_broken", 0)
                logger.info(
                    f"Verified {results['streams_verified']} streams, "
                    f"{results['streams_broken']} broken"
                )
            else:
                results["errors"].append(f"Stream verify failed: {verify_result.get('error')}")

        # Step 5: Sync posters from parents to parts
        logger.info("Step 5: Syncing posters to audiobook parts...")
        sync_result = await execute_sync_audiobook_posters(
            audit_id=audit_id,
            dry_run=False,
        )

        if sync_result.get("success"):
            results["posters_synced"] = sync_result.get("total_parts_updated", 0)
            logger.info(f"Synced posters to {results['posters_synced']} parts")
        else:
            results["errors"].append(f"Poster sync failed: {sync_result.get('error')}")

        # Set overall success
        results["success"] = len(results["errors"]) == 0

        return results

    except Exception as e:
        logger.error(f"Error organizing all audiobooks: {e}")
        return {"success": False, "error": str(e)}
