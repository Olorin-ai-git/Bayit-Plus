#!/usr/bin/env python3
"""
Tools & Agents Analysis Component

Generates interactive visualization showing tool usage patterns, agent performance,
execution success rates, and performance metrics analysis.

Features:
- Interactive Chart.js bar and pie charts for tool usage
- Agent performance breakdown with success rates
- Execution time analysis and performance metrics
- Tool popularity and reliability scoring
- Responsive design with mobile optimization
- Error tracking and failure analysis
"""

import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base_component import BaseVisualizationComponent


class ToolsAnalysisComponent(BaseVisualizationComponent):
    """
    Interactive tools and agents analysis component.

    Displays comprehensive analysis of tool usage, agent performance,
    and execution patterns with interactive charts and metrics.
    """

    @property
    def component_name(self) -> str:
        return "tools_analysis"

    @property
    def component_title(self) -> str:
        return "Tools & Agents Analysis"

    @property
    def component_description(self) -> str:
        return "Interactive analysis of tool usage patterns, agent performance, and execution metrics"

    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate tools and agents data.

        Expected data structure:
        {
            'tool_executions': [
                {
                    'timestamp': str,
                    'tool_name': str,
                    'agent_name': str,
                    'execution_id': str,
                    'input_parameters': dict,
                    'output_data': dict,
                    'execution_time_ms': int,
                    'success': bool,
                    'error_message': str | None
                }
            ],
            'agent_decisions': [...]  # Optional
        }
        """
        if not isinstance(data, dict):
            self._add_error("Data must be a dictionary")
            return False

        tool_executions = data.get("tool_executions", [])
        if not isinstance(tool_executions, list):
            self._add_error("tool_executions must be a list")
            return False

        if not tool_executions:
            self._add_warning("No tool executions found")
            return True

        # Validate sample executions
        for i, execution in enumerate(tool_executions[:3]):
            if not isinstance(execution, dict):
                self._add_error(f"Tool execution {i} must be a dictionary")
                return False

            required_fields = ["tool_name", "agent_name"]
            for field in required_fields:
                if field not in execution:
                    self._add_warning(f"Tool execution {i} missing field: {field}")

        return True

    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process tools and agents data for visualization.
        """
        tool_executions = data.get("tool_executions", [])
        agent_decisions = data.get("agent_decisions", [])

        if not tool_executions:
            return {}

        # Process tool statistics
        tool_stats = defaultdict(
            lambda: {
                "count": 0,
                "success_count": 0,
                "total_execution_time": 0,
                "execution_times": [],
                "agents_used": set(),
                "errors": [],
            }
        )

        # Process agent statistics
        agent_stats = defaultdict(
            lambda: {
                "tool_usage_count": 0,
                "unique_tools": set(),
                "success_count": 0,
                "total_execution_time": 0,
                "execution_times": [],
                "decisions_count": 0,
            }
        )

        # Process executions
        for execution in tool_executions:
            tool_name = execution.get("tool_name", "Unknown")
            agent_name = execution.get("agent_name", "Unknown")
            success = execution.get("success", False)
            execution_time = execution.get("execution_time_ms", 0)
            error_message = execution.get("error_message")

            # Update tool stats
            tool_stats[tool_name]["count"] += 1
            if success:
                tool_stats[tool_name]["success_count"] += 1
            if execution_time > 0:
                tool_stats[tool_name]["total_execution_time"] += execution_time
                tool_stats[tool_name]["execution_times"].append(execution_time)
            tool_stats[tool_name]["agents_used"].add(agent_name)
            if error_message:
                tool_stats[tool_name]["errors"].append(error_message)

            # Update agent stats
            agent_stats[agent_name]["tool_usage_count"] += 1
            agent_stats[agent_name]["unique_tools"].add(tool_name)
            if success:
                agent_stats[agent_name]["success_count"] += 1
            if execution_time > 0:
                agent_stats[agent_name]["total_execution_time"] += execution_time
                agent_stats[agent_name]["execution_times"].append(execution_time)

        # Add agent decisions to agent stats
        for decision in agent_decisions:
            agent_name = decision.get("agent_name", "Unknown")
            agent_stats[agent_name]["decisions_count"] += 1

        # Calculate derived metrics for tools
        processed_tools = []
        for tool_name, stats in tool_stats.items():
            success_rate = (
                (stats["success_count"] / stats["count"]) * 100
                if stats["count"] > 0
                else 0
            )
            avg_execution_time = (
                statistics.mean(stats["execution_times"])
                if stats["execution_times"]
                else 0
            )
            reliability_score = self._calculate_reliability_score(
                success_rate, avg_execution_time, len(stats["errors"])
            )

            processed_tools.append(
                {
                    "name": tool_name,
                    "usage_count": stats["count"],
                    "success_count": stats["success_count"],
                    "failure_count": stats["count"] - stats["success_count"],
                    "success_rate": round(success_rate, 1),
                    "avg_execution_time_ms": round(avg_execution_time, 1),
                    "total_execution_time_ms": stats["total_execution_time"],
                    "agents_using_count": len(stats["agents_used"]),
                    "agents_using": list(stats["agents_used"]),
                    "error_count": len(stats["errors"]),
                    "reliability_score": reliability_score,
                    "most_common_errors": self._get_most_common_errors(stats["errors"]),
                }
            )

        # Calculate derived metrics for agents
        processed_agents = []
        for agent_name, stats in agent_stats.items():
            success_rate = (
                (stats["success_count"] / stats["tool_usage_count"]) * 100
                if stats["tool_usage_count"] > 0
                else 0
            )
            avg_execution_time = (
                statistics.mean(stats["execution_times"])
                if stats["execution_times"]
                else 0
            )
            efficiency_score = self._calculate_efficiency_score(
                success_rate, avg_execution_time, len(stats["unique_tools"])
            )

            processed_agents.append(
                {
                    "name": agent_name,
                    "tool_usage_count": stats["tool_usage_count"],
                    "unique_tools_count": len(stats["unique_tools"]),
                    "unique_tools": list(stats["unique_tools"]),
                    "success_count": stats["success_count"],
                    "success_rate": round(success_rate, 1),
                    "avg_execution_time_ms": round(avg_execution_time, 1),
                    "total_execution_time_ms": stats["total_execution_time"],
                    "decisions_count": stats["decisions_count"],
                    "efficiency_score": efficiency_score,
                }
            )

        # Sort by usage/performance
        processed_tools.sort(key=lambda x: x["usage_count"], reverse=True)
        processed_agents.sort(key=lambda x: x["tool_usage_count"], reverse=True)

        # Calculate overall metrics
        total_executions = len(tool_executions)
        total_successful = sum(1 for ex in tool_executions if ex.get("success", False))
        overall_success_rate = (
            (total_successful / total_executions) * 100 if total_executions > 0 else 0
        )

        execution_times = [
            ex.get("execution_time_ms", 0)
            for ex in tool_executions
            if ex.get("execution_time_ms", 0) > 0
        ]
        avg_execution_time = statistics.mean(execution_times) if execution_times else 0

        # Performance categorization
        performance_categories = self._categorize_performance(
            processed_tools, processed_agents
        )

        return {
            "processed_tools": processed_tools,
            "processed_agents": processed_agents,
            "performance_categories": performance_categories,
            "metrics": {
                "total_executions": total_executions,
                "total_successful": total_successful,
                "total_failed": total_executions - total_successful,
                "overall_success_rate": round(overall_success_rate, 1),
                "avg_execution_time_ms": round(avg_execution_time, 1),
                "unique_tools": len(processed_tools),
                "unique_agents": len(processed_agents),
                "most_used_tool": (
                    processed_tools[0]["name"] if processed_tools else "None"
                ),
                "most_active_agent": (
                    processed_agents[0]["name"] if processed_agents else "None"
                ),
            },
        }

    def _calculate_reliability_score(
        self, success_rate: float, avg_execution_time: float, error_count: int
    ) -> float:
        """Calculate reliability score for tools (0-100)"""
        # Base score from success rate
        score = success_rate

        # Penalize slow execution (over 5 seconds)
        if avg_execution_time > 5000:
            score -= min(20, (avg_execution_time - 5000) / 1000)

        # Penalize high error count
        if error_count > 0:
            score -= min(15, error_count * 2)

        return max(0, min(100, round(score, 1)))

    def _calculate_efficiency_score(
        self, success_rate: float, avg_execution_time: float, unique_tools: int
    ) -> float:
        """Calculate efficiency score for agents (0-100)"""
        # Base score from success rate
        score = success_rate

        # Bonus for tool diversity (up to 10 points)
        score += min(10, unique_tools * 2)

        # Penalize slow average execution
        if avg_execution_time > 3000:
            score -= min(15, (avg_execution_time - 3000) / 1000)

        return max(0, min(100, round(score, 1)))

    def _get_most_common_errors(self, errors: List[str]) -> List[Dict[str, Any]]:
        """Get most common error patterns"""
        if not errors:
            return []

        error_counter = Counter(errors)
        return [
            {"error": error, "count": count}
            for error, count in error_counter.most_common(3)
        ]

    def _categorize_performance(
        self, tools: List[Dict], agents: List[Dict]
    ) -> Dict[str, Any]:
        """Categorize tools and agents by performance"""
        categories = {
            "high_performance_tools": [],
            "problematic_tools": [],
            "efficient_agents": [],
            "struggling_agents": [],
        }

        # Categorize tools
        for tool in tools:
            if tool["reliability_score"] >= 85 and tool["success_rate"] >= 90:
                categories["high_performance_tools"].append(tool["name"])
            elif tool["reliability_score"] < 50 or tool["success_rate"] < 70:
                categories["problematic_tools"].append(tool["name"])

        # Categorize agents
        for agent in agents:
            if agent["efficiency_score"] >= 80 and agent["success_rate"] >= 85:
                categories["efficient_agents"].append(agent["name"])
            elif agent["efficiency_score"] < 60 or agent["success_rate"] < 70:
                categories["struggling_agents"].append(agent["name"])

        return categories

    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML for tools analysis component.
        """
        metrics = processed_data.get("metrics", {})
        processed_tools = processed_data.get("processed_tools", [])
        processed_agents = processed_data.get("processed_agents", [])
        performance_categories = processed_data.get("performance_categories", {})

        # Generate statistics section
        stats_html = ""
        stats_items = [
            ("Total Executions", metrics.get("total_executions", 0)),
            ("Success Rate", f"{metrics.get('overall_success_rate', 0)}%"),
            ("Unique Tools", metrics.get("unique_tools", 0)),
            ("Unique Agents", metrics.get("unique_agents", 0)),
            ("Avg Execution Time", f"{metrics.get('avg_execution_time_ms', 0):.0f}ms"),
            ("Failed Executions", metrics.get("total_failed", 0)),
        ]

        for label, value in stats_items:
            stats_html += f"""
                <div class="viz-stat-item-{self.component_id}">
                    <div class="viz-stat-value-{self.component_id}">{value}</div>
                    <div class="viz-stat-label-{self.component_id}">{label}</div>
                </div>
            """

        # Generate top tools table
        tools_table_html = ""
        for tool in processed_tools[:10]:  # Top 10 tools
            reliability_class = self._get_performance_class(tool["reliability_score"])
            success_class = self._get_performance_class(tool["success_rate"])

            tools_table_html += f"""
                <tr class="tool-row-{self.component_id}" data-tool="{tool['name']}">
                    <td><strong>{tool['name']}</strong></td>
                    <td>{tool['usage_count']}</td>
                    <td><span class="score-badge-{self.component_id} {success_class}-{self.component_id}">{tool['success_rate']}%</span></td>
                    <td>{tool['avg_execution_time_ms']:.0f}ms</td>
                    <td>{tool['agents_using_count']}</td>
                    <td><span class="score-badge-{self.component_id} {reliability_class}-{self.component_id}">{tool['reliability_score']}</span></td>
                </tr>
            """

        # Generate agents table
        agents_table_html = ""
        for agent in processed_agents[:8]:  # Top 8 agents
            efficiency_class = self._get_performance_class(agent["efficiency_score"])
            success_class = self._get_performance_class(agent["success_rate"])

            agents_table_html += f"""
                <tr class="agent-row-{self.component_id}" data-agent="{agent['name']}">
                    <td><strong>{agent['name']}</strong></td>
                    <td>{agent['tool_usage_count']}</td>
                    <td>{agent['unique_tools_count']}</td>
                    <td><span class="score-badge-{self.component_id} {success_class}-{self.component_id}">{agent['success_rate']}%</span></td>
                    <td>{agent['avg_execution_time_ms']:.0f}ms</td>
                    <td><span class="score-badge-{self.component_id} {efficiency_class}-{self.component_id}">{agent['efficiency_score']}</span></td>
                </tr>
            """

        # Generate performance insights
        insights_html = ""
        insights = [
            (
                "High Performance Tools",
                performance_categories.get("high_performance_tools", []),
                "success",
            ),
            (
                "Problematic Tools",
                performance_categories.get("problematic_tools", []),
                "danger",
            ),
            (
                "Efficient Agents",
                performance_categories.get("efficient_agents", []),
                "success",
            ),
            (
                "Struggling Agents",
                performance_categories.get("struggling_agents", []),
                "warning",
            ),
        ]

        for title, items, status_class in insights:
            items_display = ", ".join(items[:5]) if items else "None"
            if len(items) > 5:
                items_display += f" (+{len(items) - 5} more)"

            insights_html += f"""
                <div class="insight-item-{self.component_id}">
                    <div class="insight-title-{self.component_id}">{title}</div>
                    <div class="insight-content-{self.component_id} {status_class}-{self.component_id}">{items_display}</div>
                </div>
            """

        return f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                🔧 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-stats-grid-{self.component_id}">
                    {stats_html}
                </div>
                
                <div class="charts-grid-{self.component_id}">
                    <div class="viz-chart-container-{self.component_id} chart-small">
                        <canvas id="toolsUsageChart_{self.component_id}"></canvas>
                    </div>
                    <div class="viz-chart-container-{self.component_id} chart-small">
                        <canvas id="agentPerformanceChart_{self.component_id}"></canvas>
                    </div>
                </div>
                
                <div class="insights-section-{self.component_id}">
                    <h4>Performance Insights</h4>
                    <div class="insights-grid-{self.component_id}">
                        {insights_html}
                    </div>
                </div>
                
                <div class="tables-grid-{self.component_id}">
                    <div class="table-section-{self.component_id}">
                        <h4>Tool Performance</h4>
                        <div class="table-container-{self.component_id}">
                            <table class="performance-table-{self.component_id}">
                                <thead>
                                    <tr>
                                        <th>Tool Name</th>
                                        <th>Usage</th>
                                        <th>Success Rate</th>
                                        <th>Avg Time</th>
                                        <th>Agents</th>
                                        <th>Reliability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tools_table_html}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="table-section-{self.component_id}">
                        <h4>Agent Performance</h4>
                        <div class="table-container-{self.component_id}">
                            <table class="performance-table-{self.component_id}">
                                <thead>
                                    <tr>
                                        <th>Agent Name</th>
                                        <th>Tool Usage</th>
                                        <th>Unique Tools</th>
                                        <th>Success Rate</th>
                                        <th>Avg Time</th>
                                        <th>Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents_table_html}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        """

    def _get_performance_class(self, score: float) -> str:
        """Get CSS class based on performance score"""
        if score >= 80:
            return "high"
        elif score >= 60:
            return "medium"
        else:
            return "low"

    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript for interactive charts.
        """
        processed_tools = processed_data.get("processed_tools", [])
        processed_agents = processed_data.get("processed_agents", [])

        # Prepare tools chart data
        top_tools = processed_tools[:8]
        tools_chart_data = {
            "labels": [tool["name"] for tool in top_tools],
            "datasets": [
                {
                    "label": "Usage Count",
                    "data": [tool["usage_count"] for tool in top_tools],
                    "backgroundColor": [
                        "#667eea",
                        "#764ba2",
                        "#f093fb",
                        "#f5576c",
                        "#4facfe",
                        "#00f2fe",
                        "#43e97b",
                        "#38f9d7",
                    ],
                    "borderColor": "rgba(102, 126, 234, 0.8)",
                    "borderWidth": 1,
                }
            ],
        }

        # Prepare agents performance chart data (radar)
        top_agents = processed_agents[:6]
        agent_performance_data = {
            "labels": [agent["name"] for agent in top_agents],
            "datasets": [
                {
                    "label": "Efficiency Score",
                    "data": [agent["efficiency_score"] for agent in top_agents],
                    "borderColor": "#667eea",
                    "backgroundColor": "rgba(102, 126, 234, 0.2)",
                    "pointBackgroundColor": "#667eea",
                    "pointBorderColor": "#fff",
                    "pointHoverBackgroundColor": "#fff",
                    "pointHoverBorderColor": "#667eea",
                }
            ],
        }

        return f"""
        // Tools & Agents Analysis Component
        (function() {{
            const toolsData = {json.dumps(processed_tools)};
            const agentsData = {json.dumps(processed_agents)};
            
            // Tools Usage Chart
            const toolsCtx = document.getElementById('toolsUsageChart_{self.component_id}');
            if (toolsCtx) {{
                new Chart(toolsCtx.getContext('2d'), {{
                    type: 'bar',
                    data: {json.dumps(tools_chart_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Tool Usage Distribution',
                                font: {{ size: 16, weight: 'bold' }}
                            }},
                            legend: {{
                                display: false
                            }},
                            tooltip: {{
                                callbacks: {{
                                    afterBody: function(context) {{
                                        const index = context[0].dataIndex;
                                        const tool = toolsData[index];
                                        if (tool) {{
                                            return [
                                                `Success Rate: ${{tool.success_rate}}%`,
                                                `Avg Execution: ${{tool.avg_execution_time_ms.toFixed(0)}}ms`,
                                                `Reliability: ${{tool.reliability_score}}`
                                            ];
                                        }}
                                        return [];
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                title: {{
                                    display: true,
                                    text: 'Usage Count'
                                }}
                            }},
                            x: {{
                                title: {{
                                    display: true,
                                    text: 'Tools'
                                }}
                            }}
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Agent Performance Chart
            const agentCtx = document.getElementById('agentPerformanceChart_{self.component_id}');
            if (agentCtx) {{
                new Chart(agentCtx.getContext('2d'), {{
                    type: 'radar',
                    data: {json.dumps(agent_performance_data)},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'Agent Efficiency Scores',
                                font: {{ size: 16, weight: 'bold' }}
                            }}
                        }},
                        scales: {{
                            r: {{
                                beginAtZero: true,
                                max: 100,
                                ticks: {{
                                    stepSize: 20
                                }}
                            }}
                        }},
                        animation: {{
                            duration: {1000 if self.config.enable_animations else 0}
                        }}
                    }}
                }});
            }}
            
            // Add click handlers for table rows
            document.querySelectorAll('.tool-row-{self.component_id}').forEach((row, index) => {{
                row.addEventListener('click', function() {{
                    const tool = toolsData[index];
                    if (tool) {{
                        console.log('Tool Details:', tool);
                        this.style.backgroundColor = '#667eea';
                        this.style.color = 'white';
                        setTimeout(() => {{
                            this.style.backgroundColor = '';
                            this.style.color = '';
                        }}, 1500);
                    }}
                }});
                row.style.cursor = 'pointer';
            }});
            
            document.querySelectorAll('.agent-row-{self.component_id}').forEach((row, index) => {{
                row.addEventListener('click', function() {{
                    const agent = agentsData[index];
                    if (agent) {{
                        console.log('Agent Details:', agent);
                        this.style.backgroundColor = '#667eea';
                        this.style.color = 'white';
                        setTimeout(() => {{
                            this.style.backgroundColor = '';
                            this.style.color = '';
                        }}, 1500);
                    }}
                }});
                row.style.cursor = 'pointer';
            }});
            
            console.log('Tools & Agents Analysis Component loaded successfully');
        }})();
        """

    def generate_css(self) -> str:
        """
        Generate CSS styles for tools analysis component.
        """
        colors = self._get_theme_colors()
        base_css = super().generate_css()

        component_css = f"""
        .charts-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }}
        
        .chart-small {{
            height: 320px;
        }}
        
        .insights-section-{self.component_id} {{
            margin: 30px 0;
        }}
        
        .insights-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: 600;
        }}
        
        .insights-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }}
        
        .insight-item-{self.component_id} {{
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid {colors['primary']};
        }}
        
        .insight-title-{self.component_id} {{
            font-weight: 600;
            color: {colors['text']};
            margin-bottom: 8px;
        }}
        
        .insight-content-{self.component_id} {{
            font-size: 0.9em;
            line-height: 1.4;
        }}
        
        .success-{self.component_id} {{ color: {colors['success']}; }}
        .warning-{self.component_id} {{ color: {colors['warning']}; }}
        .danger-{self.component_id} {{ color: {colors['danger']}; }}
        
        .tables-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }}
        
        .table-section-{self.component_id} h4 {{
            color: {colors['primary']};
            margin-bottom: 15px;
            font-size: 1.1em;
            font-weight: 600;
        }}
        
        .table-container-{self.component_id} {{
            overflow-x: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .performance-table-{self.component_id} {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            font-size: 0.9em;
        }}
        
        .performance-table-{self.component_id} th {{
            background: {colors['primary']};
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 0.85em;
            position: sticky;
            top: 0;
            z-index: 10;
        }}
        
        .performance-table-{self.component_id} td {{
            padding: 8px;
            border-bottom: 1px solid {colors['border']};
        }}
        
        .tool-row-{self.component_id}:hover, .agent-row-{self.component_id}:hover {{
            background: {colors['light']};
        }}
        
        .score-badge-{self.component_id} {{
            display: inline-block;
            padding: 3px 6px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.8em;
            color: white;
        }}
        
        .high-{self.component_id} {{ background: {colors['success']}; }}
        .medium-{self.component_id} {{ background: {colors['warning']}; }}
        .low-{self.component_id} {{ background: {colors['danger']}; }}
        
        @media (max-width: 768px) {{
            .charts-grid-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .tables-grid-{self.component_id} {{
                grid-template-columns: 1fr;
                gap: 15px;
            }}
            
            .insights-grid-{self.component_id} {{
                grid-template-columns: 1fr;
            }}
            
            .performance-table-{self.component_id} {{
                font-size: 0.8em;
            }}
        }}
        """

        return base_css + component_css
