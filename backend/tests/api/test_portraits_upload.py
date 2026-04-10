"""Tests for the manual portrait upload fallback endpoint.

Covers the admin workflow where the automated YuNet face extraction
stage (Task 5) failed to find a usable face for a character and the
admin needs to supply one by hand. The upload:

1. Validates content type (png/jpeg/webp) and size (<= 5 MB).
2. Looks up the character by name in Content.interactive_characters.
3. Pushes the bytes to GCS via storage_service.upload_bytes.
4. Writes the URL back to character.frame_url and saves Content.
5. If the latest IngestJob has a pending face_extraction subtask for
   this character, marks it complete so the runner / retry loop sees
   the manual resolution.
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.pipeline_stage import StageName, StageStatus

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


PNG_MAGIC = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
JPEG_MAGIC = b"\xff\xd8\xff\xe0" + b"\x00" * 100


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

        with (
            patch(
                "app.api.routes.training.portraits.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.portraits.storage_service.upload_bytes",
                new_callable=AsyncMock,
                return_value="https://gcs/t/507f.../alice.png",
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
                        "alice.png",
                        io.BytesIO(PNG_MAGIC),
                        "image/png",
                    ),
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["frame_url"] == "https://gcs/t/507f.../alice.png"
        assert body["character_name"] == "alice"

        mock_upload.assert_awaited_once()
        # Uploaded bytes match input
        call_kwargs = mock_upload.await_args.kwargs or {}
        call_args = mock_upload.await_args.args
        uploaded_data = call_args[0] if call_args else call_kwargs.get("data")
        assert uploaded_data == PNG_MAGIC

        assert alice.frame_url == "https://gcs/t/507f.../alice.png"
        content.save.assert_awaited_once()

    async def test_upload_portrait_accepts_jpeg(
        self, training_admin_client
    ):
        bob = _build_character("bob")
        content = _build_content(characters=[bob])

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
                    "portrait": ("bob.jpg", io.BytesIO(JPEG_MAGIC), "image/jpeg"),
                },
            )

        assert resp.status_code == 200

    async def test_upload_portrait_rejects_non_image(
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

    async def test_upload_portrait_rejects_oversized(
        self, training_admin_client
    ):
        """Portraits > 5 MB rejected as 400."""
        content = _build_content(characters=[_build_character("bob")])
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

        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"].lower()

    async def test_upload_portrait_unknown_character(
        self, training_admin_client
    ):
        content = _build_content(characters=[_build_character("alice")])

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/ghost/portrait",
                files={
                    "portrait": ("x.png", io.BytesIO(PNG_MAGIC), "image/png"),
                },
            )

        assert resp.status_code == 404
        assert "character" in resp.json()["detail"].lower()

    async def test_upload_portrait_returns_404_for_malformed_content_id(
        self, training_admin_client
    ):
        resp = await training_admin_client.post(
            "/api/v1/training/content/not-an-oid/characters/alice/portrait",
            files={
                "portrait": ("x.png", io.BytesIO(PNG_MAGIC), "image/png"),
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

        with patch(
            "app.api.routes.training.portraits.Content.get",
            new_callable=AsyncMock,
            return_value=content,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011"
                "/characters/alice/portrait",
                files={
                    "portrait": ("x.png", io.BytesIO(PNG_MAGIC), "image/png"),
                },
            )

        assert resp.status_code == 404

    async def test_upload_portrait_marks_face_extraction_subtask_complete(
        self, training_admin_client
    ):
        """When a pending face_extraction subtask exists, it is marked complete.

        This allows the admin UI to show the character as 'done' without
        requiring another full pipeline retry.
        """
        alice = _build_character("alice")
        content = _build_content(characters=[alice])

        # Real StageExecution so the mark_* helpers work unchanged.
        from app.models.pipeline_stage import StageExecution, SubtaskExecution
        stage = StageExecution(
            name=StageName.FACE_EXTRACTION,
            status=StageStatus.FAILED,
            subtasks={
                "alice": SubtaskExecution(
                    name="alice",
                    status=StageStatus.FAILED,
                    error="no face detected",
                ),
            },
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
                return_value="https://gcs/t/507f.../alice.png",
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
                    "portrait": ("alice.png", io.BytesIO(PNG_MAGIC), "image/png"),
                },
            )

        assert resp.status_code == 200
        assert stage.subtasks["alice"].status == StageStatus.COMPLETED
        # Stage itself should be marked completed since the only subtask
        # that was failing is now done.
        assert stage.status == StageStatus.COMPLETED
        job.save.assert_awaited_once()
