"""
Configuration secrets integration module.

This module provides methods to enhance existing configuration classes
with secrets loaded from Firebase Secret Manager.
"""

import os
import structlog
from .config_loader import get_config_loader

logger = structlog.get_logger(__name__)


def enhance_config_with_secrets(config_instance):
    """
    Enhance a configuration instance with secrets from Firebase Secret Manager.
    
    This function modifies the configuration instance in-place, loading
    secrets from Firebase Secret Manager and overriding values where appropriate.
    
    Args:
        config_instance: An instance of SvcSettings or its subclasses
        
    Returns:
        The enhanced configuration instance
    """
    loader = get_config_loader()
    
    # Load all secrets
    secrets = loader.load_all_secrets()
    
    # API Keys
    if not config_instance.anthropic_api_key and secrets.get("anthropic_api_key"):
        config_instance.anthropic_api_key = secrets["anthropic_api_key"]
        logger.debug("Loaded Anthropic API key from Secret Manager")
    
    if not config_instance.openai_api_key and secrets.get("openai_api_key"):
        config_instance.openai_api_key = secrets["openai_api_key"]
        logger.debug("Loaded OpenAI API key from Secret Manager")
    
    if not config_instance.gaia_api_key and secrets.get("gaia_api_key"):
        config_instance.gaia_api_key = secrets["gaia_api_key"]
        logger.debug("Loaded Gaia API key from Secret Manager")
    
    if not config_instance.olorin_api_key and secrets.get("olorin_api_key"):
        config_instance.olorin_api_key = secrets["olorin_api_key"]
        logger.debug("Loaded Olorin API key from Secret Manager")
    
    if not config_instance.databricks_token and secrets.get("databricks_token"):
        config_instance.databricks_token = secrets["databricks_token"]
        logger.debug("Loaded Databricks token from Secret Manager")
    
    # Database configuration
    db_config = secrets.get("database", {})
    if not config_instance.database_password and db_config.get("password"):
        config_instance.database_password = db_config["password"]
        logger.debug("Loaded database password from Secret Manager")
    
    # Redis configuration
    redis_config = secrets.get("redis", {})
    if not config_instance.redis_password and redis_config.get("password"):
        config_instance.redis_password = redis_config["password"]
        logger.debug("Loaded Redis password from Secret Manager")
    
    # JWT configuration
    jwt_config = secrets.get("jwt", {})
    if not config_instance.jwt_secret_key and jwt_config.get("secret_key"):
        config_instance.jwt_secret_key = jwt_config["secret_key"]
        logger.debug("Loaded JWT secret key from Secret Manager")
    
    # Splunk configuration
    splunk_config = secrets.get("splunk", {})
    if not config_instance.splunk_username and splunk_config.get("username"):
        config_instance.splunk_username = splunk_config["username"]
        logger.debug("Loaded Splunk username from Secret Manager")
    
    if not config_instance.splunk_password and splunk_config.get("password"):
        config_instance.splunk_password = splunk_config["password"]
        logger.debug("Loaded Splunk password from Secret Manager")
    
    # SumoLogic configuration
    sumo_config = secrets.get("sumo_logic", {})
    if not config_instance.sumo_logic_access_id and sumo_config.get("access_id"):
        config_instance.sumo_logic_access_id = sumo_config["access_id"]
        logger.debug("Loaded SumoLogic access ID from Secret Manager")
    
    if not config_instance.sumo_logic_access_key and sumo_config.get("access_key"):
        config_instance.sumo_logic_access_key = sumo_config["access_key"]
        logger.debug("Loaded SumoLogic access key from Secret Manager")
    
    # Snowflake configuration
    snowflake_config = secrets.get("snowflake", {})
    if not config_instance.snowflake_account and snowflake_config.get("account"):
        config_instance.snowflake_account = snowflake_config["account"]
        logger.debug("Loaded Snowflake account from Secret Manager")
    
    if not config_instance.snowflake_user and snowflake_config.get("user"):
        config_instance.snowflake_user = snowflake_config["user"]
        logger.debug("Loaded Snowflake user from Secret Manager")
    
    if not config_instance.snowflake_password and snowflake_config.get("password"):
        config_instance.snowflake_password = snowflake_config["password"]
        logger.debug("Loaded Snowflake password from Secret Manager")
    
    if not config_instance.snowflake_private_key and snowflake_config.get("private_key"):
        config_instance.snowflake_private_key = snowflake_config["private_key"]
        logger.debug("Loaded Snowflake private key from Secret Manager")
    
    # App secret
    if secrets.get("app_secret"):
        config_instance.app_secret = secrets["app_secret"]
        logger.debug("Loaded app secret from Secret Manager")
    
    logger.info("Configuration enhanced with secrets from Firebase Secret Manager")
    
    return config_instance


def validate_required_secrets(config_instance) -> bool:
    """
    Validate that required secrets are present in the configuration.
    
    Args:
        config_instance: An instance of SvcSettings or its subclasses
        
    Returns:
        True if all required secrets are present, False otherwise
        
    Raises:
        ValueError: In production/staging environments if critical secrets are missing
    """
    required_secrets = []
    missing_secrets = []
    
    # Get environment from config or environment variable
    env = getattr(config_instance, 'env', None) or os.getenv("APP_ENV", "local")
    
    # Define critical secrets for production/staging
    if env in ["production", "prd", "staging", "stg", "e2e", "prf"]:
        # Critical secrets that must exist
        required_secrets = [
            ("anthropic_api_key", "Anthropic API Key"),
            ("jwt_secret_key", "JWT Secret Key"),
            ("database_password", "Database Password"),
        ]
        
        # Check Splunk if enabled
        if hasattr(config_instance, 'enabled_log_sources') and "splunk" in config_instance.enabled_log_sources:
            required_secrets.extend([
                ("splunk_username", "Splunk Username"),
                ("splunk_password", "Splunk Password"),
            ])
        
        # Check Snowflake if enabled
        if hasattr(config_instance, 'enabled_data_sources') and "snowflake" in config_instance.enabled_data_sources:
            required_secrets.extend([
                ("snowflake_account", "Snowflake Account"),
                ("snowflake_user", "Snowflake User"),
                ("snowflake_password", "Snowflake Password"),
            ])
    
    # Validate required secrets
    for secret_attr, secret_name in required_secrets:
        if not getattr(config_instance, secret_attr, None):
            missing_secrets.append(secret_name)
    
    if missing_secrets:
        error_msg = f"CRITICAL: Missing required secrets for environment '{env}': {', '.join(missing_secrets)}"
        logger.error(error_msg)
        
        # Fail fast in production/staging environments
        if env in ["production", "prd", "staging", "stg"]:
            raise ValueError(error_msg + " - Cannot start application safely without these secrets.")
        
        return False
    
    # Log successful validation
    if required_secrets:
        logger.info(f"All {len(required_secrets)} required secrets validated for environment '{env}'")
    
    return True