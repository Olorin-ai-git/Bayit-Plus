#!/usr/bin/env python3
"""
Query Postgres for investigations with confirmed fraud and detailed analysis.
"""
import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: DATABASE_URL not set in environment")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(database_url)

# Query investigations with risk scores and LLM thoughts
query = text("""
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
    final_llm_thoughts,
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
LIMIT 5
""")

print("=" * 100)
print("INVESTIGATIONS WITH RISK SCORES - DETAILED ANALYSIS")
print("=" * 100)

with engine.connect() as conn:
    result = conn.execute(query)
    rows = result.fetchall()
    
    if not rows:
        print("\nNo completed investigations with risk scores found.")
        print("\nLet's check what investigations exist:")
        
        check_query = text("""
        SELECT investigation_id, status, overall_risk_score, entity_type, entity_value
        FROM investigation_state
        ORDER BY created_at DESC
        LIMIT 10
        """)
        
        check_result = conn.execute(check_query)
        check_rows = check_result.fetchall()
        
        for row in check_rows:
            print(f"  {row[0]}: status={row[1]}, risk={row[2]}, entity={row[3]}:{row[4]}")
    else:
        for row in rows:
            print(f"\n{'=' * 100}")
            print(f"INVESTIGATION ID: {row[0]}")
            print(f"Entity: {row[1]}={row[2]}")
            print(f"Status: {row[3]}")
            print(f"Window: {row[14]} to {row[15]}")
            print(f"\n{'=' * 100}")
            print("RISK SCORES:")
            print(f"  Overall Risk Score: {row[4]:.4f}" if row[4] else "  Overall Risk Score: None")
            print(f"  Device Risk Score: {row[5]:.4f}" if row[5] else "  Device Risk Score: None")
            print(f"  Location Risk Score: {row[6]:.4f}" if row[6] else "  Location Risk Score: None")
            print(f"  Network Risk Score: {row[7]:.4f}" if row[7] else "  Network Risk Score: None")
            print(f"  Logs Risk Score: {row[8]:.4f}" if row[8] else "  Logs Risk Score: None")
            
            print(f"\n{'=' * 100}")
            print("DOMAIN AGENT LLM THOUGHTS:")
            
            print(f"\n--- DEVICE AGENT ---")
            if row[9]:
                try:
                    device_thoughts = json.loads(row[9]) if isinstance(row[9], str) else row[9]
                    print(json.dumps(device_thoughts, indent=2))
                except:
                    print(row[9])
            else:
                print("  (No device thoughts recorded)")
            
            print(f"\n--- LOCATION AGENT ---")
            if row[10]:
                try:
                    location_thoughts = json.loads(row[10]) if isinstance(row[10], str) else row[10]
                    print(json.dumps(location_thoughts, indent=2))
                except:
                    print(row[10])
            else:
                print("  (No location thoughts recorded)")
            
            print(f"\n--- NETWORK AGENT ---")
            if row[11]:
                try:
                    network_thoughts = json.loads(row[11]) if isinstance(row[11], str) else row[11]
                    print(json.dumps(network_thoughts, indent=2))
                except:
                    print(row[11])
            else:
                print("  (No network thoughts recorded)")
            
            print(f"\n--- LOGS AGENT ---")
            if row[12]:
                try:
                    logs_thoughts = json.loads(row[12]) if isinstance(row[12], str) else row[12]
                    print(json.dumps(logs_thoughts, indent=2))
                except:
                    print(row[12])
            else:
                print("  (No logs thoughts recorded)")
            
            print(f"\n--- FINAL LLM THOUGHTS (Risk Assessment Agent) ---")
            if row[13]:
                try:
                    final_thoughts = json.loads(row[13]) if isinstance(row[13], str) else row[13]
                    print(json.dumps(final_thoughts, indent=2))
                except:
                    print(row[13])
            else:
                print("  (No final LLM thoughts recorded)")
            
            print(f"\n{'=' * 100}")
            print("TOOLS USED (from progress_json):")
            if row[19]:
                try:
                    progress = json.loads(row[19]) if isinstance(row[19], str) else row[19]
                    if 'tool_executions' in progress:
                        print(f"\n  Total tool executions: {len(progress['tool_executions'])}")
                        for tool_exec in progress['tool_executions']:
                            agent = tool_exec.get('agent_name', 'Unknown')
                            tool = tool_exec.get('tool_name', 'Unknown')
                            status = tool_exec.get('status', 'Unknown')
                            print(f"  - Agent: {agent} | Tool: {tool} | Status: {status}")
                    elif 'tools' in progress:
                        for tool in progress['tools']:
                            print(f"  - {tool.get('name', 'Unknown')}: {tool.get('status', 'Unknown')}")
                    else:
                        print("  (No tool execution data in progress_json)")
                except Exception as e:
                    print(f"  (Error parsing progress_json: {e})")
            else:
                print("  (No progress data)")
            
            print(f"\n{'=' * 100}")
            print("INVESTIGATION COMPLETED SUCCESSFULLY")
            print("\n")

print("\n" + "=" * 100)
print("QUERY COMPLETE")
print("=" * 100)

