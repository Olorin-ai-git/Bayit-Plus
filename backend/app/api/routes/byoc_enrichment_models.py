"""
BYOC Enrichment Pydantic Models and Helpers
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.external_subtitle_service import ExternalSubtitleService
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)

logger = get_logger(__name__)

ENRICHMENT_CACHE_HOURS = 24
IPTV_MIN_TITLE_WORDS = 3
BATCH_MAX_ITEMS = 20


class BYOCEnrichRequest(BaseModel):
    source_type: str
    external_id: str
    title: str
    year: Optional[int] = None
    duration_seconds: Optional[int] = None
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    genre: Optional[str] = None
    stream_url: Optional[str] = None
    subtitle_languages_requested: List[str] = Field(
        default_factory=lambda: ["en", "he", "es"]
    )
    generate_interaction_moments: bool = False
    is_live: bool = False


class BYOCBatchEnrichRequest(BaseModel):
    items: List[BYOCEnrichRequest] = Field(..., max_length=BATCH_MAX_ITEMS)


class SubtitleDetail(BaseModel):
    language: str
    status: str
    source: Optional[str] = None


class BYOCEnrichResponse(BaseModel):
    content_id: str
    available_subtitle_languages: List[str]
    enrichment_status: str
    subtitle_details: Dict[str, SubtitleDetail]
    transcript_source: Optional[str] = None


class BYOCBatchResponse(BaseModel):
    job_id: str
    total_items: int
    status: str


class BYOCBatchStatusResponse(BaseModel):
    job_id: str
    status: str
    total_items: int
    completed: int
    failed: int
    results: List[Dict]


def format_duration(seconds: int) -> str:
    """Convert duration in seconds to H:MM:SS format."""
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}"


async def _run_byoc_extraction(content: Content) -> None:
    """Extract characters from a BYOC content item (requires tmdb_id)."""
    if not content.tmdb_id:
        logger.warning(
            "BYOC extraction skipped: no tmdb_id content_id=%s",
            str(content.id),
        )
        return
    try:
        characters = await character_extractor_service.extract_characters(content)
        if characters:
            content.interactive_characters = characters
            content.supports_avatar_interaction = True
            await content.save()
            logger.info(
                "BYOC character extraction complete content_id=%s characters=%d",
                str(content.id),
                len(characters),
            )
    except Exception:
        logger.exception(
            "BYOC character extraction failed content_id=%s",
            str(content.id),
        )


async def enrich_single_item(enrich_req: BYOCEnrichRequest) -> BYOCEnrichResponse:
    """Core enrichment logic for a single BYOC item."""
    source_provider = "youtube" if enrich_req.source_type == "youtube" else "byoc"
    existing = await Content.find_one(
        Content.source_id == enrich_req.external_id,
        Content.source_provider == source_provider,
    )
    if existing and existing.updated_at:
        cache_cutoff = datetime.utcnow() - timedelta(hours=ENRICHMENT_CACHE_HOURS)
        if existing.updated_at > cache_cutoff:
            logger.info("BYOC cache hit external_id=%s", enrich_req.external_id)
            return BYOCEnrichResponse(
                content_id=str(existing.id),
                available_subtitle_languages=existing.available_subtitle_languages,
                enrichment_status="cached",
                subtitle_details={},
            )
    if enrich_req.source_type == "youtube" and enrich_req.is_live:
        duration_str = None
        if enrich_req.duration_seconds is not None:
            duration_str = format_duration(enrich_req.duration_seconds)
        content = await _upsert_content(existing, enrich_req, duration_str)
        logger.info("Skipping enrichment for YouTube live content_id=%s", str(content.id))
        return BYOCEnrichResponse(
            content_id=str(content.id),
            available_subtitle_languages=[],
            enrichment_status="live_skip",
            subtitle_details={},
            transcript_source=None,
        )
    duration_str = None
    if enrich_req.duration_seconds is not None:
        duration_str = format_duration(enrich_req.duration_seconds)
    content = await _upsert_content(existing, enrich_req, duration_str)
    content_id = str(content.id)
    subtitle_details, fetched, transcript_source = await _fetch_subtitles(
        content_id, enrich_req
    )
    if enrich_req.generate_interaction_moments and not content.supports_avatar_interaction:
        await _run_byoc_extraction(content)
        logger.info("Triggered character extraction for BYOC content_id=%s", content_id)
    found, requested = len(fetched), len(enrich_req.subtitle_languages_requested)
    if found == requested:
        enrich_status = "full"
    elif found > 0:
        enrich_status = "partial"
    else:
        enrich_status = "none"
    return BYOCEnrichResponse(
        content_id=content_id,
        available_subtitle_languages=content.available_subtitle_languages,
        enrichment_status=enrich_status,
        subtitle_details=subtitle_details,
        transcript_source=transcript_source,
    )


async def _upsert_content(
    existing: Optional[Content], req: BYOCEnrichRequest, duration_str: Optional[str],
) -> Content:
    """Create or update a Content document for a BYOC item."""
    if existing:
        existing.title = req.title
        existing.year = req.year
        existing.duration = duration_str
        existing.thumbnail = req.thumbnail_url
        existing.backdrop = req.backdrop_url
        existing.genre = req.genre
        existing.stream_url = req.stream_url or existing.stream_url
        existing.imdb_id = req.imdb_id
        existing.tmdb_id = req.tmdb_id
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return existing
    source_provider = "youtube" if req.source_type == "youtube" else "byoc"
    content_type = "live" if req.is_live else "vod"
    content = Content(
        title=req.title, year=req.year, duration=duration_str,
        thumbnail=req.thumbnail_url, backdrop=req.backdrop_url, genre=req.genre,
        stream_url=req.stream_url or "", source_id=req.external_id,
        source_provider=source_provider, content_type=content_type,
        content_format="movie",
        imdb_id=req.imdb_id, tmdb_id=req.tmdb_id,
    )
    await content.insert()
    return content


def _extract_youtube_video_id(external_id: str) -> Optional[str]:
    """Extract the YouTube video ID from the BYOC external_id format (yt-{sourceId}-{videoId})."""
    parts = external_id.split("-", 2)
    if len(parts) >= 3 and parts[0] == "yt":
        return parts[2]
    return None


async def _fetch_youtube_transcript(
    video_id: str, languages: List[str],
) -> Tuple[Dict[str, SubtitleDetail], List[str], Optional[str]]:
    """Fetch YouTube captions via youtube-transcript-api (zero API quota cost)."""
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        NoTranscriptFound,
        TranscriptsDisabled,
        VideoUnavailable,
    )

    details: Dict[str, SubtitleDetail] = {}
    fetched: List[str] = []
    transcript_source: Optional[str] = None
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        for lang in languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                transcript_source = (
                    "youtube_manual" if not transcript.is_generated
                    else "youtube_auto_captions"
                )
                fetched.append(lang)
                details[lang] = SubtitleDetail(
                    language=lang, status="found", source=transcript_source,
                )
            except NoTranscriptFound:
                try:
                    generated = transcript_list.find_generated_transcript([lang])
                    transcript_source = "youtube_auto_captions"
                    fetched.append(lang)
                    details[lang] = SubtitleDetail(
                        language=lang, status="found",
                        source="youtube_auto_captions",
                    )
                except NoTranscriptFound:
                    details[lang] = SubtitleDetail(
                        language=lang, status="not_found",
                    )
    except (TranscriptsDisabled, VideoUnavailable):
        logger.warning("YouTube transcripts unavailable video_id=%s", video_id)
        for lang in languages:
            details[lang] = SubtitleDetail(
                language=lang, status="transcripts_disabled",
            )
    except Exception:
        logger.exception("YouTube transcript fetch failed video_id=%s", video_id)
        for lang in languages:
            details[lang] = SubtitleDetail(language=lang, status="error")
    return details, fetched, transcript_source


async def _fetch_subtitles(
    content_id: str, enrich_req: BYOCEnrichRequest,
) -> Tuple[Dict[str, SubtitleDetail], List[str], Optional[str]]:
    """Fetch subtitles for requested languages, return details, found list, and transcript source."""
    if enrich_req.source_type == "youtube":
        video_id = _extract_youtube_video_id(enrich_req.external_id)
        if video_id:
            yt_details, yt_fetched, yt_source = await _fetch_youtube_transcript(
                video_id, enrich_req.subtitle_languages_requested,
            )
            if yt_fetched:
                return yt_details, yt_fetched, yt_source
            logger.info(
                "YouTube captions unavailable, falling back to transcription "
                "content_id=%s video_id=%s",
                content_id, video_id,
            )
        else:
            logger.warning(
                "Could not extract YouTube video ID from external_id=%s",
                enrich_req.external_id,
            )
    subtitle_svc = ExternalSubtitleService()
    details: Dict[str, SubtitleDetail] = {}
    fetched: List[str] = []
    for lang in enrich_req.subtitle_languages_requested:
        if (
            enrich_req.source_type == "iptv"
            and len(enrich_req.title.split()) < IPTV_MIN_TITLE_WORDS
        ):
            logger.info("Skipping subtitle for short IPTV title=%s lang=%s", enrich_req.title, lang)
            details[lang] = SubtitleDetail(language=lang, status="skipped_short_title")
            continue
        try:
            track = await subtitle_svc.fetch_subtitle_for_content(content_id, lang)
            if track:
                fetched.append(lang)
                details[lang] = SubtitleDetail(language=lang, status="found", source=track.source)
            else:
                details[lang] = SubtitleDetail(language=lang, status="not_found")
        except Exception:
            logger.exception("Subtitle fetch failed content_id=%s lang=%s", content_id, lang)
            details[lang] = SubtitleDetail(language=lang, status="error")
    return details, fetched, None
