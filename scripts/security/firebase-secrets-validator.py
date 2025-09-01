#!/usr/bin/env python3
"""
Firebase Secret Manager Validation Script for Olorin Production Environment.

This script validates that all required production secrets exist in Firebase Secret Manager
and provides comprehensive reporting for deployment readiness.

Author: Gil Klainert
Date: 2025-08-31
"""

import os
import sys
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the app directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../olorin-server'))

try:
    from google.cloud import secretmanager
    from google.api_core import exceptions as google_exceptions
    GCP_AVAILABLE = True
except ImportError:
    print("WARNING: Google Cloud libraries not available. Install with: pip install google-cloud-secret-manager")
    GCP_AVAILABLE = False

import structlog

# Configure structured logging
logging_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.dev.ConsoleRenderer(colors=True),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
}

import logging.config
logging.config.dictConfig(logging_config)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class SecretStatus(Enum):
    """Status of a secret validation."""
    EXISTS = "exists"
    MISSING = "missing" 
    ERROR = "error"
    ENV_FALLBACK = "env_fallback"


@dataclass
class SecretSpec:
    """Specification for a required secret."""
    name: str
    path: str
    env_var: str
    description: str
    required_for_production: bool = True
    sensitive: bool = True


@dataclass 
class SecretValidationResult:
    """Result of secret validation."""
    spec: SecretSpec
    status: SecretStatus
    value_length: Optional[int] = None
    error_message: Optional[str] = None
    source: Optional[str] = None


class FirebaseSecretsValidator:
    """Validates Firebase Secret Manager configuration for Olorin deployment."""
    
    # Production secret specifications - using Firebase-compatible names
    REQUIRED_SECRETS = [
        # Core API Keys
        SecretSpec(
            name="Anthropic API Key",
            path="ANTHROPIC_API_KEY", 
            env_var="ANTHROPIC_API_KEY",
            description="Anthropic Claude API key for LLM operations"
        ),
        SecretSpec(
            name="OpenAI API Key",
            path="OPENAI_API_KEY",
            env_var="OPENAI_API_KEY", 
            description="OpenAI API key for GPT models"
        ),
        SecretSpec(
            name="Olorin API Key", 
            path="OLORIN_API_KEY",
            env_var="OLORIN_API_KEY",
            description="Internal Olorin API authentication key"
        ),
        SecretSpec(
            name="Databricks Token",
            path="DATABRICKS_TOKEN",
            env_var="DATABRICKS_TOKEN",
            description="Databricks API access token",
            required_for_production=False
        ),
        
        # Database & Infrastructure
        SecretSpec(
            name="Database Password",
            path="DATABASE_PASSWORD",
            env_var="DB_PASSWORD", 
            description="Production database password"
        ),
        SecretSpec(
            name="Redis Password",
            path="REDIS_PASSWORD",
            env_var="REDIS_PASSWORD",
            description="Redis cache authentication password"
        ),
        SecretSpec(
            name="JWT Secret Key",
            path="JWT_SECRET_KEY", 
            env_var="JWT_SECRET_KEY",
            description="JWT token signing secret key"
        ),
        
        # External Services
        SecretSpec(
            name="Splunk Username",
            path="SPLUNK_USERNAME",
            env_var="SPLUNK_USERNAME",
            description="Splunk service username for log analysis"
        ),
        SecretSpec(
            name="Splunk Password", 
            path="SPLUNK_PASSWORD",
            env_var="SPLUNK_PASSWORD",
            description="Splunk service password for log analysis"
        ),
        SecretSpec(
            name="SumoLogic Access ID",
            path="SUMO_LOGIC_ACCESS_ID",
            env_var="SUMO_LOGIC_ACCESS_ID", 
            description="SumoLogic service access identifier",
            required_for_production=False
        ),
        SecretSpec(
            name="SumoLogic Access Key",
            path="SUMO_LOGIC_ACCESS_KEY",
            env_var="SUMO_LOGIC_ACCESS_KEY",
            description="SumoLogic service access key",
            required_for_production=False
        ),
        SecretSpec(
            name="Snowflake Account",
            path="SNOWFLAKE_ACCOUNT", 
            env_var="SNOWFLAKE_ACCOUNT",
            description="Snowflake data warehouse account identifier",
            required_for_production=False
        ),
        SecretSpec(
            name="Snowflake User",
            path="SNOWFLAKE_USER",
            env_var="SNOWFLAKE_USER",
            description="Snowflake service user account", 
            required_for_production=False
        ),
        SecretSpec(
            name="Snowflake Password",
            path="SNOWFLAKE_PASSWORD",
            env_var="SNOWFLAKE_PASSWORD", 
            description="Snowflake service user password",
            required_for_production=False
        ),
        SecretSpec(
            name="Snowflake Private Key",
            path="SNOWFLAKE_PRIVATE_KEY",
            env_var="SNOWFLAKE_PRIVATE_KEY",
            description="Snowflake service private key for authentication",
            required_for_production=False
        ),
        
        # Application Security
        SecretSpec(
            name="App Secret",
            path="APP_SECRET",
            env_var="APP_SECRET", 
            description="Application-wide secret for internal operations"
        ),
        
        # Additional API Keys for Security Tools  
        SecretSpec(
            name="AbuseIPDB API Key",
            path="ABUSEIPDB_API_KEY",
            env_var="ABUSEIPDB_API_KEY",
            description="AbuseIPDB API key for IP reputation checks",
            required_for_production=False
        ),
    ]
    
    def __init__(self, project_id: str = "olorin-ai"):
        """Initialize the secrets validator."""
        self.project_id = project_id
        self._client = None
        self.validation_results: List[SecretValidationResult] = []
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Secret Manager client."""
        if not GCP_AVAILABLE:
            logger.warning("Google Cloud SDK not available - validation limited to environment variables")
            return
            
        try:
            self._client = secretmanager.SecretManagerServiceClient()
            logger.info("Secret Manager client initialized", project_id=self.project_id)
        except Exception as e:
            logger.error("Failed to initialize Secret Manager client", error=str(e))
    
    def validate_secret(self, spec: SecretSpec) -> SecretValidationResult:
        """Validate a single secret."""
        logger.debug("Validating secret", secret_name=spec.name, path=spec.path)
        
        # Check environment variable first
        env_value = os.getenv(spec.env_var)
        if env_value:
            return SecretValidationResult(
                spec=spec,
                status=SecretStatus.ENV_FALLBACK,
                value_length=len(env_value) if env_value else 0,
                source="environment"
            )
        
        # If no GCP client, can only check env vars
        if not self._client:
            return SecretValidationResult(
                spec=spec,
                status=SecretStatus.MISSING,
                error_message="No GCP client available and no environment fallback"
            )
        
        # Check Secret Manager
        try:
            name = f"projects/{self.project_id}/secrets/{spec.path}/versions/latest"
            response = self._client.access_secret_version(request={"name": name})
            secret_value = response.payload.data.decode("UTF-8")
            
            return SecretValidationResult(
                spec=spec,
                status=SecretStatus.EXISTS,
                value_length=len(secret_value),
                source="secret_manager"
            )
            
        except google_exceptions.NotFound:
            return SecretValidationResult(
                spec=spec,
                status=SecretStatus.MISSING,
                error_message="Secret not found in Secret Manager"
            )
        except google_exceptions.PermissionDenied:
            return SecretValidationResult(
                spec=spec, 
                status=SecretStatus.ERROR,
                error_message="Permission denied accessing secret"
            )
        except Exception as e:
            return SecretValidationResult(
                spec=spec,
                status=SecretStatus.ERROR,
                error_message=f"Error accessing secret: {str(e)}"
            )
    
    def validate_all_secrets(self) -> List[SecretValidationResult]:
        """Validate all required secrets."""
        logger.info("Starting comprehensive secret validation", 
                   total_secrets=len(self.REQUIRED_SECRETS))
        
        self.validation_results = []
        for spec in self.REQUIRED_SECRETS:
            result = self.validate_secret(spec)
            self.validation_results.append(result)
            
            # Log individual results
            if result.status == SecretStatus.EXISTS:
                logger.info("Secret validated successfully", 
                           name=spec.name, 
                           source=result.source,
                           value_length=result.value_length)
            elif result.status == SecretStatus.ENV_FALLBACK:
                logger.warning("Using environment fallback for secret",
                             name=spec.name,
                             value_length=result.value_length)
            else:
                logger.error("Secret validation failed",
                           name=spec.name, 
                           status=result.status.value,
                           error=result.error_message)
        
        return self.validation_results
    
    def generate_report(self) -> dict:
        """Generate comprehensive validation report."""
        if not self.validation_results:
            self.validate_all_secrets()
        
        # Count results by status
        status_counts = {}
        for status in SecretStatus:
            status_counts[status.value] = sum(
                1 for r in self.validation_results if r.status == status
            )
        
        # Identify critical missing secrets
        critical_missing = [
            r for r in self.validation_results 
            if r.status == SecretStatus.MISSING and r.spec.required_for_production
        ]
        
        # Identify secrets using environment fallback
        env_fallbacks = [
            r for r in self.validation_results
            if r.status == SecretStatus.ENV_FALLBACK
        ]
        
        # Calculate deployment readiness
        production_ready = len(critical_missing) == 0
        total_secrets = len(self.REQUIRED_SECRETS)
        successful_secrets = sum(
            1 for r in self.validation_results 
            if r.status in [SecretStatus.EXISTS, SecretStatus.ENV_FALLBACK]
        )
        
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "project_id": self.project_id,
            "environment": "production",
            "validation_summary": {
                "total_secrets": total_secrets,
                "successful_validations": successful_secrets, 
                "success_rate": f"{(successful_secrets / total_secrets) * 100:.1f}%",
                "production_ready": production_ready
            },
            "status_breakdown": status_counts,
            "critical_issues": {
                "missing_required_secrets": len(critical_missing),
                "environment_fallbacks": len(env_fallbacks),
                "permission_errors": sum(
                    1 for r in self.validation_results 
                    if r.status == SecretStatus.ERROR and "Permission denied" in (r.error_message or "")
                )
            },
            "detailed_results": [
                {
                    "name": r.spec.name,
                    "path": r.spec.path,
                    "env_var": r.spec.env_var,
                    "status": r.status.value,
                    "required": r.spec.required_for_production,
                    "source": r.source,
                    "has_value": r.value_length is not None and r.value_length > 0,
                    "error": r.error_message
                }
                for r in self.validation_results
            ]
        }
        
        return report
    
    def print_summary(self):
        """Print a human-readable summary of validation results."""
        report = self.generate_report()
        
        print("\n" + "="*70)
        print("🔐 FIREBASE SECRETS VALIDATION REPORT")
        print("="*70)
        print(f"Project: {report['project_id']}")
        print(f"Environment: {report['environment'].upper()}")
        print(f"Timestamp: {report['timestamp']}")
        print()
        
        # Summary section
        summary = report['validation_summary']
        print("📊 VALIDATION SUMMARY")
        print("-" * 30)
        print(f"Total Secrets: {summary['total_secrets']}")
        print(f"Successful: {summary['successful_validations']}")
        print(f"Success Rate: {summary['success_rate']}")
        
        if summary['production_ready']:
            print("✅ Production Ready: YES")
        else:
            print("❌ Production Ready: NO")
        print()
        
        # Status breakdown
        print("🔍 STATUS BREAKDOWN")
        print("-" * 30)
        for status, count in report['status_breakdown'].items():
            icon = {
                'exists': '✅',
                'env_fallback': '⚠️ ',
                'missing': '❌',
                'error': '🚫'
            }.get(status, '❓')
            print(f"{icon} {status.replace('_', ' ').title()}: {count}")
        print()
        
        # Critical issues
        issues = report['critical_issues']
        if any(issues.values()):
            print("🚨 CRITICAL ISSUES")
            print("-" * 30)
            if issues['missing_required_secrets']:
                print(f"❌ Missing Required Secrets: {issues['missing_required_secrets']}")
            if issues['environment_fallbacks']:
                print(f"⚠️  Environment Fallbacks: {issues['environment_fallbacks']}")
            if issues['permission_errors']:
                print(f"🚫 Permission Errors: {issues['permission_errors']}")
            print()
        
        # Detailed results for failed validations
        failed_results = [r for r in report['detailed_results'] 
                         if r['status'] not in ['exists', 'env_fallback']]
        
        if failed_results:
            print("💥 FAILED VALIDATIONS")
            print("-" * 30)
            for result in failed_results:
                required_marker = "🔴 REQUIRED" if result['required'] else "🟡 OPTIONAL"
                print(f"{required_marker} {result['name']}")
                print(f"   Path: {result['path']}")
                print(f"   Env Var: {result['env_var']}")
                print(f"   Status: {result['status']}")
                if result['error']:
                    print(f"   Error: {result['error']}")
                print()
        
        # Environment fallbacks
        env_results = [r for r in report['detailed_results'] 
                      if r['status'] == 'env_fallback']
        
        if env_results:
            print("⚠️  ENVIRONMENT FALLBACKS")
            print("-" * 30)
            for result in env_results:
                print(f"• {result['name']} → {result['env_var']}")
            print()
            print("NOTE: Environment fallbacks work for local development but")
            print("production deployments should use Firebase Secret Manager.")
            print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS")
        print("-" * 30)
        if issues['missing_required_secrets']:
            print("1. Create missing required secrets in Firebase Secret Manager")
            print("   Use: gcloud secrets create <secret-name> --data-file=<file>")
        if issues['environment_fallbacks']:
            print("2. Migrate environment variables to Secret Manager for production")
        if issues['permission_errors']:
            print("3. Verify IAM permissions for Secret Manager access")
        if summary['production_ready']:
            print("✅ All critical secrets validated - deployment can proceed!")
        print()


def create_missing_secrets_helper():
    """Generate helper commands for creating missing secrets."""
    validator = FirebaseSecretsValidator()
    results = validator.validate_all_secrets()
    
    missing_secrets = [r for r in results 
                      if r.status == SecretStatus.MISSING and r.spec.required_for_production]
    
    if not missing_secrets:
        print("✅ All required secrets exist!")
        return
    
    print("\n🛠️  MISSING SECRETS CREATION COMMANDS")
    print("=" * 50)
    print("Copy and run these commands to create missing secrets:")
    print()
    
    for result in missing_secrets:
        secret_path = result.spec.path
        print(f"# {result.spec.description}")
        print(f"echo 'YOUR_SECRET_VALUE' | gcloud secrets create {secret_path} --data-file=-")
        print()
    
    print("NOTE: Replace 'YOUR_SECRET_VALUE' with actual secret values.")
    print("For security, consider using --data-file with actual files instead of echo.")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate Firebase secrets for Olorin deployment")
    parser.add_argument("--project", default="olorin-ai", help="Firebase project ID")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--create-commands", action="store_true", 
                       help="Generate commands to create missing secrets")
    
    args = parser.parse_args()
    
    if args.create_commands:
        create_missing_secrets_helper()
        sys.exit(0)
    
    # Run validation
    validator = FirebaseSecretsValidator(project_id=args.project)
    
    if args.json:
        report = validator.generate_report()
        print(json.dumps(report, indent=2))
    else:
        validator.print_summary()
    
    # Exit with non-zero code if not production ready
    if not validator.generate_report()['validation_summary']['production_ready']:
        sys.exit(1)