"""
HTML Chart Generation Module

Extracted chart generation functions from html_report_generator.py
"""

from typing import List, Dict, Any, Optional


class HTMLChartGenerator:
    """Generates chart data and HTML for comparison reports"""
    
    def prepare_histogram_data(
        self,
        histogram: Optional[List[Any]]
    ) -> Optional[Dict[str, Any]]:
        """Prepare histogram data for Chart.js"""
        if not histogram:
            return None
        
        bins = [bin.bin_start for bin in histogram]
        counts = [bin.count for bin in histogram]
        
        return {
            "labels": bins,
            "datasets": [{
                "label": "Risk Distribution",
                "data": counts,
                "backgroundColor": "rgba(54, 162, 235, 0.5)",
                "borderColor": "rgba(54, 162, 235, 1)",
                "borderWidth": 1
            }]
        }
    
    def prepare_timeseries_data(
        self,
        timeseries: Optional[List[Any]]
    ) -> Optional[Dict[str, Any]]:
        """Prepare timeseries data for Chart.js"""
        if not timeseries:
            return None
        
        dates = [ts.date for ts in timeseries]
        values = [ts.value for ts in timeseries]
        
        return {
            "labels": dates,
            "datasets": [{
                "label": "Daily Values",
                "data": values,
                "borderColor": "rgba(75, 192, 192, 1)",
                "backgroundColor": "rgba(75, 192, 192, 0.2)",
                "fill": True
            }]
        }
    
    def generate_chart_html(
        self,
        chart_id: str,
        chart_type: str,
        chart_data: Dict[str, Any],
        title: str
    ) -> str:
        """Generate HTML for a Chart.js chart"""
        return f"""
        <div class="chart-container">
            <h3>{title}</h3>
            <canvas id="{chart_id}"></canvas>
            <script>
                const ctx_{chart_id} = document.getElementById('{chart_id}').getContext('2d');
                new Chart(ctx_{chart_id}, {{
                    type: '{chart_type}',
                    data: {chart_data},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false
                    }}
                }});
            </script>
        </div>
        """
