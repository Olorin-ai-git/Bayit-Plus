"""
Report HTML Generation Module

Extracted HTML generation methods from comprehensive_investigation_report.py
"""

from typing import Dict, Any
from app.service.reporting.olorin_logo import get_olorin_header, OLORIN_FOOTER


class ReportHTMLGenerator:
    """Handles HTML report generation"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def generate_html_report(self, data: Dict[str, Any], title: str) -> str:
        """Generate comprehensive HTML report."""
        summary = data["summary"]
        risk_analyzer_info = data.get("risk_analyzer_info", {})
        
        # Determine risk level and color
        final_risk_score = summary.final_risk_score if summary.final_risk_score is not None else 0.0
        risk_level = "HIGH" if final_risk_score > 0.7 else "MEDIUM" if final_risk_score > 0.4 else "LOW"
        risk_color = "#dc3545" if risk_level == "HIGH" else "#fd7e14" if risk_level == "MEDIUM" else "#28a745"
        
        # Generate header with logo
        header_html = get_olorin_header(title)
        
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
        
        /* Responsive */
        @media (max-width: 768px) {{
            .container {{ padding: 10px; }}
            .metrics-grid {{ grid-template-columns: 1fr; }}
            .header h1 {{ font-size: 2rem; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        {header_html}
        
        <div class="header">
            <h1>{title}</h1>
            <p>Investigation ID: {summary.investigation_id}</p>
        </div>
        
        <div class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="risk-badge">Risk Level: {risk_level}</div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-value">{final_risk_score:.2f}</span>
                    <span class="metric-label">Risk Score</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.confidence_score:.2f}</span>
                    <span class="metric-label">Confidence</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{summary.duration_seconds:.1f}s</span>
                    <span class="metric-label">Duration</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">{len(summary.agents_executed)}</span>
                    <span class="metric-label">Agents Executed</span>
                </div>
            </div>
        </div>
        
        {self._generate_agent_results_section(data)}
        {self._generate_performance_section(data)}
        {self._generate_findings_section(data)}
        
        {OLORIN_FOOTER}
    </div>
</body>
</html>
"""
        return html_content
    
    def _generate_agent_results_section(self, data: Dict[str, Any]) -> str:
        """Generate agent results section HTML"""
        agents_data = data.get("agents", {})
        agent_results = agents_data.get("agent_results", {})
        
        if not agent_results:
            return ""
        
        html = '<div class="section"><div class="section-header"><h2>Agent Results</h2></div><div class="section-content"><table class="data-table"><thead><tr><th>Agent</th><th>Status</th><th>Risk Score</th></tr></thead><tbody>'
        
        for agent_name, result in agent_results.items():
            status = result.get("status", "unknown")
            risk_score = result.get("risk_score", 0.0)
            html += f'<tr><td>{agent_name}</td><td>{status}</td><td>{risk_score:.2f}</td></tr>'
        
        html += '</tbody></table></div></div>'
        return html
    
    def _generate_performance_section(self, data: Dict[str, Any]) -> str:
        """Generate performance section HTML"""
        performance = data.get("performance", {})
        
        if not performance:
            return ""
        
        total_duration = performance.get("total_duration", 0.0)
        
        html = f'<div class="section"><div class="section-header"><h2>Performance Metrics</h2></div><div class="section-content"><p>Total Duration: {total_duration:.2f}s</p></div></div>'
        return html
    
    def _generate_findings_section(self, data: Dict[str, Any]) -> str:
        """Generate findings section HTML"""
        summary = data.get("summary")
        
        if not summary or not summary.critical_findings:
            return ""
        
        html = '<div class="section"><div class="section-header"><h2>Critical Findings</h2></div><div class="section-content"><ul>'
        
        for finding in summary.critical_findings[:10]:
            html += f'<li>{finding}</li>'
        
        html += '</ul></div></div>'
        return html

