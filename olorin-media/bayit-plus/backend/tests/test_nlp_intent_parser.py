"""
Tests for NLP Intent Parser

Validates natural language command parsing and intent recognition.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.nlp.intent_parser import IntentParser, ParsedIntent


@pytest.mark.asyncio
async def test_parse_upload_series_intent():
    """Test parsing upload series command with all parameters"""
    parser = IntentParser()

    # Mock Claude API response
    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "upload_series", "confidence": 0.95, "params": {"series": "family ties", "season": 2, "source": "usb"}, "requires_confirmation": true}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "upload all series from usb starting with family ties season 2"
        )

    assert result.intent == "upload_series"
    assert result.confidence > 0.7
    assert result.params["series"] == "family ties"
    assert result.params["season"] == 2
    assert result.requires_confirmation is True


@pytest.mark.asyncio
async def test_parse_search_intent():
    """Test parsing search command"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "search_content", "confidence": 0.92, "params": {"query": "jewish holiday content for kids", "content_type": "all"}, "requires_confirmation": false}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "find jewish holiday content for kids"
        )

    assert result.intent == "search_content"
    assert "jewish" in result.params["query"].lower()
    assert result.confidence > 0.7


@pytest.mark.asyncio
async def test_parse_upload_movies_intent():
    """Test parsing upload movies command"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "upload_movies", "confidence": 0.88, "params": {"source": "usb", "limit": 5}, "requires_confirmation": true}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "upload first 5 movies from usb"
        )

    assert result.intent == "upload_movies"
    assert result.params["limit"] == 5
    assert result.requires_confirmation is True


@pytest.mark.asyncio
async def test_parse_status_check_intent():
    """Test parsing status check command"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "status_check", "confidence": 0.99, "params": {"platform": "bayit"}, "requires_confirmation": false}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "check status of bayit platform"
        )

    assert result.intent == "status_check"
    assert result.params["platform"] == "bayit"


@pytest.mark.asyncio
async def test_low_confidence_intent():
    """Test handling low confidence intent"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "unknown", "confidence": 0.45, "params": {}, "requires_confirmation": false}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "do something vague and unclear"
        )

    assert result.confidence < 0.7
    assert result.intent == "unknown"


@pytest.mark.asyncio
async def test_parse_with_context():
    """Test parsing command with additional context"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "upload_series", "confidence": 0.91, "params": {"series": "breaking bad", "source": "/Volumes/MyDrive"}, "requires_confirmation": true}'
        )
    ]

    context = {
        "platform": "bayit",
        "available_drives": ["/Volumes/MyDrive"]
    }

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "upload breaking bad",
            context=context
        )

    assert result.intent == "upload_series"
    assert result.params["series"] == "breaking bad"


@pytest.mark.asyncio
async def test_suggested_command():
    """Test intent with suggested command"""
    parser = IntentParser()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="text",
            text='{"intent": "upload_series", "confidence": 0.87, "params": {"series": "family ties"}, "requires_confirmation": true, "suggested_command": "olorin upload-series --series \\"family ties\\""}'
        )
    ]

    with patch.object(parser.client.messages, 'create', return_value=mock_response):
        result = await parser.parse_command(
            "upload family ties"
        )

    assert result.suggested_command is not None
    assert "olorin upload-series" in result.suggested_command
