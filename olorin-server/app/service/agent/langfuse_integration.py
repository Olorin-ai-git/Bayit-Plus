"""
Langfuse Integration Module - Integrates Langfuse tracing with existing agents.

This module provides integration points for Langfuse tracing throughout
the Olorin investigation system.
"""

from typing import Optional, Dict, Any
from functools import wraps

from langchain_core.runnables import RunnableConfig
from app.service.agent.orchestration.langfuse_tracing import (
    get_langfuse_tracer,
    init_langfuse_tracing
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def initialize_langfuse():
    """
    Initialize Langfuse tracing with Olorin-specific configuration.
    
    This should be called once at application startup.
    """
    try:
        # Initialize with provided credentials
        tracer = init_langfuse_tracing(
            secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
            public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
            host="https://us.cloud.langfuse.com",
            release="olorin-1.0.0",
            debug=False
        )
        
        logger.info("✅ Langfuse tracing initialized successfully")
        return tracer
        
    except Exception as e:
        logger.error(f"Failed to initialize Langfuse tracing: {e}")
        return None


def add_langfuse_to_config(
    config: Optional[RunnableConfig] = None,
    investigation_id: Optional[str] = None,
    user_id: Optional[str] = None,
    agent_name: Optional[str] = None
) -> RunnableConfig:
    """
    Add Langfuse tracing to a LangChain config.
    
    Args:
        config: Existing config to enhance
        investigation_id: Investigation identifier
        user_id: User identifier
        agent_name: Name of the agent being traced
        
    Returns:
        Enhanced config with Langfuse callbacks
    """
    tracer = get_langfuse_tracer()
    
    # Create tags and metadata
    tags = ["olorin", "fraud_investigation"]
    if agent_name:
        tags.append(f"agent:{agent_name}")
    
    metadata = {
        "investigation_id": investigation_id,
        "agent_name": agent_name
    }
    
    # Create traced config
    return tracer.create_traced_config(
        config=config,
        session_id=investigation_id,
        user_id=user_id,
        tags=tags,
        metadata=metadata
    )


def trace_agent_execution(agent_name: str):
    """
    Decorator for tracing agent executions with Langfuse.
    
    Args:
        agent_name: Name of the agent being traced
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            tracer = get_langfuse_tracer()
            
            # Extract investigation_id from args if available
            investigation_id = None
            if len(args) > 0 and isinstance(args[0], dict):
                metadata = args[0].get("metadata", {})
                investigation_id = metadata.get("investigation_id")
            
            # Use context manager for tracing
            with tracer.trace_investigation(
                investigation_id=investigation_id or "unknown",
                metadata={"agent_name": agent_name}
            ) as trace_context:
                # Get handler from context
                handler = trace_context["handler"]
                
                # Add handler to kwargs if config exists
                if "config" in kwargs:
                    config = kwargs["config"]
                    if config is None:
                        config = RunnableConfig()
                    callbacks = config.get("callbacks", [])
                    callbacks.append(handler)
                    config["callbacks"] = callbacks
                    kwargs["config"] = config
                
                # Execute agent
                result = await func(*args, **kwargs)
                
                # Score the execution (example scoring)
                if investigation_id:
                    tracer.score_investigation(
                        trace_id=trace_context["trace"].id,
                        score_name="agent_success",
                        value=1.0,
                        comment=f"{agent_name} completed successfully"
                    )
                
                return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            tracer = get_langfuse_tracer()
            
            # Extract investigation_id from args if available
            investigation_id = None
            if len(args) > 0 and isinstance(args[0], dict):
                metadata = args[0].get("metadata", {})
                investigation_id = metadata.get("investigation_id")
            
            # Use context manager for tracing
            with tracer.trace_investigation(
                investigation_id=investigation_id or "unknown",
                metadata={"agent_name": agent_name}
            ) as trace_context:
                # Get handler from context
                handler = trace_context["handler"]
                
                # Add handler to kwargs if config exists
                if "config" in kwargs:
                    config = kwargs["config"]
                    if config is None:
                        config = RunnableConfig()
                    callbacks = config.get("callbacks", [])
                    callbacks.append(handler)
                    config["callbacks"] = callbacks
                    kwargs["config"] = config
                
                # Execute agent
                result = func(*args, **kwargs)
                
                # Score the execution
                if investigation_id:
                    tracer.score_investigation(
                        trace_id=trace_context["trace"].id,
                        score_name="agent_success",
                        value=1.0,
                        comment=f"{agent_name} completed successfully"
                    )
                
                return result
        
        # Return appropriate wrapper
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def create_langfuse_enabled_graph(graph_builder_func):
    """
    Wrapper to add Langfuse tracing to a graph builder.
    
    Args:
        graph_builder_func: Original graph builder function
        
    Returns:
        Enhanced graph builder with Langfuse tracing
    """
    @wraps(graph_builder_func)
    async def wrapper(*args, **kwargs):
        # Build the graph
        graph = await graph_builder_func(*args, **kwargs)
        
        # Add Langfuse tracing to graph execution
        original_ainvoke = graph.ainvoke
        
        @wraps(original_ainvoke)
        async def traced_ainvoke(input_data, config=None):
            # Extract investigation_id
            investigation_id = None
            if isinstance(input_data, dict):
                metadata = input_data.get("metadata", {})
                investigation_id = metadata.get("investigation_id")
            
            # Add Langfuse to config
            traced_config = add_langfuse_to_config(
                config=config,
                investigation_id=investigation_id,
                agent_name="investigation_graph"
            )
            
            # Execute with tracing
            return await original_ainvoke(input_data, traced_config)
        
        graph.ainvoke = traced_ainvoke
        return graph
    
    return wrapper


# Example usage for existing agents
def enhance_network_agent_with_langfuse(network_agent_func):
    """
    Enhance the network agent with Langfuse tracing.
    
    Args:
        network_agent_func: Original network agent function
        
    Returns:
        Enhanced network agent with tracing
    """
    return trace_agent_execution("network_agent")(network_agent_func)


def enhance_device_agent_with_langfuse(device_agent_func):
    """
    Enhance the device agent with Langfuse tracing.
    
    Args:
        device_agent_func: Original device agent function
        
    Returns:
        Enhanced device agent with tracing
    """
    return trace_agent_execution("device_agent")(device_agent_func)


def enhance_location_agent_with_langfuse(location_agent_func):
    """
    Enhance the location agent with Langfuse tracing.
    
    Args:
        location_agent_func: Original location agent function
        
    Returns:
        Enhanced location agent with tracing
    """
    return trace_agent_execution("location_agent")(location_agent_func)


def enhance_logs_agent_with_langfuse(logs_agent_func):
    """
    Enhance the logs agent with Langfuse tracing.
    
    Args:
        logs_agent_func: Original logs agent function
        
    Returns:
        Enhanced logs agent with tracing
    """
    return trace_agent_execution("logs_agent")(logs_agent_func)


def enhance_risk_agent_with_langfuse(risk_agent_func):
    """
    Enhance the risk agent with Langfuse tracing.
    
    Args:
        risk_agent_func: Original risk agent function
        
    Returns:
        Enhanced risk agent with tracing
    """
    return trace_agent_execution("risk_agent")(risk_agent_func)