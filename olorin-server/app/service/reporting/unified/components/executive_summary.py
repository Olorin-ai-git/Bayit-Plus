"""
Executive Summary component for unified HTML reports.

This component generates a comprehensive executive summary section with
key metrics, statistics, and high-level investigation information.
"""

from typing import List
from ..core.data_structures import UnifiedReportData
from .base_component import BaseComponent


class ExecutiveSummary(BaseComponent):
    """
    Executive summary component showing key investigation metrics.
    
    This component provides a high-level overview of the investigation
    including status, risk scores, timing, and success metrics.
    """
    
    def generate(self, data: UnifiedReportData) -> str:
        """Generate executive summary HTML content."""
        summary = data.summary
        
        # Calculate additional metrics
        completion_percentage = data.get_completion_percentage()
        risk_level = data.get_risk_level()
        
        # Risk level styling
        risk_colors = {
            "low": "#28a745",
            "medium": "#ffc107", 
            "high": "#fd7e14",
            "critical": "#dc3545"
        }
        risk_color = risk_colors.get(risk_level.value, "#6c757d")
        
        # Status styling
        status_colors = {
            "completed": "#28a745",
            "failed": "#dc3545",
            "in_progress": "#007bff",
            "pending": "#6c757d"
        }
        status_color = status_colors.get(summary.status.value, "#6c757d")
        
        html = f'''
        <div class="executive-summary">
            <div class="summary-grid">
                <div class="summary-card investigation-info">
                    <h4>Investigation Details</h4>
                    <div class="info-row">
                        <span class="label">ID:</span>
                        <span class="value">{summary.investigation_id}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Scenario:</span>
                        <span class="value">{summary.scenario_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Mode:</span>
                        <span class="value mode-{summary.mode.lower()}">{summary.mode}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Status:</span>
                        <span class="value status-badge" style="background-color: {status_color};">
                            {summary.status.value.replace('_', ' ').title()}
                        </span>
                    </div>
                </div>
                
                <div class="summary-card risk-metrics">
                    <h4>Risk Assessment</h4>
                    <div class="risk-score-display">
                        <div class="risk-score-value" style="color: {risk_color};">
                            {summary.overall_risk_score:.2f if summary.overall_risk_score else 'N/A'}
                        </div>
                        <div class="risk-level" style="background-color: {risk_color};">
                            {risk_level.value.upper()}
                        </div>
                    </div>
                    {f'<div class="confidence-score">Confidence: {summary.confidence_score:.1%}</div>' 
                     if summary.confidence_score else ''}
                </div>
                
                <div class="summary-card timing-info">
                    <h4>Timing Information</h4>
                    <div class="info-row">
                        <span class="label">Started:</span>
                        <span class="value">{summary.start_time.strftime('%Y-%m-%d %H:%M:%S')}</span>
                    </div>
                    {('<div class="info-row">'
                      '<span class="label">Completed:</span>'
                      f'<span class="value">{summary.end_time.strftime("%Y-%m-%d %H:%M:%S")}</span>'
                      '</div>') if summary.end_time else ''}
                    {('<div class="info-row">'
                      '<span class="label">Duration:</span>'
                      f'<span class="value">{summary.duration_seconds:.2f}s</span>'
                      '</div>') if summary.duration_seconds else ''}
                    <div class="info-row">
                        <span class="label">Progress:</span>
                        <span class="value">{completion_percentage:.1f}%</span>
                    </div>
                </div>
                
                <div class="summary-card test-metrics">
                    <h4>Test Metrics</h4>
                    <div class="info-row">
                        <span class="label">Tests Passed:</span>
                        <span class="value success">{summary.tests_passed}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Tests Failed:</span>
                        <span class="value error">{summary.tests_failed}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Pass Rate:</span>
                        <span class="value">{summary.pass_rate:.1f}%</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Errors:</span>
                        <span class="value {('error' if summary.error_count > 0 else 'success')}">{summary.error_count}</span>
                    </div>
                </div>
                
                <div class="summary-card activity-metrics">
                    <h4>Activity Metrics</h4>
                    <div class="info-row">
                        <span class="label">Total Interactions:</span>
                        <span class="value">{summary.total_interactions}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">LLM Calls:</span>
                        <span class="value">{summary.llm_calls}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Tool Executions:</span>
                        <span class="value">{summary.tool_executions}</span>
                    </div>
                    {('<div class="info-row">'
                      '<span class="label">Total Tokens:</span>'
                      f'<span class="value">{summary.total_tokens:,}</span>'
                      '</div>') if summary.total_tokens else ''}
                </div>
                
                <div class="summary-card agents-tools">
                    <h4>Agents & Tools</h4>
                    <div class="info-section">
                        <span class="label">Agents Used ({len(summary.agents_used)}):</span>
                        <div class="tag-list">
                            {' '.join(f'<span class="tag agent-tag">{agent}</span>' for agent in summary.agents_used)}
                        </div>
                    </div>
                    <div class="info-section">
                        <span class="label">Tools Used ({len(summary.tools_used)}):</span>
                        <div class="tag-list">
                            {' '.join(f'<span class="tag tool-tag">{tool}</span>' for tool in summary.tools_used)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        .executive-summary {{
            margin-bottom: 2rem;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }}
        
        .summary-card {{
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #007bff;
        }}
        
        .summary-card h4 {{
            margin: 0 0 1rem 0;
            color: #495057;
            font-size: 1.1rem;
            font-weight: 600;
        }}
        
        .info-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f8f9fa;
        }}
        
        .info-row:last-child {{
            margin-bottom: 0;
            border-bottom: none;
        }}
        
        .info-section {{
            margin-bottom: 1rem;
        }}
        
        .info-section:last-child {{
            margin-bottom: 0;
        }}
        
        .label {{
            font-weight: 600;
            color: #6c757d;
            flex: 1;
        }}
        
        .value {{
            font-weight: 500;
            color: #495057;
            text-align: right;
        }}
        
        .value.success {{
            color: #28a745;
        }}
        
        .value.error {{
            color: #dc3545;
        }}
        
        .status-badge {{
            color: white !important;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .mode-live {{
            color: #dc3545;
            font-weight: 600;
        }}
        
        .mode-mock {{
            color: #6c757d;
            font-weight: 600;
        }}
        
        .risk-score-display {{
            text-align: center;
            margin-bottom: 1rem;
        }}
        
        .risk-score-value {{
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }}
        
        .risk-level {{
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            display: inline-block;
        }}
        
        .confidence-score {{
            text-align: center;
            color: #6c757d;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }}
        
        .tag-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }}
        
        .tag {{
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
        }}
        
        .agent-tag {{
            background-color: #e3f2fd;
            color: #1565c0;
        }}
        
        .tool-tag {{
            background-color: #f3e5f5;
            color: #7b1fa2;
        }}
        
        @media (max-width: 768px) {{
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
            
            .info-row {{
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
            }}
            
            .value {{
                text-align: left;
            }}
        }}
        </style>
        '''
        
        return html
    
    def get_required_data_fields(self) -> List[str]:
        """Return list of required data fields."""
        return [
            "summary.investigation_id",
            "summary.scenario_name", 
            "summary.status"
        ]
    
    def _get_default_title(self) -> str:
        """Get default component title."""
        return "Executive Summary"