"""
Summary Nodes - Summary and completion nodes for investigation workflow.

This module contains the enhanced summary and completion nodes that handle
investigation summary generation and final completion with hybrid intelligence reporting.
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime

from langchain_core.messages import AIMessage

from ...hybrid_state_schema import HybridInvestigationState
from ...canonical_outcome import build_canonical_outcome, outcome_to_dict
from ..metrics.summary_generator import SummaryGenerator
from ..metrics.performance_calculator import PerformanceCalculator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SummaryNodes:
    """
    Enhanced summary and completion nodes with hybrid intelligence reporting.
    
    Handles investigation summary generation and completion with comprehensive
    performance metrics and audit trail reporting.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.confidence_consolidator = components["confidence_consolidator"]
        self.summary_generator = SummaryGenerator(components)
        self.performance_calculator = PerformanceCalculator(components)
        
    async def enhanced_summary_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced summary node with hybrid intelligence reporting"""
        
        logger.info(f"📋 Hybrid Intelligence summary generation starting")
        logger.debug(f"   Comprehensive reporting: AI decisions + Safety overrides + Performance metrics")
        logger.debug(f"   Investigation efficiency: Multi-factor calculation (time, coverage, safety)")
        
        try:
            # Consolidate confidence scores before generating summary
            logger.debug("🔍 Consolidating confidence scores before summary generation")
            consolidated_confidence = self.confidence_consolidator.consolidate_confidence_scores(
                state=state,
                agent_results=state.get("agent_results", []),
                investigation_context=state.get("investigation_context", {})
            )
            
            # Apply consolidated confidence to state
            state = self.confidence_consolidator.apply_consolidated_confidence(state, consolidated_confidence)
            
            logger.info(f"✅ Confidence consolidated: {consolidated_confidence.overall_score:.3f} ({consolidated_confidence.level_description})")
            if consolidated_confidence.data_quality_issues:
                logger.warning(f"   Data quality issues detected: {len(consolidated_confidence.data_quality_issues)}")
            
            # Generate hybrid intelligence summary
            investigation_summary = self.summary_generator.generate_hybrid_summary(state)
            
            # Update state
            state["current_phase"] = "complete"
            state["end_time"] = datetime.now().isoformat()
            
            # Calculate total duration with robust fallback
            state = self._calculate_investigation_duration(state)
            
            # Add summary to messages
            summary_message = AIMessage(content=investigation_summary)
            state["messages"].append(summary_message)
            
            # Final audit trail entry
            state["decision_audit_trail"].append({
                "timestamp": datetime.now().isoformat(),
                "decision_type": "investigation_summary",
                "details": {
                    "total_duration_ms": state.get("total_duration_ms"),
                    "orchestrator_loops": state.get("orchestrator_loops", 0),
                    "domains_completed": len(state.get("domains_completed", [])),
                    "tools_used": len(state.get("tools_used", [])),
                    "safety_overrides": len(state.get("safety_overrides", [])),
                    "final_confidence": state.get("ai_confidence", 0.0)
                }
            })
            
            # Generate canonical final outcome
            canonical_outcome = build_canonical_outcome(
                state, 
                completion_reason="Investigation completed successfully with hybrid intelligence",
                include_raw_state=False
            )
            
            # Add canonical outcome to state
            state["canonical_final_outcome"] = outcome_to_dict(canonical_outcome)
            
            logger.info(f"✅ Enhanced summary completed")
            logger.info(f"   Duration: {state.get('total_duration_ms', 0)}ms")
            logger.info(f"   Final confidence: {state.get('ai_confidence', 0.0):.3f}")
            logger.info(f"   Canonical outcome: {canonical_outcome.status.value}")
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Enhanced summary failed: {str(e)}")
            
            # Add basic summary on error
            state["messages"].append(AIMessage(content=f"Investigation completed with errors: {str(e)}"))
            state["current_phase"] = "complete"
            state["end_time"] = datetime.now().isoformat()
            
            # Calculate total duration even in error case
            state = self._calculate_investigation_duration(state)
            
            # Generate canonical outcome even for error cases
            try:
                canonical_outcome = build_canonical_outcome(
                    state, 
                    completion_reason=f"Investigation completed with errors: {str(e)}",
                    include_raw_state=False
                )
                state["canonical_final_outcome"] = outcome_to_dict(canonical_outcome)
                logger.info(f"🛡️ Canonical outcome generated for error case: {canonical_outcome.status.value}")
            except Exception as outcome_error:
                logger.error(f"Failed to generate canonical outcome: {outcome_error}")
                # Ensure basic outcome structure exists
                state["canonical_final_outcome"] = {
                    "status": "failed",
                    "completion_reason": f"Investigation failed: {str(e)}",
                    "success": False
                }
            
            return state
    
    async def enhanced_complete_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced completion node with final metrics"""
        
        logger.info(f"✅ Hybrid Intelligence Graph investigation completion")
        logger.debug(f"   Final metrics calculation: Efficiency, resource utilization, AI optimization")
        
        # Update final state
        state["current_phase"] = "complete"
        
        # Calculate final performance metrics
        state["performance_metrics"]["final_efficiency"] = self.performance_calculator.calculate_investigation_efficiency(state)
        state["investigation_efficiency"] = state["performance_metrics"]["final_efficiency"]
        
        # Log final statistics
        self._log_final_statistics(state)
        
        return state
    
    def _calculate_investigation_duration(self, state: HybridInvestigationState) -> HybridInvestigationState:
        """Calculate total investigation duration with robust fallback."""
        try:
            if state.get("start_time"):
                from dateutil.parser import parse
                start_dt = parse(state["start_time"])
                end_dt = datetime.now()
                duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
                state["total_duration_ms"] = max(0, duration_ms)
            else:
                # Fallback: estimate from performance metrics or default
                perf_metrics = state.get("performance_metrics", {})
                if "start_time_ms" in perf_metrics:
                    start_time_ms = perf_metrics["start_time_ms"]
                    current_time_ms = time.time() * 1000
                    state["total_duration_ms"] = max(0, int(current_time_ms - start_time_ms))
                else:
                    # Ultimate fallback: reasonable default based on current time
                    state["total_duration_ms"] = 30000  # 30 seconds default
        except Exception as e:
            logger.warning(f"Failed to calculate duration: {e}")
            state["total_duration_ms"] = 30000  # 30 seconds fallback
            
        return state
    
    def _log_final_statistics(self, state: HybridInvestigationState) -> None:
        """Log final investigation statistics."""
        logger.info(f"📊 Final Investigation Statistics:")
        logger.info(f"   Investigation ID: {state.get('investigation_id')}")
        logger.info(f"   Total duration: {state.get('total_duration_ms', 0)}ms") 
        logger.info(f"   Orchestrator loops: {state.get('orchestrator_loops', 0)}")
        logger.info(f"   Domains completed: {len(state.get('domains_completed', []))}/6")
        logger.info(f"   Tools used: {len(state.get('tools_used', []))}")
        logger.info(f"   Safety overrides: {len(state.get('safety_overrides', []))}")
        logger.info(f"   Final confidence: {state.get('ai_confidence', 0.0):.3f}")
        logger.info(f"   Investigation efficiency: {state.get('investigation_efficiency', 0.0):.3f}")