import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import Request

from app.service.llm_location_risk_service import (
    LLMLocationRiskService,
    LocationRiskAssessment,
)


@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    return request


@pytest.fixture
def llm_service():
    return LLMLocationRiskService()


@pytest.fixture
def sample_device_locations():
    return [
        {
            "true_ip_country": "US",
            "true_ip_city": "Mountain View",
            "fuzzy_device_id": "device1",
            "timestamp": "2024-03-20T10:00:00Z",
        },
        {
            "true_ip_country": "IN",
            "true_ip_city": "Bangalore",
            "fuzzy_device_id": "device2",
            "timestamp": "2024-03-20T11:00:00Z",
        },
    ]


@pytest.fixture
def mock_llm_response():
    return {
        "risk_assessment": {
            "risk_level": 0.7,
            "risk_factors": ["Multiple countries detected", "Cross-border activity"],
            "confidence": 0.8,
            "summary": "High risk due to cross-border activity",
            "thoughts": "User accessed from multiple countries within short time period",
        }
    }


@pytest.mark.asyncio
async def test_assess_location_risk_success(
    llm_service, mock_request, sample_device_locations, mock_llm_response
):
    with patch("app.service.agent_service.ainvoke_agent") as mock_ainvoke:
        mock_ainvoke.return_value = (json.dumps(mock_llm_response), None)

        assessment = await llm_service.assess_location_risk(
            user_id="test_user",
            device_locations=sample_device_locations,
            request=mock_request,
        )

        assert isinstance(assessment, LocationRiskAssessment)
        assert assessment.risk_level == 0.7
        assert "Multiple countries detected" in assessment.risk_factors
        assert assessment.confidence == 0.8
        assert "High risk due to cross-border activity" in assessment.summary
        assert (
            assessment.thoughts
            == "User accessed from multiple countries within short time period"
        )


@pytest.mark.asyncio
async def test_assess_location_risk_json_error(
    llm_service, mock_request, sample_device_locations
):
    with patch("app.service.agent_service.ainvoke_agent") as mock_ainvoke:
        mock_ainvoke.return_value = ("invalid json", None)

        assessment = await llm_service.assess_location_risk(
            user_id="test_user",
            device_locations=sample_device_locations,
            request=mock_request,
        )

        assert isinstance(assessment, LocationRiskAssessment)
        assert assessment.risk_level == 0.0
        assert "LLM response not valid JSON" in assessment.risk_factors
        assert assessment.confidence == 0.0
        assert "LLM response was not valid JSON" in assessment.summary


@pytest.mark.asyncio
async def test_assess_location_risk_llm_error(
    llm_service, mock_request, sample_device_locations
):
    with patch("app.service.agent_service.ainvoke_agent") as mock_ainvoke:
        mock_ainvoke.side_effect = Exception("LLM service error")

        assessment = await llm_service.assess_location_risk(
            user_id="test_user",
            device_locations=sample_device_locations,
            request=mock_request,
        )

        assert isinstance(assessment, LocationRiskAssessment)
        assert (
            assessment.risk_level == 0.5
        )  # Based on multiple countries in sample data
        assert "Cross-country location activity" in assessment.risk_factors
        assert assessment.confidence == 0.0


@pytest.mark.asyncio
async def test_assess_location_risk_with_vector_search(
    llm_service, mock_request, sample_device_locations, mock_llm_response
):
    vector_search_results = {
        "similar_cases": [{"risk_level": 0.8, "description": "Similar high-risk case"}]
    }

    with patch("app.service.agent_service.ainvoke_agent") as mock_ainvoke:
        mock_ainvoke.return_value = (json.dumps(mock_llm_response), None)

        assessment = await llm_service.assess_location_risk(
            user_id="test_user",
            device_locations=sample_device_locations,
            request=mock_request,
            vector_search_results=vector_search_results,
        )

        assert isinstance(assessment, LocationRiskAssessment)
        assert assessment.risk_level == 0.7
        assert "Multiple countries detected" in assessment.risk_factors


@pytest.mark.asyncio
async def test_assess_location_risk_with_oii_results(
    llm_service, mock_request, sample_device_locations, mock_llm_response
):
    oii_results = [{"location": "US", "confidence": 0.9, "source": "OII"}]

    with patch("app.service.agent_service.ainvoke_agent") as mock_ainvoke:
        mock_ainvoke.return_value = (json.dumps(mock_llm_response), None)

        assessment = await llm_service.assess_location_risk(
            user_id="test_user",
            device_locations=sample_device_locations,
            request=mock_request,
            oii_results=oii_results,
        )

        assert isinstance(assessment, LocationRiskAssessment)
        assert assessment.risk_level == 0.7
        assert "Multiple countries detected" in assessment.risk_factors


def test_location_risk_assessment_to_dict():
    assessment = LocationRiskAssessment(
        risk_level=0.7,
        risk_factors=["Test factor"],
        confidence=0.8,
        summary="Test summary",
        timestamp="2024-03-20T12:00:00Z",
        thoughts="Test thoughts",
    )

    result = assessment.to_dict()

    assert result["risk_level"] == 0.7
    assert result["risk_factors"] == ["Test factor"]
    assert result["confidence"] == 0.8
    assert result["summary"] == "Test summary"
    assert result["timestamp"] == "2024-03-20T12:00:00Z"
    assert result["thoughts"] == "Test thoughts"
