"""
Unit tests for TopicDetectionService

Tests spaCy NER entity extraction and Claude AI validation.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.services.live_trivia.topic_detector import TopicDetectionService


@pytest.fixture
def topic_detector():
    """Create TopicDetectionService instance."""
    with patch("app.services.live_trivia.topic_detector.Anthropic"):
        detector = TopicDetectionService()
        # Mock spaCy models
        detector._spacy_models = {
            "en": Mock(),
            "he": Mock()
        }
        return detector


class TestEntityDetection:
    """Test spaCy entity extraction."""

    def test_detect_entities_person(self, topic_detector):
        """Test detecting person entities."""
        # Mock spaCy NER results
        mock_ent = Mock()
        mock_ent.text = "Vladimir Putin"
        mock_ent.label_ = "PERSON"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        entities = topic_detector.detect_entities("Putin announced today", "en")

        assert len(entities) == 1
        assert entities[0][0] == "Vladimir Putin"
        assert entities[0][1] == "person"
        assert entities[0][2] == 0.8

    def test_detect_entities_place(self, topic_detector):
        """Test detecting place entities (GPE)."""
        mock_ent = Mock()
        mock_ent.text = "Ukraine"
        mock_ent.label_ = "GPE"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        entities = topic_detector.detect_entities("War in Ukraine continues", "en")

        assert len(entities) == 1
        assert entities[0][0] == "Ukraine"
        assert entities[0][1] == "place"

    def test_detect_entities_organization(self, topic_detector):
        """Test detecting organization entities."""
        mock_ent = Mock()
        mock_ent.text = "United Nations"
        mock_ent.label_ = "ORG"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        entities = topic_detector.detect_entities("UN meeting held", "en")

        assert len(entities) == 1
        assert entities[0][0] == "United Nations"
        assert entities[0][1] == "organization"

    def test_detect_entities_multiple(self, topic_detector):
        """Test detecting multiple entities in one transcript."""
        mock_ent1 = Mock()
        mock_ent1.text = "Putin"
        mock_ent1.label_ = "PERSON"

        mock_ent2 = Mock()
        mock_ent2.text = "Russia"
        mock_ent2.label_ = "GPE"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent1, mock_ent2]

        topic_detector._spacy_models["en"].return_value = mock_doc

        entities = topic_detector.detect_entities("Putin leads Russia", "en")

        assert len(entities) == 2
        assert entities[0][1] == "person"
        assert entities[1][1] == "place"

    def test_detect_entities_no_model(self, topic_detector):
        """Test behavior when spaCy model not available."""
        topic_detector._spacy_models = {}

        entities = topic_detector.detect_entities("Some text", "fr")

        assert entities == []


class TestAIValidation:
    """Test Claude AI topic validation."""

    @pytest.mark.asyncio
    async def test_validate_topic_relevant(self, topic_detector):
        """Test validation of relevant topic."""
        # Mock Claude API response
        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '{"is_relevant": true, "confidence": 0.9, "reason": "Well-known"}'

        topic_detector.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        is_relevant, confidence = await topic_detector.validate_topic_with_ai(
            "Vladimir Putin",
            "person",
            "Putin announced new policy"
        )

        assert is_relevant is True
        assert confidence == 0.9

    @pytest.mark.asyncio
    async def test_validate_topic_not_relevant(self, topic_detector):
        """Test validation of irrelevant topic."""
        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '{"is_relevant": false, "confidence": 0.3, "reason": "Obscure"}'

        topic_detector.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        is_relevant, confidence = await topic_detector.validate_topic_with_ai(
            "Unknown Person",
            "person",
            "Unknown mentioned"
        )

        assert is_relevant is False
        assert confidence == 0.3

    @pytest.mark.asyncio
    async def test_validate_topic_api_error(self, topic_detector):
        """Test handling of API errors."""
        topic_detector.anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API error")
        )

        is_relevant, confidence = await topic_detector.validate_topic_with_ai(
            "Test Topic",
            "person",
            "Context"
        )

        # Should return False on error (conservative)
        assert is_relevant is False
        assert confidence == 0.0


class TestTopicHash:
    """Test topic hash generation."""

    def test_generate_topic_hash(self, topic_detector):
        """Test hash generation is consistent."""
        hash1 = topic_detector.generate_topic_hash("Putin", "person")
        hash2 = topic_detector.generate_topic_hash("Putin", "person")

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length

    def test_generate_topic_hash_case_insensitive(self, topic_detector):
        """Test hash is case-insensitive."""
        hash1 = topic_detector.generate_topic_hash("Putin", "person")
        hash2 = topic_detector.generate_topic_hash("PUTIN", "person")

        assert hash1 == hash2

    def test_generate_topic_hash_different_types(self, topic_detector):
        """Test different entity types produce different hashes."""
        hash1 = topic_detector.generate_topic_hash("Washington", "person")
        hash2 = topic_detector.generate_topic_hash("Washington", "place")

        assert hash1 != hash2


class TestDetectTopics:
    """Test end-to-end topic detection."""

    @pytest.mark.asyncio
    async def test_detect_topics_with_validation(self, topic_detector):
        """Test full detection pipeline with AI validation."""
        # Mock spaCy
        mock_ent = Mock()
        mock_ent.text = "Putin"
        mock_ent.label_ = "PERSON"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        # Mock Claude
        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '{"is_relevant": true, "confidence": 0.9, "reason": "Valid"}'

        topic_detector.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        topics = await topic_detector.detect_topics(
            "Putin announced today",
            "en",
            validate_with_ai=True
        )

        assert len(topics) == 1
        assert topics[0]["topic_text"] == "Putin"
        assert topics[0]["entity_type"] == "person"
        assert topics[0]["is_validated"] is True
        assert 0.0 <= topics[0]["confidence_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_detect_topics_without_validation(self, topic_detector):
        """Test detection without AI validation."""
        mock_ent = Mock()
        mock_ent.text = "Ukraine"
        mock_ent.label_ = "GPE"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        topics = await topic_detector.detect_topics(
            "Ukraine news",
            "en",
            validate_with_ai=False
        )

        assert len(topics) == 1
        assert topics[0]["topic_text"] == "Ukraine"
        assert topics[0]["is_validated"] is False

    @pytest.mark.asyncio
    async def test_detect_topics_filters_irrelevant(self, topic_detector):
        """Test that irrelevant topics are filtered out."""
        mock_ent = Mock()
        mock_ent.text = "Unknown"
        mock_ent.label_ = "PERSON"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        topic_detector._spacy_models["en"].return_value = mock_doc

        # Mock validation as irrelevant
        mock_message = Mock()
        mock_message.content = [Mock()]
        mock_message.content[0].text = '{"is_relevant": false, "confidence": 0.2}'

        topic_detector.anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        topics = await topic_detector.detect_topics(
            "Unknown person mentioned",
            "en",
            validate_with_ai=True
        )

        # Should be filtered out
        assert len(topics) == 0
