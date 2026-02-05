"""
Integration tests for Comprehension Quiz API endpoints

Tests authentication, authorization, rate limiting, and business logic.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app.models.comprehension import ComprehensionQuestionModel
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.user import User


@pytest.fixture
def mock_auth_user():
    """Mock authenticated user."""
    return User(
        id="test-user-id",
        email="test@example.com",
        is_beta_user=True,
    )


@pytest.fixture
def mock_question():
    """Mock comprehension question."""
    return ComprehensionQuestionModel(
        question_id="test-q-123",
        question_text="מה קרה בסצנה?",
        question_text_en="What happened in the scene?",
        options=["א", "ב", "ג", "ד"],
        options_en=["A", "B", "C", "D"],
        correct_index=0,
        explanation="הסבר",
        scene_start_time=100.0,
        scene_end_time=200.0,
        scene_context="Context",
        difficulty="medium",
        points=10,
    )


@pytest.mark.asyncio
async def test_get_question_authenticated(client: TestClient, mock_auth_user, mock_question):
    """Test GET question endpoint with authenticated user."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.services.comprehension.question_service.ComprehensionQuestionService.get_or_generate_question',
        new_callable=AsyncMock,
        return_value=mock_question
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.authorize',
        new_callable=AsyncMock,
        return_value=(True, 500)  # Authorized, 500 credits
    ):
        response = client.get(
            "/api/v1/comprehension/test-content/question",
            params={"scene_start": 100.0, "scene_end": 200.0, "language": "he"},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["question_id"] == "test-q-123"
        assert data["question_text"] == "מה קרה בסצנה?"
        assert len(data["options"]) == 4
        # Correct index should NOT be in response
        assert "correct_index" not in data


@pytest.mark.asyncio
async def test_get_question_unauthenticated(client: TestClient):
    """Test GET question endpoint without authentication."""
    response = client.get(
        "/api/v1/comprehension/test-content/question",
        params={"scene_start": 100.0, "scene_end": 200.0}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_question_insufficient_credits(client: TestClient, mock_auth_user):
    """Test GET question endpoint with insufficient credits."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.authorize',
        new_callable=AsyncMock,
        return_value=(False, 0)  # Not authorized, 0 credits
    ):
        response = client.get(
            "/api/v1/comprehension/test-content/question",
            params={"scene_start": 100.0, "scene_end": 200.0},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 403
        assert "Insufficient credits" in response.json()["detail"]


@pytest.mark.asyncio
async def test_submit_answer_correct(client: TestClient, mock_auth_user, mock_question):
    """Test POST submit with correct answer."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=MagicMock(questions=[mock_question])
    ), patch(
        'app.models.comprehension.ComprehensionAttempt.save',
        new_callable=AsyncMock
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.deduct',
        new_callable=AsyncMock
    ):
        response = client.post(
            "/api/v1/comprehension/questions/test-q-123/submit",
            json={"selected_option": 0, "time_taken_ms": 5000},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        assert data["points_earned"] == 10
        assert data["credits_deducted"] == 1
        assert "explanation" in data


@pytest.mark.asyncio
async def test_submit_answer_incorrect(client: TestClient, mock_auth_user, mock_question):
    """Test POST submit with incorrect answer."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=MagicMock(questions=[mock_question])
    ), patch(
        'app.models.comprehension.ComprehensionAttempt.save',
        new_callable=AsyncMock
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.deduct',
        new_callable=AsyncMock
    ):
        response = client.post(
            "/api/v1/comprehension/questions/test-q-123/submit",
            json={"selected_option": 2, "time_taken_ms": 3000},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False
        assert data["points_earned"] == 0
        assert data["credits_deducted"] == 1


@pytest.mark.asyncio
async def test_submit_answer_invalid_option(client: TestClient, mock_auth_user):
    """Test POST submit with invalid option index."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ):
        response = client.post(
            "/api/v1/comprehension/questions/test-q-123/submit",
            json={"selected_option": 5, "time_taken_ms": 5000},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 400


@pytest.mark.asyncio
async def test_submit_answer_question_not_found(client: TestClient, mock_auth_user):
    """Test POST submit with non-existent question."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=None
    ):
        response = client.post(
            "/api/v1/comprehension/questions/nonexistent/submit",
            json={"selected_option": 0, "time_taken_ms": 5000},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_scenes(client: TestClient, mock_auth_user):
    """Test GET scenes endpoint."""
    mock_scenes = [
        {"start_time": 0.0, "end_time": 120.0, "cue_count": 30},
        {"start_time": 125.0, "end_time": 240.0, "cue_count": 25},
    ]

    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.services.scene_detection_service.SceneDetectionService.detect_scenes',
        new_callable=AsyncMock,
        return_value=[
            MagicMock(
                start_time=s["start_time"],
                end_time=s["end_time"],
                cue_count=s["cue_count"]
            )
            for s in mock_scenes
        ]
    ):
        response = client.get(
            "/api/v1/comprehension/test-content/scenes",
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["scenes"]) == 2
        assert data["scenes"][0]["start_time"] == 0.0
        assert data["scenes"][1]["end_time"] == 240.0


@pytest.mark.asyncio
async def test_rate_limiting_question_endpoint(client: TestClient, mock_auth_user, mock_question):
    """Test rate limiting on question endpoint (20/minute)."""
    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.services.comprehension.question_service.ComprehensionQuestionService.get_or_generate_question',
        new_callable=AsyncMock,
        return_value=mock_question
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.authorize',
        new_callable=AsyncMock,
        return_value=(True, 500)
    ):
        # Make 21 requests (should exceed 20/minute limit)
        for i in range(21):
            response = client.get(
                "/api/v1/comprehension/test-content/question",
                params={"scene_start": i * 100, "scene_end": (i + 1) * 100},
                headers={"Authorization": "Bearer test-token"}
            )

            if i < 20:
                assert response.status_code == 200
            else:
                assert response.status_code == 429  # Rate limit exceeded


@pytest.mark.asyncio
async def test_credit_deduction_on_submit(client: TestClient, mock_auth_user, mock_question):
    """Test that credit is deducted on answer submission."""
    mock_deduct = AsyncMock()

    with patch(
        'app.core.security.get_current_user',
        return_value=mock_auth_user
    ), patch(
        'app.models.comprehension.ContentComprehension.find_one',
        new_callable=AsyncMock,
        return_value=MagicMock(questions=[mock_question])
    ), patch(
        'app.models.comprehension.ComprehensionAttempt.save',
        new_callable=AsyncMock
    ), patch(
        'app.services.beta.credit_service.BetaCreditService.deduct',
        new_callable=AsyncMock,
        side_effect=mock_deduct
    ):
        response = client.post(
            "/api/v1/comprehension/questions/test-q-123/submit",
            json={"selected_option": 0, "time_taken_ms": 5000},
            headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        # Verify deduct was called with correct parameters
        assert mock_deduct.called
        call_args = mock_deduct.call_args[1]
        assert call_args["user_id"] == "test-user-id"
        assert call_args["feature"] == "comprehension_question"
        assert call_args["usage"] == 1.0
