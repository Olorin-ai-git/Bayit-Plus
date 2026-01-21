"""
Content Entry Module - Database entry creation for uploaded content

Handles creating Content entries in the database after successful uploads.
Episodes are auto-linked to parent series.
"""

import logging
import re
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.upload import ContentType, UploadJob

logger = logging.getLogger(__name__)


class ContentEntryCreator:
    """Creates database entries for uploaded content."""

    async def create_entry(self, job: UploadJob) -> Optional[str]:
        """Create content entry based on content type."""
        try:
            if job.type == ContentType.MOVIE:
                return await self._create_movie(job)
            elif job.type == ContentType.SERIES:
                return await self._create_series_or_episode(job)
            elif job.type == ContentType.PODCAST:
                return await self._create_podcast(job)
            else:
                logger.warning(f"No handler for content type: {job.type}")
                return None
        except Exception as e:
            logger.error(f"Failed to create content entry: {e}", exc_info=True)
            raise

    async def _get_category(self, slug: str, defaults: dict) -> ContentSection:
        """Get or create category."""
        category = await ContentSection.find_one({"slug": slug})
        if not category:
            category = ContentSection(**defaults, slug=slug, is_active=True)
            await category.insert()
            logger.info(f"Created category: {slug}")
        return category

    async def _create_movie(self, job: UploadJob) -> Optional[str]:
        """Create movie content entry."""
        category = await self._get_category(
            "movies",
            {
                "name": "סרטים",
                "name_en": "Movies",
                "name_es": "Películas",
                "icon": "film",
                "order": 1,
            },
        )

        if existing := await Content.find_one({"stream_url": job.destination_url}):
            logger.info(f"Movie already exists: {existing.title}")
            return str(existing.id)

        m = job.metadata
        content = Content(
            title=m.get("title", job.filename),
            title_en=m.get("title_en", m.get("title")),
            description=m.get("description"),
            description_en=m.get("description_en", m.get("description")),
            thumbnail=m.get("thumbnail"),
            backdrop=m.get("backdrop"),
            poster_url=m.get("poster_url"),
            category_id=str(category.id),
            category_name="Movies",
            content_type="vod",
            stream_url=job.destination_url,
            year=m.get("year"),
            rating=m.get("rating"),
            imdb_rating=m.get("imdb_rating"),
            tmdb_id=m.get("tmdb_id"),
            imdb_id=m.get("imdb_id"),
            genre=m.get("genre"),
            cast=m.get("cast", []),
            director=m.get("director"),
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(f"Created movie: {content.title}")

        job.metadata["content_id"] = str(content.id)
        await job.save()
        await self._save_subtitles(content, m)

        return str(content.id)

    async def _create_series_or_episode(self, job: UploadJob) -> Optional[str]:
        """Create series container or episode entry."""
        category = await self._get_category(
            "series",
            {
                "name": "סדרות",
                "name_en": "Series",
                "name_es": "Series",
                "icon": "tv",
                "order": 2,
            },
        )

        if existing := await Content.find_one({"stream_url": job.destination_url}):
            logger.info(f"Series/episode already exists: {existing.title}")
            return str(existing.id)

        m = job.metadata
        season = m.get("season")
        episode = m.get("episode")
        is_episode = season is not None or episode is not None

        if is_episode:
            content = await self._create_episode(job, category, m, season, episode)
        else:
            content = await self._create_series_container(job, category, m)

        job.metadata["content_id"] = str(content.id)
        await job.save()
        await self._save_subtitles(content, m)

        return str(content.id)

    async def _create_episode(
        self,
        job: UploadJob,
        category: ContentSection,
        m: dict,
        season: Optional[int],
        episode: Optional[int],
    ) -> Content:
        """Create episode and link to parent series."""
        series_name = m.get("title", job.filename)
        series_id, parent = await self._find_or_create_series(series_name, m, category)

        # Build episode title with S01E01 format
        title = series_name
        if season and episode:
            title = f"{series_name} S{season:02d}E{episode:02d}"
        elif episode:
            title = f"{series_name} E{episode:02d}"

        # Inherit artwork from parent series
        poster = m.get("poster_url")
        thumbnail = m.get("thumbnail")
        backdrop = m.get("backdrop")

        if parent:
            poster = parent.poster_url or poster
            thumbnail = parent.thumbnail or parent.poster_url or thumbnail
            backdrop = parent.backdrop or backdrop

        content = Content(
            title=title,
            title_en=m.get("title_en", title),
            description=m.get("description"),
            description_en=m.get("description_en", m.get("description")),
            thumbnail=thumbnail,
            backdrop=backdrop,
            poster_url=poster,
            category_id=str(category.id),
            category_name="Series",
            content_type="episode",
            stream_url=job.destination_url,
            year=m.get("year"),
            rating=m.get("rating"),
            imdb_rating=m.get("imdb_rating"),
            tmdb_id=m.get("tmdb_id"),
            imdb_id=m.get("imdb_id"),
            genre=m.get("genre"),
            cast=m.get("cast", []),
            director=m.get("director"),
            is_series=False,
            season=season,
            episode=episode,
            series_id=series_id,
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(f"Created episode: {title} → series {series_id or 'orphaned'}")
        return content

    async def _create_series_container(
        self, job: UploadJob, category: ContentSection, m: dict
    ) -> Content:
        """Create series container (not an episode)."""
        content = Content(
            title=m.get("title", job.filename),
            title_en=m.get("title_en", m.get("title")),
            description=m.get("description"),
            description_en=m.get("description_en", m.get("description")),
            thumbnail=m.get("thumbnail"),
            backdrop=m.get("backdrop"),
            poster_url=m.get("poster_url"),
            category_id=str(category.id),
            category_name="Series",
            content_type="series",
            stream_url=job.destination_url,
            year=m.get("year"),
            rating=m.get("rating"),
            imdb_rating=m.get("imdb_rating"),
            tmdb_id=m.get("tmdb_id"),
            imdb_id=m.get("imdb_id"),
            genre=m.get("genre"),
            cast=m.get("cast", []),
            director=m.get("director"),
            is_series=True,
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )

        await content.insert()
        logger.info(f"Created series container: {content.title}")
        return content

    async def _find_or_create_series(
        self, name: str, m: dict, category: ContentSection
    ) -> tuple[Optional[str], Optional[Content]]:
        """Find or create parent series for episode linking."""
        # Try exact title match
        series = await Content.find_one(
            {
                "is_series": True,
                "$or": [
                    {"title": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
                    {"title_en": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
                ],
            }
        )

        if series:
            return str(series.id), series

        # Try TMDB ID match
        if tmdb_id := m.get("tmdb_id"):
            if series := await Content.find_one(
                {"is_series": True, "tmdb_id": tmdb_id}
            ):
                return str(series.id), series

        # Create new series container if enabled
        if settings.SERIES_LINKER_CREATE_MISSING_SERIES:
            series = Content(
                title=name,
                title_en=m.get("title_en", name),
                description=m.get("description"),
                poster_url=m.get("poster_url"),
                thumbnail=m.get("poster_url"),
                backdrop=m.get("backdrop"),
                year=m.get("year"),
                tmdb_id=m.get("tmdb_id"),
                imdb_id=m.get("imdb_id"),
                genre=m.get("genre"),
                is_series=True,
                content_type="series",
                is_published=True,
                category_id=str(category.id),
                category_name="Series",
                stream_url="",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await series.insert()
            logger.info(f"Created series container: {name}")
            return str(series.id), series

        logger.warning(f"No parent series found for {name}")
        return None, None

    async def _create_podcast(self, job: UploadJob) -> Optional[str]:
        """Create podcast episode entry."""
        logger.info("Podcast creation not yet implemented")
        return None

    async def _save_subtitles(self, content: Content, m: dict):
        """Save extracted subtitles to database."""
        if not (subs := m.get("extracted_subtitles", [])):
            return

        from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
        from app.services.subtitle_service import parse_srt

        for sub in subs:
            try:
                cues = parse_srt(sub["content"])
                track = SubtitleTrackDoc(
                    content_id=str(content.id),
                    language=sub["language"],
                    source="embedded",
                    format=sub.get("format", "srt"),
                    codec=sub.get("codec", "unknown"),
                    cues=[SubtitleCueModel(**c) for c in cues],
                    is_default=sub["language"] == "en",
                )
                await track.insert()
                logger.info(f"Saved {sub['language']} subtitles ({len(cues)} cues)")
            except Exception as e:
                logger.error(f"Failed to save {sub['language']} subtitles: {e}")

        content.embedded_subtitle_count = len(subs)
        content.available_subtitle_languages = [s["language"] for s in subs]
        content.subtitle_extraction_status = "completed"
        await content.save()


# Global content entry creator instance
content_creator = ContentEntryCreator()
