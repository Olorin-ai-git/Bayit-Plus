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
    app_secret: str = "olorin/app_secret"

    # QB Tool settings
    ceres_endpoint: str = "https://ceres-das-e2e.api.olorin.com"

    # Splunk agent settings: host, index, port, and Firebase secret paths for credentials
    splunk_host: str = preprod_splunk_host
    splunk_index: str = preprod_splunk_index
    splunk_port: int = Field(
        8089, description="Splunk management port", env="SPLUNK_PORT"
    )
    splunk_username_secret: str = Field(
        "olorin/splunk_username",
        description="Firebase secret path for Splunk username",
        env="SPLUNK_USERNAME_SECRET",
    )
    splunk_password_secret: str = Field(
        "olorin/splunk_password",
        description="Firebase secret path for Splunk password",
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
    app_secret: str = "olorin/app_secret"
    rag_search_url: str = (
        "https://aimqasvc-e2e.api.olorin.com/v1/genosplugins/AIMSearchPlugin/generate"
    )
    enable_langfuse: bool = True  # Set to True to enable langfuse tracing;
    # and set the langfuse_public_key and langfuse_secret_key to the values in IDPS below
    langfuse_public_key: str = "olorin/langfuse/public_key"
    langfuse_secret_key: str = "olorin/langfuse/secret_key"
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
    return _ENV_SETTINGS[env]()
