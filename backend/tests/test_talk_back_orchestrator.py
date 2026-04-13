"""Tests for Talk Back Orchestrator — response processing, stats."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.talk_back_attempt import ResponseQuality
from app.services.talk_back.orchestrator import TalkBackOrchestrator


@pytest.fixture
def orchestrator():
    return TalkBackOrchestrator()


@pytest.fixture
def mock_point():
    p = MagicMock()
    p.point_id = "point-1"
    p.character_name = "TestChar"
    p.character_name_he = "דמות"
    p.shekel_reward = 10
    p.points_reward = 5
    p.expected_responses = ["שלום"]
    p.vocabulary_targets = ["שלום"]
    return p


@pytest.fixture
def mock_content_tb(mock_point):
    tb = MagicMock()
    tb.talk_back_points = [mock_point]
    return tb


def test_find_point_exists(orchestrator, mock_point):
    result = orchestrator._find_point([mock_point], "point-1")
    assert result is mock_point


def test_find_point_not_found(orchestrator, mock_point):
    result = orchestrator._find_point([mock_point], "nonexistent")
    assert result is None


def test_find_point_empty_list(orchestrator):
    result = orchestrator._find_point([], "point-1")
    assert result is None


@pytest.mark.asyncio
async def test_get_talk_back_points_delegates_to_db(orchestrator):
    with patch(
        "app.services.talk_back.orchestrator.ContentTalkBack"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=None)
        result = await orchestrator.get_talk_back_points("content-123")

    assert result is None
    mock_cls.find_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_process_response_raises_for_missing_content(orchestrator):
    with patch(
        "app.services.talk_back.orchestrator.ContentTalkBack"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=None)
        with pytest.raises(ValueError, match="No Talk Back data"):
            await orchestrator.process_response(
                user_id="u1", profile_id="p1",
                content_id="missing", point_id="pt1",
                transcript="שלום", detected_language="he",
            )


@pytest.mark.asyncio
async def test_process_response_raises_for_missing_point(
    orchestrator, mock_content_tb
):
    with patch(
        "app.services.talk_back.orchestrator.ContentTalkBack"
    ) as mock_cls:
        mock_cls.find_one = AsyncMock(return_value=mock_content_tb)
        with pytest.raises(ValueError, match="point not found"):
            await orchestrator.process_response(
                user_id="u1", profile_id="p1",
                content_id="c1", point_id="nonexistent",
                transcript="שלום", detected_language="he",
            )


@pytest.mark.asyncio
async def test_process_response_returns_result(
    orchestrator, mock_content_tb
):
    with patch(
        "app.services.talk_back.orchestrator.ContentTalkBack"
    ) as mock_tb_cls:
        mock_tb_cls.find_one = AsyncMock(return_value=mock_content_tb)
        with patch(
            "app.services.talk_back.orchestrator.voice_evaluator"
        ) as mock_eval:
            mock_eval.evaluate.return_value = (
                ResponseQuality.EXACT_MATCH, 1.0,
                "Perfect!", "מושלם!",
            )
            with patch(
                "app.services.talk_back.orchestrator.TalkBackAttempt"
            ) as mock_att:
                mock_att.return_value.insert = AsyncMock()
                with patch(
                    "app.services.talk_back.orchestrator.shekel_service"
                ) as mock_sh:
                    mock_sh.earn_shekels = AsyncMock()
                    with patch(
                        "app.services.talk_back.orchestrator.assessment_service"
                    ) as mock_as:
                        mock_as.record_assessment = AsyncMock()
                        mock_as.update_vocabulary = AsyncMock()
                        with patch(
                            "app.services.talk_back.orchestrator.level_service"
                        ) as mock_ls:
                            mock_ls.award_xp = AsyncMock()
                            result = await orchestrator.process_response(
                                user_id="u1", profile_id="p1",
                                content_id="c1", point_id="point-1",
                                transcript="שלום",
                                detected_language="he",
                            )

    assert result["quality"] == "exact_match"
    assert result["accuracy_score"] == 1.0
    assert result["shekels_earned"] == 10
    assert result["feedback_text"] == "Perfect!"


@pytest.mark.asyncio
async def test_hint_used_halves_shekels(orchestrator, mock_content_tb):
    with patch(
        "app.services.talk_back.orchestrator.ContentTalkBack"
    ) as mock_tb_cls:
        mock_tb_cls.find_one = AsyncMock(return_value=mock_content_tb)
        with patch(
            "app.services.talk_back.orchestrator.voice_evaluator"
        ) as mock_eval:
            mock_eval.evaluate.return_value = (
                ResponseQuality.EXACT_MATCH, 1.0, "OK", "אוקי",
            )
            with patch(
                "app.services.talk_back.orchestrator.TalkBackAttempt"
            ) as mock_att:
                mock_att.return_value.insert = AsyncMock()
                with patch(
                    "app.services.talk_back.orchestrator.shekel_service"
                ) as mock_sh:
                    mock_sh.earn_shekels = AsyncMock()
                    with patch(
                        "app.services.talk_back.orchestrator.assessment_service"
                    ) as mock_as:
                        mock_as.record_assessment = AsyncMock()
                        mock_as.update_vocabulary = AsyncMock()
                        with patch(
                            "app.services.talk_back.orchestrator.level_service"
                        ) as mock_ls:
                            mock_ls.award_xp = AsyncMock()
                            result = await orchestrator.process_response(
                                user_id="u1", profile_id="p1",
                                content_id="c1", point_id="point-1",
                                transcript="שלום",
                                detected_language="he",
                                hint_used=True,
                            )

    assert result["shekels_earned"] == 5
    assert result["hint_used"] is True


@pytest.mark.asyncio
async def test_get_user_stats_empty(orchestrator):
    with patch(
        "app.services.talk_back.orchestrator.TalkBackAttempt"
    ) as mock_cls:
        mock_find = MagicMock()
        mock_find.to_list = AsyncMock(return_value=[])
        mock_cls.find.return_value = mock_find

        stats = await orchestrator.get_user_stats("u1", "p1")

    assert stats["total_attempts"] == 0
    assert stats["total_shekels_earned"] == 0
    assert stats["average_accuracy"] == 0.0
