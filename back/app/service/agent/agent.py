import logging
from typing import List, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from app.adapters.upi_client import UPIConversationHistoryClient
from app.models.upi_response import Interaction, InteractionsResponse
from app.persistence.async_ips_redis import AsyncRedisSaver
from app.service.agent.tools.cdc_tool.cdc_tool import CdcCompanyTool, CdcUserTool
from app.service.agent.tools.oii_tool.oii_tool import OIITool
from app.service.agent.tools.qb_tool.customer_tools import ListCustomersTool
from app.service.agent.tools.retriever_tool.retriever_tool import (
    QBRetrieverTool,
    TTRetrieverTool,
)
from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
from app.service.config import get_settings_for_env
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
# o1 only support temperature = 1
llm = ChatOpenAI(
    api_key="anything",
    model="xxxx",
    base_url=settings_for_env.llm_base_url,
    temperature=1,
    max_completion_tokens=10000,
    response_format={"type": "json_object"},
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
    from app.models.agent_context import AgentContext

    agent_context: AgentContext = config["configurable"]["agent_context"]
    intuit_header = agent_context.get_header()
    logger.debug(f"LangGraph State={state}")

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
    #         experience_id=agent_context.intuit_header.intuit_experience_id,
    #         agent_name=agent_context.agent_name,
    #         intuit_headers=intuit_header,
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
                extra_headers=intuit_header,
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


def create_and_get_agent_graph():
    # Graph
    builder = StateGraph(MessagesState)

    # Define nodes: these do the work
    builder.add_node("assistant", assistant)

    # Add the tools node with error handling
    try:
        tool_node = ToolNode(tools)
        builder.add_node("tools", tool_node)
    except Exception as e:
        logger.error(f"Error creating ToolNode: {e}")
        # Create a filtered list of tools that can be successfully processed
        filtered_tools = []
        for tool in tools:
            try:
                # Try to create a ToolNode with just this one tool
                ToolNode([tool])
                # If successful, add to filtered tools
                filtered_tools.append(tool)
            except Exception:
                pass

        # Create a ToolNode with only the working tools
        tool_node = ToolNode(filtered_tools)
        builder.add_node("tools", tool_node)

    # Define edges: these determine how the control flow moves
    builder.add_edge(START, "assistant")
    builder.add_conditional_edges(
        "assistant",
        # If the latest message (result) from assistant is a tool call -> tools_condition routes to tools
        # If the latest message (result) from assistant is a not a tool call -> tools_condition routes to END
        tools_condition,
    )
    builder.add_edge("tools", "assistant")
    if settings_for_env.use_ips_cache:
        checkpointer = AsyncRedisSaver()
    else:
        checkpointer = MemorySaver()
    agent_graph = builder.compile(checkpointer=checkpointer)

    logger.info(
        f"Agent Graph created agent_graph={agent_graph.get_graph().draw_ascii()}"
    )

    return agent_graph
