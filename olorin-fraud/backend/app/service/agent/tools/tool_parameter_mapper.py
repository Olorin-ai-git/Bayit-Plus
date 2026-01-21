"""
Tool Parameter Mapper

This module provides parameter mapping functionality to ensure tools receive
the correct parameter names regardless of how the LLM generates them.
"""

import ipaddress
import re
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolParameterMapper:
    """Maps and validates tool parameters to ensure correct naming."""

    # Common parameter name mappings
    PARAMETER_MAPPINGS = {
        # IP address mappings
        "ip": "ip",
        "ip_addr": "ip",
        "target": "ip",  # Only for IP-related tools
        "address": "ip",
        # Domain mappings
        "domain_name": "domain",
        "hostname": "domain",
        "site": "domain",
        # Note: 'url' mapping removed - it should stay as 'url' for URL analysis tools
        # Query mappings
        "search_query": "query",
        "search": "query",
        "q": "query",
        # Time mappings
        "days": "max_age_days",
        "age": "max_age_days",
        "max_days": "max_age_days",
        # Boolean mappings
        "verbose": "include_details",
        "detailed": "include_details",
        "details": "include_details",
        "include_vendor": "include_vendor_details",
        "vendors": "include_vendor_details",
        "history": "include_history",
        "historical": "include_history",
        "vulns": "include_vulnerabilities",
        "vulnerabilities": "include_vulnerabilities",
        "services": "include_services",
        "service_info": "include_services",
    }

    # Tool-specific parameter requirements
    TOOL_PARAMETERS = {
        # AbuseIPDB tools
        "abuseipdb_ip_reputation": {
            "required": ["ip"],
            "optional": ["max_age_days", "include_details"],
            "defaults": {"max_age_days": 90, "include_details": True},
        },
        "abuseipdb_ip_blacklist": {
            "required": [],
            "optional": ["limit", "plain_text", "confidence_minimum"],
            "defaults": {"limit": 100, "plain_text": False, "confidence_minimum": 75},
        },
        "abuseipdb_abuse_reporting": {
            "required": ["ip", "categories"],
            "optional": ["comment"],
            "defaults": {},
        },
        # VirusTotal tools
        "virustotal_ip_analysis": {
            "required": ["ip"],
            "optional": ["include_vendor_details"],
            "defaults": {"include_vendor_details": False},
        },
        "virustotal_domain_analysis": {
            "required": ["domain"],
            "optional": ["include_vendor_details"],
            "defaults": {"include_vendor_details": False},
        },
        "virustotal_file_analysis": {
            "required": ["file_hash"],
            "optional": ["include_vendor_details"],
            "defaults": {"include_vendor_details": False},
        },
        "virustotal_url_analysis": {
            "required": ["url"],
            "optional": ["include_vendor_details"],
            "defaults": {"include_vendor_details": False},
        },
        # Shodan tools
        "shodan_infrastructure_analysis": {
            "required": ["ip"],
            "optional": [
                "include_history",
                "include_vulnerabilities",
                "include_services",
            ],
            "defaults": {
                "include_history": False,
                "include_vulnerabilities": True,
                "include_services": True,
            },
        },
        "shodan_domain_search": {
            "required": ["domain"],
            "optional": ["include_subdomains"],
            "defaults": {"include_subdomains": True},
        },
        "shodan_network_search": {
            "required": ["query"],
            "optional": ["limit"],
            "defaults": {"limit": 100},
        },
        # Unified threat intelligence
        "unified_threat_intelligence": {
            "required": ["target"],
            "optional": ["sources", "include_details"],
            "defaults": {
                "sources": ["abuseipdb", "virustotal", "shodan"],
                "include_details": True,
            },
        },
    }

    @classmethod
    def fix_tool_parameters(
        cls, tool_name: str, args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fix tool parameters to ensure correct naming.

        Args:
            tool_name: Name of the tool being invoked
            args: Original arguments from LLM

        Returns:
            Fixed arguments with correct parameter names
        """
        # Create a copy to avoid modifying original
        fixed_args = {}

        # Get tool parameter requirements
        tool_spec = cls.TOOL_PARAMETERS.get(tool_name)

        if not tool_spec:
            # If tool not in our spec, return args as-is but with basic mapping
            return cls._apply_basic_mapping(args)

        # First, apply parameter name mappings
        for original_key, value in args.items():
            # Check if this parameter needs to be mapped
            mapped_key = cls.PARAMETER_MAPPINGS.get(original_key.lower(), original_key)

            # Special handling for 'target' parameter
            if original_key.lower() == "target":
                # Determine if target should be ip or domain
                if cls._is_ip_address(value):
                    mapped_key = "ip" if "ip" in tool_spec["required"] else "target"
                elif cls._is_domain(value):
                    mapped_key = (
                        "domain" if "domain" in tool_spec["required"] else "target"
                    )
                else:
                    mapped_key = "target"  # Keep as-is if can't determine

            fixed_args[mapped_key] = value

        # Add default values for missing optional parameters
        for param, default_value in tool_spec.get("defaults", {}).items():
            if param not in fixed_args:
                fixed_args[param] = default_value

        # Validate required parameters
        missing_params = []
        for required_param in tool_spec["required"]:
            if required_param not in fixed_args:
                # Try to infer from other parameters
                if required_param == "ip":
                    # Check if we have something that looks like an IP
                    for key, value in args.items():
                        if cls._is_ip_address(str(value)):
                            fixed_args["ip"] = str(value)
                            break
                elif required_param == "domain":
                    # Check if we have something that looks like a domain
                    for key, value in args.items():
                        if cls._is_domain(str(value)):
                            fixed_args["domain"] = str(value)
                            break

                # Check again if parameter was added
                if required_param not in fixed_args:
                    missing_params.append(required_param)

        if missing_params:
            logger.warning(
                f"Tool {tool_name} missing required parameters: {missing_params}. "
                f"Original args: {args}, Fixed args: {fixed_args}"
            )

        # Remove any parameters not expected by the tool
        expected_params = set(tool_spec["required"] + tool_spec["optional"])
        cleaned_args = {
            k: v
            for k, v in fixed_args.items()
            if k in expected_params or tool_name == "unified_threat_intelligence"
        }

        logger.debug(f"Parameter mapping for {tool_name}: {args} -> {cleaned_args}")

        return cleaned_args

    @classmethod
    def _apply_basic_mapping(cls, args: Dict[str, Any]) -> Dict[str, Any]:
        """Apply basic parameter mappings for unknown tools."""
        fixed_args = {}

        for key, value in args.items():
            mapped_key = cls.PARAMETER_MAPPINGS.get(key.lower(), key)
            fixed_args[mapped_key] = value

        return fixed_args

    @staticmethod
    def _is_ip_address(value: str) -> bool:
        """Check if value is a valid IP address."""
        try:
            # Check for entity IDs that should not be treated as IPs
            entity_patterns = [
                r"^[A-Z0-9]{16}$",  # 16-character alphanumeric
                r"^[a-f0-9\-]{36}$",  # UUID format
                r"^[a-zA-Z0-9_\-]+::[a-f0-9\-]{36}$",  # Entity ID with UUID
            ]

            for pattern in entity_patterns:
                if re.match(pattern, value):
                    return False

            ipaddress.ip_address(value.strip())
            return True
        except (ValueError, AttributeError):
            return False

    @staticmethod
    def _is_domain(value: str) -> bool:
        """Check if value is a valid domain."""
        if not value or not isinstance(value, str):
            return False

        domain = value.strip().lower()

        # Basic domain validation
        if len(domain) < 3 or "." not in domain:
            return False

        # Remove protocol if present
        if domain.startswith(("http://", "https://")):
            domain = domain.split("://", 1)[1]

        # Remove path if present
        if "/" in domain:
            domain = domain.split("/", 1)[0]

        # Basic domain pattern
        domain_pattern = re.compile(
            r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*"
            r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$"
        )

        return bool(domain_pattern.match(domain))
