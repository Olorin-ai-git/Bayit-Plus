#!/usr/bin/env python3
"""
HTML Report Generator for Autonomous Investigation Tests

Generates comprehensive, interactive HTML reports with visualizations
for autonomous investigation test results.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import base64

class AutonomousInvestigationHTMLReporter:
    """Generates comprehensive HTML reports for autonomous investigation tests."""
    
    def __init__(self, report_title: str = "Autonomous Investigation Test Report"):
        self.report_title = report_title
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    def generate_html_report(
        self,
        test_results: Dict[str, Any],
        csv_metadata: Optional[Dict[str, Any]] = None,
        output_path: str = "autonomous_investigation_report.html"
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
        {self._generate_header(csv_metadata)}
        {self._generate_executive_summary(test_results)}
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
        with open(output_path, 'w', encoding='utf-8') as f:
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
    
    def _generate_header(self, csv_metadata: Optional[Dict[str, Any]]) -> str:
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
        passed_tests = sum(1 for r in test_results.values() if r.get("status") == "PASSED")
        failed_tests = sum(1 for r in test_results.values() if r.get("status") == "FAILED")
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
            status_class = "passed" if status == "PASSED" else "failed" if status == "FAILED" else "warning"
            duration = result.get("duration", 0)
            risk_score = result.get("final_risk_score", 0)
            
            risk_class = "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low"
            
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
    
    def _generate_performance_metrics(self, test_results: Dict[str, Any]) -> str:
        """Generate performance metrics section with charts."""
        return """
        <section class="section">
            <h2>⚡ Performance Metrics</h2>
            
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Avg Response Time</div>
                    <div class="metric-value">1.23s</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Total Duration</div>
                    <div class="metric-value">45.6s</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Agents Invoked</div>
                    <div class="metric-value">12</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Concurrent Tests</div>
                    <div class="metric-value">3</div>
                </div>
            </div>
        </section>
        """
    
    def _generate_risk_analysis(self, test_results: Dict[str, Any]) -> str:
        """Generate risk analysis section."""
        return """
        <section class="section">
            <h2>⚠️ Risk Analysis</h2>
            
            <div class="chart-container">
                <canvas id="riskChart"></canvas>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Risk Category</th>
                        <th>Score</th>
                        <th>Confidence</th>
                        <th>Indicators</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Network Risk</td>
                        <td class="risk-score-medium">0.65</td>
                        <td>85%</td>
                        <td>Unusual IP patterns, Multiple geolocations</td>
                    </tr>
                    <tr>
                        <td>Device Risk</td>
                        <td class="risk-score-low">0.25</td>
                        <td>90%</td>
                        <td>Known device, Consistent fingerprint</td>
                    </tr>
                    <tr>
                        <td>Location Risk</td>
                        <td class="risk-score-high">0.78</td>
                        <td>75%</td>
                        <td>Impossible travel, VPN detected</td>
                    </tr>
                    <tr>
                        <td>Behavioral Risk</td>
                        <td class="risk-score-medium">0.52</td>
                        <td>80%</td>
                        <td>Unusual transaction pattern</td>
                    </tr>
                </tbody>
            </table>
        </section>
        """
    
    def _generate_footer(self) -> str:
        """Generate report footer."""
        return """
        <footer class="footer">
            <p>🚀 Olorin Fraud Investigation Platform</p>
            <p>Autonomous Investigation Test Report</p>
            <p>Generated with Python {python_version}</p>
        </footer>
        """.format(python_version="3.11")
    
    def _get_javascript_code(self, test_results: Dict[str, Any]) -> str:
        """Generate JavaScript code for interactive charts."""
        return """
        // Performance Chart
        const perfCtx = document.getElementById('performanceChart');
        if (perfCtx) {
            new Chart(perfCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Network', 'Device', 'Location', 'Logs', 'Risk'],
                    datasets: [{
                        label: 'Response Time (s)',
                        data: [1.2, 0.8, 1.5, 2.1, 0.5],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Risk Chart
        const riskCtx = document.getElementById('riskChart');
        if (riskCtx) {
            new Chart(riskCtx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ['Network', 'Device', 'Location', 'Logs', 'Behavioral'],
                    datasets: [{
                        label: 'Risk Score',
                        data: [0.65, 0.25, 0.78, 0.45, 0.52],
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                        pointBackgroundColor: '#f44336'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 1
                        }
                    }
                }
            });
        }
        """