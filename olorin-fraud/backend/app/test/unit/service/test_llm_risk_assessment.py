from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.service.llm_risk_assessment_service import (
    LLMRiskAssessmentService,
    OverallRiskAssessment,
)


class TestLLMRiskAssessmentService:
    """Test the LLM Risk Assessment Service."""

    @pytest.fixture
    def service(self):
        """Create a service instance."""
        return LLMRiskAssessmentService()

    def test_get_agent_name(self, service):
        """Test agent name."""
        assert (
            service.get_agent_name() == "Olorin.cas.hri.olorin:overall-risk-aggregator"
        )

    def test_get_assessment_model_class(self, service):
        """Test assessment model class."""
        assert service.get_assessment_model_class() == OverallRiskAssessment

    def test_get_system_prompt_template(self, service):
        """Test that system prompt includes remediation actions."""
        prompt = service.get_system_prompt_template()
        assert "remediation_actions" in prompt
        assert "remediation actions" in prompt.lower()
        assert "HIGH RISK:" in prompt
        assert "MEDIUM RISK:" in prompt
        assert "LOW RISK:" in prompt

    def test_prepare_prompt_data(self, service):
        """Test prompt data preparation."""
        prompt_data = service.prepare_prompt_data(
            user_id="test_user",
            extracted_signals=[],
            device_llm_thoughts="Device thoughts",
            location_llm_thoughts="Location thoughts",
            network_llm_thoughts="Network thoughts",
            logs_llm_thoughts="Logs thoughts",
            device_risk_score=0.8,
            location_risk_score=0.3,
            network_risk_score=0.9,
            logs_risk_score=0.7,
        )

        assert prompt_data["prompt_data"]["user_id"] == "test_user"
        assert prompt_data["prompt_data"]["device_risk_score"] == 0.8
        assert "remediation_actions" in prompt_data["llm_input_prompt"]

    def test_create_fallback_assessment_high_risk(self, service):
        """Test fallback assessment for high risk scenarios."""
        assessment = service.create_fallback_assessment(
            user_id="test_user",
            extracted_signals=[],
            error_type="exception",
            error_message="LLM service unavailable",
            device_risk_score=0.9,
            location_risk_score=0.8,
            network_risk_score=0.85,
            logs_risk_score=0.75,
        )

        assert isinstance(assessment, OverallRiskAssessment)
        assert assessment.overall_risk_score > 0.7
        assert len(assessment.remediation_actions) > 0
        assert any(
            "suspension" in action.lower() or "suspend" in action.lower()
            for action in assessment.remediation_actions
        )
        assert any(
            "password reset" in action.lower()
            for action in assessment.remediation_actions
        )
        assert isinstance(assessment.timestamp, str)

    def test_create_fallback_assessment_medium_risk(self, service):
        """Test fallback assessment for medium risk scenarios."""
        assessment = service.create_fallback_assessment(
            user_id="test_user",
            extracted_signals=[],
            error_type="exception",
            error_message="LLM service unavailable",
            device_risk_score=0.5,
            location_risk_score=0.4,
            network_risk_score=0.6,
            logs_risk_score=0.45,
        )

        assert isinstance(assessment, OverallRiskAssessment)
        assert 0.4 <= assessment.overall_risk_score < 0.7
        assert len(assessment.remediation_actions) > 0
        assert any(
            "monitor" in action.lower() for action in assessment.remediation_actions
        )
        assert any(
            "alert" in action.lower() for action in assessment.remediation_actions
        )

    def test_create_fallback_assessment_low_risk(self, service):
        """Test fallback assessment for low risk scenarios."""
        assessment = service.create_fallback_assessment(
            user_id="test_user",
            extracted_signals=[],
            error_type="exception",
            error_message="LLM service unavailable",
            device_risk_score=0.2,
            location_risk_score=0.1,
            network_risk_score=0.3,
            logs_risk_score=0.15,
        )

        assert isinstance(assessment, OverallRiskAssessment)
        assert assessment.overall_risk_score < 0.4
        assert len(assessment.remediation_actions) > 0
        assert any(
            "standard monitoring" in action.lower()
            for action in assessment.remediation_actions
        )

    @pytest.mark.asyncio
    async def test_assess_overall_risk_success(self, service):
        """Test successful overall risk assessment."""
        mock_request = Mock()

        # Mock the assess_risk method to return a successful response
        with patch.object(
            service, "assess_risk", new_callable=AsyncMock
        ) as mock_assess:
            mock_assessment = OverallRiskAssessment(
                overall_risk_score=0.75,
                accumulated_llm_thoughts="High risk detected",
                remediation_actions=["Suspend account", "Force password reset"],
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
            mock_assess.return_value = mock_assessment

            result = await service.assess_overall_risk(
                user_id="test_user",
                request=mock_request,
                device_llm_thoughts="Device analysis",
                location_llm_thoughts="Location analysis",
                network_llm_thoughts="Network analysis",
                logs_llm_thoughts="Logs analysis",
                device_risk_score=0.8,
                location_risk_score=0.7,
                network_risk_score=0.9,
                logs_risk_score=0.6,
                investigation_id="test_inv_123",
            )

            assert result == mock_assessment
            assert result.remediation_actions == [
                "Suspend account",
                "Force password reset",
            ]

    @pytest.mark.asyncio
    async def test_assess_overall_risk_error(self, service):
        """Test overall risk assessment with error handling."""
        mock_request = Mock()

        # Mock the assess_risk method to raise an exception
        with patch.object(
            service, "assess_risk", new_callable=AsyncMock
        ) as mock_assess:
            mock_assess.side_effect = Exception("LLM service error")

            result = await service.assess_overall_risk(
                user_id="test_user",
                request=mock_request,
                device_risk_score=0.8,
                location_risk_score=0.7,
                network_risk_score=0.9,
                logs_risk_score=0.6,
                investigation_id="test_inv_123",
            )

            # Should return fallback assessment
            assert isinstance(result, OverallRiskAssessment)
            assert (
                result.overall_risk_score > 0
            )  # Should calculate from available scores
            assert len(result.remediation_actions) > 0  # Should have fallback actions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
