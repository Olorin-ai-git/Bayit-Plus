"""Unit tests for trial GCS/DB purge helper.

Uses mocks instead of a real DB because the Content model has too many indexes
to init cleanly against Atlas test DB. The helper's logic is pure (iterate,
filter, call delete) — mocks give full coverage of the branches.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.training.trial_purge import purge_partner_byoc_files


def _mock_content(
    id_="c1",
    stream_url=None,
    thumbnail=None,
    backdrop=None,
    trailer_stream_url=None,
) -> SimpleNamespace:
    """Build a Content-like mock with the URL fields the purge reads."""
    obj = SimpleNamespace(
        id=id_,
        stream_url=stream_url,
        thumbnail=thumbnail,
        backdrop=backdrop,
        trailer_stream_url=trailer_stream_url,
    )
    obj.delete = AsyncMock()
    return obj


def _patch_db(contents, sources_deleted_count=1):
    """Patch Content.find and B2BContentSource.find in trial_purge."""
    find_chain = MagicMock()
    find_chain.to_list = AsyncMock(return_value=contents)
    content_find = patch(
        "app.services.training.trial_purge.Content.find",
        return_value=find_chain,
    )
    source_chain = MagicMock()
    source_chain.delete = AsyncMock(
        return_value=SimpleNamespace(deleted_count=sources_deleted_count),
    )
    source_find = patch(
        "app.services.training.trial_purge.B2BContentSource.find",
        return_value=source_chain,
    )
    return content_find, source_find


@pytest.mark.asyncio
async def test_purge_deletes_gcs_blobs_and_records():
    c = _mock_content(
        stream_url="https://storage.googleapis.com/b/videos/t1.mp4",
        thumbnail="https://storage.googleapis.com/b/thumbs/t1.jpg",
    )
    mock_storage = MagicMock()
    mock_storage.delete_file = AsyncMock(return_value=True)
    content_find, source_find = _patch_db([c])

    with patch(
        "app.services.training.trial_purge.get_storage_provider",
        return_value=mock_storage,
    ), content_find, source_find:
        summary = await purge_partner_byoc_files("p1")

    assert summary == {
        "contents_deleted": 1,
        "blobs_deleted": 2,
        "sources_deleted": 1,
        "errors": [],
    }
    assert mock_storage.delete_file.await_count == 2
    c.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_purge_continues_on_blob_delete_failure():
    c = _mock_content(
        stream_url="https://storage.googleapis.com/b/t2.mp4",
    )
    mock_storage = MagicMock()
    mock_storage.delete_file = AsyncMock(side_effect=RuntimeError("gcs down"))
    content_find, source_find = _patch_db([c], sources_deleted_count=0)

    with patch(
        "app.services.training.trial_purge.get_storage_provider",
        return_value=mock_storage,
    ), content_find, source_find:
        summary = await purge_partner_byoc_files("p2")

    # GCS delete failed, but record still purged (delete() still called).
    assert summary["contents_deleted"] == 1
    assert summary["blobs_deleted"] == 0
    assert len(summary["errors"]) == 1
    assert "gcs down" in summary["errors"][0]
    c.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_purge_skips_non_remote_urls():
    c = _mock_content(
        stream_url="/local/path/t3.mp4",  # local path
        thumbnail="",  # empty
        backdrop=None,  # None
    )
    mock_storage = MagicMock()
    mock_storage.delete_file = AsyncMock()
    content_find, source_find = _patch_db([c], sources_deleted_count=0)

    with patch(
        "app.services.training.trial_purge.get_storage_provider",
        return_value=mock_storage,
    ), content_find, source_find:
        summary = await purge_partner_byoc_files("p3")

    assert summary["contents_deleted"] == 1
    assert summary["blobs_deleted"] == 0
    mock_storage.delete_file.assert_not_called()


@pytest.mark.asyncio
async def test_purge_empty_partner_is_noop():
    mock_storage = MagicMock()
    mock_storage.delete_file = AsyncMock()
    content_find, source_find = _patch_db([], sources_deleted_count=0)

    with patch(
        "app.services.training.trial_purge.get_storage_provider",
        return_value=mock_storage,
    ), content_find, source_find:
        summary = await purge_partner_byoc_files("p4")

    assert summary == {
        "contents_deleted": 0,
        "blobs_deleted": 0,
        "sources_deleted": 0,
        "errors": [],
    }
    mock_storage.delete_file.assert_not_called()


@pytest.mark.asyncio
async def test_purge_handles_trailer_field():
    c = _mock_content(
        trailer_stream_url="https://storage.googleapis.com/b/trailers/x.mp4",
    )
    mock_storage = MagicMock()
    mock_storage.delete_file = AsyncMock(return_value=True)
    content_find, source_find = _patch_db([c], sources_deleted_count=0)

    with patch(
        "app.services.training.trial_purge.get_storage_provider",
        return_value=mock_storage,
    ), content_find, source_find:
        summary = await purge_partner_byoc_files("p5")

    assert summary["blobs_deleted"] == 1
    mock_storage.delete_file.assert_awaited_once_with(
        "https://storage.googleapis.com/b/trailers/x.mp4",
    )
