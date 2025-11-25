#!/usr/bin/env python3
"""
Test Prediction Quality Validation with Live Data

Finds two investigations for the same entity and validates prediction quality,
then generates an HTML report.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import list_investigations
from app.service.investigation.html_report_generator import generate_html_report
from app.service.investigation.investigation_comparison_service import (
    compare_investigations,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def find_investigations_to_compare():
    """Find two investigations for the same entity with risk scores."""
    investigations = list_investigations()
    logger.info(f"Found {len(investigations)} total investigations")

    # Filter for investigations with entity, time windows, AND risk scores
    valid_investigations = []
    for inv in investigations:
        inv_dict = (
            inv
            if isinstance(inv, dict)
            else inv.__dict__ if hasattr(inv, "__dict__") else {}
        )
        risk_score = inv_dict.get("overall_risk_score")
        if (
            inv_dict.get("entity_type")
            and inv_dict.get("entity_id")
            and inv_dict.get("from_date")
            and inv_dict.get("to_date")
            and risk_score is not None
            and risk_score > 0
        ):
            valid_investigations.append(
                {
                    "id": inv_dict.get("id"),
                    "entity_type": inv_dict.get("entity_type"),
                    "entity_id": inv_dict.get("entity_id"),
                    "from_date": inv_dict.get("from_date"),
                    "to_date": inv_dict.get("to_date"),
                    "overall_risk_score": risk_score,
                }
            )

    logger.info(f"Found {len(valid_investigations)} investigations with risk scores")

    if len(valid_investigations) < 2:
        logger.warning(
            "Need at least 2 investigations with risk scores. Checking all investigations..."
        )
        # Fallback: use any investigations with entity and time windows
        fallback_investigations = []
        for inv in investigations:
            inv_dict = (
                inv
                if isinstance(inv, dict)
                else inv.__dict__ if hasattr(inv, "__dict__") else {}
            )
            if (
                inv_dict.get("entity_type")
                and inv_dict.get("entity_id")
                and inv_dict.get("from_date")
                and inv_dict.get("to_date")
            ):
                fallback_investigations.append(
                    {
                        "id": inv_dict.get("id"),
                        "entity_type": inv_dict.get("entity_type"),
                        "entity_id": inv_dict.get("entity_id"),
                        "from_date": inv_dict.get("from_date"),
                        "to_date": inv_dict.get("to_date"),
                        "overall_risk_score": inv_dict.get("overall_risk_score"),
                    }
                )

        if len(fallback_investigations) < 2:
            logger.error("Need at least 2 investigations with entity and time windows")
            return None, None

        valid_investigations = fallback_investigations

    # Group by entity to find pairs
    from collections import defaultdict

    by_entity = defaultdict(list)
    for inv in valid_investigations:
        key = f"{inv['entity_type']}:{inv['entity_id']}"
        by_entity[key].append(inv)

    # Find entities with multiple investigations
    for entity_key, invs in by_entity.items():
        if len(invs) >= 2:
            # Sort by date
            invs_sorted = sorted(
                invs, key=lambda x: x["from_date"] if x["from_date"] else ""
            )
            logger.info(f"Entity {entity_key} has {len(invs)} investigations")
            for inv in invs_sorted[:2]:
                logger.info(
                    f"  - {inv['id']}: {inv['from_date']} to {inv['to_date']}, risk={inv.get('overall_risk_score', 'N/A')}"
                )
            return invs_sorted[0]["id"], invs_sorted[1]["id"]

    # If no entity has multiple investigations, use first two
    logger.info("No entity with multiple investigations. Using first two:")
    logger.info(
        f"  - {valid_investigations[0]['id']}: {valid_investigations[0]['entity_type']}:{valid_investigations[0]['entity_id']}"
    )
    logger.info(
        f"  - {valid_investigations[1]['id']}: {valid_investigations[1]['entity_type']}:{valid_investigations[1]['entity_id']}"
    )
    return valid_investigations[0]["id"], valid_investigations[1]["id"]


async def test_prediction_quality():
    """Test prediction quality validation with live data."""
    logger.info("=" * 60)
    logger.info("Testing Prediction Quality Validation")
    logger.info("=" * 60)

    # Find investigations to compare
    inv_id_a, inv_id_b = await find_investigations_to_compare()

    if not inv_id_a or not inv_id_b:
        logger.error("Could not find suitable investigations to compare")
        return None

    logger.info(f"\nComparing investigations:")
    logger.info(f"  Investigation A: {inv_id_a}")
    logger.info(f"  Investigation B: {inv_id_b}")

    try:
        # Run comparison
        result = await compare_investigations(inv_id_a, inv_id_b)

        logger.info("\n" + "=" * 60)
        logger.info("Comparison Results:")
        logger.info("=" * 60)
        logger.info(json.dumps(result, indent=2, default=str))

        # Check if prediction quality validation succeeded
        prediction_quality = result.get("prediction_quality")
        if not prediction_quality:
            logger.warning(
                "Prediction quality validation returned None - investigation may not have risk score"
            )
            logger.info("Result structure:")
            logger.info(json.dumps(result, indent=2, default=str))
            return {
                "status": "warning",
                "message": "Prediction quality validation could not be performed - investigation may not have risk score",
                "result": result,
            }

        # Generate HTML report
        logger.info("\n" + "=" * 60)
        logger.info("Generating HTML Report...")
        logger.info("=" * 60)

        # Create a ComparisonResponse-like structure for HTML generation
        # The HTML generator expects a ComparisonResponse, but we have investigation comparison results
        # For now, we'll create a simplified report
        html_content = generate_investigation_comparison_html_report(result)

        # Save HTML report
        validated_inv = result.get("investigation_validated", {})
        entity_type = validated_inv.get("entity_type", "unknown")
        entity_id = validated_inv.get("entity_id", "unknown")
        inv_id = validated_inv.get("id", "unknown")

        # Create safe filename
        entity_slug = entity_id.replace("@", "-").replace(".", "-")[:30]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = (
            f"prediction_quality_{entity_type}_{entity_slug}_{inv_id}_{timestamp}.html"
        )

        artifacts_dir = Path("artifacts")
        artifacts_dir.mkdir(exist_ok=True)
        report_path = artifacts_dir / filename

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"\n✅ HTML report saved: {report_path}")
        logger.info(f"   File size: {len(html_content)} bytes")

        return {
            "status": "success",
            "result": result,
            "html_report_path": str(report_path),
        }

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


def generate_investigation_comparison_html_report(result: dict) -> str:
    """Generate HTML report for investigation comparison results."""
    validated_inv = result.get("investigation_validated", {})
    recent_inv = result.get("investigation_recent", {})
    prediction_quality = result.get("prediction_quality") or {}
    summary = result.get("summary", "")

    validated_metrics = validated_inv.get("metrics", {})
    recent_metrics = recent_inv.get("metrics", {})

    entity_type = validated_inv.get("entity_type", "unknown")
    entity_id = validated_inv.get("entity_id", "unknown")

    predicted_risk = validated_metrics.get("overall_risk_score", 0) or 0
    actual_fraud_rate = (
        prediction_quality.get("actual_fraud_rate") if prediction_quality else None
    )
    prediction_accurate = (
        prediction_quality.get("prediction_accurate") if prediction_quality else None
    )
    prediction_error = (
        prediction_quality.get("prediction_error", 0) if prediction_quality else None
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prediction Quality Validation Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 2rem;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        h1 {{
            color: #00ff88;
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }}
        .subtitle {{
            color: #888;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }}
        .summary-box {{
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-left: 4px solid #00ff88;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        .metric-card {{
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5rem;
        }}
        .metric-card h3 {{
            color: #00ff88;
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }}
        .metric-value {{
            font-size: 2.5rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.5rem;
        }}
        .metric-label {{
            color: #888;
            font-size: 0.9rem;
        }}
        .prediction-status {{
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            font-weight: 600;
        }}
        .prediction-accurate {{
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            color: #00ff88;
        }}
        .prediction-inaccurate {{
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid #ff6464;
            color: #ff6464;
        }}
        .comparison-section {{
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }}
        .comparison-section h2 {{
            color: #00ff88;
            margin-bottom: 1rem;
        }}
        .chart-container {{
            background: #0f0f0f;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            height: 400px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }}
        th, td {{
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #333;
        }}
        th {{
            color: #00ff88;
            font-weight: 600;
        }}
        .domain-metrics {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }}
        .domain-metric {{
            background: #0f0f0f;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #333;
        }}
        .domain-metric h4 {{
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }}
        .domain-metric .value {{
            font-size: 1.5rem;
            font-weight: 700;
            color: #fff;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Prediction Quality Validation Report</h1>
        <div class="subtitle">Entity: {entity_type}:{entity_id}</div>
        
        <div class="summary-box">
            <h2>Summary</h2>
            <p>{summary}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Predicted Risk Score</h3>
                <div class="metric-value">{predicted_risk:.2f}</div>
                <div class="metric-label">Investigation: {validated_inv.get('id', 'N/A')}</div>
            </div>
            
            <div class="metric-card">
                <h3>Actual Fraud Rate</h3>
                <div class="metric-value">{actual_fraud_rate:.2% if actual_fraud_rate is not None else 'N/A'}</div>
                <div class="metric-label">Validation Period: {prediction_quality.get('validation_period', {}).get('start', 'N/A')} to {prediction_quality.get('validation_period', {}).get('end', 'N/A')}</div>
            </div>
            
            <div class="metric-card">
                <h3>Prediction Error</h3>
                <div class="metric-value">{prediction_error:.2f if prediction_error else 'N/A'}</div>
                <div class="metric-label">Absolute difference</div>
            </div>
            
            <div class="metric-card">
                <h3>Prediction Accuracy</h3>
                <div class="metric-value">{'✅ ACCURATE' if prediction_accurate else '⚠️ INACCURATE' if prediction_accurate is False else 'N/A'}</div>
                <div class="metric-label">High/Low risk prediction</div>
                <div class="prediction-status {'prediction-accurate' if prediction_accurate else 'prediction-inaccurate' if prediction_accurate is False else ''}">
                    {f"Predicted {'HIGH' if prediction_quality.get('predicted_high_risk') else 'LOW'} risk, Actual {'HIGH' if prediction_quality.get('actual_high_fraud') else 'LOW'} fraud" if prediction_quality.get('predicted_high_risk') is not None else 'N/A'}
                </div>
            </div>
        </div>
        
        <div class="comparison-section">
            <h2>Investigation Details</h2>
            <div class="domain-metrics">
                <div class="domain-metric">
                    <h4>Device Risk</h4>
                    <div class="value">{validated_metrics.get('device_risk_score', 0):.2f}</div>
                </div>
                <div class="domain-metric">
                    <h4>Location Risk</h4>
                    <div class="value">{validated_metrics.get('location_risk_score', 0):.2f}</div>
                </div>
                <div class="domain-metric">
                    <h4>Network Risk</h4>
                    <div class="value">{validated_metrics.get('network_risk_score', 0):.2f}</div>
                </div>
                <div class="domain-metric">
                    <h4>Logs Risk</h4>
                    <div class="value">{validated_metrics.get('logs_risk_score', 0):.2f}</div>
                </div>
            </div>
        </div>
        
        <div class="comparison-section">
            <h2>Validation Period Statistics</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Total Transactions</td>
                    <td>{prediction_quality.get('actual_transaction_count', 0)}</td>
                </tr>
                <tr>
                    <td>Labeled Transactions</td>
                    <td>{prediction_quality.get('actual_labeled_count', 0)}</td>
                </tr>
                <tr>
                    <td>Fraud Count</td>
                    <td>{prediction_quality.get('actual_fraud_count', 0)}</td>
                </tr>
                <tr>
                    <td>Fraud Rate</td>
                    <td>{prediction_quality.get('actual_fraud_rate', 0):.2% if prediction_quality.get('actual_fraud_rate') is not None else 'N/A'}</td>
                </tr>
                <tr>
                    <td>Validation Quality</td>
                    <td>{prediction_quality.get('validation_quality', 'unknown').upper()}</td>
                </tr>
            </table>
        </div>
        
        <div class="comparison-section">
            <h2>Prediction vs Actual Comparison</h2>
            <div class="chart-container">
                <canvas id="predictionChart"></canvas>
            </div>
        </div>
    </div>
    
    <script>
        const ctx = document.getElementById('predictionChart').getContext('2d');
        const predictedRisk = {predicted_risk};
        const actualFraudRate = {actual_fraud_rate if actual_fraud_rate is not None else 0};
        
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: ['Predicted Risk', 'Actual Fraud Rate'],
                datasets: [{{
                    label: 'Risk Score / Fraud Rate',
                    data: [predictedRisk, actualFraudRate],
                    backgroundColor: [
                        'rgba(0, 255, 136, 0.6)',
                        'rgba(255, 100, 100, 0.6)'
                    ],
                    borderColor: [
                        '#00ff88',
                        '#ff6464'
                    ],
                    borderWidth: 2
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        display: false
                    }},
                    title: {{
                        display: true,
                        text: 'Predicted Risk vs Actual Fraud Rate',
                        color: '#e0e0e0',
                        font: {{
                            size: 18
                        }}
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        max: 1.0,
                        ticks: {{
                            color: '#888',
                            callback: function(value) {{
                                return (value * 100).toFixed(0) + '%';
                            }}
                        }},
                        grid: {{
                            color: '#333'
                        }}
                    }},
                    x: {{
                        ticks: {{
                            color: '#888'
                        }},
                        grid: {{
                            color: '#333'
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>"""

    return html


if __name__ == "__main__":
    result = asyncio.run(test_prediction_quality())
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    print(json.dumps(result, indent=2, default=str))

    if result and result.get("status") == "success":
        print(f"\n✅ HTML report generated: {result.get('html_report_path')}")
        sys.exit(0)
    else:
        print(f"\n❌ Test failed")
        sys.exit(1)
