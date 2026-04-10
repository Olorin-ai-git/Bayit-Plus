"""Tests for the manual portrait upload fallback endpoint.

Covers the admin workflow where the automated YuNet face extraction
stage (Task 5) failed to find a usable face for a character and the
admin needs to supply one by hand. The upload:

1. Validates content type (png/jpeg/webp), verifies magic bytes, and
   streams the body past a 5 MB hard cap (413 on overflow).
2. Transcodes everything to JPEG via cv2 so the GCS key matches Task
   5's hardcoded ``.jpg`` layout and no client-controlled content-type
   ever lands in the serving headers.
3. Looks up the character by name in Content.interactive_characters.
4. Writes the URL back to character.frame_url and saves Content.
5. Marks the face_extraction subtask complete if present, PRESERVING
   the original error text as an audit trail for the admin UI.
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from app.models.pipeline_stage import (
    StageExecution,
    StageName,
    StageStatus,
    SubtaskExecution,
)

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


def _make_png_bytes(width: int = 16, height: int = 16) -> bytes:
    """Build a real PNG buffer via cv2 so it survives imdecode."""
    import cv2  # local import to avoid collection-time overhead
    img = np.full((height, width, 3), 200, dtype=np.uint8)
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


def _make_jpeg_bytes(width: int = 16, height: int = 16) -> bytes:
    import cv2
    img = np.full((height, width, 3), 150, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


def _build_character(name: str, frame_url: str = "") -> MagicMock:
    char = MagicMock()
    char.name = name
    char.frame_url = frame_url
    return char


def _build_content(
    partner_id: str = "training-testorg-abc12345",
    characters: list | None = None,
) -> MagicMock:
    content = MagicMock()
    content.partner_id = partner_id
    content.interactive_characters = characters or []
    content.save = AsyncMock()
    return content


class TestPortraitUpload:

    async def test_upload_portrait_updates_character_frame_url(
        self, training_admin_client
    ):
        alice = _build_character("alice")
        content = _build_content(characters=[alice])
        png_bytes = _make_png_bytes()

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../alice.jpg",
            ) as mock_upload,
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": (
                        "alice.png", io.BytesIO(png_bytes), "image/png",
                    ),
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        # Always .jpg regardless of input format — Task 5 compatibility.
        assert body["frame_url"] == "https://gcs/t/507f.../alice.jpg"
        assert body["character_name"] == "alice"

        # Upload was called with JPEG bytes + image/jpeg content type,
        # not the original PNG.
        mock_upload.assert_awaited_once()
        call_args = mock_upload.await_args.args
        uploaded_data = call_args[0]
        remote_path = call_args[1]
        uploaded_content_type = call_args[2]
        assert uploaded_data[:3] == b"\xff\xd8\xff"  # JPEG magic bytes
        assert remote_path == "training-portraits/507f1f77bcf86cd799439011/alice.jpg"
        assert uploaded_content_type == "image/jpeg"

        assert alice.frame_url == "https://gcs/t/507f.../alice.jpg"
        content.save.assert_awaited_once()

    async def test_upload_portrait_accepts_jpeg(
        self, training_admin_client
    ):
        bob = _build_character("bob")
        content = _build_content(characters=[bob])
        jpeg_bytes = _make_jpeg_bytes()

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../bob.jpg",
            ),
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/bob/portrait",
                files={
                    "portrait": (
                        "bob.jpg", io.BytesIO(jpeg_bytes), "image/jpeg",
                    ),
                },
            )

        assert resp.status_code == 200

    async def test_upload_portrait_rejects_non_image_content_type(
        self, training_admin_client
    ):
        content = _build_content(characters=[_build_character("bob")])

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/bob/portrait",
                files={
                    "portrait": ("bad.txt", io.BytesIO(b"hello"), "text/plain"),
                },
            )

        assert resp.status_code == 400
        assert "type" in resp.json()["detail"].lower()

    async def test_upload_portrait_rejects_magic_byte_mismatch(
        self, training_admin_client
    ):
        """HTML payload with spoofed image/png Content-Type must be rejected.

        Guards against stored-XSS where a content-sniffing CDN serves
        HTML as a script despite the declared image content-type.
        """
        content = _build_content(characters=[_build_character("alice")])
        fake_png = b"<html><script>alert(1)</script></html>"

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": (
                        "evil.png", io.BytesIO(fake_png), "image/png",
                    ),
                },
            )

        assert resp.status_code == 400
        assert "match" in resp.json()["detail"].lower()

    async def test_upload_portrait_rejects_oversized_with_413(
        self, training_admin_client
    ):
        """Portraits > 5 MB rejected as 413 Payload Too Large, not 400.

        The streaming reader aborts mid-upload so the oversized body
        never fully buffers in RAM.
        """
        content = _build_content(characters=[_build_character("bob")])
        # 6 MB of PNG header + zeros
        huge = b"\x89PNG\r\n\x1a\n" + b"\x00" * (6 * 1024 * 1024)

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/bob/portrait",
                files={
                    "portrait": ("big.png", io.BytesIO(huge), "image/png"),
                },
            )

        assert resp.status_code == 413
        assert "too large" in resp.json()["detail"].lower()

    async def test_upload_portrait_unknown_character(
        self, training_admin_client
    ):
        content = _build_content(characters=[_build_character("alice")])
        png_bytes = _make_png_bytes()

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/ghost/portrait",
                files={
                    "portrait": ("x.png", io.BytesIO(png_bytes), "image/png"),
                },
            )

        assert resp.status_code == 404
        assert "character" in resp.json()["detail"].lower()

    async def test_upload_portrait_returns_404_for_malformed_content_id(
        self, training_admin_client
    ):
        png_bytes = _make_png_bytes()
        resp = await training_admin_client.post(
            "/api/v1/training/content/not-an-oid/characters/alice/portrait",
            files={
                "portrait": ("x.png", io.BytesIO(png_bytes), "image/png"),
            },
        )
        assert resp.status_code == 404

    async def test_upload_portrait_returns_404_for_wrong_partner(
        self, training_admin_client
    ):
        content = _build_content(
            partner_id="training-otherorg-xyz",
            characters=[_build_character("alice")],
        )
        png_bytes = _make_png_bytes()

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": ("x.png", io.BytesIO(png_bytes), "image/png"),
                },
            )

        assert resp.status_code == 404

    async def test_upload_portrait_sanitizes_character_name_in_gcs_key(
        self, training_admin_client
    ):
        """Unsafe chars in character name are scrubbed by _sanitize_name
        before forming the GCS key.

        The character name is LLM-generated at content-creation time so
        the upload handler must scrub anything outside [A-Za-z0-9_-]
        via the shared ``_sanitize_name`` helper. Note: URL-path-level
        traversal (e.g. ``..%2F``) is neutralized by Starlette routing
        before the handler is called; this test guards the secondary
        layer for chars that survive routing.
        """
        # Character name contains dots and shell metacharacters — all
        # of which survive URL routing (unlike slashes, which Starlette
        # splits on) but must be scrubbed before going into the GCS path.
        evil = _build_character("alice..bad;rm")
        content = _build_content(characters=[evil])
        png_bytes = _make_png_bytes()

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/.../Alice.jpg",
            ) as mock_upload,
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice..bad;rm/portrait",
                files={
                    "portrait": ("x.png", io.BytesIO(png_bytes), "image/png"),
                },
            )

        assert resp.status_code == 200
        remote_path = mock_upload.await_args.args[1]
        # Everything after the content_id prefix must contain only
        # sanitized chars — no dots, no semicolons, no spaces, no
        # slashes beyond the deterministic directory layout.
        assert remote_path.startswith(
            "training-portraits/507f1f77bcf86cd799439011/"
        )
        leaf = remote_path.rsplit("/", 1)[-1]
        # Only safe chars survived — ends with .jpg from our hardcoded
        # extension, body is [A-Za-z0-9_\-]
        assert leaf.endswith(".jpg")
        stem = leaf[:-4]
        assert all(ch.isalnum() or ch in "_-" for ch in stem), (
            f"unexpected chars in sanitized GCS key stem: {stem!r}"
        )
        assert ".." not in stem
        assert ";" not in stem
        assert " " not in stem

    async def test_upload_portrait_marks_face_extraction_subtask_complete(
        self, training_admin_client
    ):
        """When a failed face_extraction subtask exists, it is marked complete
        AND the original YuNet error is preserved as an audit trail."""
        alice = _build_character("alice")
        content = _build_content(characters=[alice])
        png_bytes = _make_png_bytes()

        original_error = "no face detected at candidates 12.3, 45.6, 78.9"
        stage = StageExecution(
            name=StageName.FACE_EXTRACTION,
            status=StageStatus.FAILED,
            subtasks={
                "alice": SubtaskExecution(
                    name="alice",
                    status=StageStatus.FAILED,
                    error=original_error,
                ),
            },
        )
        job = MagicMock()
        job.get_stage = MagicMock(return_value=stage)
        job.save = AsyncMock()
        job.job_id = "job-abc"

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../alice.jpg",
            ),
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=job,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": (
                        "alice.png", io.BytesIO(png_bytes), "image/png",
                    ),
                },
            )

        assert resp.status_code == 200
        assert stage.subtasks["alice"].status == StageStatus.COMPLETED
        # Error preserved for audit trail — admin UI keys on
        # (status == COMPLETED && error is not None) to show
        # "manually resolved" badge.
        assert stage.subtasks["alice"].error == original_error
        # Stage rolled up to COMPLETED since the only subtask is done.
        assert stage.status == StageStatus.COMPLETED
        job.save.assert_awaited_once()

    async def test_upload_portrait_leaves_stage_failed_when_siblings_fail(
        self, training_admin_client
    ):
        """Resolving one subtask doesn't mark the stage complete if others
        are still FAILED — the stage must stay FAILED so the runner
        retries siblings on the next retry cycle.
        """
        alice = _build_character("alice")
        content = _build_content(characters=[alice])
        png_bytes = _make_png_bytes()

        stage = StageExecution(
            name=StageName.FACE_EXTRACTION,
            status=StageStatus.FAILED,
            subtasks={
                "alice": SubtaskExecution(
                    name="alice", status=StageStatus.FAILED,
                    error="no face",
                ),
                "bob": SubtaskExecution(
                    name="bob", status=StageStatus.FAILED,
                    error="no face",
                ),
            },
        )
        job = MagicMock()
        job.get_stage = MagicMock(return_value=stage)
        job.save = AsyncMock()
        job.job_id = "job-xyz"

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../alice.jpg",
            ),
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=job,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": (
                        "alice.png", io.BytesIO(png_bytes), "image/png",
                    ),
                },
            )

        assert resp.status_code == 200
        assert stage.subtasks["alice"].status == StageStatus.COMPLETED
        # bob still failed, so stage stays FAILED
        assert stage.subtasks["bob"].status == StageStatus.FAILED
        assert stage.status == StageStatus.FAILED

    async def test_upload_portrait_noop_when_character_missing_from_stage(
        self, training_admin_client
    ):
        """Character added post-ingest (not in stage.subtasks) uploads fine
        without touching the job."""
        alice = _build_character("alice")
        content = _build_content(characters=[alice])
        png_bytes = _make_png_bytes()

        stage = StageExecution(
            name=StageName.FACE_EXTRACTION,
            status=StageStatus.COMPLETED,
            subtasks={},  # no subtasks at all
        )
        job = MagicMock()
        job.get_stage = MagicMock(return_value=stage)
        job.save = AsyncMock()

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../alice.jpg",
            ),
            patch(
                "app.api.routes.training.portraits.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=job,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": (
                        "alice.png", io.BytesIO(png_bytes), "image/png",
                    ),
                },
            )

        assert resp.status_code == 200
        # Job not saved since there was nothing to update
        job.save.assert_not_awaited()
