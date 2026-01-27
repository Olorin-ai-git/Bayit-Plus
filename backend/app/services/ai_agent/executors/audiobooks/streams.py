"""
AI Agent Executors - Audiobook Stream Verification

Functions for verifying audiobook stream URLs.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from bson import ObjectId

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run, log_librarian_action

logger = logging.getLogger(__name__)


async def verify_stream_url(stream_url: str) -> dict[str, Any]:
    """Verify that an audio stream URL is accessible and valid."""
    result = {"accessible": False, "content_type": None, "size": None, "issues": []}

    if not stream_url:
        result["issues"].append("No stream URL")
        return result

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.head(stream_url, timeout=10.0)

            if response.status_code == 200:
                result["accessible"] = True
                result["content_type"] = response.headers.get("content-type")
                result["size"] = response.headers.get("content-length")

                valid_types = [
                    "audio/",
                    "application/octet-stream",
                    "binary/octet-stream",
                ]
                content_type = result["content_type"] or ""
                if not any(vt in content_type.lower() for vt in valid_types):
                    result["issues"].append(
                        f"Unexpected content type: {content_type}"
                    )
            elif response.status_code == 403:
                result["issues"].append("Stream URL returns 403 Forbidden")
            elif response.status_code == 404:
                result["issues"].append("Stream URL returns 404 Not Found")
            else:
                result["issues"].append(
                    f"Stream URL returns HTTP {response.status_code}"
                )

    except httpx.TimeoutException:
        result["issues"].append("Stream URL timeout")
    except httpx.ConnectError:
        result["issues"].append("Stream URL connection failed")
    except Exception as e:
        result["issues"].append(f"Stream verification error: {str(e)}")

    return result


async def execute_verify_audiobook_streams(
    audiobook_id: Optional[str] = None,
    limit: int = 100,
) -> dict[str, Any]:
    """Verify that audiobook stream URLs are accessible and valid."""
    try:
        if audiobook_id:
            audiobook = await Content.get(ObjectId(audiobook_id))
            if not audiobook:
                return {"success": False, "error": f"Audiobook not found: {audiobook_id}"}

            stream_result = await verify_stream_url(audiobook.stream_url or "")

            return {
                "success": True,
                "audiobook_id": audiobook_id,
                "title": audiobook.title,
                "stream_url": audiobook.stream_url,
                **stream_result,
            }

        # Scan all audiobooks
        audiobooks = await Content.find({
            "content_format": "audiobook",
            "stream_url": {"$nin": ["", None]},
        }).limit(limit).to_list()

        verified = []
        broken = []

        for audiobook in audiobooks:
            stream_result = await verify_stream_url(audiobook.stream_url or "")

            entry = {
                "id": str(audiobook.id),
                "title": audiobook.title,
                "stream_url": audiobook.stream_url,
                **stream_result,
            }

            if stream_result["accessible"]:
                verified.append(entry)
            else:
                broken.append(entry)

        return {
            "success": True,
            "total_verified": len(verified),
            "total_broken": len(broken),
            "verified": verified[:10],  # Limit for response size
            "broken": broken,
        }

    except Exception as e:
        logger.error(f"Error verifying audiobook streams: {e}")
        return {"success": False, "error": str(e)}


async def execute_sync_audiobook_posters(
    parent_id: Optional[str] = None,
    *,
    audit_id: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Synchronize parent audiobook poster to all linked parts."""
    dry_run_result = handle_dry_run(dry_run, "sync audiobook posters")
    if dry_run_result:
        return dry_run_result

    try:
        if parent_id:
            # Process single parent
            parent = await Content.get(ObjectId(parent_id))
            if not parent:
                return {"success": False, "error": f"Parent audiobook not found: {parent_id}"}

            if not parent.thumbnail and not parent.poster_url:
                return {
                    "success": False,
                    "error": "Parent audiobook has no poster to sync",
                }

            # Find all parts
            parts = await Content.find({
                "content_format": "audiobook",
                "series_id": parent_id,
            }).to_list()

            if not parts:
                return {
                    "success": True,
                    "message": "No parts found for this parent",
                    "parent_id": parent_id,
                }

            updated = 0
            poster = parent.thumbnail or parent.poster_url

            for part in parts:
                if part.thumbnail != poster or part.poster_url != poster:
                    await part.set({
                        "thumbnail": poster,
                        "poster_url": poster,
                        "updated_at": datetime.now(timezone.utc),
                    })
                    updated += 1

            await log_librarian_action(
                audit_id=audit_id,
                action_type="sync_audiobook_posters",
                content_id=parent_id,
                description="Synced poster to audiobook parts",
                issue_type="missing_poster",
                after_state={"parts_updated": updated},
            )

            return {
                "success": True,
                "parent_id": parent_id,
                "parent_title": parent.title,
                "parts_updated": updated,
                "total_parts": len(parts),
            }

        # Process all parent audiobooks
        parents = await Content.find({
            "content_format": "audiobook",
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
            ],
            "$and": [
                {"$or": [
                    {"thumbnail": {"$ne": None}},
                    {"poster_url": {"$ne": None}},
                ]}
            ],
        }).to_list()

        total_updated = 0
        results = []

        for parent in parents:
            poster = parent.thumbnail or parent.poster_url
            if not poster:
                continue

            parts = await Content.find({
                "content_format": "audiobook",
                "series_id": str(parent.id),
            }).to_list()

            updated = 0
            for part in parts:
                if part.thumbnail != poster or part.poster_url != poster:
                    await part.set({
                        "thumbnail": poster,
                        "poster_url": poster,
                        "updated_at": datetime.now(timezone.utc),
                    })
                    updated += 1
                    total_updated += 1

            if updated > 0:
                results.append({
                    "parent_id": str(parent.id),
                    "parent_title": parent.title,
                    "parts_updated": updated,
                })

        return {
            "success": True,
            "parents_processed": len(parents),
            "total_parts_updated": total_updated,
            "results": results,
        }

    except Exception as e:
        logger.error(f"Error syncing audiobook posters: {e}")
        return {"success": False, "error": str(e)}
