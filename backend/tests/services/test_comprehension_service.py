"""
Unit tests for ComprehensionQuestionService.

Tests question generation, caching, and translation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.comprehension.question_service import (
    ComprehensionQuestionService,
)
from app.models.comprehension import ComprehensionQuestionModel


@pytest.fixture
def question_service():
    """Create ComprehensionQuestionService instance."""
    return ComprehensionQuestionService()


@pytest.fixture
def mock_scene_context():
    """Mock scene context from subtitle text."""
    return (
        "דני: אני לא מאמין שעשית את זה!\n"
        "שרה: מה הבררה הייתה לי?\n"
        "דני: היו לך אפשרויות אחרות.\n"
        "שרה: לא, לא היו."
    )


@pytest.fixture
def cached_question():
    """Pre-built cached question model."""
    return ComprehensionQuestionModel(
        question_id="test-q-1",
        question_text="מה קרה בסצנה הזו בדיוק?",
        options=["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
        correct_index=0,
        scene_start_time=100.0,
        scene_end_time=200.0,
        scene_context="Test context for scene",
        difficulty="medium",
        points=10,
    )


@pytest.fixture
def generated_question(mock_scene_context):
    """Pre-built generated question model."""
    return ComprehensionQuestionModel(
        question_text="מה גרם לדני להיות כועס בסצנה?",
        options=[
            "שרה עשתה משהו שהוא לא אישר",
            "היא לא שמעה לעצה שלו",
            "היא הפסידה משחק",
            "היא לא הגיעה בזמן",
        ],
        correct_index=0,
        explanation="דני מאוכזב מהפעולה של שרה",
        scene_start_time=100.0,
        scene_end_time=200.0,
        scene_context=mock_scene_context[:1000],
        difficulty="medium",
        points=10,
    )


@pytest.mark.asyncio
async def test_get_cached_question(question_service, cached_question):
    """Test retrieving cached question from database."""
    with patch.object(
        question_service.cache_service,
        "get_cached_question",
        new_callable=AsyncMock,
        return_value=cached_question,
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        assert result is not None
        assert result.question_id == "test-q-1"
        assert result.question_text == "מה קרה בסצנה הזו בדיוק?"


@pytest.mark.asyncio
async def test_generate_new_question(
    question_service, mock_scene_context, generated_question
):
    """Test generating new question via Claude API."""
    mock_scene = MagicMock()
    mock_scene.subtitle_text = mock_scene_context

    mock_content = MagicMock()
    mock_content.title = "Test Movie"

    with (
        patch.object(
            question_service.cache_service,
            "get_cached_question",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.comprehension.question_service.Content.get",
            new_callable=AsyncMock,
            return_value=mock_content,
        ),
        patch.object(
            question_service.scene_detector,
            "get_scene_at_timestamp",
            new_callable=AsyncMock,
            return_value=mock_scene,
        ),
        patch.object(
            question_service,
            "_get_chapter_title",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch.object(
            question_service,
            "_generate_question",
            new_callable=AsyncMock,
            return_value=generated_question,
        ),
        patch.object(
            question_service.cache_service,
            "cache_question",
            new_callable=AsyncMock,
        ),
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        assert result is not None
        assert "גרם לדני" in result.question_text
        assert len(result.options) == 4


@pytest.mark.asyncio
async def test_no_scene_returns_none(question_service):
    """Test handling when no scene context found."""
    mock_content = MagicMock()
    mock_content.title = "Test"

    with (
        patch.object(
            question_service.cache_service,
            "get_cached_question",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.comprehension.question_service.Content.get",
            new_callable=AsyncMock,
            return_value=mock_content,
        ),
        patch.object(
            question_service.scene_detector,
            "get_scene_at_timestamp",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        assert result is None


@pytest.mark.asyncio
async def test_generation_failure_returns_none(
    question_service, mock_scene_context
):
    """Test handling of generation failures."""
    mock_scene = MagicMock()
    mock_scene.subtitle_text = mock_scene_context
    mock_content = MagicMock()
    mock_content.title = "Test"

    with (
        patch.object(
            question_service.cache_service,
            "get_cached_question",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.comprehension.question_service.Content.get",
            new_callable=AsyncMock,
            return_value=mock_content,
        ),
        patch.object(
            question_service.scene_detector,
            "get_scene_at_timestamp",
            new_callable=AsyncMock,
            return_value=mock_scene,
        ),
        patch.object(
            question_service,
            "_get_chapter_title",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch.object(
            question_service,
            "_generate_question",
            new_callable=AsyncMock,
            side_effect=Exception("Claude API error"),
        ),
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        assert result is None


@pytest.mark.asyncio
async def test_content_not_found_returns_none(question_service):
    """Test handling when content not found."""
    with (
        patch.object(
            question_service.cache_service,
            "get_cached_question",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.comprehension.question_service.Content.get",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        result = await question_service.get_or_generate_question(
            content_id="nonexistent",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        assert result is None


@pytest.mark.asyncio
async def test_caching_after_generation(
    question_service, mock_scene_context, generated_question
):
    """Test that generated questions are cached in database."""
    mock_scene = MagicMock()
    mock_scene.subtitle_text = mock_scene_context
    mock_content = MagicMock()
    mock_content.title = "Test"
    mock_cache = AsyncMock()

    with (
        patch.object(
            question_service.cache_service,
            "get_cached_question",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.comprehension.question_service.Content.get",
            new_callable=AsyncMock,
            return_value=mock_content,
        ),
        patch.object(
            question_service.scene_detector,
            "get_scene_at_timestamp",
            new_callable=AsyncMock,
            return_value=mock_scene,
        ),
        patch.object(
            question_service,
            "_get_chapter_title",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch.object(
            question_service,
            "_generate_question",
            new_callable=AsyncMock,
            return_value=generated_question,
        ),
        patch.object(
            question_service.cache_service,
            "cache_question",
            mock_cache,
        ),
    ):
        await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he",
        )

        mock_cache.assert_called_once()
