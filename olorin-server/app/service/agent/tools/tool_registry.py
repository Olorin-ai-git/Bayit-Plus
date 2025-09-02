"""Tool registry for LangGraph agents - centralized access to all available tools."""

import logging
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool

from .api_tool import HTTPRequestTool, JSONAPITool

# Import all available tools
from .database_tool import DatabaseQueryTool, DatabaseSchemaTool
from .file_system_tool import (
    DirectoryListTool,
    FileReadTool,
    FileSearchTool,
    FileWriteTool,
)

# Import Olorin-specific tools
from .splunk_tool import SplunkQueryTool
from .sumologic_tool.sumologic_tool import SumoLogicQueryTool
from .snowflake_tool.snowflake_tool import SnowflakeQueryTool
from .vector_search_tool import VectorSearchTool
from .web_search_tool import WebScrapeTool, WebSearchTool

# Import MCP client tools (connect to external MCP servers)
try:
    from ..mcp_client import blockchain_mcp_client
    MCP_CLIENTS_AVAILABLE = True
except ImportError:
    MCP_CLIENTS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Try to import threat intelligence tools
try:
    # AbuseIPDB tools
    from .threat_intelligence_tool.abuseipdb.simple_ip_reputation_tool import SimpleIPReputationTool
    from .threat_intelligence_tool.abuseipdb.bulk_analysis_tool import BulkIPAnalysisTool
    from .threat_intelligence_tool.abuseipdb.cidr_block_tool import CIDRBlockAnalysisTool
    from .threat_intelligence_tool.abuseipdb.abuse_reporting_tool import AbuseReportingTool
    
    # VirusTotal tools
    from .threat_intelligence_tool.virustotal.ip_analysis_tool import VirusTotalIPAnalysisTool
    from .threat_intelligence_tool.virustotal.domain_analysis_tool import VirusTotalDomainAnalysisTool
    from .threat_intelligence_tool.virustotal.file_analysis_tool import VirusTotalFileAnalysisTool
    from .threat_intelligence_tool.virustotal.url_analysis_tool import VirusTotalURLAnalysisTool
    
    # Shodan tools
    from .threat_intelligence_tool.shodan.infrastructure_analysis_tool import ShodanInfrastructureAnalysisTool
    from .threat_intelligence_tool.shodan.search_tool import ShodanSearchTool
    from .threat_intelligence_tool.shodan.exploit_search_tool import ShodanExploitSearchTool
    
    # Unified threat intelligence tool
    from .threat_intelligence_tool.unified_threat_intelligence_tool import UnifiedThreatIntelligenceTool

    THREAT_INTEL_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Threat intelligence tools not available: {e}")
    THREAT_INTEL_AVAILABLE = False


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
            "olorin": [],  # Olorin-specific tools
            "threat_intelligence": [],  # Threat intelligence tools
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
        """
        Initialize all tools with configuration.

        Args:
            database_connection_string: Database connection string for DB tools
            web_search_user_agent: User agent for web search tools
            file_system_base_path: Base path restriction for file system tools
            api_default_headers: Default headers for API tools
        """
        if self._initialized:
            logger.warning("Tool registry already initialized")
            return

        try:
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
            self._register_tool(
                HTTPRequestTool(default_headers=api_default_headers), "api"
            )
            self._register_tool(JSONAPITool(), "api")

            # Search Tools
            self._register_tool(VectorSearchTool(), "search")

            # Olorin-specific Tools
            try:
                self._register_tool(SplunkQueryTool(), "olorin")
                logger.info("Splunk tool registered")
            except Exception as e:
                logger.warning(f"Failed to register Splunk tool: {e}")

            try:
                self._register_tool(SumoLogicQueryTool(), "olorin")
                logger.info("SumoLogic tool registered")
            except Exception as e:
                logger.warning(f"Failed to register SumoLogic tool: {e}")

            try:
                self._register_tool(SnowflakeQueryTool(), "olorin")
                logger.info("Snowflake tool registered")
            except Exception as e:
                logger.warning(f"Failed to register Snowflake tool: {e}")

            # MCP Client Tools (connect to external MCP servers)
            if MCP_CLIENTS_AVAILABLE:
                try:
                    self._register_tool(blockchain_mcp_client, "mcp_clients")
                    logger.info("Blockchain MCP client registered")
                except Exception as e:
                    logger.warning(f"Failed to register Blockchain MCP client: {e}")
            
            # Threat Intelligence Tools
            if THREAT_INTEL_AVAILABLE:
                # AbuseIPDB tools
                try:
                    self._register_tool(SimpleIPReputationTool(), "threat_intelligence")
                    logger.info("AbuseIPDB IP reputation tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register AbuseIPDB IP reputation tool: {e}")
                
                try:
                    self._register_tool(BulkIPAnalysisTool(), "threat_intelligence")
                    logger.info("AbuseIPDB bulk IP analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register AbuseIPDB bulk IP analysis tool: {e}")
                
                try:
                    self._register_tool(CIDRBlockAnalysisTool(), "threat_intelligence")
                    logger.info("AbuseIPDB CIDR block analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register AbuseIPDB CIDR block analysis tool: {e}")
                
                try:
                    self._register_tool(AbuseReportingTool(), "threat_intelligence")
                    logger.info("AbuseIPDB abuse reporting tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register AbuseIPDB abuse reporting tool: {e}")
                
                # VirusTotal tools
                try:
                    self._register_tool(VirusTotalIPAnalysisTool(), "threat_intelligence")
                    logger.info("VirusTotal IP analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register VirusTotal IP analysis tool: {e}")
                
                try:
                    self._register_tool(VirusTotalDomainAnalysisTool(), "threat_intelligence")
                    logger.info("VirusTotal domain analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register VirusTotal domain analysis tool: {e}")
                
                try:
                    self._register_tool(VirusTotalFileAnalysisTool(), "threat_intelligence")
                    logger.info("VirusTotal file analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register VirusTotal file analysis tool: {e}")
                
                try:
                    self._register_tool(VirusTotalURLAnalysisTool(), "threat_intelligence")
                    logger.info("VirusTotal URL analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register VirusTotal URL analysis tool: {e}")
                
                # Shodan tools
                try:
                    self._register_tool(ShodanInfrastructureAnalysisTool(), "threat_intelligence")
                    logger.info("Shodan infrastructure analysis tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register Shodan infrastructure analysis tool: {e}")
                
                try:
                    self._register_tool(ShodanSearchTool(), "threat_intelligence")
                    logger.info("Shodan search tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register Shodan search tool: {e}")
                
                try:
                    self._register_tool(ShodanExploitSearchTool(), "threat_intelligence")
                    logger.info("Shodan exploit search tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register Shodan exploit search tool: {e}")
                
                # Unified threat intelligence tool
                try:
                    self._register_tool(UnifiedThreatIntelligenceTool(), "threat_intelligence")
                    logger.info("Unified threat intelligence tool registered")
                except Exception as e:
                    logger.warning(f"Failed to register unified threat intelligence tool: {e}")

            self._initialized = True
            logger.info(f"Tool registry initialized with {len(self._tools)} tools")

        except Exception as e:
            logger.error(f"Failed to initialize tool registry: {e}")
            raise

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


def get_tools_for_agent(
    categories: Optional[List[str]] = None, tool_names: Optional[List[str]] = None
) -> List[BaseTool]:
    """
    Get tools for a LangGraph agent.

    Args:
        categories: List of tool categories to include
        tool_names: Specific tool names to include

    Returns:
        List of BaseTool instances
    """
    if not tool_registry.is_initialized():
        logger.warning("Tool registry not initialized. Call initialize() first.")
        return []

    tools = []

    if tool_names:
        # Get specific tools by name
        for name in tool_names:
            tool = tool_registry.get_tool(name)
            if tool:
                tools.append(tool)
            else:
                logger.warning(f"Tool '{name}' not found in registry")

    if categories:
        # Get tools by category
        for category in categories:
            category_tools = tool_registry.get_tools_by_category(category)
            tools.extend(category_tools)

    # Remove duplicates while preserving order
    seen = set()
    unique_tools = []
    for tool in tools:
        if tool.name not in seen:
            seen.add(tool.name)
            unique_tools.append(tool)

    return unique_tools


def initialize_tools(
    database_connection_string: Optional[str] = None,
    web_search_user_agent: Optional[str] = None,
    file_system_base_path: Optional[str] = None,
    api_default_headers: Optional[Dict[str, str]] = None,
) -> None:
    """
    Initialize the global tool registry.

    Args:
        database_connection_string: Database connection string for DB tools
        web_search_user_agent: User agent for web search tools
        file_system_base_path: Base path restriction for file system tools
        api_default_headers: Default headers for API tools
    """
    tool_registry.initialize(
        database_connection_string=database_connection_string,
        web_search_user_agent=web_search_user_agent,
        file_system_base_path=file_system_base_path,
        api_default_headers=api_default_headers,
    )


# Convenience functions for getting specific tool sets
def get_database_tools() -> List[BaseTool]:
    """Get all database tools."""
    return tool_registry.get_tools_by_category("database")


def get_web_tools() -> List[BaseTool]:
    """Get all web-related tools."""
    return tool_registry.get_tools_by_category("web")


def get_file_system_tools() -> List[BaseTool]:
    """Get all file system tools."""
    return tool_registry.get_tools_by_category("file_system")


def get_api_tools() -> List[BaseTool]:
    """Get all API tools."""
    return tool_registry.get_tools_by_category("api")


def get_search_tools() -> List[BaseTool]:
    """Get all search tools."""
    return tool_registry.get_tools_by_category("search")


def get_olorin_tools() -> List[BaseTool]:
    """Get Olorin-specific tools (Splunk, SumoLogic, Snowflake)."""
    return tool_registry.get_tools_by_category("olorin")


def get_threat_intelligence_tools() -> List[BaseTool]:
    """Get threat intelligence tools (AbuseIPDB, VirusTotal, unified aggregator, etc.)."""
    return tool_registry.get_tools_by_category("threat_intelligence")


def get_mcp_client_tools() -> List[BaseTool]:
    """Get MCP client tools that connect to external MCP servers."""
    return tool_registry.get_tools_by_category("mcp_clients")


def get_essential_tools() -> List[BaseTool]:
    """Get a curated set of essential tools for most agents."""
    return get_tools_for_agent(
        tool_names=[
            "web_search",
            "web_scrape",
            "file_read",
            "directory_list",
            "http_request",
        ]
    )
