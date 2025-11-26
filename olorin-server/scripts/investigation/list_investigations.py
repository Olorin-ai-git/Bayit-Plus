#!/usr/bin/env python3
"""
List Investigations from Database
Shows all investigations with their status for easy selection.
"""

import sys

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session, init_database
from app.schemas.investigation_state import InvestigationStatus, LifecycleStage


def list_investigations(status_filter: str = None, limit: int = 20):
    """
    List investigations from database.

    Args:
        status_filter: Optional status filter (e.g., 'COMPLETED', 'IN_PROGRESS')
        limit: Maximum number of investigations to show
    """

    init_database()

    try:
        with get_db_session() as session:
            query = session.query(InvestigationState)

            if status_filter:
                query = query.filter(InvestigationState.status == status_filter.upper())

            investigations = (
                query.order_by(InvestigationState.created_at.desc()).limit(limit).all()
            )

            if not investigations:
                print(f"\n{'='*80}")
                print(f"📋 INVESTIGATIONS")
                print(f"{'='*80}\n")
                print(
                    f"❌ No investigations found"
                    + (f" with status '{status_filter}'" if status_filter else "")
                )
                return

            print(f"\n{'='*80}")
            print(
                f"📋 INVESTIGATIONS"
                + (f" (status: {status_filter})" if status_filter else "")
            )
            print(f"{'='*80}\n")

            # Count by status
            status_counts = {}
            for inv in investigations:
                status = inv.status
                status_counts[status] = status_counts.get(status, 0) + 1

            print(f"📊 Summary: {len(investigations)} investigations")
            for status, count in sorted(status_counts.items()):
                print(f"   {status}: {count}")
            print()

            # List investigations
            for i, inv in enumerate(investigations, 1):
                print(f"{i}. {inv.investigation_id}")
                print(f"   Status: {inv.status} | Lifecycle: {inv.lifecycle_stage}")
                print(f"   User: {inv.user_id} | Version: {inv.version}")
                print(f"   Created: {inv.created_at} | Updated: {inv.updated_at}")

                # Show JSON field status
                has_settings = "✅" if inv.settings_json else "❌"
                has_progress = "✅" if inv.progress_json else "❌"
                has_results = "✅" if inv.results_json else "❌"
                print(
                    f"   JSON: Settings={has_settings} Progress={has_progress} Results={has_results}"
                )
                print()

    except Exception as e:
        print(f"❌ Error listing investigations: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    status_filter = sys.argv[1] if len(sys.argv) > 1 else None
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    if status_filter and status_filter.lower() == "completed":
        print("🔍 Finding COMPLETED investigations...")
    elif status_filter and status_filter.lower() == "in_progress":
        print("🔍 Finding IN_PROGRESS investigations...")

    list_investigations(status_filter=status_filter, limit=limit)
