"""
Tool Recommender

Determines which additional tools should be used based on investigation strategy and evidence.
Optimizes tool selection for maximum investigative value with minimal resource overhead.
"""

from typing import List, Set
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState, InvestigationStrategy

logger = get_bridge_logger(__name__)


class ToolRecommender:
    """
    Strategic tool recommendation engine for investigation enhancement.
    
    Analyzes investigation strategy, existing tool usage, and evidence patterns
    to recommend optimal additional tools for maximum investigative impact.
    """
    
    def __init__(self):
        self.high_impact_tools = ["virustotal", "abuseipdb"]
        self.network_tools = ["splunk", "sumologic"]
        self.comprehensive_tools = ["virustotal", "abuseipdb", "splunk", "sumologic"]
        self.max_recommendations = 3
        
    async def determine_recommended_tools(
        self,
        state: HybridInvestigationState,
        strategy: InvestigationStrategy,
        confidence: float
    ) -> List[str]:
        """
        Determine which additional tools should be used.
        
        Args:
            state: Current investigation state
            strategy: Selected investigation strategy
            confidence: Overall AI confidence score
            
        Returns:
            List of recommended tool identifiers
        """
<<<<<<< HEAD
        tools_used = set(state.get("tools_used", []))
=======
        # Extract tool names from tools_used (can be strings or dicts)
        tools_used_raw = state.get("tools_used", [])
        tools_used = set()
        for tool in tools_used_raw:
            if isinstance(tool, dict):
                tool_name = tool.get('tool_name') or tool.get('name') or str(tool)
            else:
                tool_name = str(tool)
            # Ensure it's a string before adding to set
            if isinstance(tool_name, str):
                tools_used.add(tool_name)
            else:
                tools_used.add(str(tool_name))
        
>>>>>>> 001-modify-analyzer-method
        snowflake_data = state.get("snowflake_data", {})
        
        recommendations = self._recommend_by_strategy(strategy, tools_used, snowflake_data)
        
        logger.debug(f"   🔧 Recommended tools: {recommendations}")
        return recommendations
    
    def _recommend_by_strategy(
        self,
        strategy: InvestigationStrategy,
        tools_used: Set[str],
        snowflake_data: dict
    ) -> List[str]:
        """Recommend tools based on investigation strategy."""
        
        if strategy in [InvestigationStrategy.CRITICAL_PATH, InvestigationStrategy.FOCUSED]:
            return self._recommend_high_impact_tools(tools_used, snowflake_data)
        
        elif strategy == InvestigationStrategy.MINIMAL:
            return self._recommend_minimal_tools(tools_used)
        
        else:  # ADAPTIVE or COMPREHENSIVE
            return self._recommend_comprehensive_tools(tools_used)
    
    def _recommend_high_impact_tools(self, tools_used: Set[str], snowflake_data: dict) -> List[str]:
        """Recommend high-impact tools for focused/critical strategies."""
        recommendations = []
        
        # Focus on highest-impact threat intelligence
        if not any(tool in tools_used for tool in self.high_impact_tools):
            recommendations.append("virustotal")  # Primary threat intelligence
        
        # Add network analysis if network anomalies detected
        if snowflake_data.get("network_anomalies") and "splunk" not in tools_used:
            recommendations.append("splunk")
        
        return recommendations
    
    def _recommend_minimal_tools(self, tools_used: Set[str]) -> List[str]:
        """Recommend minimal essential tools."""
        # Only essential threat intelligence
        if "virustotal" not in tools_used:
            return ["virustotal"]
        return []
    
    def _recommend_comprehensive_tools(self, tools_used: Set[str]) -> List[str]:
        """Recommend comprehensive tool set for thorough investigation."""
        recommendations = []
        
        # Add tools not yet used, up to maximum
        for tool in self.comprehensive_tools:
            if tool not in tools_used and len(recommendations) < self.max_recommendations:
                recommendations.append(tool)
        
        return recommendations