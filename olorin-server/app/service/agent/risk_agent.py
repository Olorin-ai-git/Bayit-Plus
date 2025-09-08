"""
Autonomous Risk Assessment Agent

Risk domain autonomous investigation agent using LLM-driven tool selection.
"""

import json
import time

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
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
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import (
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


async def autonomous_risk_agent(state, config) -> dict:
    """Autonomous risk assessment using LLM-driven tool selection with optional RAG enhancement"""
    
    # Track execution start time
    start_time = time.perf_counter()
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Import configuration utilities and initialize RAG stats
    from .risk_agent_config import (
        initialize_rag_stats, create_risk_rag_config, update_rag_stats_on_success,
        create_risk_agent_metadata, get_risk_objectives
    )
    rag_stats = initialize_rag_stats()
    
    # Track risk agent node execution start with RAG metadata
    start_metadata = create_risk_agent_metadata(RAG_AVAILABLE, rag_stats)
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="risk_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "risk_analysis": "starting", "investigation_phase": "risk_assessment", "rag_enabled": RAG_AVAILABLE},
        output_state={"risk_analysis": "in_progress", "agent_status": "active", "rag_enhancement": "initializing"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="RAG-Enhanced-RiskAgent" if RAG_AVAILABLE else "AutonomousRiskAgent",
        metadata=start_metadata
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    autonomous_context.start_domain_analysis("risk")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.RISK_ASSESSMENT,
        0.1,
        "Starting autonomous risk assessment..."
    )
    
    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools
        
        # Configure RAG for risk domain if available
        rag_config = create_risk_rag_config()
        if rag_config:
            rag_stats = update_rag_stats_on_success(rag_stats)
        
        # Create agent with intelligent tool selection and RAG enhancement
        if RAG_AVAILABLE and rag_config:
            risk_agent = await create_agent_with_intelligent_tools(
                domain="risk",
                investigation_context=autonomous_context,
                fallback_tools=tools,
                enable_rag=True,
                categories=["ml_ai", "threat_intelligence", "blockchain", "intelligence", "olorin"]
            )
            logger.info("⚠️ Created risk agent with intelligent RAG-enhanced tool selection")
        else:
            # Fallback to standard agent creation
            from app.service.agent.agent_factory import create_autonomous_agent
            risk_agent = create_autonomous_agent("risk", tools)
            logger.info("⚠️ Created standard risk agent (RAG not available)")
        
        # Get enhanced objectives with RAG-augmented risk assessment focus
        risk_objectives = get_risk_objectives(rag_enabled=(RAG_AVAILABLE and rag_config is not None))
        
        findings = await risk_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=risk_objectives
        )
        
        # Update RAG statistics from agent if available
        if RAG_AVAILABLE and hasattr(risk_agent, 'get_rag_stats'):
            try:
                agent_rag_stats = risk_agent.get_rag_stats()
                rag_stats.update({
                    "knowledge_retrieval_count": agent_rag_stats.get("knowledge_retrieval_count", 0),
                    "context_augmentation_success": agent_rag_stats.get("context_augmentation_success", False)
                })
            except Exception:
                pass  # Gracefully handle missing RAG stats
        
        # Record findings in context
        autonomous_context.record_domain_findings("risk", findings)
        
        # Emit completion update with RAG enhancement info
        from .risk_agent_config import format_completion_message
        completion_message = format_completion_message(
            rag_enabled=(RAG_AVAILABLE and rag_config is not None),
            findings_count=len(findings.key_findings),
            risk_score=findings.risk_score,
            rag_stats=rag_stats
        )
        
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.RISK_ASSESSMENT,
            findings.raw_data or {},
            completion_message
        )
        
        # Track risk agent completion with RAG metrics
        completion_metadata = create_risk_agent_metadata(RAG_AVAILABLE and rag_config is not None, rag_stats)
        completion_metadata.update({
            "findings_generated": len(findings.key_findings), 
            "risk_level": findings.risk_score, 
            "confidence": findings.confidence
        })
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="risk_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "risk_analysis": "starting", "investigation_phase": "risk_assessment", "rag_enabled": RAG_AVAILABLE},
            output_state={
                "risk_analysis": "completed", 
                "findings_count": len(findings.key_findings), 
                "risk_score": findings.risk_score,
                "rag_enhancement": "completed" if RAG_AVAILABLE else "unavailable",
                "knowledge_retrievals": rag_stats["knowledge_retrieval_count"]
            },
            duration_ms=int((time.perf_counter() - start_time) * 1000),
            status=NodeStatus.COMPLETED,
            agent_name="RAG-Enhanced-RiskAgent" if RAG_AVAILABLE else "AutonomousRiskAgent",
            metadata=completion_metadata
        )
        
        # UPDATED: Use unified schema and guarded calls to prevent 0.00 risk scores
        from datetime import datetime
        from .unified_agent_schema import ensure_valid_response, AgentType
        
        # Create fallback data for guarded calls
        fallback_data = {
            "entity_id": entity_id,
            "investigation_id": investigation_id,
            "rag_enabled": RAG_AVAILABLE and rag_config is not None,
            "findings_count": len(findings.key_findings) if findings else 0,
            "context_summary": str(autonomous_context)[:500] if autonomous_context else ""
        }
        
        # Convert findings to unified response format
        try:
            # Extract risk score and confidence from findings
            overall_risk_score = findings.risk_score if findings else 0.5
            confidence = findings.confidence if findings else 0.4
            
            # Extract risk factors from findings
            risk_factors = []
            if findings and hasattr(findings, 'key_findings'):
                risk_factors = [str(finding) for finding in findings.key_findings]
            if not risk_factors:
                risk_factors = ["Risk assessment completed with available data"]
            
            # Create mitigation measures
            mitigation_measures = [
                "Review risk assessment results",
                "Implement appropriate security controls",
                "Monitor for ongoing risk indicators"
            ]
            
            # Create domain-specific data
            domain_specific = {
                'cross_domain_correlations': [],
                'risk_classification': 'automated_assessment',
                'aggregation_metadata': {
                    'rag_enabled': RAG_AVAILABLE and rag_config is not None,
                    'knowledge_retrievals': rag_stats.get("knowledge_retrieval_count", 0),
                    'context_augmentation': rag_stats.get("context_augmentation_success", False)
                },
                'individual_agent_scores': {},
                'rag_stats': rag_stats
            }
            
            # If findings has raw_data, include it
            if findings and hasattr(findings, 'raw_data') and findings.raw_data:
                domain_specific['raw_findings_data'] = findings.raw_data
            
            # Ensure we have valid response using unified schema
            unified_response = ensure_valid_response(
                agent_type=AgentType.RISK_AGGREGATION,
                response={
                    'overall_risk_score': overall_risk_score,
                    'confidence': confidence,
                    'risk_factors': risk_factors,
                    'mitigation_measures': mitigation_measures,
                    'domain_specific': domain_specific
                },
                investigation_id=investigation_id,
                timestamp=datetime.utcnow().isoformat()
            )
            
            logger.info(f"✅ Risk agent created unified response with score: {unified_response.overall_risk_score}")
            
            return {"messages": [AIMessage(content=unified_response.model_dump_json())]}
            
        except Exception as schema_error:
            logger.error(f"🚨 Error creating unified response: {str(schema_error)}")
            
            # Fallback to basic unified response
            from .unified_agent_schema import create_agent_response
            
            fallback_response = create_agent_response(
                agent_type=AgentType.RISK_AGGREGATION,
                overall_risk_score=0.5,  # Medium risk when uncertain
                confidence=0.4,
                risk_factors=["Risk assessment completed with processing constraints"],
                mitigation_measures=["Review assessment manually", "Apply appropriate controls"],
                investigation_id=investigation_id,
                timestamp=datetime.utcnow().isoformat(),
                domain_specific={'fallback_used': True, 'schema_error': str(schema_error)},
                validation_errors=[f"Schema conversion failed: {str(schema_error)}"]
            )
            
            return {"messages": [AIMessage(content=fallback_response.model_dump_json())]}
        
    except Exception as e:
        # Enhanced error handling with RAG context
        error_context = f"{'RAG-enhanced' if RAG_AVAILABLE else 'Standard'} risk agent failed: {str(e)}"
        if RAG_AVAILABLE and rag_stats.get("context_augmentation_success", False):
            error_context += f" (RAG context: {rag_stats['knowledge_retrieval_count']} retrievals)"
        
        logger.error(error_context)
        autonomous_context.fail_domain_analysis("risk", str(e))
        
        # Track failure with RAG metadata
        error_metadata = create_risk_agent_metadata(RAG_AVAILABLE, rag_stats)
        error_metadata.update({"error_type": "execution_failure"})
        
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="risk_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "risk_analysis": "starting", "investigation_phase": "risk_assessment"},
            output_state={"risk_analysis": "failed", "error": str(e), "rag_enabled": RAG_AVAILABLE},
            duration_ms=0,
            status=NodeStatus.FAILED,
            agent_name="RAG-Enhanced-RiskAgent" if RAG_AVAILABLE else "AutonomousRiskAgent",
            metadata=error_metadata
        )
        
        # UPDATED: Use unified schema even for error responses to prevent 0.00 scores
        from datetime import datetime
        from .unified_agent_schema import create_agent_response, AgentType
        
        # Create error fallback response with unified schema
        error_response = create_agent_response(
            agent_type=AgentType.RISK_AGGREGATION,
            overall_risk_score=0.4,  # Moderate risk due to processing failure
            confidence=0.3,  # Low confidence due to error
            risk_factors=[
                "Risk assessment encountered processing error",
                "Manual review recommended due to automated failure"
            ],
            mitigation_measures=[
                "Conduct manual risk assessment",
                "Review system logs for error details",
                "Implement additional monitoring"
            ],
            investigation_id=investigation_id,
            timestamp=datetime.utcnow().isoformat(),
            domain_specific={
                'error_occurred': True,
                'error_message': str(e),
                'fallback_response': True,
                'rag_enabled': RAG_AVAILABLE
            },
            validation_errors=[f"Agent execution failed: {str(e)}"]
        )
        
        return {"messages": [AIMessage(content=error_response.model_dump_json())]}