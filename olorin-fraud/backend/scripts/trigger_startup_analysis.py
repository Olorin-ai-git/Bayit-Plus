#!/usr/bin/env python3
"""
Trigger Startup Analysis Flow
Manually triggers the startup analysis flow (auto-comparisons) without restarting the server.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.service.investigation.auto_comparison import run_auto_comparisons_for_top_entities

async def main():
    print("🚀 Triggering Startup Analysis Flow...")
    
    # Ensure config allows it
    os.environ["ENABLE_STARTUP_ANALYSIS"] = "true"
    
    try:
        results = await run_auto_comparisons_for_top_entities(
            top_percentage=0.1,
            time_window_hours=24,
            force_refresh=True
        )
        print(f"✅ Startup Analysis Flow Triggered/Completed. Processed {len(results)} entities.")
    except Exception as e:
        print(f"❌ Error triggering startup analysis: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

