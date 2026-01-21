#!/usr/bin/env python3
"""
Multi-Period Score Distribution Analysis.

Runs distribution analysis across multiple historical periods to identify
consistent patterns and inform selector algorithm optimization.

Steps:
1. Run analysis for 12 monthly periods
2. Aggregate results to identify fraud concentration patterns
3. Calculate optimal thresholds based on ROI
4. Generate recommendations for risk_analyzer.py refinement
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

os.environ["USE_FIREBASE_SECRETS"] = "false"

sys.path.insert(0, str(Path(__file__).parent.parent))


async def run_single_period_analysis(reference_date: str) -> Dict[str, Any]:
    """Run distribution analysis for a single period."""
    from app.service.analytics.score_distribution_analyzer import (
        ScoreDistributionAnalyzer,
    )

    os.environ["SELECTOR_REFERENCE_DATE"] = reference_date

    analyzer = ScoreDistributionAnalyzer()
    analysis = await analyzer.analyze_distribution(export_csv=False)

    return analysis


def aggregate_results(analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate multi-period analysis results."""
    print("\n" + "=" * 80)
    print("📊 AGGREGATING MULTI-PERIOD RESULTS")
    print("=" * 80)

    all_buckets = {}

    for analysis in analyses:
        if analysis.get("status") != "success":
            continue

        for bucket in analysis.get("buckets", []):
            bucket_key = f"{bucket['bucket_min']:.2f}-{bucket['bucket_max']:.2f}"

            if bucket_key not in all_buckets:
                all_buckets[bucket_key] = {
                    "bucket_min": bucket["bucket_min"],
                    "bucket_max": bucket["bucket_max"],
                    "total_fraud_gmv": 0,
                    "total_safe_gmv": 0,
                    "total_fraud_count": 0,
                    "total_safe_count": 0,
                    "periods": 0,
                }

            all_buckets[bucket_key]["total_fraud_gmv"] += bucket["fraud_gmv"]
            all_buckets[bucket_key]["total_safe_gmv"] += bucket["safe_gmv"]
            all_buckets[bucket_key]["total_fraud_count"] += bucket["fraud_count"]
            all_buckets[bucket_key]["total_safe_count"] += bucket["safe_count"]
            all_buckets[bucket_key]["periods"] += 1

    sorted_buckets = sorted(all_buckets.values(), key=lambda x: x["bucket_min"])

    total_fraud_gmv = sum(b["total_fraud_gmv"] for b in sorted_buckets)
    total_safe_gmv = sum(b["total_safe_gmv"] for b in sorted_buckets)
    total_fraud_count = sum(b["total_fraud_count"] for b in sorted_buckets)
    total_safe_count = sum(b["total_safe_count"] for b in sorted_buckets)

    for bucket in sorted_buckets:
        total_count = bucket["total_fraud_count"] + bucket["total_safe_count"]
        bucket["avg_fraud_rate"] = (
            bucket["total_fraud_count"] / total_count * 100 if total_count > 0 else 0
        )
        bucket["fraud_gmv_concentration"] = (
            bucket["total_fraud_gmv"] / total_fraud_gmv * 100
            if total_fraud_gmv > 0
            else 0
        )
        bucket["safe_gmv_concentration"] = (
            bucket["total_safe_gmv"] / total_safe_gmv * 100
            if total_safe_gmv > 0
            else 0
        )

    return {
        "buckets": sorted_buckets,
        "summary": {
            "total_fraud_gmv": total_fraud_gmv,
            "total_safe_gmv": total_safe_gmv,
            "total_fraud_count": total_fraud_count,
            "total_safe_count": total_safe_count,
            "baseline_fraud_rate": (
                total_fraud_count / (total_fraud_count + total_safe_count) * 100
                if (total_fraud_count + total_safe_count) > 0
                else 0
            ),
        },
    }


def calculate_roi_thresholds(aggregated: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate ROI for different score thresholds."""
    print("\n" + "=" * 80)
    print("💰 CALCULATING ROI BY THRESHOLD")
    print("=" * 80)

    investigation_cost = float(os.getenv("INVESTIGATION_COST_PER_ENTITY", "50"))
    fraud_recovery_rate = float(os.getenv("FRAUD_RECOVERY_RATE", "0.30"))

    print(f"\n📋 Assumptions:")
    print(f"   Investigation Cost per Entity: ${investigation_cost:.2f}")
    print(f"   Fraud Recovery Rate: {fraud_recovery_rate*100:.0f}%")

    thresholds = [0.40, 0.50, 0.60, 0.70, 0.75, 0.80, 0.85]
    roi_results = []

    for threshold in thresholds:
        entities_above_threshold = 0
        fraud_gmv_above = 0
        safe_gmv_above = 0
        fraud_count_above = 0
        safe_count_above = 0

        for bucket in aggregated["buckets"]:
            if bucket["bucket_min"] >= threshold:
                entities_above_threshold += (
                    bucket["total_fraud_count"] + bucket["total_safe_count"]
                )
                fraud_gmv_above += bucket["total_fraud_gmv"]
                safe_gmv_above += bucket["total_safe_gmv"]
                fraud_count_above += bucket["total_fraud_count"]
                safe_count_above += bucket["total_safe_count"]

        if entities_above_threshold == 0:
            continue

        expected_fraud_recovery = fraud_gmv_above * fraud_recovery_rate
        investigation_total_cost = entities_above_threshold * investigation_cost
        net_value = expected_fraud_recovery - investigation_total_cost
        roi = (net_value / investigation_total_cost * 100) if investigation_total_cost > 0 else 0

        precision = (
            fraud_count_above / entities_above_threshold * 100
            if entities_above_threshold > 0
            else 0
        )
        recall = (
            fraud_count_above / aggregated["summary"]["total_fraud_count"] * 100
            if aggregated["summary"]["total_fraud_count"] > 0
            else 0
        )

        roi_results.append(
            {
                "threshold": threshold,
                "entities": entities_above_threshold,
                "fraud_gmv": fraud_gmv_above,
                "safe_gmv": safe_gmv_above,
                "fraud_count": fraud_count_above,
                "safe_count": safe_count_above,
                "expected_recovery": expected_fraud_recovery,
                "investigation_cost": investigation_total_cost,
                "net_value": net_value,
                "roi": roi,
                "precision": precision,
                "recall": recall,
            }
        )

    return {"thresholds": roi_results, "assumptions": {"investigation_cost": investigation_cost, "recovery_rate": fraud_recovery_rate}}


def generate_recommendations(
    aggregated: Dict[str, Any], roi_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate recommendations for risk_analyzer.py refinement."""
    print("\n" + "=" * 80)
    print("💡 GENERATING RECOMMENDATIONS")
    print("=" * 80)

    recommendations = []

    best_roi_threshold = max(
        roi_analysis["thresholds"], key=lambda x: x["roi"], default=None
    )
    if best_roi_threshold:
        recommendations.append(
            {
                "type": "minimum_score_threshold",
                "recommendation": f"Add minimum score threshold of {best_roi_threshold['threshold']:.2f}",
                "rationale": f"Maximizes ROI at {best_roi_threshold['roi']:.1f}% with {best_roi_threshold['precision']:.1f}% precision",
                "code_change": f"Skip entities with avg_risk_score < {best_roi_threshold['threshold']:.2f}",
            }
        )

    high_concentration_buckets = [
        b
        for b in aggregated["buckets"]
        if b["fraud_gmv_concentration"] > 10 and b["bucket_min"] >= 0.60
    ]
    if high_concentration_buckets:
        min_high_score = min(b["bucket_min"] for b in high_concentration_buckets)
        recommendations.append(
            {
                "type": "high_score_weighting",
                "recommendation": f"Double weight for entities with score >= {min_high_score:.2f}",
                "rationale": f"These buckets contain {sum(b['fraud_gmv_concentration'] for b in high_concentration_buckets):.1f}% of fraud GMV",
                "code_change": f"if avg_risk_score >= {min_high_score:.2f}: risk_weighted_value *= 2.0",
            }
        )

    low_value_buckets = [
        b
        for b in aggregated["buckets"]
        if b["avg_fraud_rate"] < aggregated["summary"]["baseline_fraud_rate"] * 0.5
        and b["bucket_min"] < 0.40
    ]
    if low_value_buckets:
        max_low_score = max(b["bucket_max"] for b in low_value_buckets)
        recommendations.append(
            {
                "type": "low_score_filtering",
                "recommendation": f"Filter out entities with score < {max_low_score:.2f}",
                "rationale": f"Below-baseline fraud rate ({aggregated['summary']['baseline_fraud_rate']:.2f}%), not worth investigating",
                "code_change": f"if avg_risk_score < {max_low_score:.2f}: continue  # Skip low-value entities",
            }
        )

    best_precision_threshold = max(
        roi_analysis["thresholds"], key=lambda x: x["precision"], default=None
    )
    if best_precision_threshold and best_precision_threshold["precision"] > 2.0:
        recommendations.append(
            {
                "type": "precision_optimization",
                "recommendation": f"For high-precision mode, use threshold {best_precision_threshold['threshold']:.2f}",
                "rationale": f"Achieves {best_precision_threshold['precision']:.1f}% precision ({best_precision_threshold['recall']:.1f}% recall)",
                "code_change": f"high_precision_threshold = {best_precision_threshold['threshold']:.2f}",
            }
        )

    return {"recommendations": recommendations}


def export_summary_report(
    aggregated: Dict[str, Any],
    roi_analysis: Dict[str, Any],
    recommendations: Dict[str, Any],
) -> str:
    """Export comprehensive summary report."""
    artifacts_dir = os.getenv("ARTIFACTS_DIR", "olorin-server/artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"{artifacts_dir}/multi_period_analysis_{timestamp}.txt"

    with open(report_path, "w") as f:
        f.write("=" * 80 + "\n")
        f.write("MULTI-PERIOD SCORE DISTRIBUTION ANALYSIS REPORT\n")
        f.write("=" * 80 + "\n\n")

        f.write("AGGREGATE STATISTICS\n")
        f.write("-" * 80 + "\n")
        summary = aggregated["summary"]
        f.write(f"Total Fraud GMV: ${summary['total_fraud_gmv']:,.2f}\n")
        f.write(f"Total Safe GMV: ${summary['total_safe_gmv']:,.2f}\n")
        f.write(f"Total Fraud Transactions: {summary['total_fraud_count']:,}\n")
        f.write(f"Total Safe Transactions: {summary['total_safe_count']:,}\n")
        f.write(f"Baseline Fraud Rate: {summary['baseline_fraud_rate']:.2f}%\n\n")

        f.write("FRAUD CONCENTRATION BY SCORE BUCKET\n")
        f.write("-" * 80 + "\n")
        f.write(
            f"{'Bucket':<12} {'Fraud GMV %':<12} {'Safe GMV %':<12} {'Fraud Rate':<12} {'Entities':<10}\n"
        )
        for bucket in aggregated["buckets"]:
            f.write(
                f"{bucket['bucket_min']:.2f}-{bucket['bucket_max']:.2f}  "
                f"{bucket['fraud_gmv_concentration']:>10.1f}%  "
                f"{bucket['safe_gmv_concentration']:>10.1f}%  "
                f"{bucket['avg_fraud_rate']:>10.2f}%  "
                f"{bucket['total_fraud_count'] + bucket['total_safe_count']:>10,}\n"
            )

        f.write("\nROI ANALYSIS BY THRESHOLD\n")
        f.write("-" * 80 + "\n")
        f.write(
            f"{'Threshold':<11} {'ROI':<10} {'Precision':<11} {'Recall':<10} {'Net Value':<15}\n"
        )
        for t in roi_analysis["thresholds"]:
            f.write(
                f"{t['threshold']:.2f}        "
                f"{t['roi']:>7.1f}%  "
                f"{t['precision']:>9.1f}%  "
                f"{t['recall']:>8.1f}%  "
                f"${t['net_value']:>13,.2f}\n"
            )

        f.write("\nRECOMMENDATIONS\n")
        f.write("-" * 80 + "\n")
        for i, rec in enumerate(recommendations["recommendations"], 1):
            f.write(f"\n{i}. {rec['recommendation']}\n")
            f.write(f"   Type: {rec['type']}\n")
            f.write(f"   Rationale: {rec['rationale']}\n")
            f.write(f"   Code Change: {rec['code_change']}\n")

    return report_path


async def main():
    """Execute multi-period analysis workflow."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Multi-period score distribution analysis"
    )
    parser.add_argument(
        "--num-periods",
        type=int,
        default=12,
        help="Number of monthly periods to analyze (default: 12)",
    )
    parser.add_argument(
        "--start-offset-months",
        type=int,
        default=12,
        help="Starting offset in months (default: 12)",
    )
    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("🔍 MULTI-PERIOD SCORE DISTRIBUTION ANALYSIS")
    print("=" * 80)
    print(f"\n📋 Configuration:")
    print(f"   Periods: {args.num_periods} months")
    print(f"   Starting Offset: {args.start_offset_months} months ago")
    print(f"   Window Size: {os.getenv('SELECTOR_TIME_WINDOW_HOURS', '24')} hours per period")

    print(f"\n" + "=" * 80)
    print("STEP 1: RUNNING MULTI-PERIOD ANALYSIS")
    print("=" * 80)

    analyses = []
    base_date = datetime.now() - timedelta(days=30 * args.start_offset_months)

    for i in range(args.num_periods):
        reference_date = (base_date - timedelta(days=30 * i)).strftime("%Y-%m-%d")
        print(f"\n📅 Analyzing period: {reference_date}")

        try:
            analysis = await run_single_period_analysis(reference_date)
            if analysis.get("status") == "success":
                analyses.append(analysis)
                summary = analysis.get("summary", {})
                print(
                    f"   ✅ Fraud: {summary.get('total_fraud_count', 0)} txs, "
                    f"${summary.get('total_fraud_gmv', 0):,.2f} GMV"
                )
            else:
                print(f"   ⚠️  Analysis failed: {analysis.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

    if not analyses:
        print("\n❌ No successful analyses. Exiting.")
        return 1

    print(f"\n✅ Completed {len(analyses)} period analyses")

    print(f"\n" + "=" * 80)
    print("STEP 2: IDENTIFYING FRAUD CONCENTRATION PATTERNS")
    print("=" * 80)

    aggregated = aggregate_results(analyses)

    print(f"\n📊 Aggregated Statistics:")
    print(f"   Total Periods: {len(analyses)}")
    print(f"   Total Fraud GMV: ${aggregated['summary']['total_fraud_gmv']:,.2f}")
    print(f"   Total Safe GMV: ${aggregated['summary']['total_safe_gmv']:,.2f}")
    print(
        f"   Baseline Fraud Rate: {aggregated['summary']['baseline_fraud_rate']:.2f}%"
    )

    print(f"\n📈 Top 5 Fraud Concentration Buckets:")
    top_fraud_buckets = sorted(
        aggregated["buckets"], key=lambda x: x["fraud_gmv_concentration"], reverse=True
    )[:5]
    for bucket in top_fraud_buckets:
        print(
            f"   {bucket['bucket_min']:.2f}-{bucket['bucket_max']:.2f}: "
            f"{bucket['fraud_gmv_concentration']:.1f}% of fraud GMV "
            f"({bucket['avg_fraud_rate']:.2f}% fraud rate)"
        )

    print(f"\n" + "=" * 80)
    print("STEP 3: CALCULATING OPTIMAL THRESHOLDS")
    print("=" * 80)

    roi_analysis = calculate_roi_thresholds(aggregated)

    print(f"\n📊 ROI by Threshold:")
    print(
        f"{'Threshold':<11} {'ROI':<10} {'Precision':<11} {'Recall':<10} {'Entities':<10}"
    )
    print("-" * 80)
    for t in roi_analysis["thresholds"]:
        print(
            f"{t['threshold']:.2f}        "
            f"{t['roi']:>7.1f}%  "
            f"{t['precision']:>9.1f}%  "
            f"{t['recall']:>8.1f}%  "
            f"{t['entities']:>10,}"
        )

    best_roi = max(roi_analysis["thresholds"], key=lambda x: x["roi"])
    print(f"\n🎯 Optimal ROI Threshold: {best_roi['threshold']:.2f}")
    print(f"   ROI: {best_roi['roi']:.1f}%")
    print(f"   Precision: {best_roi['precision']:.1f}%")
    print(f"   Recall: {best_roi['recall']:.1f}%")
    print(f"   Net Value: ${best_roi['net_value']:,.2f}")

    print(f"\n" + "=" * 80)
    print("STEP 4: GENERATING REFINEMENT RECOMMENDATIONS")
    print("=" * 80)

    recommendations = generate_recommendations(aggregated, roi_analysis)

    print(f"\n💡 Recommendations ({len(recommendations['recommendations'])} total):\n")
    for i, rec in enumerate(recommendations["recommendations"], 1):
        print(f"{i}. {rec['recommendation']}")
        print(f"   Rationale: {rec['rationale']}")
        print(f"   Code: {rec['code_change']}\n")

    report_path = export_summary_report(aggregated, roi_analysis, recommendations)
    print(f"📁 Full report exported to: {report_path}")

    print(f"\n" + "=" * 80)
    print("✅ MULTI-PERIOD ANALYSIS COMPLETE")
    print("=" * 80)
    print(
        f"\n📋 Next Step: Apply recommendations to app/service/analytics/risk_analyzer.py"
    )

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
