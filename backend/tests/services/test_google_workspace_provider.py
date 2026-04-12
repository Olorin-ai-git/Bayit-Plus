"""Integration tests against real Google Drive API.

Requires: SOURCE_GOOGLE_CLIENT_ID, SOURCE_GOOGLE_CLIENT_SECRET,
SOURCE_GOOGLE_TEST_REFRESH_TOKEN, SOURCE_GOOGLE_TEST_FOLDER_ID
in environment.
"""
import os
import pytest

pytestmark = pytest.mark.google_api


def test_google_provider_imports():
    """Verify the provider class can be imported."""
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )
    assert GoogleWorkspaceProvider is not None


def test_google_auth_url_generation():
    """Test OAuth URL generation (no API call needed)."""
    from app.services.olorin.source_providers.google_workspace import (
        GoogleWorkspaceProvider,
    )
    provider = GoogleWorkspaceProvider(
        client_id="test-client-id",
        client_secret="test-secret",
    )
    url = provider.get_auth_url("https://example.com/callback", "test-state")
    assert "accounts.google.com" in url
    assert "test-client-id" in url
    assert "test-state" in url
    assert "drive.readonly" in url
