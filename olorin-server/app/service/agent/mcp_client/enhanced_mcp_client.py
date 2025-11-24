"""
Enhanced MCP Client with Connection Pooling, Caching, and Resilience.

This implementation addresses infrastructure gaps by providing:
- Connection pooling and reuse
- Distributed caching with Redis
- Circuit breakers and retry logic
- Health monitoring and metrics
- Failover mechanisms
"""

import asyncio
import hashlib
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, Union, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

# Import the existing Redis client infrastructure
try:
    from app.service.redis_client import RedisCloudClient, get_redis_client
    from app.service.config import SvcSettings
    REDIS_AVAILABLE = True
    logger.info("Using existing RedisCloudClient for MCP caching")
except ImportError as e:
    logger.warning(f"Redis client not available: {e}")
    REDIS_AVAILABLE = False
    RedisCloudClient = None
    get_redis_client = None
    SvcSettings = None
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.mcp_resilience_patterns import MCPCircuitBreaker

logger = get_bridge_logger(__name__)


class MCPClientError(Exception):
    """Base exception for MCP client operations."""
    pass


class MCPConnectionError(MCPClientError):
    """Connection-related MCP errors."""
    pass


class MCPTimeoutError(MCPClientError):
    """Timeout-related MCP errors."""
    pass


class ConnectionState(Enum):
    """Connection states for MCP clients."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    FAILED = "failed"


@dataclass
class MCPServerEndpoint:
    """Configuration for an MCP server endpoint."""
    name: str
    url: str
    transport_type: str = "http"  # http, stdio, websocket
    timeout: int = 30
    max_retries: int = 3
    api_key: Optional[str] = None
    priority: int = 1  # 1 = primary, 2 = secondary, etc.
    enabled: bool = True
    health_check_interval: int = 60  # seconds
    circuit_breaker_threshold: int = 5


@dataclass
class MCPResponse:
    """Standardized MCP response structure."""
    success: bool
    data: Any
    error: Optional[str] = None
    execution_time_ms: Optional[int] = None
    server_name: Optional[str] = None
    cached: bool = False
    cache_key: Optional[str] = None


@dataclass
class ConnectionMetrics:
    """Connection performance and health metrics."""
    connection_id: str
    server_name: str
    state: ConnectionState
    created_at: float
    last_used: float
    request_count: int = 0
    error_count: int = 0
    avg_response_time_ms: float = 0.0
    last_error: Optional[str] = None


class MCPConnectionPool:
    """
    Connection pool for MCP servers with health monitoring.
    """
    
    def __init__(self, max_connections_per_server: int = 10):
        self.max_connections_per_server = max_connections_per_server
        self.connections: Dict[str, List[httpx.AsyncClient]] = {}
        self.connection_metrics: Dict[str, ConnectionMetrics] = {}
        self.locks: Dict[str, asyncio.Lock] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def initialize(self):
        """Initialize the connection pool."""
        self._cleanup_task = asyncio.create_task(self._cleanup_stale_connections())
        logger.info("MCP connection pool initialized")
        
    async def shutdown(self):
        """Shutdown the connection pool and cleanup resources."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
                
        # Close all connections
        for server_connections in self.connections.values():
            for client in server_connections:
                await client.aclose()
                
        self.connections.clear()
        self.connection_metrics.clear()
        logger.info("MCP connection pool shutdown complete")
        
    @asynccontextmanager
    async def get_connection(self, server_name: str, endpoint: MCPServerEndpoint) -> AsyncGenerator[httpx.AsyncClient, None]:
        """Get a connection from the pool for the specified server."""
        if server_name not in self.locks:
            self.locks[server_name] = asyncio.Lock()
            
        async with self.locks[server_name]:
            # Try to get existing connection
            if server_name in self.connections and self.connections[server_name]:
                client = self.connections[server_name].pop()
                connection_id = id(client)
                
                # Update metrics
                if connection_id in self.connection_metrics:
                    metrics = self.connection_metrics[connection_id]
                    metrics.last_used = time.time()
                    metrics.request_count += 1
                    metrics.state = ConnectionState.CONNECTED
                    
                try:
                    yield client
                    # Return connection to pool
                    self.connections[server_name].append(client)
                except Exception as e:
                    # Connection failed, close it
                    await client.aclose()
                    if connection_id in self.connection_metrics:
                        self.connection_metrics[connection_id].error_count += 1
                        self.connection_metrics[connection_id].last_error = str(e)
                    raise
            else:
                # Create new connection
                client = await self._create_new_connection(server_name, endpoint)
                connection_id = str(uuid.uuid4())
                
                # Track metrics
                self.connection_metrics[connection_id] = ConnectionMetrics(
                    connection_id=connection_id,
                    server_name=server_name,
                    state=ConnectionState.CONNECTED,
                    created_at=time.time(),
                    last_used=time.time(),
                    request_count=1
                )
                
                try:
                    yield client
                    # Add to pool if under limit
                    if server_name not in self.connections:
                        self.connections[server_name] = []
                    if len(self.connections[server_name]) < self.max_connections_per_server:
                        self.connections[server_name].append(client)
                    else:
                        await client.aclose()
                except Exception as e:
                    await client.aclose()
                    if connection_id in self.connection_metrics:
                        self.connection_metrics[connection_id].error_count += 1
                        self.connection_metrics[connection_id].last_error = str(e)
                    raise
                    
    async def _create_new_connection(self, server_name: str, endpoint: MCPServerEndpoint) -> httpx.AsyncClient:
        """Create a new HTTP client connection."""
        timeout = httpx.Timeout(endpoint.timeout)
        
        headers = {
            "User-Agent": "Olorin-MCP-Client/1.0",
            "Content-Type": "application/json"
        }
        
        if endpoint.api_key:
            headers["Authorization"] = f"Bearer {endpoint.api_key}"
            
        client = httpx.AsyncClient(
            timeout=timeout,
            headers=headers,
            limits=httpx.Limits(max_connections=self.max_connections_per_server)
        )
        
        logger.debug(f"Created new connection for {server_name}")
        return client
        
    async def _cleanup_stale_connections(self):
        """Background task to cleanup stale connections."""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                current_time = time.time()
                stale_threshold = 1800  # 30 minutes
                
                stale_connections = []
                for connection_id, metrics in self.connection_metrics.items():
                    if current_time - metrics.last_used > stale_threshold:
                        stale_connections.append(connection_id)
                        
                # Remove stale connections
                for connection_id in stale_connections:
                    if connection_id in self.connection_metrics:
                        del self.connection_metrics[connection_id]
                        
                if stale_connections:
                    logger.info(f"Cleaned up {len(stale_connections)} stale connections")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in connection cleanup: {e}")
                
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        return {
            "servers": list(self.connections.keys()),
            "total_connections": sum(len(conns) for conns in self.connections.values()),
            "connection_metrics": {
                conn_id: asdict(metrics) 
                for conn_id, metrics in self.connection_metrics.items()
            },
            "connections_per_server": {
                server: len(conns) for server, conns in self.connections.items()
            }
        }


class MCPCache:
    """
    Distributed caching system for MCP responses using Redis.
    """
    
    def __init__(self, settings: Optional[SvcSettings] = None, ttl: int = 300):
        self.settings = settings
        self.default_ttl = ttl
        self.redis_client: Optional[RedisCloudClient] = None
        self.cache_prefix = "olorin:mcp:"
        
    async def initialize(self):
        """Initialize Redis connection using existing RedisCloudClient."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, MCP cache disabled")
            self.redis_client = None
            return
            
        try:
            # Use existing settings or get from environment
            if self.settings is None:
                from app.service.config import get_settings
                self.settings = get_settings()
            
            # Get the global Redis client
            self.redis_client = get_redis_client(self.settings)
            
            # Test connection
            test_key = f"{self.cache_prefix}test"
            self.redis_client.set(test_key, "test", ex=10)
            retrieved = self.redis_client.get(test_key)
            if retrieved == "test":
                self.redis_client.delete(test_key)
                logger.info("MCP cache initialized with RedisCloudClient")
            else:
                raise Exception("Redis test failed")
                
        except Exception as e:
            logger.warning(f"Failed to initialize MCP cache with Redis, cache disabled: {e}")
            self.redis_client = None
            
    async def shutdown(self):
        """Shutdown Redis connection."""
        if self.redis_client:
            self.redis_client.close()
            logger.info("MCP cache shutdown complete")
            
    def _generate_cache_key(self, server_name: str, method: str, params: Dict[str, Any]) -> str:
        """Generate a cache key for MCP requests."""
        # Create deterministic hash from parameters
        params_str = json.dumps(params, sort_keys=True)
        hash_obj = hashlib.sha256(f"{server_name}:{method}:{params_str}".encode())
        return f"{self.cache_prefix}{hash_obj.hexdigest()}"
        
    async def get(self, server_name: str, method: str, params: Dict[str, Any]) -> Optional[MCPResponse]:
        """Get cached MCP response."""
        if not self.redis_client:
            return None
            
        try:
            cache_key = self._generate_cache_key(server_name, method, params)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                response_data = json.loads(cached_data)
                response = MCPResponse(
                    success=response_data["success"],
                    data=response_data["data"],
                    error=response_data.get("error"),
                    execution_time_ms=response_data.get("execution_time_ms"),
                    server_name=response_data.get("server_name"),
                    cached=True,
                    cache_key=cache_key
                )
                logger.debug(f"Cache hit for {server_name}:{method}")
                return response
                
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            
        return None
        
    async def set(self, server_name: str, method: str, params: Dict[str, Any], 
                  response: MCPResponse, ttl: Optional[int] = None) -> bool:
        """Cache MCP response."""
        if not self.redis_client or not response.success:
            return False
            
        try:
            cache_key = self._generate_cache_key(server_name, method, params)
            cache_data = {
                "success": response.success,
                "data": response.data,
                "error": response.error,
                "execution_time_ms": response.execution_time_ms,
                "server_name": response.server_name,
                "cached_at": time.time()
            }
            
            # Use the existing Redis client set method with expiration
            success = self.redis_client.set(
                cache_key, 
                json.dumps(cache_data),
                ex=ttl or self.default_ttl
            )
            
            if success:
                logger.debug(f"Cached response for {server_name}:{method}")
            return success
            
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
            
    async def invalidate(self, server_name: str, method: str = None, params: Dict[str, Any] = None):
        """Invalidate cached responses."""
        if not self.redis_client:
            return
            
        try:
            if method and params:
                # Invalidate specific cache entry
                cache_key = self._generate_cache_key(server_name, method, params)
                self.redis_client.delete(cache_key)
            else:
                # Invalidate all entries for server - implement basic pattern matching
                # Note: RedisCloudClient doesn't have keys() method, so we'll track keys differently
                # For now, just log the invalidation request
                logger.info(f"Server-wide cache invalidation requested for {server_name}")
                # TODO: Implement pattern-based invalidation if needed
                    
            logger.debug(f"Cache invalidated for {server_name}")
            
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")
            
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self.redis_client:
            return {"status": "disabled"}
            
        try:
            # RedisCloudClient doesn't expose info() method, so provide basic stats
            return {
                "status": "enabled",
                "cache_prefix": self.cache_prefix,
                "default_ttl": self.default_ttl,
                "backend": "RedisCloudClient",
                "note": "Using existing RedisCloudClient - detailed stats not available"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


class EnhancedMCPClient:
    """
    Enhanced MCP Client with connection pooling, caching, and resilience.
    """
    
    def __init__(self, settings: Optional[SvcSettings] = None):
        self.servers: Dict[str, MCPServerEndpoint] = {}
        self.circuit_breakers: Dict[str, MCPCircuitBreaker] = {}
        self.connection_pool = MCPConnectionPool()
        self.cache = MCPCache(settings)
        self.metrics: Dict[str, Dict[str, int]] = {}
        self._initialized = False
        
    async def initialize(self):
        """Initialize the enhanced MCP client."""
        if self._initialized:
            return
            
        await self.connection_pool.initialize()
        await self.cache.initialize()
        self._initialized = True
        logger.info("Enhanced MCP client initialized")
        
    async def shutdown(self):
        """Shutdown the enhanced MCP client."""
        await self.connection_pool.shutdown()
        await self.cache.shutdown()
        self._initialized = False
        logger.info("Enhanced MCP client shutdown complete")
        
    def register_server(self, endpoint: MCPServerEndpoint):
        """Register an MCP server endpoint."""
        self.servers[endpoint.name] = endpoint
        self.circuit_breakers[endpoint.name] = MCPCircuitBreaker(
            endpoint.name, 
            failure_threshold=endpoint.circuit_breaker_threshold
        )
        self.metrics[endpoint.name] = {
            "requests": 0,
            "successes": 0,
            "failures": 0,
            "cache_hits": 0,
            "avg_response_time": 0
        }
        logger.info(f"Registered MCP server: {endpoint.name}")
        
    def get_server(self, name: str) -> Optional[MCPServerEndpoint]:
        """Get server configuration by name."""
        return self.servers.get(name)
        
    def list_servers(self) -> List[str]:
        """List all registered server names."""
        return list(self.servers.keys())
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((MCPConnectionError, MCPTimeoutError))
    )
    async def call(self, server_name: str, method: str, params: Dict[str, Any] = None, 
                   use_cache: bool = True, cache_ttl: Optional[int] = None) -> MCPResponse:
        """
        Make an enhanced MCP call with caching, retry logic, and circuit breaking.
        """
        if not self._initialized:
            await self.initialize()
            
        if server_name not in self.servers:
            raise MCPClientError(f"Server {server_name} not registered")
            
        server = self.servers[server_name]
        if not server.enabled:
            raise MCPClientError(f"Server {server_name} is disabled")
            
        circuit_breaker = self.circuit_breakers[server_name]
        if not circuit_breaker.can_execute():
            raise MCPClientError(f"Circuit breaker open for {server_name}")
            
        params = params or {}
        
        # Try cache first
        if use_cache:
            cached_response = await self.cache.get(server_name, method, params)
            if cached_response:
                self.metrics[server_name]["cache_hits"] += 1
                return cached_response
                
        start_time = time.time()
        
        try:
            # Make request through connection pool
            async with self.connection_pool.get_connection(server_name, server) as client:
                response = await self._make_request(client, server, method, params)
                
            # Record success
            circuit_breaker.record_success()
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            mcp_response = MCPResponse(
                success=True,
                data=response,
                execution_time_ms=execution_time_ms,
                server_name=server_name
            )
            
            # Cache successful responses
            if use_cache and mcp_response.success:
                await self.cache.set(server_name, method, params, mcp_response, cache_ttl)
                
            # Update metrics
            self._update_metrics(server_name, True, execution_time_ms)
            
            return mcp_response
            
        except Exception as e:
            circuit_breaker.record_failure()
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            error_msg = str(e)
            logger.error(f"MCP call failed for {server_name}.{method}: {error_msg}")
            
            # Update metrics
            self._update_metrics(server_name, False, execution_time_ms)
            
            # Convert to appropriate exception type
            if "timeout" in error_msg.lower():
                raise MCPTimeoutError(error_msg) from e
            elif "connection" in error_msg.lower():
                raise MCPConnectionError(error_msg) from e
            else:
                return MCPResponse(
                    success=False,
                    data=None,
                    error=error_msg,
                    execution_time_ms=execution_time_ms,
                    server_name=server_name
                )
                
    async def _make_request(self, client: httpx.AsyncClient, server: MCPServerEndpoint, 
                           method: str, params: Dict[str, Any]) -> Any:
        """Make the actual HTTP request to MCP server."""
        request_data = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
            "params": params
        }
        
        response = await client.post(server.url, json=request_data)
        response.raise_for_status()
        
        result = response.json()
        if "error" in result:
            raise MCPClientError(f"MCP error: {result['error']}")
            
        return result.get("result")
        
    def _update_metrics(self, server_name: str, success: bool, execution_time_ms: int):
        """Update server metrics."""
        metrics = self.metrics[server_name]
        metrics["requests"] += 1
        
        if success:
            metrics["successes"] += 1
        else:
            metrics["failures"] += 1
            
        # Update average response time
        current_avg = metrics["avg_response_time"]
        request_count = metrics["requests"]
        metrics["avg_response_time"] = (
            (current_avg * (request_count - 1) + execution_time_ms) / request_count
        )
        
    async def get_server_health(self, server_name: str) -> Dict[str, Any]:
        """Get health status for a specific server."""
        if server_name not in self.servers:
            return {"status": "unknown", "error": "Server not registered"}
            
        server = self.servers[server_name]
        circuit_breaker = self.circuit_breakers[server_name]
        metrics = self.metrics[server_name]
        
        # Calculate health score
        total_requests = metrics["requests"]
        if total_requests == 0:
            health_score = 100
        else:
            success_rate = (metrics["successes"] / total_requests) * 100
            health_score = success_rate
            
        return {
            "status": "healthy" if health_score > 80 else "degraded" if health_score > 50 else "unhealthy",
            "health_score": health_score,
            "circuit_breaker_state": circuit_breaker.state["state"],
            "metrics": metrics,
            "server_config": asdict(server)
        }
        
    async def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status and metrics."""
        server_health = {}
        for server_name in self.servers.keys():
            server_health[server_name] = await self.get_server_health(server_name)
            
        pool_stats = self.connection_pool.get_pool_stats()
        cache_stats = await self.cache.get_cache_stats()
        
        return {
            "client_status": "initialized" if self._initialized else "not_initialized",
            "servers": server_health,
            "connection_pool": pool_stats,
            "cache": cache_stats,
            "total_servers": len(self.servers),
            "enabled_servers": sum(1 for s in self.servers.values() if s.enabled),
            "timestamp": time.time()
        }


# Global enhanced MCP client instance
_enhanced_mcp_client: Optional[EnhancedMCPClient] = None


async def get_enhanced_mcp_client() -> EnhancedMCPClient:
    """Get the global enhanced MCP client instance."""
    global _enhanced_mcp_client
    
    if _enhanced_mcp_client is None:
        _enhanced_mcp_client = EnhancedMCPClient()
        await _enhanced_mcp_client.initialize()
        
        # Register default servers from environment
        await _register_default_servers(_enhanced_mcp_client)
        
    return _enhanced_mcp_client


async def _register_default_servers(client: EnhancedMCPClient):
    """Register default MCP servers from Pydantic settings configuration."""
    try:
        from app.service.config import get_settings_for_env
        settings = get_settings_for_env()
        
        # Blockchain servers
        if settings.mcp_blockchain_enabled:
            # Get API key from settings (Firebase Secret Manager or env override)
            api_key = getattr(settings, 'mcp_blockchain_api_key', None)
            if not api_key:
                # Try to get from Firebase secrets via config_secrets module
                try:
                    from app.service.config_secrets import get_secret_value
                    api_key = get_secret_value(settings.mcp_blockchain_api_key_secret)
                except (ImportError, Exception) as e:
                    logger.warning(f"Could not get blockchain MCP API key from secrets: {e}")
                    
            client.register_server(MCPServerEndpoint(
                name="blockchain_analysis",
                url=settings.mcp_blockchain_endpoint,
                api_key=api_key,
                timeout=settings.mcp_blockchain_timeout,
                enabled=True
            ))
            
        # Intelligence servers
        if settings.mcp_intelligence_enabled:
            # Get API key from settings (Firebase Secret Manager or env override)
            api_key = getattr(settings, 'mcp_intelligence_api_key', None)
            if not api_key:
                # Try to get from Firebase secrets via config_secrets module
                try:
                    from app.service.config_secrets import get_secret_value
                    api_key = get_secret_value(settings.mcp_intelligence_api_key_secret)
                except (ImportError, Exception) as e:
                    logger.warning(f"Could not get intelligence MCP API key from secrets: {e}")
                    
            client.register_server(MCPServerEndpoint(
                name="intelligence_gathering",
                url=settings.mcp_intelligence_endpoint,
                api_key=api_key,
                timeout=settings.mcp_intelligence_timeout,
                enabled=True
            ))
            
        # ML/AI servers
        if settings.mcp_ml_ai_enabled:
            # Get API key from settings (Firebase Secret Manager or env override)
            api_key = getattr(settings, 'mcp_ml_ai_api_key', None)
            if not api_key:
                # Try to get from Firebase secrets via config_secrets module
                try:
                    from app.service.config_secrets import get_secret_value
                    api_key = get_secret_value(settings.mcp_ml_ai_api_key_secret)
                except (ImportError, Exception) as e:
                    logger.warning(f"Could not get ML/AI MCP API key from secrets: {e}")
                    
            client.register_server(MCPServerEndpoint(
                name="ml_ai_models",
                url=settings.mcp_ml_ai_endpoint,
                api_key=api_key,
                timeout=settings.mcp_ml_ai_timeout,
                enabled=True
            ))
            
        logger.info("Default MCP servers registered from Pydantic settings")
        
    except Exception as e:
        logger.error(f"Error registering default MCP servers from settings: {e}")
        # Fallback to direct environment variables for backward compatibility
        import os
        
        # Blockchain servers
        if os.getenv("USE_BLOCKCHAIN_MCP_CLIENT") == "true":
            client.register_server(MCPServerEndpoint(
                name="blockchain_analysis",
                url=os.getenv("BLOCKCHAIN_MCP_ENDPOINT", "http://localhost:8080/mcp"),
                api_key=os.getenv("BLOCKCHAIN_MCP_API_KEY"),
                timeout=30,
                enabled=True
            ))
            
        # Intelligence servers
        if os.getenv("USE_INTELLIGENCE_MCP_CLIENT") == "true":
            client.register_server(MCPServerEndpoint(
                name="intelligence_gathering",
                url=os.getenv("INTELLIGENCE_MCP_ENDPOINT", "http://localhost:8081/mcp"),
                api_key=os.getenv("INTELLIGENCE_MCP_API_KEY"),
                timeout=30,
                enabled=True
            ))
            
        # ML/AI servers
        if os.getenv("USE_ML_AI_MCP_CLIENT") == "true":
            client.register_server(MCPServerEndpoint(
                name="ml_ai_models",
                url=os.getenv("ML_AI_MCP_ENDPOINT", "http://localhost:8082/mcp"),
                api_key=os.getenv("ML_AI_MCP_API_KEY"),
                timeout=45,
                enabled=True
            ))
            
        logger.info("Default MCP servers registered from fallback environment variables")


async def shutdown_enhanced_mcp_client():
    """Shutdown the global enhanced MCP client."""
    global _enhanced_mcp_client
    
    if _enhanced_mcp_client:
        await _enhanced_mcp_client.shutdown()
        _enhanced_mcp_client = None
        logger.info("Enhanced MCP client shutdown")