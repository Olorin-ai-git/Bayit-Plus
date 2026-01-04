"""
Base adapter implementation with common functionality.

This module provides a base adapter class with shared utilities
for converting data sources to unified format.
"""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..core.data_adapter import DataAdapter
from ..core.data_structures import (
    AgentAnalysisData,
    ExplanationData,
    InvestigationFlowData,
    InvestigationStatus,
    InvestigationSummary,
    JourneyTrackingData,
    PerformanceData,
    RiskAnalysisData,
    RiskLevel,
    TimelineEvent,
    ToolsAnalysisData,
    UnifiedReportData,
)


class BaseAdapter(DataAdapter):
    """
    Base adapter class with common functionality.

    This class provides utility methods for data extraction and conversion
    that are commonly used across different adapter implementations.
    """

    def safe_extract_datetime(
        self, data: Dict[str, Any], key: str
    ) -> Optional[datetime]:
        """
        Safely extract datetime from data with multiple format support.

        Args:
            data: Dictionary containing the datetime value
            key: Key to look for datetime value

        Returns:
            datetime: Parsed datetime or None if not found/invalid
        """
        value = data.get(key)
        if not value:
            return None

        if isinstance(value, datetime):
            return value

        if isinstance(value, str):
            # Try common datetime formats
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%d %H:%M:%S.%f",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue

        return None

    def safe_extract_float(
        self, data: Dict[str, Any], key: str, default: float = 0.0
    ) -> float:
        """
        Safely extract float value from data.

        Args:
            data: Dictionary containing the value
            key: Key to look for
            default: Default value if not found or invalid

        Returns:
            float: Extracted value or default
        """
        value = data.get(key)
        if value is None:
            return default

        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def safe_extract_int(self, data: Dict[str, Any], key: str, default: int = 0) -> int:
        """
        Safely extract integer value from data.

        Args:
            data: Dictionary containing the value
            key: Key to look for
            default: Default value if not found or invalid

        Returns:
            int: Extracted value or default
        """
        value = data.get(key)
        if value is None:
            return default

        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    def safe_extract_list(self, data: Dict[str, Any], key: str) -> List[Any]:
        """
        Safely extract list value from data.

        Args:
            data: Dictionary containing the value
            key: Key to look for

        Returns:
            List: Extracted list or empty list if not found/invalid
        """
        value = data.get(key, [])
        return value if isinstance(value, list) else []

    def safe_extract_dict(self, data: Dict[str, Any], key: str) -> Dict[str, Any]:
        """
        Safely extract dictionary value from data.

        Args:
            data: Dictionary containing the value
            key: Key to look for

        Returns:
            Dict: Extracted dictionary or empty dict if not found/invalid
        """
        value = data.get(key, {})
        return value if isinstance(value, dict) else {}

    def extract_status_from_string(self, status_str: str) -> InvestigationStatus:
        """
        Convert string status to InvestigationStatus enum.

        Args:
            status_str: Status string to convert

        Returns:
            InvestigationStatus: Corresponding status enum
        """
        if not status_str:
            return InvestigationStatus.PENDING

        status_map = {
            "passed": InvestigationStatus.COMPLETED,
            "failed": InvestigationStatus.FAILED,
            "running": InvestigationStatus.IN_PROGRESS,
            "pending": InvestigationStatus.PENDING,
            "completed": InvestigationStatus.COMPLETED,
            "in_progress": InvestigationStatus.IN_PROGRESS,
        }

        return status_map.get(status_str.lower(), InvestigationStatus.PENDING)

    def calculate_risk_level(self, risk_score: Optional[float]) -> RiskLevel:
        """
        Calculate risk level from numeric score.

        Args:
            risk_score: Numeric risk score (0.0 to 1.0)

        Returns:
            RiskLevel: Corresponding risk level
        """
        if risk_score is None:
            return RiskLevel.LOW

        if risk_score >= 0.8:
            return RiskLevel.CRITICAL
        elif risk_score >= 0.6:
            return RiskLevel.HIGH
        elif risk_score >= 0.4:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def extract_agents_from_data(self, data: Dict[str, Any]) -> List[str]:
        """
        Extract list of agent names from various data structures.

        Args:
            data: Data containing agent information

        Returns:
            List[str]: List of unique agent names
        """
        agents = set()

        # Check common agent data locations
        for key in ["agents", "agents_used", "agent_names"]:
            if key in data:
                agent_data = data[key]
                if isinstance(agent_data, list):
                    agents.update(str(agent) for agent in agent_data)
                elif isinstance(agent_data, dict):
                    agents.update(agent_data.keys())

        # Check in phases or steps data
        phases = self.safe_extract_dict(data, "phases")
        for phase_data in phases.values():
            if isinstance(phase_data, dict) and "agent" in phase_data:
                agents.add(str(phase_data["agent"]))

        return list(agents)

    def extract_tools_from_data(self, data: Dict[str, Any]) -> List[str]:
        """
        Extract list of tool names from various data structures.

        Args:
            data: Data containing tool information

        Returns:
            List[str]: List of unique tool names
        """
        tools = set()

        # Check common tool data locations
        for key in ["tools", "tools_used", "tool_names"]:
            if key in data:
                tool_data = data[key]
                if isinstance(tool_data, list):
                    tools.update(str(tool) for tool in tool_data)
                elif isinstance(tool_data, dict):
                    tools.update(tool_data.keys())

        return list(tools)

    def create_default_summary(
        self, investigation_id: str, scenario_name: str = "Unknown Scenario"
    ) -> InvestigationSummary:
        """
        Create a default investigation summary with minimal data.

        Args:
            investigation_id: Investigation identifier
            scenario_name: Scenario name

        Returns:
            InvestigationSummary: Default summary structure
        """
        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario_name=scenario_name,
            mode="UNKNOWN",
            start_time=datetime.now(),
            status=InvestigationStatus.PENDING,
        )
