"""
Integration System

Master integration system that coordinates all advanced agent capabilities,
providing unified access to patterns, tools, communication, RAG, and multi-entity features.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Union

from .patterns import get_pattern_registry, PatternType, PatternResult
from .agent_factory import get_agent_factory
from .tools.tool_manager import get_tool_manager, initialize_default_tools
from .communication.ice_events import get_event_bus, ICEEventType
from .communication.agent_communication import get_communication_hub
from .communication.investigation_state import get_state_manager, InvestigationState
from .rag.rag_orchestrator import get_rag_orchestrator, RAGRequest
from .multi_entity.entity_manager import get_entity_manager, EntityType
from .websocket_streaming_service import WebSocketStreamingService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class IntegratedInvestigationRequest:
    """Unified request for integrated investigation"""
    
    investigation_id: str
    entity_id: str
    entity_type: str
    investigation_type: str = "comprehensive"
    
    # Context and parameters
    user_context: Dict[str, Any] = field(default_factory=dict)
    investigation_context: Dict[str, Any] = field(default_factory=dict)
    
    # Processing preferences
    preferred_pattern: Optional[PatternType] = None
    max_execution_time: int = 300
    enable_rag: bool = True
    enable_multi_entity: bool = True
    enable_streaming: bool = True
    
    # Quality requirements
    min_confidence_threshold: float = 0.7
    require_evidence: bool = True


@dataclass
class IntegratedInvestigationResult:
    """Unified result from integrated investigation"""
    
    investigation_id: str
    success: bool = True
    
    # Core results
    primary_result: Any = None
    confidence_score: float = 0.0
    risk_assessment: Dict[str, Any] = field(default_factory=dict)
    
    # Pattern execution results
    pattern_results: Dict[str, PatternResult] = field(default_factory=dict)
    patterns_executed: List[str] = field(default_factory=list)
    
    # Tool execution results
    tools_executed: List[str] = field(default_factory=list)
    tool_results: Dict[str, Any] = field(default_factory=dict)
    
    # RAG enhancement results
    rag_enhanced: bool = False
    knowledge_retrieved: List[Dict[str, Any]] = field(default_factory=list)
    
    # Multi-entity analysis
    related_entities: List[Dict[str, Any]] = field(default_factory=list)
    entity_relationships: List[Dict[str, Any]] = field(default_factory=list)
    
    # Processing metadata
    execution_time_seconds: float = 0.0
    processing_stages: List[Dict[str, Any]] = field(default_factory=list)
    events_generated: int = 0
    
    # Quality metrics
    evidence_strength: float = 0.0
    recommendation_count: int = 0
    
    error_message: Optional[str] = None


class IntegratedAgentSystem:
    """
    Master integration system coordinating all advanced agent capabilities.
    
    This system provides:
    - Unified interface for complex investigations
    - Automatic pattern selection and execution
    - Tool orchestration and management
    - Real-time communication and state management
    - RAG-enhanced knowledge retrieval
    - Multi-entity analysis and correlation
    - Comprehensive monitoring and analytics
    """
    
    def __init__(self):
        """Initialize integrated agent system"""
        
        # Core system components
        self.pattern_registry = get_pattern_registry()
        self.agent_factory = get_agent_factory()
        self.tool_manager = get_tool_manager()
        self.event_bus = get_event_bus()
        self.communication_hub = get_communication_hub()
        self.state_manager = get_state_manager()
        self.rag_orchestrator = get_rag_orchestrator()
        self.entity_manager = get_entity_manager()
        
        # System state
        self.active_investigations: Dict[str, IntegratedInvestigationRequest] = {}
        self.system_initialized = False
        
        # Statistics
        self.stats = {
            'investigations_processed': 0,
            'successful_investigations': 0,
            'failed_investigations': 0,
            'total_processing_time': 0.0,
            'patterns_executed': 0,
            'tools_executed': 0,
            'entities_analyzed': 0,
            'start_time': datetime.now()
        }
        
        self.logger = logging.getLogger(f"{__name__}.integrated_system")
    
    async def initialize(self) -> bool:
        """Initialize all system components"""
        
        if self.system_initialized:
            return True
        
        try:
            self.logger.info("Initializing Integrated Agent System...")
            
            # Initialize default tools
            await initialize_default_tools(self.tool_manager)
            
            # Register system agent for coordination
            self.communication_hub.register_agent(
                agent_id="integrated_system",
                agent_type="orchestrator",
                capabilities=["investigation_coordination", "pattern_execution", "multi_entity_analysis"],
                message_handler=self._handle_system_message
            )
            
            # Set up default investigation state validators
            await self._setup_state_validators()
            
            # Initialize RAG system with fraud investigation knowledge
            await self._initialize_domain_knowledge()
            
            self.system_initialized = True
            self.logger.info("Integrated Agent System initialized successfully")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize system: {str(e)}")
            return False
    
    async def execute_integrated_investigation(
        self,
        request: IntegratedInvestigationRequest,
        ws_streaming: Optional[WebSocketStreamingService] = None
    ) -> IntegratedInvestigationResult:
        """Execute comprehensive integrated investigation"""
        
        start_time = datetime.now()
        
        try:
            # Track active investigation
            self.active_investigations[request.investigation_id] = request
            
            # Create investigation state
            await self.state_manager.create_investigation(
                request.investigation_id,
                {
                    'entity_id': request.entity_id,
                    'entity_type': request.entity_type,
                    'investigation_type': request.investigation_type,
                    'created_by': request.user_context.get('user_id', 'system')
                },
                request.entity_id,
                request.entity_type
            )
            
            # Initialize result
            result = IntegratedInvestigationResult(investigation_id=request.investigation_id)
            
            # Phase 1: Entity Management and Multi-Entity Analysis
            if request.enable_multi_entity:
                await self._execute_multi_entity_analysis(request, result, ws_streaming)
            
            # Phase 2: Pattern Selection and Execution
            pattern_results = await self._execute_investigation_patterns(request, result, ws_streaming)
            result.pattern_results = pattern_results
            
            # Phase 3: RAG Enhancement
            if request.enable_rag:
                await self._execute_rag_enhancement(request, result, ws_streaming)
            
            # Phase 4: Results Integration and Analysis
            await self._integrate_results(request, result, ws_streaming)
            
            # Phase 5: Quality Assessment and Validation
            await self._assess_result_quality(request, result, ws_streaming)
            
            # Finalize investigation
            await self._finalize_investigation(request, result, ws_streaming)
            
            # Calculate processing time
            result.execution_time_seconds = (datetime.now() - start_time).total_seconds()
            
            # Update statistics
            self.stats['investigations_processed'] += 1
            if result.success:
                self.stats['successful_investigations'] += 1
            else:
                self.stats['failed_investigations'] += 1
            self.stats['total_processing_time'] += result.execution_time_seconds
            
            return result
            
        except Exception as e:
            self.logger.error(f"Integrated investigation failed: {str(e)}")
            
            # Create error result
            result = IntegratedInvestigationResult(
                investigation_id=request.investigation_id,
                success=False,
                error_message=str(e),
                execution_time_seconds=(datetime.now() - start_time).total_seconds()
            )
            
            self.stats['failed_investigations'] += 1
            return result
            
        finally:
            # Clean up active investigation
            self.active_investigations.pop(request.investigation_id, None)
    
    async def _execute_multi_entity_analysis(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> None:
        """Execute multi-entity analysis phase"""
        
        try:
            if ws_streaming:
                await ws_streaming.send_agent_thought({
                    "type": "multi_entity_analysis_start",
                    "pattern": "integrated_investigation",
                    "message": f"Starting multi-entity analysis for {request.entity_type}",
                    "context": request.investigation_id
                })
            
            # Create primary entity
            entity_type = EntityType(request.entity_type.lower())
            primary_entity_id = await self.entity_manager.create_entity(
                entity_type=entity_type,
                name=f"{request.entity_type}_{request.entity_id}",
                attributes=request.investigation_context,
                investigation_id=request.investigation_id
            )
            
            # Find related entities
            related_entities = self.entity_manager.get_related_entities(
                primary_entity_id,
                max_depth=2
            )
            
            # Analyze entity network
            network_analysis = self.entity_manager.analyze_entity_network(primary_entity_id)
            
            # Update result
            result.related_entities = [entity.to_dict() for entity in related_entities]
            result.processing_stages.append({
                'stage': 'multi_entity_analysis',
                'entities_analyzed': len(related_entities) + 1,
                'network_metrics': network_analysis,
                'timestamp': datetime.now().isoformat()
            })
            
            self.stats['entities_analyzed'] += len(related_entities) + 1
            
        except Exception as e:
            self.logger.error(f"Multi-entity analysis failed: {str(e)}")
            result.processing_stages.append({
                'stage': 'multi_entity_analysis',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    async def _execute_investigation_patterns(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> Dict[str, PatternResult]:
        """Execute investigation patterns based on request type"""
        
        pattern_results = {}
        
        try:
            # Determine patterns to execute
            if request.preferred_pattern:
                patterns_to_execute = [request.preferred_pattern]
            else:
                patterns_to_execute = self._select_patterns_for_investigation(request)
            
            result.patterns_executed = [pattern.value for pattern in patterns_to_execute]
            
            # Execute patterns
            for pattern_type in patterns_to_execute:
                try:
                    if ws_streaming:
                        await ws_streaming.send_agent_thought({
                            "type": "pattern_execution_start",
                            "pattern": pattern_type.value,
                            "message": f"Executing {pattern_type.value} pattern",
                            "context": request.investigation_id
                        })
                    
                    # Create pattern instance
                    pattern = self.pattern_registry.create_pattern(
                        pattern_type=pattern_type,
                        config=self.pattern_registry.get_default_config(pattern_type),
                        tools=self.tool_manager.get_tools_by_category("data_analysis"),
                        ws_streaming=ws_streaming
                    )
                    
                    # Execute pattern
                    pattern_result = await pattern.execute(
                        messages=[],  # Would be populated with actual messages
                        context={
                            'investigation_id': request.investigation_id,
                            'entity_id': request.entity_id,
                            'entity_type': request.entity_type,
                            **request.investigation_context
                        }
                    )
                    
                    pattern_results[pattern_type.value] = pattern_result
                    self.stats['patterns_executed'] += 1
                    
                    if ws_streaming:
                        await ws_streaming.send_agent_thought({
                            "type": "pattern_execution_complete",
                            "pattern": pattern_type.value,
                            "success": pattern_result.success,
                            "confidence": pattern_result.confidence_score,
                            "message": f"Completed {pattern_type.value} pattern",
                            "context": request.investigation_id
                        })
                
                except Exception as e:
                    self.logger.error(f"Pattern {pattern_type.value} execution failed: {str(e)}")
                    pattern_results[pattern_type.value] = PatternResult.error_result(str(e))
            
            return pattern_results
            
        except Exception as e:
            self.logger.error(f"Pattern execution phase failed: {str(e)}")
            return {}
    
    async def _execute_rag_enhancement(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> None:
        """Execute RAG enhancement phase"""
        
        try:
            if ws_streaming:
                await ws_streaming.send_agent_thought({
                    "type": "rag_enhancement_start",
                    "pattern": "integrated_investigation", 
                    "message": "Enhancing investigation with domain knowledge",
                    "context": request.investigation_id
                })
            
            # Create RAG request
            rag_request = RAGRequest(
                query=f"Investigation of {request.entity_type} entity {request.entity_id}",
                investigation_id=request.investigation_id,
                entity_id=request.entity_id,
                entity_type=request.entity_type,
                investigation_type=request.investigation_type,
                max_retrieved_chunks=10
            )
            
            # Execute RAG
            rag_response = await self.rag_orchestrator.process_request(rag_request)
            
            if rag_response.success:
                result.rag_enhanced = True
                result.knowledge_retrieved = [
                    {
                        'chunk_id': chunk.chunk_id,
                        'content': chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                        'document_id': chunk.document_id,
                        'relevance_score': chunk.importance_score
                    }
                    for chunk in rag_response.retrieved_chunks
                ]
            
            result.processing_stages.append({
                'stage': 'rag_enhancement',
                'success': rag_response.success,
                'chunks_retrieved': len(rag_response.retrieved_chunks),
                'confidence': rag_response.confidence_score,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"RAG enhancement failed: {str(e)}")
            result.processing_stages.append({
                'stage': 'rag_enhancement',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    async def _integrate_results(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> None:
        """Integrate results from all analysis phases"""
        
        try:
            # Aggregate confidence scores
            confidence_scores = []
            
            for pattern_result in result.pattern_results.values():
                if pattern_result.success:
                    confidence_scores.append(pattern_result.confidence_score)
            
            if confidence_scores:
                result.confidence_score = sum(confidence_scores) / len(confidence_scores)
            
            # Create integrated risk assessment
            result.risk_assessment = {
                'overall_risk_score': min(1.0, result.confidence_score * 0.8),  # Conservative estimate
                'confidence_level': 'high' if result.confidence_score >= 0.8 else 'medium' if result.confidence_score >= 0.6 else 'low',
                'patterns_consensus': len([pr for pr in result.pattern_results.values() if pr.success and pr.confidence_score >= 0.7]),
                'evidence_sources': len(result.knowledge_retrieved),
                'entity_network_size': len(result.related_entities)
            }
            
            # Extract primary result
            if result.pattern_results:
                # Use the highest confidence pattern result as primary
                best_pattern_result = max(
                    result.pattern_results.values(),
                    key=lambda pr: pr.confidence_score if pr.success else 0
                )
                result.primary_result = best_pattern_result.result
            
        except Exception as e:
            self.logger.error(f"Results integration failed: {str(e)}")
    
    async def _assess_result_quality(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> None:
        """Assess quality of integrated results"""
        
        try:
            # Calculate evidence strength
            evidence_factors = []
            
            # Pattern evidence
            successful_patterns = [pr for pr in result.pattern_results.values() if pr.success]
            if successful_patterns:
                evidence_factors.append(len(successful_patterns) * 0.2)
            
            # Knowledge evidence
            if result.knowledge_retrieved:
                evidence_factors.append(len(result.knowledge_retrieved) * 0.1)
            
            # Entity evidence
            if result.related_entities:
                evidence_factors.append(len(result.related_entities) * 0.05)
            
            result.evidence_strength = min(0.4, sum(evidence_factors))
            
            # Check if quality thresholds are met
            if result.confidence_score < request.min_confidence_threshold:
                result.success = False
                result.error_message = f"Investigation confidence ({result.confidence_score:.2f}) below threshold ({request.min_confidence_threshold})"
            
            if request.require_evidence and result.evidence_strength < 0.3:
                result.success = False
                result.error_message = f"Insufficient evidence strength ({result.evidence_strength:.2f})"
            
        except Exception as e:
            self.logger.error(f"Quality assessment failed: {str(e)}")
    
    async def _finalize_investigation(
        self,
        request: IntegratedInvestigationRequest,
        result: IntegratedInvestigationResult,
        ws_streaming: Optional[WebSocketStreamingService]
    ) -> None:
        """Finalize investigation and update state"""
        
        try:
            # Update investigation state
            if result.success:
                await self.state_manager.transition_state(
                    request.investigation_id,
                    InvestigationState.COMPLETED,
                    "integrated_system",
                    f"Investigation completed with confidence {result.confidence_score:.2f}"
                )
            else:
                await self.state_manager.transition_state(
                    request.investigation_id,
                    InvestigationState.FAILED,
                    "integrated_system",
                    result.error_message or "Investigation failed"
                )
            
            # Publish completion event
            await self.event_bus.publish(
                ICEEventType.INVESTIGATION_COMPLETED if result.success else ICEEventType.INVESTIGATION_FAILED,
                {
                    'investigation_id': request.investigation_id,
                    'success': result.success,
                    'confidence_score': result.confidence_score,
                    'patterns_executed': len(result.patterns_executed),
                    'tools_used': len(result.tools_executed),
                    'processing_time': result.execution_time_seconds,
                    'evidence_strength': result.evidence_strength
                },
                investigation_id=request.investigation_id
            )
            
        except Exception as e:
            self.logger.error(f"Investigation finalization failed: {str(e)}")
    
    def _select_patterns_for_investigation(self, request: IntegratedInvestigationRequest) -> List[PatternType]:
        """Select appropriate patterns based on investigation type"""
        
        pattern_mapping = {
            'device': [PatternType.PROMPT_CHAINING, PatternType.AUGMENTED_LLM],
            'location': [PatternType.PROMPT_CHAINING, PatternType.AUGMENTED_LLM],
            'network': [PatternType.PROMPT_CHAINING, PatternType.ROUTING],
            'behavioral': [PatternType.ORCHESTRATOR_WORKERS, PatternType.EVALUATOR_OPTIMIZER],
            'comprehensive': [PatternType.ORCHESTRATOR_WORKERS, PatternType.PARALLELIZATION],
            'risk_assessment': [PatternType.EVALUATOR_OPTIMIZER, PatternType.AUGMENTED_LLM],
            'fraud_investigation': [PatternType.ORCHESTRATOR_WORKERS, PatternType.PROMPT_CHAINING]
        }
        
        return pattern_mapping.get(
            request.investigation_type,
            [PatternType.AUGMENTED_LLM]  # Default pattern
        )
    
    async def _setup_state_validators(self) -> None:
        """Set up default state validators"""
        
        # Implementation would add investigation-specific validators
        pass
    
    async def _initialize_domain_knowledge(self) -> None:
        """Initialize RAG system with fraud investigation domain knowledge"""
        
        # Sample domain knowledge documents
        sample_documents = [
            {
                'title': 'Device Fingerprinting Best Practices',
                'content': 'Device fingerprinting involves collecting device characteristics such as screen resolution, user agent, installed fonts, and hardware specifications to create unique device identifiers for fraud detection.',
                'document_type': 'guide',
                'entity_types': {'device'},
                'investigation_types': {'device', 'fraud_investigation'},
                'tags': {'device_fingerprinting', 'fraud_detection', 'best_practices'}
            },
            {
                'title': 'Behavioral Analysis Patterns',
                'content': 'Behavioral analysis examines user interaction patterns, session duration, mouse movements, and typing patterns to identify anomalous behavior indicative of fraud or account takeover.',
                'document_type': 'guide',
                'entity_types': {'user', 'behavior_pattern'},
                'investigation_types': {'behavioral', 'fraud_investigation'},
                'tags': {'behavioral_analysis', 'fraud_patterns', 'user_behavior'}
            },
            {
                'title': 'Network Analysis Techniques',
                'content': 'Network analysis involves examining IP addresses, geolocation patterns, connection types, and network infrastructure to identify suspicious network activity and potential fraud.',
                'document_type': 'guide',
                'entity_types': {'network', 'ip_address', 'geolocation'},
                'investigation_types': {'network', 'fraud_investigation'},
                'tags': {'network_analysis', 'ip_analysis', 'geolocation'}
            }
        ]
        
        for doc_data in sample_documents:
            try:
                await self.rag_orchestrator.add_knowledge_document(
                    content=doc_data['content'],
                    title=doc_data['title'],
                    document_type=doc_data['document_type'],
                    entity_types=doc_data['entity_types'],
                    investigation_types=doc_data['investigation_types'],
                    tags=doc_data['tags']
                )
            except Exception as e:
                self.logger.warning(f"Failed to add sample document: {str(e)}")
    
    async def _handle_system_message(self, message: Any) -> None:
        """Handle system coordination messages"""
        # Implementation would handle inter-agent coordination messages
        pass
    
    def get_system_statistics(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        system_stats = {
            'system_status': {
                'initialized': self.system_initialized,
                'uptime_seconds': uptime,
                'active_investigations': len(self.active_investigations)
            },
            'processing_stats': {
                'investigations_processed': self.stats['investigations_processed'],
                'successful_investigations': self.stats['successful_investigations'],
                'failed_investigations': self.stats['failed_investigations'],
                'success_rate': self.stats['successful_investigations'] / max(1, self.stats['investigations_processed']),
                'avg_processing_time': self.stats['total_processing_time'] / max(1, self.stats['investigations_processed']),
                'patterns_executed': self.stats['patterns_executed'],
                'tools_executed': self.stats['tools_executed'],
                'entities_analyzed': self.stats['entities_analyzed']
            }
        }
        
        # Add component statistics
        try:
            system_stats['component_stats'] = {
                'pattern_registry': self.pattern_registry.get_registry_info(),
                'tool_manager': self.tool_manager.get_statistics(),
                'event_bus': self.event_bus.get_statistics(),
                'communication_hub': self.communication_hub.get_statistics(),
                'state_manager': self.state_manager.get_statistics(),
                'rag_orchestrator': self.rag_orchestrator.get_metrics(),
                'entity_manager': self.entity_manager.get_statistics()
            }
        except Exception as e:
            self.logger.warning(f"Failed to collect component statistics: {str(e)}")
        
        return system_stats
    
    async def shutdown(self) -> None:
        """Shutdown integrated system"""
        
        try:
            self.logger.info("Shutting down Integrated Agent System...")
            
            # Stop event processing
            self.event_bus.stop()
            self.communication_hub.stop()
            
            # Clear caches
            await self.rag_orchestrator.clear_cache()
            await self.tool_manager.clear_global_cache()
            
            # Clean up active investigations
            self.active_investigations.clear()
            
            self.logger.info("Integrated Agent System shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during system shutdown: {str(e)}")


# Global integrated system instance
_integrated_system: Optional[IntegratedAgentSystem] = None


def get_integrated_system() -> IntegratedAgentSystem:
    """Get the global integrated system instance"""
    global _integrated_system
    
    if _integrated_system is None:
        _integrated_system = IntegratedAgentSystem()
    
    return _integrated_system


async def initialize_integrated_system() -> bool:
    """Initialize the integrated agent system"""
    system = get_integrated_system()
    return await system.initialize()