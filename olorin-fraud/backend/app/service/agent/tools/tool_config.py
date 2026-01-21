"""Tool configuration and enablement based on environment variables."""

import os
from typing import Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolConfig:
    """Manages tool enablement based on environment variables."""

    # Tool enable/disable configuration mapping
    TOOL_FLAGS = {
        # Olorin-specific tools
        "snowflake": "USE_SNOWFLAKE",
        "splunk": "USE_SPLUNK",
        "sumo_logic": "USE_SUMO_LOGIC",
        "databricks": "USE_DATABRICKS",
        # External API tools
        "maxmind": "USE_MAXMIND",
        "emailage": "USE_EMAILAGE",
        "pipl": "USE_PIPL",
        "device_fingerprint": "USE_DEVICE_FINGERPRINT",
        "ip_quality_score": "USE_IP_QUALITY_SCORE",
        "phone_verification": "USE_PHONE_VERIFICATION",
        "address_validation": "USE_ADDRESS_VALIDATION",
        "fraud_detection_api": "USE_FRAUD_DETECTION_API",
        "kyc_service": "USE_KYC_SERVICE",
        "transaction_monitoring": "USE_TRANSACTION_MONITORING",
        "risk_scoring": "USE_RISK_SCORING",
        # Analysis tools
        "network_analysis": "USE_NETWORK_ANALYSIS",
        "behavioral_analytics": "USE_BEHAVIORAL_ANALYTICS",
        "graph_analysis": "USE_GRAPH_ANALYSIS",
        "ml_models": "USE_ML_MODELS",
        "rule_engine": "USE_RULE_ENGINE",
        # Threat intelligence tools
        "abuseipdb": "USE_ABUSEIPDB",
        "virustotal": "USE_VIRUSTOTAL",
        "shodan": "USE_SHODAN",
        # Blockchain tools
        "blockchain": "USE_BLOCKCHAIN",
        "crypto_tracing": "USE_CRYPTO_TRACING",
        # Intelligence tools
        "osint": "USE_OSINT",
        "social_media": "USE_SOCIAL_MEDIA",
        "dark_web": "USE_DARK_WEB",
    }

    @classmethod
    def is_tool_enabled(cls, tool_name: str) -> bool:
        """
        Check if a tool is enabled based on environment variables.

        Args:
            tool_name: Name of the tool to check

        Returns:
            True if tool is enabled, False otherwise
        """
        env_var = cls.TOOL_FLAGS.get(tool_name.lower())
        if not env_var:
            # Tool not in configuration, assume disabled
            return False

        value = os.getenv(env_var, "false").lower()
        enabled = value == "true"

        if enabled:
            logger.debug(f"Tool '{tool_name}' is ENABLED ({env_var}=true)")
        else:
            logger.debug(f"Tool '{tool_name}' is DISABLED ({env_var}=false)")

        return enabled

    @classmethod
    def get_enabled_tools(cls) -> List[str]:
        """
        Get list of all enabled tools.

        Returns:
            List of enabled tool names
        """
        enabled = []
        for tool_name, env_var in cls.TOOL_FLAGS.items():
            if os.getenv(env_var, "false").lower() == "true":
                enabled.append(tool_name)
        return enabled

    @classmethod
    def get_disabled_tools(cls) -> List[str]:
        """
        Get list of all disabled tools.

        Returns:
            List of disabled tool names
        """
        disabled = []
        for tool_name, env_var in cls.TOOL_FLAGS.items():
            if os.getenv(env_var, "false").lower() != "true":
                disabled.append(tool_name)
        return disabled

    @classmethod
    def get_tool_status_summary(cls) -> Dict[str, Dict[str, any]]:
        """
        Get comprehensive status of all tools.

        Returns:
            Dictionary with tool status information
        """
        summary = {
            "enabled": [],
            "disabled": [],
            "total": len(cls.TOOL_FLAGS),
            "details": {},
        }

        for tool_name, env_var in cls.TOOL_FLAGS.items():
            value = os.getenv(env_var, "false")
            enabled = value.lower() == "true"

            summary["details"][tool_name] = {
                "env_var": env_var,
                "value": value,
                "enabled": enabled,
            }

            if enabled:
                summary["enabled"].append(tool_name)
            else:
                summary["disabled"].append(tool_name)

        logger.info(
            f"Tool Status: {len(summary['enabled'])} enabled, "
            f"{len(summary['disabled'])} disabled out of {summary['total']} total"
        )

        # Log enabled tools for visibility
        if summary["enabled"]:
            logger.info(f"Enabled tools: {', '.join(summary['enabled'])}")
        else:
            logger.warning("No tools are enabled! Check your .env file configuration.")

        return summary

    @classmethod
    def validate_configuration(cls) -> bool:
        """
        Validate tool configuration and warn about missing or invalid settings.

        Returns:
            True if configuration is valid, False if there are issues
        """
        issues = []

        # Check if at least one tool is enabled
        enabled_tools = cls.get_enabled_tools()
        if not enabled_tools:
            issues.append(
                "WARNING: No tools are enabled. Application may have limited functionality."
            )

        # Check for specific tool dependencies
        if cls.is_tool_enabled("snowflake"):
            # Check if Snowflake configuration exists
            snowflake_vars = [
                "SNOWFLAKE_ACCOUNT",
                "SNOWFLAKE_USER",
                "SNOWFLAKE_PASSWORD",
                "SNOWFLAKE_DATABASE",
            ]
            for var in snowflake_vars:
                if not os.getenv(var):
                    issues.append(
                        f"WARNING: Snowflake enabled but {var} not configured"
                    )

        if cls.is_tool_enabled("splunk"):
            splunk_vars = ["SPLUNK_HOST", "SPLUNK_USERNAME", "SPLUNK_PASSWORD"]
            for var in splunk_vars:
                if not os.getenv(var):
                    issues.append(f"WARNING: Splunk enabled but {var} not configured")

        # Log all issues
        for issue in issues:
            logger.warning(issue)

        return len(issues) == 0
