#!/usr/bin/env python3
"""Test new Snowflake OAuth token."""

import snowflake.connector

TOKEN = "eyJraWQiOiI0MDk2MTEwNTM0MjkwMjIiLCJhbGciOiJFUzI1NiJ9.eyJwIjoiMjQ0MTQ3OTI6NjI1MDE2ODcwOSIsImlzcyI6IlNGOjEwMTYiLCJleHAiOjE3NjM4MDg3NzR9.iTuYRtUNd5oHPFSIOzCuuOBZBhBF47MgBQj9wolWxLGKxkQZcjw6RmqGQqXYVK0w8ajakLyCIZNxvrjTm-7vrw"

print("🔗 Testing new OAuth token...")
print(f"Token: {TOKEN[:50]}...{TOKEN[-20:]}")

try:
    conn = snowflake.connector.connect(
        account="ETMZUSX-LW98386",
        user="ZIV@NSURE.AI",
        authenticator="oauth",
        token=TOKEN,
        database="DBT",
        schema="DBT_PROD",
        warehouse="COMPUTE_WH",
        role="ANALYST",
        disable_ocsp_checks=True,  # Replaces deprecated insecure_mode
        ocsp_response_cache_filename=None,
        client_session_keep_alive=True,
    )

    print("✅ Connection successful!")

    cursor = conn.cursor()
    cursor.execute(
        "SELECT CURRENT_VERSION() as version, CURRENT_DATABASE() as db, CURRENT_SCHEMA() as schema"
    )
    result = cursor.fetchone()

    print(f"✅ Query successful!")
    print(f"   Version: {result[0]}")
    print(f"   Database: {result[1]}")
    print(f"   Schema: {result[2]}")

    # Test table access
    cursor.execute("SELECT COUNT(*) FROM DBT.DBT_PROD.TXS")
    count = cursor.fetchone()[0]
    print(f"✅ Table access successful! Row count: {count:,}")

    cursor.close()
    conn.close()

    print("\n✅ ALL TESTS PASSED! New token is valid!")

except Exception as e:
    print(f"❌ ERROR: {e}")
    print(f"   Type: {type(e).__name__}")
    exit(1)
