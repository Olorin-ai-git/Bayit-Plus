"""
Pytest Configuration and Fixtures
Shared test setup and utilities
"""

import os

# Set environment variables for testing - MUST be set BEFORE app imports
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-min-32-characters-long")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/")
os.environ.setdefault("MONGODB_DB_NAME", "cvplus_test")
os.environ.setdefault("FIREBASE_PROJECT_ID", "test-project")
os.environ.setdefault("STORAGE_BUCKET", "test-bucket")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-key")
os.environ.setdefault("EMAIL_USER", "test@example.com")
os.environ.setdefault("EMAIL_FROM", "Test <test@example.com>")
os.environ.setdefault("APP_BASE_URL", "https://test.olorin.ai")
os.environ.setdefault("API_BASE_URL", "https://api.test.olorin.ai")

import pytest
import asyncio
from typing import Generator
from unittest.mock import MagicMock

from bson import ObjectId
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client with lazy import to avoid circular dependencies."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_user_id() -> str:
    """Generate a valid mock user ID."""
    return str(ObjectId())


@pytest.fixture
def auth_headers(mock_user_id: str) -> dict:
    """Get auth headers with JWT token for mock user."""
    from app.core.security import create_access_token

    token = create_access_token(
        data={"sub": mock_user_id, "email": "test@example.com"}
    )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user_data() -> dict:
    """Test user data without database dependency."""
    user_id = str(ObjectId())
    return {
        "id": user_id,
        "email": "test@example.com",
        "password_hash": "$2b$12$hashed_password",
        "full_name": "Test User",
        "is_active": True,
        "is_verified": True,
        "subscription_tier": "pro",
    }


def create_mock_user(user_id: str = None) -> MagicMock:
    """Create a mock user object."""
    mock = MagicMock()
    mock.id = ObjectId(user_id) if user_id else ObjectId()
    mock.email = "test@example.com"
    mock.password_hash = "$2b$12$hashed_password"
    mock.full_name = "Test User"
    mock.is_active = True
    mock.is_verified = True
    mock.subscription_tier = "pro"
    return mock


@pytest.fixture
def test_user() -> MagicMock:
    """Create mock test user without database."""
    return create_mock_user()


@pytest.fixture
def test_cv(test_user: MagicMock) -> MagicMock:
    """Create mock test CV without database."""
    mock = MagicMock()
    mock.id = ObjectId()
    mock.user_id = str(test_user.id)
    mock.filename = "cvs/test/test_cv.pdf"
    mock.original_filename = "test_cv.pdf"
    mock.file_format = "pdf"
    mock.file_size_bytes = 1024
    mock.storage_url = "https://storage.googleapis.com/test/cv.pdf"
    mock.extracted_text = "Test CV content"
    mock.status = "completed"
    mock.analysis_id = None
    mock.structured_data = None
    mock.processing_error = None
    return mock


@pytest.fixture
def test_profile(test_user: MagicMock, test_cv: MagicMock) -> MagicMock:
    """Create mock test profile without database."""
    mock = MagicMock()
    mock.id = ObjectId()
    mock.user_id = str(test_user.id)
    mock.cv_id = str(test_cv.id)
    mock.slug = "test-profile"
    mock.public_url = "https://cvplus.olorin.ai/cv/test-profile"
    mock.visibility = "public"
    return mock
