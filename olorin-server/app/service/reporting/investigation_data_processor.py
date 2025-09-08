#!/usr/bin/env python3
"""
Investigation Data Processor

Comprehensive investigation data processor that extracts and structures data from
all investigation folder files for HTML report generation.

This module provides robust data processing with type-safe data structures, 
efficient parsing algorithms, and memory-optimized streaming for large files.

Features:
- Type-safe data classes for all extracted data
- Efficient parsing for metadata.json, autonomous_activities.jsonl, journey_tracking.json, investigation.log
- Memory-optimized streaming for large JSONL files
- Comprehensive error handling and edge cases
- Performance monitoring capabilities
- Structured data for visualization components

File Processing:
1. metadata.json: Investigation configuration and metadata
2. autonomous_activities.jsonl: LLM interactions, agent decisions, tool executions
3. journey_tracking.json: Node executions, state transitions, agent coordination
4. investigation.log: General logs and debug information

Output Data Structures:
- LLM interaction data with timestamps, tokens, reasoning
- Agent decision data and handovers
- Tool execution data and success rates
- Risk score progression over time
- Investigation phases and transitions
- Performance metrics and timing
- Timeline visualization data
- Graph/network data for agent interactions
- Statistics and metrics for dashboards
- Journey progression data
- LangGraph node/edge data
"""

import json
import logging
import re
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union, Iterator, Generator
import statistics
from enum import Enum
import hashlib

logger = logging.getLogger(__name__)

class InteractionType(Enum):
    """Types of investigation interactions"""
    LLM_CALL = "llm_call"
    TOOL_EXECUTION = "tool_execution"
    AGENT_DECISION = "agent_decision"
    INVESTIGATION_PROGRESS = "investigation_progress"
    LANGGRAPH_NODE = "langgraph_node"
    ERROR_CONDITION = "error_condition"
    STATE_TRANSITION = "state_transition"
    RISK_ASSESSMENT = "risk_assessment"

class ProcessingStatus(Enum):
    """Data processing status"""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    EMPTY = "empty"

@dataclass
class TokenUsage:
    """LLM token usage data"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TokenUsage':
        """Create TokenUsage from dictionary"""
        return cls(
            prompt_tokens=data.get('prompt_tokens', 0),
            completion_tokens=data.get('completion_tokens', 0),
            total_tokens=data.get('total_tokens', 0)
        )

@dataclass
class LLMInteraction:
    """Structured LLM interaction data"""
    timestamp: str
    agent_name: str
    model_name: str
    interaction_id: str
    tokens_used: TokenUsage
    tools_used: List[str]
    reasoning_chain: str
    response_time_ms: int
    confidence_score: Optional[float]
    success: bool
    error_message: Optional[str] = None
    
    @classmethod
    def from_activity_data(cls, activity: Dict[str, Any]) -> Optional['LLMInteraction']:
        """Create LLMInteraction from autonomous activity data"""
        if activity.get('interaction_type') != InteractionType.LLM_CALL.value:
            return None
            
        data = activity.get('data', {})
        return cls(
            timestamp=data.get('timestamp', ''),
            agent_name=data.get('agent_name', 'Unknown'),
            model_name=data.get('model_name', 'Unknown'),
            interaction_id=data.get('interaction_id', ''),
            tokens_used=TokenUsage.from_dict(data.get('tokens_used', {})),
            tools_used=data.get('tools_used', []),
            reasoning_chain=data.get('reasoning_chain', ''),
            response_time_ms=data.get('response_time_ms', 0),
            confidence_score=data.get('confidence_score'),
            success=data.get('success', True),
            error_message=data.get('error_message')
        )

@dataclass
class ToolExecution:
    """Structured tool execution data"""
    timestamp: str
    tool_name: str
    agent_name: str
    execution_id: str
    input_parameters: Dict[str, Any]
    output_data: Dict[str, Any]
    execution_time_ms: int
    success: bool
    error_message: Optional[str] = None
    
    @classmethod
    def from_activity_data(cls, activity: Dict[str, Any]) -> Optional['ToolExecution']:
        """Create ToolExecution from autonomous activity data"""
        if activity.get('interaction_type') != InteractionType.TOOL_EXECUTION.value:
            return None
            
        data = activity.get('data', {})
        return cls(
            timestamp=data.get('timestamp', ''),
            tool_name=data.get('tool_name', 'Unknown'),
            agent_name=data.get('agent_name', 'Unknown'),
            execution_id=data.get('execution_id', ''),
            input_parameters=data.get('input_parameters', {}),
            output_data=data.get('output_data', {}),
            execution_time_ms=data.get('execution_time_ms', 0),
            success=data.get('success', False),
            error_message=data.get('error_message')
        )

@dataclass
class AgentDecision:
    """Structured agent decision data"""
    timestamp: str
    agent_name: str
    decision_type: str
    decision_id: str
    reasoning: str
    confidence_score: float
    next_action: str
    context_data: Dict[str, Any]
    handover_target: Optional[str] = None
    
    @classmethod
    def from_activity_data(cls, activity: Dict[str, Any]) -> Optional['AgentDecision']:
        """Create AgentDecision from autonomous activity data"""
        if activity.get('interaction_type') != InteractionType.AGENT_DECISION.value:
            return None
            
        data = activity.get('data', {})
        return cls(
            timestamp=data.get('timestamp', ''),
            agent_name=data.get('agent_name', 'Unknown'),
            decision_type=data.get('decision_type', 'Unknown'),
            decision_id=data.get('decision_id', ''),
            reasoning=data.get('reasoning', ''),
            confidence_score=data.get('confidence_score', 0.0),
            next_action=data.get('next_action', ''),
            context_data=data.get('context_data', {}),
            handover_target=data.get('handover_target')
        )

@dataclass
class RiskScoreEntry:
    """Individual risk score entry"""
    timestamp: str
    risk_score: float
    risk_factors: List[str]
    confidence: float
    category: str
    details: Dict[str, Any]
    
    @classmethod
    def from_progression_data(cls, entry: Dict[str, Any]) -> 'RiskScoreEntry':
        """Create RiskScoreEntry from risk progression data"""
        return cls(
            timestamp=entry.get('timestamp', ''),
            risk_score=entry.get('risk_score', 0.0),
            risk_factors=entry.get('risk_factors', []),
            confidence=entry.get('confidence', 0.0),
            category=entry.get('category', 'Unknown'),
            details=entry.get('details', {})
        )

@dataclass
class LangGraphNode:
    """LangGraph node execution data"""
    timestamp: str
    node_name: str
    node_type: str
    node_id: str
    execution_time_ms: int
    next_nodes: List[str]
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    success: bool
    error_message: Optional[str] = None
    
    @classmethod
    def from_activity_data(cls, activity: Dict[str, Any]) -> Optional['LangGraphNode']:
        """Create LangGraphNode from autonomous activity data"""
        if activity.get('interaction_type') != InteractionType.LANGGRAPH_NODE.value:
            return None
            
        data = activity.get('data', {})
        return cls(
            timestamp=data.get('timestamp', ''),
            node_name=data.get('node_name', 'Unknown'),
            node_type=data.get('node_type', 'Unknown'),
            node_id=data.get('node_id', ''),
            execution_time_ms=data.get('execution_time_ms', 0),
            next_nodes=data.get('next_nodes', []),
            input_data=data.get('input_data', {}),
            output_data=data.get('output_data', {}),
            success=data.get('success', True),
            error_message=data.get('error_message')
        )

@dataclass
class InvestigationPhase:
    """Investigation phase transition data"""
    timestamp: str
    from_phase: Optional[str]
    to_phase: str
    progress_type: str
    duration_ms: int
    metadata: Dict[str, Any]
    
    @classmethod
    def from_activity_data(cls, activity: Dict[str, Any]) -> Optional['InvestigationPhase']:
        """Create InvestigationPhase from autonomous activity data"""
        if activity.get('interaction_type') != InteractionType.INVESTIGATION_PROGRESS.value:
            return None
            
        data = activity.get('data', {})
        return cls(
            timestamp=data.get('timestamp', ''),
            from_phase=data.get('from_phase'),
            to_phase=data.get('to_phase', data.get('current_phase', 'Unknown')),
            progress_type=data.get('progress_type', 'Unknown'),
            duration_ms=data.get('duration_ms', 0),
            metadata=data.get('metadata', {})
        )

@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: str
    level: str
    message: str
    logger_name: str
    thread_id: Optional[str] = None
    exception_info: Optional[str] = None
    extra_data: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_log_line(cls, line: str) -> 'LogEntry':
        """Parse log entry from raw log line"""
        # Enhanced log parsing patterns
        patterns = [
            # ISO timestamp with logger pattern
            r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z?)\s+(\w+)\s+(\S+)\s+(.+)',
            # Standard timestamp pattern with logger
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(\S+)\s+(.+)',
            # Simple timestamp pattern
            r'(\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line)
            if match:
                if len(match.groups()) == 4:
                    timestamp_str, level, logger_name, message = match.groups()
                else:
                    timestamp_str, level, message = match.groups()
                    logger_name = 'root'
                
                return cls(
                    timestamp=timestamp_str,
                    level=level.upper(),
                    message=message.strip(),
                    logger_name=logger_name
                )
        
        # Fallback: treat entire line as message
        return cls(
            timestamp=datetime.now().isoformat(),
            level='INFO',
            message=line.strip(),
            logger_name='unknown'
        )

@dataclass
class ProcessingMetrics:
    """Data processing performance metrics"""
    start_time: float
    end_time: float
    files_processed: int
    total_records: int
    errors_encountered: int
    memory_peak_mb: float
    processing_time_ms: int
    
    @property
    def duration_seconds(self) -> float:
        """Processing duration in seconds"""
        return self.end_time - self.start_time
    
    @property
    def records_per_second(self) -> float:
        """Records processed per second"""
        duration = self.duration_seconds
        return self.total_records / duration if duration > 0 else 0

@dataclass
class ProcessedInvestigationData:
    """Complete processed investigation data"""
    # Metadata
    investigation_id: str
    mode: str
    scenario: str
    created_at: str
    status: str
    
    # Structured interaction data
    llm_interactions: List[LLMInteraction] = field(default_factory=list)
    tool_executions: List[ToolExecution] = field(default_factory=list)
    agent_decisions: List[AgentDecision] = field(default_factory=list)
    langgraph_nodes: List[LangGraphNode] = field(default_factory=list)
    investigation_phases: List[InvestigationPhase] = field(default_factory=list)
    risk_score_entries: List[RiskScoreEntry] = field(default_factory=list)
    log_entries: List[LogEntry] = field(default_factory=list)
    
    # Journey tracking data
    journey_data: Dict[str, Any] = field(default_factory=dict)
    
    # Investigation results from results folder
    investigation_results: Dict[str, Any] = field(default_factory=dict)
    
    # Aggregated statistics
    total_interactions: int = 0
    duration_seconds: float = 0.0
    total_tokens_used: int = 0
    agents_used: List[str] = field(default_factory=list)
    tools_used: List[str] = field(default_factory=list)
    error_count: int = 0
    
    # Processing metadata
    processing_status: ProcessingStatus = ProcessingStatus.SUCCESS
    processing_metrics: Optional[ProcessingMetrics] = None
    processing_errors: List[str] = field(default_factory=list)
    
    def get_timeline_data(self) -> List[Dict[str, Any]]:
        """Generate timeline data for visualization"""
        timeline_events = []
        
        # Add LLM interactions
        for interaction in self.llm_interactions:
            timeline_events.append({
                'timestamp': interaction.timestamp,
                'type': 'llm_interaction',
                'title': f'{interaction.agent_name} → {interaction.model_name}',
                'description': interaction.reasoning_chain[:100],
                'metadata': {
                    'tokens': interaction.tokens_used.total_tokens,
                    'response_time': interaction.response_time_ms,
                    'tools_used': interaction.tools_used
                }
            })
        
        # Add tool executions
        for execution in self.tool_executions:
            timeline_events.append({
                'timestamp': execution.timestamp,
                'type': 'tool_execution',
                'title': f'Tool: {execution.tool_name}',
                'description': f'Executed by {execution.agent_name}',
                'metadata': {
                    'execution_time': execution.execution_time_ms,
                    'success': execution.success
                }
            })
        
        # Add phase transitions
        for phase in self.investigation_phases:
            timeline_events.append({
                'timestamp': phase.timestamp,
                'type': 'phase_transition',
                'title': f'Phase: {phase.to_phase}',
                'description': f'Progress type: {phase.progress_type}',
                'metadata': {
                    'from_phase': phase.from_phase,
                    'duration': phase.duration_ms
                }
            })
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: self._parse_timestamp(x['timestamp']))
        return timeline_events
    
    def get_agent_network_data(self) -> Dict[str, Any]:
        """Generate agent interaction network data"""
        nodes = {}
        edges = []
        
        # Build agent nodes
        for agent in self.agents_used:
            nodes[agent] = {
                'id': agent,
                'label': agent,
                'type': 'agent',
                'interactions': len([i for i in self.llm_interactions if i.agent_name == agent])
            }
        
        # Build edges from handovers
        for decision in self.agent_decisions:
            if decision.handover_target:
                edge_id = f"{decision.agent_name}->{decision.handover_target}"
                edges.append({
                    'id': edge_id,
                    'source': decision.agent_name,
                    'target': decision.handover_target,
                    'type': 'handover'
                })
        
        return {'nodes': list(nodes.values()), 'edges': edges}
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Generate performance metrics for dashboard"""
        metrics = {}
        
        if self.llm_interactions:
            response_times = [i.response_time_ms for i in self.llm_interactions if i.response_time_ms > 0]
            if response_times:
                metrics['avg_llm_response_time'] = statistics.mean(response_times)
                metrics['max_llm_response_time'] = max(response_times)
                metrics['min_llm_response_time'] = min(response_times)
        
        if self.tool_executions:
            execution_times = [t.execution_time_ms for t in self.tool_executions if t.execution_time_ms > 0]
            if execution_times:
                metrics['avg_tool_execution_time'] = statistics.mean(execution_times)
                metrics['tool_success_rate'] = sum(1 for t in self.tool_executions if t.success) / len(self.tool_executions)
        
        if self.risk_score_entries:
            risk_scores = [r.risk_score for r in self.risk_score_entries]
            metrics['avg_risk_score'] = statistics.mean(risk_scores)
            metrics['risk_volatility'] = statistics.stdev(risk_scores) if len(risk_scores) > 1 else 0
        
        return metrics
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string to datetime object"""
        try:
            if 'T' in timestamp_str:
                return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif ',' in timestamp_str:
                return datetime.strptime(timestamp_str.split(',')[0], "%Y-%m-%d %H:%M:%S")
            else:
                return datetime.fromisoformat(timestamp_str)
        except (ValueError, AttributeError):
            return datetime.now()

class InvestigationDataProcessor:
    """
    Comprehensive investigation data processor for HTML report generation.
    
    Processes all investigation folder file types:
    - metadata.json: Investigation configuration and metadata
    - autonomous_activities.jsonl: LLM interactions, agent decisions, tool executions
    - journey_tracking.json: Node executions, state transitions, agent coordination
    - investigation.log: General logs and debug information
    
    Features:
    - Type-safe data structures for extracted data
    - Efficient parsing algorithms with streaming support
    - Memory optimization for large files
    - Comprehensive error handling
    - Performance monitoring
    - Structured data for visualizations
    """
    
    def __init__(self, 
                 memory_limit_mb: int = 500,
                 batch_size: int = 1000,
                 enable_performance_monitoring: bool = True):
        """
        Initialize investigation data processor.
        
        Args:
            memory_limit_mb: Memory limit for processing large files
            batch_size: Batch size for streaming JSONL processing
            enable_performance_monitoring: Enable performance metrics collection
        """
        self.memory_limit_mb = memory_limit_mb
        self.batch_size = batch_size
        self.enable_performance_monitoring = enable_performance_monitoring
        self._processing_start_time: Optional[float] = None
        
    def process_investigation_folder(self, folder_path: Path) -> ProcessedInvestigationData:
        """
        Process complete investigation folder and extract structured data.
        
        Args:
            folder_path: Path to investigation folder
            
        Returns:
            Complete processed investigation data
            
        Raises:
            FileNotFoundError: If investigation folder doesn't exist
            ValueError: If folder is not a valid investigation folder
        """
        if not folder_path.exists():
            raise FileNotFoundError(f"Investigation folder not found: {folder_path}")
            
        if not folder_path.is_dir():
            raise ValueError(f"Path is not a directory: {folder_path}")
        
        # Start performance monitoring
        if self.enable_performance_monitoring:
            self._processing_start_time = time.time()
        
        try:
            # Initialize result data structure
            result = ProcessedInvestigationData(
                investigation_id="unknown",
                mode="unknown", 
                scenario="unknown",
                created_at="",
                status="unknown"
            )
            
            processing_errors = []
            files_processed = 0
            
            # Process metadata.json
            metadata_file = folder_path / "metadata.json"
            if metadata_file.exists():
                try:
                    metadata = self._process_metadata_file(metadata_file)
                    result.investigation_id = metadata.get('investigation_id', 'unknown')
                    result.mode = metadata.get('mode', 'unknown')
                    result.scenario = metadata.get('scenario', 'unknown')
                    result.created_at = metadata.get('created_at', '')
                    result.status = metadata.get('status', 'unknown')
                    files_processed += 1
                except Exception as e:
                    error_msg = f"Error processing metadata.json: {str(e)}"
                    processing_errors.append(error_msg)
                    logger.error(error_msg)
            
            # Process autonomous_activities.jsonl with streaming
            activities_file = folder_path / "autonomous_activities.jsonl"
            if activities_file.exists():
                try:
                    interactions_data = self._process_activities_file_streaming(activities_file)
                    result.llm_interactions = interactions_data['llm_interactions']
                    result.tool_executions = interactions_data['tool_executions']
                    result.agent_decisions = interactions_data['agent_decisions']
                    result.langgraph_nodes = interactions_data['langgraph_nodes']
                    result.investigation_phases = interactions_data['investigation_phases']
                    result.risk_score_entries = interactions_data['risk_score_entries']
                    files_processed += 1
                except Exception as e:
                    error_msg = f"Error processing autonomous_activities.jsonl: {str(e)}"
                    processing_errors.append(error_msg)
                    logger.error(error_msg)
            
            # Process journey_tracking.json
            journey_file = folder_path / "journey_tracking.json"
            if journey_file.exists():
                try:
                    result.journey_data = self._process_journey_file(journey_file)
                    files_processed += 1
                except Exception as e:
                    error_msg = f"Error processing journey_tracking.json: {str(e)}"
                    processing_errors.append(error_msg)
                    logger.error(error_msg)
            
            # Process investigation.log with streaming
            log_file = folder_path / "investigation.log"
            if log_file.exists():
                try:
                    result.log_entries = self._process_log_file_streaming(log_file)
                    files_processed += 1
                except Exception as e:
                    error_msg = f"Error processing investigation.log: {str(e)}"
                    processing_errors.append(error_msg)
                    logger.error(error_msg)
            
            # Process results folder containing investigation results
            results_dir = folder_path / "results"
            if results_dir.exists() and results_dir.is_dir():
                try:
                    results_data = self._process_results_folder(results_dir)
                    # Add results data to the processed data
                    result.investigation_results = results_data
                    files_processed += len(results_data)
                    logger.info(f"Processed {len(results_data)} files from results folder")
                except Exception as e:
                    error_msg = f"Error processing results folder: {str(e)}"
                    processing_errors.append(error_msg)
                    logger.error(error_msg)
            
            # Calculate aggregated statistics
            self._calculate_aggregated_statistics(result)
            
            # Set processing status
            if processing_errors:
                result.processing_status = ProcessingStatus.PARTIAL if files_processed > 0 else ProcessingStatus.FAILED
                result.processing_errors = processing_errors
            else:
                result.processing_status = ProcessingStatus.SUCCESS if files_processed > 0 else ProcessingStatus.EMPTY
            
            # Add performance metrics
            if self.enable_performance_monitoring:
                result.processing_metrics = self._generate_processing_metrics(
                    files_processed, 
                    result.total_interactions,
                    len(processing_errors)
                )
            
            logger.info(f"Processed investigation folder {folder_path.name}: "
                       f"{result.total_interactions} interactions, "
                       f"{len(result.llm_interactions)} LLM calls, "
                       f"{len(result.tool_executions)} tool executions")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process investigation folder {folder_path}: {str(e)}")
            raise
    
    def _process_metadata_file(self, metadata_file: Path) -> Dict[str, Any]:
        """Process metadata.json file"""
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in metadata file: {e}")
        except Exception as e:
            raise ValueError(f"Error reading metadata file: {e}")
    
    def _process_activities_file_streaming(self, activities_file: Path) -> Dict[str, List[Any]]:
        """Process autonomous_activities.jsonl file with memory-optimized streaming"""
        interactions_data = {
            'llm_interactions': [],
            'tool_executions': [],
            'agent_decisions': [],
            'langgraph_nodes': [],
            'investigation_phases': [],
            'risk_score_entries': []
        }
        
        file_size = activities_file.stat().st_size
        use_streaming = file_size > (self.memory_limit_mb * 1024 * 1024)
        
        if use_streaming:
            logger.info(f"Using streaming mode for large file: {file_size / (1024*1024):.1f} MB")
        
        try:
            with open(activities_file, 'r', encoding='utf-8') as f:
                line_count = 0
                batch_buffer = []
                
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                        
                    try:
                        activity = json.loads(line)
                        batch_buffer.append(activity)
                        line_count += 1
                        
                        # Process in batches for large files
                        if use_streaming and len(batch_buffer) >= self.batch_size:
                            self._process_activity_batch(batch_buffer, interactions_data)
                            batch_buffer = []
                        
                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON on line {line_count} in {activities_file}: {e}")
                        continue
                
                # Process remaining items in buffer
                if batch_buffer:
                    self._process_activity_batch(batch_buffer, interactions_data)
                
                logger.info(f"Processed {line_count} activities from {activities_file.name}")
                
        except Exception as e:
            raise ValueError(f"Error processing activities file: {e}")
        
        return interactions_data
    
    def _process_activity_batch(self, batch: List[Dict[str, Any]], interactions_data: Dict[str, List[Any]]) -> None:
        """Process a batch of activities"""
        for activity in batch:
            interaction_type = activity.get('interaction_type')
            
            if interaction_type == InteractionType.LLM_CALL.value:
                llm_interaction = LLMInteraction.from_activity_data(activity)
                if llm_interaction:
                    interactions_data['llm_interactions'].append(llm_interaction)
                    
            elif interaction_type == InteractionType.TOOL_EXECUTION.value:
                tool_execution = ToolExecution.from_activity_data(activity)
                if tool_execution:
                    interactions_data['tool_executions'].append(tool_execution)
                    
            elif interaction_type == InteractionType.AGENT_DECISION.value:
                agent_decision = AgentDecision.from_activity_data(activity)
                if agent_decision:
                    interactions_data['agent_decisions'].append(agent_decision)
                    
            elif interaction_type == InteractionType.LANGGRAPH_NODE.value:
                langgraph_node = LangGraphNode.from_activity_data(activity)
                if langgraph_node:
                    interactions_data['langgraph_nodes'].append(langgraph_node)
                    
            elif interaction_type == InteractionType.INVESTIGATION_PROGRESS.value:
                investigation_phase = InvestigationPhase.from_activity_data(activity)
                if investigation_phase:
                    interactions_data['investigation_phases'].append(investigation_phase)
                
                # Also extract risk score progression
                data = activity.get('data', {})
                risk_progression = data.get('risk_score_progression', [])
                for risk_entry in risk_progression:
                    if isinstance(risk_entry, dict) and 'risk_score' in risk_entry:
                        risk_score_entry = RiskScoreEntry.from_progression_data(risk_entry)
                        interactions_data['risk_score_entries'].append(risk_score_entry)
    
    def _process_journey_file(self, journey_file: Path) -> Dict[str, Any]:
        """Process journey_tracking.json file"""
        try:
            with open(journey_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in journey file: {e}")
            return {}
        except Exception as e:
            logger.warning(f"Error reading journey file: {e}")
            return {}
    
    def _process_log_file_streaming(self, log_file: Path) -> List[LogEntry]:
        """Process investigation.log file with streaming"""
        log_entries = []
        file_size = log_file.stat().st_size
        use_streaming = file_size > (self.memory_limit_mb * 1024 * 1024)
        
        if use_streaming:
            logger.info(f"Using streaming mode for large log file: {file_size / (1024*1024):.1f} MB")
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                line_count = 0
                
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        log_entry = LogEntry.from_log_line(line)
                        log_entries.append(log_entry)
                        line_count += 1
                        
                        # Limit log entries for very large files
                        if use_streaming and len(log_entries) >= 10000:
                            logger.info(f"Truncated log processing at {len(log_entries)} entries")
                            break
                            
                    except Exception as e:
                        logger.debug(f"Failed to parse log line {line_count}: {e}")
                        continue
                
                logger.info(f"Processed {line_count} log entries from {log_file.name}")
                
        except Exception as e:
            logger.warning(f"Error processing log file: {e}")
        
        return log_entries
    
    def _calculate_aggregated_statistics(self, result: ProcessedInvestigationData) -> None:
        """Calculate aggregated statistics from processed data"""
        # Total interactions
        result.total_interactions = (
            len(result.llm_interactions) +
            len(result.tool_executions) + 
            len(result.agent_decisions) +
            len(result.langgraph_nodes)
        )
        
        # Total tokens used
        result.total_tokens_used = sum(
            interaction.tokens_used.total_tokens 
            for interaction in result.llm_interactions
        )
        
        # Agents used
        agents = set()
        for interaction in result.llm_interactions:
            agents.add(interaction.agent_name)
        for execution in result.tool_executions:
            agents.add(execution.agent_name)
        for decision in result.agent_decisions:
            agents.add(decision.agent_name)
        result.agents_used = list(agents)
        
        # Tools used
        tools = set()
        for execution in result.tool_executions:
            tools.add(execution.tool_name)
        for interaction in result.llm_interactions:
            tools.update(interaction.tools_used)
        result.tools_used = list(tools)
        
        # Error count
        result.error_count = (
            len([i for i in result.llm_interactions if not i.success]) +
            len([t for t in result.tool_executions if not t.success]) +
            len([n for n in result.langgraph_nodes if not n.success])
        )
        
        # Calculate duration
        all_timestamps = []
        for interaction in result.llm_interactions:
            all_timestamps.append(interaction.timestamp)
        for execution in result.tool_executions:
            all_timestamps.append(execution.timestamp)
        for phase in result.investigation_phases:
            all_timestamps.append(phase.timestamp)
        
        if all_timestamps:
            try:
                parsed_timestamps = [result._parse_timestamp(ts) for ts in all_timestamps]
                start_time = min(parsed_timestamps)
                end_time = max(parsed_timestamps)
                result.duration_seconds = (end_time - start_time).total_seconds()
            except Exception:
                result.duration_seconds = 0.0
    
    def _process_results_folder(self, results_dir: Path) -> Dict[str, Any]:
        """
        Process the results folder containing investigation results.
        
        Args:
            results_dir: Path to results directory
            
        Returns:
            Dictionary containing all results data
        """
        results_data = {}
        
        try:
            # Process each JSON file in the results directory
            for result_file in results_dir.glob("*.json"):
                try:
                    with open(result_file, 'r') as f:
                        file_data = json.load(f)
                        # Use the filename (without extension) as the key
                        file_key = result_file.stem
                        results_data[file_key] = file_data
                        logger.debug(f"Loaded results file: {result_file.name}")
                except Exception as e:
                    logger.warning(f"Failed to load results file {result_file}: {e}")
            
            # Special handling for key result files
            if 'summary' in results_data:
                # Extract key metrics from summary for easy access
                summary = results_data['summary']
                results_data['final_risk_score'] = summary.get('final_risk_score', 0.0)
                results_data['confidence'] = summary.get('confidence', 0.0)
                results_data['duration_seconds'] = summary.get('duration_seconds', 0.0)
                results_data['investigation_status'] = summary.get('status', 'unknown')
            
            if 'agent_results' in results_data:
                # Extract agent-specific results
                agent_results = results_data['agent_results']
                results_data['agents_executed'] = list(agent_results.keys()) if isinstance(agent_results, dict) else []
            
            if 'validation_results' in results_data:
                # Extract validation scores
                validation = results_data['validation_results']
                results_data['validation_score'] = validation.get('overall_score', 0.0)
            
            if 'performance_metrics' in results_data:
                # Extract performance data
                perf = results_data['performance_metrics']
                results_data['total_execution_time'] = perf.get('total_duration', 0.0)
            
        except Exception as e:
            logger.error(f"Error processing results folder: {e}")
        
        return results_data
    
    def _generate_processing_metrics(self, 
                                   files_processed: int, 
                                   total_records: int,
                                   errors_encountered: int) -> ProcessingMetrics:
        """Generate processing performance metrics"""
        end_time = time.time()
        start_time = self._processing_start_time or end_time
        
        import psutil
        import os
        
        try:
            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            memory_peak_mb = memory_info.rss / (1024 * 1024)
        except:
            memory_peak_mb = 0.0
        
        return ProcessingMetrics(
            start_time=start_time,
            end_time=end_time,
            files_processed=files_processed,
            total_records=total_records,
            errors_encountered=errors_encountered,
            memory_peak_mb=memory_peak_mb,
            processing_time_ms=int((end_time - start_time) * 1000)
        )

def create_data_processor(**kwargs) -> InvestigationDataProcessor:
    """
    Create investigation data processor with optional configuration.
    
    Args:
        **kwargs: Configuration options for InvestigationDataProcessor
        
    Returns:
        Configured InvestigationDataProcessor instance
    """
    return InvestigationDataProcessor(**kwargs)

def process_investigation_folder(folder_path: Union[str, Path], **processor_kwargs) -> ProcessedInvestigationData:
    """
    Process investigation folder and return structured data.
    
    Args:
        folder_path: Path to investigation folder
        **processor_kwargs: Configuration options for processor
        
    Returns:
        Complete processed investigation data
        
    Raises:
        FileNotFoundError: If investigation folder doesn't exist
        ValueError: If folder is not a valid investigation folder
    """
    processor = create_data_processor(**processor_kwargs)
    return processor.process_investigation_folder(Path(folder_path))