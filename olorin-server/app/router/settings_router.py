"""
FastAPI router for user settings management.
Handles loading and saving user preferences and configuration.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


def get_default_agents() -> List[str]:
    """Get the default list of agents that should be selected."""
    return ["Network Agent", "Location Agent", "Device Agent", "Log Agent"]


def get_default_agent_tools_mapping() -> Dict[str, List[str]]:
    """
    Get the default mapping of agents to their tools.
    By default, all agents have access to all available tools.
    Users can customize this mapping in their settings.
    """
    # Fallback tool list if registry is not available
    fallback_tools = [
        "http_request",
        "json_api",
        "web_search",
        "web_scrape",
        "file_read",
        "file_write",
        "file_search",
        "directory_list",
        "database_query",
        "database_schema",
        "splunk_query",
        "vector_search",
    ]

    agents = get_default_agents()

    try:
        # Import tool registry for agent-tools mapping
        from app.service.agent.tools.tool_registry import tool_registry

        # Initialize tool registry if not already initialized
        if not tool_registry.is_initialized():
            try:
                tool_registry.initialize()
            except Exception as e:
                logger.warning(f"Could not initialize tool registry: {e}")
                # Return fallback mapping with all fallback tools for each agent
                return {agent: fallback_tools.copy() for agent in agents}

        # Get all available tool names from registry
        all_available_tools = tool_registry.get_tool_names()

        # By default, all agents get access to all available tools
        agent_tools_mapping = {agent: all_available_tools.copy() for agent in agents}

        logger.info(
            f"Assigned {len(all_available_tools)} tools to each of {len(agents)} agents by default"
        )
        return agent_tools_mapping

    except Exception as e:
        logger.warning(f"Could not access tool registry: {e}. Using fallback mapping.")
        # Return fallback mapping with all fallback tools for each agent
        return {agent: fallback_tools.copy() for agent in agents}


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


class UserSettings(BaseModel):
    """User settings model matching the frontend Settings interface."""

    default_entity_type: str = Field(
        default="user_id", description="Default entity type for investigations"
    )
    selected_agents: List[str] = Field(
        default_factory=get_default_agents, description="Default selected agents"
    )
    comment_prefix: str = Field(default="", description="Prefix for comments")
    agent_tools_mapping: Dict[str, List[str]] = Field(
        default_factory=get_default_agent_tools_mapping,
        description="Mapping of agent to tools",
    )


class SettingsResponse(BaseModel):
    """Response model for settings operations."""

    success: bool
    message: str
    settings: Optional[UserSettings] = None


class ToolDisplayInfo(BaseModel):
    """Tool information with display name."""

    name: str = Field(..., description="Technical tool name")
    display_name: str = Field(..., description="User-friendly display name")
    description: str = Field(default="", description="Tool description")


# In-memory storage for demo purposes - in production this would be a database
_user_settings_store: Dict[str, UserSettings] = {}


def get_user_id(request: Request) -> str:
    """
    Extract user ID from request headers or session.
    In production, this would integrate with your authentication system.
    """
    # For now, use a simple approach - in production you'd extract from JWT/session
    user_id = request.headers.get("X-User-ID", "default_user")
    return user_id


@router.get("/", response_model=SettingsResponse)
async def get_settings(user_id: str = Depends(get_user_id)):
    """
    Get user settings from the server.
    Returns default settings if no settings exist for the user.
    """
    try:
        logger.info(f"Getting settings for user: {user_id}")

        if user_id in _user_settings_store:
            settings = _user_settings_store[user_id]
            logger.info(f"Found existing settings for user {user_id}")

            # Ensure agent_tools_mapping is populated if it's empty
            if not settings.agent_tools_mapping:
                settings.agent_tools_mapping = get_default_agent_tools_mapping()
                logger.info(f"Populated default agent tools mapping for user {user_id}")
        else:
            # Return default settings with agent tools mapping
            settings = UserSettings()
            logger.info(f"Returning default settings for user {user_id}")

        return SettingsResponse(
            success=True, message="Settings retrieved successfully", settings=settings
        )

    except Exception as e:
        logger.error(f"Error getting settings for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")


@router.post("/", response_model=SettingsResponse)
async def save_settings(settings: UserSettings, user_id: str = Depends(get_user_id)):
    """
    Save user settings to the server.
    """
    try:
        logger.info(f"Saving settings for user: {user_id}")

        # Store the settings (in production, this would be saved to a database)
        _user_settings_store[user_id] = settings

        logger.info(f"Settings saved successfully for user {user_id}")

        return SettingsResponse(
            success=True, message="Settings saved successfully", settings=settings
        )

    except Exception as e:
        logger.error(f"Error saving settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save settings: {str(e)}"
        )


@router.delete("/", response_model=SettingsResponse)
async def reset_settings(user_id: str = Depends(get_user_id)):
    """
    Reset user settings to defaults.
    """
    try:
        logger.info(f"Resetting settings for user: {user_id}")

        # Remove user settings to fall back to defaults
        if user_id in _user_settings_store:
            del _user_settings_store[user_id]

        default_settings = UserSettings()

        logger.info(f"Settings reset successfully for user {user_id}")

        return SettingsResponse(
            success=True,
            message="Settings reset to defaults",
            settings=default_settings,
        )

    except Exception as e:
        logger.error(f"Error resetting settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to reset settings: {str(e)}"
        )


@router.get("/agents", response_model=List[str])
async def get_available_agents():
    """
    Get list of available agents for settings configuration.
    """
    try:
        # Return the same agents that are used in the frontend investigation steps
        available_agents = get_default_agents()

        logger.info(f"Returning {len(available_agents)} available agents")
        return available_agents

    except Exception as e:
        logger.error(f"Error getting available agents: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get available agents: {str(e)}"
        )


@router.get("/tools", response_model=List[str])
async def get_available_tools():
    """
    Get list of all available tools for settings configuration.
    """
    try:
        # Try to get tools from registry
        try:
            from app.service.agent.tools.tool_registry import tool_registry

            # Initialize tool registry if not already initialized
            if not tool_registry.is_initialized():
                tool_registry.initialize()

            available_tools = tool_registry.get_tool_names()
        except Exception as e:
            logger.warning(
                f"Could not access tool registry: {e}. Using fallback tools."
            )
            # Fallback list of commonly available tools
            available_tools = [
                "http_request",
                "json_api",
                "web_search",
                "splunk_query",
                "database_query",
                "file_read",
                "file_search",
                "vector_search",
            ]

        logger.info(f"Returning {len(available_tools)} available tools")
        return available_tools

    except Exception as e:
        logger.error(f"Error getting available tools: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get available tools: {str(e)}"
        )


@router.get("/tools-with-display-names", response_model=List[ToolDisplayInfo])
async def get_tools_with_display_names():
    """
    Get list of all available tools with user-friendly display names.
    """
    try:
        # Get tool names
        available_tools = []
        try:
            from app.service.agent.tools.tool_registry import tool_registry

            if not tool_registry.is_initialized():
                tool_registry.initialize()

            # Get tools with their descriptions
            all_tools = tool_registry.get_all_tools()
            available_tools = [
                {"name": tool.name, "description": tool.description}
                for tool in all_tools
            ]
        except Exception as e:
            logger.warning(
                f"Could not access tool registry: {e}. Using fallback tools."
            )
            # Fallback list
            fallback_tools = [
                "http_request",
                "json_api",
                "web_search",
                "splunk_query",
                "database_query",
                "file_read",
                "file_search",
                "vector_search",
            ]
            available_tools = [
                {"name": tool, "description": ""} for tool in fallback_tools
            ]

        # Map to display names
        display_names = get_tool_display_names()
        tools_with_display = []

        for tool_info in available_tools:
            tool_name = tool_info["name"]
            display_name = display_names.get(
                tool_name, tool_name.replace("_", " ").title()
            )

            tools_with_display.append(
                ToolDisplayInfo(
                    name=tool_name,
                    display_name=display_name,
                    description=tool_info.get("description", ""),
                )
            )

        logger.info(f"Returning {len(tools_with_display)} tools with display names")
        return tools_with_display

    except Exception as e:
        logger.error(f"Error getting tools with display names: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get tools with display names: {str(e)}"
        )


@router.get("/agent-tools-mapping", response_model=Dict[str, List[str]])
async def get_agent_tools_mapping():
    """
    Get the default mapping of agents to their tools.
    """
    try:
        mapping = get_default_agent_tools_mapping()

        logger.info(f"Returning agent tools mapping for {len(mapping)} agents")
        return mapping

    except Exception as e:
        logger.error(f"Error getting agent tools mapping: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get agent tools mapping: {str(e)}"
        )


@router.get("/export")
async def export_settings(user_id: str = Depends(get_user_id)):
    """
    Export user settings as JSON for backup/migration purposes.
    """
    try:
        logger.info(f"Exporting settings for user: {user_id}")

        if user_id in _user_settings_store:
            settings = _user_settings_store[user_id]
        else:
            settings = UserSettings()

        return {
            "user_id": user_id,
            "exported_at": "2025-01-19T12:00:00Z",  # In production, use actual timestamp
            "settings": settings.model_dump(),
        }

    except Exception as e:
        logger.error(f"Error exporting settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to export settings: {str(e)}"
        )


@router.post("/import")
async def import_settings(
    import_data: Dict[str, Any], user_id: str = Depends(get_user_id)
):
    """
    Import user settings from exported JSON data.
    """
    try:
        logger.info(f"Importing settings for user: {user_id}")

        if "settings" not in import_data:
            raise HTTPException(
                status_code=400, detail="Invalid import data: missing 'settings' field"
            )

        # Validate and create settings object
        settings = UserSettings(**import_data["settings"])

        # Store the imported settings
        _user_settings_store[user_id] = settings

        logger.info(f"Settings imported successfully for user {user_id}")

        return SettingsResponse(
            success=True, message="Settings imported successfully", settings=settings
        )

    except Exception as e:
        logger.error(f"Error importing settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=400, detail=f"Failed to import settings: {str(e)}"
        )


@router.get("/tools-by-category", response_model=Dict[str, List[ToolDisplayInfo]])
async def get_tools_by_category():
    """
    Get tools organized by category (Olorin Tools vs MCP Tools).
    """
    try:
        # Get all tools with display names
        all_tools_info = await get_tools_with_display_names()

        olorin_tools = []
        mcp_tools = []

        # Categorize tools
        for tool_info in all_tools_info:
            tool_name = tool_info.name.lower()

            # Classify as Olorin tool if it contains investigation-related keywords
            if any(
                keyword in tool_name
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

        logger.info(
            f"Categorized tools: {len(olorin_tools)} Olorin tools, {len(mcp_tools)} MCP tools"
        )
        return {"olorin_tools": olorin_tools, "mcp_tools": mcp_tools}

    except Exception as e:
        logger.error(f"Error getting tools by category: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get tools by category: {str(e)}"
        )
