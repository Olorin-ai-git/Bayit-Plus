import logging
from app.service.logging import get_bridge_logger

from fastapi import APIRouter, Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.agent_request import AgentRequest
from app.utils.auth_utils import get_userid_and_token_from_authn_header

logger = get_bridge_logger(__name__)


def construct_agent_context(
    req: Request, agent_input_request: AgentRequest
) -> AgentContext:
    (
        olorin_userid,
        olorin_token,
        olorin_realmid,
    ) = get_userid_and_token_from_authn_header(req.headers.get("Authorization"))
    # Fallback to empty strings if missing to avoid Pydantic validation errors
    if olorin_userid is None:
        olorin_userid = ""
    if olorin_token is None:
        olorin_token = ""
    olorin_experience_id: str = req.headers.get("olorin_experience_id", "")
    olorin_tid: str = req.state.olorin_tid
    olorin_originating_assetalias: str = req.headers.get(
        "olorin_originating_assetalias", ""
    )
    olorin_header = OlorinHeader(
        olorin_tid=olorin_tid,
        olorin_originating_assetalias=olorin_originating_assetalias,
        olorin_experience_id=olorin_experience_id,
        auth_context=AuthContext(
            olorin_user_id=olorin_userid,
            olorin_user_token=olorin_token,
            olorin_realmid=olorin_realmid,
        ),
    )
    logger.info(f"Successfully parsed olorin_header from request headers")

    # Handle multiple content items by concatenating text content
    input_text = ""
    if agent_input_request.agent_input.content:
        text_contents = []
        for content_item in agent_input_request.agent_input.content:
            if hasattr(content_item, "text") and content_item.text:
                text_contents.append(content_item.text)
        input_text = " ".join(text_contents) if text_contents else ""
        logger.debug(
            f"Processed {len(agent_input_request.agent_input.content)} content items, extracted {len(text_contents)} text items"
        )

    agent_context: AgentContext = AgentContext(
        input=input_text,
        agent_name=agent_input_request.agent.name,
        metadata=agent_input_request.metadata,
        olorin_header=olorin_header,
    )
    return agent_context
