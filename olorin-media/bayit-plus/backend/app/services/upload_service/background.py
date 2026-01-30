"""
Background Tasks Module - Non-blocking enrichment operations

Handles background tasks like IMDB/TMDB lookup and subtitle extraction
that run after the main upload completes.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

import httpx

from app.core.config import settings
from app.models.upload import UploadJob
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


class BackgroundEnricher:
    """Handles background enrichment tasks for uploaded content."""

    def __init__(self, tmdb_service: Optional[TMDBService] = None):
        self.tmdb_service = tmdb_service or TMDBService()
        self._broadcast_callback: Optional[Callable[[], Awaitable[None]]] = None

    def set_broadcast_callback(self, callback: Callable[[], Awaitable[None]]):
        """Set callback for broadcasting queue updates."""
        self._broadcast_callback = callback

    async def _broadcast_update(self):
        """Broadcast queue update if callback is set."""
        if self._broadcast_callback:
            try:
                await self._broadcast_callback()
            except Exception as e:
                logger.error(f"Error broadcasting update: {e}")

    async def fetch_imdb_info(self, content_id: str, job_id: str):
        """
        Fetch IMDB/TMDB info in background without blocking the upload queue.
        Updates the content entry with enriched metadata.
        """
        try:
            logger.info(f"[Background] Starting IMDB/TMDB lookup for job {job_id}")

            imdb_start_time = datetime.now(timezone.utc)
            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                job.stages["imdb_lookup"] = "in_progress"
                job.stage_timings["imdb_lookup"] = {
                    "started": datetime.now(timezone.utc).isoformat()
                }
                await job.save()
                await self._broadcast_update()

            from beanie import PydanticObjectId

            from app.models.content import Content

            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                logger.error(f"[Background] Content not found: {content_id}")
                if job:
                    job.stages["imdb_lookup"] = "skipped"
                    await job.save()
                    await self._broadcast_update()
                return

            title = content.title or ""
            year = content.year

            if title:
                details = None
                is_tv_series = False

                # First try movie search
                search_results = await self.tmdb_service.search_movie(title, year=year)

                if search_results:
                    best_match = search_results[0]
                    tmdb_id = best_match.get("id")
                    if tmdb_id:
                        details = await self.tmdb_service.get_movie_details(tmdb_id)

                # If no movie found, try TV series
                if not details:
                    logger.info(
                        f"[Background] No movie match for '{title}', trying TV series..."
                    )
                    tv_result = await self.tmdb_service.search_tv_series(
                        title, year=year
                    )

                    if tv_result:
                        is_tv_series = True
                        tmdb_id = tv_result.get("id")
                        logger.info(
                            f"[Background] Found TV series match: {tv_result.get('name')} (TMDB ID: {tmdb_id})"
                        )

                        if tmdb_id:
                            try:
                                async with httpx.AsyncClient() as client:
                                    response = await client.get(
                                        f"https://api.themoviedb.org/3/tv/{tmdb_id}",
                                        params={
                                            "api_key": self.tmdb_service.api_key,
                                            "language": "en-US",
                                        },
                                    )
                                    if response.status_code == 200:
                                        details = response.json()
                            except Exception as e:
                                logger.warning(
                                    f"[Background] Failed to get TV details: {e}"
                                )

                if details:
                    await self._update_content_with_details(
                        content, details, tmdb_id, is_tv_series
                    )
                    logger.info(
                        f"[Background] Updated content with TMDB {'TV' if is_tv_series else 'movie'} data for job {job_id}"
                    )

            # Mark stage as completed
            if job:
                imdb_duration = (datetime.now(timezone.utc) - imdb_start_time).total_seconds()
                job.stages["imdb_lookup"] = "completed"
                job.stage_timings["imdb_lookup"][
                    "completed"
                ] = datetime.now(timezone.utc).isoformat()
                job.stage_timings["imdb_lookup"]["duration_seconds"] = round(
                    imdb_duration, 2
                )
                await job.save()
                await self._broadcast_update()

            logger.info(f"[Background] IMDB/TMDB lookup completed for job {job_id}")

        except Exception as e:
            logger.error(
                f"[Background] IMDB lookup failed for job {job_id}: {e}", exc_info=True
            )
            try:
                job = await UploadJob.find_one(UploadJob.job_id == job_id)
                if job:
                    job.stages["imdb_lookup"] = "skipped"
                    await job.save()
                    await self._broadcast_update()
            except Exception:
                pass

    async def _update_content_with_details(
        self, content: Any, details: dict, tmdb_id: int, is_tv_series: bool
    ):
        """Update content with TMDB details."""
        if details.get("overview") and not content.description:
            content.description = details["overview"]

        if details.get("poster_path"):
            content.thumbnail_url = (
                f"https://image.tmdb.org/t/p/w500{details['poster_path']}"
            )

        if details.get("backdrop_path") and not content.banner_url:
            content.banner_url = (
                f"https://image.tmdb.org/t/p/original{details['backdrop_path']}"
            )

        if details.get("genres"):
            content.genres = [g["name"] for g in details["genres"]]

        if details.get("vote_average"):
            content.rating = details["vote_average"]

        if details.get("runtime"):
            content.duration = details["runtime"] * 60
        elif details.get("episode_run_time") and len(details["episode_run_time"]) > 0:
            content.duration = details["episode_run_time"][0] * 60

        content.metadata = content.metadata or {}
        if details.get("imdb_id"):
            content.metadata["imdb_id"] = details["imdb_id"]
        content.metadata["tmdb_id"] = tmdb_id
        content.metadata["tmdb_type"] = "tv" if is_tv_series else "movie"

        if is_tv_series:
            content.metadata["series_name"] = details.get("name") or details.get(
                "original_name"
            )
            content.metadata["first_air_date"] = details.get("first_air_date")
            if details.get("number_of_seasons"):
                content.metadata["total_seasons"] = details["number_of_seasons"]

        await content.save()

    async def extract_subtitles(self, content_id: str, local_path: str, job_id: str):
        """
        Extract subtitles in background without blocking the upload queue.
        Runs as a separate async task after upload completes.
        """
        try:
            logger.info(f"[Background] Starting subtitle extraction for job {job_id}")

            subtitle_start_time = datetime.now(timezone.utc)
            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                job.stages["subtitle_extraction"] = "in_progress"
                job.stage_timings["subtitle_extraction"] = {
                    "started": datetime.now(timezone.utc).isoformat()
                }
                await job.save()
                await self._broadcast_update()

            if not os.path.exists(local_path):
                logger.warning(
                    f"[Background] Local file no longer exists: {local_path}"
                )
                if job:
                    job.stages["subtitle_extraction"] = "skipped"
                    await job.save()
                    await self._broadcast_update()
                return

            from beanie import PydanticObjectId

            from app.models.content import Content
            from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
            from app.services.ffmpeg_service import FFmpegService
            from app.services.subtitle_service import parse_srt

            ffmpeg = FFmpegService()

            extracted_subs = await ffmpeg.extract_all_subtitles(
                local_path,
                languages=["en", "he", "es"],
                max_parallel=3,
                max_subtitles=10,
            )

            if not extracted_subs:
                logger.info(f"[Background] No subtitles found for job {job_id}")
                return

            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                logger.error(f"[Background] Content not found: {content_id}")
                return

            saved_count = 0
            for sub_data in extracted_subs:
                try:
                    parsed_track = parse_srt(sub_data["content"])
                    subtitle_track = SubtitleTrackDoc(
                        content_id=content_id,
                        language=sub_data.get("language", "und"),
                        format=sub_data.get("format", "srt"),
                        source="embedded",
                        cues=[
                            SubtitleCueModel(
                                index=cue.index,
                                start_time=cue.start_time,
                                end_time=cue.end_time,
                                text=cue.text,
                            )
                            for cue in parsed_track.cues
                        ],
                    )
                    await subtitle_track.insert()
                    saved_count += 1
                except Exception as e:
                    logger.error(f"[Background] Failed to save subtitle: {e}")

            if saved_count > 0:
                content.subtitle_extraction_status = "completed"
                content.subtitle_last_checked = datetime.now(timezone.utc)
                existing_languages = set(
                    t.language
                    for t in await SubtitleTrackDoc.get_for_content(content_id)
                )
                content.available_subtitle_languages = sorted(list(existing_languages))
                await content.save()

            logger.info(
                f"[Background] Saved {saved_count} subtitle tracks for job {job_id}"
            )

            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                subtitle_duration = (
                    datetime.now(timezone.utc) - subtitle_start_time
                ).total_seconds()
                job.stages["subtitle_extraction"] = "completed"
                job.stage_timings["subtitle_extraction"][
                    "completed"
                ] = datetime.now(timezone.utc).isoformat()
                job.stage_timings["subtitle_extraction"]["duration_seconds"] = round(
                    subtitle_duration, 2
                )
                await job.save()
                await self._broadcast_update()

        except Exception as e:
            logger.error(
                f"[Background] Subtitle extraction failed for job {job_id}: {e}",
                exc_info=True,
            )
            try:
                job = await UploadJob.find_one(UploadJob.job_id == job_id)
                if job:
                    job.stages["subtitle_extraction"] = "skipped"
                    await job.save()
                    await self._broadcast_update()
            except Exception:
                pass


# Global background enricher instance
background_enricher = BackgroundEnricher()
