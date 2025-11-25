#!/usr/bin/env python3
"""
Validate the new MODEL_SCORE > 0.4 analyzer implementation

Tests:
1. Run analyzer with new filter on historical 6-month window
2. Verify precision is ~2.6% (vs 0.51% baseline)
3. Verify lift is ~5.1x vs random
4. Compare fraud detection rate with testing results
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

import asyncio

from app.service.analytics.risk_analyzer import RiskAnalyzer


async def main():
    print(f"\n╔{'═'*78}╗")
    print(f"║{'NEW ANALYZER VALIDATION':^78}║")
    print(f"╠{'═'*78}╣")
    print(f"║  Testing MODEL_SCORE > 0.4 filter implementation                       ║")
    print(f"║  Expected: 2.6% precision, 5.1x lift vs random                         ║")
    print(f"╚{'═'*78}╝\n")

    # Initialize analyzer
    analyzer = RiskAnalyzer()

    # Test parameters (matching our systematic testing)
    time_window_hours = int(os.getenv("ANALYZER_TIME_WINDOW_HOURS", "24"))
    group_by = "EMAIL"

    print(f"Configuration:")
    print(f"  Time window: {time_window_hours} hours")
    print(f"  Lookback: 6 months from today")
    print(f"  Group by: {group_by}")
    print(f"  Filter: MODEL_SCORE > 0.4")
    print(f"  Ranking: Transaction volume (COUNT)")
    print()

    # Run analyzer
    print(f"{'─'*78}")
    print(f"Running analyzer...")
    print(f"{'─'*78}\n")

    try:
        result = await analyzer.get_top_risk_entities(
            time_window=f"{time_window_hours}h",
            group_by=group_by,
            top_percentage=10,  # Top 10% like systematic testing
            force_refresh=True,  # Bypass cache
        )

        if not result:
            print("❌ No results returned from analyzer")
            return

        # Check for errors
        if result.get("status") == "error" or result.get("status") == "failed":
            print(f"❌ Analyzer returned error: {result.get('error', 'Unknown error')}")
            return

        # Extract entities list
        results = result.get("entities", [])

        if not results:
            print("❌ No entities returned from analyzer")
            print(f"   Result: {result}")
            return

        print(f"✅ Analyzer returned {len(results)} entities")
        print()

        # Calculate metrics
        total_entities = len(results)
        entities_with_fraud = sum(1 for e in results if e.get("fraud_count", 0) > 0)
        total_fraud_txs = sum(e.get("fraud_count", 0) for e in results)
        total_txs = sum(e.get("transaction_count", 0) for e in results)

        precision = (
            (entities_with_fraud / total_entities * 100) if total_entities > 0 else 0
        )
        baseline_fraud_rate = 0.51  # From systematic testing
        lift = precision / baseline_fraud_rate if baseline_fraud_rate > 0 else 0

        # Display results
        print(f"{'='*78}")
        print(f"RESULTS")
        print(f"{'='*78}\n")

        print(f"Total entities returned: {total_entities}")
        print(f"Entities with fraud: {entities_with_fraud}")
        print(f"Total fraud transactions: {total_fraud_txs}")
        print(f"Total transactions: {total_txs:,}")
        print()

        print(f"{'─'*78}")
        print(f"METRICS")
        print(f"{'─'*78}")
        print(f"Precision: {precision:.2f}%")
        print(f"Baseline fraud rate: {baseline_fraud_rate}%")
        print(f"Lift vs random: {lift:.1f}x")
        print()

        # Validation checks
        print(f"{'─'*78}")
        print(f"VALIDATION")
        print(f"{'─'*78}")

        expected_precision = 2.6
        expected_lift = 5.1
        precision_tolerance = 0.5  # ±0.5%
        lift_tolerance = 1.0  # ±1.0x

        checks = []

        # Check 1: Precision
        if abs(precision - expected_precision) <= precision_tolerance:
            checks.append(
                (
                    "✅",
                    f"Precision: {precision:.2f}% (target: {expected_precision}% ±{precision_tolerance}%)",
                )
            )
        elif precision > expected_precision - precision_tolerance:
            checks.append(
                (
                    "⚠️ ",
                    f"Precision: {precision:.2f}% (slightly below target: {expected_precision}%)",
                )
            )
        else:
            checks.append(
                (
                    "❌",
                    f"Precision: {precision:.2f}% (expected: {expected_precision}% ±{precision_tolerance}%)",
                )
            )

        # Check 2: Lift
        if abs(lift - expected_lift) <= lift_tolerance:
            checks.append(
                (
                    "✅",
                    f"Lift: {lift:.1f}x (target: {expected_lift}x ±{lift_tolerance}x)",
                )
            )
        elif lift > expected_lift - lift_tolerance:
            checks.append(
                ("⚠️ ", f"Lift: {lift:.1f}x (slightly below target: {expected_lift}x)")
            )
        else:
            checks.append(
                (
                    "❌",
                    f"Lift: {lift:.1f}x (expected: {expected_lift}x ±{lift_tolerance}x)",
                )
            )

        # Check 3: Fraud found
        if entities_with_fraud > 0:
            checks.append(
                (
                    "✅",
                    f"Fraud detected: {entities_with_fraud} entities, {total_fraud_txs} transactions",
                )
            )
        else:
            checks.append(("⚠️ ", f"No fraud detected in this window (may be normal)"))

        # Check 4: Volume ranking
        if len(results) >= 2:
            # Check if results are sorted by transaction count DESC
            sorted_by_volume = all(
                results[i].get("transaction_count", 0)
                >= results[i + 1].get("transaction_count", 0)
                for i in range(len(results) - 1)
            )
            if sorted_by_volume:
                checks.append(("✅", "Results correctly sorted by transaction volume"))
            else:
                checks.append(("❌", "Results NOT sorted by transaction volume"))

        # Check 5: MODEL_SCORE filter
        low_score_entities = [e for e in results if e.get("risk_score", 0) <= 0.4]
        if len(low_score_entities) == 0:
            checks.append(("✅", "All entities have AVG(MODEL_SCORE) > 0.4"))
        else:
            checks.append(
                (
                    "❌",
                    f"{len(low_score_entities)} entities have MODEL_SCORE ≤ 0.4 (filter not applied)",
                )
            )

        # Display checks
        for icon, message in checks:
            print(f"{icon} {message}")

        # Overall status
        print()
        print(f"{'='*78}")
        all_passed = all(icon == "✅" for icon, _ in checks)
        if all_passed:
            print(f"🎉 VALIDATION PASSED - New analyzer performing as expected!")
        else:
            warnings = sum(1 for icon, _ in checks if icon == "⚠️ ")
            failures = sum(1 for icon, _ in checks if icon == "❌")
            if failures > 0:
                print(f"❌ VALIDATION FAILED - {failures} check(s) failed")
            else:
                print(f"⚠️  VALIDATION WARNING - {warnings} check(s) need attention")
        print(f"{'='*78}\n")

        # Show top 10 entities
        print(f"{'─'*78}")
        print(f"TOP 10 ENTITIES (by transaction volume)")
        print(f"{'─'*78}")
        print(f"{'Rank':<6} {'Entity':<35} {'Txs':<8} {'Avg Score':<12} {'Fraud':<8}")
        print(f"{'─'*78}")

        for i, entity in enumerate(results[:10], 1):
            entity_id = entity.get("entity", "unknown")
            tx_count = entity.get("transaction_count", 0)
            avg_score = entity.get(
                "risk_score", 0
            )  # Changed from avg_risk_score to risk_score
            fraud_count = entity.get("fraud_count", 0)

            fraud_marker = "🚨" if fraud_count > 0 else ""

            # Truncate long emails
            if len(entity_id) > 33:
                entity_id = entity_id[:30] + "..."

            print(
                f"{i:<6} {entity_id:<35} {tx_count:<8} {avg_score:<12.3f} {fraud_count:<8} {fraud_marker}"
            )

        print()

        # Save results
        output_file = "validation_results.json"
        validation_data = {
            "timestamp": datetime.now().isoformat(),
            "total_entities": total_entities,
            "entities_with_fraud": entities_with_fraud,
            "total_fraud_txs": total_fraud_txs,
            "precision": precision,
            "lift": lift,
            "validation_passed": all_passed,
            "top_10_entities": [
                {
                    "entity": e.get("entity"),
                    "transaction_count": e.get("transaction_count"),
                    "risk_score": e.get("risk_score"),  # Changed from avg_risk_score
                    "fraud_count": e.get("fraud_count"),
                }
                for e in results[:10]
            ],
        }

        with open(output_file, "w") as f:
            json.dump(validation_data, f, indent=2, default=str)

        print(f"✅ Results saved to: {output_file}\n")

    except Exception as e:
        print(f"❌ Error running analyzer: {e}")
        import traceback

        traceback.print_exc()
        return

    finally:
        # Cleanup
        if hasattr(analyzer, "client") and analyzer.client:
            try:
                analyzer.client.disconnect()
            except:
                pass


if __name__ == "__main__":
    asyncio.run(main())
