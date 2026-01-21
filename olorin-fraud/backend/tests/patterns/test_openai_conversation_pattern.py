"""
Test OpenAI Conversation Pattern

Comprehensive tests for the OpenAI Conversation Pattern including conversation history
management, context preservation, and memory optimization features.
"""

import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from app.service.agent.patterns.base import (
    OpenAIPatternConfig,
    PatternConfig,
    PatternType,
)
from app.service.agent.patterns.openai.conversation_pattern import (
    OpenAIConversationPattern,
)


class TestOpenAIConversationPattern:
    """Test suite for OpenAI Conversation Pattern"""

    @pytest.fixture
    def pattern_config(self):
        """Pattern configuration fixture"""
        return PatternConfig(
            pattern_type=PatternType.OPENAI_CONVERSATION,
            max_iterations=3,
            confidence_threshold=0.8,
            timeout_seconds=60,
        )

    @pytest.fixture
    def openai_config(self):
        """OpenAI configuration fixture"""
        return OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            conversation_memory_limit=50,
            enable_memory=True,
        )

    @pytest.fixture
    def mock_tools(self):
        """Mock tools fixture"""
        mock_tool = MagicMock()
        mock_tool.name = "fraud_analysis_tool"
        return [mock_tool]

    @pytest.fixture
    def mock_ws_streaming(self):
        """Mock WebSocket streaming fixture"""
        return AsyncMock()

    @pytest.fixture
    async def conversation_pattern(
        self, pattern_config, openai_config, mock_tools, mock_ws_streaming
    ):
        """Conversation pattern instance fixture"""
        with patch(
            "app.service.agent.patterns.openai.conversation_pattern.get_settings_for_env"
        ) as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")
            pattern = OpenAIConversationPattern(
                config=pattern_config,
                openai_config=openai_config,
                tools=mock_tools,
                ws_streaming=mock_ws_streaming,
            )
            return pattern

    @pytest.mark.asyncio
    async def test_conversation_history_initialization(self, conversation_pattern):
        """Test conversation history is properly initialized"""
        assert conversation_pattern._conversation_history == {}
        assert conversation_pattern._context_cache == {}
        assert conversation_pattern._max_history_size == 50
        assert conversation_pattern._max_context_age_hours == 24

    @pytest.mark.asyncio
    async def test_conversation_history_management(self, conversation_pattern):
        """Test conversation history management with sliding window"""
        investigation_id = "test_investigation_001"
        messages = [
            HumanMessage(content="What is the risk level for user ID 12345?"),
            HumanMessage(content="Can you analyze the transaction patterns?"),
        ]

        # Manage conversation history
        await conversation_pattern._manage_conversation_history(
            investigation_id, messages
        )

        # Verify history is stored
        assert investigation_id in conversation_pattern._conversation_history
        history = conversation_pattern._conversation_history[investigation_id]
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[0]["content"] == "What is the risk level for user ID 12345?"
        assert history[1]["role"] == "user"
        assert history[1]["content"] == "Can you analyze the transaction patterns?"

    @pytest.mark.asyncio
    async def test_sliding_window_optimization(self, conversation_pattern):
        """Test sliding window applies when history exceeds max size"""
        investigation_id = "test_investigation_large"

        # Create history larger than max size
        large_history = []
        for i in range(55):  # Exceeds max_history_size of 50
            large_history.append(
                {
                    "role": "user",
                    "content": f"Message {i}",
                    "timestamp": datetime.now().isoformat(),
                }
            )

        conversation_pattern._conversation_history[investigation_id] = large_history

        # Add new messages to trigger sliding window
        new_messages = [HumanMessage(content="Latest message")]

        with patch.object(
            conversation_pattern,
            "_summarize_conversation_history",
            return_value="Summary of older messages",
        ):
            await conversation_pattern._manage_conversation_history(
                investigation_id, new_messages
            )

        # Verify sliding window was applied
        history = conversation_pattern._conversation_history[investigation_id]
        assert (
            len(history) <= conversation_pattern._max_history_size + 1
        )  # +1 for summary
        assert history[0]["role"] == "system"  # Summary should be first
        assert "Previous conversation summary" in history[0]["content"]

    @pytest.mark.asyncio
    async def test_context_preservation(self, conversation_pattern):
        """Test context preservation across conversation turns"""
        investigation_id = "test_investigation_context"
        base_context = {
            "investigation_id": investigation_id,
            "user_id": "test_user",
            "risk_factors": ["suspicious_login", "unusual_transaction"],
        }

        # Cache some context
        conversation_pattern._context_cache[investigation_id] = {
            "cached_at": datetime.now().isoformat(),
            "investigation_id": investigation_id,
            "evidence_points": ["IP mismatch", "Velocity check failed"],
            "investigation_notes": "High-risk user profile",
        }

        # Enrich context with history
        enriched_context = await conversation_pattern._enrich_context_with_history(
            investigation_id, base_context
        )

        # Verify context enrichment
        assert enriched_context["conversation_id"] == investigation_id
        assert enriched_context["conversation_turn_count"] == 0
        assert enriched_context["evidence_points"] == [
            "IP mismatch",
            "Velocity check failed",
        ]
        assert enriched_context["investigation_notes"] == "High-risk user profile"
        assert enriched_context["risk_factors"] == [
            "suspicious_login",
            "unusual_transaction",
        ]

    @pytest.mark.asyncio
    async def test_context_cache_expiration(self, conversation_pattern):
        """Test context cache expiration handling"""
        investigation_id = "test_investigation_expired"
        base_context = {"investigation_id": investigation_id}

        # Cache context with old timestamp (older than max_context_age_hours)
        old_timestamp = (datetime.now() - timedelta(hours=25)).isoformat()
        conversation_pattern._context_cache[investigation_id] = {
            "cached_at": old_timestamp,
            "investigation_id": investigation_id,
            "expired_data": "should_not_be_included",
        }

        # Enrich context
        enriched_context = await conversation_pattern._enrich_context_with_history(
            investigation_id, base_context
        )

        # Verify expired context is not included
        assert "expired_data" not in enriched_context
        assert enriched_context["conversation_id"] == investigation_id

    @pytest.mark.asyncio
    async def test_conversation_history_injection(self, conversation_pattern):
        """Test conversation history injection into OpenAI messages"""
        investigation_id = "test_investigation_inject"

        # Setup conversation history
        conversation_pattern._conversation_history[investigation_id] = [
            {
                "role": "user",
                "content": "Previous question 1",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "assistant",
                "content": "Previous response 1",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "user",
                "content": "Previous question 2",
                "timestamp": datetime.now().isoformat(),
            },
        ]

        openai_messages = [
            {"role": "system", "content": "You are a fraud detection specialist"},
            {"role": "user", "content": "Current user question"},
        ]

        # Inject conversation history
        result_messages = await conversation_pattern._inject_conversation_history(
            investigation_id, openai_messages
        )

        # Verify history injection
        assert len(result_messages) > len(openai_messages)

        # Check that system message is first
        assert result_messages[0]["role"] == "system"

        # Check that history is included before current user message
        user_messages = [msg for msg in result_messages if msg["role"] == "user"]
        assert len(user_messages) >= 2  # Previous + current

        # Last message should be current user question
        assert result_messages[-1]["content"] == "Current user question"

    @pytest.mark.asyncio
    async def test_assistant_response_storage(self, conversation_pattern):
        """Test assistant response storage in conversation history"""
        investigation_id = "test_investigation_response"
        response = (
            "Risk analysis complete: HIGH RISK detected based on transaction velocity"
        )

        # Store assistant response
        await conversation_pattern._store_assistant_response(investigation_id, response)

        # Verify response is stored
        assert investigation_id in conversation_pattern._conversation_history
        history = conversation_pattern._conversation_history[investigation_id]
        assert len(history) == 1
        assert history[0]["role"] == "assistant"
        assert history[0]["content"] == response
        assert "timestamp" in history[0]

    @pytest.mark.asyncio
    async def test_conversation_history_retrieval(self, conversation_pattern):
        """Test conversation history retrieval"""
        investigation_id = "test_investigation_retrieval"

        # Setup history
        test_history = [
            {
                "role": "user",
                "content": "Test message 1",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "assistant",
                "content": "Test response 1",
                "timestamp": datetime.now().isoformat(),
            },
        ]
        conversation_pattern._conversation_history[investigation_id] = test_history

        # Retrieve history
        retrieved_history = await conversation_pattern.get_conversation_history(
            investigation_id
        )

        # Verify retrieval
        assert retrieved_history == test_history
        assert len(retrieved_history) == 2

    @pytest.mark.asyncio
    async def test_conversation_history_clearing(self, conversation_pattern):
        """Test conversation history clearing"""
        investigation_id = "test_investigation_clear"

        # Setup history and context cache
        conversation_pattern._conversation_history[investigation_id] = [
            {
                "role": "user",
                "content": "Test message",
                "timestamp": datetime.now().isoformat(),
            }
        ]
        conversation_pattern._context_cache[investigation_id] = {
            "cached_at": datetime.now().isoformat(),
            "investigation_id": investigation_id,
        }

        # Clear conversation history
        await conversation_pattern.clear_conversation_history(investigation_id)

        # Verify clearing
        assert investigation_id not in conversation_pattern._conversation_history
        assert investigation_id not in conversation_pattern._context_cache

    @pytest.mark.asyncio
    async def test_conversation_summarization(self, conversation_pattern):
        """Test conversation summarization functionality"""
        messages = [
            {
                "role": "user",
                "content": "Question 1",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "assistant",
                "content": "Response 1",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "user",
                "content": "Question 2",
                "timestamp": datetime.now().isoformat(),
            },
            {
                "role": "assistant",
                "content": "Response 2",
                "timestamp": datetime.now().isoformat(),
            },
        ]

        # Test summarization
        summary = await conversation_pattern._summarize_conversation_history(messages)

        # Verify summary content
        assert isinstance(summary, str)
        assert "2 queries" in summary or "User made 2" in summary
        assert "2 responses" in summary or "Assistant provided 2" in summary

    @pytest.mark.asyncio
    async def test_full_pattern_execution_mock(self, conversation_pattern):
        """Test full pattern execution with mocked dependencies"""
        investigation_id = "test_investigation_full"
        context = {"investigation_id": investigation_id, "user_id": "test_user_123"}
        messages = [HumanMessage(content="Analyze fraud risk for recent transactions")]

        # Mock all dependencies
        with (
            patch.object(conversation_pattern, "_ensure_openai_client"),
            patch.object(conversation_pattern, "_initialize_handlers"),
            patch.object(
                conversation_pattern._completion_handler,
                "execute_completion",
                return_value={
                    "success": True,
                    "result": "Fraud analysis complete: LOW RISK",
                    "function_calls": 2,
                    "streaming_chunks": 15,
                    "cost_cents": 0.05,
                },
            ) as mock_completion,
        ):

            # Execute pattern
            result = await conversation_pattern.execute_openai_pattern(
                messages, context
            )

            # Verify execution success
            assert result.success is True
            assert "Fraud analysis complete: LOW RISK" in result.result
            assert result.confidence_score == 0.95
            assert f"investigation {investigation_id}" in result.reasoning

            # Verify conversation history was updated
            assert investigation_id in conversation_pattern._conversation_history
            history = conversation_pattern._conversation_history[investigation_id]
            assert len(history) >= 2  # User message + assistant response

    @pytest.mark.asyncio
    async def test_memory_limits_enforcement(self, conversation_pattern):
        """Test that memory limits are properly enforced"""
        investigation_id = "test_investigation_memory"

        # Test max history size enforcement
        assert conversation_pattern._max_history_size == 50
        assert conversation_pattern._max_context_age_hours == 24

        # Verify these limits are used in conversation management
        large_messages = [HumanMessage(content=f"Message {i}") for i in range(60)]

        with patch.object(
            conversation_pattern,
            "_summarize_conversation_history",
            return_value="Test summary",
        ):
            await conversation_pattern._manage_conversation_history(
                investigation_id, large_messages
            )

        # History should not exceed max size (accounting for summary message)
        history = conversation_pattern._conversation_history[investigation_id]
        assert len(history) <= conversation_pattern._max_history_size + 1
