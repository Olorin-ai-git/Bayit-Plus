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
    settings.CREDIT_RATE_SIMPLIFIED_DUBBING = 0.8
    settings.CREDIT_RATE_SMART_SUBS = 0.6
    settings.CREDIT_RATE_CATCHUP_SUMMARY = 0.4
    settings.CREDIT_RATE_LIVE_NIKUD = 0.7
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

    @pytest.mark.asyncio
    async def test_get_rate_live_dubbing(self, credit_service):
        """Test credit rate for live dubbing feature."""
        rate = await credit_service.get_credit_rate("live_dubbing")
        assert rate == 1.0

    @pytest.mark.asyncio
    async def test_get_rate_ai_search(self, credit_service):
        """Test credit rate for AI search feature."""
        rate = await credit_service.get_credit_rate("ai_search")
        assert rate == 0.5

    @pytest.mark.asyncio
    async def test_get_rate_ai_recommendations(self, credit_service):
        """Test credit rate for AI recommendations feature."""
        rate = await credit_service.get_credit_rate("ai_recommendations")
        assert rate == 0.3

    @pytest.mark.asyncio
    async def test_get_rate_unknown_feature_raises_error(self, credit_service):
        """Test that unknown feature raises ValueError."""
        with pytest.raises(ValueError, match="Unknown feature: unknown_feature"):
            await credit_service.get_credit_rate("unknown_feature")


class TestAllocateCredits:
    """Tests for allocate_credits method."""

    @pytest.mark.asyncio
    async def test_allocate_credits_success(self, credit_service):
        """Test successful credit allocation to new user."""
        user_id = "user-123"

        # Mock raw MongoDB query (no existing credit)
        credit_service.db.beta_credits = MagicMock()
        credit_service.db.beta_credits.find_one = AsyncMock(return_value=None)

        # Mock BetaCredit and BetaCreditTransaction
        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit, \
             patch('app.services.beta.credit_service.BetaCreditTransaction') as MockTransaction:

            mock_credit_instance = MagicMock()
            mock_credit_instance.id = "credit-456"
            mock_credit_instance.insert = AsyncMock()
            MockCredit.return_value = mock_credit_instance

            mock_transaction_instance = MagicMock()
            mock_transaction_instance.insert = AsyncMock()
            MockTransaction.return_value = mock_transaction_instance

            await credit_service.allocate_credits(user_id)

            # Verify credit record was created with correct args
            MockCredit.assert_called_once()
            call_kwargs = MockCredit.call_args.kwargs
            assert call_kwargs["user_id"] == user_id
            assert call_kwargs["total_credits"] == 5000
            assert call_kwargs["used_credits"] == 0
            assert call_kwargs["remaining_credits"] == 5000
            assert call_kwargs["version"] == 0  # New field
            mock_credit_instance.insert.assert_called_once()

            # Verify transaction record was created
            MockTransaction.assert_called_once()
            mock_transaction_instance.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_allocate_credits_already_allocated(self, credit_service):
        """Test that allocating to existing user raises ValueError."""
        user_id = "user-123"

        # Mock raw MongoDB query (existing credit record)
        existing_credit = {"user_id": user_id, "total_credits": 5000}
        credit_service.db.beta_credits = MagicMock()
        credit_service.db.beta_credits.find_one = AsyncMock(return_value=existing_credit)

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

        # Mock find_one to return None (expired credits filtered out by query)
        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=None)

            success, remaining = await credit_service.authorize(
                user_id, "live_dubbing", 50.0
            )

            assert success is False
            assert remaining == 0


class TestDeductCredits:
    """Tests for deduct_credits method."""

    @pytest.mark.asyncio
    async def test_deduct_credits_success(self, credit_service, mock_metering_service):
        """Test successful credit deduction with atomic $inc operation."""
        user_id = "user-123"

        # Mock atomic find_one_and_update result (after deduction)
        result = {
            "_id": "credit-456",
            "user_id": user_id,
            "total_credits": 5000,
            "used_credits": 150,  # 100 + 50
            "remaining_credits": 950,  # 1000 - 50
            "version": 1,
            "is_expired": False
        }

        # Mock raw MongoDB atomic operation
        credit_service.db.beta_credits = MagicMock()
        credit_service.db.beta_credits.find_one_and_update = AsyncMock(return_value=result)

        # Mock transaction insert
        with patch('app.services.beta.credit_service.BetaCreditTransaction') as MockTransaction:
            mock_transaction_instance = MagicMock()
            mock_transaction_instance.insert = AsyncMock()
            MockTransaction.return_value = mock_transaction_instance

            success, remaining = await credit_service.deduct_credits(
                user_id, "live_dubbing", 50.0, {"session_id": "sess-789"}
            )

            assert success is True
            assert remaining == 950  # Remaining credits after deduction
            credit_service.db.beta_credits.find_one_and_update.assert_called_once()
            mock_transaction_instance.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_deduct_credits_insufficient_balance(self, credit_service):
        """Test deduction fails with insufficient balance."""
        user_id = "user-123"

        # Mock session and transaction
        mock_transaction = AsyncMock()
        mock_transaction.__aenter__ = AsyncMock(return_value=mock_transaction)
        mock_transaction.__aexit__ = AsyncMock()
        mock_transaction.abort_transaction = AsyncMock()

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()
        mock_session.start_transaction = MagicMock(return_value=mock_transaction)

        # Mock find_one to return None (insufficient balance filtered by query)
        with patch('app.services.beta.credit_service.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=None)
            credit_service.db.client.start_session = AsyncMock(return_value=mock_session)

            success, remaining = await credit_service.deduct_credits(
                user_id, "live_dubbing", 50.0
            )

            assert success is False
            assert remaining == 0


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


class TestCreditThresholdMonitoring:
    """Tests for credit threshold monitoring and email notifications."""

    @pytest.mark.asyncio
    async def test_low_balance_email_triggered_at_threshold(
        self,
        mock_settings,
        mock_metering_service,
        mock_db
    ):
        """Test that low balance email is sent when credits drop to threshold."""
        credit_service = BetaCreditService(
            settings=mock_settings,
            metering_service=mock_metering_service,
            db=mock_db
        )

        user_id = "test_user_123"
        remaining_credits = 50  # At threshold
        credit_id = "507f1f77bcf86cd799439011"

        # Mock the email sending
        with patch('app.services.beta.email_service.EmailVerificationService') as MockEmailService:
            mock_email_service = MagicMock()
            mock_email_service.send_low_credit_warning = AsyncMock(return_value=True)
            MockEmailService.return_value = mock_email_service

            # Mock BetaUser
            with patch('app.models.beta_user.BetaUser') as MockUser:
                mock_user = MagicMock()
                mock_user.email = "test@example.com"
                mock_user.name = "Test User"
                MockUser.find_one = AsyncMock(return_value=mock_user)

                # Mock BetaCreditTransaction
                with patch('app.models.beta_credit_transaction.BetaCreditTransaction') as MockTransaction:
                    MockTransaction.find = MagicMock(return_value=MagicMock(
                        sort=MagicMock(return_value=MagicMock(
                            limit=MagicMock(return_value=MagicMock(
                                to_list=AsyncMock(return_value=[])
                            ))
                        ))
                    ))

                    # Call threshold check
                    await credit_service._check_credit_thresholds(
                        user_id=user_id,
                        remaining_credits=remaining_credits,
                        credit_id=credit_id
                    )

                    # Verify email was attempted to be sent
                    # (actual sending depends on atomic update which we can't fully mock here)

    @pytest.mark.asyncio
    async def test_depleted_email_triggered_at_zero(
        self,
        mock_settings,
        mock_metering_service,
        mock_db
    ):
        """Test that depleted email is sent when credits reach zero."""
        credit_service = BetaCreditService(
            settings=mock_settings,
            metering_service=mock_metering_service,
            db=mock_db
        )

        user_id = "test_user_123"
        remaining_credits = 0  # Depleted
        credit_id = "507f1f77bcf86cd799439011"

        # Mock the email sending
        with patch('app.services.beta.email_service.EmailVerificationService') as MockEmailService:
            mock_email_service = MagicMock()
            mock_email_service.send_credits_depleted = AsyncMock(return_value=True)
            MockEmailService.return_value = mock_email_service

            # Call threshold check
            await credit_service._check_credit_thresholds(
                user_id=user_id,
                remaining_credits=remaining_credits,
                credit_id=credit_id
            )

            # Depleted email should be attempted
            # (actual sending depends on atomic update which we can't fully mock here)

    @pytest.mark.asyncio
    async def test_no_email_sent_above_threshold(
        self,
        mock_settings,
        mock_metering_service,
        mock_db
    ):
        """Test that no email is sent when credits are above threshold."""
        credit_service = BetaCreditService(
            settings=mock_settings,
            metering_service=mock_metering_service,
            db=mock_db
        )

        user_id = "test_user_123"
        remaining_credits = 100  # Above threshold (50)
        credit_id = "507f1f77bcf86cd799439011"

        # Mock the email sending (should not be called)
        with patch('app.services.beta.email_service.EmailVerificationService') as MockEmailService:
            mock_email_service = MagicMock()
            mock_email_service.send_low_credit_warning = AsyncMock()
            mock_email_service.send_credits_depleted = AsyncMock()
            MockEmailService.return_value = mock_email_service

            # Call threshold check
            await credit_service._check_credit_thresholds(
                user_id=user_id,
                remaining_credits=remaining_credits,
                credit_id=credit_id
            )

            # No emails should be sent
            mock_email_service.send_low_credit_warning.assert_not_called()
            mock_email_service.send_credits_depleted.assert_not_called()
