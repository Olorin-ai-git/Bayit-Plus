"""Unit tests for CatchUpIntegration service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.catchup.integration import CatchUpIntegration


@pytest.fixture
def mock_session_manager():
    """Mock CatchUpSessionManager."""
    manager = AsyncMock()
    manager.generate_summary = AsyncMock(return_value={
        "summary": "Test summary", "key_points": ["Point 1"],
        "program_info": {"title": "Show"}, "window_start": "2026-01-30T10:00:00",
        "window_end": "2026-01-30T10:15:00", "language": "en", "cached": False
    })
    manager.check_catchup_available = AsyncMock(return_value=True)
    return manager


@pytest.fixture
def mock_credit_service():
    """Mock BetaCreditService."""
    service = AsyncMock()
    service.is_beta_user = AsyncMock(return_value=True)
    service.authorize = AsyncMock(return_value=(True, 500))
    service.deduct_credits = AsyncMock(return_value=(True, 495))
    service.get_balance = AsyncMock(return_value=500)
    return service


@pytest.fixture(autouse=True)
def mock_catchup_settings():
    """Mock settings for catchup integration."""
    mock = MagicMock()
    mock.olorin.catchup.credit_cost = 5.0
    with patch('app.services.catchup.integration.settings', mock):
        yield mock


class TestCatchUpIntegrationInit:
    """Tests for initialization."""

    def test_init_with_dependencies(self, mock_session_manager, mock_credit_service):
        """Test initialization with explicit dependencies."""
        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=mock_credit_service
        )
        assert integration.user_id == "user-123"
        assert integration._credit_service == mock_credit_service

    def test_init_without_dependencies(self):
        """Test initialization uses singleton when dependencies not provided."""
        integration = CatchUpIntegration(user_id="user-789", channel_id="ch-101")
        assert integration._session_manager is not None
        assert integration._credit_service is None


class TestGenerateCatchupWithCredits:
    """Tests for generate_catchup_with_credits method."""

    @pytest.mark.asyncio
    async def test_successful_generation(self, mock_session_manager, mock_credit_service):
        """Test successful generation with credit enforcement."""
        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=mock_credit_service
        )
        result = await integration.generate_catchup_with_credits("en", 15)

        mock_credit_service.is_beta_user.assert_called_once_with("user-123")
        mock_credit_service.authorize.assert_called_once()
        mock_session_manager.generate_summary.assert_called_once()
        mock_credit_service.deduct_credits.assert_called_once()
        assert result["credits_used"] == 5.0
        assert result["remaining_credits"] == 495

    @pytest.mark.asyncio
    @pytest.mark.parametrize("error_type,error_msg,expected_match", [
        ("non_beta", "Beta 500 users", "Beta 500 users"),
        ("insufficient", "Insufficient credits", "Insufficient credits"),
    ])
    async def test_authorization_errors(
        self, mock_session_manager, mock_credit_service, error_type, error_msg, expected_match
    ):
        """Test authorization failures."""
        if error_type == "non_beta":
            mock_credit_service.is_beta_user.return_value = False
        elif error_type == "insufficient":
            mock_credit_service.authorize.return_value = (False, 0)

        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=mock_credit_service
        )
        with pytest.raises(ValueError, match=expected_match):
            await integration.generate_catchup_with_credits("en", 15)

        mock_session_manager.generate_summary.assert_not_called()
        mock_credit_service.deduct_credits.assert_not_called()

    @pytest.mark.asyncio
    async def test_generation_failure_no_deduction(self, mock_session_manager, mock_credit_service):
        """Test credit not deducted when generation fails."""
        mock_session_manager.generate_summary.side_effect = Exception("AI error")
        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=mock_credit_service
        )
        with pytest.raises(Exception, match="AI error"):
            await integration.generate_catchup_with_credits("en", 15)
        mock_credit_service.deduct_credits.assert_not_called()

    @pytest.mark.asyncio
    async def test_without_credit_service(self, mock_session_manager):
        """Test generation works without credit service."""
        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=None
        )
        result = await integration.generate_catchup_with_credits("en", 15)
        assert result["remaining_credits"] is None


class TestCheckAvailable:
    """Tests for check_available method."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_beta,balance,expected_has_credits", [
        (True, 500, True),
        (True, 0, False),
        (False, 0, False),
    ])
    async def test_availability_scenarios(
        self, mock_session_manager, mock_credit_service,
        is_beta, balance, expected_has_credits
    ):
        """Test various availability scenarios."""
        mock_credit_service.is_beta_user.return_value = is_beta
        mock_credit_service.get_balance.return_value = balance

        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=mock_credit_service
        )
        result = await integration.check_available()

        assert result["is_beta_user"] == is_beta
        assert result["has_credits"] == expected_has_credits
        assert result["balance"] == balance

    @pytest.mark.asyncio
    async def test_without_credit_service_availability(self, mock_session_manager):
        """Test availability without credit service."""
        integration = CatchUpIntegration(
            user_id="user-123", channel_id="ch-456",
            session_manager=mock_session_manager, credit_service=None
        )
        result = await integration.check_available()
        assert result["is_beta_user"] is False
        assert result["has_credits"] is False
