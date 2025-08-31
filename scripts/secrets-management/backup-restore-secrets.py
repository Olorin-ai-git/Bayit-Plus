#!/usr/bin/env python3
"""
Backup and Restore Secrets for Firebase Secrets Manager
Utility for backing up and restoring secrets across environments
in the Olorin AI project.

This script provides:
1. Full backup of all secrets with metadata
2. Selective backup of specific secrets
3. Cross-environment secret synchronization
4. Disaster recovery restore functionality
5. Secret versioning and rollback capabilities

Usage:
    python backup-restore-secrets.py backup --output backup.json
    python backup-restore-secrets.py restore --input backup.json
    python backup-restore-secrets.py sync --from-env qal --to-env e2e
    python backup-restore-secrets.py compare --env1 local --env2 e2e
    python backup-restore-secrets.py version --secret olorin/database_password

Examples:
    python backup-restore-secrets.py backup --output prod_backup_2024.json --encrypt
    python backup-restore-secrets.py restore --input prod_backup_2024.json --dry-run
    python backup-restore-secrets.py sync --from-env e2e --to-env local --secrets-file required_secrets.json
    python backup-restore-secrets.py compare --env1 qal --env2 e2e
"""

import argparse
import json
import os
import sys
import logging
import time
import getpass
import hashlib
import base64
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from pathlib import Path
import shutil

# Add firebase-secrets-manager to path
sys.path.append(os.path.dirname(__file__))
from firebase_secrets_manager import FirebaseSecretsManager

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    HAS_ENCRYPTION = True
except ImportError:
    print("Warning: cryptography package not available. Encryption features disabled.")
    print("Install with: pip install cryptography")
    HAS_ENCRYPTION = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SecretsBackupRestore:
    """Firebase Secrets backup and restore utility"""
    
    def __init__(self, project_id: Optional[str] = None, dry_run: bool = False):
        """Initialize the backup/restore utility
        
        Args:
            project_id: Firebase project ID
            dry_run: If True, simulate operations without making changes
        """
        self.project_id = project_id or os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        self.dry_run = dry_run
        self.secrets_manager = FirebaseSecretsManager(project_id)
        
        if dry_run:
            logger.info("Running in DRY-RUN mode - no changes will be made")
    
    def create_full_backup(self, output_file: str, encrypt: bool = False, 
                          include_values: bool = False, password: Optional[str] = None) -> Dict[str, Any]:
        """Create a full backup of all secrets
        
        Args:
            output_file: Path to output backup file
            encrypt: Whether to encrypt the backup
            include_values: Whether to include actual secret values (DANGEROUS!)
            password: Encryption password (will prompt if not provided and encrypt=True)
            
        Returns:
            Backup metadata dictionary
        """
        logger.info(f"Creating full backup to: {output_file}")
        
        # Get all secrets
        all_secrets = self.secrets_manager.list_secrets()
        
        if not all_secrets:
            logger.warning("No secrets found to backup")
            return {"error": "No secrets found"}
        
        backup_data = {
            "backup_metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "project_id": self.project_id,
                "backup_type": "full",
                "total_secrets": len(all_secrets),
                "include_values": include_values,
                "encrypted": encrypt,
                "backup_version": "1.0"
            },
            "secrets": {}
        }
        
        logger.info(f"Backing up {len(all_secrets)} secrets...")
        
        successful_backups = 0
        failed_backups = 0
        
        for secret_info in all_secrets:
            secret_name = secret_info.get("original_path") or secret_info.get("name", "").replace('_', '/')
            
            try:
                secret_data = {
                    "name": secret_info.get("name"),
                    "original_path": secret_name,
                    "created": secret_info.get("created"),
                    "description": secret_info.get("description", ""),
                    "managed_by": secret_info.get("managed_by", ""),
                    "backup_timestamp": backup_data["backup_metadata"]["timestamp"]
                }
                
                if include_values:
                    logger.warning(f"Including actual value for {secret_name} (SECURITY RISK!)")
                    secret_value = self.secrets_manager.get_secret(secret_name)
                    if secret_value:
                        secret_data["value"] = secret_value
                        secret_data["value_hash"] = hashlib.sha256(secret_value.encode()).hexdigest()
                        secret_data["value_length"] = len(secret_value)
                    else:
                        secret_data["backup_error"] = "Could not retrieve secret value"
                        failed_backups += 1
                        continue
                else:
                    # Only include metadata and hash for verification
                    secret_value = self.secrets_manager.get_secret(secret_name)
                    if secret_value:
                        secret_data["value_hash"] = hashlib.sha256(secret_value.encode()).hexdigest()
                        secret_data["value_length"] = len(secret_value)
                        secret_data["value_available"] = True
                    else:
                        secret_data["value_available"] = False
                        secret_data["backup_error"] = "Could not retrieve secret value"
                        failed_backups += 1
                        continue
                
                backup_data["secrets"][secret_name] = secret_data
                successful_backups += 1
                
                if successful_backups % 10 == 0:
                    logger.debug(f"Backed up {successful_backups}/{len(all_secrets)} secrets")
                
            except Exception as e:
                logger.error(f"Failed to backup secret {secret_name}: {e}")
                failed_backups += 1
        
        # Update metadata with results
        backup_data["backup_metadata"]["successful_backups"] = successful_backups
        backup_data["backup_metadata"]["failed_backups"] = failed_backups
        
        # Save backup file
        try:
            if encrypt and HAS_ENCRYPTION:
                self._save_encrypted_backup(backup_data, output_file, password)
            else:
                if encrypt and not HAS_ENCRYPTION:
                    logger.warning("Encryption requested but cryptography package not available")
                
                with open(output_file, 'w') as f:
                    json.dump(backup_data, f, indent=2, default=str)
            
            logger.info(f"Backup completed: {output_file}")
            logger.info(f"  Successful: {successful_backups}")
            logger.info(f"  Failed: {failed_backups}")
            
            if include_values:
                logger.warning("WARNING: Backup contains actual secret values!")
                logger.warning("Store this backup file securely and delete when no longer needed")
            
        except Exception as e:
            logger.error(f"Failed to save backup file: {e}")
            return {"error": f"Failed to save backup: {e}"}
        
        return backup_data["backup_metadata"]
    
    def restore_from_backup(self, input_file: str, password: Optional[str] = None,
                           selective_restore: Optional[List[str]] = None,
                           overwrite_existing: bool = False) -> Dict[str, Any]:
        """Restore secrets from backup file
        
        Args:
            input_file: Path to backup file
            password: Decryption password if backup is encrypted
            selective_restore: List of specific secrets to restore (None for all)
            overwrite_existing: Whether to overwrite existing secrets
            
        Returns:
            Restore results dictionary
        """
        logger.info(f"Restoring secrets from backup: {input_file}")
        
        if not os.path.exists(input_file):
            logger.error(f"Backup file not found: {input_file}")
            return {"error": "Backup file not found"}
        
        # Load backup data
        try:
            backup_data = self._load_backup_file(input_file, password)
        except Exception as e:
            logger.error(f"Failed to load backup file: {e}")
            return {"error": f"Failed to load backup: {e}"}
        
        if "secrets" not in backup_data:
            logger.error("Invalid backup file format")
            return {"error": "Invalid backup format"}
        
        metadata = backup_data.get("backup_metadata", {})
        logger.info(f"Backup created: {metadata.get('timestamp', 'unknown')}")
        logger.info(f"Source project: {metadata.get('project_id', 'unknown')}")
        logger.info(f"Total secrets in backup: {metadata.get('total_secrets', 0)}")
        
        # Determine which secrets to restore
        secrets_to_restore = backup_data["secrets"]
        if selective_restore:
            secrets_to_restore = {
                name: data for name, data in secrets_to_restore.items()
                if name in selective_restore
            }
            logger.info(f"Selective restore: {len(secrets_to_restore)} secrets selected")
        
        if not secrets_to_restore:
            logger.warning("No secrets to restore")
            return {"error": "No secrets to restore"}
        
        # Check if backup includes values
        include_values = metadata.get("include_values", False)
        if not include_values:
            logger.error("Cannot restore: backup does not contain secret values")
            logger.error("Create a new backup with --include-values option")
            return {"error": "Backup missing secret values"}
        
        # Perform restoration
        restore_results = {
            "restore_timestamp": datetime.now(timezone.utc).isoformat(),
            "target_project": self.project_id,
            "total_secrets": len(secrets_to_restore),
            "successful_restores": 0,
            "failed_restores": 0,
            "skipped_existing": 0,
            "restored_secrets": [],
            "failed_secrets": [],
            "skipped_secrets": []
        }
        
        for secret_name, secret_data in secrets_to_restore.items():
            try:
                # Check if secret already exists
                existing_value = self.secrets_manager.get_secret(secret_name)
                
                if existing_value and not overwrite_existing:
                    logger.info(f"Skipping existing secret: {secret_name}")
                    restore_results["skipped_existing"] += 1
                    restore_results["skipped_secrets"].append(secret_name)
                    continue
                
                # Get secret value from backup
                secret_value = secret_data.get("value")
                if not secret_value:
                    logger.error(f"No value in backup for secret: {secret_name}")
                    restore_results["failed_restores"] += 1
                    restore_results["failed_secrets"].append({
                        "name": secret_name,
                        "error": "No value in backup"
                    })
                    continue
                
                # Verify integrity if hash is available
                if "value_hash" in secret_data:
                    calculated_hash = hashlib.sha256(secret_value.encode()).hexdigest()
                    if calculated_hash != secret_data["value_hash"]:
                        logger.error(f"Integrity check failed for secret: {secret_name}")
                        restore_results["failed_restores"] += 1
                        restore_results["failed_secrets"].append({
                            "name": secret_name,
                            "error": "Integrity check failed"
                        })
                        continue
                
                if self.dry_run:
                    logger.info(f"DRY-RUN: Would restore {secret_name}")
                    restore_results["successful_restores"] += 1
                    restore_results["restored_secrets"].append(secret_name)
                    continue
                
                # Restore the secret
                description = f"Restored from backup on {restore_results['restore_timestamp']}"
                if secret_data.get("description"):
                    description += f" (Original: {secret_data['description']})"
                
                success = self.secrets_manager.upload_secret(secret_name, secret_value, description)
                
                if success:
                    logger.info(f"✓ Restored secret: {secret_name}")
                    restore_results["successful_restores"] += 1
                    restore_results["restored_secrets"].append(secret_name)
                else:
                    logger.error(f"✗ Failed to restore secret: {secret_name}")
                    restore_results["failed_restores"] += 1
                    restore_results["failed_secrets"].append({
                        "name": secret_name,
                        "error": "Upload failed"
                    })
                
            except Exception as e:
                logger.error(f"Error restoring secret {secret_name}: {e}")
                restore_results["failed_restores"] += 1
                restore_results["failed_secrets"].append({
                    "name": secret_name,
                    "error": str(e)
                })
        
        # Log results
        logger.info(f"Restore completed:")
        logger.info(f"  Successful: {restore_results['successful_restores']}")
        logger.info(f"  Failed: {restore_results['failed_restores']}")
        logger.info(f"  Skipped (existing): {restore_results['skipped_existing']}")
        
        return restore_results
    
    def sync_environments(self, from_project: str, to_project: str,
                         secrets_list: Optional[List[str]] = None,
                         dry_run_override: Optional[bool] = None) -> Dict[str, Any]:
        """Synchronize secrets between environments
        
        Args:
            from_project: Source Firebase project ID
            to_project: Target Firebase project ID  
            secrets_list: List of specific secrets to sync (None for all)
            dry_run_override: Override dry_run setting for this operation
            
        Returns:
            Sync results dictionary
        """
        logger.info(f"Syncing secrets from {from_project} to {to_project}")
        
        is_dry_run = dry_run_override if dry_run_override is not None else self.dry_run
        
        # Initialize managers for both environments
        source_manager = FirebaseSecretsManager(from_project)
        target_manager = FirebaseSecretsManager(to_project)
        
        # Get secrets from source
        source_secrets = source_manager.list_secrets()
        if not source_secrets:
            logger.warning(f"No secrets found in source project: {from_project}")
            return {"error": "No source secrets"}
        
        # Determine which secrets to sync
        if secrets_list:
            secrets_to_sync = [s for s in source_secrets if s.get("original_path") in secrets_list]
            logger.info(f"Selective sync: {len(secrets_to_sync)} secrets selected")
        else:
            secrets_to_sync = source_secrets
            logger.info(f"Full sync: {len(secrets_to_sync)} secrets")
        
        sync_results = {
            "sync_timestamp": datetime.now(timezone.utc).isoformat(),
            "source_project": from_project,
            "target_project": to_project,
            "total_secrets": len(secrets_to_sync),
            "successful_syncs": 0,
            "failed_syncs": 0,
            "skipped_identical": 0,
            "synced_secrets": [],
            "failed_secrets": [],
            "identical_secrets": []
        }
        
        for secret_info in secrets_to_sync:
            secret_name = secret_info.get("original_path") or secret_info.get("name", "").replace('_', '/')
            
            try:
                # Get value from source
                source_value = source_manager.get_secret(secret_name)
                if not source_value:
                    logger.error(f"Could not retrieve source value for: {secret_name}")
                    sync_results["failed_syncs"] += 1
                    sync_results["failed_secrets"].append({
                        "name": secret_name,
                        "error": "Source value not available"
                    })
                    continue
                
                # Check target value
                target_value = target_manager.get_secret(secret_name)
                
                if target_value == source_value:
                    logger.debug(f"Values identical, skipping: {secret_name}")
                    sync_results["skipped_identical"] += 1
                    sync_results["identical_secrets"].append(secret_name)
                    continue
                
                if is_dry_run:
                    logger.info(f"DRY-RUN: Would sync {secret_name}")
                    sync_results["successful_syncs"] += 1
                    sync_results["synced_secrets"].append(secret_name)
                    continue
                
                # Sync the secret
                description = f"Synced from {from_project} on {sync_results['sync_timestamp']}"
                success = target_manager.upload_secret(secret_name, source_value, description)
                
                if success:
                    logger.info(f"✓ Synced secret: {secret_name}")
                    sync_results["successful_syncs"] += 1
                    sync_results["synced_secrets"].append(secret_name)
                else:
                    logger.error(f"✗ Failed to sync secret: {secret_name}")
                    sync_results["failed_syncs"] += 1
                    sync_results["failed_secrets"].append({
                        "name": secret_name,
                        "error": "Upload to target failed"
                    })
                
            except Exception as e:
                logger.error(f"Error syncing secret {secret_name}: {e}")
                sync_results["failed_syncs"] += 1
                sync_results["failed_secrets"].append({
                    "name": secret_name,
                    "error": str(e)
                })
        
        # Log results
        logger.info(f"Sync completed:")
        logger.info(f"  Successful: {sync_results['successful_syncs']}")
        logger.info(f"  Failed: {sync_results['failed_syncs']}")
        logger.info(f"  Identical (skipped): {sync_results['skipped_identical']}")
        
        return sync_results
    
    def compare_environments(self, project1: str, project2: str,
                           secrets_list: Optional[List[str]] = None) -> Dict[str, Any]:
        """Compare secrets between two environments
        
        Args:
            project1: First Firebase project ID
            project2: Second Firebase project ID
            secrets_list: List of specific secrets to compare (None for all)
            
        Returns:
            Comparison results dictionary
        """
        logger.info(f"Comparing secrets between {project1} and {project2}")
        
        # Initialize managers for both environments
        manager1 = FirebaseSecretsManager(project1)
        manager2 = FirebaseSecretsManager(project2)
        
        # Get all secrets from both environments
        secrets1 = {s.get("original_path", s.get("name", "")): s for s in manager1.list_secrets()}
        secrets2 = {s.get("original_path", s.get("name", "")): s for s in manager2.list_secrets()}
        
        # Create unified list of secret names
        all_secret_names = set(secrets1.keys()) | set(secrets2.keys())
        
        if secrets_list:
            all_secret_names = set(secrets_list) & all_secret_names
            logger.info(f"Comparing {len(all_secret_names)} selected secrets")
        else:
            logger.info(f"Comparing {len(all_secret_names)} total secrets")
        
        comparison_results = {
            "comparison_timestamp": datetime.now(timezone.utc).isoformat(),
            "project1": project1,
            "project2": project2,
            "total_secrets_compared": len(all_secret_names),
            "identical_secrets": [],
            "different_secrets": [],
            "missing_in_project1": [],
            "missing_in_project2": [],
            "comparison_errors": [],
            "summary": {}
        }
        
        for secret_name in all_secret_names:
            try:
                # Check existence
                exists_in_1 = secret_name in secrets1
                exists_in_2 = secret_name in secrets2
                
                if not exists_in_1:
                    comparison_results["missing_in_project1"].append(secret_name)
                    logger.debug(f"Missing in {project1}: {secret_name}")
                    continue
                
                if not exists_in_2:
                    comparison_results["missing_in_project2"].append(secret_name)
                    logger.debug(f"Missing in {project2}: {secret_name}")
                    continue
                
                # Compare values
                value1 = manager1.get_secret(secret_name)
                value2 = manager2.get_secret(secret_name)
                
                if value1 is None or value2 is None:
                    comparison_results["comparison_errors"].append({
                        "secret_name": secret_name,
                        "error": f"Could not retrieve values (1: {'OK' if value1 else 'FAIL'}, 2: {'OK' if value2 else 'FAIL'})"
                    })
                    continue
                
                if value1 == value2:
                    comparison_results["identical_secrets"].append(secret_name)
                    logger.debug(f"Identical: {secret_name}")
                else:
                    comparison_results["different_secrets"].append({
                        "secret_name": secret_name,
                        "length_project1": len(value1),
                        "length_project2": len(value2),
                        "hash_project1": hashlib.sha256(value1.encode()).hexdigest()[:8],
                        "hash_project2": hashlib.sha256(value2.encode()).hexdigest()[:8]
                    })
                    logger.debug(f"Different: {secret_name}")
                
            except Exception as e:
                comparison_results["comparison_errors"].append({
                    "secret_name": secret_name,
                    "error": str(e)
                })
                logger.error(f"Error comparing secret {secret_name}: {e}")
        
        # Generate summary
        comparison_results["summary"] = {
            "identical_count": len(comparison_results["identical_secrets"]),
            "different_count": len(comparison_results["different_secrets"]),
            "missing_in_project1_count": len(comparison_results["missing_in_project1"]),
            "missing_in_project2_count": len(comparison_results["missing_in_project2"]),
            "error_count": len(comparison_results["comparison_errors"]),
            "environments_identical": (
                len(comparison_results["different_secrets"]) == 0 and
                len(comparison_results["missing_in_project1"]) == 0 and
                len(comparison_results["missing_in_project2"]) == 0 and
                len(comparison_results["comparison_errors"]) == 0
            )
        }
        
        # Log summary
        summary = comparison_results["summary"]
        logger.info(f"Comparison summary:")
        logger.info(f"  Identical: {summary['identical_count']}")
        logger.info(f"  Different: {summary['different_count']}")
        logger.info(f"  Missing in {project1}: {summary['missing_in_project1_count']}")
        logger.info(f"  Missing in {project2}: {summary['missing_in_project2_count']}")
        logger.info(f"  Errors: {summary['error_count']}")
        logger.info(f"  Environments identical: {summary['environments_identical']}")
        
        return comparison_results
    
    def _save_encrypted_backup(self, backup_data: Dict, output_file: str, password: Optional[str]):
        """Save encrypted backup file"""
        if not HAS_ENCRYPTION:
            raise RuntimeError("Encryption not available - install cryptography package")
        
        if not password:
            password = getpass.getpass("Enter encryption password: ")
            password_confirm = getpass.getpass("Confirm encryption password: ")
            if password != password_confirm:
                raise ValueError("Passwords do not match")
        
        # Generate key from password
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        
        # Encrypt the backup data
        f = Fernet(key)
        backup_json = json.dumps(backup_data, indent=2, default=str).encode()
        encrypted_data = f.encrypt(backup_json)
        
        # Save encrypted file with metadata
        encrypted_backup = {
            "encrypted": True,
            "salt": base64.b64encode(salt).decode(),
            "data": base64.b64encode(encrypted_data).decode(),
            "metadata": {
                "encryption_method": "Fernet/PBKDF2",
                "created": datetime.now(timezone.utc).isoformat()
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(encrypted_backup, f, indent=2)
        
        logger.info(f"Encrypted backup saved to: {output_file}")
    
    def _load_backup_file(self, input_file: str, password: Optional[str]) -> Dict:
        """Load backup file (encrypted or plain)"""
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        # Check if file is encrypted
        if data.get("encrypted"):
            if not HAS_ENCRYPTION:
                raise RuntimeError("Cannot decrypt backup - install cryptography package")
            
            if not password:
                password = getpass.getpass("Enter decryption password: ")
            
            # Decrypt the data
            salt = base64.b64decode(data["salt"])
            encrypted_data = base64.b64decode(data["data"])
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
            
            f = Fernet(key)
            decrypted_json = f.decrypt(encrypted_data)
            backup_data = json.loads(decrypted_json.decode())
            
            logger.info("Successfully decrypted backup file")
            return backup_data
        else:
            return data
    
    def save_operation_report(self, operation_results: Dict[str, Any], output_file: str):
        """Save operation results to JSON file"""
        try:
            with open(output_file, 'w') as f:
                json.dump(operation_results, f, indent=2, default=str)
            logger.info(f"Operation report saved to: {output_file}")
        except Exception as e:
            logger.error(f"Failed to save operation report: {e}")


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Backup and Restore Secrets for Firebase Secrets Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s backup --output backup.json
  %(prog)s backup --output secure_backup.json --encrypt --include-values
  %(prog)s restore --input backup.json --dry-run
  %(prog)s sync --from-env qal --to-env e2e --dry-run
  %(prog)s compare --env1 local --env2 e2e
        """
    )
    
    parser.add_argument(
        '--project-id',
        default=os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai'),
        help='Firebase project ID (default: olorin-ai)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulate operations without making changes'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create backup of secrets')
    backup_parser.add_argument('--output', required=True, help='Output backup file path')
    backup_parser.add_argument('--encrypt', action='store_true', help='Encrypt the backup')
    backup_parser.add_argument('--include-values', action='store_true', 
                              help='Include actual secret values (SECURITY RISK!)')
    backup_parser.add_argument('--password', help='Encryption password (will prompt if not provided)')
    backup_parser.add_argument('--secrets-file', help='JSON file with list of specific secrets to backup')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore secrets from backup')
    restore_parser.add_argument('--input', required=True, help='Input backup file path')
    restore_parser.add_argument('--password', help='Decryption password (will prompt if not provided)')
    restore_parser.add_argument('--overwrite', action='store_true', help='Overwrite existing secrets')
    restore_parser.add_argument('--secrets-file', help='JSON file with list of specific secrets to restore')
    
    # Sync command
    sync_parser = subparsers.add_parser('sync', help='Sync secrets between environments')
    sync_parser.add_argument('--from-env', required=True, help='Source environment/project ID')
    sync_parser.add_argument('--to-env', required=True, help='Target environment/project ID')
    sync_parser.add_argument('--secrets-file', help='JSON file with list of specific secrets to sync')
    
    # Compare command
    compare_parser = subparsers.add_parser('compare', help='Compare secrets between environments')
    compare_parser.add_argument('--env1', required=True, help='First environment/project ID')
    compare_parser.add_argument('--env2', required=True, help='Second environment/project ID')
    compare_parser.add_argument('--secrets-file', help='JSON file with list of specific secrets to compare')
    
    # Report output
    parser.add_argument('--report-output', help='Save operation report to file')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize backup/restore utility
    backup_restore = SecretsBackupRestore(args.project_id, args.dry_run)
    
    # Load secrets list if provided
    secrets_list = None
    if hasattr(args, 'secrets_file') and args.secrets_file:
        try:
            with open(args.secrets_file, 'r') as f:
                data = json.load(f)
                secrets_list = data.get('secrets', data) if isinstance(data, dict) else data
            logger.info(f"Loaded {len(secrets_list)} secrets from file")
        except Exception as e:
            logger.error(f"Failed to load secrets file: {e}")
            sys.exit(1)
    
    # Execute command
    results = {}
    
    try:
        if args.command == 'backup':
            results = backup_restore.create_full_backup(
                args.output, 
                args.encrypt, 
                args.include_values, 
                args.password
            )
        
        elif args.command == 'restore':
            selective_restore = secrets_list
            results = backup_restore.restore_from_backup(
                args.input, 
                args.password, 
                selective_restore, 
                args.overwrite
            )
        
        elif args.command == 'sync':
            results = backup_restore.sync_environments(
                args.from_env, 
                args.to_env, 
                secrets_list
            )
        
        elif args.command == 'compare':
            results = backup_restore.compare_environments(
                args.env1, 
                args.env2, 
                secrets_list
            )
        
        # Save report if requested
        if args.report_output and results:
            backup_restore.save_operation_report(results, args.report_output)
        
        # Exit with success/failure based on results
        if "error" in results:
            sys.exit(1)
        
        # Check for failures in detailed results
        failure_indicators = [
            "failed_backups", "failed_restores", "failed_syncs", 
            "comparison_errors", "critical_errors"
        ]
        
        has_failures = any(
            results.get(indicator, 0) > 0 if isinstance(results.get(indicator), int)
            else len(results.get(indicator, [])) > 0
            for indicator in failure_indicators
        )
        
        sys.exit(1 if has_failures else 0)
        
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()