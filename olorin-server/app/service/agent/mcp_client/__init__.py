"""
MCP Client Infrastructure for Olorin.

This package contains MCP clients that allow Olorin to connect to external
MCP servers for specialized fraud detection capabilities. All clients are
implemented as LangChain tools for seamless integration with Olorin's agents.
"""

from .blockchain_client import blockchain_mcp_client
from .intelligence_client import intelligence_mcp_client
from .mcp_client_manager import MCPClientManager, mcp_client_manager
from .ml_ai_client import ml_ai_mcp_client

__all__ = [
    "MCPClientManager",
    "mcp_client_manager",
    "blockchain_mcp_client",
    "intelligence_mcp_client",
    "ml_ai_mcp_client",
]