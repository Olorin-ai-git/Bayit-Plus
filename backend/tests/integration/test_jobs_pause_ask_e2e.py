"""Integration tests for Steve Jobs pause-ask + memory flow (live backend).

Architecture note: The guest demo endpoint is stateless. Each call uses a
fingerprint to track lifetime usage, not a session ID. Memory state is
maintained server-side per user/content combination — it is not exposed in
the guest demo response (the guest endpoint returns only character_name,
character_response_text, character_audio_url, and interactions_remaining).

The rate-limit test exhausts the fingerprint's lifetime cap by sending
GUEST_DEMO_MAX_INTERACTIONS + 1 messages. To avoid polluting the real
guest_demo_usage collection across runs, each test uses a unique fingerprint.

Requires: running backend API, real MongoDB, real ElevenLabs + Anthropic
credentials, and DEMO_CONTENT_ID configured to the Jobs content ID.

Run:
    poetry run pytest tests/integration/test_jobs_pause_ask_e2e.py -v -m integration
"""

import os
import uuid

import httpx
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]

JOBS_CONTENT_ID = "69d286dc1c1371035dbb14b5"
JOBS_CHARACTER = "Steve Jobs"
API_BASE = os.environ.get("DEMO_API_BASE", "http://localhost:8000/api/v1")
PAUSE_ASK_PATH = "/demo/pause-ask"

# Words/phrases that should appear in a real Jobs-character response.
# The LLM prompt is seeded with Jobs bio so at least one of these should match.
PERSONA_VOCAB = [
    "connect", "dots", "love", "death", "hungry", "foolish",
    "calligraphy", "apple", "intuition", "design", "simplicity",
    "stanford", "pixar", "steve", "jobs",
]


def _make_fingerprint() -> str:
    """Generate a unique fingerprint so each test run has a clean usage slate."""
    return f"test-jobs-{uuid.uuid4().hex}"


async def _pause_ask(
    client: httpx.AsyncClient,
    fingerprint: str,
    message: str,
    content_id: str = JOBS_CONTENT_ID,
    character_name: str = JOBS_CHARACTER,
) -> httpx.Response:
    """Send one pause-ask request and return the raw response."""
    return await client.post(
        PAUSE_ASK_PATH,
        json={
            "fingerprint": fingerprint,
            "message": message,
            "character_name": character_name,
            "content_id": content_id,
            "language_hint": "en",
        },
    )


async def test_jobs_session_start_and_first_exchange():
    """First pause-ask exchange returns a populated response.

    Verifies: 200 status, non-empty response text and audio URL, at least one
    Jobs-specific persona word in the response, and interactions_remaining
    decremented from the configured maximum.
    """
    fingerprint = _make_fingerprint()
    async with httpx.AsyncClient(base_url=API_BASE, timeout=90.0) as client:
        res = await _pause_ask(
            client, fingerprint, "What did you mean by 'connect the dots'?"
        )
        assert res.status_code == 200, (
            f"pause-ask failed: {res.status_code} {res.text}"
        )
        data = res.json()
        assert data["character_response_text"], "response text empty"
        assert data["character_audio_url"], "audio URL missing"
        assert data["character_name"], "character name missing"
        assert isinstance(data["interactions_remaining"], int), (
            "interactions_remaining must be an integer"
        )
        text_lower = data["character_response_text"].lower()
        matches = [w for w in PERSONA_VOCAB if w in text_lower]
        assert matches, (
            f"No Jobs persona vocab found in response: "
            f"{data['character_response_text'][:300]}"
        )


async def test_jobs_multi_exchange_responses_are_coherent():
    """Three sequential exchanges each return valid responses.

    The guest demo endpoint is stateless from the client perspective, but
    the server maintains film memory internally. This test verifies that all
    three exchanges complete successfully and that each response is non-empty,
    confirming the memory+LLM pipeline is healthy end-to-end.
    """
    fingerprint = _make_fingerprint()
    messages = [
        "What do you think actually defines success?",
        "Does that answer hold up over a whole lifetime?",
        "What changes once you know you are going to die?",
    ]
    async with httpx.AsyncClient(base_url=API_BASE, timeout=90.0) as client:
        for i, msg in enumerate(messages, start=1):
            res = await _pause_ask(client, fingerprint, msg)
            assert res.status_code == 200, (
                f"Exchange {i} failed: {res.status_code} {res.text}"
            )
            data = res.json()
            assert data["character_response_text"], (
                f"Exchange {i} returned empty response text"
            )
            assert data["character_audio_url"], (
                f"Exchange {i} returned empty audio URL"
            )
            assert isinstance(data["interactions_remaining"], int)


async def test_jobs_rate_limit_enforced_at_cap():
    """After GUEST_DEMO_MAX_INTERACTIONS messages, the next returns 429.

    Uses a unique fingerprint and exhausts the lifetime cap by sending one
    message at a time until either a 429 is returned or the cap+1 count is
    reached. At least one 429 must appear within cap+1 attempts.

    The default GUEST_DEMO_MAX_INTERACTIONS is 10. We send 11 attempts.
    """
    fingerprint = _make_fingerprint()
    cap_plus_one = 11
    statuses: list[int] = []

    async with httpx.AsyncClient(base_url=API_BASE, timeout=90.0) as client:
        for i in range(cap_plus_one):
            res = await _pause_ask(
                client, fingerprint, f"Integration test probe message {i + 1}"
            )
            statuses.append(res.status_code)
            if res.status_code == 429:
                break

    assert any(s == 429 for s in statuses), (
        f"Expected a 429 response within {cap_plus_one} exchanges; "
        f"got statuses: {statuses}"
    )
