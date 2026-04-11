"""
Orchestrated B2B Ingest Pipeline

Submit once, get everything: transcription -> characters + subtitles +
trivia + search indexing, all tracked per-capability in an IngestJob.
"""

import asyncio
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.content import Content, ProcessingState
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.models.pipeline_stage import StageName, StageStatus
from app.services.olorin.face_extraction import (
    FaceExtractionError,
    FaceExtractionService,
    NoFaceDetectedError,
)
from app.services.olorin.metering_service import metering_service
from app.services.olorin.resumable_ingest import ResumablePipelineRunner
from app.services.olorin.video_transcriber import transcribe_video

# Canonical marker stamped on a face_extraction subtask when the admin
# used the Task 11 portrait upload endpoint to hand-supply a frame.
# The frontend's isManuallyResolved() helper keys on any non-null
# error field on a COMPLETED subtask; this marker guarantees the
# badge renders even on characters that never had a prior YuNet
# failure to stamp the error field for us.
MANUAL_PORTRAIT_UPLOAD_MARKER = "manually-resolved:portrait-upload"

from app.services.vod_interaction.dialogue_mapper import dialogue_mapper_service
from app.services.vod_interaction.voice_cloner import (
    character_voice_cloner_service,
    find_subtitle_track,
)

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
    """Drive the full training ingest pipeline with resumable stages.

    Flow:
    1. Flip Content.processing_state to PROCESSING
    2. Run all pipeline stages via ResumablePipelineRunner in declared order
    3. On any stage failure, flip processing_state to FAILED
    4. _run_finalization stage flips to READY on success
    """
    content = await Content.get(job.content_id)
    if content:
        content.processing_state = ProcessingState.PROCESSING
        await content.save()

    runner = _build_runner()
    await runner.run_all(job)

    if job.first_failed_stage() is not None:
        logger.warning(
            "pipeline failed for job %s at stage %s",
            job.job_id, job.first_failed_stage().name.value,
        )
        content = await Content.get(job.content_id)
        if content:
            content.processing_state = ProcessingState.FAILED
            await content.save()

    logger.info(
        "Pipeline complete",
        extra={
            "job_id": job.job_id,
            "capabilities": job.capabilities,
        },
    )


async def resume_pipeline(job: IngestJob) -> None:
    """Resume a failed pipeline from its first non-completed stage."""
    runner = _build_runner()
    await runner.resume(job)
    await _sync_content_state(job)


async def retry_stage(job: IngestJob, stage_name: StageName) -> None:
    """Retry a specific stage (resets it + continues forward)."""
    runner = _build_runner()
    await runner.retry_stage(job, stage_name)
    await _sync_content_state(job)


async def retry_subtask(
    job: IngestJob, stage_name: StageName, subtask: str,
) -> None:
    """Retry a single subtask (e.g. one character's voice clone) within a stage."""
    runner = _build_runner()
    await runner.retry_subtask(job, stage_name, subtask)
    await _sync_content_state(job)


async def _sync_content_state(job: IngestJob) -> None:
    """Update Content.processing_state based on the job's current stage state.

    Invariant: if any stage is FAILED, content is FAILED. If the FINALIZATION
    stage is COMPLETED, content is READY. In-progress runs leave
    processing_state alone.

    The READY flip handles the retry-success case: when a mid-pipeline stage
    is retried and the runner continues forward, FINALIZATION may already be
    COMPLETED from a prior run (the runner skips completed stages). In that
    scenario _run_finalization never fires in this run, so without this check
    processing_state would stay FAILED even though the pipeline succeeded.
    """
    content = await Content.get(job.content_id)
    if not content:
        return

    if job.first_failed_stage() is not None:
        content.processing_state = ProcessingState.FAILED
        await content.save()
        return

    finalization = job.get_stage(StageName.FINALIZATION)
    if finalization is not None and finalization.status == StageStatus.COMPLETED:
        content.processing_state = ProcessingState.READY
        await content.save()


def _build_runner() -> ResumablePipelineRunner:
    """Construct a ResumablePipelineRunner with all stage handlers."""
    return ResumablePipelineRunner(stage_handlers={
        StageName.TRANSCRIPTION: _stage_transcription,
        StageName.CHARACTER_EXTRACTION: _stage_character_extraction,
        StageName.SUBTITLES: _stage_subtitles,
        StageName.FACE_EXTRACTION: _run_face_extraction,
        StageName.VOICE_CLONING: _run_voice_cloning,
        StageName.TRIVIA: _stage_trivia,
        StageName.SEARCH_INDEX: _stage_search,
        StageName.FINALIZATION: _run_finalization,
    })


async def _fetch_partner(partner_id: str) -> IntegrationPartner:
    partner = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == partner_id,
    )
    if not partner:
        raise RuntimeError(f"partner {partner_id!r} not found")
    return partner


async def _stage_transcription(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Adapter: wraps legacy _run_transcription for the ResumablePipelineRunner."""
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(f"content {job.content_id} not found")
    partner = await _fetch_partner(job.partner_id)
    transcript_text = getattr(content, "transcript", None) or ""
    if not transcript_text:
        await _run_transcription(job, content, partner)


async def _stage_character_extraction(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Adapter: wraps legacy _run_characters for the ResumablePipelineRunner."""
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(f"content {job.content_id} not found")
    partner = await _fetch_partner(job.partner_id)
    transcript_text = getattr(content, "transcript", None) or ""
    await _run_characters(job, content, partner, transcript_text)


async def _stage_subtitles(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Adapter: wraps legacy _run_subtitles for the ResumablePipelineRunner."""
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(f"content {job.content_id} not found")
    partner = await _fetch_partner(job.partner_id)
    transcript_text = getattr(content, "transcript", None) or ""
    await _run_subtitles(job, content, partner, transcript_text)


async def _stage_trivia(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Adapter: wraps legacy _run_trivia for the ResumablePipelineRunner."""
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(f"content {job.content_id} not found")
    partner = await _fetch_partner(job.partner_id)
    transcript_text = getattr(content, "transcript", None) or ""
    await _run_trivia(job, content, partner, transcript_text)


async def _stage_search(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Adapter: wraps legacy _run_search for the ResumablePipelineRunner."""
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(f"content {job.content_id} not found")
    partner = await _fetch_partner(job.partner_id)
    await _run_search(job, content, partner)


# ---------------------------------------------------------------------------
# Individual pipeline stages
# ---------------------------------------------------------------------------

class DurationLimitExceeded(RuntimeError):
    """Raised when a transcribed video exceeds the partner's tier duration limit."""


async def _run_transcription(
    job: IngestJob,
    content: Content,
    partner: IntegrationPartner,
) -> str:
    """Stage 0: Transcribe video via ElevenLabs Scribe.

    Also enforces per-tier duration limits:
      trial        -> TRAINING_MAX_DURATION_TRIAL_SECONDS (default 1800)
      team         -> TRAINING_MAX_DURATION_TEAM_SECONDS  (default 7200)
      organization -> unlimited (0)

    Failure modes all propagate as exceptions so the ResumablePipelineRunner
    can mark the stage FAILED and halt the pipeline:

      - yt-dlp / HTTP download error → RuntimeError from transcribe_video
      - ElevenLabs Scribe error      → httpx.HTTPStatusError from transcribe_video
      - Over-limit duration           → DurationLimitExceeded
      - Empty transcript result       → RuntimeError

    The pre-fix behavior of silently returning "" and letting downstream
    stages march forward was the root cause of the Task 20 silent-failure
    incident: an unavailable YouTube URL produced an 8-stage run where
    every stage recorded RUNNING but content ended up READY.
    """
    result = await transcribe_video(job.video_url)

    # Duration gate -- check after transcription because that's when we
    # first know the real duration. ElevenLabs is billed for this call
    # regardless, but all downstream LLM stages are skipped on failure.
    tc = partner.training_config
    tier = (
        tc.get("org_tier", "trial") if isinstance(tc, dict)
        else getattr(tc, "org_tier", "trial")
    )
    _TIER_LIMITS = {
        "trial": settings.TRAINING_MAX_DURATION_TRIAL_SECONDS,
        "team": settings.TRAINING_MAX_DURATION_TEAM_SECONDS,
    }
    max_seconds = _TIER_LIMITS.get(tier, 0)  # 0 = unlimited (organization)

    if max_seconds > 0 and result.duration_seconds > max_seconds:
        limit_min = max_seconds // 60
        actual_min = int(result.duration_seconds / 60)
        message = (
            f"Video too long ({actual_min} min). "
            f"{tier.title()} tier limit: {limit_min} min. "
            "Upgrade your plan or use a shorter video."
        )
        job.error_detail = message
        for cap in job.capabilities:
            job.capabilities[cap] = "failed"
        job.updated_at = datetime.now(timezone.utc)
        await job.save()
        logger.warning(
            "Video rejected: duration exceeds tier limit",
            extra={
                "job_id": job.job_id,
                "duration_seconds": result.duration_seconds,
                "max_seconds": max_seconds,
                "tier": tier,
            },
        )
        raise DurationLimitExceeded(message)

    if not result.full_text:
        raise RuntimeError(
            "transcription produced no text (audio may be silent, "
            "empty, or unrecognized language)"
        )

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
        # Re-raise so ResumablePipelineRunner marks the stage FAILED and
        # halts the pipeline. Silent return was the root cause of the
        # Task 20 silent-failure incident (see silent-failure plan doc).
        raise


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
            raise RuntimeError(
                "cannot generate subtitles: transcript is empty "
                "(upstream transcription stage produced no text)"
            )

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
        raise


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
        raise


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
            raise RuntimeError(
                f"search index returned failure status: "
                f"{result.get('error') or status}"
            )
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
        raise


# ---------------------------------------------------------------------------
# New resumable-pipeline stage handlers (7C)
# ---------------------------------------------------------------------------

async def _download_video(video_url: str, tmpdir: Path) -> Path:
    """Download video_url into tmpdir and return the local Path."""
    suffix = Path(video_url.split("?")[0]).suffix or ".mp4"
    dest = tmpdir / f"video{suffix}"
    async with httpx.AsyncClient(follow_redirects=True, timeout=300) as client:
        async with client.stream("GET", video_url) as resp:
            resp.raise_for_status()
            with dest.open("wb") as fh:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    fh.write(chunk)
    return dest


async def _build_cue_map_for_face_extraction(content) -> dict:
    """Return ``{character_name: [SubtitleCueModel, ...]}`` for face extraction.

    Source-of-truth priority:

    1. A persisted ``SubtitleTrack`` if one exists (classic VOD path).
    2. The transcript segments captured by Stage 0 transcription,
       converted into synthetic ``SubtitleCueModel`` instances. This is
       the training path: training content rarely has an external
       subtitle track, but every row runs ElevenLabs Scribe, which
       produces diarized segments on ``content.transcript_segments``.
    3. **Single-speaker short-circuit.** When the transcript has exactly
       one speaker AND the content has exactly one character, we skip
       the LLM dialogue mapper entirely and assign every segment to that
       character directly. The mapper was built for multi-speaker drama
       where Claude has to infer who said what from context — for a
       solo-instructor tutorial it's strictly harmful because it can
       reject mappings it's not confident about, returning ``{}``.

    Without this short-circuit, solo-speaker training videos (the 90%
    case) silently fail face extraction with "no speech segments for
    character", which was the root cause of the Task 20 regression
    after all the other pipeline bugs were fixed.
    """
    from app.models.subtitles import SubtitleCueModel

    characters = content.interactive_characters or []
    character_names = [c.name for c in characters]

    # --- Path 1: real subtitle track ---
    track = await find_subtitle_track(str(content.id))
    if track and track.cues:
        return await dialogue_mapper_service.map_dialogue_to_characters(
            track.cues, character_names, content.title or str(content.id),
        )

    # --- Synthesize cues from transcript segments ---
    raw_segments = getattr(content, "transcript_segments", None) or []
    if not raw_segments:
        logger.info(
            "face_extraction: no transcript segments and no subtitle track",
            extra={"content_id": str(content.id)},
        )
        return {}

    # Split each segment longer than SUBDIVISION_THRESHOLD_S into windows
    # of ~SUBDIVISION_WINDOW_S so the ranker has multiple candidate
    # timestamps across the video instead of a single midpoint. ElevenLabs
    # Scribe often returns one massive segment for solo-speaker monologues
    # (the Task 20 tutorial had a single 566s segment), which gave YuNet
    # exactly one frame to try at the exact midpoint — a coin-flip
    # against screen-share / slide moments. Short windows give fallback
    # candidates and convert face extraction into a sampling exercise.
    SUBDIVISION_THRESHOLD_S = 60.0
    SUBDIVISION_WINDOW_S = 30.0

    def _synthesize_cues(seg_list: list) -> list:
        out: list = []
        idx = 0
        for seg in seg_list:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", 0.0))
            text = seg.get("text", "")
            duration = end - start
            if duration <= SUBDIVISION_THRESHOLD_S:
                out.append(SubtitleCueModel(
                    index=idx, start_time=start, end_time=end, text=text,
                ))
                idx += 1
                continue
            # Subdivide into windows of SUBDIVISION_WINDOW_S. The text
            # field is preserved across all windows — the face
            # extractor does not read it, and the dialogue mapper path
            # (not taken for single-speaker short-circuit) treats the
            # whole span as a contiguous monologue.
            cursor = start
            while cursor < end:
                window_end = min(cursor + SUBDIVISION_WINDOW_S, end)
                out.append(SubtitleCueModel(
                    index=idx,
                    start_time=cursor,
                    end_time=window_end,
                    text=text,
                ))
                idx += 1
                cursor = window_end
        return out

    synthetic_cues = _synthesize_cues(raw_segments)

    # --- Path 3: single-speaker short-circuit ---
    unique_speakers = {s.get("speaker") for s in raw_segments}
    if len(unique_speakers) <= 1 and len(character_names) == 1:
        logger.info(
            "face_extraction: single-speaker short-circuit, assigning all "
            "cues to sole character",
            extra={
                "content_id": str(content.id),
                "character": character_names[0],
                "cue_count": len(synthetic_cues),
            },
        )
        return {character_names[0]: synthetic_cues}

    # --- Path 2: multi-speaker LLM mapping against synthetic cues ---
    return await dialogue_mapper_service.map_dialogue_to_characters(
        synthetic_cues, character_names, content.title or str(content.id),
    )


def _segments_for_character(
    cue_map: dict, character_name: str, content,
) -> list:
    """Return per-character speech segments for face extraction.

    Uses dialogue_mapper cue_map when available (preferred — accurate
    subtitle-based mapping). When cue_map is empty for this character,
    returns [] which causes FaceExtractionService to raise
    FaceExtractionError; the handler marks the subtask failed and the
    admin recovers via the manual portrait upload endpoint.

    We intentionally do NOT fall back to speaker-label indexing from
    raw transcript_segments because:
    1. ElevenLabs Scribe diarization uses its own speaker_id ordering
       ("speaker_0", "speaker_1") which does NOT correspond to the
       order characters appear in content.interactive_characters
       (which comes from Claude's text-based extraction).
    2. The index-based fallback would silently return segments for the
       wrong speaker, producing portraits of the wrong person.
    Failing loudly and falling back to manual upload is the correct
    recovery.
    """
    cues = cue_map.get(character_name, [])
    if not cues:
        return []
    return [
        {"start": c.start_time, "end": c.end_time, "text": c.text}
        for c in cues
    ]


async def _run_face_extraction(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Stage: Extract a portrait for each character using OpenCV YuNet.

    Subtask-aware: if resume_subtask is set, processes only that character.
    Falls back gracefully on NoFaceDetectedError (admin can upload manually).

    Persistence discipline: all subtask mutations go through the IngestJob
    atomic mutator methods (``mark_manual_portrait_subtask``,
    ``start_stage_subtask``, ``complete_stage_subtask``,
    ``fail_stage_subtask``) so no StageExecution reference is held across
    a ``save()`` — see ``resumable_ingest`` module docstring for the
    Beanie 2.0.1 orphan-reference advisory.
    """
    content = await Content.get(job.content_id)
    if not content or not content.interactive_characters:
        logger.info(
            "face_extraction: no characters to process",
            extra={"job_id": job.job_id},
        )
        return

    face_svc = FaceExtractionService(storage_service=storage_service)

    cue_map = await _build_cue_map_for_face_extraction(content)

    # Try downloading the video for frame extraction. On failure, ALL
    # characters get the default fallback avatar — the pipeline does NOT
    # halt. This covers expired YouTube cookies, removed videos, and
    # network blips, all of which previously blocked the entire ingest.
    video_path: Optional[Path] = None
    download_error: Optional[str] = None
    tmpdir_obj = tempfile.TemporaryDirectory()
    tmpdir_path = Path(tmpdir_obj.name)
    try:
        video_path = await _download_video(job.video_url, tmpdir_path)
    except Exception as exc:
        download_error = f"video download failed: {exc}"
        logger.warning(
            "face_extraction: video download failed, "
            "falling back to default avatar for all characters",
            extra={"job_id": job.job_id, "error": download_error[:200]},
        )

    try:
        for character in content.interactive_characters:
            if resume_subtask and character.name != resume_subtask:
                continue

            stage = job.get_or_create_stage(StageName.FACE_EXTRACTION)
            existing = stage.subtasks.get(character.name)
            if existing and existing.status == StageStatus.COMPLETED:
                continue

            if character.frame_url and character.portrait_source in (
                "custom_upload", "preset_avatar",
            ):
                await job.mark_manual_portrait_subtask(
                    StageName.FACE_EXTRACTION,
                    character.name,
                    MANUAL_PORTRAIT_UPLOAD_MARKER,
                )
                continue

            await job.start_stage_subtask(
                StageName.FACE_EXTRACTION, character.name,
            )

            # If video download failed, skip YuNet and go straight to fallback
            if download_error or video_path is None:
                await _apply_fallback_avatar(content, character, job)
                continue

            segments = _segments_for_character(cue_map, character.name, content)
            try:
                url = await face_svc.extract_portrait(
                    video_path=video_path,
                    character_name=character.name,
                    speech_segments=segments,
                    content_id=str(content.id),
                )
                character.frame_url = url
                character.portrait_source = "auto_detected"
                await content.save()
                await job.complete_stage_subtask(
                    StageName.FACE_EXTRACTION, character.name,
                )
            except (NoFaceDetectedError, FaceExtractionError) as exc:
                logger.info(
                    "face_extraction: YuNet failed for %s, "
                    "applying default fallback avatar",
                    character.name,
                    extra={"job_id": job.job_id, "error": str(exc)[:200]},
                )
                await _apply_fallback_avatar(content, character, job)
            except Exception as exc:
                logger.warning(
                    "face_extraction: unexpected error for %s, "
                    "applying default fallback avatar",
                    character.name,
                    extra={"job_id": job.job_id, "error": str(exc)[:200]},
                )
                await _apply_fallback_avatar(content, character, job)
    finally:
        tmpdir_obj.cleanup()


# Marker stamped on face_extraction subtasks that used the auto-fallback
# avatar. Distinguished from MANUAL_PORTRAIT_UPLOAD_MARKER so the
# frontend can render a "please review" badge prompting the admin to
# pick a better avatar.
FACE_FALLBACK_MARKER = "auto-fallback:default-avatar"


async def _apply_fallback_avatar(
    content: Content,
    character,
    job: IngestJob,
) -> None:
    """Assign the default preset avatar to a character after face detection failure.

    Non-blocking: marks the subtask COMPLETED with the fallback audit
    marker so the pipeline can continue through voice_cloning and beyond.
    The admin can always swap to a better avatar later via the portrait
    picker.
    """
    from app.services.olorin.avatar_gallery import (
        avatar_static_url as _avatar_url,
        get_default_fallback as _default_fallback,
        resolve_voice_id as _resolve_voice,
    )
    fallback = _default_fallback()
    character.frame_url = _avatar_url(fallback)
    character.portrait_source = "auto_fallback"
    character.preset_avatar_id = fallback["id"]
    if not character.voice_id:
        character.voice_id = _resolve_voice(fallback)
    await content.save()
    await job.mark_manual_portrait_subtask(
        StageName.FACE_EXTRACTION,
        character.name,
        FACE_FALLBACK_MARKER,
    )


async def _run_voice_cloning(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Stage: Clone voice for each character from subtitle dialogue.

    Subtask-aware: if resume_subtask is set, processes only that character.
    "skipped" status (no dialogue / audio too short) is treated as success.
    Uses atomic subtask mutators — no StageExecution refs across saves.
    """
    content = await Content.get(job.content_id)
    if not content or not content.interactive_characters:
        return

    for character in content.interactive_characters:
        if resume_subtask and character.name != resume_subtask:
            continue

        stage = job.get_or_create_stage(StageName.VOICE_CLONING)
        existing = stage.subtasks.get(character.name)
        if existing and existing.status == StageStatus.COMPLETED:
            continue

        # Voice cloning is ALWAYS attempted regardless of portrait_source.
        # The voice comes from the video audio, not from the face — a
        # stock avatar + the real instructor's cloned voice is the correct
        # default for screen-share tutorials where the instructor is
        # audible but not visible enough for YuNet. The preset voice_id
        # set by the fallback path is only a safety net; cloning replaces
        # it with the real voice when it succeeds.

        await job.start_stage_subtask(
            StageName.VOICE_CLONING, character.name,
        )

        try:
            result = await character_voice_cloner_service.clone_single_character(
                content=content, character_name=character.name,
            )
            if result.status in ("cloned", "skipped"):
                if result.status == "skipped":
                    logger.info(
                        "voice_cloning skipped for %s: %s",
                        character.name, result.reason,
                        extra={"job_id": job.job_id},
                    )
                await job.complete_stage_subtask(
                    StageName.VOICE_CLONING, character.name,
                )
            else:
                await job.fail_stage_subtask(
                    StageName.VOICE_CLONING,
                    character.name,
                    result.reason or "voice clone failed",
                )
        except Exception as exc:
            await job.fail_stage_subtask(
                StageName.VOICE_CLONING, character.name, str(exc),
            )


async def _run_finalization(
    job: IngestJob, resume_subtask: Optional[str] = None,
) -> None:
    """Stage: Mark content as READY (pipeline complete).

    Refuses to flip READY if any prior stage is FAILED. The runner's
    _run_forward normally short-circuits before reaching finalization
    when a stage fails, but this guard defends against:

      - Subtask retry paths that bypass the full forward pass
      - Future handlers that forget to raise on failure
      - Stale pipeline state from legacy or manually-edited job rows

    This is the defensive belt-and-suspenders fix from the Task 20
    silent-failure incident, where a broken YouTube download completed
    the entire pipeline as "finalized" despite zero content being
    produced.
    """
    failed = job.first_failed_stage()
    if failed is not None:
        raise RuntimeError(
            f"cannot finalize: stage {failed.name.value} is FAILED "
            f"({(failed.error or 'no error detail')[:200]})"
        )
    content = await Content.get(job.content_id)
    if not content:
        raise RuntimeError(
            f"content {job.content_id} not found during finalization"
        )
    content.processing_state = ProcessingState.READY
    await content.save()
    logger.info(
        "finalization: content marked READY",
        extra={"job_id": job.job_id, "content_id": job.content_id},
    )
