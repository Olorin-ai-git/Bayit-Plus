#!/usr/bin/env python3
"""
Verify and Fix Investigation State Persistence
Checks investigation state in database and fixes any persistence issues.
"""

import json
import sys
from datetime import datetime, timezone

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session, init_database
from app.schemas.investigation_state import InvestigationStatus, LifecycleStage


def verify_and_fix_investigation(investigation_id: str, auto_fix: bool = True):
    """
    Verify investigation state persistence and fix any issues.

    Args:
        investigation_id: The investigation ID to check
        auto_fix: If True, automatically fix issues found
    """

    # Initialize database connection
    init_database()
    print(f"\n{'='*80}")
    print(f"🔍 VERIFYING INVESTIGATION: {investigation_id}")
    print(f"{'='*80}\n")

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
                return False

            issues_found = []
            fixes_applied = []

            # Check basic fields
            print("📋 BASIC INFO:")
            print(f"  investigation_id: {state.investigation_id}")
            print(f"  user_id: {state.user_id}")
            print(f"  lifecycle_stage: {state.lifecycle_stage}")
            print(f"  status: {state.status}")
            print(f"  version: {state.version}")
            print(f"  created_at: {state.created_at}")
            print(f"  updated_at: {state.updated_at}")
            print(f"  last_accessed: {state.last_accessed}")

            # Check settings_json
            print(f"\n📋 SETTINGS_JSON:")
            if state.settings_json:
                try:
                    settings = json.loads(state.settings_json)
                    print(f"  ✅ Valid JSON ({len(state.settings_json)} bytes)")
                    # Check for required fields
                    if not settings.get("entities"):
                        issues_found.append("settings.entities is missing or empty")
                    if not settings.get("investigation_type"):
                        issues_found.append("settings.investigation_type is missing")
                except json.JSONDecodeError as e:
                    issues_found.append(f"settings_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                issues_found.append("settings_json is NULL")
                print(f"  ⚠️  NULL")

            # Check progress_json
            print(f"\n📋 PROGRESS_JSON:")
            if state.progress_json:
                try:
                    progress = json.loads(state.progress_json)
                    print(f"  ✅ Valid JSON ({len(state.progress_json)} bytes)")
                    print(f"  📈 Key Fields:")
                    print(
                        f"    percent_complete: {progress.get('percent_complete', 'N/A')}"
                    )
                    print(f"    current_phase: {progress.get('current_phase', 'N/A')}")
                    print(f"    status: {progress.get('status', 'N/A')}")
                    print(
                        f"    tool_executions count: {len(progress.get('tool_executions', []))}"
                    )

                    # Check for required fields
                    if "percent_complete" not in progress:
                        issues_found.append("progress.percent_complete is missing")
                    if "tool_executions" not in progress:
                        issues_found.append("progress.tool_executions is missing")
                except json.JSONDecodeError as e:
                    issues_found.append(f"progress_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                # This is a critical issue - progress_json should not be NULL for IN_PROGRESS investigations
                if (
                    state.status == InvestigationStatus.IN_PROGRESS
                    or state.lifecycle_stage == LifecycleStage.IN_PROGRESS
                ):
                    issues_found.append(
                        "progress_json is NULL but status is IN_PROGRESS - should be initialized"
                    )
                    print(f"  ⚠️  NULL (CRITICAL: status is IN_PROGRESS)")

                    if auto_fix:
                        _initialize_progress_json(session, state)
                        fixes_applied.append("Initialized progress_json")
                        print(f"  ✅ AUTO-FIXED: Initialized progress_json")
                else:
                    print(f"  ⚠️  NULL (OK for non-IN_PROGRESS status)")

            # Check results_json
            print(f"\n📋 RESULTS_JSON:")
            if state.results_json:
                try:
                    results = json.loads(state.results_json)
                    print(f"  ✅ Valid JSON ({len(state.results_json)} bytes)")
                except json.JSONDecodeError as e:
                    issues_found.append(f"results_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                print(f"  ⚠️  NULL (OK - results only set when investigation completes)")

            # Check version consistency
            if state.version < 1:
                issues_found.append(f"version is {state.version}, should be >= 1")

            # Check status/lifecycle consistency
            if (
                state.status == InvestigationStatus.IN_PROGRESS
                and state.lifecycle_stage != LifecycleStage.IN_PROGRESS
            ):
                issues_found.append(
                    f"status is IN_PROGRESS but lifecycle_stage is {state.lifecycle_stage}"
                )

            # Summary
            print(f"\n{'='*80}")
            print(f"📊 VERIFICATION SUMMARY")
            print(f"{'='*80}")

            if issues_found:
                print(f"\n⚠️  ISSUES FOUND: {len(issues_found)}")
                for i, issue in enumerate(issues_found, 1):
                    print(f"  {i}. {issue}")
            else:
                print(
                    f"\n✅ NO ISSUES FOUND - Investigation state is correctly persisted"
                )

            if fixes_applied:
                session.commit()
                print(f"\n🔧 FIXES APPLIED: {len(fixes_applied)}")
                for i, fix in enumerate(fixes_applied, 1):
                    print(f"  {i}. {fix}")
                print(f"\n✅ Database updated successfully")
                return True
            elif issues_found and not auto_fix:
                print(f"\n💡 Run with auto_fix=True to automatically fix issues")
                return False
            else:
                return len(issues_found) == 0

    except Exception as e:
        print(f"❌ Error verifying investigation: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def _initialize_progress_json(session, state: InvestigationState):
    """Initialize progress_json for a single investigation state."""
    initial_progress = {
        "status": "running",
        "lifecycle_stage": "in_progress",
        "percent_complete": 0,
        "tool_executions": [],
        "current_phase": "initialization",
        "started_at": (
            state.updated_at.isoformat()
            if state.updated_at
            else datetime.now(timezone.utc).isoformat()
        ),
        "created_at": (
            state.created_at.isoformat()
            if state.created_at
            else datetime.now(timezone.utc).isoformat()
        ),
    }

    state.progress_json = json.dumps(initial_progress)
    state.version += 1  # Increment version for optimistic locking
    state.updated_at = datetime.now(timezone.utc)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: python verify_and_fix_investigation.py <investigation_id> [--no-auto-fix]"
        )
        print(
            "Example: python verify_and_fix_investigation.py inv-1762520013758-c80qozw"
        )
        sys.exit(1)

    investigation_id = sys.argv[1]
    auto_fix = "--no-auto-fix" not in sys.argv

    success = verify_and_fix_investigation(investigation_id, auto_fix=auto_fix)
    sys.exit(0 if success else 1)
