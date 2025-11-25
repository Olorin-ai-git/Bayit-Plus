#!/usr/bin/env python3
"""
Test multiple ranking strategies simultaneously to find highest precision
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

# Configuration
ACCOUNT = (
    os.getenv("SNOWFLAKE_ACCOUNT", "")
    .replace(".snowflakecomputing.com", "")
    .replace("https://", "")
)
USER = os.getenv("SNOWFLAKE_USER")
DATABASE = "DBT"
SCHEMA = "DBT_PROD"
WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "manual_review_agent_wh")
PRIVATE_KEY_PATH = os.getenv(
    "SNOWFLAKE_PRIVATE_KEY_PATH", "/Users/olorin/Documents/rsa_key.p8"
)


def get_connection():
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        p_key = serialization.load_pem_private_key(
            key_file.read(), password=None, backend=default_backend()
        )
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return snowflake.connector.connect(
        user=USER,
        account=ACCOUNT,
        private_key=pkb,
        warehouse=WAREHOUSE,
        database=DATABASE,
        schema=SCHEMA,
    )


# Define 7 different ranking strategies
RANKINGS = {
    "v1_current": {
        "name": "Current (risk_weighted)",
        "formula": "SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) * COUNT(*)",
    },
    "v2_fraud_aware": {
        "name": "Fraud-Aware (IP-heavy)",
        "formula": "(COUNT(*) / 5.0) * 0.25 + (COUNT(DISTINCT IP) / 2.0) * 0.35 + (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.20 + AVG(MODEL_SCORE) * 0.20",
    },
    "v3_hybrid_balanced": {
        "name": "Hybrid Balanced",
        "formula": "SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) * 0.3 + (COUNT(*) / 5.0) * 0.3 + (COUNT(DISTINCT IP) / 2.0) * 0.2 + (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.2",
    },
    "v4_ip_light": {
        "name": "IP Light (reduce IP weight)",
        "formula": "(COUNT(*) / 5.0) * 0.4 + (COUNT(DISTINCT IP) / 2.0) * 0.15 + (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.15 + AVG(MODEL_SCORE) * 0.30",
    },
    "v5_model_score_primary": {
        "name": "MODEL_SCORE Primary",
        "formula": "AVG(MODEL_SCORE) * 0.50 + (COUNT(*) / 5.0) * 0.25 + (COUNT(DISTINCT IP) / 2.0) * 0.15 + (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.10",
    },
    "v6_velocity_focus": {
        "name": "Velocity Focus",
        "formula": "(COUNT(*) / 5.0) * 0.50 + AVG(MODEL_SCORE) * 0.30 + (COUNT(DISTINCT IP) / 2.0) * 0.10 + (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.10",
    },
    "v7_pure_volume": {"name": "Pure Volume", "formula": "COUNT(*)"},
}


def test_ranking(conn, window_start, window_end, ranking_key):
    """Test a single ranking on a window"""
    formula = RANKINGS[ranking_key]["formula"]

    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        COUNT(DISTINCT IP) as unique_ips,
        COUNT(DISTINCT DEVICE_ID) as unique_devices,
        AVG(MODEL_SCORE) as avg_model_score,
        AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
        ({formula}) as ranking_score
    FROM {DATABASE}.{SCHEMA}.TXS
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    HAVING COUNT(*) >= 1
    ORDER BY ranking_score DESC
    LIMIT 50
    """

    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    cursor.close()

    entities = [dict(zip(columns, row)) for row in results]

    entities_with_fraud = sum(1 for e in entities if e["FRAUD_COUNT"] > 0)
    total_fraud_txs = sum(e["FRAUD_COUNT"] for e in entities)
    precision = entities_with_fraud / len(entities) if entities else 0

    return {
        "total_entities": len(entities),
        "entities_with_fraud": entities_with_fraud,
        "total_fraud_txs": total_fraud_txs,
        "precision": precision,
    }


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--start-offset-days", type=int, default=180)
    parser.add_argument("--num-windows", type=int, default=30)
    args = parser.parse_args()

    print(f"\n╔{'═'*78}╗")
    print(f"║{'MULTI-RANKING COMPARISON TEST':^78}║")
    print(f"╠{'═'*78}╣")
    print(
        f"║  Testing {len(RANKINGS)} different ranking strategies                              ║"
    )
    print(
        f"║  Windows: {args.num_windows} consecutive days                                       ║"
    )
    print(f"╚{'═'*78}╝\n")

    for key, info in RANKINGS.items():
        print(f"  {key}: {info['name']}")
    print()

    conn = get_connection()

    # Results structure
    results = {key: [] for key in RANKINGS.keys()}
    results["metadata"] = {
        "start_offset_days": args.start_offset_days,
        "num_windows": args.num_windows,
        "test_date": datetime.now().isoformat(),
    }

    try:
        for i in range(args.num_windows):
            offset = args.start_offset_days + i
            now = datetime.now()
            window_end = now - timedelta(days=offset)
            window_start = window_end - timedelta(hours=24)

            print(f"\n{'─'*78}")
            print(f"Window {i+1}/{args.num_windows}: {window_start.date()}")
            print(f"{'─'*78}")

            for ranking_key in RANKINGS.keys():
                result = test_ranking(conn, window_start, window_end, ranking_key)
                results[ranking_key].append(result)

                if result["entities_with_fraud"] > 0:
                    print(
                        f"  {ranking_key}: {result['entities_with_fraud']}/50 fraud ({result['precision']*100:.1f}%), {result['total_fraud_txs']} fraud txs"
                    )

        # Calculate aggregates
        print(f"\n\n{'='*78}")
        print(f"AGGREGATE RESULTS")
        print(f"{'='*78}\n")

        ranking_stats = []

        for ranking_key, window_results in results.items():
            if ranking_key == "metadata":
                continue

            total_entities = sum(w["total_entities"] for w in window_results)
            total_fraud_entities = sum(w["entities_with_fraud"] for w in window_results)
            total_fraud_txs = sum(w["total_fraud_txs"] for w in window_results)
            windows_with_fraud = sum(
                1 for w in window_results if w["entities_with_fraud"] > 0
            )

            overall_precision = (
                total_fraud_entities / total_entities if total_entities > 0 else 0
            )
            avg_precision = sum(w["precision"] for w in window_results) / len(
                window_results
            )

            stats = {
                "key": ranking_key,
                "name": RANKINGS[ranking_key]["name"],
                "windows_with_fraud": windows_with_fraud,
                "total_fraud_entities": total_fraud_entities,
                "total_fraud_txs": total_fraud_txs,
                "overall_precision": overall_precision,
                "avg_precision": avg_precision,
            }
            ranking_stats.append(stats)

        # Sort by precision
        ranking_stats.sort(key=lambda x: x["overall_precision"], reverse=True)

        print(
            f"{'Rank':<6} {'Strategy':<30} {'Precision':<12} {'Entities':<12} {'Windows':<10}"
        )
        print(f"{'─'*78}")

        for i, stats in enumerate(ranking_stats, 1):
            print(
                f"{i:<6} {stats['name']:<30} {stats['overall_precision']*100:>6.1f}%     {stats['total_fraud_entities']:>4}/{1500:<6} {stats['windows_with_fraud']:>2}/30"
            )

        print(f"\n{'='*78}")
        print(f"WINNER: {ranking_stats[0]['name']}")
        print(f"Precision: {ranking_stats[0]['overall_precision']*100:.1f}%")
        print(f"Fraud entities: {ranking_stats[0]['total_fraud_entities']}")
        print(f"Fraud transactions: {ranking_stats[0]['total_fraud_txs']}")
        print(f"{'='*78}\n")

        # Save results
        output_file = "multi_ranking_results.json"
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2, default=str)

        print(f"✅ Results saved to: {output_file}\n")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
