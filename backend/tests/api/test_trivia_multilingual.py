"""
Tests for multilingual trivia API endpoints.
Verifies that multilingual parameter returns all language fields correctly.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.trivia import ContentTrivia, TriviaFactModel


@pytest.fixture
def test_trivia_data():
    """Sample trivia data with multilingual facts."""
    return {
        "content_id": "test-content-123",
        "content_type": "vod",
        "facts": [
            TriviaFactModel(
                fact_id="fact-1",
                text="Will Ferrell מגלם את הדמות Maxime",
                text_en="Will Ferrell plays Maxime (voice)",
                text_es="Will Ferrell interpreta a Maxime",
                trigger_time=120.5,
                trigger_type="actor",
                category="cast",
                source="tmdb",
                display_duration=10,
                priority=5,
                related_person="Will Ferrell",
            ),
            TriviaFactModel(
                fact_id="fact-2",
                text="הסרט צולם בפריז",
                text_en="The film was shot in Paris",
                text_es="La película fue filmada en París",
                trigger_time=None,
                trigger_type="random",
                category="location",
                source="manual",
                display_duration=10,
                priority=3,
            ),
        ],
    }


class TestMultilingualTriviaAPI:
    """Test multilingual trivia API functionality."""

    @pytest.mark.asyncio
    async def test_get_trivia_multilingual_true(self, test_trivia_data):
        """Test GET /trivia/{id}?multilingual=true returns all language fields."""
        # Create test trivia
        trivia = await ContentTrivia.create_or_update(
            content_id=test_trivia_data["content_id"],
            content_type=test_trivia_data["content_type"],
            facts=test_trivia_data["facts"],
            sources_used=["tmdb", "manual"],
        )

        # Request with multilingual=true
        client = TestClient(app)
        response = client.get(
            f"/trivia/{test_trivia_data['content_id']}?multilingual=true"
        )

        assert response.status_code == 200
        data = response.json()

        # Verify all language fields present
        assert len(data["facts"]) == 2
        fact1 = data["facts"][0]

        assert "text" in fact1
        assert "text_he" in fact1
        assert "text_en" in fact1
        assert "text_es" in fact1

        assert fact1["text_he"] == "Will Ferrell מגלם את הדמות Maxime"
        assert fact1["text_en"] == "Will Ferrell plays Maxime (voice)"
        assert fact1["text_es"] == "Will Ferrell interpreta a Maxime"

    @pytest.mark.asyncio
    async def test_get_trivia_multilingual_false(self, test_trivia_data):
        """Test GET /trivia/{id}?multilingual=false returns single language."""
        # Create test trivia
        trivia = await ContentTrivia.create_or_update(
            content_id=test_trivia_data["content_id"],
            content_type=test_trivia_data["content_type"],
            facts=test_trivia_data["facts"],
            sources_used=["tmdb"],
        )

        # Request with multilingual=false (explicit)
        client = TestClient(app)
        response = client.get(
            f"/trivia/{test_trivia_data['content_id']}?multilingual=false&language=en"
        )

        assert response.status_code == 200
        data = response.json()

        fact1 = data["facts"][0]

        # Should NOT have multilingual fields
        assert "text" in fact1
        assert "text_he" not in fact1
        assert "text_en" not in fact1
        assert "text_es" not in fact1

        # Text should be English
        assert fact1["text"] == "Will Ferrell plays Maxime (voice)"

    @pytest.mark.asyncio
    async def test_get_trivia_default_single_language(self, test_trivia_data):
        """Test GET /trivia/{id} (no param) defaults to single language."""
        # Create test trivia
        trivia = await ContentTrivia.create_or_update(
            content_id=test_trivia_data["content_id"],
            content_type=test_trivia_data["content_type"],
            facts=test_trivia_data["facts"],
            sources_used=["tmdb"],
        )

        # Request without multilingual parameter
        client = TestClient(app)
        response = client.get(f"/trivia/{test_trivia_data['content_id']}")

        assert response.status_code == 200
        data = response.json()

        fact1 = data["facts"][0]

        # Should NOT have multilingual fields by default
        assert "text" in fact1
        assert "text_he" not in fact1
        assert "text_en" not in fact1
        assert "text_es" not in fact1

    @pytest.mark.asyncio
    async def test_get_enriched_trivia_multilingual(self, test_trivia_data):
        """Test GET /trivia/{id}/enriched?multilingual=true."""
        # Create enriched trivia
        trivia = await ContentTrivia.create_or_update(
            content_id=test_trivia_data["content_id"],
            content_type=test_trivia_data["content_type"],
            facts=test_trivia_data["facts"],
            sources_used=["tmdb", "ai"],
            is_enriched=True,
        )

        # Request enriched with multilingual=true
        client = TestClient(app)
        response = client.get(
            f"/trivia/{test_trivia_data['content_id']}/enriched?multilingual=true"
        )

        assert response.status_code == 200
        data = response.json()

        # Verify all language fields present
        fact1 = data["facts"][0]
        assert "text_he" in fact1
        assert "text_en" in fact1
        assert "text_es" in fact1

        # Verify metadata included
        assert "sources_used" in data
        assert "is_enriched" in data
        assert data["is_enriched"] is True


class TestTriviaPreferencesDisplayLanguages:
    """Test trivia preferences display_languages field."""

    @pytest.mark.asyncio
    async def test_get_preferences_default_display_languages(self, authenticated_client):
        """Test GET /trivia/preferences/me returns default display_languages."""
        response = authenticated_client.get("/trivia/preferences/me")

        assert response.status_code == 200
        data = response.json()

        assert "display_languages" in data
        assert data["display_languages"] == ["he", "en"]

    @pytest.mark.asyncio
    async def test_update_preferences_display_languages(self, authenticated_client):
        """Test PUT /trivia/preferences/me with display_languages."""
        update_data = {
            "enabled": True,
            "frequency": "normal",
            "categories": ["cast", "production"],
            "display_duration": 10,
            "display_languages": ["he", "en", "es"],
        }

        response = authenticated_client.put("/trivia/preferences/me", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["preferences"]["display_languages"] == ["he", "en", "es"]

    @pytest.mark.asyncio
    async def test_validate_display_languages_invalid_codes(self, authenticated_client):
        """Test validation rejects invalid language codes."""
        update_data = {
            "enabled": True,
            "frequency": "normal",
            "categories": ["cast"],
            "display_duration": 10,
            "display_languages": ["he", "fr", "de"],  # fr and de invalid
        }

        response = authenticated_client.put("/trivia/preferences/me", json=update_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_validate_display_languages_min_length(self, authenticated_client):
        """Test validation requires at least 1 language."""
        update_data = {
            "enabled": True,
            "frequency": "normal",
            "categories": ["cast"],
            "display_duration": 10,
            "display_languages": [],  # Empty list
        }

        response = authenticated_client.put("/trivia/preferences/me", json=update_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_validate_display_languages_max_length(self, authenticated_client):
        """Test validation enforces max 3 languages."""
        update_data = {
            "enabled": True,
            "frequency": "normal",
            "categories": ["cast"],
            "display_duration": 10,
            "display_languages": ["he", "en", "es", "fr"],  # 4 languages (too many)
        }

        response = authenticated_client.put("/trivia/preferences/me", json=update_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_display_languages_remove_duplicates(self, authenticated_client):
        """Test display_languages removes duplicates."""
        update_data = {
            "enabled": True,
            "frequency": "normal",
            "categories": ["cast"],
            "display_duration": 10,
            "display_languages": ["he", "en", "he", "es"],  # Duplicate "he"
        }

        response = authenticated_client.put("/trivia/preferences/me", json=update_data)

        assert response.status_code == 200
        data = response.json()

        # Should remove duplicate
        assert len(data["preferences"]["display_languages"]) == 3
        assert data["preferences"]["display_languages"].count("he") == 1


@pytest.fixture
def authenticated_client():
    """Create test client with authenticated user."""
    # This fixture should be implemented based on your auth setup
    # For now, using a placeholder
    client = TestClient(app)
    # TODO: Add authentication headers
    return client
