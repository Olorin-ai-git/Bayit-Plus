"""Mock implementation of IPSCacheClient for testing without external dependencies."""

from typing import Any, Dict, List
import os
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MockIPSCacheClient:
    """Mock client for testing without connecting to external IPS Cache service."""
    
    def __init__(self):
        self.base_url = "http://mock-ipscache-local"
        self.storage = {}  # In-memory storage for testing
        logger.info("🎭 Using MockIPSCacheClient for testing - no external connections")
    
    async def _send_request(
        self,
        method: str,
        endpoint: str,
        data=None,
        olorin_header: dict[str, Any] = None,
    ):
        """Mock request handler that simulates cache operations."""
        logger.debug(f"Mock {method} request: endpoint={endpoint}, data={data}")
        
        # Simulate successful responses for different operations
        if method == "GET":
            return {}
        elif method == "POST":
            # Handle different Redis-like commands
            if data and isinstance(data, list):
                command = data[0] if data else ""
                if command == "HSET":
                    return "OK"
                elif command == "EXPIRE":
                    return 1
                elif command == "ZADD":
                    return 1
                elif command == "HGETALL":
                    return {}
            return []
        return None
    
    async def hset(
        self, key: str, data: List[Any], olorin_header: dict[str, Any] = None
    ):
        """Mock HSET operation."""
        logger.debug(f"Mock HSET: key={key}, data_length={len(data) if data else 0}")
        self.storage[key] = data
        return "OK"
    
    async def expire(
        self, key: str, seconds: int, olorin_header: dict[str, Any] = None
    ):
        """Mock EXPIRE operation."""
        logger.debug(f"Mock EXPIRE: key={key}, seconds={seconds}")
        return 1
    
    async def zadd(
        self,
        zset_name: str,
        score: float,
        key: str,
        olorin_header: dict[str, Any] = None,
    ):
        """Mock ZADD operation."""
        logger.debug(f"Mock ZADD: zset={zset_name}, score={score}, key={key}")
        if zset_name not in self.storage:
            self.storage[zset_name] = []
        self.storage[zset_name].append((score, key))
        return 1
    
    async def hgetall(
        self, key: str, olorin_header: dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Mock HGETALL operation."""
        logger.debug(f"Mock HGETALL: key={key}")
        return self.storage.get(key, {})
    
    async def zscan(
        self, zset_name: str, olorin_header: dict[str, Any] = None
    ) -> list:
        """Mock ZSCAN operation."""
        logger.debug(f"Mock ZSCAN: zset={zset_name}")
        # Return empty list to simulate no existing checkpoints
        return []
    
    def pipeline(self):
        """Mock pipeline for batch operations."""
        return MockPipeline(self)


class MockPipeline:
    """Mock pipeline for batch Redis operations."""
    
    def __init__(self, client):
        self.client = client
        self.commands = []
    
    def hset(self, key: str, mapping: dict):
        """Add HSET to pipeline."""
        self.commands.append(("HSET", key, mapping))
        return self
    
    def zadd(self, zset_name: str, mapping: dict):
        """Add ZADD to pipeline."""
        self.commands.append(("ZADD", zset_name, mapping))
        return self
    
    def expire(self, key: str, seconds: int):
        """Add EXPIRE to pipeline."""
        self.commands.append(("EXPIRE", key, seconds))
        return self
    
    async def execute(self):
        """Execute all pipeline commands."""
        results = []
        for command in self.commands:
            if command[0] == "HSET":
                results.append("OK")
            elif command[0] == "ZADD":
                results.append(len(command[2]) if len(command) > 2 else 1)
            elif command[0] == "EXPIRE":
                results.append(1)
            else:
                results.append(None)
        logger.debug(f"Mock pipeline executed {len(self.commands)} commands")
        return results


def get_ips_cache_client():
    """Factory function to get appropriate IPS Cache client based on environment."""
    use_mock = os.environ.get("USE_MOCK_IPS_CACHE", "false").lower() == "true"
    
    if use_mock:
        logger.info("Using MockIPSCacheClient due to USE_MOCK_IPS_CACHE=true")
        return MockIPSCacheClient()
    else:
        from app.adapters.ips_cache_client import IPSCacheClient
        return IPSCacheClient()