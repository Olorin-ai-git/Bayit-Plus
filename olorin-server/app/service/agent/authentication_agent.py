"""
Structured Authentication Analysis Agent

Authentication domain structured investigation agent using LLM-driven tool selection.
"""

import json
import time

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_structured_context,
    _create_error_response,
    get_context_with_retry,
)
from app.service.logging import get_bridge_logger
from app.service.agent.agent_factory import create_rag_agent, create_agent_with_intelligent_tools

# RAG imports with graceful fallback
try:
    from app.service.agent.rag import ContextAugmentationConfig
    RAG_AVAILABLE = True
except ImportError as e:
    logger = get_bridge_logger(__name__)
    logger.warning(f"RAG modules not available: {e}")
    RAG_AVAILABLE = False
from app.service.agent.journey_tracker import (
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


async def structured_authentication_agent(state, config) -> dict:
    """Structured authentication analysis using LLM-driven tool selection with optional RAG enhancement"""
    
    # Track execution start time
    start_time = time.perf_counter()
    
    # Authentication analysis timeout configuration (configurable via environment)
    import os
    import asyncio
    AUTHENTICATION_TIMEOUT_SECONDS = int(os.getenv('AUTHENTICATION_ANALYSIS_TIMEOUT', '300'))  # 5 minutes default
    PERFORMANCE_WARNING_THRESHOLD_SECONDS = int(os.getenv('AUTHENTICATION_PERFORMANCE_WARNING_THRESHOLD', '120'))  # 2 minutes
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Import configuration utilities and initialize RAG stats
    from .authentication_agent_config import (
        initialize_rag_stats, create_authentication_rag_config, update_rag_stats_on_success,
        create_authentication_agent_metadata, get_authentication_objectives
    )
    rag_stats = initialize_rag_stats()
    
    # Track authentication agent node execution start with RAG metadata
    start_metadata = create_authentication_agent_metadata(RAG_AVAILABLE, rag_stats)
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="authentication_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "authentication_analysis": "starting", "investigation_phase": "authentication_domain", "rag_enabled": RAG_AVAILABLE},
        output_state={"authentication_analysis": "in_progress", "agent_status": "active", "rag_enhancement": "initializing"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="RAG-Enhanced-AuthenticationAgent" if RAG_AVAILABLE else "StructuredAuthenticationAgent",
        metadata=start_metadata
    )
    
    # Create or get structured context with retry logic
    structured_context = await get_context_with_retry(investigation_id, entity_id)
    if not structured_context:
        logger.error(f"Failed to get investigation context after retries: {investigation_id}")
        return _create_error_response("Unable to access investigation context - race condition")
    
    structured_context.start_domain_analysis("authentication")
    
    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools
        
        # Configure RAG for authentication domain if available
        rag_config = create_authentication_rag_config()
        if rag_config:
            rag_stats.update(update_rag_stats_on_success(rag_stats))
        
        # Create agent with intelligent tool selection and RAG enhancement
        if RAG_AVAILABLE and rag_config:
            authentication_agent = await create_agent_with_intelligent_tools(
                domain="authentication",
                investigation_context=structured_context,
                fallback_tools=tools,
                enable_rag=True,
                categories=["threat_intelligence", "ml_ai", "intelligence", "web", "database"]
            )
            logger.info("🔐 Created authentication agent with intelligent RAG-enhanced tool selection")
        else:
            # Fallback to standard agent creation
            from app.service.agent.agent_factory import create_structured_agent
            authentication_agent = create_structured_agent("authentication", tools)
            logger.info("🔐 Created standard authentication agent (RAG not available)")
        
        # Get enhanced objectives with RAG-augmented authentication focus
        authentication_objectives = get_authentication_objectives(rag_enabled=(RAG_AVAILABLE and rag_config is not None))
        
        # Execute authentication analysis with timeout protection
        try:
            findings = await asyncio.wait_for(
                authentication_agent.structured_investigate(
                    context=structured_context,
                    config=config,
                    specific_objectives=authentication_objectives
                ),
                timeout=AUTHENTICATION_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            error_message = f"Authentication analysis timed out after {AUTHENTICATION_TIMEOUT_SECONDS}s"
            logger.error(f"🚨 PERFORMANCE ALERT: {error_message}")
            structured_context.fail_domain_analysis("authentication", error_message)
            return _create_error_response(f"Authentication analysis timeout: {error_message}")
        
        # Check for performance warning threshold
        current_duration = time.perf_counter() - start_time
        if current_duration > PERFORMANCE_WARNING_THRESHOLD_SECONDS:
            logger.warning(f"⚠️ PERFORMANCE WARNING: Authentication analysis took {current_duration:.1f}s (>{PERFORMANCE_WARNING_THRESHOLD_SECONDS}s threshold)")
        
        # Update RAG statistics from agent if available
        if RAG_AVAILABLE and hasattr(authentication_agent, 'get_rag_stats'):
            try:
                agent_rag_stats = authentication_agent.get_rag_stats()
                rag_stats.update({
                    "knowledge_retrieval_count": agent_rag_stats.get("knowledge_retrieval_count", 0),
                    "context_augmentation_success": agent_rag_stats.get("context_augmentation_success", False)
                })
            except Exception:
                pass  # Gracefully handle missing RAG stats
        
        # Record findings in context
        structured_context.record_domain_findings("authentication", findings)
        
        # Track authentication agent completion with RAG metrics
        completion_metadata = create_authentication_agent_metadata(RAG_AVAILABLE and rag_config is not None, rag_stats)
        completion_metadata.update({
            "findings_generated": len(findings.key_findings), 
            "risk_level": findings.risk_score, 
            "confidence": findings.confidence
        })
        
        # Calculate actual execution duration
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="authentication_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "authentication_analysis": "starting", "investigation_phase": "authentication_domain", "rag_enabled": RAG_AVAILABLE},
            output_state={
                "authentication_analysis": "completed", 
                "findings_count": len(findings.key_findings), 
                "risk_score": findings.risk_score,
                "rag_enhancement": "completed" if RAG_AVAILABLE else "unavailable",
                "knowledge_retrievals": rag_stats["knowledge_retrieval_count"]
            },
            duration_ms=duration_ms,
            status=NodeStatus.COMPLETED,
            agent_name="RAG-Enhanced-AuthenticationAgent" if RAG_AVAILABLE else "StructuredAuthenticationAgent",
            metadata=completion_metadata
        )
        
        # Return structured result with RAG enhancement metadata
        from .authentication_agent_config import create_result_structure
        result = create_result_structure(
            findings=findings,
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            rag_stats=rag_stats
        )
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        # Enhanced error handling with RAG context
        error_context = f"{'RAG-enhanced' if RAG_AVAILABLE else 'Standard'} authentication agent failed: {str(e)}"
        if RAG_AVAILABLE and rag_stats.get("context_augmentation_success", False):
            error_context += f" (RAG context: {rag_stats['knowledge_retrieval_count']} retrievals)"
        
        logger.error(error_context)
        structured_context.fail_domain_analysis("authentication", str(e))
        
        # Track failure with RAG metadata
        error_metadata = create_authentication_agent_metadata(RAG_AVAILABLE, rag_stats)
        error_metadata.update({"error_type": "execution_failure"})
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="authentication_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "authentication_analysis": "starting", "investigation_phase": "authentication_domain"},
            output_state={"authentication_analysis": "failed", "error": str(e), "rag_enabled": RAG_AVAILABLE},
            duration_ms=0,
            status=NodeStatus.FAILED,
            agent_name="RAG-Enhanced-AuthenticationAgent" if RAG_AVAILABLE else "StructuredAuthenticationAgent",
            metadata=error_metadata
        )
        
        return _create_error_response(f"Authentication analysis failed: {str(e)}")