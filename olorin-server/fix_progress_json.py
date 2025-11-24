#!/usr/bin/env python3
"""
Fix Progress JSON for Investigations
Initializes progress_json for investigations that are IN_PROGRESS but have null progress_json.
"""

import sys
import json
from datetime import datetime, timezone
from app.models.investigation_state import InvestigationState
from app.persistence.database import init_database, get_db_session

def fix_progress_json(investigation_id: str = None, fix_all: bool = False):
    """Initialize progress_json for investigations with null progress_json."""
    
    # Initialize database connection
    init_database()
    print(f"🔍 Database initialized")
    
    try:
        with get_db_session() as session:
            if fix_all:
                # Find all IN_PROGRESS investigations with null progress_json
                investigations = session.query(InvestigationState).filter(
                    InvestigationState.status == "IN_PROGRESS",
                    InvestigationState.progress_json.is_(None)
                ).all()
                
                print(f"📊 Found {len(investigations)} investigations with null progress_json")
                
                if len(investigations) == 0:
                    print("✅ No investigations need fixing")
                    return
                
                for state in investigations:
                    _initialize_progress_json(session, state)
                
                session.commit()
                print(f"✅ Fixed {len(investigations)} investigations")
                
            elif investigation_id:
                # Fix specific investigation
                state = session.query(InvestigationState).filter(
                    InvestigationState.investigation_id == investigation_id
                ).first()
                
                if not state:
                    print(f"❌ Investigation '{investigation_id}' not found")
                    return
                
                if state.progress_json:
                    print(f"⚠️  Investigation '{investigation_id}' already has progress_json")
                    print(f"   Current progress_json: {state.progress_json[:100]}...")
                    response = input("   Do you want to overwrite it? (yes/no): ")
                    if response.lower() != 'yes':
                        print("   Skipping...")
                        return
                
                _initialize_progress_json(session, state)
                session.commit()
                print(f"✅ Fixed investigation '{investigation_id}'")
            else:
                print("❌ Please specify either --all or an investigation_id")
                return
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

def _initialize_progress_json(session, state: InvestigationState):
    """Initialize progress_json for a single investigation state."""
    initial_progress = {
        "status": "running",
        "lifecycle_stage": "in_progress",
        "percent_complete": 0,  # Use percent_complete to match reading code
        "tool_executions": [],
        "current_phase": "initialization",  # Default phase for in-progress investigations
        "started_at": state.updated_at.isoformat() if state.updated_at else datetime.now(timezone.utc).isoformat(),
        "created_at": state.created_at.isoformat() if state.created_at else datetime.now(timezone.utc).isoformat()
    }
    
    state.progress_json = json.dumps(initial_progress)
    state.version += 1  # Increment version for optimistic locking
    state.updated_at = datetime.now(timezone.utc)
    
    print(f"  ✅ Initialized progress_json for {state.investigation_id}")
    print(f"     Version: {state.version - 1} -> {state.version}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python fix_progress_json.py <investigation_id>  # Fix specific investigation")
        print("  python fix_progress_json.py --all               # Fix all IN_PROGRESS investigations with null progress_json")
        print("\nExample:")
        print("  python fix_progress_json.py inv-1762518175240-g2pctmd")
        sys.exit(1)
    
    if sys.argv[1] == "--all":
        fix_progress_json(fix_all=True)
    else:
        investigation_id = sys.argv[1]
        fix_progress_json(investigation_id=investigation_id)

