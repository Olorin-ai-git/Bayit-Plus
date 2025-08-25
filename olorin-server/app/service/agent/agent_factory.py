"""
Agent Factory

Creates and manages agent instances, handling the transition between
legacy agents and new pattern-based agents with feature flag support.
"""

import logging
from typing import Any, Dict, List, Optional, Union

from langchain_core.messages import BaseMessage

from app.models.agent_context import AgentContext
from app.service.agent.patterns import (
    BasePattern,
    PatternConfig,
    PatternRegistry,
    PatternType,
    get_pattern_registry,
)
from app.service.agent.websocket_streaming_service import WebSocketStreamingService

logger = logging.getLogger(__name__)


class AgentFactory:
    """
    Factory for creating agent instances with pattern support.
    
    This factory:
    1. Checks feature flags to determine which system to use
    2. Creates appropriate agent instances (legacy or pattern-based)
    3. Handles backward compatibility
    4. Provides unified interface for agent execution
    """
    
    def __init__(self):
        self.pattern_registry: PatternRegistry = get_pattern_registry()
        self.feature_flags = None  # Feature flags not available yet
        self._legacy_agent = None  # Will be set when needed
    
    def create_agent(
        self,
        agent_type: str,
        context: Dict[str, Any],
        ws_streaming: Optional[WebSocketStreamingService] = None,
        tools: Optional[List[Any]] = None,
    ) -> Union[BasePattern, Any]:  # Returns pattern or legacy agent
        """
        Create an agent instance based on type and feature flags.
        
        Args:
            agent_type: Type of agent to create
            context: Execution context including user info
            ws_streaming: WebSocket streaming service
            tools: Available tools for the agent
            
        Returns:
            Agent instance (pattern-based or legacy)
        """
        
        # Extract user context for feature flags
        user_context = self._extract_user_context(context)
        
        # Check if we should use patterns
        if self.feature_flags and self.feature_flags.should_use_patterns(user_context):
            logger.info(f"Creating pattern-based agent for type: {agent_type}")
            return self._create_pattern_agent(
                agent_type, context, ws_streaming, tools, user_context
            )
        else:
            logger.info(f"Creating legacy agent for type: {agent_type}")
            return self._create_legacy_agent(agent_type, context, ws_streaming, tools)
    
    def _extract_user_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user context for feature flag evaluation"""
        user_context = {
            "user_id": context.get("user_id", ""),
            "entity_id": context.get("entity_id", ""),
            "entity_type": context.get("entity_type", ""),
            "investigation_type": context.get("investigation_type", ""),
        }
        
        # Extract from agent context if available
        if "agent_context" in context and isinstance(
            context["agent_context"], AgentContext
        ):
            agent_ctx = context["agent_context"]
            if hasattr(agent_ctx, "olorin_header") and agent_ctx.olorin_header:
                if hasattr(agent_ctx.olorin_header, "auth_context"):
                    auth_ctx = agent_ctx.olorin_header.auth_context
                    if hasattr(auth_ctx, "olorin_user_id"):
                        user_context["user_id"] = auth_ctx.olorin_user_id
        
        return user_context
    
    def _create_pattern_agent(
        self,
        agent_type: str,
        context: Dict[str, Any],
        ws_streaming: Optional[WebSocketStreamingService],
        tools: Optional[List[Any]],
        user_context: Dict[str, Any]
    ) -> BasePattern:
        """Create a pattern-based agent"""
        
        # Map agent types to patterns
        pattern_mapping = self._get_pattern_mapping()
        pattern_type = pattern_mapping.get(agent_type, PatternType.AUGMENTED_LLM)
        
        # Create pattern configuration
        config = PatternConfig(
            pattern_type=pattern_type,
            max_iterations=context.get("max_iterations", 5),
            confidence_threshold=context.get("confidence_threshold", 0.7),
            timeout_seconds=context.get("timeout_seconds", 300),
            enable_caching=context.get("enable_caching", True),
            enable_metrics=context.get("enable_metrics", True),
            debug_mode=context.get("debug_mode", False),
            custom_params=context.get("pattern_params", {})
        )
        
        # Create the pattern instance
        pattern = self.pattern_registry.create_pattern(
            pattern_type=pattern_type,
            config=config,
            tools=tools,
            ws_streaming=ws_streaming
        )
        
        return pattern
    
    def _create_legacy_agent(
        self,
        agent_type: str,
        context: Dict[str, Any],
        ws_streaming: Optional[WebSocketStreamingService],
        tools: Optional[List[Any]]
    ) -> Any:
        """Create a legacy agent instance"""
        
        # Import legacy agent classes
        try:
            from app.service.agent.agent import (
                DeviceAnalysisService,
                LocationAnalysisService,
                LogsAnalysisService,
                NetworkAnalysisService,
                RiskAssessmentAnalysisService
            )
            
            # Map agent types to legacy classes
            legacy_mapping = {
                "device": DeviceAnalysisService,
                "location": LocationAnalysisService,
                "logs": LogsAnalysisService,
                "network": NetworkAnalysisService,
                "risk_assessment": RiskAssessmentAnalysisService,
            }
            
            agent_class = legacy_mapping.get(agent_type)
            if agent_class:
                return agent_class()
            else:
                # Default to a generic legacy agent wrapper
                return LegacyAgentWrapper(agent_type, context, tools, ws_streaming)
                
        except ImportError as e:
            logger.warning(f"Failed to import legacy agents: {e}")
            return LegacyAgentWrapper(agent_type, context, tools, ws_streaming)
    
    def _get_pattern_mapping(self) -> Dict[str, PatternType]:
        """Get mapping from agent types to patterns"""
        
        return {
            "simple_query": PatternType.AUGMENTED_LLM,
            "device": PatternType.PROMPT_CHAINING,
            "location": PatternType.PROMPT_CHAINING,
            "network": PatternType.PROMPT_CHAINING,
            "logs": PatternType.PROMPT_CHAINING,
            "behavioral": PatternType.PROMPT_CHAINING,
            "risk_assessment": PatternType.PROMPT_CHAINING,
            "comprehensive": PatternType.ORCHESTRATOR_WORKERS,
            "fraud_investigation": PatternType.ORCHESTRATOR_WORKERS,
            "parallel_analysis": PatternType.PARALLELIZATION,
            "quality_assurance": PatternType.EVALUATOR_OPTIMIZER,
            "routing": PatternType.ROUTING,
        }
    
    async def execute_agent(
        self,
        agent: Union[BasePattern, Any],
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> Any:
        """
        Execute an agent (pattern-based or legacy) with unified interface.
        
        Args:
            agent: Agent instance to execute
            messages: Messages to process
            context: Execution context
            
        Returns:
            Execution result
        """
        
        if isinstance(agent, BasePattern):
            # Execute pattern-based agent
            result = await agent.execute_with_metrics(messages, context)
            
            # Update usage statistics
            if hasattr(agent, 'pattern_type'):
                self.pattern_registry.update_usage_stats(
                    agent.pattern_type, 
                    result.metrics
                )
            
            return result
        else:
            # Execute legacy agent
            return await self._execute_legacy_agent(agent, messages, context)
    
    async def _execute_legacy_agent(
        self,
        agent: Any,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a legacy agent with compatibility wrapper"""
        
        try:
            if hasattr(agent, 'execute'):
                result = await agent.execute(messages, context)
            elif hasattr(agent, 'analyze'):
                # Some legacy agents use 'analyze' method
                entity_id = context.get("entity_id", "")
                result = await agent.analyze(entity_id, context)
            else:
                # Generic execution for basic agents
                result = {
                    "success": True,
                    "result": f"Legacy agent {type(agent).__name__} executed",
                    "confidence": 0.5
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Legacy agent execution failed: {str(e)}")
            return {
                "success": False,
                "result": None,
                "error": str(e),
                "confidence": 0.0
            }
    
    def get_available_patterns(self) -> List[str]:
        """Get list of available pattern types"""
        return [pt.value for pt in self.pattern_registry.get_available_patterns()]
    
    def get_factory_stats(self) -> Dict[str, Any]:
        """Get factory statistics"""
        return {
            "available_patterns": len(self.pattern_registry.get_available_patterns()),
            "pattern_usage": self.pattern_registry.get_usage_stats(),
            "feature_flags_enabled": self.feature_flags is not None,
            "registry_info": self.pattern_registry.get_registry_info()
        }


class LegacyAgentWrapper:
    """Wrapper for legacy agents to provide consistent interface"""
    
    def __init__(
        self,
        agent_type: str,
        context: Dict[str, Any],
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[WebSocketStreamingService] = None
    ):
        self.agent_type = agent_type
        self.context = context
        self.tools = tools or []
        self.ws_streaming = ws_streaming
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute legacy agent functionality"""
        
        # Simulate legacy agent behavior
        entity_id = context.get("entity_id", "unknown")
        
        result = {
            "agent_type": self.agent_type,
            "entity_id": entity_id,
            "analysis": f"Legacy {self.agent_type} analysis for {entity_id}",
            "risk_score": 0.5,
            "recommendations": [f"Review {self.agent_type} indicators"],
            "confidence": 0.6,
            "legacy_execution": True
        }
        
        return {
            "success": True,
            "result": result,
            "confidence": 0.6
        }


# Global factory instance
_agent_factory: Optional[AgentFactory] = None


def get_agent_factory() -> AgentFactory:
    """Get the global agent factory instance"""
    global _agent_factory
    
    if _agent_factory is None:
        _agent_factory = AgentFactory()
    
    return _agent_factory


def create_agent(
    agent_type: str,
    context: Dict[str, Any],
    ws_streaming: Optional[WebSocketStreamingService] = None,
    tools: Optional[List[Any]] = None,
) -> Union[BasePattern, Any]:
    """Convenience function to create an agent"""
    factory = get_agent_factory()
    return factory.create_agent(agent_type, context, ws_streaming, tools)


async def execute_agent(
    agent: Union[BasePattern, Any],
    messages: List[BaseMessage],
    context: Dict[str, Any]
) -> Any:
    """Convenience function to execute an agent"""
    factory = get_agent_factory()
    return await factory.execute_agent(agent, messages, context)