"""Unit tests for catch-up REST API endpoint."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.api.routes.catchup import generate_catchup_summary, check_catchup_availability
from app.models.user import User


@pytest.fixture
def mock_user():
    """Mock authenticated user."""
    user = MagicMock(spec=User)
    user.id = "user-123"
    user.email = "test@example.com"
    return user


@pytest.fixture
def mock_credit_service():
    """Mock BetaCreditService."""
    service = AsyncMock()
    service.is_beta_user = AsyncMock(return_value=True)
    service.get_balance = AsyncMock(return_value=500)
    return service


@pytest.fixture
def mock_integration():
    """Mock CatchUpIntegration."""
    integration = AsyncMock()
    integration.generate_catchup_with_credits = AsyncMock(return_value={
        "summary": "Summary", "key_points": ["A", "B"],
        "program_info": {"title": "Show", "description": "Desc", "genre": "News"},
        "window_start": "2026-01-30T10:00:00", "window_end": "2026-01-30T10:15:00",
        "cached": False, "credits_used": 1.0, "remaining_credits": 499
    })
    integration.check_available = AsyncMock(return_value={
        "available": True, "is_beta_user": True, "has_credits": True, "balance": 500
    })
    return integration


class TestGenerateCatchupSummary:
    """Tests for generate_catchup_summary endpoint."""

    @pytest.mark.asyncio
    async def test_successful_generation(self, mock_user, mock_credit_service, mock_integration):
        """Test successful summary generation."""
        response = MagicMock()
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            result = await generate_catchup_summary(
                "ch-456", response, 15, "en", mock_user, mock_credit_service, MagicMock()
            )
            assert result.summary == "Summary"
            assert result.credits_used == 1.0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("channel_id", ["ch@invalid", "ch!bad", "ch/wrong"])
    async def test_invalid_channel_format(self, channel_id, mock_user, mock_credit_service):
        """Test invalid channel ID formats."""
        with pytest.raises(HTTPException) as exc:
            await generate_catchup_summary(
                channel_id, MagicMock(), 15, "en", mock_user, mock_credit_service, MagicMock()
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_default_window_minutes(self, mock_user, mock_credit_service, mock_integration):
        """Test default window_minutes."""
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            await generate_catchup_summary(
                "ch-456", MagicMock(), None, "en", mock_user, mock_credit_service, MagicMock()
            )
            call_args = mock_integration.generate_catchup_with_credits.call_args
            assert call_args.kwargs["window_minutes"] == 15

    @pytest.mark.asyncio
    @pytest.mark.parametrize("error_msg,status_code,detail_contains", [
        ("Insufficient credits for catch-up. Available: 0", 402, "Insufficient credits"),
        ("AI service error", 503, "Service temporarily unavailable"),
    ])
    async def test_error_handling(
        self, mock_user, mock_credit_service, mock_integration,
        error_msg, status_code, detail_contains
    ):
        """Test various error scenarios."""
        response = MagicMock()
        if status_code == 402:
            mock_integration.generate_catchup_with_credits.side_effect = ValueError(error_msg)
        else:
            mock_integration.generate_catchup_with_credits.side_effect = Exception(error_msg)

        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            with pytest.raises(HTTPException) as exc:
                await generate_catchup_summary(
                    "ch-456", response, 15, "en", mock_user, mock_credit_service, MagicMock()
                )
            assert exc.value.status_code == status_code
            assert detail_contains in str(exc.value.detail)

    @pytest.mark.asyncio
    async def test_cached_result(self, mock_user, mock_credit_service, mock_integration):
        """Test cached result indication."""
        mock_integration.generate_catchup_with_credits.return_value["cached"] = True
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            result = await generate_catchup_summary(
                "ch-456", MagicMock(), 15, "en", mock_user, mock_credit_service, MagicMock()
            )
            assert result.cached is True

    @pytest.mark.asyncio
    async def test_program_info_mapping(self, mock_user, mock_credit_service, mock_integration):
        """Test program_info properly mapped."""
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            result = await generate_catchup_summary(
                "ch-456", MagicMock(), 15, "en", mock_user, mock_credit_service, MagicMock()
            )
            assert result.program_info.title == "Show"
            assert result.program_info.genre == "News"


class TestCheckCatchupAvailability:
    """Tests for check_catchup_availability endpoint."""

    @pytest.mark.asyncio
    async def test_successful_check(self, mock_user, mock_credit_service, mock_integration):
        """Test successful availability check."""
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            result = await check_catchup_availability("ch-456", mock_user, mock_credit_service)
            assert result.available is True
            assert result.is_beta_user is True

    @pytest.mark.asyncio
    async def test_invalid_channel(self, mock_user, mock_credit_service):
        """Test invalid channel ID."""
        with pytest.raises(HTTPException) as exc:
            await check_catchup_availability("invalid@ch", mock_user, mock_credit_service)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_beta,has_credits,balance", [
        (True, True, 500),
        (False, False, 0),
        (True, False, 0),
    ])
    async def test_availability_scenarios(
        self, mock_user, mock_credit_service, mock_integration,
        is_beta, has_credits, balance
    ):
        """Test various availability scenarios."""
        mock_integration.check_available.return_value = {
            "available": True, "is_beta_user": is_beta,
            "has_credits": has_credits, "balance": balance
        }
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            result = await check_catchup_availability("ch-456", mock_user, mock_credit_service)
            assert result.is_beta_user == is_beta
            assert result.has_credits == has_credits
            assert result.balance == balance

    @pytest.mark.asyncio
    async def test_availability_error_500(self, mock_user, mock_credit_service, mock_integration):
        """Test availability check error returns 500."""
        mock_integration.check_available.side_effect = Exception("DB error")
        with patch('app.api.routes.catchup.CatchUpIntegration', return_value=mock_integration):
            with pytest.raises(HTTPException) as exc:
                await check_catchup_availability("ch-456", mock_user, mock_credit_service)
            assert exc.value.status_code == 500
