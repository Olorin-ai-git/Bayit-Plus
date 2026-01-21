#!/usr/bin/env python3
"""
Check Investigation State in Database
Queries the database to show the full state of an investigation.
"""

import json
import sys

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session, init_database


def check_investigation_state(investigation_id: str):
    """Query and display the full investigation state from database."""

    # Initialize database connection
    init_database()
    print(f"🔍 Database initialized")

    # Use database session
    try:
        with get_db_session() as session:
            # Query investigation state
            state = (
                session.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not state:
                print(f"❌ Investigation '{investigation_id}' not found in database")
                return

            print(f"\n{'='*80}")
            print(f"📊 INVESTIGATION STATE: {investigation_id}")
            print(f"{'='*80}\n")

            # Display all fields
            print("🔹 BASIC INFO:")
            print(f"  investigation_id: {state.investigation_id}")
            print(f"  user_id: {state.user_id}")
            print(f"  lifecycle_stage: {state.lifecycle_stage}")
            print(f"  status: {state.status}")
            print(f"  version: {state.version}")
            print(f"  created_at: {state.created_at}")
            print(f"  updated_at: {state.updated_at}")
            print(f"  last_accessed: {state.last_accessed}")

            print(f"\n🔹 SETTINGS_JSON:")
            if state.settings_json:
                try:
                    settings = json.loads(state.settings_json)
                    print(f"  ✅ Valid JSON ({len(state.settings_json)} bytes)")
                    print(f"  Content:")
                    print(json.dumps(settings, indent=4))
                except json.JSONDecodeError as e:
                    print(f"  ❌ Invalid JSON: {str(e)}")
                    print(f"  Raw: {state.settings_json[:200]}...")
            else:
                print(f"  ⚠️  NULL")

            print(f"\n🔹 PROGRESS_JSON:")
            if state.progress_json:
                try:
                    progress = json.loads(state.progress_json)
                    print(f"  ✅ Valid JSON ({len(state.progress_json)} bytes)")
                    print(f"  Content:")
                    print(json.dumps(progress, indent=4))

                    # Show key fields
                    print(f"\n  📈 Key Fields:")
                    print(
                        f"    percent_complete: {progress.get('percent_complete', 'N/A')}"
                    )
                    print(f"    current_phase: {progress.get('current_phase', 'N/A')}")
                    print(f"    status: {progress.get('status', 'N/A')}")
                    print(
                        f"    lifecycle_stage: {progress.get('lifecycle_stage', 'N/A')}"
                    )
                    print(
                        f"    tool_executions count: {len(progress.get('tool_executions', []))}"
                    )
                    if progress.get("tool_executions"):
                        print(f"    Tool executions:")
                        for te in progress.get("tool_executions", [])[
                            :5
                        ]:  # Show first 5
                            print(
                                f"      - {te.get('tool_name', 'unknown')} ({te.get('status', 'unknown')})"
                            )
                        if len(progress.get("tool_executions", [])) > 5:
                            print(
                                f"      ... and {len(progress.get('tool_executions', [])) - 5} more"
                            )
                except json.JSONDecodeError as e:
                    print(f"  ❌ Invalid JSON: {str(e)}")
                    print(f"  Raw: {state.progress_json[:200]}...")
            else:
                print(f"  ⚠️  NULL (This is why progress is empty!)")

            print(f"\n🔹 RESULTS_JSON:")
            if state.results_json:
                try:
                    results = json.loads(state.results_json)
                    print(f"  ✅ Valid JSON ({len(state.results_json)} bytes)")
                    print(f"  Content preview:")
                    print(
                        json.dumps(results, indent=4)[:500] + "..."
                        if len(json.dumps(results)) > 500
                        else json.dumps(results, indent=4)
                    )
                except json.JSONDecodeError as e:
                    print(f"  ❌ Invalid JSON: {str(e)}")
                    print(f"  Raw: {state.results_json[:200]}...")
            else:
                print(f"  ⚠️  NULL")

            print(f"\n{'='*80}\n")

    except Exception as e:
        print(f"❌ Error querying database: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_investigation_state.py <investigation_id>")
        print("Example: python check_investigation_state.py inv-1762518175240-g2pctmd")
        sys.exit(1)

    investigation_id = sys.argv[1]
    check_investigation_state(investigation_id)
