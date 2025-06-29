import logging

from fastapi import APIRouter, Request

from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.agent_request import AgentRequest
from app.utils.auth_utils import get_userid_and_token_from_authn_header

logger = logging.getLogger(__name__)


def construct_agent_context(
    req: Request, agent_input_request: AgentRequest
) -> AgentContext:
    (
        intuit_userid,
        intuit_token,
        intuit_realmid,
    ) = get_userid_and_token_from_authn_header(req.headers.get("Authorization"))
    # Fallback to empty strings if missing to avoid Pydantic validation errors
    if intuit_userid is None:
        intuit_userid = ""
    if intuit_token is None:
        intuit_token = ""
    intuit_experience_id: str = req.headers.get("intuit_experience_id", "")
    intuit_tid: str = req.state.intuit_tid
    intuit_originating_assetalias: str = req.headers.get(
        "intuit_originating_assetalias", ""
    )
    intuit_header = OlorinHeader(
        intuit_tid=intuit_tid,
        intuit_originating_assetalias=intuit_originating_assetalias,
        intuit_experience_id=intuit_experience_id,
        auth_context=AuthContext(
            intuit_user_id=intuit_userid,
            intuit_user_token=intuit_token,
            intuit_realmid=intuit_realmid,
        ),
    )
    logger.info(f"Successfully parsed intuit_header from request headers")
    # TODO: first element of content is expected to be text, need to handle multiple content items
    agent_context: AgentContext = AgentContext(
        input=agent_input_request.agent_input.content[0].text,
        agent_name=agent_input_request.agent.name,
        metadata=agent_input_request.metadata,
        intuit_header=intuit_header,
    )
    return agent_context
