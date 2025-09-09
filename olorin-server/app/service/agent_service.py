import logging
from app.service.logging import get_bridge_logger
import os

from fastapi import Request
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

try:
    from langfuse.callback import CallbackHandler
except ImportError:
    CallbackHandler = None
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
from app.utils.firebase_secrets import get_app_secret

logger = get_bridge_logger(__name__)

settings_for_env = get_settings_for_env()


async def ainvoke_agent(request: Request, agent_context: AgentContext) -> (str, str):
    messages = [HumanMessage(content=agent_context.input)]

    env = os.getenv("APP_ENV", "local")

    if settings_for_env.enable_langfuse and CallbackHandler:
        # Handler for setting up langfuse for tracing
        langfuse_handler = CallbackHandler(
            public_key=get_app_secret(settings_for_env.langfuse_public_key),
            secret_key=get_app_secret(settings_for_env.langfuse_secret_key),
            host=settings_for_env.langfuse_host,
            tags=[settings_for_env.app_id, env],
        )

        runnable_config = RunnableConfig(
            configurable={
                "agent_context": agent_context,
                "thread_id": agent_context.thread_id,
                "request": request,  # Add request to config for graph nodes
            },
            callbacks=[langfuse_handler],
        )

    else:
        logger.info(f"configuring runnable_config without langfuse_handler callbacks")
        runnable_config = RunnableConfig(
            configurable={
                "agent_context": agent_context,
                "thread_id": agent_context.thread_id,
                "request": request,  # Add request to config for graph nodes
            },
        )

    logger.debug(
        f"Invoking LangGraph with agent_context={agent_context} with enable_langfuse={settings_for_env.enable_langfuse}"
    )
    logger.info(
        f"Invoking LangGraph with enable_langfuse={settings_for_env.enable_langfuse}"
    )

    try:
        # Determine which graph to use based on investigation settings
        from app.service.websocket_manager import websocket_manager

        # Extract investigation_id and entity info from agent_context metadata
        investigation_id = None
        entity_type = "ip_address"  # default
        if hasattr(agent_context, "metadata") and agent_context.metadata:
            md = getattr(agent_context.metadata, "additional_metadata", {}) or {}
            investigation_id = md.get("investigationId") or md.get("investigation_id")
            entity_type = md.get("entity_type") or entity_type

        # Get parallel setting for this investigation (defaults to False - sequential)
        use_parallel = False
        if investigation_id:
            use_parallel = websocket_manager.get_investigation_parallel_setting(
                investigation_id
            )

        # AUTONOMOUS MODE: Enable parallel with recursion guard protection
        # Autonomous agents use RecursionGuard to prevent infinite loops
        use_parallel = True  # Re-enabled for autonomous investigation mode

        # 🧠 HYBRID INTELLIGENCE GRAPH SELECTION
        # Use hybrid system if available, otherwise fallback to traditional graphs
        if investigation_id:
            # Try hybrid graph selection first
            try:
                from app.service.agent.orchestration.hybrid.migration_utilities import get_investigation_graph
                logger.info(f"🧠 Using Hybrid Intelligence Graph selection for investigation {investigation_id}")
                graph = await get_investigation_graph(
                    investigation_id=investigation_id,
                    entity_type=entity_type
                )
            except ImportError:
                logger.info("🧠 Hybrid system not available, using traditional graph selection")
                # Fall through to traditional selection
                graph = None
            except Exception as e:
                logger.warning(f"🧠 Hybrid graph selection failed: {e}, falling back to traditional selection")
                # Fall through to traditional selection
                graph = None
        else:
            logger.info("🧠 No investigation_id provided, using traditional graph selection")
            graph = None

        # Traditional graph selection as fallback
        if graph is None:
            if (
                request is not None
                and hasattr(request, "app")
                and hasattr(request.app, "state")
            ):
                graph = (
                    request.app.state.graph_parallel
                    if use_parallel
                    else request.app.state.graph_sequential
                )
            else:
                # Fallback: create graph directly when request is None (e.g., from LLM services)
                from app.service.agent.orchestration import create_and_get_agent_graph
                
                graph = await create_and_get_agent_graph(
                    parallel=use_parallel,
                    investigation_id=investigation_id,
                    entity_type=entity_type
                )

        logger.info(
            f"Using {'parallel' if use_parallel else 'sequential'} graph for investigation {investigation_id}"
        )

        result = await graph.ainvoke({"messages": messages}, config=runnable_config)
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
        # Handle LLM API errors gracefully with clean logging
        if "context_length_exceeded" in str(ex) or "maximum context length" in str(ex) or "token limit" in str(ex).lower():
            logger.error(f"❌ LLM context length exceeded in agent graph invocation")
            logger.error(f"   Error: {str(ex)}")
            logger.error(f"   Context info: {len(messages)} messages, estimated {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))} characters")
            logger.error(f"   Investigation ID: {investigation_id or 'unknown'}")
            logger.error(f"   Agent cannot continue - fix context length issue")
            raise AgentInvokeException(f"Context length exceeded: {str(ex)}")
            
        elif "not_found_error" in str(ex).lower() or "notfounderror" in str(type(ex)).lower() or "model:" in str(ex).lower():
            logger.error(f"❌ LLM model not found in agent graph invocation")
            logger.error(f"   Error type: {type(ex).__name__}")
            logger.error(f"   Error details: {str(ex)}")
            logger.error(f"   Investigation ID: {investigation_id or 'unknown'}")
            logger.error(f"   Agent cannot continue - fix model configuration (check model name/availability)")
            raise AgentInvokeException(f"Model not found: {str(ex)}")
            
        elif any(error_type in str(type(ex)).lower() for error_type in ["badrequest", "apierror", "ratelimit"]) or any(provider in str(ex).lower() for provider in ["openai", "anthropic", "google"]):
            logger.error(f"❌ LLM API error in agent graph invocation")
            logger.error(f"   Error type: {type(ex).__name__}")
            logger.error(f"   Error details: {str(ex)}")
            logger.error(f"   Investigation ID: {investigation_id or 'unknown'}")
            logger.error(f"   Agent cannot continue - fix API configuration")
            raise AgentInvokeException(f"API error: {type(ex).__name__} - {str(ex)}")
            
        else:
            logger.error(f"❌ Unexpected error in agent graph invocation")
            logger.error(f"   Error type: {type(ex).__name__}")
            logger.error(f"   Error details: {str(ex)}")
            logger.error(f"   Investigation ID: {investigation_id or 'unknown'}")
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
