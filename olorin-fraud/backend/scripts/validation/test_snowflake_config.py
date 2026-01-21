#!/usr/bin/env python3
"""
Test script to verify SNOWFLAKE_MAX_TRANSACTIONS_LIMIT is read correctly.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path, override=True)

print("=" * 80)
print("Snowflake Configuration Verification")
print("=" * 80)
print()

# Test 1: Verify environment variable is set
snowflake_limit = os.getenv("SNOWFLAKE_MAX_TRANSACTIONS_LIMIT")
print(f"1. Environment Variable Check:")
print(f"   SNOWFLAKE_MAX_TRANSACTIONS_LIMIT = {snowflake_limit}")
print(f"   Status: {'✅ PASS' if snowflake_limit == '2000' else '❌ FAIL'}")
print()

# Test 2: Verify ConfigLoader reads it correctly
try:
    from app.service.config_loader import get_config_loader

    config_loader = get_config_loader()
    snowflake_config = config_loader.load_snowflake_config()

    print(f"2. ConfigLoader Snowflake Config:")
    print(
        f"   max_transactions_limit = {snowflake_config.get('max_transactions_limit')}"
    )
    print(
        f"   Status: {'✅ PASS' if snowflake_config.get('max_transactions_limit') == '2000' else '❌ FAIL'}"
    )
    print()

except Exception as e:
    print(f"2. ConfigLoader Test:")
    print(f"   ❌ FAIL - Error: {e}")
    print()

# Test 3: Verify database provider config integration
try:
    from app.service.config_loader import get_config_loader

    # Set DATABASE_PROVIDER to snowflake for this test
    os.environ["DATABASE_PROVIDER"] = "snowflake"

    config_loader = get_config_loader()
    db_config = config_loader.load_database_provider_config()

    print(f"3. Database Provider Config (provider=snowflake):")
    print(f"   provider = {db_config.get('provider')}")

    if db_config.get("provider") == "snowflake":
        sf_config = db_config.get("snowflake", {})
        max_limit = sf_config.get("max_transactions_limit")
        print(f"   snowflake.max_transactions_limit = {max_limit}")
        print(f"   Status: {'✅ PASS' if max_limit == '2000' else '❌ FAIL'}")
    else:
        print(f"   ❌ FAIL - Provider is not snowflake")
    print()

except Exception as e:
    print(f"3. Database Provider Config Test:")
    print(f"   ❌ FAIL - Error: {e}")
    print()

# Test 4: Verify assistant.py uses the configuration
try:
    from app.service.config_loader import get_config_loader

    # Set DATABASE_PROVIDER to snowflake
    os.environ["DATABASE_PROVIDER"] = "snowflake"

    config_loader = get_config_loader()
    db_config = config_loader.load_database_provider_config()
    database_provider = db_config.get("provider", "postgresql")

    print(f"4. Assistant.py Configuration Logic Test:")

    if database_provider == "snowflake":
        sf_config = db_config.get("snowflake", {})
        max_transactions = sf_config.get("max_transactions_limit", 1000)

        print(f"   Provider: {database_provider}")
        print(f"   max_transactions (from config): {max_transactions}")
        print(
            f"   Status: {'✅ PASS' if str(max_transactions) == '2000' else '❌ FAIL'}"
        )
    else:
        print(f"   ❌ FAIL - Provider is {database_provider}, expected snowflake")
    print()

except Exception as e:
    print(f"4. Assistant Configuration Test:")
    print(f"   ❌ FAIL - Error: {e}")
    print()

print("=" * 80)
print("Verification Complete")
print("=" * 80)
