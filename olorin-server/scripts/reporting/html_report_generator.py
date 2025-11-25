#!/usr/bin/env python3
"""
HTML Report Generator for Structured Investigation Tests

Generates comprehensive, interactive HTML reports with visualizations
for structured investigation test results.
"""

import base64
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class StructuredInvestigationHTMLReporter:
    """Generates comprehensive HTML reports for structured investigation tests."""

    def __init__(self, report_title: str = "Structured Investigation Test Report"):
        self.report_title = report_title
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def generate_html_report(
        self,
        test_results: Dict[str, Any],
        csv_metadata: Optional[Dict[str, Any]] = None,
        output_path: str = "structured_investigation_report.html",
        investigation_folder: Optional[str] = None,
    ) -> str:
        """Generate a comprehensive HTML report from test results."""

        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.report_title}</title>
    <style>
        {self._get_css_styles()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        {self._generate_header(csv_metadata, investigation_folder)}
        {self._generate_executive_summary(test_results)}
        {self._generate_investigation_files_section(investigation_folder)}
        {self._generate_agent_risk_scores_section(test_results)}
        {self._generate_chain_of_thought_section(test_results)}
        {self._generate_journey_tracking_section(test_results)}
        {self._generate_csv_data_section(csv_metadata)}
        {self._generate_test_phases_section(test_results)}
        {self._generate_investigation_details(test_results)}
        {self._generate_performance_metrics(test_results)}
        {self._generate_risk_analysis(test_results)}
        {self._generate_footer()}
    </div>
    
    <script>
        {self._get_javascript_code(test_results)}
    </script>
</body>
</html>
"""

        # Save to file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return output_path

    def _get_css_styles(self) -> str:
        """Return CSS styles for the HTML report."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .section {
            padding: 40px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .status-passed {
            background: #4caf50;
            color: white;
        }
        
        .status-failed {
            background: #f44336;
            color: white;
        }
        
        .status-warning {
            background: #ff9800;
            color: white;
        }
        
        .status-info {
            background: #2196f3;
            color: white;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background: #f5f5f5;
            font-weight: 600;
            color: #667eea;
        }
        
        tr:hover {
            background: #f9f9f9;
        }
        
        .chart-container {
            position: relative;
            height: 400px;
            margin: 30px 0;
        }
        
        .risk-score-high {
            color: #f44336;
            font-weight: bold;
        }
        
        .risk-score-medium {
            color: #ff9800;
            font-weight: bold;
        }
        
        .risk-score-low {
            color: #4caf50;
            font-weight: bold;
        }
        
        .timeline {
            margin: 30px 0;
        }
        
        .timeline-item {
            padding: 20px;
            border-left: 3px solid #667eea;
            margin-left: 20px;
            position: relative;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 25px;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #667eea;
        }
        
        .code-block {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
            margin: 15px 0;
        }
        
        .csv-info {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .footer {
            background: #f5f5f5;
            padding: 30px;
            text-align: center;
            color: #666;
        }
        
        .icon {
            width: 24px;
            height: 24px;
            vertical-align: middle;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        """

    def _generate_header(
        self,
        csv_metadata: Optional[Dict[str, Any]],
        investigation_folder: Optional[str] = None,
    ) -> str:
        """Generate the report header."""
        data_source = "CSV Transaction Data" if csv_metadata else "Synthetic Test Data"
        return f"""
        <header>
            <h1>🔍 {self.report_title}</h1>
            <div class="subtitle">Generated: {self.timestamp}</div>
            <div class="subtitle">Data Source: {data_source}</div>
        </header>
        """

    def _generate_executive_summary(self, test_results: Dict[str, Any]) -> str:
        """Generate executive summary section."""
        total_tests = len(test_results)
        passed_tests = sum(
            1 for r in test_results.values() if r.get("status") == "PASSED"
        )
        failed_tests = sum(
            1 for r in test_results.values() if r.get("status") == "FAILED"
        )
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        return f"""
        <section class="section">
            <h2>📊 Executive Summary</h2>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Tests</div>
                    <div class="metric-value">{total_tests}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Passed</div>
                    <div class="metric-value" style="color: #4caf50">{passed_tests}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Failed</div>
                    <div class="metric-value" style="color: #f44336">{failed_tests}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Pass Rate</div>
                    <div class="metric-value">{pass_rate:.1f}%</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: {pass_rate}%">
                    {pass_rate:.1f}% Tests Passed
                </div>
            </div>
        </section>
        """

    def _generate_csv_data_section(self, csv_metadata: Optional[Dict[str, Any]]) -> str:
        """Generate CSV data information section."""
        if not csv_metadata:
            return ""

        return f"""
        <section class="section">
            <h2>📁 CSV Transaction Data</h2>
            
            <div class="csv-info">
                <table>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>CSV File Path</td>
                        <td><code>{csv_metadata.get('file_path', 'N/A')}</code></td>
                    </tr>
                    <tr>
                        <td>Total Transactions Loaded</td>
                        <td>{csv_metadata.get('transaction_count', 0)}</td>
                    </tr>
                    <tr>
                        <td>Unique Users</td>
                        <td>{csv_metadata.get('unique_users', 0)}</td>
                    </tr>
                    <tr>
                        <td>Date Range</td>
                        <td>{csv_metadata.get('date_range', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td>Sample User ID</td>
                        <td><code>{csv_metadata.get('sample_user_id', 'N/A')}</code></td>
                    </tr>
                </table>
            </div>
        </section>
        """

    def _generate_test_phases_section(self, test_results: Dict[str, Any]) -> str:
        """Generate test phases results section."""
        html = """
        <section class="section">
            <h2>🧪 Test Phases</h2>
            
            <table>
                <thead>
                    <tr>
                        <th>Phase</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Risk Score</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        """

        for test_name, result in test_results.items():
            status = result.get("status", "UNKNOWN")
            status_class = (
                "passed"
                if status == "PASSED"
                else "failed" if status == "FAILED" else "warning"
            )
            duration = result.get("duration", 0)
            risk_score = result.get("final_risk_score", 0)

            risk_class = (
                "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low"
            )

            html += f"""
                <tr>
                    <td><strong>{test_name}</strong></td>
                    <td><span class="status-badge status-{status_class}">{status}</span></td>
                    <td>{duration:.2f}s</td>
                    <td><span class="risk-score-{risk_class}">{risk_score:.2f}</span></td>
                    <td>{result.get("error", "Success") if status != "PASSED" else "All checks passed"}</td>
                </tr>
            """

        html += """
                </tbody>
            </table>
        </section>
        """

        return html

    def _generate_investigation_details(self, test_results: Dict[str, Any]) -> str:
        """Generate detailed investigation results."""
        html = """
        <section class="section">
            <h2>🔎 Investigation Details</h2>
            
            <div class="timeline">
        """

        for test_name, result in test_results.items():
            if "phases" in result:
                for phase_name, phase_data in result["phases"].items():
                    html += f"""
                    <div class="timeline-item">
                        <h3>{phase_name.replace("_", " ").title()}</h3>
                        <p><strong>Risk Score:</strong> {phase_data.get('risk_score', 0):.2f}</p>
                        <p><strong>Duration:</strong> {phase_data.get('duration', 0):.2f}s</p>
                        <p><strong>Findings:</strong> {len(phase_data.get('findings', {}))} items</p>
                    </div>
                    """

        html += """
            </div>
        </section>
        """

        return html

    def _generate_investigation_files_section(
        self, investigation_folder: Optional[str]
    ) -> str:
        """Generate investigation files and logs section."""
        if not investigation_folder:
            return ""

        folder_path = Path(investigation_folder)
        if not folder_path.exists():
            return ""

        # List all files in the investigation folder
        files = []
        try:
            for file_path in folder_path.rglob("*"):
                if file_path.is_file():
                    files.append(
                        {
                            "name": file_path.name,
                            "path": str(file_path.relative_to(folder_path)),
                            "size": file_path.stat().st_size,
                            "type": file_path.suffix or "No extension",
                        }
                    )
        except Exception:
            files = []

        if not files:
            return ""

        html = """
        <section class="section">
            <h2>📁 Investigation Files & Logs</h2>
            <div class="csv-info">
                <p><strong>Investigation Folder:</strong> <code>{folder}</code></p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Path</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
        """.format(
            folder=investigation_folder
        )

        for file_info in sorted(files, key=lambda x: x["name"]):
            size_kb = file_info["size"] / 1024
            size_display = (
                f"{size_kb:.1f} KB" if size_kb > 1 else f"{file_info['size']} bytes"
            )

            html += f"""
                <tr>
                    <td><strong>{file_info['name']}</strong></td>
                    <td><span class="status-badge status-info">{file_info['type']}</span></td>
                    <td><code>{file_info['path']}</code></td>
                    <td>{size_display}</td>
                </tr>
            """

        html += """
                </tbody>
            </table>
        </section>
        """

        return html

    def _generate_agent_risk_scores_section(self, test_results: Dict[str, Any]) -> str:
        """Generate detailed agent risk scores section with highlighting."""
        html = """
        <section class="section">
            <h2>⚠️ Agent Risk Score Analysis</h2>
            
            <div class="metrics-grid">
        """

        # Extract agent risk scores from phases
        agent_scores = {}
        overall_scores = []

        for test_name, result in test_results.items():
            phases = result.get("phases", {})
            final_risk = result.get("final_risk_score", 0)
            overall_scores.append(final_risk)

            for phase_name, phase_data in phases.items():
                agent_name = phase_name.replace("_agent", "").replace("_", " ").title()
                risk_score = phase_data.get("risk_score", 0)

                if agent_name not in agent_scores:
                    agent_scores[agent_name] = []
                agent_scores[agent_name].append(risk_score)

        # Calculate average scores for each agent
        for agent_name, scores in agent_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            risk_class = (
                "high" if avg_score > 0.7 else "medium" if avg_score > 0.3 else "low"
            )

            html += f"""
                <div class="metric-card">
                    <div class="metric-label">{agent_name} Agent</div>
                    <div class="metric-value risk-score-{risk_class}">{avg_score:.3f}</div>
                    <div class="metric-label">{len(scores)} analysis(es)</div>
                </div>
            """

        # Overall risk score
        if overall_scores:
            avg_overall = sum(overall_scores) / len(overall_scores)
            risk_class = (
                "high"
                if avg_overall > 0.7
                else "medium" if avg_overall > 0.3 else "low"
            )

            html += f"""
                <div class="metric-card" style="border: 3px solid #667eea;">
                    <div class="metric-label">🎯 OVERALL RISK SCORE</div>
                    <div class="metric-value risk-score-{risk_class}" style="font-size: 3em;">{avg_overall:.3f}</div>
                    <div class="metric-label">Averaged across {len(overall_scores)} investigations</div>
                </div>
            """

        html += """
            </div>
        </section>
        """

        return html

    def _generate_chain_of_thought_section(self, test_results: Dict[str, Any]) -> str:
        """Generate chain of thought analysis section."""
        html = """
        <section class="section">
            <h2>🧠 Chain of Thought Analysis</h2>
        """

        # Check if we have chain of thought data
        has_cot_data = False
        for test_name, result in test_results.items():
            logging_data = result.get("logging_data", {})
            if logging_data and any(
                "chain" in str(key).lower() or "thought" in str(key).lower()
                for key in logging_data.keys()
            ):
                has_cot_data = True
                break

        if not has_cot_data:
            html += """
                <div class="csv-info">
                    <p>⚠️ <strong>Chain of Thought data not available.</strong></p>
                    <p>This may indicate that the ChainOfThoughtLogger was not properly initialized or saved to the investigation folder.</p>
                    <p>Future investigations should include reasoning steps, tool selection logic, and confidence assessments.</p>
                </div>
            """
        else:
            html += """
                <div class="timeline">
            """

            for test_name, result in test_results.items():
                logging_data = result.get("logging_data", {})

                for key, data in logging_data.items():
                    if "chain" in str(key).lower() or "thought" in str(key).lower():
                        html += f"""
                        <div class="timeline-item">
                            <h3>🎯 {test_name} - Chain of Thought</h3>
                            <div class="code-block">
                                {json.dumps(data, indent=2) if isinstance(data, dict) else str(data)}
                            </div>
                        </div>
                        """

            html += """
                </div>
            """

        html += """
        </section>
        """

        return html

    def _generate_journey_tracking_section(self, test_results: Dict[str, Any]) -> str:
        """Generate journey tracking section."""
        html = """
        <section class="section">
            <h2>🗺️ Investigation Journey Tracking</h2>
        """

        # Check if we have journey data
        has_journey_data = any(
            result.get("journey_data") for result in test_results.values()
        )

        if not has_journey_data:
            html += """
                <div class="csv-info">
                    <p>ℹ️ <strong>Journey tracking data available in investigation folder.</strong></p>
                    <p>Check the investigation folder for detailed journey tracking files with execution flow, state transitions, and agent coordination.</p>
                </div>
            """
        else:
            html += """
                <div class="timeline">
            """

            for test_name, result in test_results.items():
                journey_data = result.get("journey_data", {})
                if journey_data:
                    investigation_id = result.get("investigation_id", "Unknown")
                    start_time = result.get("start_time", "Unknown")

                    html += f"""
                    <div class="timeline-item">
                        <h3>🎯 {test_name} Journey</h3>
                        <p><strong>Investigation ID:</strong> <code>{investigation_id}</code></p>
                        <p><strong>Started:</strong> {start_time}</p>
                        <div class="code-block">
                            {json.dumps(journey_data, indent=2, default=str)[:1000]}
                            {"..." if len(str(journey_data)) > 1000 else ""}
                        </div>
                    </div>
                    """

            html += """
                </div>
            """

        html += """
        </section>
        """

        return html

    def _generate_performance_metrics(self, test_results: Dict[str, Any]) -> str:
        """Generate performance metrics section with charts using real data."""

        # Extract real performance data
        durations = [result.get("duration", 0) for result in test_results.values()]
        total_duration = sum(durations)
        avg_duration = total_duration / len(durations) if durations else 0
        agent_counts = []

        for result in test_results.values():
            phases = result.get("phases", {})
            agent_counts.append(len(phases))

        total_agents = sum(agent_counts)

        return f"""
        <section class="section">
            <h2>⚡ Performance Metrics</h2>
            
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Avg Test Duration</div>
                    <div class="metric-value">{avg_duration:.2f}s</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Total Duration</div>
                    <div class="metric-value">{total_duration:.2f}s</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Total Agents Invoked</div>
                    <div class="metric-value">{total_agents}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Investigations Run</div>
                    <div class="metric-value">{len(test_results)}</div>
                </div>
            </div>
        </section>
        """

    def _generate_risk_analysis(self, test_results: Dict[str, Any]) -> str:
        """Generate risk analysis section using real data."""

        html = """
        <section class="section">
            <h2>⚠️ Detailed Risk Analysis</h2>
            
            <div class="chart-container">
                <canvas id="riskChart"></canvas>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Investigation</th>
                        <th>Risk Score</th>
                        <th>Confidence</th>
                        <th>Agent Breakdown</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        """

        for test_name, result in test_results.items():
            risk_score = result.get("final_risk_score", 0)
            confidence = result.get("confidence", 0)
            status = result.get("status", "UNKNOWN")
            phases = result.get("phases", {})

            risk_class = (
                "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low"
            )
            status_class = "passed" if status == "PASSED" else "failed"

            # Build agent breakdown
            agent_breakdown = []
            for phase_name, phase_data in phases.items():
                agent_name = phase_name.replace("_agent", "").replace("_", " ").title()
                phase_risk = phase_data.get("risk_score", 0)
                agent_breakdown.append(f"{agent_name}: {phase_risk:.2f}")

            breakdown_text = (
                ", ".join(agent_breakdown) if agent_breakdown else "No agent data"
            )

            html += f"""
                <tr>
                    <td><strong>{test_name}</strong></td>
                    <td><span class="risk-score-{risk_class}">{risk_score:.3f}</span></td>
                    <td>{confidence:.1%}</td>
                    <td style="font-size: 0.9em;">{breakdown_text}</td>
                    <td><span class="status-badge status-{status_class}">{status}</span></td>
                </tr>
            """

        html += """
                </tbody>
            </table>
            
            <div class="csv-info" style="margin-top: 20px;">
                <h3>🎯 Risk Score Legend</h3>
                <p><span class="risk-score-high">High Risk (>0.7):</span> Immediate attention required</p>
                <p><span class="risk-score-medium">Medium Risk (0.3-0.7):</span> Monitor closely</p>
                <p><span class="risk-score-low">Low Risk (<0.3):</span> Normal activity</p>
            </div>
        </section>
        """

        return html

    def _generate_footer(self) -> str:
        """Generate report footer."""
        return """
        <footer class="footer">
            <p>🚀 Olorin Fraud Investigation Platform</p>
            <p>Structured Investigation Test Report</p>
            <p>Generated with Python {python_version}</p>
        </footer>
        """.format(
            python_version="3.11"
        )

    def _get_javascript_code(self, test_results: Dict[str, Any]) -> str:
        """Generate JavaScript code for interactive charts using real data."""

        # Extract real data for charts
        durations = []
        risk_scores = []
        test_names = []
        agent_scores = {}

        for test_name, result in test_results.items():
            test_names.append(
                test_name[:10] + "..." if len(test_name) > 10 else test_name
            )
            durations.append(result.get("duration", 0))
            risk_scores.append(result.get("final_risk_score", 0))

            phases = result.get("phases", {})
            for phase_name, phase_data in phases.items():
                agent_name = phase_name.replace("_agent", "").replace("_", " ").title()
                if agent_name not in agent_scores:
                    agent_scores[agent_name] = []
                agent_scores[agent_name].append(phase_data.get("risk_score", 0))

        # Calculate average agent scores for radar chart
        agent_names = list(agent_scores.keys())[:5]  # Limit to 5 agents for readability
        avg_agent_scores = [
            (
                sum(agent_scores[name]) / len(agent_scores[name])
                if agent_scores[name]
                else 0
            )
            for name in agent_names
        ]

        return f"""
        // Performance Chart
        const perfCtx = document.getElementById('performanceChart');
        if (perfCtx) {{
            new Chart(perfCtx.getContext('2d'), {{
                type: 'bar',
                data: {{
                    labels: {test_names},
                    datasets: [{{
                        label: 'Test Duration (s)',
                        data: {durations},
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: '#667eea',
                        borderWidth: 2
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{
                            display: true,
                            position: 'top'
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            title: {{
                                display: true,
                                text: 'Duration (seconds)'
                            }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Risk Chart
        const riskCtx = document.getElementById('riskChart');
        if (riskCtx && {agent_names}.length > 0) {{
            new Chart(riskCtx.getContext('2d'), {{
                type: 'radar',
                data: {{
                    labels: {agent_names},
                    datasets: [{{
                        label: 'Average Risk Score',
                        data: {avg_agent_scores},
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                        pointBackgroundColor: '#f44336',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {{
                        r: {{
                            beginAtZero: true,
                            max: 1,
                            ticks: {{
                                stepSize: 0.2
                            }}
                        }}
                    }}
                }}
            }});
        }} else if (riskCtx) {{
            // Show message if no agent data available
            riskCtx.getContext('2d').fillStyle = '#666';
            riskCtx.getContext('2d').font = '16px Arial';
            riskCtx.getContext('2d').fillText('No agent risk data available', 50, 200);
        }}
        """
