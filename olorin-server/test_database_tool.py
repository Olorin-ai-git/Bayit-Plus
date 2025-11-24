#!/usr/bin/env python3
"""
Test script to verify DatabaseQueryTool is using PostgreSQL from .env and can connect.
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env file from {env_path}")
else:
    print(f"❌ .env file not found at {env_path}")
    sys.exit(1)

# Check PostgreSQL configuration
print("\n" + "="*80)
print("PostgreSQL Configuration Check")
print("="*80)

use_postgres = os.getenv('USE_POSTGRES', 'false').lower() == 'true'
database_provider = os.getenv('DATABASE_PROVIDER', '').lower()

print(f"USE_POSTGRES: {use_postgres}")
print(f"DATABASE_PROVIDER: {database_provider}")

postgres_host = os.getenv('POSTGRES_HOST') or os.getenv('DB_HOST')
postgres_port = os.getenv('POSTGRES_PORT') or os.getenv('DB_PORT', '5432')
postgres_database = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB') or os.getenv('DB_NAME')
postgres_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
postgres_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')

print(f"\nPostgreSQL Variables:")
print(f"  POSTGRES_HOST/DB_HOST: {postgres_host}")
print(f"  POSTGRES_PORT/DB_PORT: {postgres_port}")
print(f"  POSTGRES_DATABASE/POSTGRES_DB/DB_NAME: {postgres_database}")
print(f"  POSTGRES_USER/DB_USER: {postgres_user}")
print(f"  POSTGRES_PASSWORD/DB_PASSWORD: {'***' if postgres_password else 'NOT SET'}")

# Check if we should use PostgreSQL
if not (use_postgres or database_provider == 'postgresql'):
    print("\n⚠️  PostgreSQL not enabled. USE_POSTGRES or DATABASE_PROVIDER=postgresql not set.")
    sys.exit(1)

if not all([postgres_host, postgres_database, postgres_user, postgres_password]):
    print("\n❌ PostgreSQL configuration incomplete!")
    missing = []
    if not postgres_host: missing.append('POSTGRES_HOST or DB_HOST')
    if not postgres_database: missing.append('POSTGRES_DATABASE/POSTGRES_DB/DB_NAME')
    if not postgres_user: missing.append('POSTGRES_USER or DB_USER')
    if not postgres_password: missing.append('POSTGRES_PASSWORD or DB_PASSWORD')
    print(f"Missing: {', '.join(missing)}")
    sys.exit(1)

# Build connection string
database_connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}"
print(f"\n✅ Connection string built: postgresql://{postgres_user}:***@{postgres_host}:{postgres_port}/{postgres_database}")

# Test DatabaseQueryTool
print("\n" + "="*80)
print("Testing DatabaseQueryTool")
print("="*80)

try:
    # Mock secret manager to avoid import issues
    import sys
    from unittest.mock import MagicMock
    
    # Mock google.cloud.secretmanager before importing
    sys.modules['google.cloud'] = MagicMock()
    sys.modules['google.cloud.secretmanager'] = MagicMock()
    
    # Now try to import DatabaseQueryTool
    # Import the module file directly
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "database_tool",
        Path(__file__).parent / "app" / "service" / "agent" / "tools" / "database_tool" / "database_tool.py"
    )
    database_tool_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(database_tool_module)
    DatabaseQueryTool = database_tool_module.DatabaseQueryTool
    
    print("\n1. Creating DatabaseQueryTool instance...")
    tool = DatabaseQueryTool(connection_string=database_connection_string)
    print(f"   ✅ Tool created: {tool.name}")
    print(f"   Description: {tool.description[:100]}...")
    
    print("\n2. Testing database connection with simple query...")
    # Test with a simple query that should work on any PostgreSQL database
    test_query = "SELECT version() as postgres_version, current_database() as database_name, current_user as user_name;"
    
    print(f"   Query: {test_query}")
    result = tool._run(query=test_query, limit=1)
    
    print(f"\n   ✅ Query executed successfully!")
    print(f"   Result type: {type(result)}")
    
    if isinstance(result, dict):
        if 'results' in result:
            results = result['results']
            print(f"   Rows returned: {len(results)}")
            if results:
                print(f"   First row: {results[0]}")
        elif 'data' in result:
            print(f"   Data: {result['data']}")
        else:
            print(f"   Result keys: {list(result.keys())}")
            print(f"   Full result: {result}")
    
    print("\n3. Testing query to check if transactions table exists...")
    # Try to check for transactions table (common in fraud analytics)
    schema_query = """
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' 
    AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
    LIMIT 10;
    """
    
    print(f"   Query: Checking available tables...")
    schema_result = tool._run(query=schema_query, limit=10)
    
    print(f"   Result type: {type(schema_result)}")
    if isinstance(schema_result, dict):
        print(f"   Result keys: {list(schema_result.keys())}")
        
        # Check for 'results' or 'data' key
        if 'results' in schema_result:
            tables = schema_result['results']
            print(f"   ✅ Found {len(tables)} tables:")
            for table in tables[:10]:
                schema = table.get('table_schema', 'unknown')
                name = table.get('table_name', 'unknown')
                print(f"      - {schema}.{name}")
        elif 'data' in schema_result:
            tables = schema_result['data']
            if isinstance(tables, list):
                print(f"   ✅ Found {len(tables)} tables:")
                for table in tables[:10]:
                    if isinstance(table, dict):
                        schema = table.get('table_schema', 'unknown')
                        name = table.get('table_name', 'unknown')
                        print(f"      - {schema}.{name}")
                    else:
                        print(f"      - {table}")
            else:
                print(f"   Data: {tables}")
        else:
            print(f"   Full result: {schema_result}")
    
    print("\n" + "="*80)
    print("✅ SUCCESS: DatabaseQueryTool is working with PostgreSQL!")
    print("="*80)
    
except ImportError as e:
    print(f"\n❌ Failed to import DatabaseQueryTool: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error testing DatabaseQueryTool: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

