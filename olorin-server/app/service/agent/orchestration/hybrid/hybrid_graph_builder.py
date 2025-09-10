"""
Hybrid Graph Builder - Uniting Clean Graph and Orchestrator Graph

This module creates a unified graph that combines AI-driven intelligent routing
with comprehensive safety mechanisms from both systems.
"""

import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage

from .hybrid_state_schema import (
    HybridInvestigationState,
    create_hybrid_initial_state,
    update_ai_confidence,
    add_safety_override,
    AIConfidenceLevel,
    SafetyConcernType
)
from .ai_confidence_engine import AIConfidenceEngine
from .advanced_safety_manager import AdvancedSafetyManager, SafetyLevel
from .intelligent_router import IntelligentRouter

# Import existing components
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.nodes.raw_data_node import raw_data_node
from app.service.agent.orchestration.assistant import assistant
from app.service.agent.orchestration.enhanced_routing import raw_data_or_investigation_routing

# Import domain agents
from app.service.agent.orchestration.domain_agents.network_agent import network_agent_node
from app.service.agent.orchestration.domain_agents.device_agent import device_agent_node  
from app.service.agent.orchestration.domain_agents.location_agent import location_agent_node
from app.service.agent.orchestration.domain_agents.logs_agent import logs_agent_node
from app.service.agent.orchestration.domain_agents.authentication_agent import authentication_agent_node
from app.service.agent.orchestration.domain_agents.risk_agent import risk_agent_node

from app.service.agent.orchestration.enhanced_tool_executor import EnhancedToolNode
# from app.service.agent.orchestration.custom_tool_builder import get_custom_tools  # TODO: Fix this import
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HybridGraphBuilder:
    """
    Unified graph builder combining AI intelligence with safety mechanisms.
    
    Creates a graph that:
    1. Uses AI confidence to determine routing strategy
    2. Maintains comprehensive safety mechanisms from clean graph
    3. Allows intelligent phase skipping when confidence is high
    4. Falls back to sequential execution when confidence is low
    """
    
    def __init__(self, intelligence_mode: str = "adaptive"):
        self.intelligence_mode = intelligence_mode
        self.confidence_engine = AIConfidenceEngine()
        self.safety_manager = AdvancedSafetyManager()
        self.intelligent_router = IntelligentRouter(
            confidence_engine=self.confidence_engine,
            safety_manager=self.safety_manager
        )
        
    async def build_hybrid_investigation_graph(
        self,
        use_enhanced_tools: bool = True,
        enable_streaming: bool = True
    ) -> StateGraph:
        """
        Build unified hybrid graph combining both approaches.
        
        Args:
            use_enhanced_tools: Whether to use enhanced tool execution
            enable_streaming: Whether to enable real-time streaming
            
        Returns:
            Compiled hybrid investigation graph
        """
        
        logger.info(f"🏗️ Building hybrid intelligence graph")
        logger.info(f"   Intelligence mode: {self.intelligence_mode}")
        logger.info(f"   Enhanced tools: {use_enhanced_tools}")
        logger.info(f"   Streaming enabled: {enable_streaming}")
        
        try:
            # Create enhanced state graph
            builder = StateGraph(HybridInvestigationState)
            
            # Add core investigation nodes
            builder.add_node("start_investigation", self._enhanced_start_investigation)
            builder.add_node("raw_data_node", self._enhanced_raw_data_node) 
            builder.add_node("fraud_investigation", self._enhanced_fraud_investigation)
            
            # Add hybrid intelligence nodes
            builder.add_node("ai_confidence_assessment", self._ai_confidence_assessment_node)
            builder.add_node("hybrid_orchestrator", self._hybrid_orchestrator_node)
            builder.add_node("safety_validation", self._safety_validation_node)
            
            # Add domain agents with hybrid tracking
            builder.add_node("network_agent", self._create_enhanced_domain_agent("network", network_agent_node))
            builder.add_node("device_agent", self._create_enhanced_domain_agent("device", device_agent_node))
            builder.add_node("location_agent", self._create_enhanced_domain_agent("location", location_agent_node))
            builder.add_node("logs_agent", self._create_enhanced_domain_agent("logs", logs_agent_node))
            builder.add_node("authentication_agent", self._create_enhanced_domain_agent("authentication", authentication_agent_node))
            builder.add_node("risk_agent", self._create_enhanced_domain_agent("risk", risk_agent_node))
            
            # Add summary and completion nodes
            builder.add_node("summary", self._enhanced_summary_node)
            builder.add_node("complete", self._enhanced_complete_node)
            
            # Configure tools with hybrid intelligence
            await self._add_tool_nodes(builder, use_enhanced_tools)
            
            # Define hybrid workflow edges
            self._define_workflow_edges(builder)
            
            # Compile graph with persistence
            memory = await self._create_hybrid_memory()
            
            graph = builder.compile(
                checkpointer=memory,
                interrupt_before=["tools"] if use_enhanced_tools else [],
                debug=True
            )
            
            logger.info("✅ Hybrid intelligence graph compiled successfully")
            logger.info(f"   Nodes: {len(graph.nodes)}")
            logger.info(f"   Intelligence mode: {self.intelligence_mode}")
            
            return graph
            
        except Exception as e:
            logger.error(f"❌ Failed to build hybrid graph: {str(e)}")
            raise Exception(f"Hybrid graph construction failed: {str(e)}")
    
    async def _enhanced_start_investigation(
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
    
    async def _enhanced_raw_data_node(
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
            base_result["confidence_factors"]["data_completeness"] = data_quality
        
        logger.debug(f"✅ Raw data processed")
        
        return base_result
    
    async def _enhanced_fraud_investigation(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced fraud investigation with AI confidence integration"""
        
        logger.debug(f"🕵️ Hybrid Intelligence fraud investigation starting")
        logger.debug(f"   AI-powered investigation velocity tracking")
        logger.debug(f"   Performance metrics: Real-time optimization")
        
        # Call original assistant (synchronous function)
        assistant_result = assistant(state, config)
        
        # Merge assistant result back into hybrid state
        enhanced_state = state.copy()
        enhanced_state.update(assistant_result)
        
        # Update performance metrics in the hybrid state
        enhanced_state["performance_metrics"]["investigation_velocity"] = (
            enhanced_state["performance_metrics"].get("investigation_velocity", 0) + 0.1
        )
        
        logger.debug(f"✅ Fraud investigation enhanced")
        
        return enhanced_state
    
    async def _ai_confidence_assessment_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """AI confidence assessment and decision generation node"""
        
        logger.info(f"🧠 Hybrid Intelligence AI confidence assessment starting")
        logger.debug(f"   Multi-factor analysis: Snowflake(35%) + Tool(25%) + Domain(20%) + Pattern(15%) + Velocity(5%)")
        logger.debug(f"   Confidence engine: Advanced evidence quality calculation")
        
        try:
            # Calculate AI confidence and routing decision
            ai_decision = await self.confidence_engine.calculate_investigation_confidence(state)
            
            # Update state with new confidence
            updated_state = update_ai_confidence(state, ai_decision, "confidence_assessment")
            
            # Add confidence assessment to audit trail
            updated_state["decision_audit_trail"].append({
                "timestamp": datetime.now().isoformat(),
                "decision_type": "confidence_assessment",
                "details": {
                    "confidence": ai_decision.confidence,
                    "confidence_level": ai_decision.confidence_level.value,
                    "strategy": ai_decision.strategy.value,
                    "recommended_action": ai_decision.recommended_action,
                    "reasoning": ai_decision.reasoning
                }
            })
            
            logger.info(f"✅ AI confidence assessed: {ai_decision.confidence:.3f} ({ai_decision.confidence_level.value})")
            logger.info(f"   Strategy: {ai_decision.strategy.value}")
            logger.info(f"   Recommended action: {ai_decision.recommended_action}")
            
            return updated_state
            
        except Exception as e:
            logger.error(f"❌ AI confidence assessment failed: {str(e)}")
            
            # Add error to state
            state["errors"].append({
                "timestamp": datetime.now().isoformat(),
                "error_type": "confidence_assessment_failure",
                "message": str(e),
                "recovery_action": "fallback_to_safety_mode"
            })
            
            return state
    
    async def _safety_validation_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Safety validation and override detection node"""
        
        logger.debug(f"🛡️ Hybrid Intelligence safety validation starting")
        logger.debug(f"   Advanced Safety Manager: Dynamic limits & resource monitoring")
        logger.debug(f"   Safety validation: AI control authorization & termination checks")
        
        try:
            # Validate current state
            safety_status = self.safety_manager.validate_current_state(state)
            
            # Update dynamic limits
            state["dynamic_limits"] = {
                "max_orchestrator_loops": safety_status.current_limits.max_orchestrator_loops,
                "max_tool_executions": safety_status.current_limits.max_tool_executions,
                "max_domain_attempts": safety_status.current_limits.max_domain_attempts,
                "max_investigation_time_minutes": safety_status.current_limits.max_investigation_time_minutes
            }
            
            # Record safety concerns
            if safety_status.safety_concerns:
                state["safety_concerns"].extend([{
                    "timestamp": datetime.now().isoformat(),
                    "concern": concern,
                    "safety_level": safety_status.safety_level.value,
                    "resource_pressure": safety_status.resource_pressure
                } for concern in safety_status.safety_concerns])
            
            # Add safety validation to audit trail
            state["decision_audit_trail"].append({
                "timestamp": datetime.now().isoformat(),
                "decision_type": "safety_validation",
                "details": {
                    "safety_level": safety_status.safety_level.value,
                    "ai_control_allowed": safety_status.allows_ai_control,
                    "termination_required": safety_status.requires_immediate_termination,
                    "resource_pressure": safety_status.resource_pressure,
                    "safety_concerns": len(safety_status.safety_concerns)
                }
            })
            
            logger.info(f"✅ Safety validation complete")
            logger.info(f"   Safety level: {safety_status.safety_level.value}")
            logger.info(f"   AI control allowed: {safety_status.allows_ai_control}")
            logger.info(f"   Resource pressure: {safety_status.resource_pressure:.3f}")
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Safety validation failed: {str(e)}")
            
            # Add error and force strict safety mode
            state["errors"].append({
                "timestamp": datetime.now().isoformat(),
                "error_type": "safety_validation_failure", 
                "message": str(e),
                "recovery_action": "force_strict_safety"
            })
            
            return state
    
    async def _hybrid_orchestrator_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Main hybrid orchestrator node combining AI and safety decisions"""
        
        logger.info(f"🎛️ Hybrid Intelligence orchestrator executing")
        logger.debug(f"   Intelligent Router: AI confidence + safety validation")
        logger.debug(f"   Routing strategies: CRITICAL_PATH | MINIMAL | FOCUSED | ADAPTIVE | COMPREHENSIVE")
        
        try:
            # Get hybrid routing decision
            routing_decision = await self.intelligent_router.get_hybrid_routing_decision(state)
            
            # Update orchestrator loop count
            state["orchestrator_loops"] = state.get("orchestrator_loops", 0) + 1
            
            # Add routing decision to state
            state["routing_decisions"] = state.get("routing_decisions", [])
            state["routing_decisions"].append({
                "timestamp": datetime.now().isoformat(),
                "decision": routing_decision["next_node"],
                "confidence": routing_decision.get("confidence", 0.0),
                "reasoning": routing_decision.get("reasoning", []),
                "safety_override": routing_decision.get("safety_override", False)
            })
            
            # Update audit trail
            state["decision_audit_trail"].append({
                "timestamp": datetime.now().isoformat(),
                "decision_type": "hybrid_orchestration",
                "details": routing_decision
            })
            
            logger.info(f"✅ Hybrid orchestrator decision: {routing_decision['next_node']}")
            if routing_decision.get("safety_override"):
                logger.warning(f"⚠️ Safety override applied: {routing_decision.get('override_reason')}")
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Hybrid orchestrator failed: {str(e)}")
            
            # Add error and return safe fallback
            state["errors"].append({
                "timestamp": datetime.now().isoformat(),
                "error_type": "hybrid_orchestration_failure",
                "message": str(e),
                "recovery_action": "fallback_to_summary"
            })
            
            return state
    
    def _create_enhanced_domain_agent(self, domain_name: str, original_agent):
        """Create enhanced domain agent with hybrid intelligence tracking"""
        
        async def enhanced_domain_agent(
            state: HybridInvestigationState,
            config: Optional[Dict] = None
        ) -> HybridInvestigationState:
            
            logger.info(f"🎯 Hybrid Intelligence {domain_name} agent starting")
            logger.debug(f"   Domain analysis: Enhanced with confidence tracking & audit trail")
            logger.debug(f"   Performance metrics: Real-time completion time monitoring")
            
            try:
                # Call original domain agent
                result = await original_agent(state, config)
                
                # Update domain completion tracking
                domains_completed = set(result.get("domains_completed", []))
                domains_completed.add(domain_name)
                result["domains_completed"] = list(domains_completed)
                
                # Update confidence factors based on domain findings
                domain_findings = result.get("domain_findings", {})
                if domain_name in domain_findings:
                    finding_quality = domain_findings[domain_name].get("confidence", 0.5)
                    result["confidence_factors"][f"{domain_name}_analysis"] = finding_quality
                
                # Update performance metrics
                result["performance_metrics"][f"{domain_name}_completion_time"] = datetime.now().timestamp()
                
                # Add domain completion to audit trail
                result["decision_audit_trail"].append({
                    "timestamp": datetime.now().isoformat(),
                    "decision_type": "domain_completion",
                    "details": {
                        "domain": domain_name,
                        "findings_available": domain_name in domain_findings,
                        "total_domains_completed": len(domains_completed)
                    }
                })
                
                logger.info(f"✅ Enhanced {domain_name} agent completed")
                logger.info(f"   Domains completed: {len(domains_completed)}/6")
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Enhanced {domain_name} agent failed: {str(e)}")
                
                # Add error to state
                state["errors"].append({
                    "timestamp": datetime.now().isoformat(),
                    "error_type": f"{domain_name}_agent_failure",
                    "message": str(e),
                    "recovery_action": "continue_with_next_domain"
                })
                
                return state
        
        return enhanced_domain_agent
    
    async def _enhanced_summary_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Enhanced summary node with hybrid intelligence reporting"""
        
        logger.info(f"📋 Hybrid Intelligence summary generation starting")
        logger.debug(f"   Comprehensive reporting: AI decisions + Safety overrides + Performance metrics")
        logger.debug(f"   Investigation efficiency: Multi-factor calculation (time, coverage, safety)")
        
        try:
            # Generate hybrid intelligence summary
            investigation_summary = self._generate_hybrid_summary(state)
            
            # Update state
            state["current_phase"] = "summary"
            state["end_time"] = datetime.now().isoformat()
            
            # Calculate total duration
            if state.get("start_time"):
                from dateutil.parser import parse
                start_dt = parse(state["start_time"])
                end_dt = datetime.now()
                duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
                state["total_duration_ms"] = duration_ms
            
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
            
            logger.info(f"✅ Enhanced summary completed")
            logger.info(f"   Duration: {state.get('total_duration_ms', 0)}ms")
            logger.info(f"   Final confidence: {state.get('ai_confidence', 0.0):.3f}")
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Enhanced summary failed: {str(e)}")
            
            # Add basic summary on error
            state["messages"].append(AIMessage(content=f"Investigation completed with errors: {str(e)}"))
            state["current_phase"] = "summary"
            state["end_time"] = datetime.now().isoformat()
            
            return state
    
    async def _enhanced_complete_node(
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
        state["performance_metrics"]["final_efficiency"] = self._calculate_investigation_efficiency(state)
        state["investigation_efficiency"] = state["performance_metrics"]["final_efficiency"]
        
        # Log final statistics
        logger.info(f"📊 Final Investigation Statistics:")
        logger.info(f"   Investigation ID: {state.get('investigation_id')}")
        logger.info(f"   Total duration: {state.get('total_duration_ms', 0)}ms") 
        logger.info(f"   Orchestrator loops: {state.get('orchestrator_loops', 0)}")
        logger.info(f"   Domains completed: {len(state.get('domains_completed', []))}/6")
        logger.info(f"   Tools used: {len(state.get('tools_used', []))}")
        logger.info(f"   Safety overrides: {len(state.get('safety_overrides', []))}")
        logger.info(f"   Final confidence: {state.get('ai_confidence', 0.0):.3f}")
        logger.info(f"   Investigation efficiency: {state.get('investigation_efficiency', 0.0):.3f}")
        
        return state
    
    def _generate_hybrid_summary(self, state: HybridInvestigationState) -> str:
        """Generate comprehensive hybrid intelligence summary"""
        
        # Collect key metrics
        investigation_id = state.get("investigation_id", "Unknown")
        entity_type = state.get("entity_type", "unknown")
        entity_id = state.get("entity_id", "unknown")
        final_confidence = state.get("ai_confidence", 0.0)
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN).value
        strategy = state.get("investigation_strategy", "unknown").value if hasattr(state.get("investigation_strategy", "unknown"), 'value') else "unknown"
        
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))
        safety_overrides = len(state.get("safety_overrides", []))
        
        risk_score = state.get("risk_score", 0.0)
        risk_indicators = state.get("risk_indicators", [])
        
        duration_ms = state.get("total_duration_ms", 0)
        efficiency = state.get("investigation_efficiency", 0.0)
        
        # Build summary
        summary_parts = [
            f"# Hybrid Intelligence Investigation Summary",
            f"",
            f"## Investigation Details",
            f"- **Investigation ID**: {investigation_id}",
            f"- **Entity**: {entity_type} - {entity_id}",
            f"- **Duration**: {duration_ms}ms ({duration_ms/1000:.1f} seconds)",
            f"- **Investigation Strategy**: {strategy}",
            f"",
            f"## AI Intelligence Analysis",
            f"- **Final Confidence**: {final_confidence:.3f} ({confidence_level})",
            f"- **Orchestrator Loops**: {orchestrator_loops}",
            f"- **Strategy Effectiveness**: {'High' if efficiency > 0.7 else 'Medium' if efficiency > 0.4 else 'Low'}",
            f"- **Investigation Efficiency**: {efficiency:.3f}",
            f"",
            f"## Investigation Coverage",
            f"- **Domains Analyzed**: {domains_completed}/6",
            f"- **Tools Utilized**: {tools_used}",
            f"- **Data Sources**: Snowflake" + (", Additional Tools" if tools_used > 0 else ""),
            f"",
            f"## Risk Assessment",
            f"- **Risk Score**: {risk_score:.3f}",
            f"- **Risk Indicators**: {len(risk_indicators)}",
            f"- **Fraud Likelihood**: {'High' if risk_score > 0.7 else 'Medium' if risk_score > 0.4 else 'Low'}",
            f"",
            f"## Safety and Compliance",
            f"- **Safety Overrides**: {safety_overrides}",
            f"- **Investigation Completed**: {'Successfully' if state.get('current_phase') == 'complete' else 'With Issues'}",
            f"- **Resource Utilization**: Efficient" if safety_overrides == 0 else "Required Safety Intervention",
            f""
        ]
        
        # Add risk indicators if present
        if risk_indicators:
            summary_parts.extend([
                f"## Identified Risk Indicators",
                f""
            ])
            for indicator in risk_indicators[:5]:  # Show top 5
                summary_parts.append(f"- {indicator}")
            summary_parts.append(f"")
        
        # Add AI decision summary
        ai_decisions = state.get("ai_decisions", [])
        if ai_decisions:
            final_decision = ai_decisions[-1]
            summary_parts.extend([
                f"## AI Decision Analysis",
                f"- **Evidence Quality**: {final_decision.evidence_quality:.3f}",
                f"- **Investigation Completeness**: {final_decision.investigation_completeness:.3f}",
                f"- **Resource Impact**: {final_decision.resource_impact}",
                f"- **Strategy Recommendation**: {final_decision.strategy.value}",
                f""
            ])
        
        # Add performance insights
        summary_parts.extend([
            f"## Performance Insights",
            f"- **System**: Hybrid Intelligence Graph v{state.get('hybrid_system_version', '1.0.0')}",
            f"- **Intelligence Mode**: {self.intelligence_mode}",
            f"- **Optimization**: {'AI-Optimized' if final_confidence > 0.7 else 'Safety-First'}",
            f"- **Resource Efficiency**: {'Excellent' if safety_overrides == 0 else 'Good with Safety Controls'}",
            f"",
            f"---",
            f"*Generated by Hybrid Intelligence Graph System*"
        ])
        
        return "\n".join(summary_parts)
    
    def _calculate_investigation_efficiency(self, state: HybridInvestigationState) -> float:
        """Calculate overall investigation efficiency"""
        
        # Base efficiency factors
        duration_ms = state.get("total_duration_ms", 0)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))
        safety_overrides = len(state.get("safety_overrides", []))
        
        # Time efficiency (faster is better, but not too fast)
        time_efficiency = 1.0
        if duration_ms > 0:
            ideal_time_ms = 30000  # 30 seconds ideal
            time_ratio = duration_ms / ideal_time_ms
            time_efficiency = max(0.1, min(1.0, 1.0 / (1.0 + abs(time_ratio - 1.0))))
        
        # Loop efficiency (fewer loops better, but not too few)
        loop_efficiency = max(0.1, min(1.0, 1.0 / (1.0 + max(0, orchestrator_loops - 8))))
        
        # Coverage efficiency (more domains and tools generally better)
        coverage_efficiency = (domains_completed / 6.0) * 0.7 + min(1.0, tools_used / 5.0) * 0.3
        
        # Safety efficiency (fewer overrides better)
        safety_efficiency = max(0.5, 1.0 - (safety_overrides * 0.2))
        
        # Overall efficiency
        efficiency = (
            time_efficiency * 0.25 +
            loop_efficiency * 0.25 +
            coverage_efficiency * 0.25 +
            safety_efficiency * 0.25
        )
        
        return min(1.0, max(0.0, efficiency))
    
    async def _add_tool_nodes(self, builder: StateGraph, use_enhanced_tools: bool):
        """Add tool nodes to the graph"""
        
        # Get available tools using the same approach as clean graph builder
        from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
        from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
        
        try:
            # Initialize the tool registry
            initialize_tools()
            
            # Get all tools from all categories (same as clean graph)
            tools = get_tools_for_agent(
                categories=[
                    "olorin",           # Snowflake, Splunk, SumoLogic
                    "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
                    "database",         # Database query tools
                    "search",           # Vector search
                    "blockchain",       # Crypto analysis
                    "intelligence",     # OSINT, social media
                    "ml_ai",           # ML-powered analysis
                    "web",             # Web search and scraping
                    "file_system",     # File operations
                    "api",             # API tools
                    "mcp_clients",     # MCP client tools
                    "mcp_servers",     # Internal MCP servers
                    "utility"          # Utility tools
                ]
            )
            
            # Add primary Snowflake tool (same as clean graph)
            snowflake_tool = SnowflakeQueryTool()
            if snowflake_tool not in tools:
                tools.insert(0, snowflake_tool)
                logger.info("✅ Added SnowflakeQueryTool as PRIMARY tool")
            
            logger.info(f"📦 Loaded {len(tools)} tools for hybrid investigation")
            
        except Exception as e:
            logger.error(f"❌ Failed to load tools: {str(e)}")
            # Fallback to minimal tool set
            tools = [SnowflakeQueryTool()]
            logger.warning(f"⚠️ Using fallback tools: {len(tools)} tools")
        
        if use_enhanced_tools:
            # Use enhanced tool node with hybrid tracking
            tool_node = EnhancedToolNode(tools)
            builder.add_node("tools", self._create_enhanced_tool_node(tool_node))
        else:
            # Use standard tool node
            builder.add_node("tools", ToolNode(tools))
    
    def _create_enhanced_tool_node(self, tool_node):
        """Create enhanced tool node with hybrid intelligence tracking"""
        
        async def enhanced_tool_execution(
            state: HybridInvestigationState,
            config: Optional[Dict] = None
        ) -> HybridInvestigationState:
            
            logger.debug(f"🔧 Hybrid Intelligence enhanced tool execution starting")
            logger.debug(f"   Tool tracking: Execution attempts, results quality, performance efficiency")
            logger.debug(f"   Enhanced tools: AI-optimized execution with comprehensive audit trail")
            
            try:
                # Call original tool node
                result = await tool_node.execute(state, config)
                
                # Update tool execution tracking
                result["tool_execution_attempts"] = result.get("tool_execution_attempts", 0) + 1
                
                # Update performance metrics
                result["performance_metrics"]["tool_execution_efficiency"] = (
                    len(result.get("tool_results", {})) / max(1, len(result.get("tools_used", [])))
                )
                
                # Add tool execution to audit trail
                result["decision_audit_trail"].append({
                    "timestamp": datetime.now().isoformat(),
                    "decision_type": "tool_execution",
                    "details": {
                        "tools_executed": len(result.get("tools_used", [])),
                        "execution_attempt": result.get("tool_execution_attempts", 0),
                        "results_obtained": len(result.get("tool_results", {}))
                    }
                })
                
                logger.debug(f"✅ Enhanced tool execution completed")
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Enhanced tool execution failed: {str(e)}")
                
                # Add error to state
                state["errors"].append({
                    "timestamp": datetime.now().isoformat(),
                    "error_type": "tool_execution_failure",
                    "message": str(e),
                    "recovery_action": "continue_without_tools"
                })
                
                return state
        
        return enhanced_tool_execution
    
    def _define_workflow_edges(self, builder: StateGraph):
        """Define the hybrid workflow edges"""
        
        # Start with investigation
        builder.add_edge(START, "start_investigation")
        
        # Raw data or investigation routing
        builder.add_conditional_edges(
            "start_investigation",
            raw_data_or_investigation_routing,
            {
                "raw_data_node": "raw_data_node",
                "fraud_investigation": "fraud_investigation"
            }
        )
        
        # Raw data flows to fraud investigation
        builder.add_edge("raw_data_node", "fraud_investigation")
        
        # Add tools_condition routing from fraud_investigation
        builder.add_conditional_edges(
            "fraud_investigation",
            tools_condition,
            {
                "tools": "tools",
                "__end__": "ai_confidence_assessment"  # Continue to AI confidence when no tools needed
            }
        )
        
        # Tools flow back to fraud investigation for continued processing
        builder.add_edge("tools", "fraud_investigation")
        
        # AI confidence flows to safety validation
        builder.add_edge("ai_confidence_assessment", "safety_validation")
        
        # Safety validation flows to hybrid orchestrator
        builder.add_edge("safety_validation", "hybrid_orchestrator")
        
        # Hybrid orchestrator uses intelligent routing
        builder.add_conditional_edges(
            "hybrid_orchestrator",
            self.intelligent_router.hybrid_routing_function,
            {
                # Phase routing
                "ai_confidence_assessment": "ai_confidence_assessment",
                "safety_validation": "safety_validation", 
                "summary": "summary",
                "complete": "complete",
                
                # Domain agents
                "network_agent": "network_agent",
                "device_agent": "device_agent",
                "location_agent": "location_agent",
                "logs_agent": "logs_agent",
                "authentication_agent": "authentication_agent",
                "risk_agent": "risk_agent",
                
                # Tools
                "tools": "tools"
            }
        )
        
        # Domain agents flow back to orchestrator for coordination
        domain_agents = ["network_agent", "device_agent", "location_agent", "logs_agent", "authentication_agent", "risk_agent"]
        for agent in domain_agents:
            builder.add_edge(agent, "hybrid_orchestrator")
        
        # Tools flow back to orchestrator
        builder.add_edge("tools", "hybrid_orchestrator")
        
        # Summary flows to complete
        builder.add_edge("summary", "complete")
        
        # Complete ends the graph
        builder.add_edge("complete", END)
    
    async def _create_hybrid_memory(self):
        """Create memory system for hybrid graph"""
        
        try:
            # Try to use Redis for persistence
            from langgraph.checkpoint.redis import RedisSaver
            from app.service.redis_client import get_redis_client
            from app.service.config import get_settings_for_env
            
            settings = get_settings_for_env()
            redis_client = get_redis_client(settings).get_client()
            
            memory = RedisSaver(redis_client)
            logger.info("🛡️ Using Redis memory for hybrid graph persistence")
            return memory
            
        except Exception:
            # Fallback to in-memory
            from langgraph.checkpoint.memory import MemorySaver
            
            memory = MemorySaver()
            logger.info("🛡️ Using in-memory storage for hybrid graph (Redis unavailable)")
            return memory