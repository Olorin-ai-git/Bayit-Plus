"""AI chess service — bot chat personas and PvP @bot advice via Claude."""

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.chess import BotDifficulty, ChessChatMessage

logger = get_logger(__name__)

_PERSONAS: dict[BotDifficulty, str] = {
    BotDifficulty.EASY: (
        "You are a friendly, encouraging beginner chess buddy. "
        "Keep it light, offer gentle tips, and cheer the player on."
    ),
    BotDifficulty.MEDIUM: (
        "You are a confident club-level chess player. "
        "Chat casually about the game, share observations, and be competitive but fair."
    ),
    BotDifficulty.HARD: (
        "You are a strong, precise chess master. "
        "Be direct, analytical, and occasionally intimidating. Speak with authority."
    ),
}


async def get_bot_chat_response(
    board_fen: str,
    move_history_san: list[str],
    player_message: str,
    difficulty: BotDifficulty,
    player_color: str,
) -> str:
    """Generate a conversational bot reply during a bot chess game."""
    client = get_anthropic_client()
    persona = _PERSONAS.get(difficulty, _PERSONAS[BotDifficulty.MEDIUM])
    history_str = ", ".join(move_history_san[-10:]) if move_history_san else "none yet"

    prompt = (
        f"{persona}\n\n"
        f"Current position (FEN): {board_fen}\n"
        f"Recent moves: {history_str}\n"
        f"Player color: {player_color}\n"
        f"Player says: {player_message}\n\n"
        "Reply in character. Keep your response under 60 words."
    )

    try:
        response = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CHESS_BOT_CHAT_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        if response.content:
            return response.content[0].text
        return "..."
    except Exception as exc:
        logger.error("Bot chat AI call failed", extra={"error": str(exc)})
        return "..."


async def count_bot_chat_messages(game_id: str) -> int:
    """Count human messages flagged as bot requests for a game."""
    return await ChessChatMessage.find(
        {"game_id": game_id, "is_bot_request": True}
    ).count()


async def get_chess_advice(board_fen: str, user_question: str) -> str:
    """Get chess advice from Claude AI grandmaster (PvP @bot feature)."""
    client = get_anthropic_client()

    prompt = (
        "You are a chess grandmaster providing strategic advice.\n\n"
        f"Current position (FEN): {board_fen}\n"
        f"Player's question: {user_question}\n\n"
        "Provide concise strategic advice. Suggest good moves with brief explanations "
        "focusing on tactical opportunities, positional advantages, and strategic plans. "
        "Keep your response under 100 words. Be encouraging and educational."
    )

    try:
        response = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CLAUDE_MAX_TOKENS_SHORT,
            messages=[{"role": "user", "content": prompt}],
        )
        if response.content:
            return response.content[0].text
        return "I couldn't generate advice at this moment."
    except Exception as exc:
        logger.error("Chess advice AI call failed", extra={"error": str(exc)})
        return "Sorry, I encountered an error providing advice."
