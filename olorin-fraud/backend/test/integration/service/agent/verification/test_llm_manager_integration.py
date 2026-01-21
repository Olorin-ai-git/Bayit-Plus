#!/usr/bin/env python3
"""
Integration tests for LLM Manager with verification system.

Tests the complete integration between LLM Manager and verification service.
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from app.service.llm_manager import LLMManager


class TestLLMManagerVerificationIntegration:
    """Integration tests for LLM Manager verification features."""

    @pytest.fixture
    def mock_verification_service(self):
        """Create mock verification service for testing."""
        mock_service = MagicMock()
        mock_service.verify_response_with_retry = AsyncMock()
        return mock_service

    @pytest.fixture
    def llm_manager_with_verification(self, mock_verification_service):
        """Create LLM Manager instance with verification enabled."""
        with (
            patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "true"}),
            patch("app.service.llm_manager.get_verification_config"),
            patch(
                "app.service.llm_manager.LLMVerificationService",
                return_value=mock_verification_service,
            ),
        ):

            manager = LLMManager()
            manager.selected_model = MagicMock()
            manager.selected_model.ainvoke = AsyncMock(
                return_value=MagicMock(content="Test response")
            )
            return manager

    @pytest.fixture
    def llm_manager_without_verification(self):
        """Create LLM Manager instance with verification disabled."""
        with patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "false"}):
            manager = LLMManager()
            manager.selected_model = MagicMock()
            manager.selected_model.ainvoke = AsyncMock(
                return_value=MagicMock(content="Test response")
            )
            return manager

    def test_verification_enabled_initialization(self, llm_manager_with_verification):
        """Test LLM Manager initialization with verification enabled."""
        assert llm_manager_with_verification.is_verification_enabled() is True
        assert llm_manager_with_verification.verification_service is not None

    def test_verification_disabled_initialization(
        self, llm_manager_without_verification
    ):
        """Test LLM Manager initialization with verification disabled."""
        assert llm_manager_without_verification.is_verification_enabled() is False
        assert llm_manager_without_verification.verification_service is None

    @pytest.mark.asyncio
    async def test_mandatory_verification_with_verification_enabled(
        self, llm_manager_with_verification
    ):
        """Test mandatory verification when verification is enabled."""
        # Mock successful verification
        mock_verification_response = MagicMock()
        mock_verification_response.confidence_score = 0.85
        mock_verification_response.verification_model = "gemini-1.5-flash"
        mock_verification_response.attempt_count = 1
        mock_verification_response.total_time_ms = 1200
        mock_verification_response.cached = False
        mock_verification_response.explanation = "Response is accurate"
        mock_verification_response.issues = []

        llm_manager_with_verification.verification_service.verify_response_with_retry.return_value = (
            "Verified response",
            mock_verification_response,
        )

        messages = [HumanMessage(content="What is Python?")]
        context = {"topic": "programming"}

        result = await llm_manager_with_verification.invoke_with_mandatory_verification(
            messages=messages, context=context, max_retries=3
        )

        assert result["response"] == "Verified response"
        assert result["verification"]["verified"] is True
        assert result["verification"]["confidence_score"] == 0.85
        assert result["verification"]["verification_model"] == "gemini-1.5-flash"
        assert result["model_used"] == llm_manager_with_verification.selected_model_id
        assert result["verification_enabled"] is True

        # Verify that verification service was called correctly
        llm_manager_with_verification.verification_service.verify_response_with_retry.assert_called_once_with(
            original_request=messages,
            response="",
            context=context,
            max_retries=3,
            llm_invoke_function=llm_manager_with_verification._invoke_direct,
        )

    @pytest.mark.asyncio
    async def test_mandatory_verification_with_verification_disabled(
        self, llm_manager_without_verification
    ):
        """Test mandatory verification falls back to direct invocation when disabled."""
        messages = [HumanMessage(content="What is Python?")]

        result = (
            await llm_manager_without_verification.invoke_with_mandatory_verification(
                messages=messages
            )
        )

        assert result["response"] == "Test response"
        assert result["verification_enabled"] is False
        assert "verification" not in result
        assert (
            result["model_used"] == llm_manager_without_verification.selected_model_id
        )

        # Verify direct model invocation was called
        llm_manager_without_verification.selected_model.ainvoke.assert_called_once_with(
            messages
        )

    @pytest.mark.asyncio
    async def test_verification_service_failure_fallback(
        self, llm_manager_with_verification
    ):
        """Test fallback to direct invocation when verification service fails."""
        # Mock verification service failure
        llm_manager_with_verification.verification_service.verify_response_with_retry.side_effect = Exception(
            "Verification service error"
        )

        messages = [HumanMessage(content="Test question")]

        result = await llm_manager_with_verification.invoke_with_mandatory_verification(
            messages=messages
        )

        assert result["response"] == "Test response"
        assert result["verification_enabled"] is False
        assert "verification_error" in result
        assert "Verification service error" in result["verification_error"]

        # Verify direct invocation was used as fallback
        llm_manager_with_verification.selected_model.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_direct_invoke_method(self, llm_manager_with_verification):
        """Test the _invoke_direct method used by verification service."""
        messages = [
            SystemMessage(content="You are a helpful assistant"),
            HumanMessage(content="Explain machine learning"),
        ]

        result = await llm_manager_with_verification._invoke_direct(messages)

        assert result["response"] == "Test response"
        assert result["model_used"] == llm_manager_with_verification.selected_model_id
        assert result["verification_enabled"] is False

        llm_manager_with_verification.selected_model.ainvoke.assert_called_once_with(
            messages
        )

    @pytest.mark.asyncio
    async def test_direct_invoke_error_handling(self, llm_manager_with_verification):
        """Test error handling in _invoke_direct method."""
        messages = [HumanMessage(content="Test")]

        # Mock model error
        llm_manager_with_verification.selected_model.ainvoke.side_effect = Exception(
            "Model API error"
        )

        result = await llm_manager_with_verification._invoke_direct(messages)

        assert result["response"] is None
        assert "error" in result
        assert "Model API error" in result["error"]

    def test_verification_status_reporting(self, llm_manager_with_verification):
        """Test verification status reporting."""
        # Mock verification service components
        llm_manager_with_verification.verification_service.cache = MagicMock()
        llm_manager_with_verification.verification_service.cache.get_cache_stats.return_value = {
            "hit_rate": 85.5,
            "entries": 150,
        }

        llm_manager_with_verification.verification_service.metrics = MagicMock()
        llm_manager_with_verification.verification_service.metrics.get_performance_summary.return_value = {
            "success_rate": 92.3,
            "avg_response_time_ms": 1250,
        }

        status = llm_manager_with_verification.get_verification_status()

        assert status["enabled"] is True
        assert status["service_healthy"] is True
        assert status["cache_stats"]["hit_rate"] == 85.5
        assert status["metrics_summary"]["success_rate"] == 92.3

    def test_verification_status_without_service(
        self, llm_manager_without_verification
    ):
        """Test verification status when service is not initialized."""
        status = llm_manager_without_verification.get_verification_status()

        assert status["enabled"] is False
        assert status["reason"] == "Verification service not initialized"

    @pytest.mark.asyncio
    async def test_context_passing_to_verification(self, llm_manager_with_verification):
        """Test that context is properly passed to verification service."""
        mock_verification_response = MagicMock()
        mock_verification_response.confidence_score = 0.9

        llm_manager_with_verification.verification_service.verify_response_with_retry.return_value = (
            "Verified response",
            mock_verification_response,
        )

        messages = [HumanMessage(content="Analyze user behavior")]
        context = {
            "tool_name": "behavior_analyzer",
            "investigation_type": "fraud_detection",
            "entity_type": "user_account",
            "risk_level": "high",
        }

        result = await llm_manager_with_verification.invoke_with_mandatory_verification(
            messages=messages, context=context
        )

        # Verify context was passed to verification service
        call_args = (
            llm_manager_with_verification.verification_service.verify_response_with_retry.call_args
        )
        assert call_args[1]["context"] == context

    @pytest.mark.asyncio
    async def test_max_retries_parameter_passing(self, llm_manager_with_verification):
        """Test that max_retries parameter is properly passed."""
        mock_verification_response = MagicMock()
        llm_manager_with_verification.verification_service.verify_response_with_retry.return_value = (
            "Response",
            mock_verification_response,
        )

        messages = [HumanMessage(content="Test")]
        max_retries = 5

        await llm_manager_with_verification.invoke_with_mandatory_verification(
            messages=messages, max_retries=max_retries
        )

        # Verify max_retries was passed
        call_args = (
            llm_manager_with_verification.verification_service.verify_response_with_retry.call_args
        )
        assert call_args[1]["max_retries"] == max_retries

    @pytest.mark.asyncio
    async def test_legacy_verification_method_deprecation_warning(
        self, llm_manager_with_verification
    ):
        """Test that legacy verification method shows deprecation warning."""
        with patch("app.service.llm_manager.logger") as mock_logger:
            messages = [HumanMessage(content="Test")]

            await llm_manager_with_verification.invoke_with_verification(
                messages=messages, verify=True
            )

            # Should log deprecation warning
            mock_logger.warning.assert_called_with(
                "Using deprecated invoke_with_verification. Consider using invoke_with_mandatory_verification."
            )

    @pytest.mark.asyncio
    async def test_no_model_available_error(self, llm_manager_with_verification):
        """Test error handling when no model is available."""
        llm_manager_with_verification.selected_model = None

        messages = [HumanMessage(content="Test")]

        result = await llm_manager_with_verification._invoke_direct(messages)

        assert result["response"] is None
        assert result["error"] == "No model available"

    def test_model_configuration_with_verification(self):
        """Test that model configuration works with verification enabled."""
        with (
            patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "true"}),
            patch("app.service.llm_manager.get_verification_config"),
            patch("app.service.llm_manager.LLMVerificationService"),
        ):

            manager = LLMManager()

            # Should have both selected and verification models configured
            assert manager.selected_model_id is not None
            assert manager.verification_model_id is not None
            assert (
                manager.selected_model_id != manager.verification_model_id
            )  # Should be different models

            # Verification model should be cost-effective
            assert (
                "gemini" in manager.verification_model_id.lower()
                or "flash" in manager.verification_model_id.lower()
            )


class TestLLMManagerVerificationRealScenarios:
    """Test real-world scenarios with LLM Manager verification."""

    @pytest.mark.asyncio
    async def test_investigation_analysis_with_verification(self):
        """Test fraud investigation analysis with verification enabled."""
        with (
            patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "true"}),
            patch("app.service.llm_manager.get_verification_config"),
            patch(
                "app.service.llm_manager.LLMVerificationService"
            ) as mock_service_class,
        ):

            # Setup mocks
            mock_service = MagicMock()
            mock_verification_response = MagicMock()
            mock_verification_response.confidence_score = 0.88
            mock_verification_response.verification_model = "gemini-1.5-flash"
            mock_verification_response.attempt_count = 1
            mock_verification_response.total_time_ms = 1450
            mock_verification_response.cached = False
            mock_verification_response.explanation = "Analysis is thorough and accurate"
            mock_verification_response.issues = []

            mock_service.verify_response_with_retry.return_value = (
                "RISK ASSESSMENT: High risk detected. User shows suspicious patterns...",
                mock_verification_response,
            )
            mock_service_class.return_value = mock_service

            manager = LLMManager()
            manager.selected_model = MagicMock()
            manager.selected_model.ainvoke = AsyncMock(
                return_value=MagicMock(content="Initial analysis")
            )

            # Simulate investigation analysis request
            messages = [
                SystemMessage(
                    content="You are a fraud detection specialist. Analyze the provided data for suspicious patterns."
                ),
                HumanMessage(
                    content="Analyze user ID 12345: Multiple logins from different countries within 2 hours, unusual transaction patterns, new payment methods added recently."
                ),
            ]

            context = {
                "tool_name": "fraud_analyzer",
                "investigation_type": "account_compromise",
                "entity_type": "user_account",
                "entity_id": "12345",
                "risk_indicators": ["geo_velocity", "payment_anomaly", "login_pattern"],
            }

            result = await manager.invoke_with_mandatory_verification(
                messages=messages, context=context, max_retries=3
            )

            # Verify comprehensive verification was applied
            assert result["verification"]["verified"] is True
            assert result["verification"]["confidence_score"] > 0.8
            assert (
                "Risk assessment" in result["response"]
                or "analysis" in result["response"].lower()
            )
            assert result["verification_enabled"] is True

            # Verify context was passed correctly
            call_args = mock_service.verify_response_with_retry.call_args
            passed_context = call_args[1]["context"]
            assert passed_context["tool_name"] == "fraud_analyzer"
            assert passed_context["investigation_type"] == "account_compromise"
            assert "geo_velocity" in passed_context["risk_indicators"]

    @pytest.mark.asyncio
    async def test_entity_validation_with_verification(self):
        """Test entity validation with verification system."""
        with (
            patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "true"}),
            patch("app.service.llm_manager.get_verification_config"),
            patch(
                "app.service.llm_manager.LLMVerificationService"
            ) as mock_service_class,
        ):

            mock_service = MagicMock()
            mock_verification_response = MagicMock()
            mock_verification_response.confidence_score = 0.92

            mock_service.verify_response_with_retry.return_value = (
                "VALIDATION RESULT: Entity appears legitimate. All validation checks passed.",
                mock_verification_response,
            )
            mock_service_class.return_value = mock_service

            manager = LLMManager()
            manager.selected_model = MagicMock()
            manager.selected_model.ainvoke = AsyncMock(
                return_value=MagicMock(content="Validation result")
            )

            messages = [
                SystemMessage(
                    content="Validate the legitimacy of the provided entity based on available data."
                ),
                HumanMessage(
                    content="Validate email: john.doe@example.com, Phone: +1-555-0123, Address: 123 Main St, Anytown, ST 12345"
                ),
            ]

            context = {
                "tool_name": "entity_validator",
                "validation_type": "contact_info",
                "entity_type": "person",
                "validation_rules": [
                    "email_format",
                    "phone_format",
                    "address_structure",
                ],
            }

            result = await manager.invoke_with_mandatory_verification(
                messages=messages, context=context
            )

            assert result["verification"]["verified"] is True
            assert result["verification"]["confidence_score"] > 0.9
            assert "validation" in result["response"].lower()

    @pytest.mark.asyncio
    async def test_performance_under_load(self):
        """Test verification system performance under multiple concurrent requests."""
        with (
            patch.dict(os.environ, {"LLM_VERIFICATION_ENABLED": "true"}),
            patch("app.service.llm_manager.get_verification_config"),
            patch(
                "app.service.llm_manager.LLMVerificationService"
            ) as mock_service_class,
        ):

            # Setup fast mock responses
            mock_service = MagicMock()
            mock_verification_response = MagicMock()
            mock_verification_response.confidence_score = 0.85
            mock_verification_response.total_time_ms = 800

            mock_service.verify_response_with_retry.return_value = (
                "Verified response",
                mock_verification_response,
            )
            mock_service_class.return_value = mock_service

            manager = LLMManager()
            manager.selected_model = MagicMock()
            manager.selected_model.ainvoke = AsyncMock(
                return_value=MagicMock(content="Response")
            )

            # Create multiple concurrent requests
            async def make_request(request_id):
                messages = [HumanMessage(content=f"Request {request_id}")]
                context = {"request_id": request_id}
                return await manager.invoke_with_mandatory_verification(
                    messages=messages, context=context
                )

            # Run 10 concurrent requests
            import asyncio

            tasks = [make_request(i) for i in range(10)]
            results = await asyncio.gather(*tasks)

            # All requests should succeed
            assert len(results) == 10
            for result in results:
                assert result["verification"]["verified"] is True
                assert result["verification_enabled"] is True

            # Verification service should have been called for each request
            assert mock_service.verify_response_with_retry.call_count == 10
