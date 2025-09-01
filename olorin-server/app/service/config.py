import os
from functools import lru_cache
from typing import List, Optional

from fastapi import Request
from pydantic import Field
from pydantic_settings import BaseSettings

preprod_splunk_index: str = "rss-e2eidx"
preprod_splunk_host: str = "splunk-rest-us-east-2.e2e.cmn.cto.a.olorin.com"


class UpiHistoryConversationApiConfig(BaseSettings):
    upi_base_url: str = "https://genosuxsvc-e2e.api.olorin.com"
    upi_path: str = "/v1/interactions"
    upi_mock_response: bool = False


class SvcSettings(BaseSettings):
    # Config is logged -- do not store secrets here!
    log_level: str = "INFO"
    expose_metrics: bool = True
    mesh_port: int = Field(8090, validation_alias="MESH_TRAFFIC_PORT")
    asset_id: str = "3825825476777495228"
    olorin_originating_assetalias: Optional[str] = "Olorin.cas.hri.olorin"

    # Verification service flags
    verification_enabled: bool = Field(
        default=False, description="Enable Opus verification gating"
    )
    verification_mode: str = Field(
        default="shadow", description="shadow|blocking"
    )
    verification_sample_percent: float = Field(
        default=1.0, description="0.0-1.0 sampling rate for verification"
    )
    verification_opus_model: str = Field(
        default="claude-opus-4.1", description="Opus model name"
    )
    verification_threshold_default: float = Field(default=0.85)
    verification_max_retries_default: int = Field(default=1)
    verification_task_policy_risk_analysis_threshold: float = Field(default=0.9)
    verification_task_policy_risk_analysis_max_retries: int = Field(default=2)

    # Anthropic API - stored in Firebase Secrets Manager ONLY
    anthropic_api_key_secret: str = Field(
        "ANTHROPIC_API_KEY",
        description="Firebase secret name for Anthropic API key (REQUIRED - no environment fallback)",
        env="ANTHROPIC_API_KEY_SECRET",
    )
    
    # REMOVED: Environment variable override - API key must come from Firebase Secrets Manager only
    
    # OpenAI API for dual-framework agent support - stored in Firebase Secrets Manager
    openai_api_key_secret: str = Field(
        "OPENAI_API_KEY",
        description="Firebase secret name for OpenAI API key",
        env="OPENAI_API_KEY_SECRET",
    )
    
    # Allow overriding OpenAI API key directly via environment for local/dev
    openai_api_key: Optional[str] = Field(
        default=None,
        description="Override OpenAI API key via env var OPENAI_API_KEY",
        env="OPENAI_API_KEY",
    )

    # Cache settings
    use_ips_cache: bool = (
        False  # Changing this to True will use IPS cache implementation - AsyncRedisSaver instead of Langgraph's MemorySaver
    )
    ips_base_url: str = "https://ipscache-qal.api.olorin.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig()
    )

    # Firebase settings for secret management
    firebase_project_id: Optional[str] = Field(
        None,
        description="Firebase project ID for secret management",
        env="FIREBASE_PROJECT_ID"
    )
    firebase_private_key: Optional[str] = Field(
        None,
        description="Firebase service account private key",
        env="FIREBASE_PRIVATE_KEY"
    )
    firebase_client_email: Optional[str] = Field(
        None,
        description="Firebase service account client email",
        env="FIREBASE_CLIENT_EMAIL"
    )

    # App settings
    app_id: str = "Olorin.cas.hri.olorin"
    # Store app secret in Firebase Secrets Manager
    app_secret: str = "APP_SECRET"

    # QB Tool settings
    ceres_endpoint: str = "https://ceres-das-e2e.api.olorin.com"

    # Splunk agent settings: host, index, port, and Firebase secret paths for credentials
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index
    splunk_port: int = Field(
        8089, description="Splunk management port", env="SPLUNK_PORT"
    )
    splunk_username_secret: str = Field(
        "SPLUNK_USERNAME",
        description="Firebase secret name for Splunk username",
        env="SPLUNK_USERNAME_SECRET",
    )
    splunk_password_secret: str = Field(
        "SPLUNK_PASSWORD",
        description="Firebase secret name for Splunk password",
        env="SPLUNK_PASSWORD_SECRET",
    )

    # Allow overriding Splunk credentials directly via environment for local/dev
    splunk_username: Optional[str] = Field(
        None,
        description="Override Splunk username via env var SPLUNK_USERNAME",
        env="SPLUNK_USERNAME",
    )
    splunk_password: Optional[str] = Field(
        None,
        description="Override Splunk password via env var SPLUNK_PASSWORD",
        env="SPLUNK_PASSWORD",
    )

    # SumoLogic integration settings
    sumo_logic_endpoint: str = Field(
        "https://api.sumologic.com",
        description="SumoLogic API endpoint",
        env="SUMO_LOGIC_ENDPOINT",
    )
    sumo_logic_access_id_secret: str = Field(
        "SUMO_LOGIC_ACCESS_ID",
        description="Firebase secret name for SumoLogic Access ID",
        env="SUMO_LOGIC_ACCESS_ID_SECRET",
    )
    sumo_logic_access_key_secret: str = Field(
        "SUMO_LOGIC_ACCESS_KEY",
        description="Firebase secret name for SumoLogic Access Key",
        env="SUMO_LOGIC_ACCESS_KEY_SECRET",
    )
    
    # Allow overriding SumoLogic credentials directly via environment for local/dev
    sumo_logic_access_id: Optional[str] = Field(
        None,
        description="Override SumoLogic Access ID via env var SUMO_LOGIC_ACCESS_ID",
        env="SUMO_LOGIC_ACCESS_ID",
    )
    sumo_logic_access_key: Optional[str] = Field(
        None,
        description="Override SumoLogic Access Key via env var SUMO_LOGIC_ACCESS_KEY",
        env="SUMO_LOGIC_ACCESS_KEY",
    )
    
    # Database secrets - migrated to Firebase Secrets Manager
    database_password_secret: str = Field(
        "DATABASE_PASSWORD",
        description="Firebase secret name for database password",
        env="DATABASE_PASSWORD_SECRET",
    )
    
    # Redis secrets - migrated to Firebase Secrets Manager  
    redis_api_key_secret: str = Field(
        "REDIS_API_KEY",
        description="Firebase secret name for Redis API key",
        env="REDIS_API_KEY_SECRET",
    )
    
    # Redis connection parameters for Redis Cloud
    redis_host: str = Field(
        "redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com",
        description="Redis Cloud host",
        env="REDIS_HOST",
    )
    redis_port: int = Field(
        13848,
        description="Redis Cloud port",
        env="REDIS_PORT",
    )
    redis_username: str = Field(
        "default",
        description="Redis Cloud username",
        env="REDIS_USERNAME",
    )
    
    # JWT secrets - migrated to Firebase Secrets Manager
    jwt_secret_key_secret: str = Field(
        "JWT_SECRET_KEY",
        description="Firebase secret name for JWT secret key",
        env="JWT_SECRET_KEY_SECRET",
    )
    
    # Development API keys - migrated to Firebase Secrets Manager
    
    olorin_api_key_secret: str = Field(
        "OLORIN_API_KEY", 
        description="Firebase secret name for Olorin API key",
        env="OLORIN_API_KEY_SECRET",
    )
    
    databricks_token_secret: str = Field(
        "DATABRICKS_TOKEN",
        description="Firebase secret name for Databricks token",
        env="DATABRICKS_TOKEN_SECRET",
    )

    # Allow overriding database password directly via environment for local/dev
    database_password: Optional[str] = Field(
        default=None,
        description="Override database password via env var DB_PASSWORD or POSTGRES_PASSWORD",
        env="DB_PASSWORD",
    )
    
    # Allow overriding Redis API key directly via environment for local/dev
    redis_api_key: Optional[str] = Field(
        default=None,
        description="Override Redis API key via env var REDIS_API_KEY",
        env="REDIS_API_KEY",
    )
    
    # Allow overriding JWT secret directly via environment for local/dev
    jwt_secret_key: Optional[str] = Field(
        default=None,
        description="Override JWT secret key via env var JWT_SECRET_KEY",
        env="JWT_SECRET_KEY",
    )
    
    # Allow overriding development API keys directly via environment for local/dev
    
    olorin_api_key: Optional[str] = Field(
        default=None,
        description="Override Olorin API key via env var OLORIN_API_KEY", 
        env="OLORIN_API_KEY",
    )
    
    databricks_token: Optional[str] = Field(
        default=None,
        description="Override Databricks token via env var DATABRICKS_TOKEN",
        env="DATABRICKS_TOKEN",
    )

    # Snowflake integration settings
    snowflake_account: Optional[str] = Field(
        None,
        description="Override Snowflake account via env var SNOWFLAKE_ACCOUNT",
        env="SNOWFLAKE_ACCOUNT",
    )
    snowflake_user: Optional[str] = Field(
        None,
        description="Override Snowflake user via env var SNOWFLAKE_USER",
        env="SNOWFLAKE_USER",
    )
    snowflake_password: Optional[str] = Field(
        None,
        description="Override Snowflake password via env var SNOWFLAKE_PASSWORD",
        env="SNOWFLAKE_PASSWORD",
    )
    snowflake_private_key: Optional[str] = Field(
        None,
        description="Override Snowflake private key via env var SNOWFLAKE_PRIVATE_KEY",
        env="SNOWFLAKE_PRIVATE_KEY",
    )
    snowflake_database: Optional[str] = Field(
        None,
        description="Snowflake database name",
        env="SNOWFLAKE_DATABASE",
    )
    snowflake_schema: Optional[str] = Field(
        None,
        description="Snowflake schema name",
        env="SNOWFLAKE_SCHEMA",
    )
    snowflake_warehouse: Optional[str] = Field(
        None,
        description="Snowflake warehouse name",
        env="SNOWFLAKE_WAREHOUSE",
    )
    snowflake_role: Optional[str] = Field(
        None,
        description="Snowflake role name",
        env="SNOWFLAKE_ROLE",
    )
    snowflake_authenticator: str = Field(
        "snowflake",
        description="Snowflake authentication method",
        env="SNOWFLAKE_AUTHENTICATOR",
    )
    
    # Firebase secret names for Snowflake credentials
    snowflake_account_secret: str = Field(
        "SNOWFLAKE_ACCOUNT",
        description="Firebase secret name for Snowflake account",
        env="SNOWFLAKE_ACCOUNT_SECRET",
    )
    snowflake_user_secret: str = Field(
        "SNOWFLAKE_USER",
        description="Firebase secret name for Snowflake user",
        env="SNOWFLAKE_USER_SECRET",
    )
    snowflake_password_secret: str = Field(
        "SNOWFLAKE_PASSWORD",
        description="Firebase secret name for Snowflake password",
        env="SNOWFLAKE_PASSWORD_SECRET",
    )
    snowflake_private_key_secret: str = Field(
        "SNOWFLAKE_PRIVATE_KEY",
        description="Firebase secret name for Snowflake private key",
        env="SNOWFLAKE_PRIVATE_KEY_SECRET",
    )

    # Log source configuration
    enabled_log_sources: List[str] = Field(
        ["splunk"],
        description="List of enabled log sources (splunk, sumo_logic)",
        env="ENABLED_LOG_SOURCES"
    )
    primary_log_source: str = Field(
        "splunk",
        description="Primary log source for analysis",
        env="PRIMARY_LOG_SOURCE"
    )
    
    # Data source configuration
    enabled_data_sources: List[str] = Field(
        ["snowflake"],
        description="List of enabled data sources (snowflake)",
        env="ENABLED_DATA_SOURCES"
    )
    primary_data_source: str = Field(
        "snowflake",
        description="Primary data source for structured data analysis",
        env="PRIMARY_DATA_SOURCE"
    )

    enabled_tool_list: List[str] = [
        "QBRetrieverTool",
        "TTRetrieverTool",
        "ListCustomersTool",
        "CdcUserTool",
        "CdcCompanyTool",
        "OIITool",
    ]


# see https://fastapi.tiangolo.com/advanced/settings/#settings-in-a-dependency
@lru_cache(maxsize=1)
def get_settings(request: Request) -> SvcSettings:
    return request.app.state.config


class PreProdSettings(SvcSettings):
    """
    Settings shared by pre-prod environments
    """

    idps_endpoint: str = "vkm-e2e.ps.idps.a.olorin.com"
    idps_policy_id: str = "p-2abqgwqm8n5i"
    app_id: str = "Olorin.cas.hri.olorin"
    app_secret: str = "APP_SECRET"
    rag_search_url: str = (
        "https://aimqasvc-e2e.api.olorin.com/v1/genosplugins/AIMSearchPlugin/generate"
    )
    enable_langfuse: bool = True  # Set to True to enable langfuse tracing;
    # and set the langfuse_public_key and langfuse_secret_key to the values in IDPS below
    langfuse_public_key: str = "LANGFUSE_PUBLIC_KEY"
    langfuse_secret_key: str = "LANGFUSE_SECRET_KEY"
    langfuse_host: str = "https://langfuse-e2e.api.olorin.com"
    ceres_endpoint: str = "https://ceres-das-e2e.api.olorin.com"
    cdc_env: str = "preprod"

    # Test settings
    identity_url: str = "https://identityinternal-e2e.api.olorin.com/signin/graphql"
    identity_payload: str = (
        '{"query":"mutation {\\n    identityTestSignInWithPassword(input: {\\n        username: \\"iamtestpass_116696787517509\\",\\n        password: \\"Olorin01-\\",\\n        tenantId: \\"50000003\\",\\n        intent: {\\n            appGroup: \\"QBO\\",\\n            assetAlias: \\"Olorin.sandbox.sandbox.resttestclient\\"\\n        }\\n    }) {\\n        accessToken\\n        legacyAuthId\\n    }\\n}\\n","variables":{}}'
    )
    olorin_experience_id: str = "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58"
    llm_base_url: str = "https://llmexecution-e2e.api.olorin.com/v3/o1-2024-12-17/"


class ProdSettings(SvcSettings):
    """
    Settings shared by STG and PRD (see STGSettings and PRDSettings below)
    """

    ceres_endpoint: str = "https://ceres-das.api.olorin.com"
    cdc_env: str = "prd"


class LocalSettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-qal.api.olorin.com"
    ips_base_path: str = "/v1/cache"
    ceres_endpoint: str = "https://ceres-das-e2e.api.olorin.com"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.olorin.com", upi_mock_response=True
        )
    )
    default_profile_id: str = "9341454513864369"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class QALSettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-qal.api.olorin.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.olorin.com"
        )
    )
    default_profile_id: str = "9341454513864369"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class E2ESettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-e2e.api.olorin.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.olorin.com"
        )
    )
    default_profile_id: str = "9341454513864369"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class PRFSettings(PreProdSettings):
    log_level: str = "INFO"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class STGSettings(ProdSettings):
    log_level: str = "INFO"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class PRDSettings(ProdSettings):
    log_level: str = "INFO"
    splunk_host: str = "ip.adhoc.rest.splunk.olorin.com"
    splunk_index: str = "rss-prdidx"


_ENV_SETTINGS = {
    "local": LocalSettings,
    "jenkins": QALSettings,
    "qal": QALSettings,
    "e2e": E2ESettings,
    "prf": PRFSettings,
    "stg": STGSettings,
    "prd": PRDSettings,
}


def get_settings_for_env() -> SvcSettings:
    env = os.getenv("APP_ENV", "local")
    config = _ENV_SETTINGS[env]()
    
    # Enhance configuration with secrets from Firebase Secret Manager
    try:
        from .config_secrets import enhance_config_with_secrets, validate_required_secrets
        config = enhance_config_with_secrets(config)
        
        # Validate required secrets are present
        if not validate_required_secrets(config):
            import structlog
            logger = structlog.get_logger(__name__)
            logger.warning("Some required secrets are missing, using defaults where available")
    except ImportError as e:
        # If secret manager modules are not available, continue with env-based config
        import structlog
        logger = structlog.get_logger(__name__)
        logger.warning(f"Secret Manager integration not available: {e}")
    except Exception as e:
        # Log any other errors but don't fail
        import structlog
        logger = structlog.get_logger(__name__)
        logger.error(f"Error loading secrets from Firebase Secret Manager: {e}")
    
    return config
