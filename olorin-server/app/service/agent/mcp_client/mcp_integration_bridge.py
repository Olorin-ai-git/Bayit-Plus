"""
MCP Integration Bridge

This module provides a bridge between the existing agent system and the enhanced
MCP infrastructure, allowing seamless integration without breaking existing code.
"""

import asyncio
from enum import Enum
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .enhanced_mcp_client import (
    EnhancedMCPClient,
    MCPResponse,
    MCPServerEndpoint,
    get_enhanced_mcp_client,
)
from .mcp_client_manager import MCPClientManager, MCPServerCategory

logger = get_bridge_logger(__name__)


class MCPIntegrationBridge:
    """
    Bridge between existing agent system and enhanced MCP infrastructure.

    This class provides:
    - Backward compatibility with existing MCP client manager
    - Seamless integration of enhanced features (caching, circuit breakers, etc.)
    - Gradual migration path for existing agents
    - Unified interface for MCP operations
    """

    def __init__(self):
        self._enhanced_client: Optional[EnhancedMCPClient] = None
        self._legacy_manager = MCPClientManager()
        self._migration_enabled = True
        self._server_mapping: Dict[str, str] = {}  # legacy -> enhanced mapping

    async def initialize(self):
        """Initialize the bridge and enhanced client."""
        if not self._enhanced_client:
            self._enhanced_client = await get_enhanced_mcp_client()
            await self._migrate_legacy_servers()
            logger.info("MCP Integration Bridge initialized")

    async def _migrate_legacy_servers(self):
        """Migrate servers from legacy manager to enhanced client."""
        if not self._enhanced_client:
            return

        logger.info("Migrating legacy MCP server configurations...")

        # Migrate each legacy server to enhanced format
        for server_name, legacy_config in self._legacy_manager.servers.items():
            if not legacy_config.enabled:
                continue

            try:
                # Convert legacy config to enhanced endpoint
                enhanced_endpoint = MCPServerEndpoint(
                    name=server_name,
                    url=legacy_config.endpoint,
                    transport_type="http",  # Default to HTTP
                    timeout=legacy_config.timeout,
                    max_retries=legacy_config.retry_count,
                    api_key=legacy_config.api_key,
                    priority=self._get_priority_for_category(legacy_config.category),
                    enabled=legacy_config.enabled,
                    health_check_interval=60,  # Default health check interval
                    circuit_breaker_threshold=5,  # Default circuit breaker threshold
                )

                self._enhanced_client.register_server(enhanced_endpoint)
                self._server_mapping[server_name] = server_name

                logger.info(
                    f"Migrated MCP server: {server_name} ({legacy_config.category.value})"
                )

            except Exception as e:
                logger.error(f"Failed to migrate MCP server {server_name}: {e}")

        logger.info(f"Migration complete: {len(self._server_mapping)} servers migrated")

    def _get_priority_for_category(self, category: MCPServerCategory) -> int:
        """Get priority based on server category."""
        priority_map = {
            MCPServerCategory.BLOCKCHAIN: 1,  # High priority for blockchain analysis
            MCPServerCategory.INTELLIGENCE: 2,  # High priority for threat intel
            MCPServerCategory.ML_AI: 1,  # High priority for ML models
            MCPServerCategory.COMPLIANCE: 3,  # Medium priority for compliance
            MCPServerCategory.COMMUNICATION: 4,  # Lower priority for communication
        }
        return priority_map.get(category, 5)  # Default to lowest priority

    async def invoke_tool(
        self,
        server_name: str,
        tool_name: str,
        params: Dict[str, Any],
        use_cache: bool = True,
        cache_ttl: Optional[int] = None,
    ) -> Optional[MCPResponse]:
        """
        Invoke a tool on an MCP server using enhanced infrastructure.

        This method provides backward compatibility while leveraging enhanced features.
        """
        if not self._enhanced_client:
            await self.initialize()

        if not self._enhanced_client:
            logger.error("Enhanced MCP client not available")
            return None

        # Map legacy server name to enhanced server name if needed
        enhanced_server_name = self._server_mapping.get(server_name, server_name)

        try:
            # Use enhanced client for improved reliability and features
            response = await self._enhanced_client.call(
                server_name=enhanced_server_name,
                method=tool_name,
                params=params,
                use_cache=use_cache,
                cache_ttl=cache_ttl,
            )

            logger.debug(f"MCP tool invocation successful: {server_name}.{tool_name}")
            return response

        except Exception as e:
            logger.error(f"MCP tool invocation failed: {server_name}.{tool_name}: {e}")
            return MCPResponse(
                success=False, data=None, error=str(e), server_name=server_name
            )

    async def get_server_health(self, server_name: str) -> Dict[str, Any]:
        """Get health status for a server."""
        if not self._enhanced_client:
            await self.initialize()

        if not self._enhanced_client:
            return {"status": "unknown", "error": "Enhanced client not available"}

        enhanced_server_name = self._server_mapping.get(server_name, server_name)
        return await self._enhanced_client.get_server_health(enhanced_server_name)

    async def get_system_status(self) -> Dict[str, Any]:
        """Get overall MCP system status."""
        if not self._enhanced_client:
            await self.initialize()

        if not self._enhanced_client:
            return {"status": "error", "error": "Enhanced client not available"}

        return await self._enhanced_client.get_system_status()

    def get_available_servers(
        self, category: Optional[MCPServerCategory] = None
    ) -> List[str]:
        """Get list of available servers, optionally filtered by category."""
        if not self._enhanced_client:
            # Fallback to legacy manager for immediate response
            return self._legacy_manager.get_available_servers(category)

        # Filter servers by category if specified
        available_servers = []

        for server_name in self._enhanced_client.list_servers():
            # Check if server matches category filter
            if category is None:
                available_servers.append(server_name)
            else:
                # Find original server config to check category
                for legacy_name, legacy_config in self._legacy_manager.servers.items():
                    if self._server_mapping.get(legacy_name) == server_name:
                        if legacy_config.category == category:
                            available_servers.append(server_name)
                        break

        return available_servers

    async def invalidate_cache(self, server_name: str, tool_name: Optional[str] = None):
        """Invalidate cache for a server or specific tool."""
        if not self._enhanced_client:
            await self.initialize()

        if not self._enhanced_client:
            logger.warning("Cannot invalidate cache: Enhanced client not available")
            return

        enhanced_server_name = self._server_mapping.get(server_name, server_name)

        try:
            # Use the cache invalidation from enhanced client
            if tool_name:
                await self._enhanced_client.cache.invalidate(
                    enhanced_server_name,
                    tool_name,
                    {},  # Empty params invalidates all variants
                )
            else:
                await self._enhanced_client.cache.invalidate(enhanced_server_name)

            logger.info(
                f"Cache invalidated for {server_name}"
                + (f".{tool_name}" if tool_name else "")
            )

        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")

    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics from the enhanced infrastructure."""
        if not self._enhanced_client:
            await self.initialize()

        if not self._enhanced_client:
            return {"status": "unavailable"}

        try:
            system_status = await self._enhanced_client.get_system_status()

            # Extract key metrics
            metrics = {
                "total_servers": system_status.get("total_servers", 0),
                "enabled_servers": system_status.get("enabled_servers", 0),
                "connection_pool": system_status.get("connection_pool", {}),
                "cache": system_status.get("cache", {}),
                "servers": {},
            }

            # Add per-server metrics
            for server_name, server_health in system_status.get("servers", {}).items():
                metrics["servers"][server_name] = {
                    "health_score": server_health.get("health_score", 0),
                    "circuit_breaker_state": server_health.get(
                        "circuit_breaker_state", "unknown"
                    ),
                    "total_requests": server_health.get("metrics", {}).get(
                        "requests", 0
                    ),
                    "success_rate": (
                        server_health.get("metrics", {}).get("successes", 0)
                        / max(server_health.get("metrics", {}).get("requests", 1), 1)
                        * 100
                    ),
                    "avg_response_time": server_health.get("metrics", {}).get(
                        "avg_response_time", 0
                    ),
                }

            return metrics

        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {"status": "error", "error": str(e)}

    def is_enhanced_mode_enabled(self) -> bool:
        """Check if enhanced mode is enabled."""
        return self._migration_enabled and self._enhanced_client is not None

    async def enable_enhanced_mode(self):
        """Enable enhanced mode with full feature set."""
        self._migration_enabled = True
        if not self._enhanced_client:
            await self.initialize()
        logger.info("Enhanced MCP mode enabled")

    async def disable_enhanced_mode(self):
        """Disable enhanced mode (fallback to legacy)."""
        self._migration_enabled = False
        if self._enhanced_client:
            await self._enhanced_client.shutdown()
            self._enhanced_client = None
        logger.info("Enhanced MCP mode disabled - using legacy mode")


# Global bridge instance
_mcp_integration_bridge: Optional[MCPIntegrationBridge] = None


async def get_mcp_integration_bridge() -> MCPIntegrationBridge:
    """Get the global MCP integration bridge instance."""
    global _mcp_integration_bridge

    if _mcp_integration_bridge is None:
        _mcp_integration_bridge = MCPIntegrationBridge()
        await _mcp_integration_bridge.initialize()

    return _mcp_integration_bridge


async def shutdown_mcp_integration_bridge():
    """Shutdown the global MCP integration bridge."""
    global _mcp_integration_bridge

    if _mcp_integration_bridge and _mcp_integration_bridge._enhanced_client:
        await _mcp_integration_bridge._enhanced_client.shutdown()
        _mcp_integration_bridge = None
        logger.info("MCP integration bridge shutdown")
