#!/usr/bin/env python3
"""
Analyze Model Score Distribution for Fraud vs Safe Transactions.

Based on Ziv's suggestion: Create statistical visualization showing
GMV distribution across model score buckets to inform selection algorithm.

Specifications:
- X-axis: Model score (0-1) divided into 20 buckets
- Y-axis: Sum of GMV (USD)
- Two distributions: Fraudulent txs (red) vs Safe txs (green)
- Population: All APPROVED transactions from a specific 24-hour period
- Default time period: 1 year ago from current date

Configuration via environment variables (reuses selector configuration):
- SELECTOR_REFERENCE_DATE: Specific date to analyze (YYYY-MM-DD)
- SELECTOR_TIME_WINDOW_HOURS: Window size in hours (default: 24)
- SELECTOR_HISTORICAL_OFFSET_MONTHS: Months to look back (default: 12)
- ANALYSIS_NUM_BUCKETS: Number of score buckets (default: 20)
- DATABASE_PROVIDER: Database to query (snowflake or postgresql)
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

os.environ["USE_FIREBASE_SECRETS"] = "false"

sys.path.insert(0, str(Path(__file__).parent.parent))


def print_summary(analysis: dict):
    """Print analysis summary to console."""
    print("\n" + "=" * 80)
    print("📊 MODEL SCORE DISTRIBUTION ANALYSIS - SUMMARY")
    print("=" * 80)

    summary = analysis.get("summary", {})
    print(f"\n📋 Overall Statistics:")
    print(f"   Total Fraud GMV: ${summary.get('total_fraud_gmv', 0):,.2f}")
    print(f"   Total Safe GMV: ${summary.get('total_safe_gmv', 0):,.2f}")
    print(f"   Total Fraud Transactions: {summary.get('total_fraud_count', 0):,}")
    print(f"   Total Safe Transactions: {summary.get('total_safe_count', 0):,}")
    print(f"   Fraud Rate: {summary.get('fraud_percentage', 0):.2f}%")
    print(f"   Number of Buckets: {summary.get('num_buckets', 0)}")

    buckets = analysis.get("buckets", [])
    if buckets:
        print(f"\n📊 Distribution by Score Bucket:")
        print("=" * 80)
        print(
            f"{'Bucket Range':<15} {'Fraud GMV':<15} {'Safe GMV':<15} {'Fraud %':<10} {'Total Txs':<10}"
        )
        print("-" * 80)

        for bucket in buckets:
            bucket_range = f"{bucket['bucket_min']:.2f}-{bucket['bucket_max']:.2f}"
            fraud_gmv = bucket["fraud_gmv"]
            safe_gmv = bucket["safe_gmv"]
            total_count = bucket["fraud_count"] + bucket["safe_count"]
            fraud_pct = (
                (bucket["fraud_count"] / total_count * 100) if total_count > 0 else 0
            )

            print(
                f"{bucket_range:<15} ${fraud_gmv:<14,.2f} ${safe_gmv:<14,.2f} {fraud_pct:<9.2f}% {total_count:<10,}"
            )

        if analysis.get("csv_export_path"):
            print(f"\n📁 CSV Export: {analysis['csv_export_path']}")

        if analysis.get("plot_path"):
            print(f"📈 Visualization: {analysis['plot_path']}")


def create_visualization(analysis: dict) -> str:
    """Create matplotlib visualization of the distribution."""
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("⚠️  matplotlib not available. Install with: pip install matplotlib")
        return None

    buckets = analysis.get("buckets", [])
    if not buckets:
        print("⚠️  No buckets to visualize")
        return None

    bucket_labels = [
        f"{b['bucket_min']:.2f}-{b['bucket_max']:.2f}" for b in buckets
    ]
    fraud_gmv = [b["fraud_gmv"] for b in buckets]
    safe_gmv = [b["safe_gmv"] for b in buckets]

    x = np.arange(len(bucket_labels))
    width = 0.35

    fig, ax = plt.subplots(figsize=(16, 8))

    bars1 = ax.bar(
        x - width / 2, fraud_gmv, width, label="Fraud GMV", color="red", alpha=0.7
    )
    bars2 = ax.bar(
        x + width / 2, safe_gmv, width, label="Safe GMV", color="green", alpha=0.7
    )

    ax.set_xlabel("Model Score Bucket", fontsize=12, fontweight="bold")
    ax.set_ylabel("Total GMV ($)", fontsize=12, fontweight="bold")
    ax.set_title(
        "Model Score Distribution: Fraud vs Safe Transactions (Approved Only)",
        fontsize=14,
        fontweight="bold",
    )
    ax.set_xticks(x)
    ax.set_xticklabels(bucket_labels, rotation=45, ha="right")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()

    artifacts_dir = os.getenv("ARTIFACTS_DIR", "olorin-server/artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    plot_path = f"{artifacts_dir}/score_distribution_{timestamp}.png"

    plt.savefig(plot_path, dpi=150, bbox_inches="tight")
    print(f"📈 Visualization saved to: {plot_path}")

    plt.close()
    return plot_path


async def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Analyze model score distribution for fraud detection"
    )
    parser.add_argument(
        "--reference-date",
        help="Reference date for analysis (YYYY-MM-DD). Default: 1 year ago",
    )
    parser.add_argument(
        "--time-window-hours",
        type=int,
        help="Time window in hours (default: 24)",
    )
    parser.add_argument(
        "--num-buckets",
        type=int,
        help="Number of score buckets (default: 20)",
    )
    parser.add_argument(
        "--no-csv",
        action="store_true",
        help="Skip CSV export",
    )
    parser.add_argument(
        "--no-plot",
        action="store_true",
        help="Skip visualization plot",
    )
    args = parser.parse_args()

    if args.reference_date:
        os.environ["SELECTOR_REFERENCE_DATE"] = args.reference_date
    if args.time_window_hours:
        os.environ["SELECTOR_TIME_WINDOW_HOURS"] = str(args.time_window_hours)
    if args.num_buckets:
        os.environ["ANALYSIS_NUM_BUCKETS"] = str(args.num_buckets)

    print("\n" + "=" * 80)
    print("🔍 MODEL SCORE DISTRIBUTION ANALYZER")
    print("=" * 80)
    print(f"\n📋 Configuration:")
    lookback_months = int(os.getenv("SELECTOR_HISTORICAL_OFFSET_MONTHS", "12"))
    reference_date = os.getenv("SELECTOR_REFERENCE_DATE")
    if reference_date:
        print(f"   Reference Date: {reference_date}")
    else:
        print(f"   Reference Date: {lookback_months} months ago (default)")
    print(
        f"   Time Window: {os.getenv('SELECTOR_TIME_WINDOW_HOURS', '24')} hours"
    )
    print(f"   Score Buckets: {os.getenv('ANALYSIS_NUM_BUCKETS', '20')}")
    print(
        f"   Database Provider: {os.getenv('DATABASE_PROVIDER', 'snowflake').upper()}"
    )

    try:
        from app.service.analytics.score_distribution_analyzer import (
            ScoreDistributionAnalyzer,
        )

        print(f"\n🔗 Initializing analyzer...")
        analyzer = ScoreDistributionAnalyzer()

        print(f"\n📊 Running distribution analysis...")
        analysis = await analyzer.analyze_distribution(export_csv=not args.no_csv)

        if analysis.get("status") == "failed":
            print(f"\n❌ Analysis failed: {analysis.get('error')}")
            return 1

        print_summary(analysis)

        if not args.no_plot:
            print(f"\n📈 Creating visualization...")
            plot_path = create_visualization(analysis)
            if plot_path:
                analysis["plot_path"] = plot_path

        print(f"\n" + "=" * 80)
        print("✅ Analysis Complete!")
        print("=" * 80)
        print(
            f"\n💡 Next Steps:\n   1. Review the CSV export for detailed data\n   2. Examine the visualization to identify optimal thresholds\n   3. Use insights to refine selector algorithm in risk_analyzer.py"
        )

        return 0

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
