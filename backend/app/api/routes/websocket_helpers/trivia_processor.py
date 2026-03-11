"""
Trivia processing helper for WebSocket endpoint.

Subscribes to TranscriptEventBus to consume transcripts produced by
live translation/dubbing. Trivia requires live translation to be active
on the same channel — it does NOT run its own audio capture or STT.
"""

import asyncio
import logging
from typing import List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.models.content import LiveChannel
from app.models.live_feature_quota import FeatureType, LiveFeatureUsageSession
from app.models.trivia import TriviaFactModel
from app.models.user import User
from app.services.live_feature_quota_service import live_feature_quota_service
from app.services.live_trivia.live_trivia_orchestrator import LiveTriviaOrchestrator
from app.services.transcript_bus import get_transcript_bus

logger = logging.getLogger(__name__)


async def process_trivia_stream(
    websocket: WebSocket,
    orchestrator: LiveTriviaOrchestrator,
    session: LiveFeatureUsageSession,
    user: User,
    channel_id: str,
    channel: Optional[LiveChannel] = None,
) -> None:
    """
    Subscribe to TranscriptEventBus and generate trivia from live
    translation transcripts. Also handles client messages (follow-ups).

    Requires live translation/dubbing to be active on the same channel
    so that transcripts are flowing through the bus.
    """
    source_lang = (channel.primary_language if channel else None) or "he"

    # Check that transcript bus has an active channel (translation running)
    transcript_bus = get_transcript_bus()
    if channel_id not in transcript_bus.get_active_channels():
        logger.warning(
            "No active translation for channel %s — trivia waiting for "
            "transcripts. Enable live translation first.",
            channel_id,
        )
        await websocket.send_json(
            {
                "type": "waiting",
                "message": "Waiting for live translation to start",
            }
        )

    last_quota_update = asyncio.get_event_loop().time()
    total_facts = 0

    # Callback: send facts over WebSocket
    async def on_facts(facts: List[TriviaFactModel]) -> None:
        nonlocal total_facts
        for fact in facts:
            await _send_fact(websocket, fact)
            total_facts += 1

    # Listen for client messages (follow-ups, pings) in background
    async def listen_for_client_messages():
        try:
            while True:
                message = await websocket.receive_json()
                msg_type = message.get("type")
                if msg_type == "follow_up":
                    fact_id = message.get("fact_id", "")
                    if fact_id:
                        facts = await orchestrator.generate_follow_up(
                            fact_id=fact_id,
                            chain_id=message.get("chain_id"),
                            channel_id=channel_id,
                            user_id=str(user.id),
                        )
                        for fact in facts:
                            await _send_fact(websocket, fact)
        except (WebSocketDisconnect, Exception):
            pass

    client_task = asyncio.create_task(listen_for_client_messages())

    try:
        # Start bus-based trivia session — subscribes to TranscriptEventBus
        await orchestrator.start_bus_session(
            channel_id=channel_id,
            user_id=str(user.id),
            on_facts_callback=on_facts,
            language=source_lang,
        )

        logger.info(
            "Trivia bus session started for channel %s, user %s",
            channel_id,
            user.id,
        )

        # Keep alive while client is connected, periodically update quota
        while True:
            await asyncio.sleep(10.0)

            last_quota_update = await update_quota_if_needed(
                websocket, session, user, last_quota_update, total_facts
            )

    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error("Error in trivia bus session: %s", str(e))
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "Error processing trivia",
                    "recoverable": True,
                }
            )
        except Exception:
            pass
    finally:
        # Stop bus session
        await orchestrator.stop_bus_session(channel_id, str(user.id))

        client_task.cancel()
        try:
            await client_task
        except asyncio.CancelledError:
            pass

        logger.info(
            "Trivia stream ended: %d facts generated for channel %s",
            total_facts,
            channel_id,
        )


async def _send_fact(websocket: WebSocket, fact) -> None:
    """Send a single trivia fact to the client."""
    fact_data = {
        "fact_id": fact.fact_id,
        "text": fact.text,
        "text_en": fact.text_en,
        "text_es": fact.text_es,
        "category": fact.category,
        "source": fact.source,
        "display_duration": fact.display_duration,
        "priority": fact.priority,
    }
    if fact.related_person:
        fact_data["related_person"] = fact.related_person
    fact_data["type"] = "trivia_fact"
    await websocket.send_json(fact_data)


async def update_quota_if_needed(
    websocket: WebSocket,
    session: Optional[LiveFeatureUsageSession],
    user: User,
    last_quota_update: float,
    facts_count: int,
) -> float:
    """
    Update quota every 10 seconds and check if still under limit.
    Returns updated last_quota_update time.
    """
    current_time = asyncio.get_event_loop().time()

    if session and current_time - last_quota_update >= 10.0:
        try:
            await live_feature_quota_service.update_session(
                session_id=session.session_id,
                audio_seconds_delta=10.0,
                segments_delta=facts_count,
            )

            # Check if still under quota
            allowed, error_msg, _ = await live_feature_quota_service.check_quota(
                user_id=str(user.id),
                feature_type=FeatureType.TRIVIA,
                estimated_duration_minutes=0,
            )

            if not allowed:
                await websocket.send_json(
                    {
                        "type": "quota_exceeded",
                        "message": "Usage limit reached",
                        "recoverable": False,
                    }
                )
                raise WebSocketDisconnect(code=4029, reason="Quota exceeded")

            return current_time
        except WebSocketDisconnect:
            raise
        except RuntimeError as e:
            if "websocket.send" in str(e) or "websocket.close" in str(e):
                raise WebSocketDisconnect(
                    code=1006, reason="Connection lost"
                ) from e
            logger.error("Error updating usage: %s", e)
        except Exception as e:
            err_str = str(e)
            if "websocket.send" in err_str or "websocket.close" in err_str:
                raise WebSocketDisconnect(
                    code=1006, reason="Connection lost"
                ) from e
            logger.error("Error updating usage: %s", e)

    return last_quota_update
