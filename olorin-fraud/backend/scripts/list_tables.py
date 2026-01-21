#!/usr/bin/env python3
"""
List Postgres tables.
"""
import os
from sqlalchemy import create_engine, MetaData

def main():
    user = os.environ.get("USER", "olorin")
    url = f"postgresql://{user}@localhost:5432/olorin"
    engine = create_engine(url)
    meta = MetaData()
    meta.reflect(bind=engine)
    
    if not meta.tables:
        print("❌ Database is empty (no tables found).")
    else:
        print(f"✅ Found {len(meta.tables)} tables:")
        for t in sorted(meta.tables.keys()):
            print(f"  - {t}")

if __name__ == "__main__":
    main()

