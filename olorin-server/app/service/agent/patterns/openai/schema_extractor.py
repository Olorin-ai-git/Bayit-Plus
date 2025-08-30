"""
Schema Extractor for Tool Conversion

Extracts parameter schemas from Pydantic models and method signatures
for OpenAI function calling format conversion.
"""

import inspect
import logging
from typing import Any, Dict, List, Tuple

from langchain_core.tools import BaseTool
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def extract_schema_from_pydantic(schema_class: type[BaseModel]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Extract OpenAI function parameters from Pydantic model.
    
    Args:
        schema_class: Pydantic BaseModel class
        
    Returns:
        Tuple of (properties dict, required fields list)
    """
    properties = {}
    required = []
    
    try:
        # Get the schema from the Pydantic model
        schema = schema_class.model_json_schema()
        
        # Extract properties
        if "properties" in schema:
            for field_name, field_info in schema["properties"].items():
                properties[field_name] = convert_pydantic_field_to_openai(field_info)
        
        # Extract required fields
        if "required" in schema:
            required = schema["required"]
        
    except Exception as e:
        logger.warning(f"Failed to extract schema from Pydantic model: {e}")
    
    return properties, required


def convert_pydantic_field_to_openai(field_info: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Pydantic field info to OpenAI parameter definition"""
    
    openai_field = {}
    
    # Map type
    if "type" in field_info:
        field_type = field_info["type"]
        if field_type == "string":
            openai_field["type"] = "string"
        elif field_type in ["integer", "number"]:
            openai_field["type"] = "number"
        elif field_type == "boolean":
            openai_field["type"] = "boolean"
        elif field_type == "array":
            openai_field["type"] = "array"
            if "items" in field_info:
                openai_field["items"] = convert_pydantic_field_to_openai(field_info["items"])
        elif field_type == "object":
            openai_field["type"] = "object"
            if "properties" in field_info:
                openai_field["properties"] = {
                    prop_name: convert_pydantic_field_to_openai(prop_info)
                    for prop_name, prop_info in field_info["properties"].items()
                }
        else:
            openai_field["type"] = "string"  # Default fallback
    else:
        openai_field["type"] = "string"  # Default fallback
    
    # Add description if available
    if "description" in field_info:
        openai_field["description"] = field_info["description"]
    
    # Add enum values if available
    if "enum" in field_info:
        openai_field["enum"] = field_info["enum"]
    
    return openai_field


def extract_schema_from_method(tool: BaseTool) -> Tuple[Dict[str, Any], List[str]]:
    """
    Extract function parameters by analyzing the tool's _run method.
    This is a fallback when no Pydantic schema is available.
    """
    properties = {}
    required = []
    
    try:
        # Get the _run method signature
        if hasattr(tool, '_run'):
            sig = inspect.signature(tool._run)
            
            for param_name, param in sig.parameters.items():
                if param_name == 'self':
                    continue
                
                # Determine parameter type from annotation
                param_type = "string"  # Default
                if param.annotation != inspect.Parameter.empty:
                    if param.annotation == int:
                        param_type = "number"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"
                    elif param.annotation == list:
                        param_type = "array"
                    elif param.annotation == dict:
                        param_type = "object"
                
                properties[param_name] = {
                    "type": param_type,
                    "description": f"Parameter {param_name} for {tool.name}"
                }
                
                # Check if parameter is required
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)
    
    except Exception as e:
        logger.warning(f"Failed to extract schema from method for {tool.name}: {e}")
        # Provide generic schema for common tools
        properties = get_generic_tool_schema(tool.name)
    
    return properties, required


def get_generic_tool_schema(tool_name: str) -> Dict[str, Any]:
    """Get generic schema for common tools based on tool name"""
    
    if "splunk" in tool_name.lower():
        return {
            "query": {
                "type": "string",
                "description": "SPL search query to execute in Splunk"
            }
        }
    elif "sumologic" in tool_name.lower():
        return {
            "query": {
                "type": "string", 
                "description": "SumoLogic search query to execute"
            },
            "time_range": {
                "type": "string",
                "description": "Time range for the query (e.g., '-15m', '-1h')"
            }
        }
    elif "retriever" in tool_name.lower():
        return {
            "query": {
                "type": "string",
                "description": "Query string for data retrieval"
            }
        }
    else:
        # Generic single-parameter schema
        return {
            "input": {
                "type": "string",
                "description": f"Input parameter for {tool_name}"
            }
        }