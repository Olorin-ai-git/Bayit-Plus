"""Chess game helper utilities."""

import secrets
import string
from typing import Optional, Tuple

import chess


def generate_game_code(length: int = 6) -> str:
    """Generate a random game code (uppercase letters and digits)."""
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def validate_move(
    board_fen: str,
    from_square: str,
    to_square: str,
    promotion: Optional[str] = None,
) -> Tuple[bool, Optional[str], Optional[chess.Move]]:
    """
    Validate chess move using python-chess.

    Returns:
        Tuple of (is_valid, error_message, chess_move)
    """
    try:
        board = chess.Board(board_fen)
        move = chess.Move.from_uci(f"{from_square}{to_square}{promotion or ''}")

        if move not in board.legal_moves:
            return False, "Illegal move", None

        return True, None, move
    except Exception as e:
        return False, str(e), None
