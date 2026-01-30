"""
Dubbing Load Test Scenarios (P2-7)

Locust-based load testing for the real-time dubbing pipeline.

Usage:
    locust -f backend/tests/load/dubbing/locustfile.py

Environment Variables:
    BACKEND_PORT: Backend port (default: 8000, used by LOAD_TEST_BASE_URL/WS_URL fallbacks)
    LOAD_TEST_BASE_URL: Backend base URL (default: http://localhost:${BACKEND_PORT})
    LOAD_TEST_WS_URL: WebSocket base URL (default: ws://localhost:${BACKEND_PORT})
    LOAD_TEST_API_KEY: Partner API key for authentication
    LOAD_TEST_SOURCE_LANG: Source language (default: he)
    LOAD_TEST_TARGET_LANG: Target language (default: en)

Scenarios:
    Baseline: 10 sessions, 5 min - p95 < 1s, 0% errors
    Capacity: 100 sessions, 10 min - p95 < 2s, < 1% errors
    Stress: 0-200 ramp, 20 min - find breaking point
    Spike: 0-100 instant, 5 min - recovery < 60s
    Endurance: 50 sessions, 1 hour - < 10% memory growth
"""

import json
import logging
import time

from locust import HttpUser, between, events, task
from locust.env import Environment

from tests.load.dubbing.conftest import (LOAD_TEST_CONFIG,
                                         generate_pcm_audio)

logger = logging.getLogger(__name__)


class DubbingSessionUser(HttpUser):
    """
    Simulates a B2B partner creating and streaming dubbing sessions.

    Each user creates a session, streams audio for a configurable
    duration, then stops the session.
    """

    wait_time = between(1, 3)

    def on_start(self):
        """Initialize test user with session."""
        self.api_key = LOAD_TEST_CONFIG["api_key"]
        self.source_lang = LOAD_TEST_CONFIG["source_language"]
        self.target_lang = LOAD_TEST_CONFIG["target_language"]
        self.session_id = None
        self.audio_chunk = generate_pcm_audio(
            duration_ms=100, sample_rate=16000
        )

    @task(weight=10)
    def create_and_stream_session(self):
        """Create session, stream audio, verify output, close."""
        # Create session
        with self.client.post(
            "/api/v1/olorin/dubbing/sessions",
            json={
                "source_language": self.source_lang,
                "target_language": self.target_lang,
            },
            headers={
                "X-API-Key": self.api_key,
            },
            name="POST /sessions",
            catch_response=True,
        ) as response:
            if response.status_code != 201:
                response.failure(
                    f"Session creation failed: {response.status_code}"
                )
                return

            data = response.json()
            self.session_id = data.get("session_id")

        if not self.session_id:
            return

        # Stream audio chunks (simulate 10 seconds)
        stream_start = time.time()
        chunks_sent = 0
        target_chunks = 100  # 10s at 100ms per chunk

        while chunks_sent < target_chunks:
            elapsed = time.time() - stream_start
            if elapsed > 30:  # Safety timeout
                break

            # Simulate real-time audio at ~10 chunks/second
            with self.client.post(
                f"/api/v1/olorin/dubbing/sessions/{self.session_id}/audio",
                data=self.audio_chunk,
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/octet-stream",
                },
                name="POST /sessions/audio",
                catch_response=True,
            ) as response:
                if response.status_code not in (200, 202):
                    response.failure(
                        f"Audio chunk failed: {response.status_code}"
                    )
                    break
                chunks_sent += 1

            time.sleep(0.1)  # ~100ms between chunks

        # End session
        with self.client.delete(
            f"/api/v1/olorin/dubbing/sessions/{self.session_id}",
            headers={"X-API-Key": self.api_key},
            name="DELETE /sessions",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                latency = data.get("avg_latency_ms", 0)
                errors = data.get("error_count", 0)

                if latency > 2000:
                    response.failure(
                        f"Latency too high: {latency:.0f}ms"
                    )
                elif errors > 0:
                    response.failure(
                        f"Session had {errors} errors"
                    )

        self.session_id = None

    @task(weight=2)
    def get_session_info(self):
        """Query session info (read path)."""
        if not self.session_id:
            return

        self.client.get(
            f"/api/v1/olorin/dubbing/sessions/{self.session_id}",
            headers={"X-API-Key": self.api_key},
            name="GET /sessions/{id}",
        )

    @task(weight=1)
    def list_voices(self):
        """List available voices (lightweight read)."""
        self.client.get(
            "/api/v1/olorin/dubbing/voices",
            headers={"X-API-Key": self.api_key},
            name="GET /voices",
        )

    def on_stop(self):
        """Cleanup: end any active session."""
        if self.session_id:
            self.client.delete(
                f"/api/v1/olorin/dubbing/sessions/{self.session_id}",
                headers={"X-API-Key": self.api_key},
                name="DELETE /sessions (cleanup)",
            )
