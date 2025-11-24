#!/usr/bin/env python3
"""
Verify Completed Investigation State Persistence
Checks that completed investigations have all required data persisted correctly.
"""

import sys
import json
from datetime import datetime, timezone
from app.models.investigation_state import InvestigationState
from app.persistence.database import init_database, get_db_session
from app.schemas.investigation_state import InvestigationStatus, LifecycleStage

def verify_completed_investigation(investigation_id: str):
    """
    Verify that a completed investigation has all required data persisted.
    
    Args:
        investigation_id: The investigation ID to check
    """
    
    # Initialize database connection
    init_database()
    print(f"\n{'='*80}")
    print(f"🔍 VERIFYING COMPLETED INVESTIGATION: {investigation_id}")
    print(f"{'='*80}\n")
    
    try:
        with get_db_session() as session:
            # Query investigation state
            state = session.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if not state:
                print(f"❌ Investigation '{investigation_id}' not found in database")
                return False
            
            issues_found = []
            warnings = []
            
            # Check basic fields
            print("📋 BASIC INFO:")
            print(f"  investigation_id: {state.investigation_id}")
            print(f"  user_id: {state.user_id}")
            print(f"  lifecycle_stage: {state.lifecycle_stage}")
            print(f"  status: {state.status}")
            print(f"  version: {state.version}")
            print(f"  created_at: {state.created_at}")
            print(f"  updated_at: {state.updated_at}")
            print(f"  last_accessed: {state.last_accessed}")
            
            # Check if investigation is completed
            is_completed = (
                state.status == InvestigationStatus.COMPLETED or 
                state.lifecycle_stage == LifecycleStage.COMPLETED
            )
            
            if not is_completed:
                print(f"\n⚠️  WARNING: Investigation status is '{state.status}', not COMPLETED")
                print(f"   This script is designed to verify completed investigations.")
                print(f"   Continuing verification anyway...\n")
                warnings.append(f"Investigation is not COMPLETED (status: {state.status})")
            
            # Check settings_json
            print(f"\n📋 SETTINGS_JSON:")
            settings_data = None
            if state.settings_json:
                try:
                    settings_data = json.loads(state.settings_json)
                    print(f"  ✅ Valid JSON ({len(state.settings_json)} bytes)")
                    
                    # Verify required fields (investigation_type may be missing in older investigations)
                    if 'entities' not in settings_data:
                        issues_found.append("settings.entities is missing")
                    # investigation_type is optional for older investigations
                    
                    # Show key fields
                    print(f"  📝 Key Fields:")
                    print(f"    name: {settings_data.get('name', 'N/A')}")
                    print(f"    investigation_type: {settings_data.get('investigation_type', 'N/A')}")
                    print(f"    investigation_mode: {settings_data.get('investigation_mode', 'N/A')}")
                    print(f"    entities count: {len(settings_data.get('entities', []))}")
                    print(f"    tools count: {len(settings_data.get('tools', []))}")
                    
                except json.JSONDecodeError as e:
                    issues_found.append(f"settings_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                issues_found.append("settings_json is NULL")
                print(f"  ❌ NULL (CRITICAL)")
            
            # Check progress_json - should have full data for completed investigations
            print(f"\n📋 PROGRESS_JSON:")
            progress_data = None
            if state.progress_json:
                try:
                    progress_data = json.loads(state.progress_json)
                    print(f"  ✅ Valid JSON ({len(state.progress_json)} bytes)")
                    
                    # Verify required fields (handle both old and new schema formats)
                    # Old schema uses: tools_executed, progress_percentage
                    # New schema uses: tool_executions, percent_complete
                    has_tool_data = 'tool_executions' in progress_data or 'tools_executed' in progress_data
                    has_percent = 'percent_complete' in progress_data or 'progress_percentage' in progress_data
                    
                    if not has_tool_data:
                        issues_found.append("progress.tool_executions or tools_executed is missing")
                    if not has_percent:
                        issues_found.append("progress.percent_complete or progress_percentage is missing")
                    
                    # Show detailed progress information (handle both schema formats)
                    print(f"  📈 Progress Details:")
                    
                    # Handle both old and new schema formats
                    percent_complete = progress_data.get('percent_complete') or progress_data.get('progress_percentage', 'N/A')
                    print(f"    percent_complete/progress_percentage: {percent_complete}")
                    print(f"    current_phase: {progress_data.get('current_phase', 'N/A')}")
                    print(f"    status: {progress_data.get('status', 'N/A')}")
                    print(f"    lifecycle_stage: {progress_data.get('lifecycle_stage', 'N/A')}")
                    
                    # Handle both tool_executions (new) and tools_executed (old) formats
                    tool_executions = progress_data.get('tool_executions', [])
                    tools_executed = progress_data.get('tools_executed', [])
                    
                    if tool_executions:
                        # New schema: array of tool execution objects
                        print(f"    tool_executions count: {len(tool_executions)}")
                        completed_tools = [t for t in tool_executions if isinstance(t, dict) and t.get('status') == 'completed']
                        failed_tools = [t for t in tool_executions if isinstance(t, dict) and t.get('status') == 'failed']
                        running_tools = [t for t in tool_executions if isinstance(t, dict) and t.get('status') == 'running']
                        
                        print(f"      - Completed: {len(completed_tools)}")
                        print(f"      - Failed: {len(failed_tools)}")
                        print(f"      - Running: {len(running_tools)}")
                        
                        # Show first few tool executions
                        if tool_executions:
                            print(f"      - First 5 tools:")
                            for tool in tool_executions[:5]:
                                if isinstance(tool, dict):
                                    tool_name = tool.get('tool_name', 'unknown')
                                    tool_status = tool.get('status', 'unknown')
                                    print(f"        • {tool_name}: {tool_status}")
                                else:
                                    print(f"        • {tool}")
                            if len(tool_executions) > 5:
                                print(f"        ... and {len(tool_executions) - 5} more")
                    elif tools_executed:
                        # Old schema: array of tool names (strings)
                        print(f"    tools_executed count: {len(tools_executed)}")
                        print(f"      Tools: {', '.join(tools_executed[:5])}")
                        if len(tools_executed) > 5:
                            print(f"      ... and {len(tools_executed) - 5} more")
                    else:
                        if is_completed:
                            warnings.append("No tool_executions or tools_executed found in progress_json for completed investigation")
                    
                    # Check phase progress if available
                    if 'phase_progress' in progress_data:
                        phase_progress = progress_data['phase_progress']
                        if phase_progress:
                            print(f"    phase_progress: {len(phase_progress)} phases tracked")
                    
                except json.JSONDecodeError as e:
                    issues_found.append(f"progress_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                issues_found.append("progress_json is NULL")
                print(f"  ❌ NULL (CRITICAL)")
            
            # Check results_json - should be populated for completed investigations
            print(f"\n📋 RESULTS_JSON:")
            results_data = None
            if state.results_json:
                try:
                    results_data = json.loads(state.results_json)
                    print(f"  ✅ Valid JSON ({len(state.results_json)} bytes)")
                    
                    # Show key results fields
                    print(f"  📊 Results Summary:")
                    if isinstance(results_data, dict):
                        print(f"    Keys: {list(results_data.keys())[:10]}")
                        if 'findings' in results_data:
                            findings = results_data['findings']
                            if isinstance(findings, list):
                                print(f"    findings count: {len(findings)}")
                            elif isinstance(findings, dict):
                                print(f"    findings keys: {list(findings.keys())[:5]}")
                        
                        if 'risk_score' in results_data:
                            print(f"    risk_score: {results_data.get('risk_score', 'N/A')}")
                        
                        if 'summary' in results_data:
                            summary = results_data['summary']
                            if isinstance(summary, str):
                                print(f"    summary length: {len(summary)} chars")
                            elif isinstance(summary, dict):
                                print(f"    summary keys: {list(summary.keys())[:5]}")
                    else:
                        print(f"    Results type: {type(results_data)}")
                    
                except json.JSONDecodeError as e:
                    issues_found.append(f"results_json is invalid JSON: {str(e)}")
                    print(f"  ❌ Invalid JSON: {str(e)}")
            else:
                if is_completed:
                    warnings.append("results_json is NULL for completed investigation (may be expected if no results)")
                print(f"  ⚠️  NULL")
            
            # Check version consistency
            if state.version < 1:
                issues_found.append(f"version is {state.version}, should be >= 1")
            
            # Check status/lifecycle consistency
            if state.status == InvestigationStatus.COMPLETED and state.lifecycle_stage != LifecycleStage.COMPLETED:
                issues_found.append(f"status is COMPLETED but lifecycle_stage is {state.lifecycle_stage}")
            
            # Check timestamps
            if state.created_at and state.updated_at:
                if state.updated_at < state.created_at:
                    issues_found.append("updated_at is before created_at")
            
            # Summary
            print(f"\n{'='*80}")
            print(f"📊 VERIFICATION SUMMARY")
            print(f"{'='*80}")
            
            if warnings:
                print(f"\n⚠️  WARNINGS: {len(warnings)}")
                for i, warning in enumerate(warnings, 1):
                    print(f"  {i}. {warning}")
            
            if issues_found:
                print(f"\n❌ ISSUES FOUND: {len(issues_found)}")
                for i, issue in enumerate(issues_found, 1):
                    print(f"  {i}. {issue}")
                return False
            else:
                print(f"\n✅ NO ISSUES FOUND - Investigation state is correctly persisted")
                if is_completed:
                    print(f"✅ COMPLETED INVESTIGATION VERIFIED:")
                    print(f"   - Settings: {'✅' if settings_data else '❌'}")
                    print(f"   - Progress: {'✅' if progress_data else '❌'} ({len(progress_data.get('tool_executions', [])) if progress_data else 0} tools)")
                    print(f"   - Results: {'✅' if results_data else '⚠️  (may be null)'}")
                return True
                
    except Exception as e:
        print(f"❌ Error verifying investigation: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_completed_investigation.py <investigation_id>")
        print("Example: python verify_completed_investigation.py inv-1762533252070-vc3xdqf")
        sys.exit(1)
    
    investigation_id = sys.argv[1]
    success = verify_completed_investigation(investigation_id)
    sys.exit(0 if success else 1)

