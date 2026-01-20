#!/usr/bin/env python3
"""
View Latest Audit Results
Shows the most recent audit report and actions taken
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def view_latest_audit():
    """View the most recent audit report"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Initialize Beanie
    from beanie import init_beanie
    from app.models.content import Content, 
from app.models.content_taxonomy import ContentSection
    from app.models.subtitles import SubtitleTrackDoc
    from app.models.librarian import AuditReport, LibrarianAction
    
    await init_beanie(
        database=db,
        document_models=[
            Content,
            Category,
            SubtitleTrackDoc,
            AuditReport,
            LibrarianAction
        ]
    )
    
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 25 + "LATEST AUDIT REPORT" + " " * 33 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    # Get latest audit
    audits = await AuditReport.find(
        AuditReport.audit_type == "ai_agent"
    ).sort("-created_at").limit(1).to_list()
    
    audit = audits[0] if audits else None
    
    if not audit:
        print("❌ No audit reports found")
        await client.close()
        return
    
    # Calculate duration
    if audit.completed_at and audit.created_at:
        duration = (audit.completed_at - audit.created_at).total_seconds()
    else:
        duration = 0
    
    print(f"📋 Audit ID: {audit.id}")
    print(f"🕐 Started: {audit.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if audit.completed_at:
        print(f"✅ Completed: {audit.completed_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏱️  Duration: {duration:.1f}s ({duration/60:.1f} minutes)")
    print(f"📊 Status: {audit.status}")
    print()
    
    # Summary
    if audit.summary:
        print("📈 SUMMARY")
        for key, value in audit.summary.items():
            print(f"   {key}: {value}")
        print()
    
    # Get actions taken
    actions = await LibrarianAction.find(
        LibrarianAction.audit_id == str(audit.id)
    ).to_list()
    
    if actions:
        print(f"🔧 ACTIONS TAKEN ({len(actions)} total)")
        print()
        
        # Group by action type
        by_type = {}
        for action in actions:
            if action.action_type not in by_type:
                by_type[action.action_type] = []
            by_type[action.action_type].append(action)
        
        for action_type, action_list in by_type.items():
            print(f"   {action_type}: {len(action_list)} actions")
            
            # Show first few examples
            for action in action_list[:3]:
                status_icon = "✅" if action.status == "completed" else "⏳" if action.status == "pending" else "❌"
                print(f"      {status_icon} {action.description[:80]}")
            
            if len(action_list) > 3:
                print(f"      ... and {len(action_list) - 3} more")
            print()
    
    # Get updated library stats
    print("📊 CURRENT LIBRARY STATUS")
    total_content = await Content.count()
    
    # Count items with all required subtitles
    items_with_all_subs = 0
    async for content in Content.find_all():
        subtitles = await SubtitleTrackDoc.find(
            SubtitleTrackDoc.content_id == str(content.id)
        ).to_list()
        
        existing_languages = {sub.language for sub in subtitles}
        if {"en", "he", "es"}.issubset(existing_languages):
            items_with_all_subs += 1
    
    # Count metadata issues
    missing_imdb = await Content.find(
        Content.imdb_id != None,
        Content.imdb_rating == None
    ).count()
    
    missing_poster = await Content.find(
        Content.poster_url == None,
        Content.thumbnail == None
    ).count()
    
    print(f"   Total Items: {total_content}")
    print(f"   Complete Subtitles (EN/HE/ES): {items_with_all_subs} ({items_with_all_subs/total_content*100:.1f}%)")
    print(f"   Missing IMDB Ratings: {missing_imdb}")
    print(f"   Missing Posters: {missing_poster}")
    print()
    
    print("╚" + "=" * 78 + "╝")
    
    if client:
        client.close()  # Motor client.close() is synchronous


if __name__ == "__main__":
    asyncio.run(view_latest_audit())
