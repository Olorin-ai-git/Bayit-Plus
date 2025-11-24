#!/usr/bin/env python3
"""
Generate comparison package for a completed auto-comparison investigation.

This script generates the comparison package and reports for a specific investigation,
even if it completed after the startup timeout.

Usage:
    python scripts/generate_package_for_completed_investigation.py <investigation_id>
    
Example:
    python scripts/generate_package_for_completed_investigation.py auto-comp-ee88621fd85b
"""

import sys
import json
import asyncio
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Minimal imports to avoid circular dependencies
from app.persistence.database import get_db
from app.service.investigation_state_service import InvestigationStateService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def generate_package_for_investigation(investigation_id: str):
    """Generate comparison package for a specific investigation."""
    
    logger.info(f"📦 Generating package for investigation: {investigation_id}")
    
    # Get investigation state
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = InvestigationStateService(db)
        state = service.get_state_with_auth(
            investigation_id=investigation_id,
            user_id="package-generation-script"
        )
        
        if state.status != "COMPLETED":
            logger.warning(f"⚠️ Investigation {investigation_id} is not completed (status: {state.status})")
            logger.info("   Package generation requires completed investigations")
            return None
        
        logger.info(f"✅ Investigation {investigation_id} is completed")
        
        # Extract entity information from settings_json
        settings_dict = {}
        if state.settings_json:
            try:
                settings_dict = json.loads(state.settings_json)
            except json.JSONDecodeError:
                pass
        
        entities = settings_dict.get("entities", [])
        entity_type = None
        entity_value = None
        if entities and len(entities) > 0:
            entity_type = entities[0].get("entity_type") if isinstance(entities[0], dict) else getattr(entities[0], "entity_type", None)
            entity_value = entities[0].get("entity_value") if isinstance(entities[0], dict) else getattr(entities[0], "entity_value", None)
        
        logger.info(f"   Entity: {entity_type}={entity_value}")
        
        # Extract risk score from progress_json
        risk_score = None
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
                risk_score = progress_dict.get("overall_risk_score") or progress_dict.get("risk_score")
            except json.JSONDecodeError:
                pass
        
        logger.info(f"   Risk Score: {risk_score}")
        
        # Import package_comparison_results here to avoid circular imports
        from app.service.investigation.auto_comparison import package_comparison_results
        
        # Create comparison result structure
        comparison_result = {
            "investigation_id": investigation_id,
            "status": "success",
            "investigation_completed": True,
            "entity_type": entity_type,
            "entity_value": entity_value,
            "risk_score": risk_score,
        }
        
        # Create reports directory
        reports_dir = Path("artifacts/comparisons/auto_startup")
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate startup report
        logger.info("📊 Generating startup analysis report...")
        startup_report_path = None
        try:
            from app.service.reporting.startup_report_generator import generate_startup_report
            
            # Create minimal app state for report generation
            app_state = {
                "auto_comparison_results": [comparison_result],
                "auto_comparison_completed": True,
                "startup_duration_seconds": None,
            }
            
            report_path = generate_startup_report(
                app_state=app_state,
                startup_duration_seconds=None,
                reports_dir=reports_dir
            )
            logger.info(f"✅ Startup report generated: {report_path}")
            startup_report_path = str(report_path)
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate startup report: {e}")
            logger.info("   Continuing without startup report...")
        
        # Generate comparison package
        logger.info("📦 Creating comparison package...")
        zip_path = await package_comparison_results(
            comparison_results=[comparison_result],
            output_dir=reports_dir,
            startup_report_path=startup_report_path
        )
        
        logger.info(f"✅ Package generated successfully: {zip_path}")
        if zip_path.exists():
            size_mb = zip_path.stat().st_size / 1024 / 1024
            logger.info(f"   Package size: {size_mb:.2f} MB")
        
        return zip_path
        
    finally:
        db.close()


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_package_for_completed_investigation.py <investigation_id>")
        print("\nExample:")
        print("  python scripts/generate_package_for_completed_investigation.py auto-comp-ee88621fd85b")
        sys.exit(1)
    
    investigation_id = sys.argv[1]
    
    try:
        zip_path = await generate_package_for_investigation(investigation_id)
        if zip_path:
            print(f"\n✅ Success! Package generated: {zip_path}")
            print(f"   Location: {zip_path.absolute()}")
            sys.exit(0)
        else:
            print("\n⚠️ Package generation skipped (investigation not completed)")
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Failed to generate package: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

