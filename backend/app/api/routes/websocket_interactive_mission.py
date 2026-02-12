"""Interactive Mission WebSocket Endpoint."""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message, get_user_from_token,
)
from app.core.logging_config import get_logger
from app.models.interactive_mission import InteractiveMission, MissionStatus
from app.services.talk_back.voice_evaluator import voice_evaluator

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/interactive-mission/{mission_id}")
async def interactive_mission_ws(websocket: WebSocket, mission_id: str):
    await websocket.accept()
    token, error = await check_authentication_message(websocket)
    if error:
        logger.warning("Mission WS auth failed", extra={"mission_id": mission_id, "error": error})
        await websocket.send_json({"type": "error", "message": "Authentication failed", "recoverable": False})
        await websocket.close(code=4003, reason="Authentication failed")
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json({"type": "error", "message": "Invalid authentication token", "recoverable": False})
        await websocket.close(code=4001, reason="Invalid token")
        return

    mission = await InteractiveMission.get(mission_id)
    if not mission or mission.user_id != str(user.id):
        await websocket.send_json({"type": "error", "message": "Mission not found"})
        await websocket.close(code=4004, reason="Mission not found")
        return

    await websocket.send_json({"type": "authenticated", "user_id": str(user.id)})
    logger.info("Mission WebSocket connected", extra={"mission_id": mission_id, "user_id": str(user.id)})

    try:
        await _handle_messages(websocket, mission)
    except WebSocketDisconnect:
        logger.info("Mission WebSocket disconnected", extra={"mission_id": mission_id})
    except Exception as exc:
        logger.error("Mission WebSocket error", extra={"mission_id": mission_id, "error": str(exc)})
        try:
            await websocket.send_json({"type": "error", "message": "Internal server error"})
        except Exception:
            pass


async def _handle_messages(websocket: WebSocket, mission: InteractiveMission) -> None:
    while True:
        data = await websocket.receive_text()
        try:
            message = json.loads(data)
        except json.JSONDecodeError:
            await websocket.send_json({"type": "error", "message": "Invalid JSON message"})
            continue
        msg_type = message.get("type", "")
        if msg_type == "audio_chunk":
            await _handle_audio_chunk(websocket, mission, message)
        elif msg_type == "voice_decision_attempt":
            await _handle_voice_decision(websocket, mission, message)
        elif msg_type == "scene_transition":
            await _handle_scene_transition(websocket, mission, message)
        elif msg_type == "progress_poll":
            await _handle_progress_poll(websocket, mission)
        elif msg_type == "heartbeat":
            await websocket.send_json({"type": "heartbeat_ack"})
        else:
            safe_type = str(msg_type)[:50]
            await websocket.send_json({"type": "error", "message": f"Unknown message type: {safe_type}"})


async def _handle_audio_chunk(websocket: WebSocket, mission: InteractiveMission, message: dict) -> None:
    transcript = message.get("transcript", "")
    scene_number = message.get("scene_number", 0)
    language = message.get("language", "he")
    scene = next((s for s in mission.scenes if s.scene_number == scene_number), None)
    if not scene or not scene.decision:
        await websocket.send_json({"type": "evaluation_error", "message": "No decision point at this scene"})
        return
    quality, score, feedback, feedback_he = voice_evaluator.evaluate(
        transcript=transcript, expected_responses=scene.decision.expected_responses, detected_language=language,
    )
    succeeded = quality.value in ("exact_match", "correct_root")
    next_scene = scene.decision.next_scene_on_success if succeeded else scene.decision.next_scene_on_failure
    await websocket.send_json({
        "type": "evaluation_result", "scene_number": scene_number, "success": succeeded,
        "quality": quality.value, "score": score, "feedback": feedback,
        "feedback_he": feedback_he, "next_scene": next_scene,
    })


async def _handle_voice_decision(websocket: WebSocket, mission: InteractiveMission, message: dict) -> None:
    """Handle voice phrase decision attempt with pronunciation scoring."""
    import base64
    from app.models.child_avatar import ChildAvatar
    from app.services.interactive_mission.voice_decision_handler import voice_decision_handler

    scene_number = message.get("scene_number", 0)
    audio_b64 = message.get("audio", "")
    attempt_number = message.get("attempt_number", 1)

    scene = next((s for s in mission.scenes if s.scene_number == scene_number), None)
    if not scene or not scene.decision:
        await websocket.send_json({"type": "evaluation_error", "message": "No decision point at this scene"})
        return

    audio_data = base64.b64decode(audio_b64) if audio_b64 else b""
    avatar = await ChildAvatar.get(mission.avatar_id)
    if not avatar:
        await websocket.send_json({"type": "evaluation_error", "message": "Avatar not found"})
        return

    result = await voice_decision_handler.evaluate_voice_decision(
        audio_data=audio_data, decision=scene.decision, avatar=avatar, attempt_number=attempt_number,
    )

    await websocket.send_json({
        "type": "voice_decision_result", "scene_number": scene_number,
        "success": result.success, "quality": result.quality, "score": result.score,
        "pronunciation_score": result.pronunciation_score, "feedback": result.feedback,
        "feedback_he": result.feedback_he, "next_scene": result.next_scene,
        "hint": result.hint, "attempt_number": result.attempt_number,
        "corrected_audio_url": result.corrected_audio_url,
    })


async def _handle_scene_transition(websocket: WebSocket, mission: InteractiveMission, message: dict) -> None:
    scene_number = message.get("scene_number", 0)
    mission.scenes_completed = max(mission.scenes_completed, scene_number)
    if mission.status == MissionStatus.READY:
        mission.status = MissionStatus.ACTIVE
    await mission.save()
    await websocket.send_json({
        "type": "scene_transition_ack", "scene_number": scene_number,
        "scenes_completed": mission.scenes_completed,
    })


async def _handle_progress_poll(websocket: WebSocket, mission: InteractiveMission) -> None:
    await mission.sync()
    await websocket.send_json({
        "type": "progress_update", "status": mission.status.value,
        "current_stage": mission.current_stage, "progress_percent": mission.progress_percent,
        "error_message": mission.error_message,
    })
