"""
Chess WebSocket message handlers.
Extracted from websocket_chess.py to keep files under 200 lines.
"""

import asyncio
from datetime import datetime
from typing import Callable, Coroutine

from starlette.websockets import WebSocket

from app.core.logging_config import get_logger
from app.models.chess import ChessChatMessage, ChessGame, GameMode
from app.models.user import User
from app.services.chess_service import chess_service

logger = get_logger(__name__)


async def handle_chess_msg(
    message: dict,
    game: ChessGame,
    game_code: str,
    user_id: str,
    user: User,
    websocket: WebSocket,
    broadcast_fn: Callable,
    bot_move_fn: Callable,
) -> None:
    """Route a single chess message by type."""
    msg_type = message.get("type")

    if msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    elif msg_type == "move":
        await _handle_move(message, game, game_code, user_id, websocket, broadcast_fn, bot_move_fn)
    elif msg_type == "chat":
        await _handle_chat(message, game, game_code, user_id, user, websocket, broadcast_fn)
    elif msg_type == "resign":
        await _handle_resign(game, game_code, user_id, websocket, broadcast_fn)
    elif msg_type == "offer_draw":
        await _handle_draw(game, game_code, user_id, websocket, broadcast_fn)


async def _handle_move(message, game, game_code, user_id, websocket, broadcast_fn, bot_move_fn):
    try:
        game, move_rec = await chess_service.make_move(
            game_id=str(game.id), user_id=user_id,
            from_square=message["from"], to_square=message["to"],
            promotion=message.get("promotion"),
        )
        await broadcast_fn(game_code, {
            "type": "move",
            "data": {"move": move_rec.dict(), "board_fen": game.board_fen,
                     "current_turn": game.current_turn, "status": game.status},
        })
        if game.status in ["checkmate", "stalemate", "draw"]:
            winner = ("white" if move_rec.player == "white" else "black") if game.status == "checkmate" else None
            await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status, "winner": winner}})
        elif game.game_mode == GameMode.BOT and game.status == "active":
            asyncio.create_task(bot_move_fn(game, game_code))
    except ValueError as exc:
        logger.warning("Invalid chess move", extra={"error": str(exc), "user_id": user_id})
        await websocket.send_json({"type": "error", "message": "Invalid move"})


async def _handle_chat(message, game, game_code, user_id, user, websocket, broadcast_fn):
    from app.api.routes.websocket_chess import active_game_connections
    from app.services.chat_translation_service import chat_translation_service

    chat_text = message.get("message", "")
    is_bot_req = "@bot" in chat_text.lower()
    detection = await chat_translation_service.detect_language(chat_text)

    chat_msg = ChessChatMessage(
        game_id=str(game.id), user_id=user_id, user_name=user.name,
        message=chat_text, is_bot_request=is_bot_req, source_language=detection.detected_language,
    )

    if is_bot_req:
        try:
            from app.services.ai_chess_service import get_chess_advice
            chat_msg.bot_response = await get_chess_advice(game.board_fen, chat_text)
        except Exception:
            chat_msg.bot_response = "Sorry, I couldn't provide advice at this time"

    opponent_id = _get_opponent_id(game, user_id)
    if opponent_id:
        should_tr, target = await chat_translation_service.should_translate_for_user(opponent_id)
        if should_tr and detection.detected_language != target:
            result = await chat_translation_service.translate_message(chat_text, detection.detected_language, target)
            if result.translated_text != chat_text:
                chat_msg.translations = {target: result.translated_text}
                chat_msg.has_translations = True

    await chat_msg.insert()

    sender_data = chat_msg.dict()
    sender_data["display_message"] = chat_text
    sender_data["is_translated"] = False
    sender_data["translation_available"] = chat_msg.has_translations
    await websocket.send_json({"type": "chat", "data": sender_data})

    if opponent_id and game_code in active_game_connections:
        opp_data = chat_msg.dict()
        if chat_msg.has_translations and chat_msg.translations:
            opp_data["display_message"] = list(chat_msg.translations.values())[0]
            opp_data["is_translated"] = True
        else:
            opp_data["display_message"] = chat_text
            opp_data["is_translated"] = False
        opp_data["translation_available"] = chat_msg.has_translations
        for ws in active_game_connections[game_code]:
            if ws != websocket:
                try:
                    await ws.send_json({"type": "chat", "data": opp_data})
                except Exception:
                    pass


async def _handle_resign(game, game_code, user_id, websocket, broadcast_fn):
    try:
        game = await chess_service.resign_game(str(game.id), user_id)
        winner = "black" if game.white_player and game.white_player.user_id == user_id else "white"
        await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status, "winner": winner}})
    except ValueError as exc:
        logger.warning("Resign failed", extra={"error": str(exc), "user_id": user_id})
        await websocket.send_json({"type": "error", "message": "Cannot resign at this time"})


async def _handle_draw(game, game_code, user_id, websocket, broadcast_fn):
    try:
        game = await chess_service.offer_draw(str(game.id), user_id)
        await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status, "winner": None}})
    except ValueError as exc:
        logger.warning("Draw offer failed", extra={"error": str(exc), "user_id": user_id})
        await websocket.send_json({"type": "error", "message": "Cannot offer draw at this time"})


def _get_opponent_id(game: ChessGame, user_id: str):
    if game.white_player and game.white_player.user_id == user_id:
        return game.black_player.user_id if game.black_player else None
    if game.black_player and game.black_player.user_id == user_id:
        return game.white_player.user_id if game.white_player else None
    return None
