"""Integration tests for Beta 500 API endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_beta_user():
    """Mock BetaUser model."""
    user = MagicMock()
    user.id = "user-123"
    user.email = "test@example.com"
    user.status = "pending_verification"
    user.created_at = datetime.utcnow()
    user.expires_at = datetime.utcnow() + timedelta(days=90)
    user.save = AsyncMock()
    user.insert = AsyncMock()
    return user


@pytest.fixture
def mock_beta_credit():
    """Mock BetaCredit model."""
    credit = MagicMock()
    credit.id = "credit-456"
    credit.user_id = "user-123"
    credit.total_credits = 5000
    credit.used_credits = 1000
    credit.remaining_credits = 4000
    credit.is_expired = False
    credit.save = AsyncMock()
    return credit


@pytest.fixture
def mock_beta_session():
    """Mock BetaSession model."""
    session = MagicMock()
    session.id = "session-789"
    session.session_id = "sess-unique-123"
    session.user_id = "user-123"
    session.feature = "live_dubbing"
    session.status = "active"
    session.last_checkpoint = datetime.utcnow()
    session.credits_consumed = 0
    session.duration_seconds = MagicMock(return_value=30.0)
    session.save = AsyncMock()
    session.insert = AsyncMock()
    return session


class TestBetaSignupEndpoint:
    """Tests for POST /beta/signup endpoint."""

    @pytest.mark.asyncio
    async def test_signup_success(self, client):
        """Test successful beta signup."""
        with patch('app.api.routes.beta.signup.BetaUser') as MockUser, \
             patch('app.api.routes.beta.signup.FraudDetectionService') as MockFraud, \
             patch('app.api.routes.beta.signup.EmailVerificationService') as MockEmail:

            # Setup mocks
            MockUser.find.return_value.count = AsyncMock(return_value=100)  # Not full
            MockUser.find_one = AsyncMock(return_value=None)  # No existing user
            mock_user = MagicMock()
            mock_user.id = "user-123"
            MockUser.return_value = mock_user
            mock_user.insert = AsyncMock()

            mock_fraud = MockFraud.return_value
            mock_fraud.check_signup = AsyncMock(return_value={"risk": "low", "passed": True})

            mock_email_service = MockEmail.return_value
            mock_email_service.generate_verification_token = MagicMock(return_value="token-123")
            mock_email_service.send_verification_email = AsyncMock()

            response = client.post(
                "/api/v1/beta/signup",
                json={
                    "email": "newuser@example.com",
                    "ip": "192.168.1.1",
                    "user_agent": "Mozilla/5.0"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "verification email sent" in data["message"].lower()
            assert data["user_id"] == "user-123"

    @pytest.mark.asyncio
    async def test_signup_program_full(self, client):
        """Test signup when beta program is full."""
        with patch('app.api.routes.beta.signup.BetaUser') as MockUser:
            MockUser.find.return_value.count = AsyncMock(return_value=500)  # Full

            response = client.post(
                "/api/v1/beta/signup",
                json={
                    "email": "newuser@example.com",
                    "ip": "192.168.1.1",
                    "user_agent": "Mozilla/5.0"
                }
            )

            assert response.status_code == 400
            assert "full" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_signup_duplicate_email(self, client):
        """Test signup with already registered email."""
        with patch('app.api.routes.beta.signup.BetaUser') as MockUser:
            MockUser.find.return_value.count = AsyncMock(return_value=100)
            existing_user = MagicMock()
            MockUser.find_one = AsyncMock(return_value=existing_user)

            response = client.post(
                "/api/v1/beta/signup",
                json={
                    "email": "existing@example.com",
                    "ip": "192.168.1.1",
                    "user_agent": "Mozilla/5.0"
                }
            )

            assert response.status_code == 400
            assert "already registered" in response.json()["detail"].lower()


class TestBetaVerifyEndpoint:
    """Tests for GET /beta/verify/{token} endpoint."""

    @pytest.mark.asyncio
    async def test_verify_success(self, client, mock_beta_user):
        """Test successful email verification."""
        with patch('app.api.routes.beta.signup.EmailVerificationService') as MockEmail, \
             patch('app.api.routes.beta.signup.BetaCreditService') as MockCredit, \
             patch('app.api.routes.beta.signup.BetaUser') as MockUser:

            mock_email_service = MockEmail.return_value
            mock_email_service.verify_user_email = AsyncMock(return_value=(True, None))
            mock_email_service.verify_token = MagicMock(return_value=(True, "test@example.com", None))

            MockUser.find_one = AsyncMock(return_value=mock_beta_user)

            mock_credit_service = MockCredit.return_value
            mock_credit_service.allocate_credits = AsyncMock()

            response = client.get("/api/v1/beta/verify/valid-token-123")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "verified successfully" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_verify_invalid_token(self, client):
        """Test verification with invalid token."""
        with patch('app.api.routes.beta.signup.EmailVerificationService') as MockEmail:
            mock_email_service = MockEmail.return_value
            mock_email_service.verify_user_email = AsyncMock(return_value=(False, "invalid_format"))

            response = client.get("/api/v1/beta/verify/invalid-token")

            assert response.status_code == 400
            assert "invalid" in response.json()["detail"].lower()


class TestCreditBalanceEndpoint:
    """Tests for GET /beta/credits/balance/{user_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_balance_success(self, client, mock_beta_credit):
        """Test successful balance retrieval."""
        with patch('app.api.routes.beta.credits.BetaCredit') as MockCredit, \
             patch('app.api.routes.beta.credits.BetaCreditService') as MockService:

            MockCredit.find_one = AsyncMock(return_value=mock_beta_credit)

            mock_service = MockService.return_value
            mock_service.is_low_balance = AsyncMock(return_value=(False, 4000))
            mock_service.is_critical_balance = AsyncMock(return_value=(False, 4000))

            response = client.get("/api/v1/beta/credits/balance/user-123")

            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user-123"
            assert data["remaining_credits"] == 4000
            assert data["total_credits"] == 5000
            assert data["used_credits"] == 1000
            assert data["is_low"] is False
            assert data["is_critical"] is False

    @pytest.mark.asyncio
    async def test_get_balance_not_found(self, client):
        """Test balance retrieval for non-existent user."""
        with patch('app.api.routes.beta.credits.BetaCredit') as MockCredit:
            MockCredit.find_one = AsyncMock(return_value=None)

            response = client.get("/api/v1/beta/credits/balance/nonexistent-user")

            assert response.status_code == 404


class TestCreditDeductEndpoint:
    """Tests for POST /beta/credits/deduct endpoint."""

    @pytest.mark.asyncio
    async def test_deduct_success(self, client):
        """Test successful credit deduction."""
        with patch('app.api.routes.beta.credits.BetaCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.deduct_credits = AsyncMock(return_value=(True, 3950))

            response = client.post(
                "/api/v1/beta/credits/deduct",
                json={
                    "user_id": "user-123",
                    "feature": "live_dubbing",
                    "usage_amount": 50.0,
                    "metadata": {"session_id": "sess-789"}
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["remaining_credits"] == 3950

    @pytest.mark.asyncio
    async def test_deduct_insufficient_credits(self, client):
        """Test deduction with insufficient credits."""
        with patch('app.api.routes.beta.credits.BetaCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.deduct_credits = AsyncMock(return_value=(False, 10))

            response = client.post(
                "/api/v1/beta/credits/deduct",
                json={
                    "user_id": "user-123",
                    "feature": "live_dubbing",
                    "usage_amount": 50.0
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "insufficient" in data["message"].lower()


class TestSessionStartEndpoint:
    """Tests for POST /beta/sessions/start endpoint."""

    @pytest.mark.asyncio
    async def test_start_session_success(self, client):
        """Test successful session start."""
        with patch('app.api.routes.beta.sessions.SessionBasedCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.start_dubbing_session = AsyncMock(return_value="sess-unique-123")

            response = client.post(
                "/api/v1/beta/sessions/start",
                json={
                    "user_id": "user-123",
                    "feature": "live_dubbing",
                    "metadata": {"device": "iOS"}
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "sess-unique-123"
            assert "started successfully" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_start_session_insufficient_credits(self, client):
        """Test session start with insufficient credits."""
        with patch('app.api.routes.beta.sessions.SessionBasedCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.start_dubbing_session = AsyncMock(return_value=None)

            response = client.post(
                "/api/v1/beta/sessions/start",
                json={
                    "user_id": "user-123",
                    "feature": "live_dubbing"
                }
            )

            assert response.status_code == 500


class TestSessionCheckpointEndpoint:
    """Tests for POST /beta/sessions/{session_id}/checkpoint endpoint."""

    @pytest.mark.asyncio
    async def test_checkpoint_success(self, client):
        """Test successful session checkpoint."""
        with patch('app.api.routes.beta.sessions.SessionBasedCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.checkpoint_session = AsyncMock(return_value=3970)

            response = client.post("/api/v1/beta/sessions/sess-123/checkpoint")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["remaining_credits"] == 3970

    @pytest.mark.asyncio
    async def test_checkpoint_insufficient_credits(self, client):
        """Test checkpoint when credits depleted."""
        with patch('app.api.routes.beta.sessions.SessionBasedCreditService') as MockService:
            mock_service = MockService.return_value
            mock_service.checkpoint_session = AsyncMock(return_value=0)

            response = client.post("/api/v1/beta/sessions/sess-123/checkpoint")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["remaining_credits"] == 0


class TestSessionEndEndpoint:
    """Tests for POST /beta/sessions/{session_id}/end endpoint."""

    @pytest.mark.asyncio
    async def test_end_session_success(self, client, mock_beta_session):
        """Test successful session end."""
        with patch('app.api.routes.beta.sessions.SessionBasedCreditService') as MockService, \
             patch('app.api.routes.beta.sessions.BetaSession') as MockSession:

            MockSession.find_one = AsyncMock(side_effect=[mock_beta_session, mock_beta_session])

            mock_service = MockService.return_value
            mock_service.end_session = AsyncMock(return_value=3950)

            response = client.post(
                "/api/v1/beta/sessions/sess-123/end",
                json={"reason": "completed"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["remaining_credits"] == 3950
            assert data["duration_seconds"] == 30.0


class TestProgramStatusEndpoint:
    """Tests for GET /beta/status endpoint."""

    @pytest.mark.asyncio
    async def test_status_program_open(self, client):
        """Test program status when slots available."""
        with patch('app.api.routes.beta.status.BetaUser') as MockUser:
            MockUser.find.return_value.count = AsyncMock(return_value=250)

            response = client.get("/api/v1/beta/status")

            assert response.status_code == 200
            data = response.json()
            assert data["is_open"] is True
            assert data["total_slots"] == 500
            assert data["filled_slots"] == 250
            assert data["available_slots"] == 250
            assert data["program_name"] == "Beta 500"

    @pytest.mark.asyncio
    async def test_status_program_full(self, client):
        """Test program status when full."""
        with patch('app.api.routes.beta.status.BetaUser') as MockUser:
            MockUser.find.return_value.count = AsyncMock(return_value=500)

            response = client.get("/api/v1/beta/status")

            assert response.status_code == 200
            data = response.json()
            assert data["is_open"] is False
            assert data["filled_slots"] == 500
            assert data["available_slots"] == 0
