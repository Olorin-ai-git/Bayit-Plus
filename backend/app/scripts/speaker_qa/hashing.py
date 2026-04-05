"""Content-hash utilities for idempotent asset generation.

A question's hash is deterministic across runs — re-running the pipeline
with unchanged questions reuses existing GCS assets without paying for
TTS/lipsync regeneration.
"""

import hashlib


def question_hash(speaker_id: str, question_text: str) -> str:
    """Return 12-char sha256 hash of (speaker_id + question_text)."""
    raw = f"{speaker_id}|{question_text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:12]


def asset_paths(gcs_output_prefix: str, content_hash: str) -> tuple[str, str]:
    """Return (mp3_path, mp4_path) for a content hash under the prefix."""
    prefix = gcs_output_prefix.rstrip("/") + "/"
    return (f"{prefix}{content_hash}.mp3", f"{prefix}{content_hash}.mp4")
