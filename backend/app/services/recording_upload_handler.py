"""
Recording Upload Handler
Handles post-recording file upload and capture finalization.
"""

import logging
import os
import shutil
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def upload_video_file(
    output_path: str,
    recording_id: str,
    user_id: str,
) -> tuple[str, Optional[str]]:
    """
    Upload recorded video and generate thumbnail.

    Args:
        output_path: Path to the local video file
        recording_id: Recording identifier
        user_id: User who owns the recording

    Returns:
        Tuple of (video_url, thumbnail_url)
    """
    if settings.STORAGE_TYPE == "local":
        video_url = f"/uploads/recordings/{os.path.basename(output_path)}"
        return video_url, None

    if settings.STORAGE_TYPE in ("s3", "gcs"):
        from app.services.gcs_recording_upload_service import (
            gcs_recording_upload_service,
        )

        video_url = await gcs_recording_upload_service.upload_recording(
            local_path=output_path,
            recording_id=recording_id,
            user_id=user_id,
        )

        thumbnail_url = (
            await gcs_recording_upload_service.generate_and_upload_thumbnail(
                video_path=output_path,
                recording_id=recording_id,
                user_id=user_id,
            )
        )

        # Clean up local temp file after successful upload
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
        except OSError as cleanup_err:
            logger.warning(
                "Failed to clean up temp file",
                extra={"path": output_path, "error": str(cleanup_err)},
            )

        return video_url, thumbnail_url

    raise ValueError(f"Invalid STORAGE_TYPE: {settings.STORAGE_TYPE}")


async def finalize_subtitle_capture(
    subtitle_capture,
    recording_id: str,
    user_id: str,
) -> Optional[str]:
    """
    Stop subtitle capture and upload the VTT file.

    Args:
        subtitle_capture: Active SubtitleCaptureService instance
        recording_id: Recording identifier
        user_id: User who owns the recording

    Returns:
        Subtitle URL or None
    """
    try:
        vtt_path = await subtitle_capture.stop_capture()
        if not vtt_path or not vtt_path.exists():
            return None

        if settings.STORAGE_TYPE in ("s3", "gcs"):
            from app.services.gcs_recording_upload_service import (
                gcs_recording_upload_service,
            )

            subtitle_url = await gcs_recording_upload_service.upload_subtitle_file(
                local_path=str(vtt_path),
                recording_id=recording_id,
                user_id=user_id,
            )
        else:
            dest = Path(settings.UPLOAD_DIR) / "recordings" / vtt_path.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(vtt_path), str(dest))
            subtitle_url = f"/uploads/recordings/{vtt_path.name}"

        vtt_path.unlink(missing_ok=True)
        return subtitle_url

    except Exception as e:
        logger.error(
            "Failed to process subtitle capture",
            extra={"recording_id": recording_id, "error": str(e)},
        )
        return None


async def finalize_dubbing_capture(
    dubbing_capture,
    recording_id: str,
    user_id: str,
) -> Optional[str]:
    """
    Stop dubbing capture and upload the AAC file.

    Args:
        dubbing_capture: Active DubbingCaptureService instance
        recording_id: Recording identifier
        user_id: User who owns the recording

    Returns:
        Dubbed audio URL or None
    """
    try:
        aac_path = await dubbing_capture.stop_capture()
        if not aac_path or not aac_path.exists():
            return None

        if settings.STORAGE_TYPE in ("s3", "gcs"):
            from app.services.gcs_recording_upload_service import (
                gcs_recording_upload_service,
            )

            dubbed_audio_url = await gcs_recording_upload_service.upload_dubbed_audio(
                local_path=str(aac_path),
                recording_id=recording_id,
                user_id=user_id,
            )
        else:
            dest = Path(settings.UPLOAD_DIR) / "recordings" / aac_path.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(aac_path), str(dest))
            dubbed_audio_url = f"/uploads/recordings/{aac_path.name}"

        aac_path.unlink(missing_ok=True)
        return dubbed_audio_url

    except Exception as e:
        logger.error(
            "Failed to process dubbing capture",
            extra={"recording_id": recording_id, "error": str(e)},
        )
        return None
