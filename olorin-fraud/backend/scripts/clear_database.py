#!/usr/bin/env python3
"""Clear all PostgreSQL tables."""

import os
import sys

from sqlalchemy import create_engine, text

# Get database URL from environment or build it
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_USER = os.environ.get("DB_USER", "olorin")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "olorin")
DB_NAME = os.environ.get("DB_NAME", "olorin")

database_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
print(f"Connecting to: postgresql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")

try:
    engine = create_engine(database_url, connect_args={"connect_timeout": 5})

    with engine.connect() as conn:
        # Get all tables
        result = conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        )
        tables = [row[0] for row in result]
        print(f"Found {len(tables)} tables: {tables}")

        for table in tables:
            try:
                conn.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
                print(f"Truncated: {table}")
            except Exception as e:
                print(f"Error truncating {table}: {e}")

        conn.commit()

    print("Database cleared successfully!")
    engine.dispose()

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
