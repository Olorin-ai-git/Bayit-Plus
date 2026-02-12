"""Handlers for Live Layer WebSocket message processing."""

import base64

from fastapi import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.services.zeh_ani.live_layer_service import live_layer_service

logger = get_logger(__name__)


async def handle_timestamp_update(websocket: WebSocket, content_id, message):
    """Check for upcoming triggers at the reported playback position."""
    current_time = message.get("current_time", 0.0)

    triggers = await live_layer_service.get_active_triggers(
        content_id=content_id,
        current_timestamp=current_time,
    )

    for trigger in triggers:
        countdown = trigger.timestamp_seconds - current_time
        await websocket.send_json({
            "type": "trigger_upcoming",
            "trigger_id": trigger.trigger_id,
            "trigger_type": trigger.trigger_type.value,
            "target_word_he": trigger.target_word_he,
            "prompt_text_he": trigger.prompt_text_he,
            "prompt_text_en": trigger.prompt_text_en,
            "duration_seconds": trigger.duration_seconds,
            "countdown_seconds": round(countdown, 2),
        })


async def handle_trigger_response(websocket: WebSocket, user, content_id, message):
    """Score a child's spoken response to a scene trigger."""
    trigger_id = message.get("trigger_id", "")
    audio_b64 = message.get("audio", "")

    if not trigger_id or not audio_b64:
        await websocket.send_json({
            "type": "error",
            "message": "Missing trigger_id or audio",
        })
        return

    from app.models.scene_trigger import ContentSceneTriggers

    doc = await ContentSceneTriggers.find_one(
        ContentSceneTriggers.content_id == content_id,
    )
    if not doc:
        await websocket.send_json({
            "type": "error",
            "message": "No triggers found for content",
        })
        return

    trigger = next(
        (t for t in doc.triggers if t.trigger_id == trigger_id), None,
    )
    if not trigger:
        await websocket.send_json({
            "type": "error",
            "message": "Trigger not found",
        })
        return

    avatar = await ChildAvatar.find_one(
        ChildAvatar.user_id == str(user.id),
    )

    audio_data = base64.b64decode(audio_b64)
    if len(audio_data) > settings.WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES:
        logger.warning(
            "Live layer audio payload exceeds size limit",
            extra={
                "size_bytes": len(audio_data),
                "limit_bytes": settings.WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES,
            },
        )
        await websocket.send_json({
            "type": "error",
            "message": "Audio payload exceeds size limit",
        })
        return

    result = await live_layer_service.process_trigger_response(
        trigger=trigger,
        audio_data=audio_data,
        avatar=avatar,
    )

    await websocket.send_json({
        "type": "trigger_result",
        **result,
    })
