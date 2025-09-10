import logging
from app.service.logging import get_bridge_logger
import os
import time
from typing import Dict, Any

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
from app.service.agent.core import extract_metadata

logger = get_bridge_logger(__name__)

# Production safety: Valid entity types for input validation
VALID_ENTITY_TYPES = {
    "ip_address", "user_id", "device_id", "email", "transaction_id", 
    "account_id", "session_id", "phone_number"
}

settings_for_env = get_settings_for_env()


def _log_graph_usage_metrics(
    graph_type: str,
    investigation_id: str,
    entity_type: str,
    duration_ms: float,
    success: bool,
    error_type: str = None,
    fallback_reason: str = None
) -> None:
    """
    Production monitoring: Log graph usage metrics for observability.
    
    Args:
        graph_type: "hybrid" or "traditional"
        investigation_id: Investigation identifier
        entity_type: Type of entity being investigated
        duration_ms: Time taken for graph selection/creation
        success: Whether the operation succeeded
        error_type: Type of error if failed
        fallback_reason: Reason for fallback if applicable
    """
    # Structured logging for production monitoring
    metrics = {
        "event_type": "graph_usage_metrics",
        "graph_type": graph_type,
        "investigation_id": investigation_id,
        "entity_type": entity_type,
        "duration_ms": duration_ms,
        "success": success,
        "timestamp": time.time() * 1000,
    }
    
    if error_type:
        metrics["error_type"] = error_type
    if fallback_reason:
        metrics["fallback_reason"] = fallback_reason
    
    # Log as structured JSON for monitoring systems
    logger.info(f"METRICS: {metrics}")
    
    # Additional specific logging for alerting
    if graph_type == "hybrid":
        if success:
            logger.info(f"✅ HYBRID_GRAPH_SUCCESS: {investigation_id} completed in {duration_ms:.1f}ms")
        else:
            logger.warning(f"❌ HYBRID_GRAPH_FAILURE: {investigation_id} failed after {duration_ms:.1f}ms - {error_type}")
    else:
        logger.info(f"📋 TRADITIONAL_GRAPH_USAGE: {investigation_id} (type: {entity_type})")


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

        # Check if we're using hybrid graph and create appropriate initial state
        start_time = time.time() * 1000  # Start timing for metrics
        graph_type = "traditional"  # Default assumption
        
        try:
            from app.service.agent.orchestration.hybrid.migration_utilities import get_feature_flags
            feature_flags = get_feature_flags()
            
            # Production safety: Validate investigation access authorization
            if investigation_id and request:
                # Basic validation: ensure investigation_id is properly formatted
                if not isinstance(investigation_id, str) or len(investigation_id.strip()) == 0:
                    logger.warning(f"Invalid investigation_id format: {investigation_id}")
                    raise ValueError("Invalid investigation_id format")
                
                # Check for basic auth header presence (service mesh should handle detailed auth)
                auth_headers = ['authorization', 'x-user-id', 'x-api-key', 'x-forwarded-user']
                has_auth = any(header in request.headers for header in auth_headers)
                if not has_auth:
                    logger.warning(f"No authentication headers found for investigation: {investigation_id}")
                    # Note: In production, this might need to be more restrictive
                    # For now, log the concern but don't block (service mesh handles auth)
            
            is_hybrid_graph = investigation_id and feature_flags.is_enabled("hybrid_graph_v1", investigation_id)
            
            if is_hybrid_graph:
                graph_type = "hybrid"  # Update for metrics
                
                # Create proper hybrid state for hybrid graph
                from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state
                
                # Extract entity info from agent context or use defaults with validation
                entity_id = investigation_id  # Use investigation_id as entity_id fallback
                entity_type_candidate = entity_type if 'entity_type' in locals() else "ip_address"
                
                # Try to extract from agent context if available
                if agent_context and hasattr(agent_context, 'metadata'):
                    metadata = extract_metadata(agent_context)
                    if metadata:  # Ensure metadata is not None
                        entity_id = metadata.get("entity_id") or metadata.get("entityId") or investigation_id
                        entity_type_candidate = metadata.get("entity_type") or metadata.get("entityType") or "ip_address"
                
                # Production safety: Validate entity parameters
                if not isinstance(entity_id, str) or not entity_id.strip():
                    raise ValueError(f"Invalid entity_id: {entity_id} - must be non-empty string")
                
                # Validate entity_type against allowed values
                if entity_type_candidate not in VALID_ENTITY_TYPES:
                    logger.warning(f"Invalid entity_type '{entity_type_candidate}', defaulting to 'ip_address'")
                    entity_type_candidate = "ip_address"
                
                # Sanitize entity_id (basic safety checks)
                entity_id = entity_id.strip()[:200]  # Limit length to prevent memory issues
                
                logger.info(f"🧠 Creating hybrid state: entity_id={entity_id}, entity_type={entity_type_candidate}")
                
                initial_state = create_hybrid_initial_state(
                    investigation_id=investigation_id,
                    entity_id=entity_id,
                    entity_type=entity_type_candidate,
                    parallel_execution=use_parallel,
                    max_tools=min(52, 100)  # Production safety: Cap max tools
                )
                
                # Validate hybrid state was created properly
                if not isinstance(initial_state, dict) or "decision_audit_trail" not in initial_state:
                    raise ValueError("Hybrid state creation failed - missing required fields")
                
                # Add messages to the hybrid state
                initial_state["messages"] = messages
                
                logger.info("✅ Hybrid state created successfully")
                
                # Log successful hybrid graph usage
                duration = time.time() * 1000 - start_time
                _log_graph_usage_metrics(
                    graph_type=graph_type,
                    investigation_id=investigation_id or "unknown",
                    entity_type=entity_type_candidate,
                    duration_ms=duration,
                    success=True
                )
            else:
                # Use simple state for traditional graphs
                initial_state = {"messages": messages}
                logger.info("📋 Using traditional graph state")
                
                # Log traditional graph usage
                duration = time.time() * 1000 - start_time
                _log_graph_usage_metrics(
                    graph_type=graph_type,
                    investigation_id=investigation_id or "unknown",
                    entity_type="unknown",
                    duration_ms=duration,
                    success=True
                )
                
        except (ImportError, AttributeError) as e:
            # Expected errors: hybrid system not available or configuration issues
            duration = time.time() * 1000 - start_time
            logger.warning(f"Hybrid state unavailable, using traditional fallback: {str(e)}")
            initial_state = {"messages": messages}
            
            # Log fallback with metrics
            _log_graph_usage_metrics(
                graph_type="traditional",
                investigation_id=investigation_id or "unknown",
                entity_type="unknown",
                duration_ms=duration,
                success=True,
                fallback_reason="hybrid_system_unavailable"
            )
        except (ValueError, TypeError) as e:
            # Input validation errors: log as warning and fallback
            duration = time.time() * 1000 - start_time
            logger.warning(f"Hybrid state validation failed, using traditional fallback: {str(e)}")
            initial_state = {"messages": messages}
            
            # Log validation failure with metrics
            _log_graph_usage_metrics(
                graph_type="traditional",
                investigation_id=investigation_id or "unknown",
                entity_type="unknown",
                duration_ms=duration,
                success=True,
                fallback_reason="validation_failed"
            )
        except Exception as e:
            # Unexpected errors: fail fast and loud to prevent silent failures
            duration = time.time() * 1000 - start_time
            logger.error(f"CRITICAL: Unexpected error in state creation: {str(e)}")
            logger.error(f"Investigation ID: {investigation_id}")
            logger.error(f"Entity context available: {agent_context is not None}")
            
            # Log critical failure with metrics
            _log_graph_usage_metrics(
                graph_type=graph_type,
                investigation_id=investigation_id or "unknown",
                entity_type="unknown",
                duration_ms=duration,
                success=False,
                error_type=f"{type(e).__name__}: {str(e)}"
            )
            
            # Re-raise to ensure visibility of production issues
            raise AgentInvokeException(f"State creation failed: {str(e)}")

        result = await graph.ainvoke(initial_state, config=runnable_config)
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
