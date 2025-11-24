"""
Startup HTML Generation Module

Extracted HTML generation from startup_report_generator.py
"""

from typing import Dict, Any
from app.service.reporting.olorin_logo import get_olorin_header, OLORIN_FOOTER


class StartupHTMLGenerator:
    """Generates HTML reports for startup data"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def generate_startup_report(self, data: Dict[str, Any], title: str = "System Startup Report") -> str:
        """Generate HTML startup report"""
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
        .header {{ 
            background: linear-gradient(135deg, #1e3c72, #2a5298); 
            color: white; 
            padding: 30px 0; 
            margin-bottom: 30px; 
            border-radius: 10px; 
        }}
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
        .section-content {{ padding: 20px; }}
        .info-table {{ width: 100%; border-collapse: collapse; }}
        .info-table td {{ padding: 10px; border-bottom: 1px solid #dee2e6; }}
        .info-table td:first-child {{ font-weight: 600; color: #2a5298; width: 200px; }}
    </style>
</head>
<body>
    <div class="container">
        {header_html}
        
        <div class="header">
            <h1>{title}</h1>
            <p>Generated: {data.get('collected_at', 'Unknown')}</p>
        </div>
        
        {self._generate_system_section(data.get('system', {}))}
        {self._generate_database_section(data.get('database', {}))}
        {self._generate_service_section(data.get('service', {}))}
        {self._generate_analytics_section(data.get('analytics', {}))}
        
        {OLORIN_FOOTER}
    </div>
</body>
</html>
"""
        return html_content
    
    def _generate_system_section(self, system_data: Dict[str, Any]) -> str:
        """Generate system information section"""
        return f"""
        <div class="section">
            <div class="section-header"><h2>System Information</h2></div>
            <div class="section-content">
                <table class="info-table">
                    <tr><td>Platform</td><td>{system_data.get('platform', 'Unknown')}</td></tr>
                    <tr><td>Environment</td><td>{system_data.get('environment', 'Unknown')}</td></tr>
                    <tr><td>Python Version</td><td>{system_data.get('python_version', 'Unknown')[:50]}</td></tr>
                </table>
            </div>
        </div>
        """
    
    def _generate_database_section(self, db_data: Dict[str, Any]) -> str:
        """Generate database information section"""
        return f"""
        <div class="section">
            <div class="section-header"><h2>Database Configuration</h2></div>
            <div class="section-content">
                <table class="info-table">
                    <tr><td>Provider</td><td>{db_data.get('provider', 'Unknown')}</td></tr>
                    <tr><td>Snowflake Enabled</td><td>{db_data.get('snowflake_enabled', False)}</td></tr>
                    <tr><td>PostgreSQL Enabled</td><td>{db_data.get('postgresql_enabled', False)}</td></tr>
                </table>
            </div>
        </div>
        """
    
    def _generate_service_section(self, service_data: Dict[str, Any]) -> str:
        """Generate service information section"""
        return f"""
        <div class="section">
            <div class="section-header"><h2>Service Configuration</h2></div>
            <div class="section-content">
                <table class="info-table">
                    <tr><td>Server URL</td><td>{service_data.get('server_url', 'Unknown')}</td></tr>
                    <tr><td>Log Level</td><td>{service_data.get('log_level', 'Unknown')}</td></tr>
                    <tr><td>Verification Enabled</td><td>{service_data.get('verification_enabled', False)}</td></tr>
                </table>
            </div>
        </div>
        """
    
    def _generate_analytics_section(self, analytics_data: Dict[str, Any]) -> str:
        """Generate analytics information section"""
        return f"""
        <div class="section">
            <div class="section-header"><h2>Analytics Configuration</h2></div>
            <div class="section-content">
                <table class="info-table">
                    <tr><td>Snowflake Enabled</td><td>{analytics_data.get('snowflake_enabled', False)}</td></tr>
                    <tr><td>Default Time Window</td><td>{analytics_data.get('default_time_window', 'Unknown')}</td></tr>
                    <tr><td>Default Group By</td><td>{analytics_data.get('default_group_by', 'Unknown')}</td></tr>
                    <tr><td>Cache TTL</td><td>{analytics_data.get('cache_ttl', 'Unknown')}s</td></tr>
                </table>
            </div>
        </div>
        """

