"""
Agent Tools Configuration - Maps agents to their compatible tools with .env filtering.

This module provides:
1. Default agent→tools mapping for each investigation agent
2. .env-based tool filtering (exclude tools with USE_TOOL_NAME=false)
3. Configuration-driven approach per SYSTEM MANDATE

Environment Variables:
    USE_SNOWFLAKE_TOOL: Enable/disable Snowflake query tool (default: true)
    USE_SPLUNK_TOOL: Enable/disable Splunk query tool (default: true)
    USE_SUMOLOGIC_TOOL: Enable/disable SumoLogic query tool (default: true)
    USE_ABUSEIPDB_TOOL: Enable/disable AbuseIPDB IP reputation tool (default: true)
    USE_VIRUSTOTAL_TOOL: Enable/disable VirusTotal analysis tools (default: true)
    USE_SHODAN_TOOL: Enable/disable Shodan infrastructure analysis (default: true)
    USE_BLOCKCHAIN_TOOLS: Enable/disable blockchain analysis tools (default: false)
    USE_INTELLIGENCE_TOOLS: Enable/disable OSINT/SOCMINT tools (default: false)
    USE_ML_AI_TOOLS: Enable/disable ML/AI enhancement tools (default: false)
"""

import os
from typing import Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


# Default agent→tools mapping
# Each agent has specific tools optimized for its analysis domain
AGENT_TOOLS_MAPPING = {
    "Network Agent": [
        # Core network analysis tools
        "maxmind_minfraud",  # Composio integration - MaxMind minFraud IP risk scoring
        "simple_ip_reputation",
        "bulk_ip_analysis",
        "cidr_block_analysis",
        "virustotal_ip_analysis",
        "virustotal_domain_analysis",
        "virustotal_url_analysis",
        "shodan_infrastructure_analysis",
        "shodan_search",
        "unified_threat_intelligence",
        # Data sources
        "snowflake_query_tool",
        "splunk_query",
        "sumologic_query",
        # Utility tools
        "http_request",
        "json_api",
        "web_search",
        "database_query",
    ],
    "Location Agent": [
        # Geographic analysis tools
        "maxmind_minfraud",  # Composio integration - MaxMind minFraud for geolocation
        "snowflake_query_tool",
        "splunk_query",
        "sumologic_query",
        "database_query",
        # Supporting tools
        "http_request",
        "json_api",
        "web_search",
        "vector_search",
    ],
    "Device Agent": [
        # Device fingerprinting and analysis
        "device_fingerprint_analysis",  # Composio integration - device fingerprint tool
        "snowflake_query_tool",
        "splunk_query",
        "sumologic_query",
        "database_query",
        # Threat intelligence for device IPs
        "simple_ip_reputation",
        "virustotal_ip_analysis",
        "shodan_infrastructure_analysis",
        # Utility tools
        "http_request",
        "json_api",
        "web_search",
    ],
    "Logs Agent": [
        # Log analysis tools
        "splunk_query",
        "sumologic_query",
        "snowflake_query_tool",
        "database_query",
        # Pattern recognition
        "vector_search",
        "web_search",
        # Utility tools
        "http_request",
        "json_api",
        "file_read",
        "file_search",
    ],
    "Behavior Agent": [
        # Behavioral analysis tools
        "snowflake_query_tool",
        "splunk_query",
        "sumologic_query",
        "database_query",
        # ML/AI tools (if enabled)
        "behavioral_analysis",
        "anomaly_detection",
        "pattern_recognition",
        "fraud_detection",
        # Supporting tools
        "vector_search",
        "http_request",
        "json_api",
    ],
    "Risk Agent": [
        # Risk assessment tools
        "maxmind_minfraud",  # Composio integration - MaxMind minFraud for risk aggregation
        "composio_action",  # Composio integration - automated fraud response actions
        "graph_feature_analysis",  # Graph database integration - cluster risk and shared device features
        "snowflake_query_tool",
        "database_query",
        # Threat intelligence
        "simple_ip_reputation",
        "unified_threat_intelligence",
        "virustotal_ip_analysis",
        "virustotal_domain_analysis",
        "shodan_infrastructure_analysis",
        # ML/AI risk scoring (if enabled)
        "risk_scoring",
        "fraud_detection",
        "anomaly_detection",
        # Data aggregation
        "splunk_query",
        "sumologic_query",
        "http_request",
        "json_api",
    ],
}


def is_tool_enabled(tool_name: str) -> bool:
    """
    Check if a tool is enabled via environment variables.

    Environment variables follow pattern: USE_{TOOL_CATEGORY}_TOOL=true/false

    Args:
        tool_name: Name of the tool to check

    Returns:
        True if tool is enabled, False otherwise
    """
    # Map tool names to environment variable names
    tool_env_mapping = {
        # Data sources
        "snowflake_query_tool": "USE_SNOWFLAKE_TOOL",
        "splunk_query": "USE_SPLUNK_TOOL",
        "sumologic_query": "USE_SUMOLOGIC_TOOL",
        # Threat intelligence
        "simple_ip_reputation": "USE_ABUSEIPDB_TOOL",
        "bulk_ip_analysis": "USE_ABUSEIPDB_TOOL",
        "cidr_block_analysis": "USE_ABUSEIPDB_TOOL",
        "abuse_reporting": "USE_ABUSEIPDB_TOOL",
        "virustotal_ip_analysis": "USE_VIRUSTOTAL_TOOL",
        "virustotal_domain_analysis": "USE_VIRUSTOTAL_TOOL",
        "virustotal_file_analysis": "USE_VIRUSTOTAL_TOOL",
        "virustotal_url_analysis": "USE_VIRUSTOTAL_TOOL",
        "shodan_infrastructure_analysis": "USE_SHODAN_TOOL",
        "shodan_search": "USE_SHODAN_TOOL",
        "shodan_exploit_search": "USE_SHODAN_TOOL",
        "unified_threat_intelligence": "USE_UNIFIED_THREAT_INTEL_TOOL",
        # Blockchain tools
        "blockchain_wallet_analysis": "USE_BLOCKCHAIN_TOOLS",
        "cryptocurrency_tracing": "USE_BLOCKCHAIN_TOOLS",
        "defi_protocol_analysis": "USE_BLOCKCHAIN_TOOLS",
        "nft_fraud_detection": "USE_BLOCKCHAIN_TOOLS",
        "blockchain_forensics": "USE_BLOCKCHAIN_TOOLS",
        "crypto_exchange_analysis": "USE_BLOCKCHAIN_TOOLS",
        "darkweb_crypto_monitor": "USE_BLOCKCHAIN_TOOLS",
        "cryptocurrency_compliance": "USE_BLOCKCHAIN_TOOLS",
        # Intelligence tools
        "social_media_profiling": "USE_INTELLIGENCE_TOOLS",
        "social_network_analysis": "USE_INTELLIGENCE_TOOLS",
        "social_media_monitoring": "USE_INTELLIGENCE_TOOLS",
        "osint_data_aggregator": "USE_INTELLIGENCE_TOOLS",
        "people_search": "USE_INTELLIGENCE_TOOLS",
        "business_intelligence": "USE_INTELLIGENCE_TOOLS",
        "darkweb_monitoring": "USE_INTELLIGENCE_TOOLS",
        "deepweb_search": "USE_INTELLIGENCE_TOOLS",
        # ML/AI tools
        "behavioral_analysis": "USE_ML_AI_TOOLS",
        "anomaly_detection": "USE_ML_AI_TOOLS",
        "pattern_recognition": "USE_ML_AI_TOOLS",
        "fraud_detection": "USE_ML_AI_TOOLS",
        "risk_scoring": "USE_ML_AI_TOOLS",
        # Device fingerprinting (Composio integration)
        "device_fingerprint_analysis": "USE_DEVICE_FINGERPRINT",
    }

    # Get environment variable name for this tool
    env_var = tool_env_mapping.get(tool_name)

    # If no specific env var mapping, assume core tool (always enabled)
    if not env_var:
        return True

    # Check environment variable (default to True if not set)
    env_value = os.getenv(env_var, "true").lower()
    return env_value in ("true", "1", "yes", "on")


def get_filtered_agent_tools_mapping() -> Dict[str, List[str]]:
    """
    Get agent→tools mapping filtered by .env configuration.

    Tools disabled via USE_*_TOOL=false will be excluded.

    Returns:
        Dictionary mapping agent names to lists of enabled tool names
    """
    filtered_mapping = {}

    for agent_name, tools in AGENT_TOOLS_MAPPING.items():
        # Filter tools based on environment configuration
        enabled_tools = [tool for tool in tools if is_tool_enabled(tool)]

        filtered_mapping[agent_name] = enabled_tools

        # Log filtering results
        disabled_count = len(tools) - len(enabled_tools)
        if disabled_count > 0:
            logger.info(
                f"Agent '{agent_name}': {len(enabled_tools)}/{len(tools)} tools enabled "
                f"({disabled_count} disabled via .env)"
            )

    return filtered_mapping


def get_agent_tools(agent_name: str) -> List[str]:
    """
    Get tools available for a specific agent, filtered by .env configuration.

    Args:
        agent_name: Name of the agent (e.g., "Network Agent")

    Returns:
        List of enabled tool names for this agent
    """
    filtered_mapping = get_filtered_agent_tools_mapping()
    return filtered_mapping.get(agent_name, [])


def validate_agent_tools_mapping(mapping: Dict[str, List[str]]) -> bool:
    """
    Validate a custom agent-tools mapping.

    Args:
        mapping: Custom agent→tools mapping to validate

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(mapping, dict):
        logger.warning("Invalid mapping type: expected dict")
        return False

    for agent, tools in mapping.items():
        if not isinstance(agent, str):
            logger.warning(f"Invalid agent name type: {type(agent)}")
            return False

        if not isinstance(tools, list):
            logger.warning(f"Invalid tools type for agent '{agent}': {type(tools)}")
            return False

        for tool in tools:
            if not isinstance(tool, str):
                logger.warning(
                    f"Invalid tool name type in agent '{agent}': {type(tool)}"
                )
                return False

    return True
