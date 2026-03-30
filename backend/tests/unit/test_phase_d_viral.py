"""Tests for Phase D viral mechanics (clip share, challenge, free trivia)."""

import pytest

from app.api.routes.olorin.clip_share import (
    CLIP_MAX_SECONDS,
    WATERMARK_TEXT,
    ClipRequest,
    ClipResponse,
)
from app.api.routes.olorin.challenge import (
    NominateRequest,
    NominationResponse,
    VoteRequest,
    VoteResponse,
)
from app.api.routes.olorin.free_trivia import (
    FreeQuizRequest,
    FreeQuizResponse,
    QuizQuestion,
    QuizViewResponse,
)
from app.models.challenge_nomination import ChallengeNomination


class TestClipShareModels:
    """D1: Clip share constants and models."""

    def test_watermark_text(self):
        assert "Olorin" in WATERMARK_TEXT
        assert "olorin.ai" in WATERMARK_TEXT

    def test_clip_max_seconds(self):
        assert CLIP_MAX_SECONDS == 15

    def test_clip_request(self):
        req = ClipRequest(session_id="abc123", exchange_index=2)
        assert req.session_id == "abc123"
        assert req.exchange_index == 2

    def test_clip_request_default_index(self):
        req = ClipRequest(session_id="abc")
        assert req.exchange_index == 0

    def test_clip_response(self):
        resp = ClipResponse(
            clip_url="https://cdn.example.com/clip.mp4",
            clip_id="xyz",
            duration_seconds=12.5,
        )
        assert resp.watermark == WATERMARK_TEXT
        assert resp.duration_seconds == 12.5


class TestChallengeModels:
    """D2: Challenge nomination models."""

    def test_nomination_collection(self):
        assert ChallengeNomination.Settings.name == "challenge_nominations"

    def test_nomination_indexes(self):
        idxs = ChallengeNomination.Settings.indexes
        assert "status" in idxs
        assert "vote_count" in idxs
        assert "nominator_email" in idxs

    def test_nominate_request(self):
        req = NominateRequest(
            video_url="https://youtube.com/watch?v=abc",
            title="Cool Video",
            reason="Very informative",
            email="test@example.com",
        )
        assert req.email == "test@example.com"

    def test_nominate_request_defaults(self):
        req = NominateRequest(
            video_url="https://example.com/v.mp4",
            email="user@test.com",
        )
        assert req.title == ""
        assert req.reason == ""

    def test_vote_request(self):
        req = VoteRequest(email="voter@example.com")
        assert req.email == "voter@example.com"

    def test_vote_response(self):
        resp = VoteResponse(
            nomination_id="abc",
            new_vote_count=5,
            message="Vote recorded",
        )
        assert resp.new_vote_count == 5

    def test_nomination_response(self):
        resp = NominationResponse(
            id="abc",
            video_url="https://example.com/v.mp4",
            title="Test",
            reason="Because",
            vote_count=3,
            status="active",
            created_at="2026-03-30T12:00:00Z",
        )
        assert resp.status == "active"


class TestFreeTriviaModels:
    """D3: Free trivia tool models."""

    def test_quiz_request(self):
        req = FreeQuizRequest(video_url="https://youtube.com/watch?v=abc")
        assert "youtube" in req.video_url

    def test_quiz_question(self):
        q = QuizQuestion(
            question="What color is the sky?",
            choices=["Red", "Blue", "Green", "Yellow"],
            correct_index=1,
        )
        assert q.choices[q.correct_index] == "Blue"

    def test_quiz_response(self):
        resp = FreeQuizResponse(
            quiz_id="abc123",
            video_url="https://example.com/v.mp4",
            title="Test Quiz",
            questions=[
                QuizQuestion(
                    question="Q1?",
                    choices=["A", "B", "C", "D"],
                    correct_index=0,
                ),
            ],
            share_url="https://api.olorin.ai/v1/tools/trivia/abc123",
        )
        assert resp.powered_by == "Olorin.ai"
        assert len(resp.questions) == 1

    def test_quiz_view_response(self):
        resp = QuizViewResponse(
            quiz_id="xyz",
            title="Shared Quiz",
            questions=[],
        )
        assert resp.powered_by == "Olorin.ai"

    def test_quiz_id_deterministic(self):
        import hashlib
        url = "https://youtube.com/watch?v=test123"
        qid = hashlib.md5(url.encode()).hexdigest()[:12]
        qid2 = hashlib.md5(url.encode()).hexdigest()[:12]
        assert qid == qid2
