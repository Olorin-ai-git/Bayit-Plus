#!/usr/bin/env python3
"""
Test rankings with FILTERS to increase precision

Strategy: Apply strict filters to reduce candidate pool, THEN rank
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


# Define filter strategies
FILTERS = {
    "f1_baseline": {"name": "Baseline (no filter)", "having": "COUNT(*) >= 1"},
    "f2_min_4tx": {"name": "Min 4 transactions", "having": "COUNT(*) >= 4"},
    "f3_min_2ips": {"name": "Min 2 IPs", "having": "COUNT(DISTINCT IP) >= 2"},
    "f4_both": {
        "name": "Min 4tx + 2 IPs",
        "having": "COUNT(*) >= 4 AND COUNT(DISTINCT IP) >= 2",
    },
    "f5_velocity": {
        "name": "Min 6tx + 3 IPs",
        "having": "COUNT(*) >= 6 AND COUNT(DISTINCT IP) >= 3",
    },
    "f6_high_model": {"name": "MODEL_SCORE > 0.4", "having": "AVG(MODEL_SCORE) > 0.4"},
    "f7_model_plus_volume": {
        "name": "MODEL > 0.4 + 4tx",
        "having": "AVG(MODEL_SCORE) > 0.4 AND COUNT(*) >= 4",
    },
    "f8_model_plus_ip": {
        "name": "MODEL > 0.4 + 2 IPs",
        "having": "AVG(MODEL_SCORE) > 0.4 AND COUNT(DISTINCT IP) >= 2",
    },
    "f9_aggressive": {
        "name": "MODEL > 0.5 + 4tx + 2 IPs",
        "having": "AVG(MODEL_SCORE) > 0.5 AND COUNT(*) >= 4 AND COUNT(DISTINCT IP) >= 2",
    },
    "f10_super_aggressive": {
        "name": "MODEL > 0.6 + 6tx + 3 IPs",
        "having": "AVG(MODEL_SCORE) > 0.6 AND COUNT(*) >= 6 AND COUNT(DISTINCT IP) >= 3",
    },
}


def test_filter(conn, window_start, window_end, filter_key):
    """Test a filter strategy"""
    having_clause = FILTERS[filter_key]["having"]

    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        COUNT(DISTINCT IP) as unique_ips,
        AVG(MODEL_SCORE) as avg_model_score,
        AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount
    FROM {DATABASE}.{SCHEMA}.TXS
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    HAVING {having_clause}
    ORDER BY COUNT(*) DESC
    LIMIT 50
    """

    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()

    entities = [
        dict(
            zip(
                [
                    "EMAIL",
                    "TX_COUNT",
                    "FRAUD_COUNT",
                    "UNIQUE_IPS",
                    "AVG_MODEL_SCORE",
                    "AVG_AMOUNT",
                ],
                row,
            )
        )
        for row in results
    ]

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
    print(f"║{'FILTERED RANKING TEST':^78}║")
    print(f"╠{'═'*78}╣")
    print(
        f"║  Testing {len(FILTERS)} different filter strategies                           ║"
    )
    print(f"║  Goal: Increase precision by filtering out clean entities             ║")
    print(f"╚{'═'*78}╝\n")

    for key, info in FILTERS.items():
        print(f"  {key}: {info['name']}")
    print()

    conn = get_connection()

    results = {key: [] for key in FILTERS.keys()}
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

            for filter_key in FILTERS.keys():
                result = test_filter(conn, window_start, window_end, filter_key)
                results[filter_key].append(result)

                if result["total_entities"] > 0 and result["entities_with_fraud"] > 0:
                    print(
                        f"  {filter_key}: {result['entities_with_fraud']}/{result['total_entities']} fraud ({result['precision']*100:.1f}%)"
                    )

        # Aggregate
        print(f"\n\n{'='*78}")
        print(f"AGGREGATE RESULTS")
        print(f"{'='*78}\n")

        stats = []
        for filter_key, window_results in results.items():
            if filter_key == "metadata":
                continue

            total_entities = sum(w["total_entities"] for w in window_results)
            total_fraud_entities = sum(w["entities_with_fraud"] for w in window_results)
            total_fraud_txs = sum(w["total_fraud_txs"] for w in window_results)

            overall_precision = (
                total_fraud_entities / total_entities if total_entities > 0 else 0
            )

            stats.append(
                {
                    "key": filter_key,
                    "name": FILTERS[filter_key]["name"],
                    "total_entities": total_entities,
                    "total_fraud_entities": total_fraud_entities,
                    "total_fraud_txs": total_fraud_txs,
                    "overall_precision": overall_precision,
                }
            )

        stats.sort(key=lambda x: x["overall_precision"], reverse=True)

        print(
            f"{'Rank':<6} {'Filter Strategy':<35} {'Precision':<12} {'Fraud/Total':<15} {'Fraud Txs':<10}"
        )
        print(f"{'─'*78}")

        for i, s in enumerate(stats, 1):
            print(
                f"{i:<6} {s['name']:<35} {s['overall_precision']*100:>6.1f}%     {s['total_fraud_entities']:>3}/{s['total_entities']:<8} {s['total_fraud_txs']:>6}"
            )

        print(f"\n{'='*78}")
        winner = stats[0]
        print(f"🏆 WINNER: {winner['name']}")
        print(f"   Precision: {winner['overall_precision']*100:.1f}%")
        print(f"   Entities investigated: {winner['total_entities']}")
        print(f"   Fraud entities found: {winner['total_fraud_entities']}")
        print(f"   Total fraud transactions: {winner['total_fraud_txs']}")

        if winner["overall_precision"] > 0.10:  # >10% precision
            print(f"\n   ✅ HIGH PRECISION ACHIEVED!")
        elif winner["overall_precision"] > 0.05:  # >5% precision
            print(f"\n   ✅ MODERATE PRECISION - Getting better!")
        else:
            print(f"\n   ⚠️  Still low precision - need more aggressive filters")

        print(f"{'='*78}\n")

        output_file = "filtered_ranking_results.json"
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2, default=str)

        print(f"✅ Results saved to: {output_file}\n")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
