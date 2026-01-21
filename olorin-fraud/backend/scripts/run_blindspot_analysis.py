#!/usr/bin/env python3
"""
Blindspot Analysis Runner Script.

Runs the 2D distribution analysis of FN/FP/TP/TN across GMV × MODEL_SCORE bins
to identify nSure model blind spots that Olorin should focus on.

Usage:
    poetry run python scripts/run_blindspot_analysis.py

Environment Variables:
    BLINDSPOT_SCORE_BINS: Number of score bins (default: 20)
    BLINDSPOT_GMV_BINS: Comma-separated GMV boundaries (default: 0,50,100,250,500,1000,5000)
    BLINDSPOT_LOOKBACK_MONTHS: Analysis lookback period (default: 12)
    RISK_THRESHOLD_DEFAULT: Olorin's trained threshold (required)
    LLM_PROMPT_ACTIVE_VERSION: Active prompt version (required)

Feature: blindspot-analysis
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add the app directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def main():
    """Run the blindspot analysis."""
    print("=" * 60)
    print("nSure Model Blindspot Analysis")
    print("2D Distribution: GMV × MODEL_SCORE with FN/FP/TP/TN")
    print("=" * 60)

    # Import after dotenv load to ensure environment is configured
    from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer

    # Initialize analyzer
    analyzer = ModelBlindspotAnalyzer()

    # Run analysis
    print("\nRunning blindspot analysis...")
    result = await analyzer.analyze_blindspots(export_csv=True)

    # Handle results
    if result.get("status") == "failed":
        print(f"\nAnalysis failed: {result.get('error')}")
        return 1

    # Print summary
    _print_summary(result)

    # Export JSON for frontend
    json_path = _export_json(result)
    print(f"\nJSON exported to: {json_path}")

    if result.get("csv_export_path"):
        print(f"CSV exported to: {result['csv_export_path']}")

    return 0


def _print_summary(result: dict):
    """Print analysis summary to console."""
    training_info = result.get("training_info", {})
    summary = result.get("summary", {})
    blindspots = result.get("blindspots", [])
    matrix = result.get("matrix", {})

    print("\n" + "=" * 60)
    print("ANALYSIS SUMMARY")
    print("=" * 60)

    print(f"\nTraining Configuration:")
    print(f"  Olorin Threshold: {training_info.get('olorin_threshold', 'N/A')}")
    print(f"  Prompt Version: {training_info.get('prompt_version', 'N/A')}")
    print(f"  LLM Fraud Threshold: {training_info.get('llm_fraud_threshold', 'N/A')}")

    print(f"\nMatrix Dimensions:")
    print(f"  Score Bins: {len(matrix.get('score_bins', []))}")
    print(f"  GMV Bins: {len(matrix.get('gmv_bins', []))}")
    print(f"  Total Cells: {len(matrix.get('cells', []))}")

    print(f"\nOverall Metrics:")
    print(f"  Total Transactions: {summary.get('total_transactions', 0):,}")
    print(f"  Total Fraud: {summary.get('total_fraud', 0):,}")
    print(f"  Fraud GMV: ${summary.get('total_fraud_gmv', 0):,.2f}")
    print(f"  Overall Precision: {summary.get('overall_precision', 0)*100:.2f}%")
    print(f"  Overall Recall: {summary.get('overall_recall', 0)*100:.2f}%")
    print(f"  Overall F1: {summary.get('overall_f1', 0)*100:.2f}%")

    if blindspots:
        print(f"\nIdentified Blind Spots ({len(blindspots)} found):")
        for i, bs in enumerate(blindspots[:5], 1):
            print(f"  {i}. Score: {bs['score_bin']}, GMV: ${bs['gmv_bin']}")
            print(f"     FN Rate: {bs['fn_rate']*100:.1f}% ({bs['fn_count']} missed)")
            print(f"     {bs['recommendation']}")
    else:
        print("\nNo significant blind spots identified.")


def _export_json(result: dict) -> str:
    """Export analysis to JSON file for frontend."""
    artifacts_dir = os.getenv("ARTIFACTS_DIR", "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = f"{artifacts_dir}/blindspot_heatmap_{timestamp}.json"

    with open(json_path, "w") as f:
        json.dump(result, f, indent=2, default=str)

    return json_path


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
