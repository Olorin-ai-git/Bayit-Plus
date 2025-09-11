"""
Reasoning Builder

Builds human-readable reasoning chains explaining AI confidence decisions.
Provides transparent explanations for investigation routing and strategy selection.
"""

from typing import List
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState, InvestigationStrategy

logger = get_bridge_logger(__name__)


class ReasoningBuilder:
    """
    Human-readable reasoning chain builder for AI decisions.
    
    Constructs transparent explanations for confidence calculations,
    strategy selections, and action recommendations to support
    audit trails and decision transparency.
    """
    
    def __init__(self):
        pass
        
    def build_reasoning_chain(
        self,
        state: HybridInvestigationState,
        confidence: float,
        strategy: InvestigationStrategy,
        next_action: str,
        snowflake_conf: float,
        tool_conf: float,
        domain_conf: float,
        pattern_conf: float,
        velocity_conf: float
    ) -> List[str]:
        """
        Build human-readable reasoning chain for the decision.
        
        Args:
            state: Current investigation state
            confidence: Overall confidence score
            strategy: Selected investigation strategy
            next_action: Recommended next action
            snowflake_conf: Snowflake confidence factor
            tool_conf: Tool confidence factor
            domain_conf: Domain confidence factor
            pattern_conf: Pattern confidence factor
            velocity_conf: Velocity confidence factor
            
        Returns:
            List of reasoning statements
        """
        reasoning = []
        
        # Build reasoning components
        reasoning.extend(self._build_confidence_explanation(confidence, snowflake_conf, tool_conf, domain_conf, pattern_conf, velocity_conf))
        reasoning.extend(self._build_strategy_rationale(strategy))
        reasoning.extend(self._build_action_rationale(next_action, confidence))
        reasoning.extend(self._build_risk_assessment(state))
        
        return reasoning
    
    def _build_confidence_explanation(
        self,
        confidence: float,
        snowflake_conf: float,
        tool_conf: float,
        domain_conf: float,
        pattern_conf: float,
        velocity_conf: float
    ) -> List[str]:
        """Build explanation for confidence calculation."""
        return [
            f"Overall confidence: {confidence:.3f} based on multi-factor analysis",
            f"Evidence factors: Snowflake({snowflake_conf:.2f}), Tools({tool_conf:.2f}), Domains({domain_conf:.2f}), Patterns({pattern_conf:.2f}), Velocity({velocity_conf:.2f})"
        ]
    
    def _build_strategy_rationale(self, strategy: InvestigationStrategy) -> List[str]:
        """Build rationale for strategy selection."""
        strategy_explanations = {
            InvestigationStrategy.CRITICAL_PATH: "Strategy: Critical path selected due to high confidence and clear fraud indicators",
            InvestigationStrategy.FOCUSED: "Strategy: Focused analysis on priority domains with strong evidence",
            InvestigationStrategy.MINIMAL: "Strategy: Minimal analysis due to low risk indicators",
            InvestigationStrategy.ADAPTIVE: "Strategy: Adaptive approach for balanced investigation",
            InvestigationStrategy.COMPREHENSIVE: "Strategy: Comprehensive analysis for thorough investigation"
        }
        
        explanation = strategy_explanations.get(strategy, "Strategy: Default comprehensive approach")
        return [explanation]
    
    def _build_action_rationale(self, next_action: str, confidence: float) -> List[str]:
        """Build rationale for next action selection."""
        priority_level = "High priority based on evidence" if confidence > 0.7 else "Standard progression"
        return [f"Next action: {next_action} - {priority_level}"]
    
    def _build_risk_assessment(self, state: HybridInvestigationState) -> List[str]:
        """Build risk assessment explanation."""
        risk_score = state.get("risk_score", 0.0)
        
        if risk_score > 0.7:
            return ["High fraud risk detected - prioritizing critical analysis"]
        elif risk_score > 0.4:
            return ["Moderate fraud risk - balanced investigation approach"]
        else:
            return ["Low fraud risk - efficient analysis with safety checks"]