"""
Tool Name Mapper
================

Maps tool names from real LLM responses to actual tool names in the registry.
This enables the MockLLM to use real responses while matching available tools.

Author: Gil Klainert
Date: 2025-09-07
"""

from typing import Dict, Optional

# Mapping from real LLM tool names to actual registry tool names
TOOL_NAME_MAPPING: Dict[str, str] = {
    # Device Analysis Tools
    "analyze_device_fingerprint": "behavioral_analysis_ml",
    "check_device_history": "snowflake_query_tool",
    "detect_spoofing_attempts": "fraud_detection_ml",
    # Network Analysis Tools
    "analyze_network_behavior": "unified_threat_intelligence",
    "check_ip_reputation": "abuseipdb_ip_reputation",
    "detect_proxy_usage": "shodan_infrastructure_analysis",
    # Location Analysis Tools
    "verify_geolocation": "abuseipdb_ip_reputation",
    "analyze_travel_patterns": "anomaly_detection_ml",
    # Logs Analysis Tools
    "analyze_activity_logs": "splunk_query_tool",
    "detect_anomalies": "anomaly_detection_ml",
    # Risk Assessment Tools
    "calculate_risk_score": "risk_scoring_ml",
    "generate_risk_report": "fraud_detection_ml",
}

# Reverse mapping for converting back
REVERSE_TOOL_MAPPING: Dict[str, str] = {v: k for k, v in TOOL_NAME_MAPPING.items()}


def map_tool_name(tool_name: str, reverse: bool = False) -> str:
    """
    Map a tool name from real LLM response to registry name or vice versa.

    Args:
        tool_name: The tool name to map
        reverse: If True, map from registry name to LLM name

    Returns:
        str: The mapped tool name, or original if no mapping found
    """
    mapping = REVERSE_TOOL_MAPPING if reverse else TOOL_NAME_MAPPING
    return mapping.get(tool_name, tool_name)


def get_registry_name(llm_tool_name: str) -> str:
    """
    Get the actual registry tool name from an LLM tool name.

    Args:
        llm_tool_name: The tool name from LLM response

    Returns:
        str: The actual tool name in the registry
    """
    return TOOL_NAME_MAPPING.get(llm_tool_name, llm_tool_name)


def get_llm_name(registry_tool_name: str) -> str:
    """
    Get the LLM tool name from a registry tool name.

    Args:
        registry_tool_name: The actual tool name in the registry

    Returns:
        str: The tool name as used in LLM responses
    """
    return REVERSE_TOOL_MAPPING.get(registry_tool_name, registry_tool_name)


def is_mapped_tool(tool_name: str, reverse: bool = False) -> bool:
    """
    Check if a tool name has a mapping.

    Args:
        tool_name: The tool name to check
        reverse: If True, check reverse mapping

    Returns:
        bool: True if tool name has a mapping
    """
    mapping = REVERSE_TOOL_MAPPING if reverse else TOOL_NAME_MAPPING
    return tool_name in mapping


def get_all_mappings() -> Dict[str, str]:
    """
    Get all tool name mappings.

    Returns:
        Dict[str, str]: Complete mapping dictionary
    """
    return TOOL_NAME_MAPPING.copy()


def get_available_llm_names() -> list[str]:
    """
    Get all available LLM tool names that can be mapped.

    Returns:
        list[str]: List of LLM tool names
    """
    return list(TOOL_NAME_MAPPING.keys())


def get_available_registry_names() -> list[str]:
    """
    Get all available registry tool names that can be mapped.

    Returns:
        list[str]: List of registry tool names
    """
    return list(TOOL_NAME_MAPPING.values())
