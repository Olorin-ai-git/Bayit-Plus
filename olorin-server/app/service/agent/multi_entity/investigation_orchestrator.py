"""
Multi-Entity Investigation Orchestrator

Coordinates multi-entity autonomous investigations with Boolean logic,
relationship analysis, and cross-entity pattern detection.

Phase 2.1 Implementation: Multi-Entity Investigation Orchestration
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
import uuid
from collections import defaultdict

from app.service.logging import get_bridge_logger
from app.service.agent.multi_entity.entity_manager import EntityManager, EntityType, get_entity_manager
from app.service.agent.multi_entity.multi_investigation_coordinator import get_multi_entity_coordinator
from app.service.agent.multi_entity.cross_entity_analyzer import get_cross_entity_analyzer
from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
    EntityRelationship,
    CrossEntityAnalysis,
    RelationshipInsight,
    MultiEntityRiskAssessment,
    InvestigationResult,
    BooleanQueryParser
)

logger = get_bridge_logger(__name__)


@dataclass
class InvestigationContext:
    """Context for multi-entity investigation execution"""
    
    investigation_id: str
    entity_ids: Set[str]
    entity_types: Dict[str, EntityType]  # entity_id -> EntityType
    relationships: List[EntityRelationship]
    boolean_logic: str
    investigation_scope: List[str]
    
    # Execution state
    agent_results: Dict[str, List[InvestigationResult]]  # entity_id -> results
    cross_entity_findings: List[Dict[str, Any]]
    relationship_evidence: Dict[str, List[Dict[str, Any]]]  # relationship_id -> evidence
    
    # Timeline tracking
    timeline: List[Dict[str, Any]]
    start_time: datetime
    phase_timings: Dict[str, Dict[str, datetime]]
    
    def add_timeline_event(self, event_type: str, description: str, metadata: Optional[Dict[str, Any]] = None):
        """Add event to investigation timeline"""
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "description": description,
            "metadata": metadata or {}
        }
        self.timeline.append(event)
        logger.info(f"Timeline [{self.investigation_id}]: {event_type} - {description}")


class MultiEntityInvestigationOrchestrator:
    """
    Orchestrates multi-entity autonomous investigations with comprehensive
    cross-entity analysis and Boolean logic support.
    """
    
    def __init__(self):
        self.entity_manager = get_entity_manager()
        self.multi_coordinator = get_multi_entity_coordinator()
        self.cross_analyzer = get_cross_entity_analyzer()
        self.active_investigations: Dict[str, InvestigationContext] = {}
        self.logger = get_bridge_logger(f"{__name__}.orchestrator")
        
        # Performance metrics
        self.metrics = {
            "total_investigations": 0,
            "successful_investigations": 0,
            "failed_investigations": 0,
            "avg_execution_time_ms": 0.0,
            "entities_processed": 0
        }
    
    async def start_multi_entity_investigation(
        self, 
        request: MultiEntityInvestigationRequest
    ) -> MultiEntityInvestigationResult:
        """
        Start a new multi-entity autonomous investigation.
        
        Args:
            request: Multi-entity investigation request
            
        Returns:
            Investigation result with initial status
        """
        investigation_id = request.investigation_id
        start_time = datetime.now(timezone.utc)
        
        self.logger.info(f"🔍 Starting multi-entity investigation: {investigation_id}")
        
        try:
            # Validate and parse request
            context = await self._initialize_investigation_context(request)
            
            # Register investigation 
            self.active_investigations[investigation_id] = context
            self.metrics["total_investigations"] += 1
            
            context.add_timeline_event(
                "investigation_started",
                f"Multi-entity investigation started with {len(context.entity_ids)} entities",
                {"entity_count": len(context.entity_ids), "boolean_logic": context.boolean_logic}
            )
            
            # Create initial result structure
            result = MultiEntityInvestigationResult(
                investigation_id=investigation_id,
                status="in_progress",
                entities=[{"entity_id": eid, "entity_type": context.entity_types[eid].value} 
                         for eid in context.entity_ids],
                relationships=request.relationships,
                boolean_logic=request.boolean_logic,
                started_at=start_time,
                investigation_timeline=context.timeline
            )
            
            self.logger.info(f"✅ Multi-entity investigation initialized: {investigation_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start multi-entity investigation {investigation_id}: {str(e)}")
            self.metrics["failed_investigations"] += 1
            raise
    
    async def execute_multi_entity_investigation(
        self,
        investigation_id: str,
        request: MultiEntityInvestigationRequest
    ) -> MultiEntityInvestigationResult:
        """
        Execute complete multi-entity investigation workflow.
        
        Args:
            investigation_id: Investigation identifier
            request: Investigation request parameters
            
        Returns:
            Complete investigation results
        """
        if investigation_id not in self.active_investigations:
            raise ValueError(f"Investigation {investigation_id} not found in active investigations")
        
        context = self.active_investigations[investigation_id]
        
        try:
            self.logger.info(f"🚀 Executing multi-entity investigation: {investigation_id}")
            
            # Phase 1: Entity Investigation Coordination
            await self._execute_entity_investigations(context, request)
            
            # Phase 2: Cross-Entity Analysis
            cross_analysis = await self._execute_cross_entity_analysis(context, request)
            
            # Phase 3: Relationship Analysis
            relationship_insights = await self._execute_relationship_analysis(context, request)
            
            # Phase 4: Boolean Logic Evaluation
            boolean_result = await self._execute_boolean_logic_evaluation(context, request)
            
            # Phase 5: Risk Assessment
            risk_assessment = await self._execute_risk_assessment(context, request, boolean_result)
            
            # Build final result
            end_time = datetime.now(timezone.utc)
            duration_ms = int((end_time - context.start_time).total_seconds() * 1000)
            
            context.add_timeline_event(
                "investigation_completed",
                f"Multi-entity investigation completed in {duration_ms}ms",
                {"duration_ms": duration_ms, "entities_processed": len(context.entity_ids)}
            )
            
            result = MultiEntityInvestigationResult(
                investigation_id=investigation_id,
                status="completed",
                entities=[{"entity_id": eid, "entity_type": context.entity_types[eid].value} 
                         for eid in context.entity_ids],
                relationships=request.relationships,
                boolean_logic=request.boolean_logic,
                entity_results=context.agent_results,
                cross_entity_analysis=cross_analysis,
                relationship_insights=relationship_insights,
                overall_risk_assessment=risk_assessment,
                investigation_timeline=context.timeline,
                performance_metrics=self._build_performance_metrics(context),
                started_at=context.start_time,
                completed_at=end_time,
                total_duration_ms=duration_ms
            )
            
            # Update metrics
            self.metrics["successful_investigations"] += 1
            self.metrics["entities_processed"] += len(context.entity_ids)
            self._update_average_execution_time(duration_ms)
            
            # Clean up active investigation
            del self.active_investigations[investigation_id]
            
            self.logger.info(f"✅ Multi-entity investigation completed: {investigation_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Multi-entity investigation failed {investigation_id}: {str(e)}")
            context.add_timeline_event("investigation_failed", f"Investigation failed: {str(e)}")
            self.metrics["failed_investigations"] += 1
            
            # Clean up on failure
            if investigation_id in self.active_investigations:
                del self.active_investigations[investigation_id]
            
            raise
    
    async def _initialize_investigation_context(
        self, 
        request: MultiEntityInvestigationRequest
    ) -> InvestigationContext:
        """Initialize investigation context from request"""
        
        # Parse entities and types
        entity_ids = set()
        entity_types = {}
        
        for entity_dict in request.entities:
            entity_id = entity_dict["entity_id"]
            entity_type_str = entity_dict["entity_type"]
            
            # Map string to EntityType enum
            try:
                entity_type = EntityType(entity_type_str)
            except ValueError:
                raise ValueError(f"Invalid entity type: {entity_type_str}")
            
            entity_ids.add(entity_id)
            entity_types[entity_id] = entity_type
        
        # Validate relationships reference valid entities
        for relationship in request.relationships:
            if relationship.source_entity_id not in entity_ids:
                raise ValueError(f"Relationship source entity not found: {relationship.source_entity_id}")
            if relationship.target_entity_id not in entity_ids:
                raise ValueError(f"Relationship target entity not found: {relationship.target_entity_id}")
        
        # Create context
        context = InvestigationContext(
            investigation_id=request.investigation_id,
            entity_ids=entity_ids,
            entity_types=entity_types,
            relationships=request.relationships,
            boolean_logic=request.boolean_logic,
            investigation_scope=request.investigation_scope,
            agent_results=defaultdict(list),
            cross_entity_findings=[],
            relationship_evidence=defaultdict(list),
            timeline=[],
            start_time=datetime.now(timezone.utc),
            phase_timings={}
        )
        
        return context
    
    async def _execute_entity_investigations(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest
    ):
        """Execute autonomous investigations for each entity using real LangGraph coordination"""
        
        context.add_timeline_event(
            "entity_investigations_started",
            f"Starting parallel investigations for {len(context.entity_ids)} entities"
        )
        
        phase_start = datetime.now(timezone.utc)
        
        try:
            # Use the real multi-entity coordinator
            self.logger.info(f"🔄 Delegating to multi-entity coordinator for investigation: {context.investigation_id}")
            
            coordination_result = await self.multi_coordinator.coordinate_multi_entity_investigation(request)
            
            # Extract results from coordination
            entity_results = coordination_result.get("entity_results", {})
            
            # Update context with real results
            for entity_id, results in entity_results.items():
                if entity_id in context.entity_ids:
                    context.agent_results[entity_id] = results
            
            # Store coordination metadata
            context.cross_entity_findings = coordination_result.get("cross_entity_findings", [])
            
            self.logger.info(f"✅ Multi-entity coordination completed for: {context.investigation_id}")
            
        except Exception as e:
            self.logger.error(f"❌ Multi-entity coordination failed: {str(e)}")
            # Fallback to individual entity processing if coordination fails
            await self._execute_fallback_entity_investigations(context, request)
        
        phase_end = datetime.now(timezone.utc)
        phase_duration = int((phase_end - phase_start).total_seconds() * 1000)
        
        context.phase_timings["entity_investigations"] = {
            "start": phase_start,
            "end": phase_end,
            "duration_ms": phase_duration
        }
        
        context.add_timeline_event(
            "entity_investigations_completed",
            f"Completed entity investigations in {phase_duration}ms",
            {"entities_processed": len(context.entity_ids), "duration_ms": phase_duration}
        )
    
    async def _execute_fallback_entity_investigations(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest
    ):
        """Fallback entity investigation if coordination fails"""
        
        self.logger.warning("Using fallback entity investigation due to coordination failure")
        
        for entity_id in context.entity_ids:
            entity_type = context.entity_types[entity_id]
            
            # Create minimal results for fallback
            for agent_scope in context.investigation_scope:
                result = InvestigationResult(
                    investigation_id=context.investigation_id,
                    entity_id=entity_id,
                    agent_type=f"{agent_scope}_agent",
                    findings={
                        "entity_type": entity_type.value,
                        "agent_scope": agent_scope,
                        "investigation_phase": "fallback",
                        "note": "Generated by fallback due to coordination failure"
                    },
                    risk_indicators=[],
                    tool_results=[],
                    risk_score=0.5,  # Default risk
                    confidence_score=0.3,  # Lower confidence for fallback
                    execution_time_ms=500,
                    agent_reasoning=f"Fallback analysis for {agent_scope} of {entity_id}"
                )
                
                context.agent_results[entity_id].append(result)
    
    async def _execute_cross_entity_analysis(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest
    ) -> Optional[CrossEntityAnalysis]:
        """Execute cross-entity pattern analysis using real analyzer"""
        
        if not request.enable_cross_entity_analysis:
            return None
        
        context.add_timeline_event("cross_entity_analysis_started", "Starting cross-entity pattern analysis")
        
        phase_start = datetime.now(timezone.utc)
        
        try:
            # Use the real cross-entity analyzer
            self.logger.info(f"🔗 Performing cross-entity analysis for investigation: {context.investigation_id}")
            
            analysis = await self.cross_analyzer.analyze_cross_entity_patterns(
                investigation_id=context.investigation_id,
                entity_results=dict(context.agent_results),
                relationships=context.relationships,
                entities=[{"entity_id": eid, "entity_type": context.entity_types[eid].value} 
                         for eid in context.entity_ids]
            )
            
            self.logger.info(f"✅ Cross-entity analysis completed for: {context.investigation_id}")
            
        except Exception as e:
            self.logger.error(f"❌ Cross-entity analysis failed: {str(e)}")
            # Create fallback analysis
            analysis = CrossEntityAnalysis(
                investigation_id=context.investigation_id,
                entity_interactions=[],
                risk_correlations=[],
                temporal_patterns=[],
                anomaly_clusters=[],
                behavioral_insights=[{"error": str(e), "fallback": True}],
                overall_confidence=0.3
            )
        
        phase_end = datetime.now(timezone.utc)
        phase_duration = int((phase_end - phase_start).total_seconds() * 1000)
        
        context.add_timeline_event(
            "cross_entity_analysis_completed",
            f"Cross-entity analysis completed in {phase_duration}ms"
        )
        
        return analysis
    
    async def _execute_relationship_analysis(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest
    ) -> List[RelationshipInsight]:
        """Analyze entity relationships for insights"""
        
        context.add_timeline_event("relationship_analysis_started", "Analyzing entity relationships")
        
        insights = []
        
        # TODO: Phase 2.2 - Implement relationship analysis algorithms
        # Placeholder for establishing structure
        
        for relationship in context.relationships:
            insight = RelationshipInsight(
                investigation_id=context.investigation_id,
                relationship_id=str(uuid.uuid4()),  # Placeholder
                insight_type="placeholder",
                description=f"Placeholder insight for {relationship.relationship_type.value} relationship",
                risk_impact=0.3,
                confidence_level=0.7,
                supporting_evidence=[],
                agent_sources=context.investigation_scope
            )
            insights.append(insight)
        
        context.add_timeline_event(
            "relationship_analysis_completed", 
            f"Generated {len(insights)} relationship insights"
        )
        
        return insights
    
    async def _execute_boolean_logic_evaluation(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest
    ) -> Dict[str, Any]:
        """Evaluate boolean logic expression using real parser"""
        
        context.add_timeline_event("boolean_evaluation_started", f"Evaluating boolean logic: {context.boolean_logic}")
        
        try:
            # Use the real boolean query parser
            parser = BooleanQueryParser(
                expression=context.boolean_logic,
                entity_mapping={eid: eid for eid in context.entity_ids}
            )
            
            # Parse the expression
            parse_result = parser.parse()
            
            if parse_result.get("valid"):
                # Calculate boolean result based on entity investigations
                entity_results = {}
                for entity_id, agent_results in context.agent_results.items():
                    if agent_results:
                        # Consider entity "positive" if average risk > 0.6
                        avg_risk = sum(r.risk_score for r in agent_results) / len(agent_results)
                        entity_results[entity_id] = avg_risk > 0.6
                    else:
                        entity_results[entity_id] = False
                
                # Evaluate boolean expression
                boolean_result = parser.evaluate(entity_results)
                
                result = {
                    **parse_result,
                    "evaluation_result": boolean_result,
                    "entity_results": entity_results,
                    "evaluation_summary": self._generate_boolean_summary(
                        context.boolean_logic, boolean_result, entity_results
                    )
                }
                
                self.logger.info(f"✅ Boolean evaluation result: {boolean_result} for expression: {context.boolean_logic}")
            else:
                result = parse_result
                self.logger.warning(f"⚠️ Boolean expression parsing failed: {parse_result.get('error')}")
            
        except Exception as e:
            self.logger.error(f"❌ Boolean logic evaluation failed: {str(e)}")
            result = {
                "parsed": False,
                "valid": False,
                "error": str(e),
                "evaluation_result": False
            }
        
        context.add_timeline_event("boolean_evaluation_completed", "Boolean logic evaluation completed")
        
        return result
    
    def _generate_boolean_summary(self, expression: str, result: bool, entity_results: Dict[str, bool]) -> str:
        """Generate human-readable summary of boolean evaluation"""
        
        positive_entities = [eid for eid, res in entity_results.items() if res]
        negative_entities = [eid for eid, res in entity_results.items() if not res]
        
        summary = f"Boolean expression '{expression}' evaluated to {result}. "
        
        if positive_entities:
            summary += f"High-risk entities: {', '.join(positive_entities)}. "
        
        if negative_entities:
            summary += f"Low-risk entities: {', '.join(negative_entities)}."
        
        return summary
    
    async def _execute_risk_assessment(
        self, 
        context: InvestigationContext, 
        request: MultiEntityInvestigationRequest,
        boolean_result: Dict[str, Any]
    ) -> MultiEntityRiskAssessment:
        """Calculate overall risk assessment"""
        
        context.add_timeline_event("risk_assessment_started", "Calculating multi-entity risk assessment")
        
        # Calculate individual entity scores from agent results
        individual_scores = {}
        for entity_id, results in context.agent_results.items():
            if results:
                # Average risk scores from all agents for this entity
                scores = [r.risk_score for r in results if r.risk_score > 0]
                individual_scores[entity_id] = sum(scores) / len(scores) if scores else 0.0
            else:
                individual_scores[entity_id] = 0.0
        
        # Calculate overall risk score (placeholder algorithm)
        overall_risk = sum(individual_scores.values()) / len(individual_scores) if individual_scores else 0.0
        
        assessment = MultiEntityRiskAssessment(
            investigation_id=context.investigation_id,
            overall_risk_score=overall_risk,
            individual_entity_scores=individual_scores,
            relationship_risk_factors=[],
            cross_entity_multipliers={},
            aggregation_method="average",
            confidence_level=0.8
        )
        
        context.add_timeline_event(
            "risk_assessment_completed", 
            f"Risk assessment completed - overall score: {overall_risk:.3f}"
        )
        
        return assessment
    
    def _build_performance_metrics(self, context: InvestigationContext) -> Dict[str, Any]:
        """Build performance metrics for investigation"""
        
        total_duration = (datetime.now(timezone.utc) - context.start_time).total_seconds() * 1000
        
        return {
            "total_duration_ms": int(total_duration),
            "entities_processed": len(context.entity_ids),
            "relationships_analyzed": len(context.relationships),
            "agent_executions": sum(len(results) for results in context.agent_results.values()),
            "phase_timings": {
                phase: {
                    "duration_ms": timing["duration_ms"]
                } for phase, timing in context.phase_timings.items()
            },
            "timeline_events": len(context.timeline)
        }
    
    def _update_average_execution_time(self, duration_ms: int):
        """Update running average execution time"""
        total_investigations = self.metrics["total_investigations"]
        current_avg = self.metrics["avg_execution_time_ms"]
        
        # Calculate new average
        new_avg = ((current_avg * (total_investigations - 1)) + duration_ms) / total_investigations
        self.metrics["avg_execution_time_ms"] = new_avg
    
    def get_investigation_status(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of active investigation"""
        
        if investigation_id not in self.active_investigations:
            return None
        
        context = self.active_investigations[investigation_id]
        
        # Calculate progress based on completed agent results
        total_expected_results = len(context.entity_ids) * len(context.investigation_scope)
        completed_results = sum(len(results) for results in context.agent_results.values())
        progress_percentage = (completed_results / total_expected_results * 100) if total_expected_results > 0 else 0
        
        return {
            "investigation_id": investigation_id,
            "status": "in_progress",
            "progress_percentage": min(progress_percentage, 100.0),
            "entities_processed": len([eid for eid, results in context.agent_results.items() if results]),
            "total_entities": len(context.entity_ids),
            "timeline_events": len(context.timeline),
            "current_phase": self._determine_current_phase(context),
            "started_at": context.start_time.isoformat()
        }
    
    def _determine_current_phase(self, context: InvestigationContext) -> str:
        """Determine current investigation phase based on state"""
        
        total_expected_results = len(context.entity_ids) * len(context.investigation_scope)
        completed_results = sum(len(results) for results in context.agent_results.values())
        
        if completed_results == 0:
            return "initialization"
        elif completed_results < total_expected_results:
            return "entity_investigation"
        else:
            return "cross_entity_analysis"
    
    def get_orchestrator_metrics(self) -> Dict[str, Any]:
        """Get orchestrator performance metrics"""
        return {
            **self.metrics,
            "active_investigations": len(self.active_investigations),
            "success_rate": (
                self.metrics["successful_investigations"] / self.metrics["total_investigations"] 
                if self.metrics["total_investigations"] > 0 else 0.0
            )
        }


# Global orchestrator instance
_orchestrator: Optional[MultiEntityInvestigationOrchestrator] = None


def get_multi_entity_orchestrator() -> MultiEntityInvestigationOrchestrator:
    """Get the global multi-entity investigation orchestrator instance"""
    global _orchestrator
    
    if _orchestrator is None:
        _orchestrator = MultiEntityInvestigationOrchestrator()
    
    return _orchestrator