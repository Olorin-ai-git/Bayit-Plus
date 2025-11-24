#!/usr/bin/env python3
"""
Generate confusion tables for recent completed investigations.

This script:
1. Lists recent completed investigations
2. Generates confusion tables for each
3. Reports success/failure for each
"""

import sys
import asyncio
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.investigation.confusion_table_generator import generate_confusion_table_for_investigation
from app.service.logging.investigation_folder_manager import get_folder_manager

logger = get_bridge_logger(__name__)


async def generate_for_investigation(investigation_id: str) -> Dict[str, Any]:
    """Generate confusion table for a single investigation."""
    try:
        folder_manager = get_folder_manager()
        investigation_folder = folder_manager.get_investigation_folder(investigation_id)
        
        result = await generate_confusion_table_for_investigation(investigation_id, investigation_folder)
        
        if result:
            return {
                "investigation_id": investigation_id,
                "status": "success",
                "path": str(result)
            }
        else:
            return {
                "investigation_id": investigation_id,
                "status": "failed",
                "error": "No result returned"
            }
    except Exception as e:
        logger.error(f"Failed to generate confusion table for {investigation_id}: {e}", exc_info=True)
        return {
            "investigation_id": investigation_id,
            "status": "error",
            "error": str(e)
        }


async def main():
    """Main function."""
    print("=" * 80)
    print("GENERATING CONFUSION TABLES FOR RECENT INVESTIGATIONS")
    print("=" * 80)
    print()
    
    try:
        from app.persistence.database import get_db_session
        from app.models.investigation_state import InvestigationState
        
        with get_db_session() as session:
            # Get last 10 completed investigations
            invs = session.query(InvestigationState).filter(
                InvestigationState.status == 'COMPLETED'
            ).order_by(
                InvestigationState.updated_at.desc()
            ).limit(10).all()
            
            print(f"Found {len(invs)} completed investigations")
            print()
            
            if not invs:
                print("No completed investigations found.")
                return
            
            # Generate confusion tables for each
            results = []
            for i, inv in enumerate(invs, 1):
                investigation_id = inv.investigation_id
                print(f"{i}. Generating confusion table for: {investigation_id}")
                
                result = await generate_for_investigation(investigation_id)
                results.append(result)
                
                if result["status"] == "success":
                    print(f"   ✅ Success: {result['path']}")
                elif result["status"] == "failed":
                    print(f"   ⚠️ Failed: {result.get('error', 'Unknown error')}")
                else:
                    print(f"   ❌ Error: {result.get('error', 'Unknown error')}")
                print()
            
            # Summary
            print("=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print()
            
            success_count = sum(1 for r in results if r["status"] == "success")
            failed_count = sum(1 for r in results if r["status"] == "failed")
            error_count = sum(1 for r in results if r["status"] == "error")
            
            print(f"Total: {len(results)}")
            print(f"  ✅ Success: {success_count}")
            print(f"  ⚠️ Failed: {failed_count}")
            print(f"  ❌ Errors: {error_count}")
            print()
            
            if failed_count > 0 or error_count > 0:
                print("Failed/Error Investigations:")
                for r in results:
                    if r["status"] != "success":
                        print(f"  - {r['investigation_id']}: {r.get('error', 'Unknown')}")
                        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

