"""
Trivia processing helper for WebSocket endpoint
Handles transcript processing and quota updates
"""

import asyncio
import logging
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.models.live_feature_quota import FeatureType, LiveFeatureUsageSession
from app.models.user import User
from app.services.live_feature_quota_service import live_feature_quota_service
from app.services.live_trivia.live_trivia_orchestrator import LiveTriviaOrchestrator

logger = logging.getLogger(__name__)


async def process_trivia_stream(
    websocket: WebSocket,
    orchestrator: LiveTriviaOrchestrator,
    session: LiveFeatureUsageSession,
    user: User,
    channel_id: str,
) -> None:
    """
    Process transcript chunks and generate trivia facts.
    Handles quota updates and error conditions.
    """
    last_quota_update = asyncio.get_event_loop().time()

    while True:
        try:
            # Receive transcript message from client
            message = await websocket.receive_json()

            if message.get("type") != "transcript":
                logger.warning(f"Invalid message type: {message.get('type')}")
                continue

            transcript_text = message.get("text", "")
            language = message.get("language", "he")

            if not transcript_text:
                continue

            # Process transcript and generate trivia facts
            facts = await orchestrator.process_transcript(
                transcript=transcript_text,
                channel_id=channel_id,
                user_id=str(user.id),
                language=language,
            )

            # Send trivia facts to client
            for fact in facts:
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
                await websocket.send_json(
                    {"type": "trivia_fact", "data": fact_data}
                )

            # Update quota periodically (every 10 seconds)
            last_quota_update = await update_quota_if_needed(
                websocket, session, user, last_quota_update, len(facts)
            )

        except WebSocketDisconnect:
            raise
        except Exception as e:
            logger.error(f"Error processing transcript: {str(e)}")
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
        except Exception as e:
            logger.error(f"Error updating usage: {e}")

    return last_quota_update
