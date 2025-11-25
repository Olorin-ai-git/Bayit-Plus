#!/usr/bin/env python3
"""
Direct database query - minimal imports to avoid dependency issues.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path, override=True)

# Get config
database = os.getenv("SNOWFLAKE_DATABASE", "DBT")
schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TXS")
full_table_name = f"{database}.{schema}.{table}"
ip_address = "38.252.156.103"

# Build query
query = f"""
SELECT
    TX_ID_KEY,
    EMAIL,
    IP,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAID_AMOUNT_CURRENCY,
    TX_DATETIME,
    PAYMENT_METHOD,
    CARD_BRAND,
    DEVICE_ID,
    USER_AGENT,
    IP_COUNTRY_CODE,
    IS_FRAUD_TX,
    MODEL_SCORE,
    NSURE_LAST_DECISION as MODEL_DECISION
FROM {full_table_name}
WHERE IP = '{ip_address}'
ORDER BY TX_DATETIME DESC
LIMIT 2000
"""

count_query = (
    f"SELECT COUNT(*) as total_count FROM {full_table_name} WHERE IP = '{ip_address}'"
)

print("\n" + "=" * 80)
print("🔍 DIRECT DATABASE QUERY - IP: 38.252.156.103")
print("=" * 80)
print(f"\n📋 Configuration:")
print(f"   Table: {full_table_name}")
print(f"\n🔍 Query:")
print("-" * 80)
print(query.strip())
print("-" * 80)

# Import with minimal dependencies
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import the real_client module directly
import importlib.util

real_client_path = (
    Path(__file__).parent.parent.parent
    / "app"
    / "service"
    / "agent"
    / "tools"
    / "snowflake_tool"
    / "real_client.py"
)
spec = importlib.util.spec_from_file_location("real_client", real_client_path)
real_client_module = importlib.util.module_from_spec(spec)

# Mock dependencies that might cause issues
import types

mock_modules = {
    "app.service.logging": types.ModuleType("logging"),
    "app.service.config_loader": types.ModuleType("config_loader"),
}
for name, mod in mock_modules.items():
    sys.modules[name] = mod

try:
    spec.loader.exec_module(real_client_module)
    RealSnowflakeClient = real_client_module.RealSnowflakeClient

    print(f"\n🔗 Connecting to Snowflake...")
    client = RealSnowflakeClient()

    print(f"\n📊 Running count query...")
    count_results = asyncio.run(client.execute_query(count_query))
    total_count = count_results[0].get("total_count", 0) if count_results else 0
    print(f"   ✅ Total transactions found: {total_count}")

    print(f"\n📊 Running main query (LIMIT 2000)...")
    transactions = asyncio.run(client.execute_query(query))

    print(f"   ✅ Transactions returned: {len(transactions)}")

    if transactions:
        print(f"\n📋 First 5 Transactions:")
        print("=" * 80)
        for i, tx in enumerate(transactions[:5], 1):
            print(f"\n   Transaction {i}:")
            for key, value in list(tx.items())[:8]:  # Show first 8 fields
                print(f"      {key}: {value}")

        if len(transactions) > 5:
            print(f"\n   ... and {len(transactions) - 5} more transactions")

    print(f"\n" + "=" * 80)
    print(f"✅ Complete! Total: {total_count} | Returned: {len(transactions)}")
    print("=" * 80)

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
