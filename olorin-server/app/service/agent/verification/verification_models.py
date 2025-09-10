#!/usr/bin/env python3
"""
Verification Models Manager

Manages multiple verification models with intelligent selection
based on cost, speed, and accuracy requirements.
Provides model initialization, fallback mechanisms, and optimization.

Author: Gil Klainert
Date: 2025-01-10
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from .verification_config import VerificationConfig, VerificationModel, get_verification_config

logger = logging.getLogger(__name__)


class ModelPriority(Enum):
    """Model selection priorities."""
    COST_EFFECTIVE = "cost_effective"
    SPEED_OPTIMIZED = "speed_optimized"
    ACCURACY_FIRST = "accuracy_first"
    BALANCED = "balanced"


@dataclass
class ModelResponse:
    """Standardized response from verification model."""
    content: str
    model_used: str
    response_time_ms: int
    tokens_used: Optional[int] = None
    cost_estimate: Optional[float] = None
    confidence_score: Optional[float] = None
    error: Optional[str] = None


class VerificationModels:
    """
    Manages verification model selection and initialization.
    
    Provides intelligent model selection based on various criteria,
    handles model initialization, and manages fallback mechanisms.
    """
    
    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize verification models manager."""
        self.config = config or get_verification_config()
        self.initialized_models: Dict[VerificationModel, Any] = {}
        self.model_health: Dict[VerificationModel, bool] = {}
        
        logger.info(f"🤖 Initializing verification models manager")
        self._initialize_available_models()
        
    def _initialize_available_models(self):
        """Initialize all available models based on API key availability."""
        available_models = self.config.get_available_models()
        
        for model in available_models:
            try:
                initialized_model = self._create_model_instance(model)
                if initialized_model:
                    self.initialized_models[model] = initialized_model
                    self.model_health[model] = True
                    logger.info(f"✅ Initialized verification model: {model.value}")
                else:
                    logger.warning(f"⚠️  Failed to initialize model: {model.value}")
                    
            except Exception as e:
                logger.error(f"❌ Error initializing model {model.value}: {str(e)}")
                self.model_health[model] = False
        
        if not self.initialized_models:
            raise RuntimeError("No verification models could be initialized! Check API keys.")
        
        logger.info(f"🎯 Successfully initialized {len(self.initialized_models)} verification models")
    
    def _create_model_instance(self, model: VerificationModel) -> Optional[Any]:
        """Create and configure a specific model instance."""
        model_config = self.config.get_model_config(model)
        
        try:
            if model == VerificationModel.GEMINI_FLASH:
                return ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=self.config.google_api_key,
                    temperature=0.1,
                    max_tokens=model_config.max_tokens,
                    timeout=model_config.timeout_seconds
                )
                
            elif model == VerificationModel.CLAUDE_HAIKU:
                return ChatAnthropic(
                    model="claude-3-haiku-20240307",
                    anthropic_api_key=self.config.anthropic_api_key,
                    temperature=0.1,
                    max_tokens=model_config.max_tokens,
                    timeout=model_config.timeout_seconds
                )
                
            elif model == VerificationModel.GPT_3_5_TURBO:
                return ChatOpenAI(
                    model="gpt-3.5-turbo",
                    openai_api_key=self.config.openai_api_key,
                    temperature=0.1,
                    max_tokens=model_config.max_tokens,
                    request_timeout=model_config.timeout_seconds
                )
                
            elif model == VerificationModel.GPT_4_MINI:
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    openai_api_key=self.config.openai_api_key,
                    temperature=0.1,
                    max_tokens=model_config.max_tokens,
                    request_timeout=model_config.timeout_seconds
                )
                
        except Exception as e:
            logger.error(f"Failed to create model instance for {model.value}: {str(e)}")
            return None
    
    def select_optimal_model(
        self,
        priority: ModelPriority = ModelPriority.COST_EFFECTIVE,
        exclude_models: Optional[List[VerificationModel]] = None
    ) -> VerificationModel:
        """
        Select the optimal model based on priority and availability.
        
        Args:
            priority: Selection priority criteria
            exclude_models: Models to exclude from selection
            
        Returns:
            Selected verification model
        """
        exclude_models = exclude_models or []
        available_models = [
            model for model in self.initialized_models.keys()
            if self.model_health.get(model, False) and model not in exclude_models
        ]
        
        if not available_models:
            raise RuntimeError("No healthy verification models available!")
        
        # If primary model is healthy and not excluded, prefer it
        if self.config.primary_model in available_models:
            return self.config.primary_model
        
        # Select based on priority
        if priority == ModelPriority.COST_EFFECTIVE:
            return self._select_most_cost_effective(available_models)
        elif priority == ModelPriority.SPEED_OPTIMIZED:
            return self._select_fastest(available_models)
        elif priority == ModelPriority.ACCURACY_FIRST:
            return self._select_most_accurate(available_models)
        else:  # BALANCED
            return self._select_balanced(available_models)
    
    def _select_most_cost_effective(self, models: List[VerificationModel]) -> VerificationModel:
        """Select model with lowest cost per token."""
        return min(models, key=lambda m: self.config.get_model_config(m).cost_per_1k_tokens)
    
    def _select_fastest(self, models: List[VerificationModel]) -> VerificationModel:
        """Select model with highest speed rating."""
        return max(models, key=lambda m: self.config.get_model_config(m).speed_rating)
    
    def _select_most_accurate(self, models: List[VerificationModel]) -> VerificationModel:
        """Select model with highest accuracy rating."""
        return max(models, key=lambda m: self.config.get_model_config(m).accuracy_rating)
    
    def _select_balanced(self, models: List[VerificationModel]) -> VerificationModel:
        """Select model with best balance of speed, accuracy, and cost."""
        def balance_score(model: VerificationModel) -> float:
            config = self.config.get_model_config(model)
            # Higher is better for speed and accuracy, lower is better for cost
            cost_score = 1.0 / (config.cost_per_1k_tokens * 1000 + 1)  # Normalize cost
            return (config.speed_rating + config.accuracy_rating + cost_score * 5) / 3
        
        return max(models, key=balance_score)
    
    async def verify_with_model(
        self,
        model: VerificationModel,
        verification_prompt: str,
        context: Dict[str, Any] = None
    ) -> ModelResponse:
        """
        Use a specific model for verification.
        
        Args:
            model: Model to use for verification
            verification_prompt: Prompt for verification
            context: Additional context for the verification
            
        Returns:
            Model response with verification result
        """
        if model not in self.initialized_models:
            raise ValueError(f"Model {model.value} not initialized")
        
        if not self.model_health.get(model, False):
            raise ValueError(f"Model {model.value} is unhealthy")
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            llm = self.initialized_models[model]
            model_config = self.config.get_model_config(model)
            
            # Prepare messages for verification
            messages = [
                SystemMessage(content=self._get_verification_system_prompt()),
                HumanMessage(content=verification_prompt)
            ]
            
            # Invoke model
            response = await llm.ainvoke(messages)
            
            end_time = asyncio.get_event_loop().time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            # Parse response content
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Extract structured verification result
            verification_result = self._parse_verification_response(content)
            
            # Calculate cost estimate
            estimated_tokens = len(verification_prompt.split()) * 1.3  # Rough estimate
            cost_estimate = (estimated_tokens / 1000) * model_config.cost_per_1k_tokens
            
            return ModelResponse(
                content=content,
                model_used=model.value,
                response_time_ms=response_time_ms,
                tokens_used=int(estimated_tokens),
                cost_estimate=cost_estimate,
                confidence_score=verification_result.get('confidence_score'),
                error=None
            )
            
        except Exception as e:
            end_time = asyncio.get_event_loop().time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            # Mark model as unhealthy
            self.model_health[model] = False
            logger.error(f"❌ Model {model.value} failed: {str(e)}")
            
            return ModelResponse(
                content="",
                model_used=model.value,
                response_time_ms=response_time_ms,
                error=str(e)
            )
    
    async def verify_with_best_model(
        self,
        verification_prompt: str,
        priority: ModelPriority = ModelPriority.COST_EFFECTIVE,
        context: Dict[str, Any] = None
    ) -> ModelResponse:
        """
        Verify using the best available model based on priority.
        
        Args:
            verification_prompt: Prompt for verification
            priority: Model selection priority
            context: Additional context
            
        Returns:
            Model response with verification result
        """
        excluded_models = []
        max_attempts = len(self.initialized_models)
        
        for attempt in range(max_attempts):
            try:
                selected_model = self.select_optimal_model(priority, excluded_models)
                
                logger.debug(f"🔍 Attempting verification with {selected_model.value} (attempt {attempt + 1})")
                
                response = await self.verify_with_model(
                    model=selected_model,
                    verification_prompt=verification_prompt,
                    context=context
                )
                
                if response.error is None:
                    logger.debug(f"✅ Verification successful with {selected_model.value}")
                    return response
                else:
                    logger.warning(f"⚠️  Model {selected_model.value} returned error: {response.error}")
                    excluded_models.append(selected_model)
                    
            except Exception as e:
                logger.error(f"❌ Error with model selection/verification: {str(e)}")
                if len(excluded_models) < len(self.initialized_models):
                    excluded_models.append(selected_model)
                else:
                    break
        
        # If all models failed, return error response
        return ModelResponse(
            content="",
            model_used="none",
            response_time_ms=0,
            error="All verification models failed"
        )
    
    def _get_verification_system_prompt(self) -> str:
        """Get the system prompt for verification models."""
        return """You are an LLM response verification specialist. Your job is to analyze whether an LLM response properly addresses the original user request.

Your task:
1. Compare the original user request with the LLM response
2. Determine if the response adequately addresses the request
3. Identify any issues, inaccuracies, or misalignments
4. Provide a confidence score from 0.0 to 1.0
5. If the response is inadequate, explain specifically what needs improvement

Respond in JSON format:
{
    "is_valid": boolean,
    "confidence_score": float (0.0-1.0),
    "explanation": "Detailed explanation of your assessment",
    "issues": ["list", "of", "specific", "issues", "if", "any"],
    "suggestions": ["specific", "suggestions", "for", "improvement"]
}

Be thorough but concise. Focus on accuracy, relevance, and completeness."""
    
    def _parse_verification_response(self, content: str) -> Dict[str, Any]:
        """Parse verification response and extract structured data."""
        try:
            # Try to parse as JSON
            if content.strip().startswith('{'):
                return json.loads(content.strip())
            
            # Fallback: extract key information using heuristics
            is_valid = any(phrase in content.lower() for phrase in ['valid', 'correct', 'accurate', 'appropriate'])
            confidence = 0.5  # Default confidence
            
            # Try to extract confidence score
            import re
            conf_match = re.search(r'confidence[:\s]+([0-9.]+)', content.lower())
            if conf_match:
                try:
                    confidence = float(conf_match.group(1))
                    if confidence > 1.0:
                        confidence = confidence / 100  # Convert percentage
                except ValueError:
                    pass
            
            return {
                'is_valid': is_valid,
                'confidence_score': confidence,
                'explanation': content[:500],  # Truncate for safety
                'issues': [],
                'suggestions': []
            }
            
        except Exception as e:
            logger.error(f"Failed to parse verification response: {str(e)}")
            return {
                'is_valid': False,
                'confidence_score': 0.0,
                'explanation': f"Failed to parse response: {content[:200]}...",
                'issues': ['parsing_error'],
                'suggestions': []
            }
    
    def get_model_health_status(self) -> Dict[str, Any]:
        """Get health status of all models."""
        return {
            'healthy_models': [m.value for m, healthy in self.model_health.items() if healthy],
            'unhealthy_models': [m.value for m, healthy in self.model_health.items() if not healthy],
            'total_models': len(self.initialized_models),
            'health_percentage': sum(self.model_health.values()) / len(self.model_health) if self.model_health else 0.0
        }
    
    def mark_model_healthy(self, model: VerificationModel):
        """Mark a model as healthy (useful for recovery)."""
        if model in self.initialized_models:
            self.model_health[model] = True
            logger.info(f"✅ Marked model {model.value} as healthy")
    
    def mark_model_unhealthy(self, model: VerificationModel, reason: str = ""):
        """Mark a model as unhealthy."""
        if model in self.initialized_models:
            self.model_health[model] = False
            logger.warning(f"❌ Marked model {model.value} as unhealthy: {reason}")
    
    async def health_check_all_models(self) -> Dict[VerificationModel, bool]:
        """Perform health check on all models."""
        health_results = {}
        test_prompt = "Test verification: Is the response 'Hello world' appropriate for the request 'Say hello'?"
        
        for model in self.initialized_models.keys():
            try:
                response = await self.verify_with_model(model, test_prompt)
                is_healthy = response.error is None
                self.model_health[model] = is_healthy
                health_results[model] = is_healthy
                
                if is_healthy:
                    logger.debug(f"✅ Health check passed for {model.value}")
                else:
                    logger.warning(f"❌ Health check failed for {model.value}: {response.error}")
                    
            except Exception as e:
                self.model_health[model] = False
                health_results[model] = False
                logger.error(f"❌ Health check error for {model.value}: {str(e)}")
        
        return health_results