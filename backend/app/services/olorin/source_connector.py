"""Orchestrates import of videos from authenticated sources into the pipeline."""

import tempfile
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content, ProcessingState
from app.models.integration_partner import IntegrationPartner
from app.models.source_connection import SourceConnection
from app.services.olorin.ingest_orchestrator import create_ingest_job, run_pipeline
from app.services.olorin.source_providers.google_workspace import GoogleWorkspaceProvider
from app.services.olorin.source_providers.panopto import PanoptoProvider
from app.services.olorin.storage_service import storage_service
from app.services.olorin.token_encryption import decrypt_token, encrypt_token

logger = get_logger(__name__)


def _get_provider(conn: SourceConnection):
    if conn.provider == "google_workspace":
        return GoogleWorkspaceProvider(
            client_id=settings.SOURCE_GOOGLE_CLIENT_ID,
            client_secret=settings.SOURCE_GOOGLE_CLIENT_SECRET,
        )
    return PanoptoProvider(
        client_id=settings.SOURCE_PANOPTO_CLIENT_ID,
        client_secret=settings.SOURCE_PANOPTO_CLIENT_SECRET,
        server_url=conn.panopto_server_url or "",
    )


async def _get_token(conn: SourceConnection) -> str:
    enc_key = settings.SOURCE_TOKEN_ENCRYPTION_KEY
    access_token = decrypt_token(conn.encrypted_access_token, enc_key)
    now = datetime.now(timezone.utc)
    if conn.token_expires_at and conn.token_expires_at <= now:
        provider = _get_provider(conn)
        refresh = decrypt_token(conn.encrypted_refresh_token, enc_key)
        tokens = await provider.refresh_access_token(refresh)
        conn.encrypted_access_token = encrypt_token(tokens.access_token, enc_key)
        conn.token_expires_at = now
        conn.updated_at = now
        await conn.save()
        access_token = tokens.access_token
    return access_token


async def import_from_source(
    connection_id: str,
    partner_id: str,
    video_ids: list[str],
    folder_path: str = "",
) -> None:
    """Import videos from an authenticated source into the pipeline."""
    conn = await SourceConnection.find_one({"connection_id": connection_id})
    if not conn:
        logger.error("Connection not found", extra={"connection_id": connection_id})
        return

    partner = await IntegrationPartner.find_one({"partner_id": partner_id})
    if not partner:
        logger.error("Partner not found", extra={"partner_id": partner_id})
        return

    provider = _get_provider(conn)
    token = await _get_token(conn)

    for video_id in video_ids:
        try:
            await _import_single_video(
                provider, token, conn, partner, video_id, folder_path,
            )
        except Exception:
            logger.exception(
                "Failed to import video",
                extra={"video_id": video_id, "connection_id": connection_id},
            )


async def _import_single_video(
    provider, token, conn, partner, video_id, folder_path,
) -> None:
    """Import a single video: download -> temp GCS -> pipeline -> cleanup."""
    gcs_prefix = settings.SOURCE_TEMP_GCS_PREFIX
    temp_gcs_path = f"{gcs_prefix}/{conn.partner_id}/{video_id}.mp4"

    with tempfile.TemporaryDirectory() as tmpdir:
        local_path = f"{tmpdir}/{video_id}.mp4"
        await provider.download_video(token, video_id, local_path)
        with open(local_path, "rb") as fh:
            video_bytes = fh.read()
        await storage_service.upload_bytes(video_bytes, temp_gcs_path, "video/mp4")

    stream_url = await storage_service.generate_signed_url(
        temp_gcs_path, expiry_seconds=settings.SOURCE_SIGNED_URL_EXPIRY_SECONDS,
    )

    now = datetime.now(timezone.utc)
    content = Content(
        title=f"Imported: {video_id}",
        stream_url=stream_url,
        partner_id=conn.partner_id,
        source_type=conn.provider,
        source_connection_id=conn.connection_id,
        source_ref=video_id,
        source_path=folder_path,
        source_status="available",
        processing_state=ProcessingState.PROCESSING,
        created_at=now,
        updated_at=now,
    )
    await content.insert()

    job = await create_ingest_job(
        partner, content, stream_url,
        capabilities=["characters", "subtitles"],
        direct=True,
    )
    try:
        await run_pipeline(job)
    finally:
        try:
            await storage_service.delete_file(temp_gcs_path)
        except Exception:
            logger.warning(
                "Failed to clean temp file",
                extra={"path": temp_gcs_path},
            )
