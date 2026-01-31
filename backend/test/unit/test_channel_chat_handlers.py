"""Unit tests for channel chat WebSocket message handlers."""

import asyncio
import unittest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.routes.websocket_chat_handlers import handle_chat_message, handle_reaction


class TestHandleChatMessage(unittest.IsolatedAsyncioTestCase):
    """Tests for handle_chat_message handler."""

    def _make_ws(self):
        ws = AsyncMock()
        ws.send_json = AsyncMock()
        return ws

    def _make_service(self):
        svc = AsyncMock()
        svc.validate_session_token = AsyncMock(return_value=True)
        svc.is_user_muted = AsyncMock(return_value=False)
        svc.check_message_rate = AsyncMock(return_value=(True, 0))
        svc.broadcast_message = AsyncMock(return_value=5)

        saved_msg = MagicMock()
        saved_msg.id = "msg_123"
        saved_msg.message = "hello"
        saved_msg.original_language = "en"
        saved_msg.timestamp = datetime(2026, 1, 30, 12, 0, 0)
        svc.save_message = AsyncMock(return_value=saved_msg)
        return svc

    async def test_invalid_session_token_rejects(self):
        """Invalid session token sends error and returns."""
        ws = self._make_ws()
        svc = AsyncMock()
        svc.validate_session_token = AsyncMock(return_value=False)

        await handle_chat_message(ws, svc, "user1", "User1", "ch1", {"session_token": "bad"})

        ws.send_json.assert_called_once()
        call_data = ws.send_json.call_args[0][0]
        assert call_data["code"] == "session_invalid"
        assert call_data["recoverable"] is False

    async def test_muted_user_rejected(self):
        """Muted user receives error."""
        ws = self._make_ws()
        svc = self._make_service()
        svc.is_user_muted = AsyncMock(return_value=True)

        await handle_chat_message(ws, svc, "user1", "User1", "ch1", {"session_token": "tok", "message": "hi"})

        ws.send_json.assert_called_once()
        call_data = ws.send_json.call_args[0][0]
        assert call_data["code"] == "user_muted"

    async def test_rate_limited_user_rejected(self):
        """Rate limited user receives error with wait time."""
        ws = self._make_ws()
        svc = self._make_service()
        svc.check_message_rate = AsyncMock(return_value=(False, 5))

        await handle_chat_message(ws, svc, "user1", "User1", "ch1", {"session_token": "tok", "message": "hi"})

        ws.send_json.assert_called_once()
        call_data = ws.send_json.call_args[0][0]
        assert call_data["code"] == "rate_limit"
        assert call_data["wait_seconds"] == 5

    async def test_empty_message_rejected(self):
        """Empty message after strip is rejected."""
        ws = self._make_ws()
        svc = self._make_service()

        await handle_chat_message(ws, svc, "user1", "User1", "ch1", {"session_token": "tok", "message": "   "})

        ws.send_json.assert_called_once()
        call_data = ws.send_json.call_args[0][0]
        assert call_data["code"] == "invalid_message"

    @patch("app.api.routes.websocket_chat_handlers.ChatTranslationService")
    async def test_successful_message_broadcasts(self, mock_translation_cls):
        """Valid message is saved and broadcast to channel."""
        detection_result = MagicMock()
        detection_result.detected_language = "en"
        mock_translation_cls.detect_language = AsyncMock(return_value=detection_result)

        ws = self._make_ws()
        svc = self._make_service()

        await handle_chat_message(ws, svc, "user1", "User1", "ch1", {"session_token": "tok", "message": "hello world"})

        svc.save_message.assert_called_once()
        svc.broadcast_message.assert_called_once()
        broadcast_data = svc.broadcast_message.call_args[0][1]
        assert broadcast_data["type"] == "channel_chat_message"
        assert broadcast_data["user_id"] == "user1"
        assert broadcast_data["message"] == "hello"


class TestHandleReaction(unittest.IsolatedAsyncioTestCase):
    """Tests for handle_reaction handler."""

    def _make_ws(self):
        ws = AsyncMock()
        ws.send_json = AsyncMock()
        return ws

    def _make_service(self):
        svc = AsyncMock()
        svc.validate_session_token = AsyncMock(return_value=True)
        svc.broadcast_message = AsyncMock(return_value=5)
        return svc

    async def test_invalid_session_rejects(self):
        """Invalid session token rejects reaction."""
        ws = self._make_ws()
        svc = AsyncMock()
        svc.validate_session_token = AsyncMock(return_value=False)

        await handle_reaction(ws, svc, "user1", "ch1", {"session_token": "bad"})

        ws.send_json.assert_called_once()
        assert ws.send_json.call_args[0][0]["code"] == "session_invalid"

    async def test_missing_data_rejects(self):
        """Missing message_id or reaction sends error."""
        ws = self._make_ws()
        svc = self._make_service()

        await handle_reaction(ws, svc, "user1", "ch1", {"session_token": "tok", "message_id": "", "reaction": ""})

        ws.send_json.assert_called_once()
        assert ws.send_json.call_args[0][0]["code"] == "invalid_reaction"

    @patch("app.api.routes.websocket_chat_handlers.ChatReaction")
    async def test_new_reaction_inserts(self, mock_reaction_cls):
        """New reaction (no existing) creates and inserts."""
        mock_reaction_cls.find_one = AsyncMock(return_value=None)
        mock_instance = MagicMock()
        mock_instance.insert = AsyncMock()
        mock_reaction_cls.return_value = mock_instance

        ws = self._make_ws()
        svc = self._make_service()

        await handle_reaction(ws, svc, "user1", "ch1", {
            "session_token": "tok", "message_id": "msg1", "reaction": "heart",
        })

        mock_reaction_cls.assert_called_once()
        mock_instance.insert.assert_called_once()
        svc.broadcast_message.assert_called_once()

    @patch("app.api.routes.websocket_chat_handlers.ChatReaction")
    async def test_existing_reaction_upserts(self, mock_reaction_cls):
        """Existing reaction is updated instead of inserted."""
        existing = MagicMock()
        existing.reaction_type = "thumbsup"
        existing.save = AsyncMock()
        mock_reaction_cls.find_one = AsyncMock(return_value=existing)

        ws = self._make_ws()
        svc = self._make_service()

        await handle_reaction(ws, svc, "user1", "ch1", {
            "session_token": "tok", "message_id": "msg1", "reaction": "heart",
        })

        assert existing.reaction_type == "heart"
        existing.save.assert_called_once()
        svc.broadcast_message.assert_called_once()
        # Should NOT create a new ChatReaction
        mock_reaction_cls.assert_not_called()


if __name__ == "__main__":
    unittest.main()
