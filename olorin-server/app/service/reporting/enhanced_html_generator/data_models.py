#!/usr/bin/env python3
"""
Data models for Enhanced HTML Report Generator.

Contains all dataclasses and type definitions used throughout the report generation system.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from enum import Enum


class ReportTheme(Enum):
    """Available report themes"""
    DEFAULT = "default"
    DARK = "dark"
    HIGH_CONTRAST = "high_contrast"
    COLORBLIND_FRIENDLY = "colorblind_friendly"


@dataclass
class InvestigationSummary:
    """Summary statistics for an investigation"""
    investigation_id: str
    mode: str
    scenario: str
    created_at: str
    status: str
    total_interactions: int
    duration_seconds: float
    llm_calls: int
    tool_executions: int
    agent_decisions: int
    total_tokens: int
    risk_scores: List[float]
    final_risk_score: Optional[float]
    agents_used: List[str]
    tools_used: List[str]
    error_count: int


@dataclass
class ComponentData:
    """Container for processed component data"""
    llm_interactions: List[Dict[str, Any]]
    investigation_flow: List[Dict[str, Any]]
    tools_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    explanations: List[Dict[str, Any]]
    journey_data: Dict[str, Any]
    langgraph_nodes: List[Dict[str, Any]]


@dataclass
class ReportConfig:
    """Configuration for report generation"""
    theme: ReportTheme = ReportTheme.DEFAULT
    enable_animations: bool = True
    enable_tooltips: bool = True
    responsive: bool = True
    accessibility_enabled: bool = True
    max_data_points: int = 1000
    chart_height: int = 400
    enable_export: bool = True
    debug_mode: bool = False
    include_components: Optional[List[str]] = None


@dataclass
class ExtractedData:
    """Raw extracted data from investigation files"""
    metadata: Dict[str, Any]
    structured_activities: List[Dict[str, Any]]
    journey_tracking: Dict[str, Any]
    investigation_log: List[Dict[str, Any]]
    files_info: Dict[str, Any]


@dataclass
class GeneratedReport:
    """Generated report information"""
    output_path: str
    generation_time: float
    report_size_bytes: int
    components_included: List[str]
    errors: List[str]
    warnings: List[str]