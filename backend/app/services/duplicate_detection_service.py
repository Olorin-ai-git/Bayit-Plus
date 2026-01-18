"""
Duplicate Detection Service

Comprehensive duplicate detection system for the content library.
Identifies duplicates based on:
- File hash (exact duplicates)
- Title + year similarity
- TMDB/IMDB ID matches
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict
import re
from difflib import SequenceMatcher

from beanie import PydanticObjectId
from app.models.content import Content
from app.core.config import settings

logger = logging.getLogger(__name__)


class DuplicateDetectionService:
    """Service for detecting and managing duplicate content in the library"""

    def __init__(self):
        # Similarity threshold for title matching (0.0 to 1.0)
        self.title_similarity_threshold = 0.85
        # Minimum title length to consider for fuzzy matching
        self.min_title_length = 3

    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison by removing common variations"""
        if not title:
            return ""

        # Convert to lowercase
        normalized = title.lower()

        # Remove common file extensions and quality markers
        patterns_to_remove = [
            r'\.(mp4|mkv|avi|mov|wmv|flv|webm)$',
            r'\b(1080p|720p|480p|2160p|4k|hd|uhd)\b',
            r'\b(bluray|bdrip|dvdrip|webrip|hdtv|web-dl)\b',
            r'\b(x264|x265|hevc|aac|ac3|dts)\b',
            r'\[.*?\]',  # Remove bracket content like [YTS.MX]
            r'\(.*?\)',  # Remove parenthetical content
            r'[-_.]',    # Replace separators with spaces
        ]

        for pattern in patterns_to_remove:
            normalized = re.sub(pattern, ' ', normalized, flags=re.IGNORECASE)

        # Collapse multiple spaces and strip
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """Calculate similarity between two titles using SequenceMatcher"""
        norm1 = self._normalize_title(title1)
        norm2 = self._normalize_title(title2)

        if not norm1 or not norm2:
            return 0.0

        return SequenceMatcher(None, norm1, norm2).ratio()

    async def find_hash_duplicates(self) -> List[Dict[str, Any]]:
        """
        Find exact duplicates based on file hash.
        Returns groups of content items with the same hash.
        """
        logger.info("Scanning for hash-based duplicates...")

        # Aggregation pipeline to find duplicate hashes
        pipeline = [
            # Match only items with file_hash
            {"$match": {"file_hash": {"$ne": None, "$exists": True}}},
            # Group by file_hash
            {"$group": {
                "_id": "$file_hash",
                "count": {"$sum": 1},
                "items": {"$push": {
                    "id": {"$toString": "$_id"},
                    "title": "$title",
                    "title_en": "$title_en",
                    "created_at": "$created_at",
                    "file_size": "$file_size",
                    "is_published": "$is_published"
                }}
            }},
            # Filter to only groups with duplicates
            {"$match": {"count": {"$gt": 1}}},
            # Sort by count descending
            {"$sort": {"count": -1}}
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append({
                "file_hash": group["_id"],
                "count": group["count"],
                "items": group["items"],
                "duplicate_type": "exact_hash"
            })

        logger.info(f"Found {len(duplicates)} groups of hash duplicates")
        return duplicates

    async def find_tmdb_duplicates(self) -> List[Dict[str, Any]]:
        """
        Find duplicates based on TMDB ID.
        Multiple entries with the same TMDB ID are duplicates.
        """
        logger.info("Scanning for TMDB ID duplicates...")

        pipeline = [
            {"$match": {"tmdb_id": {"$ne": None, "$exists": True}}},
            {"$group": {
                "_id": "$tmdb_id",
                "count": {"$sum": 1},
                "items": {"$push": {
                    "id": {"$toString": "$_id"},
                    "title": "$title",
                    "title_en": "$title_en",
                    "created_at": "$created_at",
                    "is_published": "$is_published"
                }}
            }},
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}}
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append({
                "tmdb_id": group["_id"],
                "count": group["count"],
                "items": group["items"],
                "duplicate_type": "tmdb_id"
            })

        logger.info(f"Found {len(duplicates)} groups of TMDB duplicates")
        return duplicates

    async def find_imdb_duplicates(self) -> List[Dict[str, Any]]:
        """
        Find duplicates based on IMDB ID.
        """
        logger.info("Scanning for IMDB ID duplicates...")

        pipeline = [
            {"$match": {"imdb_id": {"$ne": None, "$exists": True}}},
            {"$group": {
                "_id": "$imdb_id",
                "count": {"$sum": 1},
                "items": {"$push": {
                    "id": {"$toString": "$_id"},
                    "title": "$title",
                    "title_en": "$title_en",
                    "created_at": "$created_at",
                    "is_published": "$is_published"
                }}
            }},
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}}
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append({
                "imdb_id": group["_id"],
                "count": group["count"],
                "items": group["items"],
                "duplicate_type": "imdb_id"
            })

        logger.info(f"Found {len(duplicates)} groups of IMDB duplicates")
        return duplicates

    async def find_title_duplicates(
        self,
        check_year: bool = True,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Find potential duplicates based on title similarity.
        This is more computationally expensive as it requires comparing titles.
        """
        logger.info("Scanning for title-based duplicates...")

        # Get all content with titles
        items = await Content.find(
            {"title": {"$ne": None, "$exists": True}}
        ).to_list()

        # Group by normalized title (and optionally year)
        title_groups: Dict[str, List[Content]] = defaultdict(list)

        for item in items:
            norm_title = self._normalize_title(item.title)
            if len(norm_title) < self.min_title_length:
                continue

            # Create key with optional year
            if check_year and item.year:
                key = f"{norm_title}|{item.year}"
            else:
                key = norm_title

            title_groups[key].append(item)

        # Find groups with duplicates
        duplicates = []
        for key, group in title_groups.items():
            if len(group) > 1:
                duplicates.append({
                    "normalized_key": key,
                    "count": len(group),
                    "items": [
                        {
                            "id": str(item.id),
                            "title": item.title,
                            "title_en": item.title_en,
                            "year": item.year,
                            "created_at": item.created_at,
                            "is_published": item.is_published
                        }
                        for item in group
                    ],
                    "duplicate_type": "title_match"
                })

        # Sort by count and limit
        duplicates.sort(key=lambda x: x["count"], reverse=True)
        duplicates = duplicates[:limit]

        logger.info(f"Found {len(duplicates)} groups of title duplicates")
        return duplicates

    async def find_all_duplicates(self) -> Dict[str, Any]:
        """
        Run all duplicate detection methods and return comprehensive results.
        """
        logger.info("Running comprehensive duplicate detection...")

        hash_duplicates = await self.find_hash_duplicates()
        tmdb_duplicates = await self.find_tmdb_duplicates()
        imdb_duplicates = await self.find_imdb_duplicates()
        title_duplicates = await self.find_title_duplicates()

        # Calculate totals
        total_duplicate_groups = (
            len(hash_duplicates) +
            len(tmdb_duplicates) +
            len(imdb_duplicates) +
            len(title_duplicates)
        )

        total_duplicate_items = sum(
            d["count"] - 1  # Subtract 1 because one item is the "original"
            for d in hash_duplicates + tmdb_duplicates + imdb_duplicates + title_duplicates
        )

        return {
            "summary": {
                "total_duplicate_groups": total_duplicate_groups,
                "total_duplicate_items": total_duplicate_items,
                "hash_duplicate_groups": len(hash_duplicates),
                "tmdb_duplicate_groups": len(tmdb_duplicates),
                "imdb_duplicate_groups": len(imdb_duplicates),
                "title_duplicate_groups": len(title_duplicates),
                "scanned_at": datetime.utcnow().isoformat()
            },
            "hash_duplicates": hash_duplicates,
            "tmdb_duplicates": tmdb_duplicates,
            "imdb_duplicates": imdb_duplicates,
            "title_duplicates": title_duplicates
        }

    async def resolve_duplicate_group(
        self,
        content_ids: List[str],
        keep_id: str,
        action: str = "unpublish"
    ) -> Dict[str, Any]:
        """
        Resolve a duplicate group by keeping one item and handling the rest.

        Args:
            content_ids: List of all content IDs in the duplicate group
            keep_id: ID of the content item to keep
            action: What to do with duplicates - "unpublish", "delete", or "flag"

        Returns:
            Summary of actions taken
        """
        if keep_id not in content_ids:
            raise ValueError(f"keep_id {keep_id} not in content_ids list")

        if action not in ["unpublish", "delete", "flag"]:
            raise ValueError(f"Invalid action: {action}. Must be 'unpublish', 'delete', or 'flag'")

        duplicate_ids = [cid for cid in content_ids if cid != keep_id]
        processed = []
        errors = []

        for dup_id in duplicate_ids:
            try:
                content = await Content.get(PydanticObjectId(dup_id))
                if not content:
                    errors.append({"id": dup_id, "error": "Content not found"})
                    continue

                if action == "unpublish":
                    content.is_published = False
                    content.updated_at = datetime.utcnow()
                    await content.save()
                    processed.append({
                        "id": dup_id,
                        "title": content.title,
                        "action": "unpublished"
                    })

                elif action == "delete":
                    await content.delete()
                    processed.append({
                        "id": dup_id,
                        "title": content.title,
                        "action": "deleted"
                    })

                elif action == "flag":
                    # Add a flag to the content for manual review
                    if not hasattr(content, 'flags') or content.flags is None:
                        content.flags = []
                    content.flags.append({
                        "type": "duplicate",
                        "original_id": keep_id,
                        "flagged_at": datetime.utcnow().isoformat()
                    })
                    content.updated_at = datetime.utcnow()
                    await content.save()
                    processed.append({
                        "id": dup_id,
                        "title": content.title,
                        "action": "flagged"
                    })

            except Exception as e:
                errors.append({"id": dup_id, "error": str(e)})

        return {
            "success": len(errors) == 0,
            "kept": keep_id,
            "processed": processed,
            "errors": errors,
            "total_resolved": len(processed)
        }

    async def auto_resolve_exact_duplicates(
        self,
        dry_run: bool = True,
        action: str = "unpublish"
    ) -> Dict[str, Any]:
        """
        Automatically resolve exact hash duplicates by keeping the oldest item.

        Args:
            dry_run: If True, only report what would be done
            action: Action to take on duplicates

        Returns:
            Summary of actions taken or planned
        """
        hash_duplicates = await self.find_hash_duplicates()

        results = {
            "dry_run": dry_run,
            "action": action,
            "groups_processed": 0,
            "items_to_process": 0,
            "items_processed": 0,
            "errors": [],
            "details": []
        }

        for group in hash_duplicates:
            # Sort by created_at to keep the oldest
            items = sorted(
                group["items"],
                key=lambda x: x.get("created_at") or datetime.min
            )

            keep_item = items[0]
            duplicate_items = items[1:]

            results["groups_processed"] += 1
            results["items_to_process"] += len(duplicate_items)

            detail = {
                "file_hash": group["file_hash"],
                "keeping": {
                    "id": keep_item["id"],
                    "title": keep_item["title"]
                },
                "duplicates": [
                    {"id": d["id"], "title": d["title"]}
                    for d in duplicate_items
                ]
            }

            if not dry_run:
                try:
                    result = await self.resolve_duplicate_group(
                        content_ids=[item["id"] for item in items],
                        keep_id=keep_item["id"],
                        action=action
                    )
                    detail["result"] = result
                    results["items_processed"] += result["total_resolved"]
                except Exception as e:
                    detail["error"] = str(e)
                    results["errors"].append(str(e))

            results["details"].append(detail)

        return results


# Singleton instance
_duplicate_detection_service: Optional[DuplicateDetectionService] = None


def get_duplicate_detection_service() -> DuplicateDetectionService:
    """Get singleton duplicate detection service instance"""
    global _duplicate_detection_service
    if _duplicate_detection_service is None:
        _duplicate_detection_service = DuplicateDetectionService()
    return _duplicate_detection_service
