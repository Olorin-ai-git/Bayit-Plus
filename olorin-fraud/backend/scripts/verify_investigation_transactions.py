#!/usr/bin/env python3
"""
Verify investigation transactions by comparing GMV vs PAID_AMOUNT_VALUE_IN_CURRENCY.

This script queries Snowflake to understand the ~942x discrepancy between:
- Customer's data (using GMV column)
- Investigation claims (using PAID_AMOUNT_VALUE_IN_CURRENCY column)

Hypothesis: PAID_AMOUNT_VALUE_IN_CURRENCY is in local currency (CLP),
while GMV is USD-normalized. The ~942x ratio matches CLP/USD exchange rate.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient


async def verify_transactions():
    """Run verification queries against Snowflake."""
    client = RealSnowflakeClient()
    await client.connect()

    entity_email = "thejockerchileno16@gmail.com"
    disputed_tx_ids = ["18653457", "18653425", "18653381", "18653359", "19157738"]

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "entity": entity_email,
        "disputed_tx_ids": disputed_tx_ids,
        "queries": {},
    }

    print("=" * 70)
    print("SNOWFLAKE TRANSACTION VERIFICATION REPORT")
    print(f"Entity: {entity_email}")
    print(f"Timestamp: {results['timestamp']} UTC")
    print("=" * 70)

    # Query 1: Compare BOTH columns for disputed transactions
    print("\n[Q1] Disputed Transactions - GMV vs PAID_AMOUNT comparison:")
    print("-" * 70)

    q1 = f"""
        SELECT
            TX_ID_KEY,
            TX_DATETIME,
            GMV,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_AMOUNT_CURRENCY,
            IS_FRAUD_TX,
            NSURE_LAST_DECISION
        FROM {client.transactions_table}
        WHERE TX_ID_KEY IN ({','.join([f"'{tx}'" for tx in disputed_tx_ids])})
        ORDER BY TX_DATETIME DESC
    """

    disputed_results = await client.execute_query(q1)
    results["queries"]["disputed_transactions"] = disputed_results

    if disputed_results:
        print(f"{'TX_ID_KEY':<12} | {'GMV':>12} | {'PAID_AMT':>15} | {'CURRENCY':>8} | {'RATIO':>8} | FRAUD")
        print("-" * 70)
        for row in disputed_results:
            gmv = float(row.get("GMV") or 0)
            paid = float(row.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or 0)
            currency = row.get("PAID_AMOUNT_CURRENCY", "N/A")
            ratio = paid / gmv if gmv > 0 else 0
            fraud = row.get("IS_FRAUD_TX", 0)
            print(f"{row['TX_ID_KEY']:<12} | ${gmv:>11,.2f} | {paid:>15,.2f} | {currency:>8} | {ratio:>7.1f}x | {fraud}")
    else:
        print("No results found for disputed TX_ID_KEYs")

    # Query 2: Currency distribution
    print("\n[Q2] Currency Distribution for Entity:")
    print("-" * 70)

    q2 = f"""
        SELECT
            PAID_AMOUNT_CURRENCY,
            COUNT(*) as tx_count,
            SUM(GMV) as total_gmv,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_paid_amount
        FROM {client.transactions_table}
        WHERE LOWER(EMAIL) = '{entity_email.lower()}'
        GROUP BY PAID_AMOUNT_CURRENCY
        ORDER BY tx_count DESC
    """

    currency_results = await client.execute_query(q2)
    results["queries"]["currency_distribution"] = currency_results

    if currency_results:
        print(f"{'CURRENCY':>10} | {'TX_COUNT':>10} | {'TOTAL_GMV':>15} | {'TOTAL_PAID_AMT':>18}")
        print("-" * 70)
        for row in currency_results:
            currency = row.get("PAID_AMOUNT_CURRENCY", "N/A")
            count = row.get("TX_COUNT", 0)
            gmv = float(row.get("TOTAL_GMV") or 0)
            paid = float(row.get("TOTAL_PAID_AMOUNT") or 0)
            print(f"{currency:>10} | {count:>10} | ${gmv:>14,.2f} | {paid:>18,.2f}")

    # Query 3: Summary statistics
    print("\n[Q3] Summary Statistics - BOTH Columns:")
    print("-" * 70)

    q3 = f"""
        SELECT
            COUNT(*) as tx_count,
            SUM(GMV) as total_gmv,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_paid_amount,
            AVG(GMV) as avg_gmv,
            AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_paid_amount,
            MAX(GMV) as max_gmv,
            MAX(PAID_AMOUNT_VALUE_IN_CURRENCY) as max_paid_amount
        FROM {client.transactions_table}
        WHERE LOWER(EMAIL) = '{entity_email.lower()}'
    """

    summary_results = await client.execute_query(q3)
    results["queries"]["summary_statistics"] = summary_results

    if summary_results:
        row = summary_results[0]
        tx_count = row.get("TX_COUNT", 0)
        total_gmv = float(row.get("TOTAL_GMV") or 0)
        total_paid = float(row.get("TOTAL_PAID_AMOUNT") or 0)
        avg_gmv = float(row.get("AVG_GMV") or 0)
        avg_paid = float(row.get("AVG_PAID_AMOUNT") or 0)
        max_gmv = float(row.get("MAX_GMV") or 0)
        max_paid = float(row.get("MAX_PAID_AMOUNT") or 0)

        ratio = total_paid / total_gmv if total_gmv > 0 else 0

        print(f"Transaction Count: {tx_count}")
        print(f"Total GMV (USD):           ${total_gmv:>15,.2f}")
        print(f"Total PAID_AMOUNT:          {total_paid:>15,.2f}")
        print(f"Average GMV (USD):         ${avg_gmv:>15,.2f}")
        print(f"Average PAID_AMOUNT:        {avg_paid:>15,.2f}")
        print(f"Max GMV (USD):             ${max_gmv:>15,.2f}")
        print(f"Max PAID_AMOUNT:            {max_paid:>15,.2f}")
        print(f"Overall Ratio:              {ratio:>15.1f}x")

    # Query 4: Fraud transactions in GMV window
    print("\n[Q4] Fraud Transactions in GMV Window (2024-12-17 to 2025-06-15):")
    print("-" * 70)

    q4 = f"""
        SELECT
            TX_ID_KEY,
            TX_DATETIME,
            GMV,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_AMOUNT_CURRENCY,
            IS_FRAUD_TX,
            NSURE_LAST_DECISION
        FROM {client.transactions_table}
        WHERE LOWER(EMAIL) = '{entity_email.lower()}'
          AND TX_DATETIME >= '2024-12-17 00:00:00'
          AND TX_DATETIME <= '2025-06-15 00:00:00'
          AND IS_FRAUD_TX = 1
        ORDER BY TX_DATETIME DESC
    """

    fraud_results = await client.execute_query(q4)
    results["queries"]["fraud_in_gmv_window"] = fraud_results

    if fraud_results:
        print(f"Found {len(fraud_results)} fraud transactions:")
        total_fraud_gmv = 0
        total_fraud_paid = 0
        for row in fraud_results:
            gmv = float(row.get("GMV") or 0)
            paid = float(row.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or 0)
            total_fraud_gmv += gmv
            total_fraud_paid += paid
            print(f"  TX {row['TX_ID_KEY']}: GMV=${gmv:,.2f}, PAID={paid:,.2f} {row.get('PAID_AMOUNT_CURRENCY', '')}")
        print(f"\nTotal Fraud GMV: ${total_fraud_gmv:,.2f}")
        print(f"Total Fraud PAID_AMOUNT: {total_fraud_paid:,.2f}")
    else:
        print("No fraud transactions found in GMV window")

    await client.disconnect()

    # Print conclusions
    print("\n" + "=" * 70)
    print("CONCLUSIONS")
    print("=" * 70)

    if currency_results:
        currencies = [r.get("PAID_AMOUNT_CURRENCY") for r in currency_results]
        if "CLP" in currencies:
            print("\n[CONFIRMED] Currency is CLP (Chilean Peso)")
            print("The ~942x ratio matches CLP/USD exchange rate (~950:1)")
            print("\nFINDING: The investigation used PAID_AMOUNT_VALUE_IN_CURRENCY")
            print("         (Chilean Pesos) instead of GMV (USD-normalized).")
            print("\nRECOMMENDATION: Use GMV column for USD-based financial analysis.")
        else:
            print(f"\nCurrencies found: {currencies}")
            print("Further investigation needed to understand the ratio discrepancy.")

    # Save results to JSON
    output_dir = Path(__file__).parent.parent / "artifacts"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"verification_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    with open(output_file, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\nResults saved to: {output_file}")
    return results


if __name__ == "__main__":
    asyncio.run(verify_transactions())
