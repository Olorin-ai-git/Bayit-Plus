"""
Langfuse Tracing Integration - Complete observability for LangChain applications.

This module provides Langfuse integration for tracing and monitoring:
- LangChain agent execution
- OpenAI API calls
- Tool usage and performance
- Error tracking and debugging
"""

import os
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from functools import wraps

from langfuse import Langfuse
from langfuse.callback import CallbackHandler as LangfuseCallbackHandler
from langchain_core.runnables import RunnableConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LangfuseTracer:
    """Langfuse tracing integration for Olorin investigation system."""
    
    def __init__(
        self,
        secret_key: Optional[str] = None,
        public_key: Optional[str] = None,
        host: Optional[str] = None,
        release: Optional[str] = None,
        debug: bool = False
    ):
        """
        Initialize Langfuse tracing.
        
        Args:
            secret_key: Langfuse secret key (defaults to env var)
            public_key: Langfuse public key (defaults to env var)
            host: Langfuse host URL (defaults to cloud)
            release: Application release/version
            debug: Enable debug logging
        """
        # Use provided credentials or fall back to environment variables
        self.secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY", "sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd")
        self.public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a")
        self.host = host or os.getenv("LANGFUSE_HOST", "https://us.cloud.langfuse.com")
        
        # Initialize Langfuse client
        self.langfuse = Langfuse(
            secret_key=self.secret_key,
            public_key=self.public_key,
            host=self.host,
            release=release,
            debug=debug
        )
        
        # Create callback handler for LangChain
        self.callback_handler = LangfuseCallbackHandler(
            secret_key=self.secret_key,
            public_key=self.public_key,
            host=self.host,
            release=release,
            debug=debug
        )
        
        logger.info(f"✅ Langfuse tracing initialized - Host: {self.host}")
    
    def get_callback_handler(self) -> LangfuseCallbackHandler:
        """Get the Langfuse callback handler for LangChain integration."""
        return self.callback_handler
    
    def create_traced_config(
        self,
        config: Optional[RunnableConfig] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RunnableConfig:
        """
        Create or enhance RunnableConfig with Langfuse tracing.
        
        Args:
            config: Existing config to enhance
            session_id: Session identifier for grouping traces
            user_id: User identifier
            tags: Tags to add to the trace
            metadata: Additional metadata
            
        Returns:
            Enhanced RunnableConfig with Langfuse callbacks
        """
        if config is None:
            config = RunnableConfig()
        
        # Get existing callbacks or create new list
        callbacks = config.get("callbacks", [])
        
        # Create new callback handler with session info
        handler = LangfuseCallbackHandler(
            secret_key=self.secret_key,
            public_key=self.public_key,
            host=self.host,
            session_id=session_id,
            user_id=user_id,
            tags=tags,
            metadata=metadata
        )
        
        # Add to callbacks
        callbacks.append(handler)
        config["callbacks"] = callbacks
        
        # Add tags to config
        config_tags = config.get("tags", [])
        if tags:
            config_tags.extend(tags)
        config["tags"] = config_tags
        
        # Add metadata
        if metadata:
            config["metadata"] = {**config.get("metadata", {}), **metadata}
        
        return config
    
    @contextmanager
    def trace_investigation(
        self,
        investigation_id: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Context manager for tracing an entire investigation.
        
        Args:
            investigation_id: Unique investigation identifier
            user_id: User running the investigation
            metadata: Additional investigation metadata
            
        Yields:
            Trace context with callback handler
        """
        # Create trace
        trace = self.langfuse.trace(
            name=f"investigation_{investigation_id}",
            user_id=user_id,
            metadata=metadata or {},
            tags=["investigation", "fraud_detection"]
        )
        
        try:
            # Create callback handler for this trace
            handler = LangfuseCallbackHandler(
                secret_key=self.secret_key,
                public_key=self.public_key,
                host=self.host,
                session_id=investigation_id,
                user_id=user_id,
                trace_id=trace.id
            )
            
            yield {"trace": trace, "handler": handler}
            
            # Mark trace as successful
            trace.update(output={"status": "success"})
            
        except Exception as e:
            # Mark trace as failed
            trace.update(
                output={"status": "error", "error": str(e)},
                level="ERROR"
            )
            raise
        
        finally:
            # Ensure trace is finalized
            self.langfuse.flush()
    
    def trace_agent(
        self,
        agent_name: str,
        trace_id: Optional[str] = None,
        parent_observation_id: Optional[str] = None
    ):
        """
        Decorator for tracing individual agent executions.
        
        Args:
            agent_name: Name of the agent being traced
            trace_id: Optional trace ID to attach to
            parent_observation_id: Parent observation for nested tracing
        """
        def decorator(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Create span for this agent
                span = self.langfuse.span(
                    name=agent_name,
                    trace_id=trace_id,
                    parent_observation_id=parent_observation_id,
                    metadata={"agent_type": "async"}
                )
                
                try:
                    # Execute agent
                    result = await func(*args, **kwargs)
                    
                    # Update span with success
                    span.update(
                        output={"status": "success"},
                        level="INFO"
                    )
                    
                    return result
                    
                except Exception as e:
                    # Update span with error
                    span.update(
                        output={"status": "error", "error": str(e)},
                        level="ERROR"
                    )
                    raise
                
                finally:
                    span.end()
                    self.langfuse.flush()
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Create span for this agent
                span = self.langfuse.span(
                    name=agent_name,
                    trace_id=trace_id,
                    parent_observation_id=parent_observation_id,
                    metadata={"agent_type": "sync"}
                )
                
                try:
                    # Execute agent
                    result = func(*args, **kwargs)
                    
                    # Update span with success
                    span.update(
                        output={"status": "success"},
                        level="INFO"
                    )
                    
                    return result
                    
                except Exception as e:
                    # Update span with error
                    span.update(
                        output={"status": "error", "error": str(e)},
                        level="ERROR"
                    )
                    raise
                
                finally:
                    span.end()
                    self.langfuse.flush()
            
            # Return appropriate wrapper
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    def log_tool_usage(
        self,
        tool_name: str,
        input_data: Any,
        output_data: Any,
        duration: float,
        trace_id: Optional[str] = None,
        parent_observation_id: Optional[str] = None
    ):
        """
        Log tool usage to Langfuse.
        
        Args:
            tool_name: Name of the tool
            input_data: Tool input
            output_data: Tool output
            duration: Execution duration in seconds
            trace_id: Associated trace ID
            parent_observation_id: Parent observation ID
        """
        self.langfuse.generation(
            name=f"tool_{tool_name}",
            trace_id=trace_id,
            parent_observation_id=parent_observation_id,
            input=input_data,
            output=output_data,
            metadata={
                "tool_name": tool_name,
                "duration_ms": duration * 1000
            },
            level="INFO"
        )
        self.langfuse.flush()
    
    def score_investigation(
        self,
        trace_id: str,
        score_name: str,
        value: float,
        comment: Optional[str] = None
    ):
        """
        Add a score to an investigation trace.
        
        Args:
            trace_id: Trace ID to score
            score_name: Name of the score metric
            value: Score value (0-1 for percentages, or absolute values)
            comment: Optional comment about the score
        """
        self.langfuse.score(
            trace_id=trace_id,
            name=score_name,
            value=value,
            comment=comment
        )
        self.langfuse.flush()
    
    def flush(self):
        """Flush any pending traces to Langfuse."""
        self.langfuse.flush()
    
    def shutdown(self):
        """Shutdown the Langfuse client gracefully."""
        self.langfuse.flush()


# Global tracer instance (initialized on first use)
_global_tracer: Optional[LangfuseTracer] = None


def get_langfuse_tracer() -> LangfuseTracer:
    """
    Get or create the global Langfuse tracer instance.
    
    Returns:
        Global LangfuseTracer instance
    """
    global _global_tracer
    
    if _global_tracer is None:
        _global_tracer = LangfuseTracer()
    
    return _global_tracer


def init_langfuse_tracing(
    secret_key: Optional[str] = None,
    public_key: Optional[str] = None,
    host: Optional[str] = None,
    release: Optional[str] = None,
    debug: bool = False
) -> LangfuseTracer:
    """
    Initialize global Langfuse tracing with custom configuration.
    
    Args:
        secret_key: Langfuse secret key
        public_key: Langfuse public key
        host: Langfuse host URL
        release: Application release/version
        debug: Enable debug logging
        
    Returns:
        Configured LangfuseTracer instance
    """
    global _global_tracer
    
    _global_tracer = LangfuseTracer(
        secret_key=secret_key,
        public_key=public_key,
        host=host,
        release=release,
        debug=debug
    )
    
    return _global_tracer