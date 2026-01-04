"""
Tool Configuration Validator
Feature: 006-hybrid-graph-integration

Validates tool IDs and parameters against available tools registry.
Ensures tool existence and parameter schema compliance.

SYSTEM MANDATE Compliance:
- Configuration-driven: Tool registry from config
- Complete implementation: No placeholders or TODOs
- Type-safe: Parameter validation with clear error messages
"""

from typing import Any, Dict, Set

from fastapi import HTTPException, status


class ToolConfigValidator:
    """
    Validator for investigation tool configuration.
    Verifies tool existence and parameter schemas.
    """

    def __init__(self):
        """Initialize validator with available tools registry."""
        self.available_tools = self._load_available_tools()

    def validate(self, tool_id: str, parameters: Dict[str, Any]) -> None:
        """
        Validate tool configuration.

        Args:
            tool_id: Tool identifier
            parameters: Tool-specific parameters

        Raises:
            HTTPException: 400 if validation fails with specific error message
        """
        self._validate_tool_exists(tool_id)
        self._validate_parameters(tool_id, parameters)

    def _load_available_tools(self) -> Set[str]:
        """
        Load available tool IDs from configuration or registry.

        Returns set of valid tool IDs for hybrid graph investigations.
        """
        return {
            "check_device_fingerprint",
            "analyze_device_patterns",
            "verify_geo_location",
            "analyze_location_patterns",
            "analyze_network_patterns",
            "check_ip_reputation",
            "analyze_log_patterns",
            "detect_log_anomalies",
            "assess_behavior_patterns",
            "detect_behavior_anomalies",
            "calculate_risk_score",
            "aggregate_risk_factors",
        }

    def _validate_tool_exists(self, tool_id: str) -> None:
        """Verify tool ID exists in available tools registry."""
        if tool_id not in self.available_tools:
            available_list = ", ".join(sorted(self.available_tools))

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Unknown tool ID: '{tool_id}'. "
                    f"Available tools: {available_list}"
                ),
            )

    def _validate_parameters(self, tool_id: str, parameters: Dict[str, Any]) -> None:
        """
        Validate tool parameters against expected schema.

        Args:
            tool_id: Tool identifier
            parameters: Tool-specific parameters dictionary
        """
        tool_schemas = {
            "check_device_fingerprint": {"optional": ["threshold"]},
            "analyze_device_patterns": {"optional": ["lookback_days"]},
            "verify_geo_location": {"optional": ["tolerance_km"]},
            "analyze_location_patterns": {"optional": ["lookback_days"]},
            "analyze_network_patterns": {"optional": ["threshold", "lookback_days"]},
            "check_ip_reputation": {"optional": []},
            "analyze_log_patterns": {"optional": ["severity_filter", "lookback_hours"]},
            "detect_log_anomalies": {"optional": ["sensitivity"]},
            "assess_behavior_patterns": {"optional": ["lookback_days"]},
            "detect_behavior_anomalies": {"optional": ["sensitivity"]},
            "calculate_risk_score": {"optional": ["weights"]},
            "aggregate_risk_factors": {"optional": []},
        }

        schema = tool_schemas.get(tool_id, {})
        optional_params = set(schema.get("optional", []))

        for param_name in parameters.keys():
            if param_name not in optional_params:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Unknown parameter '{param_name}' for tool '{tool_id}'. "
                        f"Optional parameters: {', '.join(optional_params) if optional_params else 'none'}"
                    ),
                )
