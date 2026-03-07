"""
BYOC Enrichment Pydantic Models and Helpers
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.external_subtitle_service import ExternalSubtitleService

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


async def enrich_single_item(enrich_req: BYOCEnrichRequest) -> BYOCEnrichResponse:
    """Core enrichment logic for a single BYOC item."""
    existing = await Content.find_one(
        Content.source_id == enrich_req.external_id,
        Content.source_provider == "byoc",
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
    duration_str = None
    if enrich_req.duration_seconds is not None:
        duration_str = format_duration(enrich_req.duration_seconds)
    content = await _upsert_content(existing, enrich_req, duration_str)
    content_id = str(content.id)
    subtitle_details, fetched = await _fetch_subtitles(content_id, enrich_req)
    if enrich_req.generate_interaction_moments and not content.supports_avatar_interaction:
        content.source_metadata = content.source_metadata or {}
        content.source_metadata["pending_interaction_generation"] = True
        await content.save()
        logger.info("Flagged content_id=%s for interaction generation", content_id)
    found, requested = len(fetched), len(enrich_req.subtitle_languages_requested)
    if found == requested:
        status = "full"
    elif found > 0:
        status = "partial"
    else:
        status = "none"
    return BYOCEnrichResponse(
        content_id=content_id,
        available_subtitle_languages=content.available_subtitle_languages,
        enrichment_status=status,
        subtitle_details=subtitle_details,
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
    content = Content(
        title=req.title, year=req.year, duration=duration_str,
        thumbnail=req.thumbnail_url, backdrop=req.backdrop_url, genre=req.genre,
        stream_url=req.stream_url or "", source_id=req.external_id,
        source_provider="byoc", content_type="vod", content_format="movie",
        imdb_id=req.imdb_id, tmdb_id=req.tmdb_id,
    )
    await content.insert()
    return content


async def _fetch_subtitles(
    content_id: str, enrich_req: BYOCEnrichRequest,
) -> Tuple[Dict[str, SubtitleDetail], List[str]]:
    """Fetch subtitles for requested languages, return details and found list."""
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
    return details, fetched
