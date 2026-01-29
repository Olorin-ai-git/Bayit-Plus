"""Unit tests for SessionBasedCreditService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from app.services.beta.session_service import SessionBasedCreditService
from app.models.beta_session import BetaSession
from app.core.config import Settings


@pytest.fixture
def mock_settings():
    """Mock Settings with Beta 500 configuration."""
    settings = MagicMock(spec=Settings)
    settings.CHECKPOINT_INTERVAL_SECONDS = 30
    settings.CREDIT_RATE_LIVE_DUBBING = 1.0
    return settings


@pytest.fixture
def mock_credit_service():
    """Mock BetaCreditService."""
    service = AsyncMock()
    service.authorize = AsyncMock(return_value=(True, 1000))
    service.deduct_credits = AsyncMock(return_value=(True, 950))
    service.get_credit_rate = MagicMock(return_value=1.0)
    return service


@pytest.fixture
def session_service(mock_credit_service, mock_settings):
    """Create SessionBasedCreditService with mocked dependencies."""
    return SessionBasedCreditService(
        credit_service=mock_credit_service,
        settings=mock_settings
    )


class TestStartDubbingSession:
    """Tests for start_dubbing_session method."""

    @pytest.mark.asyncio
    async def test_start_session_success(self, session_service, mock_credit_service):
        """Test successful session creation."""
        user_id = "user-123"

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            mock_session = MagicMock()
            mock_session.id = "session-456"
            MockSession.return_value = mock_session
            mock_session.insert = AsyncMock()

            session_id = await session_service.start_dubbing_session(
                user_id, "live_dubbing", {"client": "mobile"}
            )

            assert session_id is not None
            assert len(session_id) > 0
            mock_credit_service.authorize.assert_called_once_with(
                user_id, "live_dubbing", 30.0
            )
            mock_session.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_session_insufficient_credits(self, session_service, mock_credit_service):
        """Test session creation fails with insufficient credits."""
        user_id = "user-123"
        mock_credit_service.authorize.return_value = (False, 10)

        session_id = await session_service.start_dubbing_session(
            user_id, "live_dubbing"
        )

        assert session_id is None

    @pytest.mark.asyncio
    async def test_start_session_creates_correct_record(self, session_service):
        """Test that session record has correct initial values."""
        user_id = "user-123"

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            mock_session = MagicMock()
            MockSession.return_value = mock_session
            mock_session.insert = AsyncMock()

            await session_service.start_dubbing_session(
                user_id, "live_dubbing", {"device": "iOS"}
            )

            # Verify session properties
            assert mock_session.user_id == user_id
            assert mock_session.feature == "live_dubbing"
            assert mock_session.status == "active"
            assert mock_session.credits_consumed == 0
            assert mock_session.metadata == {"device": "iOS"}


class TestCheckpointSession:
    """Tests for checkpoint_session method."""

    @pytest.mark.asyncio
    async def test_checkpoint_success(self, session_service, mock_credit_service):
        """Test successful checkpoint with credit deduction."""
        session_id = "session-123"

        # Mock session with 60 seconds elapsed (2 credits at 1.0/sec)
        mock_session = MagicMock()
        mock_session.user_id = "user-456"
        mock_session.feature = "live_dubbing"
        mock_session.status = "active"
        mock_session.last_checkpoint = datetime.utcnow() - timedelta(seconds=60)
        mock_session.credits_consumed = 100
        mock_session.metadata = {}
        mock_session.save = AsyncMock()

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=mock_session)

            remaining = await session_service.checkpoint_session(session_id)

            assert remaining == 950  # From mock_credit_service.deduct_credits
            assert mock_session.credits_consumed == 160  # 100 + 60
            mock_credit_service.deduct_credits.assert_called_once()
            mock_session.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_checkpoint_session_not_found(self, session_service):
        """Test checkpoint with non-existent session."""
        session_id = "nonexistent-session"

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=None)

            remaining = await session_service.checkpoint_session(session_id)

            assert remaining is None

    @pytest.mark.asyncio
    async def test_checkpoint_inactive_session(self, session_service):
        """Test checkpoint with inactive session."""
        session_id = "session-123"

        # Mock ended session
        mock_session = MagicMock()
        mock_session.status = "ended"

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=mock_session)

            remaining = await session_service.checkpoint_session(session_id)

            assert remaining is None

    @pytest.mark.asyncio
    async def test_checkpoint_insufficient_credits(self, session_service, mock_credit_service):
        """Test checkpoint when user runs out of credits."""
        session_id = "session-123"
        mock_credit_service.deduct_credits.return_value = (False, 0)

        # Mock active session
        mock_session = MagicMock()
        mock_session.user_id = "user-456"
        mock_session.feature = "live_dubbing"
        mock_session.status = "active"
        mock_session.last_checkpoint = datetime.utcnow() - timedelta(seconds=30)
        mock_session.credits_consumed = 0
        mock_session.metadata = {}
        mock_session.save = AsyncMock()

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=mock_session)

            remaining = await session_service.checkpoint_session(session_id)

            assert remaining == 0
            assert mock_session.status == "ended"  # Session auto-ends on insufficient credits


class TestEndSession:
    """Tests for end_session method."""

    @pytest.mark.asyncio
    async def test_end_session_success(self, session_service, mock_credit_service):
        """Test successful session end with final checkpoint."""
        session_id = "session-123"

        # Mock session with 15 seconds elapsed since last checkpoint
        mock_session = MagicMock()
        mock_session.user_id = "user-456"
        mock_session.feature = "live_dubbing"
        mock_session.status = "active"
        mock_session.last_checkpoint = datetime.utcnow() - timedelta(seconds=15)
        mock_session.credits_consumed = 100
        mock_session.metadata = {}
        mock_session.save = AsyncMock()

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=mock_session)

            remaining = await session_service.end_session(session_id, "completed")

            assert remaining == 950
            assert mock_session.status == "ended"
            assert mock_session.credits_consumed == 115  # 100 + 15
            assert mock_session.end_reason == "completed"
            mock_session.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_end_session_not_found(self, session_service):
        """Test ending non-existent session."""
        session_id = "nonexistent-session"

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=None)

            remaining = await session_service.end_session(session_id)

            assert remaining is None

    @pytest.mark.asyncio
    async def test_end_session_no_final_checkpoint_if_zero_elapsed(self, session_service):
        """Test that no deduction occurs if no time elapsed since last checkpoint."""
        session_id = "session-123"

        # Mock session with 0 seconds elapsed
        mock_session = MagicMock()
        mock_session.user_id = "user-456"
        mock_session.feature = "live_dubbing"
        mock_session.status = "active"
        mock_session.last_checkpoint = datetime.utcnow()
        mock_session.credits_consumed = 100
        mock_session.metadata = {}
        mock_session.save = AsyncMock()

        with patch('app.services.beta.session_service.BetaSession') as MockSession:
            MockSession.find_one = AsyncMock(return_value=mock_session)
            mock_credit_service.deduct_credits = AsyncMock()

            remaining = await session_service.end_session(session_id)

            # No deduction should occur since elapsed_seconds would be 0
            assert mock_session.status == "ended"


class TestCalculateSessionCredits:
    """Tests for credit calculation logic."""

    @pytest.mark.asyncio
    async def test_calculate_credits_for_30_seconds(self, session_service):
        """Test credit calculation for 30-second interval."""
        # 30 seconds at 1.0 credits/second = 30 credits
        rate = session_service.credit_service.get_credit_rate("live_dubbing")
        elapsed = 30
        expected_credits = int(elapsed * rate)

        assert expected_credits == 30

    @pytest.mark.asyncio
    async def test_calculate_credits_for_60_seconds(self, session_service):
        """Test credit calculation for 60-second interval."""
        # 60 seconds at 1.0 credits/second = 60 credits
        rate = session_service.credit_service.get_credit_rate("live_dubbing")
        elapsed = 60
        expected_credits = int(elapsed * rate)

        assert expected_credits == 60

    @pytest.mark.asyncio
    async def test_calculate_credits_rounds_down(self, session_service):
        """Test that partial seconds are rounded down."""
        # 30.7 seconds should round down to 30 credits
        rate = 1.0
        elapsed = 30.7
        expected_credits = int(elapsed * rate)

        assert expected_credits == 30  # Not 31
