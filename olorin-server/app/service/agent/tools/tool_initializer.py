"""Tool initialization logic separated from registry."""

from typing import Dict, Optional

from langchain_core.tools import BaseTool

from app.service.logging import get_bridge_logger

from .tool_config import ToolConfig

logger = get_bridge_logger(__name__)


class ToolInitializer:
    """Handles tool initialization based on configuration."""

    @staticmethod
    def initialize_olorin_tools(registry) -> None:
        """Initialize Olorin-specific tools based on environment configuration."""

        # Snowflake tool
        if ToolConfig.is_tool_enabled("snowflake"):
            try:
                from .snowflake_tool.snowflake_tool import SnowflakeQueryTool

                tool = SnowflakeQueryTool()
                registry._register_tool(tool, "olorin")
                logger.info("Snowflake tool registered (USE_SNOWFLAKE=true)")
            except Exception as e:
                logger.error(f"Failed to register Snowflake tool: {e}")

        # Splunk tool
        if ToolConfig.is_tool_enabled("splunk"):
            try:
                from .splunk_tool import SplunkQueryTool

                tool = SplunkQueryTool()
                registry._register_tool(tool, "olorin")
                logger.info("Splunk tool registered (USE_SPLUNK=true)")
            except Exception as e:
                logger.error(f"Failed to register Splunk tool: {e}")

        # SumoLogic tool
        if ToolConfig.is_tool_enabled("sumo_logic"):
            try:
                from .sumologic_tool.sumologic_tool import SumoLogicQueryTool

                tool = SumoLogicQueryTool()
                registry._register_tool(tool, "olorin")
                logger.info("SumoLogic tool registered (USE_SUMO_LOGIC=true)")
            except Exception as e:
                logger.error(f"Failed to register SumoLogic tool: {e}")

        # Databricks tool (if implemented)
        if ToolConfig.is_tool_enabled("databricks"):
            logger.info("Databricks tool enabled but not yet implemented")

    @staticmethod
    def initialize_threat_intel_tools(registry) -> None:
        """Initialize threat intelligence tools based on configuration."""

        # Check if any threat intel tools are enabled
        abuseipdb_enabled = ToolConfig.is_tool_enabled("abuseipdb")
        virustotal_enabled = ToolConfig.is_tool_enabled("virustotal")
        shodan_enabled = ToolConfig.is_tool_enabled("shodan")

        if not (abuseipdb_enabled or virustotal_enabled or shodan_enabled):
            logger.debug("All threat intelligence tools are disabled")
            return

        try:
            # AbuseIPDB tools
            if abuseipdb_enabled:
                from .threat_intelligence_tool.abuseipdb.abuse_reporting_tool import (
                    AbuseReportingTool,
                )
                from .threat_intelligence_tool.abuseipdb.bulk_analysis_tool import (
                    BulkIPAnalysisTool,
                )
                from .threat_intelligence_tool.abuseipdb.cidr_block_tool import (
                    CIDRBlockAnalysisTool,
                )
                from .threat_intelligence_tool.abuseipdb.simple_ip_reputation_tool import (
                    SimpleIPReputationTool,
                )

                tools = [
                    SimpleIPReputationTool(),
                    BulkIPAnalysisTool(),
                    CIDRBlockAnalysisTool(),
                    AbuseReportingTool(),
                ]

                for tool in tools:
                    try:
                        registry._register_tool(tool, "threat_intelligence")
                        logger.info(f"AbuseIPDB tool registered: {tool.name}")
                    except Exception as e:
                        logger.warning(
                            f"Failed to register AbuseIPDB tool {tool.name}: {e}"
                        )

            # VirusTotal tools
            if virustotal_enabled:
                from .threat_intelligence_tool.virustotal.domain_analysis_tool import (
                    VirusTotalDomainAnalysisTool,
                )
                from .threat_intelligence_tool.virustotal.file_analysis_tool import (
                    VirusTotalFileAnalysisTool,
                )
                from .threat_intelligence_tool.virustotal.ip_analysis_tool import (
                    VirusTotalIPAnalysisTool,
                )
                from .threat_intelligence_tool.virustotal.url_analysis_tool import (
                    VirusTotalURLAnalysisTool,
                )

                tools = [
                    VirusTotalIPAnalysisTool(),
                    VirusTotalDomainAnalysisTool(),
                    VirusTotalFileAnalysisTool(),
                    VirusTotalURLAnalysisTool(),
                ]

                for tool in tools:
                    try:
                        registry._register_tool(tool, "threat_intelligence")
                        logger.info(f"VirusTotal tool registered: {tool.name}")
                    except Exception as e:
                        logger.warning(
                            f"Failed to register VirusTotal tool {tool.name}: {e}"
                        )

            # Shodan tools
            if shodan_enabled:
                from .threat_intelligence_tool.shodan.exploit_search_tool import (
                    ShodanExploitSearchTool,
                )
                from .threat_intelligence_tool.shodan.infrastructure_analysis_tool import (
                    ShodanInfrastructureAnalysisTool,
                )
                from .threat_intelligence_tool.shodan.search_tool import (
                    ShodanSearchTool,
                )

                tools = [
                    ShodanInfrastructureAnalysisTool(),
                    ShodanSearchTool(),
                    ShodanExploitSearchTool(),
                ]

                for tool in tools:
                    try:
                        registry._register_tool(tool, "threat_intelligence")
                        logger.info(f"Shodan tool registered: {tool.name}")
                    except Exception as e:
                        logger.warning(
                            f"Failed to register Shodan tool {tool.name}: {e}"
                        )

        except ImportError as e:
            logger.warning(f"Threat intelligence tools import failed: {e}")

    @staticmethod
    def initialize_blockchain_tools(registry) -> None:
        """Initialize blockchain tools based on configuration."""

        if not ToolConfig.is_tool_enabled("blockchain"):
            logger.debug("Blockchain tools are disabled")
            return

        try:
            from .blockchain_tools import (
                BlockchainForensicsTool,
                BlockchainWalletAnalysisTool,
                CryptocurrencyComplianceTool,
                CryptocurrencyTracingTool,
                CryptoExchangeAnalysisTool,
                DarkWebCryptoMonitorTool,
                DeFiProtocolAnalysisTool,
                NFTFraudDetectionTool,
            )

            tools = [
                BlockchainWalletAnalysisTool(),
                CryptocurrencyTracingTool(),
                DeFiProtocolAnalysisTool(),
                NFTFraudDetectionTool(),
                BlockchainForensicsTool(),
                CryptoExchangeAnalysisTool(),
                DarkWebCryptoMonitorTool(),
                CryptocurrencyComplianceTool(),
            ]

            for tool in tools:
                try:
                    registry._register_tool(tool, "blockchain")
                    logger.info(f"Blockchain tool registered: {tool.name}")
                except Exception as e:
                    logger.warning(
                        f"Failed to register blockchain tool {tool.name}: {e}"
                    )

        except ImportError as e:
            logger.warning(f"Blockchain tools import failed: {e}")

    @staticmethod
    def initialize_intelligence_tools(registry) -> None:
        """Initialize intelligence gathering tools based on configuration."""

        osint_enabled = ToolConfig.is_tool_enabled("osint")
        social_media_enabled = ToolConfig.is_tool_enabled("social_media")
        dark_web_enabled = ToolConfig.is_tool_enabled("dark_web")

        if not (osint_enabled or social_media_enabled or dark_web_enabled):
            logger.debug("All intelligence tools are disabled")
            return

        try:
            from .intelligence_tools import (
                BusinessIntelligenceTool,
                DarkWebMonitoringTool,
                DeepWebSearchTool,
                OSINTDataAggregatorTool,
                PeopleSearchTool,
                SocialMediaMonitoringTool,
                SocialMediaProfilingTool,
                SocialNetworkAnalysisTool,
            )

            tools = []

            if social_media_enabled:
                tools.extend(
                    [
                        SocialMediaProfilingTool(),
                        SocialNetworkAnalysisTool(),
                        SocialMediaMonitoringTool(),
                    ]
                )

            if osint_enabled:
                tools.extend(
                    [
                        OSINTDataAggregatorTool(),
                        PeopleSearchTool(),
                        BusinessIntelligenceTool(),
                    ]
                )

            if dark_web_enabled:
                tools.extend([DarkWebMonitoringTool(), DeepWebSearchTool()])

            for tool in tools:
                try:
                    registry._register_tool(tool, "intelligence")
                    logger.info(f"Intelligence tool registered: {tool.name}")
                except Exception as e:
                    logger.warning(
                        f"Failed to register intelligence tool {tool.name}: {e}"
                    )

        except ImportError as e:
            logger.warning(f"Intelligence tools import failed: {e}")

    @staticmethod
    def initialize_ml_tools(registry) -> None:
        """Initialize ML/AI tools based on configuration."""

        if not ToolConfig.is_tool_enabled("ml_models"):
            logger.debug("ML/AI tools are disabled")
            return

        try:
            from .ml_ai_tools import (
                AnomalyDetectionTool,
                BehavioralAnalysisTool,
                FraudDetectionTool,
                PatternRecognitionTool,
                RiskScoringTool,
            )

            tools = [
                BehavioralAnalysisTool(),
                AnomalyDetectionTool(),
                PatternRecognitionTool(),
                FraudDetectionTool(),
                RiskScoringTool(),
            ]

            for tool in tools:
                try:
                    registry._register_tool(tool, "ml_ai")
                    logger.info(f"ML/AI tool registered: {tool.name}")
                except Exception as e:
                    logger.warning(f"Failed to register ML/AI tool {tool.name}: {e}")

        except ImportError as e:
            logger.warning(f"ML/AI tools import failed: {e}")
