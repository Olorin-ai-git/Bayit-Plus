#!/usr/bin/env python3
"""
Test Snowflake connection using Personal Access Token (PAT).
"""

# Exact credentials for PAT authentication
ACCOUNT = "ETMZUSX-LW98386"
USER = "ZIV@NSURE.AI"
PAT_TOKEN = "eyJraWQiOiI0MDk2MTEwNTM0MjkwMjIiLCJhbGciOiJFUzI1NiJ9.eyJwIjoiMjQ0MTQ3OTI6NjI1MDE2ODcwOSIsImlzcyI6IlNGOjEwMTYiLCJleHAiOjE3NjM4MDg3NzR9.iTuYRtUNd5oHPFSIOzCuuOBZBhBF47MgBQj9wolWxLGKxkQZcjw6RmqGQqXYVK0w8ajakLyCIZNxvrjTm-7vrw"
ROLE = "ANALYST"
WAREHOUSE = "COMPUTE_WH"
DATABASE = "DBT"
SCHEMA = "DBT_PROD"


def test_pat_connection():
    """Test Snowflake connection using Personal Access Token."""

    print("\n" + "="*80)
    print("SNOWFLAKE PAT CONNECTION TEST")
    print("="*80)

    print("\n📋 Configuration:")
    print(f"   Account: {ACCOUNT}")
    print(f"   User: {USER}")
    print(f"   Role: {ROLE}")
    print(f"   Warehouse: {WAREHOUSE}")
    print(f"   Database: {DATABASE}")
    print(f"   Schema: {SCHEMA}")
    print(f"   PAT Token: {PAT_TOKEN[:50]}...{PAT_TOKEN[-20:]}")

    print("\n" + "-"*80)

    try:
        import snowflake.connector

        print("\n🔗 Attempting PAT connection...")
        print("   Using authenticator='snowflake_jwt' for PAT...")

        # Build connection parameters for PAT
        # PAT uses password parameter, not token
        conn_params = {
            'account': ACCOUNT,
            'user': USER,
            'password': PAT_TOKEN,  # PAT goes in password parameter
            'database': DATABASE,
            'schema': SCHEMA,
            'warehouse': WAREHOUSE,
            'role': ROLE,
            'network_timeout': 300,
            'login_timeout': 60,
            'client_session_keep_alive': True,
        }

        print("\n📦 Connection Parameters:")
        for key, value in conn_params.items():
            if key == 'password':
                print(f"   {key}: {value[:50]}...{value[-20:]}")
            else:
                print(f"   {key}: {value}")

        print("\n🔌 Connecting to Snowflake...")
        connection = snowflake.connector.connect(**conn_params)

        print("   ✅ Connection successful!")

        # Test query
        print("\n🔍 Running test query...")
        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                CURRENT_VERSION() as version,
                CURRENT_DATABASE() as db,
                CURRENT_SCHEMA() as schema,
                CURRENT_WAREHOUSE() as warehouse,
                CURRENT_ROLE() as role,
                CURRENT_USER() as user
        """)

        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Query successful!")
        print("\n📊 Session Info:")
        for key, value in zip(columns, results[0]):
            print(f"      {key}: {value}")

        # Test table access
        print("\n🔍 Testing table access...")
        cursor.execute(f"SELECT COUNT(*) as count FROM {DATABASE}.{SCHEMA}.TRANSACTIONS_ENRICHED")
        count_result = cursor.fetchone()
        print(f"   ✅ Table accessible! Row count: {count_result[0]:,}")

        # Get sample row with schema
        print("\n🔍 Fetching sample data...")
        cursor.execute(f"SELECT * FROM {DATABASE}.{SCHEMA}.TRANSACTIONS_ENRICHED LIMIT 1")
        sample = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Sample data retrieved!")
        print(f"   📊 Total columns: {len(columns)}")
        print(f"   First 10 columns: {', '.join(columns[:10])}")

        # Test get_top_risk_entities style query
        print("\n🔍 Testing risk analysis query...")
        cursor.execute(f"""
            SELECT
                EMAIL as entity,
                COUNT(*) as transaction_count,
                SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
                AVG(MODEL_SCORE) as avg_risk_score
            FROM {DATABASE}.{SCHEMA}.TRANSACTIONS_ENRICHED
            WHERE TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
                AND EMAIL IS NOT NULL
            GROUP BY EMAIL
            HAVING COUNT(*) >= 1
            ORDER BY avg_risk_score DESC
            LIMIT 5
        """)

        risk_results = cursor.fetchall()
        print(f"   ✅ Risk query successful! Found {len(risk_results)} high-risk entities")

        if risk_results:
            print("\n   Top 3 risk entities:")
            columns = [desc[0] for desc in cursor.description]
            for i, row in enumerate(risk_results[:3], 1):
                print(f"\n   {i}. {dict(zip(columns, row))}")

        # Cleanup
        cursor.close()
        connection.close()

        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80 + "\n")

        return True

    except ImportError:
        print("\n❌ ERROR: snowflake-connector-python not installed")
        print("   Run: poetry add snowflake-connector-python")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(f"\n📋 Error Type: {type(e).__name__}")

        if hasattr(e, 'errno'):
            print(f"   Error Code: {e.errno}")
        if hasattr(e, 'sqlstate'):
            print(f"   SQL State: {e.sqlstate}")
        if hasattr(e, 'msg'):
            print(f"   Message: {e.msg}")

        print("\n" + "="*80)
        print("❌ TEST FAILED!")
        print("="*80 + "\n")

        return False


if __name__ == "__main__":
    print("\n🚀 Starting Snowflake PAT Connection Test...")
    success = test_pat_connection()
    exit(0 if success else 1)
