"""Bot chess service for generating computer moves at different difficulty levels."""
import chess
import random
from typing import Tuple, List

from app.models.chess import BotDifficulty


# Piece values for evaluation (centipawns)
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

# Piece-square tables for positional evaluation (white perspective)
PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
]

KNIGHT_TABLE = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
]

BISHOP_TABLE = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
]

ROOK_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
]

QUEEN_TABLE = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
]

KING_TABLE_MIDDLEGAME = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
]


def get_piece_square_value(piece: chess.Piece, square: int) -> int:
    """Get the positional value bonus for a piece on a square."""
    piece_tables = {
        chess.PAWN: PAWN_TABLE,
        chess.KNIGHT: KNIGHT_TABLE,
        chess.BISHOP: BISHOP_TABLE,
        chess.ROOK: ROOK_TABLE,
        chess.QUEEN: QUEEN_TABLE,
        chess.KING: KING_TABLE_MIDDLEGAME,
    }

    table = piece_tables.get(piece.piece_type)
    if not table:
        return 0

    # Mirror square for black pieces
    if piece.color == chess.BLACK:
        square = chess.square_mirror(square)

    return table[square]


def evaluate_board(board: chess.Board) -> int:
    """Evaluate board position in centipawns from white's perspective."""
    if board.is_checkmate():
        return -30000 if board.turn == chess.WHITE else 30000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0

    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            # Material value
            value = PIECE_VALUES.get(piece.piece_type, 0)
            # Positional value
            value += get_piece_square_value(piece, square)

            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value

    # Mobility bonus (simplified)
    mobility = len(list(board.legal_moves))
    board.push(chess.Move.null())
    opponent_mobility = len(list(board.legal_moves))
    board.pop()
    score += (mobility - opponent_mobility) * 5 if board.turn == chess.WHITE else (opponent_mobility - mobility) * 5

    return score


def minimax(
    board: chess.Board,
    depth: int,
    alpha: int,
    beta: int,
    maximizing: bool
) -> Tuple[int, chess.Move | None]:
    """Minimax algorithm with alpha-beta pruning."""
    if depth == 0 or board.is_game_over():
        return evaluate_board(board), None

    best_move = None

    if maximizing:
        max_eval = float('-inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, False)
            board.pop()

            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move

            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break

        return int(max_eval), best_move
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, True)
            board.pop()

            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move

            beta = min(beta, eval_score)
            if beta <= alpha:
                break

        return int(min_eval), best_move


def get_easy_move(board: chess.Board) -> chess.Move:
    """Easy difficulty: Random legal move."""
    legal_moves = list(board.legal_moves)
    return random.choice(legal_moves)


def get_medium_move(board: chess.Board) -> chess.Move:
    """Medium difficulty: Prioritize captures, checks, and center control."""
    legal_moves = list(board.legal_moves)
    scored_moves: List[Tuple[int, chess.Move]] = []

    for move in legal_moves:
        score = 0

        # Prioritize captures (higher value = better)
        if board.is_capture(move):
            captured_piece = board.piece_at(move.to_square)
            if captured_piece:
                score += PIECE_VALUES.get(captured_piece.piece_type, 0) // 10

        # Prioritize checks
        board.push(move)
        if board.is_check():
            score += 50
        board.pop()

        # Prioritize center control (e4, d4, e5, d5)
        center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
        if move.to_square in center_squares:
            score += 30

        # Avoid moving to attacked squares
        board.push(move)
        if board.is_attacked_by(not board.turn, move.to_square):
            moving_piece = board.piece_at(move.to_square)
            if moving_piece:
                score -= PIECE_VALUES.get(moving_piece.piece_type, 0) // 20
        board.pop()

        # Add small random factor for variety
        score += random.randint(0, 20)

        scored_moves.append((score, move))

    # Sort by score descending and pick from top moves
    scored_moves.sort(key=lambda x: x[0], reverse=True)

    # Pick randomly from top 3 moves for some unpredictability
    top_moves = scored_moves[:min(3, len(scored_moves))]
    return random.choice(top_moves)[1]


def get_hard_move(board: chess.Board) -> chess.Move:
    """Hard difficulty: Minimax with alpha-beta pruning (depth 3)."""
    # Adjust depth based on game phase (fewer pieces = deeper search)
    piece_count = len(board.piece_map())
    depth = 3 if piece_count > 20 else 4

    maximizing = board.turn == chess.WHITE
    _, best_move = minimax(
        board,
        depth,
        float('-inf'),
        float('inf'),
        maximizing
    )

    # Fallback to medium difficulty if minimax fails
    if best_move is None:
        return get_medium_move(board)

    return best_move


async def get_bot_move(board_fen: str, difficulty: BotDifficulty) -> Tuple[str, str, str | None]:
    """
    Get the bot's move based on difficulty level.

    Args:
        board_fen: Current board position in FEN notation
        difficulty: Bot difficulty level (easy, medium, hard)

    Returns:
        Tuple of (from_square, to_square, promotion) where promotion is None or piece letter
    """
    board = chess.Board(board_fen)

    if not list(board.legal_moves):
        raise ValueError("No legal moves available")

    move: chess.Move

    if difficulty == BotDifficulty.EASY:
        move = get_easy_move(board)
    elif difficulty == BotDifficulty.MEDIUM:
        move = get_medium_move(board)
    else:  # HARD
        move = get_hard_move(board)

    # Extract squares and promotion
    from_square = chess.square_name(move.from_square)
    to_square = chess.square_name(move.to_square)
    promotion = None

    if move.promotion:
        promotion = chess.piece_symbol(move.promotion).lower()

    return from_square, to_square, promotion


def get_bot_name(difficulty: BotDifficulty) -> str:
    """Get the display name for the bot based on difficulty."""
    difficulty_names = {
        BotDifficulty.EASY: "Easy",
        BotDifficulty.MEDIUM: "Medium",
        BotDifficulty.HARD: "Hard",
    }
    return f"Chess Bot ({difficulty_names.get(difficulty, 'Unknown')})"
