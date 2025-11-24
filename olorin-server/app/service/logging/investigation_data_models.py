"""
Investigation Instrumentation Data Models

Dataclasses for capturing investigation instrumentation data.
"""

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional


@dataclass
class RiskFactor:
    """Individual risk factor in calculation."""
    name: str
    value: float
    weight: float
    reasoning: str
    evidence: List[str]

    def weighted_score(self) -> float:
        """Calculate weighted contribution."""
        return self.value * self.weight


@dataclass
class LLMInteraction:
    """Capture complete LLM interaction"""
    timestamp: str
    agent_name: str
    llm_model: str
    prompt: str
    response: str
    reasoning: Optional[str] = None
    tokens_used: int = 0
    latency_ms: float = 0.0
    temperature: float = 0.1  # Low temperature for consistent results
    max_tokens: int = 2048
    stop_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class ToolExecution:
    """Capture tool execution details"""
    timestamp: str
    agent_name: str
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Dict[str, Any]
    raw_output: Optional[str] = None
    execution_time_ms: float = 0.0
    status: str = "success"
    error_message: Optional[str] = None
    data_retrieved: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class RiskCalculation:
    """Capture risk calculation"""
    timestamp: str
    agent_name: str
    entity_id: str
    entity_type: str
    risk_factors: Dict[str, float]
    calculation_method: str
    intermediate_scores: Dict[str, float]
    final_score: float
    reasoning: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class AgentDecision:
    """Capture agent decision making"""
    timestamp: str
    agent_name: str
    decision_type: str
    options_considered: List[str]
    selected_option: str
    reasoning: str
    confidence_score: float
    context_summary: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class AgentResult:
    """Capture agent results"""
    timestamp: str
    agent_name: str
    investigation_id: str
    entity_id: str
    final_risk_score: float
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    confidence: float
    tools_used: List[str]
    execution_time_ms: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
