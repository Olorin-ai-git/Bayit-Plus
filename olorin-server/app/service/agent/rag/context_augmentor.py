"""
Context Augmentor for RAG System

Responsible for investigation-specific knowledge retrieval, context aggregation,
domain-aware knowledge filtering, and context injection into agent prompts.
"""

import asyncio
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from .knowledge_base import DocumentChunk, KnowledgeBase
from .rag_orchestrator import RAGOrchestrator, RAGRequest
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ContextRelevanceLevel(Enum):
    """Context relevance levels for filtering"""
    CRITICAL = "critical"      # Must-have context
    HIGH = "high"             # Very relevant
    MEDIUM = "medium"         # Moderately relevant
    LOW = "low"              # Possibly relevant
    IRRELEVANT = "irrelevant" # Not relevant


@dataclass
class KnowledgeContext:
    """Aggregated knowledge context for investigation"""
    
    investigation_id: str
    domain: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    
    # Retrieved knowledge
    critical_knowledge: List[DocumentChunk] = field(default_factory=list)
    supporting_knowledge: List[DocumentChunk] = field(default_factory=list)
    background_knowledge: List[DocumentChunk] = field(default_factory=list)
    
    # Context metadata
    retrieval_timestamp: datetime = field(default_factory=datetime.now)
    total_chunks: int = 0
    relevance_scores: Dict[str, float] = field(default_factory=dict)
    
    # Query information
    primary_query: str = ""
    domain_queries: List[str] = field(default_factory=list)
    
    # Filtering metadata
    applied_filters: Dict[str, Any] = field(default_factory=dict)
    knowledge_sources: Set[str] = field(default_factory=set)


@dataclass
class ContextAugmentationConfig:
    """Configuration for context augmentation"""
    
    # Retrieval limits
    max_critical_chunks: int = 5
    max_supporting_chunks: int = 10
    max_background_chunks: int = 15
    
    # Relevance thresholds
    critical_threshold: float = 0.9
    supporting_threshold: float = 0.7
    background_threshold: float = 0.5
    
    # Domain-specific settings
    enable_domain_filtering: bool = True
    enable_entity_type_filtering: bool = True
    enable_temporal_filtering: bool = True
    
    # Context injection settings
    include_source_attribution: bool = True
    include_confidence_scores: bool = True
    max_context_length: int = 4000  # Maximum characters in injected context


class ContextAugmentor:
    """
    Context Augmentor for RAG-Enhanced Investigation
    
    Capabilities:
    - Investigation-specific knowledge retrieval
    - Multi-layer context aggregation (critical/supporting/background)
    - Domain-aware knowledge filtering
    - Dynamic context injection into agent prompts
    - Knowledge relevance scoring and ranking
    - Cross-domain knowledge correlation
    """
    
    def __init__(
        self, 
        rag_orchestrator: RAGOrchestrator,
        config: Optional[ContextAugmentationConfig] = None
    ):
        """Initialize context augmentor"""
        self.rag_orchestrator = rag_orchestrator
        self.config = config or ContextAugmentationConfig()
        
        # Access knowledge base directly for advanced operations
        self.knowledge_base = rag_orchestrator.knowledge_base
        
        # Context cache for performance
        self.context_cache: Dict[str, tuple[KnowledgeContext, datetime]] = {}
        self.cache_ttl_seconds = 300  # 5 minutes
        
        self.logger = get_bridge_logger(f"{__name__}.context_augmentor")
        
    async def augment_investigation_context(
        self,
        investigation_context: AutonomousInvestigationContext,
        domain: str,
        specific_objectives: Optional[List[str]] = None
    ) -> KnowledgeContext:
        """
        Augment investigation context with relevant knowledge
        
        Args:
            investigation_context: Base investigation context
            domain: Investigation domain (network, device, location, etc.)
            specific_objectives: Domain-specific investigation objectives
            
        Returns:
            Aggregated knowledge context for the investigation
        """
        try:
            self.logger.info(f"Augmenting {domain} context for investigation {investigation_context.investigation_id}")
            
            # Check cache first
            cache_key = self._create_context_cache_key(
                investigation_context.investigation_id, 
                domain, 
                specific_objectives
            )
            
            cached_context = self._get_cached_context(cache_key)
            if cached_context:
                self.logger.debug(f"Using cached context for {domain} domain")
                return cached_context
            
            # Generate domain-specific queries
            queries = await self._generate_domain_queries(
                investigation_context, domain, specific_objectives
            )
            
            # Retrieve knowledge chunks for all queries
            all_chunks = []
            for query in queries:
                chunks = await self._retrieve_domain_knowledge(
                    query, investigation_context, domain
                )
                all_chunks.extend(chunks)
            
            # Remove duplicates while preserving order
            unique_chunks = []
            seen_ids = set()
            for chunk in all_chunks:
                if chunk.chunk_id not in seen_ids:
                    unique_chunks.append(chunk)
                    seen_ids.add(chunk.chunk_id)
            
            # Filter and categorize knowledge by relevance
            knowledge_context = await self._categorize_knowledge_by_relevance(
                unique_chunks, investigation_context, domain, queries
            )
            
            # Apply domain-specific filtering
            knowledge_context = await self._apply_domain_filters(
                knowledge_context, investigation_context, domain
            )
            
            # Cache the result
            self._cache_context(cache_key, knowledge_context)
            
            self.logger.info(
                f"Context augmentation complete for {domain}: "
                f"critical={len(knowledge_context.critical_knowledge)}, "
                f"supporting={len(knowledge_context.supporting_knowledge)}, "
                f"background={len(knowledge_context.background_knowledge)}"
            )
            
            return knowledge_context
            
        except Exception as e:
            self.logger.error(f"Context augmentation failed for {domain}: {str(e)}")
            
            # Return empty context on failure
            return KnowledgeContext(
                investigation_id=investigation_context.investigation_id,
                domain=domain,
                entity_id=investigation_context.entity_id,
                entity_type=investigation_context.entity_type.value if investigation_context.entity_type else None
            )
    
    async def inject_context_into_prompt(
        self,
        base_prompt: str,
        knowledge_context: KnowledgeContext,
        include_all_levels: bool = True
    ) -> str:
        """
        Inject knowledge context into agent prompt
        
        Args:
            base_prompt: Original agent prompt
            knowledge_context: Aggregated knowledge context
            include_all_levels: Whether to include all relevance levels
            
        Returns:
            Enhanced prompt with injected knowledge context
        """
        try:
            if not knowledge_context.total_chunks:
                self.logger.debug("No knowledge context to inject")
                return base_prompt
            
            # Build context sections
            context_sections = []
            
            # Critical knowledge (always included)
            if knowledge_context.critical_knowledge:
                critical_section = self._format_knowledge_section(
                    "CRITICAL KNOWLEDGE", 
                    knowledge_context.critical_knowledge,
                    include_confidence=self.config.include_confidence_scores
                )
                context_sections.append(critical_section)
            
            # Supporting knowledge
            if include_all_levels and knowledge_context.supporting_knowledge:
                supporting_section = self._format_knowledge_section(
                    "SUPPORTING KNOWLEDGE",
                    knowledge_context.supporting_knowledge,
                    include_confidence=self.config.include_confidence_scores
                )
                context_sections.append(supporting_section)
            
            # Background knowledge (only if space permits)
            if (include_all_levels and knowledge_context.background_knowledge and 
                len("\n\n".join(context_sections)) < self.config.max_context_length // 2):
                background_section = self._format_knowledge_section(
                    "BACKGROUND KNOWLEDGE",
                    knowledge_context.background_knowledge,
                    include_confidence=self.config.include_confidence_scores,
                    limit=5  # Limit background knowledge
                )
                context_sections.append(background_section)
            
            if not context_sections:
                return base_prompt
            
            # Combine context sections
            full_context = "\n\n".join(context_sections)
            
            # Truncate if too long
            if len(full_context) > self.config.max_context_length:
                full_context = full_context[:self.config.max_context_length - 100] + "\n\n[Context truncated for length...]"
            
            # Inject context into prompt
            context_header = f"""
=== INVESTIGATION KNOWLEDGE CONTEXT ===
Investigation ID: {knowledge_context.investigation_id}
Domain: {knowledge_context.domain.upper()}
Knowledge Sources: {', '.join(sorted(knowledge_context.knowledge_sources))}
Retrieved: {knowledge_context.retrieval_timestamp.strftime('%H:%M:%S UTC')}

{full_context}
=== END KNOWLEDGE CONTEXT ===

"""
            
            # Insert context before the main prompt
            enhanced_prompt = context_header + base_prompt
            
            # Add context usage instructions
            context_instructions = """
IMPORTANT: Use the provided knowledge context to enhance your analysis. 
- CRITICAL knowledge should strongly influence your decisions
- SUPPORTING knowledge provides additional validation and insights  
- BACKGROUND knowledge offers broader context when relevant
- Always validate findings against the provided knowledge
- Reference specific knowledge sources when making conclusions
"""
            
            enhanced_prompt += context_instructions
            
            self.logger.debug(f"Injected {len(context_sections)} context sections into prompt")
            
            return enhanced_prompt
            
        except Exception as e:
            self.logger.error(f"Context injection failed: {str(e)}")
            return base_prompt  # Return original prompt on failure
    
    async def _generate_domain_queries(
        self,
        investigation_context: AutonomousInvestigationContext,
        domain: str,
        specific_objectives: Optional[List[str]] = None
    ) -> List[str]:
        """Generate domain-specific knowledge retrieval queries"""
        
        queries = []
        
        # Primary entity query
        if investigation_context.entity_id:
            primary_query = f"{domain} analysis for {investigation_context.entity_type.value if investigation_context.entity_type else 'entity'} {investigation_context.entity_id}"
            queries.append(primary_query)
        
        # Domain-specific pattern queries
        domain_patterns = {
            "network": [
                "network fraud patterns",
                "IP address reputation analysis",
                "network traffic anomaly detection",
                "VPN and proxy detection methods",
                "network-based fraud indicators"
            ],
            "device": [
                "device fingerprinting techniques", 
                "device spoofing detection",
                "mobile device fraud patterns",
                "browser fingerprint analysis",
                "device behavioral analysis"
            ],
            "location": [
                "geographic fraud patterns",
                "impossible travel detection",
                "location spoofing methods",
                "travel behavior analysis",
                "geographic risk assessment"
            ],
            "logs": [
                "log analysis fraud detection",
                "behavioral anomaly patterns",
                "activity log forensics",
                "user behavior analysis",
                "session analysis techniques"
            ],
            "risk": [
                "fraud risk assessment models",
                "risk scoring methodologies",
                "fraud detection algorithms",
                "risk correlation analysis",
                "fraud prevention strategies"
            ]
        }
        
        # Add domain-specific queries
        domain_queries = domain_patterns.get(domain, [])
        queries.extend(domain_queries[:3])  # Limit to top 3 domain queries
        
        # Add objective-based queries
        if specific_objectives:
            for objective in specific_objectives[:2]:  # Limit objectives
                # Extract key terms from objectives for querying
                objective_query = f"{domain} {objective.lower().replace('analyze', '').replace('detect', '').replace('assess', '').strip()}"
                queries.append(objective_query)
        
        # Investigation type specific queries
        if hasattr(investigation_context, 'investigation_type') and investigation_context.investigation_type:
            inv_type_query = f"{investigation_context.investigation_type} fraud detection {domain}"
            queries.append(inv_type_query)
        
        self.logger.debug(f"Generated {len(queries)} queries for {domain} domain")
        
        return queries
    
    async def _retrieve_domain_knowledge(
        self,
        query: str,
        investigation_context: AutonomousInvestigationContext,
        domain: str
    ) -> List[DocumentChunk]:
        """Retrieve knowledge chunks for a specific query"""
        
        try:
            # Create RAG request
            rag_request = RAGRequest(
                query=query,
                investigation_id=investigation_context.investigation_id,
                entity_id=investigation_context.entity_id,
                entity_type=investigation_context.entity_type.value if investigation_context.entity_type else None,
                max_retrieved_chunks=20,  # Retrieve more for filtering
                similarity_threshold=0.5,  # Lower threshold for broader retrieval
                required_tags={domain} if self.config.enable_domain_filtering else set()
            )
            
            # Use knowledge base directly for more control
            chunks = await self.knowledge_base.search_chunks(
                query=query,
                max_results=rag_request.max_retrieved_chunks,
                entity_type=rag_request.entity_type,
                tags=rag_request.required_tags,
                similarity_threshold=rag_request.similarity_threshold
            )
            
            return chunks
            
        except Exception as e:
            self.logger.error(f"Knowledge retrieval failed for query '{query}': {str(e)}")
            return []
    
    async def _categorize_knowledge_by_relevance(
        self,
        chunks: List[DocumentChunk],
        investigation_context: AutonomousInvestigationContext,
        domain: str,
        queries: List[str]
    ) -> KnowledgeContext:
        """Categorize knowledge chunks by relevance level"""
        
        knowledge_context = KnowledgeContext(
            investigation_id=investigation_context.investigation_id,
            domain=domain,
            entity_id=investigation_context.entity_id,
            entity_type=investigation_context.entity_type.value if investigation_context.entity_type else None,
            primary_query=queries[0] if queries else "",
            domain_queries=queries
        )
        
        # Score each chunk for relevance
        scored_chunks = []
        for chunk in chunks:
            relevance_score = await self._calculate_chunk_relevance(
                chunk, investigation_context, domain, queries
            )
            scored_chunks.append((chunk, relevance_score))
            
            # Track knowledge sources
            knowledge_context.knowledge_sources.add(chunk.document_id)
            knowledge_context.relevance_scores[chunk.chunk_id] = relevance_score
        
        # Sort by relevance score
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        
        # Categorize by relevance thresholds
        for chunk, score in scored_chunks:
            if score >= self.config.critical_threshold and len(knowledge_context.critical_knowledge) < self.config.max_critical_chunks:
                knowledge_context.critical_knowledge.append(chunk)
            elif score >= self.config.supporting_threshold and len(knowledge_context.supporting_knowledge) < self.config.max_supporting_chunks:
                knowledge_context.supporting_knowledge.append(chunk)
            elif score >= self.config.background_threshold and len(knowledge_context.background_knowledge) < self.config.max_background_chunks:
                knowledge_context.background_knowledge.append(chunk)
        
        knowledge_context.total_chunks = (
            len(knowledge_context.critical_knowledge) + 
            len(knowledge_context.supporting_knowledge) + 
            len(knowledge_context.background_knowledge)
        )
        
        return knowledge_context
    
    async def _calculate_chunk_relevance(
        self,
        chunk: DocumentChunk,
        investigation_context: AutonomousInvestigationContext,
        domain: str,
        queries: List[str]
    ) -> float:
        """Calculate relevance score for a knowledge chunk"""
        
        relevance_score = 0.0
        
        # Base similarity score from chunk
        if hasattr(chunk, 'similarity_score'):
            relevance_score += chunk.similarity_score * 0.4
        
        # Domain matching bonus
        if domain in chunk.metadata.tags:
            relevance_score += 0.2
        elif any(domain_tag in chunk.metadata.tags for domain_tag in [f"{domain}_analysis", f"{domain}_fraud", f"{domain}_detection"]):
            relevance_score += 0.15
        
        # Entity type matching
        if (investigation_context.entity_type and 
            investigation_context.entity_type.value in chunk.metadata.entity_types):
            relevance_score += 0.15
        
        # Query term matching
        chunk_text_lower = chunk.content.lower()
        query_matches = 0
        total_query_terms = 0
        
        for query in queries:
            query_terms = query.lower().split()
            total_query_terms += len(query_terms)
            for term in query_terms:
                if term in chunk_text_lower:
                    query_matches += 1
        
        if total_query_terms > 0:
            query_match_ratio = query_matches / total_query_terms
            relevance_score += query_match_ratio * 0.25
        
        # Recency bonus (newer content is more relevant)
        if hasattr(chunk.metadata, 'creation_date') and chunk.metadata.creation_date:
            days_old = (datetime.now() - chunk.metadata.creation_date).days
            if days_old < 30:
                relevance_score += 0.1 * (30 - days_old) / 30
        
        return min(1.0, relevance_score)  # Cap at 1.0
    
    async def _apply_domain_filters(
        self,
        knowledge_context: KnowledgeContext,
        investigation_context: AutonomousInvestigationContext,
        domain: str
    ) -> KnowledgeContext:
        """Apply domain-specific filtering to knowledge context"""
        
        if not self.config.enable_domain_filtering:
            return knowledge_context
        
        # Record applied filters
        knowledge_context.applied_filters = {
            "domain_filtering": self.config.enable_domain_filtering,
            "entity_type_filtering": self.config.enable_entity_type_filtering,
            "temporal_filtering": self.config.enable_temporal_filtering,
            "domain": domain,
            "entity_type": investigation_context.entity_type.value if investigation_context.entity_type else None
        }
        
        # Additional domain-specific filtering could be implemented here
        # For now, we rely on the categorization process
        
        return knowledge_context
    
    def _format_knowledge_section(
        self,
        section_name: str,
        chunks: List[DocumentChunk],
        include_confidence: bool = True,
        limit: Optional[int] = None
    ) -> str:
        """Format knowledge chunks into a readable section"""
        
        if not chunks:
            return ""
        
        section_chunks = chunks[:limit] if limit else chunks
        
        section = f"--- {section_name} ---\n"
        
        for i, chunk in enumerate(section_chunks, 1):
            confidence_info = ""
            if include_confidence and hasattr(chunk, 'similarity_score'):
                confidence_info = f" (confidence: {chunk.similarity_score:.2f})"
            
            source_info = ""
            if self.config.include_source_attribution:
                source_info = f" [Source: {chunk.document_id}]"
            
            section += f"\n{i}. {chunk.content.strip()}{confidence_info}{source_info}\n"
        
        return section
    
    def _create_context_cache_key(
        self,
        investigation_id: str,
        domain: str,
        objectives: Optional[List[str]]
    ) -> str:
        """Create cache key for context"""
        import hashlib
        
        key_parts = [investigation_id, domain]
        if objectives:
            key_parts.extend(sorted(objectives))
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    def _get_cached_context(self, cache_key: str) -> Optional[KnowledgeContext]:
        """Get cached context if valid"""
        if cache_key in self.context_cache:
            context, timestamp = self.context_cache[cache_key]
            if (datetime.now() - timestamp).total_seconds() < self.cache_ttl_seconds:
                return context
            else:
                # Remove expired cache
                del self.context_cache[cache_key]
        return None
    
    def _cache_context(self, cache_key: str, context: KnowledgeContext) -> None:
        """Cache context for reuse"""
        # Limit cache size
        if len(self.context_cache) >= 100:
            # Remove oldest entry
            oldest_key = min(self.context_cache.keys(), 
                           key=lambda k: self.context_cache[k][1])
            del self.context_cache[oldest_key]
        
        self.context_cache[cache_key] = (context, datetime.now())
    
    async def clear_cache(self) -> None:
        """Clear context cache"""
        self.context_cache.clear()
        self.logger.info("Context augmentor cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cached_contexts": len(self.context_cache),
            "cache_ttl_seconds": self.cache_ttl_seconds,
            "max_cache_size": 100
        }


# Factory function for easy initialization
def create_context_augmentor(
    rag_orchestrator: RAGOrchestrator,
    config: Optional[ContextAugmentationConfig] = None
) -> ContextAugmentor:
    """Create context augmentor instance"""
    return ContextAugmentor(rag_orchestrator, config)