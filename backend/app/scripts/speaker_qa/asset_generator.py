"""Idempotent asset generator: TTS + Aurora lipsync per Q&A answer.

For each DraftAnswer, computes a content hash and checks GCS for existing
audio+video blobs before calling character_animator_service.  Passing
``force=True`` skips the existence check and always regenerates.

Heavy service imports (character_animator, storage) are deferred to call
time so this module can be imported in unit tests without the full app
bootstrap (beanie, olorin_i18n, etc.).
"""

import logging

from app.scripts.speaker_qa.hashing import asset_paths, question_hash
from app.scripts.speaker_qa.models import AssetResult, DraftAnswer, SpeakerConfig

logger = logging.getLogger(__name__)


def _get_character_animator():
    """Lazy import to avoid triggering app.core bootstrap at module load."""
    from app.services.vod_interaction.character_animator import (  # noqa: PLC0415
        character_animator_service,
    )
    return character_animator_service


def _get_storage():
    """Lazy import to avoid triggering app.core bootstrap at module load."""
    from app.core.storage import GCSStorageProvider, storage_service  # noqa: PLC0415
    return GCSStorageProvider, storage_service


# Module-level aliases used in tests via patch(). Assigned at import time by
# calling the lazy getters — but only if the heavy deps are available (i.e. in
# production). In unit tests these names are patched before any call.
try:
    _lazy_svc = _get_character_animator()
    character_animator_service = _lazy_svc
except Exception:  # pragma: no cover — unit tests patch before this path runs
    character_animator_service = None  # type: ignore[assignment]


def _asset_exists_in_gcs(path: str) -> bool:
    """Return True if the blob at *path* exists in the configured GCS bucket."""
    GCSStorageProvider, storage_service = _get_storage()
    provider = storage_service.provider
    if not isinstance(provider, GCSStorageProvider):
        return False
    blob = provider.bucket.blob(path)
    return blob.exists()


def _gcs_public_url(path: str) -> str:
    """Return the public HTTPS URL for a GCS blob path."""
    GCSStorageProvider, storage_service = _get_storage()
    provider = storage_service.provider
    if isinstance(provider, GCSStorageProvider):
        if provider.cdn_base:
            return f"{provider.cdn_base}/{path}"
        return f"https://storage.googleapis.com/{provider.bucket_name}/{path}"
    return path


async def generate_assets(
    cfg: SpeakerConfig,
    answers: list[DraftAnswer],
    *,
    force: bool = False,
) -> list[AssetResult]:
    """Generate (or reuse) audio+video assets for every answer.

    Args:
        cfg: Speaker configuration including voice_id and portrait_url.
        answers: Draft answers produced by the answer generator.
        force: When True, always call character_animator even if GCS assets exist.

    Returns:
        One AssetResult per answer, in input order.
    """
    results: list[AssetResult] = []

    for answer in answers:
        content_hash = question_hash(cfg.speaker_id, answer.question.text)
        mp3_path, mp4_path = asset_paths(cfg.gcs_output_prefix, content_hash)

        if not force and _asset_exists_in_gcs(mp3_path) and _asset_exists_in_gcs(mp4_path):
            logger.info(
                "Reusing existing GCS assets",
                extra={"content_hash": content_hash, "speaker_id": cfg.speaker_id},
            )
            results.append(
                AssetResult(
                    answer=answer,
                    audio_url=_gcs_public_url(mp3_path),
                    video_url=_gcs_public_url(mp4_path),
                    duration=0.0,
                    content_hash=content_hash,
                )
            )
            continue

        logger.info(
            "Generating new assets via character_animator",
            extra={"content_hash": content_hash, "speaker_id": cfg.speaker_id},
        )
        animated = await character_animator_service.animate_character_response(
            character_name=cfg.character_name,
            dialogue_text=answer.response_text,
            character_frame_url=cfg.portrait_url,
            voice_id=cfg.voice_id,
        )
        results.append(
            AssetResult(
                answer=answer,
                audio_url=animated.audio_url,
                video_url=animated.video_url,
                duration=animated.duration,
                content_hash=content_hash,
            )
        )

    return results
