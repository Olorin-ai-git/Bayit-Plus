"""
Tool Evidence Assessor

Assesses quality of additional tool evidence for AI confidence calculation.
Tool evidence has 25% weight in overall confidence.
"""

from typing import Any, Dict, List, Set

from app.service.logging import get_bridge_logger

from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class ToolAssessor:
    """
    Specialized assessor for additional tool evidence quality.

    Analyzes tool diversity, success rates, and result quality to determine
    the reliability of evidence from external security tools.
    """

    def __init__(self):
        self.weight = 0.25  # Tool evidence weight
        self.tool_categories = {
            "threat_intelligence": ["virus", "abuse"],
            "siem": ["splunk", "sumo"],
            "geolocation": ["geo", "location"],
            "other": [],
        }

    async def assess_evidence(self, state: HybridInvestigationState) -> float:
        """
        Assess quality of additional tool evidence.

        Args:
            state: Current investigation state with tool data

        Returns:
            Confidence score between 0.0 and 1.0
        """
        # tools_used can be a list of strings or dicts with 'tool_name' or 'name' keys
        tools_used = state.get("tools_used", [])
        tool_results = state.get("tool_results", {})

        if not tools_used:
            logger.debug("   🔧 Tool evidence: No tools used (0.0)")
            return 0.0

        # Calculate tool diversity and quality metrics
        diversity_factor = self._calculate_tool_diversity(tools_used)
        success_rate = self._calculate_success_rate(tools_used, tool_results)
        avg_quality = self._calculate_average_quality(tools_used, tool_results)

        # Weighted combination of factors
        tool_confidence = (
            diversity_factor * 0.3 + success_rate * 0.4 + avg_quality * 0.3
        )

        logger.debug(f"   🔧 Tool evidence confidence: {tool_confidence:.3f}")
        logger.debug(
            f"      Tools used: {len(tools_used)}, Success rate: {success_rate:.3f}"
        )

        return tool_confidence

    def _calculate_tool_diversity(self, tools_used: List[Any]) -> float:
        """Calculate diversity factor based on tool categories."""
        tool_categories_used = set()

        for tool in tools_used:
            # Handle both string tool names and dict tool objects
            if isinstance(tool, dict):
                tool_name = tool.get("tool_name") or tool.get("name")
                # If tool_name is still a dict or None, convert to string
                if tool_name is None or isinstance(tool_name, dict):
                    tool_name = str(tool)
                else:
                    tool_name = str(tool_name)
            else:
                tool_name = str(tool)

            # Ensure we have a valid string before categorizing
            if not isinstance(tool_name, str):
                tool_name = str(tool_name)

            category = self._categorize_tool(tool_name)
            # Ensure category is a string before adding to set
            if not isinstance(category, str):
                category = str(category)
            tool_categories_used.add(category)

        diversity_factor = len(tool_categories_used) / 4.0  # Up to 4 categories
        logger.debug(f"      Tool categories used: {len(tool_categories_used)}")

        return diversity_factor

    def _categorize_tool(self, tool_name: str) -> str:
        """Categorize a tool based on its name."""
        # Ensure tool_name is a string
        if not isinstance(tool_name, str):
            tool_name = str(tool_name)
        tool_lower = tool_name.lower()

        for category, keywords in self.tool_categories.items():
            if category == "other":
                continue
            for keyword in keywords:
                if keyword in tool_lower:
                    return category

        return "other"

    def _calculate_success_rate(
        self, tools_used: List[Any], tool_results: Dict[str, Any]
    ) -> float:
        """Calculate the success rate of tool executions."""
        if not tools_used:
            return 0.0

        successful_tools = 0
        for tool in tools_used:
            # Extract tool name/key from dict or use string directly
            if isinstance(tool, dict):
                tool_key = tool.get("tool_name", tool.get("name", str(tool)))
            else:
                tool_key = str(tool)

            tool_result = tool_results.get(tool_key, {})
            if tool_result and isinstance(tool_result, dict):
                successful_tools += 1

        return successful_tools / len(tools_used)

    def _calculate_average_quality(
        self, tools_used: List[Any], tool_results: Dict[str, Any]
    ) -> float:
        """Calculate average quality of tool results."""
        if not tools_used:
            return 0.0

        total_quality = 0.0
        for tool in tools_used:
            # Extract tool name/key from dict or use string directly
            if isinstance(tool, dict):
                tool_key = tool.get("tool_name", tool.get("name", str(tool)))
            else:
                tool_key = str(tool)

            tool_result = tool_results.get(tool_key, {})
            if tool_result and isinstance(tool_result, dict):
                # Simple heuristic for result quality based on content richness
                result_quality = min(1.0, len(str(tool_result)) / 500.0)
                total_quality += result_quality

        return total_quality / len(tools_used)
