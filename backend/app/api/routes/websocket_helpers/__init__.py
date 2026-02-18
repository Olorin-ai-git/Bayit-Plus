"""
WebSocket helpers module - Modular helpers for WebSocket endpoints
"""

from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message, check_subscription_tier, get_user_from_token,
    validate_channel_for_dubbing)
from app.api.routes.websocket_helpers.quota_helpers import (
    check_and_start_quota_session, end_quota_session,
    update_quota_during_session)
from app.api.routes.websocket_helpers.session_manager import (
    cleanup_dubbing_session, get_active_session_count,
    get_user_session_count, initialize_dubbing_session)
from app.api.routes.websocket_helpers.trivia_processor import (
    process_trivia_stream, update_quota_if_needed)
from app.api.routes.websocket_helpers.trivia_session import (
    initialize_trivia_session, validate_channel_and_feature)

__all__ = [
    "get_user_from_token",
    "check_authentication_message",
    "check_subscription_tier",
    "validate_channel_for_dubbing",
    "check_and_start_quota_session",
    "update_quota_during_session",
    "end_quota_session",
    "initialize_dubbing_session",
    "cleanup_dubbing_session",
    "get_active_session_count",
    "get_user_session_count",
    "process_trivia_stream",
    "update_quota_if_needed",
    "validate_channel_and_feature",
    "initialize_trivia_session",
]
