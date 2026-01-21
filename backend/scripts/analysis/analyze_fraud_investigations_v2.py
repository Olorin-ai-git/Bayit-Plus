#!/usr/bin/env python3
"""
Analyze investigations with confirmed fraud using progress_json data.
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
    
    # Query completed investigations
    with get_db_session() as db:
        investigations = db.query(InvestigationState).filter(
            InvestigationState.status == 'COMPLETED'
        ).order_by(desc(InvestigationState.updated_at)).limit(20).all()
        
        if not investigations:
            print("\nNo completed investigations found.")
            all_invs = db.query(InvestigationState).order_by(
                desc(InvestigationState.created_at)
            ).limit(10).all()
            
            print("\nAll investigations:")
            for inv in all_invs:
                print(f"  {inv.investigation_id}: status={inv.status}")
        else:
            found_fraud = False
            for inv in investigations:
                progress = inv.get_progress_data()
                
                # Extract risk metrics from progress_json
                risk_metrics = progress.get('risk_metrics', {})
                overall_risk = risk_metrics.get('overall_risk_score', 0.0)
                device_risk = risk_metrics.get('device_risk_score', 0.0)
                location_risk = risk_metrics.get('location_risk_score', 0.0)
                network_risk = risk_metrics.get('network_risk_score', 0.0)
                logs_risk = risk_metrics.get('logs_risk_score', 0.0)
                
                # Only show investigations with risk scores
                if overall_risk == 0 and not risk_metrics:
                    continue
                
                found_fraud = True
                
                print(f"\n{'=' * 100}")
                print(f"INVESTIGATION ID: {inv.investigation_id}")
                print(f"Status: {inv.status}")
                
                # Extract entity info from settings
                settings = inv.settings or {}
                entities = settings.get('entities', [])
                if entities:
                    entity = entities[0]
                    print(f"Entity: {entity.get('entityType', 'Unknown')}={entity.get('entityValue', 'Unknown')}")
                
                time_range = settings.get('time_range', {})
                print(f"Window: {time_range.get('from', 'Unknown')} to {time_range.get('to', 'Unknown')}")
                print(f"Created: {inv.created_at}")
                print(f"Updated: {inv.updated_at}")
                
                print(f"\n{'=' * 100}")
                print("RISK SCORES:")
                print(f"  Overall Risk Score: {overall_risk:.4f}" if overall_risk else "  Overall Risk Score: 0.0000")
                print(f"  Device Risk Score: {device_risk:.4f}" if device_risk else "  Device Risk Score: 0.0000")
                print(f"  Location Risk Score: {location_risk:.4f}" if location_risk else "  Location Risk Score: 0.0000")
                print(f"  Network Risk Score: {network_risk:.4f}" if network_risk else "  Network Risk Score: 0.0000")
                print(f"  Logs Risk Score: {logs_risk:.4f}" if logs_risk else "  Logs Risk Score: 0.0000")
                
                print(f"\n{'=' * 100}")
                print("DOMAIN FINDINGS WITH LLM THOUGHTS:")
                
                # Extract domain findings from progress_json
                domain_findings = progress.get('domain_findings', {})
                
                if domain_findings:
                    for domain, findings in domain_findings.items():
                        print(f"\n--- {domain.upper()} DOMAIN ---")
                        if isinstance(findings, dict):
                            print(f"  Risk Score: {findings.get('risk_score', 0.0)}")
                            print(f"  Confidence: {findings.get('confidence', 0.0)}")
                            print(f"  Status: {findings.get('status', 'Unknown')}")
                            
                            if 'llm_reasoning' in findings:
                                print(f"  LLM Reasoning:")
                                print(f"    {findings['llm_reasoning']}")
                            
                            if 'agent_reasoning' in findings:
                                print(f"  Agent Reasoning:")
                                print(f"    {findings['agent_reasoning']}")
                            
                            if 'findings' in findings:
                                print(f"  Findings: {len(findings['findings'])} items")
                                for finding in findings['findings'][:3]:  # Show first 3
                                    print(f"    - {finding}")
                            
                            if 'tool_results' in findings:
                                print(f"  Tool Results: {len(findings['tool_results'])} items")
                        else:
                            print(json.dumps(findings, indent=4))
                else:
                    # Check agent_statuses for LLM thoughts
                    agent_statuses = progress.get('agent_statuses', [])
                    if agent_statuses:
                        for agent in agent_statuses:
                            agent_name = agent.get('agent_name', 'Unknown')
                            print(f"\n--- {agent_name.upper()} AGENT ---")
                            print(f"  Status: {agent.get('status', 'Unknown')}")
                            print(f"  Progress: {agent.get('progress', 0)}%")
                            
                            if 'error' in agent:
                                print(f"  Error: {agent['error']}")
                    else:
                        print("  (No domain findings recorded)")
                
                print(f"\n{'=' * 100}")
                print("TOOLS USED:")
                tool_executions = progress.get('tool_executions', [])
                if tool_executions:
                    print(f"\n  Total tool executions: {len(tool_executions)}")
                    
                    # Group by agent
                    by_agent = {}
                    for tool_exec in tool_executions:
                        agent = tool_exec.get('agent_name', 'Unknown')
                        if agent not in by_agent:
                            by_agent[agent] = []
                        by_agent[agent].append(tool_exec)
                    
                    for agent, tools in by_agent.items():
                        print(f"\n  {agent}:")
                        for tool in tools:
                            tool_name = tool.get('tool_name', 'Unknown')
                            status = tool.get('status', 'Unknown')
                            print(f"    - {tool_name:40} | Status: {status}")
                else:
                    print("  (No tool executions recorded)")
                
                print(f"\n{'=' * 100}")
                print("INVESTIGATION COMPLETED")
                print("\n")
            
            if not found_fraud:
                print("\nNo investigations with risk scores found in the last 20 completed investigations.")
    
    print("\n" + "=" * 100)
    print("ANALYSIS COMPLETE")
    print("=" * 100)

if __name__ == "__main__":
    asyncio.run(main())

