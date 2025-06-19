"""
FastAPI router that bridges frontend requests to MCP server.
This allows the frontend to access MCP tools through familiar REST endpoints.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from ..service.agent.tools.tool_registry import (
    tool_registry,
    initialize_tools,
    get_olorin_tools,
    get_essential_tools
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mcp", tags=["MCP Bridge"])


# Request/Response Models
class ToolCallRequest(BaseModel):
    """Request model for calling a tool."""
    arguments: Dict[str, Any] = Field(..., description="Arguments to pass to the tool")


class ToolCallResponse(BaseModel):
    """Response model for tool calls."""
    success: bool = Field(..., description="Whether the tool call succeeded")
    result: Any = Field(None, description="Tool execution result")
    error: Optional[str] = Field(None, description="Error message if failed")


class ToolInfo(BaseModel):
    """Tool information model."""
    name: str
    description: str
    category: str
    schema: Dict[str, Any]


class ServerStatus(BaseModel):
    """MCP server status model."""
    initialized: bool
    total_tools: int
    categories: List[str]
    olorin_tools: int


# Initialize tools when module loads
try:
    if not tool_registry.is_initialized():
        initialize_tools()
        logger.info("MCP bridge initialized with tools")
except Exception as e:
    logger.error(f"Failed to initialize MCP bridge: {e}")


@router.get("/status", response_model=ServerStatus)
async def get_server_status():
    """Get MCP server status and available tools."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()
        
        summary = tool_registry.get_tools_summary()
        olorin_tools = len(get_olorin_tools())
        
        return ServerStatus(
            initialized=tool_registry.is_initialized(),
            total_tools=summary["total_tools"],
            categories=list(summary["categories"].keys()),
            olorin_tools=olorin_tools
        )
    except Exception as e:
        logger.error(f"Error getting server status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools", response_model=List[ToolInfo])
async def list_tools(category: Optional[str] = None):
    """List available tools, optionally filtered by category."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()
        
        if category:
            tools = tool_registry.get_tools_by_category(category)
        else:
            tools = tool_registry.get_all_tools()
        
        tool_infos = []
        for tool in tools:
            # Determine category
            tool_category = "unknown"
            summary = tool_registry.get_tools_summary()
            for cat, cat_info in summary["categories"].items():
                if any(t["name"] == tool.name for t in cat_info["tools"]):
                    tool_category = cat
                    break
            
            tool_infos.append(ToolInfo(
                name=tool.name,
                description=tool.description,
                category=tool_category,
                schema=tool.args_schema.model_json_schema() if tool.args_schema else {}
            ))
        
        return tool_infos
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools/olorin", response_model=List[ToolInfo])
async def list_olorin_tools():
    """List Olorin-specific tools (Splunk, OII, Chronos, DI)."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()
        
        tools = get_olorin_tools()
        tool_infos = []
        
        for tool in tools:
            tool_infos.append(ToolInfo(
                name=tool.name,
                description=tool.description,
                category="olorin",
                schema=tool.args_schema.model_json_schema() if tool.args_schema else {}
            ))
        
        return tool_infos
    except Exception as e:
        logger.error(f"Error listing Olorin tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tools/{tool_name}/call", response_model=ToolCallResponse)
async def call_tool(tool_name: str, request: ToolCallRequest, background_tasks: BackgroundTasks):
    """Call a specific tool with arguments."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()
        
        # Find the tool
        tool = tool_registry.get_tool(tool_name)
        if not tool:
            raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
        
        # Call the tool
        try:
            if hasattr(tool, '_arun'):
                # Use async version if available
                result = await tool._arun(**request.arguments)
            else:
                # Fall back to sync version
                result = tool._run(**request.arguments)
            
            return ToolCallResponse(
                success=True,
                result=result
            )
            
        except Exception as tool_error:
            logger.error(f"Tool {tool_name} execution failed: {tool_error}")
            return ToolCallResponse(
                success=False,
                error=str(tool_error)
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calling tool {tool_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Convenience endpoints for common Olorin tools
@router.post("/splunk/search")
async def search_splunk(query: str):
    """Search Splunk logs."""
    request = ToolCallRequest(arguments={"query": query})
    return await call_tool("splunk_query_tool", request, BackgroundTasks())


@router.post("/identity/lookup")
async def lookup_identity(user_id: str):
    """Look up user identity information."""
    request = ToolCallRequest(arguments={"user_id": user_id})
    return await call_tool("identity_info_tool", request, BackgroundTasks())


@router.post("/web/search")
async def web_search(query: str, max_results: int = 10):
    """Perform web search."""
    request = ToolCallRequest(arguments={"query": query, "max_results": max_results})
    return await call_tool("web_search", request, BackgroundTasks())


@router.post("/web/scrape")
async def scrape_web_page(url: str):
    """Scrape a web page."""
    request = ToolCallRequest(arguments={"url": url})
    return await call_tool("web_scrape", request, BackgroundTasks())


@router.get("/resources/summary")
async def get_tools_summary():
    """Get a summary of all available tools."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()
        
        return tool_registry.get_tools_summary()
    except Exception as e:
        logger.error(f"Error getting tools summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "MCP Bridge",
        "initialized": tool_registry.is_initialized() if hasattr(tool_registry, 'is_initialized') else False
    } 