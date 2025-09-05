"""
Entity Manager

Comprehensive entity management system for multi-entity fraud investigations,
supporting complex entity relationships and cross-entity analysis.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
from collections import defaultdict
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EntityType(Enum):
    """Supported entity types for investigations"""
    
    # Core entities (from existing system)
    DEVICE = "device"
    LOCATION = "location" 
    NETWORK = "network"
    USER = "user"
    
    # Extended entities for multi-entity support
    ACCOUNT = "account"
    TRANSACTION = "transaction"
    SESSION = "session"
    BEHAVIOR_PATTERN = "behavior_pattern"
    IP_ADDRESS = "ip_address"
    PHONE_NUMBER = "phone_number"
    EMAIL = "email"
    PAYMENT_METHOD = "payment_method"
    MERCHANT = "merchant"
    GEOLOCATION = "geolocation"
    BROWSER = "browser"
    APPLICATION = "application"
    API_KEY = "api_key"
    CERTIFICATE = "certificate"
    DOMAIN = "domain"
    URL = "url"
    FILE_HASH = "file_hash"
    BIOMETRIC = "biometric"
    
    # Behavioral entities
    LOGIN_PATTERN = "login_pattern"
    SPENDING_PATTERN = "spending_pattern"
    ACCESS_PATTERN = "access_pattern"
    COMMUNICATION_PATTERN = "communication_pattern"
    
    # Risk entities
    RISK_INDICATOR = "risk_indicator"
    ANOMALY = "anomaly"
    THREAT = "threat"
    VULNERABILITY = "vulnerability"
    
    # Meta entities
    INVESTIGATION = "investigation"
    CASE = "case"
    ALERT = "alert"
    RULE = "rule"
    
    # Transaction-specific entities (from CSV data - Phase 1 Enhancement)
    # Temporal entities  
    TIMESTAMP = "timestamp"
    RECORD_CREATED = "record_created"      # TABLE_RECORD_CREATED_AT
    RECORD_UPDATED = "record_updated"      # TABLE_RECORD_UPDATED_AT
    TX_DATETIME = "tx_datetime"            # TX_DATETIME
    TX_RECEIVED = "tx_received"            # TX_RECEIVED_DATETIME
    
    # Transaction identifiers
    ORIGINAL_TX_ID = "original_tx_id"      # ORIGINAL_TX_ID
    TX_ID_KEY = "tx_id_key"               # TX_ID_KEY
    SURROGATE_APP_TX_ID = "surrogate_app_tx_id"  # SURROGATE_APP_TX_ID
    NSURE_UNIQUE_TX_ID = "nsure_unique_tx_id"    # NSURE_UNIQUE_TX_ID
    CLIENT_REQUEST_ID = "client_request_id"       # CLIENT_REQUEST_ID
    
    # Business entities
    STORE_ID = "store_id"                  # STORE_ID
    APP_ID = "app_id"                      # APP_ID  
    EVENT_TYPE = "event_type"              # EVENT_TYPE
    AUTHORIZATION_STAGE = "authorization_stage"  # AUTHORIZATION_STAGE
    
    # User identity entities
    EMAIL_NORMALIZED = "email_normalized"  # EMAIL_NORMALIZED
    FIRST_NAME = "first_name"             # FIRST_NAME
    UNIQUE_USER_ID = "unique_user_id"     # UNIQUE_USER_ID
    
    # Processing status entities
    TX_UPLOADED_TO_SNOWFLAKE = "tx_uploaded_to_snowflake"  # TX_UPLOADED_TO_SNOWFLAKE
    IS_SENT_FOR_NSURE_REVIEW = "is_sent_for_nsure_review"  # IS_SENT_FOR_NSURE_REVIEW


@dataclass
class Entity:
    """Entity representation with comprehensive metadata"""
    
    entity_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: EntityType = EntityType.USER
    
    # Core properties
    name: str = ""
    description: str = ""
    status: str = "active"  # active, inactive, suspicious, blocked, etc.
    
    # Entity data
    attributes: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Temporal information
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    
    # Investigation context
    investigations: Set[str] = field(default_factory=set)
    risk_score: float = 0.0
    confidence_score: float = 1.0
    
    # Relationship tracking
    related_entities: Set[str] = field(default_factory=set)
    parent_entities: Set[str] = field(default_factory=set)
    child_entities: Set[str] = field(default_factory=set)
    
    # Tags and classification
    tags: Set[str] = field(default_factory=set)
    categories: Set[str] = field(default_factory=set)
    
    def add_attribute(self, key: str, value: Any) -> None:
        """Add or update entity attribute"""
        self.attributes[key] = value
        self.updated_at = datetime.now()
    
    def get_attribute(self, key: str, default: Any = None) -> Any:
        """Get entity attribute"""
        return self.attributes.get(key, default)
    
    def add_tag(self, tag: str) -> None:
        """Add tag to entity"""
        self.tags.add(tag.lower())
    
    def has_tag(self, tag: str) -> bool:
        """Check if entity has tag"""
        return tag.lower() in self.tags
    
    def update_risk_score(self, new_score: float, confidence: float = 1.0) -> None:
        """Update entity risk score with confidence weighting"""
        if confidence > 0:
            # Weighted average with confidence
            total_confidence = self.confidence_score + confidence
            self.risk_score = (self.risk_score * self.confidence_score + new_score * confidence) / total_confidence
            self.confidence_score = min(1.0, total_confidence)
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary"""
        return {
            'entity_id': self.entity_id,
            'entity_type': self.entity_type.value,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'attributes': self.attributes,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'first_seen': self.first_seen.isoformat() if self.first_seen else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'investigations': list(self.investigations),
            'risk_score': self.risk_score,
            'confidence_score': self.confidence_score,
            'related_entities': list(self.related_entities),
            'tags': list(self.tags),
            'categories': list(self.categories)
        }


@dataclass
class EntityRelationship:
    """Relationship between entities"""
    
    relationship_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Relationship entities
    source_entity_id: str = ""
    target_entity_id: str = ""
    
    # Relationship properties
    relationship_type: str = "related"  # related, contains, uses, accesses, etc.
    relationship_strength: float = 1.0  # 0.0 to 1.0
    bidirectional: bool = False
    
    # Temporal information
    created_at: datetime = field(default_factory=datetime.now)
    first_observed: Optional[datetime] = None
    last_observed: Optional[datetime] = None
    observation_count: int = 1
    
    # Relationship metadata
    attributes: Dict[str, Any] = field(default_factory=dict)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    
    # Investigation context
    investigations: Set[str] = field(default_factory=set)
    confidence_score: float = 1.0
    
    def add_observation(self, timestamp: Optional[datetime] = None) -> None:
        """Add observation of this relationship"""
        timestamp = timestamp or datetime.now()
        
        if self.first_observed is None:
            self.first_observed = timestamp
        
        self.last_observed = timestamp
        self.observation_count += 1
    
    def add_evidence(self, evidence: Dict[str, Any]) -> None:
        """Add evidence supporting this relationship"""
        self.evidence.append({
            **evidence,
            'timestamp': datetime.now().isoformat()
        })
    
    def calculate_recency_score(self) -> float:
        """Calculate recency score based on last observation"""
        if not self.last_observed:
            return 0.0
        
        days_since_last = (datetime.now() - self.last_observed).days
        
        # Exponential decay - more recent = higher score
        return max(0.1, 1.0 * (0.9 ** days_since_last))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert relationship to dictionary"""
        return {
            'relationship_id': self.relationship_id,
            'source_entity_id': self.source_entity_id,
            'target_entity_id': self.target_entity_id,
            'relationship_type': self.relationship_type,
            'relationship_strength': self.relationship_strength,
            'bidirectional': self.bidirectional,
            'created_at': self.created_at.isoformat(),
            'first_observed': self.first_observed.isoformat() if self.first_observed else None,
            'last_observed': self.last_observed.isoformat() if self.last_observed else None,
            'observation_count': self.observation_count,
            'attributes': self.attributes,
            'evidence': self.evidence,
            'investigations': list(self.investigations),
            'confidence_score': self.confidence_score
        }


class EntityGraph:
    """Graph representation of entities and relationships"""
    
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.relationships: Dict[str, EntityRelationship] = {}
        
        # Graph indices for efficient traversal
        self.outgoing_relationships: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> relationship_ids
        self.incoming_relationships: Dict[str, Set[str]] = defaultdict(set)  # entity_id -> relationship_ids
        self.entity_type_index: Dict[EntityType, Set[str]] = defaultdict(set)  # type -> entity_ids
    
    def add_entity(self, entity: Entity) -> None:
        """Add entity to graph"""
        self.entities[entity.entity_id] = entity
        self.entity_type_index[entity.entity_type].add(entity.entity_id)
    
    def add_relationship(self, relationship: EntityRelationship) -> None:
        """Add relationship to graph"""
        self.relationships[relationship.relationship_id] = relationship
        
        # Update indices
        self.outgoing_relationships[relationship.source_entity_id].add(relationship.relationship_id)
        self.incoming_relationships[relationship.target_entity_id].add(relationship.relationship_id)
        
        # Update bidirectional relationships
        if relationship.bidirectional:
            self.outgoing_relationships[relationship.target_entity_id].add(relationship.relationship_id)
            self.incoming_relationships[relationship.source_entity_id].add(relationship.relationship_id)
        
        # Update entity relationship tracking
        if relationship.source_entity_id in self.entities:
            self.entities[relationship.source_entity_id].related_entities.add(relationship.target_entity_id)
        
        if relationship.target_entity_id in self.entities:
            self.entities[relationship.target_entity_id].related_entities.add(relationship.source_entity_id)
    
    def get_neighbors(self, entity_id: str, relationship_types: Optional[Set[str]] = None) -> List[str]:
        """Get neighboring entities"""
        neighbors = set()
        
        # Get outgoing relationships
        for rel_id in self.outgoing_relationships.get(entity_id, set()):
            relationship = self.relationships.get(rel_id)
            if relationship and (not relationship_types or relationship.relationship_type in relationship_types):
                neighbors.add(relationship.target_entity_id)
        
        # Get incoming relationships
        for rel_id in self.incoming_relationships.get(entity_id, set()):
            relationship = self.relationships.get(rel_id)
            if relationship and (not relationship_types or relationship.relationship_type in relationship_types):
                neighbors.add(relationship.source_entity_id)
        
        return list(neighbors)
    
    def get_subgraph(self, entity_ids: Set[str], max_depth: int = 2) -> 'EntityGraph':
        """Extract subgraph around specified entities"""
        subgraph = EntityGraph()
        visited = set()
        queue = [(entity_id, 0) for entity_id in entity_ids]
        
        while queue:
            current_id, depth = queue.pop(0)
            
            if current_id in visited or depth > max_depth:
                continue
            
            visited.add(current_id)
            
            # Add entity to subgraph
            if current_id in self.entities:
                subgraph.add_entity(self.entities[current_id])
            
            # Add relationships and neighbors
            for rel_id in self.outgoing_relationships.get(current_id, set()):
                relationship = self.relationships[rel_id]
                subgraph.add_relationship(relationship)
                
                # Add neighbor to queue for next depth level
                if depth < max_depth:
                    queue.append((relationship.target_entity_id, depth + 1))
        
        return subgraph
    
    def find_paths(self, source_id: str, target_id: str, max_depth: int = 3) -> List[List[str]]:
        """Find paths between two entities"""
        paths = []
        
        def dfs(current_id: str, target_id: str, path: List[str], visited: Set[str], depth: int):
            if depth > max_depth:
                return
            
            if current_id == target_id:
                paths.append(path + [current_id])
                return
            
            if current_id in visited:
                return
            
            visited.add(current_id)
            
            for neighbor_id in self.get_neighbors(current_id):
                dfs(neighbor_id, target_id, path + [current_id], visited.copy(), depth + 1)
        
        dfs(source_id, target_id, [], set(), 0)
        return paths
    
    def get_connected_components(self) -> List[Set[str]]:
        """Find connected components in the graph"""
        components = []
        visited = set()
        
        for entity_id in self.entities.keys():
            if entity_id not in visited:
                component = set()
                queue = [entity_id]
                
                while queue:
                    current_id = queue.pop(0)
                    if current_id in visited:
                        continue
                    
                    visited.add(current_id)
                    component.add(current_id)
                    
                    # Add neighbors to queue
                    for neighbor_id in self.get_neighbors(current_id):
                        if neighbor_id not in visited:
                            queue.append(neighbor_id)
                
                components.append(component)
        
        return components


class EntityManager:
    """
    Comprehensive entity management system for multi-entity investigations.
    
    Features:
    - Entity lifecycle management
    - Relationship tracking and graph analysis
    - Multi-entity investigation coordination
    - Entity clustering and pattern detection
    - Performance optimization with indexing
    - Temporal analysis and evolution tracking
    """
    
    def __init__(self):
        self.entity_graph = EntityGraph()
        
        # Investigation tracking
        self.investigation_entities: Dict[str, Set[str]] = defaultdict(set)  # investigation_id -> entity_ids
        
        # Performance indices
        self.risk_score_index: Dict[float, Set[str]] = defaultdict(set)  # risk_score -> entity_ids
        self.tag_index: Dict[str, Set[str]] = defaultdict(set)  # tag -> entity_ids
        
        # Statistics
        self.stats = {
            'entities_created': 0,
            'relationships_created': 0,
            'investigations_tracked': 0,
            'start_time': datetime.now()
        }
        
        self.logger = logging.getLogger(f"{__name__}.entity_manager")
    
    async def create_entity(
        self,
        entity_type: EntityType,
        name: str = "",
        attributes: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[str] = None
    ) -> str:
        """Create new entity"""
        
        try:
            entity = Entity(
                entity_type=entity_type,
                name=name,
                attributes=attributes or {}
            )
            
            if investigation_id:
                entity.investigations.add(investigation_id)
                self.investigation_entities[investigation_id].add(entity.entity_id)
            
            # Add to graph
            self.entity_graph.add_entity(entity)
            
            # Update indices
            self._update_entity_indices(entity)
            
            # Update statistics
            self.stats['entities_created'] += 1
            
            self.logger.info(f"Created entity {entity.entity_id} of type {entity_type.value}")
            return entity.entity_id
            
        except Exception as e:
            self.logger.error(f"Failed to create entity: {str(e)}")
            raise
    
    async def create_relationship(
        self,
        source_entity_id: str,
        target_entity_id: str,
        relationship_type: str = "related",
        strength: float = 1.0,
        bidirectional: bool = False,
        evidence: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[str] = None
    ) -> str:
        """Create relationship between entities"""
        
        try:
            relationship = EntityRelationship(
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                relationship_type=relationship_type,
                relationship_strength=strength,
                bidirectional=bidirectional
            )
            
            if evidence:
                relationship.add_evidence(evidence)
            
            if investigation_id:
                relationship.investigations.add(investigation_id)
            
            # Add to graph
            self.entity_graph.add_relationship(relationship)
            
            # Update statistics
            self.stats['relationships_created'] += 1
            
            self.logger.info(f"Created {relationship_type} relationship between {source_entity_id} and {target_entity_id}")
            return relationship.relationship_id
            
        except Exception as e:
            self.logger.error(f"Failed to create relationship: {str(e)}")
            raise
    
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Get entity by ID"""
        return self.entity_graph.entities.get(entity_id)
    
    def get_entities_by_type(self, entity_type: EntityType) -> List[Entity]:
        """Get all entities of specified type"""
        entity_ids = self.entity_graph.entity_type_index.get(entity_type, set())
        return [self.entity_graph.entities[eid] for eid in entity_ids]
    
    def get_entities_by_investigation(self, investigation_id: str) -> List[Entity]:
        """Get all entities for investigation"""
        entity_ids = self.investigation_entities.get(investigation_id, set())
        return [self.entity_graph.entities[eid] for eid in entity_ids if eid in self.entity_graph.entities]
    
    def get_high_risk_entities(self, threshold: float = 0.7) -> List[Entity]:
        """Get entities with high risk scores"""
        high_risk = []
        
        for entity in self.entity_graph.entities.values():
            if entity.risk_score >= threshold:
                high_risk.append(entity)
        
        # Sort by risk score (highest first)
        high_risk.sort(key=lambda e: e.risk_score, reverse=True)
        return high_risk
    
    def get_related_entities(
        self,
        entity_id: str,
        max_depth: int = 2,
        relationship_types: Optional[Set[str]] = None
    ) -> List[Entity]:
        """Get entities related to specified entity"""
        
        subgraph = self.entity_graph.get_subgraph({entity_id}, max_depth)
        
        # Filter by relationship types if specified
        if relationship_types:
            filtered_entities = []
            for eid, entity in subgraph.entities.items():
                if eid == entity_id:
                    continue  # Skip the source entity
                
                # Check if connected through specified relationship types
                neighbors = self.entity_graph.get_neighbors(entity_id, relationship_types)
                if eid in neighbors or any(eid in self.entity_graph.get_neighbors(nid, relationship_types) for nid in neighbors):
                    filtered_entities.append(entity)
            
            return filtered_entities
        else:
            return [entity for eid, entity in subgraph.entities.items() if eid != entity_id]
    
    def find_entity_clusters(self, min_cluster_size: int = 3) -> List[Set[str]]:
        """Find clusters of related entities"""
        
        components = self.entity_graph.get_connected_components()
        
        # Filter by minimum cluster size
        clusters = [component for component in components if len(component) >= min_cluster_size]
        
        return clusters
    
    def analyze_entity_network(self, entity_id: str) -> Dict[str, Any]:
        """Analyze entity's network characteristics"""
        
        if entity_id not in self.entity_graph.entities:
            return {}
        
        entity = self.entity_graph.entities[entity_id]
        neighbors = self.entity_graph.get_neighbors(entity_id)
        
        # Calculate network metrics
        degree = len(neighbors)
        
        # Get relationship types
        relationship_types = defaultdict(int)
        for rel_id in self.entity_graph.outgoing_relationships.get(entity_id, set()):
            relationship = self.entity_graph.relationships[rel_id]
            relationship_types[relationship.relationship_type] += 1
        
        # Calculate risk propagation
        neighbor_risk_scores = [
            self.entity_graph.entities[nid].risk_score 
            for nid in neighbors 
            if nid in self.entity_graph.entities
        ]
        
        avg_neighbor_risk = sum(neighbor_risk_scores) / len(neighbor_risk_scores) if neighbor_risk_scores else 0.0
        
        return {
            'entity_id': entity_id,
            'network_degree': degree,
            'relationship_types': dict(relationship_types),
            'neighbor_count': len(neighbors),
            'avg_neighbor_risk_score': avg_neighbor_risk,
            'risk_divergence': abs(entity.risk_score - avg_neighbor_risk),
            'connected_entity_types': [
                self.entity_graph.entities[nid].entity_type.value 
                for nid in neighbors 
                if nid in self.entity_graph.entities
            ]
        }
    
    def _update_entity_indices(self, entity: Entity) -> None:
        """Update entity search indices"""
        
        # Update tag index
        for tag in entity.tags:
            self.tag_index[tag].add(entity.entity_id)
        
        # Update risk score index (bucketed)
        risk_bucket = round(entity.risk_score, 1)
        self.risk_score_index[risk_bucket].add(entity.entity_id)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get entity manager statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        # Calculate entity type distribution
        type_distribution = {
            entity_type.value: len(entity_ids) 
            for entity_type, entity_ids in self.entity_graph.entity_type_index.items()
        }
        
        # Calculate relationship type distribution
        relationship_types = defaultdict(int)
        for relationship in self.entity_graph.relationships.values():
            relationship_types[relationship.relationship_type] += 1
        
        return {
            'manager_status': {
                'uptime_seconds': uptime,
                'entities_count': len(self.entity_graph.entities),
                'relationships_count': len(self.entity_graph.relationships),
                'investigations_tracked': len(self.investigation_entities)
            },
            'creation_stats': {
                'entities_created': self.stats['entities_created'],
                'relationships_created': self.stats['relationships_created'],
                'investigations_tracked': self.stats['investigations_tracked']
            },
            'entity_distribution': type_distribution,
            'relationship_distribution': dict(relationship_types),
            'graph_metrics': {
                'connected_components': len(self.entity_graph.get_connected_components()),
                'avg_entity_degree': self._calculate_average_degree(),
                'total_tags': len(self.tag_index)
            }
        }
    
    def _calculate_average_degree(self) -> float:
        """Calculate average entity degree in graph"""
        if not self.entity_graph.entities:
            return 0.0
        
        total_degree = sum(
            len(self.entity_graph.get_neighbors(entity_id)) 
            for entity_id in self.entity_graph.entities.keys()
        )
        
        return total_degree / len(self.entity_graph.entities)


# Global entity manager instance
_entity_manager: Optional[EntityManager] = None


def get_entity_manager() -> EntityManager:
    """Get the global entity manager instance"""
    global _entity_manager
    
    if _entity_manager is None:
        _entity_manager = EntityManager()
    
    return _entity_manager