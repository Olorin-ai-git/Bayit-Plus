import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)



class MetricsVisualizer:
    """Generate visual reports from fraud detection metrics."""

    def __init__(
        self, metrics_file: str = "logs/metrics.json", report_dir: str = "reports"
    ):
        self.metrics_file = Path(metrics_file)
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(self, lookback_hours: int = 24) -> str:
        """Generate an HTML report with visualizations of the metrics."""
        # Load historical metrics
        metrics_data = self._load_metrics_history(lookback_hours)
        if not metrics_data:
            return ""

        # Create a subplot figure
        fig = make_subplots(
            rows=3,
            cols=2,
            subplot_titles=(
                "Risk Events Over Time",
                "Risk Score Distribution",
                "Most Common Risk Factors",
                "Error Rate",
                "Risk Score Trends",
                "Event Volume",
            ),
        )

        # Convert metrics to pandas DataFrame for easier manipulation
        df = pd.DataFrame(metrics_data)
        df["timestamp"] = pd.to_datetime(df["timestamp"])

        # Plot 1: Risk Events Over Time
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["high_risk_events"],
                name="High Risk Events",
                line=dict(color="red"),
            ),
            row=1,
            col=1,
        )

        # Plot 2: Risk Score Distribution
        fig.add_trace(
            go.Histogram(
                x=df["avg_risk_score"],
                name="Risk Score Distribution",
                nbinsx=20,
                marker_color="orange",
            ),
            row=1,
            col=2,
        )

        # Plot 3: Most Common Risk Factors (from latest metrics)
        latest_risks = metrics_data[-1]["most_common_risks"]
        risk_labels = [risk[0] for risk in latest_risks]
        risk_counts = [risk[1] for risk in latest_risks]
        fig.add_trace(
            go.Bar(
                x=risk_labels, y=risk_counts, name="Risk Factors", marker_color="red"
            ),
            row=2,
            col=1,
        )

        # Plot 4: Error Rate
        error_rate = df["error_count"] / df["total_events"] * 100
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=error_rate,
                name="Error Rate (%)",
                line=dict(color="purple"),
            ),
            row=2,
            col=2,
        )

        # Plot 5: Risk Score Trends
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["avg_risk_score"],
                name="Average Risk Score",
                line=dict(color="red"),
            ),
            row=3,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["risk_score_stddev"],
                name="Risk Score StdDev",
                line=dict(color="orange"),
                visible="legendonly",
            ),
            row=3,
            col=1,
        )

        # Plot 6: Event Volume
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["total_events"],
                name="Total Events",
                line=dict(color="blue"),
            ),
            row=3,
            col=2,
        )

        # Update layout
        fig.update_layout(
            height=1200,
            width=1600,
            showlegend=True,
            title_text=f"Fraud Detection Metrics Report ({lookback_hours}h)",
        )

        # Save the report
        report_path = (
            self.report_dir
            / f"metrics_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.html"
        )
        fig.write_html(str(report_path))

        return str(report_path)

    def _load_metrics_history(self, lookback_hours: int) -> List[Dict[str, Any]]:
        """Load historical metrics from the metrics file."""
        try:
            if not self.metrics_file.exists():
                return []

            with open(self.metrics_file) as f:
                metrics_data = json.load(f)

            # Convert single metrics to list if necessary
            if not isinstance(metrics_data, list):
                metrics_data = [metrics_data]

            # Filter by lookback period
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
            return [
                m
                for m in metrics_data
                if datetime.fromisoformat(m["timestamp"]) > cutoff_time
            ]

        except Exception as e:
            logger.error(f"Error loading metrics history: {e}")
            return []
