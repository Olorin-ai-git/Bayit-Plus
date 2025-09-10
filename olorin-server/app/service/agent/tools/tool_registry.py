"""Tool registry for LangGraph agents - centralized access to all available tools."""

import os
from typing import Any, Dict, List, Optional
from pathlib import Path
from dotenv import load_dotenv

from langchain_core.tools import BaseTool

# Load .env file to ensure all tool configuration is available
# The .env file is at: /Users/gklainert/Documents/olorin/olorin-server/.env
# This file is at: /Users/gklainert/Documents/olorin/olorin-server/app/service/agent/tools/tool_registry.py
# So we need to go up 4 levels from tools/ to get to olorin-server/
env_path = Path(__file__).parent.parent.parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path, override=True)
    # Verify some key variables are loaded
    tool_count = sum(1 for k in os.environ if k.startswith('USE_') and os.getenv(k) == 'true')
    if tool_count > 0:
        print(f"✅ Loaded .env file with {tool_count} enabled tools")
else:
    # Try alternate path
    alt_env_path = Path('/Users/gklainert/Documents/olorin/olorin-server/.env')
    if alt_env_path.exists():
        load_dotenv(alt_env_path, override=True)
        tool_count = sum(1 for k in os.environ if k.startswith('USE_') and os.getenv(k) == 'true')
        if tool_count > 0:
            print(f"✅ Loaded .env file from alternate path with {tool_count} enabled tools")
    else:
        print(f"⚠️ No .env file found at {env_path} or {alt_env_path}")

from .api_tool import HTTPRequestTool, JSONAPITool

# Import all available tools
from .database_tool import DatabaseQueryTool, DatabaseSchemaTool
from .file_system_tool import (
    DirectoryListTool,
    FileReadTool,
    FileSearchTool,
    FileWriteTool,
)
from app.service.logging import get_bridge_logger

# Import Olorin-specific tools
try:
    from .splunk_tool import SplunkQueryTool
    SPLUNK_TOOL_AVAILABLE = True
except ImportError as e:
    logger = get_bridge_logger(__name__)
    logger.warning(f"Splunk tool not available: {e}")
    SPLUNK_TOOL_AVAILABLE = False
from .sumologic_tool.sumologic_tool import SumoLogicQueryTool
from .snowflake_tool.snowflake_tool import SnowflakeQueryTool
from .vector_search_tool import VectorSearchTool
from .web_search_tool import WebScrapeTool, WebSearchTool

# Import MCP client tools (connect to external MCP servers)
try:
    from ..mcp_client import (
        blockchain_mcp_client,
        intelligence_mcp_client,
        ml_ai_mcp_client
    )
    MCP_CLIENTS_AVAILABLE = True
except ImportError:
    MCP_CLIENTS_AVAILABLE = False

# Import blockchain tools
try:
    from .blockchain_tools import (
        BlockchainWalletAnalysisTool,
        CryptocurrencyTracingTool,
        DeFiProtocolAnalysisTool,
        NFTFraudDetectionTool,
        BlockchainForensicsTool,
        CryptoExchangeAnalysisTool,
        DarkWebCryptoMonitorTool,
        CryptocurrencyComplianceTool
    )
    BLOCKCHAIN_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Blockchain tools not available: {e}")
    BLOCKCHAIN_TOOLS_AVAILABLE = False

# Import intelligence tools
try:
    from .intelligence_tools import (
        SocialMediaProfilingTool,
        SocialNetworkAnalysisTool,
        SocialMediaMonitoringTool,
        OSINTDataAggregatorTool,
        PeopleSearchTool,
        BusinessIntelligenceTool,
        DarkWebMonitoringTool,
        DeepWebSearchTool
    )
    INTELLIGENCE_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Intelligence tools not available: {e}")
    INTELLIGENCE_TOOLS_AVAILABLE = False

# Import ML/AI tools
try:
    from .ml_ai_tools import (
        BehavioralAnalysisTool,
        AnomalyDetectionTool,
        PatternRecognitionTool,
        FraudDetectionTool,
        RiskScoringTool
    )
    ML_AI_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ML/AI tools not available: {e}")
    ML_AI_TOOLS_AVAILABLE = False

logger = get_bridge_logger(__name__)

# Try to import threat intelligence tools
try:
    # AbuseIPDB tools
    from .threat_intelligence_tool.abuseipdb.simple_ip_reputation_tool import SimpleIPReputationTool
    from .threat_intelligence_tool.abuseipdb.bulk_analysis_tool import BulkIPAnalysisTool
    from .threat_intelligence_tool.abuseipdb.cidr_block_tool import CIDRBlockAnalysisTool
    from .threat_intelligence_tool.abuseipdb.abuse_reporting_tool import AbuseReportingTool
    
    # VirusTotal tools
    from .threat_intelligence_tool.virustotal.ip_analysis_tool import VirusTotalIPAnalysisTool
    from .threat_intelligence_tool.virustotal.domain_analysis_tool import VirusTotalDomainAnalysisTool
    from .threat_intelligence_tool.virustotal.file_analysis_tool import VirusTotalFileAnalysisTool
    from .threat_intelligence_tool.virustotal.url_analysis_tool import VirusTotalURLAnalysisTool
    
    # Shodan tools
    from .threat_intelligence_tool.shodan.infrastructure_analysis_tool import ShodanInfrastructureAnalysisTool
    from .threat_intelligence_tool.shodan.search_tool import ShodanSearchTool
    from .threat_intelligence_tool.shodan.exploit_search_tool import ShodanExploitSearchTool
    
    # Unified threat intelligence tool
    from .threat_intelligence_tool.unified_threat_intelligence_tool import UnifiedThreatIntelligenceTool

    THREAT_INTEL_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Threat intelligence tools not available: {e}")
    THREAT_INTEL_AVAILABLE = False

# Try to import MCP server tools
try:
    from ...mcp_servers.fraud_database_server import create_fraud_database_server
    from ...mcp_servers.external_api_server import create_external_api_server  
    from ...mcp_servers.graph_analysis_server import create_graph_analysis_server
    import asyncio
    MCP_SERVERS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"MCP server tools not available: {e}")
    MCP_SERVERS_AVAILABLE = False


class ToolRegistry:
    """Registry for managing and accessing LangGraph agent tools."""

    def __init__(self):
        """Initialize the tool registry."""
        self._tools: Dict[str, BaseTool] = {}
        self._tool_categories: Dict[str, List[str]] = {
            "database": [],
            "web": [],
            "file_system": [],
            "api": [],
            "search": [],
            "olorin": [],  # Olorin-specific tools
            "threat_intelligence": [],  # Threat intelligence tools
            "mcp_clients": [],  # MCP client tools (connect to external MCP servers)
            "mcp_servers": [],  # MCP server tools (internal MCP servers)
            "blockchain": [],  # Blockchain and cryptocurrency analysis tools
            "intelligence": [],  # Advanced intelligence gathering tools (SOCMINT, OSINT, Dark Web)
            "ml_ai": [],  # Machine learning and AI enhancement tools
            "utility": [],
        }
        self._initialized = False
        # Use proper threading lock instead of boolean flag
        import threading
        self._initialization_lock = threading.RLock()
        self._initialization_in_progress = False

    def _safe_async_run(self, coro_func):
        """
        Safely run async coroutine function, handling existing event loop conflicts.
        
        This method detects if we're already in an async context and handles
        the common 'asyncio.run() cannot be called from a running event loop' error.
        """
        try:
            # Check if there's already a running event loop
            loop = asyncio.get_running_loop()
            logger.info("🔄 Detected running event loop - creating task for MCP server registration")
            # Create a task in the existing event loop instead of asyncio.run()
            try:
                coro = coro_func()
                task = loop.create_task(coro)
                # We can't wait for the task in sync context, so schedule it and return None
                # This is expected behavior - MCP servers will be registered asynchronously
                logger.info("📅 MCP server registration task scheduled in existing event loop")
                return None
            except Exception as e:
                logger.warning(f"Failed to create MCP server task: {e}")
                return None
        except RuntimeError:
            # No event loop running - safe to use asyncio.run()
            try:
                # Now create and run the coroutine
                coro = coro_func()
                result = asyncio.run(coro)
                logger.info("✅ Successfully executed async MCP server registration")
                return result
            except Exception as e:
                logger.warning(f"❌ MCP server async execution failed: {e}")
                return None

    def _ensure_initialized(self) -> None:
        """Ensure the tool registry is initialized with validated tool availability."""
        # Fast path: if already initialized and has tools, return immediately
        if self._initialized and len(self._tools) > 0:
            return
            
        # Use proper threading lock to prevent race conditions
        with self._initialization_lock:
            # Double-check after acquiring lock (another thread might have initialized)
            if self._initialized and len(self._tools) > 0:
                return
                
            # Prevent recursive initialization
            if self._initialization_in_progress:
                logger.warning("Initialization already in progress, waiting...")
                return
                
            # Perform initialization inside the lock
            logger.warning("⚠️ Tool registry requires (re)initialization - performing emergency initialization")
            try:
                self.initialize()
                
                # Validate initialization was successful
                if not self._initialized:
                    raise RuntimeError("Registry initialization flag not set after initialization")
                
                if len(self._tools) == 0:
                    logger.error("❌ Emergency initialization failed - no tools loaded!")
                    raise RuntimeError("No tools were loaded during emergency initialization")
                
                # Additional validation: Test that tools are actually callable
                sample_tools = list(self._tools.values())[:3]
                for tool in sample_tools:
                    if not hasattr(tool, 'invoke') or not hasattr(tool, 'name'):
                        logger.error(f"❌ Tool {getattr(tool, 'name', 'unknown')} is missing required methods")
                        raise RuntimeError(f"Tool {getattr(tool, 'name', 'unknown')} improperly initialized")
                
                logger.info(f"✅ Emergency initialization successful: {len(self._tools)} tools loaded and validated")
                
            except Exception as init_error:
                logger.error(f"❌ Emergency initialization failed: {init_error}")
                self._initialized = False
                raise RuntimeError(f"Tool registry initialization failed: {init_error}") from init_error
            finally:
                # Always clear the in-progress flag
                self._initialization_in_progress = False

    def initialize(
        self,
        database_connection_string: Optional[str] = None,
        web_search_user_agent: Optional[str] = None,
        file_system_base_path: Optional[str] = None,
        api_default_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Initialize all tools with configuration.

        Args:
            database_connection_string: Database connection string for DB tools
            web_search_user_agent: User agent for web search tools
            file_system_base_path: Base path restriction for file system tools
            api_default_headers: Default headers for API tools
        """
        if self._initialized:
            logger.info("Tool registry already initialized")
            return

        try:
            # Database Tools
            if database_connection_string and os.getenv('USE_DATABASE_QUERY', 'false').lower() == 'true':
                self._register_tool(
                    DatabaseQueryTool(connection_string=database_connection_string),
                    "database",
                )
            if database_connection_string and os.getenv('USE_DATABASE_SCHEMA', 'false').lower() == 'true':
                self._register_tool(
                    DatabaseSchemaTool(connection_string=database_connection_string),
                    "database",
                )

            # Web Tools
            if os.getenv('USE_WEB_SEARCH', 'false').lower() == 'true':
                self._register_tool(WebSearchTool(user_agent=web_search_user_agent), "web")
            if os.getenv('USE_WEB_SCRAPE', 'false').lower() == 'true':
                self._register_tool(WebScrapeTool(user_agent=web_search_user_agent), "web")

            # File System Tools
            if os.getenv('USE_FILE_READ', 'false').lower() == 'true':
                self._register_tool(
                    FileReadTool(base_path=file_system_base_path), "file_system"
                )
            if os.getenv('USE_FILE_WRITE', 'false').lower() == 'true':
                self._register_tool(
                    FileWriteTool(base_path=file_system_base_path), "file_system"
                )
            if os.getenv('USE_DIRECTORY_LIST', 'false').lower() == 'true':
                self._register_tool(
                    DirectoryListTool(base_path=file_system_base_path), "file_system"
                )
            if os.getenv('USE_FILE_SEARCH', 'false').lower() == 'true':
                self._register_tool(
                    FileSearchTool(base_path=file_system_base_path), "file_system"
                )

            # API Tools
            if os.getenv('USE_HTTP_REQUEST', 'false').lower() == 'true':
                self._register_tool(
                    HTTPRequestTool(default_headers=api_default_headers), "api"
                )
            if os.getenv('USE_JSON_API', 'false').lower() == 'true':
                self._register_tool(JSONAPITool(), "api")

            # Search Tools
            if os.getenv('USE_VECTOR_SEARCH', 'false').lower() == 'true':
                self._register_tool(VectorSearchTool(), "search")

            # Olorin-specific Tools - Check environment variables for enablement
            if os.getenv('USE_SPLUNK', 'false').lower() == 'true' and SPLUNK_TOOL_AVAILABLE:
                try:
                    self._register_tool(SplunkQueryTool(), "olorin")
                    logger.info("Splunk tool registered (enabled via USE_SPLUNK=true)")
                except Exception as e:
                    logger.warning(f"Failed to register Splunk tool: {e}")
            elif os.getenv('USE_SPLUNK', 'false').lower() == 'true' and not SPLUNK_TOOL_AVAILABLE:
                logger.warning("Splunk tool requested but not available due to missing dependencies")
            else:
                logger.debug("Splunk tool disabled (USE_SPLUNK=false)")

            if os.getenv('USE_SUMO_LOGIC', 'false').lower() == 'true':
                try:
                    self._register_tool(SumoLogicQueryTool(), "olorin")
                    logger.info("SumoLogic tool registered (enabled via USE_SUMO_LOGIC=true)")
                except Exception as e:
                    logger.warning(f"Failed to register SumoLogic tool: {e}")
            else:
                logger.debug("SumoLogic tool disabled (USE_SUMO_LOGIC=false)")

            if os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true':
                try:
                    self._register_tool(SnowflakeQueryTool(), "olorin")
                    logger.info("Snowflake tool registered (enabled via USE_SNOWFLAKE=true)")
                except Exception as e:
                    logger.warning(f"Failed to register Snowflake tool: {e}")
            else:
                logger.debug("Snowflake tool disabled (USE_SNOWFLAKE=false)")

            # MCP Client Tools (connect to external MCP servers)
            if MCP_CLIENTS_AVAILABLE:
                if os.getenv('USE_BLOCKCHAIN_MCP_CLIENT', 'false').lower() == 'true':
                    try:
                        self._register_tool(blockchain_mcp_client, "mcp_clients")
                        logger.info("Blockchain MCP client registered")
                    except Exception as e:
                        logger.warning(f"Failed to register Blockchain MCP client: {e}")
                
                if os.getenv('USE_INTELLIGENCE_MCP_CLIENT', 'false').lower() == 'true':
                    try:
                        self._register_tool(intelligence_mcp_client, "mcp_clients")
                        logger.info("Intelligence MCP client registered")
                    except Exception as e:
                        logger.warning(f"Failed to register Intelligence MCP client: {e}")
                
                if os.getenv('USE_ML_AI_MCP_CLIENT', 'false').lower() == 'true':
                    try:
                        self._register_tool(ml_ai_mcp_client, "mcp_clients")
                        logger.info("ML/AI MCP client registered")
                    except Exception as e:
                        logger.warning(f"Failed to register ML/AI MCP client: {e}")
            
            # Threat Intelligence Tools
            if THREAT_INTEL_AVAILABLE:
                # AbuseIPDB tools
                if os.getenv('USE_ABUSEIPDB_IP_REPUTATION', 'false').lower() == 'true':
                    try:
                        self._register_tool(SimpleIPReputationTool(), "threat_intelligence")
                        logger.info("AbuseIPDB IP reputation tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register AbuseIPDB IP reputation tool: {e}")
                
                if os.getenv('USE_ABUSEIPDB_BULK_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(BulkIPAnalysisTool(), "threat_intelligence")
                        logger.info("AbuseIPDB bulk IP analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register AbuseIPDB bulk IP analysis tool: {e}")
                
                if os.getenv('USE_ABUSEIPDB_CIDR_BLOCK', 'false').lower() == 'true':
                    try:
                        self._register_tool(CIDRBlockAnalysisTool(), "threat_intelligence")
                        logger.info("AbuseIPDB CIDR block analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register AbuseIPDB CIDR block analysis tool: {e}")
                
                if os.getenv('USE_ABUSEIPDB_ABUSE_REPORTING', 'false').lower() == 'true':
                    try:
                        self._register_tool(AbuseReportingTool(), "threat_intelligence")
                        logger.info("AbuseIPDB abuse reporting tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register AbuseIPDB abuse reporting tool: {e}")
                
                # VirusTotal tools
                if os.getenv('USE_VIRUSTOTAL_IP_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(VirusTotalIPAnalysisTool(), "threat_intelligence")
                        logger.info("VirusTotal IP analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register VirusTotal IP analysis tool: {e}")
                
                if os.getenv('USE_VIRUSTOTAL_DOMAIN_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(VirusTotalDomainAnalysisTool(), "threat_intelligence")
                        logger.info("VirusTotal domain analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register VirusTotal domain analysis tool: {e}")
                
                if os.getenv('USE_VIRUSTOTAL_FILE_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(VirusTotalFileAnalysisTool(), "threat_intelligence")
                        logger.info("VirusTotal file analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register VirusTotal file analysis tool: {e}")
                
                if os.getenv('USE_VIRUSTOTAL_URL_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(VirusTotalURLAnalysisTool(), "threat_intelligence")
                        logger.info("VirusTotal URL analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register VirusTotal URL analysis tool: {e}")
                
                # Shodan tools
                if os.getenv('USE_SHODAN_INFRASTRUCTURE', 'false').lower() == 'true':
                    try:
                        self._register_tool(ShodanInfrastructureAnalysisTool(), "threat_intelligence")
                        logger.info("Shodan infrastructure analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register Shodan infrastructure analysis tool: {e}")
                
                if os.getenv('USE_SHODAN_SEARCH', 'false').lower() == 'true':
                    try:
                        self._register_tool(ShodanSearchTool(), "threat_intelligence")
                        logger.info("Shodan search tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register Shodan search tool: {e}")
                
                if os.getenv('USE_SHODAN_EXPLOIT_SEARCH', 'false').lower() == 'true':
                    try:
                        self._register_tool(ShodanExploitSearchTool(), "threat_intelligence")
                        logger.info("Shodan exploit search tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register Shodan exploit search tool: {e}")
                
                # Unified threat intelligence tool
                if os.getenv('USE_UNIFIED_THREAT_INTEL', 'false').lower() == 'true':
                    try:
                        self._register_tool(UnifiedThreatIntelligenceTool(), "threat_intelligence")
                        logger.info("Unified threat intelligence tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register unified threat intelligence tool: {e}")
            
            # Blockchain Tools
            if BLOCKCHAIN_TOOLS_AVAILABLE:
                if os.getenv('USE_BLOCKCHAIN_WALLET_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(BlockchainWalletAnalysisTool(), "blockchain")
                        logger.info("Blockchain wallet analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register blockchain wallet analysis tool: {e}")
                
                if os.getenv('USE_CRYPTOCURRENCY_TRACING', 'false').lower() == 'true':
                    try:
                        self._register_tool(CryptocurrencyTracingTool(), "blockchain")
                        logger.info("Cryptocurrency tracing tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register cryptocurrency tracing tool: {e}")
                
                if os.getenv('USE_DEFI_PROTOCOL_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(DeFiProtocolAnalysisTool(), "blockchain")
                        logger.info("DeFi protocol analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register DeFi protocol analysis tool: {e}")
                
                if os.getenv('USE_NFT_FRAUD_DETECTION', 'false').lower() == 'true':
                    try:
                        self._register_tool(NFTFraudDetectionTool(), "blockchain")
                        logger.info("NFT fraud detection tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register NFT fraud detection tool: {e}")
                
                if os.getenv('USE_BLOCKCHAIN_FORENSICS', 'false').lower() == 'true':
                    try:
                        self._register_tool(BlockchainForensicsTool(), "blockchain")
                        logger.info("Blockchain forensics tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register blockchain forensics tool: {e}")
                
                if os.getenv('USE_CRYPTO_EXCHANGE_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(CryptoExchangeAnalysisTool(), "blockchain")
                        logger.info("Crypto exchange analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register crypto exchange analysis tool: {e}")
                
                if os.getenv('USE_DARKWEB_CRYPTO_MONITOR', 'false').lower() == 'true':
                    try:
                        self._register_tool(DarkWebCryptoMonitorTool(), "blockchain")
                        logger.info("Dark web crypto monitor tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register dark web crypto monitor tool: {e}")
                
                if os.getenv('USE_CRYPTOCURRENCY_COMPLIANCE', 'false').lower() == 'true':
                    try:
                        self._register_tool(CryptocurrencyComplianceTool(), "blockchain")
                        logger.info("Cryptocurrency compliance tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register cryptocurrency compliance tool: {e}")
            
            # Intelligence Tools
            if INTELLIGENCE_TOOLS_AVAILABLE:
                if os.getenv('USE_SOCIAL_MEDIA_PROFILING', 'false').lower() == 'true':
                    try:
                        self._register_tool(SocialMediaProfilingTool(), "intelligence")
                        logger.info("Social media profiling tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register social media profiling tool: {e}")
                
                if os.getenv('USE_SOCIAL_NETWORK_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(SocialNetworkAnalysisTool(), "intelligence")
                        logger.info("Social network analysis tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register social network analysis tool: {e}")
                
                if os.getenv('USE_SOCIAL_MEDIA_MONITORING', 'false').lower() == 'true':
                    try:
                        self._register_tool(SocialMediaMonitoringTool(), "intelligence")
                        logger.info("Social media monitoring tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register social media monitoring tool: {e}")
                
                if os.getenv('USE_OSINT_DATA_AGGREGATOR', 'false').lower() == 'true':
                    try:
                        self._register_tool(OSINTDataAggregatorTool(), "intelligence")
                        logger.info("OSINT data aggregator tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register OSINT data aggregator tool: {e}")
                
                if os.getenv('USE_PEOPLE_SEARCH', 'false').lower() == 'true':
                    try:
                        self._register_tool(PeopleSearchTool(), "intelligence")
                        logger.info("People search tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register people search tool: {e}")
                
                if os.getenv('USE_BUSINESS_INTELLIGENCE', 'false').lower() == 'true':
                    try:
                        self._register_tool(BusinessIntelligenceTool(), "intelligence")
                        logger.info("Business intelligence tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register business intelligence tool: {e}")
                
                if os.getenv('USE_DARKWEB_MONITORING', 'false').lower() == 'true':
                    try:
                        self._register_tool(DarkWebMonitoringTool(), "intelligence")
                        logger.info("Dark web monitoring tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register dark web monitoring tool: {e}")
                
                if os.getenv('USE_DEEPWEB_SEARCH', 'false').lower() == 'true':
                    try:
                        self._register_tool(DeepWebSearchTool(), "intelligence")
                        logger.info("Deep web search tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register deep web search tool: {e}")
            
            # ML/AI Tools
            if ML_AI_TOOLS_AVAILABLE:
                if os.getenv('USE_BEHAVIORAL_ANALYSIS', 'false').lower() == 'true':
                    try:
                        self._register_tool(BehavioralAnalysisTool(), "ml_ai")
                        logger.info("Behavioral analysis ML tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register behavioral analysis ML tool: {e}")
                
                if os.getenv('USE_ANOMALY_DETECTION', 'false').lower() == 'true':
                    try:
                        self._register_tool(AnomalyDetectionTool(), "ml_ai")
                        logger.info("Anomaly detection ML tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register anomaly detection ML tool: {e}")
                
                if os.getenv('USE_PATTERN_RECOGNITION', 'false').lower() == 'true':
                    try:
                        self._register_tool(PatternRecognitionTool(), "ml_ai")
                        logger.info("Pattern recognition ML tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register pattern recognition ML tool: {e}")
                
                if os.getenv('USE_FRAUD_DETECTION', 'false').lower() == 'true':
                    try:
                        self._register_tool(FraudDetectionTool(), "ml_ai")
                        logger.info("Fraud detection ML tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register fraud detection ML tool: {e}")
                
                if os.getenv('USE_RISK_SCORING', 'false').lower() == 'true':
                    try:
                        self._register_tool(RiskScoringTool(), "ml_ai")
                        logger.info("Risk scoring ML tool registered")
                    except Exception as e:
                        logger.warning(f"Failed to register risk scoring ML tool: {e}")

            # MCP Server Tools (internal MCP servers)
            if MCP_SERVERS_AVAILABLE:
                # Fraud Database MCP Server Tools
                if os.getenv('USE_FRAUD_DATABASE_MCP_SERVER', 'false').lower() == 'true':
                    try:
                        # Create the server asynchronously and get its tools
                        fraud_server = self._safe_async_run(create_fraud_database_server)
                        fraud_tools = fraud_server.get_tools() if fraud_server else []
                        for tool in fraud_tools:
                            self._register_tool(tool, "mcp_servers")
                        logger.info(f"Fraud Database MCP server registered with {len(fraud_tools)} tools: {[t.name for t in fraud_tools]}")
                    except Exception as e:
                        logger.warning(f"Failed to register Fraud Database MCP server tools: {e}")
                
                # External API MCP Server Tools  
                if os.getenv('USE_EXTERNAL_API_MCP_SERVER', 'false').lower() == 'true':
                    try:
                        # Create the server asynchronously and get its tools
                        api_server = self._safe_async_run(create_external_api_server)
                        api_tools = api_server.get_tools() if api_server else []
                        for tool in api_tools:
                            self._register_tool(tool, "mcp_servers")
                        logger.info(f"External API MCP server registered with {len(api_tools)} tools: {[t.name for t in api_tools]}")
                    except Exception as e:
                        logger.warning(f"Failed to register External API MCP server tools: {e}")
                
                # Graph Analysis MCP Server Tools
                if os.getenv('USE_GRAPH_ANALYSIS_MCP_SERVER', 'false').lower() == 'true':
                    try:
                        # Create the server asynchronously and get its tools
                        graph_server = self._safe_async_run(create_graph_analysis_server)
                        graph_tools = graph_server.get_tools() if graph_server else []
                        for tool in graph_tools:
                            self._register_tool(tool, "mcp_servers")
                        logger.info(f"Graph Analysis MCP server registered with {len(graph_tools)} tools: {[t.name for t in graph_tools]}")
                    except Exception as e:
                        logger.warning(f"Failed to register Graph Analysis MCP server tools: {e}")

            self._initialized = True
            logger.info(f"Tool registry initialized with {len(self._tools)} tools")

        except Exception as e:
            logger.error(f"Failed to initialize tool registry: {e}")
            raise

    def _register_tool(self, tool: BaseTool, category: str) -> None:
        """Register a tool in the registry."""
        self._tools[tool.name] = tool
        if category in self._tool_categories:
            self._tool_categories[category].append(tool.name)

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        self._ensure_initialized()
        return self._tools.get(name)

    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """Get all tools in a specific category."""
        self._ensure_initialized()
        
        if category not in self._tool_categories:
            return []

        return [
            self._tools[tool_name]
            for tool_name in self._tool_categories[category]
            if tool_name in self._tools
        ]

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools."""
        self._ensure_initialized()
        return list(self._tools.values())

    def get_tool_names(self) -> List[str]:
        """Get names of all registered tools."""
        self._ensure_initialized()
        return list(self._tools.keys())

    def get_categories(self) -> List[str]:
        """Get all available tool categories."""
        return list(self._tool_categories.keys())

    def get_tools_summary(self) -> Dict[str, Any]:
        """Get a summary of all tools organized by category."""
        summary = {"total_tools": len(self._tools), "categories": {}}

        for category, tool_names in self._tool_categories.items():
            available_tools = [name for name in tool_names if name in self._tools]
            summary["categories"][category] = {
                "count": len(available_tools),
                "tools": [
                    {"name": name, "description": self._tools[name].description}
                    for name in available_tools
                ],
            }

        return summary

    def is_initialized(self) -> bool:
        """Check if the registry is initialized with tools loaded."""
        return self._initialized and len(self._tools) > 0 and not self._initialization_in_progress


# Global tool registry instance
tool_registry = ToolRegistry()


def get_tools_for_agent(
    categories: Optional[List[str]] = None, tool_names: Optional[List[str]] = None
) -> List[BaseTool]:
    """
    Get tools for a LangGraph agent.

    Args:
        categories: List of tool categories to include
        tool_names: Specific tool names to include

    Returns:
        List of BaseTool instances
    """
    logger.info(f"🔍 get_tools_for_agent called with categories: {categories}, tool_names: {tool_names}")
    
    # Ensure initialization before accessing tools
    tool_registry._ensure_initialized()
    
    # CRITICAL DEBUG: Check tool registry state after initialization
    logger.info(f"📊 Registry state: initialized={tool_registry._initialized}, tools_count={len(tool_registry._tools)}")
    if len(tool_registry._tools) > 0:
        logger.info(f"🔧 Available tool names: {list(tool_registry._tools.keys())[:10]}...")  # First 10
    
    if not tool_registry.is_initialized():
        logger.error("❌ Tool registry initialization failed - returning empty tool list")
        return []

    if len(tool_registry._tools) == 0:
        logger.error("❌ CRITICAL: Tool registry shows initialized but has no tools!")
        # Force re-initialization attempt
        logger.warning("🔄 Attempting emergency re-initialization...")
        try:
            tool_registry.initialize()
            logger.info(f"✅ Emergency re-initialization completed: {len(tool_registry._tools)} tools now available")
        except Exception as e:
            logger.error(f"❌ Emergency re-initialization failed: {e}")
            return []

    tools = []

    if tool_names:
        # Get specific tools by name
        for name in tool_names:
            tool = tool_registry.get_tool(name)
            if tool:
                tools.append(tool)
                logger.debug(f"✅ Tool '{name}' added from registry")
            else:
                logger.warning(f"❌ Tool '{name}' not found in registry")

    if categories:
        # Get tools by category
        for category in categories:
            category_tools = tool_registry.get_tools_by_category(category)
            tools.extend(category_tools)
            logger.debug(f"✅ Added {len(category_tools)} tools from category '{category}'")

    # Remove duplicates while preserving order
    seen = set()
    unique_tools = []
    for tool in tools:
        if tool.name not in seen:
            seen.add(tool.name)
            unique_tools.append(tool)

    logger.info(f"✅ Retrieved {len(unique_tools)} tools for agent (categories: {categories}, specific: {tool_names})")
    
    # CRITICAL VALIDATION: Ensure tools are actually callable
    if len(unique_tools) > 0:
        test_tool = unique_tools[0]
        if hasattr(test_tool, 'invoke') and hasattr(test_tool, 'name') and hasattr(test_tool, 'description'):
            logger.info(f"✅ Tool validation passed: sample tool '{test_tool.name}' is properly initialized")
        else:
            logger.error(f"❌ Tool validation FAILED: sample tool '{test_tool.name}' missing required attributes")
    
    return unique_tools


def initialize_tools(
    database_connection_string: Optional[str] = None,
    web_search_user_agent: Optional[str] = None,
    file_system_base_path: Optional[str] = None,
    api_default_headers: Optional[Dict[str, str]] = None,
) -> None:
    """
    Initialize the global tool registry.

    Args:
        database_connection_string: Database connection string for DB tools
        web_search_user_agent: User agent for web search tools
        file_system_base_path: Base path restriction for file system tools
        api_default_headers: Default headers for API tools
    """
    tool_registry.initialize(
        database_connection_string=database_connection_string,
        web_search_user_agent=web_search_user_agent,
        file_system_base_path=file_system_base_path,
        api_default_headers=api_default_headers,
    )


# Convenience functions for getting specific tool sets
def get_database_tools() -> List[BaseTool]:
    """Get all database tools."""
    return tool_registry.get_tools_by_category("database")


def get_web_tools() -> List[BaseTool]:
    """Get all web-related tools."""
    return tool_registry.get_tools_by_category("web")


def get_file_system_tools() -> List[BaseTool]:
    """Get all file system tools."""
    return tool_registry.get_tools_by_category("file_system")


def get_api_tools() -> List[BaseTool]:
    """Get all API tools."""
    return tool_registry.get_tools_by_category("api")


def get_search_tools() -> List[BaseTool]:
    """Get all search tools."""
    return tool_registry.get_tools_by_category("search")


def get_olorin_tools() -> List[BaseTool]:
    """Get Olorin-specific tools (Splunk, SumoLogic, Snowflake)."""
    return tool_registry.get_tools_by_category("olorin")


def get_threat_intelligence_tools() -> List[BaseTool]:
    """Get threat intelligence tools (AbuseIPDB, VirusTotal, unified aggregator, etc.)."""
    return tool_registry.get_tools_by_category("threat_intelligence")


def get_mcp_client_tools() -> List[BaseTool]:
    """Get MCP client tools that connect to external MCP servers."""
    return tool_registry.get_tools_by_category("mcp_clients")


def get_blockchain_tools() -> List[BaseTool]:
    """Get blockchain and cryptocurrency analysis tools."""
    return tool_registry.get_tools_by_category("blockchain")


def get_intelligence_tools() -> List[BaseTool]:
    """Get advanced intelligence gathering tools (SOCMINT, OSINT, Dark Web)."""
    return tool_registry.get_tools_by_category("intelligence")


def get_ml_ai_tools() -> List[BaseTool]:
    """Get machine learning and AI enhancement tools."""
    return tool_registry.get_tools_by_category("ml_ai")


def get_mcp_server_tools() -> List[BaseTool]:
    """Get internal MCP server tools (fraud database, external API, graph analysis)."""
    return tool_registry.get_tools_by_category("mcp_servers")


def get_essential_tools() -> List[BaseTool]:
    """Get a curated set of essential tools for most agents."""
    return get_tools_for_agent(
        tool_names=[
            "web_search",
            "web_scrape",
            "file_read",
            "directory_list",
            "http_request",
        ]
    )
