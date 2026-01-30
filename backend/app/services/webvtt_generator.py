"""
WebVTT Generator
Generates WebVTT subtitle files from recording subtitle cues.
"""

import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds as WebVTT timestamp (HH:MM:SS.mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


async def generate_webvtt(recording_id: str, cues: list) -> Path:
    """
    Generate a WebVTT file from accumulated subtitle cues.

    Args:
        recording_id: Recording ID
        cues: List of RecordingSubtitleCue objects

    Returns:
        Path to the generated .vtt file
    """
    vtt_path = Path(settings.RECORDING_TEMP_DIR) / f"{recording_id}_subtitles.vtt"
    vtt_path.parent.mkdir(parents=True, exist_ok=True)

    lines = ["WEBVTT", ""]

    for cue in cues:
        start_ts = format_vtt_timestamp(cue.start_time_seconds)
        end_ts = format_vtt_timestamp(cue.end_time_seconds)
        lines.append(str(cue.sequence))
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(cue.text)
        lines.append("")

    vtt_path.write_text("\n".join(lines), encoding="utf-8")

    logger.info(
        "WebVTT file generated",
        extra={
            "recording_id": recording_id,
            "path": str(vtt_path),
            "cue_count": len(cues),
        },
    )

    return vtt_path
