"""
Collection Detector Service
Auto-detects movie collections when 2+ movies from same TMDB collection exist
"""

from datetime import datetime
from typing import Dict, List, Optional

from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.tmdb_service import tmdb_service
from beanie.operators import In

logger = get_logger(__name__)


class CollectionDetectorService:
    """Service for auto-detecting and creating movie collections"""

    async def detect_collections_for_movie(self, content_id: str) -> Optional[Dict]:
        """
        Check if a movie belongs to a collection and create/update collection parent.

        Args:
            content_id: Content ID of the movie

        Returns:
            Dict with detection results or None
        """
        movie = await Content.get(content_id)
        if not movie:
            logger.error(f"Movie not found: {content_id}")
            return None

        if not movie.tmdb_collection_id:
            logger.info(
                f"Movie '{movie.title}' has no TMDB collection ID - skipping"
            )
            return None

        collection_id = movie.tmdb_collection_id
        logger.info(
            f"Checking collection {collection_id} for movie '{movie.title}'"
        )

        # Find all movies with same collection ID
        movies_in_collection = await Content.find(
            Content.tmdb_collection_id == collection_id,
            Content.is_collection_parent == False,  # noqa: E712
        ).to_list()

        if len(movies_in_collection) < 2:
            logger.info(
                f"Collection {collection_id} has only "
                f"{len(movies_in_collection)} movie(s) - not creating collection"
            )
            return None

        logger.info(
            f"Collection {collection_id} has {len(movies_in_collection)} "
            f"movies - creating collection"
        )

        # Check if collection parent already exists
        collection_parent = await Content.find_one(
            Content.tmdb_collection_id == collection_id,
            Content.is_collection_parent == True,  # noqa: E712
        )

        # Fetch full collection metadata from TMDB
        collection_metadata = await tmdb_service.enrich_collection_metadata(
            collection_id, movie.tmdb_collection_name or f"Collection {collection_id}"
        )

        if not collection_parent:
            # Create new collection parent
            collection_parent = Content(
                title=collection_metadata["collection_name"],
                title_en=collection_metadata["collection_name"],
                description=collection_metadata["collection_overview"],
                description_en=collection_metadata["collection_overview"],
                thumbnail=collection_metadata["collection_poster"],
                backdrop=collection_metadata["collection_backdrop"],
                poster_url=collection_metadata["collection_poster"],
                tmdb_collection_id=collection_id,
                tmdb_collection_name=collection_metadata["collection_name"],
                tmdb_collection_poster_path=collection_metadata["collection_poster"],
                is_collection_parent=True,
                collection_total_movies=collection_metadata["total_movies"],
                content_format="collection",
                section_ids=["movies"],
                primary_section_id="movies",
                is_published=True,
                stream_url="",  # Required field but not used for collections
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await collection_parent.insert()
            logger.info(
                f"Created collection parent: {collection_parent.title} "
                f"(ID: {collection_parent.id})"
            )
        else:
            # Update existing collection parent
            collection_parent.title = collection_metadata["collection_name"]
            collection_parent.title_en = collection_metadata["collection_name"]
            collection_parent.description = collection_metadata["collection_overview"]
            collection_parent.description_en = collection_metadata[
                "collection_overview"
            ]
            collection_parent.thumbnail = collection_metadata["collection_poster"]
            collection_parent.backdrop = collection_metadata["collection_backdrop"]
            collection_parent.poster_url = collection_metadata["collection_poster"]
            collection_parent.collection_total_movies = collection_metadata[
                "total_movies"
            ]
            collection_parent.updated_at = datetime.utcnow()
            await collection_parent.save()
            logger.info(f"Updated collection parent: {collection_parent.title}")

        # Link movies to collection parent
        linked_count = 0
        for idx, movie_doc in enumerate(
            sorted(movies_in_collection, key=lambda m: m.year or 0), start=1
        ):
            movie_doc.collection_parent_id = str(collection_parent.id)
            movie_doc.collection_order = idx
            await movie_doc.save()
            linked_count += 1
            logger.info(
                f"Linked movie '{movie_doc.title}' to collection "
                f"(order: {idx})"
            )

        return {
            "collection_id": collection_id,
            "collection_parent_id": str(collection_parent.id),
            "collection_name": collection_parent.title,
            "total_movies_in_collection": collection_metadata["total_movies"],
            "available_movies": len(movies_in_collection),
            "linked_movies": linked_count,
        }

    async def scan_all_movies(self) -> Dict[str, int]:
        """
        Scan all movies in database and detect collections.

        Returns:
            Stats dict with counts
        """
        logger.info("Starting full collection scan...")

        # Find all movies with TMDB collection IDs
        movies = await Content.find(
            Content.tmdb_collection_id != None,  # noqa: E711
            Content.is_collection_parent == False,  # noqa: E712
        ).to_list()

        logger.info(
            f"Found {len(movies)} movies with TMDB collection IDs"
        )

        # Group by collection ID
        collections_map: Dict[int, List[Content]] = {}
        for movie in movies:
            if movie.tmdb_collection_id:
                if movie.tmdb_collection_id not in collections_map:
                    collections_map[movie.tmdb_collection_id] = []
                collections_map[movie.tmdb_collection_id].append(movie)

        collections_created = 0
        collections_skipped = 0
        movies_linked = 0

        # Process each collection
        for collection_id, collection_movies in collections_map.items():
            if len(collection_movies) < 2:
                collections_skipped += 1
                logger.info(
                    f"Skipping collection {collection_id} - only "
                    f"{len(collection_movies)} movie(s)"
                )
                continue

            # Use first movie to trigger detection
            first_movie = collection_movies[0]
            result = await self.detect_collections_for_movie(str(first_movie.id))

            if result:
                collections_created += 1
                movies_linked += result["linked_movies"]

        stats = {
            "total_movies_scanned": len(movies),
            "collections_created": collections_created,
            "collections_skipped": collections_skipped,
            "movies_linked": movies_linked,
        }

        logger.info(f"Collection scan complete: {stats}")
        return stats


# Singleton instance
collection_detector_service = CollectionDetectorService()
