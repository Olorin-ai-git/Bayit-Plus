"""
Investigation Nodes - Start investigation and raw data processing nodes.

This module contains the enhanced investigation nodes that handle
investigation initialization and raw data processing with hybrid intelligence tracking.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from ...hybrid_state_schema import HybridInvestigationState
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.nodes.raw_data_node import raw_data_node

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationNodes:
    """
    Enhanced investigation nodes with hybrid intelligence tracking.
    
    Handles investigation start and raw data processing with enhanced state management.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.intelligence_mode = components.get("intelligence_mode", "adaptive")
        
    async def enhanced_start_investigation(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced start investigation with hybrid intelligence tracking"""
        
        logger.debug(f"🚀 Starting Hybrid Intelligence Graph investigation")
        logger.debug(f"   Investigation ID: {state.get('investigation_id')}")
        logger.debug(f"   Entity: {state.get('entity_type')} - {state.get('entity_id')}")
        logger.debug(f"   Intelligence mode: {self.intelligence_mode}")
        logger.debug(f"   System: Hybrid Intelligence v{state.get('hybrid_system_version', '1.0.0')}")
        
        # Initialize enhanced tool execution logger for this investigation
        investigation_id = state.get('investigation_id')
        if investigation_id:
            from app.service.agent.orchestration.enhanced_tool_execution_logger import get_tool_execution_logger
            tool_execution_logger = get_tool_execution_logger(investigation_id)
            logger.info(f"🔧 Enhanced Tool Execution Logger initialized for investigation: {investigation_id}")
        
        # Call original start_investigation
        base_result = await start_investigation(state, config)
        
        # Production safety: Validate base_result before merging
        if not isinstance(base_result, dict):
            logger.error(f"CRITICAL: start_investigation returned invalid type: {type(base_result)}")
            raise ValueError(f"start_investigation must return dict, got {type(base_result)}")
        
        # Critical hybrid fields that must not be overwritten
        PROTECTED_HYBRID_FIELDS = {
            "decision_audit_trail", "ai_confidence", "ai_confidence_level", 
            "investigation_strategy", "safety_overrides", "dynamic_limits",
            "performance_metrics", "hybrid_system_version"
        }
        
        # Check for dangerous overwrites in base_result
        dangerous_overwrites = set(base_result.keys()) & PROTECTED_HYBRID_FIELDS
        if dangerous_overwrites:
            logger.warning(f"start_investigation attempting to overwrite protected fields: {dangerous_overwrites}")
            # Remove dangerous keys from base_result to protect hybrid state
            safe_base_result = {k: v for k, v in base_result.items() if k not in PROTECTED_HYBRID_FIELDS}
        else:
            safe_base_result = base_result
        
        # Safely merge state with validation
        enhanced_state = {
            **state,  # Start with the full hybrid state
            **safe_base_result,  # Merge in safe results only
            "hybrid_system_version": "1.0.0",
            "graph_selection_reason": "Hybrid intelligence system selected",
            "start_time": datetime.now().isoformat()
        }
        
        # Production safety: Validate critical hybrid fields are preserved
        required_fields = ["investigation_id", "entity_id", "entity_type", "decision_audit_trail"]
        missing_fields = [field for field in required_fields if field not in enhanced_state]
        if missing_fields:
            logger.error(f"CRITICAL: State merge lost required fields: {missing_fields}")
            raise ValueError(f"State merge validation failed - missing fields: {missing_fields}")
        
        # Ensure decision_audit_trail is properly typed
        if not isinstance(enhanced_state["decision_audit_trail"], list):
            logger.error(f"CRITICAL: decision_audit_trail corrupted: {type(enhanced_state['decision_audit_trail'])}")
            enhanced_state["decision_audit_trail"] = []
        
        # Add initial audit trail entry
        enhanced_state["decision_audit_trail"].append({
            "timestamp": datetime.now().isoformat(),
            "decision_type": "investigation_start",
            "details": {
                "system": "hybrid_intelligence_graph",
                "version": "1.0.0",
                "intelligence_mode": self.intelligence_mode
            }
        })
        
        logger.info(f"✅ Hybrid investigation started: {state.get('investigation_id')}")
        
        return enhanced_state
    
    async def enhanced_raw_data_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced raw data processing with confidence tracking"""
        
        logger.debug(f"📥 Processing raw data with Hybrid Intelligence Graph")
        logger.debug(f"   Enhanced data quality assessment enabled")
        logger.debug(f"   Confidence tracking: Real-time data completeness analysis")
        
        # Call original raw data node
        base_result = await raw_data_node(state, config)
        
        # Update confidence based on raw data quality
        if base_result.get("messages"):
            # Simple heuristic for data quality based on message content
            last_message = base_result["messages"][-1]
            data_quality = min(1.0, len(str(last_message.content)) / 500.0) if hasattr(last_message, 'content') else 0.0
            
            # Update confidence factors
            # CRITICAL FIX: Ensure confidence_factors exists before accessing
            if "confidence_factors" not in base_result:
                base_result["confidence_factors"] = {
                    "data_completeness": 0.0,
                    "evidence_quality": 0.0,
                    "pattern_recognition": 0.0,
                    "risk_indicators": 0.0
                }
            base_result["confidence_factors"]["data_completeness"] = data_quality
        
        logger.debug(f"✅ Raw data processed")
        
        return base_result
    
    async def enhanced_fraud_investigation(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced fraud investigation with AI confidence integration"""
        
        logger.debug(f"🕵️ Hybrid Intelligence fraud investigation starting")
        logger.debug(f"   AI-powered investigation velocity tracking")
        logger.debug(f"   Performance metrics: Real-time optimization")
        
        # Use hybrid-aware assistant that respects AI recommendations
        from ..assistant.hybrid_assistant import HybridAssistant
        hybrid_assistant = HybridAssistant(self.components)
        
        # BULLETPROOF FIX: Use perf counter timer for accurate timing
        from app.service.agent.orchestration.timing import run_timer
        with run_timer(state):
            enhanced_state = await hybrid_assistant.hybrid_aware_assistant(state, config)
            
            # Update performance metrics in the hybrid state
            enhanced_state["performance_metrics"]["investigation_velocity"] = (
                enhanced_state["performance_metrics"].get("investigation_velocity", 0) + 0.1
            )
            
            logger.debug(f"✅ Fraud investigation enhanced")
            
            # Copy timing from state to enhanced_state (now guaranteed to be set by run_timer)
            enhanced_state["start_time"] = state.get("start_time")
            enhanced_state["end_time"] = state.get("end_time")
            enhanced_state["total_duration_ms"] = state.get("total_duration_ms")
            
        return enhanced_state