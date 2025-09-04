"""
Tool Strategy Implementations

Individual strategy implementations for tool recommendations.
"""

from typing import Dict, List, Optional

from langchain_core.tools import BaseTool

from .tool_recommender_core import ToolRecommendation, ToolEffectivenessMetrics
from .tool_analysis_utils import ToolAnalysisUtils
from .context_augmentor import KnowledgeContext
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolStrategyImplementations:
    """Individual strategy implementations for tool recommendations"""
    
    def __init__(self, config, utils: ToolAnalysisUtils):
        self.config = config
        self.utils = utils
    
    async def effectiveness_strategy(
        self,
        knowledge_context: KnowledgeContext,
        domain: str,
        available_tools: List[BaseTool]
    ) -> List[ToolRecommendation]:
        """Generate effectiveness-based recommendations"""
        
        recommendations = []
        
        # Analyze knowledge for tool effectiveness patterns
        effectiveness_data = self.utils.extract_effectiveness_metrics(
            knowledge_context, domain
        )
        
        # Score each tool based on effectiveness data
        for tool in available_tools:
            metrics = effectiveness_data.get(tool.name, ToolEffectivenessMetrics(tool.name))
            
            # Calculate effectiveness-based confidence
            confidence = self.utils.calculate_effectiveness_confidence(metrics, knowledge_context)
            
            if confidence >= self.config.min_confidence_threshold:
                reasoning = self.utils.generate_effectiveness_reasoning(metrics, knowledge_context)
                
                recommendation = ToolRecommendation(
                    tool=tool,
                    confidence=confidence,
                    reasoning=reasoning,
                    knowledge_sources=[chunk.document_id for chunk in knowledge_context.critical_knowledge[:3]],
                    effectiveness_metrics=metrics,
                    domain_match=domain in tool.name.lower() or any(
                        domain_term in tool.description.lower() 
                        for domain_term in self.utils.domain_tool_preferences.get(domain, [])
                    )
                )
                
                recommendations.append(recommendation)
        
        return sorted(recommendations, key=lambda r: r.confidence, reverse=True)
    
    async def case_similarity_strategy(
        self,
        investigation_context: AutonomousInvestigationContext,
        knowledge_context: KnowledgeContext,
        available_tools: List[BaseTool]
    ) -> List[ToolRecommendation]:
        """Generate case similarity-based recommendations"""
        
        recommendations = []
        
        # Extract case similarity patterns from knowledge
        case_patterns = self.utils.extract_case_similarity_patterns(
            knowledge_context, investigation_context
        )
        
        for tool in available_tools:
            similarity_score = case_patterns.get(tool.name, 0.0)
            
            confidence = similarity_score * 0.8  # Scale for confidence
            
            if confidence >= self.config.min_confidence_threshold:
                reasoning = f"Tool recommended based on similarity to {len(case_patterns)} historical cases with {similarity_score:.1%} success rate"
                
                recommendation = ToolRecommendation(
                    tool=tool,
                    confidence=confidence,
                    reasoning=reasoning,
                    knowledge_sources=[chunk.document_id for chunk in knowledge_context.supporting_knowledge[:2]],
                    case_similarity=similarity_score
                )
                
                recommendations.append(recommendation)
        
        return recommendations
    
    async def domain_specific_strategy(
        self,
        knowledge_context: KnowledgeContext,
        domain: str,
        available_tools: List[BaseTool]
    ) -> List[ToolRecommendation]:
        """Generate domain-specific recommendations"""
        
        recommendations = []
        
        # Get domain-specific tool preferences from knowledge
        domain_preferences = self.utils.extract_domain_preferences(knowledge_context, domain)
        
        for tool in available_tools:
            domain_relevance = self.utils.calculate_domain_relevance(tool, domain, domain_preferences)
            confidence = domain_relevance
            
            if confidence >= self.config.min_confidence_threshold:
                reasoning = f"Tool highly relevant for {domain} domain analysis based on domain expertise"
                
                recommendation = ToolRecommendation(
                    tool=tool,
                    confidence=confidence,
                    reasoning=reasoning,
                    knowledge_sources=[chunk.document_id for chunk in knowledge_context.background_knowledge[:2]],
                    domain_match=True
                )
                
                recommendations.append(recommendation)
        
        return recommendations
    
    def combine_hybrid_recommendations(
        self,
        effectiveness_recs: List[ToolRecommendation],
        case_recs: List[ToolRecommendation],
        domain_recs: List[ToolRecommendation],
        knowledge_context: KnowledgeContext
    ) -> List[ToolRecommendation]:
        """Combine multiple strategies into hybrid recommendations"""
        
        # Combine and weight recommendations
        combined_recommendations = {}
        
        # Weight effectiveness recommendations
        for rec in effectiveness_recs:
            tool_name = rec.tool.name
            combined_recommendations[tool_name] = rec
            combined_recommendations[tool_name].confidence *= self.config.effectiveness_weight
        
        # Add case similarity weights
        for rec in case_recs:
            tool_name = rec.tool.name
            if tool_name in combined_recommendations:
                combined_recommendations[tool_name].confidence += rec.confidence * self.config.case_similarity_weight
                combined_recommendations[tool_name].case_similarity = rec.case_similarity
            else:
                rec.confidence *= self.config.case_similarity_weight
                combined_recommendations[tool_name] = rec
        
        # Add domain relevance weights
        for rec in domain_recs:
            tool_name = rec.tool.name
            if tool_name in combined_recommendations:
                combined_recommendations[tool_name].confidence += rec.confidence * self.config.domain_relevance_weight
                combined_recommendations[tool_name].domain_match = True
            else:
                rec.confidence *= self.config.domain_relevance_weight
                combined_recommendations[tool_name] = rec
        
        # Generate hybrid reasoning
        for rec in combined_recommendations.values():
            rec.reasoning = self.utils.generate_hybrid_reasoning(rec, knowledge_context)
        
        return list(combined_recommendations.values())