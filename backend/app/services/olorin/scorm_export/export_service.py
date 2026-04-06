"""SCORM export pipeline orchestrator."""

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.content import Content
from app.models.scorm_export import (
    CharacterExportStatus,
    ScormExport,
)
from app.models.vod_interaction import ContentCharacter
from app.services.olorin.scorm_export.character_enricher import (
    enrich_character,
)
from app.services.olorin.scorm_export.content_expander import (
    ScormQAPair,
    ScormFollowUpChain,
    expand_character_qa,
)
from app.services.olorin.scorm_export.media_generator import (
    generate_lipsync_video,
    generate_tts_audio,
)
from app.services.olorin.scorm_export.package_builder import (
    PackageBuildContext,
    build_scorm_package,
)
from app.services.olorin.scorm_export.scorm_validator import (
    ScormValidationError,
    validate_scorm_package,
)

logger = get_logger(__name__)

_DEFAULT_VOICES = {
    settings.MOVIE_INTERACTION_DEFAULT_VOICE_MALE,
    settings.MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE,
}


def _resolve_tier(tier: str) -> str:
    """Normalize tier string."""
    if tier in ("team", "organization", "enterprise"):
        return tier
    return "team"


def _resolve_max_characters(tier: str) -> int:
    """Get max characters allowed for tier."""
    if tier == "enterprise":
        return 999
    if tier == "organization":
        return settings.SCORM_ORG_MAX_CHARACTERS
    return settings.SCORM_TEAM_MAX_CHARACTERS


def _should_expand(tier: str) -> bool:
    """Whether this tier gets Q&A expansion."""
    return tier in ("organization", "enterprise")


def _should_generate_media(tier: str) -> bool:
    """Whether this tier gets TTS + lip-sync."""
    return tier in ("organization", "enterprise")


async def _update_progress(
    export: ScormExport, status: str, pct: int
) -> None:
    """Update export status and progress."""
    export.status = status
    export.progress_pct = min(pct, 100)
    await export.save()


async def _download_bytes(url: str) -> Optional[bytes]:
    """Download file bytes from URL."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=120.0) as http:
            resp = await http.get(url)
            if resp.status_code == 200:
                return resp.content
    except Exception:
        logger.exception("Failed to download file", extra={"url": url[:80]})
    return None


def _serialize_characters(
    characters: List[ContentCharacter],
    char_qa: Dict[str, tuple],
) -> List[Dict]:
    """Serialize characters + Q&A for the SCORM manifest.json."""
    result = []
    for char in characters:
        qa_pairs, chains = char_qa.get(char.name, ([], []))
        result.append({
            "name": char.name,
            "profile_url": char.frame_url or "",
            "description": char.description or "",
            "qa_pairs": [
                {
                    "question": qa.question,
                    "response_text": qa.response_text,
                    "topic": qa.topic,
                    "difficulty": qa.difficulty,
                }
                for qa in qa_pairs
            ],
            "chains": [
                {
                    "exchanges": [
                        {
                            "question": ex.question,
                            "response_text": ex.response_text,
                        }
                        for ex in chain.exchanges
                    ],
                    "callback": (
                        {
                            "phrase": chain.callback.phrase,
                            "references_exchange": chain.callback.references_exchange,
                        }
                        if chain.callback
                        else None
                    ),
                }
                for chain in chains
            ],
        })
    return result


async def run_export_pipeline(export: ScormExport) -> None:
    """
    Run the full SCORM export pipeline.

    Stages: validate -> enrich -> expand -> audio -> video -> package -> validate.
    Updates export document throughout. Sets status=ready or status=failed.
    """
    try:
        # Stage 1: Validate
        await _update_progress(export, "pending", 2)
        content = await Content.get(export.content_id)
        if not content:
            export.status = "failed"
            export.error = "Content not found"
            await export.save()
            return

        characters: List[ContentCharacter] = (
            content.interactive_characters or []
        )
        if not characters:
            export.status = "failed"
            export.error = "Content has no extracted characters"
            await export.save()
            return

        tier = _resolve_tier(export.tier_at_export)
        max_chars = _resolve_max_characters(tier)

        if export.included_characters:
            characters = [
                c for c in characters
                if c.name in export.included_characters
            ]
        characters = characters[:max_chars]

        export.character_status = [
            CharacterExportStatus(name=c.name) for c in characters
        ]
        export.characters_included = len(characters)
        await _update_progress(export, "pending", 5)

        # Stage 2+3: Enrich faces and voices
        if _should_generate_media(tier):
            await _update_progress(export, "enriching_faces", 5)
            transcript_segments = (
                getattr(content, "transcript_segments", []) or []
            )
            video_url = content.stream_url or ""
            for i, char in enumerate(characters):
                await enrich_character(
                    character=char,
                    status=export.character_status[i],
                    video_url=video_url,
                    transcript_segments=transcript_segments,
                    export_id=str(export.id),
                    default_voices=_DEFAULT_VOICES,
                )
                pct = 5 + int((i + 1) / len(characters) * 25)
                await _update_progress(export, "enriching_voices", pct)

        # Stage 4: Expand Q&A
        char_qa: Dict[str, tuple] = {}
        if _should_expand(tier):
            await _update_progress(export, "expanding", 30)
            total_pairs = 0
            for i, char in enumerate(characters):
                qa_pairs, chains = await expand_character_qa(
                    character=char,
                    content_title=content.title or "",
                    num_pairs=settings.SCORM_QA_PAIRS_PER_CHARACTER,
                    num_chains=settings.SCORM_FOLLOW_UP_CHAINS,
                    chain_length=settings.SCORM_CHAIN_LENGTH,
                )
                char_qa[char.name] = (qa_pairs, chains)
                export.character_status[i].qa_expanded = len(qa_pairs) > 0
                total_pairs += len(qa_pairs)
                pct = 30 + int((i + 1) / len(characters) * 15)
                await _update_progress(export, "expanding", pct)
            export.qa_pairs_generated = total_pairs
        else:
            for char in characters:
                qa_pairs = [
                    ScormQAPair(
                        question=q,
                        response_text="",
                        topic="background",
                        difficulty="basic",
                    )
                    for q in (char.suggested_questions or [])
                ]
                char_qa[char.name] = (qa_pairs, [])

        # Stage 5: Generate TTS audio
        media_files: Dict[str, bytes] = {}
        if _should_generate_media(tier):
            await _update_progress(export, "generating_audio", 45)
            for i, char in enumerate(characters):
                qa_pairs, chains = char_qa.get(char.name, ([], []))
                for j, qa in enumerate(qa_pairs):
                    filename = f"q{j+1:02d}.mp3"
                    audio_url = await generate_tts_audio(
                        text=qa.response_text,
                        voice_id=char.voice_id,
                        export_id=str(export.id),
                        filename=f"{char.name}/{filename}",
                    )
                    if audio_url:
                        audio_bytes = await _download_bytes(audio_url)
                        if audio_bytes:
                            rel = (
                                f"content/characters/{char.name}"
                                f"/qa/{filename}"
                            )
                            media_files[rel] = audio_bytes
                export.character_status[i].audio_generated = True
                pct = 45 + int((i + 1) / len(characters) * 15)
                await _update_progress(export, "generating_audio", pct)

        # Stage 6: Generate lip-sync video
        if _should_generate_media(tier):
            await _update_progress(export, "generating_video", 60)
            for i, char in enumerate(characters):
                qa_pairs, chains = char_qa.get(char.name, ([], []))
                for j, qa in enumerate(qa_pairs):
                    filename = f"q{j+1:02d}.mp4"
                    video_url = await generate_lipsync_video(
                        text=qa.response_text,
                        voice_id=char.voice_id,
                        face_url=char.frame_url or "",
                        export_id=str(export.id),
                        filename=f"{char.name}/{filename}",
                    )
                    if video_url:
                        video_bytes = await _download_bytes(video_url)
                        if video_bytes:
                            rel = (
                                f"content/characters/{char.name}"
                                f"/qa/{filename}"
                            )
                            media_files[rel] = video_bytes
                export.character_status[i].video_generated = True
                pct = 60 + int((i + 1) / len(characters) * 30)
                await _update_progress(export, "generating_video", pct)

        # Add character profile images
        for char in characters:
            if char.frame_url:
                img_bytes = await _download_bytes(char.frame_url)
                if img_bytes:
                    rel = f"content/characters/{char.name}/profile.jpg"
                    media_files[rel] = img_bytes

        # Stage 7: Build package
        await _update_progress(export, "packaging", 90)
        serialized = _serialize_characters(characters, char_qa)

        embedded_video = None
        if export.video_source == "embedded" and content.stream_url:
            embedded_video = await _download_bytes(content.stream_url)

        ctx = PackageBuildContext(
            export_id=str(export.id),
            content_id=export.content_id,
            content_title=content.title or "Untitled",
            video_url=content.stream_url or "",
            video_source=export.video_source,
            export_token=export.export_token,
            api_base_url=settings.SCORM_API_BASE_URL,
            completion_rule=export.completion_rule,
            video_threshold_pct=export.video_threshold_pct,
            quiz_pass_pct=export.quiz_pass_pct,
            mastery_score=export.quiz_pass_pct,
            characters=serialized,
            media_files=media_files,
            embedded_video_bytes=embedded_video,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = str(
                Path(tmpdir) / f"olorin-scorm-{export.content_id}.zip"
            )
            build_scorm_package(ctx, zip_path)

            # Stage 8: Validate
            await _update_progress(export, "validating", 98)
            try:
                validate_scorm_package(zip_path)
            except ScormValidationError as e:
                export.status = "failed"
                export.error = f"SCORM validation failed: {e}"
                await export.save()
                return

            zip_bytes = Path(zip_path).read_bytes()
            gcs_path = (
                f"{settings.SCORM_EXPORT_GCS_PREFIX}/{export.id}"
                f"/olorin-scorm-{export.content_id}.zip"
            )
            package_url = await storage_service.upload_bytes(
                zip_bytes, gcs_path, "application/zip"
            )

        export.package_url = package_url
        export.package_size_bytes = len(zip_bytes)
        export.status = "ready"
        export.completed_at = datetime.now(timezone.utc)
        export.progress_pct = 100
        await export.save()

        logger.info(
            "SCORM export complete",
            extra={
                "export_id": str(export.id),
                "characters": export.characters_included,
                "qa_pairs": export.qa_pairs_generated,
                "size_bytes": export.package_size_bytes,
            },
        )

    except Exception:
        logger.exception(
            "SCORM export pipeline failed",
            extra={"export_id": str(export.id)},
        )
        export.status = "failed"
        export.error = "Export pipeline failed unexpectedly"
        await export.save()
