"""
Unit tests for ComprehensionQuestionService

Tests question generation, caching, and translation.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from app.services.comprehension.question_service import ComprehensionQuestionService
from app.models.comprehension import ComprehensionQuestionModel, ContentComprehension


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
def mock_claude_response():
    """Mock Claude API response."""
    return {
        "question": "מה גרם לדני להיות כועס בסצנה?",
        "options": [
            "שרה עשתה משהו שהוא לא אישר",
            "היא לא שמעה לעצה שלו",
            "היא הפסידה משחק",
            "היא לא הגיעה בזמן"
        ],
        "correct_index": 0,
        "explanation": "דני מאוכזב מהפעולה של שרה"
    }


@pytest.mark.asyncio
async def test_get_cached_question(question_service):
    """Test retrieving cached question from database."""
    cached_question = ComprehensionQuestionModel(
        question_id="test-q-1",
        question_text="מה קרה?",
        options=["א", "ב", "ג", "ד"],
        correct_index=0,
        scene_start_time=100.0,
        scene_end_time=200.0,
        scene_context="Test context",
        difficulty="medium",
        points=10,
    )

    mock_content_comp = ContentComprehension(
        content_id="test-content",
        questions=[cached_question],
        language="he",
    )

    with patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=mock_content_comp
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he"
        )

        assert result is not None
        assert result.question_id == "test-q-1"
        assert result.question_text == "מה קרה?"


@pytest.mark.asyncio
async def test_generate_new_question(
    question_service,
    mock_scene_context,
    mock_claude_response
):
    """Test generating new question via Claude API."""
    with patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=None  # No cached question
    ), patch.object(
        question_service,
        '_get_scene_context',
        new_callable=AsyncMock,
        return_value=mock_scene_context
    ), patch.object(
        question_service,
        '_generate_question',
        new_callable=AsyncMock,
        return_value=ComprehensionQuestionModel(
            question_text=mock_claude_response["question"],
            options=mock_claude_response["options"],
            correct_index=mock_claude_response["correct_index"],
            explanation=mock_claude_response["explanation"],
            scene_start_time=100.0,
            scene_end_time=200.0,
            scene_context=mock_scene_context,
            difficulty="medium",
            points=10,
        )
    ), patch(
        'app.models.comprehension.ContentComprehension.save',
        new_callable=AsyncMock
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he"
        )

        assert result is not None
        assert "גרם לדני" in result.question_text
        assert len(result.options) == 4


@pytest.mark.asyncio
async def test_generate_question_empty_context(question_service):
    """Test handling of empty scene context."""
    with patch.object(
        question_service,
        '_get_scene_context',
        new_callable=AsyncMock,
        return_value=""  # Empty context
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he"
        )

        assert result is None


@pytest.mark.asyncio
async def test_claude_api_failure(question_service, mock_scene_context):
    """Test handling of Claude API failures."""
    with patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=None
    ), patch.object(
        question_service,
        '_get_scene_context',
        new_callable=AsyncMock,
        return_value=mock_scene_context
    ), patch.object(
        question_service,
        '_generate_question',
        new_callable=AsyncMock,
        side_effect=Exception("Claude API error")
    ):
        result = await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he"
        )

        # Returns None on API failure
        assert result is None


@pytest.mark.asyncio
async def test_translation_to_english(question_service):
    """Test question translation from Hebrew to English."""
    hebrew_question = ComprehensionQuestionModel(
        question_text="מה קרה בסצנה?",
        question_text_en=None,  # Not yet translated
        options=["א", "ב", "ג", "ד"],
        options_en=None,
        correct_index=0,
        scene_start_time=100.0,
        scene_end_time=200.0,
        scene_context="Context",
        difficulty="medium",
        points=10,
    )

    with patch.object(
        question_service.translation_service,
        'translate_trivia_question',
        new_callable=AsyncMock,
        return_value={
            "question_en": "What happened in the scene?",
            "options_en": ["A", "B", "C", "D"]
        }
    ):
        translated = await question_service._translate_question(
            hebrew_question,
            target_lang="en"
        )

        assert translated.question_text_en == "What happened in the scene?"
        assert translated.options_en == ["A", "B", "C", "D"]


@pytest.mark.asyncio
async def test_caching_after_generation(question_service, mock_scene_context):
    """Test that generated questions are cached in database."""
    mock_save = AsyncMock()

    with patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=None
    ), patch.object(
        question_service,
        '_get_scene_context',
        new_callable=AsyncMock,
        return_value=mock_scene_context
    ), patch.object(
        question_service,
        '_generate_question',
        new_callable=AsyncMock,
        return_value=ComprehensionQuestionModel(
            question_text="Test?",
            options=["A", "B", "C", "D"],
            correct_index=0,
            scene_start_time=100.0,
            scene_end_time=200.0,
            scene_context=mock_scene_context,
            difficulty="medium",
            points=10,
        )
    ), patch(
        'app.models.comprehension.ContentComprehension',
        return_value=MagicMock(save=mock_save)
    ):
        await question_service.get_or_generate_question(
            content_id="test-content",
            scene_start_time=100.0,
            scene_end_time=200.0,
            language="he"
        )

        # Verify save was called to cache question
        assert mock_save.called


@pytest.mark.asyncio
async def test_difficulty_assignment(question_service, mock_scene_context):
    """Test that questions are assigned appropriate difficulty levels."""
    with patch.object(
        question_service,
        '_get_scene_context',
        new_callable=AsyncMock,
        return_value=mock_scene_context
    ), patch.object(
        question_service,
        '_call_claude_api',
        new_callable=AsyncMock,
        return_value={
            "question": "Test question?",
            "options": ["A", "B", "C", "D"],
            "correct_index": 0,
            "explanation": "Explanation"
        }
    ):
        result = await question_service._generate_question(
            scene_context=mock_scene_context,
            chapter_title="Chapter 1",
            content_title="Test Movie",
            language="he"
        )

        assert result.difficulty in ["easy", "medium", "hard"]
        assert result.points >= 1
        assert result.points <= 50


@pytest.mark.asyncio
async def test_question_validation(question_service, mock_scene_context):
    """Test that invalid questions are rejected."""
    invalid_response = {
        "question": "Q?",  # Too short
        "options": ["A", "B"],  # Only 2 options (need 4)
        "correct_index": 0,
    }

    with patch.object(
        question_service,
        '_call_claude_api',
        new_callable=AsyncMock,
        return_value=invalid_response
    ):
        result = await question_service._generate_question(
            scene_context=mock_scene_context,
            chapter_title=None,
            content_title="Test",
            language="he"
        )

        # Should return None for invalid questions
        assert result is None
