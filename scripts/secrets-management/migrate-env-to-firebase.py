#!/usr/bin/env python3
"""
Migrate Environment Variables to Firebase Secrets Manager
Migration utility for moving secrets from .env files and environment variables
to Firebase Secrets Manager for the Olorin AI project.

Usage:
    python migrate-env-to-firebase.py --env-file path/to/.env
    python migrate-env-to-firebase.py --from-environment
    python migrate-env-to-firebase.py --docker-compose path/to/docker-compose.yml
    python migrate-env-to-firebase.py --interactive
    python migrate-env-to-firebase.py --validate-migration

Examples:
    python migrate-env-to-firebase.py --env-file ../../olorin-server/.env
    python migrate-env-to-firebase.py --from-environment --dry-run
    python migrate-env-to-firebase.py --interactive
"""

import argparse
import json
import os
import sys
import logging
import re
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import yaml

# Add firebase-secrets-manager to path
sys.path.append(os.path.dirname(__file__))
from firebase_secrets_manager import FirebaseSecretsManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Secret migration mapping configuration
MIGRATION_MAPPING = {
    # Database secrets
    "DB_PASSWORD": "olorin/database_password",
    "POSTGRES_PASSWORD": "olorin/database_password",
    "REDIS_PASSWORD": "olorin/redis_password",
    
    # Application secrets
    "JWT_SECRET_KEY": "olorin/jwt_secret_key",
    "GAIA_API_KEY": "olorin/gaia_api_key",
    "OLORIN_API_KEY": "olorin/olorin_api_key",
    "DATABRICKS_TOKEN": "olorin/databricks_token",
    
    # AI/ML API keys (verify existing migration)
    "ANTHROPIC_API_KEY": "olorin/anthropic_api_key",
    "OPENAI_API_KEY": "olorin/openai_api_key",
    
    # Splunk credentials (verify existing migration)
    "SPLUNK_USERNAME": "olorin/splunk_username",
    "SPLUNK_PASSWORD": "olorin/splunk_password",
    "SPLUNK_TOKEN": "olorin/splunk_token",
    
    # SumoLogic credentials (verify existing migration)
    "SUMO_LOGIC_ACCESS_ID": "olorin/sumo_logic_access_id",
    "SUMO_LOGIC_ACCESS_KEY": "olorin/sumo_logic_access_key",
    
    # Snowflake credentials (verify existing migration)
    "SNOWFLAKE_ACCOUNT": "olorin/snowflake_account",
    "SNOWFLAKE_USER": "olorin/snowflake_user",
    "SNOWFLAKE_PASSWORD": "olorin/snowflake_password",
    "SNOWFLAKE_PRIVATE_KEY": "olorin/snowflake_private_key",
    
    # LangFuse credentials (verify existing migration)
    "LANGFUSE_PUBLIC_KEY": "olorin/langfuse/public_key",
    "LANGFUSE_SECRET_KEY": "olorin/langfuse/secret_key",
    
    # Test secrets
    "TEST_USER_PASSWORD": "olorin/test_user_pwd",
    "TEST_USER_PWD": "olorin/test_user_pwd",
    
    # Additional application secrets
    "APP_SECRET": "olorin/app_secret",
    "OLORIN_APP_SECRET": "olorin/app_secret",
}

# Secrets that should NOT be migrated (keep as environment variables)
EXCLUDED_SECRETS = {
    # Firebase Admin SDK bootstrap credentials
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY", 
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_CLIENT_ID",
    "FIREBASE_PRIVATE_KEY_ID",
    
    # GitHub Actions managed secrets
    "GITHUB_TOKEN",
    
    # Non-sensitive configuration
    "APP_ENV",
    "LOG_LEVEL",
    "NODE_ENV",
    "ENVIRONMENT",
    
    # Development configuration (not secrets)
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "REDIS_HOST",
    "REDIS_PORT",
    "BACKEND_PORT",
    "FRONTEND_PORT",
    "CORS_ORIGINS",
    "ALLOWED_ORIGINS",
    
    # Non-secret URLs and endpoints
    "DATABRICKS_WORKSPACE_URL",
    "SPLUNK_HOST",
    "SPLUNK_PORT",
    "SUMO_LOGIC_ENDPOINT",
}

# Patterns for detecting secrets in files
SECRET_PATTERNS = [
    r'(?i)password\s*[=:]\s*["\']([^"\']{8,})["\']',
    r'(?i)secret\s*[=:]\s*["\']([^"\']{16,})["\']',
    r'(?i)api[_-]?key\s*[=:]\s*["\']([^"\']{16,})["\']',
    r'(?i)private[_-]?key\s*[=:]\s*["\']([^"\']+)["\']',
    r'(?i)token\s*[=:]\s*["\']([^"\']{16,})["\']',
    r'sk-[A-Za-z0-9]{32,}',  # OpenAI API key pattern
    r'AIza[A-Za-z0-9_-]{35}',  # Google API key pattern
    r'AKIA[0-9A-Z]{16}',  # AWS Access Key pattern
]

class EnvironmentMigrator:
    """Utility class for migrating environment variables to Firebase Secrets"""
    
    def __init__(self, project_id: Optional[str] = None, dry_run: bool = False):
        """Initialize the migrator
        
        Args:
            project_id: Firebase project ID
            dry_run: If True, only simulate migration without making changes
        """
        self.project_id = project_id or os.getenv('FIREBASE_PROJECT_ID', 'olorin-ai')
        self.dry_run = dry_run
        self.secrets_manager = FirebaseSecretsManager(project_id)
        
        if dry_run:
            logger.info("Running in DRY-RUN mode - no changes will be made")
    
    def parse_env_file(self, env_file_path: str) -> Dict[str, str]:
        """Parse environment variables from a .env file
        
        Args:
            env_file_path: Path to .env file
            
        Returns:
            Dictionary of environment variable name -> value
        """
        env_vars = {}
        
        try:
            with open(env_file_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse KEY=VALUE format
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Remove quotes from value
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]
                        
                        # Handle multiline values (basic support)
                        if value.endswith('\\'):
                            value = value[:-1]
                        
                        env_vars[key] = value
                    else:
                        logger.warning(f"Skipping malformed line {line_num} in {env_file_path}: {line}")
            
            logger.info(f"Parsed {len(env_vars)} environment variables from {env_file_path}")
            return env_vars
            
        except FileNotFoundError:
            logger.error(f"Environment file not found: {env_file_path}")
            return {}
        except Exception as e:
            logger.error(f"Failed to parse environment file {env_file_path}: {e}")
            return {}
    
    def parse_docker_compose(self, docker_compose_path: str) -> Dict[str, str]:
        """Parse environment variables from docker-compose.yml
        
        Args:
            docker_compose_path: Path to docker-compose.yml
            
        Returns:
            Dictionary of environment variable name -> value
        """
        env_vars = {}
        
        try:
            with open(docker_compose_path, 'r') as f:
                compose_data = yaml.safe_load(f)
            
            # Extract environment variables from services
            services = compose_data.get('services', {})
            
            for service_name, service_config in services.items():
                environment = service_config.get('environment', {})
                
                if isinstance(environment, dict):
                    # Environment as dictionary
                    for key, value in environment.items():
                        if isinstance(value, str) and value:
                            env_vars[key] = value
                            logger.debug(f"Found env var from {service_name}: {key}")
                
                elif isinstance(environment, list):
                    # Environment as list of KEY=VALUE strings
                    for env_item in environment:
                        if '=' in env_item:
                            key, value = env_item.split('=', 1)
                            env_vars[key.strip()] = value.strip()
                            logger.debug(f"Found env var from {service_name}: {key}")
            
            logger.info(f"Parsed {len(env_vars)} environment variables from {docker_compose_path}")
            return env_vars
            
        except FileNotFoundError:
            logger.error(f"Docker compose file not found: {docker_compose_path}")
            return {}
        except Exception as e:
            logger.error(f"Failed to parse docker compose file {docker_compose_path}: {e}")
            return {}
    
    def get_current_environment(self) -> Dict[str, str]:
        """Get current environment variables
        
        Returns:
            Dictionary of environment variable name -> value
        """
        env_vars = {}
        
        for key, value in os.environ.items():
            # Only include variables that look like secrets
            if self._looks_like_secret(key, value):
                env_vars[key] = value
        
        logger.info(f"Found {len(env_vars)} potential secret environment variables")
        return env_vars
    
    def _looks_like_secret(self, key: str, value: str) -> bool:
        """Determine if an environment variable looks like a secret
        
        Args:
            key: Environment variable name
            value: Environment variable value
            
        Returns:
            True if it looks like a secret, False otherwise
        """
        # Check if key is in our migration mapping
        if key in MIGRATION_MAPPING:
            return True
        
        # Check if key contains secret-like words
        secret_keywords = ['password', 'secret', 'key', 'token', 'credential', 'auth']
        key_lower = key.lower()
        
        for keyword in secret_keywords:
            if keyword in key_lower:
                # But exclude non-secret configuration
                if key not in EXCLUDED_SECRETS:
                    return True
        
        # Check if value matches secret patterns
        for pattern in SECRET_PATTERNS:
            if re.search(pattern, value):
                return True
        
        return False
    
    def identify_secrets_to_migrate(self, env_vars: Dict[str, str]) -> Tuple[Dict[str, Tuple[str, str]], List[str], List[str]]:
        """Identify which secrets should be migrated
        
        Args:
            env_vars: Dictionary of environment variables
            
        Returns:
            Tuple of (secrets_to_migrate, already_migrated, excluded)
            - secrets_to_migrate: Dict of {env_var: (firebase_path, value)}
            - already_migrated: List of env vars already in Firebase
            - excluded: List of env vars that should not be migrated
        """
        secrets_to_migrate = {}
        already_migrated = []
        excluded = []
        
        for env_var, value in env_vars.items():
            if env_var in EXCLUDED_SECRETS:
                excluded.append(env_var)
                continue
            
            if env_var in MIGRATION_MAPPING:
                firebase_path = MIGRATION_MAPPING[env_var]
                
                # Check if already exists in Firebase
                existing_value = self.secrets_manager.get_secret(firebase_path)
                if existing_value:
                    already_migrated.append(env_var)
                    logger.info(f"Secret {firebase_path} already exists in Firebase")
                else:
                    secrets_to_migrate[env_var] = (firebase_path, value)
            
            elif self._looks_like_secret(env_var, value):
                # Generate Firebase path for unmapped secret
                firebase_path = f"olorin/{env_var.lower()}"
                secrets_to_migrate[env_var] = (firebase_path, value)
        
        logger.info(f"Identified {len(secrets_to_migrate)} secrets to migrate")
        logger.info(f"Found {len(already_migrated)} secrets already migrated")
        logger.info(f"Excluding {len(excluded)} non-secret variables")
        
        return secrets_to_migrate, already_migrated, excluded
    
    def migrate_secrets(self, secrets_to_migrate: Dict[str, Tuple[str, str]]) -> Tuple[List[str], List[str]]:
        """Migrate secrets to Firebase Secrets Manager
        
        Args:
            secrets_to_migrate: Dict of {env_var: (firebase_path, value)}
            
        Returns:
            Tuple of (successful_migrations, failed_migrations)
        """
        successful_migrations = []
        failed_migrations = []
        
        for env_var, (firebase_path, value) in secrets_to_migrate.items():
            logger.info(f"Migrating {env_var} -> {firebase_path}")
            
            if self.dry_run:
                logger.info(f"DRY-RUN: Would migrate {env_var} to {firebase_path}")
                successful_migrations.append(env_var)
                continue
            
            # Create description for the secret
            description = f"Migrated from environment variable {env_var}"
            
            # Upload to Firebase
            success = self.secrets_manager.upload_secret(firebase_path, value, description)
            
            if success:
                successful_migrations.append(env_var)
                logger.info(f"✓ Successfully migrated {env_var}")
            else:
                failed_migrations.append(env_var)
                logger.error(f"✗ Failed to migrate {env_var}")
        
        return successful_migrations, failed_migrations
    
    def validate_migration(self, successful_migrations: List[str]) -> bool:
        """Validate that migrated secrets are accessible from Firebase
        
        Args:
            successful_migrations: List of successfully migrated environment variables
            
        Returns:
            True if all validations pass, False otherwise
        """
        if self.dry_run:
            logger.info("DRY-RUN: Skipping migration validation")
            return True
        
        logger.info(f"Validating {len(successful_migrations)} migrated secrets...")
        
        all_valid = True
        
        for env_var in successful_migrations:
            if env_var in MIGRATION_MAPPING:
                firebase_path = MIGRATION_MAPPING[env_var]
            else:
                firebase_path = f"olorin/{env_var.lower()}"
            
            if self.secrets_manager.validate_secret(firebase_path):
                logger.info(f"✓ Validation passed: {firebase_path}")
            else:
                logger.error(f"✗ Validation failed: {firebase_path}")
                all_valid = False
        
        return all_valid
    
    def generate_migration_report(self, secrets_to_migrate: Dict[str, Tuple[str, str]], 
                                 already_migrated: List[str], excluded: List[str],
                                 successful_migrations: List[str], failed_migrations: List[str]) -> Dict:
        """Generate a comprehensive migration report
        
        Returns:
            Dictionary containing migration report data
        """
        report = {
            "migration_timestamp": None,
            "project_id": self.project_id,
            "dry_run": self.dry_run,
            "summary": {
                "total_secrets_found": len(secrets_to_migrate) + len(already_migrated),
                "secrets_to_migrate": len(secrets_to_migrate),
                "already_migrated": len(already_migrated),
                "excluded_variables": len(excluded),
                "successful_migrations": len(successful_migrations),
                "failed_migrations": len(failed_migrations),
            },
            "details": {
                "secrets_to_migrate": {
                    env_var: {"firebase_path": path, "status": "planned"}
                    for env_var, (path, _) in secrets_to_migrate.items()
                },
                "already_migrated": already_migrated,
                "excluded_variables": excluded,
                "successful_migrations": [
                    {"env_var": env_var, "firebase_path": MIGRATION_MAPPING.get(env_var, f"olorin/{env_var.lower()}")}
                    for env_var in successful_migrations
                ],
                "failed_migrations": failed_migrations,
            }
        }
        
        return report
    
    def save_migration_report(self, report: Dict, output_file: str):
        """Save migration report to JSON file
        
        Args:
            report: Migration report dictionary
            output_file: Path to output file
        """
        try:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"Migration report saved to: {output_file}")
        except Exception as e:
            logger.error(f"Failed to save migration report: {e}")
    
    def interactive_migration(self):
        """Interactive migration process with user confirmation"""
        logger.info("Starting interactive migration process...")
        
        # Get environment variables from multiple sources
        env_vars = {}
        
        # Check for common .env files
        env_files = [
            "../../olorin-server/.env",
            "../../.env",
            ".env",
            "../../olorin-front/.env",
        ]
        
        for env_file in env_files:
            if os.path.exists(env_file):
                logger.info(f"Found environment file: {env_file}")
                response = input(f"Load secrets from {env_file}? (y/n): ")
                if response.lower() == 'y':
                    file_vars = self.parse_env_file(env_file)
                    env_vars.update(file_vars)
        
        # Check docker-compose files
        docker_files = [
            "../../docker-compose.yml",
            "docker-compose.yml"
        ]
        
        for docker_file in docker_files:
            if os.path.exists(docker_file):
                logger.info(f"Found docker-compose file: {docker_file}")
                response = input(f"Load secrets from {docker_file}? (y/n): ")
                if response.lower() == 'y':
                    docker_vars = self.parse_docker_compose(docker_file)
                    env_vars.update(docker_vars)
        
        # Check current environment
        response = input("Load secrets from current environment variables? (y/n): ")
        if response.lower() == 'y':
            current_env = self.get_current_environment()
            env_vars.update(current_env)
        
        if not env_vars:
            logger.warning("No environment variables found to migrate")
            return
        
        # Identify secrets to migrate
        secrets_to_migrate, already_migrated, excluded = self.identify_secrets_to_migrate(env_vars)
        
        # Show summary
        print(f"\nMigration Summary:")
        print(f"  Secrets to migrate: {len(secrets_to_migrate)}")
        print(f"  Already migrated: {len(already_migrated)}")
        print(f"  Excluded variables: {len(excluded)}")
        
        if secrets_to_migrate:
            print(f"\nSecrets to be migrated:")
            for env_var, (firebase_path, _) in secrets_to_migrate.items():
                print(f"  {env_var} -> {firebase_path}")
        
        if not secrets_to_migrate:
            logger.info("No secrets need to be migrated")
            return
        
        # Confirm migration
        response = input(f"\nProceed with migration of {len(secrets_to_migrate)} secrets? (y/n): ")
        if response.lower() != 'y':
            logger.info("Migration cancelled by user")
            return
        
        # Perform migration
        successful_migrations, failed_migrations = self.migrate_secrets(secrets_to_migrate)
        
        # Validate migration
        validation_success = self.validate_migration(successful_migrations)
        
        # Generate and save report
        report = self.generate_migration_report(
            secrets_to_migrate, already_migrated, excluded,
            successful_migrations, failed_migrations
        )
        
        report_file = f"migration_report_{self.project_id}_{int(os.time())}.json"
        self.save_migration_report(report, report_file)
        
        # Final summary
        print(f"\nMigration Complete!")
        print(f"  Successful: {len(successful_migrations)}")
        print(f"  Failed: {len(failed_migrations)}")
        print(f"  Validation: {'✓ PASSED' if validation_success else '✗ FAILED'}")
        print(f"  Report: {report_file}")


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Migrate Environment Variables to Firebase Secrets Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --env-file ../../olorin-server/.env
  %(prog)s --from-environment --dry-run
  %(prog)s --docker-compose ../../docker-compose.yml
  %(prog)s --interactive
  %(prog)s --validate-migration
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
        help='Simulate migration without making changes'
    )
    
    # Source selection
    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        '--env-file',
        help='Path to .env file to migrate'
    )
    source_group.add_argument(
        '--from-environment',
        action='store_true',
        help='Migrate from current environment variables'
    )
    source_group.add_argument(
        '--docker-compose',
        help='Path to docker-compose.yml file to migrate'
    )
    source_group.add_argument(
        '--interactive',
        action='store_true',
        help='Interactive migration process'
    )
    source_group.add_argument(
        '--validate-migration',
        action='store_true',
        help='Validate existing migration'
    )
    
    parser.add_argument(
        '--output-report',
        help='Output file for migration report'
    )
    
    args = parser.parse_args()
    
    # Initialize migrator
    migrator = EnvironmentMigrator(args.project_id, args.dry_run)
    
    if args.interactive:
        migrator.interactive_migration()
        return
    
    if args.validate_migration:
        # Validate all required secrets
        all_valid, valid_secrets, invalid_secrets = migrator.secrets_manager.validate_all_secrets()
        
        print(f"Migration Validation Results:")
        print(f"  Valid secrets: {len(valid_secrets)}")
        print(f"  Invalid secrets: {len(invalid_secrets)}")
        
        if invalid_secrets:
            print(f"\nInvalid secrets that need migration:")
            for secret in invalid_secrets:
                print(f"  ✗ {secret}")
        
        sys.exit(0 if all_valid else 1)
    
    # Get environment variables from specified source
    env_vars = {}
    
    if args.env_file:
        env_vars = migrator.parse_env_file(args.env_file)
    elif args.from_environment:
        env_vars = migrator.get_current_environment()
    elif args.docker_compose:
        env_vars = migrator.parse_docker_compose(args.docker_compose)
    else:
        parser.print_help()
        return
    
    if not env_vars:
        logger.warning("No environment variables found to migrate")
        return
    
    # Identify secrets to migrate
    secrets_to_migrate, already_migrated, excluded = migrator.identify_secrets_to_migrate(env_vars)
    
    if not secrets_to_migrate:
        logger.info("No secrets need to be migrated")
        return
    
    # Perform migration
    successful_migrations, failed_migrations = migrator.migrate_secrets(secrets_to_migrate)
    
    # Validate migration
    validation_success = migrator.validate_migration(successful_migrations)
    
    # Generate report
    report = migrator.generate_migration_report(
        secrets_to_migrate, already_migrated, excluded,
        successful_migrations, failed_migrations
    )
    
    # Save report
    if args.output_report:
        migrator.save_migration_report(report, args.output_report)
    
    # Print summary
    print(f"\nMigration Summary:")
    print(f"  Successful migrations: {len(successful_migrations)}")
    print(f"  Failed migrations: {len(failed_migrations)}")
    print(f"  Validation: {'✓ PASSED' if validation_success else '✗ FAILED'}")
    
    # Exit with error code if any migrations failed or validation failed
    sys.exit(0 if len(failed_migrations) == 0 and validation_success else 1)


if __name__ == "__main__":
    main()