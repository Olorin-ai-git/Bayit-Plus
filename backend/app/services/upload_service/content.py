"""
Content Entry Module - Database entry creation for uploaded content

Handles creating Content, Series, and Podcast entries in the database
after successful uploads.
"""

import logging
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
        """Create a series content entry."""
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

        # Create content with is_series=True
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
            is_series=True,
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(f"Created series content: {content.title} (is_series=True, hash: {job.file_hash[:16] if job.file_hash else 'none'}...)")

        # Store content ID in job metadata
        job.metadata['content_id'] = str(content.id)
        await job.save()

        # Save extracted subtitles if any
        await self._save_extracted_subtitles(content, metadata)

        return str(content.id)

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
