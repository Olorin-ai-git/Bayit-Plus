"""
Router registry for Bayit+ Social Service.

Registers friends, direct messages, watch party, chess, and stats routes.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.user import User
from app.models.profile import Profile
from app.models.friendship import FriendRequest, UserFriendship, GameResult, PlayerStats
from app.models.direct_message import DirectMessage
from app.models.realtime import WatchParty, ChatMessage
from app.models.chess import ChessGame, ChessChatMessage
from app.models.content import Content
from app.models.beta_credit import BetaCredit

SERVICE_MODELS: List[Type[Document]] = [
    User,
    Profile,
    FriendRequest,
    UserFriendship,
    GameResult,
    PlayerStats,
    DirectMessage,
    WatchParty,
    ChatMessage,
    ChessGame,
    ChessChatMessage,
    Content,
    BetaCredit,
]


def register_routes(app: FastAPI) -> None:
    """Register social API routers."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        friends,
        direct_messages,
        stats,
        party,
        chess,
        chess_invite,
        chess_chat,
    )

    app.include_router(friends.router, prefix=prefix, tags=["friends"])
    app.include_router(
        direct_messages.router, prefix=prefix, tags=["direct-messages"]
    )
    app.include_router(stats.router, prefix=prefix, tags=["stats"])
    app.include_router(party.router, prefix=f"{prefix}/party", tags=["party"])
    app.include_router(chess.router, prefix=prefix, tags=["chess"])
    app.include_router(chess_invite.router, prefix=prefix, tags=["chess"])
    app.include_router(chess_chat.router, prefix=prefix, tags=["chess"])

    logger.info(
        "Social routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
