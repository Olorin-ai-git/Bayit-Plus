"""Chess game models for multiplayer chess functionality."""
from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class PlayerColor(str, Enum):
    """Chess player color enum."""
    WHITE = "white"
    BLACK = "black"


class GameMode(str, Enum):
    """Chess game mode enum."""
    PVP = "pvp"
    BOT = "bot"


class BotDifficulty(str, Enum):
    """Bot difficulty level enum."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class GameStatus(str, Enum):
    """Chess game status enum."""
    WAITING = "waiting"
    ACTIVE = "active"
    CHECKMATE = "checkmate"
    STALEMATE = "stalemate"
    DRAW = "draw"
    RESIGNED = "resigned"
    TIMEOUT = "timeout"


class ChessMove(BaseModel):
    """Individual chess move model."""
    from_square: str  # e.g., "e2"
    to_square: str    # e.g., "e4"
    piece: str        # e.g., "p" (pawn), "N" (knight)
    captured: Optional[str] = None
    promotion: Optional[str] = None
    is_castling: bool = False
    is_en_passant: bool = False
    san: str  # Standard Algebraic Notation (e.g., "e4", "Nf3")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    player: PlayerColor


class ChessPlayer(BaseModel):
    """Chess player information model."""
    user_id: str
    user_name: str
    color: PlayerColor
    is_connected: bool = True
    is_bot: bool = False
    time_remaining_ms: Optional[int] = None  # For timed games
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class ChessGame(Document):
    """Chess game document model."""
    game_code: str = Field(..., unique=True, index=True)  # 6-char join code
    white_player: Optional[ChessPlayer] = None
    black_player: Optional[ChessPlayer] = None
    current_turn: PlayerColor = PlayerColor.WHITE
    status: GameStatus = GameStatus.WAITING
    board_fen: str = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"  # Initial position
    move_history: List[ChessMove] = []
    chat_enabled: bool = True
    voice_enabled: bool = True
    livekit_room_name: Optional[str] = None
    livekit_room_token: Optional[str] = None
    time_control: Optional[int] = None  # Time per player in seconds (null = untimed)
    game_mode: GameMode = GameMode.PVP  # "pvp" or "bot"
    bot_difficulty: Optional[BotDifficulty] = None  # "easy", "medium", "hard"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        """Beanie document settings."""
        name = "chess_games"
        indexes = ["game_code", "status", "created_at"]


class ChessChatMessage(Document):
    """Chess game chat message document model."""
    game_id: str = Field(..., index=True)
    user_id: str
    user_name: str
    message: str
    is_bot_request: bool = False  # True if message tags @bot
    bot_response: Optional[str] = None

    # Translation fields
    source_language: str = "he"
    has_translations: bool = False
    translations: dict = {}  # {"en": "translated text", "es": "texto traducido"}

    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        """Beanie document settings."""
        name = "chess_chat_messages"
        indexes = ["game_id", "timestamp"]
