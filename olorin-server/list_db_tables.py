#!/usr/bin/env python3
"""List all tables in investigation_state.db"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "investigation_state.db"
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("Tables in investigation_state.db:")
for table in tables:
    print(f"  - {table[0]}")
    
    # Get column info for each table
    cursor.execute(f"PRAGMA table_info({table[0]})")
    columns = cursor.fetchall()
    print(f"    Columns:")
    for col in columns:
        print(f"      - {col[1]} ({col[2]})")
    print()

conn.close()

