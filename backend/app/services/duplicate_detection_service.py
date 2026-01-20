"""
Duplicate Detection Service

Comprehensive duplicate detection system for the content library.
Identifies duplicates based on:
- File hash (exact duplicates)
- Title + year similarity
- TMDB/IMDB ID matches
"""

import logging
import re
from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.content import Content
from beanie import PydanticObjectId

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
            r"\.(mp4|mkv|avi|mov|wmv|flv|webm)$",
            r"\b(1080p|720p|480p|2160p|4k|hd|uhd)\b",
            r"\b(bluray|bdrip|dvdrip|webrip|hdtv|web-dl)\b",
            r"\b(x264|x265|hevc|aac|ac3|dts)\b",
            r"\[.*?\]",  # Remove bracket content like [YTS.MX]
            r"\(.*?\)",  # Remove parenthetical content
            r"[-_.]",  # Replace separators with spaces
        ]

        for pattern in patterns_to_remove:
            normalized = re.sub(pattern, " ", normalized, flags=re.IGNORECASE)

        # Collapse multiple spaces and strip
        normalized = re.sub(r"\s+", " ", normalized).strip()

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
            {
                "$group": {
                    "_id": "$file_hash",
                    "count": {"$sum": 1},
                    "items": {
                        "$push": {
                            "id": {"$toString": "$_id"},
                            "title": "$title",
                            "title_en": "$title_en",
                            "created_at": "$created_at",
                            "file_size": "$file_size",
                            "is_published": "$is_published",
                        }
                    },
                }
            },
            # Filter to only groups with duplicates
            {"$match": {"count": {"$gt": 1}}},
            # Sort by count descending
            {"$sort": {"count": -1}},
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append(
                {
                    "file_hash": group["_id"],
                    "count": group["count"],
                    "items": group["items"],
                    "duplicate_type": "exact_hash",
                }
            )

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
            {
                "$group": {
                    "_id": "$tmdb_id",
                    "count": {"$sum": 1},
                    "items": {
                        "$push": {
                            "id": {"$toString": "$_id"},
                            "title": "$title",
                            "title_en": "$title_en",
                            "created_at": "$created_at",
                            "is_published": "$is_published",
                        }
                    },
                }
            },
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}},
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append(
                {
                    "tmdb_id": group["_id"],
                    "count": group["count"],
                    "items": group["items"],
                    "duplicate_type": "tmdb_id",
                }
            )

        logger.info(f"Found {len(duplicates)} groups of TMDB duplicates")
        return duplicates

    async def find_imdb_duplicates(self) -> List[Dict[str, Any]]:
        """
        Find duplicates based on IMDB ID.
        """
        logger.info("Scanning for IMDB ID duplicates...")

        pipeline = [
            {"$match": {"imdb_id": {"$ne": None, "$exists": True}}},
            {
                "$group": {
                    "_id": "$imdb_id",
                    "count": {"$sum": 1},
                    "items": {
                        "$push": {
                            "id": {"$toString": "$_id"},
                            "title": "$title",
                            "title_en": "$title_en",
                            "created_at": "$created_at",
                            "is_published": "$is_published",
                        }
                    },
                }
            },
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}},
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append(
                {
                    "imdb_id": group["_id"],
                    "count": group["count"],
                    "items": group["items"],
                    "duplicate_type": "imdb_id",
                }
            )

        logger.info(f"Found {len(duplicates)} groups of IMDB duplicates")
        return duplicates

    async def find_exact_name_duplicates(self) -> List[Dict[str, Any]]:
        """
        Find duplicates with exact same title (case-insensitive).
        This catches stale duplicates like multiple "Bugranim s01e01" entries.
        """
        logger.info("Scanning for exact name duplicates...")

        pipeline = [
            {"$match": {"title": {"$ne": None, "$exists": True}}},
            {
                "$group": {
                    "_id": {"$toLower": "$title"},
                    "count": {"$sum": 1},
                    "items": {
                        "$push": {
                            "id": {"$toString": "$_id"},
                            "title": "$title",
                            "title_en": "$title_en",
                            "year": "$year",
                            "created_at": "$created_at",
                            "file_size": "$file_size",
                            "is_published": "$is_published",
                            "content_type": "$content_type",
                        }
                    },
                }
            },
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}},
        ]

        duplicates = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            duplicates.append(
                {
                    "exact_title": group["_id"],
                    "count": group["count"],
                    "items": group["items"],
                    "duplicate_type": "exact_name",
                }
            )

        logger.info(f"Found {len(duplicates)} groups of exact name duplicates")
        return duplicates

    async def find_title_duplicates(
        self, check_year: bool = True, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Find potential duplicates based on title similarity.
        This is more computationally expensive as it requires comparing titles.
        """
        logger.info("Scanning for title-based duplicates...")

        # Get all content with titles
        items = await Content.find({"title": {"$ne": None, "$exists": True}}).to_list()

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
                duplicates.append(
                    {
                        "normalized_key": key,
                        "count": len(group),
                        "items": [
                            {
                                "id": str(item.id),
                                "title": item.title,
                                "title_en": item.title_en,
                                "year": item.year,
                                "created_at": item.created_at,
                                "is_published": item.is_published,
                            }
                            for item in group
                        ],
                        "duplicate_type": "title_match",
                    }
                )

        # Sort by count and limit
        duplicates.sort(key=lambda x: x["count"], reverse=True)
        duplicates = duplicates[:limit]

        logger.info(f"Found {len(duplicates)} groups of title duplicates")
        return duplicates

    async def find_quality_variants(
        self, limit: int = 50, unlinked_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Find content items that are quality variants of each other.
        Groups content by TMDB ID and filters to groups with multiple different resolutions.

        Args:
            limit: Maximum number of groups to return
            unlinked_only: If True, only return groups that haven't been linked yet

        Returns:
            List of quality variant groups, sorted by resolution (highest first)
        """
        logger.info(
            "Scanning for quality variants (same content at different resolutions)..."
        )

        # Build match condition
        match_condition: Dict[str, Any] = {
            "tmdb_id": {"$ne": None, "$exists": True},
            "video_metadata.height": {"$ne": None, "$exists": True},
        }

        if unlinked_only:
            match_condition["is_quality_variant"] = {"$ne": True}
            match_condition["primary_content_id"] = {"$eq": None}

        pipeline = [
            {"$match": match_condition},
            {
                "$group": {
                    "_id": "$tmdb_id",
                    "count": {"$sum": 1},
                    "distinct_heights": {"$addToSet": "$video_metadata.height"},
                    "items": {
                        "$push": {
                            "id": {"$toString": "$_id"},
                            "title": "$title",
                            "title_en": "$title_en",
                            "resolution_height": "$video_metadata.height",
                            "resolution_width": "$video_metadata.width",
                            "stream_url": "$stream_url",
                            "file_size": "$file_size",
                            "created_at": "$created_at",
                            "is_published": "$is_published",
                            "quality_tier": "$quality_tier",
                            "is_quality_variant": "$is_quality_variant",
                        }
                    },
                }
            },
            # Filter to groups with multiple different resolutions
            {
                "$match": {
                    "count": {"$gt": 1},
                    "$expr": {"$gt": [{"$size": "$distinct_heights"}, 1]},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]

        quality_variants = []
        async for group in Content.get_motor_collection().aggregate(pipeline):
            # Sort items by resolution height (highest first)
            sorted_items = sorted(
                group["items"],
                key=lambda x: x.get("resolution_height") or 0,
                reverse=True,
            )

            # Determine quality tier for each item
            for item in sorted_items:
                height = item.get("resolution_height") or 0
                if height >= 2160:
                    item["quality_tier"] = "4k"
                elif height >= 1080:
                    item["quality_tier"] = "1080p"
                elif height >= 720:
                    item["quality_tier"] = "720p"
                elif height >= 480:
                    item["quality_tier"] = "480p"
                else:
                    item["quality_tier"] = "unknown"

            quality_variants.append(
                {
                    "tmdb_id": group["_id"],
                    "count": group["count"],
                    "distinct_resolutions": len(group["distinct_heights"]),
                    "items": sorted_items,
                    "primary_candidate": sorted_items[0] if sorted_items else None,
                    "variant_type": "quality_resolution",
                }
            )

        logger.info(f"Found {len(quality_variants)} groups of quality variants")
        return quality_variants

    async def link_quality_variants(
        self, content_ids: List[str], primary_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Link multiple content items as quality variants of each other.
        The highest quality item becomes the primary if not specified.

        Args:
            content_ids: List of content IDs to link
            primary_id: Optional ID of the primary (highest quality) version

        Returns:
            Summary of linking operation
        """
        if len(content_ids) < 2:
            return {
                "success": False,
                "error": "At least 2 content IDs required to link variants",
            }

        logger.info(f"Linking {len(content_ids)} content items as quality variants")

        # Fetch all content items
        items = []
        errors = []
        for cid in content_ids:
            try:
                content = await Content.get(PydanticObjectId(cid))
                if content:
                    items.append(content)
                else:
                    errors.append({"id": cid, "error": "Content not found"})
            except Exception as e:
                errors.append({"id": cid, "error": str(e)})

        if len(items) < 2:
            return {
                "success": False,
                "error": "Less than 2 valid content items found",
                "errors": errors,
            }

        # Sort by resolution height to find primary (highest quality)
        items.sort(
            key=lambda x: (x.video_metadata or {}).get("height", 0), reverse=True
        )

        # Determine primary content
        if primary_id:
            primary = next((c for c in items if str(c.id) == primary_id), None)
            if not primary:
                primary = items[0]  # Fallback to highest quality
        else:
            primary = items[0]  # Highest quality becomes primary

        primary_id_str = str(primary.id)
        variants = [c for c in items if str(c.id) != primary_id_str]

        # Build quality variants array for primary
        quality_variants_data = []
        for item in items:
            height = (item.video_metadata or {}).get("height", 0)
            if height >= 2160:
                tier = "4k"
            elif height >= 1080:
                tier = "1080p"
            elif height >= 720:
                tier = "720p"
            elif height >= 480:
                tier = "480p"
            else:
                tier = "unknown"

            quality_variants_data.append(
                {
                    "content_id": str(item.id),
                    "quality_tier": tier,
                    "resolution_height": height,
                    "resolution_width": (item.video_metadata or {}).get("width", 0),
                    "stream_url": item.stream_url,
                }
            )

        # Sort variants by resolution (highest first)
        quality_variants_data.sort(
            key=lambda x: x.get("resolution_height", 0), reverse=True
        )

        # Update primary content
        primary_height = (primary.video_metadata or {}).get("height", 0)
        primary.quality_variants = quality_variants_data
        primary.is_quality_variant = False
        primary.primary_content_id = None
        primary.quality_tier = quality_variants_data[0]["quality_tier"]
        primary.updated_at = datetime.utcnow()
        await primary.save()

        # Update variant content items
        updated_variants = []
        for variant in variants:
            variant_height = (variant.video_metadata or {}).get("height", 0)
            if variant_height >= 2160:
                tier = "4k"
            elif variant_height >= 1080:
                tier = "1080p"
            elif variant_height >= 720:
                tier = "720p"
            elif variant_height >= 480:
                tier = "480p"
            else:
                tier = "unknown"

            variant.is_quality_variant = True
            variant.primary_content_id = primary_id_str
            variant.quality_tier = tier
            variant.quality_variants = []  # Variants don't store the full list
            variant.updated_at = datetime.utcnow()
            await variant.save()
            updated_variants.append(
                {"id": str(variant.id), "title": variant.title, "quality_tier": tier}
            )

        return {
            "success": True,
            "primary": {
                "id": primary_id_str,
                "title": primary.title,
                "quality_tier": quality_variants_data[0]["quality_tier"],
            },
            "variants_linked": len(updated_variants),
            "variants": updated_variants,
            "quality_options": quality_variants_data,
            "errors": errors if errors else None,
        }

    async def find_all_duplicates(self) -> Dict[str, Any]:
        """
        Run all duplicate detection methods and return comprehensive results.
        """
        logger.info("Running comprehensive duplicate detection...")

        hash_duplicates = await self.find_hash_duplicates()
        tmdb_duplicates = await self.find_tmdb_duplicates()
        imdb_duplicates = await self.find_imdb_duplicates()
        exact_name_duplicates = await self.find_exact_name_duplicates()
        title_duplicates = await self.find_title_duplicates()

        # Calculate totals
        total_duplicate_groups = (
            len(hash_duplicates)
            + len(tmdb_duplicates)
            + len(imdb_duplicates)
            + len(exact_name_duplicates)
            + len(title_duplicates)
        )

        total_duplicate_items = sum(
            d["count"] - 1  # Subtract 1 because one item is the "original"
            for d in hash_duplicates
            + tmdb_duplicates
            + imdb_duplicates
            + exact_name_duplicates
            + title_duplicates
        )

        return {
            "summary": {
                "total_duplicate_groups": total_duplicate_groups,
                "total_duplicate_items": total_duplicate_items,
                "hash_duplicate_groups": len(hash_duplicates),
                "tmdb_duplicate_groups": len(tmdb_duplicates),
                "imdb_duplicate_groups": len(imdb_duplicates),
                "exact_name_duplicate_groups": len(exact_name_duplicates),
                "title_duplicate_groups": len(title_duplicates),
                "scanned_at": datetime.utcnow().isoformat(),
            },
            "hash_duplicates": hash_duplicates,
            "tmdb_duplicates": tmdb_duplicates,
            "imdb_duplicates": imdb_duplicates,
            "exact_name_duplicates": exact_name_duplicates,
            "title_duplicates": title_duplicates,
        }

    async def resolve_duplicate_group(
        self, content_ids: List[str], keep_id: str, action: str = "unpublish"
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
            raise ValueError(
                f"Invalid action: {action}. Must be 'unpublish', 'delete', or 'flag'"
            )

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
                    processed.append(
                        {"id": dup_id, "title": content.title, "action": "unpublished"}
                    )

                elif action == "delete":
                    await content.delete()
                    processed.append(
                        {"id": dup_id, "title": content.title, "action": "deleted"}
                    )

                elif action == "flag":
                    # Add a flag to the content for manual review
                    if not hasattr(content, "flags") or content.flags is None:
                        content.flags = []
                    content.flags.append(
                        {
                            "type": "duplicate",
                            "original_id": keep_id,
                            "flagged_at": datetime.utcnow().isoformat(),
                        }
                    )
                    content.updated_at = datetime.utcnow()
                    await content.save()
                    processed.append(
                        {"id": dup_id, "title": content.title, "action": "flagged"}
                    )

            except Exception as e:
                errors.append({"id": dup_id, "error": str(e)})

        return {
            "success": len(errors) == 0,
            "kept": keep_id,
            "processed": processed,
            "errors": errors,
            "total_resolved": len(processed),
        }

    async def auto_resolve_exact_duplicates(
        self, dry_run: bool = True, action: str = "unpublish"
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
            "details": [],
        }

        for group in hash_duplicates:
            # Sort by created_at to keep the oldest
            items = sorted(
                group["items"], key=lambda x: x.get("created_at") or datetime.min
            )

            keep_item = items[0]
            duplicate_items = items[1:]

            results["groups_processed"] += 1
            results["items_to_process"] += len(duplicate_items)

            detail = {
                "file_hash": group["file_hash"],
                "keeping": {"id": keep_item["id"], "title": keep_item["title"]},
                "duplicates": [
                    {"id": d["id"], "title": d["title"]} for d in duplicate_items
                ],
            }

            if not dry_run:
                try:
                    result = await self.resolve_duplicate_group(
                        content_ids=[item["id"] for item in items],
                        keep_id=keep_item["id"],
                        action=action,
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
