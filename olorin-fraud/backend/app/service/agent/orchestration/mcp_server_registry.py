"""
MCP Server Registry - Dynamic registration and discovery of MCP servers.

This module provides a centralized registry for MCP servers, enabling dynamic
discovery, capability advertisement, and health monitoring.
"""

import asyncio
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set

import aiohttp
import psutil
from langchain_core.tools import BaseTool

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ServerStatus(Enum):
    """MCP server status states."""

    UNKNOWN = "unknown"
    REGISTERING = "registering"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"


@dataclass
class ServerCapability:
    """Represents a capability provided by an MCP server."""

    name: str
    description: str
    category: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    performance_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class MCPServerInfo:
    """Information about a registered MCP server."""

    name: str
    transport: str
    endpoint: str
    capabilities: List[ServerCapability]
    status: ServerStatus = ServerStatus.UNKNOWN
    registered_at: datetime = field(default_factory=datetime.now)
    last_health_check: Optional[datetime] = None
    health_check_failures: int = 0
    tools: List[BaseTool] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class MCPDiscoveryService:
    """Service for discovering MCP servers and their capabilities."""

    def __init__(self):
        self.discovery_methods = []
        self.discovered_servers = {}

    async def discover_servers(self) -> Dict[str, MCPServerInfo]:
        """
        Discover available MCP servers.

        Returns:
            Dictionary of discovered servers
        """
        servers = {}

        # Static discovery from configuration
        servers.update(await self._discover_from_config())

        # Dynamic discovery via broadcast
        servers.update(await self._discover_via_broadcast())

        # Service registry discovery
        servers.update(await self._discover_from_registry())

        self.discovered_servers = servers
        return servers

    async def _discover_from_config(self) -> Dict[str, MCPServerInfo]:
        """Discover servers from static configuration."""
        # Load from configuration file or environment
        return {}

    async def _discover_via_broadcast(self) -> Dict[str, MCPServerInfo]:
        """Discover servers via network broadcast."""
        # Implement network discovery protocol
        return {}

    async def _discover_from_registry(self) -> Dict[str, MCPServerInfo]:
        """Discover servers from a service registry."""
        # Query service registry (e.g., Consul, etcd)
        return {}


class MCPServerRegistry:
    """
    Centralized registry for MCP servers.

    This class manages registration, discovery, and health monitoring
    of MCP servers in the fraud investigation system.
    """

    def __init__(self):
        """Initialize the MCP server registry."""
        self.servers: Dict[str, MCPServerInfo] = {}
        self.capabilities_index: Dict[str, List[str]] = (
            {}
        )  # capability -> [server_names]
        self.discovery_service = MCPDiscoveryService()
        self.health_check_interval = 30  # seconds
        self.health_check_timeout = 10  # seconds
        self.max_health_failures = 3
        self._health_check_task = None

    async def initialize(self):
        """Initialize the registry and start background tasks."""
        # Discover initial servers
        await self.discover_servers()

        # Start health monitoring
        self._health_check_task = asyncio.create_task(self._health_monitor_loop())

        logger.info(f"Initialized MCP server registry with {len(self.servers)} servers")

    async def shutdown(self):
        """Shutdown the registry and cleanup resources."""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass

    def register_server(self, server_info: MCPServerInfo) -> bool:
        """
        Register a new MCP server.

        Args:
            server_info: Information about the server to register

        Returns:
            True if registration successful, False otherwise
        """
        try:
            server_name = server_info.name

            # Update server info
            self.servers[server_name] = server_info
            server_info.status = ServerStatus.REGISTERING

            # Index capabilities
            for capability in server_info.capabilities:
                if capability.name not in self.capabilities_index:
                    self.capabilities_index[capability.name] = []
                if server_name not in self.capabilities_index[capability.name]:
                    self.capabilities_index[capability.name].append(server_name)

            logger.info(
                f"Registered MCP server: {server_name} with {len(server_info.capabilities)} capabilities"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to register server {server_info.name}: {e}")
            return False

    def unregister_server(self, server_name: str) -> bool:
        """
        Unregister an MCP server.

        Args:
            server_name: Name of the server to unregister

        Returns:
            True if unregistration successful, False otherwise
        """
        try:
            if server_name not in self.servers:
                return False

            server_info = self.servers[server_name]

            # Remove from capabilities index
            for capability in server_info.capabilities:
                if capability.name in self.capabilities_index:
                    self.capabilities_index[capability.name] = [
                        s
                        for s in self.capabilities_index[capability.name]
                        if s != server_name
                    ]

            # Remove server
            del self.servers[server_name]

            logger.info(f"Unregistered MCP server: {server_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to unregister server {server_name}: {e}")
            return False

    async def discover_servers(self) -> Dict[str, MCPServerInfo]:
        """
        Discover and register available MCP servers.

        Returns:
            Dictionary of discovered servers
        """
        discovered = await self.discovery_service.discover_servers()

        for server_name, server_info in discovered.items():
            if server_name not in self.servers:
                self.register_server(server_info)

        return discovered

    def get_server(self, server_name: str) -> Optional[MCPServerInfo]:
        """
        Get information about a specific server.

        Args:
            server_name: Name of the server

        Returns:
            Server information if found, None otherwise
        """
        return self.servers.get(server_name)

    def get_servers_by_capability(self, capability_name: str) -> List[MCPServerInfo]:
        """
        Get all servers that provide a specific capability.

        Args:
            capability_name: Name of the capability

        Returns:
            List of servers providing the capability
        """
        server_names = self.capabilities_index.get(capability_name, [])
        return [self.servers[name] for name in server_names if name in self.servers]

    def get_healthy_servers(self) -> List[MCPServerInfo]:
        """
        Get all healthy servers.

        Returns:
            List of healthy servers
        """
        return [
            server
            for server in self.servers.values()
            if server.status == ServerStatus.HEALTHY
        ]

    def get_capabilities(self) -> Set[str]:
        """
        Get all available capabilities across all servers.

        Returns:
            Set of capability names
        """
        return set(self.capabilities_index.keys())

    def update_server_process_info(
        self, server_name: str, pid: int, process_name: str = None
    ) -> bool:
        """
        Update process information for a server to enable health monitoring.

        Args:
            server_name: Name of the server
            pid: Process ID
            process_name: Optional process name override

        Returns:
            True if update successful, False otherwise
        """
        if server_name not in self.servers:
            return False

        server = self.servers[server_name]
        if "process" not in server.metadata:
            server.metadata["process"] = {}

        server.metadata["process"].update(
            {
                "pid": pid,
                "name": process_name or server_name,
                "started_at": datetime.now().isoformat(),
            }
        )

        logger.info(f"Updated process info for {server_name}: PID {pid}")
        return True

    async def check_server_health(self, server_name: str) -> bool:
        """
        Check health of a specific server.

        Args:
            server_name: Name of the server to check

        Returns:
            True if server is healthy, False otherwise
        """
        if server_name not in self.servers:
            return False

        server = self.servers[server_name]

        try:
            # Implement health check based on transport type
            if server.transport == "stdio":
                # Check process is running
                healthy = await self._check_stdio_health(server)
            elif server.transport == "streamable_http":
                # HTTP health endpoint
                healthy = await self._check_http_health(server)
            else:
                healthy = False

            # Update server status
            if healthy:
                server.status = ServerStatus.HEALTHY
                server.health_check_failures = 0
            else:
                server.health_check_failures += 1
                if server.health_check_failures >= self.max_health_failures:
                    server.status = ServerStatus.UNHEALTHY
                else:
                    server.status = ServerStatus.DEGRADED

            server.last_health_check = datetime.now()
            return healthy

        except Exception as e:
            logger.error(f"Health check failed for {server_name}: {e}")
            server.status = ServerStatus.UNHEALTHY
            return False

    async def _check_stdio_health(self, server: MCPServerInfo) -> bool:
        """Check health of stdio transport server."""
        try:
            # Extract process info from server metadata or endpoint
            process_info = server.metadata.get("process", {})
            pid = process_info.get("pid")
            process_name = process_info.get("name", server.name)

            # Check if specific PID is running
            if pid:
                try:
                    process = psutil.Process(pid)
                    return (
                        process.is_running()
                        and process.status() != psutil.STATUS_ZOMBIE
                    )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return False

            # Fallback: Check if any process with the server name is running
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    if process_name.lower() in proc.info["name"].lower():
                        return True
                    # Check command line for server name
                    if proc.info["cmdline"]:
                        cmdline_str = " ".join(proc.info["cmdline"]).lower()
                        if process_name.lower() in cmdline_str:
                            return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            # If no specific process check, assume healthy for now
            return True

        except Exception as e:
            logger.warning(f"Error checking stdio health for {server.name}: {e}")
            return False

    async def _check_http_health(self, server: MCPServerInfo) -> bool:
        """Check health of HTTP transport server."""
        try:
            # Extract health endpoint from server metadata or construct default
            health_endpoint = server.metadata.get("health_endpoint")

            if not health_endpoint:
                # Construct default health endpoint
                base_url = server.endpoint.rstrip("/")
                health_endpoint = f"{base_url}/health"

            # Perform HTTP health check with timeout
            timeout = aiohttp.ClientTimeout(total=self.health_check_timeout)

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(health_endpoint) as response:
                    # Consider 2xx responses as healthy
                    if 200 <= response.status < 300:
                        # Try to parse response for additional health info
                        try:
                            health_data = await response.json()
                            if isinstance(health_data, dict):
                                # Update performance metrics if available
                                if "metrics" in health_data:
                                    server.metadata["last_health_metrics"] = (
                                        health_data["metrics"]
                                    )
                                # Check for explicit health status
                                if health_data.get("status") == "unhealthy":
                                    return False
                        except Exception:
                            pass  # Ignore JSON parsing errors, status code is primary indicator

                        return True
                    else:
                        logger.warning(
                            f"HTTP health check failed for {server.name}: {response.status}"
                        )
                        return False

        except asyncio.TimeoutError:
            logger.warning(f"HTTP health check timeout for {server.name}")
            return False
        except aiohttp.ClientError as e:
            logger.warning(f"HTTP health check error for {server.name}: {e}")
            return False
        except Exception as e:
            logger.error(
                f"Unexpected error in HTTP health check for {server.name}: {e}"
            )
            return False

    async def _health_monitor_loop(self):
        """Background task for monitoring server health."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)

                # Check health of all servers
                tasks = [
                    self.check_server_health(server_name)
                    for server_name in self.servers.keys()
                ]

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health monitor error: {e}")

    def get_registry_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the registry.

        Returns:
            Dictionary of registry statistics
        """
        total_servers = len(self.servers)
        healthy_servers = len(self.get_healthy_servers())
        total_capabilities = len(self.get_capabilities())

        status_counts = {}
        for server in self.servers.values():
            status = server.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_servers": total_servers,
            "healthy_servers": healthy_servers,
            "total_capabilities": total_capabilities,
            "status_breakdown": status_counts,
            "capabilities": list(self.get_capabilities()),
        }


# Global registry instance
_registry = None


def get_mcp_server_registry() -> MCPServerRegistry:
    """
    Get the global MCP server registry instance.

    Returns:
        The global MCPServerRegistry instance
    """
    global _registry
    if _registry is None:
        _registry = MCPServerRegistry()
    return _registry


async def initialize_registry():
    """Initialize the global MCP server registry."""
    registry = get_mcp_server_registry()
    await registry.initialize()


async def shutdown_registry():
    """Shutdown the global MCP server registry."""
    registry = get_mcp_server_registry()
    await registry.shutdown()
