#!/usr/bin/env python3
"""
Verify Postgres is empty.
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
        print("✅ Verification: Database is empty.")
    else:
        print(f"❌ Verification failed. Found {len(meta.tables)} tables.")

if __name__ == "__main__":
    main()

