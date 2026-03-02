"""Chess WebSocket message handlers."""
import asyncio
from datetime import datetime, timezone
from typing import Callable

from starlette.websockets import WebSocket

from app.core.logging_config import get_logger
from app.models.chess import BotDifficulty, ChessChatMessage, ChessGame, GameMode, GameStatus, PlayerColor
from app.models.user import User
from app.services.chess_service import chess_service

logger = get_logger(__name__)


async def handle_chess_msg(
    message: dict, game: ChessGame, game_code: str, user_id: str,
    user: User, websocket: WebSocket, broadcast_fn: Callable, bot_move_fn: Callable,
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
    elif msg_type == "draw_response":
        await _handle_draw_response(message, game, game_code, user_id, websocket, broadcast_fn)


async def _handle_move(message, game, game_code, user_id, websocket, broadcast_fn, bot_move_fn):
    try:
        game, move_rec = await chess_service.make_move(
            game_id=str(game.id), user_id=user_id,
            from_square=message["from"], to_square=message["to"],
            promotion=message.get("promotion"),
        )
        move_data = {
            "move": move_rec.model_dump(mode="json"), "board_fen": game.board_fen,
            "current_turn": game.current_turn.value, "status": game.status.value,
            "white_time_remaining_ms": game.white_player.time_remaining_ms if game.white_player else None,
            "black_time_remaining_ms": game.black_player.time_remaining_ms if game.black_player else None,
        }
        await broadcast_fn(game_code, {"type": "move", "data": move_data})
        if game.status.value in ["checkmate", "stalemate", "draw"]:
            winner = ("white" if move_rec.player.value == "white" else "black") if game.status.value == "checkmate" else None
            await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status.value, "winner": winner}})
        elif game.game_mode == GameMode.BOT and game.status == "active":
            asyncio.create_task(bot_move_fn(game, game_code))
    except ValueError as exc:
        if str(exc) == "Clock expired":
            winner = "black" if game.current_turn.value == "white" else "white"
            await broadcast_fn(game_code, {"type": "game_end", "data": {"status": "timeout", "winner": winner}})
        else:
            logger.warning("Invalid chess move", extra={"error": str(exc), "user_id": user_id})
            await websocket.send_json({"type": "error", "message": "Invalid move"})

async def _handle_chat(message, game, game_code, user_id, user, websocket, broadcast_fn):
    from app.api.routes.websocket_chess import active_game_connections
    from app.services.chat_translation_service import chat_translation_service

    chat_text = message.get("message", "")
    is_bot_game = game.game_mode == GameMode.BOT
    is_bot_req = is_bot_game or "@bot" in chat_text.lower()
    detection = await chat_translation_service.detect_language(chat_text)

    chat_msg = ChessChatMessage(
        game_id=str(game.id), user_id=user_id, user_name=user.name,
        message=chat_text, is_bot_request=is_bot_req, source_language=detection.detected_language,
    )

    if not is_bot_game and is_bot_req:
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
    sender_data = chat_msg.model_dump(mode="json")
    sender_data.update(display_message=chat_text, is_translated=False, translation_available=chat_msg.has_translations)
    await websocket.send_json({"type": "chat", "data": sender_data})
    if opponent_id and game_code in active_game_connections:
        has_tr = chat_msg.has_translations and chat_msg.translations
        opp_data = chat_msg.model_dump(mode="json")
        opp_data.update(
            display_message=list(chat_msg.translations.values())[0] if has_tr else chat_text,
            is_translated=bool(has_tr), translation_available=chat_msg.has_translations,
        )
        for ws in active_game_connections[game_code]:
            if ws != websocket:
                try:
                    await ws.send_json({"type": "chat", "data": opp_data})
                except Exception:
                    pass

    if is_bot_game:
        await _create_bot_reply(game, user_id, chat_text, game_code, broadcast_fn)


async def _create_bot_reply(game, user_id, player_message, game_code, broadcast_fn):
    from app.core.config import settings
    from app.services.ai_chess_service import count_bot_chat_messages, get_bot_chat_response
    from app.services.bot_chess_service import get_bot_name

    game_id = str(game.id)
    if await count_bot_chat_messages(game_id) > settings.CHESS_BOT_CHAT_LIMIT:
        msg = ChessChatMessage(
            game_id=game_id, user_id="SYSTEM", user_name="System",
            message="Chat limit reached for this game", is_bot_request=False, source_language="en",
        )
    else:
        player_color = "white" if game.white_player and game.white_player.user_id == user_id else "black"
        sans = [m.san for m in game.move_history] if game.move_history else []
        difficulty = game.bot_difficulty or BotDifficulty.MEDIUM
        reply = await get_bot_chat_response(
            board_fen=game.board_fen, move_history_san=sans,
            player_message=player_message, player_color=player_color, difficulty=difficulty,
        )
        msg = ChessChatMessage(
            game_id=game_id, user_id="BOT", user_name=get_bot_name(difficulty),
            message=reply, is_bot_request=False, source_language="en",
        )
    await msg.insert()
    data = msg.model_dump(mode="json")
    data.update(display_message=msg.message, is_translated=False, translation_available=False)
    await broadcast_fn(game_code, {"type": "chat", "data": data})


async def _handle_resign(game, game_code, user_id, websocket, broadcast_fn):
    try:
        game = await chess_service.resign_game(str(game.id), user_id)
        winner = "black" if game.white_player and game.white_player.user_id == user_id else "white"
        await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status.value, "winner": winner}})
    except ValueError as exc:
        logger.warning("Resign failed", extra={"error": str(exc), "user_id": user_id})
        await websocket.send_json({"type": "error", "message": "Cannot resign at this time"})


async def _handle_draw(game, game_code, user_id, websocket, broadcast_fn):
    try:
        game = await chess_service.offer_draw(str(game.id), user_id)
        await broadcast_fn(game_code, {"type": "game_end", "data": {"status": game.status.value, "winner": None}})
    except ValueError as exc:
        logger.warning("Draw offer failed", extra={"error": str(exc), "user_id": user_id})
        await websocket.send_json({"type": "error", "message": "Cannot offer draw at this time"})


async def _handle_draw_response(message, game, game_code, user_id, websocket, broadcast_fn):
    if message.get("accept", False):
        try:
            game = await chess_service.offer_draw(str(game.id), user_id)
            await broadcast_fn(game_code, {"type": "game_end", "data": {"status": "draw", "winner": None}})
        except ValueError as exc:
            logger.warning("Draw accept failed", extra={"error": str(exc), "user_id": user_id})
    else:
        await broadcast_fn(game_code, {"type": "draw_declined", "data": {"declined_by": user_id}})


def _get_opponent_id(game: ChessGame, user_id: str):
    wp, bp = game.white_player, game.black_player
    if wp and wp.user_id == user_id:
        return bp.user_id if bp else None
    if bp and bp.user_id == user_id:
        return wp.user_id if wp else None
    return None


async def timeout_watchdog(game_code: str, broadcast_fn: Callable) -> None:
    """Poll every 5s for timed active games; trigger timeout if clock expired."""
    while True:
        await asyncio.sleep(5)
        game = await ChessGame.find_one({"game_code": game_code})
        if not game or game.status != GameStatus.ACTIVE or not game.time_control or not game.last_move_at:
            break
        current = game.white_player if game.current_turn == PlayerColor.WHITE else game.black_player
        if not current or current.time_remaining_ms is None:
            break
        elapsed = int((datetime.now(timezone.utc) - game.last_move_at).total_seconds() * 1000)
        if current.time_remaining_ms - elapsed <= 0:
            current.time_remaining_ms = 0
            game.status, game.updated_at = GameStatus.TIMEOUT, datetime.now(timezone.utc)
            await game.save()
            winner = "black" if game.current_turn == PlayerColor.WHITE else "white"
            await broadcast_fn(game_code, {"type": "game_end", "data": {"status": "timeout", "winner": winner}})
            break
