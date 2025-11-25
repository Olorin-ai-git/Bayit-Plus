#!/usr/bin/env python3
"""
Chart.js generation for Enhanced HTML Report Generator.

Provides Chart.js chart generation and configuration.
"""

import json
from typing import Any, Dict, List

from ..data_models import ComponentData, InvestigationSummary, ReportConfig
from ..utils import DateTimeFormatter


class ChartJSGenerator:
    """Generates Chart.js charts for reports."""

    def __init__(self, config: ReportConfig):
        self.config = config

    def get_chart_defaults(self) -> str:
        """Generate Chart.js default configuration."""
        return """
        // Chart.js default configuration
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.color = '#495057';
        Chart.defaults.borderColor = '#dee2e6';
        """

    def generate_all_charts(
        self, summary: InvestigationSummary, component_data: ComponentData
    ) -> str:
        """Generate all Chart.js charts."""
        charts = [
            self._generate_llm_timeline_chart(component_data.llm_interactions),
            self._generate_tools_usage_chart(component_data.tools_analysis),
            self._generate_risk_progression_chart(component_data.risk_analysis),
            self._generate_risk_categories_chart(component_data.risk_analysis),
        ]

        return "\n".join(charts)

    def _generate_llm_timeline_chart(
        self, llm_interactions: List[Dict[str, Any]]
    ) -> str:
        """Generate LLM interactions timeline chart."""
        timestamps = [
            DateTimeFormatter.format_timestamp(i.get("timestamp", ""))
            for i in llm_interactions
        ]
        tokens = [
            i.get("tokens_used", {}).get("total_tokens", 0) for i in llm_interactions
        ]

        return f"""
        // LLM Interactions Timeline Chart
        const llmCtx = document.getElementById('llmTimelineChart');
        if (llmCtx) {{
            new Chart(llmCtx.getContext('2d'), {{
                type: 'line',
                data: {{
                    labels: {json.dumps(timestamps)},
                    datasets: [{{
                        label: 'Tokens Used',
                        data: {json.dumps(tokens)},
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                            text: 'Token Usage Over Time'
                        }}
                    }}
                }}
            }});
        }}
        """

    def _generate_tools_usage_chart(self, tools_analysis: Dict[str, Any]) -> str:
        """Generate tools usage chart."""
        tool_names = list(tools_analysis.keys())[:10]  # Limit to top 10
        tool_counts = [tools_analysis[name].get("count", 0) for name in tool_names]

        return f"""
        // Tools Usage Chart
        const toolsCtx = document.getElementById('toolsUsageChart');
        if (toolsCtx) {{
            new Chart(toolsCtx.getContext('2d'), {{
                type: 'bar',
                data: {{
                    labels: {json.dumps(tool_names)},
                    datasets: [{{
                        label: 'Usage Count',
                        data: {json.dumps(tool_counts)},
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Tool Usage Distribution'
                        }}
                    }}
                }}
            }});
        }}
        """

    def _generate_risk_progression_chart(self, risk_analysis: Dict[str, Any]) -> str:
        """Generate risk progression chart."""
        risk_scores = risk_analysis.get("risk_scores", [])

        return f"""
        // Risk Progression Chart
        const riskProgressionCtx = document.getElementById('riskProgressionChart');
        if (riskProgressionCtx) {{
            new Chart(riskProgressionCtx.getContext('2d'), {{
                type: 'line',
                data: {{
                    labels: Array.from({{length: {len(risk_scores)}}}, (_, i) => `Sample ${{i+1}}`),
                    datasets: [{{
                        label: 'Risk Score',
                        data: {json.dumps(risk_scores)},
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
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
                            text: 'Risk Score Progression'
                        }}
                    }},
                    scales: {{
                        y: {{
                            min: 0,
                            max: 1
                        }}
                    }}
                }}
            }});
        }}
        """

    def _generate_risk_categories_chart(self, risk_analysis: Dict[str, Any]) -> str:
        """Generate risk categories radar chart."""
        risk_categories = risk_analysis.get("risk_categories", {})
        categories = list(risk_categories.keys())[:8]  # Limit to 8 categories
        values = [risk_categories[cat] for cat in categories]

        return f"""
        // Risk Categories Chart
        const riskCategoriesCtx = document.getElementById('riskCategoriesChart');
        if (riskCategoriesCtx) {{
            new Chart(riskCategoriesCtx.getContext('2d'), {{
                type: 'radar',
                data: {{
                    labels: {json.dumps(categories)},
                    datasets: [{{
                        label: 'Confidence Score',
                        data: {json.dumps(values)},
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)'
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Decision Confidence by Category'
                        }}
                    }},
                    scales: {{
                        r: {{
                            beginAtZero: true,
                            max: 1
                        }}
                    }}
                }}
            }});
        }}
        """
