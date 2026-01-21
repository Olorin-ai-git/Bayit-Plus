#!/usr/bin/env python3
"""
Analyze investigations from workspace registry with confirmed fraud.
"""
import sqlite3
import json
from pathlib import Path

# Connect to workspace registry
registry_path = Path(__file__).parent / "workspace" / "registry" / "registry.sqlite"
if not registry_path.exists():
    print(f"Registry database not found at: {registry_path}")
    exit(1)

print(f"Connecting to: {registry_path}")
conn = sqlite3.connect(str(registry_path))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Look for specific investigations from confusion matrices
target_invs = ['auto-comp-0aac67aa5cf8', 'auto-comp-1ad0ca44a3e1', 'auto-comp-54d2fcb05a03']

print("=" * 100)
print("ANALYZING INVESTIGATIONS FROM CONFUSION MATRICES")
print("=" * 100)

for target_id in target_invs:
    query = "SELECT * FROM investigations WHERE investigation_id = ?"
    row = cursor.execute(query, (target_id,)).fetchone()
    
    if row:
        print(f"\n{'=' * 100}")
        print(f"INVESTIGATION: {target_id}")
        print(f"{'=' * 100}")
        print(f"Title: {row['title']}")
        print(f"Type: {row['investigation_type']}")
        print(f"Status: {row['status']}")
        print(f"Entity Type: {row['entity_type']}")
        print(f"Entity IDs: {row['entity_ids']}")
        print(f"Created: {row['created_at']}")
        print(f"Completed: {row['completed_at']}")
        print(f"Path: {row['canonical_path']}")
        
        # Parse metadata
        if row['metadata_json']:
            try:
                metadata = json.loads(row['metadata_json'])
                print(f"\n--- METADATA ---")
                print(json.dumps(metadata, indent=2))
            except Exception as e:
                print(f"Error parsing metadata: {e}")
        
        # Now check for files associated with this investigation
        files_query = "SELECT * FROM files WHERE investigation_id = ?"
        files = cursor.execute(files_query, (target_id,)).fetchall()
        
        print(f"\n--- ASSOCIATED FILES ({len(files)} files) ---")
        for file in files:
            print(f"\n  File: {file['file_name']}")
            print(f"    Path: {file['file_path']}")
            print(f"    Kind: {file['file_kind']}")
            print(f"    Size: {file['file_size']} bytes")
            print(f"    Created: {file['created_at']}")
            
            # Read the file if it's JSON or text-based
            file_path = Path(file['file_path'])
            if file_path.exists():
                if file_path.suffix in ['.json', '.log', '.txt']:
                    print(f"    Reading file...")
                    try:
                        if file_path.suffix == '.json':
                            with open(file_path, 'r') as f:
                                content = json.load(f)
                                
                                # Look for risk scores and LLM thoughts
                                if 'overall_risk_score' in content:
                                    print(f"\n    === RISK SCORES ===")
                                    print(f"    Overall: {content.get('overall_risk_score', 0.0)}")
                                    print(f"    Device: {content.get('device_risk_score', 0.0)}")
                                    print(f"    Location: {content.get('location_risk_score', 0.0)}")
                                    print(f"    Network: {content.get('network_risk_score', 0.0)}")
                                    print(f"    Logs: {content.get('logs_risk_score', 0.0)}")
                                
                                if 'device_llm_thoughts' in content:
                                    print(f"\n    === DEVICE LLM THOUGHTS ===")
                                    print(f"    {content['device_llm_thoughts'][:500]}")
                                
                                if 'location_llm_thoughts' in content:
                                    print(f"\n    === LOCATION LLM THOUGHTS ===")
                                    print(f"    {content['location_llm_thoughts'][:500]}")
                                
                                if 'network_llm_thoughts' in content:
                                    print(f"\n    === NETWORK LLM THOUGHTS ===")
                                    print(f"    {content['network_llm_thoughts'][:500]}")
                                
                                if 'logs_llm_thoughts' in content:
                                    print(f"\n    === LOGS LLM THOUGHTS ===")
                                    print(f"    {content['logs_llm_thoughts'][:500]}")
                                
                                if 'tool_executions' in content:
                                    print(f"\n    === TOOL EXECUTIONS ({len(content['tool_executions'])}) ===")
                                    for tool in content['tool_executions'][:10]:
                                        print(f"      - {tool.get('tool_name', 'Unknown')}: {tool.get('status', 'Unknown')}")
                        else:
                            with open(file_path, 'r') as f:
                                content = f.read()
                                print(f"    Content preview: {content[:200]}")
                    except Exception as e:
                        print(f"    Error reading file: {e}")
            else:
                print(f"    File not found at path")
    else:
        print(f"\nINVESTIGATION NOT FOUND: {target_id}")
        print(f"Searching for similar IDs...")
        
        # Search for any auto-comp investigations
        search_query = "SELECT investigation_id, status, entity_ids FROM investigations WHERE investigation_id LIKE ? LIMIT 5"
        similar = cursor.execute(search_query, (f"%{target_id[:10]}%",)).fetchall()
        
        if similar:
            print(f"Found {len(similar)} similar investigations:")
            for sim in similar:
                print(f"  - {sim['investigation_id']}: {sim['status']}")
        else:
            print("No similar investigations found")

# Show some recent investigations
print("\n" + "=" * 100)
print("RECENT INVESTIGATIONS IN WORKSPACE REGISTRY")
print("=" * 100)

recent_query = """
SELECT investigation_id, status, entity_type, entity_ids, completed_at
FROM investigations
ORDER BY created_at DESC
LIMIT 10
"""

recent = cursor.execute(recent_query).fetchall()
for row in recent:
    print(f"\n{row['investigation_id']}: {row['status']}")
    print(f"  Entity: {row['entity_type']} - {row['entity_ids']}")
    print(f"  Completed: {row['completed_at']}")

conn.close()

print("\n" + "=" * 100)
print("ANALYSIS COMPLETE")
print("=" * 100)

