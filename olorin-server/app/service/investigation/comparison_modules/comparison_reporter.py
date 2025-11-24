"""
Comparison Reporting Module

Extracted reporting methods from auto_comparison.py
"""

import json
import zipfile
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.reporting.olorin_logo import get_olorin_header, OLORIN_FOOTER

logger = get_bridge_logger(__name__)


class ComparisonReporter:
    """Handles reporting for comparison operations"""
    
    def __init__(self):
        self.logger = logger
    
    def format_percentage(self, value: float, decimals: int = 2) -> str:
        """Format percentage value for logging."""
        return f"{value * 100:.{decimals}f}%"
    
    def summarize_comparison_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize comparison results"""
        if not results:
            return {
                "total_comparisons": 0,
                "successful": 0,
                "failed": 0,
                "summary": "No comparisons performed"
            }
        
        successful = sum(1 for r in results if r.get("status") == "success")
        failed = len(results) - successful
        
        return {
            "total_comparisons": len(results),
            "successful": successful,
            "failed": failed,
            "success_rate": successful / len(results) if results else 0,
            "summary": f"Completed {successful}/{len(results)} comparisons successfully"
        }
    
    def generate_summary_html(
        self,
        results: List[Dict[str, Any]],
        output_path: Path
    ) -> Path:
        """Generate HTML summary report"""
        summary = self.summarize_comparison_results(results)
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Auto Comparison Summary</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .summary {{ margin: 20px 0; }}
        .result {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
        .success {{ background: #d4edda; }}
        .failed {{ background: #f8d7da; }}
    </style>
</head>
<body>
    {get_olorin_header()}
    <div class="header">
        <h1>Auto Comparison Summary</h1>
        <p>Generated: {datetime.now().isoformat()}</p>
    </div>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Comparisons: {summary['total_comparisons']}</p>
        <p>Successful: {summary['successful']}</p>
        <p>Failed: {summary['failed']}</p>
        <p>Success Rate: {self.format_percentage(summary['success_rate'])}</p>
    </div>
    <div class="results">
        <h2>Results</h2>
        {"".join(self._format_result_html(r) for r in results)}
    </div>
    {OLORIN_FOOTER}
</body>
</html>
"""
        
        output_path.write_text(html_content)
        self.logger.info(f"✅ Summary HTML report generated: {output_path}")
        return output_path
    
    def _format_result_html(self, result: Dict[str, Any]) -> str:
        """Format a single result as HTML"""
        status_class = "success" if result.get("status") == "success" else "failed"
        return f"""
        <div class="result {status_class}">
            <h3>{result.get('entity_type', 'unknown')}: {result.get('entity_value', 'unknown')}</h3>
            <p>Status: {result.get('status', 'unknown')}</p>
            <p>Investigation ID: {result.get('investigation_id', 'N/A')}</p>
        </div>
        """
    
    def package_comparison_results(
        self,
        results: List[Dict[str, Any]],
        output_dir: Path
    ) -> Path:
        """Package comparison results into a ZIP file"""
        zip_path = output_dir / f"comparison_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add summary JSON
            summary = self.summarize_comparison_results(results)
            zipf.writestr("summary.json", json.dumps(summary, indent=2))
            
            # Add individual results
            for i, result in enumerate(results):
                zipf.writestr(f"result_{i}.json", json.dumps(result, indent=2, default=str))
        
        self.logger.info(f"✅ Comparison results packaged: {zip_path}")
        return zip_path

