"""
Cross-Entity Analyzer

Advanced algorithms for cross-entity pattern detection, risk correlation analysis,
timeline reconstruction, and behavioral anomaly detection across multiple entities.

This module implements the missing Phase 2.2 cross-entity analysis capabilities.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
import uuid
import numpy as np
from collections import defaultdict, Counter
import statistics

from app.service.logging import get_bridge_logger
from app.models.multi_entity_investigation import (
    InvestigationResult,
    EntityRelationship,
    CrossEntityAnalysis
)
from app.service.agent.multi_entity.entity_manager import EntityType, Entity

logger = get_bridge_logger(__name__)


@dataclass
class TimelineEvent:
    """Event in cross-entity timeline"""
    
    timestamp: datetime
    entity_id: str
    entity_type: str
    event_type: str
    event_data: Dict[str, Any]
    risk_score: float
    confidence: float


@dataclass 
class BehavioralPattern:
    """Behavioral pattern detected across entities"""
    
    pattern_id: str
    pattern_type: str
    entities_involved: Set[str]
    pattern_strength: float
    description: str
    evidence: List[Dict[str, Any]]
    risk_impact: float


@dataclass
class AnomalyCluster:
    """Cluster of related anomalies across entities"""
    
    cluster_id: str
    anomaly_type: str
    entities_involved: Set[str]
    cluster_strength: float
    anomalies: List[Dict[str, Any]]
    temporal_span: Optional[Tuple[datetime, datetime]]
    risk_amplification: float


class CrossEntityAnalyzer:
    """
    Advanced cross-entity analysis engine for multi-entity fraud investigations.
    
    Features:
    - Risk correlation analysis between entities
    - Timeline reconstruction across entity relationships  
    - Behavioral pattern detection spanning multiple entities
    - Anomaly clustering and risk amplification detection
    - Temporal pattern analysis and sequence detection
    """
    
    def __init__(self):
        self.logger = get_bridge_logger(f"{__name__}.analyzer")
        
        # Analysis thresholds
        self.correlation_threshold = 0.7
        self.pattern_strength_threshold = 0.6
        self.anomaly_cluster_threshold = 0.5
        
        # Pattern detection weights
        self.pattern_weights = {
            "risk_correlation": 0.3,
            "temporal_proximity": 0.25,
            "behavioral_similarity": 0.25,
            "relationship_strength": 0.2
        }
        
        # Analysis metrics
        self.metrics = {
            "total_analyses": 0,
            "patterns_detected": 0,
            "anomaly_clusters_found": 0,
            "high_risk_correlations": 0
        }
    
    async def analyze_cross_entity_patterns(
        self,
        investigation_id: str,
        entity_results: Dict[str, List[InvestigationResult]],
        relationships: List[EntityRelationship],
        entities: List[Dict[str, str]]
    ) -> CrossEntityAnalysis:
        """
        Perform comprehensive cross-entity analysis.
        
        Args:
            investigation_id: Investigation identifier
            entity_results: Results from individual entity investigations
            relationships: Entity relationships
            entities: Entity definitions
            
        Returns:
            Complete cross-entity analysis results
        """
        self.logger.info(f"🔍 Starting cross-entity analysis for investigation: {investigation_id}")
        
        try:
            self.metrics["total_analyses"] += 1
            
            # Build timeline from all entity results
            timeline = self._build_cross_entity_timeline(entity_results, entities)
            
            # Analyze risk correlations
            risk_correlations = self._analyze_risk_correlations(entity_results, relationships)
            
            # Find behavioral patterns
            behavioral_patterns = self._detect_behavioral_patterns(entity_results, timeline)
            
            # Detect anomaly clusters
            anomaly_clusters = self._detect_anomaly_clusters(entity_results, timeline)
            
            # Analyze temporal patterns
            temporal_patterns = self._analyze_temporal_patterns(timeline, relationships)
            
            # Find entity interactions
            entity_interactions = self._analyze_entity_interactions(entity_results, relationships, timeline)
            
            # Calculate overall confidence
            overall_confidence = self._calculate_overall_confidence(
                risk_correlations, behavioral_patterns, anomaly_clusters, temporal_patterns
            )
            
            # Update metrics
            self.metrics["patterns_detected"] += len(behavioral_patterns)
            self.metrics["anomaly_clusters_found"] += len(anomaly_clusters)
            self.metrics["high_risk_correlations"] += len([
                r for r in risk_correlations if r.get("correlation_strength", 0) > self.correlation_threshold
            ])
            
            # Create analysis result
            analysis = CrossEntityAnalysis(
                investigation_id=investigation_id,
                entity_interactions=entity_interactions,
                risk_correlations=risk_correlations,
                temporal_patterns=temporal_patterns,
                anomaly_clusters=anomaly_clusters,
                behavioral_insights=behavioral_patterns,
                overall_confidence=overall_confidence
            )
            
            self.logger.info(f"✅ Cross-entity analysis completed: {investigation_id}")
            return analysis
            
        except Exception as e:
            self.logger.error(f"❌ Cross-entity analysis failed {investigation_id}: {str(e)}")
            raise
    
    def _build_cross_entity_timeline(
        self,
        entity_results: Dict[str, List[InvestigationResult]],
        entities: List[Dict[str, str]]
    ) -> List[TimelineEvent]:
        """Build chronological timeline from all entity investigation results"""
        
        timeline_events = []
        entity_type_map = {e["entity_id"]: e["entity_type"] for e in entities}
        
        for entity_id, results in entity_results.items():
            entity_type = entity_type_map.get(entity_id, "unknown")
            
            for result in results:
                # Extract timestamps from agent findings
                timestamps = self._extract_timestamps_from_findings(result.findings)
                
                for timestamp in timestamps:
                    event = TimelineEvent(
                        timestamp=timestamp,
                        entity_id=entity_id,
                        entity_type=entity_type,
                        event_type=result.agent_type,
                        event_data={
                            "agent_type": result.agent_type,
                            "findings": result.findings,
                            "tool_results": result.tool_results
                        },
                        risk_score=result.risk_score,
                        confidence=result.confidence_score
                    )
                    timeline_events.append(event)
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: x.timestamp)
        
        return timeline_events
    
    def _extract_timestamps_from_findings(self, findings: Dict[str, Any]) -> List[datetime]:
        """Extract timestamps from agent findings"""
        
        timestamps = []
        current_time = datetime.now(timezone.utc)
        
        # Look for common timestamp fields
        timestamp_fields = [
            'timestamp', 'created_at', 'updated_at', 'occurred_at',
            'first_seen', 'last_seen', 'event_time'
        ]
        
        def extract_from_dict(data, parent_key=""):
            if isinstance(data, dict):
                for key, value in data.items():
                    if any(field in key.lower() for field in timestamp_fields):
                        parsed_time = self._parse_timestamp(value)
                        if parsed_time:
                            timestamps.append(parsed_time)
                    elif isinstance(value, (dict, list)):
                        extract_from_dict(value, key)
            elif isinstance(data, list):
                for item in data:
                    extract_from_dict(item)
        
        extract_from_dict(findings)
        
        # If no timestamps found, use current time as fallback
        if not timestamps:
            timestamps.append(current_time)
        
        return timestamps
    
    def _parse_timestamp(self, value: Any) -> Optional[datetime]:
        """Parse timestamp from various formats"""
        
        if isinstance(value, datetime):
            return value
        
        if isinstance(value, str):
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S.%fZ',
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        
        return None
    
    def _analyze_risk_correlations(
        self,
        entity_results: Dict[str, List[InvestigationResult]],
        relationships: List[EntityRelationship]
    ) -> List[Dict[str, Any]]:
        """Analyze risk score correlations between entities"""
        
        correlations = []
        
        # Calculate entity risk scores
        entity_risks = {}
        for entity_id, results in entity_results.items():
            if results:
                avg_risk = sum(r.risk_score for r in results) / len(results)
                entity_risks[entity_id] = avg_risk
        
        # Analyze correlations between related entities
        for relationship in relationships:
            source_id = relationship.source_entity_id
            target_id = relationship.target_entity_id
            
            if source_id in entity_risks and target_id in entity_risks:
                source_risk = entity_risks[source_id]
                target_risk = entity_risks[target_id]
                
                # Calculate correlation metrics
                risk_difference = abs(source_risk - target_risk)
                correlation_strength = 1.0 - risk_difference  # Higher when risks are similar
                
                # Determine correlation type
                if risk_difference < 0.2:
                    correlation_type = "strong_positive"
                elif risk_difference > 0.8:
                    correlation_type = "strong_negative"
                else:
                    correlation_type = "moderate"
                
                correlation = {
                    "source_entity": source_id,
                    "target_entity": target_id,
                    "relationship_type": relationship.relationship_type.value,
                    "source_risk": source_risk,
                    "target_risk": target_risk,
                    "correlation_strength": correlation_strength,
                    "correlation_type": correlation_type,
                    "relationship_strength": relationship.strength,
                    "analysis": self._generate_correlation_analysis(
                        source_risk, target_risk, correlation_strength, relationship
                    )
                }
                
                correlations.append(correlation)
        
        # Also analyze correlations between non-directly related entities
        entity_ids = list(entity_risks.keys())
        for i in range(len(entity_ids)):
            for j in range(i + 1, len(entity_ids)):
                entity1 = entity_ids[i]
                entity2 = entity_ids[j]
                
                # Skip if already analyzed through relationships
                if any(
                    (r.source_entity_id == entity1 and r.target_entity_id == entity2) or
                    (r.source_entity_id == entity2 and r.target_entity_id == entity1)
                    for r in relationships
                ):
                    continue
                
                risk1 = entity_risks[entity1]
                risk2 = entity_risks[entity2]
                risk_difference = abs(risk1 - risk2)
                correlation_strength = 1.0 - risk_difference
                
                # Only include significant correlations
                if correlation_strength > self.correlation_threshold:
                    correlation = {
                        "source_entity": entity1,
                        "target_entity": entity2,
                        "relationship_type": "indirect",
                        "source_risk": risk1,
                        "target_risk": risk2,
                        "correlation_strength": correlation_strength,
                        "correlation_type": "unexpected_similarity",
                        "relationship_strength": 0.5,  # Default for indirect
                        "analysis": f"Unexpected risk similarity between unrelated entities ({correlation_strength:.2f})"
                    }
                    
                    correlations.append(correlation)
        
        return correlations
    
    def _detect_behavioral_patterns(
        self,
        entity_results: Dict[str, List[InvestigationResult]],
        timeline: List[TimelineEvent]
    ) -> List[Dict[str, Any]]:
        """Detect behavioral patterns spanning multiple entities"""
        
        patterns = []
        
        # Group timeline events by agent type
        events_by_agent = defaultdict(list)
        for event in timeline:
            events_by_agent[event.event_type].append(event)
        
        # Analyze patterns within each agent type
        for agent_type, events in events_by_agent.items():
            if len(events) >= 2:  # Need multiple events for pattern
                agent_patterns = self._analyze_agent_behavioral_patterns(agent_type, events)
                patterns.extend(agent_patterns)
        
        # Look for cross-agent patterns
        cross_agent_patterns = self._detect_cross_agent_patterns(entity_results)
        patterns.extend(cross_agent_patterns)
        
        return patterns
    
    def _analyze_agent_behavioral_patterns(self, agent_type: str, events: List[TimelineEvent]) -> List[Dict[str, Any]]:
        """Analyze behavioral patterns within a specific agent type"""
        
        patterns = []
        
        # Cluster events by risk score similarity
        risk_clusters = self._cluster_events_by_risk(events)
        
        for cluster in risk_clusters:
            if len(cluster) >= 2:
                entities_involved = {event.entity_id for event in cluster}
                avg_risk = sum(event.risk_score for event in cluster) / len(cluster)
                
                # Calculate temporal clustering
                timestamps = [event.timestamp for event in cluster]
                temporal_span = max(timestamps) - min(timestamps)
                
                pattern = {
                    "pattern_type": f"{agent_type}_risk_clustering",
                    "agent_type": agent_type,
                    "entities_involved": list(entities_involved),
                    "pattern_strength": self._calculate_pattern_strength(cluster),
                    "average_risk": avg_risk,
                    "temporal_span_hours": temporal_span.total_seconds() / 3600,
                    "description": f"Similar {agent_type} risk patterns across {len(entities_involved)} entities",
                    "evidence": [self._extract_event_evidence(event) for event in cluster]
                }
                
                patterns.append(pattern)
        
        return patterns
    
    def _cluster_events_by_risk(self, events: List[TimelineEvent], threshold: float = 0.3) -> List[List[TimelineEvent]]:
        """Cluster events by risk score similarity"""
        
        if not events:
            return []
        
        # Sort events by risk score
        sorted_events = sorted(events, key=lambda x: x.risk_score)
        
        clusters = []
        current_cluster = [sorted_events[0]]
        
        for event in sorted_events[1:]:
            # Check if event is similar to current cluster
            cluster_avg_risk = sum(e.risk_score for e in current_cluster) / len(current_cluster)
            
            if abs(event.risk_score - cluster_avg_risk) <= threshold:
                current_cluster.append(event)
            else:
                # Start new cluster
                if len(current_cluster) > 1:
                    clusters.append(current_cluster)
                current_cluster = [event]
        
        # Add final cluster
        if len(current_cluster) > 1:
            clusters.append(current_cluster)
        
        return clusters
    
    def _detect_cross_agent_patterns(self, entity_results: Dict[str, List[InvestigationResult]]) -> List[Dict[str, Any]]:
        """Detect patterns that span multiple agent types"""
        
        patterns = []
        
        # Analyze risk consistency across agents for each entity
        for entity_id, results in entity_results.items():
            if len(results) >= 2:
                agent_risks = {result.agent_type: result.risk_score for result in results}
                
                # Check for risk consistency across agents
                risk_values = list(agent_risks.values())
                risk_std = statistics.stdev(risk_values) if len(risk_values) > 1 else 0
                
                if risk_std < 0.2:  # Low variance indicates consistency
                    pattern = {
                        "pattern_type": "cross_agent_consistency",
                        "entity_id": entity_id,
                        "entities_involved": [entity_id],
                        "pattern_strength": 1.0 - risk_std,
                        "agent_risks": agent_risks,
                        "risk_variance": risk_std,
                        "description": f"Consistent risk pattern across all agents for entity {entity_id}",
                        "evidence": [{"agent_type": k, "risk_score": v} for k, v in agent_risks.items()]
                    }
                    
                    patterns.append(pattern)
        
        return patterns
    
    def _detect_anomaly_clusters(
        self,
        entity_results: Dict[str, List[InvestigationResult]],
        timeline: List[TimelineEvent]
    ) -> List[Dict[str, Any]]:
        """Detect clusters of anomalies across multiple entities"""
        
        anomaly_clusters = []
        
        # Identify high-risk events (potential anomalies)
        high_risk_events = [event for event in timeline if event.risk_score > 0.7]
        
        if not high_risk_events:
            return []
        
        # Cluster high-risk events by temporal proximity
        temporal_clusters = self._cluster_events_by_time(high_risk_events)
        
        for cluster in temporal_clusters:
            if len(cluster) >= 2:
                entities_involved = {event.entity_id for event in cluster}
                
                # Calculate cluster metrics
                avg_risk = sum(event.risk_score for event in cluster) / len(cluster)
                timestamps = [event.timestamp for event in cluster]
                temporal_span = (min(timestamps), max(timestamps))
                
                anomaly_cluster = {
                    "cluster_type": "temporal_high_risk",
                    "entities_involved": list(entities_involved),
                    "cluster_strength": avg_risk,
                    "anomaly_count": len(cluster),
                    "temporal_span": {
                        "start": temporal_span[0].isoformat(),
                        "end": temporal_span[1].isoformat(),
                        "duration_minutes": (temporal_span[1] - temporal_span[0]).total_seconds() / 60
                    },
                    "risk_amplification": self._calculate_risk_amplification(cluster),
                    "description": f"Cluster of {len(cluster)} high-risk events across {len(entities_involved)} entities",
                    "anomalies": [self._extract_event_evidence(event) for event in cluster]
                }
                
                anomaly_clusters.append(anomaly_cluster)
        
        return anomaly_clusters
    
    def _cluster_events_by_time(self, events: List[TimelineEvent], window_minutes: int = 60) -> List[List[TimelineEvent]]:
        """Cluster events by temporal proximity"""
        
        if not events:
            return []
        
        # Sort events by timestamp
        sorted_events = sorted(events, key=lambda x: x.timestamp)
        
        clusters = []
        current_cluster = [sorted_events[0]]
        window_delta = timedelta(minutes=window_minutes)
        
        for event in sorted_events[1:]:
            # Check if event is within time window of current cluster
            cluster_latest = max(e.timestamp for e in current_cluster)
            
            if event.timestamp - cluster_latest <= window_delta:
                current_cluster.append(event)
            else:
                # Start new cluster
                if len(current_cluster) > 1:
                    clusters.append(current_cluster)
                current_cluster = [event]
        
        # Add final cluster
        if len(current_cluster) > 1:
            clusters.append(current_cluster)
        
        return clusters
    
    def _analyze_temporal_patterns(
        self,
        timeline: List[TimelineEvent],
        relationships: List[EntityRelationship]
    ) -> List[Dict[str, Any]]:
        """Analyze temporal patterns across entity timeline"""
        
        temporal_patterns = []
        
        # Analyze event sequences
        event_sequences = self._find_event_sequences(timeline)
        temporal_patterns.extend(event_sequences)
        
        # Analyze periodic patterns
        periodic_patterns = self._find_periodic_patterns(timeline)
        temporal_patterns.extend(periodic_patterns)
        
        # Analyze relationship-based temporal patterns
        relationship_patterns = self._analyze_relationship_temporal_patterns(timeline, relationships)
        temporal_patterns.extend(relationship_patterns)
        
        return temporal_patterns
    
    def _find_event_sequences(self, timeline: List[TimelineEvent]) -> List[Dict[str, Any]]:
        """Find sequential patterns in timeline events"""
        
        sequences = []
        
        # Group events by entity
        entity_events = defaultdict(list)
        for event in timeline:
            entity_events[event.entity_id].append(event)
        
        # Look for common sequences across entities
        for entity_id, events in entity_events.items():
            if len(events) >= 3:  # Need at least 3 events for sequence
                # Sort by timestamp
                sorted_events = sorted(events, key=lambda x: x.timestamp)
                
                # Analyze sequence patterns
                event_types = [event.event_type for event in sorted_events]
                risk_progression = [event.risk_score for event in sorted_events]
                
                # Check for risk escalation patterns
                if self._is_escalating_sequence(risk_progression):
                    sequence = {
                        "pattern_type": "risk_escalation_sequence",
                        "entity_id": entity_id,
                        "event_sequence": event_types,
                        "risk_progression": risk_progression,
                        "duration_minutes": (sorted_events[-1].timestamp - sorted_events[0].timestamp).total_seconds() / 60,
                        "description": f"Risk escalation sequence detected for entity {entity_id}",
                        "evidence": [self._extract_event_evidence(event) for event in sorted_events]
                    }
                    
                    sequences.append(sequence)
        
        return sequences
    
    def _is_escalating_sequence(self, risk_scores: List[float], threshold: float = 0.1) -> bool:
        """Check if risk scores show escalating pattern"""
        
        if len(risk_scores) < 3:
            return False
        
        # Check if trend is generally increasing
        increases = 0
        for i in range(1, len(risk_scores)):
            if risk_scores[i] > risk_scores[i-1] + threshold:
                increases += 1
        
        return increases >= len(risk_scores) // 2
    
    def _find_periodic_patterns(self, timeline: List[TimelineEvent]) -> List[Dict[str, Any]]:
        """Find periodic or recurring patterns in timeline"""
        
        # This is a simplified implementation
        # In a real system, you'd use more sophisticated time series analysis
        
        patterns = []
        
        # Group events by hour of day
        hourly_distribution = defaultdict(int)
        for event in timeline:
            hour = event.timestamp.hour
            hourly_distribution[hour] += 1
        
        # Find peak hours
        if hourly_distribution:
            max_count = max(hourly_distribution.values())
            peak_hours = [hour for hour, count in hourly_distribution.items() if count == max_count]
            
            if max_count >= 3 and len(peak_hours) <= 3:  # Significant clustering
                pattern = {
                    "pattern_type": "temporal_clustering",
                    "peak_hours": peak_hours,
                    "event_count": max_count,
                    "description": f"Event clustering detected at hours {peak_hours}",
                    "evidence": dict(hourly_distribution)
                }
                
                patterns.append(pattern)
        
        return patterns
    
    def _analyze_relationship_temporal_patterns(
        self,
        timeline: List[TimelineEvent],
        relationships: List[EntityRelationship]
    ) -> List[Dict[str, Any]]:
        """Analyze temporal patterns based on entity relationships"""
        
        patterns = []
        
        for relationship in relationships:
            source_events = [e for e in timeline if e.entity_id == relationship.source_entity_id]
            target_events = [e for e in timeline if e.entity_id == relationship.target_entity_id]
            
            if source_events and target_events:
                # Analyze temporal correlation between related entities
                correlation = self._calculate_temporal_correlation(source_events, target_events)
                
                if correlation > 0.7:
                    pattern = {
                        "pattern_type": "relationship_temporal_correlation",
                        "relationship_type": relationship.relationship_type.value,
                        "source_entity": relationship.source_entity_id,
                        "target_entity": relationship.target_entity_id,
                        "temporal_correlation": correlation,
                        "description": f"High temporal correlation between related entities",
                        "evidence": {
                            "source_event_count": len(source_events),
                            "target_event_count": len(target_events)
                        }
                    }
                    
                    patterns.append(pattern)
        
        return patterns
    
    def _calculate_temporal_correlation(self, events1: List[TimelineEvent], events2: List[TimelineEvent]) -> float:
        """Calculate temporal correlation between two event sequences"""
        
        # Simplified correlation based on event timing similarity
        # In a real implementation, you'd use more sophisticated correlation metrics
        
        if not events1 or not events2:
            return 0.0
        
        # Create hourly activity profiles
        hours1 = [event.timestamp.hour for event in events1]
        hours2 = [event.timestamp.hour for event in events2]
        
        # Calculate hour distribution similarity
        dist1 = Counter(hours1)
        dist2 = Counter(hours2)
        
        # Simple similarity metric
        common_hours = set(dist1.keys()) & set(dist2.keys())
        total_hours = set(dist1.keys()) | set(dist2.keys())
        
        if not total_hours:
            return 0.0
        
        return len(common_hours) / len(total_hours)
    
    def _analyze_entity_interactions(
        self,
        entity_results: Dict[str, List[InvestigationResult]],
        relationships: List[EntityRelationship],
        timeline: List[TimelineEvent]
    ) -> List[Dict[str, Any]]:
        """Analyze interactions between entities"""
        
        interactions = []
        
        for relationship in relationships:
            source_id = relationship.source_entity_id
            target_id = relationship.target_entity_id
            
            # Get results for both entities
            source_results = entity_results.get(source_id, [])
            target_results = entity_results.get(target_id, [])
            
            if source_results and target_results:
                interaction = {
                    "interaction_type": relationship.relationship_type.value,
                    "source_entity": source_id,
                    "target_entity": target_id,
                    "relationship_strength": relationship.strength,
                    "source_findings": len(source_results),
                    "target_findings": len(target_results),
                    "interaction_analysis": self._analyze_specific_interaction(
                        source_results, target_results, relationship
                    )
                }
                
                interactions.append(interaction)
        
        return interactions
    
    def _analyze_specific_interaction(
        self,
        source_results: List[InvestigationResult],
        target_results: List[InvestigationResult],
        relationship: EntityRelationship
    ) -> Dict[str, Any]:
        """Analyze specific interaction between two entities"""
        
        source_avg_risk = sum(r.risk_score for r in source_results) / len(source_results)
        target_avg_risk = sum(r.risk_score for r in target_results) / len(target_results)
        
        risk_differential = abs(source_avg_risk - target_avg_risk)
        
        analysis = {
            "source_risk": source_avg_risk,
            "target_risk": target_avg_risk,
            "risk_differential": risk_differential,
            "interaction_strength": relationship.strength,
            "analysis_summary": self._generate_interaction_summary(
                source_avg_risk, target_avg_risk, relationship
            )
        }
        
        return analysis
    
    def _generate_interaction_summary(
        self,
        source_risk: float,
        target_risk: float,
        relationship: EntityRelationship
    ) -> str:
        """Generate human-readable interaction summary"""
        
        risk_diff = abs(source_risk - target_risk)
        
        if risk_diff < 0.2:
            return f"Similar risk levels in {relationship.relationship_type.value} relationship suggest coordinated behavior"
        elif source_risk > target_risk + 0.3:
            return f"Source entity shows higher risk in {relationship.relationship_type.value} relationship"
        elif target_risk > source_risk + 0.3:
            return f"Target entity shows higher risk in {relationship.relationship_type.value} relationship"
        else:
            return f"Moderate risk differential in {relationship.relationship_type.value} relationship"
    
    def _calculate_overall_confidence(
        self,
        risk_correlations: List[Dict[str, Any]],
        behavioral_patterns: List[Dict[str, Any]],
        anomaly_clusters: List[Dict[str, Any]],
        temporal_patterns: List[Dict[str, Any]]
    ) -> float:
        """Calculate overall confidence in cross-entity analysis"""
        
        # Base confidence on quantity and quality of findings
        total_findings = len(risk_correlations) + len(behavioral_patterns) + len(anomaly_clusters) + len(temporal_patterns)
        
        if total_findings == 0:
            return 0.0
        
        # Weight different types of findings
        confidence_score = 0.0
        
        # Risk correlations contribute to confidence
        strong_correlations = len([r for r in risk_correlations if r.get("correlation_strength", 0) > 0.7])
        confidence_score += strong_correlations * 0.2
        
        # Behavioral patterns contribute significantly
        confidence_score += len(behavioral_patterns) * 0.25
        
        # Anomaly clusters are high-value findings
        confidence_score += len(anomaly_clusters) * 0.3
        
        # Temporal patterns add moderate confidence
        confidence_score += len(temporal_patterns) * 0.15
        
        # Normalize to 0-1 range
        return min(1.0, confidence_score / max(1, total_findings * 0.25))
    
    def _calculate_pattern_strength(self, events: List[TimelineEvent]) -> float:
        """Calculate strength of a behavioral pattern"""
        
        if len(events) < 2:
            return 0.0
        
        # Base strength on risk score similarity
        risk_scores = [event.risk_score for event in events]
        risk_std = statistics.stdev(risk_scores) if len(risk_scores) > 1 else 0
        
        # Lower standard deviation = higher pattern strength
        similarity_strength = 1.0 - min(1.0, risk_std)
        
        # Factor in number of entities
        entity_count = len({event.entity_id for event in events})
        count_factor = min(1.0, entity_count / 3)  # Normalize for up to 3 entities
        
        return (similarity_strength * 0.7) + (count_factor * 0.3)
    
    def _calculate_risk_amplification(self, events: List[TimelineEvent]) -> float:
        """Calculate risk amplification factor for anomaly cluster"""
        
        if not events:
            return 1.0
        
        # Calculate average risk
        avg_risk = sum(event.risk_score for event in events) / len(events)
        
        # Number of entities involved
        entity_count = len({event.entity_id for event in events})
        
        # Amplification increases with risk level and entity count
        base_amplification = avg_risk * 1.5  # Base multiplier
        entity_amplification = 1 + (entity_count - 1) * 0.2  # Additional per entity
        
        return base_amplification * entity_amplification
    
    def _extract_event_evidence(self, event: TimelineEvent) -> Dict[str, Any]:
        """Extract evidence from timeline event"""
        
        return {
            "timestamp": event.timestamp.isoformat(),
            "entity_id": event.entity_id,
            "entity_type": event.entity_type,
            "event_type": event.event_type,
            "risk_score": event.risk_score,
            "confidence": event.confidence,
            "key_findings": self._extract_key_findings(event.event_data)
        }
    
    def _extract_key_findings(self, event_data: Dict[str, Any]) -> List[str]:
        """Extract key findings from event data"""
        
        key_findings = []
        
        # Look for high-value information in findings
        findings = event_data.get("findings", {})
        
        if isinstance(findings, dict):
            for key, value in findings.items():
                if any(keyword in key.lower() for keyword in ["risk", "anomaly", "suspicious", "alert"]):
                    key_findings.append(f"{key}: {str(value)[:100]}")
        
        return key_findings[:3]  # Limit to top 3 findings
    
    def _generate_correlation_analysis(
        self,
        source_risk: float,
        target_risk: float,
        correlation_strength: float,
        relationship: EntityRelationship
    ) -> str:
        """Generate analysis text for risk correlation"""
        
        if correlation_strength > 0.8:
            return f"Strong risk correlation ({correlation_strength:.2f}) suggests coordinated activity"
        elif correlation_strength > 0.6:
            return f"Moderate risk correlation ({correlation_strength:.2f}) in {relationship.relationship_type.value}"
        elif correlation_strength < 0.3:
            return f"Risk divergence ({correlation_strength:.2f}) may indicate independent behavior"
        else:
            return f"Weak correlation ({correlation_strength:.2f}) requires additional investigation"
    
    def get_analyzer_metrics(self) -> Dict[str, Any]:
        """Get analyzer performance metrics"""
        return {
            **self.metrics,
            "average_patterns_per_analysis": (
                self.metrics["patterns_detected"] / self.metrics["total_analyses"]
                if self.metrics["total_analyses"] > 0 else 0.0
            ),
            "high_risk_correlation_rate": (
                self.metrics["high_risk_correlations"] / self.metrics["total_analyses"]
                if self.metrics["total_analyses"] > 0 else 0.0
            )
        }


# Global analyzer instance
_analyzer: Optional[CrossEntityAnalyzer] = None


def get_cross_entity_analyzer() -> CrossEntityAnalyzer:
    """Get the global cross-entity analyzer instance"""
    global _analyzer
    
    if _analyzer is None:
        _analyzer = CrossEntityAnalyzer()
    
    return _analyzer