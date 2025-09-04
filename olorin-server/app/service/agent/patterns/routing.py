"""
Routing Pattern

Dynamic workflow selection based on request classification and specialized handlers.
Routes investigations to the most appropriate analysis pattern based on content and context.
"""

from typing import Any, Dict, List, Optional

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternResult
from .prompt_chaining import PromptChainingPattern
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RouteClassification:
    """Classification result for routing decisions"""
    
    def __init__(
        self,
        route: str,
        confidence: float,
        reasoning: str,
        suggested_params: Optional[Dict[str, Any]] = None
    ):
        self.route = route
        self.confidence = confidence
        self.reasoning = reasoning
        self.suggested_params = suggested_params or {}


class RoutingPattern(BasePattern):
    """
    Routing Pattern implementation.
    
    Provides:
    - Dynamic workflow selection
    - Request classification based on content and context
    - Specialized handlers for different investigation types
    - Confidence-based routing decisions
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Routing pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize underlying patterns
        self.llm_pattern = AugmentedLLMPattern(config, tools, ws_streaming)
        self.chaining_pattern = PromptChainingPattern(config, tools, ws_streaming)
        
        # Define route handlers
        self._route_handlers = self._initialize_route_handlers()
        
        # Define classification criteria
        self._classification_rules = self._initialize_classification_rules()
    
    def _initialize_route_handlers(self) -> Dict[str, Any]:
        """Initialize handlers for different routes"""
        
        return {
            "simple_query": self._handle_simple_query,
            "device_investigation": self._handle_device_investigation,
            "location_investigation": self._handle_location_investigation,
            "network_investigation": self._handle_network_investigation,
            "comprehensive_investigation": self._handle_comprehensive_investigation,
            "risk_assessment": self._handle_risk_assessment,
            "pattern_analysis": self._handle_pattern_analysis,
            "anomaly_detection": self._handle_anomaly_detection,
            "correlation_analysis": self._handle_correlation_analysis
        }
    
    def _initialize_classification_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize classification rules for routing"""
        
        return {
            "simple_query": {
                "keywords": ["what", "who", "when", "where", "status", "summary"],
                "complexity_threshold": 0.3,
                "tool_requirement": False,
                "description": "Simple informational queries"
            },
            
            "device_investigation": {
                "keywords": ["device", "fingerprint", "browser", "mobile", "hardware"],
                "entity_types": ["device_id", "fingerprint"],
                "complexity_threshold": 0.6,
                "tool_requirement": True,
                "description": "Device-focused investigations"
            },
            
            "location_investigation": {
                "keywords": ["location", "geolocation", "ip", "country", "city", "coordinates"],
                "entity_types": ["location", "ip_address"],
                "complexity_threshold": 0.6,
                "tool_requirement": True,
                "description": "Geographic and location-based analysis"
            },
            
            "network_investigation": {
                "keywords": ["network", "ip", "proxy", "vpn", "connection", "routing"],
                "entity_types": ["ip_address", "network"],
                "complexity_threshold": 0.7,
                "tool_requirement": True,
                "description": "Network behavior and security analysis"
            },
            
            "comprehensive_investigation": {
                "keywords": ["comprehensive", "full", "complete", "thorough", "investigation"],
                "context_requirements": ["high_priority", "complex_case"],
                "complexity_threshold": 0.8,
                "tool_requirement": True,
                "description": "Full multi-domain investigation"
            },
            
            "risk_assessment": {
                "keywords": ["risk", "score", "assessment", "evaluate", "rating"],
                "entity_types": ["user", "account", "transaction"],
                "complexity_threshold": 0.7,
                "tool_requirement": True,
                "description": "Risk scoring and assessment"
            },
            
            "pattern_analysis": {
                "keywords": ["pattern", "trend", "behavior", "analysis", "clustering"],
                "complexity_threshold": 0.8,
                "tool_requirement": True,
                "description": "Behavioral pattern identification"
            },
            
            "anomaly_detection": {
                "keywords": ["anomaly", "unusual", "outlier", "deviation", "suspicious"],
                "complexity_threshold": 0.7,
                "tool_requirement": True,
                "description": "Anomaly detection and analysis"
            },
            
            "correlation_analysis": {
                "keywords": ["correlation", "relationship", "connection", "link", "associated"],
                "complexity_threshold": 0.8,
                "tool_requirement": True,
                "description": "Cross-entity correlation analysis"
            }
        }
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Routing pattern"""
        
        try:
            # Stream routing start
            if self.ws_streaming:
                await self._stream_routing_start(context)
            
            # Classify the request to determine routing
            classification = await self._classify_request(messages, context)
            
            # Stream classification result
            if self.ws_streaming:
                await self._stream_classification(classification, context)
            
            # Validate classification confidence
            if classification.confidence < self.config.confidence_threshold:
                # Fall back to simple query if classification confidence is low
                classification = RouteClassification(
                    route="simple_query",
                    confidence=0.8,
                    reasoning="Low classification confidence, defaulting to simple query"
                )
            
            # Execute the appropriate handler
            handler = self._route_handlers.get(classification.route)
            if not handler:
                return PatternResult.error_result(f"No handler found for route: {classification.route}")
            
            # Prepare context with routing information
            routing_context = context.copy()
            routing_context.update({
                "route": classification.route,
                "route_confidence": classification.confidence,
                "route_reasoning": classification.reasoning,
                **classification.suggested_params
            })
            
            # Execute handler
            result = await handler(messages, routing_context)
            
            # Add routing metadata to result
            if result.success and isinstance(result.result, dict):
                result.result["routing_info"] = {
                    "selected_route": classification.route,
                    "confidence": classification.confidence,
                    "reasoning": classification.reasoning
                }
            
            # Stream routing completion
            if self.ws_streaming:
                await self._stream_routing_complete(classification.route, result.success, context)
            
            return result
            
        except Exception as e:
            logger.error(f"Routing pattern execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(f"Routing execution failed: {str(e)}")
    
    async def _classify_request(self, messages: List[BaseMessage], context: Dict[str, Any]) -> RouteClassification:
        """Classify the request to determine the best route"""
        
        # Extract content from messages
        content = self._extract_message_content(messages)
        
        # Score each route
        route_scores = {}
        
        for route, rules in self._classification_rules.items():
            score = await self._calculate_route_score(content, context, rules)
            route_scores[route] = score
        
        # Select the highest scoring route
        best_route = max(route_scores.items(), key=lambda x: x[1])
        route_name, confidence = best_route
        
        # Get reasoning for the selected route
        reasoning = self._get_classification_reasoning(route_name, content, context)
        
        # Generate suggested parameters
        suggested_params = self._get_suggested_parameters(route_name, context)
        
        return RouteClassification(
            route=route_name,
            confidence=confidence,
            reasoning=reasoning,
            suggested_params=suggested_params
        )
    
    def _extract_message_content(self, messages: List[BaseMessage]) -> str:
        """Extract text content from messages for analysis"""
        
        content_parts = []
        for message in messages:
            if hasattr(message, 'content') and message.content:
                content_parts.append(message.content)
        
        return " ".join(content_parts).lower()
    
    async def _calculate_route_score(self, content: str, context: Dict[str, Any], rules: Dict[str, Any]) -> float:
        """Calculate score for a specific route based on content and rules"""
        
        score = 0.0
        
        # Keyword matching score
        keywords = rules.get("keywords", [])
        keyword_matches = sum(1 for keyword in keywords if keyword in content)
        if keywords:
            keyword_score = keyword_matches / len(keywords) * 0.4
            score += keyword_score
        
        # Entity type matching score
        entity_types = rules.get("entity_types", [])
        if entity_types and "entity_type" in context:
            if context["entity_type"] in entity_types:
                score += 0.3
        
        # Context requirement matching score
        context_requirements = rules.get("context_requirements", [])
        context_matches = sum(1 for req in context_requirements if req in context and context[req])
        if context_requirements:
            context_score = context_matches / len(context_requirements) * 0.2
            score += context_score
        
        # Complexity assessment
        complexity_threshold = rules.get("complexity_threshold", 0.5)
        estimated_complexity = self._estimate_complexity(content, context)
        if estimated_complexity >= complexity_threshold:
            score += 0.1
        
        return min(score, 1.0)
    
    def _estimate_complexity(self, content: str, context: Dict[str, Any]) -> float:
        """Estimate the complexity of the request"""
        
        complexity_indicators = [
            "analyze", "investigate", "comprehensive", "detailed", "correlation",
            "pattern", "anomaly", "risk", "assessment", "multiple", "complex"
        ]
        
        # Base complexity from content length
        length_complexity = min(len(content.split()) / 100, 0.5)
        
        # Complexity from indicators
        indicator_matches = sum(1 for indicator in complexity_indicators if indicator in content)
        indicator_complexity = min(indicator_matches / len(complexity_indicators), 0.5)
        
        return length_complexity + indicator_complexity
    
    def _get_classification_reasoning(self, route: str, content: str, context: Dict[str, Any]) -> str:
        """Generate reasoning for the classification decision"""
        
        rules = self._classification_rules.get(route, {})
        
        reasoning_parts = [f"Selected route: {route}"]
        
        if "description" in rules:
            reasoning_parts.append(f"Route description: {rules['description']}")
        
        # Add keyword matches
        keywords = rules.get("keywords", [])
        matched_keywords = [kw for kw in keywords if kw in content]
        if matched_keywords:
            reasoning_parts.append(f"Matched keywords: {', '.join(matched_keywords)}")
        
        # Add entity type match
        if "entity_types" in rules and "entity_type" in context:
            if context["entity_type"] in rules["entity_types"]:
                reasoning_parts.append(f"Entity type match: {context['entity_type']}")
        
        return "; ".join(reasoning_parts)
    
    def _get_suggested_parameters(self, route: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get suggested parameters for the selected route"""
        
        params = {}
        
        if route == "device_investigation":
            params["chain_type"] = "device_analysis"
            params["focus_areas"] = ["fingerprint", "behavior", "security"]
        
        elif route == "location_investigation":
            params["chain_type"] = "location_analysis"
            params["focus_areas"] = ["geography", "velocity", "consistency"]
        
        elif route == "network_investigation":
            params["chain_type"] = "network_analysis"
            params["focus_areas"] = ["connections", "reputation", "anomalies"]
        
        elif route == "comprehensive_investigation":
            params["chain_type"] = "fraud_investigation"
            params["analysis_depth"] = "comprehensive"
        
        elif route == "risk_assessment":
            params["chain_type"] = "risk_assessment"
            params["scoring_method"] = "composite"
        
        return params
    
    # Route Handlers
    async def _handle_simple_query(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle simple informational queries"""
        return await self.llm_pattern.execute(messages, context)
    
    async def _handle_device_investigation(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle device-focused investigations"""
        context["chain_type"] = "device_analysis"
        return await self.chaining_pattern.execute(messages, context)
    
    async def _handle_location_investigation(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle location-based investigations"""
        context["chain_type"] = "location_analysis"
        return await self.chaining_pattern.execute(messages, context)
    
    async def _handle_network_investigation(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle network security investigations"""
        context["chain_type"] = "network_analysis"
        return await self.chaining_pattern.execute(messages, context)
    
    async def _handle_comprehensive_investigation(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle comprehensive multi-domain investigations"""
        context["chain_type"] = "fraud_investigation"
        return await self.chaining_pattern.execute(messages, context)
    
    async def _handle_risk_assessment(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle risk assessment requests"""
        context["chain_type"] = "risk_assessment"
        return await self.chaining_pattern.execute(messages, context)
    
    async def _handle_pattern_analysis(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle pattern analysis requests"""
        # Enhance context for pattern analysis
        context["analysis_type"] = "pattern"
        context["focus"] = "behavioral_patterns"
        return await self.llm_pattern.execute(messages, context)
    
    async def _handle_anomaly_detection(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle anomaly detection requests"""
        context["analysis_type"] = "anomaly"
        context["focus"] = "deviation_detection"
        return await self.llm_pattern.execute(messages, context)
    
    async def _handle_correlation_analysis(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Handle correlation analysis requests"""
        context["analysis_type"] = "correlation"
        context["focus"] = "cross_entity_relationships"
        return await self.llm_pattern.execute(messages, context)
    
    # WebSocket streaming methods
    async def _stream_routing_start(self, context: Dict[str, Any]) -> None:
        """Stream routing start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "routing_start",
                "pattern": "routing",
                "message": "Analyzing request to determine optimal routing",
                "available_routes": list(self._route_handlers.keys()),
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_classification(self, classification: RouteClassification, context: Dict[str, Any]) -> None:
        """Stream classification result"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "route_classification",
                "pattern": "routing",
                "selected_route": classification.route,
                "confidence": classification.confidence,
                "reasoning": classification.reasoning,
                "message": f"Routed to {classification.route} with {classification.confidence:.2f} confidence",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_routing_complete(self, route: str, success: bool, context: Dict[str, Any]) -> None:
        """Stream routing completion event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "routing_complete",
                "pattern": "routing",
                "executed_route": route,
                "success": success,
                "message": f"Route {route} execution {'completed' if success else 'failed'}",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "error",
                "pattern": "routing",
                "message": f"Routing failed: {error_message}",
                "context": context.get("investigation_id", "unknown")
            })