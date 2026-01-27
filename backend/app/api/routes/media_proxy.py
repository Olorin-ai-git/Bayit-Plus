import base64
import logging
from typing import Optional

import re

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from google.cloud import storage

from app.models.content import Content
from app.services.ffmpeg.realtime_transcode import (
    check_transcode_requirements,
    stream_transcode,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# User-Agent patterns for native iOS/tvOS apps that can play AC3/DTS directly
NATIVE_APP_PATTERNS = [
    r"Bayit\+/.*CFNetwork",  # iOS/tvOS Bayit+ app
    r"Darwin/",  # Generic iOS/tvOS/macOS native
    r"AppleTV",  # tvOS
    r"com\.bayit\.plus",  # Bundle identifier
]


def _is_native_app(user_agent: str) -> bool:
    """Check if request is from native iOS/tvOS app (can play AC3/DTS directly)."""
    if not user_agent:
        return False
    for pattern in NATIVE_APP_PATTERNS:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return True
    return False


def _is_web_browser(user_agent: str) -> bool:
    """Check if request is from a web browser (needs transcoding for AC3/DTS)."""
    if not user_agent:
        return True  # Default to browser behavior
    browser_patterns = ["Mozilla", "Chrome", "Safari", "Firefox", "Edge", "Opera"]
    return any(p in user_agent for p in browser_patterns) and not _is_native_app(user_agent)


@router.get("/proxy/media/{encoded_url}")
async def proxy_media(encoded_url: str):
    """Proxy GCS media files for authenticated access."""
    try:
        # Decode the base64-encoded GCS URL
        gcs_url = base64.urlsafe_b64decode(encoded_url.encode()).decode()

        if "storage.googleapis.com" not in gcs_url:
            raise HTTPException(status_code=400, detail="Invalid URL")

        # Extract bucket and blob path
        parts = gcs_url.replace("https://storage.googleapis.com/", "").split("/", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid GCS URL format")

        bucket_name, blob_name = parts

        # Get file from GCS
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")

        # Stream the file
        def generate():
            # Download in chunks to avoid memory issues
            chunk_size = 1024 * 1024  # 1MB chunks
            with blob.open("rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk

        # Determine content type
        content_type = blob.content_type or "video/mp4"

        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(blob.size),
            },
        )

    except Exception as e:
        logger.error(f"Error proxying media: {e}")
        raise HTTPException(status_code=500, detail="Failed to proxy media file")


@router.get("/proxy/transcode/{content_id}")
async def transcode_stream(
    request: Request,
    content_id: str,
    start: Optional[float] = Query(None, description="Start time in seconds"),
):
    """
    Stream video with real-time audio transcoding (WEB ONLY).

    Transcodes AC3/DTS audio to AAC on-the-fly for browser playback.
    Video codec is copied without re-encoding for speed.

    NOTE: Native iOS/tvOS apps should use the direct stream URL instead,
    as they can play AC3/DTS audio natively via AVFoundation.
    """
    try:
        # Check if request is from native iOS/tvOS app
        user_agent = request.headers.get("User-Agent", "")

        if _is_native_app(user_agent):
            logger.info(f"Native app detected ({user_agent}), rejecting transcode request")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Transcoding not available for native apps",
                    "reason": "iOS/tvOS apps can play AC3/DTS audio natively",
                    "suggestion": "Use the direct stream_url from the content API",
                },
            )

        content = await Content.find_one(Content.id == ObjectId(content_id))
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")

        if not content.stream_url:
            raise HTTPException(status_code=404, detail="No stream URL available")

        stream_url = content.stream_url
        logger.info(f"Starting transcode for content {content_id}: {stream_url} (UA: {user_agent})")

        # Check what transcoding is needed
        requirements = await check_transcode_requirements(stream_url)
        logger.info(f"Transcode requirements: {requirements}")

        if requirements["can_direct_play"]:
            # No transcoding needed - redirect to direct stream
            logger.info("No transcoding needed, can direct play")
            return StreamingResponse(
                _stream_direct(stream_url),
                media_type="video/mp4",
                headers={"X-Transcode-Status": "direct-play"},
            )

        # Stream with transcoding (fragmented MP4 format for browser playback)
        return StreamingResponse(
            stream_transcode(
                video_url=stream_url,
                transcode_audio=requirements["needs_audio_transcode"],
                transcode_video=requirements["needs_video_transcode"],
                start_time=start,
            ),
            media_type="video/mp4",
            headers={
                "X-Transcode-Status": "transcoding",
                "X-Original-Audio-Codec": requirements["audio_codec"],
                "X-Original-Video-Codec": requirements["video_codec"],
                "Accept-Ranges": "none",  # Can't support range requests for live transcode
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Content-Type-Options": "nosniff",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcode error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcode failed: {str(e)}")


@router.get("/proxy/transcode/{content_id}/info")
async def transcode_info(request: Request, content_id: str):
    """
    Get transcoding requirements for a content item.

    Returns information about what transcoding is needed,
    with platform-specific recommendations.
    """
    try:
        user_agent = request.headers.get("User-Agent", "")
        is_native = _is_native_app(user_agent)

        content = await Content.find_one(Content.id == ObjectId(content_id))
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")

        if not content.stream_url:
            raise HTTPException(status_code=404, detail="No stream URL available")

        requirements = await check_transcode_requirements(content.stream_url)

        # Platform-specific recommendation
        if is_native:
            recommendation = {
                "platform": "native_app",
                "recommended_url": content.stream_url,
                "reason": "Native iOS/tvOS apps can play AC3/DTS directly",
                "transcode_available": False,
            }
        else:
            recommendation = {
                "platform": "web_browser",
                "recommended_url": (
                    f"/api/proxy/transcode/{content_id}"
                    if requirements["needs_audio_transcode"]
                    else content.stream_url
                ),
                "reason": "Web browsers need AAC audio for playback",
                "transcode_available": True,
            }

        return {
            "content_id": content_id,
            "title": content.title,
            "stream_url": content.stream_url,
            **requirements,
            "transcode_url": f"/api/proxy/transcode/{content_id}",
            "recommendation": recommendation,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking transcode requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _stream_direct(url: str):
    """Stream directly from GCS without transcoding."""
    if "storage.googleapis.com" not in url:
        raise HTTPException(status_code=400, detail="Invalid URL")

    parts = url.replace("https://storage.googleapis.com/", "").split("/", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid GCS URL format")

    bucket_name, blob_name = parts
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="File not found")

    chunk_size = 1024 * 1024  # 1MB chunks
    with blob.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk
