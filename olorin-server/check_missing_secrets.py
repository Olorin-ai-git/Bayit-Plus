#!/usr/bin/env python3
"""
Script to identify which secrets are missing from Firebase Secret Manager.

This script checks all the secrets that the Olorin application tries to load
and reports which ones are not found.
"""

import os
import sys
from typing import List, Dict, Tuple
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

def find_secret_references() -> Dict[str, List[str]]:
    """Find all secret references in the codebase."""
    secrets = {}
    
    # Common secret names used in the application
    secret_patterns = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'JWT_SECRET_KEY',
        'DATABASE_PASSWORD',
        'REDIS_API_KEY',
        'SPLUNK_USERNAME',
        'SPLUNK_PASSWORD',
        'OLORIN_API_KEY',
        'DATABRICKS_TOKEN',
        'SNOWFLAKE_ACCOUNT',
        'SNOWFLAKE_USER',
        'SNOWFLAKE_PASSWORD',
        'SNOWFLAKE_PRIVATE_KEY',
        'SUMO_LOGIC_ACCESS_ID',
        'SUMO_LOGIC_ACCESS_KEY',
        'LANGFUSE_PUBLIC_KEY',
        'LANGFUSE_SECRET_KEY',
        'APP_SECRET',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
    ]
    
    # Check configuration files
    config_files = [
        'app/config/base_config.py',
        'app/config/config.py',
        'app/service/factory/olorin_factory.py',
        'app/security/auth.py',
        'app/persistence.py',
    ]
    
    for config_file in config_files:
        file_path = Path(config_file)
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    for secret in secret_patterns:
                        if secret in content:
                            if secret not in secrets:
                                secrets[secret] = []
                            secrets[secret].append(str(file_path))
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    return secrets

def check_firebase_secrets():
    """Check which secrets are configured vs missing."""
    print("=" * 60)
    print("FIREBASE SECRET MANAGER - SECRET STATUS CHECK")
    print("=" * 60)
    print()
    
    # Try to import the secret manager
    try:
        from app.config.firebase_secrets import SecretManager
        
        # Initialize the secret manager
        secret_manager = SecretManager(project_id="olorin-ai")
        
        print("✅ Firebase Secret Manager initialized successfully")
        print(f"📁 Project ID: olorin-ai")
        print()
        
    except Exception as e:
        print(f"❌ Failed to initialize Firebase Secret Manager: {e}")
        print("   This might be why secrets are not loading.")
        return
    
    # List of all secrets the app tries to load
    all_secrets = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY', 
        'JWT_SECRET_KEY',
        'DATABASE_PASSWORD',
        'REDIS_API_KEY',
        'SPLUNK_USERNAME',
        'SPLUNK_PASSWORD',
        'OLORIN_API_KEY',
        'DATABRICKS_TOKEN',
        'SNOWFLAKE_ACCOUNT',
        'SNOWFLAKE_USER',
        'SNOWFLAKE_PASSWORD',
        'SNOWFLAKE_PRIVATE_KEY',
        'SUMO_LOGIC_ACCESS_ID',
        'SUMO_LOGIC_ACCESS_KEY',
        'LANGFUSE_PUBLIC_KEY',
        'LANGFUSE_SECRET_KEY',
        'APP_SECRET',
    ]
    
    print("🔍 Checking secret availability:")
    print("-" * 40)
    
    found_secrets = []
    missing_secrets = []
    
    for secret_name in all_secrets:
        try:
            # Try to get the secret
            value = secret_manager.get_secret(secret_name)
            if value:
                found_secrets.append(secret_name)
                print(f"✅ {secret_name}: FOUND")
            else:
                missing_secrets.append(secret_name)
                print(f"❌ {secret_name}: NOT FOUND")
        except Exception as e:
            missing_secrets.append(secret_name)
            error_msg = str(e)
            if "404" in error_msg or "not found" in error_msg.lower():
                print(f"❌ {secret_name}: NOT FOUND (404)")
            else:
                print(f"⚠️  {secret_name}: ERROR - {error_msg[:50]}...")
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Found secrets: {len(found_secrets)}")
    print(f"❌ Missing secrets: {len(missing_secrets)}")
    print()
    
    if missing_secrets:
        print("🔴 MISSING SECRETS (These are causing the warnings):")
        print("-" * 40)
        for secret in missing_secrets:
            print(f"  • {secret}")
        print()
        print("💡 To fix these warnings, you need to:")
        print("   1. Add these secrets to Firebase Secret Manager, OR")
        print("   2. Set them as environment variables, OR")
        print("   3. Add them to a .env file")
    
    if found_secrets:
        print()
        print("🟢 AVAILABLE SECRETS:")
        print("-" * 40)
        for secret in found_secrets:
            print(f"  • {secret}")
    
    # Check environment variables as fallback
    print()
    print("=" * 60)
    print("ENVIRONMENT VARIABLE FALLBACK CHECK")
    print("=" * 60)
    
    env_found = []
    env_missing = []
    
    for secret in missing_secrets:
        if os.getenv(secret):
            env_found.append(secret)
            print(f"✅ {secret}: Set in environment")
        else:
            env_missing.append(secret)
            print(f"❌ {secret}: Not in environment")
    
    if env_found:
        print()
        print(f"💡 {len(env_found)} missing secrets have environment variable fallbacks")
    
    if env_missing:
        print()
        print("🔴 COMPLETELY MISSING (No Firebase secret, no env var):")
        print("-" * 40)
        for secret in env_missing:
            print(f"  • {secret}")
            
            # Provide specific guidance for critical secrets
            if secret == 'JWT_SECRET_KEY':
                print(f"    → Generate with: openssl rand -base64 64")
            elif secret == 'SNOWFLAKE_ACCOUNT':
                print(f"    → Your Snowflake account identifier")
            elif secret == 'SNOWFLAKE_USER':
                print(f"    → Your Snowflake username")
            elif secret == 'SNOWFLAKE_PASSWORD':
                print(f"    → Your Snowflake password")

def check_config_loading():
    """Check how the configuration is loading secrets."""
    print()
    print("=" * 60)
    print("CONFIGURATION LOADING ANALYSIS")
    print("=" * 60)
    
    try:
        from app.config.config import Config
        
        config = Config()
        
        print("📋 Configuration secrets status:")
        print("-" * 40)
        
        # Check which secrets are actually set in config
        secret_attrs = [
            ('jwt_secret_key', 'JWT_SECRET_KEY'),
            ('openai_api_key', 'OPENAI_API_KEY'),
            ('anthropic_api_key', 'ANTHROPIC_API_KEY'),
            ('database_password', 'DATABASE_PASSWORD'),
            ('redis_api_key', 'REDIS_API_KEY'),
            ('olorin_api_key', 'OLORIN_API_KEY'),
            ('splunk_username', 'SPLUNK_USERNAME'),
            ('splunk_password', 'SPLUNK_PASSWORD'),
            ('snowflake_account', 'SNOWFLAKE_ACCOUNT'),
            ('snowflake_user', 'SNOWFLAKE_USER'),
            ('snowflake_password', 'SNOWFLAKE_PASSWORD'),
        ]
        
        for attr, env_name in secret_attrs:
            if hasattr(config, attr):
                value = getattr(config, attr)
                if value and value != env_name:  # Has actual value, not just the env var name
                    print(f"✅ {attr}: Loaded successfully")
                else:
                    print(f"❌ {attr}: Not loaded (using placeholder)")
            else:
                print(f"⚠️  {attr}: Not in config")
                
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")

def main():
    """Main function to run all checks."""
    print("\n" + "=" * 60)
    print("🔍 OLORIN SECRET CONFIGURATION DIAGNOSTIC")
    print("=" * 60)
    print()
    
    # Check Firebase secrets
    check_firebase_secrets()
    
    # Check configuration loading
    check_config_loading()
    
    print()
    print("=" * 60)
    print("📝 RECOMMENDATIONS")
    print("=" * 60)
    print()
    print("1. For local development, create a .env file with missing secrets")
    print("2. For production, add secrets to Firebase Secret Manager")
    print("3. Critical secrets that must be set:")
    print("   - JWT_SECRET_KEY (for authentication)")
    print("   - Database credentials (if using external DB)")
    print("   - API keys for external services you're using")
    print()
    print("4. Optional secrets (can be omitted if not using the service):")
    print("   - Snowflake credentials (only if using Snowflake)")
    print("   - Splunk credentials (only if using Splunk)")
    print("   - Langfuse keys (only if using Langfuse)")
    print()

if __name__ == "__main__":
    main()