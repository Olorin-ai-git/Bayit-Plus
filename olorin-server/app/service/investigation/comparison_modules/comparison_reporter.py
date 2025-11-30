"""
Comparison Reporting Module

Extracted reporting methods from auto_comparison.py
"""

import json
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header

logger = get_bridge_logger(__name__)


class ComparisonReporter:
    """Handles reporting for comparison operations"""

    def __init__(self):
        self.logger = logger

    def format_percentage(self, value: float, decimals: int = 2) -> str:
        """Format percentage value for logging."""
        return f"{value * 100:.{decimals}f}%"

    def summarize_comparison_results(
        self, results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Summarize comparison results"""
        if not results:
            return {
                "total_comparisons": 0,
                "successful": 0,
                "failed": 0,
                "summary": "No comparisons performed",
            }

        successful = sum(1 for r in results if r.get("status") == "completed")
        failed = len(results) - successful

        return {
            "total_comparisons": len(results),
            "successful": successful,
            "failed": failed,
            "success_rate": successful / len(results) if results else 0,
            "summary": f"Completed {successful}/{len(results)} comparisons successfully",
        }

    def generate_summary_html(self, investigation_data: List[Dict[str, Any]]) -> str:
        """
        Generate HTML summary of investigations and comparisons.

        Args:
            investigation_data: List of investigation data dictionaries

        Returns:
            HTML string
        """
        html_parts = [
            """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comparison Summary</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-left: 10px;
            border-left: 4px solid #3498db;
        }
        h3.merchant-header {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
            font-size: 1.4em;
        }
        .investigation-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
            margin-left: 10px;
        }
        .investigation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .investigation-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
        }
        .investigation-id {
            font-family: monospace;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric-card {
            background: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 3px solid #3498db;
        }
        .metric-label {
            font-size: 0.85em;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2c3e50;
        }
        .delta-positive { color: #27ae60; }
        .delta-negative { color: #e74c3c; }
        .delta-neutral { color: #7f8c8d; }
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .entity-value {
            font-family: monospace;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        """
            + get_olorin_header("Comparison Summary Report")
            + """
"""
        ]

        # Summary statistics
        total_investigations = len(investigation_data)
        total_comparisons = sum(
            1 for inv in investigation_data if inv.get("comparison_response")
        )

        html_parts.append(
            """
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-value">"""
            + str(total_investigations)
            + """</div>
                <div class="stat-label">Investigations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">"""
            + str(total_comparisons)
            + """</div>
                <div class="stat-label">Comparisons</div>
            </div>
        </div>
    """
        )

        # Investigation details
        html_parts.append("<h2>Investigation Details</h2>")

        # Group by Merchant
        by_merchant = {}
        for inv in investigation_data:
            m = inv.get("merchant_name", "Unknown Merchant")
            if m not in by_merchant:
                by_merchant[m] = []
            by_merchant[m].append(inv)

        for merchant, inv_list in sorted(by_merchant.items()):
            html_parts.append(f'<h3 class="merchant-header">Merchant: {merchant} ({len(inv_list)} investigations)</h3>')
            
            for inv in inv_list:
                entity_value = inv.get("entity_value", "Unknown")
                entity_type = inv.get("entity_type", "unknown")
                investigation_id = inv.get("investigation_id", "N/A")
                metadata = inv.get("metadata", {})
                metrics = inv.get("comparison_metrics", {})
                comparison_response = inv.get("comparison_response")

                html_parts.append(
                    f"""
            <div class="investigation-card">
                <div class="investigation-header">
                    <div>
                        <div class="investigation-title">Investigation #{inv.get('index', '?')}: {entity_type}</div>
                        <div class="investigation-id">ID: {investigation_id}</div>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <strong>Entity:</strong> <span class="entity-value">{entity_value}</span>
                </div>
            """
                )

                # Investigation metadata
                if metadata:
                    created_at = metadata.get("created_at", "N/A")
                    status = metadata.get("status", "N/A")
                    html_parts.append(
                        f"""
                <div style="margin-top: 10px; color: #7f8c8d; font-size: 0.9em;">
                    Created: {created_at} | Status: {status}
                </div>
                """
                    )

                # Comparison metrics
                if metrics:
                    html_parts.append(
                        """
                <div class="metrics-grid">
                """
                    )

                    window_a_tx = metrics.get("window_a_transactions", 0)
                    window_b_tx = metrics.get("window_b_transactions", 0)
                    precision_delta = metrics.get("precision_delta")
                    recall_delta = metrics.get("recall_delta")

                    html_parts.append(
                        f"""
                    <div class="metric-card">
                        <div class="metric-label">Window A Transactions</div>
                        <div class="metric-value">{window_a_tx:,}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Window B Transactions</div>
                        <div class="metric-value">{window_b_tx:,}</div>
                    </div>
                """
                    )

                    if precision_delta is not None:
                        delta_class = (
                            "delta-positive"
                            if precision_delta > 0
                            else "delta-negative" if precision_delta < 0 else "delta-neutral"
                        )
                        html_parts.append(
                            f"""
                    <div class="metric-card">
                        <div class="metric-label">Precision Delta</div>
                        <div class="metric-value {delta_class}">{precision_delta:+.3f}</div>
                    </div>
                    """
                        )

                    if recall_delta is not None:
                        delta_class = (
                            "delta-positive"
                            if recall_delta > 0
                            else "delta-negative" if recall_delta < 0 else "delta-neutral"
                        )
                        html_parts.append(
                            f"""
                    <div class="metric-card">
                        <div class="metric-label">Recall Delta</div>
                        <div class="metric-value {delta_class}">{recall_delta:+.3f}</div>
    </div>
                    """
                        )

                    html_parts.append("</div>")

                # Comparison response details
                if comparison_response:
                    html_parts.append(
                        """
                <details style="margin-top: 15px;">
                    <summary style="cursor: pointer; font-weight: 600; color: #3498db;">View Detailed Comparison Metrics</summary>
                    <div style="margin-top: 10px;">
                """
                    )

                    # Add key metrics from comparison response
                    if hasattr(comparison_response, "A") and hasattr(comparison_response, "B"):
                        html_parts.append(
                            """
                    <table>
                        <tr>
                            <th>Metric</th>
                            <th>Window A</th>
                            <th>Window B</th>
                        </tr>
                    """
                        )

                        metrics_to_show = [
                            ("Total Transactions", "total_transactions"),
                            ("Precision", "precision"),
                            ("Recall", "recall"),
                            ("F1 Score", "f1_score"),
                            ("Accuracy", "accuracy"),
                            ("Fraud Rate", "fraud_rate"),
                        ]

                        for label, attr in metrics_to_show:
                            val_a = getattr(comparison_response.A, attr, None)
                            val_b = getattr(comparison_response.B, attr, None)

                            if val_a is not None or val_b is not None:
                                html_parts.append(
                                    f"""
                        <tr>
                            <td>{label}</td>
                            <td>{val_a if val_a is not None else 'N/A'}</td>
                            <td>{val_b if val_b is not None else 'N/A'}</td>
                        </tr>
                            """
                                )

                        html_parts.append("</table>")

                    html_parts.append(
                        """
    </div>
                </details>
                """
                    )

                html_parts.append("</div>")

        html_parts.append(OLORIN_FOOTER)
        html_parts.append(
            """
    </div>
</body>
</html>
"""
        )

        return "".join(html_parts)

    def package_comparison_results(
        self, results: List[Dict[str, Any]], output_dir: Path
    ) -> Path:
        """Package comparison results into a ZIP file"""
        zip_path = (
            output_dir
            / f"comparison_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        )

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            # Add summary JSON
            summary = self.summarize_comparison_results(results)
            zipf.writestr("summary.json", json.dumps(summary, indent=2))

            # Add individual results
            for i, result in enumerate(results):
                zipf.writestr(
                    f"result_{i}.json", json.dumps(result, indent=2, default=str)
                )

        self.logger.info(f"✅ Comparison results packaged: {zip_path}")
        return zip_path
