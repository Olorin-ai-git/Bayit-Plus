"""Unit tests for ChannelChatService - connection management and rate limiting."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import WebSocket
from app.services.channel_chat_service import ChannelChatService


@pytest.fixture
def mock_rate_limiter():
    limiter = MagicMock()
    limiter._api_requests = {}
    limiter._check_limit = MagicMock(return_value=(True, 0))
    return limiter


@pytest.fixture
def chat_service(mock_rate_limiter):
    return ChannelChatService(rate_limiter=mock_rate_limiter)


@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.send_text = AsyncMock()
    ws.send_json = AsyncMock()
    return ws


class TestJoinLeaveChannel:
    @pytest.mark.asyncio
    async def test_join_success(self, chat_service, mock_websocket):
        success, token, error = await chat_service.join_channel_chat(
            "ch-1", mock_websocket, "u-1", "Alice", "127.0.0.1"
        )
        assert success and token and not error
        assert await chat_service.get_channel_user_count("ch-1") == 1

    @pytest.mark.asyncio
    async def test_leave_success(self, chat_service, mock_websocket):
        await chat_service.join_channel_chat("ch-1", mock_websocket, "u-1", "Alice", "127.0.0.1")
        remaining = await chat_service.leave_channel_chat("ch-1", "u-1", "127.0.0.1")
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_global_limit_enforcement(self, chat_service, mock_websocket):
        from app.core.config import settings
        original = settings.olorin.channel_chat.max_global_connections
        settings.olorin.channel_chat.max_global_connections = 1
        chat_service._connection_count = 1
        try:
            success, _, error = await chat_service.join_channel_chat(
                "ch-1", mock_websocket, "u-2", "Bob", "127.0.0.1"
            )
            assert not success and "maximum capacity" in error.lower()
        finally:
            settings.olorin.channel_chat.max_global_connections = original

    @pytest.mark.asyncio
    async def test_per_ip_limit_enforcement(self, chat_service, mock_websocket):
        from app.core.config import settings
        original = settings.olorin.channel_chat.max_connections_per_ip
        settings.olorin.channel_chat.max_connections_per_ip = 1
        chat_service._ip_connections["10.0.0.1"] = 1
        try:
            success, _, error = await chat_service.join_channel_chat(
                "ch-1", mock_websocket, "u-1", "Alice", "10.0.0.1"
            )
            assert not success and "per IP" in error
        finally:
            settings.olorin.channel_chat.max_connections_per_ip = original
            chat_service._ip_connections.clear()


class TestBroadcast:
    @pytest.mark.asyncio
    async def test_broadcast_multiple_users(self, chat_service):
        ws1, ws2 = MagicMock(spec=WebSocket), MagicMock(spec=WebSocket)
        ws1.send_text, ws2.send_text = AsyncMock(), AsyncMock()
        await chat_service.join_channel_chat("ch-1", ws1, "u-1", "A", "127.0.0.1")
        await chat_service.join_channel_chat("ch-1", ws2, "u-2", "B", "127.0.0.2")
        count = await chat_service.broadcast_message("ch-1", {"type": "test"})
        assert count == 2
        ws1.send_text.assert_called_once()
        ws2.send_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_handles_failures(self, chat_service):
        ws1, ws2 = MagicMock(spec=WebSocket), MagicMock(spec=WebSocket)
        ws1.send_text = AsyncMock(side_effect=Exception("Lost"))
        ws2.send_text = AsyncMock()
        await chat_service.join_channel_chat("ch-1", ws1, "u-1", "A", "127.0.0.1")
        await chat_service.join_channel_chat("ch-1", ws2, "u-2", "B", "127.0.0.2")
        count = await chat_service.broadcast_message("ch-1", {"type": "test"})
        assert count == 1


class TestRateLimiting:
    @pytest.mark.asyncio
    async def test_rate_limit_allowed(self, chat_service, mock_rate_limiter):
        mock_rate_limiter._check_limit.return_value = (True, 0)
        allowed, wait = await chat_service.check_message_rate("u-1", "ch-1")
        assert allowed and wait == 0

    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self, chat_service, mock_rate_limiter):
        mock_rate_limiter._check_limit.return_value = (False, 30)
        allowed, wait = await chat_service.check_message_rate("u-1", "ch-1")
        assert not allowed and wait == 30

    @pytest.mark.asyncio
    async def test_graceful_degradation_no_limiter(self):
        service = ChannelChatService(rate_limiter=None)
        allowed, wait = await service.check_message_rate("u-1", "ch-1")
        assert allowed and wait == 0

    @pytest.mark.asyncio
    async def test_graceful_degradation_on_error(self, chat_service, mock_rate_limiter):
        mock_rate_limiter._check_limit.side_effect = Exception("Redis down")
        allowed, wait = await chat_service.check_message_rate("u-1", "ch-1")
        assert allowed and wait == 0


class TestSessionValidation:
    @pytest.mark.asyncio
    async def test_validate_valid_token(self, chat_service, mock_websocket):
        _, token, _ = await chat_service.join_channel_chat(
            "ch-1", mock_websocket, "u-1", "Alice", "127.0.0.1"
        )
        assert await chat_service.validate_session_token("u-1", token)

    @pytest.mark.asyncio
    async def test_validate_invalid_token(self, chat_service, mock_websocket):
        await chat_service.join_channel_chat("ch-1", mock_websocket, "u-1", "Alice", "127.0.0.1")
        assert not await chat_service.validate_session_token("u-1", "wrong")

    @pytest.mark.asyncio
    async def test_validate_nonexistent_user(self, chat_service):
        assert not await chat_service.validate_session_token("u-999", "any")


class TestModeration:
    @pytest.mark.asyncio
    @patch("app.services.channel_chat_service.ModerationAuditLog")
    async def test_mute_unmute_user(self, mock_audit, chat_service):
        mock_audit_instance = MagicMock()
        mock_audit_instance.insert = AsyncMock()
        mock_audit.return_value = mock_audit_instance

        success = await chat_service.mute_user("ch-1", "u-1", "admin", "admin", "10.0.0.1")
        assert success and await chat_service.is_user_muted("ch-1", "u-1")

        success = await chat_service.unmute_user("ch-1", "u-1", "admin", "admin", "10.0.0.1")
        assert success and not await chat_service.is_user_muted("ch-1", "u-1")
        assert mock_audit_instance.insert.call_count == 2
