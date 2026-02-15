"""
WebSocket handler for real-time chess game communication.
Uses auth-message pattern (no token in URL) and per-connection rate limiting.
"""

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_auth import (
    ConnectionRateLimiter,
    authenticate_websocket,
    check_message_size,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.chess import ChessGame, GameMode, PlayerColor
from app.services.chess_service import chess_service

router = APIRouter()
logger = get_logger(__name__)

active_game_connections: dict[str, list[WebSocket]] = {}


async def broadcast_to_game(game_code: str, message: dict) -> int:
    """Broadcast a message to all connections in a game."""
    if game_code not in active_game_connections:
        return 0
    connections = active_game_connections[game_code]
    failed = []
    ok = 0
    for ws in connections:
        try:
            await ws.send_json(message)
            ok += 1
        except Exception:
            failed.append(ws)
    for ws in failed:
        connections.remove(ws)
    if not connections:
        del active_game_connections[game_code]
    return ok


async def execute_bot_move(game: ChessGame, game_code: str) -> None:
    """Execute bot's move after a configurable delay."""
    if game.game_mode != GameMode.BOT or not game.bot_difficulty:
        return
    current = game.white_player if game.current_turn == PlayerColor.WHITE else game.black_player
    if not current or not current.is_bot or game.status not in ["active"]:
        return

    from app.services.bot_chess_service import get_bot_move

    bot_move_delay = 0.8
    await asyncio.sleep(bot_move_delay)
    try:
        from_sq, to_sq, promo = await get_bot_move(game.board_fen, game.bot_difficulty)
        game, move_rec = await chess_service.make_move(
            game_id=str(game.id), user_id="BOT",
            from_square=from_sq, to_square=to_sq, promotion=promo,
        )
        await broadcast_to_game(game_code, {
            "type": "move",
            "data": {"move": move_rec.dict(), "board_fen": game.board_fen,
                     "current_turn": game.current_turn, "status": game.status},
        })
        if game.status in ["checkmate", "stalemate", "draw"]:
            winner = ("white" if move_rec.player == "white" else "black") if game.status == "checkmate" else None
            await broadcast_to_game(game_code, {"type": "game_end", "data": {"status": game.status, "winner": winner}})
    except Exception as exc:
        logger.error("Bot move failed", extra={"error": str(exc), "game_code": game_code})
        await broadcast_to_game(game_code, {"type": "error", "message": "An unexpected error occurred"})


@router.websocket("/ws/chess/{game_code}")
async def chess_websocket(websocket: WebSocket, game_code: str):
    """WebSocket endpoint for real-time chess. Auth: first msg {"type":"auth","token":"..."}"""
    await websocket.accept()

    user, error = await authenticate_websocket(websocket)
    if error or user is None:
        return

    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        await websocket.close(code=4004, reason="Game not found")
        return

    user_id = str(user.id)
    is_white = game.white_player and game.white_player.user_id == user_id
    is_black = game.black_player and game.black_player.user_id == user_id
    if not is_white and not is_black:
        await websocket.close(code=4003, reason="You are not a player in this game")
        return

    if game_code not in active_game_connections:
        active_game_connections[game_code] = []
    active_game_connections[game_code].append(websocket)

    rate_limiter = ConnectionRateLimiter(settings.olorin.social_ws.chess_moves_per_minute)
    warning_threshold = settings.olorin.social_ws.rate_limit_warning_threshold

    try:
        await websocket.send_json(_build_game_state(game))

        if (game.game_mode == GameMode.BOT and game.status == "active"
                and game.white_player and game.white_player.is_bot and len(game.move_history) == 0):
            asyncio.create_task(execute_bot_move(game, game_code))

        while True:
            data = await websocket.receive_text()

            if not check_message_size(data):
                await websocket.send_json({"type": "error", "message": "Message too large"})
                continue

            if not rate_limiter.check():
                warnings = rate_limiter.record_warning()
                if warnings >= warning_threshold:
                    logger.warning("Chess WS rate limit exceeded", extra={"user_id": user_id})
                    await websocket.close(code=4029, reason="Rate limit exceeded")
                    return
                await websocket.send_json({"type": "error", "message": "Rate limit exceeded, slow down"})
                continue

            try:
                message = json.loads(data)
                await _handle_chess_message(message, game, game_code, user_id, user, websocket)
                game = await ChessGame.find_one({"game_code": game_code}) or game
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception as exc:
                logger.error("Chess WS handler error", extra={"error": str(exc), "user_id": user_id})
                await websocket.send_json({"type": "error", "message": "An unexpected error occurred"})

    except WebSocketDisconnect:
        logger.info("Chess WS disconnected", extra={"user_id": user_id, "game_code": game_code})
    finally:
        _remove_connection(game_code, websocket)
        await _update_player_disconnect(game_code, user_id)


async def _handle_chess_message(message, game, game_code, user_id, user, websocket):
    """Route a chess WebSocket message."""
    from app.api.routes.websocket_chess_handlers import handle_chess_msg
    await handle_chess_msg(message, game, game_code, user_id, user, websocket, broadcast_to_game, execute_bot_move)


def _build_game_state(game: ChessGame) -> dict:
    return {
        "type": "game_state",
        "data": {
            "id": str(game.id), "game_code": game.game_code,
            "white_player": game.white_player.dict() if game.white_player else None,
            "black_player": game.black_player.dict() if game.black_player else None,
            "current_turn": game.current_turn, "status": game.status,
            "board_fen": game.board_fen,
            "move_history": [m.dict() for m in game.move_history],
            "chat_enabled": game.chat_enabled, "voice_enabled": game.voice_enabled,
            "game_mode": game.game_mode, "bot_difficulty": game.bot_difficulty,
        },
    }


def _remove_connection(game_code: str, websocket: WebSocket):
    if game_code in active_game_connections:
        try:
            active_game_connections[game_code].remove(websocket)
        except ValueError:
            pass
        if not active_game_connections.get(game_code):
            active_game_connections.pop(game_code, None)


async def _update_player_disconnect(game_code: str, user_id: str):
    game = await ChessGame.find_one({"game_code": game_code})
    if game:
        if game.white_player and game.white_player.user_id == user_id:
            game.white_player.is_connected = False
        elif game.black_player and game.black_player.user_id == user_id:
            game.black_player.is_connected = False
        game.updated_at = datetime.utcnow()
        await game.save()
