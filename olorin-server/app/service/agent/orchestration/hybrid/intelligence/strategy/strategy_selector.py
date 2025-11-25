"""
Strategy Selector

Determines the best investigation strategy based on evidence quality and confidence levels.
Maps confidence and risk patterns to appropriate investigation approaches.
"""

from typing import Any, Dict

from app.service.logging import get_bridge_logger

from ...state import HybridInvestigationState, InvestigationStrategy

logger = get_bridge_logger(__name__)


class StrategySelector:
    """
    Strategic decision engine for investigation approach selection.

    Analyzes evidence quality, risk levels, and confidence scores to determine
    the most appropriate investigation strategy for optimal resource utilization.
    """

    def __init__(self):
        self.strategy_confidence_thresholds = {
            InvestigationStrategy.CRITICAL_PATH: 0.9,  # Very high confidence needed
            InvestigationStrategy.FOCUSED: 0.7,  # High confidence needed
            InvestigationStrategy.ADAPTIVE: 0.5,  # Medium confidence needed
            InvestigationStrategy.COMPREHENSIVE: 0.3,  # Low confidence needed
            InvestigationStrategy.MINIMAL: 0.8,  # High confidence for minimal approach
        }

    async def determine_strategy(
        self, state: HybridInvestigationState, confidence: float
    ) -> InvestigationStrategy:
        """
        Determine the best investigation strategy based on evidence and confidence.

        Args:
            state: Current investigation state with evidence
            confidence: Overall AI confidence score

        Returns:
            Selected investigation strategy
        """
        # Get current evidence state
        snowflake_completed = state.get("snowflake_completed", False)
        risk_score = state.get("risk_score", 0.0)
        domains_completed = len(state.get("domains_completed", []))

        # Apply strategic decision logic
        strategy = self._apply_strategy_logic(
            confidence, risk_score, snowflake_completed
        )

        logger.debug(f"   🎯 Strategy: {strategy.value}")

        return strategy

    def _apply_strategy_logic(
        self, confidence: float, risk_score: float, snowflake_completed: bool
    ) -> InvestigationStrategy:
        """Apply strategy selection logic based on confidence and risk."""

        # High confidence and high risk -> Critical path
        if confidence >= 0.9 and risk_score >= 0.8:
            logger.debug(
                f"   🎯 Strategy logic: CRITICAL_PATH (high confidence + high risk)"
            )
            return InvestigationStrategy.CRITICAL_PATH

        # High confidence and clear patterns -> Focused
        if confidence >= 0.7 and risk_score >= 0.6:
            logger.debug(
                f"   🎯 Strategy logic: FOCUSED (high confidence + clear patterns)"
            )
            return InvestigationStrategy.FOCUSED

        # Low risk and high confidence -> Minimal
        if confidence >= 0.8 and risk_score <= 0.3:
            logger.debug(f"   🎯 Strategy logic: MINIMAL (low risk + high confidence)")
            return InvestigationStrategy.MINIMAL

        # Medium confidence -> Adaptive
        if 0.5 <= confidence < 0.8:
            logger.debug(f"   🎯 Strategy logic: ADAPTIVE (medium confidence)")
            return InvestigationStrategy.ADAPTIVE

        # Low confidence or uncertain -> Comprehensive
        logger.debug(
            f"   🎯 Strategy logic: COMPREHENSIVE (low confidence or uncertain)"
        )
        return InvestigationStrategy.COMPREHENSIVE
