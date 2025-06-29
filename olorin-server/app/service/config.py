import os
from functools import lru_cache
from typing import List, Optional, Dict

from fastapi import Request
from pydantic import Field, BaseModel
from pydantic_settings import BaseSettings

preprod_splunk_index: str = "rss-e2eidx"
preprod_splunk_host: str = "splunk-rest-us-east-2.e2e.cmn.cto.a.intuit.com"


class UpiHistoryConversationApiConfig(BaseSettings):
    upi_base_url: str = "https://genosuxsvc-e2e.api.intuit.com"
    upi_path: str = "/v1/interactions"
    upi_mock_response: bool = False


class SvcSettings(BaseSettings):
    # Config is logged -- do not store secrets here!
    log_level: str = "INFO"
    expose_metrics: bool = True
    mesh_port: int = Field(8090, validation_alias="MESH_TRAFFIC_PORT")
    asset_id: str = "3825825476777495228"
    intuit_originating_assetalias: Optional[str] = "Intuit.cas.hri.olorin"

    # Cache settings
    use_ips_cache: bool = (
        False  # Changing this to True will use IPS cache implementation - AsyncRedisSaver instead of Langgraph's MemorySaver
    )
    ips_base_url: str = "https://ipscache-qal.api.intuit.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig()
    )


    # App settings
    app_id: str = "Intuit.cas.hri.olorin"
    # Store app secret in IDPS and provide the secret name path here
    app_secret: str = "olorin/app_secret"

    # QB Tool settings
    ceres_endpoint: str = "https://ceres-das-e2e.api.intuit.com"

    # Splunk agent settings: host, index, port, and IDPS secret paths for credentials
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index
    splunk_port: int = Field(
        8089, description="Splunk management port", env="SPLUNK_PORT"
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

    app_id: str = "Intuit.cas.hri.olorin"
    app_secret: str = "olorin/app_secret"
    rag_search_url: str = (
        "https://aimqasvc-e2e.api.intuit.com/v1/genosplugins/AIMSearchPlugin/generate"
    )
    enable_langfuse: bool = True  # Set to True to enable langfuse tracing;
    # and set the langfuse_public_key and langfuse_secret_key to the values in IDPS below
    langfuse_public_key: str = "olorin/langfuse/public_key"
    langfuse_secret_key: str = "olorin/langfuse/secret_key"
    langfuse_host: str = "https://langfuse-e2e.api.intuit.com"
    ceres_endpoint: str = "https://ceres-das-e2e.api.intuit.com"
    cdc_env: str = "preprod"

    # Test settings
    identity_url: str = "https://identityinternal-e2e.api.intuit.com/signin/graphql"
    identity_payload: str = (
        '{"query":"mutation {\\n    identityTestSignInWithPassword(input: {\\n        username: \\"iamtestpass_116696787517509\\",\\n        password: \\"Intuit01-\\",\\n        tenantId: \\"50000003\\",\\n        intent: {\\n            appGroup: \\"QBO\\",\\n            assetAlias: \\"Intuit.sandbox.sandbox.resttestclient\\"\\n        }\\n    }) {\\n        accessToken\\n        legacyAuthId\\n    }\\n}\\n","variables":{}}'
    )
    intuit_experience_id: str = "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58"
    llm_base_url: str = "https://llmexecution-e2e.api.intuit.com/v3/o1-2024-12-17/"


class ProdSettings(SvcSettings):
    """
    Settings shared by STG and PRD (see STGSettings and PRDSettings below)
    """

    ceres_endpoint: str = "https://ceres-das.api.intuit.com"
    cdc_env: str = "prd"


class LocalSettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-qal.api.intuit.com"
    ips_base_path: str = "/v1/cache"
    ceres_endpoint: str = "https://ceres-das-e2e.api.intuit.com"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.intuit.com", upi_mock_response=True
        )
    )
    default_profile_id: str = "9341454513864369"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class QALSettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-qal.api.intuit.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.intuit.com"
        )
    )
    default_profile_id: str = "9341454513864369"
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index


class E2ESettings(PreProdSettings):
    log_level: str = "DEBUG"
    ips_base_url: str = "https://ipscache-e2e.api.intuit.com"
    ips_base_path: str = "/v1/cache"
    upi_history_conversation_api_config: UpiHistoryConversationApiConfig = (
        UpiHistoryConversationApiConfig(
            upi_base_url="https://genosuxsvc-e2e.api.intuit.com"
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
    splunk_host: str = "ip.adhoc.rest.splunk.intuit.com"
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
    return _ENV_SETTINGS[env]()


class ServiceConfig(BaseModel):
    """Service configuration."""
    app_name: str = "olorin-service"
    version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = ["*"]
    cors_methods: List[str] = ["*"]
    cors_headers: List[str] = ["*"]

    # API endpoints
    api_endpoints: Dict[str, str] = {
        "knowledge_base": "https://api.olorin.com/v1/knowledge",
        "user_profile": "https://api.olorin.com/v1/users",
        "company_profile": "https://api.olorin.com/v1/companies",
        "search": "https://api.olorin.com/v1/search"
    }

    # Authentication
    auth_enabled: bool = True
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    class Config:
        env_prefix = "OLORIN_"

# Default configuration
default_config = ServiceConfig()

# Environment-specific configurations
configs = {
    "development": ServiceConfig(
        debug=True,
        environment="development",
        log_level="DEBUG"
    ),
    "testing": ServiceConfig(
        debug=True,
        environment="testing",
        log_level="DEBUG",
        auth_enabled=False
    ),
    "production": ServiceConfig(
        debug=False,
        environment="production",
        log_level="INFO"
    )
}
