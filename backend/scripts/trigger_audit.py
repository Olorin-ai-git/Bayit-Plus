#!/usr/bin/env python3
"""
Direct Audit Trigger (bypasses API authentication)
Triggers AI agent audit directly by calling the service function
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.ai_agent_service import run_ai_agent_audit


async def trigger_audit(
    max_iterations: int = 200,
    budget_limit: float = 15.0,
    dry_run: bool = False
):
    """Trigger comprehensive AI agent audit"""
    
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "COMPREHENSIVE AUDIT STARTING" + " " * 30 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    print(f"⚙️  Configuration:")
    print(f"   Max Iterations: {max_iterations}")
    print(f"   Budget Limit: ${budget_limit}")
    print(f"   Dry Run: {dry_run}")
    print(f"   Mode: {'TEST (no changes)' if dry_run else 'LIVE (will fix issues)'}")
    print()
    print("🤖 Starting AI Agent...")
    print()
    
    # Connect to MongoDB
    client = None
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    # Initialize Beanie
    from beanie import init_beanie
    from app.models.content import Content, Category
    from app.models.subtitles import SubtitleTrackDoc, SubtitleSearchCacheDoc, SubtitleQuotaTrackerDoc
    from app.models.librarian import AuditReport, LibrarianAction
    
    await init_beanie(
        database=db,
        document_models=[
            Content,
            Category,
            SubtitleTrackDoc,
            SubtitleSearchCacheDoc,
            SubtitleQuotaTrackerDoc,
            AuditReport,
            LibrarianAction
        ]
    )
    
    try:
        # Run the audit
        result = await run_ai_agent_audit(
            audit_type="ai_agent",
            dry_run=dry_run,
            max_iterations=max_iterations,
            budget_limit_usd=budget_limit,
            language="en"
        )
        
        print()
        print("╔" + "=" * 78 + "╗")
        print("║" + " " * 25 + "AUDIT COMPLETED!" + " " * 36 + "║")
        print("╚" + "=" * 78 + "╝")
        print()
        print(f"📊 Summary:")
        print(f"   Status: {result.status}")
        
        # Calculate duration
        if result.completed_at and result.created_at:
            duration = (result.completed_at - result.created_at).total_seconds()
            print(f"   Duration: {duration:.1f}s ({duration/60:.1f} minutes)")
        elif hasattr(result, 'execution_time_seconds'):
            print(f"   Duration: {result.execution_time_seconds:.1f}s")
        
        # Display summary stats
        if result.summary:
            print(f"   Items Checked: {result.summary.get('total_items', 0)}")
            print(f"   Issues Found: {result.summary.get('issues_found', 0)}")
            print(f"   Issues Fixed: {result.summary.get('issues_fixed', 0)}")
        print()
        
    except Exception as e:
        print()
        print(f"❌ Error during audit: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if client is not None:
            try:
                client.close()  # Motor client.close() is synchronous, not async
            except Exception:
                pass  # Ignore cleanup errors


if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description="Trigger comprehensive AI agent audit")
    parser.add_argument(
        "--iterations",
        type=int,
        default=200,
        help="Maximum tool calls (default: 200)"
    )
    parser.add_argument(
        "--budget",
        type=float,
        default=15.0,
        help="Maximum budget in USD (default: 15.0)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test mode - no changes will be made"
    )
    
    args = parser.parse_args()
    
    asyncio.run(trigger_audit(
        max_iterations=args.iterations,
        budget_limit=args.budget,
        dry_run=args.dry_run
    ))
