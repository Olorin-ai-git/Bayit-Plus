"""
Enhanced Knowledge Base with PostgreSQL + pgvector integration.
Provides fraud investigation domain knowledge with vector similarity search.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass
import uuid

from app.service.rag.vector_rag_service import get_rag_service, SearchResult
from app.service.rag.embedding_service import get_embedding_service
from app.service.database.vector_database_config import get_vector_db_config

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeResult:
    """Enhanced knowledge search result with investigation context."""
    content: str
    title: str
    relevance_score: float
    source: str
    category: str
    keywords: List[str]
    metadata: Dict[str, Any]
    chunk_id: str
    document_id: str
    
    # Investigation-specific fields
    investigation_types: List[str]
    applicable_tools: List[str]
    confidence_level: str
    related_concepts: List[str]


class EnhancedKnowledgeBase:
    """
    Enhanced knowledge base for fraud investigation with PostgreSQL + pgvector.
    Provides semantic search, domain expertise, and investigation context.
    """
    
    def __init__(self):
        """Initialize enhanced knowledge base."""
        self.rag_service = get_rag_service()
        self.embedding_service = get_embedding_service()
        self.db_config = get_vector_db_config()
        
        # Investigation domain categories
        self.investigation_categories = {
            "credit_card_fraud": {
                "keywords": ["credit card", "payment", "transaction", "chargeback", "pos", "card not present"],
                "tools": ["transaction_analyzer", "merchant_validator", "card_issuer_lookup"]
            },
            "identity_theft": {
                "keywords": ["identity", "personal information", "ssn", "pii", "impersonation", "synthetic identity"],
                "tools": ["identity_verifier", "ssn_validator", "address_validator"]
            },
            "money_laundering": {
                "keywords": ["money laundering", "aml", "structuring", "layering", "placement", "integration"],
                "tools": ["transaction_flow_analyzer", "cash_intensity_calculator", "suspicious_activity_reporter"]
            },
            "account_takeover": {
                "keywords": ["account takeover", "ato", "credential stuffing", "brute force", "session hijacking"],
                "tools": ["login_analyzer", "device_fingerprinter", "behavioral_analyzer"]
            },
            "check_fraud": {
                "keywords": ["check fraud", "counterfeit", "forged", "altered", "kiting", "washing"],
                "tools": ["check_validator", "micr_analyzer", "signature_verifier"]
            },
            "wire_fraud": {
                "keywords": ["wire fraud", "business email compromise", "bec", "invoice fraud", "ceo fraud"],
                "tools": ["email_analyzer", "wire_tracer", "vendor_validator"]
            }
        }
        
    async def initialize(self):
        """Initialize the knowledge base and ensure required collections exist."""
        logger.info("🚀 Initializing Enhanced Knowledge Base...")
        
        try:
            # Ensure core fraud investigation collections exist
            await self._ensure_core_collections()
            
            # Check if we need to populate with initial knowledge
            collections = await self.rag_service.get_collections()
            empty_collections = [c for c in collections if c["document_count"] == 0]
            
            if empty_collections:
                logger.info(f"Found {len(empty_collections)} empty collections - consider populating with domain knowledge")
            
            logger.info("✅ Enhanced Knowledge Base initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize knowledge base: {e}")
            raise
    
    async def _ensure_core_collections(self):
        """Ensure core fraud investigation collections exist."""
        required_collections = [
            {
                "name": "fraud_patterns",
                "description": "Common fraud patterns, schemes, and attack vectors in financial crimes",
                "metadata_schema": {
                    "fraud_type": {"type": "string", "enum": list(self.investigation_categories.keys())},
                    "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "industry": {"type": "array", "items": {"type": "string"}},
                    "detection_methods": {"type": "array", "items": {"type": "string"}}
                }
            },
            {
                "name": "investigation_procedures",
                "description": "Standard operating procedures and workflows for fraud investigations",
                "metadata_schema": {
                    "procedure_type": {"type": "string"},
                    "investigation_phase": {"type": "string", "enum": ["detection", "analysis", "investigation", "resolution"]},
                    "required_tools": {"type": "array", "items": {"type": "string"}},
                    "estimated_time": {"type": "string"}
                }
            },
            {
                "name": "regulatory_compliance",
                "description": "Regulatory requirements, compliance guidelines, and legal frameworks",
                "metadata_schema": {
                    "regulation": {"type": "string"},
                    "jurisdiction": {"type": "string"},
                    "compliance_type": {"type": "string"},
                    "effective_date": {"type": "string", "format": "date"}
                }
            },
            {
                "name": "tool_documentation",
                "description": "Documentation for investigation tools, APIs, and integrations",
                "metadata_schema": {
                    "tool_name": {"type": "string"},
                    "tool_category": {"type": "string"},
                    "api_version": {"type": "string"},
                    "update_frequency": {"type": "string"}
                }
            }
        ]
        
        existing_collections = await self.rag_service.get_collections()
        existing_names = {c["name"] for c in existing_collections}
        
        for collection_spec in required_collections:
            if collection_spec["name"] not in existing_names:
                try:
                    await self.rag_service.create_collection(
                        name=collection_spec["name"],
                        description=collection_spec["description"],
                        metadata_schema=collection_spec["metadata_schema"]
                    )
                    logger.info(f"✅ Created collection: {collection_spec['name']}")
                except Exception as e:
                    logger.warning(f"Failed to create collection {collection_spec['name']}: {e}")
    
    async def search_knowledge(
        self,
        query: str,
        investigation_type: Optional[str] = None,
        categories: Optional[List[str]] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        user_id: Optional[str] = None,
        investigation_id: Optional[str] = None
    ) -> List[KnowledgeResult]:
        """
        Search knowledge base with investigation context.
        
        Args:
            query: Search query
            investigation_type: Type of investigation (filters results)
            categories: Specific categories to search in
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            user_id: User ID for analytics
            investigation_id: Investigation ID for context
            
        Returns:
            List of enhanced knowledge results
        """
        logger.info(f"🔍 Searching knowledge base: '{query[:50]}...'")
        
        try:
            # Determine collection filter based on categories or investigation type
            collection_filter = None
            if categories:
                # Get collection IDs for specified categories
                all_collections = await self.rag_service.get_collections()
                collection_filter = [
                    uuid.UUID(c["id"]) for c in all_collections 
                    if c["name"] in categories
                ]
            
            # Enhance query with investigation context
            enhanced_query = await self._enhance_query_with_context(query, investigation_type)
            
            # Perform vector similarity search
            search_results = await self.rag_service.search_similar(
                query=enhanced_query,
                collection_ids=collection_filter,
                limit=limit,
                similarity_threshold=similarity_threshold,
                embedding_type="openai",
                user_id=user_id,
                investigation_id=investigation_id
            )
            
            # Enhance results with investigation context
            enhanced_results = []
            for result in search_results:
                enhanced_result = await self._enhance_search_result(result, investigation_type)
                enhanced_results.append(enhanced_result)
            
            # Sort by relevance and investigation applicability
            enhanced_results = self._rank_results_by_context(enhanced_results, investigation_type)
            
            logger.info(f"✅ Found {len(enhanced_results)} relevant knowledge items")
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            return []
    
    async def _enhance_query_with_context(self, query: str, investigation_type: Optional[str]) -> str:
        """Enhance search query with investigation context."""
        if not investigation_type or investigation_type not in self.investigation_categories:
            return query
        
        # Add relevant domain keywords
        category_info = self.investigation_categories[investigation_type]
        relevant_keywords = category_info["keywords"][:3]  # Top 3 most relevant
        
        # Create contextual query
        enhanced_query = f"{query} {' '.join(relevant_keywords)}"
        logger.debug(f"Enhanced query: {enhanced_query}")
        
        return enhanced_query
    
    async def _enhance_search_result(
        self, 
        result: SearchResult, 
        investigation_type: Optional[str]
    ) -> KnowledgeResult:
        """Enhance search result with investigation-specific metadata."""
        
        # Determine applicable investigation types
        applicable_types = []
        if investigation_type:
            applicable_types = [investigation_type]
        else:
            # Analyze content for relevant investigation types
            applicable_types = self._analyze_content_for_investigation_types(result.content)
        
        # Determine applicable tools
        applicable_tools = []
        for inv_type in applicable_types:
            if inv_type in self.investigation_categories:
                applicable_tools.extend(self.investigation_categories[inv_type]["tools"])
        
        # Calculate confidence level based on similarity score
        confidence_level = "high" if result.similarity_score > 0.8 else \
                          "medium" if result.similarity_score > 0.6 else "low"
        
        # Extract category from metadata or infer from content
        category = "general"
        if result.metadata and "category" in result.metadata:
            category = result.metadata["category"]
        
        # Generate related concepts
        related_concepts = await self._extract_related_concepts(result.content)
        
        return KnowledgeResult(
            content=result.content,
            title=result.document_title,
            relevance_score=result.similarity_score,
            source="knowledge_base",
            category=category,
            keywords=result.keywords or [],
            metadata=result.metadata or {},
            chunk_id=str(result.chunk_id),
            document_id=str(result.document_id),
            investigation_types=applicable_types,
            applicable_tools=list(set(applicable_tools)),
            confidence_level=confidence_level,
            related_concepts=related_concepts
        )
    
    def _analyze_content_for_investigation_types(self, content: str) -> List[str]:
        """Analyze content to determine applicable investigation types."""
        content_lower = content.lower()
        applicable_types = []
        
        for inv_type, info in self.investigation_categories.items():
            # Check if any keywords match the content
            matches = sum(1 for keyword in info["keywords"] if keyword in content_lower)
            if matches > 0:
                applicable_types.append(inv_type)
        
        return applicable_types
    
    async def _extract_related_concepts(self, content: str) -> List[str]:
        """Extract related concepts from content using simple keyword extraction."""
        # Simple implementation - can be enhanced with NLP
        fraud_concepts = [
            "risk assessment", "transaction monitoring", "pattern analysis",
            "behavioral analytics", "anomaly detection", "compliance reporting",
            "investigation workflow", "evidence collection", "case management",
            "regulatory requirements", "suspicious activity", "false positives"
        ]
        
        content_lower = content.lower()
        related = [concept for concept in fraud_concepts if concept in content_lower]
        return related[:5]  # Return top 5 related concepts
    
    def _rank_results_by_context(
        self, 
        results: List[KnowledgeResult], 
        investigation_type: Optional[str]
    ) -> List[KnowledgeResult]:
        """Rank results by investigation context relevance."""
        if not investigation_type:
            return results
        
        def context_score(result: KnowledgeResult) -> float:
            score = result.relevance_score
            
            # Boost score if investigation type matches
            if investigation_type in result.investigation_types:
                score += 0.2
            
            # Boost score based on applicable tools
            if result.applicable_tools:
                score += 0.1
            
            # Boost score for high confidence
            if result.confidence_level == "high":
                score += 0.05
            
            return min(score, 1.0)  # Cap at 1.0
        
        # Sort by context score descending
        results.sort(key=context_score, reverse=True)
        return results
    
    async def add_domain_knowledge(
        self,
        title: str,
        content: str,
        category: str,
        fraud_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Add domain-specific knowledge to the knowledge base.
        
        Args:
            title: Document title
            content: Document content
            category: Knowledge category
            fraud_type: Type of fraud this knowledge applies to
            metadata: Additional metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Find or create appropriate collection
            collections = await self.rag_service.get_collections()
            target_collection = None
            
            # Map category to collection
            category_mapping = {
                "fraud_patterns": "fraud_patterns",
                "procedures": "investigation_procedures", 
                "compliance": "regulatory_compliance",
                "tools": "tool_documentation"
            }
            
            collection_name = category_mapping.get(category, "fraud_patterns")
            target_collection = next((c for c in collections if c["name"] == collection_name), None)
            
            if not target_collection:
                logger.error(f"Target collection '{collection_name}' not found")
                return False
            
            # Prepare metadata
            document_metadata = metadata or {}
            if fraud_type:
                document_metadata["fraud_type"] = fraud_type
            document_metadata["category"] = category
            document_metadata["added_at"] = datetime.now(timezone.utc).isoformat()
            
            # Ingest document
            result = await self.rag_service.ingest_document(
                collection_id=uuid.UUID(target_collection["id"]),
                title=title,
                content=content,
                source_type="domain_knowledge",
                metadata=document_metadata,
                generate_embeddings=True
            )
            
            if result.success:
                logger.info(f"✅ Added domain knowledge: {title} ({result.chunk_count} chunks)")
                return True
            else:
                logger.error(f"Failed to add domain knowledge: {result.error_message}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding domain knowledge: {e}")
            return False
    
    async def get_investigation_context(self, investigation_id: str) -> Dict[str, Any]:
        """
        Get relevant knowledge context for an ongoing investigation.
        
        Args:
            investigation_id: Investigation identifier
            
        Returns:
            Dictionary with relevant context and recommendations
        """
        logger.info(f"📋 Getting investigation context for: {investigation_id}")
        
        try:
            # This could be enhanced to analyze investigation history
            # For now, provide general investigation context
            
            context = {
                "investigation_id": investigation_id,
                "applicable_procedures": [],
                "relevant_patterns": [],
                "compliance_requirements": [],
                "recommended_tools": [],
                "similar_cases": []
            }
            
            # Get recent search queries for this investigation
            search_queries = await self._get_investigation_search_history(investigation_id)
            
            if search_queries:
                # Analyze search patterns to suggest relevant knowledge
                context["search_patterns"] = search_queries
                context["recommended_knowledge"] = await self._suggest_knowledge_based_on_searches(search_queries)
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get investigation context: {e}")
            return {}
    
    async def _get_investigation_search_history(self, investigation_id: str) -> List[str]:
        """Get search query history for an investigation."""
        try:
            # Query search_queries table for this investigation
            query = """
                SELECT query_text, created_at 
                FROM search_queries 
                WHERE investigation_id = %s 
                ORDER BY created_at DESC 
                LIMIT 10
            """
            
            results = await self.db_config.execute_raw_query(
                query, {"investigation_id": investigation_id}
            )
            
            return [r["query_text"] for r in results]
            
        except Exception as e:
            logger.error(f"Failed to get search history: {e}")
            return []
    
    async def _suggest_knowledge_based_on_searches(self, search_queries: List[str]) -> List[str]:
        """Suggest relevant knowledge based on search patterns."""
        # Simple implementation - analyze query keywords
        all_keywords = " ".join(search_queries).lower()
        
        suggestions = []
        for fraud_type, info in self.investigation_categories.items():
            keyword_matches = sum(1 for keyword in info["keywords"] if keyword in all_keywords)
            if keyword_matches > 0:
                suggestions.append(f"Review {fraud_type} investigation procedures")
                suggestions.extend([f"Consider using {tool}" for tool in info["tools"][:2]])
        
        return suggestions[:5]  # Return top 5 suggestions


# Global knowledge base instance
_enhanced_kb: Optional[EnhancedKnowledgeBase] = None


def get_enhanced_knowledge_base() -> EnhancedKnowledgeBase:
    """Get or create global enhanced knowledge base instance."""
    global _enhanced_kb
    
    if _enhanced_kb is None:
        _enhanced_kb = EnhancedKnowledgeBase()
    
    return _enhanced_kb


async def initialize_enhanced_knowledge_base():
    """Initialize the enhanced knowledge base."""
    kb = get_enhanced_knowledge_base()
    await kb.initialize()
    logger.info("✅ Enhanced Knowledge Base ready for fraud investigations")
    return kb