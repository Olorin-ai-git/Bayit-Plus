#!/usr/bin/env python3
"""
Interactive Visualization Components for Investigation HTML Reports

This package provides modular, reusable visualization components that generate
interactive HTML/JavaScript/CSS components for investigation data visualization.

Components:
- LLM Interactions Timeline
- Investigation Flow Graph  
- Tools & Agents Analysis
- Risk Analysis Dashboard
- Investigation Explanations
- Journey Visualization
- LangGraph Visualization

Features:
- Chart.js for interactive charts and timelines
- Mermaid.js for flowcharts and network diagrams
- Responsive, mobile-friendly design
- Hover effects, tooltips, and animations
- Professional styling with modern CSS
- Accessible design (WCAG 2.1 compliance)
- Error handling for missing data
- Configurable themes and styling
"""

from .llm_timeline import LLMTimelineComponent
from .flow_graph import InvestigationFlowComponent
from .tools_analysis import ToolsAnalysisComponent
from .risk_dashboard import RiskDashboardComponent
from .explanations import ExplanationsComponent
from .journey_visualization import JourneyVisualizationComponent
from .langgraph_visualization import LangGraphVisualizationComponent
from .base_component import BaseVisualizationComponent, ComponentConfig

__all__ = [
    'BaseVisualizationComponent',
    'ComponentConfig',
    'LLMTimelineComponent',
    'InvestigationFlowComponent', 
    'ToolsAnalysisComponent',
    'RiskDashboardComponent',
    'ExplanationsComponent',
    'JourneyVisualizationComponent',
    'LangGraphVisualizationComponent'
]

# Component registry for dynamic component loading
COMPONENT_REGISTRY = {
    'llm_timeline': LLMTimelineComponent,
    'investigation_flow': InvestigationFlowComponent,
    'tools_analysis': ToolsAnalysisComponent,
    'risk_dashboard': RiskDashboardComponent,
    'explanations': ExplanationsComponent,
    'journey_visualization': JourneyVisualizationComponent,
    'langgraph_visualization': LangGraphVisualizationComponent
}

def get_component(component_name: str) -> BaseVisualizationComponent:
    """Get component class by name"""
    component_class = COMPONENT_REGISTRY.get(component_name)
    if not component_class:
        raise ValueError(f"Unknown component: {component_name}")
    return component_class()

def get_all_components() -> list:
    """Get all available component instances"""
    return [cls() for cls in COMPONENT_REGISTRY.values()]
