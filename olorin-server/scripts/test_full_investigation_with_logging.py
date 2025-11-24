#!/usr/bin/env python3
"""
Test Full Investigation with Complete Logging

Tests a single entity investigation with:
- Investigation folder creation
- Journey tracking
- Server logs
- Domain agent execution
- Full 2-year investigation window
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.investigation.auto_comparison import create_and_wait_for_investigation
from app.service.logging.investigation_folder_manager import get_folder_manager
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_full_investigation():
    """Run a full investigation with complete logging"""
    
    print("=" * 80)
    print("🔬 TESTING FULL INVESTIGATION WITH LOGGING")
    print("=" * 80)
    print()
    
    # Test entity - use an entity we know has some fraud
    entity_type = "email"
    entity_value = "pettigrew227@gmail.com"  # From our previous test - has fraud
    
    # Investigation window: 2 years ending 6 months ago
    tz = pytz.timezone("America/New_York")
    now = datetime.now(tz)
    
    # Window end: 6 months ago
    window_end = now - timedelta(days=6*30)
    # Window start: 2 years before that
    window_start = window_end - timedelta(days=2*365)
    
    print(f"Entity: {entity_type}={entity_value}")
    print(f"Investigation Window:")
    print(f"  Start: {window_start.strftime('%Y-%m-%d')}")
    print(f"  End: {window_end.strftime('%Y-%m-%d')}")
    print(f"  Duration: {(window_end - window_start).days} days")
    print()
    
    print("🚀 Creating investigation...")
    print()
    
    # Create and wait for investigation
    investigation = await create_and_wait_for_investigation(
        entity_type=entity_type,
        entity_value=entity_value,
        window_start=window_start,
        window_end=window_end,
        max_wait_seconds=600  # Wait up to 10 minutes
    )
    
    if not investigation:
        print("❌ Investigation failed or timed out")
        return False
    
    print()
    print("=" * 80)
    print("✅ INVESTIGATION COMPLETED!")
    print("=" * 80)
    print()
    
    investigation_id = investigation.get('id')
    print(f"Investigation ID: {investigation_id}")
    print(f"Status: {investigation.get('status')}")
    print(f"Overall Risk Score: {investigation.get('overall_risk_score', 'N/A')}")
    print()
    
    # Check investigation folder
    print("=" * 80)
    print("📂 CHECKING INVESTIGATION FOLDER")
    print("=" * 80)
    print()
    
    try:
        folder_manager = get_folder_manager()
        folder_path = folder_manager.get_investigation_folder(investigation_id)
        
        if folder_path and folder_path.exists():
            print(f"✅ Investigation folder found: {folder_path}")
            print()
            
            # List all files
            print("Files created:")
            for item in sorted(folder_path.rglob("*")):
                if item.is_file():
                    size = item.stat().st_size
                    rel_path = item.relative_to(folder_path)
                    print(f"  📄 {rel_path} ({size:,} bytes)")
            print()
            
            # Check specific files
            file_paths = folder_manager.get_log_file_paths(investigation_id)
            
            print("Expected log files:")
            for log_type, log_path in file_paths.items():
                if log_path.exists():
                    size = log_path.stat().st_size if log_path.is_file() else "dir"
                    print(f"  ✅ {log_type}: {log_path.name} ({size if size == 'dir' else f'{size:,} bytes'})")
                else:
                    print(f"  ❌ {log_type}: NOT FOUND")
            print()
            
            # Show journey tracking summary if exists
            journey_file = file_paths.get("journey_log")
            if journey_file and journey_file.exists():
                import json
                with open(journey_file) as f:
                    journey_data = json.load(f)
                
                print("=" * 80)
                print("🗺️  JOURNEY TRACKING SUMMARY")
                print("=" * 80)
                print()
                print(f"Status: {journey_data.get('status')}")
                print(f"Started: {journey_data.get('start_timestamp')}")
                print(f"Ended: {journey_data.get('end_timestamp', 'N/A')}")
                print(f"Node Executions: {len(journey_data.get('node_executions', []))}")
                print(f"State Transitions: {len(journey_data.get('state_transitions', []))}")
                print(f"Agent Coordinations: {len(journey_data.get('agent_coordinations', []))}")
                print()
                
                # Show node executions
                node_execs = journey_data.get('node_executions', [])
                if node_execs:
                    print("Node Executions:")
                    for exec_data in node_execs[:10]:  # Show first 10
                        node_name = exec_data.get('node_name', 'Unknown')
                        node_type = exec_data.get('node_type', 'Unknown')
                        status = exec_data.get('status', 'Unknown')
                        duration = exec_data.get('duration_ms', 0)
                        print(f"  • {node_name} ({node_type}): {status} ({duration}ms)")
                    if len(node_execs) > 10:
                        print(f"  ... and {len(node_execs) - 10} more")
                print()
            
            # Show metadata
            metadata_file = file_paths.get("metadata")
            if metadata_file and metadata_file.exists():
                import json
                with open(metadata_file) as f:
                    metadata = json.load(f)
                
                print("=" * 80)
                print("📋 INVESTIGATION METADATA")
                print("=" * 80)
                print()
                for key, value in metadata.items():
                    if key == 'config' and isinstance(value, dict):
                        print(f"{key}:")
                        for k, v in value.items():
                            print(f"  {k}: {v}")
                    else:
                        print(f"{key}: {value}")
                print()
                
        else:
            print(f"❌ Investigation folder not found for: {investigation_id}")
            
    except Exception as e:
        print(f"❌ Error checking investigation folder: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 80)
    print("✅ TEST COMPLETE")
    print("=" * 80)
    
    return True

if __name__ == "__main__":
    result = asyncio.run(test_full_investigation())
    sys.exit(0 if result else 1)

