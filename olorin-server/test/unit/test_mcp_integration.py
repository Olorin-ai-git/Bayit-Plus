"""
Unit tests for MCP integration in the Olorin fraud investigation system.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

from app.service.agent.orchestration.mcp_client_manager import (
    MCPClientManager,
    MCPServerConfig,
    MCPTransport,
    MCPServerHealthMonitor,
    get_fraud_detection_mcp_configs
)
from app.service.agent.orchestration.mcp_server_registry import (
    MCPServerRegistry,
    MCPServerInfo,
    ServerStatus,
    ServerCapability,
    MCPDiscoveryService
)


class TestMCPClientManager:
    """Test suite for MCPClientManager."""
    
    @pytest.fixture
    def mock_configs(self):
        """Create mock MCP server configurations."""
        return {
            "test_server": MCPServerConfig(
                name="test_server",
                transport=MCPTransport.STDIO,
                command="python",
                args=["-m", "test_mcp_server"],
                capabilities=["test_capability"]
            )
        }
    
    @pytest.fixture
    def client_manager(self, mock_configs):
        """Create MCPClientManager instance."""
        return MCPClientManager(mock_configs)
    
    def test_initialization(self, client_manager, mock_configs):
        """Test MCPClientManager initialization."""
        assert client_manager.server_configs == mock_configs
        assert isinstance(client_manager.health_monitor, MCPServerHealthMonitor)
        assert client_manager.discovered_tools == []
    
    def test_check_mcp_availability_not_installed(self, client_manager):
        """Test MCP availability check when package not installed."""
        with patch.dict('sys.modules', {'langchain_mcp_adapters': None}):
            result = client_manager._check_mcp_availability()
            assert result == False
    
    @pytest.mark.asyncio
    async def test_initialize_without_mcp(self, client_manager):
        """Test initialization when MCP adapters not available."""
        client_manager.mcp_available = False
        await client_manager.initialize()
        assert client_manager.discovered_tools == []
    
    @pytest.mark.asyncio
    async def test_get_tools_empty(self, client_manager):
        """Test getting tools when none discovered."""
        client_manager.mcp_available = False
        tools = await client_manager.get_tools()
        assert tools == []
    
    @pytest.mark.asyncio
    async def test_get_healthy_tools(self, client_manager):
        """Test getting only healthy tools."""
        # Mock some tools
        mock_tool1 = Mock(name="tool1")
        mock_tool2 = Mock(name="tool2")
        client_manager.discovered_tools = [mock_tool1, mock_tool2]
        client_manager.tool_to_server_map = {
            "tool1": "healthy_server",
            "tool2": "unhealthy_server"
        }
        
        # Mock health check
        async def mock_health_check(server_name):
            return server_name == "healthy_server"
        
        client_manager.health_monitor.check_server_health = mock_health_check
        
        healthy_tools = await client_manager.get_healthy_tools()
        assert len(healthy_tools) == 1
        assert healthy_tools[0] == mock_tool1
    
    def test_add_server(self, client_manager):
        """Test adding a new server configuration."""
        new_config = MCPServerConfig(
            name="new_server",
            transport=MCPTransport.STREAMABLE_HTTP,
            url="http://localhost:8080/mcp"
        )
        
        client_manager.add_server("new_server", new_config)
        assert "new_server" in client_manager.server_configs
        assert client_manager.server_configs["new_server"] == new_config
    
    def test_remove_server(self, client_manager, mock_configs):
        """Test removing a server."""
        # Add a mock tool
        mock_tool = Mock(name="test_tool")
        client_manager.discovered_tools = [mock_tool]
        client_manager.tool_to_server_map = {"test_tool": "test_server"}
        
        client_manager.remove_server("test_server")
        
        assert "test_server" not in client_manager.server_configs
        assert len(client_manager.discovered_tools) == 0
    
    def test_get_server_status(self, client_manager, mock_configs):
        """Test getting server status information."""
        status = client_manager.get_server_status()
        
        assert "test_server" in status
        assert status["test_server"]["transport"] == "stdio"
        assert status["test_server"]["capabilities"] == ["test_capability"]
    
    def test_get_fraud_detection_configs(self):
        """Test getting default fraud detection MCP configurations."""
        configs = get_fraud_detection_mcp_configs()
        
        assert "fraud_database" in configs
        assert "external_apis" in configs
        assert "graph_analysis" in configs
        
        # Check transport types
        assert configs["fraud_database"].transport == MCPTransport.STDIO
        assert configs["external_apis"].transport == MCPTransport.STREAMABLE_HTTP
        assert configs["graph_analysis"].transport == MCPTransport.STDIO


class TestMCPServerRegistry:
    """Test suite for MCPServerRegistry."""
    
    @pytest.fixture
    def registry(self):
        """Create MCPServerRegistry instance."""
        return MCPServerRegistry()
    
    @pytest.fixture
    def mock_server_info(self):
        """Create mock MCPServerInfo."""
        return MCPServerInfo(
            name="test_server",
            transport="stdio",
            endpoint="test_endpoint",
            capabilities=[
                ServerCapability(
                    name="fraud_detection",
                    description="Detect fraud patterns",
                    category="analysis"
                )
            ]
        )
    
    def test_initialization(self, registry):
        """Test registry initialization."""
        assert registry.servers == {}
        assert registry.capabilities_index == {}
        assert isinstance(registry.discovery_service, MCPDiscoveryService)
    
    def test_register_server(self, registry, mock_server_info):
        """Test server registration."""
        result = registry.register_server(mock_server_info)
        
        assert result == True
        assert "test_server" in registry.servers
        assert registry.servers["test_server"] == mock_server_info
        assert "fraud_detection" in registry.capabilities_index
        assert "test_server" in registry.capabilities_index["fraud_detection"]
    
    def test_unregister_server(self, registry, mock_server_info):
        """Test server unregistration."""
        registry.register_server(mock_server_info)
        result = registry.unregister_server("test_server")
        
        assert result == True
        assert "test_server" not in registry.servers
        assert "test_server" not in registry.capabilities_index.get("fraud_detection", [])
    
    def test_get_server(self, registry, mock_server_info):
        """Test getting server information."""
        registry.register_server(mock_server_info)
        
        server = registry.get_server("test_server")
        assert server == mock_server_info
        
        missing_server = registry.get_server("nonexistent")
        assert missing_server is None
    
    def test_get_servers_by_capability(self, registry, mock_server_info):
        """Test getting servers by capability."""
        registry.register_server(mock_server_info)
        
        servers = registry.get_servers_by_capability("fraud_detection")
        assert len(servers) == 1
        assert servers[0] == mock_server_info
        
        empty_servers = registry.get_servers_by_capability("nonexistent")
        assert empty_servers == []
    
    def test_get_healthy_servers(self, registry, mock_server_info):
        """Test getting only healthy servers."""
        mock_server_info.status = ServerStatus.HEALTHY
        registry.register_server(mock_server_info)
        
        # Add unhealthy server
        unhealthy_server = MCPServerInfo(
            name="unhealthy",
            transport="http",
            endpoint="test",
            capabilities=[],
            status=ServerStatus.UNHEALTHY
        )
        registry.register_server(unhealthy_server)
        
        healthy = registry.get_healthy_servers()
        assert len(healthy) == 1
        assert healthy[0].name == "test_server"
    
    def test_get_capabilities(self, registry):
        """Test getting all available capabilities."""
        server1 = MCPServerInfo(
            name="server1",
            transport="stdio",
            endpoint="test",
            capabilities=[
                ServerCapability("cap1", "Description 1", "cat1"),
                ServerCapability("cap2", "Description 2", "cat2")
            ]
        )
        server2 = MCPServerInfo(
            name="server2",
            transport="http",
            endpoint="test",
            capabilities=[
                ServerCapability("cap2", "Description 2", "cat2"),
                ServerCapability("cap3", "Description 3", "cat3")
            ]
        )
        
        registry.register_server(server1)
        registry.register_server(server2)
        
        capabilities = registry.get_capabilities()
        assert capabilities == {"cap1", "cap2", "cap3"}
    
    @pytest.mark.asyncio
    async def test_check_server_health(self, registry, mock_server_info):
        """Test server health checking."""
        registry.register_server(mock_server_info)
        
        # Mock health check methods
        registry._check_stdio_health = AsyncMock(return_value=True)
        registry._check_http_health = AsyncMock(return_value=True)
        
        result = await registry.check_server_health("test_server")
        
        assert result == True
        assert registry.servers["test_server"].status == ServerStatus.HEALTHY
        assert registry.servers["test_server"].health_check_failures == 0
        assert registry.servers["test_server"].last_health_check is not None
    
    @pytest.mark.asyncio
    async def test_health_check_failure_handling(self, registry, mock_server_info):
        """Test handling of health check failures."""
        registry.register_server(mock_server_info)
        registry._check_stdio_health = AsyncMock(return_value=False)
        
        # First failure - should be degraded
        await registry.check_server_health("test_server")
        assert registry.servers["test_server"].status == ServerStatus.DEGRADED
        assert registry.servers["test_server"].health_check_failures == 1
        
        # Second failure
        await registry.check_server_health("test_server")
        assert registry.servers["test_server"].status == ServerStatus.DEGRADED
        assert registry.servers["test_server"].health_check_failures == 2
        
        # Third failure - should be unhealthy
        await registry.check_server_health("test_server")
        assert registry.servers["test_server"].status == ServerStatus.UNHEALTHY
        assert registry.servers["test_server"].health_check_failures == 3
    
    def test_get_registry_stats(self, registry):
        """Test getting registry statistics."""
        # Add servers with different statuses
        healthy_server = MCPServerInfo(
            name="healthy",
            transport="stdio",
            endpoint="test",
            capabilities=[ServerCapability("cap1", "Desc", "cat")],
            status=ServerStatus.HEALTHY
        )
        unhealthy_server = MCPServerInfo(
            name="unhealthy",
            transport="http",
            endpoint="test",
            capabilities=[ServerCapability("cap2", "Desc", "cat")],
            status=ServerStatus.UNHEALTHY
        )
        
        registry.register_server(healthy_server)
        registry.register_server(unhealthy_server)
        
        stats = registry.get_registry_stats()
        
        assert stats["total_servers"] == 2
        assert stats["healthy_servers"] == 1
        assert stats["total_capabilities"] == 2
        assert stats["status_breakdown"]["healthy"] == 1
        assert stats["status_breakdown"]["unhealthy"] == 1
        assert set(stats["capabilities"]) == {"cap1", "cap2"}


class TestMCPIntegrationWithGraphBuilder:
    """Test MCP integration with graph builder."""
    
    @pytest.mark.asyncio
    async def test_create_mcp_enhanced_graph(self):
        """Test creating MCP-enhanced graph."""
        from app.service.agent.orchestration.graph_builder import create_mcp_enhanced_graph
        
        # Mock MCP client
        with patch('app.service.agent.orchestration.graph_builder.MCPClientManager') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.initialize = AsyncMock()
            mock_client.get_healthy_tools = AsyncMock(return_value=[])
            mock_client_class.return_value = mock_client
            
            # Create graph with MCP
            graph = await create_mcp_enhanced_graph(
                parallel=True,
                use_enhanced_tools=False,
                use_mcp=True
            )
            
            assert graph is not None
            mock_client.initialize.assert_called_once()
            mock_client.get_healthy_tools.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_graph_without_mcp(self):
        """Test creating graph without MCP when adapters not available."""
        from app.service.agent.orchestration.graph_builder import create_mcp_enhanced_graph
        
        # Simulate MCP adapters not installed
        with patch('app.service.agent.orchestration.graph_builder.MCPClientManager', side_effect=ImportError):
            graph = await create_mcp_enhanced_graph(
                parallel=True,
                use_enhanced_tools=False,
                use_mcp=True
            )
            
            assert graph is not None  # Should still create graph without MCP


if __name__ == "__main__":
    pytest.main([__file__, "-v"])