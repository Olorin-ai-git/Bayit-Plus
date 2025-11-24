#!/usr/bin/env python3
"""
Components package for Enhanced HTML Report Generator.

Provides HTML generation for headers, summaries, timelines, and other report sections.
"""

from ..data_models import InvestigationSummary, ComponentData
from ..utils import DateTimeFormatter, DataFormatter, StatusFormatter, ListFormatter
from typing import Dict, List, Any
<<<<<<< HEAD
=======
from app.service.reporting.olorin_logo import get_olorin_header, OLORIN_FOOTER
>>>>>>> 001-modify-analyzer-method


class HeaderGenerator:
    """Generates HTML headers for reports."""

    def generate_header(self, summary: InvestigationSummary, title: str, timestamp: str) -> str:
<<<<<<< HEAD
        """Generate the enhanced report header."""
        status_class = StatusFormatter.get_status_class(summary.status)

        return f"""
        <header class="fade-in">
            <h1>🔍 {title}</h1>
            <div class="subtitle">Generated: {timestamp}</div>

            <div class="header-grid">
                <div class="investigation-badge">
                    <strong>Mode:</strong> {summary.mode or "Unknown"}
                </div>
                <div class="investigation-badge">
                    <strong>Investigation ID:</strong> {summary.investigation_id or "Unknown"}
                </div>
                <div class="investigation-badge status-{status_class}">
                    <strong>Status:</strong> {summary.status or "Unknown"}
                </div>
            </div>

            <div style="margin-top: 20px;">
                <div class="investigation-badge">
                    <strong>Scenario:</strong> {summary.scenario or "Unknown"}
                </div>
            </div>
        </header>
=======
        """Generate the enhanced report header with Olorin logo."""
        status_class = StatusFormatter.get_status_class(summary.status)
        
        # Use Olorin logo header
        logo_header = get_olorin_header(title)
        
        return f"""
        {logo_header}
        <div class="header-grid" style="margin-top: 20px;">
            <div class="investigation-badge">
                <strong>Mode:</strong> {summary.mode or "Unknown"}
            </div>
            <div class="investigation-badge">
                <strong>Investigation ID:</strong> {summary.investigation_id or "Unknown"}
            </div>
            <div class="investigation-badge status-{status_class}">
                <strong>Status:</strong> {summary.status or "Unknown"}
            </div>
        </div>

        <div style="margin-top: 20px;">
            <div class="investigation-badge">
                <strong>Scenario:</strong> {summary.scenario or "Unknown"}
            </div>
        </div>
>>>>>>> 001-modify-analyzer-method
        """


class SummaryGenerator:
    """Generates executive summary sections."""

    def generate_summary(self, summary: InvestigationSummary) -> str:
        """Generate executive summary with key metrics."""
        duration_str = DateTimeFormatter.format_duration(summary.duration_seconds)
        risk_class = DataFormatter.get_risk_class(summary.final_risk_score)

        return f"""
        <section class="section fade-in">
            <h2>📊 Executive Summary</h2>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Interactions</div>
                    <div class="metric-value">{DataFormatter.format_number(summary.total_interactions)}</div>
                    <div class="metric-description">All logged activities</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Investigation Duration</div>
                    <div class="metric-value">{duration_str}</div>
                    <div class="metric-description">Total execution time</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">LLM Calls</div>
                    <div class="metric-value">{DataFormatter.format_number(summary.llm_calls)}</div>
                    <div class="metric-description">AI model invocations</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Tool Executions</div>
                    <div class="metric-value">{DataFormatter.format_number(summary.tool_executions)}</div>
                    <div class="metric-description">Tools and functions used</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Total Tokens</div>
                    <div class="metric-value">{DataFormatter.format_number(summary.total_tokens)}</div>
                    <div class="metric-description">LLM tokens consumed</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Final Risk Score</div>
                    <div class="metric-value risk-score-{risk_class}">
                        {DataFormatter.format_risk_score(summary.final_risk_score)}
                    </div>
                    <div class="metric-description">Calculated risk level</div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">{len(summary.agents_used)}</div>
                    <div class="stat-label">Agents Used</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{len(summary.tools_used)}</div>
                    <div class="stat-label">Unique Tools</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{DataFormatter.format_number(summary.agent_decisions)}</div>
                    <div class="stat-label">Agent Decisions</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{DataFormatter.format_number(summary.error_count)}</div>
                    <div class="stat-label">Errors</div>
                </div>
            </div>
        </section>
        """


class FooterGenerator:
    """Generates HTML footers for reports."""

    def generate_footer(self) -> str:
<<<<<<< HEAD
        """Generate report footer."""
        return """
        <footer class="footer">
            <div class="footer-logo">🚀 Olorin Fraud Investigation Platform</div>
            <p>Enhanced Investigation Report Generator</p>
            <p>Comprehensive analysis with interactive visualizations</p>
            <p style="margin-top: 15px; font-size: 0.9em;">
                Generated with Python • Powered by Chart.js & Mermaid.js
            </p>
        </footer>
        """
=======
        """Generate report footer with Olorin branding."""
        return OLORIN_FOOTER
>>>>>>> 001-modify-analyzer-method


# Placeholder component generators - minimal implementations
class TimelineGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>🧠 LLM Timeline</h2><p>Timeline visualization placeholder</p></section>'


class FlowGraphGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>🔄 Investigation Flow</h2><p>Flow graph placeholder</p></section>'


class ToolsAnalysisGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>🔧 Tools Analysis</h2><p>Tools analysis placeholder</p></section>'


class RiskDashboardGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>⚠️ Risk Dashboard</h2><p>Risk dashboard placeholder</p></section>'


class ExplanationsGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>💭 Explanations</h2><p>Explanations placeholder</p></section>'


class JourneyGenerator:
    def generate_component(self, component_data: ComponentData) -> str:
        return '<section class="section"><h2>🗺️ Journey</h2><p>Journey visualization placeholder</p></section>'


__all__ = [
    'HeaderGenerator',
    'SummaryGenerator',
    'FooterGenerator',
    'TimelineGenerator',
    'FlowGraphGenerator',
    'ToolsAnalysisGenerator',
    'RiskDashboardGenerator',
    'ExplanationsGenerator',
    'JourneyGenerator'
]