"""
External Subtitle Service
Orchestrates fetching subtitles from external sources with priority fallback
"""

from typing import Optional, Dict, Any, List
import logging
from datetime import datetime
from beanie import PydanticObjectId

from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel, SubtitleSearchCacheDoc
from app.services.opensubtitles_service import get_opensubtitles_service
from app.services.tmdb_service import TMDBService
from app.services.subtitle_service import parse_subtitles

logger = logging.getLogger(__name__)

# Language name mapping
LANGUAGE_NAMES = {
    "en": "English",
    "he": "עברית",
    "es": "Español",
    "ar": "العربية",
    "ru": "Русский",
    "fr": "Français"
}


class ExternalSubtitleService:
    """Unified service for fetching subtitles from external sources"""

    def __init__(self):
        self.opensubtitles = get_opensubtitles_service()
        self.tmdb = TMDBService()

    async def fetch_subtitle_for_content(
        self,
        content_id: str,
        language: str,
        sources: List[str] = ["opensubtitles", "tmdb"]
    ) -> Optional[SubtitleTrackDoc]:
        """
        Fetch subtitle from external sources with priority fallback.

        Priority order:
        1. OpenSubtitles (if in sources and quota available)
        2. TMDB (if in sources)
        3. Return None if all fail

        Returns saved SubtitleTrackDoc or None
        """
        # Get content metadata
        content = await Content.get(content_id)
        if not content:
            logger.error(f"❌ Content {content_id} not found")
            return None

        # Check if subtitle already exists
        existing = await SubtitleTrackDoc.find_one(
            SubtitleTrackDoc.content_id == content_id,
            SubtitleTrackDoc.language == language
        )
        if existing:
            logger.info(f"✅ Subtitle already exists for {content_id} ({language})")
            return existing

        logger.info(f"🔍 Fetching {language} subtitle for '{content.title}' from {sources}")

        # Try OpenSubtitles first
        if "opensubtitles" in sources:
            track = await self._try_opensubtitles(content, language)
            if track:
                return track

        # Try TMDB as fallback
        if "tmdb" in sources:
            track = await self._try_tmdb(content, language)
            if track:
                return track

        logger.warning(f"⚠️ No subtitles found for {content_id} ({language}) from any source")
        return None

    async def _try_opensubtitles(
        self,
        content: Content,
        language: str
    ) -> Optional[SubtitleTrackDoc]:
        """Try to fetch subtitle from OpenSubtitles"""
        # Check quota first
        quota = await self.opensubtitles.check_quota_available()
        if not quota["available"]:
            logger.warning(
                f"⚠️ OpenSubtitles quota exhausted: {quota['used']}/{quota['daily_limit']}"
            )
            return None

        # Extract TV series episode info from metadata if available
        metadata = content.metadata or {}
        season_number = metadata.get("season_number") or metadata.get("season")
        episode_number = metadata.get("episode_number") or metadata.get("episode")
        parent_imdb_id = metadata.get("series_imdb_id") or metadata.get("parent_imdb_id")
        is_tv_series = metadata.get("tmdb_type") == "tv" or season_number is not None
        
        # Determine search strategy
        if is_tv_series and parent_imdb_id and season_number and episode_number:
            # TV series with series IMDB ID + season/episode
            logger.info(f"📺 TV episode search: {content.title} S{season_number}E{episode_number}")
            results = await self.opensubtitles.search_subtitles(
                imdb_id=None,
                language=language,
                content_id=str(content.id),
                parent_imdb_id=parent_imdb_id,
                season_number=int(season_number),
                episode_number=int(episode_number)
            )
        elif content.imdb_id:
            # Movie or content with specific IMDB ID
            results = await self.opensubtitles.search_subtitles(
                imdb_id=content.imdb_id,
                language=language,
                content_id=str(content.id),
                season_number=int(season_number) if season_number else None,
                episode_number=int(episode_number) if episode_number else None
            )
        elif content.title:
            # Fallback to title search
            logger.info(f"🔍 Fallback to title search for: {content.title}")
            results = await self.opensubtitles.search_subtitles(
                imdb_id=None,
                language=language,
                content_id=str(content.id),
                query=content.title,
                season_number=int(season_number) if season_number else None,
                episode_number=int(episode_number) if episode_number else None
            )
        else:
            logger.warning(f"⚠️ No IMDB ID or title for {content.id} - cannot search OpenSubtitles")
            return None

        if not results:
            return None

        # Download first result
        best_result = results[0]  # Already sorted by rating/downloads
        file_id = best_result["file_id"]

        subtitle_content = await self.opensubtitles.download_subtitle(
            file_id=file_id,
            content_id=str(content.id),
            language=language
        )

        if not subtitle_content:
            return None

        # Parse and save subtitle
        return await self._save_subtitle(
            content=content,
            language=language,
            subtitle_content=subtitle_content,
            source="opensubtitles",
            external_id=file_id,
            external_url=best_result.get("download_url")
        )

    async def _try_tmdb(
        self,
        content: Content,
        language: str
    ) -> Optional[SubtitleTrackDoc]:
        """Try to fetch subtitle from TMDB"""
        # Note: TMDB may not have direct subtitle downloads
        # This is a placeholder for future implementation
        logger.info(f"ℹ️ TMDB subtitle fetching not yet implemented")
        return None

    async def _save_subtitle(
        self,
        content: Content,
        language: str,
        subtitle_content: str,
        source: str,
        external_id: Optional[str] = None,
        external_url: Optional[str] = None
    ) -> SubtitleTrackDoc:
        """Parse and save subtitle to database"""
        try:
            # Parse subtitle content (detect format from content)
            format_type = "srt" if "-->" in subtitle_content and "," in subtitle_content else "vtt"
            track = parse_subtitles(subtitle_content, format_type)

            # Convert to database models
            cues = [
                SubtitleCueModel(
                    index=cue.index,
                    start_time=cue.start_time,
                    end_time=cue.end_time,
                    text=cue.text,
                    text_nikud=cue.text_nikud
                )
                for cue in track.cues
            ]

            # Create subtitle track document
            subtitle_doc = SubtitleTrackDoc(
                content_id=str(content.id),
                content_type="vod",
                language=language,
                language_name=LANGUAGE_NAMES.get(language, language.upper()),
                format=format_type,
                cues=cues,
                is_auto_generated=False,
                source=source,
                external_id=external_id,
                external_url=external_url,
                download_date=datetime.utcnow()
            )
            await subtitle_doc.insert()

            # Update content metadata
            if not content.has_subtitles:
                content.has_subtitles = True

            if language not in content.available_subtitle_languages:
                content.available_subtitle_languages.append(language)

            await content.save()

            logger.info(
                f"✅ Saved {len(cues)} subtitle cues for '{content.title}' "
                f"({language}) from {source}"
            )

            return subtitle_doc

        except Exception as e:
            logger.error(f"❌ Failed to save subtitle: {str(e)}")
            return None

    async def batch_fetch_subtitles(
        self,
        content_ids: List[str],
        languages: List[str],
        max_downloads: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Batch process multiple content items.
        Respects daily quota limits.

        IMPORTANT: OpenSubtitles is limited to 3 languages maximum.
        Priority: Hebrew (he), English (en), Spanish (es)
        Languages should be pre-filtered before calling this method.

        Returns:
        {
            "processed": 15,
            "success": 12,
            "failed": 3,
            "quota_remaining": 5,
            "details": [...]
        }
        """
        # Enforce 3-language limit for OpenSubtitles
        if len(languages) > 3:
            logger.warning(
                f"⚠️ OpenSubtitles limited to 3 languages. Received {len(languages)}: {languages}. "
                f"Using first 3: {languages[:3]}"
            )
            languages = languages[:3]
        # Check quota
        quota = await self.opensubtitles.check_quota_available()
        if max_downloads is None:
            max_downloads = quota["remaining"]
        else:
            max_downloads = min(max_downloads, quota["remaining"])

        logger.info(
            f"🚀 Starting batch subtitle fetch: {len(content_ids)} items, "
            f"{len(languages)} languages, max {max_downloads} downloads"
        )

        processed = 0
        success_count = 0
        failed_count = 0
        details = []

        # Prioritize content
        priority_content = await self.prioritize_content_for_fetching(
            content_ids=content_ids,
            limit=max_downloads
        )

        for content in priority_content:
            for language in languages:
                # Check if we've reached download limit
                current_quota = await self.opensubtitles.check_quota_available()
                if current_quota["remaining"] <= 0:
                    logger.warning("⚠️ Download quota exhausted - stopping batch operation")
                    break

                # Try to fetch subtitle
                track = await self.fetch_subtitle_for_content(
                    content_id=str(content.id),
                    language=language,
                    sources=["opensubtitles"]  # Only OpenSubtitles for batch operations
                )

                processed += 1

                if track:
                    success_count += 1
                    details.append({
                        "content_id": str(content.id),
                        "title": content.title,
                        "language": language,
                        "status": "success",
                        "source": track.source
                    })
                else:
                    failed_count += 1
                    details.append({
                        "content_id": str(content.id),
                        "title": content.title,
                        "language": language,
                        "status": "failed"
                    })

        final_quota = await self.opensubtitles.check_quota_available()

        result = {
            "processed": processed,
            "success": success_count,
            "failed": failed_count,
            "quota_remaining": final_quota["remaining"],
            "quota_used": final_quota["used"],
            "details": details
        }

        logger.info(
            f"✅ Batch operation complete: {success_count}/{processed} successful, "
            f"{final_quota['remaining']} quota remaining"
        )

        return result

    async def prioritize_content_for_fetching(
        self,
        content_ids: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[Content]:
        """
        Identify content items that need subtitles.
        Priority: recent uploads → missing required languages → popular content
        """
        query = Content.find()

        # Filter by provided IDs if specified
        if content_ids:
            # Convert string IDs to PydanticObjectIds for MongoDB query
            try:
                object_ids = [PydanticObjectId(cid) for cid in content_ids]
                query = query.find({"_id": {"$in": object_ids}})
            except Exception as e:
                logger.error(f"Failed to convert content IDs to ObjectIds: {e}")
                return []

        # Find content with IMDB IDs (required for OpenSubtitles)
        query = query.find(Content.imdb_id != None)

        # Sort by creation date (newest first)
        query = query.sort([("created_at", -1)])

        # Limit results
        query = query.limit(limit)

        content_list = await query.to_list()

        # Filter to items missing required languages
        from app.core.config import settings
        required_languages = ["he", "en", "es"]  # Default required languages

        priority_content = []
        for content in content_list:
            missing_languages = [
                lang for lang in required_languages
                if lang not in content.available_subtitle_languages
            ]
            if missing_languages:
                priority_content.append(content)

        logger.info(
            f"📊 Prioritized {len(priority_content)} content items needing subtitles "
            f"(from {len(content_list)} total)"
        )

        return priority_content

    async def check_cache(
        self,
        content_id: str,
        language: str
    ) -> Optional[Dict[str, Any]]:
        """Check SubtitleSearchCacheDoc for cached results"""
        cache = await SubtitleSearchCacheDoc.get_cached_search(content_id, language)
        if cache:
            return {
                "found": cache.found,
                "source": cache.source,
                "external_id": cache.external_id,
                "external_url": cache.external_url,
                "cached_at": cache.search_date
            }
        return None

    async def search_subtitle_sources(
        self,
        content_id: str,
        language: str,
        sources: List[str] = ["opensubtitles", "tmdb"]
    ) -> Dict[str, Any]:
        """
        Search for subtitles without downloading.
        Returns availability information from all sources.
        """
        # Check cache first
        cached = await self.check_cache(content_id, language)
        if cached:
            return {
                "found": cached["found"],
                "source": cached["source"],
                "sources": [cached["source"]] if cached["found"] else [],
                "cached": True
            }

        # Get content
        content = await Content.get(content_id)
        if not content:
            return {
                "found": False,
                "source": None,
                "sources": [],
                "cached": False,
                "error": "Content not found"
            }

        available_sources = []

        # Search OpenSubtitles
        if "opensubtitles" in sources:
            # Extract TV series info
            metadata = content.metadata or {}
            season_number = metadata.get("season_number") or metadata.get("season")
            episode_number = metadata.get("episode_number") or metadata.get("episode")
            parent_imdb_id = metadata.get("series_imdb_id") or metadata.get("parent_imdb_id")
            
            if content.imdb_id or parent_imdb_id or content.title:
                results = await self.opensubtitles.search_subtitles(
                    imdb_id=content.imdb_id,
                    language=language,
                    content_id=content_id,
                    parent_imdb_id=parent_imdb_id,
                    season_number=int(season_number) if season_number else None,
                    episode_number=int(episode_number) if episode_number else None,
                    query=content.title if not content.imdb_id and not parent_imdb_id else None
                )
                if results:
                    available_sources.append("opensubtitles")

        # Search TMDB (placeholder)
        if "tmdb" in sources and content.tmdb_id:
            # TMDB search not yet implemented
            pass

        return {
            "found": len(available_sources) > 0,
            "source": available_sources[0] if available_sources else None,
            "sources": available_sources,
            "cached": False
        }
