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
        secret_name: Name or path of the secret (e.g., 'olorin/app_secret')
        
    Returns:
        Secret value as string, or None if not found/error
        
    Examples:
        secret = get_firebase_secret('olorin/app_secret')
        db_password = get_firebase_secret('olorin/database_password')
    """
    # Check local development override first
    env_override = _get_local_override(secret_name)
    if env_override:
        return env_override
        
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
        name = f"projects/{project_id}/secrets/{secret_name.replace('/', '_')}/versions/latest"
        
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
        return None


def _get_local_override(secret_name: str) -> Optional[str]:
    """
    Check for local development environment variable overrides.
    Converts secret paths to environment variable names.
    
    Args:
        secret_name: Secret path like 'olorin/app_secret'
        
    Returns:
        Environment variable value if found, None otherwise
    """
    # Convert secret path to environment variable name
    # 'olorin/app_secret' -> 'OLORIN_APP_SECRET'
    # 'olorin/splunk_password' -> 'OLORIN_SPLUNK_PASSWORD'
    env_var_name = secret_name.upper().replace('/', '_')
    
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
        secret_name: Secret path (e.g., 'olorin/app_secret')
        
    Returns:
        Secret value as string
    """
    return get_firebase_secret(secret_name)


# Common secret mappings for migration from IDPS
SECRET_MAPPINGS = {
    # App secrets
    'olorin/app_secret': 'olorin_app_secret',
    
    # Splunk secrets
    'olorin/splunk_username': 'olorin_splunk_username',
    'olorin/splunk_password': 'olorin_splunk_password',
    
    # SumoLogic secrets
    'olorin/sumo_logic_access_id': 'olorin_sumo_logic_access_id',
    'olorin/sumo_logic_access_key': 'olorin_sumo_logic_access_key',
    
    # Snowflake secrets
    'olorin/snowflake_account': 'olorin_snowflake_account',
    'olorin/snowflake_user': 'olorin_snowflake_user',
    'olorin/snowflake_password': 'olorin_snowflake_password',
    'olorin/snowflake_private_key': 'olorin_snowflake_private_key',
    
    # LangFuse secrets
    'olorin/langfuse/public_key': 'olorin_langfuse_public_key',
    'olorin/langfuse/secret_key': 'olorin_langfuse_secret_key',
    
    # Test secrets
    'olorin/test_user_pwd': 'olorin_test_user_pwd',
}


def migrate_secret_name(old_idps_path: str) -> str:
    """
    Migrate old IDPS secret paths to Firebase secret names.
    
    Args:
        old_idps_path: Old IDPS path like 'olorin/app_secret'
        
    Returns:
        Firebase secret name like 'olorin_app_secret'
    """
    return SECRET_MAPPINGS.get(old_idps_path, old_idps_path.replace('/', '_'))


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