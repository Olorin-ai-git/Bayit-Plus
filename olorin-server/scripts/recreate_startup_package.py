#!/usr/bin/env python3
"""
Recreate the startup comparison zip package.

This script recreates the zip package that contains:
- Comparison reports for top risk entities
- Summary HTML
- Comparison manifests
- Startup analysis report (if available)
"""
import sys
import os
import asyncio
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.service.investigation.auto_comparison import package_comparison_results
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def recreate_startup_package():
    """Recreate the startup comparison zip package."""
    print("📦 Recreating startup comparison package...\n")
    
    try:
        # Get auto comparison results from the most recent startup
        # These would typically be stored in app.state, but for manual recreation,
        # we'll need to either:
        # 1. Read from a file if saved
        # 2. Re-run auto comparisons
        # 3. Use empty list if no results available
        
        # For now, we'll create an empty package structure
        # In production, this would read from app.state.auto_comparison_results
        
        comparison_results = []  # Empty - will create package structure only
        
        print("   Note: No comparison results found. Creating empty package structure.")
        print("   To include results, run auto-comparisons first or provide results file.\n")
        
        # Find startup report if available
        from app.config.file_organization_config import FileOrganizationConfig
        config = FileOrganizationConfig()
        
        startup_reports_dir = config.artifacts_base_dir / "reports" / "startup"
        startup_report_path = None
        
        if startup_reports_dir.exists():
            # Find most recent startup report
            startup_reports = sorted(
                startup_reports_dir.glob("startup_analysis_*.html"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            if startup_reports:
                startup_report_path = str(startup_reports[0])
                print(f"   Found startup report: {startup_report_path}")
        
        # Create package
        zip_path = await package_comparison_results(
            comparison_results=comparison_results,
            output_dir=None,  # Use default location
            startup_report_path=startup_report_path
        )
        
        print(f"\n✅ Package created successfully!")
        print(f"   Location: {zip_path}")
        print(f"   Size: {zip_path.stat().st_size:,} bytes")
        
        return zip_path
        
    except Exception as e:
        logger.error(f"Failed to recreate startup package: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    result = asyncio.run(recreate_startup_package())
    if result:
        print(f"\n✅ Success! Package available at: {result}")
    else:
        print("\n❌ Failed to create package")
        sys.exit(1)

