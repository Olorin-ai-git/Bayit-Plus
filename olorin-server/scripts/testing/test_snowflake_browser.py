#!/usr/bin/env python3
"""
Test Snowflake connection using external browser authentication (SSO).
"""

import snowflake.connector

ACCOUNT = "ETMZUSX-LW98386"
USER = "ZIV@NSURE.AI"
WAREHOUSE = "COMPUTE_WH"
DATABASE = "DBT"
SCHEMA = "DBT_PROD"
ROLE = "ANALYST"

print("\n" + "="*80)
print("SNOWFLAKE EXTERNAL BROWSER AUTHENTICATION TEST")
print("="*80)

print("\n📋 Configuration:")
print(f"   Account: {ACCOUNT}")
print(f"   User: {USER}")
print(f"   Warehouse: {WAREHOUSE}")
print(f"   Database: {DATABASE}")
print(f"   Schema: {SCHEMA}")
print(f"   Role: {ROLE}")

print("\n🌐 This will open your browser for SSO authentication...")
print("   Please complete the authentication in your browser.")

try:
    conn = snowflake.connector.connect(
        account=ACCOUNT,
        user=USER,
        authenticator='externalbrowser',
        warehouse=WAREHOUSE,
        database=DATABASE,
        schema=SCHEMA,
        role=ROLE
    )

    print("\n✅ Connection successful!")

    cursor = conn.cursor()
    cursor.execute("SELECT CURRENT_VERSION(), CURRENT_DATABASE(), CURRENT_SCHEMA()")
    result = cursor.fetchone()

    print(f"\n✅ Query successful!")
    print(f"   Version: {result[0]}")
    print(f"   Database: {result[1]}")
    print(f"   Schema: {result[2]}")

    cursor.close()
    conn.close()

    print("\n" + "="*80)
    print("✅ TEST PASSED!")
    print("="*80 + "\n")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"   Type: {type(e).__name__}")
