"""
Orchestrated B2B Ingest Pipeline

Submit once, get everything: transcription -> characters + subtitles +
trivia + search indexing, all tracked per-capability in an IngestJob.
"""

import asyncio
import uuid

from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.metering_service import metering_service

logger = get_logger(__name__)

ALL_CAPABILITIES = ("characters", "subtitles", "trivia", "search")


async def _fire_webhook(
    partner: IntegrationPartner,
    event_type: str,
    payload: dict,
) -> None:
    """Lazy-import webhook sender to avoid circular imports."""
    from app.api.routes.olorin.webhooks import send_webhook_event

    await send_webhook_event(partner, event_type, payload)


def _expand_capabilities(requested: list[str]) -> list[str]:
    """Expand 'all' into the full capability list."""
    if "all" in requested:
        return list(ALL_CAPABILITIES)
    return [c for c in requested if c in ALL_CAPABILITIES]


async def create_ingest_job(
    partner: IntegrationPartner,
    content: Content,
    video_url: str,
    capabilities: list[str],
    direct: bool = False,
) -> IngestJob:
    """Create and persist a new IngestJob.

    Args:
        partner: Owning partner record.
        content: Content document to process.
        video_url: Source video URL.
        capabilities: Processing stages to run.
        direct: When True, skip TMDB lookup and use transcript-only extraction.
                Set to True for training content which has no TMDB record.
    """
    caps = _expand_capabilities(capabilities)
    job = IngestJob(
        job_id=uuid.uuid4().hex,
        partner_id=partner.partner_id,
        content_id=str(content.id),
        video_url=video_url,
        direct=direct,
        capabilities={c: "pending" for c in caps},
    )
    await job.insert()
    return job


async def run_pipeline(job: IngestJob) -> None:
    """
    Execute the orchestrated pipeline.

    Order: transcribe first (other stages need transcript),
    then run remaining stages concurrently.
    """
    partner = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == job.partner_id,
    )
    content = await Content.get(job.content_id)
    if not content or not partner:
        job.error_detail = "Content or partner not found"
        await job.save()
        return

    transcript_text = getattr(content, "transcript", None) or ""

    # Stage 0: Transcribe (if not already cached on content)
    if not transcript_text:
        transcript_text = await _run_transcription(
            job, content, partner,
        )

    # Build concurrent stage tasks
    stages = []
    caps = job.capabilities
    if "characters" in caps:
        stages.append(
            _run_characters(job, content, partner, transcript_text),
        )
    if "subtitles" in caps:
        stages.append(
            _run_subtitles(job, content, partner, transcript_text),
        )
    if "trivia" in caps:
        stages.append(
            _run_trivia(job, content, partner, transcript_text),
        )
    if "search" in caps:
        stages.append(
            _run_search(job, content, partner),
        )

    if stages:
        await asyncio.gather(*stages, return_exceptions=True)

    logger.info(
        "Pipeline complete",
        extra={
            "job_id": job.job_id,
            "status": job.overall_status,
            "capabilities": job.capabilities,
        },
    )


# ---------------------------------------------------------------------------
# Individual pipeline stages
# ---------------------------------------------------------------------------

async def _run_transcription(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
) -> str:
    """Stage 0: Transcribe video via ElevenLabs Scribe."""
    from app.services.olorin.video_transcriber import transcribe_video

    try:
        result = await transcribe_video(job.video_url)
        if result.full_text:
            content.transcript = result.full_text
            content.transcript_segments = [
                {
                    "speaker": s.speaker,
                    "text": s.text,
                    "start": s.start,
                    "end": s.end,
                }
                for s in result.segments
            ]
            await content.save()
            logger.info(
                "Transcription saved",
                extra={
                    "job_id": job.job_id,
                    "segments": len(result.segments),
                },
            )
            return result.full_text
        return ""
    except Exception:
        logger.exception(
            "Transcription failed",
            extra={"job_id": job.job_id},
        )
        return ""


async def _run_characters(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
    transcript_text: str,
) -> None:
    """Stage: Extract characters (TMDB first, transcript fallback).

    When job.direct is True the TMDB lookup is bypassed entirely;
    extraction uses only the transcript (training content has no TMDB record).
    """
    from app.services.olorin.unified_extractor import extract_characters
    from app.services.olorin.speaker_extraction import (
        extract_speakers_from_transcript,
    )

    await job.update_capability("characters", "processing")
    try:
        if job.direct and transcript_text:
            # Training path: transcript captured by Stage 0; skip TMDB entirely.
            from app.services.olorin.video_transcriber import TranscriptSegment
            raw_segs = getattr(content, "transcript_segments", None) or []
            segments = [
                TranscriptSegment(
                    speaker=s.get("speaker", "Speaker"),
                    text=s.get("text", ""),
                    start=float(s.get("start", 0.0)),
                    end=float(s.get("end", 0.0)),
                )
                for s in raw_segs
            ]
            speaker_count = len({seg.speaker for seg in segments}) if segments else 1
            characters = await extract_speakers_from_transcript(
                segments=segments,
                speakers_count=speaker_count,
                video_title=content.title,
            )
        else:
            characters = await extract_characters(
                content,
                video_url=job.video_url,
                video_title=content.title,
            )
        content.interactive_characters = characters
        await content.save()

        await job.update_capability("characters", "completed")
        await metering_service.record_usage(
            partner_id=partner.partner_id,
            capability="video_ingest",
            metadata={
                "content_id": str(content.id),
                "characters": len(characters),
            },
        )
        await _fire_webhook(partner, "characters.completed", {
            "job_id": job.job_id,
            "content_id": str(content.id),
            "characters": len(characters),
        })
    except Exception:
        logger.exception(
            "Character extraction failed",
            extra={"job_id": job.job_id},
        )
        await job.update_capability("characters", "failed")
        await _fire_webhook(partner, "error.occurred", {
            "job_id": job.job_id,
            "stage": "characters",
        })


async def _run_subtitles(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
    transcript_text: str,
) -> None:
    """Stage: Generate multi-language subtitles from transcript."""
    from app.services.live_translation.service import (
        LiveTranslationService,
    )

    await job.update_capability("subtitles", "processing")
    try:
        if not transcript_text:
            await job.update_capability("subtitles", "failed")
            return

        translation_svc = LiveTranslationService()
        target_langs = ["en", "he", "es"]
        translated = 0

        for lang in target_langs:
            try:
                result = await translation_svc.translate_text(
                    transcript_text, "auto", lang,
                )
                if result:
                    translated += 1
            except Exception:
                logger.warning(
                    "Subtitle translation failed for language",
                    extra={"lang": lang, "job_id": job.job_id},
                )

        await job.update_capability("subtitles", "completed")
        await metering_service.record_usage(
            partner_id=partner.partner_id,
            capability="subtitles",
            metadata={
                "content_id": str(content.id),
                "languages_translated": translated,
            },
        )
        await _fire_webhook(partner, "subtitles.completed", {
            "job_id": job.job_id,
            "content_id": str(content.id),
            "languages": translated,
        })
    except Exception:
        logger.exception(
            "Subtitle generation failed",
            extra={"job_id": job.job_id},
        )
        await job.update_capability("subtitles", "failed")
        await _fire_webhook(partner, "error.occurred", {
            "job_id": job.job_id,
            "stage": "subtitles",
        })


async def _run_trivia(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
    transcript_text: str,
) -> None:
    """Stage: Generate trivia from content."""
    from app.services.trivia.trivia_generator import (
        TriviaGenerationService,
    )

    await job.update_capability("trivia", "processing")
    try:
        svc = TriviaGenerationService()
        trivia = await svc.generate_trivia(content=content, enrich=True)
        facts_count = len(trivia.facts) if trivia else 0

        await job.update_capability("trivia", "completed")
        await metering_service.record_usage(
            partner_id=partner.partner_id,
            capability="trivia",
            metadata={
                "content_id": str(content.id),
                "facts_generated": facts_count,
            },
        )
        await _fire_webhook(partner, "trivia.completed", {
            "job_id": job.job_id,
            "content_id": str(content.id),
            "facts": facts_count,
        })
    except Exception:
        logger.exception(
            "Trivia generation failed",
            extra={"job_id": job.job_id},
        )
        await job.update_capability("trivia", "failed")
        await _fire_webhook(partner, "error.occurred", {
            "job_id": job.job_id,
            "stage": "trivia",
        })


async def _run_search(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
) -> None:
    """Stage: Index content for semantic search."""
    from app.services.olorin.search.indexer import index_content

    await job.update_capability("search", "processing")
    try:
        result = await index_content(
            content_id=str(content.id),
            force_reindex=True,
            partner_id=partner.partner_id,
        )
        status = result.get("status", "failed")
        final = "completed" if status != "failed" else "failed"

        await job.update_capability("search", final)
        await metering_service.record_usage(
            partner_id=partner.partner_id,
            capability="semantic_search",
            metadata={
                "content_id": str(content.id),
                "index_status": status,
            },
        )
        if final == "completed":
            await _fire_webhook(partner, "search.completed", {
                "job_id": job.job_id,
                "content_id": str(content.id),
            })
        else:
            await _fire_webhook(partner, "error.occurred", {
                "job_id": job.job_id,
                "stage": "search",
                "error": result.get("error", ""),
            })
    except Exception:
        logger.exception(
            "Search indexing failed",
            extra={"job_id": job.job_id},
        )
        await job.update_capability("search", "failed")
        await _fire_webhook(partner, "error.occurred", {
            "job_id": job.job_id,
            "stage": "search",
        })
