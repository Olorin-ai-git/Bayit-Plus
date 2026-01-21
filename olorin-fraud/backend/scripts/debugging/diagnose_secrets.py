from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Diagnose which secrets are missing from Firebase Secret Manager.
"""

import os
import sys
from pathlib import Path

# Set up Python path
sys.path.insert(0, str(Path(__file__).parent))


def check_secrets():
    """Check which secrets are being requested and which are missing."""

    logger.info("=" * 70)
    logger.info("FIREBASE SECRET MANAGER DIAGNOSTIC")
    logger.info("=" * 70)
    logger.info()

    # Import the secret manager
    try:
        from app.service.secret_manager import SecretManagerClient

        client = SecretManagerClient(project_id="olorin-ai")
        logger.info("✅ Secret Manager client initialized")
        logger.info()
    except Exception as e:
        logger.error(f"❌ Failed to initialize Secret Manager: {e}")
        return

    # List of all secrets the application typically uses
    secrets_to_check = [
        # Authentication & Security
        "JWT_SECRET_KEY",
        "APP_SECRET",
        # API Keys
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "OLORIN_API_KEY",
        # Database
        "DATABASE_PASSWORD",
        # Redis
        "REDIS_API_KEY",
        # Splunk
        "SPLUNK_USERNAME",
        "SPLUNK_PASSWORD",
        # Snowflake
        "SNOWFLAKE_ACCOUNT",
        "SNOWFLAKE_USER",
        "SNOWFLAKE_PASSWORD",
        "SNOWFLAKE_PRIVATE_KEY",
        "SNOWFLAKE_DATABASE",
        "SNOWFLAKE_SCHEMA",
        "SNOWFLAKE_WAREHOUSE",
        "SNOWFLAKE_ROLE",
        # Databricks
        "DATABRICKS_TOKEN",
        # SumoLogic
        "SUMO_LOGIC_ACCESS_ID",
        "SUMO_LOGIC_ACCESS_KEY",
        # Langfuse
        "LANGFUSE_PUBLIC_KEY",
        "LANGFUSE_SECRET_KEY",
        # Firebase
        "FIREBASE_PRIVATE_KEY",
        "FIREBASE_CLIENT_EMAIL",
    ]

    logger.info("🔍 Checking secrets in Firebase Secret Manager:")
    logger.info("-" * 50)

    found = []
    missing = []
    env_only = []

    for secret_name in secrets_to_check:
        # Check if it exists as environment variable
        env_value = os.getenv(secret_name)

        # Try to get from Secret Manager
        try:
            value = client.get_secret(secret_name)

            if value:
                found.append(secret_name)
                status = "✅ FOUND in Secret Manager"
            elif env_value:
                env_only.append(secret_name)
                status = "🟡 ENV VARIABLE only"
            else:
                missing.append(secret_name)
                status = "❌ NOT FOUND"

            logger.info(f"  {secret_name:30} {status}")

        except Exception as e:
            missing.append(secret_name)
            logger.error(f"  {secret_name:30} ❌ ERROR: {str(e)[:30]}")

    logger.info()
    logger.info("=" * 70)
    logger.info("SUMMARY")
    logger.info("=" * 70)
    logger.info()

    logger.info(f"✅ Found in Secret Manager: {len(found)} secrets")
    if found:
        for secret in found[:5]:  # Show first 5
            logger.info(f"   • {secret}")
        if len(found) > 5:
            logger.info(f"   ... and {len(found) - 5} more")

    logger.info()
    logger.info(f"🟡 Environment Variables Only: {len(env_only)} secrets")
    if env_only:
        for secret in env_only[:5]:
            logger.info(f"   • {secret}")
        if len(env_only) > 5:
            logger.info(f"   ... and {len(env_only) - 5} more")

    logger.info()
    logger.info(f"❌ Missing Completely: {len(missing)} secrets")
    logger.info("   (These are causing the 'Secret not found' warnings)")
    if missing:
        for secret in missing:
            logger.info(f"   • {secret}")

    logger.info()
    logger.info("=" * 70)
    logger.info("SOLUTIONS")
    logger.info("=" * 70)
    logger.info()

    if missing:
        logger.warning("To fix the warnings, you can either:")
        logger.info()
        logger.info("1. **Set as environment variables** (for local development):")
        logger.info("   ```bash")
        for secret in missing[:3]:  # Show first 3 as examples
            if secret == "JWT_SECRET_KEY":
                logger.info(f'   export {secret}="$(openssl rand -base64 64)"')
            else:
                logger.info(f'   export {secret}="your-value-here"')
        logger.info("   ```")
        logger.info()
        logger.info("2. **Add to Firebase Secret Manager** (for production):")
        logger.info("   ```bash")
        logger.info("   # Use Firebase/GCP Console or CLI to add secrets")
        logger.info("   gcloud secrets create SECRET_NAME --data-file=-")
        logger.info("   ```")
        logger.info()
        logger.info("3. **Create a .env file** (for local development):")
        logger.info(
            "   Create /Users/gklainert/Documents/olorin/olorin-server/.env with:"
        )
        for secret in missing[:5]:
            if secret == "JWT_SECRET_KEY":
                logger.info(f"   {secret}=<generate with: openssl rand -base64 64>")
            else:
                logger.info(f"   {secret}=your-value-here")
        if len(missing) > 5:
            logger.info(f"   # ... and {len(missing) - 5} more")

    logger.info()
    logger.info(
        "💡 Note: Not all secrets are required. Only set the ones for services you use."
    )
    logger.info("   Critical ones: JWT_SECRET_KEY, OLORIN_API_KEY")
    logger.info(
        "   Optional: Snowflake, Databricks, Langfuse (only if using these services)"
    )
    logger.info()


if __name__ == "__main__":
    check_secrets()
