"""Unit tests for WebSocket channel chat handlers."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import WebSocket
from app.services.channel_chat_service import ChannelChatService


@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.send_text = ws.send_json = ws.close = AsyncMock()
    ws.receive_json = AsyncMock()
    return ws


@pytest.fixture
def mock_chat_service():
    service = AsyncMock(spec=ChannelChatService)
    service.validate_session_token = AsyncMock(return_value=True)
    service.is_user_muted = AsyncMock(return_value=False)
    service.check_message_rate = AsyncMock(return_value=(True, 0))
    msg = MagicMock(id="msg-123", message="Hello", original_language="he")
    msg.timestamp.isoformat = MagicMock(return_value="2024-01-01T00:00:00")
    service.save_message = AsyncMock(return_value=msg)
    service.broadcast_message = AsyncMock(return_value=1)
    return service


class TestMessageHandlers:
    @pytest.mark.asyncio
    async def test_empty_message_rejected(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "   ", "session_token": "tok"}
        )
        call = mock_websocket.send_json.call_args[0][0]
        assert call["type"] == "error" and call["code"] == "invalid_message"

    @pytest.mark.asyncio
    async def test_invalid_session_rejected(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        mock_chat_service.validate_session_token = AsyncMock(return_value=False)
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "Hi", "session_token": "bad"}
        )
        call = mock_websocket.send_json.call_args[0][0]
        assert call["code"] == "session_invalid"

    @pytest.mark.asyncio
    async def test_muted_user_rejected(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        mock_chat_service.is_user_muted = AsyncMock(return_value=True)
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "Hi", "session_token": "tok"}
        )
        call = mock_websocket.send_json.call_args[0][0]
        assert call["code"] == "user_muted"

    @pytest.mark.asyncio
    async def test_rate_limit_enforced(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        mock_chat_service.check_message_rate = AsyncMock(return_value=(False, 45))
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "Hi", "session_token": "tok"}
        )
        call = mock_websocket.send_json.call_args[0][0]
        assert call["code"] == "rate_limit" and "45" in call["message"]

    @pytest.mark.asyncio
    @patch("app.api.routes.websocket_chat_handlers.ChatTranslationService")
    async def test_valid_message_success(self, mock_trans, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        mock_trans.detect_language = AsyncMock(return_value=MagicMock(detected_language="he"))
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "Hello", "session_token": "tok"}
        )
        mock_chat_service.save_message.assert_called_once()
        mock_chat_service.broadcast_message.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.api.routes.websocket_chat_handlers.ChatTranslationService")
    async def test_lang_detect_failure_graceful(self, mock_trans, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_chat_message
        mock_trans.detect_language = AsyncMock(side_effect=Exception("Down"))
        await handle_chat_message(
            mock_websocket, mock_chat_service, "u-1", "A", "ch-1",
            {"type": "chat", "message": "Hi", "session_token": "tok"}
        )
        mock_chat_service.save_message.assert_called_once()
        assert mock_chat_service.save_message.call_args[0][4] == "he"


class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_no_internal_details_leaked(self):
        from app.api.routes.websocket_chat_handlers import send_error
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock()
        await send_error(ws, "err_code", "User message")
        call = ws.send_json.call_args[0][0]
        assert call["type"] == "error" and call["code"] == "err_code"
        assert "stack" not in call and "traceback" not in call

    @pytest.mark.asyncio
    async def test_extra_data_included(self):
        from app.api.routes.websocket_chat_handlers import send_error
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock()
        await send_error(ws, "rate", "Limit", recoverable=True, wait_seconds=60)
        call = ws.send_json.call_args[0][0]
        assert call["wait_seconds"] == 60


class TestXSSSanitization:
    @pytest.mark.asyncio
    async def test_dangerous_patterns_removed(self):
        from app.models.channel_chat import _sanitize_message_text
        for dangerous in ["<script>alert('xss')</script>", "<img onerror=alert(1)>"]:
            sanitized = _sanitize_message_text(dangerous)
            assert "<script" not in sanitized.lower() and "<img" not in sanitized.lower()

    @pytest.mark.asyncio
    async def test_html_tags_stripped(self):
        from app.models.channel_chat import _sanitize_message_text
        result = _sanitize_message_text("Hello <b>world</b>")
        assert result == "Hello world"

    @pytest.mark.asyncio
    async def test_js_escaped(self):
        from app.models.channel_chat import _sanitize_message_text
        result = _sanitize_message_text("eval(bad)")
        assert "eval" in result


class TestHeartbeat:
    @pytest.mark.asyncio
    async def test_ping_sent_periodically(self):
        from app.api.routes.websocket_chat_handlers import heartbeat_loop
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock()
        task = asyncio.create_task(heartbeat_loop(ws, "u-1", 0.1))
        await asyncio.sleep(0.25)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        assert ws.send_json.call_count >= 2
        assert ws.send_json.call_args[0][0]["type"] == "ping"

    @pytest.mark.asyncio
    async def test_disconnect_handled(self):
        from app.api.routes.websocket_chat_handlers import heartbeat_loop
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock(side_effect=Exception("Closed"))
        task = asyncio.create_task(heartbeat_loop(ws, "u-1", 0.1))
        await asyncio.sleep(0.15)
        assert task.done()


class TestReactionHandler:
    @pytest.mark.asyncio
    @patch("app.api.routes.websocket_chat_handlers.ChatReaction")
    async def test_reaction_success(self, mock_reaction, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_reaction
        inst = MagicMock()
        inst.insert = AsyncMock()
        mock_reaction.return_value = inst
        await handle_reaction(
            mock_websocket, mock_chat_service, "u-1", "ch-1",
            {"type": "reaction", "message_id": "m-1", "reaction": "👍", "session_token": "tok"}
        )
        inst.insert.assert_called_once()
        mock_chat_service.broadcast_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_reaction_invalid_session(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_reaction
        mock_chat_service.validate_session_token = AsyncMock(return_value=False)
        await handle_reaction(
            mock_websocket, mock_chat_service, "u-1", "ch-1",
            {"type": "reaction", "message_id": "m-1", "reaction": "👍", "session_token": "bad"}
        )
        assert mock_websocket.send_json.call_args[0][0]["code"] == "session_invalid"

    @pytest.mark.asyncio
    async def test_reaction_missing_data(self, mock_websocket, mock_chat_service):
        from app.api.routes.websocket_chat_handlers import handle_reaction
        await handle_reaction(
            mock_websocket, mock_chat_service, "u-1", "ch-1",
            {"type": "reaction", "session_token": "tok"}
        )
        assert mock_websocket.send_json.call_args[0][0]["code"] == "invalid_reaction"
