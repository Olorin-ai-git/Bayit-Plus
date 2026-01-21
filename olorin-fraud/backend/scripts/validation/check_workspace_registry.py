#!/usr/bin/env python3
"""
Check workspace registry for investigations with confirmed fraud.
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

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("\nTables in workspace registry:")
for table in tables:
    print(f"  - {table['name']}")

# Check investigations table
print("\n" + "=" * 100)
print("INVESTIGATIONS IN WORKSPACE REGISTRY")
print("=" * 100)

# Get table schema
cursor.execute("PRAGMA table_info(investigations)")
columns = cursor.fetchall()
print("\nInvestigations table columns:")
for col in columns:
    print(f"  - {col['name']} ({col['type']})")

# Query investigations
query = """
SELECT 
    investigation_id,
    entity_ids,
    trigger_source,
    status,
    overall_risk_score,
    created_at,
    updated_at,
    metadata
FROM investigations
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10
"""

rows = cursor.execute(query).fetchall()

print(f"\nFound {len(rows)} completed investigations")

# Look for specific investigations from confusion matrices
target_invs = ['auto-comp-0aac67aa5cf8', 'auto-comp-1ad0ca44a3e1', 'auto-comp-54d2fcb05a03']

print("\n" + "=" * 100)
print("SEARCHING FOR SPECIFIC INVESTIGATIONS FROM CONFUSION MATRICES")
print("=" * 100)

for target_id in target_invs:
    query = f"SELECT * FROM investigations WHERE investigation_id = ?"
    row = cursor.execute(query, (target_id,)).fetchone()
    
    if row:
        print(f"\n{'=' * 100}")
        print(f"FOUND: {target_id}")
        print(f"{'=' * 100}")
        for key in row.keys():
            value = row[key]
            if key == 'metadata' and value:
                try:
                    meta = json.loads(value)
                    print(f"{key}: {json.dumps(meta, indent=2)}")
                except:
                    print(f"{key}: {str(value)[:200]}")
            else:
                print(f"{key}: {value}")
    else:
        print(f"\nNOT FOUND: {target_id}")

# Show all investigations regardless
print("\n" + "=" * 100)
print("ALL COMPLETED INVESTIGATIONS")
print("=" * 100)

for row in rows:
    print(f"\nInvestigation: {row['investigation_id']}")
    print(f"  Entity IDs: {row['entity_ids']}")
    print(f"  Status: {row['status']}")
    print(f"  Risk Score: {row['overall_risk_score']}")
    print(f"  Created: {row['created_at']}")
    if row['metadata']:
        try:
            metadata = json.loads(row['metadata'])
            print(f"  Metadata keys: {list(metadata.keys())}")
        except:
            pass

conn.close()

