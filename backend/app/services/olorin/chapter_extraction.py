"""Chapter extraction orchestrator for the training pipeline.

Routes native-first: tries yt-dlp's `--print-json` chapter metadata, and on
empty (or any failure) falls back to generic English AI chapter generation
from the transcript text. Persists results to the existing VideoChapters
collection so the existing read endpoints, no_chapters warnings, and admin
UI all light up automatically.

Returns ``(source, count)`` where source is one of:
  - ``youtube_native``     — chapters came from yt-dlp metadata
  - ``ai_transcript``      — chapters came from the Claude generator
  - ``ai_failed``          — both paths produced zero chapters

The stage handler treats ``ai_failed`` as a non-blocking soft failure: the
stage is marked COMPLETED with the source recorded as the stage error
marker so the UI can render a "no chapters available" badge without halting
finalization.
"""
import logging
from typing import Tuple

from app.models.chapters import ChapterItemModel, VideoChapters
from app.services.chapter_generator import (
    generate_chapters_from_transcript_generic,
)
from app.services.olorin.video_transcriber import (
    fetch_native_chapters_via_ytdlp,
)
from app.services.olorin.youtube_chapters_scraper import (
    fetch_native_chapters_via_html,
)
from app.services.youtube_validator.url_parser import is_youtube_url

logger = logging.getLogger(__name__)


class ChapterExtractionService:
    """Native-first chapter extractor with AI transcript fallback."""

    async def extract(
        self,
        *,
        content_id: str,
        content_title: str,
        video_url: str,
        transcript: str,
        duration_hint: float,
    ) -> Tuple[str, int]:
        """Run native probe then AI fallback. Persist on success.

        Returns (source_label, chapter_count).
        """
        native_chapters: list[dict] = []
        native_duration: float = duration_hint
        native_source_label = "ytdlp"

        if is_youtube_url(video_url):
            try:
                native_chapters, native_duration = (
                    await fetch_native_chapters_via_html(video_url)
                )
                native_source_label = "html_scrape"
            except Exception as exc:
                logger.info(
                    "chapter_extraction: html scrape probe failed, trying yt-dlp",
                    extra={"content_id": content_id, "error": str(exc)[:200]},
                )
                native_chapters = []

        if not native_chapters:
            try:
                native_chapters, native_duration = (
                    await fetch_native_chapters_via_ytdlp(video_url)
                )
                native_source_label = "ytdlp"
            except Exception as exc:
                logger.info(
                    "chapter_extraction: native probe failed, falling back to AI",
                    extra={"content_id": content_id, "error": str(exc)[:200]},
                )

        if native_chapters:
            items = [
                ChapterItemModel(
                    start_time=c["start_time"],
                    end_time=c["end_time"],
                    title=c["title"] or f"Chapter {idx + 1}",
                    title_en=c["title"] or f"Chapter {idx + 1}",
                    category="general",
                )
                for idx, c in enumerate(native_chapters)
            ]
            await VideoChapters.create_or_update(
                content_id=content_id,
                content_type="vod",
                content_title=content_title,
                chapters=items,
                total_duration=native_duration or duration_hint,
                source="youtube_native",
            )
            logger.info(
                "chapter_extraction: persisted %d native chapters",
                len(items),
                extra={
                    "content_id": content_id,
                    "native_source": native_source_label,
                },
            )
            return "youtube_native", len(items)

        if not transcript:
            logger.info(
                "chapter_extraction: no transcript, no chapters generated",
                extra={"content_id": content_id},
            )
            return "ai_failed", 0

        generated = await generate_chapters_from_transcript_generic(
            content_id=content_id,
            content_title=content_title,
            duration=duration_hint,
            transcript=transcript,
        )

        if not generated.chapters:
            return "ai_failed", 0

        items = [
            ChapterItemModel(
                start_time=c.start_time,
                end_time=c.end_time,
                title=c.title,
                title_en=c.title_en,
                category=c.category,
                summary=c.summary,
            )
            for c in generated.chapters
        ]
        await VideoChapters.create_or_update(
            content_id=content_id,
            content_type="vod",
            content_title=content_title,
            chapters=items,
            total_duration=generated.total_duration,
            source="ai_transcript",
        )
        logger.info(
            "chapter_extraction: persisted %d AI chapters",
            len(items),
            extra={"content_id": content_id},
        )
        return "ai_transcript", len(items)
