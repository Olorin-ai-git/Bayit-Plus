#!/usr/bin/env python3
"""
Extract transactions for a specific entity across multiple time windows.
Generates an HTML report with transaction details.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
from app.service.agent.tools.snowflake_tool.schema_constants import get_full_table_name


async def extract_entity_transactions(
    entity_type: str,
    entity_value: str,
    investigation_start: str,
    investigation_end: str,
    gmv_start: str,
    gmv_end: str,
    output_path: str,
):
    """Extract transactions for entity across time windows."""
    client = SnowflakeClient()
    await client.connect()

    table = get_full_table_name()
    email = entity_value.lower()

    # Define columns to extract
    # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
    columns = """
        TX_ID_KEY,
        TX_DATETIME,
        EMAIL,
        GMV,
        PAID_AMOUNT_CURRENCY,
        NSURE_LAST_DECISION,
        IS_FRAUD_TX,
        MODEL_SCORE,
        MAXMIND_RISK_SCORE,
        IP,
        IP_COUNTRY_CODE,
        DEVICE_ID,
        USER_AGENT,
        PAYMENT_METHOD,
        MERCHANT_NAME
    """

    # Query 1: Investigation Period
    inv_query = f"""
        SELECT {columns}
        FROM {table}
        WHERE LOWER(EMAIL) = '{email}'
          AND TX_DATETIME >= '{investigation_start}'
          AND TX_DATETIME <= '{investigation_end}'
        ORDER BY TX_DATETIME DESC
    """

    # Query 2: GMV Window
    gmv_query = f"""
        SELECT {columns}
        FROM {table}
        WHERE LOWER(EMAIL) = '{email}'
          AND TX_DATETIME >= '{gmv_start}'
          AND TX_DATETIME <= '{gmv_end}'
        ORDER BY TX_DATETIME DESC
    """

    # Query 3: Last 24 hours (from now)
    now = datetime.utcnow()
    yesterday = now - timedelta(hours=24)
    recent_query = f"""
        SELECT {columns}
        FROM {table}
        WHERE LOWER(EMAIL) = '{email}'
          AND TX_DATETIME >= '{yesterday.strftime("%Y-%m-%d %H:%M:%S")}'
        ORDER BY TX_DATETIME DESC
    """

    # Query 4: All time (limited to 500)
    all_time_query = f"""
        SELECT {columns}
        FROM {table}
        WHERE LOWER(EMAIL) = '{email}'
        ORDER BY TX_DATETIME DESC
        LIMIT 500
    """

    print(f"Extracting transactions for {entity_type}:{entity_value}...")

    inv_txs = await client.execute_query(inv_query)
    gmv_txs = await client.execute_query(gmv_query)
    recent_txs = await client.execute_query(recent_query)
    all_txs = await client.execute_query(all_time_query)

    await client.disconnect()

    # Generate HTML
    html = generate_html_report(
        entity_type=entity_type,
        entity_value=entity_value,
        investigation_start=investigation_start,
        investigation_end=investigation_end,
        gmv_start=gmv_start,
        gmv_end=gmv_end,
        inv_txs=inv_txs,
        gmv_txs=gmv_txs,
        recent_txs=recent_txs,
        all_txs=all_txs,
    )

    # Save HTML
    with open(output_path, "w") as f:
        f.write(html)

    print(f"Report saved to: {output_path}")
    return output_path


def generate_html_report(
    entity_type: str,
    entity_value: str,
    investigation_start: str,
    investigation_end: str,
    gmv_start: str,
    gmv_end: str,
    inv_txs: list,
    gmv_txs: list,
    recent_txs: list,
    all_txs: list,
) -> str:
    """Generate HTML report with transaction tables."""

    def format_tx_table(txs: list, title: str, description: str) -> str:
        if not txs:
            return f"""
            <div class="panel">
                <h2>{title}</h2>
                <p style="color: var(--muted);">{description}</p>
                <p style="color: var(--warning); margin-top: 16px;">No transactions found.</p>
            </div>
            """

        # Calculate stats
        total_amount = sum(float(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0) or 0) for tx in txs)
        fraud_count = sum(1 for tx in txs if tx.get("IS_FRAUD_TX") == 1)
        approved_count = sum(1 for tx in txs if str(tx.get("NSURE_LAST_DECISION", "")).upper() == "APPROVED")

        rows = ""
        for tx in txs:
            tx_id = str(tx.get("TX_ID_KEY", ""))[:12] + "..."
            tx_dt = str(tx.get("TX_DATETIME", ""))[:19]
            amount = float(tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY", 0) or 0)
            currency = tx.get("PAID_AMOUNT_CURRENCY", "USD")
            decision = tx.get("NSURE_LAST_DECISION", "Unknown")
            is_fraud = tx.get("IS_FRAUD_TX", 0)
            model_score = tx.get("MODEL_SCORE")
            ip = tx.get("IP", "")[:20] if tx.get("IP") else ""
            country = tx.get("IP_COUNTRY_CODE", "")
            device = str(tx.get("DEVICE_ID", ""))[:15] + "..." if tx.get("DEVICE_ID") else ""

            fraud_badge = '<span style="color: var(--error); font-weight: bold;">FRAUD</span>' if is_fraud == 1 else '<span style="color: var(--ok);">Legit</span>'
            decision_color = "var(--ok)" if str(decision).upper() == "APPROVED" else "var(--warning)" if str(decision).upper() in ["REVIEW", "UNKNOWN"] else "var(--error)"
            model_score_str = f"{model_score:.3f}" if model_score is not None else "N/A"

            rows += f"""
            <tr>
                <td><code>{tx_id}</code></td>
                <td>{tx_dt}</td>
                <td style="text-align: right;">${amount:,.2f} {currency}</td>
                <td style="color: {decision_color};">{decision}</td>
                <td>{fraud_badge}</td>
                <td>{model_score_str}</td>
                <td>{ip} ({country})</td>
                <td><code>{device}</code></td>
            </tr>
            """

        return f"""
        <div class="panel">
            <h2>{title}</h2>
            <p style="color: var(--muted); margin-bottom: 16px;">{description}</p>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--accent);">{len(txs)}</div>
                    <div style="color: var(--muted); font-size: 12px;">Transactions</div>
                </div>
                <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--ok);">${total_amount:,.2f}</div>
                    <div style="color: var(--muted); font-size: 12px;">Total Amount</div>
                </div>
                <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--error);">{fraud_count}</div>
                    <div style="color: var(--muted); font-size: 12px;">Fraud Transactions</div>
                </div>
                <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--accent-secondary);">{approved_count}</div>
                    <div style="color: var(--muted); font-size: 12px;">Approved</div>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border);">
                            <th>TX ID</th>
                            <th>Date/Time</th>
                            <th style="text-align: right;">Amount</th>
                            <th>Decision</th>
                            <th>Fraud</th>
                            <th>Model Score</th>
                            <th>IP (Country)</th>
                            <th>Device ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
        </div>
        """

    inv_table = format_tx_table(
        inv_txs,
        f"📊 Investigation Period Transactions ({len(inv_txs)})",
        f"Transactions from {investigation_start} to {investigation_end}"
    )

    gmv_table = format_tx_table(
        gmv_txs,
        f"💰 GMV Window Transactions ({len(gmv_txs)})",
        f"Transactions from {gmv_start} to {gmv_end} (AFTER investigation)"
    )

    recent_table = format_tx_table(
        recent_txs,
        f"⏱️ Last 24 Hours ({len(recent_txs)})",
        "Most recent transactions from the last 24 hours"
    )

    all_table = format_tx_table(
        all_txs,
        f"📁 All Historical Transactions ({len(all_txs)})",
        "Complete transaction history (limited to 500 most recent)"
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction Data - {entity_type}:{entity_value}</title>
    <style>
        :root {{
            --bg: #0a0e27;
            --panel: #151932;
            --border: #1e2440;
            --text: #e0e6ed;
            --muted: #8b95a6;
            --accent: #4a9eff;
            --accent-secondary: #7b68ee;
            --ok: #4ade80;
            --warning: #fbbf24;
            --error: #f87171;
            --panel-glass: rgba(21, 25, 50, 0.6);
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 24px;
            line-height: 1.6;
        }}
        .panel {{
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        h1 {{ color: var(--accent); margin-bottom: 8px; }}
        h2 {{ color: var(--accent-secondary); margin-bottom: 16px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 10px 8px; text-align: left; border-bottom: 1px solid var(--border); }}
        th {{ font-weight: 600; color: var(--accent); }}
        code {{ background: var(--panel-glass); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
        .nav-tabs {{
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 2px solid var(--border);
            padding-bottom: 16px;
        }}
        .nav-tab {{
            padding: 12px 24px;
            background: var(--panel-glass);
            border: 1px solid var(--border);
            border-radius: 8px 8px 0 0;
            color: var(--text);
            text-decoration: none;
            font-weight: 600;
        }}
        .nav-tab:hover {{ background: var(--accent); color: var(--bg); }}
        .nav-tab.active {{ background: var(--accent); color: var(--bg); }}
    </style>
</head>
<body>
    <div class="nav-tabs">
        <a href="confusion_matrix_auto-comp-1fa5bb0cbb6d.html" class="nav-tab">📊 Page 1: Confusion Matrix</a>
        <a href="index.html" class="nav-tab">🏠 Index</a>
        <a href="#" class="nav-tab active">📋 Page 3: Transaction Data</a>
    </div>

    <div class="panel">
        <h1>📋 Transaction Data Report</h1>
        <p style="color: var(--muted); margin-bottom: 16px;">
            Complete transaction data for <code>{entity_type}:{entity_value}</code>
        </p>
        <p><strong>Investigation Period:</strong> {investigation_start} to {investigation_end}</p>
        <p><strong>GMV Window:</strong> {gmv_start} to {gmv_end}</p>
        <p><strong>Generated:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    </div>

    {inv_table}
    {gmv_table}
    {recent_table}
    {all_table}

    <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 12px;">
        <p>Generated by Olorin Fraud Detection Platform</p>
        <p>Data Source: Snowflake TRANSACTIONS_ENRICHED</p>
    </div>
</body>
</html>
"""


if __name__ == "__main__":
    # Entity and time windows for investigation auto-comp-1fa5bb0cbb6d
    asyncio.run(
        extract_entity_transactions(
            entity_type="email",
            entity_value="thejockerchileno16@gmail.com",
            investigation_start="2023-12-22 22:24:11",
            investigation_end="2024-12-16 22:24:11",
            gmv_start="2024-12-17 00:00:00",
            gmv_end="2025-06-15 00:00:00",
            output_path="artifacts/investigation_package_auto-comp-1fa5bb0cbb6d/transactions_auto-comp-1fa5bb0cbb6d.html",
        )
    )
