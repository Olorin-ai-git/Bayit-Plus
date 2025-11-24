"""
Enhanced Agent Factory with MCP Integration

Factory functions for creating agents with enhanced MCP client capabilities,
including connection pooling, caching, circuit breakers, and health monitoring.
"""

import asyncio
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass

from app.service.logging import get_bridge_logger
from .mcp_client.mcp_integration_bridge import get_mcp_integration_bridge, MCPIntegrationBridge
from .mcp_client.enhanced_mcp_client import MCPResponse
from .mcp_client.mcp_client_manager import MCPServerCategory

logger = get_bridge_logger(__name__)


@dataclass 
class EnhancedAgentConfig:
    """Configuration for enhanced agents with MCP capabilities."""
    domain: str
    enable_mcp: bool = True
    enable_caching: bool = True
    cache_ttl: Optional[int] = 300  # 5 minutes default
    preferred_mcp_categories: List[MCPServerCategory] = None
    circuit_breaker_enabled: bool = True
    health_monitoring: bool = True
    performance_tracking: bool = True


class MCPToolWrapper:
    """Wrapper that provides MCP tools to agents with enhanced capabilities."""
    
    def __init__(self, bridge: MCPIntegrationBridge, config: EnhancedAgentConfig):
        self.bridge = bridge
        self.config = config
        self.call_count = 0
        self.error_count = 0
    
    async def call_blockchain_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call blockchain analysis MCP tools."""
        return await self._call_mcp_tool("blockchain_analysis", "analyze_transaction", params)
    
    async def call_intelligence_gathering(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call intelligence gathering MCP tools.""" 
        return await self._call_mcp_tool("intelligence_gathering", "gather_threat_intel", params)
    
    async def call_ml_models(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call ML/AI model MCP tools."""
        return await self._call_mcp_tool("ml_models", "predict_fraud_risk", params)
    
    async def call_compliance_check(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call compliance checking MCP tools."""
        return await self._call_mcp_tool("aml_compliance", "check_compliance", params)
    
    async def _call_mcp_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Internal method to call MCP tools with enhanced capabilities."""
        self.call_count += 1
        
        try:
            # Use the integration bridge for enhanced capabilities
            response = await self.bridge.invoke_tool(
                server_name=server_name,
                tool_name=tool_name,
                params=params,
                use_cache=self.config.enable_caching,
                cache_ttl=self.config.cache_ttl
            )
            
            if response and response.success:
                logger.debug(f"MCP tool call successful: {server_name}.{tool_name} "
                           f"(cached: {response.cached}, time: {response.execution_time_ms}ms)")
                
                return {
                    "success": True,
                    "data": response.data,
                    "cached": response.cached,
                    "execution_time_ms": response.execution_time_ms,
                    "server_name": response.server_name
                }
            else:
                error_msg = response.error if response else "Unknown error"
                logger.error(f"MCP tool call failed: {server_name}.{tool_name}: {error_msg}")
                self.error_count += 1
                
                return {
                    "success": False,
                    "error": error_msg,
                    "server_name": server_name,
                    "tool_name": tool_name
                }
                
        except Exception as e:
            logger.error(f"MCP tool call exception: {server_name}.{tool_name}: {e}")
            self.error_count += 1
            
            return {
                "success": False,
                "error": str(e),
                "server_name": server_name,
                "tool_name": tool_name
            }
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for this tool wrapper."""
        success_rate = (
            ((self.call_count - self.error_count) / self.call_count * 100) 
            if self.call_count > 0 else 0
        )
        
        return {
            "total_calls": self.call_count,
            "errors": self.error_count,
            "success_rate": success_rate,
            "domain": self.config.domain
        }


class EnhancedAgentFactory:
    """Factory for creating agents with enhanced MCP capabilities."""
    
    def __init__(self):
        self.bridge: Optional[MCPIntegrationBridge] = None
        self.agents_created = 0
        self.performance_stats: Dict[str, Dict[str, Any]] = {}
    
    async def initialize(self):
        """Initialize the enhanced agent factory."""
        if not self.bridge:
            self.bridge = await get_mcp_integration_bridge()
            logger.info("Enhanced Agent Factory initialized with MCP integration")
    
    async def create_enhanced_agent(
        self, 
        config: EnhancedAgentConfig,
        base_agent_creator: Callable = None
    ) -> Any:
        """
        Create an enhanced agent with MCP capabilities.
        
        Args:
            config: Enhanced agent configuration
            base_agent_creator: Function to create the base agent (optional)
        
        Returns:
            Enhanced agent with MCP tool wrapper
        """
        if not self.bridge:
            await self.initialize()
        
        # Create MCP tool wrapper for this agent
        mcp_tools = MCPToolWrapper(self.bridge, config)
        
        # Get health status of MCP servers for this domain
        server_health = await self._get_relevant_server_health(config)
        
        # Create enhanced agent class dynamically
        class EnhancedInvestigationAgent:
            def __init__(self, domain: str, tools: MCPToolWrapper):
                self.domain = domain
                self.mcp_tools = tools
                self.config = config
                self._server_health = server_health
                self._investigation_count = 0
            
            async def structured_investigate(self, context, config, specific_objectives=None):
                """Enhanced structured investigation with MCP integration."""
                self._investigation_count += 1
                
                logger.info(f"🔍 Starting enhanced {self.domain} investigation with MCP integration")
                
                # Check server health before investigation
                if not await self._verify_mcp_health():
                    logger.warning(f"Some MCP servers unhealthy for {self.domain} domain")
                
                # Run investigation with MCP-enhanced capabilities
                findings = await self._run_investigation_with_mcp(
                    context, config, specific_objectives
                )
                
                # Add MCP performance metrics to findings
                mcp_stats = self.mcp_tools.get_performance_stats()
                if hasattr(findings, 'raw_data'):
                    findings.raw_data = findings.raw_data or {}
                    findings.raw_data['mcp_performance'] = mcp_stats
                
                logger.info(f"✅ Enhanced {self.domain} investigation completed "
                          f"(MCP calls: {mcp_stats['total_calls']}, success rate: {mcp_stats['success_rate']:.1f}%)")
                
                return findings
            
            async def _verify_mcp_health(self) -> bool:
                """Verify MCP server health for this domain."""
                healthy_servers = 0
                total_servers = 0
                
                for server_name, health in self._server_health.items():
                    total_servers += 1
                    if health.get('health_score', 0) > 70:  # 70% threshold
                        healthy_servers += 1
                
                health_ratio = healthy_servers / total_servers if total_servers > 0 else 0
                return health_ratio >= 0.5  # At least 50% of servers should be healthy
            
            async def _run_investigation_with_mcp(self, context, config, objectives):
                """Run domain-specific investigation with MCP enhancement."""
                from .agent_investigation_enhancer import investigate_with_mcp_enhancement
                
                return await investigate_with_mcp_enhancement(
                    domain=self.domain,
                    mcp_tools=self.mcp_tools,
                    context=context,
                    config=config,
                    objectives=objectives
                )
            
            def get_performance_metrics(self) -> Dict[str, Any]:
                """Get performance metrics for this agent."""
                return {
                    "domain": self.domain,
                    "investigations_completed": self._investigation_count,
                    "mcp_performance": self.mcp_tools.get_performance_stats(),
                    "server_health": self._server_health
                }
        
        # Create the enhanced agent instance
        enhanced_agent = EnhancedInvestigationAgent(config.domain, mcp_tools)
        
        # Track creation
        self.agents_created += 1
        self.performance_stats[config.domain] = {
            "created_at": asyncio.get_event_loop().time(),
            "config": config.__dict__
        }
        
        logger.info(f"🤖 Created enhanced {config.domain} agent with MCP integration "
                   f"(total agents: {self.agents_created})")
        
        return enhanced_agent
    
    async def _get_relevant_server_health(self, config: EnhancedAgentConfig) -> Dict[str, Any]:
        """Get health status for servers relevant to this agent domain."""
        if not self.bridge:
            return {}
        
        server_health = {}
        
        # Get servers relevant to this domain
        relevant_categories = config.preferred_mcp_categories or []
        
        # Add default categories based on domain
        domain_category_mapping = {
            "device": [MCPServerCategory.ML_AI, MCPServerCategory.INTELLIGENCE],
            "network": [MCPServerCategory.INTELLIGENCE, MCPServerCategory.COMPLIANCE],
            "location": [MCPServerCategory.INTELLIGENCE],
            "logs": [MCPServerCategory.ML_AI, MCPServerCategory.COMPLIANCE],
            "blockchain": [MCPServerCategory.BLOCKCHAIN],
            "user_behavior": [MCPServerCategory.ML_AI, MCPServerCategory.INTELLIGENCE]
        }
        
        relevant_categories.extend(domain_category_mapping.get(config.domain, []))
        
        # Get health for each relevant category
        for category in set(relevant_categories):
            servers = self.bridge.get_available_servers(category)
            for server_name in servers:
                try:
                    health = await self.bridge.get_server_health(server_name)
                    server_health[server_name] = health
                except Exception as e:
                    logger.warning(f"Failed to get health for {server_name}: {e}")
                    server_health[server_name] = {"status": "unknown", "error": str(e)}
        
        return server_health
    
    async def get_factory_stats(self) -> Dict[str, Any]:
        """Get factory performance statistics."""
        if not self.bridge:
            await self.initialize()
        
        # Get overall MCP system metrics
        mcp_metrics = await self.bridge.get_performance_metrics()
        
        return {
            "agents_created": self.agents_created,
            "domains_supported": list(self.performance_stats.keys()),
            "mcp_system_metrics": mcp_metrics,
            "per_domain_stats": self.performance_stats,
            "enhanced_mode_enabled": self.bridge.is_enhanced_mode_enabled()
        }


# Global enhanced factory instance
_enhanced_agent_factory: Optional[EnhancedAgentFactory] = None


async def get_enhanced_agent_factory() -> EnhancedAgentFactory:
    """Get the global enhanced agent factory instance."""
    global _enhanced_agent_factory
    
    if _enhanced_agent_factory is None:
        _enhanced_agent_factory = EnhancedAgentFactory()
        await _enhanced_agent_factory.initialize()
    
    return _enhanced_agent_factory


# Convenience functions for creating domain-specific enhanced agents
async def create_enhanced_device_agent() -> Any:
    """Create enhanced device analysis agent."""
    factory = await get_enhanced_agent_factory()
    config = EnhancedAgentConfig(
        domain="device",
        preferred_mcp_categories=[MCPServerCategory.ML_AI, MCPServerCategory.INTELLIGENCE],
        cache_ttl=600  # 10 minutes for device analysis
    )
    return await factory.create_enhanced_agent(config)


async def create_enhanced_network_agent() -> Any:
    """Create enhanced network analysis agent."""
    factory = await get_enhanced_agent_factory()
    config = EnhancedAgentConfig(
        domain="network",
        preferred_mcp_categories=[MCPServerCategory.INTELLIGENCE, MCPServerCategory.COMPLIANCE],
        cache_ttl=300  # 5 minutes for network analysis
    )
    return await factory.create_enhanced_agent(config)


async def create_enhanced_user_behavior_agent() -> Any:
    """Create enhanced user behavior analysis agent."""
    factory = await get_enhanced_agent_factory()
    config = EnhancedAgentConfig(
        domain="user_behavior",
        preferred_mcp_categories=[MCPServerCategory.ML_AI, MCPServerCategory.INTELLIGENCE],
        cache_ttl=900  # 15 minutes for user behavior analysis
    )
    return await factory.create_enhanced_agent(config)