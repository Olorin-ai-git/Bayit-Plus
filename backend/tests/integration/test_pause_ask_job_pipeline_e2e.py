"""End-to-end test for the async Pause & Ask job pipeline.

Tests the full flow: submit job → poll until terminal → verify results.
Uses real MongoDB, real Anthropic, real ElevenLabs. Aurora lip-sync may
timeout (180s) and fall back to voice-only — both outcomes are valid.

Auth is mocked (dependency override on get_current_user) but the pipeline
runs in-process via ASGI transport, hitting real MongoDB and real external APIs.

Requires:
    - Real MongoDB connection (MONGODB_URI in .env)
    - Real ANTHROPIC_API_KEY, ELEVENLABS_API_KEY in .env
    - Content 69d286dc1c1371035dbb14b5 must exist in DB with interactive_characters

Run:
    poetry run pytest tests/integration/test_pause_ask_job_pipeline_e2e.py -v -s -m integration
"""

import asyncio
import time
from unittest.mock import MagicMock

import httpx
import pytest
from httpx import ASGITransport

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]

JOBS_CONTENT_ID = "69d286dc1c1371035dbb14b5"
JOBS_CHARACTER = "Steve Jobs"
TERMINAL_STATUSES = {"completed", "completed_voice_only", "failed"}
POLL_INTERVAL = 3.0
MAX_POLL_TIME = 300.0


def _mock_user():
    """Create a mock user for auth override."""
    user = MagicMock()
    user.id = "test-e2e-pause-ask-user"
    user.email = "e2e-test@olorin.ai"
    user.role = "user"
    user.subscription_tier = "premium"
    user.is_active = True
    user.custom_permissions = []
    return user


async def _get_client():
    """Get an AsyncClient with mocked auth, using in-process ASGI transport."""
    from app.core.security import get_current_user
    from app.main import app

    mock_user = _mock_user()
    app.dependency_overrides[get_current_user] = lambda: mock_user

    client = httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        timeout=30.0,
    )
    return client, app


async def _submit_job(
    client: httpx.AsyncClient,
    mode: str = "voice",
    question: str = "What do you think about innovation?",
) -> str:
    """Submit a pause-ask job and return the job_id."""
    resp = await client.post(
        "/api/v1/pause-ask/jobs",
        json={
            "content_id": JOBS_CONTENT_ID,
            "character": JOBS_CHARACTER,
            "question": question,
            "mode": mode,
        },
    )
    assert resp.status_code == 202, (
        f"Job submit failed: {resp.status_code} {resp.text}"
    )
    data = resp.json()
    assert "job_id" in data, f"No job_id in response: {data}"
    assert data["status"] == "accepted"
    return data["job_id"]


async def _poll_until_terminal(
    client: httpx.AsyncClient,
    job_id: str,
) -> dict:
    """Poll job status until terminal. Returns final status response."""
    start = time.monotonic()
    last_stage = ""

    while time.monotonic() - start < MAX_POLL_TIME:
        resp = await client.get(f"/api/v1/pause-ask/jobs/{job_id}")
        assert resp.status_code == 200, (
            f"Poll failed: {resp.status_code} {resp.text}"
        )
        data = resp.json()

        if data["stage"] != last_stage:
            elapsed = time.monotonic() - start
            print(
                f"  [{elapsed:.1f}s] Stage: {data['stage']}"
                f" — {data['progress_message']}"
            )
            last_stage = data["stage"]

        if data["status"] in TERMINAL_STATUSES:
            return data

        await asyncio.sleep(POLL_INTERVAL)

    raise TimeoutError(
        f"Job {job_id} did not complete within {MAX_POLL_TIME}s"
    )


async def test_voice_only_job_full_pipeline():
    """Submit a voice-only job, poll to completion, verify audio result.

    Voice-only skips Aurora lip-sync entirely, so this should complete
    in ~10-30 seconds (text polish + Claude response + ElevenLabs TTS).
    """
    client, app = await _get_client()
    try:
        print("\n--- Voice-only job pipeline ---")

        job_id = await _submit_job(client, mode="voice")
        print(f"  Job submitted: {job_id}")

        result = await _poll_until_terminal(client, job_id)

        print(f"  Final status: {result['status']}")
        assert result["status"] in ("completed", "completed_voice_only"), (
            f"Unexpected status: {result['status']}. "
            f"Error: {result.get('error')}"
        )

        assert result.get("result"), "No result payload"
        r = result["result"]
        assert r["audio_url"], "Missing audio_url"
        assert r["response_text"], "Missing response_text"
        assert r["character_name"] == JOBS_CHARACTER
        assert r["duration"] > 0, "Duration should be positive"
        print(f"  Response: {r['response_text'][:100]}...")
        print(f"  Audio: {r['audio_url'][:80]}...")
        print("  PASS")
    finally:
        from app.core.security import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
        await client.aclose()


async def test_lip_sync_job_with_aurora_fallback():
    """Submit a lip-sync job, verify it completes (with or without video).

    If Aurora succeeds within 180s, we get video_url. If it times out,
    we get voice-only fallback. Both are valid outcomes.
    """
    client, app = await _get_client()
    try:
        print("\n--- Lip-sync job pipeline ---")

        job_id = await _submit_job(
            client,
            mode="lip_sync",
            question="Tell me about your time at Pixar.",
        )
        print(f"  Job submitted: {job_id}")

        result = await _poll_until_terminal(client, job_id)
        print(f"  Final status: {result['status']}")

        if result["status"] == "completed":
            r = result["result"]
            assert r["video_url"], "lip-sync completed but no video_url"
            assert r["audio_url"], "Missing audio_url"
            assert r["response_text"], "Missing response_text"
            print(f"  Video: {r['video_url'][:80]}...")
            print("  PASS (full lip-sync)")

        elif result["status"] == "completed_voice_only":
            r = result["result"]
            assert r["audio_url"], "voice-only but no audio_url"
            assert r["response_text"], "Missing response_text"
            print(f"  Audio: {r['audio_url'][:80]}...")
            print("  PASS (voice-only fallback)")

        elif result["status"] == "failed":
            err = result.get("error", {})
            print(
                f"  FAILED: {err.get('error_type')}"
                f" — {err.get('user_message')}"
            )
            pytest.fail(
                f"Job failed: {err.get('error_type')}"
                f" — {err.get('user_message')}"
            )
    finally:
        from app.core.security import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
        await client.aclose()


async def test_job_poll_returns_404_for_unknown_id():
    """Polling a non-existent job_id returns 404."""
    client, app = await _get_client()
    try:
        resp = await client.get(
            "/api/v1/pause-ask/jobs/nonexistent-job-id-12345",
        )
        assert resp.status_code == 404, (
            f"Expected 404, got {resp.status_code}"
        )
        print("\n--- 404 test: PASS ---")
    finally:
        from app.core.security import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
        await client.aclose()


async def test_job_submit_validates_input():
    """Submit with missing/invalid fields returns 422."""
    client, app = await _get_client()
    try:
        resp = await client.post(
            "/api/v1/pause-ask/jobs",
            json={"content_id": "", "character": "", "question": ""},
        )
        assert resp.status_code == 422, (
            f"Expected 422, got {resp.status_code} {resp.text}"
        )
        print("\n--- Validation test: PASS ---")
    finally:
        from app.core.security import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
        await client.aclose()


async def test_retry_after_completion():
    """Submit, complete, then retry — should create new job or 400."""
    client, app = await _get_client()
    try:
        print("\n--- Retry test ---")

        job_id = await _submit_job(client, mode="voice")
        print(f"  Original job: {job_id}")

        result = await _poll_until_terminal(client, job_id)
        print(f"  Status: {result['status']}")

        resp = await client.post(
            f"/api/v1/pause-ask/jobs/{job_id}/retry",
        )
        # completed jobs may have can_retry=false → 400
        # failed jobs with can_retry=true → 202
        assert resp.status_code in (202, 400), (
            f"Expected 202 or 400, got {resp.status_code} {resp.text}"
        )

        if resp.status_code == 202:
            data = resp.json()
            assert data["job_id"] != job_id
            print(f"  New job: {data['job_id']}")
        else:
            print("  Retry denied (job completed, can_retry=false)")

        print("  PASS")
    finally:
        from app.core.security import get_current_user
        app.dependency_overrides.pop(get_current_user, None)
        await client.aclose()
