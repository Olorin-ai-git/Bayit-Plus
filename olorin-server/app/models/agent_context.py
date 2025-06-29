import json
import logging
import time
import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.agent_headers import OlorinHeader
from app.service.config import get_settings_for_env

settings_for_env = get_settings_for_env()

logger = logging.getLogger(__name__)


class BaseContextModel(BaseModel):
    """
    The base model for context objects that contain common fields across different context types.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    intuit_header: OlorinHeader
    query_params: dict = Field(default_factory=dict)
    start_time: float = Field(default_factory=lambda: time.time())


class AgentContext(BaseContextModel):
    # TODO: pass content list directly instead of parsing only the input text
    input: str
    metadata: Any = None
    agent_name: Optional[str] = None
    session_id: Optional[str] = None
    thread_id: Optional[str] = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        session_id = self.metadata.interaction_group_id
        self.thread_id = f"{session_id}-{self.intuit_header.intuit_experience_id}"

    def get_header(self):
        return self.build_headers(
            app_id=settings_for_env.app_id,
            app_secret=settings_for_env.app_secret,
            intuit_user_id=self.intuit_header.auth_context.intuit_user_id,
            intuit_user_token=self.intuit_header.auth_context.intuit_user_token,
            intuit_tid=self.intuit_header.intuit_tid,
            intuit_realmid=self.intuit_header.auth_context.intuit_realmid,
            intuit_experience_id=self.intuit_header.intuit_experience_id,
            intuit_originating_assetalias=self.intuit_header.intuit_originating_assetalias,
        )

    def build_headers(
        self,
        app_id: str,
        app_secret: str,
        intuit_user_id: str,
        intuit_user_token: str,
        intuit_tid: str,
        intuit_realmid=None,
        intuit_experience_id: str = None,
        intuit_originating_assetalias: str = None,
    ):
        # Olorin PrivateAuth+ headers
        AUTHN_STRING = (
            "Olorin_IAM_Authentication "
            f"intuit_appid='{app_id}',"
            f"intuit_app_secret={app_secret},"
            "intuit_token_type='IAM-Ticket',"
            f"intuit_userid={intuit_user_id},"
            f"intuit_token={intuit_user_token}"
        )

        if intuit_realmid:
            AUTHN_STRING += f",intuit_realmid={intuit_realmid}"

        runtime_header = {
            "Authorization": AUTHN_STRING,
            "intuit_tid": intuit_tid,
        }

        if intuit_experience_id:
            runtime_header["intuit_experience_id"] = intuit_experience_id
        if intuit_originating_assetalias:
            runtime_header["intuit_originating_assetalias"] = (
                intuit_originating_assetalias
            )

        return runtime_header

    def __str__(self):
        return self.model_dump_json(indent=4)
