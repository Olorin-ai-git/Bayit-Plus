"""AI chess advice service using Claude."""
import anthropic
from app.core.config import settings


async def get_chess_advice(board_fen: str, user_question: str) -> str:
    """
    Get chess advice from Claude AI grandmaster.

    Args:
        board_fen: Current board position in FEN notation
        user_question: Player's question or request for advice

    Returns:
        Strategic chess advice from AI
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are a chess grandmaster providing strategic advice to a player.

Current board position (FEN notation): {board_fen}

Player's question: {user_question}

Provide concise, strategic advice. Suggest good moves with brief explanations focusing on:
- Tactical opportunities (forks, pins, skewers, discovered attacks)
- Positional advantages (control of center, piece activity, king safety)
- Strategic plans for the middlegame or endgame

Keep your response under 100 words. Be encouraging and educational."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        # Extract text from response
        if response.content and len(response.content) > 0:
            return response.content[0].text
        else:
            return "I apologize, but I couldn't generate advice at this moment."

    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"
