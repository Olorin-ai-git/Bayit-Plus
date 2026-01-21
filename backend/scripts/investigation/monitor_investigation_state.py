#!/usr/bin/env python3
"""
Monitor Investigation State Persistence
Continuously monitors an investigation's state in the database to verify persistence.
"""

import json
import sys
import time
from datetime import datetime

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session, init_database


def monitor_investigation_state(
    investigation_id: str, interval: int = 5, max_iterations: int = 12
):
    """Monitor investigation state changes in real-time."""

    init_database()
    print(f"🔍 Monitoring investigation: {investigation_id}")
    print(f"   Interval: {interval}s, Max iterations: {max_iterations}")
    print(f"{'='*80}\n")

    previous_version = None
    previous_progress_json = None

    for iteration in range(max_iterations):
        try:
            with get_db_session() as session:
                state = (
                    session.query(InvestigationState)
                    .filter(InvestigationState.investigation_id == investigation_id)
                    .first()
                )

                if not state:
                    print(f"❌ Investigation '{investigation_id}' not found")
                    return

                # Check for changes
                version_changed = (
                    previous_version is not None and state.version != previous_version
                )
                progress_changed = previous_progress_json != state.progress_json

                timestamp = datetime.now().strftime("%H:%M:%S")

                print(f"[{timestamp}] Iteration {iteration + 1}/{max_iterations}")
                print(f"  Status: {state.status}")
                print(f"  Lifecycle: {state.lifecycle_stage}")
                print(
                    f"  Version: {state.version}",
                    "🔄 CHANGED" if version_changed else "",
                )
                print(f"  Updated: {state.updated_at}")

                if state.progress_json:
                    try:
                        progress = json.loads(state.progress_json)
                        print(f"  Progress JSON: ✅ ({len(state.progress_json)} bytes)")
                        print(
                            f"    - percent_complete: {progress.get('percent_complete', 'N/A')}"
                        )
                        print(
                            f"    - current_phase: {progress.get('current_phase', 'N/A')}"
                        )
                        print(
                            f"    - tool_executions: {len(progress.get('tool_executions', []))}"
                        )
                        if progress.get("tool_executions"):
                            print(f"    - Tools:")
                            for te in progress.get("tool_executions", [])[:3]:
                                print(
                                    f"      • {te.get('tool_name', 'unknown')} ({te.get('status', 'unknown')})"
                                )
                        if progress_changed:
                            print(f"    🔄 PROGRESS JSON CHANGED!")
                    except json.JSONDecodeError:
                        print(f"  Progress JSON: ❌ Invalid JSON")
                else:
                    print(f"  Progress JSON: ⚠️  NULL")
                    if progress_changed:
                        print(f"    🔄 Progress JSON changed (was not null, now null)")

                print()

                # Update previous values
                previous_version = state.version
                previous_progress_json = state.progress_json

                # Check if investigation completed
                if state.status in ["COMPLETED", "ERROR", "CANCELLED"]:
                    print(f"✅ Investigation reached terminal status: {state.status}")
                    break

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback

            traceback.print_exc()

        if iteration < max_iterations - 1:
            time.sleep(interval)

    print(f"{'='*80}")
    print(f"✅ Monitoring complete")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: python monitor_investigation_state.py <investigation_id> [interval] [max_iterations]"
        )
        print("Example: python monitor_investigation_state.py inv-123 5 12")
        sys.exit(1)

    investigation_id = sys.argv[1]
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    max_iterations = int(sys.argv[3]) if len(sys.argv) > 3 else 12

    monitor_investigation_state(investigation_id, interval, max_iterations)
