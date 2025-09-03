#!/usr/bin/env python
"""
Enhanced Autonomous Investigation Test Runner with HTML Report Generation

Runs comprehensive tests and generates interactive HTML reports with visualizations.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.agent.ato_agents.utils.metrics_visualizer import MetricsVisualizer
from run_autonomous_tests import AutonomousTestRunner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class EnhancedAutonomousTestRunner(AutonomousTestRunner):
    """Enhanced test runner with HTML report generation."""
    
    def __init__(self):
        super().__init__()
        self.metrics_history = []
        self.html_report_path = None
        
    def convert_results_to_metrics(self, test_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert test results to metrics format for visualization."""
        timestamp = datetime.now().isoformat()
        
        # Extract risk scores from different test types
        risk_scores = []
        if "final_risk_score" in result:
            risk_scores.append(result["final_risk_score"])
        elif "risk_scores" in result:
            risk_scores.extend(result["risk_scores"])
        elif "phases" in result:
            for phase in result["phases"].values():
                if phase.get("risk_score") is not None:
                    risk_scores.append(phase["risk_score"])
        
        # Calculate metrics
        metrics = {
            "timestamp": timestamp,
            "test_name": test_name,
            "total_events": 1,
            "high_risk_events": sum(1 for score in risk_scores if score > 0.7),
            "avg_risk_score": sum(risk_scores) / len(risk_scores) if risk_scores else 0,
            "risk_score_stddev": self._calculate_stddev(risk_scores),
            "error_count": 1 if result.get("status") == "FAILED" else 0,
            "duration": result.get("duration", 0),
            "most_common_risks": self._extract_risk_factors(result),
            "success_rate": 1.0 if result.get("status") == "PASSED" else 0.0
        }
        
        return metrics
    
    def _calculate_stddev(self, values: List[float]) -> float:
        """Calculate standard deviation of values."""
        if not values or len(values) < 2:
            return 0.0
        
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5
    
    def _extract_risk_factors(self, result: Dict[str, Any]) -> List[tuple]:
        """Extract top risk factors from results."""
        risk_factors = []
        
        # Extract from phases if available
        if "phases" in result:
            for phase_name, phase_data in result["phases"].items():
                if phase_data.get("risk_score", 0) > 0.5:
                    risk_factors.append((phase_name, phase_data["risk_score"]))
        
        # Sort by risk score and return top 5
        risk_factors.sort(key=lambda x: x[1], reverse=True)
        return risk_factors[:5]
    
    async def run_all_tests_with_html_report(self):
        """Run all tests and generate HTML report."""
        logger.info("=" * 60)
        logger.info("AUTONOMOUS INVESTIGATION TEST SUITE WITH HTML REPORTING")
        logger.info("=" * 60)
        logger.info(f"Starting at: {datetime.now().isoformat()}")
        logger.info("")
        
        # Run all tests
        all_results = await self.run_all_tests()
        
        # Convert results to metrics format
        for test_name, result in all_results.items():
            metrics = self.convert_results_to_metrics(test_name, result)
            self.metrics_history.append(metrics)
        
        # Save metrics to JSON for visualization
        metrics_file = Path("logs/metrics.json")
        metrics_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(metrics_file, 'w') as f:
            json.dump(self.metrics_history, f, indent=2, default=str)
        
        logger.info(f"Metrics saved to: {metrics_file}")
        
        # Generate HTML report
        logger.info("Generating HTML report...")
        visualizer = MetricsVisualizer(
            metrics_file=str(metrics_file),
            report_dir="reports/html"
        )
        
        try:
            self.html_report_path = visualizer.generate_report(lookback_hours=24)
            
            if self.html_report_path:
                logger.info(f"✅ HTML report generated successfully: {self.html_report_path}")
                
                # Also generate a summary HTML with test results
                self._generate_summary_html(all_results)
            else:
                logger.warning("⚠️ HTML report generation returned empty path")
        except Exception as e:
            logger.error(f"❌ Failed to generate HTML report: {str(e)}")
        
        return all_results
    
    def _generate_summary_html(self, all_results: Dict[str, Any]):
        """Generate a summary HTML page with test results."""
        summary_path = Path("reports/html/test_summary.html")
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Count results
        passed = sum(1 for r in all_results.values() if r.get("status") == "PASSED")
        failed = sum(1 for r in all_results.values() if r.get("status") == "FAILED")
        errors = sum(1 for r in all_results.values() if r.get("status") == "ERROR")
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Autonomous Investigation Test Results</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        .header {{
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .summary {{
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }}
        .summary-card {{
            background: white;
            padding: 20px;
            border-radius: 5px;
            flex: 1;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .summary-card h2 {{
            margin: 0;
            font-size: 36px;
        }}
        .passed {{ color: #27ae60; }}
        .failed {{ color: #e74c3c; }}
        .error {{ color: #f39c12; }}
        .results-table {{
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #34495e;
            color: white;
        }}
        .status-passed {{ background-color: #d4edda; }}
        .status-failed {{ background-color: #f8d7da; }}
        .status-error {{ background-color: #fff3cd; }}
        .metrics-link {{
            margin-top: 20px;
            padding: 20px;
            background: white;
            border-radius: 5px;
            text-align: center;
        }}
        a {{
            color: #3498db;
            text-decoration: none;
            font-weight: bold;
        }}
        a:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Autonomous Investigation Test Results</h1>
        <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h2>{len(all_results)}</h2>
            <p>Total Tests</p>
        </div>
        <div class="summary-card">
            <h2 class="passed">{passed}</h2>
            <p>Passed</p>
        </div>
        <div class="summary-card">
            <h2 class="failed">{failed}</h2>
            <p>Failed</p>
        </div>
        <div class="summary-card">
            <h2 class="error">{errors}</h2>
            <p>Errors</p>
        </div>
    </div>
    
    <div class="results-table">
        <h2>Test Results Details</h2>
        <table>
            <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Duration (s)</th>
                <th>Risk Score</th>
                <th>Details</th>
            </tr>
"""
        
        for test_name, result in all_results.items():
            status = result.get("status", "UNKNOWN")
            duration = result.get("duration", 0)
            risk_score = result.get("final_risk_score", result.get("average_risk", "N/A"))
            
            status_class = f"status-{status.lower()}"
            
            details = ""
            if status == "FAILED" and "error" in result:
                details = f"Error: {result['error'][:100]}..."
            elif "successful" in result:
                details = f"Success rate: {result['successful']}/{result.get('total_investigations', 'N/A')}"
            
            html_content += f"""
            <tr class="{status_class}">
                <td>{test_name}</td>
                <td>{status}</td>
                <td>{duration:.2f}</td>
                <td>{risk_score:.2f if isinstance(risk_score, (int, float)) else risk_score}</td>
                <td>{details}</td>
            </tr>
"""
        
        html_content += f"""
        </table>
    </div>
    
    <div class="metrics-link">
        <h3>Detailed Metrics Visualization</h3>
        <p><a href="{os.path.basename(self.html_report_path) if self.html_report_path else '#'}">View Interactive Charts and Metrics →</a></p>
    </div>
</body>
</html>
"""
        
        with open(summary_path, 'w') as f:
            f.write(html_content)
        
        logger.info(f"Test summary HTML saved to: {summary_path}")


async def main():
    """Main entry point."""
    runner = EnhancedAutonomousTestRunner()
    results = await runner.run_all_tests_with_html_report()
    
    # Exit with appropriate code
    if all(r.get("status") == "PASSED" for r in results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())