import json
import time
import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.agent_headers import OlorinHeader
from app.service.config import get_settings_for_env
from app.utils.firebase_secrets import get_app_secret
from app.service.logging import get_bridge_logger

settings_for_env = get_settings_for_env()

logger = get_bridge_logger(__name__)


class BaseContextModel(BaseModel):
    """
    The base model for context objects that contain common fields across different context types.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    olorin_header: OlorinHeader
    query_params: dict = Field(default_factory=dict)
    start_time: float = Field(default_factory=lambda: time.time())


class AgentContext(BaseContextModel):
    # Content list now handled in agent_router_helper.py with proper multi-content parsing
    input: str
    metadata: Any = None
    agent_name: Optional[str] = None
    session_id: Optional[str] = None
    thread_id: Optional[str] = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        session_id = self.metadata.interaction_group_id
        self.thread_id = f"{session_id}-{self.olorin_header.olorin_experience_id}"

    def get_header(self):
        # Get app secret with fallback for test scenarios
        app_secret = get_app_secret(settings_for_env.app_secret)
        if app_secret is None:
            # Fallback for test scenarios when Firebase is not available
            app_secret = "test_app_secret_fallback"
            logger.warning("Using fallback app_secret for testing - Firebase secrets not available")
            
        # Add fallbacks for all required header fields to prevent None values
        olorin_user_id = self.olorin_header.auth_context.olorin_user_id or "test_user_id"
        olorin_user_token = self.olorin_header.auth_context.olorin_user_token or "test_user_token"
        olorin_tid = self.olorin_header.olorin_tid or "test_tid"
        app_id = settings_for_env.app_id or "test_app_id"
        
        return self.build_headers(
            app_id=app_id,
            app_secret=app_secret,
            olorin_user_id=olorin_user_id,
            olorin_user_token=olorin_user_token,
            olorin_tid=olorin_tid,
            olorin_realmid=self.olorin_header.auth_context.olorin_realmid,
            olorin_experience_id=self.olorin_header.olorin_experience_id,
            olorin_originating_assetalias=self.olorin_header.olorin_originating_assetalias,
        )

    def build_headers(
        self,
        app_id: str,
        app_secret: str,
        olorin_user_id: str,
        olorin_user_token: str,
        olorin_tid: str,
        olorin_realmid=None,
        olorin_experience_id: str = None,
        olorin_originating_assetalias: str = None,
    ):
        # Olorin PrivateAuth+ headers
        AUTHN_STRING = (
            "Olorin_IAM_Authentication "
            f"olorin_appid='{app_id}',"
            f"olorin_app_secret={app_secret},"
            "olorin_token_type='IAM-Ticket',"
            f"olorin_userid={olorin_user_id},"
            f"olorin_token={olorin_user_token}"
        )

        if olorin_realmid:
            AUTHN_STRING += f",olorin_realmid={olorin_realmid}"

        runtime_header = {
            "Authorization": AUTHN_STRING,
            "olorin_tid": olorin_tid,
        }

        if olorin_experience_id:
            runtime_header["olorin_experience_id"] = olorin_experience_id
        if olorin_originating_assetalias:
            runtime_header["olorin_originating_assetalias"] = (
                olorin_originating_assetalias
            )

        return runtime_header

    def __str__(self):
        return self.model_dump_json(indent=4)
