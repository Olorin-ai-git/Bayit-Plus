#!/usr/bin/env python3
"""
Query investigations with confirmed fraud and show detailed analysis.
"""
import sqlite3
import json
from pathlib import Path

# Connect to investigation state database
db_path = Path(__file__).parent / "investigation_state.db"
conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Query investigations with risk scores and LLM thoughts
query = """
SELECT 
    investigation_id,
    entity_type,
    entity_value,
    status,
    overall_risk_score,
    device_risk_score,
    location_risk_score,
    network_risk_score,
    logs_risk_score,
    device_llm_thoughts,
    location_llm_thoughts,
    network_llm_thoughts,
    logs_llm_thoughts,
    from_date,
    to_date,
    created_at,
    updated_at,
    settings_json,
    progress_json
FROM investigation_state
WHERE status = 'COMPLETED'
  AND overall_risk_score > 0
ORDER BY overall_risk_score DESC
LIMIT 10
"""

print("=" * 100)
print("INVESTIGATIONS WITH CONFIRMED FRAUD - DETAILED ANALYSIS")
print("=" * 100)

rows = cursor.execute(query).fetchall()

for row in rows:
    print(f"\n{'=' * 100}")
    print(f"INVESTIGATION ID: {row['investigation_id']}")
    print(f"Entity: {row['entity_type']}={row['entity_value']}")
    print(f"Status: {row['status']}")
    print(f"Window: {row['from_date']} to {row['to_date']}")
    print(f"\n{'=' * 100}")
    print("RISK SCORES:")
    print(f"  Overall Risk Score: {row['overall_risk_score']:.4f}")
    print(f"  Device Risk Score: {row['device_risk_score']:.4f}")
    print(f"  Location Risk Score: {row['location_risk_score']:.4f}")
    print(f"  Network Risk Score: {row['network_risk_score']:.4f}")
    print(f"  Logs Risk Score: {row['logs_risk_score']:.4f}")
    
    print(f"\n{'=' * 100}")
    print("DOMAIN AGENT LLM THOUGHTS:")
    
    print(f"\n--- DEVICE AGENT ---")
    if row['device_llm_thoughts']:
        try:
            device_thoughts = json.loads(row['device_llm_thoughts'])
            print(json.dumps(device_thoughts, indent=2))
        except:
            print(row['device_llm_thoughts'])
    else:
        print("  (No device thoughts recorded)")
    
    print(f"\n--- LOCATION AGENT ---")
    if row['location_llm_thoughts']:
        try:
            location_thoughts = json.loads(row['location_llm_thoughts'])
            print(json.dumps(location_thoughts, indent=2))
        except:
            print(row['location_llm_thoughts'])
    else:
        print("  (No location thoughts recorded)")
    
    print(f"\n--- NETWORK AGENT ---")
    if row['network_llm_thoughts']:
        try:
            network_thoughts = json.loads(row['network_llm_thoughts'])
            print(json.dumps(network_thoughts, indent=2))
        except:
            print(row['network_llm_thoughts'])
    else:
        print("  (No network thoughts recorded)")
    
    print(f"\n--- LOGS AGENT ---")
    if row['logs_llm_thoughts']:
        try:
            logs_thoughts = json.loads(row['logs_llm_thoughts'])
            print(json.dumps(logs_thoughts, indent=2))
        except:
            print(row['logs_llm_thoughts'])
    else:
        print("  (No logs thoughts recorded)")
    
    print(f"\n{'=' * 100}")
    print("TOOLS USED (from progress_json):")
    if row['progress_json']:
        try:
            progress = json.loads(row['progress_json'])
            if 'tool_executions' in progress:
                for tool_exec in progress['tool_executions']:
                    print(f"  - {tool_exec.get('tool_name', 'Unknown')}: {tool_exec.get('status', 'Unknown')} (Agent: {tool_exec.get('agent_name', 'Unknown')})")
            elif 'tools' in progress:
                for tool in progress['tools']:
                    print(f"  - {tool.get('name', 'Unknown')}: {tool.get('status', 'Unknown')}")
            else:
                print("  (No tool execution data)")
        except Exception as e:
            print(f"  (Error parsing progress_json: {e})")
    else:
        print("  (No progress data)")
    
    print(f"\n{'=' * 100}")
    print("SETTINGS (from settings_json):")
    if row['settings_json']:
        try:
            settings = json.loads(row['settings_json'])
            print(f"  Sources: {settings.get('sources', [])}")
            print(f"  Tools: {settings.get('tools', [])}")
            print(f"  Risk Model: {settings.get('risk_model', 'Unknown')}")
        except Exception as e:
            print(f"  (Error parsing settings_json: {e})")
    else:
        print("  (No settings data)")
    
    print("\n")

conn.close()

