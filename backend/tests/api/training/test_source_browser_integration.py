"""Integration tests for source browser with real Google Drive.

Requires actual Google OAuth credentials and a pre-seeded test folder.
Tests tagged with @pytest.mark.google_api are excluded from fast local runs.
"""
import os
import pytest

SKIP_REASON = "SOURCE_GOOGLE_TEST_REFRESH_TOKEN not set"


def test_token_encryption_roundtrip():
    """Verify encrypt/decrypt roundtrip works."""
    from app.services.olorin.token_encryption import encrypt_token, decrypt_token

    key = "test_encryption_key_1234567890abc"  # 33 chars — will be derived
    token = "ya29.test_access_token"
    encrypted = encrypt_token(token, key)
    assert encrypted != token
    decrypted = decrypt_token(encrypted, key)
    assert decrypted == token


@pytest.mark.google_api
@pytest.mark.skipif(
    not os.environ.get("SOURCE_GOOGLE_TEST_REFRESH_TOKEN"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_google_refresh_token():
    """Test real token refresh against Google OAuth."""
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )

    provider = GoogleWorkspaceProvider(
        client_id=os.environ["SOURCE_GOOGLE_CLIENT_ID"],
        client_secret=os.environ["SOURCE_GOOGLE_CLIENT_SECRET"],
    )
    tokens = await provider.refresh_access_token(
        os.environ["SOURCE_GOOGLE_TEST_REFRESH_TOKEN"]
    )
    assert tokens.access_token
    assert len(tokens.access_token) > 20


@pytest.mark.google_api
@pytest.mark.skipif(
    not os.environ.get("SOURCE_GOOGLE_TEST_REFRESH_TOKEN"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_google_list_root_folders():
    """Test real folder listing from Google Drive."""
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )

    provider = GoogleWorkspaceProvider(
        client_id=os.environ["SOURCE_GOOGLE_CLIENT_ID"],
        client_secret=os.environ["SOURCE_GOOGLE_CLIENT_SECRET"],
    )
    tokens = await provider.refresh_access_token(
        os.environ["SOURCE_GOOGLE_TEST_REFRESH_TOKEN"]
    )
    page = await provider.list_folders(tokens.access_token)
    assert isinstance(page.items, list)
    for folder in page.items:
        assert folder.folder_id
        assert folder.name


@pytest.mark.google_api
@pytest.mark.skipif(
    not os.environ.get("SOURCE_GOOGLE_TEST_FOLDER_ID"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_google_list_videos_in_test_folder():
    """Test real video listing from a pre-seeded test folder."""
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )

    provider = GoogleWorkspaceProvider(
        client_id=os.environ["SOURCE_GOOGLE_CLIENT_ID"],
        client_secret=os.environ["SOURCE_GOOGLE_CLIENT_SECRET"],
    )
    tokens = await provider.refresh_access_token(
        os.environ["SOURCE_GOOGLE_TEST_REFRESH_TOKEN"]
    )
    folder_id = os.environ["SOURCE_GOOGLE_TEST_FOLDER_ID"]
    page = await provider.list_videos(tokens.access_token, folder_id)
    assert isinstance(page.items, list)
    for video in page.items:
        assert video.video_id
        assert video.title


def test_synced_container_model_creation():
    """Test SyncedContainer model can be constructed."""
    from app.models.synced_container import SyncedContainer

    sc = SyncedContainer.model_construct(
        connection_id="conn-123",
        partner_id="partner-test",
        provider_folder_ref="folder-abc",
        folder_path="Training / Videos",
        created_by="admin-1",
    )
    assert sc.status == "active"
    assert sc.auto_import_new is True
    assert sc.poll_interval_hours == 24
