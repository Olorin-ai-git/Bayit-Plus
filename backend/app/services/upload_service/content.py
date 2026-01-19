"""
Content Entry Module - Database entry creation for uploaded content

Handles creating Content, Series, and Podcast entries in the database
after successful uploads.

Episode vs Series Detection:
- If season/episode numbers are detected in filename, it's an EPISODE
- Episodes are created with is_series=False and linked to parent series
- If no episode info detected, it's a SERIES CONTAINER (is_series=True)
"""

import logging
from datetime import datetime
from typing import Optional

from app.models.upload import UploadJob, ContentType
from app.models.content import Content, Category

logger = logging.getLogger(__name__)


class ContentEntryCreator:
    """Creates database entries for uploaded content."""

    async def create_entry(self, job: UploadJob) -> Optional[str]:
        """
        Create content entry in database based on content type.

        Returns:
            Content ID if created successfully
        """
        try:
            if job.type == ContentType.MOVIE:
                return await self.create_movie_entry(job)
            elif job.type == ContentType.SERIES:
                return await self.create_series_entry(job)
            elif job.type == ContentType.PODCAST:
                return await self.create_podcast_episode_entry(job)
            else:
                logger.warning(f"No handler for content type: {job.type}")
                return None

        except Exception as e:
            logger.error(f"Failed to create content entry: {e}", exc_info=True)
            raise

    async def create_movie_entry(self, job: UploadJob) -> Optional[str]:
        """Create a movie content entry."""
        # Get or create Movies category
        category = await Category.find_one(Category.name == "Movies")
        if not category:
            category = Category(
                name="Movies",
                name_he="סרטים",
                slug="movies",
                icon="film",
                is_active=True,
                order=1,
            )
            await category.insert()

        # Check if content already exists
        existing = await Content.find_one(
            Content.stream_url == job.destination_url
        )

        if existing:
            logger.info(f"Content already exists: {existing.title}")
            return str(existing.id)

        # Create content
        metadata = job.metadata

        content = Content(
            title=metadata.get('title', job.filename),
            title_en=metadata.get('title_en', metadata.get('title')),
            description=metadata.get('description'),
            description_en=metadata.get('description_en', metadata.get('description')),
            thumbnail=metadata.get('thumbnail'),
            backdrop=metadata.get('backdrop'),
            poster_url=metadata.get('poster_url'),
            category_id=str(category.id),
            category_name="Movies",
            type="vod",
            stream_url=job.destination_url,
            year=metadata.get('year'),
            rating=metadata.get('rating'),
            imdb_rating=metadata.get('imdb_rating'),
            tmdb_id=metadata.get('tmdb_id'),
            imdb_id=metadata.get('imdb_id'),
            genre=metadata.get('genre'),
            cast=metadata.get('cast', []),
            director=metadata.get('director'),
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(f"Created movie content: {content.title} (hash: {job.file_hash[:16] if job.file_hash else 'none'}...)")

        # Store content ID in job metadata
        job.metadata['content_id'] = str(content.id)
        await job.save()

        # Save extracted subtitles if any
        await self._save_extracted_subtitles(content, metadata)

        return str(content.id)

    async def create_series_entry(self, job: UploadJob) -> Optional[str]:
        """
        Create a series or episode content entry.

        If season/episode numbers are detected in the metadata, this creates an
        EPISODE (is_series=False) and attempts to link it to a parent series.

        If no episode info is detected, this creates a SERIES CONTAINER
        (is_series=True) that can hold episodes.
        """
        # Get or create Series category
        category = await Category.find_one(Category.name == "Series")
        if not category:
            category = Category(
                name="Series",
                name_he="סדרות",
                name_en="Series",
                name_es="Series",
                slug="series",
                icon="tv",
                is_active=True,
                order=2,
            )
            await category.insert()

        # Check if content already exists
        existing = await Content.find_one(
            Content.stream_url == job.destination_url
        )

        if existing:
            logger.info(f"Content already exists: {existing.title}")
            return str(existing.id)

        metadata = job.metadata

        # Determine if this is an episode or a series container
        season = metadata.get('season')
        episode = metadata.get('episode')
        is_episode = season is not None or episode is not None

        if is_episode:
            # This is an EPISODE - create it and try to link to parent series
            content = await self._create_episode_entry(job, category, metadata, season, episode)
        else:
            # This is a SERIES CONTAINER (no episode info detected)
            content = await self._create_series_container_entry(job, category, metadata)

        # Store content ID in job metadata
        job.metadata['content_id'] = str(content.id)
        await job.save()

        # Save extracted subtitles if any
        await self._save_extracted_subtitles(content, metadata)

        return str(content.id)

    async def _create_episode_entry(
        self,
        job: UploadJob,
        category: Category,
        metadata: dict,
        season: Optional[int],
        episode: Optional[int]
    ) -> Content:
        """
        Create an episode entry and link it to parent series.

        Episodes inherit poster/thumbnail/backdrop from their parent series
        to ensure visual consistency and avoid redundant TMDB calls.

        Args:
            job: The upload job
            category: Series category
            metadata: Extracted metadata
            season: Season number
            episode: Episode number

        Returns:
            The created Content object
        """
        from beanie import PydanticObjectId

        series_name = metadata.get('title', job.filename)

        # Try to find or create parent series
        series_id, parent_series = await self._find_or_create_parent_series_with_data(series_name, metadata)

        # Create episode title with S01E01 format if possible
        episode_title = series_name
        if season is not None and episode is not None:
            episode_title = f"{series_name} S{season:02d}E{episode:02d}"
        elif episode is not None:
            episode_title = f"{series_name} E{episode:02d}"

        # Inherit poster/thumbnail/backdrop from parent series if available
        # This ensures all episodes share the same artwork and avoids redundant TMDB calls
        poster_url = metadata.get('poster_url')
        thumbnail = metadata.get('thumbnail')
        backdrop = metadata.get('backdrop')

        if parent_series:
            # Inherit from parent series - series is the source of truth for artwork
            poster_url = parent_series.poster_url or poster_url
            thumbnail = parent_series.thumbnail or parent_series.poster_url or thumbnail
            backdrop = parent_series.backdrop or backdrop
            logger.info(f"Episode inheriting artwork from series '{parent_series.title}'")

        content = Content(
            title=episode_title,
            title_en=metadata.get('title_en', episode_title),
            description=metadata.get('description'),
            description_en=metadata.get('description_en', metadata.get('description')),
            thumbnail=thumbnail,
            backdrop=backdrop,
            poster_url=poster_url,
            category_id=str(category.id),
            category_name="Series",
            content_type="episode",
            stream_url=job.destination_url,
            year=metadata.get('year'),
            rating=metadata.get('rating'),
            imdb_rating=metadata.get('imdb_rating'),
            tmdb_id=metadata.get('tmdb_id'),
            imdb_id=metadata.get('imdb_id'),
            genre=metadata.get('genre'),
            cast=metadata.get('cast', []),
            director=metadata.get('director'),
            # EPISODE-SPECIFIC FIELDS
            is_series=False,  # This is an episode, not a series container
            season=season,
            episode=episode,
            series_id=series_id,  # Link to parent series
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()

        if series_id:
            logger.info(
                f"Created episode: '{episode_title}' S{season}E{episode} "
                f"linked to series {series_id} (hash: {job.file_hash[:16] if job.file_hash else 'none'}...)"
            )
        else:
            logger.info(
                f"Created orphan episode: '{episode_title}' S{season}E{episode} "
                f"(no parent series found, hash: {job.file_hash[:16] if job.file_hash else 'none'}...)"
            )

        return content

    async def _create_series_container_entry(
        self,
        job: UploadJob,
        category: Category,
        metadata: dict
    ) -> Content:
        """
        Create a series container entry (not an episode).

        Args:
            job: The upload job
            category: Series category
            metadata: Extracted metadata

        Returns:
            The created Content object
        """
        content = Content(
            title=metadata.get('title', job.filename),
            title_en=metadata.get('title_en', metadata.get('title')),
            description=metadata.get('description'),
            description_en=metadata.get('description_en', metadata.get('description')),
            thumbnail=metadata.get('thumbnail'),
            backdrop=metadata.get('backdrop'),
            poster_url=metadata.get('poster_url'),
            category_id=str(category.id),
            category_name="Series",
            content_type="series",
            stream_url=job.destination_url,
            year=metadata.get('year'),
            rating=metadata.get('rating'),
            imdb_rating=metadata.get('imdb_rating'),
            tmdb_id=metadata.get('tmdb_id'),
            imdb_id=metadata.get('imdb_id'),
            genre=metadata.get('genre'),
            cast=metadata.get('cast', []),
            director=metadata.get('director'),
            is_series=True,  # This IS a series container
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(
            f"Created series container: '{content.title}' "
            f"(is_series=True, hash: {job.file_hash[:16] if job.file_hash else 'none'}...)"
        )

        return content

    async def _find_or_create_parent_series_with_data(
        self,
        series_name: str,
        metadata: dict
    ) -> tuple[Optional[str], Optional[Content]]:
        """
        Find an existing parent series or create a new one.

        Returns both the series ID and the Content object so episodes
        can inherit poster/thumbnail/backdrop from the parent series.

        IMPORTANT: This function prevents duplicate series containers by:
        1. Checking exact title match (case-insensitive)
        2. Checking normalized title match (removes special chars)
        3. Checking TMDB ID match
        4. Only creating new container if none found

        Args:
            series_name: The series name extracted from filename
            metadata: Extracted metadata (may contain TMDB info)

        Returns:
            Tuple of (series_id, series_content) - either can be None
        """
        import re
        from app.core.config import settings

        def normalize_title(title: str) -> str:
            """Normalize title for matching: lowercase, remove special chars."""
            if not title:
                return ""
            # Remove year patterns like (2021) or [2021]
            title = re.sub(r'[\(\[]\d{4}[\)\]]', '', title)
            # Remove special characters, keep alphanumeric and spaces
            title = re.sub(r'[^\w\s]', '', title)
            # Collapse whitespace and lowercase
            return ' '.join(title.lower().split())

        normalized_name = normalize_title(series_name)
        logger.info(f"Looking for series container: '{series_name}' (normalized: '{normalized_name}')")

        # Strategy 1: Find proper series container (is_series=True, empty stream_url)
        # This targets actual series containers, not misclassified episodes
        existing_series = await Content.find_one({
            "is_series": True,
            "content_type": "series",
            "$or": [
                {"stream_url": ""},
                {"stream_url": None},
                {"stream_url": {"$exists": False}}
            ],
            "$or": [
                {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
                {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
            ]
        })

        if existing_series:
            logger.info(f"Found existing series container '{existing_series.title}' (ID: {existing_series.id})")
            return str(existing_series.id), existing_series

        # Strategy 2: Broader search - any is_series=True with matching title
        # (catches containers that might have stream_url set incorrectly)
        existing_series = await Content.find_one({
            "is_series": True,
            "$or": [
                {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
                {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
            ]
        })

        if existing_series:
            # Check if this is a proper container or a misclassified episode
            if not existing_series.stream_url or existing_series.content_type == "series":
                logger.info(f"Found series '{existing_series.title}' for episode")
                return str(existing_series.id), existing_series
            else:
                # This might be a misclassified episode, log but don't use
                logger.warning(
                    f"Found '{existing_series.title}' but it has stream_url - "
                    f"likely misclassified episode, will create proper container"
                )

        # Strategy 3: Check by TMDB ID if available
        tmdb_id = metadata.get('tmdb_id')
        if tmdb_id:
            tmdb_series = await Content.find_one({
                "is_series": True,
                "tmdb_id": tmdb_id
            })
            if tmdb_series:
                logger.info(f"Found series by TMDB ID {tmdb_id}: '{tmdb_series.title}'")
                return str(tmdb_series.id), tmdb_series

        # Strategy 4: Fuzzy match using normalized titles
        # Search all series and compare normalized titles
        all_series = await Content.find({
            "is_series": True,
            "content_type": "series"
        }).to_list()

        for series in all_series:
            series_normalized = normalize_title(series.title)
            series_en_normalized = normalize_title(series.title_en) if series.title_en else ""

            if normalized_name == series_normalized or normalized_name == series_en_normalized:
                logger.info(f"Found series via normalized match: '{series.title}'")
                return str(series.id), series

        # Strategy 5: Create a new series container if auto-create is enabled
        if settings.SERIES_LINKER_CREATE_MISSING_SERIES:
            new_series = await self._create_new_series_container(series_name, metadata)
            if new_series:
                return str(new_series.id), new_series

        # No series found or created - episode will be orphaned for later linking
        logger.warning(f"No parent series found for '{series_name}' - episode will be orphaned")
        return None, None

    async def _create_new_series_container(
        self,
        series_name: str,
        metadata: dict
    ) -> Optional[Content]:
        """
        Create a new series container for episodes.

        IMPORTANT: Does a final duplicate check before inserting to prevent
        race conditions where multiple uploads might create duplicate containers.

        Args:
            series_name: The series name
            metadata: Metadata that may include TMDB data

        Returns:
            The created series Content, or None if creation failed
        """
        import re

        try:
            # Final duplicate check before creating (prevents race conditions)
            existing = await Content.find_one({
                "is_series": True,
                "content_type": "series",
                "$or": [
                    {"title": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}},
                    {"title_en": {"$regex": f"^{re.escape(series_name)}$", "$options": "i"}}
                ]
            })

            if existing:
                logger.info(f"Series container already exists (race condition prevented): '{existing.title}'")
                return existing

            # Get series category
            category = await Category.find_one(Category.name == "Series")
            if not category:
                category = await Category.find_one({"slug": "series"})

            series = Content(
                title=series_name,
                title_en=metadata.get('title_en', series_name),
                description=metadata.get('description'),
                poster_url=metadata.get('poster_url'),
                thumbnail=metadata.get('poster_url'),
                backdrop=metadata.get('backdrop'),
                year=metadata.get('year'),
                tmdb_id=metadata.get('tmdb_id'),
                imdb_id=metadata.get('imdb_id'),
                imdb_rating=metadata.get('imdb_rating'),
                genre=metadata.get('genre'),
                is_series=True,
                content_type="series",
                is_published=True,
                category_id=str(category.id) if category else "",
                category_name="Series",
                stream_url="",  # Series containers don't need stream URLs
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            await series.insert()
            logger.info(f"Created new series container: '{series_name}' (ID: {series.id})")

            return series

        except Exception as e:
            logger.error(f"Failed to create series container for '{series_name}': {e}")
            return None

    async def create_podcast_episode_entry(self, job: UploadJob) -> Optional[str]:
        """Create a podcast episode content entry."""
        logger.info("Podcast episode creation not yet implemented")
        return None

    async def _save_extracted_subtitles(self, content: Content, metadata: dict):
        """Save extracted subtitles to database."""
        extracted_subs = metadata.get('extracted_subtitles', [])
        if not extracted_subs:
            return

        logger.info(f"Saving {len(extracted_subs)} extracted subtitles to database")
        from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
        from app.services.subtitle_service import parse_srt

        for sub_data in extracted_subs:
            try:
                cues = parse_srt(sub_data['content'])

                subtitle_track = SubtitleTrackDoc(
                    content_id=str(content.id),
                    language=sub_data['language'],
                    source='embedded',
                    format=sub_data.get('format', 'srt'),
                    codec=sub_data.get('codec', 'unknown'),
                    cues=[SubtitleCueModel(**cue) for cue in cues],
                    is_default=sub_data['language'] == 'en',
                )

                await subtitle_track.insert()
                logger.info(f"Saved {sub_data['language']} subtitles ({len(cues)} cues)")

            except Exception as e:
                logger.error(f"Failed to save {sub_data['language']} subtitles: {str(e)}")

        # Update content with subtitle info
        content.embedded_subtitle_count = len(extracted_subs)
        content.available_subtitle_languages = [s['language'] for s in extracted_subs]
        content.subtitle_extraction_status = 'completed'
        await content.save()


# Global content entry creator instance
content_creator = ContentEntryCreator()
