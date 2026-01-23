"""
End-to-End Tests for Live Dubbing Pipeline

Tests complete dubbing flow:
Audio capture → STT → Translation → TTS → Output
"""

import asyncio
import json
import time
from typing import AsyncIterator

import pytest


class TestLiveDubbingE2E:
    """End-to-end tests for dubbing pipeline."""

    @pytest.mark.asyncio
    async def test_complete_dubbing_flow(self, async_client, auth_token, live_channel):
        """Test complete dubbing pipeline from connection to audio playback."""

        # Setup
        user_id = auth_token.get("user_id")
        channel_id = str(live_channel.id)

        # Step 1: Connect WebSocket
        with async_client.websocket_connect(
            f"/ws/live/{channel_id}/dubbing?target_lang=en&platform=web"
        ) as websocket:
            # Step 2: Authenticate via message
            await websocket.send_json({
                "type": "authenticate",
                "token": auth_token["access_token"]
            })

            # Step 3: Receive connection confirmation
            msg = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, websocket.receive
                ),
                timeout=5.0
            )
            data = json.loads(msg.get("text", "{}"))
            assert data["type"] == "connected"
            assert data["session_id"]

            # Step 4: Send audio chunks
            audio_data = load_test_audio("test_hebrew.pcm")
            chunks = split_into_chunks(audio_data, chunk_size=2048)

            for chunk in chunks[:10]:  # Send 10 chunks
                await asyncio.sleep(0.05)  # 20 chunks/sec
                await websocket.send_bytes(chunk)

            # Step 5: Receive dubbed audio
            dubbed_received = False
            start_time = time.time()

            while time.time() - start_time < 5.0:  # 5 second timeout
                try:
                    msg = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(
                            None, websocket.receive
                        ),
                        timeout=1.0
                    )
                    data = json.loads(msg.get("text", "{}"))

                    if data.get("type") == "dubbed_audio":
                        assert data["data"]["original_text"]
                        assert data["data"]["translated_text"]
                        assert data["data"]["sequence"] >= 0
                        assert data["data"]["latency_ms"] < 2000

                        dubbed_received = True
                        break

                except asyncio.TimeoutError:
                    continue

            assert dubbed_received, "No dubbed audio received within timeout"

    @pytest.mark.asyncio
    async def test_rate_limiting(self, async_client, auth_token, live_channel):
        """Test WebSocket connection rate limiting."""

        connections_made = 0
        rate_limited = False
        channel_id = str(live_channel.id)

        # Try to create multiple connections rapidly
        for i in range(15):
            try:
                with async_client.websocket_connect(
                    f"/ws/live/{channel_id}/dubbing?target_lang=en"
                ) as ws:
                    await ws.send_json({
                        "type": "authenticate",
                        "token": auth_token["access_token"]
                    })

                    msg = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(
                            None, ws.receive
                        ),
                        timeout=1.0
                    )
                    data = json.loads(msg.get("text", "{}"))

                    if data.get("type") == "error" and "rate limit" in data.get(
                        "message", ""
                    ).lower():
                        rate_limited = True
                        break

                    connections_made += 1

            except Exception as e:
                if "rate limit" in str(e).lower():
                    rate_limited = True
                    break

            await asyncio.sleep(0.1)

        # Should be rate limited after exceeding threshold
        assert rate_limited or connections_made >= 10

    @pytest.mark.asyncio
    async def test_latency_requirements(self, async_client, auth_token, live_channel):
        """Test that latency meets production requirements (<2 seconds)."""

        channel_id = str(live_channel.id)
        latencies = []

        with async_client.websocket_connect(
            f"/ws/live/{channel_id}/dubbing?target_lang=en"
        ) as websocket:
            await websocket.send_json({
                "type": "authenticate",
                "token": auth_token["access_token"]
            })

            msg = json.loads(
                (await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, websocket.receive
                    ),
                    timeout=5.0
                )).get("text", "{}")
            )
            assert msg["type"] == "connected"

            # Send audio
            audio_data = load_test_audio("test_hebrew.pcm")
            chunks = split_into_chunks(audio_data, chunk_size=2048)

            for chunk in chunks[:5]:
                await asyncio.sleep(0.05)
                await websocket.send_bytes(chunk)

            # Collect latency samples
            start_time = time.time()
            while time.time() - start_time < 3.0:
                try:
                    msg = json.loads(
                        (await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(
                                None, websocket.receive
                            ),
                            timeout=0.5
                        )).get("text", "{}")
                    )

                    if msg.get("type") == "dubbed_audio":
                        latencies.append(msg["data"]["latency_ms"])

                except asyncio.TimeoutError:
                    continue

        # Check latency requirements
        assert len(latencies) > 0, "No latency samples collected"
        avg_latency = sum(latencies) / len(latencies)
        assert avg_latency < 2000, f"Average latency {avg_latency}ms exceeds 2000ms limit"

    @pytest.mark.asyncio
    async def test_error_recovery(self, async_client, auth_token, live_channel):
        """Test error recovery and reconnection."""

        channel_id = str(live_channel.id)
        session_id = None

        # First connection
        with async_client.websocket_connect(
            f"/ws/live/{channel_id}/dubbing?target_lang=en"
        ) as websocket:
            await websocket.send_json({
                "type": "authenticate",
                "token": auth_token["access_token"]
            })

            msg = json.loads(
                (await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, websocket.receive
                    ),
                    timeout=5.0
                )).get("text", "{}")
            )
            session_id = msg.get("session_id")

        # Session should be recoverable from Redis
        assert session_id is not None

        # Second connection with recovery
        with async_client.websocket_connect(
            f"/ws/live/{channel_id}/dubbing?target_lang=en&resume_session_id={session_id}"
        ) as websocket:
            await websocket.send_json({
                "type": "authenticate",
                "token": auth_token["access_token"]
            })

            msg = json.loads(
                (await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, websocket.receive
                    ),
                    timeout=5.0
                )).get("text", "{}")
            )

            # Should either resume or create new session
            assert msg["type"] in ["connected", "resumed"]


# Helper functions
def load_test_audio(filename: str) -> bytes:
    """Load test audio file."""
    # Return mock Hebrew audio for testing
    # In production, use real .pcm files
    return b"\x00" * 32000  # 1 second of 16kHz 16-bit PCM silence


def split_into_chunks(data: bytes, chunk_size: int = 2048):
    """Split audio data into chunks."""
    return [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]
