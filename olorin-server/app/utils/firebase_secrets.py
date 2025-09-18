from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

"""
Firebase Secrets Manager integration for Olorin service.
Replaces IDPS-based secret management with Firebase-based secret storage.
"""

import os
import subprocess
from typing import Optional, Dict
from functools import lru_cache

# Global cache for secrets to avoid repeated API calls
_secrets_cache: Dict[str, str] = {}


@lru_cache(maxsize=100)
def get_firebase_secret(secret_name: str) -> Optional[str]:
    """
    Retrieve a secret with priority order: .env first, then Firebase Secrets Manager.

    Args:
        secret_name: Name or path of the secret (e.g., 'APP_SECRET')

    Returns:
        Secret value as string, or None if not found/error

    Examples:
        secret = get_firebase_secret('APP_SECRET')
        db_password = get_firebase_secret('DATABASE_PASSWORD')
    """
    # Priority order: .env file -> environment variables -> Firebase Secrets Manager

    # Check cache
    global _secrets_cache
    if secret_name in _secrets_cache:
        return _secrets_cache[secret_name]

    try:
        # First: Check .env file
        env_value = _get_secret_from_env_file(secret_name)
        if env_value:
            _secrets_cache[secret_name] = env_value
            logger.info(f"Successfully retrieved secret '{secret_name}' from .env file")
            return env_value

        # Second: Check environment variables
        env_var_value = os.getenv(secret_name)
        if env_var_value:
            _secrets_cache[secret_name] = env_var_value
            logger.info(f"Successfully retrieved secret '{secret_name}' from environment variables")
            return env_var_value

        # Third: Fall back to Firebase CLI
        return _get_secret_via_firebase_cli_only(secret_name)

    except Exception as e:
        logger.error(f"Failed to retrieve secret '{secret_name}': {e}")
        return None


def _get_secret_from_env_file(secret_name: str) -> Optional[str]:
    """
    Load secret from .env file in the current working directory.

    Args:
        secret_name: Name of the secret to load

    Returns:
        Secret value or None if not found
    """
    try:
        env_file_path = os.path.join(os.getcwd(), '.env')
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        if key.strip() == secret_name:
                            # Remove quotes if present
                            value = value.strip().strip('"').strip("'")
                            return value if value else None
    except Exception as e:
        logger.debug(f"Error reading .env file for secret '{secret_name}': {e}")

    return None


def _get_secret_via_firebase_cli_only(secret_name: str) -> Optional[str]:
    """
    Get Firebase secrets using Firebase CLI - the ONLY allowed method.
    This ensures secrets come from Firebase Functions secrets, not Google Cloud.
    Always retrieves the LATEST version of the secret.
    """
    import subprocess
    
    try:
        # Get project ID from environment or use default
        project_id = os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        
        # Execute firebase functions:secrets:access command
        # This command ALWAYS gets the latest version from Firebase
        cmd = ['firebase', 'functions:secrets:access', secret_name, '--project', project_id]
        
        logger.info(f"🔥 Attempting to retrieve secret via Firebase CLI...")
        logger.info(f"   Project: {project_id}")
        logger.info(f"   Secret: {secret_name}")
        logger.info(f"   Command: {' '.join(cmd)}")
        logger.info(f"   Timeout: 30 seconds")
        logger.info(f"   This requires Firebase CLI and authentication...")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            secret_value = result.stdout.strip()
            if secret_value:
                # Cache the secret
                _secrets_cache[secret_name] = secret_value
                logger.info(f"Successfully retrieved latest version of secret '{secret_name}' from Firebase")
                return secret_value
            else:
                logger.error(f"Firebase returned empty value for secret '{secret_name}'")
        else:
            logger.error(f"Firebase CLI failed to retrieve secret '{secret_name}': {result.stderr.strip()}")
            
    except subprocess.TimeoutExpired:
        logger.error(f"Firebase CLI timeout retrieving secret '{secret_name}'")
    except FileNotFoundError:
        logger.error("Firebase CLI not found in PATH - install with: npm install -g firebase-tools")
    except Exception as e:
        logger.error(f"Firebase CLI error retrieving secret '{secret_name}': {e}")
        
    return None


# REMOVED: _get_local_override function
# NO LOCAL OVERRIDES ALLOWED - All secrets MUST come from Firebase only


def clear_secrets_cache():
    """Clear the secrets cache. Useful for testing or when secrets are rotated."""
    global _secrets_cache
    _secrets_cache.clear()
    logger.info("Secrets cache cleared")


def get_app_secret(secret_name: str) -> Optional[str]:
    """
    Legacy compatibility function that maps to Firebase secrets.
    This maintains backward compatibility while migrating from IDPS.
    
    Args:
        secret_name: Secret path (e.g., 'APP_SECRET')
        
    Returns:
        Secret value as string from Firebase ONLY
    """
    # NO FALLBACKS - Firebase is the ONLY source
    result = get_firebase_secret(secret_name)
    
    if result is None:
        logger.error(f"Failed to retrieve secret '{secret_name}' from Firebase - no fallbacks allowed")
    
    return result


# Common secret mappings for migration from IDPS
SECRET_MAPPINGS = {
    # App secrets
    'APP_SECRET': 'APP_SECRET',
    
    # AI/ML API secrets
    'ANTHROPIC_API_KEY': 'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY': 'OPENAI_API_KEY',
    
    # Database secrets
    'DATABASE_PASSWORD': 'DATABASE_PASSWORD',
    'REDIS_PASSWORD': 'REDIS_PASSWORD',
    
    # Authentication secrets
    'JWT_SECRET_KEY': 'JWT_SECRET_KEY',
    'OLORIN_API_KEY': 'OLORIN_API_KEY',
    
    # Splunk secrets
    'SPLUNK_USERNAME': 'SPLUNK_USERNAME',
    'SPLUNK_PASSWORD': 'SPLUNK_PASSWORD',
    'SPLUNK_TOKEN': 'SPLUNK_TOKEN',
    
    # SumoLogic secrets
    'SUMO_LOGIC_ACCESS_ID': 'SUMO_LOGIC_ACCESS_ID',
    'SUMO_LOGIC_ACCESS_KEY': 'SUMO_LOGIC_ACCESS_KEY',
    
    # Snowflake secrets
    'SNOWFLAKE_ACCOUNT': 'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USER': 'SNOWFLAKE_USER',
    'SNOWFLAKE_PASSWORD': 'SNOWFLAKE_PASSWORD',
    'SNOWFLAKE_DATABASE': 'SNOWFLAKE_DATABASE',
    'SNOWFLAKE_SCHEMA': 'SNOWFLAKE_SCHEMA',
    'SNOWFLAKE_WAREHOUSE': 'SNOWFLAKE_WAREHOUSE',
    'SNOWFLAKE_ROLE': 'SNOWFLAKE_ROLE',
    'SNOWFLAKE_AUTHENTICATOR': 'SNOWFLAKE_AUTHENTICATOR',
    'SNOWFLAKE_PRIVATE_KEY': 'SNOWFLAKE_PRIVATE_KEY',
    
    # Databricks secrets
    'DATABRICKS_TOKEN': 'DATABRICKS_TOKEN',
    
    # LangFuse secrets
    'LANGFUSE_PUBLIC_KEY': 'LANGFUSE_PUBLIC_KEY',
    'LANGFUSE_SECRET_KEY': 'LANGFUSE_SECRET_KEY',
    
    # Test secrets
    'TEST_USER_PWD': 'TEST_USER_PWD',
}


def migrate_secret_name(old_idps_path: str) -> str:
    """
    Migrate old IDPS secret paths to Firebase secret names.
    
    Args:
        old_idps_path: Old IDPS path like 'APP_SECRET'
        
    Returns:
        Firebase secret name like 'APP_SECRET'
    """
    return SECRET_MAPPINGS.get(old_idps_path, old_idps_path)


if __name__ == "__main__":
    # Test the Firebase CLI secrets functionality
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) > 1:
        secret_name = sys.argv[1]
        logger.info(f"\nRetrieving secret '{secret_name}' from Firebase (latest version)...")
        secret_value = get_firebase_secret(secret_name)
        if secret_value:
            logger.info(f"✓ Secret '{secret_name}' retrieved successfully from Firebase")
            logger.info(f"  Length: {len(secret_value)} characters")
            if secret_name == 'ANTHROPIC_API_KEY':
                logger.info(f"  Preview: {secret_value[:20]}...{secret_value[-10:]}")
        else:
            logger.error(f"✗ Failed to retrieve secret '{secret_name}' from Firebase")
    else:
        logger.info("Usage: python firebase_secrets.py <secret_name>")
        logger.info("\nExample: python firebase_secrets.py ANTHROPIC_API_KEY")