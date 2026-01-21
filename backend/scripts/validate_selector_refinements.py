#!/usr/bin/env python3
"""
Validate Selector Refinements.

Compares selector behavior before and after score-based filtering refinements.
Tests on historical data to measure impact on precision, recall, and GMV coverage.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

os.environ["USE_FIREBASE_SECRETS"] = "false"

sys.path.insert(0, str(Path(__file__).parent.parent))


async def run_selector_comparison(reference_date: str) -> Dict[str, Any]:
    """Run selector with and without refinements to compare."""
    from app.service.analytics.risk_analyzer import RiskAnalyzer

    print(f"\n📅 Testing date: {reference_date}")
    os.environ["SELECTOR_REFERENCE_DATE"] = reference_date

    # Test WITHOUT refinements
    print("   🔄 Running selector WITHOUT score-based filtering...")
    os.environ["SELECTOR_ENABLE_SCORE_FILTERING"] = "false"
    analyzer_baseline = RiskAnalyzer()
    results_baseline = await analyzer_baseline.get_top_risk_entities(force_refresh=True)

    # Test WITH refinements
    print("   🔄 Running selector WITH score-based filtering...")
    os.environ["SELECTOR_ENABLE_SCORE_FILTERING"] = "true"
    analyzer_refined = RiskAnalyzer()
    results_refined = await analyzer_refined.get_top_risk_entities(force_refresh=True)

    if results_baseline.get("status") != "success" or results_refined.get("status") != "success":
        print("   ⚠️  One or both queries failed")
        return None

    baseline_entities = results_baseline.get("entities", [])
    refined_entities = results_refined.get("entities", [])

    baseline_summary = results_baseline.get("summary", {})
    refined_summary = results_refined.get("summary", {})

    comparison = {
        "date": reference_date,
        "baseline": {
            "entity_count": len(baseline_entities),
            "fraud_count": baseline_summary.get("total_fraud", 0),
            "total_transactions": baseline_summary.get("total_transactions", 0),
            "total_gmv": baseline_summary.get("total_amount", 0),
            "fraud_rate": baseline_summary.get("fraud_rate", 0),
        },
        "refined": {
            "entity_count": len(refined_entities),
            "fraud_count": refined_summary.get("total_fraud", 0),
            "total_transactions": refined_summary.get("total_transactions", 0),
            "total_gmv": refined_summary.get("total_amount", 0),
            "fraud_rate": refined_summary.get("fraud_rate", 0),
        },
    }

    # Calculate improvements
    if baseline_summary.get("total_fraud", 0) > 0:
        comparison["fraud_retention"] = (
            refined_summary.get("total_fraud", 0) / baseline_summary.get("total_fraud", 1) * 100
        )
    else:
        comparison["fraud_retention"] = 0

    comparison["entity_reduction"] = (
        (1 - len(refined_entities) / max(len(baseline_entities), 1)) * 100
    )

    comparison["precision_improvement"] = (
        refined_summary.get("fraud_rate", 0) - baseline_summary.get("fraud_rate", 0)
    )

    print(f"   ✅ Baseline: {len(baseline_entities)} entities, {baseline_summary.get('fraud_rate', 0):.2f}% fraud rate")
    print(f"   ✅ Refined: {len(refined_entities)} entities, {refined_summary.get('fraud_rate', 0):.2f}% fraud rate")
    print(f"   📊 Entity Reduction: {comparison['entity_reduction']:.1f}%")
    print(f"   📊 Fraud Retention: {comparison['fraud_retention']:.1f}%")
    print(f"   📊 Precision Δ: +{comparison['precision_improvement']:.2f}%")

    return comparison


async def main():
    """Execute validation workflow."""
    import argparse

    parser = argparse.ArgumentParser(description="Validate selector refinements")
    parser.add_argument(
        "--num-tests",
        type=int,
        default=3,
        help="Number of historical dates to test (default: 3)",
    )
    parser.add_argument(
        "--start-offset-months",
        type=int,
        default=12,
        help="Starting offset in months (default: 12)",
    )
    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("🔍 SELECTOR REFINEMENT VALIDATION")
    print("=" * 80)
    print(f"\n📋 Configuration:")
    print(f"   Test Periods: {args.num_tests}")
    print(f"   Starting Offset: {args.start_offset_months} months ago")
    print(f"   Min Score Threshold: {os.getenv('SELECTOR_MIN_SCORE_THRESHOLD', '0.15')}")
    print(f"   High Score Threshold: {os.getenv('SELECTOR_HIGH_SCORE_THRESHOLD', '0.70')}")
    print(f"   High Score Multiplier: {os.getenv('SELECTOR_HIGH_SCORE_WEIGHT_MULTIPLIER', '2.0')}")

    print(f"\n" + "=" * 80)
    print("RUNNING COMPARISON TESTS")
    print("=" * 80)

    base_date = datetime.now() - timedelta(days=30 * args.start_offset_months)
    comparisons = []

    for i in range(args.num_tests):
        reference_date = (base_date - timedelta(days=30 * i)).strftime("%Y-%m-%d")
        try:
            comparison = await run_selector_comparison(reference_date)
            if comparison:
                comparisons.append(comparison)
        except Exception as e:
            print(f"   ❌ Error: {e}")

    if not comparisons:
        print("\n❌ No successful comparisons. Exiting.")
        return 1

    print(f"\n" + "=" * 80)
    print("AGGREGATE VALIDATION RESULTS")
    print("=" * 80)

    avg_entity_reduction = sum(c["entity_reduction"] for c in comparisons) / len(comparisons)
    avg_fraud_retention = sum(c["fraud_retention"] for c in comparisons) / len(comparisons)
    avg_precision_improvement = sum(c["precision_improvement"] for c in comparisons) / len(comparisons)

    total_baseline_entities = sum(c["baseline"]["entity_count"] for c in comparisons)
    total_refined_entities = sum(c["refined"]["entity_count"] for c in comparisons)
    total_baseline_fraud = sum(c["baseline"]["fraud_count"] for c in comparisons)
    total_refined_fraud = sum(c["refined"]["fraud_count"] for c in comparisons)

    print(f"\n📊 Average Metrics ({len(comparisons)} periods):")
    print(f"   Entity Reduction: {avg_entity_reduction:.1f}%")
    print(f"   Fraud Retention: {avg_fraud_retention:.1f}%")
    print(f"   Precision Improvement: +{avg_precision_improvement:.2f}%")

    print(f"\n📊 Totals:")
    print(f"   Baseline: {total_baseline_entities:,} entities, {total_baseline_fraud} fraud")
    print(f"   Refined: {total_refined_entities:,} entities, {total_refined_fraud} fraud")
    print(f"   Entities Saved: {total_baseline_entities - total_refined_entities:,} ({avg_entity_reduction:.1f}%)")
    print(f"   Fraud Preserved: {total_refined_fraud}/{total_baseline_fraud} ({avg_fraud_retention:.1f}%)")

    baseline_precision = (
        total_baseline_fraud / total_baseline_entities * 100
        if total_baseline_entities > 0
        else 0
    )
    refined_precision = (
        total_refined_fraud / total_refined_entities * 100
        if total_refined_entities > 0
        else 0
    )

    print(f"\n📊 Overall Precision:")
    print(f"   Baseline: {baseline_precision:.2f}%")
    print(f"   Refined: {refined_precision:.2f}%")
    print(f"   Improvement: +{refined_precision - baseline_precision:.2f}%")

    print(f"\n" + "=" * 80)
    print("RECOMMENDATION")
    print("=" * 80)

    if avg_precision_improvement > 0.1 and avg_fraud_retention > 90:
        print("✅ APPROVE: Refinements improve precision while retaining fraud coverage")
        print("   Recommendation: Keep SELECTOR_ENABLE_SCORE_FILTERING=true")
    elif avg_precision_improvement > 0.05:
        print("⚠️  CONDITIONAL: Minor precision improvement")
        print("   Recommendation: Monitor in production, may need threshold tuning")
    else:
        print("❌ REJECT: Insufficient improvement or excessive fraud loss")
        print("   Recommendation: Adjust thresholds or disable score filtering")

    artifacts_dir = os.getenv("ARTIFACTS_DIR", "olorin-server/artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"{artifacts_dir}/validation_report_{timestamp}.txt"

    with open(report_path, "w") as f:
        f.write("SELECTOR REFINEMENT VALIDATION REPORT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Configuration:\n")
        f.write(f"  Min Score Threshold: {os.getenv('SELECTOR_MIN_SCORE_THRESHOLD')}\n")
        f.write(f"  High Score Threshold: {os.getenv('SELECTOR_HIGH_SCORE_THRESHOLD')}\n")
        f.write(f"  High Score Multiplier: {os.getenv('SELECTOR_HIGH_SCORE_WEIGHT_MULTIPLIER')}\n\n")
        f.write(f"Results:\n")
        f.write(f"  Entity Reduction: {avg_entity_reduction:.1f}%\n")
        f.write(f"  Fraud Retention: {avg_fraud_retention:.1f}%\n")
        f.write(f"  Precision Improvement: +{avg_precision_improvement:.2f}%\n")
        f.write(f"  Overall Precision: {baseline_precision:.2f}% → {refined_precision:.2f}%\n")

    print(f"\n📁 Report exported to: {report_path}")

    print(f"\n" + "=" * 80)
    print("✅ VALIDATION COMPLETE")
    print("=" * 80)

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
