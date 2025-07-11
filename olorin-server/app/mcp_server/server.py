"""Main MCP server implementation for Olorin LangGraph integration."""

import asyncio
import json
import logging
import traceback
from typing import Any, Dict, List, Optional, Sequence

from mcp.server import Server
from mcp.types import (
    Resource,
    TextContent,
    TextResourceContents,
    Tool,
)

from ..service.agent.tools.tool_registry import (
    get_tools_for_agent,
    initialize_tools,
    tool_registry,
)
from .config import MCPConfig

logger = logging.getLogger(__name__)


class OlorinMCPServer:
    """MCP Server for Olorin LangGraph integration."""

    def __init__(self, config: MCPConfig):
        """Initialize the MCP server."""
        self.config = config
        self.server = Server(self.config.server_name)
        self._tools_initialized = False
        self._available_tools: List[Any] = []
        self._setup_logging()
        self._setup_handlers()

    def _setup_logging(self):
        """Setup logging configuration."""
        logging.basicConfig(
            level=getattr(logging, self.config.log_level.upper()),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    def _setup_handlers(self):
        """Setup MCP server handlers."""

        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            """Get available tools."""
            logger.debug("Getting available tools")

            if not self._tools_initialized:
                await self._initialize_tools()

            mcp_tools = []
            for tool in self._available_tools:
                try:
                    # Convert LangChain tool to MCP tool
                    mcp_tool = Tool(
                        name=tool.name,
                        description=tool.description,
                        inputSchema=(
                            tool.args_schema.model_json_schema()
                            if tool.args_schema
                            else {}
                        ),
                    )
                    mcp_tools.append(mcp_tool)
                except Exception as e:
                    logger.error(f"Error converting tool {tool.name}: {e}")

            logger.info(f"Returning {len(mcp_tools)} tools")
            return mcp_tools

        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            """Call a tool."""
            logger.debug(f"Calling tool: {name}")

            try:
                # Find the tool
                tool = None
                for t in self._available_tools:
                    if t.name == name:
                        tool = t
                        break

                if tool is None:
                    return [TextContent(type="text", text=f"Tool '{name}' not found")]

                # Call the tool
                if hasattr(tool, "_arun"):
                    # Use async version if available
                    result = await tool._arun(**arguments)
                else:
                    # Fall back to sync version
                    result = tool._run(**arguments)

                # Format the result
                content_text = json.dumps(result, indent=2, default=str)

                return [TextContent(type="text", text=content_text)]

            except Exception as e:
                logger.error(f"Error calling tool {name}: {e}")
                logger.error(traceback.format_exc())

                return [TextContent(type="text", text=f"Error calling tool: {str(e)}")]

        @self.server.list_resources()
        async def list_resources() -> List[Resource]:
            """Get available resources."""
            logger.debug("Getting available resources")

            resources = []

            # Tool registry summary resource
            resources.append(
                Resource(
                    uri="olorin://tools/summary",
                    name="Tool Registry Summary",
                    description="Summary of all available tools organized by category",
                    mimeType="application/json",
                )
            )

            # Configuration resource
            resources.append(
                Resource(
                    uri="olorin://config",
                    name="Server Configuration",
                    description="Current MCP server configuration",
                    mimeType="application/json",
                )
            )

            # Agent capabilities resource (if enabled)
            if self.config.enable_agents:
                resources.append(
                    Resource(
                        uri="olorin://agents/capabilities",
                        name="Agent Capabilities",
                        description="Available LangGraph agent capabilities and models",
                        mimeType="application/json",
                    )
                )

            logger.info(f"Returning {len(resources)} resources")
            return resources

        @self.server.read_resource()
        async def read_resource(uri: str) -> str:
            """Read a resource."""
            logger.debug(f"Reading resource: {uri}")

            try:
                if uri == "olorin://tools/summary":
                    # Return tool registry summary
                    summary = tool_registry.get_tools_summary()
                    return json.dumps(summary, indent=2)

                elif uri == "olorin://config":
                    # Return server configuration
                    config_dict = self.config.model_dump()
                    # Remove sensitive information
                    for key in [
                        "openai_api_key",
                        "langfuse_api_key",
                        "database_connection_string",
                    ]:
                        if key in config_dict:
                            config_dict[key] = "***" if config_dict[key] else None

                    return json.dumps(config_dict, indent=2)

                elif uri == "olorin://agents/capabilities":
                    # Return agent capabilities
                    capabilities = {
                        "enabled": self.config.enable_agents,
                        "models": {
                            "openai_configured": bool(self.config.openai_api_key),
                            "tracing_enabled": bool(self.config.langfuse_api_key),
                        },
                        "agent_types": [
                            "research_agent",
                            "api_integration_agent",
                            "data_analysis_agent",
                            "general_purpose_agent",
                        ],
                    }

                    return json.dumps(capabilities, indent=2)

                else:
                    return f"Resource not found: {uri}"

            except Exception as e:
                logger.error(f"Error reading resource {uri}: {e}")
                return f"Error reading resource: {str(e)}"

    async def _initialize_tools(self):
        """Initialize the tool registry and load tools."""
        if self._tools_initialized:
            return

        try:
            logger.info("Initializing tools...")

            # Initialize tool registry with configuration
            tool_config = self.config.get_tool_config()
            initialize_tools(**tool_config)

            # Get tools for enabled categories
            enabled_categories = self.config.get_enabled_tool_categories()
            logger.info(f"Enabled tool categories: {enabled_categories}")

            self._available_tools = get_tools_for_agent(categories=enabled_categories)

            logger.info(f"Initialized {len(self._available_tools)} tools")
            self._tools_initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize tools: {e}")
            logger.error(traceback.format_exc())
            raise

    async def run(self, transport_uri: str = "stdio://"):
        """Run the MCP server."""
        logger.info(f"Starting {self.config.server_name} on {transport_uri}")

        try:
            if transport_uri == "stdio://":
                # Run with stdio transport, but keep it alive
                from mcp.server.stdio import stdio_server

                while True:  # Keep the server running
                    try:
                        async with stdio_server() as (read_stream, write_stream):
                            await self.server.run(
                                read_stream,
                                write_stream,
                                self.server.create_initialization_options(),
                            )
                    except Exception as loop_error:
                        logger.error(f"Error in stdio server loop: {loop_error}")
                        logger.error("Restarting stdio listener in 5 seconds...")
                        await asyncio.sleep(5)
            else:
                # Handle other transport types if needed
                logger.error(f"Unsupported transport: {transport_uri}")

        except Exception as e:
            logger.error(f"Server error: {e}")
            logger.error(traceback.format_exc())
            raise

    def get_server_info(self) -> Dict[str, Any]:
        """Get server information."""
        return {
            "name": self.config.server_name,
            "version": self.config.server_version,
            "description": self.config.description,
            "tools_initialized": self._tools_initialized,
            "available_tools": len(self._available_tools),
            "enabled_categories": self.config.get_enabled_tool_categories(),
        }
