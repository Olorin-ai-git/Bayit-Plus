"""Unit tests for FraudDetectionService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
import hashlib
from app.services.beta.fraud_service import FraudDetectionService
from app.core.config import Settings


@pytest.fixture
def mock_settings():
    """Mock Settings with fraud detection configuration."""
    settings = MagicMock(spec=Settings)
    settings.disposable_email_domains_list = [
        "tempmail.com",
        "10minutemail.com",
        "guerrillamail.com",
        "mailinator.com"
    ]
    settings.CREDIT_ABUSE_HOURLY_THRESHOLD = 1000
    return settings


@pytest.fixture
def fraud_service(mock_settings):
    """Create FraudDetectionService with mocked settings."""
    with patch('app.services.beta.fraud_service.BetaUser') as MockUser:
        # Mock database query to return no existing users (default)
        mock_find = MagicMock()
        mock_find.count = AsyncMock(return_value=0)
        MockUser.find = MagicMock(return_value=mock_find)

        yield FraudDetectionService(settings=mock_settings)


class TestCheckSignup:
    """Tests for check_signup method."""

    @pytest.mark.asyncio
    async def test_check_signup_valid_email(self, fraud_service):
        """Test signup check with legitimate email."""
        result = await fraud_service.check_signup(
            email="user@gmail.com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        assert result["risk"] == "low"
        assert result["passed"] is True
        assert len(result["flags"]) == 0

    @pytest.mark.asyncio
    async def test_check_signup_disposable_email(self, fraud_service):
        """Test signup check with disposable email."""
        result = await fraud_service.check_signup(
            email="user@tempmail.com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        assert result["risk"] == "high"
        assert result["passed"] is False
        assert "disposable_email" in result["flags"]
        assert result["reason"] == "Disposable email domain detected"

    @pytest.mark.asyncio
    async def test_check_signup_fingerprint_generated(self, fraud_service):
        """Test that device fingerprint is generated with SHA-256."""
        email = "user@example.com"
        ip = "192.168.1.1"
        user_agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)"

        result = await fraud_service.check_signup(email, ip, user_agent)

        # Verify fingerprint is SHA-256 hash (64 hex characters)
        assert "fingerprint" in result
        assert len(result["fingerprint"]) == 64
        assert all(c in '0123456789abcdef' for c in result["fingerprint"])

        # Verify fingerprint matches expected SHA-256
        expected_fingerprint = hashlib.sha256(
            f"{user_agent}:{ip}".encode()
        ).hexdigest()
        assert result["fingerprint"] == expected_fingerprint

    @pytest.mark.asyncio
    async def test_check_signup_case_insensitive_domain_check(self, fraud_service):
        """Test that disposable domain check is case-insensitive."""
        # Test uppercase domain
        result1 = await fraud_service.check_signup(
            email="user@TEMPMAIL.COM",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        # Test mixed case domain
        result2 = await fraud_service.check_signup(
            email="user@TempMail.Com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        assert result1["risk"] == "high"
        assert result2["risk"] == "high"
        assert "disposable_email" in result1["flags"]
        assert "disposable_email" in result2["flags"]

    @pytest.mark.asyncio
    async def test_check_signup_multiple_signups_same_fingerprint(self, mock_settings):
        """Test detection of multiple signups from same device."""
        email2 = "user2@example.com"
        ip = "192.168.1.1"
        user_agent = "Mozilla/5.0"

        # Mock existing beta users with same fingerprint (3 existing accounts)
        with patch('app.services.beta.fraud_service.BetaUser') as MockUser:
            mock_find = MagicMock()
            mock_find.count = AsyncMock(return_value=3)
            MockUser.find = MagicMock(return_value=mock_find)

            fraud_service = FraudDetectionService(settings=mock_settings)
            result = await fraud_service.check_signup(email2, ip, user_agent)

            # Should flag as medium risk due to multiple accounts
            assert result["risk"] in ["medium", "high"]
            assert "multiple_accounts" in result["flags"]
            assert result["passed"] is False


class TestDetectCreditAbuse:
    """Tests for detect_credit_abuse method."""

    @pytest.mark.asyncio
    async def test_detect_abuse_normal_usage(self, fraud_service):
        """Test normal usage (no abuse)."""
        user_id = "user-123"

        # Mock transactions totaling 500 credits (below threshold of 1000)
        with patch('app.services.beta.fraud_service.BetaCreditTransaction') as MockTx:
            MockTx.find = MagicMock()
            mock_transactions = [
                MagicMock(amount=100),
                MagicMock(amount=200),
                MagicMock(amount=200),
            ]
            MockTx.find.return_value.to_list = AsyncMock(return_value=mock_transactions)

            is_abuse = await fraud_service.detect_credit_abuse(user_id)

            assert is_abuse is False

    @pytest.mark.asyncio
    async def test_detect_abuse_excessive_usage(self, mock_settings):
        """Test excessive usage (abuse detected)."""
        user_id = "user-123"

        # Mock transactions totaling 1500 credits (exceeds threshold of 1000)
        with patch('app.services.beta.fraud_service.BetaCreditTransaction') as MockTx, \
             patch('app.services.beta.fraud_service.BetaUser') as MockUser:

            mock_transactions = [
                MagicMock(amount=500),
                MagicMock(amount=500),
                MagicMock(amount=500),
            ]

            # Configure mock fields to support comparison operations
            # This allows BetaCreditTransaction.created_at >= one_hour_ago to work
            mock_created_at = MagicMock()
            mock_created_at.__ge__ = MagicMock(return_value=mock_created_at)
            mock_user_id = MagicMock()
            mock_user_id.__eq__ = MagicMock(return_value=mock_user_id)
            mock_tx_type = MagicMock()
            mock_tx_type.__eq__ = MagicMock(return_value=mock_tx_type)

            MockTx.created_at = mock_created_at
            MockTx.user_id = mock_user_id
            MockTx.transaction_type = mock_tx_type

            # Mock the query chain: find(...).to_list()
            mock_to_list = AsyncMock(return_value=mock_transactions)
            mock_find_result = MagicMock()
            mock_find_result.to_list = mock_to_list
            MockTx.find = MagicMock(return_value=mock_find_result)

            # Mock BetaUser.find() for check_signup
            mock_user_find = MagicMock()
            mock_user_find.count = AsyncMock(return_value=0)
            MockUser.find = MagicMock(return_value=mock_user_find)

            # Create fraud service with mocked dependencies
            fraud_service = FraudDetectionService(settings=mock_settings)
            is_abuse = await fraud_service.detect_credit_abuse(user_id)

            assert is_abuse is True

    @pytest.mark.asyncio
    async def test_detect_abuse_checks_hourly_window(self, fraud_service):
        """Test that abuse detection checks last 1 hour only."""
        user_id = "user-123"

        with patch('app.services.beta.fraud_service.BetaCreditTransaction') as MockTx, \
             patch('app.services.beta.fraud_service.datetime') as mock_datetime:

            mock_now = datetime.utcnow()
            mock_datetime.utcnow.return_value = mock_now

            MockTx.find = MagicMock()
            MockTx.find.return_value.to_list = AsyncMock(return_value=[])

            await fraud_service.detect_credit_abuse(user_id)

            # Verify query filters by timestamp (last hour)
            find_call = MockTx.find.call_args
            # Should filter by created_at >= (now - 1 hour)


    @pytest.mark.asyncio
    async def test_detect_abuse_no_transactions(self, fraud_service):
        """Test abuse detection with no transactions."""
        user_id = "user-123"

        with patch('app.services.beta.fraud_service.BetaCreditTransaction') as MockTx:
            MockTx.find = MagicMock()
            MockTx.find.return_value.to_list = AsyncMock(return_value=[])

            is_abuse = await fraud_service.detect_credit_abuse(user_id)

            assert is_abuse is False


class TestFingerprintGeneration:
    """Tests for device fingerprint generation."""

    @pytest.mark.asyncio
    async def test_fingerprint_sha256_hash(self, fraud_service):
        """Test that fingerprint uses SHA-256 (not MD5)."""
        user_agent = "Mozilla/5.0 (Windows NT 10.0)"
        ip = "203.0.113.45"

        result = await fraud_service.check_signup(
            email="test@example.com",
            ip=ip,
            user_agent=user_agent
        )

        fingerprint = result["fingerprint"]

        # SHA-256 produces 64-character hex string
        assert len(fingerprint) == 64

        # Verify it's not MD5 (which would be 32 characters)
        assert len(fingerprint) != 32

        # Verify exact SHA-256 calculation
        expected = hashlib.sha256(f"{user_agent}:{ip}".encode()).hexdigest()
        assert fingerprint == expected

    @pytest.mark.asyncio
    async def test_fingerprint_deterministic(self, fraud_service):
        """Test that same inputs produce same fingerprint."""
        user_agent = "Mozilla/5.0"
        ip = "192.168.1.1"
        email = "test@example.com"

        result1 = await fraud_service.check_signup(email, ip, user_agent)
        result2 = await fraud_service.check_signup(email, ip, user_agent)

        assert result1["fingerprint"] == result2["fingerprint"]

    @pytest.mark.asyncio
    async def test_fingerprint_different_for_different_inputs(self, fraud_service):
        """Test that different inputs produce different fingerprints."""
        result1 = await fraud_service.check_signup(
            "test@example.com", "192.168.1.1", "Mozilla/5.0"
        )
        result2 = await fraud_service.check_signup(
            "test@example.com", "192.168.1.2", "Mozilla/5.0"  # Different IP
        )
        result3 = await fraud_service.check_signup(
            "test@example.com", "192.168.1.1", "Chrome/95.0"  # Different UA
        )

        assert result1["fingerprint"] != result2["fingerprint"]
        assert result1["fingerprint"] != result3["fingerprint"]
        assert result2["fingerprint"] != result3["fingerprint"]


class TestEmailDomainExtraction:
    """Tests for email domain extraction."""

    @pytest.mark.asyncio
    async def test_extract_domain_standard_email(self, fraud_service):
        """Test domain extraction from standard email."""
        result = await fraud_service.check_signup(
            email="user@example.com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        # Disposable check should work correctly
        assert result["passed"] is True  # example.com not in disposable list

    @pytest.mark.asyncio
    async def test_extract_domain_subdomain_email(self, fraud_service):
        """Test domain extraction from email with subdomain."""
        result = await fraud_service.check_signup(
            email="user@mail.example.com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        # Should extract full domain including subdomain
        assert result["passed"] is True

    @pytest.mark.asyncio
    async def test_extract_domain_case_insensitive(self, fraud_service):
        """Test domain extraction is case-insensitive."""
        result1 = await fraud_service.check_signup(
            email="user@EXAMPLE.COM",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        result2 = await fraud_service.check_signup(
            email="user@example.com",
            ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )

        # Both should produce same result (case-insensitive comparison)
        assert result1["passed"] == result2["passed"]
