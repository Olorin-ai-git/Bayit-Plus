"""Tests for SCORM export token service."""

import pytest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.services.olorin.scorm_export.token_service import (
    generate_export_token,
    validate_export_token,
    increment_token_usage,
    TokenValidationError,
)


def test_generate_export_token_format():
    token = generate_export_token()
    assert isinstance(token, str)
    assert len(token) >= 32
    assert "+" not in token
    assert "/" not in token


def test_generate_export_token_unique():
    tokens = {generate_export_token() for _ in range(100)}
    assert len(tokens) == 100


def _make_export(**overrides):
    defaults = dict(
        id="exp_test_1",
        partner_id="test",
        content_id="c1",
        created_by="admin",
        export_token="tok_valid",
        token_cap=100,
        token_used=5,
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        status="ready",
    )
    defaults.update(overrides)
    ns = SimpleNamespace(**defaults)
    ns.save = AsyncMock()
    return ns


@pytest.mark.asyncio
async def test_validate_token_success():
    export = _make_export()
    mock_find = AsyncMock(return_value=export)
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as MockExport:
        MockExport.find_one = mock_find
        result = await validate_export_token("tok_valid", "c1")
        assert result is export


@pytest.mark.asyncio
async def test_validate_token_not_found():
    mock_find = AsyncMock(return_value=None)
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as MockExport:
        MockExport.find_one = mock_find
        with pytest.raises(TokenValidationError, match="Invalid export token"):
            await validate_export_token("tok_bad", "c1")


@pytest.mark.asyncio
async def test_validate_token_exhausted():
    export = _make_export(export_token="tok_exhausted", token_used=100)
    mock_find = AsyncMock(return_value=export)
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as MockExport:
        MockExport.find_one = mock_find
        with pytest.raises(TokenValidationError, match="Token usage cap reached"):
            await validate_export_token("tok_exhausted", "c1")


@pytest.mark.asyncio
async def test_validate_token_expired():
    export = _make_export(
        export_token="tok_expired",
        token_used=0,
        token_expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    mock_find = AsyncMock(return_value=export)
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as MockExport:
        MockExport.find_one = mock_find
        with pytest.raises(TokenValidationError, match="Token expired"):
            await validate_export_token("tok_expired", "c1")


@pytest.mark.asyncio
async def test_validate_token_wrong_content():
    export = _make_export(export_token="tok_scope")
    mock_find = AsyncMock(return_value=export)
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as MockExport:
        MockExport.find_one = mock_find
        with pytest.raises(TokenValidationError, match="Token scope mismatch"):
            await validate_export_token("tok_scope", "wrong_content")


@pytest.mark.asyncio
async def test_increment_token_usage():
    export = _make_export(export_token="tok_inc", token_used=5)
    await increment_token_usage(export)
    assert export.token_used == 6
    export.save.assert_called_once()
