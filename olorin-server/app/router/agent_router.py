import logging
from app.service.logging import get_bridge_logger
import uuid

from fastapi import APIRouter, Query, Request

from app.models.agent_request import AgentRequest
from app.models.agent_response import AgentMetadata, AgentOutput, AgentResponse
from app.router.agent_router_helper import construct_agent_context
from app.service.error_handling import (
    AgentInvokeException,
    AuthorizationError,
    ClientException,
)

logger = get_bridge_logger(__name__)

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
            # CRITICAL FIX: Use clean graph orchestration system instead of old agent service
            # This completes Option C: Remove old system and use only clean graph system for fraud investigations
            logger.info("🚀 EXECUTING CLEAN GRAPH ORCHESTRATION for fraud investigation agent")

            from app.service.agent.orchestration.hybrid.migration_utilities import (
                get_investigation_graph,
                get_feature_flags
            )
            from app.service.agent.orchestration.state_schema import create_initial_state
            from langchain_core.messages import HumanMessage

            # Create investigation ID from context
            investigation_id = f"FRAUD_AGENT_{agent_context.thread_id}"

            # Extract entity info from agent context metadata or input
            entity_id = getattr(agent_context.metadata, 'additionalMetadata', {}).get('entity_id', 'unknown')
            entity_type = getattr(agent_context.metadata, 'additionalMetadata', {}).get('entity_type', 'user_id')

            # Create initial state for clean graph execution
            initial_state = create_initial_state(
                investigation_id=investigation_id,
                entity_id=entity_id,
                entity_type=entity_type,
                parallel_execution=True,
                max_tools=52
            )

            # Add investigation query to messages
            investigation_query = agent_context.input or f"Investigate {entity_type}: {entity_id} for fraud patterns"
            initial_state["messages"] = [HumanMessage(content=investigation_query)]

            # Get appropriate graph (hybrid or clean based on feature flags)
            graph = await get_investigation_graph(
                investigation_id=investigation_id,
                entity_type=entity_type
            )

            # Set recursion limit for production mode
            recursion_limit = 100
            config = {"recursion_limit": recursion_limit}

            # Add thread configuration if using hybrid graph
            feature_flags = get_feature_flags()
            if feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
                config["configurable"] = {"thread_id": investigation_id, "investigation_id": investigation_id}
                logger.info(f"🧠 Using Hybrid Intelligence graph for fraud investigation: {investigation_id}")
            else:
                config["configurable"] = {"investigation_id": investigation_id}  # CRITICAL: Always pass investigation_id
                logger.info(f"🔄 Using Clean graph orchestration for fraud investigation: {investigation_id}")

            # Execute the clean graph system
            langgraph_result = await graph.ainvoke(
                initial_state,
                config=config
            )

            # Extract result from LangGraph execution
            response_str = str(langgraph_result.get("messages", [])[-1].content if langgraph_result.get("messages") else "Investigation completed")
            trace_id = investigation_id  # Use investigation ID as trace ID
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
            f"Starting structured investigation for entity_id={entity_id}, entity_type={entity_type}"
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

        # CRITICAL FIX: Use clean graph orchestration system instead of old agent service
        # This completes Option C: Remove old system and use only clean graph system
        logger.info("🚀 EXECUTING CLEAN GRAPH ORCHESTRATION for structured investigation")

        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_investigation_graph,
            get_feature_flags
        )
        from app.service.agent.orchestration.state_schema import create_initial_state
        from langchain_core.messages import HumanMessage

        # Create investigation ID
        investigation_id = f"AGENT_ROUTER_{entity_id}_{entity_type}"

        # Create initial state for clean graph execution
        initial_state = create_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_id,
            entity_type=entity_type,
            parallel_execution=True,
            max_tools=52
        )

        # Add investigation query to messages
        investigation_query = f"Investigate {entity_type}: {entity_id} for fraud patterns and risk indicators"
        initial_state["messages"] = [HumanMessage(content=investigation_query)]

        # Get appropriate graph (hybrid or clean based on feature flags)
        graph = await get_investigation_graph(
            investigation_id=investigation_id,
            entity_type=entity_type
        )

        # Set recursion limit for production mode
        recursion_limit = 100
        config = {"recursion_limit": recursion_limit}

        # Add thread configuration if using hybrid graph
        feature_flags = get_feature_flags()
        if feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
            config["configurable"] = {"thread_id": investigation_id, "investigation_id": investigation_id}
            logger.info(f"🧠 Using Hybrid Intelligence graph for investigation: {investigation_id}")
        else:
            config["configurable"] = {"investigation_id": investigation_id}  # CRITICAL: Always pass investigation_id
            logger.info(f"🔄 Using Clean graph orchestration for investigation: {investigation_id}")

        # Execute the clean graph system
        langgraph_result = await graph.ainvoke(
            initial_state,
            config=config
        )

        # Extract result from LangGraph execution
        response_str = str(langgraph_result.get("messages", [])[-1].content if langgraph_result.get("messages") else "Investigation completed")
        trace_id = investigation_id  # Use investigation ID as trace ID

        logger.info(
            f"Structured investigation completed successfully with trace_id={trace_id}"
        )

        agent_response = AgentResponse(
            agentOutput=AgentOutput(plainText=response_str, outputs=[]),
            agentMetadata=AgentMetadata(agentTraceId=trace_id),
        ).model_dump(by_alias=True)
        return agent_response

    except Exception as e:
        logger.error(
            f"Error in structured investigation for entity_id={entity_id}: {e}",
            exc_info=True,
        )
        # Return a proper error response instead of letting it bubble up as 500
        from fastapi import HTTPException

        raise HTTPException(
            status_code=500, detail=f"Structured investigation failed: {str(e)}"
        )
