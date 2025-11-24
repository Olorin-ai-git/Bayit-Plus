"""
Agent Instrumentation Helper

Provides simple integration points for agents to instrument their operations.
Helps agents log decisions, tool usage, and results with minimal code changes.
"""

from typing import Any, Dict, List, Optional, Callable
from app.service.logging.investigation_instrumentation import get_investigation_logger
from app.service.logging.investigation_data_models import RiskFactor
from app.service.logging.risk_instrumentation import RiskCalculationInstrumentor
from app.service.logging.tool_instrumentation import InstrumentedTool


class AgentInstrumentationHelper:
    """Helper class to instrument agent operations."""

    def __init__(self, agent_name: str, investigation_id: str):
        self.agent_name = agent_name
        self.investigation_id = investigation_id
        self.logger = get_investigation_logger(investigation_id)
        self.risk_instrumentor = RiskCalculationInstrumentor(self.logger, agent_name)

    def log_agent_starting(self, context: Optional[Dict[str, Any]] = None) -> None:
        """Log agent starting execution"""
        self.logger.log_event(
            event_type="agent_start",
            agent_name=self.agent_name,
            description=f"{self.agent_name} starting execution",
            details=context or {}
        )

    def log_agent_decision(
        self,
        decision_type: str,
        options: List[str],
        selected: str,
        reasoning: str,
        confidence: float = 0.5
    ) -> None:
        """Log agent decision making."""
        self.logger.log_agent_decision(
            agent_name=self.agent_name,
            decision_type=decision_type,
            options_considered=options,
            selected_option=selected,
            reasoning=reasoning,
            confidence_score=confidence
        )

    def log_tool_execution(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool_output: Dict[str, Any],
        execution_time_ms: float = 0.0,
        data_retrieved: int = 0,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """Log tool execution."""
        self.logger.log_tool_execution(
            agent_name=self.agent_name,
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            execution_time_ms=execution_time_ms,
            status="success" if success else "error",
            error_message=error_message,
            data_retrieved=data_retrieved
        )

    def log_risk_calculation(
        self,
        entity_id: str,
        entity_type: str,
        risk_factors: List[RiskFactor],
        calculation_method: str,
        final_score: float,
        reasoning: str,
        confidence: float = 0.5,
        recommendations: Optional[List[str]] = None
    ) -> float:
        """Log risk calculation and return final score."""
        return self.risk_instrumentor.log_risk_calculation(
            entity_id=entity_id,
            entity_type=entity_type,
            risk_factors=risk_factors,
            calculation_method=calculation_method,
            final_score=final_score,
            overall_reasoning=reasoning,
            confidence=confidence,
            recommendations=recommendations
        )

    def log_threshold_decision(
        self,
        entity_id: str,
        risk_score: float,
        threshold: float,
        decision: str,
        reasoning: str,
        action_items: List[str]
    ) -> None:
        """Log risk threshold-based decision."""
        self.risk_instrumentor.log_risk_threshold_decision(
            entity_id=entity_id,
            risk_score=risk_score,
            threshold=threshold,
            decision=decision,
            reasoning=reasoning,
            action_items=action_items
        )

    def log_llm_reasoning(
        self,
        llm_model: str,
        prompt: str,
        response: str,
        reasoning: Optional[str] = None,
        latency_ms: float = 0.0
    ) -> None:
        """Log LLM interaction with reasoning."""
        self.logger.log_llm_interaction(
            agent_name=self.agent_name,
            llm_model=llm_model,
            prompt=prompt,
            response=response,
            reasoning=reasoning,
            latency_ms=latency_ms
        )

    def log_agent_result(
        self,
        entity_id: str,
        final_risk_score: float,
        findings: List[Dict[str, Any]],
        recommendations: List[str],
        confidence: float,
        tools_used: List[str],
        execution_time_ms: float
    ) -> None:
        """Log final agent result."""
        self.logger.log_agent_result(
            agent_name=self.agent_name,
            entity_id=entity_id,
            final_risk_score=final_risk_score,
            findings=findings,
            recommendations=recommendations,
            confidence=confidence,
            tools_used=tools_used,
            execution_time_ms=execution_time_ms
        )

    def log_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log error with context."""
        self.logger.log_error(
            agent_name=self.agent_name,
            error_type=error_type,
            error_message=error_message,
            context=context
        )

    def create_instrumented_tool(
        self,
        tool_name: str,
        tool_func: Callable
    ) -> Callable:
        """Create an instrumented version of a tool."""
        return InstrumentedTool(
            tool_name=tool_name,
            tool_func=tool_func,
            instrumentation_logger=self.logger,
            agent_name=self.agent_name
        )

    def finalize_investigation(self) -> None:
        """Finalize and save investigation logs."""
        self.logger.finalize()

    def get_log_files(self) -> Dict[str, str]:
        """Get paths to generated log files."""
        return {
            "text_log": self.logger.get_log_file_path(),
            "json_log": self.logger.get_json_file_path()
        }


def create_agent_instrumentor(agent_name: str, investigation_id: str) -> AgentInstrumentationHelper:
    """Create agent instrumentation helper instance."""
    return AgentInstrumentationHelper(agent_name, investigation_id)
