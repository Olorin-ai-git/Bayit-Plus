"""Olorin Storage Service - async wrapper over core storage providers."""

import shutil
from datetime import timedelta
from pathlib import Path

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import (
    GCSStorageProvider,
    LocalStorageProvider,
    get_storage_provider,
)

logger = get_logger(__name__)


_cached_sa_email: str | None = None


def _iam_sign_kwargs() -> dict:
    """Build kwargs to sign via IAM signBlob for token-only credentials.

    On Cloud Run the default credentials lack a private key.  We obtain
    a ``cloud-platform``-scoped token and resolve the real service
    account email from the metadata server (the default alias
    ``"default"`` is rejected by the IAM API).
    """
    global _cached_sa_email

    try:
        import google.auth
        from google.auth.transport import requests as google_auth_requests

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        auth_request = google_auth_requests.Request()
        credentials.refresh(auth_request)

        if _cached_sa_email is None:
            sa_email = getattr(credentials, "service_account_email", None)
            if not sa_email or sa_email == "default":
                import requests as sync_requests

                resp = sync_requests.get(
                    "http://metadata.google.internal/computeMetadata/v1/"
                    "instance/service-accounts/default/email",
                    headers={"Metadata-Flavor": "Google"},
                    timeout=5,
                )
                resp.raise_for_status()
                sa_email = resp.text.strip()
            _cached_sa_email = sa_email or ""

        if not _cached_sa_email:
            return {}

        return {
            "service_account_email": _cached_sa_email,
            "access_token": credentials.token,
        }
    except Exception:
        pass
    return {}


class OlorinStorageService:
    """High-level async storage operations used by Olorin services."""

    def __init__(self) -> None:
        self._provider = None

    @property
    def provider(self):
        if self._provider is None:
            self._provider = get_storage_provider()
        return self._provider

    @property
    def _is_local(self) -> bool:
        return isinstance(self.provider, LocalStorageProvider)

    async def upload_bytes(
        self,
        data: bytes,
        remote_path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes to storage, return URL."""
        if self._is_local:
            return self._local_write(remote_path, data)

        gcs = self._require_gcs()
        blob = gcs.bucket.blob(remote_path)
        blob.cache_control = "private, max-age=0"
        blob.upload_from_string(
            data, content_type=content_type, timeout=120,
        )
        logger.info(
            "Uploaded bytes to storage",
            extra={"path": remote_path, "size": len(data)},
        )
        if gcs.cdn_base:
            return f"{gcs.cdn_base}/{remote_path}"
        return (
            f"https://storage.googleapis.com/"
            f"{gcs.bucket_name}/{remote_path}"
        )

    async def download_bytes(self, remote_path: str) -> bytes:
        """Download a blob as raw bytes."""
        if self._is_local:
            return self._local_read(remote_path)

        gcs = self._require_gcs()
        blob = gcs.bucket.blob(remote_path)
        data = blob.download_as_bytes(timeout=120)
        logger.info(
            "Downloaded bytes from storage",
            extra={"path": remote_path, "size": len(data)},
        )
        return data

    async def generate_signed_url(
        self,
        remote_path: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """Generate a time-limited signed URL for blob access."""
        if self._is_local:
            local_path = self._local_path(remote_path)
            return f"file://{local_path}"

        gcs = self._require_gcs()
        blob = gcs.bucket.blob(remote_path)

        try:
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiry_seconds),
                method="GET",
            )
        except AttributeError:
            sign_kwargs = _iam_sign_kwargs()
            if not sign_kwargs:
                raise
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiry_seconds),
                method="GET",
                **sign_kwargs,
            )

    async def delete_file(self, remote_path: str) -> bool:
        """Delete a single blob by path."""
        if self._is_local:
            path = self._local_path(remote_path)
            if path.exists():
                path.unlink()
                return True
            return False

        gcs = self._require_gcs()
        blob = gcs.bucket.blob(remote_path)
        try:
            blob.delete()
            logger.info("Deleted blob", extra={"path": remote_path})
            return True
        except gcs.exceptions.NotFound:
            logger.warning(
                "Blob not found for deletion",
                extra={"path": remote_path},
            )
            return False

    async def delete_prefix(self, prefix: str) -> int:
        """Delete all blobs under a prefix. Returns count deleted."""
        if self._is_local:
            local_dir = self._local_path(prefix)
            if local_dir.exists() and local_dir.is_dir():
                count = sum(1 for _ in local_dir.rglob("*") if _.is_file())
                shutil.rmtree(local_dir)
                return count
            return 0

        gcs = self._require_gcs()
        blobs = list(gcs.bucket.list_blobs(prefix=prefix))
        count = 0
        for blob in blobs:
            try:
                blob.delete()
                count += 1
            except Exception as exc:
                logger.warning(
                    "Failed to delete blob in prefix sweep",
                    extra={"blob": blob.name, "error": str(exc)},
                )
        logger.info(
            "Deleted prefix",
            extra={"prefix": prefix, "deleted_count": count},
        )
        return count

    async def upload_from_url(
        self,
        source_url: str,
        remote_path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Download from a URL and re-upload to storage."""
        import httpx

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(source_url)
            resp.raise_for_status()
            data = resp.content
            detected_ct = resp.headers.get("content-type", content_type)

        return await self.upload_bytes(data, remote_path, detected_ct)

    # -- internal helpers --

    def _require_gcs(self) -> GCSStorageProvider:
        p = self.provider
        if not isinstance(p, GCSStorageProvider):
            raise TypeError(
                "GCS provider required. "
                f"Current: {type(p).__name__}"
            )
        return p

    def _local_path(self, remote_path: str) -> Path:
        provider = self.provider
        if isinstance(provider, LocalStorageProvider):
            return provider.upload_dir / remote_path
        raise TypeError("Not a local provider")

    def _local_write(self, remote_path: str, data: bytes) -> str:
        path = self._local_path(remote_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.info(
            "Wrote bytes to local storage",
            extra={"path": str(path), "size": len(data)},
        )
        return f"/uploads/{remote_path}"

    def _local_read(self, remote_path: str) -> bytes:
        path = self._local_path(remote_path)
        return path.read_bytes()


storage_service = OlorinStorageService()
