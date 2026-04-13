"""Tests for SCORM token service — generation, validation, usage."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.olorin.scorm_export.token_service import (
    TokenValidationError,
    generate_export_token,
    increment_token_usage,
    validate_export_token,
)


def test_generate_token_length():
    token = generate_export_token()
    assert len(token) >= 32


def test_generate_token_uniqueness():
    tokens = {generate_export_token() for _ in range(50)}
    assert len(tokens) == 50


def test_generate_token_url_safe():
    token = generate_export_token()
    assert all(c.isalnum() or c in "-_" for c in token)


@pytest.mark.asyncio
async def test_validate_token_not_found():
    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=None)
        with pytest.raises(TokenValidationError, match="Invalid"):
            await validate_export_token("bad-token", "content-1")


@pytest.mark.asyncio
async def test_validate_token_scope_mismatch():
    export = MagicMock()
    export.content_id = "content-A"
    export.token_used = 0
    export.token_cap = 100
    export.token_expires_at = None

    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=export)
        with pytest.raises(TokenValidationError, match="scope"):
            await validate_export_token("tok", "content-B")


@pytest.mark.asyncio
async def test_validate_token_cap_reached():
    export = MagicMock()
    export.content_id = "c1"
    export.token_used = 500
    export.token_cap = 500
    export.token_expires_at = None

    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=export)
        with pytest.raises(TokenValidationError, match="cap"):
            await validate_export_token("tok", "c1")


@pytest.mark.asyncio
async def test_validate_token_expired():
    export = MagicMock()
    export.content_id = "c1"
    export.token_used = 0
    export.token_cap = 100
    export.token_expires_at = datetime.now(timezone.utc) - timedelta(days=1)

    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=export)
        with pytest.raises(TokenValidationError, match="expired"):
            await validate_export_token("tok", "c1")


@pytest.mark.asyncio
async def test_validate_token_success():
    export = MagicMock()
    export.content_id = "c1"
    export.token_used = 10
    export.token_cap = 100
    export.token_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=export)
        result = await validate_export_token("tok", "c1")
    assert result is export


@pytest.mark.asyncio
async def test_validate_token_naive_expiry_treated_as_utc():
    export = MagicMock()
    export.content_id = "c1"
    export.token_used = 0
    export.token_cap = 100
    export.token_expires_at = datetime.now() + timedelta(days=30)
    export.token_expires_at = export.token_expires_at.replace(tzinfo=None)

    with patch(
        "app.services.olorin.scorm_export.token_service.ScormExport"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=export)
        result = await validate_export_token("tok", "c1")
    assert result is export


@pytest.mark.asyncio
async def test_increment_token_usage():
    export = MagicMock()
    export.id = "exp-1"
    export.token_used = 5
    export.token_cap = 100
    export.save = AsyncMock()

    await increment_token_usage(export)
    assert export.token_used == 6
    export.save.assert_awaited_once()
