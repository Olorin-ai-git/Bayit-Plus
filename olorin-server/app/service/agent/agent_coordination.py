"""
Intelligent Agent Handoff System

<<<<<<< HEAD
Advanced agent coordination system for autonomous investigations with intelligent
=======
Advanced agent coordination system for structured investigations with intelligent
>>>>>>> 001-modify-analyzer-method
handoff capabilities, cross-domain data sharing, and failure-tolerant execution.

Phase 2.1: Agent Coordination & Flow Control Implementation
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

from app.service.logging import get_bridge_logger
<<<<<<< HEAD
from app.service.websocket_manager import AgentPhase, websocket_manager
=======
>>>>>>> 001-modify-analyzer-method
from app.service.agent.journey_tracker import get_journey_tracker, NodeType, NodeStatus

logger = get_bridge_logger(__name__)
journey_tracker = get_journey_tracker()


class AgentType(Enum):
    """Specialized agent types for fraud investigations"""
    NETWORK = "network"
    DEVICE = "device"
    LOCATION = "location"
    LOGS = "logs"
    RISK = "risk"
    ORCHESTRATOR = "orchestrator"


class HandoffTrigger(Enum):
    """Reasons for agent handoff"""
    COMPLETION = "completion"  # Normal completion
    EXPERTISE_NEEDED = "expertise_needed"  # Specialized knowledge required
    FAILURE_RECOVERY = "failure_recovery"  # Agent failure recovery
    RESOURCE_OPTIMIZATION = "resource_optimization"  # Performance optimization
    STRATEGY_CHANGE = "strategy_change"  # Investigation strategy adaptation
    DATA_DEPENDENCY = "data_dependency"  # Cross-domain data requirements


class ExecutionMode(Enum):
    """Agent execution coordination modes"""
    SEQUENTIAL = "sequential"  # One agent at a time
    PARALLEL = "parallel"  # Multiple agents simultaneously  
    HYBRID = "hybrid"  # Mixed execution based on context
    ADAPTIVE = "adaptive"  # Dynamic mode selection


@dataclass
class AgentCapability:
    """Agent capability and specialization metadata"""
    agent_type: AgentType
    domains: Set[str]
    confidence_threshold: float
    avg_execution_time: float
    success_rate: float
    data_dependencies: Set[str]
    output_capabilities: Set[str]


@dataclass
class HandoffContext:
    """Context data for agent handoff"""
    investigation_id: str
    from_agent: AgentType
    to_agent: AgentType
    trigger: HandoffTrigger
    shared_data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    confidence_score: float = 0.0
    reasoning: str = ""
    expected_outcomes: List[str] = field(default_factory=list)


@dataclass
class CoordinationPlan:
    """Intelligent coordination plan for investigation execution"""
    execution_mode: ExecutionMode
    agent_sequence: List[AgentType]
    parallel_groups: List[Set[AgentType]]
    dependencies: Dict[AgentType, Set[AgentType]]
    estimated_duration: int
    risk_assessment: str
    fallback_strategies: List[str]
    optimization_opportunities: List[str]


class IntelligentAgentCoordinator:
    """
<<<<<<< HEAD
    Intelligent Agent Handoff System for autonomous investigations.
=======
    Intelligent Agent Handoff System for structured investigations.
>>>>>>> 001-modify-analyzer-method
    
    Provides smart agent selection, cross-domain data sharing, failure-tolerant
    handoffs, and performance-optimized execution coordination.
    """
    
    def __init__(self):
        self.agent_capabilities = self._initialize_agent_capabilities()
        self.handoff_history: List[HandoffContext] = []
        self.active_handoffs: Dict[str, HandoffContext] = {}
        self.performance_metrics: Dict[AgentType, Dict[str, float]] = defaultdict(dict)
        self.coordination_cache: Dict[str, CoordinationPlan] = {}
        
    def _initialize_agent_capabilities(self) -> Dict[AgentType, AgentCapability]:
        """Initialize agent capability metadata based on specializations"""
        return {
            AgentType.NETWORK: AgentCapability(
                agent_type=AgentType.NETWORK,
                domains={"ip_analysis", "network_topology", "vpn_detection", "geolocation"},
                confidence_threshold=0.85,
                avg_execution_time=45.0,
                success_rate=0.92,
                data_dependencies={"ip_addresses", "network_logs"},
                output_capabilities={"network_risk", "location_data", "vpn_indicators"}
            ),
            AgentType.DEVICE: AgentCapability(
                agent_type=AgentType.DEVICE,
                domains={"device_fingerprinting", "hardware_analysis", "device_behavior"},
                confidence_threshold=0.80,
                avg_execution_time=35.0,
                success_rate=0.89,
                data_dependencies={"device_fingerprint", "user_agent", "screen_resolution"},
                output_capabilities={"device_risk", "device_anomalies", "device_clustering"}
            ),
            AgentType.LOCATION: AgentCapability(
                agent_type=AgentType.LOCATION,
                domains={"geographic_analysis", "travel_patterns", "location_validation"},
                confidence_threshold=0.75,
                avg_execution_time=30.0,
                success_rate=0.87,
                data_dependencies={"coordinates", "addresses", "timezone"},
                output_capabilities={"location_risk", "travel_anomalies", "geographic_clusters"}
            ),
            AgentType.LOGS: AgentCapability(
                agent_type=AgentType.LOGS,
                domains={"activity_analysis", "pattern_detection", "temporal_analysis"},
                confidence_threshold=0.90,
                avg_execution_time=60.0,
                success_rate=0.94,
                data_dependencies={"activity_logs", "timestamps", "event_sequences"},
                output_capabilities={"activity_risk", "behavioral_patterns", "timeline_analysis"}
            ),
            AgentType.RISK: AgentCapability(
                agent_type=AgentType.RISK,
                domains={"risk_synthesis", "cross_domain_analysis", "final_assessment"},
                confidence_threshold=0.95,
                avg_execution_time=25.0,
                success_rate=0.96,
                data_dependencies={"agent_results", "risk_indicators", "confidence_scores"},
                output_capabilities={"final_risk_score", "comprehensive_assessment", "recommendations"}
            )
        }
    
    async def create_coordination_plan(
        self,
        investigation_id: str,
        context: Dict[str, Any],
        strategy: str = "adaptive"
    ) -> CoordinationPlan:
        """
        Create intelligent coordination plan based on investigation context.
        
        Args:
            investigation_id: Unique investigation identifier
            context: Investigation context and available data
            strategy: Coordination strategy preference
            
        Returns:
            Optimized coordination plan with agent sequence and execution mode
        """
        logger.info(f"🧠 Creating coordination plan for investigation {investigation_id}")
        
        try:
            # Check cache for similar investigations
            cache_key = self._generate_cache_key(context, strategy)
            if cache_key in self.coordination_cache:
                cached_plan = self.coordination_cache[cache_key]
                logger.info(f"📋 Using cached coordination plan: {cached_plan.execution_mode.value}")
                return cached_plan
            
            # Analyze available data and determine optimal coordination
            available_data = self._analyze_available_data(context)
            data_dependencies = self._calculate_dependencies(available_data)
            
            # Determine optimal execution mode
            execution_mode = self._determine_execution_mode(context, strategy)
            
            # Create agent sequence based on dependencies and performance
            agent_sequence, parallel_groups = self._optimize_agent_sequence(
                data_dependencies, execution_mode
            )
            
            # Calculate duration and risk assessment
            estimated_duration = self._estimate_execution_duration(agent_sequence, parallel_groups)
            risk_assessment = self._assess_coordination_risk(context, execution_mode)
            
            # Generate fallback strategies
            fallback_strategies = self._generate_fallback_strategies(execution_mode, agent_sequence)
            
            # Identify optimization opportunities
            optimization_opportunities = self._identify_optimizations(context, agent_sequence)
            
            # Create comprehensive coordination plan
            plan = CoordinationPlan(
                execution_mode=execution_mode,
                agent_sequence=agent_sequence,
                parallel_groups=parallel_groups,
                dependencies=data_dependencies,
                estimated_duration=estimated_duration,
                risk_assessment=risk_assessment,
                fallback_strategies=fallback_strategies,
                optimization_opportunities=optimization_opportunities
            )
            
            # Cache the plan for future use
            self.coordination_cache[cache_key] = plan
            
            logger.info(f"✅ Created coordination plan: {execution_mode.value} mode with {len(agent_sequence)} agents")
            return plan
            
        except Exception as e:
            logger.error(f"🚨 Failed to create coordination plan: {str(e)}")
            # Return safe fallback plan
            return self._create_fallback_plan(investigation_id)
    
    async def execute_intelligent_handoff(
        self,
        investigation_id: str,
        from_agent: AgentType,
        trigger: HandoffTrigger,
        context_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[AgentType, HandoffContext]:
        """
        Execute intelligent agent handoff with smart agent selection.
        
        Args:
            investigation_id: Investigation identifier
            from_agent: Current agent performing handoff
            trigger: Reason for handoff
            context_data: Shared investigation data
            metadata: Additional handoff metadata
            
        Returns:
            Tuple of (target_agent, handoff_context)
        """
        logger.info(f"🔄 Executing intelligent handoff from {from_agent.value}, trigger: {trigger.value}")
        
        try:
            # Select optimal next agent based on context and capabilities
            target_agent = await self._select_optimal_agent(
                from_agent, trigger, context_data, metadata or {}
            )
            
            # Create handoff context with reasoning
            handoff_context = await self._create_handoff_context(
                investigation_id, from_agent, target_agent, trigger, context_data, metadata
            )
            
            # Execute the handoff with failure tolerance
            success = await self._execute_handoff(handoff_context)
            
            if success:
                # Record successful handoff
                self.handoff_history.append(handoff_context)
                self.active_handoffs[f"{investigation_id}_{target_agent.value}"] = handoff_context
                
                # Update performance metrics
                await self._update_performance_metrics(handoff_context)
                
                # Send WebSocket notification
                await self._notify_handoff_completion(handoff_context)
                
                logger.info(f"✅ Successful handoff to {target_agent.value} with confidence {handoff_context.confidence_score:.2f}")
                return target_agent, handoff_context
            else:
                # Handle handoff failure with fallback strategy
                return await self._handle_handoff_failure(handoff_context)
                
        except Exception as e:
            logger.error(f"🚨 Intelligent handoff failed: {str(e)}")
            # Return safe fallback handoff
            return await self._create_fallback_handoff(investigation_id, from_agent, context_data)
    
    async def _select_optimal_agent(
        self,
        from_agent: AgentType,
        trigger: HandoffTrigger,
        context_data: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> AgentType:
        """Select optimal next agent based on context and capabilities"""
        
        # Get available agents (excluding current agent)
        available_agents = [agent for agent in AgentType if agent != from_agent and agent != AgentType.ORCHESTRATOR]
        
        # Score each agent based on context relevance and capability
        agent_scores = {}
        
        for agent in available_agents:
            capability = self.agent_capabilities[agent]
            score = 0.0
            
            # Domain relevance scoring
            relevant_domains = self._get_relevant_domains(context_data)
            domain_overlap = len(capability.domains.intersection(relevant_domains))
            score += domain_overlap * 0.3
            
            # Data dependency satisfaction
            available_data_keys = set(context_data.keys())
            dependency_satisfaction = len(capability.data_dependencies.intersection(available_data_keys)) / len(capability.data_dependencies)
            score += dependency_satisfaction * 0.25
            
            # Performance metrics
            score += capability.success_rate * 0.2
            score += (1.0 / capability.avg_execution_time) * 0.1  # Favor faster agents
            
            # Trigger-specific scoring
            if trigger == HandoffTrigger.EXPERTISE_NEEDED:
                score += capability.confidence_threshold * 0.15
            elif trigger == HandoffTrigger.FAILURE_RECOVERY:
                score += capability.success_rate * 0.15
            elif trigger == HandoffTrigger.RESOURCE_OPTIMIZATION:
                score += (1.0 / capability.avg_execution_time) * 0.15
            
            agent_scores[agent] = score
        
        # Select agent with highest score
        optimal_agent = max(agent_scores, key=agent_scores.get)
        
        logger.info(f"🎯 Selected optimal agent: {optimal_agent.value} (score: {agent_scores[optimal_agent]:.2f})")
        return optimal_agent
    
    async def _create_handoff_context(
        self,
        investigation_id: str,
        from_agent: AgentType,
        to_agent: AgentType,
        trigger: HandoffTrigger,
        context_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]]
    ) -> HandoffContext:
        """Create comprehensive handoff context with reasoning"""
        
        # Calculate confidence score based on agent capabilities and context
        to_capability = self.agent_capabilities[to_agent]
        confidence_score = self._calculate_handoff_confidence(to_agent, context_data)
        
        # Generate reasoning for handoff decision
        reasoning = self._generate_handoff_reasoning(from_agent, to_agent, trigger, confidence_score)
        
        # Determine expected outcomes
        expected_outcomes = list(to_capability.output_capabilities)
        
        return HandoffContext(
            investigation_id=investigation_id,
            from_agent=from_agent,
            to_agent=to_agent,
            trigger=trigger,
            shared_data=context_data,
            metadata=metadata or {},
            confidence_score=confidence_score,
            reasoning=reasoning,
            expected_outcomes=expected_outcomes
        )
    
    def _determine_execution_mode(self, context: Dict[str, Any], strategy: str) -> ExecutionMode:
        """Determine optimal execution mode based on context and strategy"""
        
        # Analyze context factors
        data_complexity = len(context.get("available_data", {}))
        time_constraints = context.get("time_critical", False)
        resource_availability = context.get("resource_level", "normal")
        
        if strategy == "adaptive":
            if time_constraints and resource_availability == "high":
                return ExecutionMode.PARALLEL
            elif data_complexity > 10:
                return ExecutionMode.HYBRID
            else:
                return ExecutionMode.SEQUENTIAL
        elif strategy == "performance":
            return ExecutionMode.PARALLEL
        elif strategy == "resource_efficient":
            return ExecutionMode.SEQUENTIAL
        else:
            return ExecutionMode.HYBRID
    
    def _optimize_agent_sequence(
        self,
        dependencies: Dict[AgentType, Set[AgentType]],
        execution_mode: ExecutionMode
    ) -> Tuple[List[AgentType], List[Set[AgentType]]]:
        """Optimize agent execution sequence based on dependencies and mode"""
        
        if execution_mode == ExecutionMode.PARALLEL:
            # All agents can run in parallel (with proper dependency handling)
            sequence = [AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS, AgentType.RISK]
            parallel_groups = [{AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS}, {AgentType.RISK}]
            
        elif execution_mode == ExecutionMode.SEQUENTIAL:
            # Optimal sequential order based on data dependencies
            sequence = [AgentType.NETWORK, AgentType.LOCATION, AgentType.DEVICE, AgentType.LOGS, AgentType.RISK]
            parallel_groups = []
            
        elif execution_mode == ExecutionMode.HYBRID:
            # Mixed execution with some parallel, some sequential
            sequence = [AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS, AgentType.RISK]
            parallel_groups = [{AgentType.NETWORK, AgentType.DEVICE}, {AgentType.LOCATION, AgentType.LOGS}, {AgentType.RISK}]
            
        else:  # ADAPTIVE
            # Dynamic sequence based on real-time conditions
            sequence = [AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS, AgentType.RISK]
            parallel_groups = [{AgentType.NETWORK, AgentType.DEVICE}, {AgentType.RISK}]
        
        return sequence, parallel_groups
    
    def _generate_cache_key(self, context: Dict[str, Any], strategy: str) -> str:
        """Generate cache key for coordination plan"""
        context_hash = hash(str(sorted(context.items())))
        return f"{strategy}_{context_hash}"
    
    def _create_fallback_plan(self, investigation_id: str) -> CoordinationPlan:
        """Create safe fallback coordination plan"""
        return CoordinationPlan(
            execution_mode=ExecutionMode.SEQUENTIAL,
            agent_sequence=[AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS, AgentType.RISK],
            parallel_groups=[],
            dependencies={},
            estimated_duration=180,
            risk_assessment="low",
            fallback_strategies=["sequential_execution", "basic_error_handling"],
            optimization_opportunities=["enable_parallel_execution", "add_caching"]
        )
    
    async def _execute_handoff(self, handoff_context: HandoffContext) -> bool:
        """Execute the actual handoff with failure tolerance"""
        try:
            # Record handoff start
            journey_tracker.record_agent_execution(
                investigation_id=handoff_context.investigation_id,
                node_name=f"handoff_{handoff_context.to_agent.value}",
                node_type=NodeType.HANDOFF,
                input_state={"from": handoff_context.from_agent.value},
                output_state={"to": handoff_context.to_agent.value},
                duration_ms=0,
                status=NodeStatus.RUNNING,
                agent_name="AgentCoordinator",
                metadata={"trigger": handoff_context.trigger.value, "confidence": handoff_context.confidence_score}
            )
            
            # Simulate handoff processing (in real implementation, this would trigger actual agent)
            await asyncio.sleep(0.1)
            
            # Record handoff success
            journey_tracker.record_agent_execution(
                investigation_id=handoff_context.investigation_id,
                node_name=f"handoff_{handoff_context.to_agent.value}",
                node_type=NodeType.HANDOFF,
                input_state={"from": handoff_context.from_agent.value},
                output_state={"to": handoff_context.to_agent.value, "success": True},
                duration_ms=100,
                status=NodeStatus.COMPLETED,
                agent_name="AgentCoordinator",
                metadata={"trigger": handoff_context.trigger.value, "confidence": handoff_context.confidence_score}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"🚨 Handoff execution failed: {str(e)}")
            return False
    
    # Helper methods for various calculations and operations
    def _analyze_available_data(self, context: Dict[str, Any]) -> Set[str]:
        """Analyze available data in investigation context"""
        return set(context.keys())
    
    def _calculate_dependencies(self, available_data: Set[str]) -> Dict[AgentType, Set[AgentType]]:
        """Calculate agent dependencies based on data requirements"""
        return {
            AgentType.LOCATION: {AgentType.NETWORK},  # Location depends on network analysis
            AgentType.RISK: {AgentType.NETWORK, AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS}  # Risk depends on all others
        }
    
    def _estimate_execution_duration(self, sequence: List[AgentType], parallel_groups: List[Set[AgentType]]) -> int:
        """Estimate total execution duration based on agent sequence"""
        if parallel_groups:
            total_duration = 0
            for group in parallel_groups:
                group_duration = max(self.agent_capabilities[agent].avg_execution_time for agent in group)
                total_duration += group_duration
            return int(total_duration)
        else:
            return sum(int(self.agent_capabilities[agent].avg_execution_time) for agent in sequence)
    
    def _assess_coordination_risk(self, context: Dict[str, Any], mode: ExecutionMode) -> str:
        """Assess risk level of coordination plan"""
        if mode == ExecutionMode.PARALLEL:
            return "medium"  # Higher coordination complexity
        elif context.get("time_critical", False):
            return "high"  # Time pressure increases risk
        else:
            return "low"
    
    def _generate_fallback_strategies(self, mode: ExecutionMode, sequence: List[AgentType]) -> List[str]:
        """Generate fallback strategies for coordination plan"""
        strategies = ["sequential_fallback", "partial_results_acceptance"]
        if mode == ExecutionMode.PARALLEL:
            strategies.append("parallel_to_sequential_conversion")
        return strategies
    
    def _identify_optimizations(self, context: Dict[str, Any], sequence: List[AgentType]) -> List[str]:
        """Identify optimization opportunities"""
        optimizations = []
        if len(sequence) > 3:
            optimizations.append("parallel_execution_opportunity")
        if context.get("cached_data"):
            optimizations.append("cache_utilization")
        return optimizations
    
    def _get_relevant_domains(self, context_data: Dict[str, Any]) -> Set[str]:
        """Extract relevant domains from context data"""
        domains = set()
        if "ip_addresses" in context_data:
            domains.add("ip_analysis")
        if "device_fingerprint" in context_data:
            domains.add("device_fingerprinting")
        if "coordinates" in context_data:
            domains.add("geographic_analysis")
        if "activity_logs" in context_data:
            domains.add("activity_analysis")
        return domains
    
    def _calculate_handoff_confidence(self, to_agent: AgentType, context_data: Dict[str, Any]) -> float:
        """Calculate confidence score for handoff decision"""
        capability = self.agent_capabilities[to_agent]
        
        # Base confidence from agent capability
        confidence = capability.confidence_threshold
        
        # Adjust based on data availability
        available_data = set(context_data.keys())
        data_satisfaction = len(capability.data_dependencies.intersection(available_data)) / len(capability.data_dependencies)
        confidence *= (0.5 + 0.5 * data_satisfaction)
        
        # Add performance factor
        confidence *= capability.success_rate
        
        return min(confidence, 1.0)
    
    def _generate_handoff_reasoning(
        self,
        from_agent: AgentType,
        to_agent: AgentType,
        trigger: HandoffTrigger,
        confidence: float
    ) -> str:
        """Generate human-readable reasoning for handoff decision"""
        return f"Handoff from {from_agent.value} to {to_agent.value} due to {trigger.value} with {confidence:.2f} confidence"
    
    async def _update_performance_metrics(self, handoff_context: HandoffContext):
        """Update performance metrics based on handoff execution"""
        agent = handoff_context.to_agent
        self.performance_metrics[agent]["last_handoff"] = datetime.now().timestamp()
        self.performance_metrics[agent]["confidence"] = handoff_context.confidence_score
    
    async def _notify_handoff_completion(self, handoff_context: HandoffContext):
<<<<<<< HEAD
        """Send WebSocket notification for handoff completion"""
        try:
            await websocket_manager.send_agent_phase(
                investigation_id=handoff_context.investigation_id,
                agent_name=handoff_context.to_agent.value,
                phase=AgentPhase.STARTING,
                message=f"Agent handoff completed: {handoff_context.reasoning}"
            )
        except Exception as e:
            logger.warning(f"Failed to send handoff notification: {e}")
=======
        """WebSocket notification removed per spec 005 - using polling instead"""
        # WebSocket notifications replaced by polling-based updates
        pass
>>>>>>> 001-modify-analyzer-method
    
    async def _handle_handoff_failure(self, handoff_context: HandoffContext) -> Tuple[AgentType, HandoffContext]:
        """Handle handoff failure with fallback strategy"""
        logger.warning(f"⚠️ Handoff failure, implementing fallback strategy")
        
        # Try fallback agent (risk agent as universal fallback)
        fallback_agent = AgentType.RISK
        fallback_context = HandoffContext(
            investigation_id=handoff_context.investigation_id,
            from_agent=handoff_context.from_agent,
            to_agent=fallback_agent,
            trigger=HandoffTrigger.FAILURE_RECOVERY,
            shared_data=handoff_context.shared_data,
            confidence_score=0.6,
            reasoning="Fallback handoff due to primary handoff failure"
        )
        
        return fallback_agent, fallback_context
    
    async def _create_fallback_handoff(
        self,
        investigation_id: str,
        from_agent: AgentType,
        context_data: Dict[str, Any]
    ) -> Tuple[AgentType, HandoffContext]:
        """Create safe fallback handoff"""
        fallback_agent = AgentType.NETWORK  # Default to network agent
        fallback_context = HandoffContext(
            investigation_id=investigation_id,
            from_agent=from_agent,
            to_agent=fallback_agent,
            trigger=HandoffTrigger.FAILURE_RECOVERY,
            shared_data=context_data,
            confidence_score=0.5,
            reasoning="Emergency fallback handoff"
        )
        
        return fallback_agent, fallback_context


# Global coordinator instance
_coordinator_instance = None

def get_agent_coordinator() -> IntelligentAgentCoordinator:
    """Get global agent coordinator instance"""
    global _coordinator_instance
    if _coordinator_instance is None:
        _coordinator_instance = IntelligentAgentCoordinator()
    return _coordinator_instance