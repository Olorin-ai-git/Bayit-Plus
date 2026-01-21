"""Simplified tool registry under 200 lines."""

from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool

from app.service.logging import get_bridge_logger

# Import core tools that are always available
from .api_tool import HTTPRequestTool, JSONAPITool
from .database_tool import DatabaseQueryTool, DatabaseSchemaTool
from .file_system_tool import (
    DirectoryListTool,
    FileReadTool,
    FileSearchTool,
    FileWriteTool,
)
from .tool_config import ToolConfig
from .tool_initializer import ToolInitializer
from .vector_search_tool import VectorSearchTool
from .web_search_tool import WebScrapeTool, WebSearchTool

logger = get_bridge_logger(__name__)


class ToolRegistry:
    """Registry for managing and accessing LangGraph agent tools."""

    def __init__(self):
        """Initialize the tool registry."""
        self._tools: Dict[str, BaseTool] = {}
        self._tool_categories: Dict[str, List[str]] = {
            "database": [],
            "web": [],
            "file_system": [],
            "api": [],
            "search": [],
            "olorin": [],
            "threat_intelligence": [],
            "mcp_clients": [],
            "blockchain": [],
            "intelligence": [],
            "ml_ai": [],
            "utility": [],
        }
        self._initialized = False

    def initialize(
        self,
        database_connection_string: Optional[str] = None,
        web_search_user_agent: Optional[str] = None,
        file_system_base_path: Optional[str] = None,
        api_default_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        """Initialize all tools with configuration."""
        if self._initialized:
            logger.info("Tool registry already initialized")
            return

        try:
            # Log tool configuration status
            status = ToolConfig.get_tool_status_summary()
            logger.info(
                f"Initializing tool registry with {len(status['enabled'])} enabled tools"
            )

            # Validate configuration
            ToolConfig.validate_configuration()

            # Initialize core tools (always available)
            self._initialize_core_tools(
                database_connection_string,
                web_search_user_agent,
                file_system_base_path,
                api_default_headers,
            )

            # Initialize Olorin-specific tools based on configuration
            ToolInitializer.initialize_olorin_tools(self)

            # Initialize threat intelligence tools
            ToolInitializer.initialize_threat_intel_tools(self)

            # Initialize blockchain tools
            ToolInitializer.initialize_blockchain_tools(self)

            # Initialize intelligence tools
            ToolInitializer.initialize_intelligence_tools(self)

            # Initialize ML/AI tools
            ToolInitializer.initialize_ml_tools(self)

            self._initialized = True
            logger.info(f"Tool registry initialized with {len(self._tools)} tools")

        except Exception as e:
            logger.error(f"Failed to initialize tool registry: {e}")
            raise

    def _initialize_core_tools(
        self,
        database_connection_string: Optional[str],
        web_search_user_agent: Optional[str],
        file_system_base_path: Optional[str],
        api_default_headers: Optional[Dict[str, str]],
    ) -> None:
        """Initialize core tools that are always available."""

        # Database Tools
        if database_connection_string:
            self._register_tool(
                DatabaseQueryTool(connection_string=database_connection_string),
                "database",
            )
            self._register_tool(
                DatabaseSchemaTool(connection_string=database_connection_string),
                "database",
            )

        # Web Tools
        self._register_tool(WebSearchTool(user_agent=web_search_user_agent), "web")
        self._register_tool(WebScrapeTool(user_agent=web_search_user_agent), "web")

        # File System Tools
        self._register_tool(
            FileReadTool(base_path=file_system_base_path), "file_system"
        )
        self._register_tool(
            FileWriteTool(base_path=file_system_base_path), "file_system"
        )
        self._register_tool(
            DirectoryListTool(base_path=file_system_base_path), "file_system"
        )
        self._register_tool(
            FileSearchTool(base_path=file_system_base_path), "file_system"
        )

        # API Tools
        self._register_tool(HTTPRequestTool(default_headers=api_default_headers), "api")
        self._register_tool(JSONAPITool(), "api")

        # Search Tools
        self._register_tool(VectorSearchTool(), "search")

    def _register_tool(self, tool: BaseTool, category: str) -> None:
        """Register a tool in the registry."""
        self._tools[tool.name] = tool
        if category in self._tool_categories:
            self._tool_categories[category].append(tool.name)

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)

    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """Get all tools in a specific category."""
        if category not in self._tool_categories:
            return []
        return [
            self._tools[tool_name]
            for tool_name in self._tool_categories[category]
            if tool_name in self._tools
        ]

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools."""
        return list(self._tools.values())

    def get_tool_names(self) -> List[str]:
        """Get names of all registered tools."""
        return list(self._tools.keys())

    def get_categories(self) -> List[str]:
        """Get all available tool categories."""
        return list(self._tool_categories.keys())

    def get_tools_summary(self) -> Dict[str, Any]:
        """Get a summary of all tools organized by category."""
        summary = {"total_tools": len(self._tools), "categories": {}}
        for category, tool_names in self._tool_categories.items():
            available_tools = [name for name in tool_names if name in self._tools]
            summary["categories"][category] = {
                "count": len(available_tools),
                "tools": [
                    {"name": name, "description": self._tools[name].description}
                    for name in available_tools
                ],
            }
        return summary

    def is_initialized(self) -> bool:
        """Check if the registry is initialized."""
        return self._initialized


# Global tool registry instance
tool_registry = ToolRegistry()
