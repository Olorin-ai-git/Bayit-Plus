"""
Tool Analysis Utilities

Utility functions for analyzing tool effectiveness, extracting patterns,
and generating recommendations from knowledge content.
"""

from typing import Dict, List

from langchain_core.tools import BaseTool
from .context_augmentor import KnowledgeContext
from .tool_recommender_core import ToolEffectivenessMetrics
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ToolAnalysisUtils:
    """Utility functions for tool analysis and pattern extraction"""
    
    def __init__(self, tool_registry):
        self.tool_registry = tool_registry
        self.domain_tool_preferences = self._initialize_domain_preferences()
    
    def extract_tool_mentions(self, content: str) -> List[str]:
        """Extract tool mentions from text content"""
        
        # Get all registered tool names
        all_tools = self.tool_registry.get_tool_names()
        
        content_lower = content.lower()
        mentioned_tools = []
        
        for tool_name in all_tools:
            # Check for tool name or variations
            if tool_name.lower() in content_lower or tool_name.replace('_', ' ').lower() in content_lower:
                mentioned_tools.append(tool_name)
        
        return mentioned_tools
    
    def extract_success_indicators(self, content: str) -> Dict[str, float]:
        """Extract success indicators from text"""
        
        success_indicators = {"success_rate": 0.7, "confidence": 0.7}
        
        content_lower = content.lower()
        
        # Simple keyword-based success detection
        if any(word in content_lower for word in ["successful", "effective", "accurate", "reliable"]):
            success_indicators["success_rate"] += 0.2
            success_indicators["confidence"] += 0.15
            
        if any(word in content_lower for word in ["failed", "ineffective", "inaccurate", "unreliable"]):
            success_indicators["success_rate"] -= 0.2
            success_indicators["confidence"] -= 0.15
        
        return success_indicators
    
    def calculate_effectiveness_confidence(
        self,
        metrics: ToolEffectivenessMetrics,
        knowledge_context: KnowledgeContext
    ) -> float:
        """Calculate confidence based on effectiveness metrics"""
        
        # Combine multiple effectiveness factors
        confidence = (
            metrics.success_rate * 0.4 +
            metrics.avg_confidence * 0.3 +
            metrics.domain_relevance * 0.2 +
            min(metrics.usage_frequency / 10.0, 1.0) * 0.1
        )
        
        # Boost confidence if tool appears in critical knowledge
        if any(metrics.tool_name in chunk.content for chunk in knowledge_context.critical_knowledge):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def calculate_domain_relevance(
        self,
        tool: BaseTool,
        domain: str,
        domain_preferences: Dict[str, float]
    ) -> float:
        """Calculate domain relevance score for a tool"""
        
        relevance = 0.5  # Base relevance
        
        # Check tool name and description for domain terms
        if domain in tool.name.lower():
            relevance += 0.3
        
        if domain in tool.description.lower():
            relevance += 0.2
        
        # Check against domain preferences from knowledge
        preference_score = domain_preferences.get(tool.name, 0.0)
        relevance += min(preference_score, 0.3)
        
        # Check against known domain tool patterns
        domain_tools = self.domain_tool_preferences.get(domain, [])
        if any(pattern in tool.name.lower() or pattern in tool.description.lower() for pattern in domain_tools):
            relevance += 0.2
        
        return min(relevance, 1.0)
    
    def extract_effectiveness_metrics(
        self,
        knowledge_context: KnowledgeContext,
        domain: str
    ) -> Dict[str, ToolEffectivenessMetrics]:
        """Extract tool effectiveness metrics from knowledge"""
        
        metrics = {}
        
        # Analyze critical knowledge chunks for effectiveness patterns
        for chunk in knowledge_context.critical_knowledge:
            # Extract tool mentions and success indicators
            tools_mentioned = self.extract_tool_mentions(chunk.content)
            success_indicators = self.extract_success_indicators(chunk.content)
            
            for tool_name in tools_mentioned:
                if tool_name not in metrics:
                    metrics[tool_name] = ToolEffectivenessMetrics(tool_name)
                
                # Update metrics based on chunk content analysis
                metrics[tool_name].success_rate = success_indicators.get("success_rate", 0.8)
                metrics[tool_name].avg_confidence = success_indicators.get("confidence", 0.75)
                metrics[tool_name].domain_relevance = 0.9 if domain in chunk.content.lower() else 0.6
        
        return metrics
    
    def extract_case_similarity_patterns(
        self,
        knowledge_context: KnowledgeContext,
        investigation_context: AutonomousInvestigationContext
    ) -> Dict[str, float]:
        """Extract case similarity patterns from knowledge"""
        
        patterns = {}
        
        for chunk in knowledge_context.supporting_knowledge:
            tools_mentioned = self.extract_tool_mentions(chunk.content)
            
            # Simple similarity scoring based on entity type and context matches
            similarity_score = 0.7  # Base similarity
            
            if investigation_context.entity_type and investigation_context.entity_type.value in chunk.content:
                similarity_score += 0.2
            
            for tool_name in tools_mentioned:
                patterns[tool_name] = max(patterns.get(tool_name, 0.0), similarity_score)
        
        return patterns
    
    def extract_domain_preferences(self, knowledge_context: KnowledgeContext, domain: str) -> Dict[str, float]:
        """Extract domain-specific tool preferences"""
        
        preferences = {}
        
        # Use background knowledge for domain preferences
        for chunk in knowledge_context.background_knowledge:
            if domain in chunk.content.lower():
                tools_mentioned = self.extract_tool_mentions(chunk.content)
                for tool_name in tools_mentioned:
                    preferences[tool_name] = preferences.get(tool_name, 0.0) + 0.1
        
        return preferences
    
    def generate_effectiveness_reasoning(
        self,
        metrics: ToolEffectivenessMetrics,
        knowledge_context: KnowledgeContext
    ) -> str:
        """Generate reasoning for effectiveness-based recommendation"""
        
        reasoning_parts = [
            f"Historical success rate: {metrics.success_rate:.1%}"
        ]
        
        if metrics.domain_relevance > 0.8:
            reasoning_parts.append("high domain relevance")
        
        if knowledge_context.critical_knowledge:
            reasoning_parts.append(f"mentioned in {len(knowledge_context.critical_knowledge)} critical knowledge sources")
        
        return f"Recommended based on {', '.join(reasoning_parts)}"
    
    def generate_hybrid_reasoning(
        self,
        recommendation,  # ToolRecommendation type
        knowledge_context: KnowledgeContext
    ) -> str:
        """Generate reasoning for hybrid recommendation"""
        
        factors = []
        
        if recommendation.effectiveness_metrics and recommendation.effectiveness_metrics.success_rate > 0.8:
            factors.append("proven effectiveness")
        
        if recommendation.case_similarity > 0.7:
            factors.append("case similarity")
        
        if recommendation.domain_match:
            factors.append("domain expertise")
        
        if recommendation.knowledge_sources:
            factors.append(f"{len(recommendation.knowledge_sources)} knowledge sources")
        
        return f"Recommended based on {', '.join(factors)} (confidence: {recommendation.confidence:.1%})"
    
    def determine_tool_category(self, tool: BaseTool) -> str:
        """Determine tool category for filtering"""
        
        # Simple category determination based on tool name patterns
        tool_name_lower = tool.name.lower()
        
        if any(pattern in tool_name_lower for pattern in ["threat", "virus", "abuse", "shodan"]):
            return "threat_intelligence"
        elif any(pattern in tool_name_lower for pattern in ["splunk", "sumo", "snowflake"]):
            return "olorin"
        elif any(pattern in tool_name_lower for pattern in ["search", "query"]):
            return "search"
        elif any(pattern in tool_name_lower for pattern in ["http", "api", "request"]):
            return "api"
        elif any(pattern in tool_name_lower for pattern in ["blockchain", "crypto"]):
            return "blockchain"
        elif any(pattern in tool_name_lower for pattern in ["ml", "ai", "behavioral", "anomaly"]):
            return "ml_ai"
        else:
            return "utility"
    
    def get_default_categories(self, domain: str) -> List[str]:
        """Get default tool categories for a domain"""
        
        base_categories = ["search", "api", "olorin"]
        
        domain_specific = {
            "network": ["threat_intelligence", "intelligence"],
            "device": ["threat_intelligence", "ml_ai"],
            "location": ["intelligence", "web"],
            "logs": ["database", "search"],
            "risk": ["threat_intelligence", "ml_ai", "intelligence"]
        }
        
        return base_categories + domain_specific.get(domain, [])
    
    def _initialize_domain_preferences(self) -> Dict[str, List[str]]:
        """Initialize domain-specific tool preferences"""
        
        return {
            "network": ["ip", "dns", "traffic", "connection", "threat", "abuse"],
            "device": ["fingerprint", "device", "mobile", "browser", "hardware"],
            "location": ["geo", "location", "travel", "coordinate", "distance"],
            "logs": ["log", "event", "activity", "session", "audit"],
            "risk": ["risk", "score", "fraud", "anomaly", "threat", "ml", "ai"]
        }