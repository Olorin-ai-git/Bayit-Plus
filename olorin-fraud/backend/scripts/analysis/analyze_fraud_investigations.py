#!/usr/bin/env python3
"""
Analyze investigations with confirmed fraud using the app's database infrastructure.
"""
import sys
import os
import json
import asyncio

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.persistence.database import get_db_session
from app.models.investigation_state import InvestigationState
from sqlalchemy import desc

async def main():
    print("=" * 100)
    print("INVESTIGATIONS WITH CONFIRMED FRAUD - DETAILED ANALYSIS")
    print("=" * 100)
    
    # Query completed investigations with risk scores
    with get_db_session() as db:
        investigations = db.query(InvestigationState).filter(
            InvestigationState.status == 'COMPLETED',
            InvestigationState.overall_risk_score > 0
        ).order_by(desc(InvestigationState.overall_risk_score)).limit(5).all()
        
        if not investigations:
            print("\nNo completed investigations with risk scores found.")
            print("\nLet's check what investigations exist:")
            
            all_invs = db.query(InvestigationState).order_by(
                desc(InvestigationState.created_at)
            ).limit(10).all()
            
            for inv in all_invs:
                print(f"  {inv.investigation_id}: status={inv.status}, risk={inv.overall_risk_score}, entity={inv.entity_type}:{inv.entity_value}")
        else:
            for inv in investigations:
                print(f"\n{'=' * 100}")
                print(f"INVESTIGATION ID: {inv.investigation_id}")
                print(f"Entity: {inv.entity_type}={inv.entity_value}")
                print(f"Status: {inv.status}")
                print(f"Window: {inv.from_date} to {inv.to_date}")
                print(f"Created: {inv.created_at}")
                print(f"Updated: {inv.updated_at}")
                
                print(f"\n{'=' * 100}")
                print("RISK SCORES:")
                print(f"  Overall Risk Score: {inv.overall_risk_score:.4f}" if inv.overall_risk_score else "  Overall Risk Score: None")
                print(f"  Device Risk Score: {inv.device_risk_score:.4f}" if inv.device_risk_score else "  Device Risk Score: None")
                print(f"  Location Risk Score: {inv.location_risk_score:.4f}" if inv.location_risk_score else "  Location Risk Score: None")
                print(f"  Network Risk Score: {inv.network_risk_score:.4f}" if inv.network_risk_score else "  Network Risk Score: None")
                print(f"  Logs Risk Score: {inv.logs_risk_score:.4f}" if inv.logs_risk_score else "  Logs Risk Score: None")
                
                print(f"\n{'=' * 100}")
                print("DOMAIN AGENT LLM THOUGHTS:")
                
                print(f"\n--- DEVICE AGENT ---")
                if inv.device_llm_thoughts:
                    try:
                        device_thoughts = json.loads(inv.device_llm_thoughts) if isinstance(inv.device_llm_thoughts, str) else inv.device_llm_thoughts
                        print(json.dumps(device_thoughts, indent=2))
                    except:
                        print(str(inv.device_llm_thoughts)[:500])
                else:
                    print("  (No device thoughts recorded)")
                
                print(f"\n--- LOCATION AGENT ---")
                if inv.location_llm_thoughts:
                    try:
                        location_thoughts = json.loads(inv.location_llm_thoughts) if isinstance(inv.location_llm_thoughts, str) else inv.location_llm_thoughts
                        print(json.dumps(location_thoughts, indent=2))
                    except:
                        print(str(inv.location_llm_thoughts)[:500])
                else:
                    print("  (No location thoughts recorded)")
                
                print(f"\n--- NETWORK AGENT ---")
                if inv.network_llm_thoughts:
                    try:
                        network_thoughts = json.loads(inv.network_llm_thoughts) if isinstance(inv.network_llm_thoughts, str) else inv.network_llm_thoughts
                        print(json.dumps(network_thoughts, indent=2))
                    except:
                        print(str(inv.network_llm_thoughts)[:500])
                else:
                    print("  (No network thoughts recorded)")
                
                print(f"\n--- LOGS AGENT ---")
                if inv.logs_llm_thoughts:
                    try:
                        logs_thoughts = json.loads(inv.logs_llm_thoughts) if isinstance(inv.logs_llm_thoughts, str) else inv.logs_llm_thoughts
                        print(json.dumps(logs_thoughts, indent=2))
                    except:
                        print(str(inv.logs_llm_thoughts)[:500])
                else:
                    print("  (No logs thoughts recorded)")
                
                print(f"\n--- FINAL LLM THOUGHTS (Risk Assessment Agent) ---")
                if hasattr(inv, 'final_llm_thoughts') and inv.final_llm_thoughts:
                    try:
                        final_thoughts = json.loads(inv.final_llm_thoughts) if isinstance(inv.final_llm_thoughts, str) else inv.final_llm_thoughts
                        print(json.dumps(final_thoughts, indent=2))
                    except:
                        print(str(inv.final_llm_thoughts)[:500])
                else:
                    print("  (No final LLM thoughts recorded)")
                
                print(f"\n{'=' * 100}")
                print("TOOLS USED (from progress_json):")
                if inv.progress_json:
                    try:
                        progress = json.loads(inv.progress_json) if isinstance(inv.progress_json, str) else inv.progress_json
                        if 'tool_executions' in progress:
                            print(f"\n  Total tool executions: {len(progress['tool_executions'])}")
                            for tool_exec in progress['tool_executions']:
                                agent = tool_exec.get('agent_name', 'Unknown')
                                tool = tool_exec.get('tool_name', 'Unknown')
                                status = tool_exec.get('status', 'Unknown')
                                print(f"  - Agent: {agent:30} | Tool: {tool:30} | Status: {status}")
                        elif 'agent_statuses' in progress:
                            print(f"\n  Agent Statuses:")
                            for agent_status in progress.get('agent_statuses', []):
                                print(f"  - Agent: {agent_status.get('agent_name', 'Unknown'):30} | Status: {agent_status.get('status', 'Unknown')}")
                        else:
                            print("  (No tool execution data in progress_json)")
                    except Exception as e:
                        print(f"  (Error parsing progress_json: {e})")
                else:
                    print("  (No progress data)")
                
                print(f"\n{'=' * 100}")
                print("SETTINGS (from settings_json):")
                if inv.settings_json:
                    try:
                        settings = json.loads(inv.settings_json) if isinstance(inv.settings_json, str) else inv.settings_json
                        print(f"  Sources: {settings.get('sources', [])}")
                        print(f"  Tools: {settings.get('tools', [])}")
                        print(f"  Risk Model: {settings.get('risk_model', 'Unknown')}")
                    except Exception as e:
                        print(f"  (Error parsing settings_json: {e})")
                else:
                    print("  (No settings data)")
                
                print(f"\n{'=' * 100}")
                print("INVESTIGATION COMPLETED SUCCESSFULLY")
                print("\n")
    
    print("\n" + "=" * 100)
    print("ANALYSIS COMPLETE")
    print("=" * 100)

if __name__ == "__main__":
    asyncio.run(main())

