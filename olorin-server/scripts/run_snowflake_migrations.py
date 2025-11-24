#!/usr/bin/env python3
"""
Run Snowflake migrations for Composio Tools Integration feature.

This script executes Snowflake-specific migration files:
- 008_create_device_signals.sql
- 008_create_ip_risk_scores.sql
- 008_create_graph_features.sql
- 008_create_snowpipe_tables.sql
- 008_create_dynamic_tables.sql
- 009_create_device_features_view.sql

Prerequisites:
- Snowflake credentials configured in environment variables
- Snowflake connection accessible
- Appropriate permissions to create tables, views, and dynamic tables

Usage:
    poetry run python scripts/run_snowflake_migrations.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.snowflake_config import SnowflakeConfig, load_snowflake_config
from app.service.snowflake_service import SnowflakeConnectionFactory, SnowflakeQueryService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def parse_sql_statements(sql_content: str) -> list[str]:
    """
    Parse SQL content into individual statements.
    
    Handles:
    - Multi-line statements
    - Comments (-- and /* */)
    - Semicolon-separated statements
    """
    statements = []
    current_statement = []
    in_comment = False
    comment_type = None  # '--' or '/*'
    
    for line in sql_content.split('\n'):
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            if current_statement:
                current_statement.append('')
            continue
        
        # Handle comments
        if '/*' in stripped:
            in_comment = True
            comment_type = '/*'
            # Add part before comment
            before_comment = stripped.split('/*')[0].strip()
            if before_comment:
                current_statement.append(before_comment)
            continue
        
        if '*/' in stripped and in_comment and comment_type == '/*':
            in_comment = False
            comment_type = None
            # Add part after comment
            after_comment = stripped.split('*/')[-1].strip()
            if after_comment:
                current_statement.append(after_comment)
            continue
        
        if in_comment:
            continue
        
        # Skip single-line comments
        if stripped.startswith('--'):
            continue
        
        # Remove inline comments (-- style)
        if '--' in stripped:
            stripped = stripped.split('--')[0].strip()
            if not stripped:
                continue
        
        current_statement.append(line)
        
        # Statement ends with semicolon
        if stripped.endswith(';'):
            statement_text = '\n'.join(current_statement).strip()
            if statement_text:
                statements.append(statement_text)
            current_statement = []
    
    # Add any remaining statement
    if current_statement:
        statement_text = '\n'.join(current_statement).strip()
        if statement_text:
            statements.append(statement_text)
    
    return statements


def run_snowflake_migrations():
    """Run all Snowflake migration files."""
    
    print("🔄 Snowflake Migration Runner")
    print("=" * 60)
    
    # Load Snowflake configuration
    try:
        print("\n📋 Loading Snowflake configuration...")
        config = load_snowflake_config()
        print(f"✅ Configuration loaded:")
        print(f"   Account: {config.account}")
        print(f"   User: {config.user}")
        print(f"   Database: {config.database}")
        print(f"   Schema: {config.snowflake_schema}")
        print(f"   Warehouse: {config.warehouse}")
        print(f"   Auth Method: {config.auth_method}")
    except Exception as e:
        print(f"\n❌ Failed to load Snowflake configuration: {e}")
        print("\n💡 Required environment variables:")
        print("   - SNOWFLAKE_ACCOUNT")
        print("   - SNOWFLAKE_USER")
        print("   - SNOWFLAKE_ROLE")
        print("   - SNOWFLAKE_WAREHOUSE")
        print("   - SNOWFLAKE_DATABASE")
        print("   - SNOWFLAKE_SCHEMA")
        print("\n   For private key auth:")
        print("   - SNOWFLAKE_PRIVATE_KEY_PATH")
        print("   - SNOWFLAKE_PRIVATE_KEY_PASSPHRASE (optional)")
        print("\n   For password auth:")
        print("   - SNOWFLAKE_PASSWORD")
        print("   - SNOWFLAKE_AUTH_METHOD=password")
        return 1
    
    # Initialize Snowflake connection
    try:
        print("\n🔌 Connecting to Snowflake...")
        factory = SnowflakeConnectionFactory(config)
        service = SnowflakeQueryService(factory)
        
        # Test connection
        test_result = service.execute_query("SELECT CURRENT_VERSION() as version", fetch_all=True)
        print(f"✅ Connected to Snowflake successfully")
        if test_result:
            print(f"   Snowflake version: {test_result[0].get('VERSION', 'unknown')}")
    except Exception as e:
        print(f"\n❌ Failed to connect to Snowflake: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Get list of Snowflake migration files
    migrations_dir = Path(__file__).parent.parent / "app" / "persistence" / "migrations"
    snowflake_migrations = [
        "008_create_device_signals.sql",
        "008_create_ip_risk_scores.sql",
        "008_create_graph_features.sql",
        "008_create_snowpipe_tables.sql",
        "008_create_dynamic_tables.sql",
        "009_create_device_features_view.sql"
    ]
    
    print(f"\n📋 Found {len(snowflake_migrations)} migration files to execute")
    print("=" * 60)
    
    success_count = 0
    error_count = 0
    
    for migration_file in snowflake_migrations:
        migration_path = migrations_dir / migration_file
        
        if not migration_path.exists():
            print(f"\n⚠️  Skipping {migration_file} (file not found)")
            continue
        
        print(f"\n🔄 Running {migration_file}...")
        print("-" * 60)
        
        try:
            # Read SQL content
            with open(migration_path, 'r') as f:
                sql_content = f.read()
            
            # Parse into statements
            statements = parse_sql_statements(sql_content)
            
            if not statements:
                print(f"   ⚠️  No SQL statements found in {migration_file}")
                continue
            
            print(f"   Found {len(statements)} SQL statement(s)")
            
            # Execute each statement
            for idx, statement in enumerate(statements, 1):
                if not statement.strip():
                    continue
                
                # Skip comment-only statements
                if statement.strip().startswith('--'):
                    continue
                
                print(f"\n   [{idx}/{len(statements)}] Executing statement...")
                stmt_preview = statement[:100].replace('\n', ' ') + "..." if len(statement) > 100 else statement.replace('\n', ' ')
                print(f"   Preview: {stmt_preview}")
                
                try:
                    # Execute statement
                    results = service.execute_query(statement, fetch_all=True)
                    print(f"   ✅ Statement {idx} executed successfully")
                    if results:
                        print(f"      Returned {len(results)} row(s)")
                except Exception as stmt_error:
                    error_msg = str(stmt_error)
                    # Check if it's a "already exists" error (which is OK)
                    if "already exists" in error_msg.lower() or "already exist" in error_msg.lower():
                        print(f"   ⚠️  Statement {idx} skipped (object already exists)")
                    else:
                        print(f"   ❌ Statement {idx} failed: {error_msg}")
                        raise
            
            print(f"\n✅ {migration_file} completed successfully")
            success_count += 1
            
        except Exception as e:
            print(f"\n❌ {migration_file} failed: {e}")
            import traceback
            traceback.print_exc()
            error_count += 1
            # Continue with next migration
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Migration Summary")
    print("=" * 60)
    print(f"✅ Successful: {success_count}/{len(snowflake_migrations)}")
    print(f"❌ Failed: {error_count}/{len(snowflake_migrations)}")
    
    if error_count == 0:
        print("\n🎉 All Snowflake migrations completed successfully!")
        return 0
    else:
        print(f"\n⚠️  {error_count} migration(s) failed. Please review errors above.")
        return 1


if __name__ == "__main__":
    exit_code = run_snowflake_migrations()
    sys.exit(exit_code)

