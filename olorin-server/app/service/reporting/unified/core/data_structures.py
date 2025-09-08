"""
Unified data structures for HTML report generation.

This module defines the standardized data structures that all components
and adapters use to ensure consistent data handling across the system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum


class RiskLevel(Enum):
    """Risk level enumeration for consistent risk assessment."""
    LOW = "low"
    MEDIUM = "medium"  
    HIGH = "high"
    CRITICAL = "critical"


class InvestigationStatus(Enum):
    """Investigation status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class InvestigationSummary:
    """Executive summary data for investigations."""
    investigation_id: str
    scenario_name: str
    mode: str  # LIVE, MOCK, DEMO
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    status: InvestigationStatus = InvestigationStatus.PENDING
    overall_risk_score: Optional[float] = None
    confidence_score: Optional[float] = None
    
    # Test-specific metrics
    tests_passed: int = 0
    tests_failed: int = 0
    pass_rate: float = 0.0
    
    # Investigation metrics
    total_interactions: int = 0
    llm_calls: int = 0
    tool_executions: int = 0
    total_tokens: int = 0
    error_count: int = 0
    
    # Agents and tools used
    agents_used: List[str] = field(default_factory=list)
    tools_used: List[str] = field(default_factory=list)


@dataclass
class TimelineEvent:
    """Timeline event data structure."""
    timestamp: datetime
    event_type: str  # agent_call, tool_execution, phase_transition, etc.
    title: str
    description: str
    agent: Optional[str] = None
    tool: Optional[str] = None
    risk_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RiskAnalysisData:
    """Risk analysis and scoring data."""
    final_risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    risk_breakdown: Dict[str, float] = field(default_factory=dict)
    risk_progression: List[Dict[str, Any]] = field(default_factory=list)
    agent_risk_scores: Dict[str, float] = field(default_factory=dict)
    risk_factors: List[str] = field(default_factory=list)
    mitigation_recommendations: List[str] = field(default_factory=list)


@dataclass
class AgentAnalysisData:
    """Agent performance and usage analysis."""
    agent_usage: Dict[str, int] = field(default_factory=dict)
    agent_success_rates: Dict[str, float] = field(default_factory=dict)
    agent_response_times: Dict[str, List[float]] = field(default_factory=dict)
    agent_error_counts: Dict[str, int] = field(default_factory=dict)
    agent_interactions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass  
class ToolsAnalysisData:
    """Tools usage and performance analysis."""
    tool_usage: Dict[str, int] = field(default_factory=dict)
    tool_success_rates: Dict[str, float] = field(default_factory=dict)
    tool_execution_times: Dict[str, List[float]] = field(default_factory=dict)
    tool_error_rates: Dict[str, float] = field(default_factory=dict)
    tool_interactions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class InvestigationFlowData:
    """Investigation flow and phase transition data."""
    phases: List[Dict[str, Any]] = field(default_factory=list)
    phase_transitions: List[Dict[str, Any]] = field(default_factory=list)
    flow_diagram_data: Dict[str, Any] = field(default_factory=dict)
    current_phase: Optional[str] = None
    completed_phases: List[str] = field(default_factory=list)


@dataclass
class PerformanceData:
    """Performance metrics and monitoring data."""
    total_execution_time: Optional[float] = None
    average_response_time: Optional[float] = None
    memory_usage: Optional[Dict[str, Any]] = None
    token_usage: Optional[Dict[str, int]] = None
    api_call_counts: Dict[str, int] = field(default_factory=dict)
    performance_bottlenecks: List[str] = field(default_factory=list)


@dataclass
class ExplanationData:
    """Agent explanations and reasoning data."""
    explanation_id: str
    agent: str
    timestamp: datetime
    reasoning: str
    confidence: Optional[float] = None
    evidence: List[str] = field(default_factory=list)
    conclusions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class JourneyTrackingData:
    """Investigation journey and progress tracking data."""
    milestones: List[Dict[str, Any]] = field(default_factory=list)
    progress_markers: List[Dict[str, Any]] = field(default_factory=list)
    journey_visualization: Dict[str, Any] = field(default_factory=dict)
    current_step: Optional[str] = None
    completed_steps: List[str] = field(default_factory=list)
    total_steps: Optional[int] = None


@dataclass
class UnifiedReportData:
    """
    Standardized data structure that all components consume.
    
    This is the unified format that adapters convert all data sources into,
    ensuring consistency across different input types (test results, 
    investigation folders, etc.).
    """
    
    # Required core data
    summary: InvestigationSummary
    
    # Timeline and events
    timeline_events: List[TimelineEvent] = field(default_factory=list)
    
    # Risk analysis
    risk_analysis: RiskAnalysisData = field(default_factory=RiskAnalysisData)
    
    # Agent and tools data
    agents_data: AgentAnalysisData = field(default_factory=AgentAnalysisData)
    tools_data: ToolsAnalysisData = field(default_factory=ToolsAnalysisData)
    
    # Flow and journey data  
    flow_data: InvestigationFlowData = field(default_factory=InvestigationFlowData)
    journey_data: JourneyTrackingData = field(default_factory=JourneyTrackingData)
    
    # Performance metrics
    performance_metrics: PerformanceData = field(default_factory=PerformanceData)
    
    # Explanations and reasoning
    explanations: List[ExplanationData] = field(default_factory=list)
    
    # Raw data preservation
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    # File paths and references
    investigation_folder: Optional[str] = None
    output_files: List[str] = field(default_factory=list)
    
    def get_risk_level(self) -> RiskLevel:
        """Get the overall risk level based on final risk score."""
        if self.risk_analysis.final_risk_score is None:
            return RiskLevel.LOW
            
        score = self.risk_analysis.final_risk_score
        if score >= 0.8:
            return RiskLevel.CRITICAL
        elif score >= 0.6:
            return RiskLevel.HIGH
        elif score >= 0.4:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def get_completion_percentage(self) -> float:
        """Calculate investigation completion percentage."""
        if not self.journey_data.total_steps:
            return 0.0
            
        completed = len(self.journey_data.completed_steps)
        total = self.journey_data.total_steps
        return (completed / total) * 100.0