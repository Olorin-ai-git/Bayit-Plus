"""
Unit and integration tests for the Audiobooks feature.

Tests cover:
- User discovery endpoints (browsing audiobooks)
- Admin stream endpoint (restricted to admins)
- Admin CRUD operations
- Authorization and permission enforcement
- Audit logging
"""

import pytest
import pytest_asyncio
from datetime import datetime
from fastapi import status
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.database import init_beanie
from app.models.admin import AuditAction, AuditLog, Permission, Role
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User


@pytest_asyncio.fixture
async def test_db():
    """Create test database client and initialize collections."""
    from app.core.config import settings

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_name = f"{settings.MONGODB_DB_NAME}_test_audiobooks"
    db = client[db_name]

    await init_beanie(
        database=db,
        document_models=[Content, ContentSection, User, AuditLog],
    )

    yield client

    await client.drop_database(db_name)
    client.close()


@pytest_asyncio.fixture
async def regular_user(test_db):
    """Create a regular (non-admin) user."""
    user = User(
        email="user@example.com",
        password_hash="hashed_password",
        first_name="Regular",
        last_name="User",
        is_active=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def admin_user(test_db):
    """Create an admin user."""
    user = User(
        email="admin@example.com",
        password_hash="hashed_password",
        first_name="Admin",
        last_name="User",
        is_active=True,
        role=Role.ADMIN,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def audiobooks_section(test_db):
    """Create audiobooks section."""
    section = ContentSection(
        slug="audiobooks",
        name_key="taxonomy.sections.audiobooks",
        icon="book-audio",
        order=5,
        is_active=True,
        show_on_homepage=True,
        show_on_nav=True,
    )
    await section.insert()
    return section


@pytest_asyncio.fixture
async def sample_audiobook(test_db, audiobooks_section):
    """Create a sample published audiobook."""
    audiobook = Content(
        title="The Great Adventure",
        author="John Smith",
        narrator="Sarah Johnson",
        description="An inspiring adventure story",
        duration="4:35:00",
        stream_url="https://example.com/stream/audiobook1.m3u8",
        stream_type="hls",
        content_format="audiobook",
        audio_quality="high-fidelity",
        isbn="978-1234567890",
        book_edition="1st edition",
        publisher_name="Adventure Press",
        section_ids=[str(audiobooks_section.id)],
        primary_section_id=str(audiobooks_section.id),
        is_published=True,
        is_featured=False,
        visibility_mode="public",
        requires_subscription="basic",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    await audiobook.insert()
    return audiobook


class TestAudiobooksDiscovery:
    """Tests for user-facing audiobook discovery endpoints."""

    async def test_list_audiobooks_public_access(self, client, sample_audiobook):
        """Test that non-authenticated users can list audiobooks."""
        response = client.get("/api/v1/audiobooks")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) > 0
        assert data["items"][0]["title"] == "The Great Adventure"

    async def test_list_audiobooks_pagination(self, client, sample_audiobook):
        """Test audiobooks list pagination."""
        response = client.get("/api/v1/audiobooks?page=1&page_size=10")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert "total_pages" in data

    async def test_get_audiobook_details(self, client, sample_audiobook):
        """Test retrieving single audiobook details."""
        response = client.get(f"/api/v1/audiobooks/{sample_audiobook.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "The Great Adventure"
        assert data["author"] == "John Smith"
        assert data["narrator"] == "Sarah Johnson"
        assert data["content_format"] == "audiobook"
        assert "stream_url" not in data

    async def test_audiobook_not_found(self, client):
        """Test getting non-existent audiobook returns 404."""
        response = client.get("/api/v1/audiobooks/nonexistent")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_no_stream_url_in_user_response(self, client, sample_audiobook):
        """Test that user response does not include stream_url."""
        response = client.get(f"/api/v1/audiobooks/{sample_audiobook.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "stream_url" not in data
        assert "stream_type" not in data


class TestAudiobooksAdminStream:
    """Tests for admin-only audiobook streaming endpoint."""

    async def test_admin_can_get_stream(self, client, admin_user, sample_audiobook, auth_token):
        """Test that admins can access stream endpoint."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/audiobooks/{sample_audiobook.id}/stream",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["stream_url"] == "https://example.com/stream/audiobook1.m3u8"
        assert data["stream_type"] == "hls"
        assert data["audio_quality"] == "high-fidelity"

    async def test_non_admin_cannot_get_stream(self, client, regular_user, sample_audiobook, auth_token):
        """Test that non-admins cannot access stream endpoint."""
        headers = {"Authorization": f"Bearer {auth_token(regular_user)}"}
        response = client.post(
            f"/api/v1/audiobooks/{sample_audiobook.id}/stream",
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_unauthenticated_cannot_get_stream(self, client, sample_audiobook):
        """Test that unauthenticated users cannot access stream endpoint."""
        response = client.post(f"/api/v1/audiobooks/{sample_audiobook.id}/stream")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_stream_increments_view_count(self, client, admin_user, sample_audiobook, auth_token):
        """Test that stream endpoint increments view count."""
        initial_count = sample_audiobook.view_count
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/audiobooks/{sample_audiobook.id}/stream",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        updated = await Content.get(sample_audiobook.id)
        assert updated.view_count == initial_count + 1

    async def test_stream_logs_audit_event(self, client, admin_user, sample_audiobook, auth_token, test_db):
        """Test that stream endpoint logs audit event."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/audiobooks/{sample_audiobook.id}/stream",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        audit_log = await AuditLog.find_one(
            {
                "action": AuditAction.AUDIOBOOK_STREAM_STARTED,
                "resource_id": str(sample_audiobook.id),
            }
        )
        assert audit_log is not None
        assert audit_log.resource_type == "audiobook"


class TestAudiobooksAdminCRUD:
    """Tests for admin CRUD operations."""

    async def test_admin_can_create_audiobook(self, client, admin_user, audiobooks_section, auth_token):
        """Test admin can create new audiobook."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "New Audiobook",
            "author": "Jane Doe",
            "narrator": "James Brown",
            "description": "A new audiobook",
            "duration": "3:45:00",
            "stream_url": "https://example.com/stream/new.m3u8",
            "stream_type": "hls",
            "is_drm_protected": False,
            "audio_quality": "standard",
            "isbn": "978-9876543210",
            "book_edition": "1st edition",
            "publisher_name": "New Press",
            "section_ids": [str(audiobooks_section.id)],
            "primary_section_id": str(audiobooks_section.id),
            "requires_subscription": "basic",
            "visibility_mode": "public",
            "is_published": True,
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "New Audiobook"
        assert data["author"] == "Jane Doe"

    async def test_non_admin_cannot_create_audiobook(self, client, regular_user, auth_token):
        """Test non-admin cannot create audiobook."""
        headers = {"Authorization": f"Bearer {auth_token(regular_user)}"}
        payload = {
            "title": "Test Audiobook",
            "author": "Test Author",
            "stream_url": "https://example.com/test.m3u8",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_admin_can_update_audiobook(self, client, admin_user, sample_audiobook, auth_token):
        """Test admin can update audiobook."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Updated Title",
            "rating": 4.5,
        }
        response = client.patch(
            f"/api/v1/admin/audiobooks/{sample_audiobook.id}",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["rating"] == 4.5

    async def test_admin_can_delete_audiobook(self, client, admin_user, sample_audiobook, auth_token):
        """Test admin can delete audiobook."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.delete(
            f"/api/v1/admin/audiobooks/{sample_audiobook.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        deleted = await Content.get(sample_audiobook.id)
        assert deleted is None

    async def test_admin_can_publish_audiobook(self, client, admin_user, test_db):
        """Test admin can publish unpublished audiobook."""
        unpublished = Content(
            title="Draft Audiobook",
            author="Draft Author",
            stream_url="https://example.com/draft.m3u8",
            content_format="audiobook",
            is_published=False,
        )
        await unpublished.insert()

        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/admin/audiobooks/{unpublished.id}/publish",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_published"] is True

    async def test_admin_can_feature_audiobook(self, client, admin_user, sample_audiobook, audiobooks_section, auth_token):
        """Test admin can feature an audiobook."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/admin/audiobooks/{sample_audiobook.id}/feature",
            params={"section_id": str(audiobooks_section.id), "order": 1},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        updated = await Content.get(sample_audiobook.id)
        assert updated.is_featured is True


class TestAudiobooksAuditLogging:
    """Tests for audit logging of audiobook operations."""

    async def test_create_logs_audit_event(self, client, admin_user, audiobooks_section, auth_token, test_db):
        """Test that creating audiobook logs audit event."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Audited Audiobook",
            "author": "Audit Author",
            "stream_url": "https://example.com/audited.m3u8",
            "section_ids": [str(audiobooks_section.id)],
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        audit_log = await AuditLog.find_one(
            {
                "action": AuditAction.AUDIOBOOK_CREATED,
                "resource_type": "audiobook",
            }
        )
        assert audit_log is not None
        assert audit_log.user_id == str(admin_user.id)
        assert audit_log.details["title"] == "Audited Audiobook"

    async def test_delete_logs_audit_event(self, client, admin_user, sample_audiobook, auth_token, test_db):
        """Test that deleting audiobook logs audit event."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.delete(
            f"/api/v1/admin/audiobooks/{sample_audiobook.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        audit_log = await AuditLog.find_one(
            {
                "action": AuditAction.AUDIOBOOK_DELETED,
                "resource_id": str(sample_audiobook.id),
            }
        )
        assert audit_log is not None


class TestAudiobooksContentFormat:
    """Tests for audiobook content format validation."""

    async def test_audiobook_has_correct_format(self, sample_audiobook):
        """Test that audiobook has correct content format."""
        assert sample_audiobook.content_format == "audiobook"

    async def test_audiobook_metadata_fields(self, sample_audiobook):
        """Test audiobook-specific metadata fields."""
        assert sample_audiobook.narrator is not None
        assert sample_audiobook.author is not None
        assert sample_audiobook.audio_quality is not None
        assert sample_audiobook.isbn is not None
        assert sample_audiobook.book_edition is not None
        assert sample_audiobook.publisher_name is not None

    async def test_non_audiobook_cannot_use_stream_endpoint(self, client, admin_user, auth_token, test_db):
        """Test that non-audiobook content cannot access audiobook stream endpoint."""
        movie = Content(
            title="Not an Audiobook",
            stream_url="https://example.com/movie.m3u8",
            content_format="movie",
            is_published=True,
        )
        await movie.insert()

        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        response = client.post(
            f"/api/v1/audiobooks/{movie.id}/stream",
            headers=headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
