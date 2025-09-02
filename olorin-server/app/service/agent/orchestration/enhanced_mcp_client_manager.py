"""Enhanced MCP Client Manager with resilience patterns and intelligent routing."""

import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Set, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque

import httpx
from .mcp_resilience_patterns import MCPResilienceManager

logger = logging.getLogger(__name__)


class MCPServerCategory(Enum):
    """MCP server categories for intelligent routing."""
    BLOCKCHAIN = "blockchain"
    INTELLIGENCE = "intelligence"
    ML_AI = "ml_ai"
    COMMUNICATION = "communication"
    COMPLIANCE = "compliance"
    LEGACY = "legacy"


class ConnectionStatus(Enum):
    """Connection status for MCP servers."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    RECOVERING = "recovering"


@dataclass
class MCPServerInfo:
    """Information about an MCP server."""
    name: str
    category: MCPServerCategory
    endpoint: str
    capabilities: Set[str] = field(default_factory=set)
    weight: float = 1.0
    max_connections: int = 10
    timeout: float = 30.0
    retry_count: int = 3
    
    # Health metrics
    status: ConnectionStatus = ConnectionStatus.HEALTHY
    last_health_check: float = field(default_factory=time.time)
    success_rate: float = 1.0
    avg_response_time: float = 0.0
    active_connections: int = 0
    
    # Circuit breaker state
    circuit_breaker_open: bool = False
    last_circuit_break: float = 0.0


@dataclass
class RoutingPolicy:
    """Routing policy for MCP server selection."""
    strategy: str = "capability_based"  # capability_based, round_robin, least_loaded
    prefer_local: bool = True
    max_retry_attempts: int = 3
    fallback_enabled: bool = True
    health_check_interval: float = 60.0


class EnhancedMCPClientManager:
    """Enhanced MCP client manager with resilience patterns and intelligent routing."""

    def __init__(self, routing_policy: Optional[RoutingPolicy] = None):
        """Initialize the enhanced MCP client manager."""
        self.routing_policy = routing_policy or RoutingPolicy()
        self.servers: Dict[str, MCPServerInfo] = {}
        self.category_mapping: Dict[MCPServerCategory, List[str]] = defaultdict(list)
        
        # Connection pools and resilience patterns per server
        self.connection_pools: Dict[str, httpx.AsyncClient] = {}
        self.resilience_manager = MCPResilienceManager()
        
        # Health monitoring
        self.health_check_task: Optional[asyncio.Task] = None
        self.request_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # Performance metrics
        self.metrics = {
            'total_requests': 0,
            'failed_requests': 0,
            'avg_response_time': 0.0,
            'circuit_breaks': 0,
            'fallback_usage': 0
        }

    async def register_server(
        self, 
        server_info: MCPServerInfo,
        initialize_resilience: bool = True
    ) -> None:
        """Register an MCP server with resilience patterns."""
        self.servers[server_info.name] = server_info
        self.category_mapping[server_info.category].append(server_info.name)
        
        if initialize_resilience:
            await self._initialize_server_resilience(server_info)
        
        logger.info(f"Registered MCP server: {server_info.name} ({server_info.category.value})")

    async def _initialize_server_resilience(self, server_info: MCPServerInfo) -> None:
        """Initialize resilience patterns for a server."""
        # Register with resilience manager
        self.resilience_manager.register_server(
            server_name=server_info.name,
            max_connections=server_info.max_connections,
            failure_threshold=3,
            recovery_timeout=60.0,
            rate_limit=10
        )
        
        # HTTP client with connection pooling
        self.connection_pools[server_info.name] = httpx.AsyncClient(
            timeout=httpx.Timeout(server_info.timeout),
            limits=httpx.Limits(max_connections=server_info.max_connections),
            retries=0  # We handle retries ourselves
        )

    async def route_request(
        self,
        category: MCPServerCategory,
        capability: str,
        payload: Dict[str, Any],
        prefer_server: Optional[str] = None
    ) -> Dict[str, Any]:
        """Route a request to the best available MCP server."""
        self.metrics['total_requests'] += 1
        
        # Select server
        server_name = await self._select_server(category, capability, prefer_server)
        if not server_name:
            raise RuntimeError(f"No available servers for category {category.value}")
        
        # Execute request with resilience patterns
        try:
            result = await self._execute_with_resilience(server_name, payload)
            await self._record_success(server_name, result.get('response_time', 0))
            return result
        except Exception as e:
            await self._record_failure(server_name, e)
            
            # Try fallback if enabled
            if self.routing_policy.fallback_enabled:
                fallback_server = await self._select_fallback_server(category, server_name)
                if fallback_server:
                    self.metrics['fallback_usage'] += 1
                    logger.warning(f"Falling back from {server_name} to {fallback_server}")
                    return await self._execute_with_resilience(fallback_server, payload)
            
            raise

    async def _select_server(
        self,
        category: MCPServerCategory,
        capability: str,
        prefer_server: Optional[str] = None
    ) -> Optional[str]:
        """Select the best server for the request."""
        candidate_servers = []
        
        # Get servers in category
        for server_name in self.category_mapping[category]:
            server = self.servers[server_name]
            
            # Check capability and health
            if (capability in server.capabilities and 
                server.status != ConnectionStatus.UNAVAILABLE and
                not server.circuit_breaker_open):
                candidate_servers.append(server)
        
        if not candidate_servers:
            return None
        
        # Prefer specific server if requested and available
        if prefer_server and any(s.name == prefer_server for s in candidate_servers):
            return prefer_server
        
        # Apply routing strategy
        strategy = self.routing_policy.strategy
        
        if strategy == "capability_based":
            # Select server with best success rate and capability match
            return max(candidate_servers, key=lambda s: s.success_rate).name
        
        elif strategy == "least_loaded":
            # Select server with lowest active connections
            return min(candidate_servers, key=lambda s: s.active_connections).name
        
        elif strategy == "round_robin":
            # Simple round-robin selection
            return candidate_servers[self.metrics['total_requests'] % len(candidate_servers)].name
        
        else:
            # Default to first available
            return candidate_servers[0].name

    async def _execute_with_resilience(
        self,
        server_name: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute request with full resilience pattern stack."""
        server = self.servers[server_name]
        client = self.connection_pools[server_name]
        
        async def _make_request() -> Dict[str, Any]:
            start_time = time.time()
            server.active_connections += 1
            
            try:
                response = await client.post(
                    f"{server.endpoint}/execute",
                    json=payload
                )
                response.raise_for_status()
                
                result = response.json()
                result['response_time'] = time.time() - start_time
                return result
            
            finally:
                server.active_connections = max(0, server.active_connections - 1)
        
        return await self.resilience_manager.execute_with_resilience(
            server_name=server_name,
            operation=_make_request,
            retry_count=server.retry_count
        )

    async def _select_fallback_server(
        self,
        category: MCPServerCategory,
        failed_server: str
    ) -> Optional[str]:
        """Select a fallback server when primary fails."""
        fallback_candidates = [
            name for name in self.category_mapping[category]
            if (name != failed_server and
                self.servers[name].status != ConnectionStatus.UNAVAILABLE and
                not self.servers[name].circuit_breaker_open)
        ]
        
        if fallback_candidates:
            # Select healthiest fallback
            return max(
                fallback_candidates,
                key=lambda name: self.servers[name].success_rate
            )
        
        return None

    async def _record_success(self, server_name: str, response_time: float) -> None:
        """Record successful request metrics."""
        server = self.servers[server_name]
        
        # Update success rate (rolling average)
        self.request_history[server_name].append(True)
        successes = sum(self.request_history[server_name])
        server.success_rate = successes / len(self.request_history[server_name])
        
        # Update response time (rolling average)
        server.avg_response_time = (server.avg_response_time * 0.9 + response_time * 0.1)
        
        # Update server status
        if server.status != ConnectionStatus.HEALTHY:
            server.status = ConnectionStatus.HEALTHY
            logger.info(f"Server {server_name} recovered to healthy status")

    async def _record_failure(self, server_name: str, error: Exception) -> None:
        """Record failed request metrics."""
        self.metrics['failed_requests'] += 1
        server = self.servers[server_name]
        
        # Update success rate
        self.request_history[server_name].append(False)
        successes = sum(self.request_history[server_name])
        server.success_rate = successes / len(self.request_history[server_name])
        
        # Check circuit breaker state through resilience manager
        server_state = self.resilience_manager.get_server_state(server_name)
        if server_state.get('circuit_breaker_state') == 'open':
            server.circuit_breaker_open = True
            server.last_circuit_break = time.time()
            self.metrics['circuit_breaks'] += 1
            logger.warning(f"Circuit breaker opened for server {server_name}")
        
        # Update server status based on error type
        if isinstance(error, asyncio.TimeoutError):
            server.status = ConnectionStatus.DEGRADED
        else:
            server.status = ConnectionStatus.UNAVAILABLE
        
        logger.error(f"Request failed for server {server_name}: {error}")

    async def start_health_monitoring(self) -> None:
        """Start background health monitoring."""
        if self.health_check_task and not self.health_check_task.done():
            return
        
        self.health_check_task = asyncio.create_task(self._health_monitor_loop())
        logger.info("Started MCP server health monitoring")

    async def _health_monitor_loop(self) -> None:
        """Background health monitoring loop."""
        while True:
            try:
                await asyncio.sleep(self.routing_policy.health_check_interval)
                await self._perform_health_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health monitor error: {e}")

    async def _perform_health_checks(self) -> None:
        """Perform health checks on all registered servers."""
        for server_name, server in self.servers.items():
            try:
                client = self.connection_pools[server_name]
                start_time = time.time()
                
                # Simple health check ping
                response = await client.get(f"{server.endpoint}/health")
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    server.last_health_check = time.time()
                    if server.status == ConnectionStatus.UNAVAILABLE:
                        server.status = ConnectionStatus.RECOVERING
                        server.circuit_breaker_open = False
                        logger.info(f"Server {server_name} is recovering")
                
            except Exception as e:
                logger.debug(f"Health check failed for {server_name}: {e}")
                if server.status == ConnectionStatus.HEALTHY:
                    server.status = ConnectionStatus.DEGRADED

    async def get_server_metrics(self) -> Dict[str, Any]:
        """Get comprehensive server metrics."""
        server_stats = {}
        
        for name, server in self.servers.items():
            server_stats[name] = {
                'category': server.category.value,
                'status': server.status.value,
                'success_rate': server.success_rate,
                'avg_response_time': server.avg_response_time,
                'active_connections': server.active_connections,
                'circuit_breaker_open': server.circuit_breaker_open,
                'capabilities': list(server.capabilities)
            }
        
        return {
            'global_metrics': self.metrics,
            'servers': server_stats,
            'categories': {
                category.value: len(servers) 
                for category, servers in self.category_mapping.items()
            }
        }

    async def shutdown(self) -> None:
        """Gracefully shutdown the client manager."""
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close all connection pools
        for client in self.connection_pools.values():
            await client.aclose()
        
        logger.info("Enhanced MCP client manager shutdown complete")