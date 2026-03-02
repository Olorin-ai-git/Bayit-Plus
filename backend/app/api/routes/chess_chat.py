"""Chess chat REST API routes — send and retrieve chat messages."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.chess import BotDifficulty, ChessChatMessage, ChessGame, GameMode
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/chess", tags=["chess"])


class SendChatRequest(BaseModel):
    """Request body for sending a chat message."""

    message: str


@router.get("/{game_code}/chat")
async def get_chat_history(
    game_code: str, current_user: User = Depends(get_current_active_user)
):
    """Get chat history for a chess game."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    messages = (
        await ChessChatMessage.find({"game_id": str(game.id)}).sort("-timestamp").to_list()
    )
    return {"messages": [msg.model_dump(mode="json") for msg in messages]}


@router.post("/{game_code}/chat")
async def send_chat_message(
    game_code: str,
    request: SendChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message via REST (fallback when WebSocket is unavailable)."""
    game = await ChessGame.find_one({"game_code": game_code})
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    user_id = str(current_user.id)
    is_player = (
        (game.white_player and game.white_player.user_id == user_id)
        or (game.black_player and game.black_player.user_id == user_id)
    )
    if not is_player:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a player in this game")

    chat_text = request.message.strip()
    if not chat_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    is_bot_game = game.game_mode == GameMode.BOT
    is_bot_req = is_bot_game or "@bot" in chat_text.lower()
    chat_msg = ChessChatMessage(
        game_id=str(game.id),
        user_id=user_id,
        user_name=current_user.name,
        message=chat_text,
        is_bot_request=is_bot_req,
        source_language="en",
        timestamp=datetime.now(timezone.utc),
    )

    if not is_bot_game and is_bot_req:
        try:
            from app.services.ai_chess_service import get_chess_advice
            chat_msg.bot_response = await get_chess_advice(game.board_fen, chat_text)
        except Exception:
            chat_msg.bot_response = "Sorry, I couldn't provide advice at this time"

    await chat_msg.insert()

    response_data = chat_msg.model_dump(mode="json")
    response_data["display_message"] = chat_text
    response_data["is_translated"] = False
    response_data["translation_available"] = False

    try:
        from app.api.routes.websocket_chess import active_game_connections, broadcast_to_game
        if game_code in active_game_connections:
            await broadcast_to_game(game_code, {"type": "chat", "data": response_data})
    except Exception:
        pass

    if is_bot_game:
        await _create_rest_bot_reply(game, user_id, chat_text, game_code)

    return response_data


async def _create_rest_bot_reply(game, user_id, player_message, game_code):
    """Create bot reply for REST-initiated chat in bot games."""
    from app.services.ai_chess_service import count_bot_chat_messages, get_bot_chat_response
    from app.services.bot_chess_service import get_bot_name

    count = await count_bot_chat_messages(str(game.id))
    if count > settings.CHESS_BOT_CHAT_LIMIT:
        sys_msg = ChessChatMessage(
            game_id=str(game.id), user_id="SYSTEM", user_name="System",
            message="Chat limit reached for this game", is_bot_request=False, source_language="en",
            timestamp=datetime.now(timezone.utc),
        )
        await sys_msg.insert()
        await _broadcast_chat(game_code, sys_msg)
        return

    player_color = "white" if game.white_player and game.white_player.user_id == user_id else "black"
    move_history_san = [m.san for m in game.move_history] if game.move_history else []
    difficulty = game.bot_difficulty or BotDifficulty.MEDIUM

    reply_text = await get_bot_chat_response(
        board_fen=game.board_fen, move_history_san=move_history_san,
        player_message=player_message, player_color=player_color, difficulty=difficulty,
    )

    bot_msg = ChessChatMessage(
        game_id=str(game.id), user_id="BOT", user_name=get_bot_name(difficulty),
        message=reply_text, is_bot_request=False, source_language="en",
        timestamp=datetime.now(timezone.utc),
    )
    await bot_msg.insert()
    await _broadcast_chat(game_code, bot_msg)


async def _broadcast_chat(game_code: str, msg: ChessChatMessage):
    """Best-effort broadcast a chat message to active WS connections."""
    data = msg.model_dump(mode="json")
    data["display_message"] = msg.message
    data["is_translated"] = False
    data["translation_available"] = False
    try:
        from app.api.routes.websocket_chess import active_game_connections, broadcast_to_game
        if game_code in active_game_connections:
            await broadcast_to_game(game_code, {"type": "chat", "data": data})
    except Exception:
        pass
