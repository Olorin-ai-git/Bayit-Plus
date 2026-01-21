"""
OpenAI Agent Patterns

This module contains OpenAI Agent-based pattern implementations that extend
the base pattern framework with OpenAI Assistant API functionality.
"""

from .assistant_pattern import OpenAIAssistantPattern
from .chat_completion_handler import ChatCompletionHandler
from .conversation_manager import ConversationManager
from .conversation_pattern import OpenAIConversationPattern
from .function_calling_pattern import OpenAIFunctionCallingPattern
from .message_formatter import MessageFormatter
from .multi_agent_pattern import OpenAIMultiAgentPattern
from .rag_pattern import OpenAIRAGPattern
from .tool_adapter import (
    convert_langgraph_tools_to_openai_functions,
    execute_openai_function_call,
    get_function_calling_stats,
)

__all__ = [
    "OpenAIAssistantPattern",
    "OpenAIFunctionCallingPattern",
    "OpenAIConversationPattern",
    "OpenAIMultiAgentPattern",
    "OpenAIRAGPattern",
    "ConversationManager",
    "ChatCompletionHandler",
    "MessageFormatter",
    "convert_langgraph_tools_to_openai_functions",
    "execute_openai_function_call",
    "get_function_calling_stats",
]
