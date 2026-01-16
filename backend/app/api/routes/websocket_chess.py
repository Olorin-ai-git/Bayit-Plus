"""
WebSocket handler for real-time chess game communication.
Handles WebSocket connections, chess moves, and chat messages.
"""
from typing import Optional
from datetime import datetime
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.core.config import settings
from app.models.user import User
from app.models.chess import ChessGame, ChessChatMessage
from app.services.connection_manager import connection_manager
from app.services.chess_service import chess_service

router = APIRouter()


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
    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify game exists
    game = await ChessGame.find_one(ChessGame.game_code == game_code)
    if not game:
        await websocket.close(code=4004, reason="Game not found")
        return

    user_id = str(user.id)

    # Verify user is a player in the game
    is_white_player = game.white_player and game.white_player.user_id == user_id
    is_black_player = game.black_player and game.black_player.user_id == user_id

    if not is_white_player and not is_black_player:
        await websocket.close(code=4003, reason="You are not a player in this game")
        return

    # Connect to WebSocket
    connection_id = await connection_manager.connect(
        websocket=websocket,
        user_id=user_id,
        user_name=user.name,
        party_id=game_code  # Use game_code as party_id for connection management
    )

    try:
        # Send initial game state
        await connection_manager.send_personal_message(
            {
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
                    "voice_enabled": game.voice_enabled
                }
            },
            connection_id
        )

        # Message loop
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await connection_manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        connection_id
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
                        await connection_manager.broadcast_to_party(
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

                            await connection_manager.broadcast_to_party(
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
                        await connection_manager.send_personal_message(
                            {"type": "error", "message": str(e)},
                            connection_id
                        )

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
                    await connection_manager.broadcast_to_party(
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

                        await connection_manager.broadcast_to_party(
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
                        await connection_manager.send_personal_message(
                            {"type": "error", "message": str(e)},
                            connection_id
                        )

                elif msg_type == "offer_draw":
                    # Handle draw offer (auto-accepts for now)
                    try:
                        game = await chess_service.offer_draw(str(game.id), user_id)

                        await connection_manager.broadcast_to_party(
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
                        await connection_manager.send_personal_message(
                            {"type": "error", "message": str(e)},
                            connection_id
                        )

            except json.JSONDecodeError:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Invalid JSON"},
                    connection_id
                )
            except KeyError as e:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": f"Missing required field: {str(e)}"},
                    connection_id
                )
            except Exception as e:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": str(e)},
                    connection_id
                )

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up connection
        await connection_manager.disconnect(connection_id)

        # Update player connection status
        game = await ChessGame.find_one(ChessGame.game_code == game_code)
        if game:
            if game.white_player and game.white_player.user_id == user_id:
                game.white_player.is_connected = False
            elif game.black_player and game.black_player.user_id == user_id:
                game.black_player.is_connected = False

            game.updated_at = datetime.utcnow()
            await game.save()
