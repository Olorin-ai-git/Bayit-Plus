"""
Content Deletion Service
Handles complete deletion of content including GCS files and related documents
"""

import logging
from typing import List

from app.api.routes.content.utils import is_series_content
from app.core.storage import get_storage_provider
from app.models.content import Content

logger = logging.getLogger(__name__)


class ContentDeletionService:
    """Handles complete content cleanup and deletion including GCS files"""

    async def delete_content_complete(
        self,
        content_id: str,
        delete_episodes: bool = True,
    ) -> dict:
        """
        Delete content completely including GCS files and episodes.

        Args:
            content_id: The content ID to delete
            delete_episodes: If True and content is a series, delete all episodes

        Returns:
            Dict with deletion results including counts and errors
        """
        result = {
            "content_deleted": False,
            "gcs_files_deleted": 0,
            "episodes_deleted": 0,
            "errors": [],
        }

        try:
            content = await Content.get(content_id)
            if not content:
                result["errors"].append(f"Content {content_id} not found")
                return result

            storage = get_storage_provider()

            # If this is a series, delete all episodes first
            if is_series_content(content.model_dump()) and delete_episodes:
                episodes = await Content.find({"series_id": str(content.id)}).to_list()
                for episode in episodes:
                    episode_result = await self._delete_single_content(
                        episode, storage
                    )
                    result["episodes_deleted"] += 1
                    result["gcs_files_deleted"] += episode_result["gcs_files_deleted"]
                    result["errors"].extend(episode_result["errors"])

                logger.info(
                    "Deleted %d episodes for series %s",
                    result["episodes_deleted"],
                    content_id,
                )

            # Delete the main content
            main_result = await self._delete_single_content(content, storage)
            result["content_deleted"] = main_result["content_deleted"]
            result["gcs_files_deleted"] += main_result["gcs_files_deleted"]
            result["errors"].extend(main_result["errors"])

            logger.info(
                "Content deletion complete: %s (GCS files: %d, episodes: %d)",
                content_id,
                result["gcs_files_deleted"],
                result["episodes_deleted"],
            )

            return result

        except Exception as e:
            logger.error("Failed to delete content %s: %s", content_id, str(e))
            result["errors"].append(f"Deletion failed: {str(e)}")
            return result

    async def _delete_single_content(self, content: Content, storage) -> dict:
        """Delete a single content item and its GCS files."""
        result = {
            "content_deleted": False,
            "gcs_files_deleted": 0,
            "errors": [],
        }

        urls_to_delete = []

        # Main stream URL
        if content.stream_url:
            urls_to_delete.append(content.stream_url)

        # Quality variants
        if content.quality_variants:
            for variant in content.quality_variants:
                if variant.get("stream_url"):
                    urls_to_delete.append(variant["stream_url"])

        # Thumbnail and backdrop (if stored in GCS)
        if content.thumbnail and self._is_gcs_url(content.thumbnail):
            urls_to_delete.append(content.thumbnail)
        if content.backdrop and self._is_gcs_url(content.backdrop):
            urls_to_delete.append(content.backdrop)

        # Delete each URL from GCS
        for url in urls_to_delete:
            try:
                deleted = await storage.delete_file(url)
                if deleted:
                    result["gcs_files_deleted"] += 1
                    logger.debug("Deleted GCS file: %s", url)
                else:
                    logger.warning("GCS file not found or already deleted: %s", url)
            except Exception as e:
                error_msg = f"Failed to delete GCS file {url}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)

        # Delete the content document from MongoDB
        try:
            await content.delete()
            result["content_deleted"] = True
            logger.info("Deleted content document: %s", content.id)
        except Exception as e:
            error_msg = f"Failed to delete content document: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)

        return result

    def _is_gcs_url(self, url: str) -> bool:
        """Check if URL is a GCS URL."""
        if not url:
            return False
        return (
            "storage.googleapis.com" in url
            or "storage.cloud.google.com" in url
            or url.startswith("gs://")
        )

    async def batch_delete_content_complete(
        self,
        content_ids: List[str],
        delete_episodes: bool = True,
    ) -> dict:
        """
        Batch delete multiple content items completely.

        Args:
            content_ids: List of content IDs to delete
            delete_episodes: If True, delete episodes for series

        Returns:
            Dict with batch deletion results
        """
        result = {
            "total_requested": len(content_ids),
            "content_deleted": 0,
            "episodes_deleted": 0,
            "gcs_files_deleted": 0,
            "errors": [],
        }

        for content_id in content_ids:
            delete_result = await self.delete_content_complete(
                content_id, delete_episodes
            )
            if delete_result["content_deleted"]:
                result["content_deleted"] += 1
            result["episodes_deleted"] += delete_result["episodes_deleted"]
            result["gcs_files_deleted"] += delete_result["gcs_files_deleted"]
            result["errors"].extend(delete_result["errors"])

        return result


# Global instance
content_deletion_service = ContentDeletionService()
