"""Tests for SourceConnection model.

Uses model_construct() to bypass Beanie Document.__init__ — these are pure
in-memory field/method tests that do not require a live MongoDB connection.
"""
import uuid
import pytest
from datetime import datetime, timezone
from pydantic import ValidationError
from app.models.source_connection import SourceConnection


def _make_connection(**kwargs) -> SourceConnection:
    """Construct a SourceConnection without Beanie DB initialization."""
    defaults = dict(
        connection_id=uuid.uuid4().hex,
        partner_id="test-partner",
        provider="google_workspace",
        authorized_by="user-123",
        authorized_at=datetime.now(timezone.utc),
        encrypted_access_token="enc_access",
        encrypted_refresh_token="enc_refresh",
        token_expires_at=None,
        panopto_server_url=None,
        scopes=["drive.readonly"],
        last_used_at=None,
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    defaults.update(kwargs)
    return SourceConnection.model_construct(**defaults)


def test_source_connection_defaults():
    conn = _make_connection()
    assert conn.status == "active"
    assert conn.panopto_server_url is None
    assert conn.connection_id is not None
    assert len(conn.connection_id) == 32  # uuid hex


def test_source_connection_provider_validation():
    with pytest.raises(ValidationError):
        SourceConnection.model_validate(
            dict(
                partner_id="p",
                provider="dropbox",  # invalid
                authorized_by="u",
                encrypted_access_token="e",
                encrypted_refresh_token="e",
                scopes=[],
            )
        )
