"""
Entityless Investigation Executor

Executes entityless anomaly investigations using the entityless workflow.
Routes to SegmentHunter → EntityExtractor → Correlator → Narrator.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.entityless_investigation_graph import (
    create_entityless_investigation_graph,
    EntitylessInvestigationState
)
from app.models.anomaly import AnomalyEvent
from app.persistence.database import get_db
from langchain_core.messages import HumanMessage
import uuid

logger = get_bridge_logger(__name__)


async def execute_entityless_investigation(
    investigation_id: str,
    anomaly_id: str,
    investigation_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute entityless investigation workflow.
    
    Args:
        investigation_id: Investigation ID
        anomaly_id: Anomaly event ID
        investigation_context: Investigation context with anomaly details
        
    Returns:
        Investigation results
    """
    logger.info(f"🚀 Starting entityless investigation {investigation_id} for anomaly {anomaly_id}")
    logger.info(f"📋 Investigation context: {investigation_context}")
    
    db = next(get_db())
    try:
        # Fetch anomaly
        anomaly = db.query(AnomalyEvent).filter(
            AnomalyEvent.id == uuid.UUID(anomaly_id)
        ).first()
        
        if not anomaly:
            raise ValueError(f"Anomaly {anomaly_id} not found")
        
        # Build initial state
        initial_state: EntitylessInvestigationState = {
            'messages': [
                HumanMessage(content=(
                    f"Investigate anomaly {anomaly_id}: {anomaly.metric} spiked for "
                    f"cohort {anomaly.cohort} in window {anomaly.window_start} to {anomaly.window_end}. "
                    f"Score: {anomaly.score}, Severity: {anomaly.severity}. "
                    f"Find the root cause and identify candidate entities."
                ))
            ],
            'investigation_id': investigation_id,
            'anomaly_id': anomaly_id,
            'anomaly': {
                'id': str(anomaly.id),
                'metric': anomaly.metric,
                'score': float(anomaly.score),
                'severity': anomaly.severity,
                'cohort': anomaly.cohort,
                'window_start': anomaly.window_start.isoformat(),
                'window_end': anomaly.window_end.isoformat(),
                'evidence': anomaly.evidence
            },
            'segments': [],
            'entities': [],
            'root_patterns': [],
            'segment_path': []
        }
        
        # Create and execute graph
        graph = await create_entityless_investigation_graph()
        
        config = {
            'configurable': {
                'investigation_id': investigation_id,
                'thread_id': investigation_id
            }
        }
        
        # Execute workflow
        logger.info(f"🔄 Invoking entityless investigation graph for {investigation_id}")
        try:
            result = await graph.ainvoke(initial_state, config=config)
            logger.info(f"✅ Graph execution completed for {investigation_id}. Result keys: {list(result.keys()) if result else 'None'}")
        except Exception as graph_error:
            logger.error(f"❌ Graph execution failed for {investigation_id}: {graph_error}", exc_info=True)
            raise
        
        # Extract results
        segments = result.get('segments', [])
        entities = result.get('entities', [])
        root_patterns = result.get('root_patterns', [])
        messages = result.get('messages', [])
        
        # Get final summary from narrator
        summary = None
        for msg in reversed(messages):
            if hasattr(msg, 'content') and 'Investigation Summary' in msg.content:
                summary = msg.content
                break
        
        logger.info(
            f"✅ Entityless investigation {investigation_id} completed: "
            f"{len(segments)} segments, {len(entities)} entity groups, "
            f"{len(root_patterns)} root patterns"
        )
        
        # Calculate domain risk scores using LLM analysis
        domain_findings = await _calculate_domain_risk_scores(
            investigation_id=investigation_id,
            anomaly=anomaly,
            segments=segments,
            entities=entities,
            root_patterns=root_patterns,
            summary=summary
        )
        
        # Calculate overall risk score from domain findings
        overall_risk_score = _calculate_overall_risk_score(domain_findings)
        
        # Store results in investigation state
        from app.models.investigation_state import InvestigationState
        from app.schemas.investigation_state import InvestigationStatus, LifecycleStage
        import json
        
        # Get investigation state
        investigation_state = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if investigation_state:
            # Prepare results data with required fields for InvestigationResults schema
            results_data = {
                'risk_score': overall_risk_score,  # Required field for InvestigationResults
                'investigation_id': investigation_id,
                'anomaly_id': anomaly_id,
                'segments': segments,
                'entities': entities,
                'root_patterns': root_patterns,
                'summary': summary,
                'findings': [
                    {
                        'type': 'segment',
                        'count': len(segments),
                        'description': f'Found {len(segments)} anomalous segments'
                    },
                    {
                        'type': 'entity',
                        'count': len(entities),
                        'description': f'Identified {len(entities)} entity groups'
                    }
                ] if segments or entities else [],
                'segment_path': result.get('segment_path', []),
                'completed_at': datetime.utcnow().isoformat(),
                'domain_findings': domain_findings  # LLM-calculated domain risk scores
            }
            
            # Update progress_json with completion status and results
            progress_data = {}
            if investigation_state.progress_json:
                try:
                    progress_data = json.loads(investigation_state.progress_json)
                except json.JSONDecodeError:
                    progress_data = {}
            
            # Merge results_data into progress_data
            progress_data.update({
                'status': 'completed',
                'lifecycle_stage': 'completed',
                'percent_complete': 100,
                'completed_at': datetime.utcnow().isoformat(),
                'segments': segments,
                'entities': entities,
                'root_patterns': root_patterns,
                'domain_findings': domain_findings,  # Include LLM-calculated domain findings
                # Include all results_data fields (risk_score, findings, summary, etc.)
                **results_data
            })
            investigation_state.progress_json = json.dumps(progress_data)
            
            # Update status and lifecycle_stage
            investigation_state.status = InvestigationStatus.COMPLETED.value
            investigation_state.lifecycle_stage = LifecycleStage.COMPLETED.value
            investigation_state.version += 1
            
            # Commit changes
            db.commit()
            db.refresh(investigation_state)
            
            logger.info(
                f"✅ Updated investigation {investigation_id} state: "
                f"status=COMPLETED, segments={len(segments)}, entities={len(entities)}, "
                f"domains={len(domain_findings)}"
            )
        else:
            logger.warning(f"Investigation state not found for {investigation_id}")
        
        # Return results for logging/debugging
        results = {
            'investigation_id': investigation_id,
            'anomaly_id': anomaly_id,
            'segments': segments,
            'entities': entities,
            'root_patterns': root_patterns,
            'summary': summary,
            'segment_path': result.get('segment_path', []),
            'completed_at': datetime.utcnow().isoformat(),
            'domain_findings': domain_findings
        }
        
        return results
        
    except Exception as e:
        logger.error(f"Error executing entityless investigation {investigation_id}: {e}", exc_info=True)
        raise
    finally:
        db.close()


async def _calculate_domain_risk_scores(
    investigation_id: str,
    anomaly: AnomalyEvent,
    segments: list,
    entities: list,
    root_patterns: list,
    summary: Optional[str]
) -> Dict[str, Any]:
    """
    Calculate domain risk scores using LLM analysis for anomaly-based investigations.
    
    Maps segments to domains and uses EvidenceAnalyzer to calculate LLM-based risk scores.
    
    Args:
        investigation_id: Investigation ID
        anomaly: Anomaly event
        segments: List of segments found
        entities: List of entities found
        root_patterns: List of root patterns identified
        summary: Investigation summary
        
    Returns:
        Dictionary mapping domain names to their risk findings
    """
    from app.service.agent.evidence_analyzer import get_evidence_analyzer
    
    logger.info(f"🧠 Calculating domain risk scores using LLM for investigation {investigation_id}")
    
    # Map segments to domains based on dimension type
    domain_segments = _map_segments_to_domains(segments)
    
    # Initialize domain findings
    domain_findings = {}
    
    # Analyze each domain that has segments
    evidence_analyzer = get_evidence_analyzer()
    
    for domain, domain_segment_list in domain_segments.items():
        if not domain_segment_list:
            continue
            
        logger.info(f"   Analyzing {domain} domain: {len(domain_segment_list)} segments")
        
        # Build evidence from segments
        evidence = []
        for segment in domain_segment_list:
            dimension = segment.get('dimension', 'unknown')
            dimension_value = segment.get('dimension_value', 'unknown')
            delta_metric = segment.get('delta_metric', 0)
            importance = segment.get('importance', 0)
            
            evidence.append(
                f"Anomalous segment: {dimension}={dimension_value}, "
                f"metric delta={delta_metric:.3f}, importance={importance:.3f}"
            )
        
        # Add anomaly context
        evidence.append(
            f"Anomaly: {anomaly.metric} spiked with score {anomaly.score} "
            f"in window {anomaly.window_start} to {anomaly.window_end}"
        )
        
        # Add cohort filters
        if anomaly.cohort:
            cohort_str = ", ".join([f"{k}={v}" for k, v in anomaly.cohort.items()])
            evidence.append(f"Cohort filters: {cohort_str}")
        
        # Add root patterns if available
        if root_patterns:
            evidence.append(f"Root patterns identified: {len(root_patterns)}")
            for pattern in root_patterns[:3]:  # Include first 3 patterns
                evidence.append(f"  - {pattern}")
        
        # Build metrics from segments
        metrics = {
            'segment_count': len(domain_segment_list),
            'total_segments': len(segments),
            'anomaly_score': float(anomaly.score),
            'anomaly_severity': anomaly.severity,
            'metric_name': anomaly.metric
        }
        
        # Calculate average importance for this domain
        if domain_segment_list:
            avg_importance = sum(s.get('importance', 0) for s in domain_segment_list) / len(domain_segment_list)
            metrics['avg_segment_importance'] = avg_importance
        
        try:
            # Use LLM to analyze domain evidence
            llm_analysis = await evidence_analyzer.analyze_domain_evidence(
                domain=domain,
                evidence=evidence,
                metrics=metrics,
                snowflake_data=None,  # No Snowflake data for anomaly investigations
                tool_results=None,  # No tool results for anomaly investigations
                entity_type="anomaly",
                entity_id=str(anomaly.id)
            )
            
            # Extract risk score and normalize to 0-1 if needed
            risk_score = llm_analysis.get('risk_score')
            if risk_score is None:
                raise ValueError(f"LLM analysis for {domain} domain did not return a risk_score - cannot proceed without real data")
            
            if isinstance(risk_score, (int, float)) and risk_score > 1.0:
                # Normalize from 0-100 to 0-1
                risk_score = min(risk_score / 100.0, 1.0)
            elif isinstance(risk_score, (int, float)) and risk_score < 0.0:
                risk_score = 0.0
            
            confidence = llm_analysis.get('confidence')
            if confidence is None:
                raise ValueError(f"LLM analysis for {domain} domain did not return a confidence value - cannot proceed without real data")
            
            reasoning = llm_analysis.get('reasoning')
            if not reasoning:
                raise ValueError(f"LLM analysis for {domain} domain did not return reasoning - cannot proceed without real data")
            
            # Build domain findings structure matching structured investigations
            domain_findings[domain] = {
                'risk_score': float(risk_score),
                'confidence': float(confidence),
                'evidence': evidence,
                'summary': reasoning,
                'status': 'OK',
                'llm_analysis': {
                    'risk_score': float(risk_score),
                    'confidence': float(confidence),
                    'reasoning': reasoning,
                    'risk_factors': llm_analysis.get('risk_factors', []),
                    'recommendations': llm_analysis.get('recommendations', []),
                    'llm_response': llm_analysis.get('analysis', '')
                },
                'segments': domain_segment_list
            }
            
            logger.info(
                f"   ✅ {domain} domain: risk_score={risk_score:.3f}, "
                f"confidence={confidence:.3f}"
            )
            
        except Exception as e:
            logger.error(f"   ❌ Failed to analyze {domain} domain: {e}", exc_info=True)
            raise ValueError(f"Cannot analyze {domain} domain without LLM analysis: {e}")
    
    # If no segments found, still create a risk domain finding
    if not domain_findings:
        logger.info("   No segments found, creating default risk domain finding")
        try:
            # Analyze with minimal evidence
            evidence = [
                f"Anomaly detected: {anomaly.metric} with score {anomaly.score}",
                f"Window: {anomaly.window_start} to {anomaly.window_end}",
                "No significant segments identified - anomaly may be systemic or data-limited"
            ]
            
            llm_analysis = await evidence_analyzer.analyze_domain_evidence(
                domain="risk",
                evidence=evidence,
                metrics={'anomaly_score': float(anomaly.score), 'metric_name': anomaly.metric},
                snowflake_data=None,
                tool_results=None,
                entity_type="anomaly",
                entity_id=str(anomaly.id)
            )
            
            risk_score = llm_analysis.get('risk_score')
            if risk_score is None:
                raise ValueError("LLM analysis did not return a risk_score - cannot proceed without real data")
            
            if isinstance(risk_score, (int, float)) and risk_score > 1.0:
                risk_score = min(risk_score / 100.0, 1.0)
            
            confidence = llm_analysis.get('confidence')
            if confidence is None:
                raise ValueError("LLM analysis did not return a confidence value - cannot proceed without real data")
            
            reasoning = llm_analysis.get('reasoning')
            if not reasoning:
                raise ValueError("LLM analysis did not return reasoning - cannot proceed without real data")
            
            domain_findings["risk"] = {
                'risk_score': float(risk_score),
                'confidence': float(confidence),
                'evidence': evidence,
                'summary': reasoning,
                'status': 'OK',
                'llm_analysis': {
                    'risk_score': float(risk_score),
                    'confidence': float(confidence),
                    'reasoning': reasoning,
                    'risk_factors': llm_analysis.get('risk_factors', []),
                    'recommendations': llm_analysis.get('recommendations', []),
                    'llm_response': llm_analysis.get('analysis', '')
                }
            }
        except Exception as e:
            logger.error(f"   ❌ Failed to create risk domain finding: {e}", exc_info=True)
            raise ValueError(f"Cannot create risk domain finding without LLM analysis: {e}")
    
    logger.info(f"✅ Calculated risk scores for {len(domain_findings)} domains")
    return domain_findings


def _map_segments_to_domains(segments: list) -> Dict[str, list]:
    """
    Map segments to domains based on dimension type.
    
    Args:
        segments: List of segment dictionaries
        
    Returns:
        Dictionary mapping domain names to lists of segments
    """
    domain_mapping = {
        'network': ['ip_prefix', 'asn', 'country'],
        'location': ['country', 'ip_prefix'],
        'device': ['device_fp', 'email_domain'],
        'risk': ['reason_code', 'processor', 'issuer', 'bin', 'payment_method'],  # gateway removed - column doesn't exist
        'logs': []  # Logs domain typically doesn't have direct segment mappings
    }
    
    domain_segments = {domain: [] for domain in domain_mapping.keys()}
    
    for segment in segments:
        dimension = segment.get('dimension', '').lower()
        
        # Map to domains
        if dimension in domain_mapping['network']:
            domain_segments['network'].append(segment)
        if dimension in domain_mapping['location']:
            domain_segments['location'].append(segment)
        if dimension in domain_mapping['device']:
            domain_segments['device'].append(segment)
        if dimension in domain_mapping['risk']:
            domain_segments['risk'].append(segment)
    
    return domain_segments


def _calculate_overall_risk_score(domain_findings: Dict[str, Any]) -> int:
    """
    Calculate overall risk score from domain findings.
    
    Uses weighted average of domain risk scores, with higher weights for higher scores.
    
    Args:
        domain_findings: Dictionary of domain findings
        
    Returns:
        Overall risk score (0-100)
    """
    if not domain_findings:
        raise ValueError("Cannot calculate overall risk score without domain findings - no real data available")
    
    # Collect risk scores
    risk_scores = []
    for domain, findings in domain_findings.items():
        risk_score = findings.get('risk_score', 0.0)
        confidence = findings.get('confidence', 0.5)
        
        # Weight by confidence
        weighted_score = risk_score * confidence
        risk_scores.append(weighted_score)
    
    if not risk_scores:
        return 30
    
    # Calculate weighted average and convert to 0-100 scale
    avg_risk = sum(risk_scores) / len(risk_scores)
    overall_risk = int(avg_risk * 100)
    
    # Ensure it's in valid range
    overall_risk = max(0, min(100, overall_risk))
    
    return overall_risk

