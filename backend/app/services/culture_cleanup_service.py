"""
Culture Cleanup Service - Database maintenance for culture collections.

Provides utilities for cleaning up duplicate entries and maintaining data integrity.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.models.culture import CultureCity

logger = logging.getLogger(__name__)


class CultureCleanupService:
    """Service for cleaning up and maintaining culture data integrity."""

    async def find_duplicate_cities(self) -> Dict[str, List[CultureCity]]:
        """
        Find duplicate city_id entries within the same culture.

        Returns:
            Dictionary mapping city_id to list of duplicate CultureCity documents
        """
        logger.info("Searching for duplicate culture cities...")

        # Get all cities
        cities = await CultureCity.find_all().to_list()

        # Group by (culture_id, city_id) compound key
        cities_by_key = defaultdict(list)
        for city in cities:
            key = f"{city.culture_id}:{city.city_id}"
            cities_by_key[key].append(city)

        # Find duplicates
        duplicates = {
            key: city_list
            for key, city_list in cities_by_key.items()
            if len(city_list) > 1
        }

        logger.info(f"Found {len(duplicates)} keys with duplicate cities")
        return duplicates

    async def remove_duplicate_cities(
        self, duplicates: Dict[str, List[CultureCity]], dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Remove duplicate cities, keeping the oldest entry.

        Args:
            duplicates: Dictionary of duplicate city entries
            dry_run: If True, only simulate the cleanup without making changes

        Returns:
            Dictionary with cleanup statistics and details
        """
        total_removed = 0
        removed_details = []

        for key, cities in duplicates.items():
            culture_id, city_id = key.split(":", 1)

            # Sort by created_at or _id (older first)
            cities_sorted = sorted(cities, key=lambda c: c.id)

            # Keep the first (oldest) entry
            keep_city = cities_sorted[0]
            remove_cities = cities_sorted[1:]

            detail = {
                "key": key,
                "culture_id": culture_id,
                "city_id": city_id,
                "total_duplicates": len(cities),
                "kept": {
                    "id": str(keep_city.id),
                    "name": keep_city.name,
                    "created_at": keep_city.created_at.isoformat(),
                },
                "removed": [],
            }

            for city in remove_cities:
                removed_info = {
                    "id": str(city.id),
                    "name": city.name,
                    "created_at": city.created_at.isoformat(),
                }
                detail["removed"].append(removed_info)

                if not dry_run:
                    await city.delete()
                    total_removed += 1
                    logger.info(
                        f"Removed duplicate city: {city.name} (ID: {city.id}) for {key}"
                    )

            removed_details.append(detail)

        return {
            "total_duplicates_found": len(duplicates),
            "total_documents_removed": total_removed,
            "dry_run": dry_run,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": removed_details,
        }

    async def verify_no_duplicates(self) -> Dict[str, Any]:
        """
        Verify that no duplicate city_id entries remain.

        Returns:
            Dictionary with verification results
        """
        logger.info("Verifying no duplicates remain...")

        cities = await CultureCity.find_all().to_list()

        # Create compound keys
        city_keys = [f"{city.culture_id}:{city.city_id}" for city in cities]

        unique_count = len(set(city_keys))
        total_count = len(city_keys)

        has_duplicates = unique_count != total_count
        duplicate_count = total_count - unique_count if has_duplicates else 0

        result = {
            "has_duplicates": has_duplicates,
            "total_cities": total_count,
            "unique_keys": unique_count,
            "duplicate_count": duplicate_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if has_duplicates:
            logger.warning(f"Found {duplicate_count} duplicate city_id entries")
        else:
            logger.info(f"All {total_count} cities have unique (culture_id, city_id) pairs")

        return result

    async def cleanup_duplicate_cities(self, dry_run: bool = True) -> Dict[str, Any]:
        """
        Main cleanup method - find and remove duplicate cities.

        Args:
            dry_run: If True, only simulate the cleanup without making changes

        Returns:
            Comprehensive cleanup report
        """
        logger.info(f"Starting culture cities cleanup (dry_run={dry_run})")

        # Find duplicates
        duplicates = await self.find_duplicate_cities()

        if not duplicates:
            return {
                "status": "success",
                "message": "No duplicate cities found",
                "total_duplicates_found": 0,
                "total_documents_removed": 0,
                "dry_run": dry_run,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        # Remove duplicates
        cleanup_result = await self.remove_duplicate_cities(duplicates, dry_run=dry_run)

        # Verify
        if not dry_run:
            verification = await self.verify_no_duplicates()
            cleanup_result["verification"] = verification

            if verification["has_duplicates"]:
                cleanup_result["status"] = "partial_success"
                cleanup_result["message"] = "Some duplicates may still remain"
            else:
                cleanup_result["status"] = "success"
                cleanup_result["message"] = "All duplicates successfully removed"
        else:
            cleanup_result["status"] = "dry_run"
            cleanup_result["message"] = "Dry run complete - no changes made"

        return cleanup_result


# Global service instance
culture_cleanup_service = CultureCleanupService()
