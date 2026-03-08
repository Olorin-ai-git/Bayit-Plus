"""
Integration tests for Authentication API endpoints.

Tests cover:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- POST /api/v1/auth/refresh
- POST /api/v1/auth/google/callback
- POST /api/v1/auth/logout
- PATCH /api/v1/auth/profile
- POST /api/v1/auth/reset-password
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from beanie import init_beanie

pytestmark = pytest.mark.integration
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client with User model."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_auth_api"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User],
    )

    yield client

    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def verified_user(db_client):
    """Create a verified, active test user with auth token."""
    user = User(
        email="verified@example.com",
        name="Verified User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
    )
    await user.insert()

    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest_asyncio.fixture
async def unverified_user(db_client):
    """Create an unverified test user."""
    user = User(
        email="unverified@example.com",
        name="Unverified User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=False,
        phone_verified=False,
        is_verified=False,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def inactive_user(db_client):
    """Create an inactive test user."""
    user = User(
        email="inactive@example.com",
        name="Inactive User",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=False,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def admin_user(db_client):
    """Create an admin test user with token."""
    user = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password=get_password_hash("Admin@1234"),
        role="admin",
        is_active=True,
        email_verified=True,
        phone_verified=True,
        is_verified=True,
    )
    await user.insert()

    token = create_access_token(data={"sub": str(user.id)})
    return {"user": user, "token": token}


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestRegister:
    """Tests for POST /api/v1/auth/register."""

    @patch("app.api.routes.auth.verification_service", new_callable=MagicMock)
    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_register_success(
        self, mock_audit, mock_verification, db_client, client
    ):
        """Test successful user registration."""
        mock_verification.initiate_email_verification = AsyncMock()
        mock_audit.log_registration = AsyncMock()

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "name": "New User",
                "password": "Strong@Pass1",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["name"] == "New User"
        assert data["token_type"] == "bearer"

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self, mock_audit, db_client, verified_user, client
    ):
        """Test registration with existing email returns generic error."""
        mock_audit.log_registration = AsyncMock()

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "verified@example.com",
                "name": "Duplicate",
                "password": "Strong@Pass1",
            },
        )

        assert response.status_code == 400
        assert "verification link" in response.json()["detail"].lower() or "available" in response.json()["detail"].lower()

    def test_register_weak_password(self, client):
        """Test registration with weak password is rejected."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "name": "Weak Pass",
                "password": "short",
            },
        )

        assert response.status_code == 422

    def test_register_invalid_email(self, client):
        """Test registration with invalid email is rejected."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "name": "Bad Email",
                "password": "Strong@Pass1",
            },
        )

        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com"},
        )

        assert response.status_code == 422


class TestLogin:
    """Tests for POST /api/v1/auth/login."""

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_success(
        self, mock_audit, db_client, verified_user, client
    ):
        """Test successful login with valid credentials."""
        mock_audit.log_login_success = AsyncMock()
        mock_audit.log_login_failure = AsyncMock()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "verified@example.com",
                "password": "Test@1234",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "verified@example.com"
        assert data["user"]["is_active"] is True

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_wrong_password(
        self, mock_audit, db_client, verified_user, client
    ):
        """Test login with wrong password returns 401."""
        mock_audit.log_login_failure = AsyncMock()
        mock_audit.log_account_locked = AsyncMock()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "verified@example.com",
                "password": "WrongPassword1!",
            },
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(
        self, mock_audit, db_client, client
    ):
        """Test login with non-existent email returns 401."""
        mock_audit.log_login_failure = AsyncMock()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "Test@1234",
            },
        )

        assert response.status_code == 401

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self, mock_audit, db_client, inactive_user, client
    ):
        """Test login with inactive account returns 403."""
        mock_audit.log_login_failure = AsyncMock()
        mock_audit.log_login_success = AsyncMock()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "Test@1234",
            },
        )

        assert response.status_code == 403

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_unverified_user(
        self, mock_audit, db_client, unverified_user, client
    ):
        """Test login with unverified email returns 403."""
        mock_audit.log_login_failure = AsyncMock()
        mock_audit.log_login_success = AsyncMock()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "unverified@example.com",
                "password": "Test@1234",
            },
        )

        assert response.status_code == 403
        assert "verify" in response.json()["detail"].lower()

    @patch("app.api.routes.auth.audit_logger")
    @pytest.mark.asyncio
    async def test_login_account_lockout(
        self, mock_audit, db_client, verified_user, client
    ):
        """Test account lockout after multiple failed attempts."""
        mock_audit.log_login_failure = AsyncMock()
        mock_audit.log_account_locked = AsyncMock()

        for _ in range(5):
            client.post(
                "/api/v1/auth/login",
                json={
                    "email": "verified@example.com",
                    "password": "Wrong@Pass1",
                },
            )

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "verified@example.com",
                "password": "Wrong@Pass1",
            },
        )

        assert response.status_code == 403
        assert "locked" in response.json()["detail"].lower()


class TestGetMe:
    """Tests for GET /api/v1/auth/me."""

    @pytest.mark.asyncio
    async def test_get_me_authenticated(
        self, db_client, verified_user, client
    ):
        """Test getting current user info with valid token."""
        token = verified_user["token"]

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "verified@example.com"
        assert data["name"] == "Verified User"
        assert data["is_active"] is True

    def test_get_me_unauthenticated(self, client):
        """Test getting current user without auth token returns 401/403."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403]

    def test_get_me_invalid_token(self, client):
        """Test getting current user with invalid token returns 401."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"},
        )
        assert response.status_code == 401


class TestRefreshToken:
    """Tests for POST /api/v1/auth/refresh."""

    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, db_client, client):
        """Test refresh with invalid token returns 401."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-refresh-token"},
        )

        assert response.status_code == 401


class TestLogout:
    """Tests for POST /api/v1/auth/logout."""

    @pytest.mark.asyncio
    async def test_logout_authenticated(
        self, db_client, verified_user, client
    ):
        """Test logout returns success message."""
        token = verified_user["token"]

        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()

    def test_logout_unauthenticated(self, client):
        """Test logout without auth returns 401/403."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code in [401, 403]


class TestUpdateProfile:
    """Tests for PATCH /api/v1/auth/profile."""

    @pytest.mark.asyncio
    async def test_update_name(self, db_client, verified_user, client):
        """Test updating user name."""
        token = verified_user["token"]

        response = client.patch(
            "/api/v1/auth/profile",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_email(self, db_client, verified_user, client):
        """Test updating user email to a new unique email."""
        token = verified_user["token"]

        response = client.patch(
            "/api/v1/auth/profile",
            json={"email": "newemail@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "newemail@example.com"

    @pytest.mark.asyncio
    async def test_update_email_duplicate(
        self, db_client, verified_user, admin_user, client
    ):
        """Test updating email to an already-taken email fails."""
        token = verified_user["token"]

        response = client.patch(
            "/api/v1/auth/profile",
            json={"email": "admin@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "already in use" in response.json()["detail"].lower()


class TestResetPassword:
    """Tests for POST /api/v1/auth/reset-password."""

    @pytest.mark.asyncio
    async def test_reset_password_existing_email(
        self, db_client, verified_user, client
    ):
        """Test reset password always returns success (anti-enumeration)."""
        response = client.post(
            "/api/v1/auth/reset-password",
            params={"email": "verified@example.com"},
        )

        assert response.status_code == 200
        assert "account exists" in response.json()["message"].lower() or "sent" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_reset_password_nonexistent_email(
        self, db_client, client
    ):
        """Test reset password with non-existent email also returns success."""
        response = client.post(
            "/api/v1/auth/reset-password",
            params={"email": "nonexistent@example.com"},
        )

        assert response.status_code == 200


class TestGoogleCallback:
    """Tests for POST /api/v1/auth/google/callback."""

    def test_google_callback_missing_state(self, client):
        """Test Google callback without state parameter is rejected."""
        response = client.post(
            "/api/v1/auth/google/callback",
            json={
                "code": "test-code",
                "state": None,
            },
        )

        assert response.status_code in [400, 422]

    def test_google_callback_short_state(self, client):
        """Test Google callback with too-short state is rejected."""
        response = client.post(
            "/api/v1/auth/google/callback",
            json={
                "code": "test-code",
                "state": "short",
            },
        )

        assert response.status_code == 400
        assert "state" in response.json()["detail"].lower()


class TestGoogleAuthUrl:
    """Tests for GET /api/v1/auth/google/url."""

    def test_get_google_auth_url(self, client):
        """Test getting Google OAuth URL returns URL and state."""
        response = client.get("/api/v1/auth/google/url")

        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "state" in data
        assert "accounts.google.com" in data["url"]
        assert len(data["state"]) >= 16
