#!/usr/bin/env python3
"""
Firebase Secrets Manager for Olorin AI
Comprehensive secret management utility

This script provides a command-line interface for managing secrets in 
Firebase Secrets Manager for the Olorin AI project.

Usage:
    python firebase-secrets-manager.py upload <secret-name> <secret-value>
    python firebase-secrets-manager.py get <secret-name>
    python firebase-secrets-manager.py list
    python firebase-secrets-manager.py validate <secret-name>
    python firebase-secrets-manager.py validate-all
    python firebase-secrets-manager.py rotate <secret-name>
    python firebase-secrets-manager.py backup <output-file>
    python firebase-secrets-manager.py restore <input-file>

Examples:
    python firebase-secrets-manager.py upload olorin/database_password "super_secure_password"
    python firebase-secrets-manager.py get olorin/anthropic_api_key
    python firebase-secrets-manager.py validate-all
"""

import argparse
import json
import os
import sys
import logging
import getpass
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import hashlib
import secrets
import string

# Add olorin-server to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../olorin-server'))

try:
    from google.cloud import secretmanager
    import firebase_admin
    from firebase_admin import credentials
except ImportError as e:
    print(f"Error: Required dependencies not installed: {e}")
    print("Install with: pip install google-cloud-secret-manager firebase-admin")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FirebaseSecretsManager:
    """Firebase Secrets Manager utility class"""
    
    def __init__(self, project_id: Optional[str] = None):
        """Initialize the Firebase Secrets Manager
        
        Args:
            project_id: Firebase project ID. If None, will try to get from environment.
        """
        self.project_id = project_id or os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        self.client = None
        self._initialize_firebase()
        
    def _initialize_firebase(self) -> bool:
        """Initialize Firebase Admin SDK and Secret Manager client"""
        try:
            # Initialize Firebase Admin SDK if not already initialized
            if not firebase_admin._apps:
                firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
                firebase_private_key = os.getenv('FIREBASE_PRIVATE_KEY')
                firebase_client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
                
                if firebase_project_id and firebase_private_key and firebase_client_email:
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
                    firebase_admin.initialize_app()
                    logger.info("Firebase initialized with Application Default Credentials")
            
            # Initialize Secret Manager client
            self.client = secretmanager.SecretManagerServiceClient()
            logger.info(f"Secret Manager client initialized for project: {self.project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            return False
    
    def upload_secret(self, secret_name: str, secret_value: str, description: str = "") -> bool:
        """Upload a secret to Firebase Secrets Manager
        
        Args:
            secret_name: Name of the secret (e.g., 'olorin/database_password')
            secret_value: The secret value to store
            description: Optional description for the secret
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.client:
                logger.error("Secret Manager client not initialized")
                return False
            
            # Convert secret name to valid Secret Manager format
            secret_id = secret_name.replace('/', '_')
            parent = f"projects/{self.project_id}"
            
            # Check if secret already exists
            secret_path = f"{parent}/secrets/{secret_id}"
            try:
                self.client.get_secret(request={"name": secret_path})
                logger.info(f"Secret {secret_id} already exists, adding new version")
            except Exception:
                # Secret doesn't exist, create it
                logger.info(f"Creating new secret: {secret_id}")
                secret = {
                    "replication": {"automatic": {}},
                    "labels": {
                        "managed_by": "olorin_secrets_manager",
                        "created": datetime.now().strftime("%Y%m%d"),
                        "original_path": secret_name.replace('/', '_')
                    }
                }
                if description:
                    secret["labels"]["description"] = description[:63]  # GCP label limit
                
                self.client.create_secret(
                    request={
                        "parent": parent,
                        "secret_id": secret_id,
                        "secret": secret,
                    }
                )
            
            # Add secret version with the actual value
            response = self.client.add_secret_version(
                request={
                    "parent": secret_path,
                    "payload": {"data": secret_value.encode("UTF-8")},
                }
            )
            
            logger.info(f"Successfully uploaded secret: {secret_name} -> {secret_id}")
            logger.info(f"Version: {response.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload secret '{secret_name}': {e}")
            return False
    
    def get_secret(self, secret_name: str) -> Optional[str]:
        """Retrieve a secret from Firebase Secrets Manager
        
        Args:
            secret_name: Name of the secret (e.g., 'olorin/database_password')
            
        Returns:
            Secret value as string, or None if not found/error
        """
        try:
            if not self.client:
                logger.error("Secret Manager client not initialized")
                return None
            
            # Convert secret name to Secret Manager format
            secret_id = secret_name.replace('/', '_')
            name = f"projects/{self.project_id}/secrets/{secret_id}/versions/latest"
            
            response = self.client.access_secret_version(request={"name": name})
            secret_value = response.payload.data.decode("UTF-8")
            
            logger.info(f"Successfully retrieved secret: {secret_name}")
            return secret_value
            
        except Exception as e:
            logger.error(f"Failed to retrieve secret '{secret_name}': {e}")
            return None
    
    def list_secrets(self) -> List[Dict[str, str]]:
        """List all secrets in Firebase Secrets Manager
        
        Returns:
            List of secret information dictionaries
        """
        try:
            if not self.client:
                logger.error("Secret Manager client not initialized")
                return []
            
            parent = f"projects/{self.project_id}"
            secrets = []
            
            for secret in self.client.list_secrets(request={"parent": parent}):
                secret_info = {
                    "name": secret.name.split('/')[-1],
                    "original_path": secret.labels.get("original_path", "").replace('_', '/'),
                    "created": secret.create_time.strftime("%Y-%m-%d %H:%M:%S") if secret.create_time else "Unknown",
                    "description": secret.labels.get("description", ""),
                    "managed_by": secret.labels.get("managed_by", ""),
                }
                secrets.append(secret_info)
            
            return secrets
            
        except Exception as e:
            logger.error(f"Failed to list secrets: {e}")
            return []
    
    def validate_secret(self, secret_name: str) -> bool:
        """Validate that a secret can be retrieved and is not empty
        
        Args:
            secret_name: Name of the secret to validate
            
        Returns:
            True if secret is valid and accessible, False otherwise
        """
        try:
            secret_value = self.get_secret(secret_name)
            if secret_value is None:
                logger.error(f"Secret '{secret_name}' not found or inaccessible")
                return False
            
            if len(secret_value.strip()) == 0:
                logger.error(f"Secret '{secret_name}' is empty")
                return False
            
            logger.info(f"Secret '{secret_name}' validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate secret '{secret_name}': {e}")
            return False
    
    def validate_all_secrets(self, required_secrets: Optional[List[str]] = None) -> Tuple[bool, List[str], List[str]]:
        """Validate all required secrets are accessible
        
        Args:
            required_secrets: List of required secret names. If None, uses default list.
            
        Returns:
            Tuple of (all_valid, valid_secrets, invalid_secrets)
        """
        if required_secrets is None:
            required_secrets = [
                "olorin/app_secret",
                "olorin/anthropic_api_key",
                "olorin/openai_api_key",
                "olorin/database_password",
                "olorin/redis_password",
                "olorin/jwt_secret_key",
                "olorin/splunk_username",
                "olorin/splunk_password",
                "olorin/sumo_logic_access_id",
                "olorin/sumo_logic_access_key",
                "olorin/gaia_api_key",
                "olorin/olorin_api_key",
                "olorin/databricks_token",
                "olorin/snowflake_account",
                "olorin/snowflake_user",
                "olorin/snowflake_password",
                "olorin/snowflake_private_key",
                "olorin/langfuse/public_key",
                "olorin/langfuse/secret_key",
                "olorin/test_user_pwd",
            ]
        
        valid_secrets = []
        invalid_secrets = []
        
        logger.info(f"Validating {len(required_secrets)} required secrets...")
        
        for secret_name in required_secrets:
            if self.validate_secret(secret_name):
                valid_secrets.append(secret_name)
            else:
                invalid_secrets.append(secret_name)
        
        all_valid = len(invalid_secrets) == 0
        
        logger.info(f"Validation complete: {len(valid_secrets)} valid, {len(invalid_secrets)} invalid")
        
        if invalid_secrets:
            logger.error(f"Invalid secrets: {', '.join(invalid_secrets)}")
        
        return all_valid, valid_secrets, invalid_secrets
    
    def rotate_secret(self, secret_name: str, new_value: Optional[str] = None) -> bool:
        """Rotate a secret by generating a new value or using provided value
        
        Args:
            secret_name: Name of the secret to rotate
            new_value: New secret value. If None, will generate a secure random value.
            
        Returns:
            True if rotation successful, False otherwise
        """
        try:
            if new_value is None:
                # Generate secure random value
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
                new_value = ''.join(secrets.choice(alphabet) for _ in range(32))
                logger.info(f"Generated new random value for secret: {secret_name}")
            
            # Upload the new secret version
            success = self.upload_secret(secret_name, new_value, f"Rotated on {datetime.now().isoformat()}")
            
            if success:
                logger.info(f"Successfully rotated secret: {secret_name}")
            else:
                logger.error(f"Failed to rotate secret: {secret_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to rotate secret '{secret_name}': {e}")
            return False
    
    def backup_secrets(self, output_file: str, secrets_list: Optional[List[str]] = None) -> bool:
        """Backup secrets to an encrypted JSON file
        
        Args:
            output_file: Path to output backup file
            secrets_list: List of secret names to backup. If None, backs up all secrets.
            
        Returns:
            True if backup successful, False otherwise
        """
        try:
            if secrets_list is None:
                # Get all secrets
                all_secrets = self.list_secrets()
                secrets_list = [s["original_path"] for s in all_secrets if s["original_path"]]
            
            backup_data = {
                "backup_timestamp": datetime.now().isoformat(),
                "project_id": self.project_id,
                "secrets": {}
            }
            
            logger.info(f"Backing up {len(secrets_list)} secrets...")
            
            for secret_name in secrets_list:
                secret_value = self.get_secret(secret_name)
                if secret_value:
                    # Hash the secret value for verification (don't store plain text)
                    secret_hash = hashlib.sha256(secret_value.encode()).hexdigest()
                    backup_data["secrets"][secret_name] = {
                        "hash": secret_hash,
                        "length": len(secret_value),
                        "backed_up": True
                    }
                else:
                    backup_data["secrets"][secret_name] = {
                        "backed_up": False,
                        "error": "Could not retrieve secret"
                    }
            
            # Write backup file (without actual secret values for security)
            with open(output_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            logger.info(f"Backup completed: {output_file}")
            logger.warning("Note: This backup contains hashes only, not actual secret values")
            logger.warning("For disaster recovery, ensure secrets are also backed up in Firebase Console")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to backup secrets: {e}")
            return False
    
    def delete_secret(self, secret_name: str, confirm: bool = False) -> bool:
        """Delete a secret from Firebase Secrets Manager
        
        Args:
            secret_name: Name of the secret to delete
            confirm: If True, skip confirmation prompt
            
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            if not confirm:
                response = input(f"Are you sure you want to delete secret '{secret_name}'? (yes/no): ")
                if response.lower() != 'yes':
                    logger.info("Delete operation cancelled")
                    return False
            
            if not self.client:
                logger.error("Secret Manager client not initialized")
                return False
            
            secret_id = secret_name.replace('/', '_')
            name = f"projects/{self.project_id}/secrets/{secret_id}"
            
            self.client.delete_secret(request={"name": name})
            logger.info(f"Successfully deleted secret: {secret_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete secret '{secret_name}': {e}")
            return False


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Firebase Secrets Manager for Olorin AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s upload olorin/database_password "super_secure_password"
  %(prog)s get olorin/anthropic_api_key
  %(prog)s list
  %(prog)s validate olorin/app_secret
  %(prog)s validate-all
  %(prog)s rotate olorin/jwt_secret_key
  %(prog)s backup /path/to/backup.json
  %(prog)s delete olorin/old_secret
        """
    )
    
    parser.add_argument(
        '--project-id',
        default=os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai'),
        help='Firebase project ID (default: olorin-ai)'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Upload command
    upload_parser = subparsers.add_parser('upload', help='Upload a secret')
    upload_parser.add_argument('secret_name', help='Secret name (e.g., olorin/database_password)')
    upload_parser.add_argument('secret_value', nargs='?', help='Secret value (will prompt if not provided)')
    upload_parser.add_argument('--description', help='Description for the secret')
    
    # Get command
    get_parser = subparsers.add_parser('get', help='Retrieve a secret')
    get_parser.add_argument('secret_name', help='Secret name to retrieve')
    get_parser.add_argument('--show', action='store_true', help='Show the secret value (use with caution)')
    
    # List command
    subparsers.add_parser('list', help='List all secrets')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate a specific secret')
    validate_parser.add_argument('secret_name', help='Secret name to validate')
    
    # Validate-all command
    validate_all_parser = subparsers.add_parser('validate-all', help='Validate all required secrets')
    validate_all_parser.add_argument('--secrets-file', help='JSON file with list of required secrets')
    
    # Rotate command
    rotate_parser = subparsers.add_parser('rotate', help='Rotate a secret')
    rotate_parser.add_argument('secret_name', help='Secret name to rotate')
    rotate_parser.add_argument('--new-value', help='New secret value (will generate if not provided)')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Backup secrets metadata')
    backup_parser.add_argument('output_file', help='Output backup file path')
    backup_parser.add_argument('--secrets', nargs='+', help='Specific secrets to backup')
    
    # Delete command
    delete_parser = subparsers.add_parser('delete', help='Delete a secret')
    delete_parser.add_argument('secret_name', help='Secret name to delete')
    delete_parser.add_argument('--confirm', action='store_true', help='Skip confirmation prompt')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize Firebase Secrets Manager
    manager = FirebaseSecretsManager(args.project_id)
    
    # Execute command
    if args.command == 'upload':
        secret_value = args.secret_value
        if not secret_value:
            secret_value = getpass.getpass(f"Enter value for secret '{args.secret_name}': ")
        
        success = manager.upload_secret(args.secret_name, secret_value, args.description or "")
        sys.exit(0 if success else 1)
    
    elif args.command == 'get':
        secret_value = manager.get_secret(args.secret_name)
        if secret_value:
            if args.show:
                print(f"Secret value: {secret_value}")
            else:
                print(f"Secret '{args.secret_name}' retrieved successfully (use --show to display)")
        else:
            print(f"Failed to retrieve secret '{args.secret_name}'")
            sys.exit(1)
    
    elif args.command == 'list':
        secrets = manager.list_secrets()
        if secrets:
            print(f"\nFound {len(secrets)} secrets in project '{args.project_id}':")
            print("-" * 80)
            for secret in secrets:
                print(f"Name: {secret['name']}")
                print(f"Original Path: {secret['original_path']}")
                print(f"Created: {secret['created']}")
                print(f"Description: {secret['description']}")
                print(f"Managed By: {secret['managed_by']}")
                print("-" * 80)
        else:
            print("No secrets found or error occurred")
    
    elif args.command == 'validate':
        success = manager.validate_secret(args.secret_name)
        sys.exit(0 if success else 1)
    
    elif args.command == 'validate-all':
        required_secrets = None
        if args.secrets_file:
            with open(args.secrets_file, 'r') as f:
                data = json.load(f)
                required_secrets = data.get('secrets', [])
        
        all_valid, valid_secrets, invalid_secrets = manager.validate_all_secrets(required_secrets)
        
        print(f"\nValidation Results:")
        print(f"Valid secrets ({len(valid_secrets)}):")
        for secret in valid_secrets:
            print(f"  ✓ {secret}")
        
        if invalid_secrets:
            print(f"\nInvalid secrets ({len(invalid_secrets)}):")
            for secret in invalid_secrets:
                print(f"  ✗ {secret}")
        
        sys.exit(0 if all_valid else 1)
    
    elif args.command == 'rotate':
        success = manager.rotate_secret(args.secret_name, args.new_value)
        sys.exit(0 if success else 1)
    
    elif args.command == 'backup':
        success = manager.backup_secrets(args.output_file, args.secrets)
        sys.exit(0 if success else 1)
    
    elif args.command == 'delete':
        success = manager.delete_secret(args.secret_name, args.confirm)
        sys.exit(0 if success else 1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()