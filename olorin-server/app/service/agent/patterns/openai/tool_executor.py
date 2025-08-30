"""
OpenAI Tool Executor

Executes OpenAI function calls using existing LangGraph tools,
handling parameter conversion and tool execution.
"""

import logging
from typing import Any, Dict, List, Optional, Union

from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


async def execute_openai_function_call(
    function_name: str,
    function_args: Dict[str, Any],
    tools: List[BaseTool]
) -> Union[str, Dict[str, Any]]:
    """
    Execute an OpenAI function call using existing LangGraph tools.
    
    Args:
        function_name: Name of the function to execute
        function_args: Arguments for the function call
        tools: List of available LangGraph tools
        
    Returns:
        Function execution result
    """
    try:
        # Find the corresponding tool
        tool = _find_tool_by_function_name(function_name, tools)
        if not tool:
            return f"Error: Function '{function_name}' not found in available tools"
        
        # Convert function args to tool parameters
        tool_args = _convert_openai_args_to_tool_args(function_args, tool)
        
        # Execute the tool
        logger.info(f"Executing tool '{tool.name}' with args: {list(tool_args.keys())}")
        
        if hasattr(tool, '_arun'):
            # Async execution
            if len(tool_args) == 1:
                # Single argument
                result = await tool._arun(list(tool_args.values())[0])
            else:
                # Multiple arguments - pass as kwargs
                result = await tool._arun(**tool_args)
        else:
            # Sync execution (fallback)
            if len(tool_args) == 1:
                # Single argument
                result = tool._run(list(tool_args.values())[0])
            else:
                # Multiple arguments - pass as kwargs
                result = tool._run(**tool_args)
        
        logger.info(f"Tool '{tool.name}' executed successfully")
        
        # Return structured result
        if isinstance(result, dict):
            return result
        else:
            return {"result": str(result), "tool_name": tool.name}
            
    except Exception as e:
        error_msg = f"Error executing function '{function_name}': {str(e)}"
        logger.error(error_msg)
        return {"error": error_msg, "function_name": function_name}


def _find_tool_by_function_name(function_name: str, tools: List[BaseTool]) -> Optional[BaseTool]:
    """Find a tool by its OpenAI function name"""
    
    # First, try exact match with sanitized name
    for tool in tools:
        if _sanitize_function_name(tool.name) == function_name:
            return tool
    
    # Then try partial match
    for tool in tools:
        if function_name.lower() in tool.name.lower() or tool.name.lower() in function_name.lower():
            return tool
    
    return None


def _sanitize_function_name(name: str) -> str:
    """Sanitize function name for OpenAI compatibility"""
    sanitized = ''.join(c if c.isalnum() or c == '_' else '_' for c in name)
    
    if sanitized and not (sanitized[0].isalpha() or sanitized[0] == '_'):
        sanitized = f"tool_{sanitized}"
    
    return sanitized or "unknown_tool"


def _convert_openai_args_to_tool_args(openai_args: Dict[str, Any], tool: BaseTool) -> Dict[str, Any]:
    """Convert OpenAI function arguments to tool arguments"""
    
    # For most tools, the arguments map directly
    tool_args = openai_args.copy()
    
    # Handle special cases for known tools
    if hasattr(tool, 'name'):
        tool_name = tool.name.lower()
        
        # SplunkQueryTool expects 'query' parameter
        if 'splunk' in tool_name and 'query' in openai_args:
            return {'query': openai_args['query']}
        
        # SumoLogicQueryTool expects 'query' and optionally 'time_range'
        if 'sumologic' in tool_name:
            if 'query' in openai_args:
                tool_args = {'query': openai_args['query']}
                if 'time_range' in openai_args:
                    tool_args['time_range'] = openai_args['time_range']
                return tool_args
        
        # Retriever tools typically expect a 'query' parameter
        if 'retriever' in tool_name and 'query' in openai_args:
            return {'query': openai_args['query']}
    
    return tool_args


def get_function_calling_stats(tools: List[BaseTool]) -> Dict[str, Any]:
    """Get statistics about function calling capabilities"""
    
    from .tool_converter import convert_single_tool
    
    stats = {
        "total_tools": len(tools),
        "convertible_tools": 0,
        "tools_by_type": {},
        "function_names": []
    }
    
    for tool in tools:
        try:
            function_def = convert_single_tool(tool)
            if function_def:
                stats["convertible_tools"] += 1
                stats["function_names"].append(function_def["name"])
                
                # Categorize by type
                tool_type = "unknown"
                if "splunk" in tool.name.lower():
                    tool_type = "siem"
                elif "sumologic" in tool.name.lower():
                    tool_type = "logging"
                elif "retriever" in tool.name.lower():
                    tool_type = "retrieval"
                
                if tool_type not in stats["tools_by_type"]:
                    stats["tools_by_type"][tool_type] = 0
                stats["tools_by_type"][tool_type] += 1
        except:
            continue
    
    return stats