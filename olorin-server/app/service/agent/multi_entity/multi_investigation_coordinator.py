"""
Multi-Entity Investigation Coordinator

Coordinates LangGraph agents across multiple entities simultaneously,
managing parallel investigations and cross-entity context sharing.

This module implements the missing Phase 2.2 coordination logic.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
import uuid
from collections import defaultdict

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from typing import Annotated

from app.service.logging import get_bridge_logger
from app.service.agent.multi_entity.entity_manager import EntityType, get_entity_manager
from app.service.agent.investigators.domain_agents import (
    network_agent, location_agent, device_agent, logs_agent, MessagesState
)
from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    InvestigationResult,
    EntityRelationship
)

logger = get_bridge_logger(__name__)


@dataclass
class EntityInvestigationContext:
    """Context for single entity investigation within multi-entity workflow"""
    
    entity_id: str
    entity_type: EntityType
    investigation_scope: List[str]
    agent_results: List[InvestigationResult]
    status: str = "pending"  # pending, in_progress, completed, failed
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class MultiEntityWorkflowState(TypedDict):
    """LangGraph state for multi-entity investigations"""
    
    messages: Annotated[List[BaseMessage], add_messages]
    investigation_id: str
    entities: List[Dict[str, str]]
    relationships: List[EntityRelationship]
    boolean_logic: str
    investigation_scope: List[str]
    
    # Entity-specific contexts
    entity_contexts: Dict[str, EntityInvestigationContext]
    
    # Cross-entity state
    cross_entity_findings: List[Dict[str, Any]]
    relationship_evidence: Dict[str, List[Dict[str, Any]]]
    
    # Progress tracking
    completed_entities: Set[str]
    failed_entities: Set[str]
    current_phase: str


class MultiEntityInvestigationCoordinator:
    """
    Coordinates multi-entity structured investigations with LangGraph workflow integration.
    
    Implements the missing coordination logic for simultaneous entity investigation
    using existing LangGraph agents with cross-entity context sharing.
    """
    
    def __init__(self):
        self.entity_manager = get_entity_manager()
        self.logger = get_bridge_logger(f"{__name__}.coordinator")
        
        # Agent function mappings
        self.agent_functions = {
            "device": device_agent,
            "location": location_agent, 
            "network": network_agent,
            "logs": logs_agent
        }
        
        # Coordination metrics
        self.metrics = {
            "total_coordinated_investigations": 0,
            "successful_investigations": 0,
            "parallel_entity_investigations": 0,
            "cross_entity_correlations_found": 0
        }
    
    async def coordinate_multi_entity_investigation(
        self,
        request: MultiEntityInvestigationRequest
    ) -> Dict[str, Any]:
        """
        Main coordination method for multi-entity investigations.
        
        Args:
            request: Multi-entity investigation request
            
        Returns:
            Coordination results with entity results and cross-entity analysis
        """
        investigation_id = request.investigation_id
        self.logger.info(f"🔄 Coordinating multi-entity investigation: {investigation_id}")
        
        try:
            # Build LangGraph workflow
            workflow = self._build_multi_entity_workflow()
            
            # Initialize state
            initial_state = self._initialize_workflow_state(request)
            
            # Execute workflow
            final_state = await self._execute_workflow(workflow, initial_state)
            
            # Extract results
            coordination_result = self._extract_coordination_results(final_state)
            
            # Update metrics
            self.metrics["total_coordinated_investigations"] += 1
            self.metrics["parallel_entity_investigations"] += len(request.entities)
            
            self.logger.info(f"✅ Multi-entity coordination completed: {investigation_id}")
            return coordination_result
            
        except Exception as e:
            self.logger.error(f"❌ Multi-entity coordination failed {investigation_id}: {str(e)}")
            raise
    
    def _build_multi_entity_workflow(self) -> StateGraph:
        """Build LangGraph workflow for multi-entity investigation"""
        
        workflow = StateGraph(MultiEntityWorkflowState)
        
        # Add nodes
        workflow.add_node("initialize", self._initialize_investigation_node)
        workflow.add_node("parallel_entity_investigation", self._parallel_entity_investigation_node)
        workflow.add_node("cross_entity_analysis", self._cross_entity_analysis_node)
        workflow.add_node("finalize", self._finalize_investigation_node)
        
        # Add edges
        workflow.set_entry_point("initialize")
        workflow.add_edge("initialize", "parallel_entity_investigation")
        workflow.add_edge("parallel_entity_investigation", "cross_entity_analysis")
        workflow.add_edge("cross_entity_analysis", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()
    
    def _initialize_workflow_state(self, request: MultiEntityInvestigationRequest) -> MultiEntityWorkflowState:
        """Initialize LangGraph workflow state"""
        
        # Create entity contexts
        entity_contexts = {}
        for entity_dict in request.entities:
            entity_id = entity_dict["entity_id"]
            entity_type_str = entity_dict["entity_type"]
            entity_type = EntityType(entity_type_str)
            
            entity_contexts[entity_id] = EntityInvestigationContext(
                entity_id=entity_id,
                entity_type=entity_type,
                investigation_scope=request.investigation_scope,
                agent_results=[]
            )
        
        return MultiEntityWorkflowState(
            messages=[HumanMessage(content=f"Starting multi-entity investigation {request.investigation_id}")],
            investigation_id=request.investigation_id,
            entities=request.entities,
            relationships=request.relationships,
            boolean_logic=request.boolean_logic,
            investigation_scope=request.investigation_scope,
            entity_contexts=entity_contexts,
            cross_entity_findings=[],
            relationship_evidence=defaultdict(list),
            completed_entities=set(),
            failed_entities=set(),
            current_phase="initialization"
        )
    
    async def _initialize_investigation_node(self, state: MultiEntityWorkflowState) -> MultiEntityWorkflowState:
        """Initialize investigation node"""
        
        self.logger.info(f"🚀 Initializing multi-entity investigation: {state['investigation_id']}")
        
        # Update entity contexts with start time
        for entity_id, context in state["entity_contexts"].items():
            context.status = "initialized"
            context.start_time = datetime.now(timezone.utc)
        
        state["current_phase"] = "entity_investigation"
        state["messages"].append(
            AIMessage(content=f"Initialized investigation for {len(state['entities'])} entities")
        )
        
        return state
    
    async def _parallel_entity_investigation_node(self, state: MultiEntityWorkflowState) -> MultiEntityWorkflowState:
        """Execute parallel investigations for all entities"""
        
        investigation_id = state["investigation_id"]
        self.logger.info(f"🔍 Starting parallel entity investigations: {investigation_id}")
        
        # Create investigation tasks for all entities
        investigation_tasks = []
        
        for entity_id, context in state["entity_contexts"].items():
            context.status = "in_progress"
            
            # Create investigation task for this entity
            task = self._create_entity_investigation_task(
                entity_id, context, state
            )
            investigation_tasks.append(task)
        
        # Execute all entity investigations in parallel
        try:
            entity_results = await asyncio.gather(*investigation_tasks, return_exceptions=True)
            
            # Process results
            for i, (entity_id, context) in enumerate(state["entity_contexts"].items()):
                result = entity_results[i]
                
                if isinstance(result, Exception):
                    self.logger.error(f"Entity investigation failed for {entity_id}: {str(result)}")
                    context.status = "failed"
                    state["failed_entities"].add(entity_id)
                else:
                    context.agent_results = result
                    context.status = "completed"
                    context.end_time = datetime.now(timezone.utc)
                    state["completed_entities"].add(entity_id)
        
        except Exception as e:
            self.logger.error(f"Parallel entity investigation failed: {str(e)}")
            raise
        
        state["current_phase"] = "cross_entity_analysis"
        state["messages"].append(
            AIMessage(content=f"Completed investigations for {len(state['completed_entities'])} entities")
        )
        
        return state
    
    async def _create_entity_investigation_task(
        self,
        entity_id: str,
        context: EntityInvestigationContext,
        state: MultiEntityWorkflowState
    ) -> List[InvestigationResult]:
        """Create investigation task for single entity"""
        
        investigation_id = state["investigation_id"]
        agent_results = []
        
        # Execute each investigation scope agent for this entity
        for agent_scope in context.investigation_scope:
            if agent_scope in self.agent_functions:
                try:
                    # Prepare agent configuration
                    agent_config = self._prepare_agent_config(
                        entity_id, context.entity_type, investigation_id, state
                    )
                    
                    # Create agent state
                    agent_state = MessagesState(
                        messages=[HumanMessage(content=f"Investigate {entity_id} for {agent_scope} analysis")]
                    )
                    
                    # Execute agent
                    agent_function = self.agent_functions[agent_scope]
                    result = await agent_function(agent_state, agent_config)
                    
                    # Extract agent result
                    agent_result = self._extract_agent_result(
                        result, entity_id, agent_scope, investigation_id
                    )
                    
                    agent_results.append(agent_result)
                    
                    self.logger.info(f"✅ {agent_scope} agent completed for entity {entity_id}")
                    
                except Exception as e:
                    self.logger.error(f"❌ {agent_scope} agent failed for entity {entity_id}: {str(e)}")
                    # Create error result
                    error_result = InvestigationResult(
                        investigation_id=investigation_id,
                        entity_id=entity_id,
                        agent_type=f"{agent_scope}_agent",
                        findings={"error": str(e), "status": "failed"},
                        risk_score=0.0,
                        confidence_score=0.0,
                        agent_reasoning=f"Agent execution failed: {str(e)}"
                    )
                    agent_results.append(error_result)
        
        return agent_results
    
    def _prepare_agent_config(
        self,
        entity_id: str,
        entity_type: EntityType,
        investigation_id: str,
        state: MultiEntityWorkflowState
    ) -> Dict[str, Any]:
        """Prepare configuration for individual agent execution"""
        
        # Import required models for AgentContext
        from app.models.agent_context import AgentContext
        from app.models.agent_headers import OlorinHeader, AuthContext
        
        # Create proper AgentContext with required fields
        auth_context = AuthContext(
            olorin_user_id="multi_entity_system",
            olorin_user_token="system_token",
            olorin_realmid="multi_entity_realm"
        )
        
        olorin_header = OlorinHeader(
            olorin_tid=f"multi_entity_{investigation_id}",
            olorin_experience_id=f"exp_{investigation_id}",
            olorin_originating_assetalias="multi_entity_coordinator",
            auth_context=auth_context
        )
        
        class SimpleMetadata:
            """Simple metadata container for agent context"""
            def __init__(self, investigation_id: str):
                self.interaction_group_id = investigation_id
                self.additional_metadata = {
                    "entity_id": entity_id,
                    "entity_type": entity_type.value,
                    "investigation_id": investigation_id,
                    "multi_entity_context": {
                        "total_entities": len(state["entities"]),
                        "relationships": [r.dict() for r in state["relationships"]],
                        "boolean_logic": state["boolean_logic"]
                    }
                }
        
        # Create AgentContext object
        agent_context = AgentContext(
            olorin_header=olorin_header,
            input=f"Analyze entity {entity_id} of type {entity_type.value} for investigation {investigation_id}",
            metadata=SimpleMetadata(investigation_id),
            agent_name=f"multi_entity_{entity_type.value}_agent",
            session_id=investigation_id
        )
        
        return {
            "configurable": {
                "agent_context": agent_context,
                "request": {}  # Minimal request object for agents
            }
        }
    
    def _extract_agent_result(
        self,
        agent_response: Dict[str, Any],
        entity_id: str,
        agent_scope: str,
        investigation_id: str
    ) -> InvestigationResult:
        """Extract and standardize agent result"""
        
        # Parse agent response
        messages = agent_response.get("messages", [])
        if messages and hasattr(messages[-1], 'content'):
            try:
                import json
                content = json.loads(messages[-1].content)
            except:
                content = {"raw_response": str(messages[-1].content)}
        else:
            content = {"status": "no_response"}
        
        # Create standardized result
        return InvestigationResult(
            investigation_id=investigation_id,
            entity_id=entity_id,
            agent_type=f"{agent_scope}_agent",
            findings=content,
            risk_score=content.get("risk_score", 0.5),  # Default to medium risk
            confidence_score=content.get("confidence", 0.8),
            execution_time_ms=content.get("execution_time", 1000),
            agent_reasoning=content.get("reasoning", f"Executed {agent_scope} analysis for {entity_id}")
        )
    
    async def _cross_entity_analysis_node(self, state: MultiEntityWorkflowState) -> MultiEntityWorkflowState:
        """Perform cross-entity analysis"""
        
        investigation_id = state["investigation_id"]
        self.logger.info(f"🔗 Performing cross-entity analysis: {investigation_id}")
        
        try:
            # Analyze entity relationships
            relationship_insights = self._analyze_entity_relationships(state)
            
            # Find cross-entity patterns
            pattern_analysis = self._find_cross_entity_patterns(state)
            
            # Calculate risk correlations
            risk_correlations = self._calculate_risk_correlations(state)
            
            # Store cross-entity findings
            state["cross_entity_findings"] = [
                {"type": "relationship_insights", "data": relationship_insights},
                {"type": "pattern_analysis", "data": pattern_analysis},
                {"type": "risk_correlations", "data": risk_correlations}
            ]
            
            # Update metrics
            if relationship_insights or pattern_analysis:
                self.metrics["cross_entity_correlations_found"] += 1
                
        except Exception as e:
            self.logger.error(f"Cross-entity analysis failed: {str(e)}")
            state["cross_entity_findings"] = [{"type": "error", "data": str(e)}]
        
        state["current_phase"] = "finalization"
        state["messages"].append(
            AIMessage(content=f"Cross-entity analysis completed with {len(state['cross_entity_findings'])} findings")
        )
        
        return state
    
    def _analyze_entity_relationships(self, state: MultiEntityWorkflowState) -> List[Dict[str, Any]]:
        """Analyze relationships between investigated entities"""
        
        insights = []
        
        for relationship in state["relationships"]:
            source_id = relationship.source_entity_id
            target_id = relationship.target_entity_id
            
            # Get agent results for both entities
            source_context = state["entity_contexts"].get(source_id)
            target_context = state["entity_contexts"].get(target_id)
            
            if source_context and target_context:
                # Compare risk scores
                source_risk = self._calculate_average_risk(source_context.agent_results)
                target_risk = self._calculate_average_risk(target_context.agent_results)
                
                # Analyze relationship strength impact
                risk_correlation = abs(source_risk - target_risk)
                relationship_strength = relationship.strength
                
                insight = {
                    "relationship_type": relationship.relationship_type.value,
                    "source_entity": source_id,
                    "target_entity": target_id,
                    "source_risk_score": source_risk,
                    "target_risk_score": target_risk,
                    "risk_correlation": risk_correlation,
                    "relationship_strength": relationship_strength,
                    "insight": self._generate_relationship_insight(
                        relationship, source_risk, target_risk, risk_correlation
                    )
                }
                
                insights.append(insight)
        
        return insights
    
    def _find_cross_entity_patterns(self, state: MultiEntityWorkflowState) -> List[Dict[str, Any]]:
        """Find patterns across multiple entities"""
        
        patterns = []
        
        # Collect all agent findings by type
        findings_by_agent_type = defaultdict(list)
        
        for entity_id, context in state["entity_contexts"].items():
            for result in context.agent_results:
                findings_by_agent_type[result.agent_type].append({
                    "entity_id": entity_id,
                    "findings": result.findings,
                    "risk_score": result.risk_score
                })
        
        # Look for patterns within each agent type
        for agent_type, findings_list in findings_by_agent_type.items():
            if len(findings_list) >= 2:  # Need at least 2 entities for pattern
                pattern = self._detect_agent_pattern(agent_type, findings_list)
                if pattern:
                    patterns.append(pattern)
        
        return patterns
    
    def _calculate_risk_correlations(self, state: MultiEntityWorkflowState) -> List[Dict[str, Any]]:
        """Calculate risk score correlations between entities"""
        
        correlations = []
        entity_ids = list(state["entity_contexts"].keys())
        
        # Calculate pairwise correlations
        for i in range(len(entity_ids)):
            for j in range(i + 1, len(entity_ids)):
                entity1_id = entity_ids[i]
                entity2_id = entity_ids[j]
                
                context1 = state["entity_contexts"][entity1_id]
                context2 = state["entity_contexts"][entity2_id]
                
                risk1 = self._calculate_average_risk(context1.agent_results)
                risk2 = self._calculate_average_risk(context2.agent_results)
                
                correlation = {
                    "entity1": entity1_id,
                    "entity2": entity2_id,
                    "risk1": risk1,
                    "risk2": risk2,
                    "correlation_strength": 1.0 - abs(risk1 - risk2),  # Higher when risks are similar
                    "correlation_type": "risk_similarity" if abs(risk1 - risk2) < 0.3 else "risk_divergence"
                }
                
                correlations.append(correlation)
        
        return correlations
    
    async def _finalize_investigation_node(self, state: MultiEntityWorkflowState) -> MultiEntityWorkflowState:
        """Finalize multi-entity investigation"""
        
        investigation_id = state["investigation_id"]
        self.logger.info(f"🏁 Finalizing multi-entity investigation: {investigation_id}")
        
        # Update metrics
        if len(state["failed_entities"]) == 0:
            self.metrics["successful_investigations"] += 1
        
        state["current_phase"] = "completed"
        state["messages"].append(
            AIMessage(content=f"Multi-entity investigation {investigation_id} finalized")
        )
        
        return state
    
    async def _execute_workflow(
        self,
        workflow: StateGraph,
        initial_state: MultiEntityWorkflowState
    ) -> MultiEntityWorkflowState:
        """Execute the LangGraph workflow"""
        
        try:
            # Execute workflow
            final_state = await workflow.ainvoke(initial_state)
            return final_state
            
        except Exception as e:
            self.logger.error(f"Workflow execution failed: {str(e)}")
            raise
    
    def _extract_coordination_results(self, final_state: MultiEntityWorkflowState) -> Dict[str, Any]:
        """Extract coordination results from final state"""
        
        # Compile entity results
        entity_results = {}
        for entity_id, context in final_state["entity_contexts"].items():
            entity_results[entity_id] = context.agent_results
        
        return {
            "investigation_id": final_state["investigation_id"],
            "entity_results": entity_results,
            "cross_entity_findings": final_state["cross_entity_findings"],
            "relationship_evidence": dict(final_state["relationship_evidence"]),
            "completed_entities": list(final_state["completed_entities"]),
            "failed_entities": list(final_state["failed_entities"]),
            "success_rate": len(final_state["completed_entities"]) / len(final_state["entities"]) if final_state["entities"] else 0.0,
            "coordination_metrics": self.metrics
        }
    
    def _calculate_average_risk(self, agent_results: List[InvestigationResult]) -> float:
        """Calculate average risk score from agent results"""
        if not agent_results:
            return 0.0
        
        total_risk = sum(result.risk_score for result in agent_results)
        return total_risk / len(agent_results)
    
    def _generate_relationship_insight(
        self,
        relationship: EntityRelationship,
        source_risk: float,
        target_risk: float,
        risk_correlation: float
    ) -> str:
        """Generate human-readable insight about entity relationship"""
        
        if risk_correlation < 0.2:
            return f"Strong risk correlation detected in {relationship.relationship_type.value} relationship"
        elif risk_correlation > 0.8:
            return f"Risk divergence noted in {relationship.relationship_type.value} relationship"
        else:
            return f"Moderate risk pattern in {relationship.relationship_type.value} relationship"
    
    def _detect_agent_pattern(self, agent_type: str, findings_list: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect patterns within agent findings across entities"""
        
        # Simple pattern detection based on risk score clustering
        risk_scores = [f["risk_score"] for f in findings_list]
        avg_risk = sum(risk_scores) / len(risk_scores)
        
        # Check if all entities show similar risk levels
        if all(abs(score - avg_risk) < 0.3 for score in risk_scores):
            return {
                "pattern_type": "consistent_risk_pattern",
                "agent_type": agent_type,
                "entities_count": len(findings_list),
                "average_risk": avg_risk,
                "description": f"Consistent {agent_type} risk pattern across {len(findings_list)} entities"
            }
        
        return None
    
    def get_coordination_metrics(self) -> Dict[str, Any]:
        """Get coordination performance metrics"""
        return {
            **self.metrics,
            "success_rate": (
                self.metrics["successful_investigations"] / self.metrics["total_coordinated_investigations"]
                if self.metrics["total_coordinated_investigations"] > 0 else 0.0
            ),
            "average_entities_per_investigation": (
                self.metrics["parallel_entity_investigations"] / self.metrics["total_coordinated_investigations"]
                if self.metrics["total_coordinated_investigations"] > 0 else 0.0
            )
        }


# Global coordinator instance
_coordinator: Optional[MultiEntityInvestigationCoordinator] = None


def get_multi_entity_coordinator() -> MultiEntityInvestigationCoordinator:
    """Get the global multi-entity investigation coordinator instance"""
    global _coordinator
    
    if _coordinator is None:
        _coordinator = MultiEntityInvestigationCoordinator()
    
    return _coordinator