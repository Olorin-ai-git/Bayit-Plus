import logging
import os

from fastapi import Request
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langfuse.callback import CallbackHandler
from openai import (
    APIConnectionError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
)

from app.models.agent_context import AgentContext
from app.service.config import get_settings_for_env
from app.service.error_handling import (
    AgentInvokeException,
    AuthorizationError,
    ClientException,
)

logger = logging.getLogger(__name__)

settings_for_env = get_settings_for_env()


async def ainvoke_agent(request: Request, agent_context: AgentContext) -> (str, str):
    messages = [HumanMessage(content=agent_context.input)]

    env = os.getenv("APP_ENV", "local")

    if settings_for_env.enable_langfuse:
        """Handler for setting up langfuse for tracing"""
        langfuse_handler = CallbackHandler(
            public_key=settings_for_env.langfuse_public_key,
            secret_key=settings_for_env.langfuse_secret_key,
            host=settings_for_env.langfuse_host,
            tags=[settings_for_env.app_id, env],
        )

        runnable_config = RunnableConfig(
            configurable={
                "agent_context": agent_context,
                "thread_id": agent_context.thread_id,
            },
            callbacks=[langfuse_handler],
        )

    else:
        logger.info(f"configuring runnable_config without langfuse_handler callbacks")
        runnable_config = RunnableConfig(
            configurable={
                "agent_context": agent_context,
                "thread_id": agent_context.thread_id,
            },
        )

    logger.debug(
        f"Invoking LangGraph with agent_context={agent_context} with enable_langfuse={settings_for_env.enable_langfuse}"
    )
    logger.info(
        f"Invoking LangGraph with enable_langfuse={settings_for_env.enable_langfuse}"
    )

    try:
        result = await request.app.state.graph.ainvoke(
            {"messages": messages}, config=runnable_config
        )
        if isinstance(result, tuple) and len(result) == 2:
            output_content, trace_id = result
        else:
            output_content = result
            trace_id = None
    except AuthenticationError as ex:
        logger.exception(f"Client Error: {ex}")
        raise AuthorizationError(ex)
    except PermissionDeniedError as ex:
        logger.exception(f"Client Error: {ex}")
        raise ClientException(ex.status_code, ex.message)
    except RateLimitError as ex:
        logger.exception(f"Client Error: {ex}")
        raise ClientException(ex.status_code, ex.message)
    except APIConnectionError as ex:
        logger.exception(f"API Connection Error: {ex}")
        raise AgentInvokeException(ex)
    except Exception as ex:
        logger.exception(f"Unknown Error: {ex}")
        raise AgentInvokeException(ex)

    logger.debug(
        f"Agent Response with output_content={output_content} and langfuse trace_id={trace_id}"
    )
    logger.info(f"Agent Response received with langfuse trace_id={trace_id}")

    # Robust: handle both dict with 'messages' and other output types
    if isinstance(output_content, dict) and "messages" in output_content:
        return output_content["messages"][-1].content, trace_id
    else:
        return output_content, trace_id
