"""
Summary Handler

Handles the summary phase of investigations using modular components.
"""

from datetime import datetime
from typing import Dict, Any
from langchain_core.messages import AIMessage

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState
from .summary import SummaryAnalysisEngine, SummaryGenerator

logger = get_bridge_logger(__name__)


class SummaryHandler:
    """Handles the summary phase of investigations using modular components."""

    def __init__(self, llm):
        """Initialize with LLM."""
        self.analysis_engine = SummaryAnalysisEngine(llm)
        self.summary_generator = SummaryGenerator()

    async def handle_summary(self, state: InvestigationState) -> Dict[str, Any]:
        """Handle summary phase - consolidate all findings."""
        logger.info("📊 Generating investigation summary with LLM risk assessment")

        # Get LLM-based risk assessment
        llm_assessment = await self.analysis_engine.analyze_with_llm(state)

        # Use LLM's risk score as the final risk score
        final_risk_score = llm_assessment.get("risk_score", 0.5)
        confidence = llm_assessment.get("confidence", 0.5)

        # Generate summary including LLM reasoning
        summary = self.summary_generator.generate_investigation_summary_with_llm(state, llm_assessment)
        summary_msg = AIMessage(content=summary)

        # Calculate total duration
        duration_ms = self._calculate_duration(state)

        return {
            "messages": [summary_msg],
            "current_phase": "complete",
            "risk_score": final_risk_score,
            "confidence_score": confidence,
            "end_time": datetime.utcnow().isoformat(),
            "total_duration_ms": duration_ms
        }

    def _calculate_duration(self, state: InvestigationState) -> int:
        """Calculate investigation duration in milliseconds."""
        start_time = state.get("start_time")
        if start_time:
            start_dt = datetime.fromisoformat(start_time)
            end_dt = datetime.utcnow()
            return int((end_dt - start_dt).total_seconds() * 1000)
        return 0