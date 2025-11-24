#!/usr/bin/env python3
"""
Create Test Investigation Folder

Creates a sample investigation folder with realistic data for testing HTML report generation.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def create_test_investigation():
    """Create a test investigation folder with sample data"""
    print("🔧 Creating test investigation folder...")
    
    try:
        from app.service.logging.investigation_folder_manager import InvestigationMode, get_folder_manager
        
        # Initialize folder manager
        folder_manager = get_folder_manager()
        
        # Create test investigation
        investigation_id = "test_account_takeover_demo"
        mode = InvestigationMode.DEMO
        scenario = "account_takeover"
        
        folder_path, metadata = folder_manager.create_investigation_folder(
            investigation_id=investigation_id,
            mode=mode,
            scenario=scenario,
            config={
                "scenario": scenario,
                "entity_id": "192.168.1.100",
                "test_mode": "demo",
                "csv_limit": 5,
                "timeout": 300
            }
        )
        
        print(f"✅ Created investigation folder: {folder_path}")
        
        # Create sample structured_activities.jsonl
        structured_file = folder_path / "structured_activities.jsonl"
        sample_activities = [
            {
                "interaction_type": "investigation_progress",
                "data": {
                    "interaction_id": "prog-001",
                    "investigation_id": investigation_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "progress_type": "started",
                    "current_phase": "initialization",
                    "completed_phases": [],
                    "findings_summary": {},
                    "risk_score_progression": [],
                    "agent_status": {}
                }
            },
            {
                "interaction_type": "llm_call",
                "data": {
                    "interaction_id": "llm-001",
                    "investigation_id": investigation_id,
                    "agent_name": "device_analyzer",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "model_name": "gpt-4",
                    "prompt_template": "Analyze device fingerprint",
                    "full_prompt": "Analyze the following device fingerprint for suspicious activity...",
                    "response": "Device analysis indicates potential spoofing based on inconsistent browser characteristics.",
                    "tokens_used": {"total_tokens": 150, "prompt_tokens": 80, "completion_tokens": 70},
                    "tools_available": ["device_fingerprint_analyzer", "geolocation_checker"],
                    "tools_used": ["device_fingerprint_analyzer"],
                    "reasoning_chain": "The device fingerprint shows inconsistencies in screen resolution vs reported device model.",
                    "confidence_score": 0.85,
                    "response_time_ms": 1200
                }
            },
            {
                "interaction_type": "agent_decision",
                "data": {
                    "interaction_id": "dec-001",
                    "investigation_id": investigation_id,
                    "agent_name": "risk_assessor",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "decision_type": "risk_assessment",
                    "context": {"entity_type": "ip", "entity_id": "192.168.1.100"},
                    "reasoning": "Multiple suspicious indicators suggest coordinated account takeover attempt",
                    "decision_outcome": {"risk_score": 0.89, "category": "high_risk"},
                    "confidence_score": 0.92,
                    "alternative_decisions": [],
                    "execution_time_ms": 50
                }
            },
            {
                "interaction_type": "tool_execution",
                "data": {
                    "interaction_id": "tool-001",
                    "investigation_id": investigation_id,
                    "agent_name": "location_analyzer",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tool_name": "geolocation_checker",
                    "tool_parameters": {"ip": "192.168.1.100", "detailed_lookup": True},
                    "selection_reasoning": "Need to verify claimed location against actual geolocation data",
                    "execution_result": {
                        "country": "US",
                        "city": "San Francisco",
                        "timezone": "America/Los_Angeles",
                        "suspicious": False
                    },
                    "success": True,
                    "execution_time_ms": 340
                }
            }
        ]
        
        with open(structured_file, 'w') as f:
            for activity in sample_activities:
                f.write(json.dumps(activity) + '\n')
        
        print(f"✅ Created structured activities file with {len(sample_activities)} entries")
        
        # Create sample journey_tracking.json
        journey_file = folder_path / "journey_tracking.json"
        journey_data = {
            "investigation_id": investigation_id,
            "start_timestamp": datetime.now(timezone.utc).isoformat(),
            "end_timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "node_executions": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "node_name": "device_analysis",
                    "node_type": "agent",
                    "input_data": {"device_fingerprint": "sample_fingerprint"},
                    "output_data": {"risk_indicators": ["screen_resolution_mismatch", "browser_inconsistency"]},
                    "duration_ms": 1500,
                    "status": "completed"
                },
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "node_name": "location_verification",
                    "node_type": "tool",
                    "input_data": {"ip": "192.168.1.100"},
                    "output_data": {"location_verified": True, "country": "US"},
                    "duration_ms": 340,
                    "status": "completed"
                }
            ],
            "state_transitions": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "from_state": "initialized",
                    "to_state": "analyzing",
                    "trigger": "start_analysis",
                    "context": {"phase": "device_analysis"}
                },
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "from_state": "analyzing", 
                    "to_state": "completed",
                    "trigger": "analysis_complete",
                    "context": {"final_risk_score": 0.89}
                }
            ],
            "agent_coordinations": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "coordinator_agent": "orchestrator",
                    "target_agent": "device_analyzer",
                    "action": "handoff",
                    "data": {"task": "analyze_device_fingerprint"}
                }
            ],
            "final_state": {
                "status": "completed",
                "final_risk_score": 0.89,
                "confidence": 0.92,
                "duration_ms": 5000
            }
        }
        
        with open(journey_file, 'w') as f:
            json.dump(journey_data, f, indent=2)
        
        print(f"✅ Created journey tracking file")
        
        # Create sample investigation.log
        log_file = folder_path / "investigation.log"
        log_entries = [
            f"{datetime.now(timezone.utc).isoformat()} [INFO] Investigation started: {investigation_id}",
            f"{datetime.now(timezone.utc).isoformat()} [DEBUG] Device fingerprint analysis initiated",
            f"{datetime.now(timezone.utc).isoformat()} [INFO] Risk score calculated: 0.89",
            f"{datetime.now(timezone.utc).isoformat()} [WARN] High risk indicators detected",
            f"{datetime.now(timezone.utc).isoformat()} [INFO] Investigation completed successfully"
        ]
        
        with open(log_file, 'w') as f:
            for entry in log_entries:
                f.write(entry + '\n')
        
        print(f"✅ Created investigation log with {len(log_entries)} entries")
        
        # Update metadata status
        folder_manager.update_investigation_status(investigation_id, "completed")
        
        print(f"\n🎯 Test investigation created successfully!")
        print(f"   📁 Folder: {folder_path}")
        print(f"   🆔 ID: {investigation_id}")
        print(f"   🎭 Mode: {mode.value}")
        print(f"   🎬 Scenario: {scenario}")
        print(f"   📊 Files: metadata.json, structured_activities.jsonl, journey_tracking.json, investigation.log")
        
        return str(folder_path)
        
    except Exception as e:
        print(f"❌ Failed to create test investigation: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    folder_path = create_test_investigation()
    if folder_path:
        print(f"\n🚀 Ready to test HTML report generation with: {folder_path}")
    else:
        sys.exit(1)