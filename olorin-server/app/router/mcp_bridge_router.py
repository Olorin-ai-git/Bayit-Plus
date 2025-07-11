"""
FastAPI router that bridges frontend requests to MCP server.
This allows the frontend to access MCP tools through familiar REST endpoints.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from ..service.agent.tools.tool_registry import (
    get_essential_tools,
    get_olorin_tools,
    initialize_tools,
    tool_registry,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mcp", tags=["MCP Bridge"])


def get_tool_display_names() -> Dict[str, str]:
    """
    Get user-friendly display names for tools.
    Maps technical tool names to human-readable labels.
    """
    return {
        # Web & Search Tools
        "web_search": "Web Search",
        "web_scrape": "Web Page Scraper",
        # File System Tools
        "file_read": "File Reader",
        "file_write": "File Writer",
        "file_search": "File Search",
        "directory_list": "Directory Listing",
        # API & Network Tools
        "http_request": "HTTP Request",
        "json_api": "JSON API Client",
        # Database Tools
        "database_query": "Database Query",
        "database_schema": "Database Schema",
        # Olorin-specific Tools
        "splunk_query": "Splunk Query",
        "splunk_query_tool": "Splunk Search",
        "identity_info_tool": "Identity Lookup",
        "oii_tool": "Online Identity Info",
        "di_tool": "Device Intelligence",
        # Search & Analytics
        "vector_search": "Vector Search",
        "vector_search_tool": "Semantic Search",
        # Legacy/Fallback names
        "kk_dashboard": "KK Dashboard",
        "cdc_tool": "Customer Data",
        "qb_tool": "QuickBooks Data",
    }


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
    display_name: str = Field(..., description="User-friendly display name")
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
            olorin_tools=olorin_tools,
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

        display_names = get_tool_display_names()
        tool_infos = []

        for tool in tools:
            # Determine category
            tool_category = "unknown"
            summary = tool_registry.get_tools_summary()
            for cat, cat_info in summary["categories"].items():
                if any(t["name"] == tool.name for t in cat_info["tools"]):
                    tool_category = cat
                    break

            # Get display name
            display_name = display_names.get(
                tool.name, tool.name.replace("_", " ").title()
            )

            tool_infos.append(
                ToolInfo(
                    name=tool.name,
                    display_name=display_name,
                    description=tool.description,
                    category=tool_category,
                    schema=(
                        tool.args_schema.model_json_schema() if tool.args_schema else {}
                    ),
                )
            )

        return tool_infos
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools/olorin", response_model=List[ToolInfo])
async def list_olorin_tools():
    """List Olorin-specific tools (Splunk, OII, DI)."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()

        tools = get_olorin_tools()
        display_names = get_tool_display_names()
        tool_infos = []

        for tool in tools:
            display_name = display_names.get(
                tool.name, tool.name.replace("_", " ").title()
            )

            tool_infos.append(
                ToolInfo(
                    name=tool.name,
                    display_name=display_name,
                    description=tool.description,
                    category="olorin",
                    schema=(
                        tool.args_schema.model_json_schema() if tool.args_schema else {}
                    ),
                )
            )

        return tool_infos
    except Exception as e:
        logger.error(f"Error listing Olorin tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tools/{tool_name}/call", response_model=ToolCallResponse)
async def call_tool(
    tool_name: str, request: ToolCallRequest, background_tasks: BackgroundTasks
):
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
            if hasattr(tool, "_arun"):
                # Use async version if available
                result = await tool._arun(**request.arguments)
            else:
                # Fall back to sync version
                result = tool._run(**request.arguments)

            return ToolCallResponse(success=True, result=result)

        except Exception as tool_error:
            logger.error(f"Tool {tool_name} execution failed: {tool_error}")
            return ToolCallResponse(success=False, error=str(tool_error))

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
        "initialized": (
            tool_registry.is_initialized()
            if hasattr(tool_registry, "is_initialized")
            else False
        ),
    }


@router.get("/tools/categories", response_model=Dict[str, List[ToolInfo]])
async def get_tools_by_categories():
    """Get tools organized by categories (Olorin vs MCP Tools)."""
    try:
        if not tool_registry.is_initialized():
            initialize_tools()

        all_tools = tool_registry.get_all_tools()
        display_names = get_tool_display_names()

        olorin_tools = []
        mcp_tools = []

        for tool in all_tools:
            # Determine category
            tool_category = "unknown"
            summary = tool_registry.get_tools_summary()
            for cat, cat_info in summary["categories"].items():
                if any(t["name"] == tool.name for t in cat_info["tools"]):
                    tool_category = cat
                    break

            # Get display name
            display_name = display_names.get(
                tool.name, tool.name.replace("_", " ").title()
            )

            tool_info = ToolInfo(
                name=tool.name,
                display_name=display_name,
                description=tool.description,
                category=tool_category,
                schema=tool.args_schema.model_json_schema() if tool.args_schema else {},
            )

            # Categorize into Olorin vs MCP
            if tool_category == "olorin" or any(
                keyword in tool.name.lower()
                for keyword in [
                    "splunk",
                    "oii",
                    "identity",
                    "di_tool",
                    "fraud",
                    "investigation",
                ]
            ):
                olorin_tools.append(tool_info)
            else:
                mcp_tools.append(tool_info)

        return {"olorin_tools": olorin_tools, "mcp_tools": mcp_tools}

    except Exception as e:
        logger.error(f"Error getting tools by categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompts", response_model=List[Dict[str, str]])
async def get_investigation_prompts():
    """Get available investigation prompts for the chat interface."""
    try:
        # Pre-defined investigation prompts
        prompts = [
            {
                "title": "Analyze User Activity",
                "description": "Investigate suspicious user behavior patterns",
                "prompt": "Analyze the recent activity for user {user_id}. Look for any suspicious patterns in login locations, device usage, and transaction behavior. Use Splunk logs and identity information to build a comprehensive profile.",
            },
            {
                "title": "Device Risk Assessment",
                "description": "Evaluate device security and usage patterns",
                "prompt": "Perform a comprehensive device risk assessment for device {device_id}. Check for unusual network activity, location changes, and compare against known good devices. Use device intelligence and network analysis tools.",
            },
            {
                "title": "Location Anomaly Detection",
                "description": "Detect unusual location patterns and travel",
                "prompt": "Investigate location anomalies for user {user_id}. Check for impossible travel, unusual login locations, and compare against historical patterns. Use location data and identity lookup tools.",
            },
            {
                "title": "Fraud Pattern Analysis",
                "description": "Identify potential fraud indicators and patterns",
                "prompt": "Analyze potential fraud patterns for {entity_type} {entity_id}. Look for indicators like rapid transactions, unusual amounts, device switching, and location inconsistencies. Use all available investigation tools.",
            },
            {
                "title": "Network Security Investigation",
                "description": "Investigate network-based security threats",
                "prompt": "Investigate network security concerns for {entity_id}. Check for suspicious IP addresses, proxy usage, VPN patterns, and network anomalies. Use network analysis and Splunk data.",
            },
            {
                "title": "Identity Verification Check",
                "description": "Verify user identity and detect impersonation",
                "prompt": "Perform identity verification for user {user_id}. Check online identity information, verify personal details, and look for signs of identity theft or account takeover. Use identity lookup tools.",
            },
            {
                "title": "Timeline Reconstruction",
                "description": "Build a detailed timeline of events",
                "prompt": "Reconstruct a detailed timeline of events for {entity_type} {entity_id} from {start_date} to {end_date}. Include login events, transactions, location changes, and device usage. Use log analysis and search tools.",
            },
            {
                "title": "Cross-Reference Investigation",
                "description": "Cross-reference data across multiple sources",
                "prompt": "Cross-reference information for {entity_id} across all available data sources. Look for inconsistencies, correlations, and patterns that might indicate fraudulent activity. Use multiple investigation tools.",
            },
        ]

        return prompts

    except Exception as e:
        logger.error(f"Error getting investigation prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
