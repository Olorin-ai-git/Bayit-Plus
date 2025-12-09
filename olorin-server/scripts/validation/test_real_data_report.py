#!/usr/bin/env python3
"""Test consolidated report with REAL data from database"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def main():
    from app.persistence.database import get_db
    from app.models.investigation_state import InvestigationState
    from app.service.reporting.consolidated_startup_report import generate_consolidated_report
    
    print("════════════════════════════════════════════════════════════")
    print("🔍 FETCHING REAL INVESTIGATION DATA FROM DATABASE")
    print("════════════════════════════════════════════════════════════")
    print()
    
    # Get REAL investigations from database
    db_gen = get_db()
    db = next(db_gen)
    
    investigations = db.query(InvestigationState).filter(
        InvestigationState.investigation_id.like("auto-comp-%"),
        InvestigationState.status == "COMPLETED"
    ).order_by(InvestigationState.updated_at.desc()).limit(15).all()
    
    print(f"Found {len(investigations)} completed auto-comparison investigations")
    
    # Build comparison_results from REAL database data
    comparison_results = []
    for inv in investigations:
        result = {
            "investigation_id": inv.investigation_id,
            "entity_type": "email",
            "status": inv.status,
        }
        
        # Parse settings for entity and merchant
        if inv.settings_json:
            import json
            settings = json.loads(inv.settings_json)
            entities = settings.get("entities", [])
            if entities:
                result["entity_value"] = entities[0].get("entity_value")
                result["email"] = entities[0].get("entity_value")
            
            # Extract merchant from name
            import re
            name = settings.get("name", "")
            match = re.search(r"\(Merchant: (.*?)\)", name)
            result["merchant_name"] = match.group(1) if match else "Unknown"
        
        # Parse progress for revenue data (if available)
        if inv.progress_json:
            import json
            progress = json.loads(inv.progress_json)
            # Revenue data might be stored in progress
            revenue = progress.get("revenue_implications", {})
            if revenue:
                result["revenue_data"] = revenue
        
        comparison_results.append(result)
        print(f"  • {result.get('email', 'unknown')} ({result.get('merchant_name', 'Unknown')})")
    
    print()
    print(f"📦 Generating ZIP package from {len(comparison_results)} REAL investigations...")
    print()
    
    # Generate report (will enrich with REAL confusion matrix data)
    zip_path = await generate_consolidated_report(comparison_results)
    
    print()
    print("════════════════════════════════════════════════════════════")
    print("✅ SUCCESS! ZIP PACKAGE WITH REAL DATA")
    print("════════════════════════════════════════════════════════════")
    print()
    print(f"📦 File: {zip_path}")
    print(f"📊 Size: {zip_path.stat().st_size / 1024:.1f} KB")
    print()
    
    # Open
    import subprocess
    subprocess.run(["open", "-R", str(zip_path)])

if __name__ == "__main__":
    asyncio.run(main())
