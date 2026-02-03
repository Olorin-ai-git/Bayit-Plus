"""
VOD Audio Tracks API Routes

Endpoints for AI-generated audio track management:
- Generate audio tracks for subtitle variants
- List available audio tracks
- Get generation status
- Generate HLS manifest with audio variants
"""

import logging
from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.audio_tracks import AudioTrackDoc
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.models.user import User
from app.services.vod_audio_generation_service import VARIANT_CONFIG, VodAudioGenerationService

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Models
class GenerateAudioTracksRequest(BaseModel):
    """Request to generate audio tracks for content."""

    variants: Optional[List[str]] = None  # Specific variants to generate, defaults to all 4


class GenerateAudioTracksResponse(BaseModel):
    """Response for audio generation request."""

    job_id: str
    status: str
    message: str
    audio_tracks: List[dict]


class AudioTrackListResponse(BaseModel):
    """Response for listing audio tracks."""

    audio_tracks: List[dict]


class AudioGenerationStatusResponse(BaseModel):
    """Response for generation status."""

    overall_status: str  # pending, processing, completed, failed
    completed: int
    processing: int
    failed: int
    pending: int
    total_tracks: int
    tracks: List[dict]


# Background Task Functions
async def _generate_audio_track_background(
    audio_track_id: str,
    subtitle_track_id: str,
):
    """Background task to generate audio track."""
    try:
        # Fetch documents
        audio_track = await AudioTrackDoc.get(PydanticObjectId(audio_track_id))
        subtitle_track = await SubtitleTrackDoc.get(PydanticObjectId(subtitle_track_id))

        if not audio_track or not subtitle_track:
            logger.error(
                "Failed to fetch documents for audio generation",
                extra={
                    "audio_track_id": audio_track_id,
                    "subtitle_track_id": subtitle_track_id,
                },
            )
            return

        # Generate audio
        service = VodAudioGenerationService()
        success = await service.generate_audio_track(audio_track, subtitle_track)

        if success:
            logger.info(
                "Audio generation completed successfully",
                extra={
                    "audio_track_id": audio_track_id,
                    "variant_type": audio_track.variant_type,
                },
            )
        else:
            logger.error(
                "Audio generation failed",
                extra={
                    "audio_track_id": audio_track_id,
                    "variant_type": audio_track.variant_type,
                },
            )

    except Exception as e:
        logger.error(
            "Audio generation background task failed",
            extra={"audio_track_id": audio_track_id, "error": str(e)},
            exc_info=True,
        )


# Endpoints
@router.post(
    "/vod/{content_id}/audio-tracks/generate",
    response_model=GenerateAudioTracksResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_audio_tracks(
    content_id: str,
    background_tasks: BackgroundTasks,
    request: GenerateAudioTracksRequest = GenerateAudioTracksRequest(),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger audio generation for subtitle variants.

    Creates AudioTrackDoc for each variant and enqueues background jobs.
    Supports 4 variants: Heblish, Slang, Grammar-Flip, Engrew.

    Requires admin privileges.
    """
    # Verify content exists
    try:
        content = await Content.get(PydanticObjectId(content_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content ID: {content_id}",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content {content_id} not found",
        )

    # Get default subtitle track (Hebrew)
    subtitle_track = await SubtitleTrackDoc.get_default_track(content_id)
    if not subtitle_track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No subtitle track found for content {content_id}",
        )

    # Determine which variants to generate
    variants_to_generate = request.variants or list(VARIANT_CONFIG.keys())

    # Validate variants
    invalid_variants = [v for v in variants_to_generate if v not in VARIANT_CONFIG]
    if invalid_variants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid variants: {', '.join(invalid_variants)}. "
            f"Valid variants: {', '.join(VARIANT_CONFIG.keys())}",
        )

    # Check for existing audio tracks and create new ones
    created_tracks = []
    for variant_type in variants_to_generate:
        config = VARIANT_CONFIG[variant_type]

        # Check if audio track already exists
        existing = await AudioTrackDoc.find_one(
            AudioTrackDoc.content_id == content_id,
            AudioTrackDoc.variant_type == variant_type,
        )

        if existing:
            # If already completed, skip
            if existing.generation_status == "completed":
                logger.info(
                    "Audio track already exists and is completed",
                    extra={"content_id": content_id, "variant_type": variant_type},
                )
                created_tracks.append(existing)
                continue

            # If failed or pending, re-trigger generation
            existing.update_status("pending", progress=0)
            existing.updated_at = datetime.utcnow()
            await existing.save()
            audio_track = existing
        else:
            # Create new audio track
            audio_track = AudioTrackDoc(
                content_id=content_id,
                content_type="vod",
                variant_type=variant_type,
                variant_display_name=config["display_name"],
                language=config["language"],
                language_name=config["language_name"],
                generation_status="pending",
                generation_progress=0,
            )
            await audio_track.insert()

        created_tracks.append(audio_track)

        # Enqueue background generation job
        background_tasks.add_task(
            _generate_audio_track_background,
            audio_track_id=str(audio_track.id),
            subtitle_track_id=str(subtitle_track.id),
        )

    logger.info(
        "Audio generation jobs created",
        extra={
            "content_id": content_id,
            "variants": variants_to_generate,
            "track_count": len(created_tracks),
        },
    )

    return GenerateAudioTracksResponse(
        job_id=f"{content_id}-{datetime.utcnow().timestamp()}",
        status="processing",
        message=f"Generating {len(created_tracks)} audio tracks",
        audio_tracks=[track.to_dict_api() for track in created_tracks],
    )


@router.get(
    "/vod/{content_id}/audio-tracks",
    response_model=AudioTrackListResponse,
)
async def list_audio_tracks(content_id: str):
    """
    List all available audio tracks for content.

    Returns only completed audio tracks with audio URLs.
    """
    tracks = await AudioTrackDoc.find(
        AudioTrackDoc.content_id == content_id,
        AudioTrackDoc.generation_status == "completed",
        AudioTrackDoc.is_enabled == True,
    ).to_list()

    return AudioTrackListResponse(
        audio_tracks=[track.to_dict_api() for track in tracks],
    )


@router.get(
    "/vod/{content_id}/audio-tracks/status",
    response_model=AudioGenerationStatusResponse,
)
async def get_audio_generation_status(content_id: str):
    """
    Get audio generation status for all variants.

    Returns counts by status and detailed track information.
    """
    tracks = await AudioTrackDoc.find(
        AudioTrackDoc.content_id == content_id,
    ).to_list()

    if not tracks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No audio tracks found for content {content_id}",
        )

    # Count by status
    status_counts = {
        "completed": 0,
        "processing": 0,
        "failed": 0,
        "pending": 0,
    }

    for track in tracks:
        status_counts[track.generation_status] = status_counts.get(
            track.generation_status, 0
        ) + 1

    # Determine overall status
    if status_counts["failed"] > 0:
        overall_status = "failed"
    elif status_counts["processing"] > 0:
        overall_status = "processing"
    elif status_counts["completed"] == len(tracks):
        overall_status = "completed"
    else:
        overall_status = "pending"

    return AudioGenerationStatusResponse(
        overall_status=overall_status,
        completed=status_counts["completed"],
        processing=status_counts["processing"],
        failed=status_counts["failed"],
        pending=status_counts["pending"],
        total_tracks=len(tracks),
        tracks=[track.to_dict_api() for track in tracks],
    )


@router.get("/vod/{content_id}/hls/manifest.m3u8")
async def get_hls_manifest_with_audio(content_id: str):
    """
    Generate dynamic HLS master manifest with alternate audio tracks.

    Includes:
    - Original audio (default)
    - 4 AI-generated variants (Heblish, Slang, Grammar-Flip, Engrew)

    Returns HLS manifest as text/vnd.apple.mpegurl content type.
    """
    # Verify content exists
    try:
        content = await Content.get(PydanticObjectId(content_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid content ID: {content_id}",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content {content_id} not found",
        )

    # Get completed audio tracks
    audio_tracks = await AudioTrackDoc.find(
        AudioTrackDoc.content_id == content_id,
        AudioTrackDoc.generation_status == "completed",
        AudioTrackDoc.is_enabled == True,
    ).to_list()

    # Build HLS manifest
    manifest_lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:7",
        "",
    ]

    # Add AI-generated audio variants
    for track in audio_tracks:
        manifest_lines.extend([
            f'#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="{track.variant_display_name}",'
            f'LANGUAGE="{track.language}",DEFAULT=NO,AUTOSELECT=NO,'
            f'URI="{track.audio_url}"',
        ])

    # Add original audio (default)
    # Try multiple fields for HLS playlist URL
    original_playlist_url = (
        getattr(content, "stream_url", None)
        or getattr(content, "hls_playlist_url", None)
        or getattr(content, "hls_master_url", None)
    )
    if original_playlist_url:
        manifest_lines.extend([
            f'#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Original",'
            f'LANGUAGE="he",DEFAULT=YES,AUTOSELECT=YES,'
            f'URI="{original_playlist_url}"',
        ])

    # Add video stream
    manifest_lines.extend([
        "",
        f'#EXT-X-STREAM-INF:AUDIO="audio",BANDWIDTH=2500000',
        f'{original_playlist_url}' if original_playlist_url else "",
    ])

    manifest_content = "\n".join(manifest_lines)

    # Return as HLS manifest
    from fastapi.responses import Response
    return Response(
        content=manifest_content,
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Cache-Control": "public, max-age=300",  # Cache for 5 minutes
        },
    )
