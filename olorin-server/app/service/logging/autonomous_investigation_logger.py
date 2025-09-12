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

from .investigation_folder_manager import (
    InvestigationFolderManager, 
    InvestigationMode, 
    get_folder_manager
)

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
        
        # Initialize folder manager for unified investigation structure
        self.folder_manager = get_folder_manager()
        
        # Initialize structured logging
        self._setup_structured_logging()
        
        # Investigation-specific log storage
        self._investigation_logs: Dict[str, List[Dict[str, Any]]] = {}
        self._investigation_contexts: Dict[str, Dict[str, Any]] = {}
        self._investigation_file_handlers: Dict[str, logging.FileHandler] = {}
        
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
    
    def start_investigation_logging(
        self, 
        investigation_id: str, 
        context: Dict[str, Any],
        mode: InvestigationMode = InvestigationMode.LIVE,
        scenario: str = ""
    ) -> Path:
        """
        Initialize logging for a new investigation with unified folder structure.
        
        Args:
            investigation_id: Unique investigation identifier
            context: Investigation context and configuration
            mode: Investigation mode (LIVE, MOCK, DEMO)
            scenario: Investigation scenario name
            
        Returns:
            Path to created investigation folder
        """
        self._investigation_logs[investigation_id] = []
        self._investigation_contexts[investigation_id] = context
        
        # Create unified investigation folder
        folder_path, metadata = self.folder_manager.create_investigation_folder(
            investigation_id=investigation_id,
            mode=mode,
            scenario=scenario,
            config=context
        )
        
        # Get standardized file paths
        file_paths = self.folder_manager.get_log_file_paths(investigation_id)
        
        # Create investigation-specific file handler for autonomous activities
        autonomous_log_file = file_paths["autonomous_log"]
        file_handler = logging.FileHandler(autonomous_log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # Custom JSON formatter for autonomous activities
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "interaction_type": "%(name)s", "data": %(message)s}'
        )
        file_handler.setFormatter(json_formatter)
        
        # Store handler for cleanup later
        self._investigation_file_handlers[investigation_id] = file_handler
        
        # Add handler to investigation logger
        investigation_logger = logging.getLogger(f"autonomous_investigation_{investigation_id}")
        investigation_logger.addHandler(file_handler)
        investigation_logger.setLevel(logging.DEBUG)
        
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
        
        _get_bridge_logger().info(f"Started investigation logging for: {investigation_id} in {folder_path}")
        return folder_path
    
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
    
    def complete_investigation_logging(self, investigation_id: str, final_status: str = "completed") -> None:
        """
        Complete investigation logging and clean up resources.
        
        Args:
            investigation_id: Investigation identifier
            final_status: Final investigation status
        """
        # Update investigation status
        self.folder_manager.update_investigation_status(investigation_id, final_status)
        
        # Log completion progress
        if investigation_id in self._investigation_logs:
            progress_log = InvestigationProgressLog(
                interaction_id=str(uuid.uuid4()),
                investigation_id=investigation_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                progress_type=final_status,
                current_phase="completed",
                completed_phases=["initialization", "analysis", "evaluation", "completion"],
                findings_summary={},
                risk_score_progression=[],
                agent_status={}
            )
            
            self._log_interaction(investigation_id, InteractionType.INVESTIGATION_PROGRESS, asdict(progress_log))
        
        # Clean up file handlers
        if investigation_id in self._investigation_file_handlers:
            handler = self._investigation_file_handlers[investigation_id]
            handler.close()
            
            # Remove handler from logger
            investigation_logger = logging.getLogger(f"autonomous_investigation_{investigation_id}")
            investigation_logger.removeHandler(handler)
            
            # Clean up handler reference
            del self._investigation_file_handlers[investigation_id]
        
        # Generate HTML report for completed investigations
        try:
            self._generate_html_report(investigation_id)
        except Exception as e:
            _get_bridge_logger().warning(f"Failed to generate HTML report for investigation {investigation_id}: {e}")
        
        _get_bridge_logger().info(f"Completed investigation logging for: {investigation_id} with status: {final_status}")
    
    def _generate_html_report(self, investigation_id: str) -> None:
        """
        Generate comprehensive HTML report for investigation using EnhancedHTMLReportGenerator.
        
        Args:
            investigation_id: Investigation identifier
        """
        try:
            # Get investigation folder path
            folder_path = self.folder_manager.get_investigation_folder(investigation_id)
            if not folder_path:
                _get_bridge_logger().warning(f"Investigation folder not found for {investigation_id}")
                return
            
            # Generate comprehensive HTML report using the unified generator
            try:
                from ..reporting.comprehensive_investigation_report import generate_comprehensive_investigation_report
                
                # Generate single comprehensive report that includes all investigation data
                report_path = generate_comprehensive_investigation_report(
                    investigation_folder=folder_path,
                    output_path=folder_path / "comprehensive_investigation_report.html",
                    title=f"Comprehensive Investigation Report - {investigation_id}"
                )
                _get_bridge_logger().info(f"✅ Generated comprehensive HTML report: {report_path}")
                
                # Remove old report files to avoid confusion
                old_reports = [
                    folder_path / "investigation_report.html",
                    folder_path / "unified_test_report.html"
                ]
                for old_report in old_reports:
                    if old_report.exists():
                        try:
                            old_report.unlink()
                            _get_bridge_logger().debug(f"🗑️ Removed old report: {old_report}")
                        except Exception as e:
                            _get_bridge_logger().warning(f"Failed to remove old report {old_report}: {e}")
                
            except ImportError as import_error:
                # Fallback to simple generator if comprehensive generator is not available
                _get_bridge_logger().warning(f"Comprehensive report generator not available, using simple generator: {import_error}")
                html_content = self._create_investigation_html_report(folder_path)
                
                # Save HTML report to investigation folder
                report_file = folder_path / "investigation_report.html"
                with open(report_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                _get_bridge_logger().info(f"Generated simple HTML report: {report_file}")
                
        except Exception as e:
            _get_bridge_logger().error(f"Failed to generate HTML report for {investigation_id}: {e}")
    
    def _create_investigation_html_report(self, folder_path: Path) -> str:
        """Create HTML report content from investigation folder data"""
        import json
        
        # Read investigation data
        metadata_file = folder_path / "metadata.json"
        autonomous_file = folder_path / "autonomous_activities.jsonl" 
        journey_file = folder_path / "journey_tracking.json"
        log_file = folder_path / "investigation.log"
        
        # Load metadata
        metadata = {}
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
        
        # Load autonomous activities
        activities = []
        if autonomous_file.exists():
            with open(autonomous_file) as f:
                for line in f:
                    try:
                        activities.append(json.loads(line.strip()))
                    except:
                        pass
        
        # Load journey data
        journey_data = {}
        if journey_file.exists():
            try:
                with open(journey_file) as f:
                    journey_data = json.load(f)
            except:
                pass
        
        # Load log entries
        log_entries = []
        if log_file.exists():
            try:
                with open(log_file) as f:
                    log_entries = f.readlines()
            except:
                pass
        
        # Generate HTML content
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Investigation Report - {metadata.get('investigation_id', 'Unknown')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f8fafc; color: #1a202c;
        }}
        .container {{
            max-width: 1200px; margin: 0 auto; background: white;
            border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 30px;
        }}
        .header {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }}
        .title {{ font-size: 2.5rem; font-weight: bold; color: #2d3748; margin-bottom: 10px; }}
        .metadata {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }}
        .metric {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 20px; border-radius: 10px; text-align: center;
        }}
        .metric-value {{ font-size: 2rem; font-weight: bold; display: block; }}
        .metric-label {{ font-size: 0.9rem; opacity: 0.9; }}
        .section {{
            margin-bottom: 40px; border: 1px solid #e2e8f0;
            border-radius: 10px; padding: 25px;
        }}
        .section-title {{
            font-size: 1.5rem; font-weight: 600; color: #2d3748;
            margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
        }}
        .activity-item {{
            background: #f7fafc; border-left: 4px solid #4299e1;
            padding: 15px; margin-bottom: 10px; border-radius: 0 6px 6px 0;
        }}
        .activity-type {{ font-weight: 600; color: #2b6cb0; }}
        .activity-time {{ font-size: 0.85rem; color: #718096; margin-bottom: 5px; }}
        .log-entry {{
            font-family: 'Monaco', 'Consolas', monospace; font-size: 0.85rem;
            background: #2d3748; color: #e2e8f0; padding: 8px 12px;
            margin-bottom: 5px; border-radius: 4px; overflow-x: auto;
        }}
        .chart-container {{ position: relative; height: 400px; margin: 20px 0; }}
        .mermaid {{ text-align: center; margin: 20px 0; }}
        .risk-high {{ border-left-color: #e53e3e; }}
        .risk-medium {{ border-left-color: #d69e2e; }}
        .risk-low {{ border-left-color: #38a169; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔍 Investigation Report</div>
            <div style="color: #718096; font-size: 1.1rem;">
                {metadata.get('investigation_id', 'Unknown ID')} • 
                {metadata.get('mode', 'Unknown Mode')} • 
                {metadata.get('scenario', 'Unknown Scenario')}
            </div>
        </div>
        
        <div class="metadata">
            <div class="metric">
                <span class="metric-value">{metadata.get('mode', 'N/A')}</span>
                <span class="metric-label">Investigation Mode</span>
            </div>
            <div class="metric">
                <span class="metric-value">{len(activities)}</span>
                <span class="metric-label">Activities Recorded</span>
            </div>
            <div class="metric">
                <span class="metric-value">{len(journey_data.get('node_executions', []))}</span>
                <span class="metric-label">Nodes Executed</span>
            </div>
            <div class="metric">
                <span class="metric-value">{journey_data.get('final_state', {}).get('final_risk_score', 'N/A')}</span>
                <span class="metric-label">Final Risk Score</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🧠 LLM Interactions Timeline</div>
            <div class="chart-container">
                <canvas id="llmChart"></canvas>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🔄 Investigation Flow</div>
            <div class="mermaid">
                graph TD
                    A[Investigation Started] --> B[Data Collection]
                    B --> C[Analysis Phase]
                    C --> D[Risk Assessment] 
                    D --> E[Investigation Completed]
                    
                    classDef default fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
                    classDef completed fill:#e8f5e8,stroke:#4caf50,stroke-width:2px
                    
                    class B,C,D,E completed
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📊 Activity Log</div>
        """
        
        # Add activities
        llm_interactions = []
        for activity in activities:
            activity_type = activity.get('interaction_type', 'unknown')
            data = activity.get('data', {})
            timestamp = data.get('timestamp', '')
            
            if activity_type == 'llm_call':
                tokens = data.get('tokens_used', {}).get('total_tokens', 0)
                llm_interactions.append({
                    'timestamp': timestamp,
                    'tokens': tokens,
                    'agent': data.get('agent_name', 'unknown')
                })
            
            # Determine risk level for styling
            from app.service.agent.orchestration.metrics.safe import coerce_float
            
            risk_class = "risk-low"
            if activity_type in ['agent_decision', 'investigation_progress']:
                risk_score = data.get('decision_outcome', {}).get('risk_score') or data.get('findings_summary', {}).get('risk_score', 0)
                safe_risk = coerce_float(risk_score, 0.0)
                if safe_risk > 0.7:
                    risk_class = "risk-high"
                elif safe_risk > 0.4:
                    risk_class = "risk-medium"
            
            html_content += f"""
            <div class="activity-item {risk_class}">
                <div class="activity-time">{timestamp}</div>
                <div class="activity-type">{activity_type.replace('_', ' ').title()}</div>
                <div style="font-size: 0.9rem; margin-top: 5px;">
            """
            
            if activity_type == 'llm_call':
                html_content += f"Agent: {data.get('agent_name', 'N/A')} | Model: {data.get('model_name', 'N/A')} | Tokens: {data.get('tokens_used', {}).get('total_tokens', 0)}"
            elif activity_type == 'tool_execution':
                html_content += f"Tool: {data.get('tool_name', 'N/A')} | Success: {data.get('success', False)} | Duration: {data.get('execution_time_ms', 0)}ms"
            elif activity_type == 'agent_decision':
                html_content += f"Decision: {data.get('decision_type', 'N/A')} | Confidence: {data.get('confidence_score', 0):.2f}"
            
            html_content += "</div></div>"
        
        # Close sections and add JavaScript
        html_content += f"""
        </div>
        
        <div class="section">
            <div class="section-title">📝 Investigation Logs</div>
        """
        
        for log_entry in log_entries[:10]:  # Show first 10 log entries
            html_content += f'<div class="log-entry">{log_entry.strip()}</div>'
        
        html_content += f"""
        </div>
    </div>
    
    <script>
        // Initialize Mermaid
        mermaid.initialize({{ theme: 'default' }});
        
        // LLM Interactions Chart
        const ctx = document.getElementById('llmChart').getContext('2d');
        new Chart(ctx, {{
            type: 'line',
            data: {{
                labels: {[f"Activity {i+1}" for i in range(len(llm_interactions))]},
                datasets: [{{
                    label: 'Token Usage',
                    data: {[interaction['tokens'] for interaction in llm_interactions]},
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4,
                    fill: true
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    title: {{
                        display: true,
                        text: 'LLM Token Usage Over Time'
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        title: {{
                            display: true,
                            text: 'Tokens'
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
        """
        
        return html_content
    
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
        
        # Write to investigation-specific structured log file
        investigation_logger = logging.getLogger(f"autonomous_investigation_{investigation_id}")
        if investigation_logger.handlers:  # Only log if investigation-specific logger exists
            investigation_logger.debug(json.dumps(log_entry))
        else:
            # Fallback to general logger if investigation-specific logger not set up
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