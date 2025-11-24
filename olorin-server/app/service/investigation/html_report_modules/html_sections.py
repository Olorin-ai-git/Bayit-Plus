"""
HTML Section Generation Module

Extracted section generation functions from html_report_generator.py
"""

from typing import Dict, Any, Optional
from app.service.reporting.olorin_logo import get_olorin_header, OLORIN_FOOTER
from .html_formatters import HTMLFormatters


class HTMLSectionGenerator:
    """Generates HTML sections for comparison reports"""
    
    def __init__(self):
        self.formatters = HTMLFormatters()
    
    def generate_header(
        self,
        entity_label: str,
        response: Any
    ) -> str:
        """Generate report header section"""
        header_html = get_olorin_header("Investigation Comparison Report")
        
        return f"""
        <div class="header">
            {header_html}
            <h1>Investigation Comparison Report</h1>
            <p class="subtitle">Prediction Quality Validation</p>
            <p class="entity-info">Entity: {entity_label}</p>
        </div>
        """
    
    def generate_metadata_section(self, response: Any) -> str:
        """Generate metadata section"""
        return f"""
        <div class="section metadata">
            <h2>Comparison Metadata</h2>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span class="label">Window A:</span>
                    <span class="value">{response.A.window.start} to {response.A.window.end}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Window B:</span>
                    <span class="value">{response.B.window.start} to {response.B.window.end}</span>
                </div>
            </div>
        </div>
        """
    
    def generate_explanation_section(self) -> str:
        """Generate explanation section"""
        return """
        <div class="section explanation">
            <h2>About This Report</h2>
            <p>
                This report compares two investigation windows to validate prediction quality.
                Window A represents the historical investigation period, while Window B represents
                the validation period where actual outcomes occurred.
            </p>
        </div>
        """
    
    def generate_summary_section(self, response: Any) -> str:
        """Generate summary section"""
        return f"""
        <div class="section summary">
            <h2>Summary</h2>
            <div class="summary-metrics">
                <div class="metric-card">
                    <span class="metric-label">Window A Transactions</span>
                    <span class="metric-value">{self.formatters.format_number(response.A.metrics.transaction_count)}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Window B Transactions</span>
                    <span class="metric-value">{self.formatters.format_number(response.B.metrics.transaction_count)}</span>
                </div>
            </div>
        </div>
        """
    
    def generate_footer(self) -> str:
        """Generate report footer"""
        return f"""
        <div class="footer">
            {OLORIN_FOOTER}
        </div>
        """
