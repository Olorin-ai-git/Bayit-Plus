"""Configuration for the MCP server."""

import os
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.service.config_loader import get_config_loader


class MCPConfig(BaseModel):
    """Configuration for the Olorin MCP Server."""

    # Server Configuration
    server_name: str = Field(
        default="olorin-mcp-server", description="Name of the MCP server"
    )
    server_version: str = Field(
        default="1.0.0", description="Version of the MCP server"
    )
    description: str = Field(
        default="MCP server providing access to LangGraph agents and LangChain tools",
        description="Server description",
    )

    # Tool Configuration
    enable_database_tools: bool = Field(
        default=False, description="Enable database tools"
    )
    database_connection_string: Optional[str] = Field(
        default=None, description="Database connection string"
    )

    enable_web_tools: bool = Field(
        default=True, description="Enable web search and scraping tools"
    )
    web_search_user_agent: Optional[str] = Field(
        default=None, description="User agent for web requests"
    )

    enable_file_system_tools: bool = Field(
        default=True, description="Enable file system tools"
    )
    file_system_base_path: Optional[str] = Field(
        default=None, description="Base path for file system operations"
    )

    enable_api_tools: bool = Field(default=True, description="Enable API tools")
    api_default_headers: Optional[Dict[str, str]] = Field(
        default=None, description="Default headers for API requests"
    )

    # Agent Configuration
    enable_agents: bool = Field(
        default=True, description="Enable LangGraph agent resources"
    )
    openai_api_key: Optional[str] = Field(
        default=None, description="OpenAI API key for agents"
    )
    langfuse_api_key: Optional[str] = Field(
        default=None, description="Langfuse API key for tracing"
    )

    # Olorin Tools Configuration
    enable_olorin_tools: bool = Field(
        default=True, description="Enable Olorin-specific tools (Splunk, OII, etc.)"
    )

    # Security Configuration
    allowed_origins: List[str] = Field(
        default=["*"], description="Allowed origins for CORS"
    )
    max_request_size: int = Field(
        default=10485760, description="Maximum request size in bytes (10MB)"
    )
    rate_limit_requests: int = Field(
        default=100, description="Rate limit requests per minute"
    )

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    enable_request_logging: bool = Field(
        default=True, description="Enable request/response logging"
    )

    @classmethod
    def from_env(cls) -> "MCPConfig":
        """Create configuration from environment variables."""
        # Load API keys from Firebase Secret Manager
        config_loader = get_config_loader()
        openai_api_key = config_loader.load_secret("OPENAI_API_KEY")
        langfuse_api_key = config_loader.load_secret("LANGFUSE_API_KEY")

        return cls(
            # Server
            server_name=os.getenv("MCP_SERVER_NAME", "olorin-mcp-server"),
            server_version=os.getenv("MCP_SERVER_VERSION", "1.0.0"),
            description=os.getenv(
                "MCP_SERVER_DESCRIPTION",
                "MCP server providing access to LangGraph agents and LangChain tools",
            ),
            # Database
            enable_database_tools=os.getenv(
                "MCP_ENABLE_DATABASE_TOOLS", "false"
            ).lower()
            == "true",
            database_connection_string=os.getenv("MCP_DATABASE_CONNECTION_STRING"),
            # Web
            enable_web_tools=os.getenv("MCP_ENABLE_WEB_TOOLS", "true").lower()
            == "true",
            web_search_user_agent=os.getenv("MCP_WEB_USER_AGENT"),
            # File System
            enable_file_system_tools=os.getenv(
                "MCP_ENABLE_FILE_SYSTEM_TOOLS", "true"
            ).lower()
            == "true",
            file_system_base_path=os.getenv("MCP_FILE_SYSTEM_BASE_PATH"),
            # API
            enable_api_tools=os.getenv("MCP_ENABLE_API_TOOLS", "true").lower()
            == "true",
            api_default_headers=None,  # Could be parsed from JSON env var if needed
            # Agents
            enable_agents=os.getenv("MCP_ENABLE_AGENTS", "true").lower() == "true",
            openai_api_key=openai_api_key,
            langfuse_api_key=langfuse_api_key,
            # Security
            allowed_origins=os.getenv("MCP_ALLOWED_ORIGINS", "*").split(","),
            max_request_size=int(os.getenv("MCP_MAX_REQUEST_SIZE", "10485760")),
            rate_limit_requests=int(os.getenv("MCP_RATE_LIMIT_REQUESTS", "100")),
            # Logging
            log_level=os.getenv("MCP_LOG_LEVEL", "INFO"),
            enable_request_logging=os.getenv(
                "MCP_ENABLE_REQUEST_LOGGING", "true"
            ).lower()
            == "true",
        )

    def get_tool_config(self) -> Dict[str, Any]:
        """Get tool configuration for the tool registry."""
        return {
            "database_connection_string": (
                self.database_connection_string if self.enable_database_tools else None
            ),
            "web_search_user_agent": (
                self.web_search_user_agent if self.enable_web_tools else None
            ),
            "file_system_base_path": (
                self.file_system_base_path if self.enable_file_system_tools else None
            ),
            "api_default_headers": (
                self.api_default_headers if self.enable_api_tools else None
            ),
        }

    def get_enabled_tool_categories(self) -> List[str]:
        """Get list of enabled tool categories."""
        categories = []
        if self.enable_database_tools and self.database_connection_string:
            categories.append("database")
        if self.enable_web_tools:
            categories.append("web")
        if self.enable_file_system_tools:
            categories.append("file_system")
        if self.enable_api_tools:
            categories.append("api")
        # Search tools are always enabled as they don't require special config
        categories.append("search")
        if self.enable_olorin_tools:
            categories.append("olorin")
        return categories
