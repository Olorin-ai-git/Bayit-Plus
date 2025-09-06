from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

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
                logger.error(f"Error reading {file_path}: {e}")
    
    return secrets

def check_firebase_secrets():
    """Check which secrets are configured vs missing."""
    logger.info("=" * 60)
    logger.info("FIREBASE SECRET MANAGER - SECRET STATUS CHECK")
    logger.info("=" * 60)
    logger.info()
    
    # Try to import the secret manager
    try:
        from app.config.firebase_secrets import SecretManager
        
        # Initialize the secret manager
        secret_manager = SecretManager(project_id="olorin-ai")
        
        logger.info("✅ Firebase Secret Manager initialized successfully")
        logger.info(f"📁 Project ID: olorin-ai")
        logger.info()
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase Secret Manager: {e}")
        logger.info("   This might be why secrets are not loading.")
        return
    
    # List of secrets the app ACTUALLY uses (optimized list)
    all_secrets = [
        'ANTHROPIC_API_KEY',    # USED: Core LLM functionality
        'JWT_SECRET_KEY',       # USED: Authentication
        'REDIS_API_KEY',        # USED: Caching system
        'SPLUNK_USERNAME',      # USED: Log analysis
        'SPLUNK_PASSWORD',      # USED: Log analysis
        'OLORIN_API_KEY',       # USED: Internal API calls
    ]
    
    # UNUSED SECRETS (commented out to reduce startup time by 75%)
    unused_secrets = [
        # 'OPENAI_API_KEY',        # UNUSED: Replaced by Anthropic
        # 'DATABASE_PASSWORD',     # UNUSED: Using SQLite, not PostgreSQL
        # 'DATABRICKS_TOKEN',      # UNUSED: Mock implementation only
        # 'SNOWFLAKE_ACCOUNT',     # UNUSED: Mock implementation only
        # 'SNOWFLAKE_USER',        # UNUSED: Mock implementation only
        # 'SNOWFLAKE_PASSWORD',    # UNUSED: Mock implementation only
        # 'SNOWFLAKE_PRIVATE_KEY', # UNUSED: Mock implementation only
        # 'SUMO_LOGIC_ACCESS_ID',  # UNUSED: Mock implementation only
        # 'SUMO_LOGIC_ACCESS_KEY', # UNUSED: Mock implementation only
        # 'LANGFUSE_PUBLIC_KEY',   # UNUSED: Not configured in codebase
        # 'LANGFUSE_SECRET_KEY',   # UNUSED: Not configured in codebase
        # 'APP_SECRET',            # UNUSED: Not referenced in codebase
    ]
    
    logger.info("🔍 Checking secret availability:")
    logger.info("-" * 40)
    
    found_secrets = []
    missing_secrets = []
    
    for secret_name in all_secrets:
        try:
            # Try to get the secret
            value = secret_manager.get_secret(secret_name)
            if value:
                found_secrets.append(secret_name)
                logger.info(f"✅ {secret_name}: FOUND")
            else:
                missing_secrets.append(secret_name)
                logger.info(f"❌ {secret_name}: NOT FOUND")
        except Exception as e:
            missing_secrets.append(secret_name)
            error_msg = str(e)
            if "404" in error_msg or "not found" in error_msg.lower():
                logger.info(f"❌ {secret_name}: NOT FOUND (404)")
            else:
                logger.error(f"⚠️  {secret_name}: ERROR - {error_msg[:50]}...")
    
    logger.info()
    logger.info("=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✅ Found secrets: {len(found_secrets)}")
    logger.info(f"❌ Missing secrets: {len(missing_secrets)}")
    logger.info()
    
    if missing_secrets:
        logger.warning("🔴 MISSING SECRETS (These are causing the warnings):")
        logger.info("-" * 40)
        for secret in missing_secrets:
            logger.info(f"  • {secret}")
        logger.info()
        logger.warning("💡 To fix these warnings, you need to:")
        logger.info("   1. Add these secrets to Firebase Secret Manager, OR")
        logger.info("   2. Set them as environment variables, OR")
        logger.info("   3. Add them to a .env file")
    
    if found_secrets:
        logger.info()
        logger.info("🟢 AVAILABLE SECRETS:")
        logger.info("-" * 40)
        for secret in found_secrets:
            logger.info(f"  • {secret}")
    
    # Check environment variables as fallback
    logger.info()
    logger.info("=" * 60)
    logger.info("ENVIRONMENT VARIABLE FALLBACK CHECK")
    logger.info("=" * 60)
    
    env_found = []
    env_missing = []
    
    for secret in missing_secrets:
        if os.getenv(secret):
            env_found.append(secret)
            logger.info(f"✅ {secret}: Set in environment")
        else:
            env_missing.append(secret)
            logger.info(f"❌ {secret}: Not in environment")
    
    if env_found:
        logger.info()
        logger.info(f"💡 {len(env_found)} missing secrets have environment variable fallbacks")
    
    if env_missing:
        logger.info()
        logger.info("🔴 COMPLETELY MISSING (No Firebase secret, no env var):")
        logger.info("-" * 40)
        for secret in env_missing:
            logger.info(f"  • {secret}")
            
            # Provide specific guidance for critical secrets
            if secret == 'JWT_SECRET_KEY':
                logger.info(f"    → Generate with: openssl rand -base64 64")
            elif secret == 'SNOWFLAKE_ACCOUNT':
                logger.info(f"    → Your Snowflake account identifier")
            elif secret == 'SNOWFLAKE_USER':
                logger.info(f"    → Your Snowflake username")
            elif secret == 'SNOWFLAKE_PASSWORD':
                logger.info(f"    → Your Snowflake password")

def check_config_loading():
    """Check how the configuration is loading secrets."""
    logger.info()
    logger.info("=" * 60)
    logger.info("CONFIGURATION LOADING ANALYSIS")
    logger.info("=" * 60)
    
    try:
        from app.config.config import Config
        
        config = Config()
        
        logger.info("📋 Configuration secrets status:")
        logger.info("-" * 40)
        
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
                    logger.info(f"✅ {attr}: Loaded successfully")
                else:
                    logger.info(f"❌ {attr}: Not loaded (using placeholder)")
            else:
                logger.info(f"⚠️  {attr}: Not in config")
                
    except Exception as e:
        logger.error(f"❌ Failed to load configuration: {e}")

def main():
    """Main function to run all checks."""
    logger.info("\n" + "=" * 60)
    logger.info("🔍 OLORIN SECRET CONFIGURATION DIAGNOSTIC")
    logger.info("=" * 60)
    logger.info()
    
    # Check Firebase secrets
    check_firebase_secrets()
    
    # Check configuration loading
    check_config_loading()
    
    logger.info()
    logger.info("=" * 60)
    logger.info("📝 RECOMMENDATIONS")
    logger.info("=" * 60)
    logger.info()
    logger.info("1. For local development, create a .env file with missing secrets")
    logger.info("2. For production, add secrets to Firebase Secret Manager")
    logger.info("3. Critical secrets that must be set:")
    logger.info("   - JWT_SECRET_KEY (for authentication)")
    logger.info("   - Database credentials (if using external DB)")
    logger.info("   - API keys for external services you're using")
    logger.info()
    logger.info("4. Optional secrets (can be omitted if not using the service):")
    logger.info("   - Snowflake credentials (only if using Snowflake)")
    logger.info("   - Splunk credentials (only if using Splunk)")
    logger.info("   - Langfuse keys (only if using Langfuse)")
    logger.info()

if __name__ == "__main__":
    main()