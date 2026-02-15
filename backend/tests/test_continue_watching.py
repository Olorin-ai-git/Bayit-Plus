"""
Tests for Continue Watching API endpoints
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.models.playback_progress import PlaybackProgress
from app.models.content import Content
from app.models.user import User


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
async def test_user(db):
    """Create test user"""
    user = User(
        email="test@bayit.tv",
        firebase_uid="test-uid-123",
        display_name="Test User",
    )
    await user.insert()
    return user


@pytest.fixture
async def test_content(db):
    """Create test content items"""
    movie = Content(
        title="The Chosen: Season 2, Episode 5",
        type="episode",
        duration=3600,
        poster_path="/chosen-s2.jpg",
        series_title="The Chosen",
        season_number=2,
        episode_number=5,
    )
    await movie.insert()

    audiobook = Content(
        title="Sapiens: A Brief History of Humankind",
        type="audiobook",
        duration=28800,
        cover_url="https://cdn.bayit.tv/covers/sapiens.jpg",
    )
    await audiobook.insert()

    podcast = Content(
        title="Torah Today: Episode 42",
        type="podcast",
        duration=2700,
        artwork="https://cdn.bayit.tv/covers/torah-today.jpg",
    )
    await podcast.insert()

    return [movie, audiobook, podcast]


@pytest.fixture
async def test_progress(db, test_user, test_content):
    """Create test playback progress"""
    progress_items = []

    # Recently watched episode (65% complete)
    p1 = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[0].id),
        content_type="episode",
        position=2340,
        duration=3600,
        progress=0.65,
        updated_at=datetime.utcnow(),
    )
    await p1.insert()
    progress_items.append(p1)

    # Audiobook watched 2 hours ago (35% complete)
    p2 = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[1].id),
        content_type="audiobook",
        position=10080,
        duration=28800,
        progress=0.35,
        updated_at=datetime.utcnow() - timedelta(hours=2),
    )
    await p2.insert()
    progress_items.append(p2)

    # Podcast watched yesterday (80% complete)
    p3 = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[2].id),
        content_type="podcast",
        position=2160,
        duration=2700,
        progress=0.80,
        updated_at=datetime.utcnow() - timedelta(days=1),
    )
    await p3.insert()
    progress_items.append(p3)

    return progress_items


@pytest.mark.asyncio
async def test_get_continue_watching_success(client, test_user, test_progress, auth_headers):
    """Test getting continue watching list successfully"""
    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert len(data["items"]) == 3

    # Check items are ordered by most recent
    assert data["items"][0]["id"] == str(test_progress[0].content_id)
    assert data["items"][1]["id"] == str(test_progress[1].content_id)
    assert data["items"][2]["id"] == str(test_progress[2].content_id)

    # Check first item structure
    item = data["items"][0]
    assert item["title"] == "The Chosen: S2E5 - I Saw You"
    assert item["type"] == "episode"
    assert item["duration"] == 3600
    assert item["position"] == 2340
    assert "cover_url" in item


@pytest.mark.asyncio
async def test_get_continue_watching_with_limit(client, test_user, test_progress, auth_headers):
    """Test continue watching with limit parameter"""
    response = client.get(
        "/api/v1/user/continue-watching?limit=2",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_continue_watching_empty(client, test_user, auth_headers):
    """Test continue watching when no progress exists"""
    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_continue_watching_filters_completed(db, client, test_user, test_content, auth_headers):
    """Test that completed content (>95%) is filtered out"""
    # Create progress at 96% (completed)
    progress = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[0].id),
        content_type="movie",
        position=3456,
        duration=3600,
        progress=0.96,
        updated_at=datetime.utcnow(),
    )
    await progress.insert()

    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    # Should be empty because progress > 95%
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_continue_watching_filters_old(db, client, test_user, test_content, auth_headers):
    """Test that old content (>30 days) is filtered out"""
    # Create progress from 31 days ago
    progress = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[0].id),
        content_type="movie",
        position=1800,
        duration=3600,
        progress=0.50,
        updated_at=datetime.utcnow() - timedelta(days=31),
    )
    await progress.insert()

    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    # Should be empty because > 30 days old
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_continue_watching_filters_short_position(db, client, test_user, test_content, auth_headers):
    """Test that content watched <30 seconds is filtered out"""
    # Create progress with only 20 seconds watched
    progress = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(test_content[0].id),
        content_type="movie",
        position=20,
        duration=3600,
        progress=0.006,
        updated_at=datetime.utcnow(),
    )
    await progress.insert()

    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    # Should be empty because position < 30 seconds
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_continue_watching_unauthorized(client):
    """Test continue watching without auth token"""
    response = client.get("/api/v1/user/continue-watching")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_mark_completed_success(client, test_user, test_progress, auth_headers):
    """Test marking content as completed"""
    content_id = str(test_progress[0].content_id)

    response = client.post(
        f"/api/v1/user/continue-watching/{content_id}/mark-completed",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Content marked as completed"

    # Verify progress is updated to 100%
    progress = await PlaybackProgress.find_one(
        PlaybackProgress.content_id == content_id,
        PlaybackProgress.user_id == str(test_user.id),
    )
    assert progress.progress == 1.0


@pytest.mark.asyncio
async def test_mark_completed_not_found(client, test_user, auth_headers):
    """Test marking non-existent content as completed"""
    response = client.post(
        "/api/v1/user/continue-watching/nonexistent-id/mark-completed",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_remove_from_continue_watching_success(client, test_user, test_progress, auth_headers):
    """Test removing content from continue watching"""
    content_id = str(test_progress[0].content_id)

    response = client.delete(
        f"/api/v1/user/continue-watching/{content_id}",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Content removed from continue watching"

    # Verify progress is deleted
    progress = await PlaybackProgress.find_one(
        PlaybackProgress.content_id == content_id,
        PlaybackProgress.user_id == str(test_user.id),
    )
    assert progress is None


@pytest.mark.asyncio
async def test_remove_from_continue_watching_not_found(client, test_user, auth_headers):
    """Test removing non-existent content"""
    response = client.delete(
        "/api/v1/user/continue-watching/nonexistent-id",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_continue_watching_cover_url_priority(db, client, test_user, auth_headers):
    """Test cover URL selection priority"""
    # Test 1: cover_url takes priority
    content1 = Content(
        title="Test Movie",
        type="movie",
        duration=3600,
        cover_url="https://cdn.bayit.tv/direct.jpg",
        poster_path="/poster.jpg",
    )
    await content1.insert()

    progress1 = PlaybackProgress(
        user_id=str(test_user.id),
        content_id=str(content1.id),
        content_type="movie",
        position=1800,
        duration=3600,
        progress=0.50,
        updated_at=datetime.utcnow(),
    )
    await progress1.insert()

    response = client.get(
        "/api/v1/user/continue-watching",
        headers=auth_headers(test_user),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["items"][0]["cover_url"] == "https://cdn.bayit.tv/direct.jpg"


@pytest.fixture
def auth_headers():
    """Helper to create auth headers"""
    def _headers(user):
        return {"Authorization": f"Bearer test-token-{user.id}"}
    return _headers
