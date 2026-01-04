"""
LangGraph to OpenAI Tool Converter

Converts LangGraph tools to OpenAI function calling format,
using specialized schema extractors for parameter handling.
"""

from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool

from app.service.logging import get_bridge_logger

from .schema_extractor import extract_schema_from_method, extract_schema_from_pydantic

logger = get_bridge_logger(__name__)


def convert_langgraph_tools_to_openai_functions(
    tools: List[BaseTool],
) -> List[Dict[str, Any]]:
    """
    Convert LangGraph tools to OpenAI function calling format.

    Args:
        tools: List of LangGraph BaseTool instances

    Returns:
        List of OpenAI function definitions
    """
    function_definitions = []

    for tool in tools:
        try:
            function_def = convert_single_tool(tool)
            if function_def:
                function_definitions.append(function_def)
                logger.info(f"Converted tool '{tool.name}' to OpenAI function")
        except Exception as e:
            logger.error(f"Failed to convert tool '{tool.name}': {e}")
            continue

    return function_definitions


def convert_single_tool(tool: BaseTool) -> Optional[Dict[str, Any]]:
    """
    Convert a single LangGraph tool to OpenAI function definition.

    Args:
        tool: LangGraph BaseTool instance

    Returns:
        OpenAI function definition or None if conversion fails
    """
    try:
        # Extract tool schema information
        function_definition = {
            "name": sanitize_function_name(tool.name),
            "description": tool.description or f"Execute {tool.name} tool",
            "parameters": {"type": "object", "properties": {}, "required": []},
        }

        # Convert tool arguments schema if available
        if hasattr(tool, "args_schema") and tool.args_schema:
            properties, required = extract_schema_from_pydantic(tool.args_schema)
            function_definition["parameters"]["properties"] = properties
            function_definition["parameters"]["required"] = required
        else:
            # Fallback: analyze the tool's _run method signature
            properties, required = extract_schema_from_method(tool)
            function_definition["parameters"]["properties"] = properties
            function_definition["parameters"]["required"] = required

        return function_definition

    except Exception as e:
        logger.error(f"Error converting tool {tool.name}: {e}")
        return None


def sanitize_function_name(name: str) -> str:
    """
    Sanitize function name for OpenAI compatibility.
    OpenAI function names must be alphanumeric with underscores.
    """
    # Replace hyphens with underscores and remove invalid characters
    sanitized = "".join(c if c.isalnum() or c == "_" else "_" for c in name)

    # Ensure it starts with a letter or underscore
    if sanitized and not (sanitized[0].isalpha() or sanitized[0] == "_"):
        sanitized = f"tool_{sanitized}"

    return sanitized or "unknown_tool"
