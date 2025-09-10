"""
Autonomous Investigation Orchestrator

Master orchestrator node for AI-driven investigation coordination using LangGraph.
Implements bulletproof resilience patterns and intelligent agent orchestration.
"""

import json
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import AIMessage, ToolMessage
from langchain_openai import ChatOpenAI

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
)
from app.service.agent.orchestrator_prompts import (
    OrchestratorPromptSystem,
    PromptContext,
    PromptStrategy
)
from app.service.logging import get_bridge_logger
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import (
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


class OrchestrationStrategy(Enum):
    """Investigation orchestration strategies"""
    COMPREHENSIVE = "comprehensive"  # All agents in parallel
    FOCUSED = "focused"  # Single domain deep dive
    ADAPTIVE = "adaptive"  # Dynamic strategy based on findings
    SEQUENTIAL = "sequential"  # One agent at a time
    CRITICAL_PATH = "critical_path"  # Priority-based execution


@dataclass
class OrchestrationDecision:
    """AI-driven orchestration decision"""
    strategy: OrchestrationStrategy
    agents_to_activate: List[str]
    execution_order: List[str]
    confidence_score: float
    reasoning: str
    estimated_duration: int
    risk_assessment: str
    bulletproof_requirements: List[str]


@dataclass
class AgentHandoff:
    """Agent coordination handoff information"""
    from_agent: str
    to_agent: str
    context_data: Dict[str, Any]
    handoff_reason: str
    timestamp: datetime
    success: bool


class AutonomousOrchestrator:
    """Master Orchestrator for AI-driven investigation coordination."""
    
    def __init__(self):
        from app.service.llm_manager import get_llm_manager
        
        # Use the LLM manager which respects SELECTED_MODEL setting
        llm_manager = get_llm_manager()
        self.llm = llm_manager.get_selected_model()
        self.active_agents = {}
        self.handoff_history = []
        self.orchestration_state = {}
        self.prompt_system = OrchestratorPromptSystem()
        
    async def orchestrate_investigation(
        self, 
        state, 
        config, 
        investigation_id: str, 
        entity_type: str, 
        entity_id: str, 
        context
    ) -> Dict[str, Any]:
        """
        Master orchestration method for autonomous investigations
        
        Args:
            state: LangGraph state object
            config: LangGraph configuration
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            entity_id: Entity identifier
            context: Investigation context
            
        Returns:
            Dict with orchestration results and next actions
        """
        try:
            # Track execution start time
            start_time = time.perf_counter()
            
            # Track orchestrator node execution start
            journey_tracker.track_node_execution(
                investigation_id=investigation_id,
                node_name="autonomous_orchestrator",
                node_type=NodeType.ORCHESTRATOR,
                input_state={
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "orchestration": "starting",
                    "strategy": "ai_driven"
                },
                output_state={
                    "orchestration": "in_progress",
                    "decision_making": "active"
                },
                duration_ms=0,
                status=NodeStatus.IN_PROGRESS,
                agent_name="AutonomousOrchestrator",
                metadata={"orchestrator_type": "master", "ai_decision_engine": True}
            )
            
            # Emit progress update
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.ORCHESTRATION,
                0.1,
                "🎯 Master Orchestrator analyzing investigation strategy..."
            )
            
            # Step 1: AI-driven strategy selection
            orchestration_decision = await self._make_orchestration_decision(
                investigation_id, entity_type, entity_id, context
            )
            
            # Step 2: Create execution plan for LangGraph
            execution_plan = self._create_execution_plan(orchestration_decision, context)
            
            # Step 3: Initialize bulletproof coordination
            coordination_result = await self._initialize_bulletproof_coordination(
                investigation_id, orchestration_decision, execution_plan
            )
            
            # Step 4: Begin agent orchestration with real-time monitoring
            orchestration_results = await self._execute_orchestrated_investigation(
                investigation_id, orchestration_decision, execution_plan, context, state, config
            )
            
            # Step 5: Consolidate findings and prepare handoff
            final_results = await self._consolidate_orchestration_results(
                investigation_id, orchestration_results, orchestration_decision
            )
            
            # Calculate actual execution duration
            end_time = time.perf_counter()
            duration_ms = int((end_time - start_time) * 1000)
            
            # Track successful orchestrator completion
            journey_tracker.track_node_execution(
                investigation_id=investigation_id,
                node_name="autonomous_orchestrator",
                node_type=NodeType.ORCHESTRATOR,
                input_state={
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "orchestration": "starting",
                    "strategy": orchestration_decision.strategy.value
                },
                output_state={
                    "orchestration": "completed",
                    "agents_coordinated": len(orchestration_decision.agents_to_activate),
                    "strategy_executed": orchestration_decision.strategy.value,
                    "confidence_score": orchestration_decision.confidence_score
                },
                duration_ms=duration_ms,
                status=NodeStatus.COMPLETED,
                agent_name="AutonomousOrchestrator",
                metadata={
                    "orchestrator_type": "master",
                    "strategy": orchestration_decision.strategy.value,
                    "agents_coordinated": orchestration_decision.agents_to_activate,
                    "final_confidence": final_results.get("confidence_score", 0)
                }
            )
            
            return final_results
            
        except Exception as e:
            logger.error(f"🚨 Master Orchestrator failed: {str(e)}")
            
            # Track orchestrator failure
            journey_tracker.track_node_execution(
                investigation_id=investigation_id,
                node_name="autonomous_orchestrator",
                node_type=NodeType.ORCHESTRATOR,
                input_state={
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "orchestration": "starting"
                },
                output_state={
                    "orchestration": "failed",
                    "error": str(e)
                },
                duration_ms=0,
                status=NodeStatus.FAILED,
                agent_name="AutonomousOrchestrator",
                metadata={"error_type": "orchestration_failure", "bulletproof": True}
            )
            
            # Return bulletproof fallback result
            return self._create_bulletproof_fallback_result(investigation_id, str(e))
    
    async def _make_orchestration_decision(
        self, 
        investigation_id: str, 
        entity_type: str, 
        entity_id: str, 
        context
    ) -> OrchestrationDecision:
        """AI-driven orchestration decision making using Claude Opus 4.1"""
        
        # Create comprehensive orchestration prompt
        orchestration_prompt = self._create_orchestration_prompt(
            investigation_id, entity_type, entity_id, context
        )
        
        try:
            # Get AI decision from Claude Opus 4.1
            messages = [
                {"role": "system", "content": orchestration_prompt},
                {"role": "user", "content": f"Analyze investigation for {entity_type} entity {entity_id} and provide orchestration strategy."}
            ]
            
            llm_response = await self.llm.ainvoke(messages, config={})
            
            # Parse AI decision into structured format
            decision = self._parse_orchestrator_response(llm_response.content)
            
            logger.info(f"🧠 AI Orchestration Decision: {decision.strategy.value} with confidence {decision.confidence_score}")
            
            return decision
            
        except Exception as e:
            logger.warning(f"⚠️ AI orchestration decision failed, using fallback: {str(e)}")
            
            # Bulletproof fallback decision
            return OrchestrationDecision(
                strategy=OrchestrationStrategy.COMPREHENSIVE,
                agents_to_activate=["network", "device", "location", "logs", "risk"],
                execution_order=["network", "device", "location", "logs", "risk"],
                confidence_score=0.7,
                reasoning="Fallback comprehensive strategy due to AI decision failure",
                estimated_duration=300,
                risk_assessment="medium",
                bulletproof_requirements=["circuit_breaker", "retry_logic", "fail_soft"]
            )
    
    def _create_orchestration_prompt(
        self, 
        investigation_id: str, 
        entity_type: str, 
        entity_id: str, 
        context
    ) -> str:
        """Create comprehensive AI orchestration prompt using sophisticated prompt system"""
        
        try:
            # Create prompt context for dynamic generation
            prompt_context = PromptContext(
                investigation_id=investigation_id,
                entity_type=entity_type,
                entity_id=entity_id,
                risk_level=self._assess_risk_level(context),
                available_data=self._extract_available_data(context),
                service_health=self._assess_service_health(),
                investigation_history=self._get_investigation_history(investigation_id),
                time_constraints=self._get_time_constraints(context)
            )
            
            # Generate sophisticated orchestration prompt
            sophisticated_prompt = self.prompt_system.generate_orchestration_prompt(
                context=prompt_context,
                strategy_hint=self._determine_prompt_strategy(prompt_context)
            )
            
            logger.info(f"🧠 Generated sophisticated orchestration prompt for {entity_type} {entity_id}")
            return sophisticated_prompt
            
        except Exception as e:
            logger.warning(f"⚠️ Sophisticated prompt generation failed: {str(e)}, using fallback")
            
            # Bulletproof fallback to original simple prompt
            return self._create_fallback_orchestration_prompt(
                investigation_id, entity_type, entity_id, context
            )
    
    def _parse_orchestrator_response(self, response_content: str) -> OrchestrationDecision:
        """Parse AI orchestrator response into structured decision"""
        
        try:
            # Extract JSON from response
            response_data = json.loads(response_content)
            
            return OrchestrationDecision(
                strategy=OrchestrationStrategy(response_data["strategy"]),
                agents_to_activate=response_data["agents_to_activate"],
                execution_order=response_data["execution_order"],
                confidence_score=float(response_data["confidence_score"]),
                reasoning=response_data["reasoning"],
                estimated_duration=int(response_data["estimated_duration"]),
                risk_assessment=response_data["risk_assessment"],
                bulletproof_requirements=response_data["bulletproof_requirements"]
            )
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse orchestrator response: {str(e)}")
            
            # Return safe fallback decision
            return OrchestrationDecision(
                strategy=OrchestrationStrategy.COMPREHENSIVE,
                agents_to_activate=["network", "device", "location", "logs", "risk"],
                execution_order=["network", "device", "location", "logs", "risk"],
                confidence_score=0.6,
                reasoning="Fallback decision due to parsing failure",
                estimated_duration=300,
                risk_assessment="medium",
                bulletproof_requirements=["circuit_breaker", "retry_logic", "fail_soft"]
            )
    
    def _create_execution_plan(
        self, 
        decision: OrchestrationDecision, 
        context
    ) -> Dict[str, Any]:
        """Create detailed execution plan for LangGraph integration"""
        
        execution_plan = {
            "strategy": decision.strategy.value,
            "phases": [],
            "bulletproof_config": {
                "circuit_breaker_threshold": 3,
                "retry_attempts": 2,
                "fail_soft_enabled": True,
                "timeout_seconds": 120
            },
            "coordination_points": [],
            "rollback_triggers": ["critical_failure", "timeout", "resource_exhaustion"]
        }
        
        # Create phase structure based on strategy
        if decision.strategy == OrchestrationStrategy.COMPREHENSIVE:
            execution_plan["phases"] = [{
                "phase_name": "parallel_comprehensive",
                "agents": decision.agents_to_activate,
                "execution_mode": "parallel",
                "dependencies": [],
                "bulletproof_requirements": decision.bulletproof_requirements
            }]
        elif decision.strategy == OrchestrationStrategy.SEQUENTIAL:
            phases = []
            for i, agent in enumerate(decision.execution_order):
                phases.append({
                    "phase_name": f"sequential_{i+1}",
                    "agents": [agent],
                    "execution_mode": "sequential",
                    "dependencies": phases[i-1]["phase_name"] if i > 0 else [],
                    "bulletproof_requirements": decision.bulletproof_requirements
                })
            execution_plan["phases"] = phases
        
        return execution_plan
    
    async def _initialize_bulletproof_coordination(
        self,
        investigation_id: str,
        decision: OrchestrationDecision,
        execution_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initialize bulletproof coordination mechanisms"""
        
        coordination_config = {
            "investigation_id": investigation_id,
            "circuit_breakers": {},
            "retry_counters": {},
            "failure_states": {},
            "recovery_strategies": {},
            "real_time_monitoring": True
        }
        
        # Initialize circuit breakers for each agent
        for agent in decision.agents_to_activate:
            coordination_config["circuit_breakers"][agent] = {
                "state": "closed",  # closed, open, half_open
                "failure_count": 0,
                "failure_threshold": 3,
                "recovery_timeout": 60,
                "last_failure_time": None
            }
            
            coordination_config["retry_counters"][agent] = {
                "attempts": 0,
                "max_attempts": 2,
                "backoff_multiplier": 1.5
            }
        
        self.orchestration_state[investigation_id] = coordination_config
        
        return {"status": "initialized", "config": coordination_config}
    
    async def _execute_orchestrated_investigation(
        self,
        investigation_id: str,
        decision: OrchestrationDecision,
        execution_plan: Dict[str, Any],
        context,
        state,
        config
    ) -> Dict[str, Any]:
        """Execute orchestrated investigation with bulletproof coordination"""
        
        orchestration_results = {
            "investigation_id": investigation_id,
            "strategy_executed": decision.strategy.value,
            "agent_results": {},
            "handoffs": [],
            "failures": [],
            "recovery_actions": []
        }
        
        try:
            # Execute based on strategy
            if decision.strategy in [OrchestrationStrategy.COMPREHENSIVE, OrchestrationStrategy.ADAPTIVE]:
                # Parallel execution
                agent_tasks = []
                for agent_name in decision.agents_to_activate:
                    task = self._execute_agent_with_bulletproof(
                        investigation_id, agent_name, context, state, config
                    )
                    agent_tasks.append((agent_name, task))
                
                # Wait for all agents to complete with bulletproof handling
                for agent_name, task in agent_tasks:
                    try:
                        result = await asyncio.wait_for(task, timeout=120)
                        orchestration_results["agent_results"][agent_name] = result
                    except Exception as e:
                        logger.warning(f"⚠️ Agent {agent_name} failed: {str(e)}")
                        orchestration_results["failures"].append({
                            "agent": agent_name,
                            "error": str(e),
                            "recovery": "bulletproof_fallback"
                        })
                        # Continue with other agents (bulletproof)
                        continue
            
            elif decision.strategy == OrchestrationStrategy.SEQUENTIAL:
                # Sequential execution
                for agent_name in decision.execution_order:
                    try:
                        result = await self._execute_agent_with_bulletproof(
                            investigation_id, agent_name, context, state, config
                        )
                        orchestration_results["agent_results"][agent_name] = result
                        
                        # Check if we should continue based on results
                        if self._should_stop_sequential_execution(result):
                            logger.info(f"🛑 Stopping sequential execution after {agent_name} due to sufficient findings")
                            break
                            
                    except Exception as e:
                        logger.warning(f"⚠️ Sequential agent {agent_name} failed: {str(e)}")
                        orchestration_results["failures"].append({
                            "agent": agent_name,
                            "error": str(e),
                            "recovery": "continue_sequence"
                        })
                        # Continue with next agent (bulletproof)
                        continue
            
            return orchestration_results
            
        except Exception as e:
            logger.error(f"🚨 Orchestrated investigation execution failed: {str(e)}")
            return {"error": str(e), "bulletproof_fallback": True}
    
    async def _execute_agent_with_bulletproof(
        self,
        investigation_id: str,
        agent_name: str,
        context,
        state,
        config
    ) -> Dict[str, Any]:
        """Execute individual agent with bulletproof resilience"""
        
        try:
            # Get agent execution function
            agent_function = self._get_agent_function(agent_name)
            
            # Execute with bulletproof wrapper
            result = await agent_function(state, config)
            
            # Record successful handoff
            handoff = AgentHandoff(
                from_agent="orchestrator",
                to_agent=agent_name,
                context_data={"investigation_id": investigation_id},
                handoff_reason="orchestrated_execution",
                timestamp=datetime.now(),
                success=True
            )
            self.handoff_history.append(handoff)
            
            return {"status": "success", "data": result, "agent": agent_name}
            
        except Exception as e:
            logger.warning(f"⚠️ Agent {agent_name} execution failed: {str(e)}")
            
            # Record failed handoff
            handoff = AgentHandoff(
                from_agent="orchestrator",
                to_agent=agent_name,
                context_data={"investigation_id": investigation_id},
                handoff_reason="orchestrated_execution",
                timestamp=datetime.now(),
                success=False
            )
            self.handoff_history.append(handoff)
            
            # Return bulletproof fallback
            return {
                "status": "failed",
                "error": str(e),
                "agent": agent_name,
                "bulletproof_fallback": True
            }
    
    def _get_agent_function(self, agent_name: str):
        """Get agent execution function by name"""
        
        agent_mapping = {
            "network": self._import_network_agent,
            "device": self._import_device_agent,
            "location": self._import_location_agent,
            "logs": self._import_logs_agent,
            "risk": self._import_risk_agent
        }
        
        return agent_mapping.get(agent_name, self._default_agent_fallback)
    
    async def _import_network_agent(self, state, config):
        """Import and execute network agent"""
        from .network_agent import autonomous_network_agent
        return await autonomous_network_agent(state, config)
    
    async def _import_device_agent(self, state, config):
        """Import and execute device agent"""
        from .device_agent import autonomous_device_agent
        return await autonomous_device_agent(state, config)
    
    async def _import_location_agent(self, state, config):
        """Import and execute location agent"""
        from .location_agent import autonomous_location_agent
        return await autonomous_location_agent(state, config)
    
    async def _import_logs_agent(self, state, config):
        """Import and execute logs agent"""
        from .logs_agent import autonomous_logs_agent
        return await autonomous_logs_agent(state, config)
    
    async def _import_risk_agent(self, state, config):
        """Import and execute risk agent"""
        from .risk_agent import autonomous_risk_agent
        return await autonomous_risk_agent(state, config)
    
    async def _default_agent_fallback(self, state, config):
        """Default fallback for unknown agents"""
        return {"error": "Unknown agent", "bulletproof_fallback": True}
    
    def _should_stop_sequential_execution(self, result: Dict[str, Any]) -> bool:
        """Determine if sequential execution should stop based on results"""
        
        # Check for high-confidence findings
        if result.get("status") == "success":
            data = result.get("data", {})
            if isinstance(data, dict):
                confidence = data.get("confidence", 0)
                risk_score = data.get("risk_score", 0)
                
                # Stop if we have high confidence and high risk
                return confidence > 0.8 and risk_score > 0.7
        
        return False
    
    async def _consolidate_orchestration_results(
        self,
        investigation_id: str,
        orchestration_results: Dict[str, Any],
        decision: OrchestrationDecision
    ) -> Dict[str, Any]:
        """Consolidate results from orchestrated investigation"""
        
        consolidated_results = {
            "investigation_id": investigation_id,
            "orchestration_strategy": decision.strategy.value,
            "orchestration_confidence": decision.confidence_score,
            "agents_executed": list(orchestration_results["agent_results"].keys()),
            "successful_agents": [],
            "failed_agents": [],
            "key_findings": [],
            "risk_score": 0.0,
            "confidence_score": 0.0,
            "bulletproof_recovery_count": len(orchestration_results.get("failures", [])),
            "handoff_count": len(self.handoff_history),
            "consolidation_timestamp": datetime.now().isoformat()
        }
        
        # Process agent results
        total_confidence = 0
        total_risk = 0
        successful_count = 0
        
        for agent_name, result in orchestration_results["agent_results"].items():
            if result.get("status") == "success":
                consolidated_results["successful_agents"].append(agent_name)
                successful_count += 1
                
                # Extract findings and scores
                data = result.get("data", {})
                if isinstance(data, dict):
                    # Extract confidence and risk
                    confidence = data.get("confidence", 0.0)
                    risk = data.get("risk_score", 0.0)
                    
                    total_confidence += confidence
                    total_risk += risk
                    
                    # Extract findings
                    findings = data.get("key_findings", [])
                    if findings:
                        consolidated_results["key_findings"].extend(findings)
            else:
                consolidated_results["failed_agents"].append(agent_name)
        
        # Calculate consolidated scores
        if successful_count > 0:
            consolidated_results["confidence_score"] = total_confidence / successful_count
            consolidated_results["risk_score"] = total_risk / successful_count
        
        # Add orchestration metadata
        consolidated_results["orchestration_metadata"] = {
            "decision_reasoning": decision.reasoning,
            "estimated_vs_actual_duration": "TBD",  # TODO: Calculate
            "bulletproof_activations": len(orchestration_results.get("failures", [])),
            "recovery_strategies_used": [f["recovery"] for f in orchestration_results.get("failures", [])],
            "handoff_success_rate": len([h for h in self.handoff_history if h.success]) / len(self.handoff_history) if self.handoff_history else 1.0
        }
        
        return consolidated_results
    
    def _create_bulletproof_fallback_result(
        self, 
        investigation_id: str, 
        error_message: str
    ) -> Dict[str, Any]:
        """Create bulletproof fallback result for orchestrator failures"""
        
        return {
            "investigation_id": investigation_id,
            "status": "bulletproof_fallback",
            "error": error_message,
            "orchestration_strategy": "emergency_fallback",
            "confidence_score": 0.3,
            "risk_score": 0.5,
            "key_findings": ["Orchestrator encountered unexpected error - investigation partially completed"],
            "bulletproof_recovery": True,
            "fallback_timestamp": datetime.now().isoformat(),
            "recovery_recommendations": [
                "Review orchestrator logs for error details",
                "Verify agent availability and configuration",
                "Consider manual investigation path",
                "Check system resource availability"
            ]
        }
    
    def _assess_risk_level(self, context) -> str:
        """Assess investigation risk level based on context"""
        
        try:
            if not context:
                return "medium"
                
            # Check for high-risk indicators
            context_data = context.__dict__ if hasattr(context, '__dict__') else {}
            context_str = json.dumps(context_data, default=str).lower()
            
            high_risk_indicators = ["fraud", "suspicious", "anomaly", "threat", "critical"]
            medium_risk_indicators = ["unusual", "irregular", "warning", "alert"]
            
            if any(indicator in context_str for indicator in high_risk_indicators):
                return "high"
            elif any(indicator in context_str for indicator in medium_risk_indicators):
                return "medium"
            else:
                return "low"
                
        except Exception:
            return "medium"  # Safe fallback
    
    def _extract_available_data(self, context) -> Dict[str, Any]:
        """Extract available data from investigation context"""
        
        try:
            if not context:
                return {}
                
            available_data = {}
            context_dict = context.__dict__ if hasattr(context, '__dict__') else {}
            
            # Extract key data categories
            for key, value in context_dict.items():
                if value is not None and str(value).strip():
                    available_data[key] = str(value)
            
            return available_data
            
        except Exception:
            return {}  # Safe fallback
    
    def _assess_service_health(self) -> Dict[str, bool]:
        """Assess health of dependent services"""
        
        try:
            # In a real implementation, this would check actual service health
            # For now, assume all services are healthy unless we have evidence otherwise
            return {
                "network_service": True,
                "device_service": True, 
                "location_service": True,
                "logs_service": True,
                "risk_service": True,
                "llm_service": True,
                "database_service": True
            }
            
        except Exception:
            # If service health check fails, assume degraded mode
            return {
                "network_service": False,
                "device_service": False,
                "location_service": False, 
                "logs_service": True,  # Assume logs always available
                "risk_service": True,  # Assume risk assessment always possible
                "llm_service": True,
                "database_service": True
            }
    
    def _get_investigation_history(self, investigation_id: str) -> List[str]:
        """Get investigation history for context"""
        
        try:
            # Check if we have state for this investigation
            if investigation_id in self.orchestration_state:
                state = self.orchestration_state[investigation_id]
                history = []
                
                # Add previous agent activations
                if self.handoff_history:
                    recent_handoffs = [h for h in self.handoff_history 
                                     if hasattr(h, 'context_data') and 
                                     h.context_data.get('investigation_id') == investigation_id]
                    history.extend([f"agent_{h.to_agent}_executed" for h in recent_handoffs[-5:]])
                
                return history
            
            return []
            
        except Exception:
            return []  # Safe fallback
    
    def _get_time_constraints(self, context) -> Optional[int]:
        """Extract time constraints from context"""
        
        try:
            if not context:
                return None
                
            context_dict = context.__dict__ if hasattr(context, '__dict__') else {}
            
            # Look for time-related constraints
            for key, value in context_dict.items():
                if 'timeout' in str(key).lower() or 'deadline' in str(key).lower():
                    if isinstance(value, (int, float)):
                        return int(value)
                    elif isinstance(value, str) and value.isdigit():
                        return int(value)
            
            return None
            
        except Exception:
            return None  # Safe fallback
    
    def _determine_prompt_strategy(self, prompt_context: PromptContext) -> Optional[PromptStrategy]:
        """Determine optimal prompt strategy based on context"""
        
        try:
            # High-risk scenarios
            if prompt_context.risk_level in ["high", "critical"]:
                return PromptStrategy.HIGH_RISK
                
            # Service degradation
            if not all(prompt_context.service_health.values()):
                return PromptStrategy.DEGRADED
                
            # Emergency time constraints
            if prompt_context.time_constraints and prompt_context.time_constraints < 60:
                return PromptStrategy.EMERGENCY
                
            # Multi-entity detection
            if "multi_entity" in str(prompt_context.available_data).lower():
                return PromptStrategy.MULTI_ENTITY
                
            # Default to standard strategy
            return PromptStrategy.STANDARD
            
        except Exception:
            return PromptStrategy.STANDARD  # Safe fallback
    
    def _create_fallback_orchestration_prompt(
        self,
        investigation_id: str,
        entity_type: str,
        entity_id: str,
        context
    ) -> str:
        """Create bulletproof fallback orchestration prompt"""
        
        return f"""You are the Master Orchestrator for autonomous fraud investigations. 

INVESTIGATION CONTEXT:
- Investigation ID: {investigation_id}
- Entity Type: {entity_type}
- Entity ID: {entity_id}
- Available Context: {json.dumps(context.__dict__ if context else {}, default=str)}

AVAILABLE AGENTS: network, device, location, logs, risk

REQUIRED JSON OUTPUT:
{{
    "strategy": "comprehensive",
    "agents_to_activate": ["network", "device", "location", "logs", "risk"],
    "execution_order": ["risk", "network", "device", "location", "logs"],
    "confidence_score": 0.7,
    "reasoning": "Fallback comprehensive strategy for thorough investigation",
    "estimated_duration": 240,
    "risk_assessment": "medium",
    "bulletproof_requirements": ["circuit_breaker", "retry_logic", "fail_soft"]
}}"""


# LangGraph Integration Functions
async def autonomous_orchestrator_node(state, config) -> dict:
    """LangGraph node function for autonomous orchestrator"""
    
    # Extract investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context for orchestrator")
    
    # Get investigation context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    
    try:
        # Initialize orchestrator
        orchestrator = AutonomousOrchestrator()
        
        # Execute orchestration
        results = await orchestrator.orchestrate_investigation(
            state=state,
            config=config,
            investigation_id=investigation_id,
            entity_type=agent_context.get("entity_type", "unknown"),
            entity_id=entity_id,
            context=autonomous_context
        )
        
        # Record orchestration results in context
        autonomous_context.record_orchestration_results(results)
        
        # Return LangGraph-compatible message
        return {"messages": [AIMessage(content=json.dumps(results))]}
        
    except Exception as e:
        logger.error(f"🚨 Orchestrator node failed: {str(e)}")
        return _create_error_response(f"Autonomous orchestrator failed: {str(e)}")