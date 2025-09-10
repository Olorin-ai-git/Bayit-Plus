#!/usr/bin/env python3
"""
Core LLM Verification Service

Main orchestrator for LLM response verification with iterative improvement,
caching, metrics, and comprehensive error handling.

Author: Gil Klainert
Date: 2025-01-10
"""

import asyncio
import hashlib
import logging
import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage

from .verification_config import VerificationConfig, get_verification_config
from .verification_models import VerificationModels, ModelPriority
from .verification_cache import VerificationCache
from .verification_logger import VerificationLogger
from .verification_metrics import VerificationMetrics
from .iterative_improver import (
    IterativeImprover, 
    IterationContext, 
    ImprovementStrategy
)

logger = logging.getLogger(__name__)


class VerificationResult(Enum):
    """Verification result types."""
    VALID = "valid"
    INVALID = "invalid"
    REQUIRES_RETRY = "requires_retry"
    ERROR = "error"
    BYPASSED = "bypassed"


@dataclass
class VerificationResponse:
    """Comprehensive verification response."""
    result: VerificationResult
    confidence_score: float
    explanation: str
    suggestions: List[str]
    verification_time_ms: int
    verification_model: str
    retry_count: int = 0
    cache_hit: bool = False
    cost_estimate: float = 0.0
    error_details: Optional[str] = None
    improvement_strategy: Optional[str] = None
    
    # Compatibility properties for existing tests
    @property
    def is_valid(self) -> bool:
        """Check if verification result is valid (compatibility property)."""
        return self.result == VerificationResult.VALID
    
    @property
    def attempt_count(self) -> int:
        """Get attempt count (compatibility property)."""
        return self.retry_count
    
    @property
    def issues(self) -> List[str]:
        """Get issues list (compatibility property)."""
        return self.suggestions if not self.is_valid else []
    
    @property
    def cached(self) -> bool:
        """Check if result was cached (compatibility property)."""
        return self.cache_hit
    
    @property
    def total_time_ms(self) -> int:
        """Get total time in ms (compatibility property)."""
        return self.verification_time_ms


class LLMVerificationService:
    """
    Advanced LLM verification service with iterative improvement.
    
    This service orchestrates the complete verification pipeline:
    1. Cache checking for performance
    2. Verification with selected models
    3. Iterative improvement on failures
    4. Comprehensive logging and metrics
    5. Error handling and recovery
    """
    
    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize LLM verification service."""
        self.config = config or get_verification_config()
        
        # Initialize components
        self.models = VerificationModels(self.config)
        self.cache = VerificationCache(self.config)
        self.logger = VerificationLogger(self.config)
        self.metrics = VerificationMetrics(self.config)
        self.improver = IterativeImprover(self.config)
        
        # Service state
        self.service_id = str(uuid.uuid4())[:8]
        self.start_time = time.time()
        self.active_verifications: Dict[str, Dict[str, Any]] = {}
        
        logger.info(f"🔍 LLM Verification Service initialized - ID: {self.service_id}")
        logger.info(f"   Enabled: {self.config.enabled}")
        logger.info(f"   Primary Model: {self.config.primary_model.value}")
        logger.info(f"   Cache Enabled: {self.config.cache_enabled}")
        logger.info(f"   Max Retries: {self.config.max_retries}")
        
        # Log model availability
        available_models = self.models.get_model_health_status()
        logger.info(f"   Available Models: {available_models['healthy_models']}")
        
        if not available_models['healthy_models']:
            logger.error("❌ No healthy verification models available!")
    
    async def verify_response_with_retry(
        self,
        original_request: List[BaseMessage],
        response: str,
        context: Dict[str, Any] = None,
        max_retries: Optional[int] = None,
        llm_invoke_function = None
    ) -> Tuple[str, VerificationResponse]:
        """
        Main verification method with comprehensive iterative improvement.
        
        Args:
            original_request: Original messages sent to the main LLM
            response: Response from the main LLM to verify
            context: Additional context for verification
            max_retries: Maximum retry attempts (overrides config)
            llm_invoke_function: Function to call main LLM for retries
            
        Returns:
            Tuple of (final_response, verification_details)
        """
        if not self.config.enabled:
            return response, VerificationResponse(
                result=VerificationResult.BYPASSED,
                confidence_score=1.0,
                explanation="Verification disabled by configuration",
                suggestions=[],
                verification_time_ms=0,
                verification_model="none",
                cache_hit=False
            )
        
        verification_id = self._generate_verification_id(original_request, response)
        max_retries = max_retries or self.config.max_retries
        
        # Track active verification
        self.active_verifications[verification_id] = {
            'start_time': time.time(),
            'attempt': 0,
            'max_retries': max_retries
        }
        
        try:
            result = await self._execute_verification_pipeline(
                verification_id=verification_id,
                original_request=original_request,
                response=response,
                context=context or {},
                max_retries=max_retries,
                llm_invoke_function=llm_invoke_function
            )
            
            # Clean up tracking
            if verification_id in self.active_verifications:
                del self.active_verifications[verification_id]
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Verification pipeline failed for {verification_id}: {str(e)}")
            
            # Clean up tracking
            if verification_id in self.active_verifications:
                del self.active_verifications[verification_id]
            
            # Return error response
            error_response = VerificationResponse(
                result=VerificationResult.ERROR,
                confidence_score=0.0,
                explanation=f"Verification system error: {str(e)}",
                suggestions=["Retry verification or check system status"],
                verification_time_ms=0,
                verification_model="error",
                error_details=str(e)
            )
            
            return response, error_response
    
    async def _execute_verification_pipeline(
        self,
        verification_id: str,
        original_request: List[BaseMessage],
        response: str,
        context: Dict[str, Any],
        max_retries: int,
        llm_invoke_function = None
    ) -> Tuple[str, VerificationResponse]:
        """Execute the complete verification pipeline with retry logic."""
        current_response = response
        iteration_context = IterationContext(
            original_request=original_request,
            original_response=response,
            verification_history=[],
            improvement_attempts=[],
            failed_strategies=[],
            context=context
        )
        
        for attempt in range(max_retries + 1):
            self.active_verifications[verification_id]['attempt'] = attempt
            
            # Log attempt
            if attempt == 0:
                self.logger.log_verification_start(
                    verification_id=verification_id,
                    model_used="pending",
                    original_request_hash=self._hash_messages(original_request),
                    response_hash=self._hash_string(current_response),
                    context=context
                )
            else:
                self.logger.log_verification_retry(
                    verification_id=verification_id,
                    attempt_number=attempt,
                    reason="Previous verification failed",
                    model_used="pending"
                )
            
            # Perform single verification attempt
            verification_result = await self._perform_single_verification(
                verification_id=verification_id,
                original_request=original_request,
                response=current_response,
                context=context,
                attempt=attempt
            )
            
            # Add to history
            iteration_context.verification_history.append({
                'attempt': attempt,
                'result': verification_result.result.value,
                'confidence_score': verification_result.confidence_score,
                'explanation': verification_result.explanation,
                'suggestions': verification_result.suggestions
            })
            
            # Check if verification passed
            if verification_result.result == VerificationResult.VALID:
                self.logger.log_verification_success(
                    verification_id=verification_id,
                    model_used=verification_result.verification_model,
                    original_request_hash=self._hash_messages(original_request),
                    response_hash=self._hash_string(current_response),
                    confidence_score=verification_result.confidence_score,
                    response_time_ms=verification_result.verification_time_ms,
                    retry_count=attempt,
                    context=context
                )
                
                self.metrics.record_verification_success(
                    verification_id=verification_id,
                    model=verification_result.verification_model,
                    response_time_ms=verification_result.verification_time_ms,
                    confidence_score=verification_result.confidence_score,
                    retry_count=attempt,
                    cost_usd=verification_result.cost_estimate
                )
                
                verification_result.retry_count = attempt
                return current_response, verification_result
            
            # If verification failed and we have retries left, try to improve
            if (verification_result.result == VerificationResult.REQUIRES_RETRY and 
                attempt < max_retries and 
                llm_invoke_function is not None):
                
                try:
                    # Generate improvement suggestions
                    suggestions = self.improver.analyze_verification_failure(
                        verification_result={
                            'issues': verification_result.suggestions,
                            'explanation': verification_result.explanation,
                            'confidence_score': verification_result.confidence_score
                        },
                        context=context
                    )
                    
                    # Create improved request
                    improved_request = self.improver.create_improvement_request(
                        iteration_context=iteration_context,
                        suggestions=suggestions,
                        current_attempt=attempt + 1
                    )
                    
                    # Get improved response from main LLM
                    improved_response = await self._invoke_main_llm(
                        llm_invoke_function,
                        improved_request
                    )
                    
                    # Track the improvement strategy used
                    selected_strategy = suggestions[0].strategy if suggestions else None
                    if selected_strategy:
                        iteration_context.failed_strategies.append(selected_strategy)
                        verification_result.improvement_strategy = selected_strategy.value
                    
                    iteration_context.improvement_attempts.append(improved_response)
                    current_response = improved_response
                    
                    # Add delay before next attempt
                    delay = self.improver.calculate_retry_delay(attempt + 1)
                    if delay > 0:
                        await asyncio.sleep(delay)
                    
                    continue
                    
                except Exception as e:
                    logger.error(f"Failed to generate improved response: {str(e)}")
                    # Continue with verification failure
                    break
            
            # No more retries or can't improve - verification failed
            break
        
        # All attempts exhausted - log final failure
        self.logger.log_verification_failure(
            verification_id=verification_id,
            model_used=verification_result.verification_model,
            original_request_hash=self._hash_messages(original_request),
            response_hash=self._hash_string(current_response),
            error=verification_result.explanation,
            response_time_ms=verification_result.verification_time_ms,
            retry_count=max_retries,
            context=context
        )
        
        self.metrics.record_verification_failure(
            verification_id=verification_id,
            model=verification_result.verification_model,
            response_time_ms=verification_result.verification_time_ms,
            error_type="verification_failed",
            retry_count=max_retries,
            cost_usd=verification_result.cost_estimate
        )
        
        verification_result.retry_count = max_retries
        return current_response, verification_result
    
    async def _perform_single_verification(
        self,
        verification_id: str,
        original_request: List[BaseMessage],
        response: str,
        context: Dict[str, Any],
        attempt: int
    ) -> VerificationResponse:
        """Perform a single verification attempt."""
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = self.cache.generate_key(original_request, response, context)
            cached_result = await self.cache.get(cache_key)
            
            if cached_result:
                self.logger.log_cache_hit(cache_key)
                self.metrics.record_cache_hit()
                
                return VerificationResponse(
                    result=VerificationResult(cached_result['result']),
                    confidence_score=cached_result['confidence_score'],
                    explanation=cached_result['explanation'],
                    suggestions=cached_result.get('suggestions', []),
                    verification_time_ms=int((time.time() - start_time) * 1000),
                    verification_model=cached_result.get('model', 'cached'),
                    cache_hit=True
                )
            
            self.metrics.record_cache_miss()
            
            # Create verification prompt
            verification_prompt = self._create_verification_prompt(
                original_request=original_request,
                response=response,
                context=context
            )
            
            # Select and use verification model
            model_response = await self.models.verify_with_best_model(
                verification_prompt=verification_prompt,
                priority=ModelPriority.COST_EFFECTIVE,
                context=context
            )
            
            # Parse verification response
            if model_response.error:
                raise Exception(f"Model error: {model_response.error}")
            
            verification_data = self._parse_verification_content(model_response.content)
            
            # Create verification response
            end_time = time.time()
            verification_response = VerificationResponse(
                result=VerificationResult.VALID if verification_data['is_valid'] else VerificationResult.REQUIRES_RETRY,
                confidence_score=verification_data['confidence_score'],
                explanation=verification_data['explanation'],
                suggestions=verification_data.get('issues', []),
                verification_time_ms=int((end_time - start_time) * 1000),
                verification_model=model_response.model_used,
                cost_estimate=model_response.cost_estimate or 0.0
            )
            
            # Cache the result if it's valid or has high confidence
            if (verification_response.result == VerificationResult.VALID or 
                verification_response.confidence_score >= 0.7):
                
                cache_data = {
                    'result': verification_response.result.value,
                    'confidence_score': verification_response.confidence_score,
                    'explanation': verification_response.explanation,
                    'suggestions': verification_response.suggestions,
                    'model': verification_response.verification_model
                }
                
                await self.cache.set(cache_key, cache_data, model_response.model_used)
            
            return verification_response
            
        except Exception as e:
            end_time = time.time()
            logger.error(f"Verification attempt failed: {str(e)}")
            
            return VerificationResponse(
                result=VerificationResult.ERROR,
                confidence_score=0.0,
                explanation=f"Verification error: {str(e)}",
                suggestions=["Retry verification"],
                verification_time_ms=int((end_time - start_time) * 1000),
                verification_model="error",
                error_details=str(e)
            )
    
    def _create_verification_prompt(
        self,
        original_request: List[BaseMessage],
        response: str,
        context: Dict[str, Any]
    ) -> str:
        """Create comprehensive verification prompt."""
        # Extract content from messages
        request_parts = []
        for message in original_request:
            if hasattr(message, 'content') and message.content:
                message_type = type(message).__name__.replace('Message', '').upper()
                request_parts.append(f"[{message_type}]: {message.content}")
        
        request_text = "\n".join(request_parts)
        
        # Build verification prompt
        prompt = f"""Please verify if the following LLM response appropriately addresses the original user request.

ORIGINAL REQUEST:
{request_text}

LLM RESPONSE TO VERIFY:
{response}

"""
        
        # Add context if available
        if context:
            # Filter context to include only relevant verification information
            relevant_context = {}
            for key, value in context.items():
                if key in ['tool_name', 'entity_type', 'investigation_type', 'language', 'format', 'expected_output']:
                    relevant_context[key] = value
            
            if relevant_context:
                prompt += f"ADDITIONAL CONTEXT:\n"
                for key, value in relevant_context.items():
                    prompt += f"- {key}: {value}\n"
                prompt += "\n"
        
        prompt += """VERIFICATION TASK:
Analyze whether the LLM response:
1. Directly addresses the original request
2. Provides accurate and relevant information
3. Follows any specified format or constraints
4. Is complete and comprehensive
5. Is appropriate for the given context

Please respond with a JSON object containing:
{
    "is_valid": boolean,
    "confidence_score": float (0.0-1.0),
    "explanation": "Detailed explanation of your assessment",
    "issues": ["list", "of", "specific", "issues", "if", "any"],
    "suggestions": ["specific", "suggestions", "for", "improvement"]
}

Be thorough but concise. Focus on accuracy, relevance, and completeness."""
        
        return prompt
    
    def _parse_verification_content(self, content: str) -> Dict[str, Any]:
        """Parse verification model response content."""
        try:
            # Try to parse as JSON
            import json
            if content.strip().startswith('{'):
                return json.loads(content.strip())
            
            # Fallback parsing using heuristics
            is_valid = any(phrase in content.lower() 
                          for phrase in ['valid', 'correct', 'accurate', 'appropriate', 'addresses'])
            
            # Extract confidence score
            confidence = 0.5  # Default
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
                'explanation': content[:1000],  # Truncate for safety
                'issues': [],
                'suggestions': []
            }
            
        except Exception as e:
            logger.error(f"Failed to parse verification response: {str(e)}")
            return {
                'is_valid': False,
                'confidence_score': 0.0,
                'explanation': f"Failed to parse verification response: {content[:200]}...",
                'issues': ['parsing_error'],
                'suggestions': ['Retry verification with different model']
            }
    
    async def _invoke_main_llm(
        self,
        llm_invoke_function,
        improved_request: List[BaseMessage]
    ) -> str:
        """Invoke main LLM with improved request."""
        try:
            # Call the provided LLM function
            result = await llm_invoke_function(improved_request)
            
            # Extract response text based on result format
            if isinstance(result, dict):
                return result.get('response', str(result))
            elif hasattr(result, 'content'):
                return result.content
            else:
                return str(result)
                
        except Exception as e:
            logger.error(f"Failed to invoke main LLM: {str(e)}")
            raise
    
    def _generate_verification_id(
        self,
        original_request: List[BaseMessage],
        response: str
    ) -> str:
        """Generate unique verification ID."""
        content = f"{self._hash_messages(original_request)}{self._hash_string(response)}{time.time()}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _hash_messages(self, messages: List[BaseMessage]) -> str:
        """Create hash of message list."""
        content = ""
        for message in messages:
            if hasattr(message, 'content'):
                content += message.content
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _hash_string(self, text: str) -> str:
        """Create hash of string."""
        return hashlib.md5(text.encode()).hexdigest()[:16]
    
    # Service status and health methods
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status."""
        uptime_seconds = time.time() - self.start_time
        model_health = self.models.get_model_health_status()
        cache_stats = self.cache.get_cache_stats()
        metrics_performance = self.metrics.get_current_performance()
        health_status = self.metrics.get_health_status()
        
        return {
            'service_id': self.service_id,
            'enabled': self.config.enabled,
            'uptime_seconds': round(uptime_seconds, 1),
            'active_verifications': len(self.active_verifications),
            'model_health': model_health,
            'cache_stats': cache_stats,
            'performance': metrics_performance,
            'health_status': health_status['status'],
            'configuration': {
                'primary_model': self.config.primary_model.value,
                'max_retries': self.config.max_retries,
                'cache_enabled': self.config.cache_enabled,
                'timeout_seconds': self.config.timeout_seconds
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        health_results = {
            'timestamp': time.time(),
            'service_healthy': True,
            'issues': []
        }
        
        # Check model health
        try:
            model_health = await self.models.health_check_all_models()
            healthy_models = sum(1 for h in model_health.values() if h)
            
            if healthy_models == 0:
                health_results['service_healthy'] = False
                health_results['issues'].append("No healthy verification models available")
            
            health_results['model_health'] = {
                model.value: healthy for model, healthy in model_health.items()
            }
            
        except Exception as e:
            health_results['service_healthy'] = False
            health_results['issues'].append(f"Model health check failed: {str(e)}")
        
        # Check cache health
        try:
            cache_health = await self.cache.health_check()
            if not cache_health['memory_cache_healthy']:
                health_results['issues'].append("Memory cache unhealthy")
            
            health_results['cache_health'] = cache_health
            
        except Exception as e:
            health_results['issues'].append(f"Cache health check failed: {str(e)}")
        
        # Check metrics health
        try:
            logger_health = self.logger.health_check()
            if not logger_health['logger_healthy']:
                health_results['service_healthy'] = False
                health_results['issues'].append("Logger unhealthy")
            
            health_results['logger_health'] = logger_health
            
        except Exception as e:
            health_results['issues'].append(f"Logger health check failed: {str(e)}")
        
        return health_results
    
    def get_active_verifications(self) -> Dict[str, Any]:
        """Get information about currently active verifications."""
        active_info = {}
        current_time = time.time()
        
        for verification_id, info in self.active_verifications.items():
            duration = current_time - info['start_time']
            active_info[verification_id] = {
                'duration_seconds': round(duration, 1),
                'current_attempt': info['attempt'],
                'max_retries': info['max_retries'],
                'progress': f"{info['attempt']}/{info['max_retries']} attempts"
            }
        
        return {
            'total_active': len(self.active_verifications),
            'verifications': active_info
        }


# Global service instance
_verification_service: Optional[LLMVerificationService] = None


def get_verification_service() -> LLMVerificationService:
    """Get the global verification service instance."""
    global _verification_service
    
    if _verification_service is None:
        _verification_service = LLMVerificationService()
    
    return _verification_service


async def verify_llm_response(
    original_request: List[BaseMessage],
    response: str,
    context: Dict[str, Any] = None,
    llm_invoke_function = None
) -> Tuple[str, VerificationResponse]:
    """
    Convenience function to verify an LLM response.
    
    Args:
        original_request: Original messages sent to the main LLM
        response: Response from the main LLM to verify
        context: Additional context for verification
        llm_invoke_function: Function to call main LLM for retries
        
    Returns:
        Tuple of (final_response, verification_details)
    """
    service = get_verification_service()
    return await service.verify_response_with_retry(
        original_request=original_request,
        response=response,
        context=context,
        llm_invoke_function=llm_invoke_function
    )