"""
Unit Tests for AI Agent Service
Tests CV analysis and generation without external dependencies
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from bson import ObjectId


@pytest.mark.asyncio
async def test_analyze_cv_calls_anthropic():
    """Test that analyze_cv calls Anthropic API correctly"""
    with patch('app.services.ai_agent_service.AsyncAnthropic') as mock_anthropic:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"skills": ["Python"], "ats_score": 85}')]
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic.return_value = mock_client

        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        result = await service.analyze_cv("Test CV content", "en")

        assert result is not None
        assert "skills" in result
        mock_client.messages.create.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_cv_handles_json_in_code_block():
    """Test that analyze_cv properly extracts JSON from code blocks"""
    with patch('app.services.ai_agent_service.AsyncAnthropic') as mock_anthropic:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(
            text='```json\n{"skills": ["Python", "FastAPI"], "ats_score": 90}\n```'
        )]
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic.return_value = mock_client

        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        result = await service.analyze_cv("Test CV content", "en")

        assert result["skills"] == ["Python", "FastAPI"]
        assert result["ats_score"] == 90


@pytest.mark.asyncio
async def test_analyze_cv_handles_invalid_json():
    """Test that analyze_cv handles invalid JSON gracefully"""
    with patch('app.services.ai_agent_service.AsyncAnthropic') as mock_anthropic:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='This is not valid JSON')]
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic.return_value = mock_client

        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        result = await service.analyze_cv("Test CV content", "en")

        # Should return fallback structure
        assert result["skills"] == []
        assert result["completeness_score"] == 0


@pytest.mark.asyncio
async def test_generate_cv_content():
    """Test CV content generation"""
    with patch('app.services.ai_agent_service.AsyncAnthropic') as mock_anthropic:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(
            text='Professional Summary\n\nExperienced developer...'
        )]
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        mock_anthropic.return_value = mock_client

        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        user_data = {
            "name": "John Doe",
            "skills": ["Python", "FastAPI"]
        }

        result = await service.generate_cv_content(user_data, "professional", "en")

        assert result is not None
        assert "Professional Summary" in result
        mock_client.messages.create.assert_called_once()


def test_build_analysis_prompt():
    """Test analysis prompt building"""
    with patch('app.services.ai_agent_service.AsyncAnthropic'):
        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        prompt = service._build_analysis_prompt("Test CV text", "en")

        assert "Test CV text" in prompt
        assert "SKILLS" in prompt
        assert "ATS SCORE" in prompt


def test_parse_analysis_valid_json():
    """Test parsing valid JSON analysis"""
    with patch('app.services.ai_agent_service.AsyncAnthropic'):
        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        analysis_text = '{"skills": ["Python"], "ats_score": 85}'
        result = service._parse_analysis(analysis_text)

        assert result["skills"] == ["Python"]
        assert result["ats_score"] == 85


def test_parse_analysis_json_in_markdown():
    """Test parsing JSON wrapped in markdown code blocks"""
    with patch('app.services.ai_agent_service.AsyncAnthropic'):
        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        analysis_text = '```json\n{"skills": ["Python"], "ats_score": 90}\n```'
        result = service._parse_analysis(analysis_text)

        assert result["skills"] == ["Python"]
        assert result["ats_score"] == 90


def test_parse_analysis_invalid_json():
    """Test parsing invalid JSON returns fallback structure"""
    with patch('app.services.ai_agent_service.AsyncAnthropic'):
        from app.services.ai_agent_service import AIAgentService
        service = AIAgentService()

        analysis_text = 'Not valid JSON at all'
        result = service._parse_analysis(analysis_text)

        assert result["skills"] == []
        assert result["completeness_score"] == 0
        assert "Unable to parse analysis" in result["recommendations"]
