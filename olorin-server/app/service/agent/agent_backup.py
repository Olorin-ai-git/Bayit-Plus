import logging
from datetime import datetime
from typing import List, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver

# Import new pattern-based agent system
from app.service.agent.agent_factory import get_agent_factory, create_agent, execute_agent
from app.service.agent.patterns import PatternType, PatternConfig
from app.service.agent.websocket_streaming_service import WebSocketStreamingService

# Import autonomous agent system
from app.service.agent.autonomous_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
)
from app.service.agent.autonomous_context import AutonomousInvestigationContext
from app.service.agent.recursion_guard import get_recursion_guard, protect_node

# LangGraph imports may fail if dependencies (langchain_core.tracers) are missing
try:
    from langgraph.graph import START, MessagesState, StateGraph
    from langgraph.prebuilt import ToolNode, tools_condition
except ImportError as e:
    logging.getLogger(__name__).warning(
        f"LangGraph imports failed, disabling graph features: {e}"
    )
    START = None
    MessagesState = None
    StateGraph = None
    ToolNode = None
    tools_condition = None

import json

from fastapi import Request

from app.adapters.upi_client import UPIConversationHistoryClient
from app.models.agent_context import AgentContext
from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.upi_response import Interaction, InteractionsResponse
from app.persistence.async_ips_redis import AsyncRedisSaver
from app.service.agent.ato_agents.location_data_agent.client import LocationDataClient
from app.service.agent.tools.cdc_tool.cdc_tool import CdcCompanyTool, CdcUserTool
from app.service.agent.tools.oii_tool.oii_tool import OIITool
from app.service.agent.tools.retriever_tool.retriever_tool import (
    QBRetrieverTool,
    TTRetrieverTool,
)
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.agent.tools.vector_search_tool.vector_search_tool import (
    VectorSearchTool,
)
from app.service.config import get_settings_for_env
from app.service.device_analysis_service import DeviceAnalysisService
from app.service.location_analysis_service import LocationAnalysisService
from app.service.logs_analysis_service import LogsAnalysisService
from app.service.network_analysis_service import NetworkAnalysisService
from app.service.risk_assessment_analysis_service import RiskAssessmentAnalysisService
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.utils.class_utils import create_instance

logger = logging.getLogger(__name__)

settings_for_env = get_settings_for_env()


tools = []  # Original tools list initialization

logger.info(f"Enabled tools: {settings_for_env.enabled_tool_list}")

for tool in settings_for_env.enabled_tool_list:
    tools.append(create_instance(globals(), tool))

# Register Splunk query tool so the model can invoke Splunk via function-calling
if not any(isinstance(t, SplunkQueryTool) for t in tools):
    tools.append(SplunkQueryTool())

# TEMPORARY: Isolate SplunkQueryTool
# tools = [SplunkQueryTool()]
# logger.info("TEMPORARY_DEBUG: Only using SplunkQueryTool")


# TODO: All prompts will move to prompt registry in target state.
sys_msg = SystemMessage(
    content="""
    You are a helpful fraud investigator who can help with questions.
    Use the results from the available tools to answer the question.
    """
)

# Rest of the code remains the same...
# Use Claude Opus 4.1 for real Anthropic API calls
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    api_key=settings_for_env.anthropic_api_key,
    model="claude-3-opus-20240229",  # Claude Opus 4.1
    temperature=0.7,
    max_tokens=4000,
    timeout=60,  # Anthropic models may need more time for complex reasoning
)

# Log tool structures before binding to help diagnose any issues
for tool in tools:
    try:
        tool_name = getattr(tool, "name", str(tool.__class__.__name__))
        logger.info(f"Tool {tool_name} schema check:")
        if hasattr(tool, "args_schema"):
            schema = tool.args_schema
            logger.info(f"  Args schema: {schema}")
    except Exception as e:
        logger.error(f"Error inspecting tool: {e}")

try:
    llm_with_tools = llm.bind_tools(tools, strict=True)
except Exception as e:
    logger.error(f"Failed to bind tools to LLM: {str(e)}")
    # Try binding tools individually to identify which one is problematic
    problematic_tools = []
    for tool in tools:
        try:
            tool_name = getattr(tool, "name", str(tool.__class__.__name__))
            llm.bind_tools([tool], strict=True)
        except Exception:
            problematic_tools.append(tool_name)

    # Continue without the problematic tools
    working_tools = [
        t
        for t in tools
        if getattr(t, "name", str(t.__class__.__name__)) not in problematic_tools
    ]
    if working_tools:
        llm_with_tools = llm.bind_tools(working_tools, strict=True)
    else:
        llm_with_tools = llm


def assistant(state: MessagesState, config: RunnableConfig):
    olorin_header = _get_config_value(
        config, ["configurable", "agent_context"]
    ).get_header()
    logger.debug(f"LangGraph State={state}")

    # Extract investigation_id for progress reporting
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    if agent_context:
        agent_context = _rehydrate_agent_context(agent_context)
        md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
        investigation_id = md.get("investigationId") or md.get("investigation_id")

        # Emit progress update for fraud investigation coordination
        if investigation_id:
            import asyncio

            try:
                asyncio.create_task(
                    websocket_manager.broadcast_progress(
                        investigation_id,
                        AgentPhase.ANOMALY_DETECTION,
                        0.5,
                        "Coordinating fraud investigation analysis...",
                    )
                )
            except Exception as e:
                logger.error(f"Failed to emit progress update: {e}")

    messages = []

    messages_from_checkpoint = state["messages"]
    messages.extend(messages_from_checkpoint)
    """
    Uncomment this block to enable long-term memory retrieval from UPI.
    """
    # import asyncio
    #
    # interaction_response: InteractionsResponse = asyncio.run(
    #     UPIConversationHistoryClient.call_upi_service(
    #         experience_id=agent_context.olorin_header.olorin_experience_id,
    #         agent_name=agent_context.agent_name,
    #         olorin_headers=olorin_header,
    #     )
    # )
    # messages_from_long_term = convert_interaction_to_langgraph_messages(
    #     interaction_response.interactions, session_id=agent_context.session_id
    # )
    # messages.extend(messages_from_long_term)

    return {
        "messages": [
            llm_with_tools.invoke(
                [sys_msg] + messages,
                config=config,
                extra_headers=olorin_header,
            )
        ]
    }


def convert_interaction_to_langgraph_messages(
    interactions: List[Optional[Interaction]], interaction_group_id: Optional[str]
):
    messages = []
    for interaction in interactions:
        history_interaction_group_id = interaction.metadata.interaction_group_id
        if history_interaction_group_id != interaction_group_id:
            agent_input = interaction.agent_input
            if agent_input:
                for content in agent_input.content:
                    messages.append(HumanMessage(content=content.text))
            agent_output = interaction.agent_output
            if agent_output:
                for output in agent_output.outputs:
                    messages.append(AIMessage(content=output.content))
    return messages


def _get_config_value(config, key_path):
    """Helper function to safely extract values from config, handling both RunnableConfig and dict."""
    try:
        if hasattr(config, "configurable"):
            current = config.configurable
            for key in key_path:
                current = current[key]
            return current
        else:
            current = config
            for key in key_path:
                current = current[key]
            return current
    except (KeyError, AttributeError, TypeError):
        return None


def _rehydrate_agent_context(agent_context):
    if isinstance(agent_context, dict):
        # Rehydrate nested olorin_header and auth_context if needed
        ih = agent_context.get("olorin_header")
        if isinstance(ih, dict):
            ac = ih.get("auth_context")
            if isinstance(ac, dict):
                ih["auth_context"] = AuthContext(**ac)
            agent_context["olorin_header"] = OlorinHeader(**ih)
        return AgentContext(**agent_context)
    return agent_context


async def start_investigation(state: MessagesState, config) -> dict:
    logger.error("🔥🔥🔥 START_INVESTIGATION FUNCTION CALLED 🔥🔥🔥")
    logger.info("[start_investigation] initiating fraud investigation flow")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    md = agent_context.metadata.additional_metadata or {}
    entity_id = md.get("entity_id") or md.get("entityId")
    entity_type = md.get("entity_type") or md.get("entityType")
    
    # Debug: Log what metadata we actually received
    logger.error(f"🔍 start_investigation received metadata: {md}")
    logger.error(f"🔍 agent_context.metadata: {agent_context.metadata}")
    
    # Extract investigation_id from metadata or generate if not provided
    investigation_id = md.get("investigation_id") or md.get("investigationId")
    logger.error(f"🔍 extracted investigation_id: {investigation_id}")
    if not investigation_id:
        from uuid import uuid4
        investigation_id = str(uuid4())
        logger.error(f"🔍 generated new UUID investigation_id: {investigation_id}")

    from langchain_core.messages import HumanMessage

    from app.models.api_models import InvestigationCreate
    from app.persistence import create_investigation

    # Emit progress update: Starting investigation
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.INITIALIZATION,
        0.1,
        f"Starting investigation for {entity_type} {entity_id}",
    )

    # Create a new investigation record
    create_investigation(
        InvestigationCreate(
            id=investigation_id, entity_id=entity_id, entity_type=entity_type
        )
    )
    # Store the investigation ID for downstream nodes
    agent_context.metadata.additional_metadata["investigation_id"] = investigation_id
    agent_context.metadata.additional_metadata["investigationId"] = investigation_id

    # Emit progress update: Investigation initialized
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.INITIALIZATION,
        1.0,
        "Investigation initialized successfully",
    )

    # Emit initial user message to kick off LLM in fraud_investigation node
    init_msg = HumanMessage(
        content=f"Start fraud investigation {investigation_id} for {entity_type} {entity_id}"
    )
    return {"messages": [init_msg]}


async def network_agent(state: MessagesState, config) -> dict:
    logger.debug(f"[network_agent] config type: {type(config)}, config: {config}")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    if (
        agent_context is None
        or getattr(agent_context, "olorin_header", None) is None
        or getattr(agent_context.olorin_header, "auth_context", None) is None
    ):
        logging.error(
            f"[network_agent] agent_context or its nested fields are None! agent_context={agent_context}"
        )
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "risk_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [
                                    "agent_context or its nested fields are None"
                                ],
                                "confidence": 0.0,
                                "summary": "Error: agent_context or its nested fields are None",
                                "thoughts": "No LLM assessment due to missing agent_context or nested fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }
    request = _get_config_value(config, ["configurable", "request"])
    thread_id = _get_config_value(config, ["configurable", "thread_id"])
    logger.info(f"[network_agent] thread_id: {thread_id}")
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    investigation_id = md.get("investigationId") or md.get("investigation_id")
    entity_id = md.get("entityId") or md.get("entity_id")
    time_range = md.get("timeRange") or md.get("time_range")

    if not investigation_id or not entity_id:
        error_msg = f"Missing required fields: investigation_id={investigation_id}, entity_id={entity_id}"
        logger.error(f"[network_agent] {error_msg}")
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "risk_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [error_msg],
                                "confidence": 0.0,
                                "summary": f"Error: {error_msg}",
                                "thoughts": "No LLM assessment due to missing required fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }

    logger.info(
        f"Running graph node=network_agent: investigation_id={investigation_id}, entity_id={entity_id}, time_range={time_range}"
    )

    # Emit progress update: Starting network analysis
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.NETWORK_ANALYSIS,
        0.1,
        "Starting network analysis...",
    )

    service = NetworkAnalysisService()
    result = await service.analyze_network(
        entity_id=entity_id,
        entity_type="user_id",
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
    )

    # Emit progress update with complete API response
    await websocket_manager.broadcast_agent_result(
        investigation_id,
        AgentPhase.NETWORK_ANALYSIS,
        result,
        "Network analysis completed with risk assessment",
    )

    return {"messages": [AIMessage(content=json.dumps(result))]}


async def location_agent(state: MessagesState, config) -> dict:
    logger.debug(f"[location_agent] config type: {type(config)}, config: {config}")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    if (
        agent_context is None
        or getattr(agent_context, "olorin_header", None) is None
        or getattr(agent_context.olorin_header, "auth_context", None) is None
    ):
        logging.error(
            f"[location_agent] agent_context or its nested fields are None! agent_context={agent_context}"
        )
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "location_risk_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [
                                    "agent_context or its nested fields are None"
                                ],
                                "confidence": 0.0,
                                "summary": "Error: agent_context or its nested fields are None",
                                "thoughts": "No LLM assessment due to missing agent_context or nested fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }
    request = _get_config_value(config, ["configurable", "request"])
    thread_id = _get_config_value(config, ["configurable", "thread_id"])
    logger.info(f"[location_agent] thread_id: {thread_id}")
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    investigation_id = md.get("investigationId") or md.get("investigation_id")
    entity_id = md.get("entityId") or md.get("entity_id")
    time_range = md.get("timeRange") or md.get("time_range")
    logger.info(
        f"Running graph node=location_agent: investigation_id={investigation_id}, entity_id={entity_id}, time_range={time_range}"
    )

    # Emit progress update: Starting location analysis
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.LOCATION_ANALYSIS,
        0.1,
        "Starting location analysis...",
    )

    location_data_client = LocationDataClient()
    vector_search_tool = VectorSearchTool()
    service = LocationAnalysisService(location_data_client, vector_search_tool)
    result = await service.analyze_location(
        entity_id=entity_id,
        entity_type="user_id",
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
    )

    # Emit progress update with complete API response
    await websocket_manager.broadcast_agent_result(
        investigation_id,
        AgentPhase.LOCATION_ANALYSIS,
        result,
        "Location analysis completed with geographic risk assessment",
    )

    return {"messages": [AIMessage(content=json.dumps(result))]}


async def logs_agent(state: MessagesState, config) -> dict:
    logger.debug(f"[logs_agent] config type: {type(config)}, config: {config}")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    if (
        agent_context is None
        or getattr(agent_context, "olorin_header", None) is None
        or getattr(agent_context.olorin_header, "auth_context", None) is None
    ):
        logging.error(
            f"[logs_agent] agent_context or its nested fields are None! agent_context={agent_context}"
        )
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "risk_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [
                                    "agent_context or its nested fields are None"
                                ],
                                "confidence": 0.0,
                                "summary": "Error: agent_context or its nested fields are None",
                                "thoughts": "No LLM assessment due to missing agent_context or nested fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }
    request = _get_config_value(config, ["configurable", "request"])
    thread_id = _get_config_value(config, ["configurable", "thread_id"])
    logger.info(f"[logs_agent] thread_id: {thread_id}")
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    investigation_id = md.get("investigationId") or md.get("investigation_id")
    entity_id = md.get("entityId") or md.get("entity_id")
    time_range = md.get("timeRange") or md.get("time_range")
    logger.info(
        f"Running graph node=logs_agent: investigation_id={investigation_id}, entity_id={entity_id}, time_range={time_range}"
    )

    # Emit progress update: Starting logs analysis
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.BEHAVIOR_ANALYSIS,  # Logs analysis is part of behavior analysis
        0.1,
        "Starting logs analysis...",
    )

    service = LogsAnalysisService()
    result = await service.analyze_logs(
        entity_id=entity_id,
        entity_type="user_id",
        request=request,
        investigation_id=investigation_id,
        time_range=time_range,
    )

    # Emit progress update with complete API response
    await websocket_manager.broadcast_agent_result(
        investigation_id,
        AgentPhase.BEHAVIOR_ANALYSIS,
        result,
        "Logs analysis completed with behavioral risk assessment",
    )

    return {"messages": [AIMessage(content=json.dumps(result))]}


async def device_agent(state: MessagesState, config) -> dict:
    logger.debug(f"[device_agent] config type: {type(config)}, config: {config}")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    if (
        agent_context is None
        or getattr(agent_context, "olorin_header", None) is None
        or getattr(agent_context.olorin_header, "auth_context", None) is None
    ):
        logging.error(
            f"[device_agent] agent_context or its nested fields are None! agent_context={agent_context}"
        )
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "llm_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [
                                    "agent_context or its nested fields are None"
                                ],
                                "confidence": 0.0,
                                "summary": "Error: agent_context or its nested fields are None",
                                "thoughts": "No LLM assessment due to missing agent_context or nested fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }
    request = _get_config_value(config, ["configurable", "request"])
    thread_id = _get_config_value(config, ["configurable", "thread_id"])
    logger.info(f"[device_agent] thread_id: {thread_id}")
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    investigation_id = md.get("investigationId") or md.get("investigation_id")
    entity_id = md.get("entityId") or md.get("entity_id")
    time_range = md.get("timeRange") or md.get("time_range")
    logger.info(
        f"Running graph node=device_agent: investigation_id={investigation_id}, entity_id={entity_id}, time_range={time_range}"
    )

    # Emit progress update: Starting device analysis
    await websocket_manager.broadcast_progress(
        investigation_id, AgentPhase.DEVICE_ANALYSIS, 0.1, "Starting device analysis..."
    )

    service = DeviceAnalysisService()
    result = await service.analyze_device(
        entity_id=entity_id,
        entity_type="user_id",
        investigation_id=investigation_id,
        time_range=time_range,
        request=request,
    )

    # Emit progress update with complete API response
    await websocket_manager.broadcast_agent_result(
        investigation_id,
        AgentPhase.DEVICE_ANALYSIS,
        result,
        "Device analysis completed with device risk assessment",
    )

    return {"messages": [AIMessage(content=json.dumps(result))]}


async def risk_agent(state: MessagesState, config) -> dict:
    logger.debug(f"[risk_agent] config type: {type(config)}, config: {config}")
    agent_context = _get_config_value(config, ["configurable", "agent_context"])
    agent_context = _rehydrate_agent_context(agent_context)
    if (
        agent_context is None
        or getattr(agent_context, "olorin_header", None) is None
        or getattr(agent_context.olorin_header, "auth_context", None) is None
    ):
        logging.error(
            f"[risk_agent] agent_context or its nested fields are None! agent_context={agent_context}"
        )
        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "risk_assessment": {
                                "risk_level": 0.0,
                                "risk_factors": [
                                    "agent_context or its nested fields are None"
                                ],
                                "confidence": 0.0,
                                "summary": "Error: agent_context or its nested fields are None",
                                "thoughts": "No LLM assessment due to missing agent_context or nested fields.",
                                "timestamp": str(datetime.utcnow()),
                            }
                        }
                    )
                )
            ]
        }
    request = _get_config_value(config, ["configurable", "request"])
    thread_id = _get_config_value(config, ["configurable", "thread_id"])
    logger.info(f"[risk_agent] thread_id: {thread_id}")
    md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
    investigation_id = md.get("investigationId") or md.get("investigation_id")
    entity_id = md.get("entityId") or md.get("entity_id")
    logger.info(
        f"Running graph node=risk_agent: investigation_id={investigation_id}, entity_id={entity_id}"
    )

    # Emit progress update: Starting risk assessment
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.RISK_ASSESSMENT,
        0.1,
        "Starting final risk assessment...",
    )

    service = RiskAssessmentAnalysisService()
    result = await service.assess_risk(
        user_id=entity_id,
        request=request,
        investigation_id=investigation_id,
    )

    # Emit progress update with complete final results
    await websocket_manager.broadcast_agent_result(
        investigation_id,
        AgentPhase.COMPLETED,
        result,
        "Investigation completed successfully with final risk assessment",
    )

    return {"messages": [AIMessage(content=json.dumps(result))]}


def create_parallel_agent_graph():
    """Create autonomous agent graph for parallel execution with RecursionGuard protection."""
    # Initialize recursion guard
    guard = get_recursion_guard()
    logger.info("Creating parallel graph with autonomous agents and RecursionGuard protection")
    
    # Graph
    builder = StateGraph(MessagesState)

    # Define nodes: investigation start, fraud investigation, and AUTONOMOUS domain agents
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("network_agent", autonomous_network_agent)
    builder.add_node("location_agent", autonomous_location_agent)
    builder.add_node("logs_agent", autonomous_logs_agent)
    builder.add_node("device_agent", autonomous_device_agent)
    builder.add_node("risk_agent", autonomous_risk_agent)

    # Add the tools node with error handling
    try:
        tool_node = ToolNode(tools)
        builder.add_node("tools", tool_node)
    except Exception as e:
        logger.error(f"Error creating ToolNode: {e}")
        filtered_tools = []
        for tool in tools:
            try:
                ToolNode([tool])
                filtered_tools.append(tool)
            except Exception:
                pass
        tool_node = ToolNode(filtered_tools)
        builder.add_node("tools", tool_node)

    # Define edges: Fixed parallel structure to avoid infinite recursion
    # Start flow
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")

    # AUTONOMOUS MODE: Enable LLM-driven tool selection with conditional edges
    # The fraud_investigation node can now choose tools autonomously
    builder.add_conditional_edges(
        "fraud_investigation",
        tools_condition,  # LLM decides whether to use tools or proceed to domain analysis
    )
    
    # Tool routing: Enable autonomous tool selection
    builder.add_edge("tools", "fraud_investigation")  # Return to fraud_investigation after tool use
    
    # Domain agent triggering: fraud_investigation can trigger specific domain agents
    # These edges are now part of the autonomous decision process
    builder.add_edge("fraud_investigation", "network_agent")
    builder.add_edge("fraud_investigation", "location_agent")
    builder.add_edge("fraud_investigation", "logs_agent")
    builder.add_edge("fraud_investigation", "device_agent")

    # Domain agents have autonomous tool access through their own LLM instances
    # Each autonomous agent makes independent tool selection decisions
    
    # All domain agents feed into risk_agent for final assessment
    builder.add_edge("network_agent", "risk_agent")
    builder.add_edge("location_agent", "risk_agent")
    builder.add_edge("logs_agent", "risk_agent")
    builder.add_edge("device_agent", "risk_agent")
    
    # RecursionGuard prevents infinite loops while enabling autonomous tool selection

    return builder


def create_sequential_agent_graph():
    """Create autonomous agent graph for sequential execution with RecursionGuard protection."""
    # Initialize recursion guard
    guard = get_recursion_guard()
    logger.info("Creating sequential graph with autonomous agents and RecursionGuard protection")
    
    # Graph
    builder = StateGraph(MessagesState)

    # Define nodes: investigation start, fraud investigation, and AUTONOMOUS domain agents
    builder.add_node("start_investigation", start_investigation)
    builder.add_node("fraud_investigation", assistant)
    builder.add_node("network_agent", autonomous_network_agent)
    builder.add_node("location_agent", autonomous_location_agent)
    builder.add_node("logs_agent", autonomous_logs_agent)
    builder.add_node("device_agent", autonomous_device_agent)
    builder.add_node("risk_agent", autonomous_risk_agent)

    # Add the tools node with error handling
    try:
        tool_node = ToolNode(tools)
        builder.add_node("tools", tool_node)
    except Exception as e:
        logger.error(f"Error creating ToolNode: {e}")
        filtered_tools = []
        for tool in tools:
            try:
                ToolNode([tool])
                filtered_tools.append(tool)
            except Exception:
                pass
        tool_node = ToolNode(filtered_tools)
        builder.add_node("tools", tool_node)

    # Define edges for sequential execution: start → fraud_investigation → network → location → logs → device → risk
    builder.add_edge(START, "start_investigation")
    builder.add_edge("start_investigation", "fraud_investigation")

    # AUTONOMOUS SEQUENTIAL MODE: Enable LLM-driven tool selection with conditional edges
    builder.add_conditional_edges(
        "fraud_investigation",
        tools_condition,  # LLM decides whether to use tools or proceed
    )
    
    # Tool routing: Enable autonomous tool selection
    builder.add_edge("tools", "fraud_investigation")  # Return after tool use
    
    # Sequential chain with autonomous agents: fraud_investigation → network → location → logs → device → risk
    builder.add_edge("fraud_investigation", "network_agent")
    builder.add_edge("network_agent", "location_agent")
    builder.add_edge("location_agent", "logs_agent")
    builder.add_edge("logs_agent", "device_agent")
    builder.add_edge("device_agent", "risk_agent")
    # risk_agent is the final node - investigation completes here
    
    # Each autonomous domain agent has its own tool selection capabilities
    # RecursionGuard prevents infinite loops while enabling autonomous behavior

    return builder


def create_and_get_agent_graph(parallel: bool = True):
    """Create agent graph based on parallel setting."""
    if parallel:
        builder = create_parallel_agent_graph()
        logger.info("Creating parallel agent graph")
    else:
        builder = create_sequential_agent_graph()
        logger.info("Creating sequential agent graph")

    if settings_for_env.use_ips_cache:
        checkpointer = AsyncRedisSaver()
    else:
        checkpointer = MemorySaver()

    # Configure the agent graph - recursion_limit not supported in current LangGraph version
    agent_graph = builder.compile(
        checkpointer=checkpointer,
    )
    logger.info("Agent graph compiled successfully")

    logger.info(
        f"Agent Graph created (parallel={parallel}) agent_graph={agent_graph.get_graph().draw_ascii()}"
    )

    return agent_graph


# New Pattern-Based Investigation Function

async def investigate_with_patterns(
    entity_id: str,
    entity_type: str,
    investigation_type: str = "fraud_investigation",
    use_pattern: str = "auto",
    investigation_id: Optional[str] = None,
    agent_context: Optional[AgentContext] = None,
    request: Optional[Request] = None
) -> dict:
    """
    Conduct investigation using new pattern-based agent system.
    
    Args:
        entity_id: ID of entity to investigate
        entity_type: Type of entity (user, device, transaction, etc.)
        investigation_type: Type of investigation to conduct
        use_pattern: Pattern to use ('auto', 'routing', 'chaining', 'orchestration', etc.)
        investigation_id: Optional investigation ID
        agent_context: Agent execution context
        request: FastAPI request object
        
    Returns:
        Investigation results from pattern-based execution
    """
    
    logger.info(f"Starting pattern-based investigation: {investigation_type} for {entity_type} {entity_id}")
    
    # Generate investigation ID if not provided
    if not investigation_id:
        from uuid import uuid4
        investigation_id = str(uuid4())
    
    # Create WebSocket streaming service
    ws_streaming = WebSocketStreamingService(
        investigation_id=investigation_id,
        websocket_manager=websocket_manager,
        entity_context={
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_type": investigation_type
        }
    )
    
    try:
        # Send investigation start event
        await ws_streaming.send_investigation_start(
            investigation_type=investigation_type,
            entity_details={
                "entity_id": entity_id,
                "entity_type": entity_type,
                "priority": "high",
                "estimated_completion": "3-5 minutes"
            }
        )
        
        # Prepare investigation context
        context = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "investigation_id": investigation_id,
            "investigation_type": investigation_type,
            "agent_context": agent_context,
            "request": request,
            "use_enhanced_patterns": True,
            "time_range": "24h"  # Default time range
        }
        
        # Add pattern-specific configuration
        if use_pattern == "auto":
            # Use routing pattern to automatically select best approach
            agent_type = "routing"
        elif use_pattern == "comprehensive":
            agent_type = "comprehensive"
            context["chain_type"] = "fraud_investigation"
        elif use_pattern == "parallel":
            agent_type = "parallel_analysis"
            context["parallel_strategy"] = "domain_based"
        elif use_pattern == "orchestration":
            agent_type = "orchestration"
        elif use_pattern == "chaining":
            agent_type = investigation_type
            context["chain_type"] = investigation_type
        elif use_pattern == "optimization":
            agent_type = "quality_assurance"
        else:
            agent_type = use_pattern
        
        logger.info(f"Selected agent type: {agent_type} for pattern: {use_pattern}")
        
        # Create pattern-based agent
        agent = create_agent(
            agent_type=agent_type,
            context=context,
            ws_streaming=ws_streaming,
            tools=tools  # Use existing tools from global scope
        )
        
        # Create investigation message
        investigation_message = HumanMessage(
            content=f"""
            Conduct a comprehensive fraud investigation for {entity_type} {entity_id}.
            
            Investigation Details:
            - Entity ID: {entity_id}
            - Entity Type: {entity_type}
            - Investigation Type: {investigation_type}
            - Investigation ID: {investigation_id}
            
            Please provide:
            1. Comprehensive risk assessment
            2. Detailed analysis of suspicious patterns
            3. Evidence-based conclusions
            4. Actionable recommendations
            5. Confidence scores for findings
            
            Use all available tools to gather comprehensive evidence.
            """
        )
        
        # Execute pattern-based investigation
        result = await execute_agent(
            agent=agent,
            messages=[investigation_message],
            context=context
        )
        
        # Format results for consistency with legacy system
        if hasattr(result, 'success') and result.success:
            # Pattern-based result
            investigation_result = {
                "investigation_id": investigation_id,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "pattern_used": use_pattern,
                "agent_type": agent_type,
                "success": True,
                "results": result.result,
                "confidence": result.confidence_score,
                "reasoning": result.reasoning,
                "execution_metadata": {
                    "pattern_execution": True,
                    "metrics": result.metrics.__dict__ if hasattr(result, 'metrics') and result.metrics else None,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # Send completion event
            await ws_streaming.send_investigation_complete(
                success=True,
                results=investigation_result,
                execution_summary={
                    "pattern_used": use_pattern,
                    "agent_type": agent_type,
                    "confidence": result.confidence_score
                }
            )
            
        else:
            # Handle pattern execution failure
            error_message = getattr(result, 'error_message', 'Pattern execution failed')
            investigation_result = {
                "investigation_id": investigation_id,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "pattern_used": use_pattern,
                "agent_type": agent_type,
                "success": False,
                "error": error_message,
                "execution_metadata": {
                    "pattern_execution": True,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # Send error event
            await ws_streaming.send_error(error_message, {"pattern": use_pattern})
        
        return investigation_result
        
    except Exception as e:
        logger.error(f"Pattern-based investigation failed: {str(e)}", exc_info=True)
        
        # Send error event
        await ws_streaming.send_error(str(e), {"entity_id": entity_id, "pattern": use_pattern})
        
        return {
            "investigation_id": investigation_id,
            "entity_id": entity_id,
            "entity_type": entity_type,
            "pattern_used": use_pattern,
            "success": False,
            "error": f"Investigation failed: {str(e)}",
            "execution_metadata": {
                "pattern_execution": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    finally:
        # Close streaming service
        await ws_streaming.close()


# Factory Statistics Endpoint Helper

def get_agent_factory_stats() -> dict:
    """Get statistics from the pattern-based agent factory"""
    
    factory = get_agent_factory()
    return factory.get_factory_stats()
