#!/bin/bash
#
# Reapply Fixes Script
# Attempts to reapply failed fixes from the most recent audit without using LLM
#
# Usage:
#   ./reapply_fixes.sh [options]
#
# Options:
#   --dry-run       Test mode - no changes will be made
#   --audit-id ID   Reapply from specific audit (default: most recent)
#   --help          Show this help message
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/backend"

# Default values
DRY_RUN=false
AUDIT_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --audit-id)
            AUDIT_ID="$2"
            shift 2
            ;;
        --help)
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                      REAPPLY FIXES (No LLM Required)                       ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "⚙️  Configuration:"
echo "   Dry Run: $DRY_RUN"
echo "   Audit ID: ${AUDIT_ID:-'(most recent)'}"
echo ""

cd "$BACKEND_DIR"

poetry run python3 << EOF
import asyncio
import sys
from datetime import datetime

async def run_reapply():
    from app.core.database import connect_to_mongo, close_mongo_connection
    from app.models.librarian import AuditReport
    from app.services.ai_agent.issue_tracker import get_reapply_items
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
        execute_fix_missing_poster,
    )
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    await connect_to_mongo()

    dry_run = $( [ "$DRY_RUN" = "true" ] && echo "True" || echo "False" )
    audit_id = "$AUDIT_ID" or None

    try:
        # Find audit to reapply from
        if audit_id:
            from beanie import PydanticObjectId
            source_audit = await AuditReport.get(PydanticObjectId(audit_id))
        else:
            recent_audits = await AuditReport.find(
                {"status": {"\$in": ["completed", "partial", "failed"]}}
            ).sort([("audit_date", -1)]).limit(5).to_list()

            source_audit = None
            tracked_items = []

            for audit in recent_audits:
                items = await get_reapply_items(str(audit.id))
                if items:
                    source_audit = audit
                    tracked_items = items
                    break

        if not source_audit:
            print("❌ No audit found with reapply-eligible items")
            return

        if not tracked_items:
            tracked_items = await get_reapply_items(str(source_audit.id))

        print(f"📋 Source Audit: {source_audit.id}")
        print(f"   Status: {source_audit.status}")
        print(f"   Items to reapply: {len(tracked_items)}")
        print("")

        if not tracked_items:
            print("✅ No items to reapply!")
            return

        print("═" * 60)
        print("REAPPLYING FIXES")
        print("═" * 60)

        success_count = 0
        fail_count = 0

        for item in tracked_items:
            tool_name = item.get("tool_name")
            content_id = item.get("content_id")

            print(f"\n🔧 {tool_name}: {content_id[:24]}...")

            if dry_run:
                print("   ⏭️  Skipped (dry run)")
                continue

            try:
                if tool_name == "fix_missing_metadata":
                    result = await execute_fix_missing_metadata(content_id=content_id)
                elif tool_name == "fix_missing_poster":
                    result = await execute_fix_missing_poster(content_id=content_id)
                elif tool_name == "clean_title":
                    result = await execute_clean_title(content_id=content_id)
                else:
                    result = {"success": False, "error": f"Unknown tool: {tool_name}"}

                if result.get("success"):
                    print(f"   ✅ Success: {result.get('message', 'Fixed')}")
                    success_count += 1
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    fail_count += 1

            except Exception as e:
                print(f"   ❌ Error: {e}")
                fail_count += 1

        print("")
        print("═" * 60)
        print("SUMMARY")
        print("═" * 60)
        print(f"   ✅ Success: {success_count}")
        print(f"   ❌ Failed: {fail_count}")
        print(f"   📊 Total: {len(tracked_items)}")

    finally:
        await close_mongo_connection()

asyncio.run(run_reapply())
EOF

echo ""
echo "Done!"
