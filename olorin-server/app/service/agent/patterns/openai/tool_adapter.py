"""
Tool Adapter for OpenAI Function Calling

This module provides a unified interface for converting LangGraph tools
to OpenAI function calling format and executing function calls.
"""

from typing import Any, Dict, List, Union

from langchain_core.tools import BaseTool

from .tool_converter import convert_langgraph_tools_to_openai_functions
from .tool_executor import execute_openai_function_call, get_function_calling_stats

# Re-export main functions for backward compatibility
__all__ = [
    "convert_langgraph_tools_to_openai_functions",
    "execute_openai_function_call",
    "get_function_calling_stats"
]