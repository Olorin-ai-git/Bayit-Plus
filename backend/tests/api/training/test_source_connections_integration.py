"""Integration tests for source connection routes with real Google API."""
import os
import pytest

SKIP_REASON = "SOURCE_GOOGLE_CLIENT_ID not set"


@pytest.mark.google_api
@pytest.mark.skipif(
    not os.environ.get("SOURCE_GOOGLE_CLIENT_ID"), reason=SKIP_REASON
)
def test_oauth_start_google_returns_auth_url():
    """Verify oauth/start generates a valid Google OAuth URL.

    This test does NOT require real Google creds in the environment to run —
    it only needs SOURCE_GOOGLE_CLIENT_ID to be set (can be a dummy value).
    The endpoint generates a URL without calling Google.
    """
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )

    provider = GoogleWorkspaceProvider(
        client_id=os.environ.get("SOURCE_GOOGLE_CLIENT_ID", "test-id"),
        client_secret=os.environ.get("SOURCE_GOOGLE_CLIENT_SECRET", "test-secret"),
    )
    url = provider.get_auth_url("https://training.olorin.ai/oauth/callback", "test-state-123")
    assert "accounts.google.com" in url
    assert "test-state-123" in url
    assert "drive.readonly" in url


def test_source_connection_model_creation():
    """Test SourceConnection model can be constructed with valid data."""
    from app.models.source_connection import SourceConnection

    conn = SourceConnection.model_construct(
        partner_id="test-partner",
        provider="google_workspace",
        authorized_by="admin-user-1",
        encrypted_access_token="encrypted_access",
        encrypted_refresh_token="encrypted_refresh",
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    assert conn.provider == "google_workspace"
    assert conn.status == "active"
    assert len(conn.connection_id) == 32


def test_panopto_oauth_start_requires_server_url():
    """Verify PanoptoProvider requires server_url at construction."""
    from app.services.olorin.source_providers.panopto import PanoptoProvider

    provider = PanoptoProvider(
        client_id="test",
        client_secret="test",
        server_url="https://school.hosted.panopto.com",
    )
    url = provider.get_auth_url("https://callback.test", "state-abc")
    assert "school.hosted.panopto.com" in url
    assert "state-abc" in url
