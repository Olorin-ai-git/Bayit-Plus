# Import will be done after module initialization to avoid circular imports
logger = None

# Initialize bridge logger lazily to avoid circular imports
def _get_bridge_logger():
    global logger
    if logger is None:
        try:
            from .integration_bridge import get_bridge_logger
            logger = get_bridge_logger(__name__)
        except ImportError:
            # Fallback to basic Python logging if bridge not available
            import logging
            logger = logging.getLogger(__name__)
    return logger

"""
Comprehensive Autonomous Investigation Logging System

This module provides verbose logging for ALL interactions during autonomous investigations:
- LLM interactions and responses with full prompts/completions
- Agent decision-making processes and reasoning
- Tool selection and usage patterns
- LangGraph node traversal and state changes
- Investigation progress tracking and findings
- Error conditions and recovery attempts

Every interaction is captured to provide complete visibility into the autonomous
investigation process for testing, debugging, and optimization.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import asyncio
from contextlib import asynccontextmanager
import uuid

logger = logging.getLogger(__name__)

class LogLevel(Enum):
    TRACE = "TRACE"
    DEBUG = "DEBUG" 
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class InteractionType(Enum):
    LLM_CALL = "llm_call"
    AGENT_DECISION = "agent_decision"
    TOOL_SELECTION = "tool_selection"
    TOOL_EXECUTION = "tool_execution"
    LANGGRAPH_NODE = "langgraph_node"
    STATE_CHANGE = "state_change"
    INVESTIGATION_PROGRESS = "investigation_progress"
    ERROR_CONDITION = "error_condition"
    AGENT_HANDOFF = "agent_handoff"
    WEBHOOK_EVENT = "webhook_event"

@dataclass
class LLMInteractionLog:
    """Comprehensive log entry for LLM interactions"""
    interaction_id: str
    investigation_id: str
    agent_name: str
    timestamp: str
    model_name: str
    prompt_template: str
    full_prompt: str
    response: str
    tokens_used: Dict[str, int]  # prompt_tokens, completion_tokens, total_tokens
    tools_available: List[str]
    tools_used: List[str]
    reasoning_chain: str
    confidence_score: Optional[float] = None
    response_time_ms: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

@dataclass
class AgentDecisionLog:
    """Log entry for agent decision-making processes"""
    interaction_id: str
    investigation_id: str
    agent_name: str
    timestamp: str
    decision_type: str  # risk_assessment, tool_selection, next_action, etc.
    context: Dict[str, Any]
    reasoning: str
    decision_outcome: Dict[str, Any]
    confidence_score: float
    alternative_decisions: List[Dict[str, Any]]
    execution_time_ms: int

@dataclass
class ToolExecutionLog:
    """Log entry for tool selection and execution"""
    interaction_id: str
    investigation_id: str
    agent_name: str
    timestamp: str
    tool_name: str
    tool_parameters: Dict[str, Any]
    selection_reasoning: str
    execution_result: Dict[str, Any]
    success: bool
    execution_time_ms: int
    error_message: Optional[str] = None

@dataclass
class LangGraphNodeLog:
    """Log entry for LangGraph node execution"""
    interaction_id: str
    investigation_id: str
    timestamp: str
    node_name: str
    node_type: str  # agent, tool, condition, etc.
    state_before: Dict[str, Any]
    state_after: Dict[str, Any]
    execution_result: Dict[str, Any]
    next_nodes: List[str]
    execution_time_ms: int
    metadata: Dict[str, Any]

@dataclass
class InvestigationProgressLog:
    """Log entry for investigation progress and milestones"""
    interaction_id: str
    investigation_id: str
    timestamp: str
    progress_type: str  # started, agent_completed, milestone_reached, completed
    current_phase: str
    completed_phases: List[str]
    findings_summary: Dict[str, Any]
    risk_score_progression: List[Dict[str, Any]]
    agent_status: Dict[str, str]  # agent_name -> status
    estimated_completion_time: Optional[str] = None

class AutonomousInvestigationLogger:
    """
    Comprehensive logging system for autonomous investigations.
    
    Provides structured, searchable logging of ALL interactions during autonomous
    investigations with real-time monitoring capabilities and detailed audit trails.
    """
    
    def __init__(self, log_directory: Optional[Path] = None, enable_console_output: bool = True):
        self.log_directory = log_directory or Path("logs/autonomous_investigations")
        self.log_directory.mkdir(parents=True, exist_ok=True)
        self.enable_console_output = enable_console_output
        
        # Initialize structured logging
        self._setup_structured_logging()
        
        # Investigation-specific log storage
        self._investigation_logs: Dict[str, List[Dict[str, Any]]] = {}
        self._investigation_contexts: Dict[str, Dict[str, Any]] = {}
        
        # Real-time monitoring callbacks
        self._monitoring_callbacks: List[callable] = []
        
        _get_bridge_logger().info(f"Initialized AutonomousInvestigationLogger with directory: {self.log_directory}")
    
    def _setup_structured_logging(self) -> None:
        """Setup structured logging with custom formatters"""
        # Create investigation-specific logger
        self.investigation_logger = logging.getLogger("autonomous_investigation")
        self.investigation_logger.setLevel(logging.DEBUG)
        
        # File handler for structured logs
        log_file = self.log_directory / "autonomous_investigations.jsonl"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # Custom JSON formatter
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": %(message)s}'
        )
        file_handler.setFormatter(json_formatter)
        self.investigation_logger.addHandler(file_handler)
        
        if self.enable_console_output:
            # Console handler with readable format
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_formatter = logging.Formatter(
                '\033[96m[AUTO-INVEST]\033[0m %(asctime)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            self.investigation_logger.addHandler(console_handler)
    
    def start_investigation_logging(self, investigation_id: str, context: Dict[str, Any]) -> None:
        """Initialize logging for a new investigation"""
        self._investigation_logs[investigation_id] = []
        self._investigation_contexts[investigation_id] = context
        
        # Create investigation-specific log file
        investigation_log_file = self.log_directory / f"investigation_{investigation_id}.jsonl"
        
        progress_log = InvestigationProgressLog(
            interaction_id=str(uuid.uuid4()),
            investigation_id=investigation_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            progress_type="started",
            current_phase="initialization",
            completed_phases=[],
            findings_summary={},
            risk_score_progression=[],
            agent_status={}
        )
        
        self._log_interaction(investigation_id, InteractionType.INVESTIGATION_PROGRESS, asdict(progress_log))
        
        _get_bridge_logger().info(f"Started investigation logging for: {investigation_id}")
    
    def log_llm_interaction(
        self,
        investigation_id: str,
        agent_name: str,
        model_name: str,
        prompt_template: str,
        full_prompt: str,
        response: str,
        tokens_used: Dict[str, int],
        tools_available: List[str],
        tools_used: List[str],
        reasoning_chain: str,
        confidence_score: Optional[float] = None,
        response_time_ms: Optional[int] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Log comprehensive LLM interaction with full context.
        
        Captures everything needed to understand and replay LLM decisions.
        """
        interaction_id = str(uuid.uuid4())
        
        llm_log = LLMInteractionLog(
            interaction_id=interaction_id,
            investigation_id=investigation_id,
            agent_name=agent_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            model_name=model_name,
            prompt_template=prompt_template,
            full_prompt=full_prompt,
            response=response,
            tokens_used=tokens_used,
            tools_available=tools_available,
            tools_used=tools_used,
            reasoning_chain=reasoning_chain,
            confidence_score=confidence_score,
            response_time_ms=response_time_ms,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        self._log_interaction(investigation_id, InteractionType.LLM_CALL, asdict(llm_log))
        
        # Console output for key LLM interactions
        if self.enable_console_output:
            tools_used_str = ", ".join(tools_used) if tools_used else "None"
            _get_bridge_logger().info(f"        🧠 LLM Call: {agent_name} → {model_name}")
            _get_bridge_logger().info(f"           Tools: {tools_used_str} | Tokens: {tokens_used.get('total_tokens', 0)}")
            if reasoning_chain:
                _get_bridge_logger().info(f"           Reasoning: {reasoning_chain[:100]}{'...' if len(reasoning_chain) > 100 else ''}")
        
        return interaction_id
    
    def log_agent_decision(
        self,
        investigation_id: str,
        agent_name: str,
        decision_type: str,
        context: Dict[str, Any],
        reasoning: str,
        decision_outcome: Dict[str, Any],
        confidence_score: float,
        alternative_decisions: List[Dict[str, Any]] = None,
        execution_time_ms: int = 0
    ) -> str:
        """Log detailed agent decision-making process with reasoning"""
        interaction_id = str(uuid.uuid4())
        
        decision_log = AgentDecisionLog(
            interaction_id=interaction_id,
            investigation_id=investigation_id,
            agent_name=agent_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            decision_type=decision_type,
            context=context,
            reasoning=reasoning,
            decision_outcome=decision_outcome,
            confidence_score=confidence_score,
            alternative_decisions=alternative_decisions or [],
            execution_time_ms=execution_time_ms
        )
        
        self._log_interaction(investigation_id, InteractionType.AGENT_DECISION, asdict(decision_log))
        
        if self.enable_console_output:
            _get_bridge_logger().info(f"        🧠 Decision: {agent_name} → {decision_type}")
            _get_bridge_logger().info(f"           Confidence: {confidence_score:.2f} | Outcome: {decision_outcome.get('action', 'N/A')}")
            if reasoning:
                _get_bridge_logger().info(f"           Reasoning: {reasoning[:100]}{'...' if len(reasoning) > 100 else ''}")
        
        return interaction_id
    
    def log_tool_execution(
        self,
        investigation_id: str,
        agent_name: str,
        tool_name: str,
        tool_parameters: Dict[str, Any],
        selection_reasoning: str,
        execution_result: Dict[str, Any],
        success: bool,
        execution_time_ms: int,
        error_message: Optional[str] = None
    ) -> str:
        """Log tool selection reasoning and execution results"""
        interaction_id = str(uuid.uuid4())
        
        tool_log = ToolExecutionLog(
            interaction_id=interaction_id,
            investigation_id=investigation_id,
            agent_name=agent_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tool_name=tool_name,
            tool_parameters=tool_parameters,
            selection_reasoning=selection_reasoning,
            execution_result=execution_result,
            success=success,
            execution_time_ms=execution_time_ms,
            error_message=error_message
        )
        
        self._log_interaction(investigation_id, InteractionType.TOOL_EXECUTION, asdict(tool_log))
        
        if self.enable_console_output:
            status_icon = "✅" if success else "❌"
            status_text = "SUCCESS" if success else f"FAILED ({error_message})"
            _get_bridge_logger().info(f"        🔧 Tool: {agent_name} → {tool_name} {status_icon}")
            _get_bridge_logger().info(f"           Duration: {execution_time_ms}ms | Status: {status_text}")
            _get_bridge_logger().info(f"           Params: {str(tool_parameters)[:80]}{'...' if len(str(tool_parameters)) > 80 else ''}")
            if selection_reasoning:
                _get_bridge_logger().info(f"           Selection: {selection_reasoning[:80]}{'...' if len(selection_reasoning) > 80 else ''}")
        
        return interaction_id
    
    def log_langgraph_node(
        self,
        investigation_id: str,
        node_name: str,
        node_type: str,
        state_before: Dict[str, Any],
        state_after: Dict[str, Any],
        execution_result: Dict[str, Any],
        next_nodes: List[str],
        execution_time_ms: int,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Log LangGraph node execution with complete state tracking"""
        interaction_id = str(uuid.uuid4())
        
        node_log = LangGraphNodeLog(
            interaction_id=interaction_id,
            investigation_id=investigation_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            node_name=node_name,
            node_type=node_type,
            state_before=state_before,
            state_after=state_after,
            execution_result=execution_result,
            next_nodes=next_nodes,
            execution_time_ms=execution_time_ms,
            metadata=metadata or {}
        )
        
        self._log_interaction(investigation_id, InteractionType.LANGGRAPH_NODE, asdict(node_log))
        
        if self.enable_console_output:
            next_nodes_str = ", ".join(next_nodes) if next_nodes else "END"
            _get_bridge_logger().info(f"        📊 Node: {node_name} ({node_type})")
            _get_bridge_logger().info(f"           Duration: {execution_time_ms}ms → {next_nodes_str}")
            
            # Show key state changes
            if state_before and state_after:
                state_keys_before = set(state_before.keys())
                state_keys_after = set(state_after.keys())
                new_keys = state_keys_after - state_keys_before
                if new_keys:
                    _get_bridge_logger().info(f"           State Changes: +{list(new_keys)}")
        
        return interaction_id
    
    def log_investigation_progress(
        self,
        investigation_id: str,
        progress_type: str,
        current_phase: str,
        completed_phases: List[str],
        findings_summary: Dict[str, Any],
        risk_score_progression: List[Dict[str, Any]],
        agent_status: Dict[str, str],
        estimated_completion_time: Optional[str] = None
    ) -> str:
        """Log investigation progress and milestones"""
        interaction_id = str(uuid.uuid4())
        
        progress_log = InvestigationProgressLog(
            interaction_id=interaction_id,
            investigation_id=investigation_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            progress_type=progress_type,
            current_phase=current_phase,
            completed_phases=completed_phases,
            findings_summary=findings_summary,
            risk_score_progression=risk_score_progression,
            agent_status=agent_status,
            estimated_completion_time=estimated_completion_time
        )
        
        self._log_interaction(investigation_id, InteractionType.INVESTIGATION_PROGRESS, asdict(progress_log))
        
        if self.enable_console_output:
            progress_pct = (len(completed_phases) / max(4, len(completed_phases) + 1)) * 100
            _get_bridge_logger().info(f"        📈 Progress: {progress_type} → {current_phase}")
            _get_bridge_logger().info(f"           Completion: {progress_pct:.0f}% | Phases: {len(completed_phases)} completed")
            
            # Show risk score progression if available
            if risk_score_progression:
                latest_risk = risk_score_progression[-1] if risk_score_progression else {}
                risk_score = latest_risk.get('risk_score')
                risk_display = "MISSING!" if risk_score is None else f"{risk_score:.3f}"
                _get_bridge_logger().info(f"           Current Risk: {risk_display}")
            
            # Show active agents
            active_agents = [agent for agent, status in agent_status.items() if status in ['active', 'running']]
            if active_agents:
                _get_bridge_logger().info(f"           Active Agents: {', '.join(active_agents)}")
        
        return interaction_id
    
    def _log_interaction(self, investigation_id: str, interaction_type: InteractionType, data: Dict[str, Any]) -> None:
        """Internal method to store and forward log interactions"""
        log_entry = {
            "interaction_type": interaction_type.value,
            "data": data,
            "logged_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in investigation-specific log
        if investigation_id in self._investigation_logs:
            self._investigation_logs[investigation_id].append(log_entry)
        
        # Write to structured log file
        self.investigation_logger.debug(json.dumps(log_entry))
        
        # Notify monitoring callbacks
        for callback in self._monitoring_callbacks:
            try:
                callback(investigation_id, interaction_type, data)
            except Exception as e:
                _get_bridge_logger().warning(f"Monitoring callback failed: {e}")
    
    def get_investigation_logs(self, investigation_id: str, interaction_types: List[InteractionType] = None) -> List[Dict[str, Any]]:
        """Retrieve logs for specific investigation, optionally filtered by interaction types"""
        if investigation_id not in self._investigation_logs:
            return []
        
        logs = self._investigation_logs[investigation_id]
        
        if interaction_types:
            type_values = [t.value for t in interaction_types]
            logs = [log for log in logs if log["interaction_type"] in type_values]
        
        return logs
    
    def generate_investigation_summary(self, investigation_id: str) -> Dict[str, Any]:
        """Generate comprehensive summary of investigation logging"""
        if investigation_id not in self._investigation_logs:
            return {"error": f"Investigation {investigation_id} not found"}
        
        logs = self._investigation_logs[investigation_id]
        context = self._investigation_contexts.get(investigation_id, {})
        
        # Analyze log statistics
        interaction_counts = {}
        for log in logs:
            interaction_type = log["interaction_type"]
            interaction_counts[interaction_type] = interaction_counts.get(interaction_type, 0) + 1
        
        # Extract key metrics
        llm_calls = [log for log in logs if log["interaction_type"] == InteractionType.LLM_CALL.value]
        total_tokens = sum(log["data"].get("tokens_used", {}).get("total_tokens", 0) for log in llm_calls)
        
        agent_decisions = [log for log in logs if log["interaction_type"] == InteractionType.AGENT_DECISION.value]
        avg_confidence = sum(log["data"].get("confidence_score", 0) for log in agent_decisions) / max(len(agent_decisions), 1)
        
        progress_logs = [log for log in logs if log["interaction_type"] == InteractionType.INVESTIGATION_PROGRESS.value]
        final_progress = progress_logs[-1]["data"] if progress_logs else {}
        
        return {
            "investigation_id": investigation_id,
            "investigation_context": context,
            "summary_generated_at": datetime.now(timezone.utc).isoformat(),
            "total_interactions": len(logs),
            "interaction_breakdown": interaction_counts,
            "llm_metrics": {
                "total_calls": len(llm_calls),
                "total_tokens_used": total_tokens,
                "average_tokens_per_call": total_tokens / max(len(llm_calls), 1)
            },
            "agent_metrics": {
                "total_decisions": len(agent_decisions),
                "average_confidence": avg_confidence
            },
            "final_status": final_progress,
            "investigation_timeline": [
                {
                    "timestamp": log["data"]["timestamp"],
                    "type": log["interaction_type"],
                    "summary": self._summarize_interaction(log)
                }
                for log in logs[:20]  # First 20 interactions for timeline
            ]
        }
    
    def _summarize_interaction(self, log_entry: Dict[str, Any]) -> str:
        """Generate human-readable summary of log interaction"""
        interaction_type = log_entry["interaction_type"]
        data = log_entry["data"]
        
        if interaction_type == InteractionType.LLM_CALL.value:
            return f"LLM call by {data['agent_name']} using {data['model_name']}"
        elif interaction_type == InteractionType.AGENT_DECISION.value:
            return f"{data['agent_name']} made {data['decision_type']} decision"
        elif interaction_type == InteractionType.TOOL_EXECUTION.value:
            status = "executed" if data['success'] else "failed to execute"
            return f"{data['agent_name']} {status} {data['tool_name']}"
        elif interaction_type == InteractionType.LANGGRAPH_NODE.value:
            return f"Executed LangGraph node: {data['node_name']}"
        elif interaction_type == InteractionType.INVESTIGATION_PROGRESS.value:
            return f"Investigation progress: {data['progress_type']} - {data['current_phase']}"
        else:
            return f"Interaction: {interaction_type}"
    
    def add_monitoring_callback(self, callback: callable) -> None:
        """Add real-time monitoring callback for investigation events"""
        self._monitoring_callbacks.append(callback)
    
    def export_investigation_logs(self, investigation_id: str, format: str = "json") -> str:
        """Export investigation logs in specified format"""
        logs = self.get_investigation_logs(investigation_id)
        
        if format == "json":
            return json.dumps(logs, indent=2)
        else:
            raise ValueError(f"Unsupported export format: {format}")

# Global logger instance with console output enabled
autonomous_investigation_logger = AutonomousInvestigationLogger(enable_console_output=True)

def get_logger() -> AutonomousInvestigationLogger:
    """Get the global autonomous investigation logger instance"""
    return autonomous_investigation_logger

def get_console_logger() -> AutonomousInvestigationLogger:
    """Get an autonomous investigation logger with console output enabled"""
    return AutonomousInvestigationLogger(enable_console_output=True)