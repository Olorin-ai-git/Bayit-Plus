#!/usr/bin/env python3
"""
Run the Risk Analyzer SQL query directly.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path, override=True)

# Set to skip Firebase secrets
os.environ["USE_FIREBASE_SECRETS"] = "false"

sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def main():
    print("\n" + "=" * 80)
    print("🔍 RISK ANALYZER SQL QUERY")
    print("=" * 80)

    # Allow command line arguments
    import argparse

    parser = argparse.ArgumentParser(description="Run Risk Analyzer SQL Query")
    parser.add_argument(
        "--time-window", default=None, help="Time window (e.g., 7d, 30d, 90d)"
    )
    parser.add_argument(
        "--group-by", default=None, help="Group by field (email, ip, device_id)"
    )
    parser.add_argument(
        "--top-percentage", type=float, default=None, help="Top percentage (e.g., 10)"
    )
    args = parser.parse_args()

    # Use args or defaults from .env
    # For debugging, default to 30d for wider visibility (analyzer uses 24h from ANALYZER_TIME_WINDOW_HOURS)
    time_window = args.time_window or "30d"
    group_by = args.group_by or os.getenv("ANALYTICS_DEFAULT_GROUP_BY", "email")
    top_percentage = args.top_percentage or float(
        os.getenv("ANALYTICS_DEFAULT_TOP_PERCENTAGE", "10")
    )

    print(f"\n📋 Parameters:")
    print(f"   Time Window: {time_window}")
    print(f"   Group By: {group_by}")
    print(f"   Top Percentage: {top_percentage}%")
    print(f"   Database Provider: {os.getenv('DATABASE_PROVIDER', 'snowflake')}")

    try:
        from app.service.analytics.risk_analyzer import RiskAnalyzer

        print(f"\n🔗 Initializing Risk Analyzer...")
        analyzer = RiskAnalyzer()

        # Build the query
        print(f"\n🏗️  Building query...")
        hours = analyzer._parse_time_window(time_window)
        print(f"   Parsed {time_window} = {hours} hours")
        query = analyzer._build_risk_query(hours, group_by, top_percentage)

        print(f"\n🔍 Generated SQL Query:")
        print("=" * 80)
        print(query)
        print("=" * 80)

        # Execute the query
        print(f"\n📊 Executing query...")
        analyzer.client.connect()
        results = analyzer.client.execute_query(query)

        print(f"   ✅ Query returned {len(results)} rows")

        if results:
            # Show column names from first result
            if results:
                print(f"\n📋 Available columns: {list(results[0].keys())}")

            print(f"\n📋 Results (showing first 20):")
            print("=" * 80)
            for i, row in enumerate(results[:20], 1):
                # Handle uppercase column names from Snowflake
                entity = row.get("ENTITY", "")
                risk_rank = row.get("RISK_RANK", 0)
                risk_score = row.get("AVG_RISK_SCORE")
                risk_weighted = row.get("RISK_WEIGHTED_VALUE")
                tx_count = row.get("TRANSACTION_COUNT", 0)
                total_amount = row.get("TOTAL_AMOUNT")
                fraud_count = row.get("FRAUD_COUNT", 0)
                rejected_count = row.get("REJECTED_COUNT", 0)
                max_risk = row.get("MAX_RISK_SCORE")
                min_risk = row.get("MIN_RISK_SCORE")
                percentile = row.get("PERCENTILE")
                last_tx = row.get("LAST_TRANSACTION")
                first_tx = row.get("FIRST_TRANSACTION")

                print(f"\n   Rank {risk_rank}: {entity}")
                print(f"      Transactions: {tx_count}")
                if total_amount is not None:
                    print(f"      Total Amount: {total_amount:.2f}")
                if risk_score is not None:
                    print(f"      Avg Risk Score: {risk_score:.4f}")
                if risk_weighted is not None:
                    print(f"      Risk Weighted Value: {risk_weighted:.2f}")
                if max_risk is not None:
                    print(f"      Max Risk: {max_risk:.4f}")
                if min_risk is not None:
                    print(f"      Min Risk: {min_risk:.4f}")
                print(f"      Fraud Count: {fraud_count}")
                print(f"      Rejected Count: {rejected_count}")
                if percentile is not None:
                    print(f"      Percentile: {percentile*100:.1f}%")
                if last_tx:
                    print(f"      Last Transaction: {last_tx}")
                if first_tx:
                    print(f"      First Transaction: {first_tx}")

            if len(results) > 20:
                print(f"\n   ... and {len(results) - 20} more entities")

            # Process results using analyzer's method
            print(f"\n📊 Processing results...")
            analysis = analyzer._process_results(
                results, time_window, group_by, top_percentage
            )

            print(f"\n📈 Summary:")
            print("=" * 80)
            summary = analysis.get("summary", {})
            print(f"   Total Entities: {summary.get('total_entities', 0)}")
            print(f"   Total Transactions: {summary.get('total_transactions', 0)}")
            print(f"   Total Amount: {summary.get('total_amount', 0):.2f}")
            print(f"   Total Fraud: {summary.get('total_fraud', 0)}")
            print(f"   Fraud Rate: {summary.get('fraud_rate', 0):.2f}%")
            print(f"   Total Risk Value: {summary.get('total_risk_value', 0):.2f}")
        else:
            print(f"   ⚠️  No results found")
            print(f"\n   💡 Try:")
            print(f"      - Longer time window: --time-window 90d")
            print(f"      - Different group_by: --group-by email")
            print(f"      - Higher top percentage: --top-percentage 20")

        analyzer.client.disconnect()

        print(f"\n" + "=" * 80)
        print(f"✅ Analysis Complete!")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
