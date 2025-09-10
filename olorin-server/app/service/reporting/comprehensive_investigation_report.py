#!/usr/bin/env python3
"""
Comprehensive Investigation HTML Report Generator

This module creates a unified HTML report that combines investigation analysis
and test results into a single comprehensive document. It processes ALL files
in the investigation folder to provide complete insights.

Features:
- Executive summary with key findings
- Investigation timeline and flow
- Agent analysis results
- Risk assessment dashboard
- Performance metrics
- Tool execution details
- Chain of thought analysis
- Evidence collection
- Geographic and behavioral insights
- Interactive visualizations

Generated after investigation completion, this report provides stakeholders
with complete visibility into the fraud detection investigation process.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
import base64
import re
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
import statistics

logger = logging.getLogger(__name__)


@dataclass
class InvestigationSummary:
    """Summary of investigation key metrics and findings."""
    investigation_id: str
    scenario: str
    entity_id: str
    entity_type: str
    final_risk_score: float
    confidence_score: float
    duration_seconds: float
    status: str
    agents_executed: List[str]
    tools_used: int
    evidence_points: int
    geographic_countries: int
    geographic_cities: int
    critical_findings: List[str]
    recommendations: List[str]


class ComprehensiveInvestigationReportGenerator:
    """
    Generates comprehensive HTML reports from investigation folders.
    
    Processes all investigation files to create a unified report containing:
    - Investigation analysis
    - Test execution results
    - Performance metrics
    - Interactive visualizations
    """
    
    def __init__(self, base_logs_dir: Optional[Path] = None):
        """Initialize the comprehensive report generator."""
        self.base_logs_dir = Path(base_logs_dir) if base_logs_dir else Path.cwd()
        self.logger = logging.getLogger(self.__class__.__name__)
        
    def generate_comprehensive_report(
        self,
        investigation_folder: Path,
        output_path: Optional[Path] = None,
        title: Optional[str] = None
    ) -> Path:
        """
        Generate comprehensive HTML report from investigation folder.
        
        Args:
            investigation_folder: Path to investigation folder
            output_path: Output path for HTML report (optional)
            title: Report title (optional)
            
        Returns:
            Path to generated HTML report
        """
        self.logger.info(f"🔄 Generating comprehensive report for: {investigation_folder}")
        
        # Set output path
        if not output_path:
            output_path = investigation_folder / "comprehensive_investigation_report.html"
        
        # Set default title
        if not title:
            title = f"Comprehensive Investigation Report - {investigation_folder.name}"
        
        try:
            # Process all investigation files
            investigation_data = self._process_investigation_folder(investigation_folder)
            
            # Generate HTML content
            html_content = self._generate_html_report(investigation_data, title)
            
            # Write to file
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
                
            self.logger.info(f"✅ Comprehensive report generated: {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate comprehensive report: {e}")
            raise
    
    def _process_investigation_folder(self, folder_path: Path) -> Dict[str, Any]:
        """Process all files in investigation folder."""
        self.logger.info(f"📁 Processing investigation folder: {folder_path}")
        
        data = {
            "folder_path": folder_path,
            "folder_name": folder_path.name,
            "metadata": {},
            "summary": None,
            "agents": {},
            "tools": {},
            "journey": {},
            "thought_processes": [],
            "activities": [],
            "performance": {},
            "validation": {},
            "test_results": {},
            "server_logs": {},
            "files_processed": 0,
            "processing_errors": []
        }
        
        # Process each file type
        for file_path in folder_path.rglob("*"):
            if file_path.is_file():
                try:
                    self._process_file(file_path, data)
                    data["files_processed"] += 1
                except Exception as e:
                    error_msg = f"Error processing {file_path.name}: {str(e)}"
                    data["processing_errors"].append(error_msg)
                    self.logger.warning(error_msg)
        
        # Generate investigation summary
        data["summary"] = self._generate_investigation_summary(data)
        
        self.logger.info(f"📊 Processed {data['files_processed']} files with {len(data['processing_errors'])} errors")
        return data
    
    def _process_file(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Process individual file based on its type."""
        filename = file_path.name.lower()
        
        if filename == "metadata.json":
            data["metadata"] = self._load_json_file(file_path)
            
        elif filename == "summary.json":
            data["summary_raw"] = self._load_json_file(file_path)
            
        elif filename.startswith("investigation_result"):
            data["agents"] = self._load_json_file(file_path)
            
        elif filename == "performance_metrics.json":
            data["performance"] = self._load_json_file(file_path)
            
        elif filename == "validation_results.json":
            data["validation"] = self._load_json_file(file_path)
            
        elif filename == "journey_tracking.json":
            data["journey"] = self._load_json_file(file_path)
            
        elif filename.startswith("thought_process_"):
            thought_data = self._load_json_file(file_path)
            if thought_data:
                data["thought_processes"].append(thought_data)
                
        elif filename == "autonomous_activities.jsonl":
            data["activities"] = self._load_jsonl_file(file_path)
            
        elif filename.startswith("unified_test_report") and filename.endswith(".json"):
            data["test_results"] = self._load_json_file(file_path)
            
        elif filename == "server_logs" or filename == "server_logs.json":
            data["server_logs"] = self._load_json_file(file_path)
            
        elif filename == "server_logs.txt" or filename.endswith("_logs.txt"):
            # Handle text-based log files
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    log_content = f.read()
                    data["server_logs"] = {"raw_logs": log_content, "log_count": len(log_content.split('\n'))}
            except Exception as e:
                self.logger.warning(f"Failed to load text log file {file_path}: {e}")
                data["server_logs"] = {}
    
    def _load_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file safely."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.warning(f"Failed to load JSON file {file_path}: {e}")
            return {}
    
    def _load_jsonl_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load JSONL file safely."""
        try:
            data = []
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        data.append(json.loads(line))
            return data
        except Exception as e:
            self.logger.warning(f"Failed to load JSONL file {file_path}: {e}")
            return []
    
    def _generate_investigation_summary(self, data: Dict[str, Any]) -> InvestigationSummary:
        """Generate investigation summary from processed data."""
        metadata = data.get("metadata", {})
        agents_data = data.get("agents", {})
        performance = data.get("performance", {})
        validation = data.get("validation", {})
        test_results = data.get("test_results", {})
        
        # Extract key metrics
        investigation_id = metadata.get("investigation_id", "unknown")
        scenario = metadata.get("scenario", "unknown")
        entity_id = metadata.get("config", {}).get("entity_id", "unknown")
        entity_type = metadata.get("config", {}).get("entity_type", "unknown")
        
        # Risk and confidence scores - get from agents_data (investigation_result.json)
        final_risk_score = agents_data.get("final_risk_score", 0.0)
        confidence_score = agents_data.get("confidence", 0.0)
        
        # Duration - check multiple sources
        duration = 0.0
        if performance:
            # Check for total_duration or calculate from agent_timings
            duration = performance.get("total_duration", 0.0)
            if duration == 0.0 and "agent_timings" in performance:
                # Calculate total duration from agent timings
                agent_timings = performance.get("agent_timings", {})
                for agent_name, timing_data in agent_timings.items():
                    if isinstance(timing_data, dict) and "duration" in timing_data:
                        duration += timing_data.get("duration", 0.0)
        
        # Status - determine from multiple sources
        status = metadata.get("status", "unknown")
        if status == "unknown" and test_results:
            # Try to get status from test results
            investigation_results = test_results.get("investigation_results", {})
            status = investigation_results.get("status", "unknown")
        if status == "unknown" and agents_executed:
            # If we have successful agents, mark as completed
            status = "completed"
        
        # Agent execution info - check multiple data sources
        agents_executed = []
        agent_results = {}
        tools_used = 0
        
        # Try to get agent results from investigation data first
        if agents_data and "agent_results" in agents_data:
            agent_results = agents_data.get("agent_results", {})
            for agent_name, result in agent_results.items():
                if result.get("status") == "success":
                    agents_executed.append(agent_name)
            
            # Count tools from agent findings (specifically risk_aggregation)
            risk_agg = agent_results.get("risk_aggregation", {})
            if risk_agg and "findings" in risk_agg:
                tools_used = risk_agg["findings"].get("tools_used", 0)
            else:
                # Fallback: count tools across all agents
                tools_used = 0
                for agent_name, agent_data in agent_results.items():
                    if isinstance(agent_data, dict) and "findings" in agent_data:
                        findings = agent_data["findings"]
                        if "tools_used" in findings:
                            tools_used += findings["tools_used"]
        
        # If no agents found, try from test_results
        elif test_results and "investigation_results" in test_results:
            investigation_results = test_results.get("investigation_results", {})
            # Check for agent execution data in test results
            if "agent_executions" in investigation_results:
                for agent_name, status in investigation_results["agent_executions"].items():
                    if status == "success":
                        agents_executed.append(agent_name)
            # Count tools from test results if available
            if "tools_used" in investigation_results:
                tools_used = investigation_results.get("tools_used", 0)
        
        # If still no results, try direct agents_data structure
        if not agents_executed and agents_data:
            # Check if agents_data itself contains agent execution info
            for key, value in agents_data.items():
                if isinstance(value, dict) and value.get("status") == "success":
                    agents_executed.append(key)
                    agent_results[key] = value
        
        # Tools and evidence
        evidence_points = len(agents_executed)  # Use number of successful agents as evidence points
        
        # Geographic info
        geographic_countries = 0
        geographic_cities = 0
        
        # Extract from location agent
        location_data = agent_results.get("location", {})
        if location_data:
            location_findings = location_data.get("findings", {})
            geographic_countries = location_findings.get("metrics", {}).get("unique_countries", 0)
            geographic_cities = location_findings.get("metrics", {}).get("unique_cities", 0)
        
        # Critical findings and recommendations
        critical_findings = []
        recommendations = []
        
        for agent_name, result in agent_results.items():
            findings = result.get("findings", {})
            if "risk_indicators" in findings:
                critical_findings.extend(findings["risk_indicators"])
            
            llm_analysis = findings.get("llm_analysis", {})
            if "recommendations" in llm_analysis:
                recommendations.append(f"{agent_name.title()}: {llm_analysis['recommendations']}")
        
        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario=scenario,
            entity_id=entity_id,
            entity_type=entity_type,
            final_risk_score=final_risk_score,
            confidence_score=confidence_score,
            duration_seconds=duration,
            status=status,
            agents_executed=agents_executed,
            tools_used=tools_used,
            evidence_points=evidence_points,
            geographic_countries=geographic_countries,
            geographic_cities=geographic_cities,
            critical_findings=critical_findings[:10],  # Top 10
            recommendations=recommendations
        )
    
    def _generate_html_report(self, data: Dict[str, Any], title: str) -> str:
        """Generate comprehensive HTML report."""
        summary = data["summary"]
        
        # Determine risk level and color
        risk_level = "HIGH" if summary.final_risk_score > 0.7 else "MEDIUM" if summary.final_risk_score > 0.4 else "LOW"
        risk_color = "#dc3545" if risk_level == "HIGH" else "#fd7e14" if risk_level == "MEDIUM" else "#28a745"
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa; 
        }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
        
        /* Header */
        .header {{ 
            background: linear-gradient(135deg, #1e3c72, #2a5298); 
            color: white; 
            padding: 30px 0; 
            margin-bottom: 30px; 
            border-radius: 10px; 
        }}
        .header h1 {{ font-size: 2.5rem; text-align: center; margin-bottom: 10px; }}
        .header p {{ text-align: center; opacity: 0.9; font-size: 1.1rem; }}
        
        /* Executive Summary */
        .executive-summary {{ 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            margin-bottom: 30px; 
        }}
        .risk-badge {{ 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            color: white; 
            font-weight: bold; 
            font-size: 0.9rem; 
            margin: 5px 0; 
            background: {risk_color}; 
        }}
        
        /* Metrics Grid */
        .metrics-grid {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }}
        .metric-card {{ 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
            text-align: center; 
        }}
        .metric-value {{ 
            font-size: 2rem; 
            font-weight: bold; 
            color: #2a5298; 
            display: block; 
        }}
        .metric-label {{ 
            color: #666; 
            font-size: 0.9rem; 
            margin-top: 5px; 
        }}
        
        /* Sections */
        .section {{ 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            overflow: hidden; 
        }}
        .section-header {{ 
            background: #f8f9fa; 
            padding: 20px; 
            border-bottom: 1px solid #dee2e6; 
        }}
        .section-header h2 {{ 
            color: #2a5298; 
            margin-bottom: 5px; 
        }}
        .section-content {{ padding: 20px; }}
        
        /* Tables */
        .data-table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
        }}
        .data-table th, .data-table td {{ 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #dee2e6; 
        }}
        .data-table th {{ 
            background: #f8f9fa; 
            font-weight: 600; 
            color: #2a5298; 
        }}
        .data-table tr:hover {{ background: #f8f9fa; }}
        
        /* Lists */
        .finding-list {{ 
            list-style: none; 
            padding: 0; 
        }}
        .finding-item {{ 
            padding: 10px; 
            margin: 5px 0; 
            background: #f8f9fa; 
            border-left: 4px solid #2a5298; 
            border-radius: 4px; 
        }}
        .critical-finding {{ border-left-color: #dc3545; }}
        
        /* Progress bars */
        .progress {{ 
            width: 100%; 
            height: 20px; 
            background: #e9ecef; 
            border-radius: 10px; 
            overflow: hidden; 
            margin: 10px 0; 
        }}
        .progress-bar {{ 
            height: 100%; 
            background: linear-gradient(90deg, #28a745, #20c997); 
            transition: width 0.3s ease; 
        }}
        
        /* Agent status */
        .agent-status {{ 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: bold; 
            color: white; 
        }}
        .status-success {{ background: #28a745; }}
        .status-partial {{ background: #fd7e14; }}
        .status-failed {{ background: #dc3545; }}
        
        /* Responsive */
        @media (max-width: 768px) {{
            .container {{ padding: 10px; }}
            .metrics-grid {{ grid-template-columns: 1fr; }}
            .header h1 {{ font-size: 2rem; }}
        }}
        
        /* Collapsible sections */
        .collapsible {{ 
            cursor: pointer; 
            user-select: none; 
        }}
        .collapsible:hover {{ background: #f0f0f0; }}
        .collapsible-content {{ 
            max-height: 0; 
            overflow: hidden; 
            transition: max-height 0.3s ease; 
        }}
        .collapsible-content.active {{ max-height: 2000px; }}
        
        .timestamp {{ 
            color: #666; 
            font-size: 0.85rem; 
            margin-top: 20px; 
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🔍 Comprehensive Investigation Report</h1>
            <p>Investigation ID: {summary.investigation_id}</p>
        </div>
        
        <!-- Executive Summary -->
        <div class="executive-summary">
            <h2>🎯 Executive Summary</h2>
            <div class="risk-badge">{risk_level} RISK - {summary.final_risk_score:.2f}</div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{summary.final_risk_score:.2f}</span>
                    <div class="metric-label">Risk Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.confidence_score:.2f}</span>
                    <div class="metric-label">Confidence</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{len(summary.agents_executed)}</span>
                    <div class="metric-label">Agents Executed</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.tools_used}</span>
                    <div class="metric-label">Tools Used</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.duration_seconds:.1f}s</span>
                    <div class="metric-label">Duration</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.geographic_countries}</span>
                    <div class="metric-label">Countries</div>
                </div>
            </div>
            
            <p><strong>Target:</strong> {summary.entity_type.replace('_', ' ').title()} - {summary.entity_id}</p>
            <p><strong>Scenario:</strong> {summary.scenario.replace('_', ' ').title()}</p>
            <p><strong>Status:</strong> {summary.status.upper()}</p>
        </div>
        
        <!-- Critical Findings -->
        <div class="section">
            <div class="section-header">
                <h2>🚨 Critical Findings</h2>
                <p>High-priority risk indicators identified during investigation</p>
            </div>
            <div class="section-content">
                <ul class="finding-list">
                    {"".join([f'<li class="finding-item critical-finding">{finding}</li>' for finding in summary.critical_findings[:5]])}
                </ul>
            </div>
        </div>
        
        <!-- Agent Analysis Results -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('agents')">
                <h2>🤖 Agent Analysis Results</h2>
                <p>Detailed analysis from domain-specific agents</p>
            </div>
            <div class="section-content collapsible-content" id="agents">
                {self._generate_agent_results_html(data)}
            </div>
        </div>
        
        <!-- Performance Metrics -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('performance')">
                <h2>⚡ Performance Metrics</h2>
                <p>Investigation execution performance and timing</p>
            </div>
            <div class="section-content collapsible-content" id="performance">
                {self._generate_performance_html(data)}
            </div>
        </div>
        
        <!-- Tool Execution Details -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('tools')">
                <h2>🔧 Tool Execution Details</h2>
                <p>External API calls and threat intelligence sources</p>
            </div>
            <div class="section-content collapsible-content" id="tools">
                {self._generate_tools_html(data)}
            </div>
        </div>
        
        <!-- Agent Thought Processes -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('thoughts')">
                <h2>🧠 Agent Thought Processes</h2>
                <p>Detailed reasoning chain and decision-making process for each domain agent</p>
            </div>
            <div class="section-content collapsible-content" id="thoughts">
                {self._generate_thought_process_html(data)}
            </div>
        </div>
        
        <!-- Server Logs -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('serverlogs')">
                <h2>📋 Server Logs</h2>
                <p>Complete server-side logging during investigation execution</p>
            </div>
            <div class="section-content collapsible-content" id="serverlogs">
                {self._generate_server_logs_html(data)}
            </div>
        </div>
        
        <!-- Recommendations -->
        <div class="section">
            <div class="section-header">
                <h2>💡 Recommendations</h2>
                <p>Suggested actions based on investigation findings</p>
            </div>
            <div class="section-content">
                <ul class="finding-list">
                    {"".join([f'<li class="finding-item">{rec}</li>' for rec in summary.recommendations[:5]])}
                </ul>
            </div>
        </div>
        
        <!-- Technical Details -->
        <div class="section">
            <div class="section-header collapsible" onclick="toggleSection('technical')">
                <h2>🔬 Technical Details</h2>
                <p>Chain of thought, validation results, and technical metadata</p>
            </div>
            <div class="section-content collapsible-content" id="technical">
                {self._generate_technical_details_html(data)}
            </div>
        </div>
        
        <div class="timestamp">
            Report generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
        </div>
    </div>
    
    <script>
        function toggleSection(sectionId) {{
            const content = document.getElementById(sectionId);
            const isActive = content.classList.contains('active');
            
            // Close all sections
            document.querySelectorAll('.collapsible-content').forEach(el => {{
                el.classList.remove('active');
            }});
            
            // Toggle current section
            if (!isActive) {{
                content.classList.add('active');
            }}
        }}
        
        // Auto-expand first section
        document.addEventListener('DOMContentLoaded', function() {{
            document.getElementById('agents').classList.add('active');
        }});
    </script>
</body>
</html>
        """
        
        return html_content
    
    def _generate_agent_results_html(self, data: Dict[str, Any]) -> str:
        """Generate agent results section HTML."""
        agents_data = data.get("agents", {}).get("agent_results", {})
        
        if not agents_data:
            return "<p>No agent results available.</p>"
        
        html = "<table class='data-table'><thead><tr><th>Agent</th><th>Status</th><th>Risk Score</th><th>Duration</th><th>Key Findings</th></tr></thead><tbody>"
        
        for agent_name, result in agents_data.items():
            status = result.get("status", "unknown")
            risk_score = result.get("risk_score", 0.0)
            duration = result.get("duration", 0.0)
            
            # Get key findings
            findings = result.get("findings", {})
            evidence = findings.get("evidence", [])
            key_finding = evidence[0] if evidence else "No findings available"
            
            status_class = f"agent-status status-{status}"
            
            html += f"""
            <tr>
                <td><strong>{agent_name.replace('_', ' ').title()}</strong></td>
                <td><span class="{status_class}">{status.upper()}</span></td>
                <td>{risk_score:.2f}</td>
                <td>{duration:.1f}s</td>
                <td>{key_finding}</td>
            </tr>
            """
        
        html += "</tbody></table>"
        return html
    
    def _generate_performance_html(self, data: Dict[str, Any]) -> str:
        """Generate performance metrics section HTML."""
        performance = data.get("performance", {})
        
        if not performance:
            return "<p>No performance data available.</p>"
        
        html = f"""
        <div class="metrics-grid">
            <div class="metric-card">
                <span class="metric-value">{performance.get('total_duration', 0):.1f}s</span>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric-card">
                <span class="metric-value">{performance.get('error_rates', {}).get('overall_success_rate', 0)*100:.1f}%</span>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <span class="metric-value">{performance.get('throughput_metrics', {}).get('average_agent_time', 0):.1f}s</span>
                <div class="metric-label">Avg Agent Time</div>
            </div>
        </div>
        """
        
        # Agent timings table
        agent_timings = performance.get("agent_timings", {})
        if agent_timings:
            html += "<h4>Agent Performance Breakdown</h4><table class='data-table'><thead><tr><th>Agent</th><th>Duration</th><th>Status</th><th>Performance</th></tr></thead><tbody>"
            
            for agent, metrics in agent_timings.items():
                duration = metrics.get("duration", 0)
                status = metrics.get("status", "unknown")
                perf_category = metrics.get("performance_category", "unknown")
                
                html += f"""
                <tr>
                    <td>{agent.replace('_', ' ').title()}</td>
                    <td>{duration:.1f}s</td>
                    <td>{status}</td>
                    <td>{perf_category}</td>
                </tr>
                """
            
            html += "</tbody></table>"
        
        return html
    
    def _generate_tools_html(self, data: Dict[str, Any]) -> str:
        """Generate tools execution section HTML."""
        agents_data = data.get("agents", {})
        agent_results = agents_data.get("agent_results", {})
        
        # Extract tool execution data from agent evidence
        tools_found = {}
        
        for agent_name, agent_data in agent_results.items():
            if isinstance(agent_data, dict) and "findings" in agent_data:
                findings = agent_data["findings"]
                if isinstance(findings, dict) and "evidence" in findings:
                    evidence = findings["evidence"]
                    if isinstance(evidence, list):
                        for evidence_item in evidence:
                            if isinstance(evidence_item, str):
                                # Look for tool execution patterns
                                if "virustotal_ip_analysis:" in evidence_item:
                                    tools_found["virustotal_ip_analysis"] = {
                                        "agent": agent_name,
                                        "purpose": "IP Reputation & Malware Scanning",
                                        "status": "Success",
                                        "result": evidence_item.split(": ", 1)[1] if ": " in evidence_item else evidence_item
                                    }
                                elif "abuseipdb" in evidence_item.lower():
                                    tools_found["abuseipdb_analysis"] = {
                                        "agent": agent_name,
                                        "purpose": "IP Abuse Database Check",
                                        "status": "Success", 
                                        "result": evidence_item
                                    }
                                elif "snowflake" in evidence_item.lower() and ("record" in evidence_item.lower() or "transaction" in evidence_item.lower()):
                                    tools_found["snowflake_query"] = {
                                        "agent": agent_name,
                                        "purpose": "Transaction Data Analysis",
                                        "status": "Success",
                                        "result": evidence_item
                                    }
        
        # Also check Snowflake agent specifically
        snowflake_agent = agent_results.get("snowflake", {})
        if isinstance(snowflake_agent, dict) and "findings" in snowflake_agent:
            findings = snowflake_agent["findings"]
            if isinstance(findings, dict):
                row_count = findings.get("row_count", 0)
                if row_count > 0:
                    tools_found["snowflake_database"] = {
                        "agent": "snowflake",
                        "purpose": "Database Query Execution",
                        "status": "Success",
                        "result": f"Retrieved {row_count} transaction records"
                    }
        
        if not tools_found:
            return "<p>No tool execution data available.</p>"
        
        html = "<table class='data-table'><thead><tr><th>Tool</th><th>Agent</th><th>Purpose</th><th>Status</th><th>Key Result</th></tr></thead><tbody>"
        
        for tool_name, tool_data in tools_found.items():
            agent = tool_data.get('agent', 'Unknown')
            purpose = tool_data.get('purpose', 'Data analysis')
            key_result = tool_data.get('key_result', 'Analysis completed')
            status = tool_data.get('status', 'Success')
            
            html += f"""
            <tr>
                <td><strong>{tool_name.replace('_', ' ').title()}</strong></td>
                <td>{agent}</td>
                <td>{purpose}</td>
                <td>{status}</td>
                <td>{key_result}</td>
            </tr>
            """
        
        html += "</tbody></table>"
        return html
    
    def _generate_technical_details_html(self, data: Dict[str, Any]) -> str:
        """Generate technical details section HTML."""
        validation = data.get("validation", {})
        metadata = data.get("metadata", {})
        
        html = "<h4>Validation Results</h4>"
        
        if validation:
            html += f"""
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{validation.get('overall_score', 0)}/100</span>
                    <div class="metric-label">Overall Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{validation.get('quality_score', 0)}/100</span>
                    <div class="metric-label">Quality Score</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{validation.get('performance_score', 0)}/100</span>
                    <div class="metric-label">Performance Score</div>
                </div>
            </div>
            """
            
            # Warnings and recommendations
            warnings = validation.get("warnings", [])
            recommendations = validation.get("recommendations", [])
            
            if warnings:
                html += "<h5>Validation Warnings</h5><ul class='finding-list'>"
                for warning in warnings:
                    html += f'<li class="finding-item" style="border-left-color: #fd7e14;">{warning}</li>'
                html += "</ul>"
            
            if recommendations:
                html += "<h5>Technical Recommendations</h5><ul class='finding-list'>"
                for rec in recommendations:
                    html += f'<li class="finding-item">{rec}</li>'
                html += "</ul>"
        
        # Processing summary
        html += f"""
        <h4>Processing Summary</h4>
        <p><strong>Files Processed:</strong> {data.get('files_processed', 0)}</p>
        <p><strong>Processing Errors:</strong> {len(data.get('processing_errors', []))}</p>
        <p><strong>Investigation Mode:</strong> {metadata.get('mode', 'Unknown')}</p>
        """
        
        errors = data.get('processing_errors', [])
        if errors:
            html += "<h5>Processing Errors</h5><ul>"
            for error in errors:
                html += f"<li>{error}</li>"
            html += "</ul>"
        
        return html

    def _generate_thought_process_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML for agent thought processes."""
        thought_processes = data.get("thought_processes", [])
        
        if not thought_processes:
            return "<p>No thought process data available.</p>"
        
        html = ""
        
        # Sort thought processes by agent name for better organization
        sorted_thoughts = sorted(thought_processes, key=lambda x: x.get("agent_name", "unknown"))
        
        for thought_data in sorted_thoughts:
            agent_name = thought_data.get("agent_name", "Unknown Agent")
            domain = thought_data.get("domain", "unknown")
            start_time = thought_data.get("start_timestamp", "")
            end_time = thought_data.get("end_timestamp", "")
            reasoning_steps = thought_data.get("reasoning_steps", [])
            
            # Agent header
            html += f"""
            <div class="thought-process-container">
                <h4 class="agent-thought-header">🤖 {agent_name.title().replace('_', ' ')} ({domain.title()} Domain)</h4>
                <div class="thought-metadata">
                    <span class="timestamp">⏰ {start_time[:19] if start_time else 'N/A'} - {end_time[:19] if end_time else 'N/A'}</span>
                </div>
            """
            
            if reasoning_steps:
                html += "<div class='reasoning-chain'>"
                
                for i, step in enumerate(reasoning_steps, 1):
                    step_type = step.get("reasoning_type", "analysis")
                    premise = step.get("premise", "")
                    reasoning = step.get("reasoning", "")
                    conclusion = step.get("conclusion", "")
                    confidence = step.get("confidence", 0)
                    evidence = step.get("supporting_evidence", [])
                    
                    # Step icon based on type
                    step_icon = "🔍" if step_type == "analysis" else "💡" if step_type == "conclusion" else "⚡"
                    
                    html += f"""
                    <div class="reasoning-step">
                        <div class="step-header">
                            <span class="step-number">{step_icon} Step {i}</span>
                            <span class="step-type">{step_type.title()}</span>
                            <span class="confidence-badge" style="background: {'#28a745' if confidence > 0.7 else '#fd7e14' if confidence > 0.4 else '#dc3545'}">
                                {confidence:.0%} confidence
                            </span>
                        </div>
                        <div class="step-content">
                            <div class="premise"><strong>Premise:</strong> {premise}</div>
                            <div class="reasoning"><strong>Reasoning:</strong> {reasoning}</div>
                            <div class="conclusion"><strong>Conclusion:</strong> {conclusion}</div>
                        </div>
                    """
                    
                    if evidence:
                        html += "<div class='evidence'><strong>Supporting Evidence:</strong><ul>"
                        for ev in evidence[:3]:  # Limit to first 3 pieces of evidence
                            ev_type = ev.get("type", "unknown")
                            ev_data = str(ev.get("data", ""))[:100]  # Truncate long data
                            html += f"<li><em>{ev_type}:</em> {ev_data}</li>"
                        html += "</ul></div>"
                    
                    html += "</div>"
                
                html += "</div>"
            else:
                html += "<p>No detailed reasoning steps available for this agent.</p>"
            
            html += "</div><hr class='agent-separator'>"
        
        # Add CSS styles for thought process visualization
        html = f"""
        <style>
            .thought-process-container {{ 
                margin: 20px 0; 
                border-left: 4px solid #2a5298; 
                padding-left: 15px; 
            }}
            .agent-thought-header {{ 
                color: #2a5298; 
                margin-bottom: 10px; 
                font-size: 1.2rem; 
            }}
            .thought-metadata {{ 
                color: #666; 
                font-size: 0.85rem; 
                margin-bottom: 15px; 
            }}
            .reasoning-chain {{ 
                margin-top: 15px; 
            }}
            .reasoning-step {{ 
                background: #f8f9fa; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 15px; 
                margin: 10px 0; 
            }}
            .step-header {{ 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 10px; 
            }}
            .step-number {{ 
                font-weight: bold; 
                color: #2a5298; 
            }}
            .step-type {{ 
                background: #e9ecef; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 0.8rem; 
                color: #495057; 
            }}
            .confidence-badge {{ 
                color: white; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 0.75rem; 
                font-weight: bold; 
            }}
            .step-content div {{ 
                margin: 8px 0; 
                line-height: 1.4; 
            }}
            .evidence {{ 
                background: #fff; 
                border-left: 3px solid #28a745; 
                padding: 10px; 
                margin-top: 10px; 
            }}
            .evidence ul {{ 
                margin: 5px 0 0 20px; 
            }}
            .evidence li {{ 
                margin: 3px 0; 
                font-size: 0.9rem; 
            }}
            .agent-separator {{ 
                border: none; 
                height: 2px; 
                background: linear-gradient(to right, #2a5298, transparent); 
                margin: 30px 0; 
            }}
        </style>
        {html}
        """
        
        return html

    def _generate_server_logs_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML for server logs."""
        server_logs = data.get("server_logs", {})
        
        if not server_logs:
            return "<p>No server logs available.</p>"
        
        # Handle raw logs format
        if "raw_logs" in server_logs:
            raw_logs = server_logs.get("raw_logs", "")
            log_count = server_logs.get("log_count", 0)
            
            html = f"""
            <div class="metrics-grid">
                <div class="metric-card">
                    <strong>Total Log Lines</strong>
                    <span>{log_count:,}</span>
                </div>
                <div class="metric-card">
                    <strong>Log Size</strong>
                    <span>{len(raw_logs):,} chars</span>
                </div>
            </div>
            <div class="log-container">
                <pre style="max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px;">{raw_logs[:10000]}{'...[truncated]' if len(raw_logs) > 10000 else ''}</pre>
            </div>
            """
            return html
        
        capture_session = server_logs.get("capture_session", {})
        logs = server_logs.get("server_logs", [])
        
        html = ""
        
        # Capture session summary
        if capture_session:
            start_time = capture_session.get("start_time", "")
            end_time = capture_session.get("end_time", "")
            duration = capture_session.get("duration_seconds", 0)
            total_count = capture_session.get("total_log_count", 0)
            level_counts = capture_session.get("level_counts", {})
            
            html += f"""
            <div class="logs-summary">
                <h4>📊 Logging Session Summary</h4>
                <div class="log-stats">
                    <div class="stat-item">
                        <span class="stat-label">Session Duration:</span>
                        <span class="stat-value">{duration:.1f} seconds</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Log Entries:</span>
                        <span class="stat-value">{total_count}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time Range:</span>
                        <span class="stat-value">{start_time[:19] if start_time else 'N/A'} - {end_time[:19] if end_time else 'N/A'}</span>
                    </div>
                </div>
                
                <div class="level-breakdown">
                    <strong>Log Level Breakdown:</strong>
            """
            
            for level, count in level_counts.items():
                color = {
                    "DEBUG": "#6c757d",
                    "INFO": "#17a2b8", 
                    "WARNING": "#ffc107",
                    "ERROR": "#dc3545",
                    "CRITICAL": "#721c24"
                }.get(level, "#6c757d")
                
                html += f"""
                <span class="level-badge" style="background: {color}">
                    {level}: {count}
                </span>
                """
            
            html += "</div></div>"
        
        # Server logs table
        if logs:
            html += """
            <div class="logs-container">
                <h4>📋 Server Log Entries</h4>
                <div class="logs-table-container">
                    <table class="logs-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level</th>
                                <th>Logger</th>
                                <th>Message</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
            """
            
            # Show only recent logs (limit to 50 for performance)
            display_logs = logs[-50:] if len(logs) > 50 else logs
            
            for log_entry in display_logs:
                timestamp = log_entry.get("timestamp", "")[:19]  # Remove microseconds and timezone
                level = log_entry.get("level", "INFO")
                logger_name = log_entry.get("logger_name", "")
                message = log_entry.get("message", "")
                source_file = log_entry.get("source_file", "")
                line_number = log_entry.get("line_number", "")
                
                # Truncate long messages
                display_message = message[:100] + "..." if len(message) > 100 else message
                
                # Source info
                source_info = ""
                if source_file:
                    source_name = source_file.split("/")[-1] if "/" in source_file else source_file
                    source_info = f"{source_name}:{line_number}" if line_number else source_name
                
                # Level color
                level_color = {
                    "DEBUG": "#6c757d",
                    "INFO": "#17a2b8",
                    "WARNING": "#ffc107", 
                    "ERROR": "#dc3545",
                    "CRITICAL": "#721c24"
                }.get(level, "#6c757d")
                
                html += f"""
                <tr>
                    <td class="timestamp">{timestamp}</td>
                    <td><span class="log-level" style="background: {level_color}">{level}</span></td>
                    <td class="logger">{logger_name}</td>
                    <td class="message" title="{message}">{display_message}</td>
                    <td class="source">{source_info}</td>
                </tr>
                """
            
            if len(logs) > 50:
                html += f"""
                <tr class="logs-truncated">
                    <td colspan="5">
                        <em>Showing last 50 of {len(logs)} total log entries...</em>
                    </td>
                </tr>
                """
            
            html += """
                        </tbody>
                    </table>
                </div>
            </div>
            """
        
        # Add CSS styles for server logs
        html = f"""
        <style>
            .logs-summary {{ 
                background: #f8f9fa; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 20px; 
                margin-bottom: 20px; 
            }}
            .log-stats {{ 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 15px; 
                margin: 15px 0; 
            }}
            .stat-item {{ 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }}
            .stat-label {{ 
                font-weight: bold; 
                color: #495057; 
            }}
            .stat-value {{ 
                color: #2a5298; 
                font-weight: bold; 
            }}
            .level-breakdown {{ 
                margin-top: 15px; 
            }}
            .level-badge {{ 
                display: inline-block; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 12px; 
                font-size: 0.75rem; 
                font-weight: bold; 
                margin: 2px 5px 2px 0; 
            }}
            .logs-container {{ 
                background: white; 
                border: 1px solid #e9ecef; 
                border-radius: 8px; 
                padding: 20px; 
            }}
            .logs-table-container {{ 
                max-height: 500px; 
                overflow-y: auto; 
                border: 1px solid #e9ecef; 
                border-radius: 4px; 
            }}
            .logs-table {{ 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 0.85rem; 
            }}
            .logs-table th {{ 
                background: #e9ecef; 
                padding: 10px 8px; 
                text-align: left; 
                font-weight: bold; 
                position: sticky; 
                top: 0; 
                z-index: 1; 
            }}
            .logs-table td {{ 
                padding: 8px; 
                border-bottom: 1px solid #e9ecef; 
                vertical-align: top; 
            }}
            .logs-table tr:hover {{ 
                background: #f8f9fa; 
            }}
            .timestamp {{ 
                white-space: nowrap; 
                font-family: monospace; 
                font-size: 0.8rem; 
            }}
            .log-level {{ 
                color: white; 
                padding: 2px 6px; 
                border-radius: 10px; 
                font-size: 0.7rem; 
                font-weight: bold; 
                display: inline-block; 
                min-width: 50px; 
                text-align: center; 
            }}
            .logger {{ 
                font-weight: bold; 
                color: #495057; 
                max-width: 120px; 
                word-break: break-word; 
            }}
            .message {{ 
                max-width: 300px; 
                word-break: break-word; 
                line-height: 1.3; 
            }}
            .source {{ 
                font-family: monospace; 
                font-size: 0.8rem; 
                color: #6c757d; 
            }}
            .logs-truncated td {{ 
                text-align: center; 
                font-style: italic; 
                color: #6c757d; 
                background: #f8f9fa; 
            }}
        </style>
        {html}
        """
        
        return html


def generate_comprehensive_investigation_report(
    investigation_folder: Path,
    output_path: Optional[Path] = None,
    title: Optional[str] = None
) -> Path:
    """
    Generate comprehensive investigation report from investigation folder.
    
    Args:
        investigation_folder: Path to investigation folder
        output_path: Output path for HTML report (optional)
        title: Report title (optional)
        
    Returns:
        Path to generated HTML report
    """
    generator = ComprehensiveInvestigationReportGenerator()
    return generator.generate_comprehensive_report(
        investigation_folder=investigation_folder,
        output_path=output_path,
        title=title
    )