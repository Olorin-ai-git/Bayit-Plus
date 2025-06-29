import logging

from fastapi import APIRouter, Request

from app.models.agent_request import AgentRequest
from app.models.agent_response import AgentMetadata, AgentOutput, AgentResponse
from app.router.agent_router_helper import construct_agent_context
from app.service import agent_service
from app.service.error_handling import (
    AgentInvokeException,
    AuthorizationError,
    ClientException,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1")


@router.post("/agent/invoke")
async def agenerate_chat_response(
    req: Request, agent_input_request: AgentRequest
) -> AgentResponse:
    from app.models.agent_context import AgentContext

    intuit_experience_id: str = req.headers.get("intuit_experience_id", "")
    intuit_originating_assetalias: str = req.headers.get(
        "intuit_originating_assetalias", ""
    )
    logger.info(
        f"Processing request for agent_name={agent_input_request.agent.name} with experience_id={intuit_experience_id} and originating_assetalias={intuit_originating_assetalias}"
    )

    agent_context: AgentContext = construct_agent_context(req, agent_input_request)

    logger.info(
        "Constructed agent_context from request headers and agent_input_request"
    )
    logger.debug(
        f"Constructed agent_context from request headers and agent_input_request={agent_input_request}"
    )
    try:
        response_str, trace_id = await agent_service.ainvoke_agent(req, agent_context)
    except AuthorizationError as exe_info:
        logger.error(f"AuthorizationError: {exe_info}")
        raise exe_info
    except ClientException as exe_info:
        logger.error(f"Client Exception: {exe_info}")
        raise exe_info
    except AgentInvokeException as exe_info:
        logger.error(f"AgentInvokeException: {exe_info}")
        raise exe_info

    agent_response = AgentResponse(
        agentOutput=AgentOutput(plainText=response_str, outputs=[]),
        agentMetadata=AgentMetadata(agentTraceId=trace_id),
    ).model_dump(by_alias=True)
    logger.debug(f"Agent response is: {agent_response}")
    logger.info(
        f"Received agent response successfully for agent_name={agent_input_request.agent.name}"
    )
    return agent_response
