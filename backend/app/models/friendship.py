from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class FriendRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class FriendRequest(Document):
    """Friend request model - tracks pending and historical friend requests"""
    sender_id: str = Field(..., index=True)
    sender_name: str
    sender_avatar: Optional[str] = None

    receiver_id: str = Field(..., index=True)
    receiver_name: str
    receiver_avatar: Optional[str] = None

    status: FriendRequestStatus = FriendRequestStatus.PENDING
    message: Optional[str] = None  # Optional message with request

    sent_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

    class Settings:
        name = "friend_requests"
        indexes = [
            "sender_id",
            "receiver_id",
            "status",
            "sent_at",
        ]


class UserFriendship(Document):
    """Bidirectional friendship model - created when request is accepted"""
    user1_id: str = Field(..., index=True)
    user1_name: str
    user1_avatar: Optional[str] = None

    user2_id: str = Field(..., index=True)
    user2_name: str
    user2_avatar: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Quick access to last game played together
    last_game_id: Optional[str] = None
    last_game_at: Optional[datetime] = None

    class Settings:
        name = "user_friendships"
        indexes = [
            "user1_id",
            "user2_id",
            "created_at",
        ]


class GameResult(Document):
    """Individual game result for statistics tracking"""
    game_id: str = Field(..., unique=True, index=True)
    game_type: str = "chess"  # Future: other game types

    white_player_id: str = Field(..., index=True)
    white_player_name: str

    black_player_id: str = Field(..., index=True)
    black_player_name: str

    winner_id: Optional[str] = None  # None for draws
    result: str  # "white_wins", "black_wins", "draw", "timeout", "resigned"

    move_count: int
    duration_seconds: Optional[int] = None

    played_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "game_results"
        indexes = [
            "game_id",
            "white_player_id",
            "black_player_id",
            "winner_id",
            "played_at",
        ]


class PlayerStats(Document):
    """Aggregated player statistics for quick access"""
    user_id: str = Field(..., unique=True, index=True)

    # Chess statistics
    chess_games_played: int = 0
    chess_wins: int = 0
    chess_losses: int = 0
    chess_draws: int = 0
    chess_win_rate: float = 0.0  # Calculated field

    # ELO rating (simplified)
    chess_rating: int = 1200  # Starting rating
    peak_rating: int = 1200

    # Activity
    last_game_at: Optional[datetime] = None
    total_playtime_seconds: int = 0

    # Streaks
    current_win_streak: int = 0
    best_win_streak: int = 0

    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "player_stats"
        indexes = [
            "user_id",
            "chess_rating",  # For leaderboards
            "chess_games_played",
        ]
