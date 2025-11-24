"""
Orchestrator Prompt System for Structured Investigation

Main orchestration prompt system providing bulletproof AI decision-making
with sophisticated, context-aware prompt generation.
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass

# Removed circular import - OrchestrationStrategy not needed here


class PromptStrategy(Enum):
    """Prompt strategy types for different investigation contexts"""
    STANDARD = "standard"
    HIGH_RISK = "high_risk" 
    DEGRADED = "degraded"
    EMERGENCY = "emergency"
    MULTI_ENTITY = "multi_entity"


@dataclass
class PromptContext:
    """Context information for dynamic prompt generation"""
    investigation_id: str
    entity_type: str
    entity_id: str
    risk_level: str
    available_data: Dict[str, Any]
    service_health: Dict[str, bool]
    investigation_history: List[str]
    time_constraints: Optional[int] = None


class OrchestratorPromptSystem:
    """
    Advanced prompt management system for orchestrator decision making.
    Provides contextual, bulletproof prompts with dynamic adaptation.
    """
    
    def __init__(self):
        from .prompt_templates import PromptTemplateManager
        from .agent_coordination_prompts import AgentCoordinationManager
        from .fallback_prompts import FallbackPromptManager
        
        self.template_manager = PromptTemplateManager()
        self.agent_manager = AgentCoordinationManager()
        self.fallback_manager = FallbackPromptManager()
        
    def generate_orchestration_prompt(
        self, 
        context: PromptContext,
        strategy_hint: Optional[PromptStrategy] = None
    ) -> str:
        """
        Generate contextual orchestration prompt with bulletproof resilience.
        
        Args:
            context: Investigation context for prompt customization
            strategy_hint: Optional strategy override for specific scenarios
            
        Returns:
            Comprehensive orchestration prompt with context integration
        """
        
        # Determine optimal prompt strategy
        prompt_strategy = strategy_hint or self._determine_prompt_strategy(context)
        
        # Get base template
        base_template = self.template_manager.get_template(prompt_strategy)
        
        # Apply dynamic context integration
        contextualized_prompt = self._apply_context_integration(
            base_template, context, prompt_strategy
        )
        
        # Add bulletproof fallback instructions
        bulletproof_prompt = self._add_bulletproof_instructions(
            contextualized_prompt, context
        )
        
        return bulletproof_prompt
    
    def generate_agent_coordination_prompt(
        self, 
        agent_name: str, 
        coordination_context: Dict[str, Any]
    ) -> str:
        """Generate specialized prompt for agent coordination"""
        
        return self.agent_manager.get_agent_prompt(agent_name, coordination_context)
    
    def generate_fallback_prompt(self, error_context: Dict[str, Any]) -> str:
        """Generate bulletproof fallback prompt for error scenarios"""
        
        return self.fallback_manager.get_fallback_prompt(error_context)
    
    def _determine_prompt_strategy(self, context: PromptContext) -> PromptStrategy:
        """Intelligently determine optimal prompt strategy"""
        
        # High-risk scenarios require enhanced prompts
        if context.risk_level in ["high", "critical"]:
            return PromptStrategy.HIGH_RISK
            
        # Service degradation requires adapted prompts  
        if not all(context.service_health.values()):
            return PromptStrategy.DEGRADED
            
        # Emergency time constraints
        if context.time_constraints and context.time_constraints < 60:
            return PromptStrategy.EMERGENCY
            
        # Multi-entity investigations
        if "multi_entity" in str(context.available_data):
            return PromptStrategy.MULTI_ENTITY
            
        return PromptStrategy.STANDARD
    
    def _apply_context_integration(
        self, 
        template: str, 
        context: PromptContext, 
        strategy: PromptStrategy
    ) -> str:
        """Apply dynamic context to prompt template"""
        
        context_vars = {
            "investigation_id": context.investigation_id,
            "entity_type": context.entity_type,
            "entity_id": context.entity_id,
            "risk_level": context.risk_level,
            "available_data": json.dumps(context.available_data, default=str),
            "service_health": json.dumps(context.service_health),
            "investigation_history": json.dumps(context.investigation_history),
            "timestamp": datetime.now().isoformat(),
            "context_strategy": strategy.value,
            "time_constraint": context.time_constraints or "none"
        }
        
        return template.format(**context_vars)
    
    def _add_bulletproof_instructions(
        self, 
        prompt: str, 
        context: PromptContext
    ) -> str:
        """Add bulletproof resilience instructions to prompt"""
        
        bulletproof_suffix = f"""

BULLETPROOF OPERATION REQUIREMENTS:
- NEVER fail to provide a decision regardless of data quality or service issues
- Always include confidence_score reflecting data quality and completeness
- Provide actionable reasoning even with limited information  
- Include appropriate bulletproof_requirements for identified risk scenarios
- Adapt strategy recommendations based on service_health: {json.dumps(context.service_health)}

FALLBACK DECISION TEMPLATE (use if unable to make optimal decision):
{{
    "strategy": "comprehensive",
    "agents_to_activate": ["network", "device", "risk"],
    "execution_order": ["risk", "network", "device"],
    "confidence_score": 0.6,
    "reasoning": "Fallback comprehensive strategy due to [specific limitation]",
    "estimated_duration": 180,
    "risk_assessment": "medium", 
    "bulletproof_requirements": ["circuit_breaker", "retry_logic", "fail_soft", "degraded_mode"]
}}

CRITICAL: Respond with valid JSON matching the required format. Never return partial or malformed JSON.
"""
        
        return prompt + bulletproof_suffix