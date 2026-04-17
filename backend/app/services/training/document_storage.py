"""GCS helpers for document binary storage. Partner- and global-scoped paths."""

import asyncio
import re

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize_filename(name: str) -> str:
    base = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    return _SAFE_FILENAME_RE.sub("_", base)[:120]


def build_document_gcs_path(
    *, partner_id: str | None, document_id: str, filename: str,
) -> str:
    safe = _sanitize_filename(filename)
    scope_segment = f"partner/{partner_id}" if partner_id else "global"
    return f"training/documents/{scope_segment}/{document_id}-{safe}"


def _get_bucket():
    from google.cloud import storage
    client = storage.Client()
    return client.bucket(settings.GCS_BUCKET_NAME)


async def upload_document_bytes(
    data: bytes, gcs_path: str, content_type: str,
) -> None:
    def _sync():
        bucket = _get_bucket()
        blob = bucket.blob(gcs_path)
        blob.upload_from_string(data, content_type=content_type)
    await asyncio.to_thread(_sync)
    logger.info("Document uploaded to GCS", extra={"path": gcs_path, "bytes": len(data)})


async def delete_document_blob(gcs_path: str) -> None:
    def _sync():
        bucket = _get_bucket()
        blob = bucket.blob(gcs_path)
        blob.delete()
    try:
        await asyncio.to_thread(_sync)
    except Exception as exc:
        logger.warning("GCS delete failed", extra={"path": gcs_path, "error": str(exc)})
