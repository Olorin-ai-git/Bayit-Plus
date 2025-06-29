import logging
import uuid

from fastapi import APIRouter, Query, Request

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

    olorin_experience_id: str = req.headers.get("olorin_experience_id", "")
    olorin_originating_assetalias: str = req.headers.get(
        "olorin_originating_assetalias", ""
    )
    logger.info(
        f"Processing request for agent_name={agent_input_request.agent.name} with experience_id={olorin_experience_id} and originating_assetalias={olorin_originating_assetalias}"
    )

    agent_context: AgentContext = construct_agent_context(req, agent_input_request)

    logger.info(
        "Constructed agent_context from request headers and agent_input_request"
    )
    logger.debug(
        f"Constructed agent_context from request headers and agent_input_request={agent_input_request}"
    )
    try:
        if agent_input_request.agent.name == "fraud_investigation":
            # Only the fraud investigation agent triggers the LangGraph flow
            response_str, trace_id = await agent_service.ainvoke_agent(
                req, agent_context
            )
        else:
            # Other chat agents: simple echo (no graph)
            response_str = agent_context.input
            trace_id = str(uuid.uuid4())
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


@router.post("/agent/start/{entity_id}")
async def astart_investigation(
    req: Request,
    entity_id: str,
    entity_type: str = Query(..., pattern="^(user_id|device_id)$"),
) -> AgentResponse:
    """
    Start a new fraud investigation graph flow for a given entity (user or device).
    """
    try:
        logger.info("=== AUTONOMOUS INVESTIGATION START ===")
        from uuid import uuid4

        from app.models.agent_context import AgentContext
        from app.models.agent_request import Metadata
        from app.utils.auth_utils import get_userid_and_token_from_authn_header

        logger.info(
            f"Starting autonomous investigation for entity_id={entity_id}, entity_type={entity_type}"
        )
        logger.info("Imports completed successfully")

        # Parse authentication headers
        logger.info("Parsing authentication headers...")
        olorin_userid, olorin_token, olorin_realmid = (
            get_userid_and_token_from_authn_header(req.headers.get("Authorization"))
        )
        if olorin_userid is None:
            olorin_userid = ""
        if olorin_token is None:
            olorin_token = ""
        olorin_experience_id: str = req.headers.get("olorin_experience_id", "")
        olorin_originating_assetalias: str = req.headers.get(
            "olorin_originating_assetalias", ""
        )
        logger.info("Authentication headers parsed successfully")

        from app.models.agent_headers import AuthContext, OlorinHeader

        logger.info("Imported AuthContext and OlorinHeader")

        auth_context = AuthContext(
            olorin_user_id=olorin_userid,
            olorin_user_token=olorin_token,
            olorin_realmid=olorin_realmid,
        )
        logger.info("AuthContext created successfully")

        olorin_header = OlorinHeader(
            olorin_tid=req.state.olorin_tid,
            olorin_originating_assetalias=olorin_originating_assetalias,
            olorin_experience_id=olorin_experience_id,
            auth_context=auth_context,
        )
        logger.info("OlorinHeader created successfully")

        # Initial metadata with entity info - use JSON field names (aliases) directly
        logger.info("Creating Metadata object...")
        metadata = Metadata(
            interactionGroupId=str(uuid4()),
            supportedOutputFormats=[],
            additionalMetadata={
                "entity_id": entity_id,
                "entity_type": entity_type,
            },
        )
        logger.info(f"Metadata created successfully: {metadata}")

        # Build AgentContext for fraud investigation graph
        logger.info("Creating AgentContext...")
        agent_context = AgentContext(
            input="",
            agent_name="fraud_investigation",
            metadata=metadata,
            olorin_header=olorin_header,
        )
        logger.info(f"AgentContext created successfully")

        # Kick off the LangGraph flow
        logger.info("Calling agent_service.ainvoke_agent for autonomous investigation")
        response_str, trace_id = await agent_service.ainvoke_agent(req, agent_context)

        logger.info(
            f"Autonomous investigation completed successfully with trace_id={trace_id}"
        )

        agent_response = AgentResponse(
            agentOutput=AgentOutput(plainText=response_str, outputs=[]),
            agentMetadata=AgentMetadata(agentTraceId=trace_id),
        ).model_dump(by_alias=True)
        return agent_response

    except Exception as e:
        logger.error(
            f"Error in autonomous investigation for entity_id={entity_id}: {e}",
            exc_info=True,
        )
        # Return a proper error response instead of letting it bubble up as 500
        from fastapi import HTTPException

        raise HTTPException(
            status_code=500, detail=f"Autonomous investigation failed: {str(e)}"
        )
