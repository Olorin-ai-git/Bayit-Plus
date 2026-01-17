"""
WebSocket handler for real-time chess game communication.
Handles WebSocket connections, chess moves, and chat messages.
"""
from typing import Optional
from datetime import datetime
import json
import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.core.config import settings
from app.models.user import User
from app.models.chess import ChessGame, ChessChatMessage, GameMode, PlayerColor
from app.services.chess_service import chess_service
from app.services.bot_chess_service import get_bot_move

# Bot move delay in seconds for natural feel
BOT_MOVE_DELAY_SECONDS = 0.8

router = APIRouter()
logger = logging.getLogger(__name__)

# Track active WebSocket connections per game
# Format: {game_code: [websocket1, websocket2]}
active_game_connections: dict[str, list[WebSocket]] = {}


async def broadcast_to_game(game_code: str, message: dict) -> int:
    """Broadcast a message to all connections in a game. Returns number of successful sends."""
    if game_code not in active_game_connections:
        return 0

    connections = active_game_connections[game_code]
    success_count = 0
    failed_connections = []

    for ws in connections:
        try:
            await ws.send_json(message)
            success_count += 1
        except Exception as e:
            logger.warning(f"[Chess] Failed to send to connection: {e}")
            failed_connections.append(ws)

    # Remove failed connections
    for ws in failed_connections:
        connections.remove(ws)

    # Clean up empty game connection list
    if not connections:
        del active_game_connections[game_code]

    return success_count


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        user = await User.get(user_id)
        if user is None or not user.is_active:
            return None

        return user
    except JWTError:
        return None


async def execute_bot_move(game: ChessGame, game_code: str) -> None:
    """Execute the bot's move after a short delay for natural feel."""
    if game.game_mode != GameMode.BOT or not game.bot_difficulty:
        return

    # Determine if it's the bot's turn
    current_player = game.white_player if game.current_turn == PlayerColor.WHITE else game.black_player
    if not current_player or not current_player.is_bot:
        return

    # Don't move if game is over
    if game.status not in ["active"]:
        return

    # Add delay for natural feel
    await asyncio.sleep(BOT_MOVE_DELAY_SECONDS)

    try:
        # Get bot's move
        from_square, to_square, promotion = await get_bot_move(
            game.board_fen,
            game.bot_difficulty
        )

        # Execute the move using the bot's user_id
        game, move_record = await chess_service.make_move(
            game_id=str(game.id),
            user_id="BOT",
            from_square=from_square,
            to_square=to_square,
            promotion=promotion
        )

        # Broadcast bot's move to all players
        await broadcast_to_game(
            game_code,
            {
                "type": "move",
                "data": {
                    "move": move_record.dict(),
                    "board_fen": game.board_fen,
                    "current_turn": game.current_turn,
                    "status": game.status
                }
            }
        )

        # Check if game ended after bot's move
        if game.status in ["checkmate", "stalemate", "draw"]:
            winner = None
            if game.status == "checkmate":
                # The bot just moved and won
                winner = "white" if move_record.player == "white" else "black"

            await broadcast_to_game(
                game_code,
                {
                    "type": "game_end",
                    "data": {
                        "status": game.status,
                        "winner": winner
                    }
                }
            )

    except Exception as e:
        logger.error(f"[Chess] Bot move failed: {e}")
        # Broadcast error to players
        await broadcast_to_game(
            game_code,
            {
                "type": "error",
                "message": f"Bot move failed: {str(e)}"
            }
        )


@router.websocket("/ws/chess/{game_code}")
async def chess_websocket(
    websocket: WebSocket,
    game_code: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time chess game.

    Message types (client -> server):
    - {"type": "move", "from": "e2", "to": "e4", "promotion": "q"}
    - {"type": "chat", "message": "text"}
    - {"type": "resign"}
    - {"type": "offer_draw"}
    - {"type": "ping"}

    Message types (server -> client):
    - {"type": "game_state", "data": {...}}
    - {"type": "move", "data": {...}}
    - {"type": "chat", "data": {...}}
    - {"type": "game_end", "data": {...}}
    - {"type": "error", "message": "..."}
    - {"type": "pong"}
    """
    # IMPORTANT: Accept WebSocket first before any validation
    await websocket.accept()
    logger.info(f"[Chess] WebSocket connection accepted for game {game_code}")

    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        logger.warning(f"[Chess] Invalid token for game {game_code}")
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify game exists
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        logger.warning(f"[Chess] Game {game_code} not found")
        await websocket.close(code=4004, reason="Game not found")
        return

    user_id = str(user.id)

    # Verify user is a player in the game
    is_white_player = game.white_player and game.white_player.user_id == user_id
    is_black_player = game.black_player and game.black_player.user_id == user_id

    if not is_white_player and not is_black_player:
        logger.warning(f"[Chess] User {user_id} ({user.name}) not a player in game {game_code}")
        await websocket.close(code=4003, reason="You are not a player in this game")
        return

    logger.info(f"[Chess] User {user.name} ({user_id}) ready to receive messages")

    # Add connection to active game connections
    if game_code not in active_game_connections:
        active_game_connections[game_code] = []
    active_game_connections[game_code].append(websocket)
    logger.info(f"[Chess] Added connection to game {game_code}. Total connections: {len(active_game_connections[game_code])}")

    try:
        # Send initial game state directly
        await websocket.send_json({
            "type": "game_state",
            "data": {
                "id": str(game.id),
                "game_code": game.game_code,
                "white_player": game.white_player.dict() if game.white_player else None,
                "black_player": game.black_player.dict() if game.black_player else None,
                "current_turn": game.current_turn,
                "status": game.status,
                "board_fen": game.board_fen,
                "move_history": [move.dict() for move in game.move_history],
                "chat_enabled": game.chat_enabled,
                "voice_enabled": game.voice_enabled,
                "game_mode": game.game_mode,
                "bot_difficulty": game.bot_difficulty
            }
        })
        logger.info(f"[Chess] Sent initial game state to {user.name}")

        # If it's a bot game and the bot plays white, make the first move
        if (game.game_mode == GameMode.BOT and
            game.status == "active" and
            game.white_player and
            game.white_player.is_bot and
            len(game.move_history) == 0):
            asyncio.create_task(execute_bot_move(game, game_code))

        # Message loop
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
                    )

                elif msg_type == "move":
                    # Handle chess move
                    try:
                        game, move_record = await chess_service.make_move(
                            game_id=str(game.id),
                            user_id=user_id,
                            from_square=message["from"],
                            to_square=message["to"],
                            promotion=message.get("promotion")
                        )

                        # Broadcast move to both players
                        await broadcast_to_game(
                            game_code,
                            {
                                "type": "move",
                                "data": {
                                    "move": move_record.dict(),
                                    "board_fen": game.board_fen,
                                    "current_turn": game.current_turn,
                                    "status": game.status
                                }
                            }
                        )

                        # Check if game ended
                        if game.status in ["checkmate", "stalemate", "draw"]:
                            winner = None
                            if game.status == "checkmate":
                                # The player who just moved wins
                                winner = "white" if move_record.player == "white" else "black"

                            await broadcast_to_game(
                                game_code,
                                {
                                    "type": "game_end",
                                    "data": {
                                        "status": game.status,
                                        "winner": winner
                                    }
                                }
                            )
                        else:
                            # If game is still active and it's a bot game, execute bot move
                            if game.game_mode == GameMode.BOT and game.status == "active":
                                # Use asyncio.create_task to avoid blocking the WebSocket
                                asyncio.create_task(execute_bot_move(game, game_code))

                    except ValueError as e:
                        await websocket.send_json({"type": "error", "message": str(e)})

                elif msg_type == "chat":
                    # Handle chat message
                    chat_text = message.get("message", "")
                    is_bot_request = "@bot" in chat_text.lower()

                    chat_msg = ChessChatMessage(
                        game_id=str(game.id),
                        user_id=user_id,
                        user_name=user.name,
                        message=chat_text,
                        is_bot_request=is_bot_request
                    )

                    # Get AI advice if bot is tagged
                    if is_bot_request:
                        try:
                            # Import here to avoid circular dependency
                            from app.services.ai_chess_service import get_chess_advice
                            advice = await get_chess_advice(game.board_fen, chat_text)
                            chat_msg.bot_response = advice
                        except Exception as e:
                            chat_msg.bot_response = f"Sorry, I couldn't provide advice: {str(e)}"

                    await chat_msg.insert()

                    # Broadcast chat to both players
                    await broadcast_to_game(
                        game_code,
                        {
                            "type": "chat",
                            "data": chat_msg.dict()
                        }
                    )

                elif msg_type == "resign":
                    # Handle resignation
                    try:
                        game = await chess_service.resign_game(str(game.id), user_id)

                        # Determine winner (opponent of resigning player)
                        if game.white_player and game.white_player.user_id == user_id:
                            winner = "black"
                        else:
                            winner = "white"

                        await broadcast_to_game(
                            game_code,
                            {
                                "type": "game_end",
                                "data": {
                                    "status": game.status,
                                    "winner": winner
                                }
                            }
                        )
                    except ValueError as e:
                        await websocket.send_json({"type": "error", "message": str(e)})

                elif msg_type == "offer_draw":
                    # Handle draw offer (auto-accepts for now)
                    try:
                        game = await chess_service.offer_draw(str(game.id), user_id)

                        await broadcast_to_game(
                            game_code,
                            {
                                "type": "game_end",
                                "data": {
                                    "status": game.status,
                                    "winner": None
                                }
                            }
                        )
                    except ValueError as e:
                        await websocket.send_json({"type": "error", "message": str(e)})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except KeyError as e:
                await websocket.send_json({"type": "error", "message": f"Missing required field: {str(e)}"})
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info(f"[Chess] User {user.name} disconnected from game {game_code}")
    finally:
        # Remove connection from active game connections
        if game_code in active_game_connections:
            try:
                active_game_connections[game_code].remove(websocket)
                logger.info(f"[Chess] Removed connection from game {game_code}. Remaining: {len(active_game_connections[game_code])}")

                # Clean up empty game connection list
                if not active_game_connections[game_code]:
                    del active_game_connections[game_code]
                    logger.info(f"[Chess] Removed empty connection list for game {game_code}")
            except ValueError:
                logger.warning(f"[Chess] Connection not found in game {game_code} during cleanup")

        # Update player connection status
        game = await ChessGame.find_one(ChessGame.game_code == game_code)
        if game:
            if game.white_player and game.white_player.user_id == user_id:
                game.white_player.is_connected = False
            elif game.black_player and game.black_player.user_id == user_id:
                game.black_player.is_connected = False

            game.updated_at = datetime.utcnow()
            await game.save()
            logger.info(f"[Chess] Updated player connection status for {user.name} in game {game_code}")
