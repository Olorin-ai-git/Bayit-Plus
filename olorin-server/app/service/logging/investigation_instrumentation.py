"""
Investigation Instrumentation Service

Comprehensive logging for investigation execution.
Captures LLM interactions, tool executions, and risk calculations.
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum
import os

from app.service.logging.investigation_data_models import (
    LLMInteraction, ToolExecution, RiskCalculation, AgentDecision, AgentResult
)
from app.service.logging.investigation_log_writer import InvestigationLogWriter


class EntityType(str, Enum):
    """Entity types in investigation"""
    LLM_CALL = "llm_call"
    TOOL_EXECUTION = "tool_execution"
    AGENT_DECISION = "agent_decision"
    RISK_CALCULATION = "risk_calculation"
    AGENT_RESULT = "agent_result"
    ERROR = "error"
    INVESTIGATION_EVENT = "investigation_event"


class InvestigationInstrumentationLogger:
    """Comprehensive instrumentation logger for investigations"""

    def __init__(self, investigation_id: str, output_dir: Optional[str] = None):
        self.investigation_id = investigation_id
        self.writer = InvestigationLogWriter(investigation_id, output_dir)
        self.llm_interactions: List[LLMInteraction] = []
        self.tool_executions: List[ToolExecution] = []
        self.agent_decisions: List[AgentDecision] = []
        self.risk_calculations: List[RiskCalculation] = []
        self.agent_results: List[AgentResult] = []
        self.errors: List[Dict[str, Any]] = []
        self.events: List[Dict[str, Any]] = []
        self.start_time = datetime.utcnow().isoformat()

    def log_llm_interaction(
        self, agent_name: str, llm_model: str, prompt: str, response: str,
        reasoning: Optional[str] = None, tokens_used: int = 0,
        latency_ms: float = 0.0, temperature: float = 0.1,  # Low temperature for consistent results
        max_tokens: int = 2048, stop_reason: Optional[str] = None
    ) -> None:
        """Log LLM interaction"""
        interaction = LLMInteraction(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name, llm_model=llm_model, prompt=prompt,
            response=response, reasoning=reasoning, tokens_used=tokens_used,
            latency_ms=latency_ms, temperature=temperature,
            max_tokens=max_tokens, stop_reason=stop_reason
        )
        self.llm_interactions.append(interaction)
        self.writer.write_entry(EntityType.LLM_CALL.value, interaction.to_dict())

    def log_tool_execution(
        self, agent_name: str, tool_name: str, tool_input: Dict[str, Any],
        tool_output: Dict[str, Any], raw_output: Optional[str] = None,
        execution_time_ms: float = 0.0, status: str = "success",
        error_message: Optional[str] = None, data_retrieved: int = 0
    ) -> None:
        """Log tool execution"""
        execution = ToolExecution(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name, tool_name=tool_name,
            tool_input=tool_input, tool_output=tool_output,
            raw_output=raw_output, execution_time_ms=execution_time_ms,
            status=status, error_message=error_message,
            data_retrieved=data_retrieved
        )
        self.tool_executions.append(execution)
        self.writer.write_entry(EntityType.TOOL_EXECUTION.value, execution.to_dict())

    def log_risk_calculation(
        self, agent_name: str, entity_id: str, entity_type: str,
        risk_factors: Dict[str, float], calculation_method: str,
        intermediate_scores: Dict[str, float], final_score: float,
        reasoning: str, confidence: float
    ) -> None:
        """Log risk calculation"""
        calculation = RiskCalculation(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name, entity_id=entity_id,
            entity_type=entity_type, risk_factors=risk_factors,
            calculation_method=calculation_method,
            intermediate_scores=intermediate_scores, final_score=final_score,
            reasoning=reasoning, confidence=confidence
        )
        self.risk_calculations.append(calculation)
        self.writer.write_entry(EntityType.RISK_CALCULATION.value, calculation.to_dict())

    def log_agent_decision(
        self, agent_name: str, decision_type: str,
        options_considered: List[str], selected_option: str,
        reasoning: str, confidence_score: float,
        context_summary: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log agent decision"""
        decision = AgentDecision(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name, decision_type=decision_type,
            options_considered=options_considered,
            selected_option=selected_option, reasoning=reasoning,
            confidence_score=confidence_score,
            context_summary=context_summary or {}
        )
        self.agent_decisions.append(decision)
        self.writer.write_entry(EntityType.AGENT_DECISION.value, decision.to_dict())

    def log_agent_result(
        self, agent_name: str, entity_id: str, final_risk_score: float,
        findings: List[Dict[str, Any]], recommendations: List[str],
        confidence: float, tools_used: List[str], execution_time_ms: float
    ) -> None:
        """Log agent result"""
        result = AgentResult(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name, investigation_id=self.investigation_id,
            entity_id=entity_id, final_risk_score=final_risk_score,
            findings=findings, recommendations=recommendations,
            confidence=confidence, tools_used=tools_used,
            execution_time_ms=execution_time_ms
        )
        self.agent_results.append(result)
        self.writer.write_entry(EntityType.AGENT_RESULT.value, result.to_dict())

    def log_error(
        self, agent_name: str, error_type: str, error_message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log error with context"""
        error_log = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent_name": agent_name, "error_type": error_type,
            "error_message": error_message, "context": context or {}
        }
        self.errors.append(error_log)
        self.writer.write_entry(EntityType.ERROR.value, error_log)

    def log_event(
        self, event_type: str, agent_name: str, description: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log investigation event"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type, "agent_name": agent_name,
            "description": description, "details": details or {}
        }
        self.events.append(event)
        self.writer.write_entry(EntityType.INVESTIGATION_EVENT.value, event)

    def finalize(self) -> None:
        """Finalize and save investigation logs"""
        end_time = datetime.utcnow().isoformat()
        summary = {
            "investigation_id": self.investigation_id,
            "start_time": self.start_time,
            "end_time": end_time,
            "summary": {
                "total_llm_interactions": len(self.llm_interactions),
                "total_tool_executions": len(self.tool_executions),
                "total_agent_decisions": len(self.agent_decisions),
                "total_risk_calculations": len(self.risk_calculations),
                "total_agent_results": len(self.agent_results),
                "total_errors": len(self.errors)
            },
            "llm_interactions": [x.to_dict() for x in self.llm_interactions],
            "tool_executions": [x.to_dict() for x in self.tool_executions],
            "agent_decisions": [x.to_dict() for x in self.agent_decisions],
            "risk_calculations": [x.to_dict() for x in self.risk_calculations],
            "agent_results": [x.to_dict() for x in self.agent_results],
            "errors": self.errors,
            "events": self.events
        }
        self.writer.write_summary(summary)
        self.writer.append_to_log(f"\n{'='*100}\nINVESTIGATION COMPLETE\n{'='*100}\n")

    def get_log_file_path(self) -> str:
        """Get path to text log file"""
        return self.writer.get_log_file_path()

    def get_json_file_path(self) -> str:
        """Get path to JSON log file"""
        return self.writer.get_json_file_path()


# Global logger instance
_instrumentation_logger: Optional[InvestigationInstrumentationLogger] = None


def get_investigation_logger(investigation_id: str) -> InvestigationInstrumentationLogger:
    """Get or create investigation instrumentation logger"""
    global _instrumentation_logger
    if _instrumentation_logger is None or _instrumentation_logger.investigation_id != investigation_id:
        log_dir = os.getenv("INVESTIGATION_LOG_DIR", "./investigation_logs")
        _instrumentation_logger = InvestigationInstrumentationLogger(investigation_id, log_dir)
    return _instrumentation_logger
