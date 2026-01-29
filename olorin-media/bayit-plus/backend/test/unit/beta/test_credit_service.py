"""Unit tests for BetaCreditService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from app.services.beta.credit_service import BetaCreditService
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.core.config import Settings


@pytest.fixture
def mock_settings():
    """Mock Settings with Beta 500 configuration."""
    settings = MagicMock(spec=Settings)
    settings.BETA_AI_CREDITS = 5000
    settings.CREDIT_RATE_LIVE_DUBBING = 1.0
    settings.CREDIT_RATE_AI_SEARCH = 0.5
    settings.CREDIT_RATE_AI_RECOMMENDATIONS = 0.3
    settings.BETA_CREDIT_WARNING_THRESHOLD = 500
    settings.BETA_CREDIT_CRITICAL_THRESHOLD = 100
    settings.CREDIT_ABUSE_HOURLY_THRESHOLD = 1000
    return settings


@pytest.fixture
def mock_metering_service():
    """Mock MeteringService."""
    service = AsyncMock()
    service.record_usage = AsyncMock()
    return service


@pytest.fixture
def mock_db():
    """Mock database client."""
    db = MagicMock()
    db.client = MagicMock()
    return db


@pytest.fixture
def credit_service(mock_settings, mock_metering_service, mock_db):
    """Create BetaCreditService with mocked dependencies."""
    return BetaCreditService(
        settings=mock_settings,
        metering_service=mock_metering_service,
        db=mock_db
    )


class TestGetCreditRate:
    """Tests for get_credit_rate method."""

    def test_get_rate_live_dubbing(self, credit_service):
        """Test credit rate for live dubbing feature."""
        rate = credit_service.get_credit_rate("live_dubbing")
        assert rate == 1.0

    def test_get_rate_ai_search(self, credit_service):
        """Test credit rate for AI search feature."""
        rate = credit_service.get_credit_rate("ai_search")
        assert rate == 0.5

    def test_get_rate_ai_recommendations(self, credit_service):
        """Test credit rate for AI recommendations feature."""
        rate = credit_service.get_credit_rate("ai_recommendations")
        assert rate == 0.3

    def test_get_rate_unknown_feature_raises_error(self, credit_service):
        """Test that unknown feature raises ValueError."""
        with pytest.raises(ValueError, match="Unknown feature: unknown_feature"):
            credit_service.get_credit_rate("unknown_feature")


class TestAllocateCredits:
    """Tests for allocate_credits method."""

    @pytest.mark.asyncio
    async def test_allocate_credits_success(self, credit_service):
        """Test successful credit allocation to new user."""
        user_id = "user-123"

        # Mock BetaCredit.find_one to return None (no existing credit)
        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=None)
            MockCredit.return_value.insert = AsyncMock()

            await credit_service.allocate_credits(user_id)

            # Verify credit record was created
            MockCredit.assert_called_once()
            created_credit = MockCredit.return_value
            assert created_credit.user_id == user_id
            assert created_credit.total_credits == 5000
            assert created_credit.used_credits == 0
            assert created_credit.remaining_credits == 5000
            created_credit.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_allocate_credits_already_allocated(self, credit_service):
        """Test that allocating to existing user raises ValueError."""
        user_id = "user-123"

        # Mock existing credit record
        existing_credit = MagicMock()
        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=existing_credit)

            with pytest.raises(ValueError, match="Credits already allocated"):
                await credit_service.allocate_credits(user_id)


class TestAuthorize:
    """Tests for authorize method."""

    @pytest.mark.asyncio
    async def test_authorize_sufficient_credits(self, credit_service):
        """Test authorization with sufficient credits."""
        user_id = "user-123"

        # Mock credit record with sufficient balance
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 1000
        mock_credit.is_expired = False

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            success, remaining = await credit_service.authorize(
                user_id, "live_dubbing", 50.0
            )

            assert success is True
            assert remaining == 1000

    @pytest.mark.asyncio
    async def test_authorize_insufficient_credits(self, credit_service):
        """Test authorization with insufficient credits."""
        user_id = "user-123"

        # Mock credit record with insufficient balance
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 10
        mock_credit.is_expired = False

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            success, remaining = await credit_service.authorize(
                user_id, "live_dubbing", 50.0
            )

            assert success is False
            assert remaining == 10

    @pytest.mark.asyncio
    async def test_authorize_expired_credits(self, credit_service):
        """Test authorization with expired credits."""
        user_id = "user-123"

        # Mock expired credit record
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 1000
        mock_credit.is_expired = True

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            success, remaining = await credit_service.authorize(
                user_id, "live_dubbing", 50.0
            )

            assert success is False
            assert remaining == 0


class TestDeductCredits:
    """Tests for deduct_credits method."""

    @pytest.mark.asyncio
    async def test_deduct_credits_success(self, credit_service, mock_metering_service):
        """Test successful credit deduction with atomic transaction."""
        user_id = "user-123"

        # Mock credit record
        mock_credit = MagicMock()
        mock_credit.id = "credit-456"
        mock_credit.remaining_credits = 1000
        mock_credit.used_credits = 100
        mock_credit.is_expired = False
        mock_credit.save = AsyncMock()

        # Mock session and transaction
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()
        mock_session.start_transaction = MagicMock(return_value=mock_session)

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit, \
             patch('app.services.beta.credit_service.BetaCreditTransaction') as MockTransaction:

            MockCredit.find_one = AsyncMock(return_value=mock_credit)
            credit_service.db.client.start_session = AsyncMock(return_value=mock_session)
            MockTransaction.return_value.insert = AsyncMock()

            success, remaining = await credit_service.deduct_credits(
                user_id, "live_dubbing", 50.0, {"session_id": "sess-789"}
            )

            assert success is True
            assert remaining == 950  # 1000 - 50
            assert mock_credit.remaining_credits == 950
            assert mock_credit.used_credits == 150
            mock_credit.save.assert_called_once()
            mock_metering_service.record_usage.assert_called_once()

    @pytest.mark.asyncio
    async def test_deduct_credits_insufficient_balance(self, credit_service):
        """Test deduction fails with insufficient balance."""
        user_id = "user-123"

        # Mock credit record with low balance
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 10
        mock_credit.is_expired = False

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            success, remaining = await credit_service.deduct_credits(
                user_id, "live_dubbing", 50.0
            )

            assert success is False
            assert remaining == 10


class TestBalanceThresholds:
    """Tests for is_low_balance and is_critical_balance methods."""

    @pytest.mark.asyncio
    async def test_is_low_balance_true(self, credit_service):
        """Test low balance detection."""
        user_id = "user-123"

        # Mock credit with low balance (< 500)
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 400

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            is_low, remaining = await credit_service.is_low_balance(user_id)

            assert is_low is True
            assert remaining == 400

    @pytest.mark.asyncio
    async def test_is_low_balance_false(self, credit_service):
        """Test when balance is not low."""
        user_id = "user-123"

        # Mock credit with sufficient balance
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 1000

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            is_low, remaining = await credit_service.is_low_balance(user_id)

            assert is_low is False
            assert remaining == 1000

    @pytest.mark.asyncio
    async def test_is_critical_balance_true(self, credit_service):
        """Test critical balance detection."""
        user_id = "user-123"

        # Mock credit with critical balance (< 100)
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 50

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            is_critical, remaining = await credit_service.is_critical_balance(user_id)

            assert is_critical is True
            assert remaining == 50

    @pytest.mark.asyncio
    async def test_is_critical_balance_false(self, credit_service):
        """Test when balance is not critical."""
        user_id = "user-123"

        # Mock credit with safe balance
        mock_credit = MagicMock()
        mock_credit.remaining_credits = 200

        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=mock_credit)

            is_critical, remaining = await credit_service.is_critical_balance(user_id)

            assert is_critical is False
            assert remaining == 200
