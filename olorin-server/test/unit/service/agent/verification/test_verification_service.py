#!/usr/bin/env python3
"""
Unit tests for LLM verification service.

Tests the core verification pipeline, retry logic, and integration points.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import HumanMessage, SystemMessage

from app.service.agent.verification.verification_service import (
    LLMVerificationService,
    VerificationResponse,
    VerificationResult
)
from app.service.agent.verification.verification_config import VerificationConfig


class TestVerificationResponse:
    """Test suite for VerificationResponse dataclass."""
    
    def test_verification_response_creation(self):
        """Test creating verification response."""
        response = VerificationResponse(
            result=VerificationResult.VALID,
            confidence_score=0.85,
            explanation="Response is accurate and relevant",
            suggestions=[],
            verification_time_ms=1200,
            verification_model="gemini-1.5-flash",
            retry_count=1,
            cache_hit=False
        )
        
        assert response.result == VerificationResult.VALID
        assert response.confidence_score == 0.85
        assert response.retry_count == 1
        assert response.cache_hit is False
        
    def test_failed_verification_response(self):
        """Test creating failed verification response."""
        response = VerificationResponse(
            result=VerificationResult.INVALID,
            confidence_score=0.3,
            explanation="Response does not address the question",
            suggestions=["Incomplete response", "Missing key information"],
            verification_model="gemini-1.5-flash",
            retry_count=2,
            verification_time_ms=2500,
            cache_hit=False
        )
        
        assert response.is_valid is False
        assert len(response.issues) == 2
        assert response.confidence_score < 0.5


class TestLLMVerificationService:
    """Test suite for LLMVerificationService class."""
    
    @pytest.fixture
    def mock_config(self):
        """Create a mock configuration for testing."""
        config = MagicMock(spec=VerificationConfig)
        config.enabled = True
        config.max_retries = 3
        config.confidence_threshold = 0.75
        config.timeout_seconds = 30
        config.cache_enabled = True
        # Add missing properties
        from app.service.agent.verification.verification_config import VerificationModel
        config.primary_model = VerificationModel.GEMINI_FLASH
        config.verification_models = [
            {
                'model_id': 'gemini-1.5-flash',
                'provider': 'google',
                'cost_per_1k_tokens': 0.075,
                'speed_rating': 9
            }
        ]
        return config
    
    @pytest.fixture
    def verification_service(self, mock_config):
        """Create verification service instance for testing."""
        with patch('app.service.agent.verification.verification_service.VerificationModels'), \
             patch('app.service.agent.verification.verification_service.VerificationCache'), \
             patch('app.service.agent.verification.verification_service.VerificationLogger'), \
             patch('app.service.agent.verification.verification_service.VerificationMetrics'), \
             patch('app.service.agent.verification.verification_service.IterativeImprover'):
            
            service = LLMVerificationService(config=mock_config)
            return service
    
    def test_service_initialization(self, mock_config):
        """Test service initialization with all components."""
        with patch('app.service.agent.verification.verification_service.VerificationModels') as mock_models, \
             patch('app.service.agent.verification.verification_service.VerificationCache') as mock_cache, \
             patch('app.service.agent.verification.verification_service.VerificationLogger') as mock_logger, \
             patch('app.service.agent.verification.verification_service.VerificationMetrics') as mock_metrics, \
             patch('app.service.agent.verification.verification_service.IterativeImprover') as mock_improver:
            
            service = LLMVerificationService(config=mock_config)
            
            assert service.config == mock_config
            mock_models.assert_called_once()
            mock_cache.assert_called_once()
            mock_logger.assert_called_once()
            mock_metrics.assert_called_once()
            mock_improver.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_successful_verification(self, verification_service):
        """Test successful verification process."""
        # Mock dependencies
        verification_service.cache.get = AsyncMock(return_value=None)  # Cache miss
        verification_service.cache.set = AsyncMock(return_value=True)
        
        mock_verification_result = {
            'is_valid': True,
            'confidence_score': 0.85,
            'explanation': 'Response is accurate and relevant',
            'issues': []
        }
        verification_service.models.verify_response = AsyncMock(return_value=mock_verification_result)
        
        # Test data
        messages = [HumanMessage(content="What is the capital of France?")]
        response = "The capital of France is Paris."
        
        # Execute verification
        result = await verification_service.verify_response(
            original_request=messages,
            response=response,
            context={}
        )
        
        assert result.is_valid is True
        assert result.confidence_score == 0.85
        assert result.attempt_count == 1
        assert result.verification_model is not None
        
    @pytest.mark.asyncio
    async def test_cache_hit_verification(self, verification_service):
        """Test verification with cache hit."""
        # Mock cache hit
        cached_result = {
            'is_valid': True,
            'confidence_score': 0.9,
            'explanation': 'Cached verification result',
            'issues': [],
            'verification_model': 'gemini-1.5-flash',
            'attempt_count': 1,
            'total_time_ms': 1000,
            'cached': True
        }
        verification_service.cache.get = AsyncMock(return_value=cached_result)
        
        messages = [HumanMessage(content="Test question")]
        response = "Test response"
        
        result = await verification_service.verify_response(
            original_request=messages,
            response=response,
            context={}
        )
        
        assert result.cached is True
        assert result.confidence_score == 0.9
        verification_service.models.verify_response.assert_not_called()
        
    @pytest.mark.asyncio
    async def test_verification_with_retry(self, verification_service):
        """Test verification with retry mechanism."""
        # Mock dependencies
        verification_service.cache.get = AsyncMock(return_value=None)
        verification_service.cache.set = AsyncMock(return_value=True)
        
        # Mock LLM invoke function
        mock_llm_invoke = AsyncMock(return_value={'response': 'Improved response'})
        
        # Mock first verification failure
        failed_result = {
            'is_valid': False,
            'confidence_score': 0.4,
            'explanation': 'Response is incomplete',
            'issues': ['Missing key information']
        }
        
        # Mock second verification success  
        success_result = {
            'is_valid': True,
            'confidence_score': 0.85,
            'explanation': 'Response is now complete',
            'issues': []
        }
        
        verification_service.models.verify_response = AsyncMock(side_effect=[failed_result, success_result])
        
        # Mock iterative improver
        mock_suggestions = [MagicMock()]
        verification_service.iterative_improver.analyze_verification_failure = MagicMock(return_value=mock_suggestions)
        verification_service.iterative_improver.create_improvement_request = MagicMock(
            return_value=[HumanMessage(content="Improved request")]
        )
        
        messages = [HumanMessage(content="What is Python?")]
        response = "Python is a language"
        
        final_response, verification_result = await verification_service.verify_response_with_retry(
            original_request=messages,
            response=response,
            context={},
            max_retries=3,
            llm_invoke_function=mock_llm_invoke
        )
        
        assert final_response == "Improved response"
        assert verification_result.is_valid is True
        assert verification_result.attempt_count == 2
        mock_llm_invoke.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self, verification_service):
        """Test behavior when max retries are exceeded."""
        verification_service.cache.get = AsyncMock(return_value=None)
        
        # Mock LLM invoke function
        mock_llm_invoke = AsyncMock(return_value={'response': 'Same response'})
        
        # Mock consistent verification failure
        failed_result = {
            'is_valid': False,
            'confidence_score': 0.3,
            'explanation': 'Response consistently fails verification',
            'issues': ['Major issues remain']
        }
        
        verification_service.models.verify_response = AsyncMock(return_value=failed_result)
        verification_service.iterative_improver.analyze_verification_failure = MagicMock(return_value=[])
        verification_service.iterative_improver.create_improvement_request = MagicMock(
            return_value=[HumanMessage(content="Retry request")]
        )
        
        messages = [HumanMessage(content="Complex question")]
        response = "Inadequate response"
        
        with pytest.raises(Exception, match="Max retries exceeded"):
            await verification_service.verify_response_with_retry(
                original_request=messages,
                response=response,
                context={},
                max_retries=2,
                llm_invoke_function=mock_llm_invoke
            )
    
    @pytest.mark.asyncio
    async def test_verification_timeout(self, verification_service):
        """Test verification timeout handling."""
        verification_service.cache.get = AsyncMock(return_value=None)
        
        # Mock timeout in verification
        verification_service.models.verify_response = AsyncMock(
            side_effect=asyncio.TimeoutError("Verification timeout")
        )
        
        messages = [HumanMessage(content="Question")]
        response = "Response"
        
        result = await verification_service.verify_response(
            original_request=messages,
            response=response,
            context={}
        )
        
        assert result.is_valid is False
        assert "timeout" in result.explanation.lower()
        
    @pytest.mark.asyncio  
    async def test_verification_with_context(self, verification_service):
        """Test verification with additional context."""
        verification_service.cache.get = AsyncMock(return_value=None)
        verification_service.cache.set = AsyncMock(return_value=True)
        
        mock_verification_result = {
            'is_valid': True,
            'confidence_score': 0.8,
            'explanation': 'Response appropriate for context',
            'issues': []
        }
        verification_service.models.verify_response = AsyncMock(return_value=mock_verification_result)
        
        messages = [HumanMessage(content="Analyze this entity")]
        response = "Entity analysis complete"
        context = {
            'tool_name': 'entity_validator',
            'investigation_type': 'fraud_detection',
            'entity_type': 'user_account'
        }
        
        result = await verification_service.verify_response(
            original_request=messages,
            response=response,
            context=context
        )
        
        assert result.is_valid is True
        # Verify that context was passed to verification
        verification_service.models.verify_response.assert_called_once()
        call_args = verification_service.models.verify_response.call_args
        assert call_args[1]['context'] == context
        
    def test_get_service_status(self, verification_service):
        """Test service status reporting."""
        # Mock component status
        verification_service.models.health_check = MagicMock(return_value={'healthy': True})
        verification_service.cache.health_check = AsyncMock(return_value={'healthy': True})
        verification_service.metrics.health_check = MagicMock(return_value={'healthy': True})
        
        status = verification_service.get_service_status()
        
        assert status['service_healthy'] is True
        assert status['enabled'] is True
        assert 'models_status' in status
        assert 'cache_status' in status
        assert 'metrics_status' in status
        
    @pytest.mark.asyncio
    async def test_performance_metrics_tracking(self, verification_service):
        """Test that performance metrics are properly tracked."""
        verification_service.cache.get = AsyncMock(return_value=None)
        verification_service.cache.set = AsyncMock(return_value=True)
        
        mock_verification_result = {
            'is_valid': True,
            'confidence_score': 0.85,
            'explanation': 'Test verification',
            'issues': []
        }
        verification_service.models.verify_response = AsyncMock(return_value=mock_verification_result)
        
        messages = [HumanMessage(content="Test")]
        response = "Test response"
        
        await verification_service.verify_response(
            original_request=messages,
            response=response,
            context={}
        )
        
        # Verify metrics were recorded
        verification_service.metrics.record_verification.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_error_handling_in_verification(self, verification_service):
        """Test error handling during verification process."""
        verification_service.cache.get = AsyncMock(return_value=None)
        
        # Mock verification model error
        verification_service.models.verify_response = AsyncMock(
            side_effect=Exception("Model API error")
        )
        
        messages = [HumanMessage(content="Test question")]
        response = "Test response"
        
        result = await verification_service.verify_response(
            original_request=messages,
            response=response,
            context={}
        )
        
        assert result.is_valid is False
        assert "error" in result.explanation.lower()
        verification_service.metrics.record_error.assert_called_once()


class TestVerificationServiceIntegration:
    """Integration tests for verification service."""
    
    @pytest.mark.asyncio
    async def test_full_verification_pipeline(self):
        """Test complete verification pipeline with real components."""
        # This would be an integration test with actual model calls
        # For now, we'll simulate with mocks but verify the full flow
        
        config = MagicMock(spec=VerificationConfig)
        config.enabled = True
        config.max_retries = 2
        config.confidence_threshold = 0.75
        config.cache_enabled = True
        
        with patch('app.service.agent.verification.verification_service.VerificationModels') as mock_models, \
             patch('app.service.agent.verification.verification_service.VerificationCache') as mock_cache, \
             patch('app.service.agent.verification.verification_service.VerificationLogger'), \
             patch('app.service.agent.verification.verification_service.VerificationMetrics'), \
             patch('app.service.agent.verification.verification_service.IterativeImprover'):
            
            # Setup mocks
            mock_models_instance = mock_models.return_value
            mock_cache_instance = mock_cache.return_value
            
            mock_cache_instance.get = AsyncMock(return_value=None)
            mock_cache_instance.set = AsyncMock(return_value=True)
            mock_models_instance.verify_response = AsyncMock(return_value={
                'is_valid': True,
                'confidence_score': 0.85,
                'explanation': 'Response is excellent',
                'issues': []
            })
            
            service = LLMVerificationService(config=config)
            
            messages = [
                SystemMessage(content="You are a helpful assistant"),
                HumanMessage(content="What is machine learning?")
            ]
            response = "Machine learning is a subset of artificial intelligence..."
            
            result = await service.verify_response(
                original_request=messages,
                response=response,
                context={'topic': 'AI/ML'}
            )
            
            assert result.is_valid is True
            assert result.confidence_score >= config.confidence_threshold
            assert result.verification_model is not None
            assert result.total_time_ms > 0