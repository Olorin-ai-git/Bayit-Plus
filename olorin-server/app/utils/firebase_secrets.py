"""
Firebase Secrets Manager integration for Olorin service.
Replaces IDPS-based secret management with Firebase-based secret storage.
"""

import os
import logging
from typing import Optional, Dict
from functools import lru_cache

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    from google.cloud import secretmanager
except ImportError as e:
    logging.warning(f"Firebase dependencies not available: {e}")
    firebase_admin = None
    secretmanager = None

logger = logging.getLogger(__name__)

# Global cache for secrets to avoid repeated API calls
_secrets_cache: Dict[str, str] = {}
_firebase_initialized = False


def _initialize_firebase() -> bool:
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_initialized
    
    if _firebase_initialized:
        return True
        
    if not firebase_admin:
        logger.error("Firebase Admin SDK not available. Install with: pip install firebase-admin")
        return False
    
    try:
        # Check if already initialized
        if firebase_admin._apps:
            _firebase_initialized = True
            return True
            
        # Initialize with service account credentials
        firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
        firebase_private_key = os.getenv('FIREBASE_PRIVATE_KEY')
        firebase_client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
        
        if firebase_project_id and firebase_private_key and firebase_client_email:
            # Use service account credentials from environment
            cred_dict = {
                "type": "service_account",
                "project_id": firebase_project_id,
                "private_key": firebase_private_key.replace('\\n', '\n'),
                "client_email": firebase_client_email,
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'projectId': firebase_project_id
            })
            logger.info(f"Firebase initialized with service account for project: {firebase_project_id}")
        else:
            # Use Application Default Credentials (for local development)
            firebase_admin.initialize_app()
            logger.info("Firebase initialized with Application Default Credentials")
            
        _firebase_initialized = True
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return False


@lru_cache(maxsize=100)
def get_firebase_secret(secret_name: str) -> Optional[str]:
    """
    Retrieve a secret from Firebase Secrets Manager.
    
    Args:
        secret_name: Name or path of the secret (e.g., 'APP_SECRET')
        
    Returns:
        Secret value as string, or None if not found/error
        
    Examples:
        secret = get_firebase_secret('APP_SECRET')
        db_password = get_firebase_secret('DATABASE_PASSWORD')
    """
    # DISABLED: Local overrides are not allowed - must use Firebase/Google Cloud secrets only
    # Per requirement: ANTHROPIC_API_KEY must come from Firebase ONLY
    # env_override = _get_local_override(secret_name)
    # if env_override:
    #     return env_override
        
    # Check cache
    global _secrets_cache
    if secret_name in _secrets_cache:
        return _secrets_cache[secret_name]
    
    try:
        # Initialize Firebase if needed
        if not _initialize_firebase():
            logger.error("Firebase not initialized, cannot retrieve secrets")
            return None
            
        if not secretmanager:
            logger.error("Google Cloud Secret Manager not available")
            return None
            
        # Create Secret Manager client
        client = secretmanager.SecretManagerServiceClient()
        
        # Get the project ID from Firebase config
        project_id = os.getenv('FIREBASE_PROJECT_ID', firebase_admin.get_app().project_id)
        
        # Build the resource name
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        
        # Access the secret version
        response = client.access_secret_version(request={"name": name})
        
        # Decode the secret value
        secret_value = response.payload.data.decode("UTF-8")
        
        # Cache the secret
        _secrets_cache[secret_name] = secret_value
        
        logger.debug(f"Successfully retrieved secret: {secret_name}")
        return secret_value
        
    except Exception as e:
        logger.error(f"Failed to retrieve secret '{secret_name}': {e}")
        # Try Firebase CLI fallback if SDK method fails
        return _get_secret_via_cli(secret_name)


def _get_secret_via_cli(secret_name: str) -> Optional[str]:
    """
    Fallback method to get Firebase secrets using Firebase CLI.
    Used when Firebase Admin SDK is not available.
    """
    import subprocess
    
    try:
        # Get project ID from environment or use default
        project_id = os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        
        # Execute firebase functions:secrets:access command
        cmd = ['firebase', 'functions:secrets:access', secret_name, '--project', project_id]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            secret_value = result.stdout.strip()
            if secret_value:
                # Cache the secret
                _secrets_cache[secret_name] = secret_value
                logger.info(f"Successfully retrieved secret '{secret_name}' via Firebase CLI")
                return secret_value
        else:
            logger.warning(f"Firebase CLI failed to retrieve secret '{secret_name}': {result.stderr.strip()}")
            
    except subprocess.TimeoutExpired:
        logger.error(f"Firebase CLI timeout retrieving secret '{secret_name}'")
    except FileNotFoundError:
        logger.error("Firebase CLI not found in PATH")
    except Exception as e:
        logger.error(f"Firebase CLI error retrieving secret '{secret_name}': {e}")
        
    return None


def _get_local_override(secret_name: str) -> Optional[str]:
    """
    Check for local development environment variable overrides.
    Converts secret paths to environment variable names.
    
    Args:
        secret_name: Secret path like 'APP_SECRET'
        
    Returns:
        Environment variable value if found, None otherwise
    """
    # Secret name is already in uppercase format
    env_var_name = secret_name
    
    value = os.getenv(env_var_name)
    if value:
        logger.debug(f"Using local override for secret: {secret_name} -> {env_var_name}")
        return value
        
    return None


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
        Secret value as string
    """
    result = get_firebase_secret(secret_name)
    
    # Fallback for test scenarios when Firebase is not available
    if result is None and not firebase_admin:
        logger.warning(f"Firebase not available, using fallback for secret: {secret_name}")
        # Return test fallback values for common secrets
        fallback_secrets = {
            'APP_SECRET': 'test_app_secret_fallback',
            'SPLUNK_USERNAME': 'test_splunk_user',
            'SPLUNK_PASSWORD': 'test_splunk_pass',
            'SUMO_LOGIC_ACCESS_ID': 'test_sumo_id',
            'SUMO_LOGIC_ACCESS_KEY': 'test_sumo_key',
        }
        return fallback_secrets.get(secret_name, f'test_fallback_for_{secret_name}')
    
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
    # Test the secrets functionality
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) > 1:
        secret_name = sys.argv[1]
        secret_value = get_firebase_secret(secret_name)
        if secret_value:
            print(f"Secret '{secret_name}' retrieved successfully")
        else:
            print(f"Failed to retrieve secret '{secret_name}'")
    else:
        print("Usage: python firebase_secrets.py <secret_name>")