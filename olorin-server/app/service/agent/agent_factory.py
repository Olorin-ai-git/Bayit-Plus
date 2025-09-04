"""
Agent Factory and Configuration

Factory functions for creating and configuring autonomous investigation agents.
Handles agent creation, tool binding, and domain-specific configuration.
"""

from typing import Any, Dict, List, Optional
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Import RAG components with graceful fallback
try:
    from .rag import (
        RAGOrchestrator, 
        ContextAugmentationConfig, 
        get_rag_orchestrator,
        KnowledgeBasedToolRecommender, 
        create_tool_recommender
    )
    from .rag_enhanced_agent import RAGEnhancedInvestigationAgent, create_rag_enhanced_agent
    from .tools.tool_registry import tool_registry
    RAG_AVAILABLE = True
    logger.info("RAG modules loaded successfully")
except ImportError as e:
    logger.warning(f"RAG modules not available: {e}")
    RAG_AVAILABLE = False
    
    # Create stub classes for type hints when RAG not available
    class ContextAugmentationConfig:
        pass
    
    class KnowledgeBasedToolRecommender:
        pass


class AgentFactory:
    """Enhanced factory for creating agents with optional RAG capabilities."""
    
    def __init__(self, enable_rag: bool = True, rag_config: Optional[ContextAugmentationConfig] = None):
        self.stats = {
            "agents_created": 0, 
            "rag_enhanced_agents_created": 0,
            "standard_agents_created": 0,
            "tool_recommendations_used": 0,
            "static_tools_used": 0,
            "domains_supported": ["network", "device", "location", "logs", "risk"], 
            "ml_ai_tools_enabled": True,
            "rag_enabled": enable_rag and RAG_AVAILABLE,
            "rag_available": RAG_AVAILABLE,
            "tool_recommender_available": False
        }
        
        # RAG configuration
        self.enable_rag = enable_rag and RAG_AVAILABLE
        self.rag_config = rag_config
        self.rag_orchestrator = None
        self.tool_recommender = None
        
        # Initialize RAG orchestrator and tool recommender if enabled
        if self.enable_rag:
            try:
                self.rag_orchestrator = get_rag_orchestrator()
                # Initialize tool recommender for RAG-enhanced tool selection
                if RAG_AVAILABLE:
                    self.tool_recommender = create_tool_recommender(
                        rag_orchestrator=self.rag_orchestrator,
                        tool_registry=tool_registry
                    )
                else:
                    self.tool_recommender = None
                self.stats["tool_recommender_available"] = True
                logger.info("AgentFactory initialized with RAG capabilities and tool recommender")
            except Exception as e:
                logger.warning(f"RAG orchestrator/tool recommender initialization failed: {e}")
                self.enable_rag = False
                self.stats["rag_enabled"] = False
                self.stats["tool_recommender_available"] = False
        else:
            logger.info("AgentFactory initialized without RAG capabilities")
    
    def get_factory_stats(self):
        """Get factory statistics."""
        return self.stats
    
    def create_agent(self, domain: str, tools: List[Any], enable_rag: Optional[bool] = None):
        """Create an agent for the specified domain with optional RAG enhancement."""
        self.stats["agents_created"] += 1
        
        # Use factory-level RAG setting if not specified
        use_rag = enable_rag if enable_rag is not None else self.enable_rag
        
        if use_rag and self.rag_orchestrator:
            agent = create_rag_enhanced_agent(
                domain=domain,
                tools=tools,
                rag_orchestrator=self.rag_orchestrator,
                enable_rag=True,
                rag_config=self.rag_config
            )
            self.stats["rag_enhanced_agents_created"] += 1
            logger.info(f"Created RAG-enhanced {domain} agent with {len(tools)} tools")
            return agent
        else:
            agent = create_autonomous_agent(domain, tools)
            self.stats["standard_agents_created"] += 1
            return agent
    
    def create_rag_enhanced_agent(
        self, 
        domain: str, 
        tools: List[Any],
        rag_config: Optional[ContextAugmentationConfig] = None
    ):
        """Explicitly create a RAG-enhanced agent."""
        if not self.enable_rag or not self.rag_orchestrator:
            logger.warning(f"RAG not available - creating standard agent for {domain}")
            return self.create_agent(domain, tools, enable_rag=False)
        
        self.stats["agents_created"] += 1
        self.stats["rag_enhanced_agents_created"] += 1
        
        agent = create_rag_enhanced_agent(
            domain=domain,
            tools=tools,
            rag_orchestrator=self.rag_orchestrator,
            enable_rag=True,
            rag_config=rag_config or self.rag_config
        )
        
        logger.info(f"Created RAG-enhanced {domain} agent with {len(tools)} tools")
        return agent
    
    def create_standard_agent(self, domain: str, tools: List[Any]):
        """Explicitly create a standard (non-RAG) agent."""
        self.stats["agents_created"] += 1
        self.stats["standard_agents_created"] += 1
        
        agent = create_autonomous_agent(domain, tools)
        logger.info(f"Created standard {domain} agent with {len(tools)} tools")
        return agent
    
    def set_rag_config(self, config: ContextAugmentationConfig) -> None:
        """Update RAG configuration for future agent creation."""
        self.rag_config = config
        logger.info("Updated AgentFactory RAG configuration")
    
    def is_rag_available(self) -> bool:
        """Check if RAG capabilities are available."""
        return self.enable_rag and self.rag_orchestrator is not None
    
    def is_tool_recommender_available(self) -> bool:
        """Check if tool recommender is available for enhanced tool selection."""
        return self.tool_recommender is not None
    
    async def get_enhanced_tools(
        self,
        domain: str,
        investigation_context,
        fallback_tools: List[Any],
        categories: Optional[List[str]] = None,
        tool_names: Optional[List[str]] = None
    ) -> List[Any]:
        """Get enhanced tool list using RAG-based tool recommender with fallback.
        
        Args:
            domain: Investigation domain
            investigation_context: AutonomousInvestigationContext for recommendations
            fallback_tools: Static tools to use as fallback
            categories: Optional tool categories for filtering
            tool_names: Optional specific tool names to include
            
        Returns:
            List of recommended tools or fallback tools
        """
        import time
        
        start_time = time.time()
        
        # Try RAG-enhanced tool selection if available
        if self.is_tool_recommender_available() and investigation_context:
            try:
                recommended_tools = await self.tool_recommender.get_enhanced_tool_list(
                    investigation_context=investigation_context,
                    domain=domain,
                    categories=categories,
                    tool_names=tool_names
                )
                
                selection_time_ms = (time.time() - start_time) * 1000
                
                # Update performance tracking
                self._update_performance_stats(selection_time_ms)
                
                # Validate performance requirement (<100ms)
                if selection_time_ms > 100:
                    logger.warning(
                        f"🚀 Tool selection took {selection_time_ms:.1f}ms (>100ms target) for {domain}"
                    )
                else:
                    logger.debug(f"🚀 Tool selection completed in {selection_time_ms:.1f}ms for {domain}")
                
                # Log to journey tracker if available
                try:
                    from .journey_tracker import get_journey_tracker
                    journey_tracker = get_journey_tracker()
                    
                    if hasattr(investigation_context, 'investigation_id'):
                        journey_tracker.track_tool_selection(
                            investigation_id=investigation_context.investigation_id,
                            domain=domain,
                            selection_time_ms=selection_time_ms,
                            tools_selected=len(recommended_tools),
                            strategy="rag_enhanced"
                        )
                except Exception:
                    pass  # Don't fail if journey tracking unavailable
                
                if recommended_tools:
                    self.stats["tool_recommendations_used"] += 1
                    logger.info(
                        f"Using {len(recommended_tools)} RAG-recommended tools for {domain} "
                        f"(selection time: {selection_time_ms:.1f}ms)"
                    )
                    return recommended_tools
                    
            except Exception as e:
                logger.warning(f"Tool recommendation failed for {domain}, using fallback: {str(e)}")
        
        # Fallback to static tools
        self.stats["static_tools_used"] += 1
        logger.debug(f"Using {len(fallback_tools)} static fallback tools for {domain}")
        return fallback_tools
    
    def _update_performance_stats(self, selection_time_ms: float) -> None:
        """Update performance statistics for tool selection."""
        # Update average (simple running average)
        current_avg = self.stats.get("tool_selection_performance_ms_avg", 0.0)
        total_selections = self.stats["tool_recommendations_used"] + self.stats["static_tools_used"]
        
        if total_selections > 0:
            new_avg = ((current_avg * (total_selections - 1)) + selection_time_ms) / total_selections
            self.stats["tool_selection_performance_ms_avg"] = new_avg
        
        # Update max
        current_max = self.stats.get("tool_selection_performance_ms_max", 0.0)
        if selection_time_ms > current_max:
            self.stats["tool_selection_performance_ms_max"] = selection_time_ms


_agent_factory_instance = None
_rag_enhanced_factory_instance = None


class ToolRecommenderAgentFactory(AgentFactory):
    """Specialized factory with enhanced tool recommendation capabilities."""
    
    def __init__(self, enable_rag: bool = True, rag_config: Optional[ContextAugmentationConfig] = None):
        super().__init__(enable_rag=enable_rag, rag_config=rag_config)
        
        # Additional stats for tool recommendation tracking
        self.stats.update({
            "tool_selection_performance_ms_avg": 0.0,
            "tool_selection_performance_ms_max": 0.0,
            "tool_selection_success_rate": 0.0
        })
    
    async def create_agent_with_enhanced_tools(
        self,
        domain: str,
        investigation_context,
        fallback_tools: List[Any],
        enable_rag: Optional[bool] = None,
        categories: Optional[List[str]] = None,
        tool_names: Optional[List[str]] = None
    ):
        """Create agent with RAG-enhanced tool selection.
        
        This method combines agent creation with intelligent tool selection,
        providing enhanced capabilities while maintaining backward compatibility.
        
        Args:
            domain: Investigation domain
            investigation_context: Context for tool recommendations
            fallback_tools: Static tools for fallback
            enable_rag: Override factory RAG setting
            categories: Tool categories to include
            tool_names: Specific tools to include
            
        Returns:
            Agent instance with optimally selected tools
        """
        import time
        
        # Get enhanced tools using RAG recommendations
        enhanced_tools = await self.get_enhanced_tools(
            domain=domain,
            investigation_context=investigation_context,
            fallback_tools=fallback_tools,
            categories=categories,
            tool_names=tool_names
        )
        
        # Create agent with enhanced or fallback tools
        return self.create_agent(domain, enhanced_tools, enable_rag=enable_rag)
    
    def get_tool_selection_metrics(self) -> Dict[str, Any]:
        """Get tool selection performance metrics."""
        total_selections = self.stats["tool_recommendations_used"] + self.stats["static_tools_used"]
        success_rate = 0.0
        if total_selections > 0:
            success_rate = self.stats["tool_recommendations_used"] / total_selections
        
        return {
            "total_tool_selections": total_selections,
            "rag_recommendations_used": self.stats["tool_recommendations_used"],
            "static_fallback_used": self.stats["static_tools_used"],
            "recommendation_success_rate": success_rate,
            "avg_selection_time_ms": self.stats["tool_selection_performance_ms_avg"],
            "max_selection_time_ms": self.stats["tool_selection_performance_ms_max"]
        }


def get_agent_factory(enable_rag: bool = True) -> AgentFactory:
    """Get the singleton agent factory instance."""
    global _agent_factory_instance
    if _agent_factory_instance is None:
        _agent_factory_instance = AgentFactory(enable_rag=enable_rag)
    return _agent_factory_instance

def get_rag_enhanced_factory() -> AgentFactory:
    """Get a RAG-enhanced agent factory instance."""
    global _rag_enhanced_factory_instance
    if _rag_enhanced_factory_instance is None:
        _rag_enhanced_factory_instance = AgentFactory(enable_rag=True)
    return _rag_enhanced_factory_instance


_tool_recommender_factory_instance = None


def get_tool_recommender_factory() -> ToolRecommenderAgentFactory:
    """Get specialized factory with enhanced tool recommendation capabilities."""
    global _tool_recommender_factory_instance
    if _tool_recommender_factory_instance is None:
        _tool_recommender_factory_instance = ToolRecommenderAgentFactory(enable_rag=True)
    return _tool_recommender_factory_instance

def get_standard_factory() -> AgentFactory:
    """Get a standard (non-RAG) agent factory instance."""
    return AgentFactory(enable_rag=False)


def create_autonomous_agent(domain: str, tools: List[Any]):
    """
    Create a standard autonomous investigation agent for the specified domain.
    
    Args:
        domain: Investigation domain (network, device, location, logs, risk)
        tools: List of available tools for the agent
        
    Returns:
        Configured AutonomousInvestigationAgent instance (standard, non-RAG)
    """
    try:
        from app.service.agent.base_agents import AutonomousInvestigationAgent
        
        agent = AutonomousInvestigationAgent(domain, tools)
        logger.info(f"Created autonomous {domain} agent with {len(tools)} tools")
        return agent
    except Exception as e:
        logger.error(f"Failed to create {domain} agent: {str(e)}")
        raise


def configure_domain_tools(domain: str, available_tools: List[Any]) -> List[Any]:
    """
    Configure tools specific to a domain.
    
    Args:
        domain: Investigation domain
        available_tools: All available tools
        
    Returns:
        List of tools configured for the domain
    """
    # For now, return all tools - could be enhanced for domain-specific filtering
    return available_tools


def get_default_domain_objectives(domain: str) -> List[str]:
    """
    Get default investigation objectives for a domain.
    
    Args:
        domain: Investigation domain name
        
    Returns:
        List of default objectives for the domain
    """
    domain_objectives = {
        "network": [
            "Analyze network connection patterns for anomalies",
            "Identify suspicious IP addresses and geographic locations",
            "Detect unusual network traffic or connection behaviors", 
            "Assess network-based fraud indicators",
            "Correlate network data with known threat intelligence",
            "Apply pattern recognition to network traffic analysis using pattern_recognition_ml tool",
            "Detect network anomalies and suspicious behaviors using anomaly_detection_ml tool",
            "Use threat intelligence tools (AbuseIPDB, VirusTotal, Shodan) to verify IP reputation",
            "Check for blockchain-related network activity using blockchain_mcp_client",
            "Analyze cryptocurrency exchanges and wallet addresses using crypto_exchange_analysis",
            "Monitor dark web cryptocurrency activities using darkweb_crypto_monitor",
            "Trace cryptocurrency fund flows using cryptocurrency_tracing",
            "Perform social media profiling using social_media_profiling",
            "Monitor dark web activities using darkweb_monitoring",
            "Use web_search to research suspicious IP addresses and domains",
            "Search for public reports about network infrastructure using web_scrape",
            "Investigate domain registration history via web sources"
        ],
        "device": [
            "Analyze device fingerprints for consistency and authenticity",
            "Detect device spoofing or manipulation attempts",
            "Assess device behavioral patterns and anomalies",
            "Identify device-based fraud indicators",
            "Evaluate device reputation and risk history",
            "Use ml_ai_mcp_client for behavioral analysis and anomaly detection",
            "Perform comprehensive behavioral analysis using behavioral_analysis_ml tool",
            "Detect device anomalies using anomaly_detection_ml tool",
            "Apply pattern recognition for device fraud patterns using pattern_recognition_ml tool",
            "Check device-related files with VirusTotal for malware indicators",
            "Analyze wallet addresses linked to device using blockchain_wallet_analysis",
            "Detect NFT fraud patterns using nft_fraud_detection",
            "Perform social network analysis using social_network_analysis",
            "Search for device owner information using people_search",
            "Search for device fingerprint patterns in security forums using web_search",
            "Research device vulnerabilities and exploits via web sources",
            "Check for device-specific fraud reports online using web_scrape"
        ],
        "location": [
            "Analyze geographic patterns and travel behavior",
            "Detect impossible travel or location anomalies",
            "Assess location-based risk factors", 
            "Identify geographic fraud indicators",
            "Correlate location data with behavioral patterns",
            "Apply behavioral analysis to travel patterns using behavioral_analysis_ml tool",
            "Detect geographic anomalies using anomaly_detection_ml tool",
            "Apply pattern recognition to location sequences using pattern_recognition_ml tool",
            "Use intelligence_mcp_client for OSINT on geographic locations",
            "Cross-reference locations with Shodan infrastructure data",
            "Aggregate OSINT data for location analysis using osint_data_aggregator",
            "Search deep web sources for location intelligence using deepweb_search",
            "Use web_search to verify business locations and addresses",
            "Research geographic anomalies in travel patterns via web sources",
            "Search for location-based fraud reports and warnings using web_scrape"
        ],
        "logs": [
            "Analyze activity logs for suspicious patterns",
            "Identify behavioral anomalies in user actions",
            "Detect unauthorized access attempts",
            "Assess log-based fraud indicators",
            "Correlate activities across time periods",
            "Use ml_ai_mcp_client to detect anomalies in log patterns",
            "Apply pattern recognition to identify suspicious activity patterns using pattern_recognition_ml tool",
            "Perform behavioral analysis on user activity logs using behavioral_analysis_ml tool",
            "Detect log anomalies and outliers using anomaly_detection_ml tool",
            "Check for cryptocurrency addresses in logs using blockchain_mcp_client",
            "Analyze DeFi protocol interactions using defi_protocol_analysis",
            "Preserve blockchain evidence using blockchain_forensics",
            "Monitor social media mentions using social_media_monitoring",
            "Conduct business intelligence analysis using business_intelligence",
            "Research suspicious activity patterns in security blogs using web_search",
            "Search for similar attack signatures in threat databases via web sources",
            "Use web_scrape to correlate log patterns with known threats"
        ],
        "risk": [
            "Integrate findings from all investigation domains",
            "Perform comprehensive risk correlation analysis",
            "Calculate overall fraud probability",
            "Assess evidence quality and reliability",
            "Provide final risk assessment and recommendations",
            "Aggregate threat intelligence findings from all sources",
            "Use ml_ai_mcp_client for final fraud detection scoring",
            "Apply comprehensive fraud detection using fraud_detection_ml tool",
            "Calculate advanced risk scores using risk_scoring_ml tool",
            "Perform final anomaly detection analysis using anomaly_detection_ml tool",
            "Apply pattern recognition for overall fraud pattern analysis using pattern_recognition_ml tool",
            "Conduct final behavioral analysis assessment using behavioral_analysis_ml tool",
            "Compile blockchain and cryptocurrency risk indicators",
            "Ensure regulatory compliance using cryptocurrency_compliance",
            "Generate forensic reports using blockchain_forensics for legal proceedings",
            "Consolidate OSINT findings using osint_data_aggregator",
            "Analyze overall social network risk using social_network_analysis",
            "Aggregate web-based threat intelligence for final assessment",
            "Search for recent fraud trends and patterns online using web_search",
            "Use web sources to enhance risk scoring with current threat landscape"
        ]
    }
    
    return domain_objectives.get(domain, ["Perform comprehensive analysis"])


def initialize_llm_with_tools(tools: List[Any]) -> Any:
    """
    Initialize LLM with tool binding (if needed separately from agent creation).
    
    Args:
        tools: List of tools to bind
        
    Returns:
        LLM instance with bound tools
    """
    try:
        from app.service.agent.base_agents import get_autonomous_llm
        
        autonomous_llm_instance = get_autonomous_llm()
        
        if tools:
            llm_with_tools = autonomous_llm_instance.bind_tools(tools)
            logger.info(f"Initialized LLM with {len(tools)} tools")
            return llm_with_tools
        else:
            logger.warning("No tools provided for LLM initialization")
            return autonomous_llm_instance
    except Exception as e:
        logger.error(f"Failed to initialize LLM with tools: {str(e)}")
        from app.service.agent.base_agents import get_autonomous_llm
        return get_autonomous_llm()


def create_agent(domain: str, tools: List[Any], enable_rag: bool = True):
    """Create an agent using the default factory."""
    factory = get_agent_factory(enable_rag=enable_rag)
    return factory.create_agent(domain, tools)

def create_rag_agent(domain: str, tools: List[Any], rag_config: Optional[ContextAugmentationConfig] = None):
    """Create a RAG-enhanced agent."""
    if not RAG_AVAILABLE:
        logger.warning("RAG not available - creating standard agent")
        return create_autonomous_agent(domain, tools)
    
    factory = get_rag_enhanced_factory()
    return factory.create_rag_enhanced_agent(domain, tools, rag_config)


async def create_agent_with_intelligent_tools(
    domain: str,
    investigation_context,
    fallback_tools: List[Any],
    enable_rag: bool = True,
    categories: Optional[List[str]] = None,
    tool_names: Optional[List[str]] = None
):
    """Create an agent with RAG-enhanced intelligent tool selection.
    
    This function combines the existing RAG agent creation with the new
    tool recommender system to provide the most advanced agent capabilities.
    
    Args:
        domain: Investigation domain
        investigation_context: Context for tool recommendations
        fallback_tools: Static tools to use as fallback
        enable_rag: Whether to enable RAG capabilities
        categories: Tool categories for filtering
        tool_names: Specific tools to include
        
    Returns:
        Agent with optimal tool selection and RAG capabilities
    """
    try:
        # Use specialized factory with tool recommender
        factory = get_tool_recommender_factory()
        
        # Create agent with enhanced tool selection
        agent = await factory.create_agent_with_enhanced_tools(
            domain=domain,
            investigation_context=investigation_context,
            fallback_tools=fallback_tools,
            enable_rag=enable_rag,
            categories=categories,
            tool_names=tool_names
        )
        
        # Enable dynamic tool refresh if tool recommender is available
        if factory.is_tool_recommender_available():
            async def tool_refresh_callback(ctx, dom):
                """Tool refresh callback using RAG recommendations."""
                return await factory.get_enhanced_tools(
                    domain=dom,
                    investigation_context=ctx,
                    fallback_tools=fallback_tools,
                    categories=categories,
                    tool_names=tool_names
                )
            
            agent.enable_tool_refresh(tool_refresh_callback)
            logger.info(f"Enabled intelligent tool refresh for {domain} agent")
        
        return agent
        
    except Exception as e:
        logger.error(f"Failed to create agent with intelligent tools: {str(e)}")
        # Fallback to standard RAG agent
        return create_rag_agent(domain, fallback_tools, enable_rag=enable_rag if enable_rag else None)


def execute_agent(agent, **kwargs):
    """Execute an agent with the given parameters."""
    # This is a placeholder - actual implementation would depend on agent type
    logger.info(f"Executing agent with parameters: {kwargs}")
    return {"status": "executed", "agent": str(agent), "params": kwargs}