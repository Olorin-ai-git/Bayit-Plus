#!/usr/bin/env python3
"""Check investigation results structure to understand data format."""

import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session


def check_investigation_results():
    """Check the structure of investigation results."""
    with get_db_session() as session:
        # Get a completed investigation
        # Try to find one with results_json first
        query = (
            select(InvestigationState)
            .where(
                InvestigationState.status == "COMPLETED",
                InvestigationState.results_json.isnot(None),
            )
            .limit(1)
        )
        result = session.execute(query)
        investigation = result.scalar_one_or_none()

        # If none found, get any completed one
        if not investigation:
            query = (
                select(InvestigationState)
                .where(InvestigationState.status == "COMPLETED")
                .limit(1)
            )
        result = session.execute(query)
        investigation = result.scalar_one_or_none()

        if not investigation:
            print("No completed investigations found")
            return

        print("=== INVESTIGATION RESULTS STRUCTURE ===")
        print(f"Investigation ID: {investigation.investigation_id}")
        print(f"Status: {investigation.status}")
        print(f"Has results_json: {bool(investigation.results_json)}")
        print(f"Has progress_json: {bool(investigation.progress_json)}")

        if investigation.results_json:
            try:
                results = json.loads(investigation.results_json)
                print(f"\nresults_json keys: {list(results.keys())}")
                print(f"\nresults_json structure:")
                print(json.dumps(results, indent=2, default=str)[:3000])
            except Exception as e:
                print(f"Error parsing results_json: {e}")

        if investigation.progress_json:
            try:
                progress = json.loads(investigation.progress_json)
                print(f"\nprogress_json keys: {list(progress.keys())}")

                # Check for snowflake_data (might contain transactions)
                if "snowflake_data" in progress:
                    print(f"\n✅ Found snowflake_data in progress_json!")
                    sf_data = progress["snowflake_data"]
                    if isinstance(sf_data, dict):
                        print(f"  snowflake_data keys: {list(sf_data.keys())[:20]}")
                        if "transactions" in sf_data:
                            print(f"  ✅ Transactions found in snowflake_data!")
                            tx_data = sf_data["transactions"]
                            if isinstance(tx_data, list):
                                print(f"    Transaction count: {len(tx_data)}")
                                if tx_data and isinstance(tx_data[0], dict):
                                    print(
                                        f"    First transaction keys: {list(tx_data[0].keys())}"
                                    )
                                    print(
                                        f"    Sample transaction: {json.dumps(tx_data[0], indent=2, default=str)[:500]}"
                                    )

                # Check if tool_executions contain transaction data
                if "tool_executions" in progress:
                    tool_execs = progress["tool_executions"]
                    print(
                        f"\nFound {len(tool_execs) if isinstance(tool_execs, list) else 0} tool executions"
                    )
                    if isinstance(tool_execs, list) and tool_execs:
                        for i, tool_exec in enumerate(tool_execs[:5], 1):
                            print(f"\n--- Tool Execution {i} ---")
                            print(f'Tool: {tool_exec.get("tool_name", "unknown")}')
                            print(f'Status: {tool_exec.get("status", "unknown")}')

                            if "result" in tool_exec:
                                result = tool_exec["result"]
                                if isinstance(result, dict):
                                    print(f"Result keys: {list(result.keys())[:15]}")

                                    # Check for transaction data
                                    if "transactions" in result:
                                        print(f"✅ Found transactions in result!")
                                        tx_data = result["transactions"]
                                        if isinstance(tx_data, list):
                                            print(
                                                f"  Transaction count: {len(tx_data)}"
                                            )
                                            if tx_data:
                                                print(
                                                    f'  First transaction keys: {list(tx_data[0].keys()) if isinstance(tx_data[0], dict) else "N/A"}'
                                                )

                                    # Check for snowflake_data (might contain transactions)
                                    if "snowflake_data" in result:
                                        print(f"✅ Found snowflake_data in result!")
                                        sf_data = result["snowflake_data"]
                                        if (
                                            isinstance(sf_data, dict)
                                            and "transactions" in sf_data
                                        ):
                                            print(
                                                f'  Transactions in snowflake_data: {len(sf_data["transactions"])}'
                                            )

                                    # Show sample of result data
                                    if len(str(result)) < 500:
                                        print(
                                            f"  Result sample: {json.dumps(result, indent=2, default=str)[:500]}"
                                        )
            except Exception as e:
                print(f"Error parsing progress_json: {e}")
                import traceback

                traceback.print_exc()


if __name__ == "__main__":
    check_investigation_results()
