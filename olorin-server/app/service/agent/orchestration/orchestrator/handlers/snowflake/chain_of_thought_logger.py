"""
Chain of Thought Logger

Handles chain of thought logging for Snowflake analysis.
"""

from typing import Dict, Any, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ChainOfThoughtLogger:
    """Handles chain of thought logging for Snowflake analysis."""

    def __init__(self, tools: List[Any]):
        """Initialize with available tools."""
        self.tools = tools

    def log_chain_of_thought(self, state: Dict[str, Any], date_range_days: int):
        """Log chain of thought reasoning."""
        from app.service.agent.chain_of_thought_logger import get_chain_of_thought_logger, ReasoningType
        cot_logger = get_chain_of_thought_logger()

        investigation_id = state.get('investigation_id', 'unknown')
        process_id = f"orchestrator_{investigation_id}"

        if process_id not in cot_logger._active_processes:
            cot_logger.start_agent_thinking(
                investigation_id=investigation_id,
                agent_name="orchestrator",
                domain="orchestration",
                initial_context={
                    "phase": "snowflake_analysis",
                    "entity_type": state.get('entity_type'),
                    "entity_id": state.get('entity_id')
                }
            )

        cot_logger.log_reasoning_step(
            process_id=process_id,
            reasoning_type=ReasoningType.ANALYSIS,
            premise=f"Investigation requires data analysis for {state.get('entity_type')} {state.get('entity_id')}",
            reasoning=f"Snowflake analysis is mandatory first step. Need to query transaction data for last {date_range_days} days to understand entity behavior patterns and risk indicators.",
            conclusion="Must generate Snowflake tool call to retrieve foundational data for investigation",
            confidence=0.9,
            supporting_evidence=[
                {"type": "requirement", "data": "Snowflake analysis is mandatory first phase"},
                {"type": "context", "data": f"Entity: {state.get('entity_type')} - {state.get('entity_id')}"},
                {"type": "tools", "data": f"{len(self.tools)} tools available including Snowflake"}
            ],
            metadata={"phase": "snowflake_analysis", "attempt": "initial"}
        )