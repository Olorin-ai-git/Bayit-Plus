"""
Trailer extraction pipeline.

Downloads separate HD video+audio streams from YouTube via yt-dlp,
merges them with ffmpeg, uploads to GCS, and stores the direct URL
on the content record for instant playback.
"""

from app.services.trailer_extraction.pipeline import extract_trailer_for_content

__all__ = ["extract_trailer_for_content"]
