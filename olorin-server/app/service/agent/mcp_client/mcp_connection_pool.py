"""MCP Connection Pool with health monitoring and failover."""

import asyncio
import time
from typing import Dict, List, Optional, Any, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
import json
from contextlib import asynccontextmanager

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.mcp_resilience_patterns import MCPResilienceManager

logger = get_bridge_logger(__name__)


class ConnectionState(Enum):
    """Connection state enumeration."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CONNECTING = "connecting"
    DISCONNECTED = "disconnected"


@dataclass
class MCPConnection:
    """Represents a connection to an MCP server."""
    server_name: str
    endpoint: str
    connection: Optional[Any] = None
    state: ConnectionState = ConnectionState.DISCONNECTED
    last_health_check: float = field(default_factory=time.time)
    consecutive_failures: int = 0
    total_requests: int = 0
    successful_requests: int = 0
    last_error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_used: float = field(default_factory=time.time)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate for this connection."""
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests
    
    @property
    def is_healthy(self) -> bool:
        """Check if connection is healthy."""
        return (
            self.state == ConnectionState.HEALTHY and
            self.consecutive_failures < 3 and
            self.success_rate > 0.8
        )


class MCPConnectionPool:
    """Advanced connection pool for MCP servers with health monitoring."""
    
    def __init__(
        self,
        max_connections_per_server: int = 10,
        min_connections_per_server: int = 2,
        connection_timeout: float = 30.0,
        health_check_interval: float = 60.0
    ):
        """Initialize connection pool."""
        self.max_connections = max_connections_per_server
        self.min_connections = min_connections_per_server
        self.connection_timeout = connection_timeout
        self.health_check_interval = health_check_interval
        
        self.connections: Dict[str, List[MCPConnection]] = {}
        self.server_configs: Dict[str, Dict[str, Any]] = {}
        self.resilience_manager = MCPResilienceManager()
        self._health_check_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        
    async def initialize(self) -> None:
        """Initialize connection pool and start health monitoring."""
        logger.info("Initializing MCP connection pool")
        
        # Start health check task
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        
    async def shutdown(self) -> None:
        """Shutdown connection pool and cleanup resources."""
        logger.info("Shutting down MCP connection pool")
        
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close all connections
        for server_connections in self.connections.values():
            for conn in server_connections:
                await self._close_connection(conn)
        
        self.connections.clear()
    
    def register_server(
        self,
        server_name: str,
        endpoint: str,
        **config
    ) -> None:
        """Register an MCP server with the pool."""
        logger.info(f"Registering MCP server: {server_name}")
        
        self.server_configs[server_name] = {
            'endpoint': endpoint,
            **config
        }
        
        # Register with resilience manager
        self.resilience_manager.register_server(server_name, **config)
        
        # Initialize connection list
        if server_name not in self.connections:
            self.connections[server_name] = []
    
    @asynccontextmanager
    async def get_connection(self, server_name: str) -> AsyncIterator[MCPConnection]:
        """Get a connection from the pool with automatic cleanup."""
        if server_name not in self.server_configs:
            raise ValueError(f"Unknown MCP server: {server_name}")
        
        connection = await self._acquire_connection(server_name)
        try:
            connection.last_used = time.time()
            yield connection
        finally:
            await self._release_connection(connection)
    
    async def _acquire_connection(self, server_name: str) -> MCPConnection:
        """Acquire a connection from the pool."""
        async with self._lock:
            server_connections = self.connections[server_name]
            
            # Find healthy connection
            for conn in server_connections:
                if conn.is_healthy and conn.state != ConnectionState.CONNECTING:
                    return conn
            
            # Try to create new connection if under limit
            if len(server_connections) < self.max_connections:
                return await self._create_connection(server_name)
            
            # Find least recently used connection
            if server_connections:
                lru_conn = min(server_connections, key=lambda c: c.last_used)
                if lru_conn.state != ConnectionState.CONNECTING:
                    await self._reset_connection(lru_conn)
                    return lru_conn
            
            raise RuntimeError(f"No available connections for {server_name}")
    
    async def _create_connection(self, server_name: str) -> MCPConnection:
        """Create a new connection to MCP server."""
        config = self.server_configs[server_name]
        endpoint = config['endpoint']
        
        logger.debug(f"Creating new connection to {server_name}")
        
        connection = MCPConnection(
            server_name=server_name,
            endpoint=endpoint,
            state=ConnectionState.CONNECTING
        )
        
        try:
            # TODO: Implement actual MCP connection logic here
            # This would use the MCP protocol to establish connection
            connection.connection = await self._establish_mcp_connection(config)
            connection.state = ConnectionState.HEALTHY
            
            self.connections[server_name].append(connection)
            
            logger.info(f"Created connection to {server_name}")
            return connection
            
        except Exception as e:
            connection.state = ConnectionState.UNHEALTHY
            connection.last_error = str(e)
            logger.error(f"Failed to create connection to {server_name}: {e}")
            raise
    
    async def _establish_mcp_connection(self, config: Dict[str, Any]) -> Any:
        """Establish actual MCP connection."""
        # TODO: Implement MCP protocol connection
        # This is a placeholder for the actual MCP connection logic
        await asyncio.sleep(0.1)  # Simulate connection time
        return {"mock_connection": True, "endpoint": config['endpoint']}
    
    async def _reset_connection(self, connection: MCPConnection) -> None:
        """Reset an existing connection."""
        logger.debug(f"Resetting connection to {connection.server_name}")
        
        try:
            await self._close_connection(connection)
            config = self.server_configs[connection.server_name]
            connection.connection = await self._establish_mcp_connection(config)
            connection.state = ConnectionState.HEALTHY
            connection.consecutive_failures = 0
            connection.last_error = None
            
        except Exception as e:
            connection.state = ConnectionState.UNHEALTHY
            connection.last_error = str(e)
            connection.consecutive_failures += 1
            logger.error(f"Failed to reset connection to {connection.server_name}: {e}")
    
    async def _close_connection(self, connection: MCPConnection) -> None:
        """Close a connection."""
        if connection.connection:
            try:
                # TODO: Implement proper MCP connection cleanup
                connection.connection = None
            except Exception as e:
                logger.warning(f"Error closing connection to {connection.server_name}: {e}")
        
        connection.state = ConnectionState.DISCONNECTED
    
    async def _release_connection(self, connection: MCPConnection) -> None:
        """Release a connection back to the pool."""
        # Connection is returned to pool automatically
        # Health status updated during health checks
        pass
    
    async def _health_check_loop(self) -> None:
        """Background task for health checking connections."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._perform_health_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
    
    async def _perform_health_checks(self) -> None:
        """Perform health checks on all connections."""
        logger.debug("Performing health checks on MCP connections")
        
        for server_name, server_connections in self.connections.items():
            for connection in server_connections.copy():  # Copy to avoid modification during iteration
                await self._health_check_connection(connection)
    
    async def _health_check_connection(self, connection: MCPConnection) -> None:
        """Perform health check on single connection."""
        if time.time() - connection.last_health_check < self.health_check_interval:
            return
        
        try:
            # TODO: Implement actual MCP health check
            # This would ping the MCP server to verify it's responsive
            health_result = await self._ping_mcp_server(connection)
            
            if health_result:
                if connection.state == ConnectionState.UNHEALTHY:
                    connection.state = ConnectionState.HEALTHY
                    logger.info(f"Connection to {connection.server_name} recovered")
                connection.consecutive_failures = 0
            else:
                connection.consecutive_failures += 1
                if connection.consecutive_failures >= 3:
                    connection.state = ConnectionState.UNHEALTHY
                    logger.warning(f"Connection to {connection.server_name} marked unhealthy")
            
            connection.last_health_check = time.time()
            
        except Exception as e:
            connection.consecutive_failures += 1
            connection.last_error = str(e)
            if connection.consecutive_failures >= 3:
                connection.state = ConnectionState.UNHEALTHY
            logger.error(f"Health check failed for {connection.server_name}: {e}")
    
    async def _ping_mcp_server(self, connection: MCPConnection) -> bool:
        """Ping MCP server to check health."""
        try:
            # TODO: Implement actual MCP ping
            # This would send a ping message to verify server responsiveness
            await asyncio.sleep(0.01)  # Simulate ping time
            return True
        except Exception:
            return False
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        stats = {
            'servers': {},
            'total_connections': 0,
            'healthy_connections': 0,
            'unhealthy_connections': 0
        }
        
        for server_name, connections in self.connections.items():
            server_stats = {
                'total_connections': len(connections),
                'healthy': len([c for c in connections if c.is_healthy]),
                'unhealthy': len([c for c in connections if not c.is_healthy]),
                'average_success_rate': sum(c.success_rate for c in connections) / len(connections) if connections else 0,
                'connections': []
            }
            
            for conn in connections:
                server_stats['connections'].append({
                    'state': conn.state.value,
                    'success_rate': conn.success_rate,
                    'total_requests': conn.total_requests,
                    'consecutive_failures': conn.consecutive_failures,
                    'last_error': conn.last_error,
                    'age_seconds': time.time() - conn.created_at
                })
            
            stats['servers'][server_name] = server_stats
            stats['total_connections'] += server_stats['total_connections']
            stats['healthy_connections'] += server_stats['healthy']
            stats['unhealthy_connections'] += server_stats['unhealthy']
        
        return stats


# Global connection pool instance
mcp_connection_pool = MCPConnectionPool()