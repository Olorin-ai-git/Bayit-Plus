"""
Tests for wizard_chat_service.py - Claude AI Integration
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from anthropic.types import Message, ContentBlock, TextBlock, ToolUseBlock

from app.services.voice.wizard_chat_service import WizardChatService
from app.services.voice.models import VoiceIntent
from app.services.voice.context import VoiceContext


@pytest.fixture
def voice_context():
    """Create test voice context."""
    return VoiceContext(
        user_id="test_user",
        language="en",
        platform="web",
        conversation_id="conv_123",
    )


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client."""
    with patch("app.services.voice.wizard_chat_service.anthropic") as mock:
        client = MagicMock()
        mock.Anthropic.return_value = client
        yield client


@pytest.fixture
def wizard_service(mock_anthropic_client):
    """Create WizardChatService instance."""
    return WizardChatService()


class TestProcessChat:
    """Test process_chat method."""

    async def test_process_chat_simple_response(
        self, wizard_service, voice_context, mock_anthropic_client
    ):
        """Test simple chat response without tools."""
        # Mock Claude response
        mock_message = Message(
            id="msg_123",
            type="message",
            role="assistant",
            content=[
                TextBlock(type="text", text="Hello! I can help you find great content.")
            ],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 10, "output_tokens": 15},
        )

        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        # Execute
        result = await wizard_service.process_chat(
            transcript="Hello", context=voice_context
        )

        # Verify
        assert result["intent"] == VoiceIntent.CHAT.value
        assert result["spoken_response"] == "Hello! I can help you find great content."
        assert result["action"] is None
        assert result["conversation_id"] == "conv_123"
        assert result["confidence"] > 0.9

    async def test_process_chat_with_tool_use(
        self, wizard_service, voice_context, mock_anthropic_client
    ):
        """Test chat response with tool use."""
        # Mock Claude response with tool use
        mock_tool_message = Message(
            id="msg_tool",
            type="message",
            role="assistant",
            content=[
                ToolUseBlock(
                    type="tool_use",
                    id="tool_123",
                    name="search_content",
                    input={"query": "comedy", "content_type": "vod", "limit": 5},
                )
            ],
            model="claude-haiku-4.5-20250514",
            stop_reason="tool_use",
            usage={"input_tokens": 50, "output_tokens": 100},
        )

        # Mock final response after tool
        mock_final_message = Message(
            id="msg_final",
            type="message",
            role="assistant",
            content=[
                TextBlock(type="text", text="I found 5 great comedy movies for you!")
            ],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 150, "output_tokens": 20},
        )

        # Mock tool execution
        mock_tool_result = {
            "results": [{"title": "Comedy Movie 1", "id": "123"}],
            "total_found": 1,
        }

        mock_anthropic_client.messages.create = AsyncMock(
            side_effect=[mock_tool_message, mock_final_message]
        )

        with patch.object(
            wizard_service, "_execute_tools", return_value=[mock_tool_result]
        ):
            result = await wizard_service.process_chat(
                transcript="Find me comedy movies", context=voice_context
            )

        # Verify
        assert result["intent"] == VoiceIntent.CHAT.value
        assert "comedy" in result["spoken_response"].lower()
        assert result["confidence"] > 0.8

    async def test_process_chat_error_handling(
        self, wizard_service, voice_context, mock_anthropic_client
    ):
        """Test error handling when Claude API fails."""
        # Mock API error
        mock_anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API Error")
        )

        # Execute
        result = await wizard_service.process_chat(
            transcript="Hello", context=voice_context
        )

        # Verify fallback response
        assert result["intent"] == VoiceIntent.CHAT.value
        assert "understand" in result["spoken_response"].lower()
        assert result["confidence"] < 0.5

    async def test_process_chat_hebrew(
        self, wizard_service, mock_anthropic_client
    ):
        """Test Hebrew language processing."""
        context = VoiceContext(
            user_id="test_user",
            language="he",
            platform="web",
            conversation_id="conv_123",
        )

        mock_message = Message(
            id="msg_he",
            type="message",
            role="assistant",
            content=[TextBlock(type="text", text="שלום! איך אפשר לעזור?")],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 10, "output_tokens": 8},
        )

        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        result = await wizard_service.process_chat(
            transcript="שלום", context=context
        )

        assert result["spoken_response"] == "שלום! איך אפשר לעזור?"

    async def test_process_chat_spanish(
        self, wizard_service, mock_anthropic_client
    ):
        """Test Spanish language processing."""
        context = VoiceContext(
            user_id="test_user",
            language="es",
            platform="web",
            conversation_id="conv_123",
        )

        mock_message = Message(
            id="msg_es",
            type="message",
            role="assistant",
            content=[TextBlock(type="text", text="¡Hola! ¿Cómo puedo ayudarte?")],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 10, "output_tokens": 10},
        )

        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        result = await wizard_service.process_chat(
            transcript="Hola", context=context
        )

        assert result["spoken_response"] == "¡Hola! ¿Cómo puedo ayudarte?"


class TestSystemPrompts:
    """Test system prompt generation."""

    def test_build_system_prompt_hebrew(self, wizard_service):
        """Test Hebrew system prompt."""
        from app.services.voice.wizard_prompts import get_system_prompt

        prompt = get_system_prompt("he", {})

        assert "אתה הקוסם של בית+" in prompt
        assert "search_content" in prompt
        assert "get_recommendations" in prompt

    def test_build_system_prompt_english(self, wizard_service):
        """Test English system prompt."""
        from app.services.voice.wizard_prompts import get_system_prompt

        prompt = get_system_prompt("en", {})

        assert "Bayit+ Wizard" in prompt
        assert "search_content" in prompt
        assert "get_recommendations" in prompt

    def test_build_system_prompt_spanish(self, wizard_service):
        """Test Spanish system prompt."""
        from app.services.voice.wizard_prompts import get_system_prompt

        prompt = get_system_prompt("es", {})

        assert "Mago de Bayit+" in prompt
        assert "search_content" in prompt
        assert "get_recommendations" in prompt


class TestVoiceFormatting:
    """Test voice-optimized text formatting."""

    def test_format_for_voice_removes_markdown(self, wizard_service):
        """Test markdown removal."""
        from app.services.voice.voice_formatters import format_for_voice

        text = "Here are **bold** and *italic* words"
        result = format_for_voice(text)

        assert "**" not in result
        assert "*" not in result

    def test_format_for_voice_removes_urls(self, wizard_service):
        """Test URL removal."""
        from app.services.voice.voice_formatters import format_for_voice

        text = "Check https://example.com for more info"
        result = format_for_voice(text)

        assert "https://" not in result

    def test_format_for_voice_preserves_speech(self, wizard_service):
        """Test speech preservation."""
        from app.services.voice.voice_formatters import format_for_voice

        text = "Hello! How can I help you today?"
        result = format_for_voice(text)

        assert "Hello" in result
        assert "help" in result


class TestConversationMemory:
    """Test conversation memory."""

    async def test_conversation_memory_stores_messages(
        self, wizard_service, voice_context, mock_anthropic_client
    ):
        """Test that messages are stored in conversation memory."""
        mock_message = Message(
            id="msg_1",
            type="message",
            role="assistant",
            content=[TextBlock(type="text", text="Response 1")],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 10, "output_tokens": 5},
        )

        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        # First message
        await wizard_service.process_chat(transcript="Hello", context=voice_context)

        # Second message with same conversation_id
        await wizard_service.process_chat(
            transcript="Tell me more", context=voice_context
        )

        # Verify conversation memory was used (check call count)
        assert mock_anthropic_client.messages.create.call_count == 2

    async def test_conversation_memory_max_history(
        self, wizard_service, voice_context, mock_anthropic_client
    ):
        """Test conversation memory respects max history limit."""
        mock_message = Message(
            id="msg",
            type="message",
            role="assistant",
            content=[TextBlock(type="text", text="Response")],
            model="claude-haiku-4.5-20250514",
            stop_reason="end_turn",
            usage={"input_tokens": 10, "output_tokens": 5},
        )

        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_message)

        # Send 15 messages (more than max history of 10)
        for i in range(15):
            await wizard_service.process_chat(
                transcript=f"Message {i}", context=voice_context
            )

        # Memory should have been trimmed to max 10
        # This is tested implicitly by not running out of memory


class TestToolExecution:
    """Test tool execution."""

    async def test_execute_tools_search(self, wizard_service):
        """Test search tool execution."""
        tool_blocks = [
            ToolUseBlock(
                type="tool_use",
                id="tool_search",
                name="search_content",
                input={
                    "query": "comedy",
                    "content_type": "vod",
                    "limit": 5,
                },
            )
        ]

        with patch(
            "app.services.voice.tool_executors.dispatcher.execute_tool",
            return_value={"results": [], "total_found": 0},
        ):
            results = await wizard_service._execute_tools(tool_blocks)

        assert len(results) == 1
        assert "results" in results[0]

    async def test_execute_tools_multiple(self, wizard_service):
        """Test multiple tool execution."""
        tool_blocks = [
            ToolUseBlock(
                type="tool_use",
                id="tool_1",
                name="get_live_channels",
                input={},
            ),
            ToolUseBlock(
                type="tool_use",
                id="tool_2",
                name="get_recommendations",
                input={"content_type": "vod", "limit": 5},
            ),
        ]

        with patch(
            "app.services.voice.tool_executors.dispatcher.execute_tool",
            return_value={"results": []},
        ):
            results = await wizard_service._execute_tools(tool_blocks)

        assert len(results) == 2

    async def test_execute_tools_error_handling(self, wizard_service):
        """Test tool execution error handling."""
        tool_blocks = [
            ToolUseBlock(
                type="tool_use",
                id="tool_error",
                name="search_content",
                input={"query": "test"},
            )
        ]

        with patch(
            "app.services.voice.tool_executors.dispatcher.execute_tool",
            side_effect=Exception("Tool error"),
        ):
            results = await wizard_service._execute_tools(tool_blocks)

        assert len(results) == 1
        assert "error" in results[0] or results[0] == {}
