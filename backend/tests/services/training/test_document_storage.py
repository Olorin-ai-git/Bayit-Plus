"""GCS path conventions + upload/delete helpers."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.training.document_storage import (
    build_document_gcs_path,
    delete_document_blob,
    upload_document_bytes,
)


def test_gcs_path_is_partner_scoped():
    path = build_document_gcs_path(
        partner_id="p1", document_id="doc123", filename="handbook.pdf",
    )
    assert path.startswith("training/documents/partner/p1/")
    assert path.endswith("doc123-handbook.pdf")


def test_gcs_path_global_scope():
    path = build_document_gcs_path(
        partner_id=None, document_id="doc456", filename="policy.pdf",
    )
    assert path.startswith("training/documents/global/")
    assert path.endswith("doc456-policy.pdf")


def test_gcs_path_sanitizes_filename():
    path = build_document_gcs_path(
        partner_id="p1", document_id="doc123",
        filename="weird name/../../etc/passwd.pdf",
    )
    assert "../" not in path
    assert "/etc/" not in path


@pytest.mark.asyncio
async def test_upload_calls_blob_upload_from_string():
    fake_blob = MagicMock()
    fake_bucket = MagicMock()
    fake_bucket.blob.return_value = fake_blob
    with patch(
        "app.services.training.document_storage._get_bucket",
        return_value=fake_bucket,
    ):
        await upload_document_bytes(b"hello", "training/documents/partner/p1/d-file.pdf", "application/pdf")
    fake_blob.upload_from_string.assert_called_once()


@pytest.mark.asyncio
async def test_delete_calls_blob_delete():
    fake_blob = MagicMock()
    fake_bucket = MagicMock()
    fake_bucket.blob.return_value = fake_blob
    with patch(
        "app.services.training.document_storage._get_bucket",
        return_value=fake_bucket,
    ):
        await delete_document_blob("training/documents/partner/p1/d-file.pdf")
    fake_blob.delete.assert_called_once()
