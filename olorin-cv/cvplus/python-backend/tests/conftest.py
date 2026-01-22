"""
Pytest Configuration and Fixtures
Shared test setup and utilities
"""

import os

# Mock environment variables for testing - MUST be set BEFORE app imports
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
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.main import app
from app.models import CV, CVAnalysis, Profile, ContactRequest, AnalyticsEvent, User
from app.core.config import get_settings


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_db():
    """Initialize test database"""
    settings = get_settings()

    # Use test database
    test_db_name = f"{settings.mongodb_db_name}_test"

    client = AsyncIOMotorClient(settings.mongodb_uri)

    # Initialize Beanie with test database
    await init_beanie(
        database=client[test_db_name],
        document_models=[CV, CVAnalysis, Profile, ContactRequest, AnalyticsEvent, User]
    )

    yield client[test_db_name]

    # Cleanup: drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest.fixture
async def clean_db(test_db):
    """Clean database before each test"""
    # Drop all collections
    for collection_name in await test_db.list_collection_names():
        await test_db[collection_name].delete_many({})
    yield


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
async def test_user(clean_db) -> User:
    """Create test user"""
    user = User(
        email="test@example.com",
        password_hash="$2b$12$hashed_password",
        full_name="Test User",
        is_active=True,
        is_verified=True,
        subscription_tier="pro",
    )
    await user.save()
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Get auth headers with JWT token"""
    from app.core.security import create_access_token

    token = create_access_token(
        data={"sub": str(test_user.id), "email": test_user.email}
    )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_cv(test_user: User, clean_db) -> CV:
    """Create test CV"""
    cv = CV(
        user_id=str(test_user.id),
        filename="cvs/test/test_cv.pdf",
        original_filename="test_cv.pdf",
        file_format="pdf",
        file_size_bytes=1024,
        storage_url="https://storage.googleapis.com/test/cv.pdf",
        extracted_text="Test CV content",
        status="completed",
    )
    await cv.save()
    return cv


@pytest.fixture
async def test_profile(test_user: User, test_cv: CV, clean_db) -> Profile:
    """Create test profile"""
    profile = Profile(
        user_id=str(test_user.id),
        cv_id=str(test_cv.id),
        slug="test-profile",
        public_url="https://cvplus.olorin.ai/cv/test-profile",
        visibility="public",
    )
    await profile.save()
    return profile
