"""
Tests for NLP Tool Dispatcher

Validates tool execution routing and platform-specific tool handling.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.nlp.tool_dispatcher import execute_tool


@pytest.mark.asyncio
async def test_execute_web_search_tool():
    """Test web search tool execution"""
    with patch('app.services.nlp.tool_dispatcher.web_search', new_callable=AsyncMock) as mock_web_search:
        mock_web_search.return_value = "Search results: MongoDB documentation..."

        result = await execute_tool(
            tool_name="web_search",
            tool_input={"query": "mongodb documentation", "num_results": 5},
            platform="bayit",
            dry_run=False
        )

    assert "Search results" in result
    mock_web_search.assert_called_once_with("mongodb documentation", 5)


@pytest.mark.asyncio
async def test_execute_download_file_tool():
    """Test file download tool execution"""
    with patch('app.services.nlp.tool_dispatcher.download_file', new_callable=AsyncMock) as mock_download:
        mock_download.return_value = "/tmp/downloaded_file.pdf"

        result = await execute_tool(
            tool_name="download_file",
            tool_input={"url": "https://example.com/file.pdf", "destination": "/tmp/file.pdf"},
            platform="bayit",
            dry_run=False
        )

    assert "/tmp/downloaded_file.pdf" in result


@pytest.mark.asyncio
async def test_execute_email_tool_dry_run():
    """Test email tool execution in dry-run mode"""
    result = await execute_tool(
        tool_name="send_email",
        tool_input={
            "to": "test@example.com",
            "subject": "Test",
            "body": "Hello world"
        },
        platform="bayit",
        dry_run=True
    )

    assert "[DRY RUN]" in result
    assert "test@example.com" in result


@pytest.mark.asyncio
async def test_execute_pdf_generation_tool():
    """Test PDF generation tool execution"""
    with patch('app.services.nlp.tool_dispatcher.generate_pdf', new_callable=AsyncMock) as mock_pdf:
        mock_pdf.return_value = "/tmp/report.pdf"

        result = await execute_tool(
            tool_name="generate_pdf",
            tool_input={
                "title": "Monthly Report",
                "data": {"metric1": 100, "metric2": 200}
            },
            platform="fraud",
            dry_run=False
        )

    assert "/tmp/report.pdf" in result


@pytest.mark.asyncio
async def test_execute_bayit_search_tool():
    """Test Bayit-specific search tool"""
    with patch('app.services.nlp.tool_dispatcher.execute_bayit_tool', new_callable=AsyncMock) as mock_bayit:
        mock_bayit.return_value = "Found 5 series matching 'family ties'"

        result = await execute_tool(
            tool_name="search_bayit_content",
            tool_input={"query": "family ties", "content_type": "series"},
            platform="bayit",
            dry_run=False
        )

    assert "Found" in result


@pytest.mark.asyncio
async def test_execute_bayit_update_metadata_dry_run():
    """Test Bayit metadata update in dry-run mode"""
    result = await execute_tool(
        tool_name="update_content_metadata",
        tool_input={
            "content_id": "series123",
            "updates": {"poster_url": "https://example.com/poster.jpg"}
        },
        platform="bayit",
        dry_run=True
    )

    assert "[DRY RUN]" in result
    assert "series123" in result


@pytest.mark.asyncio
async def test_execute_fraud_analysis_tool():
    """Test Fraud platform analysis tool"""
    with patch('app.services.nlp.tool_dispatcher.execute_fraud_tool', new_callable=AsyncMock) as mock_fraud:
        mock_fraud.return_value = "Analysis complete: 15 suspicious transactions detected"

        result = await execute_tool(
            tool_name="run_fraud_analysis",
            tool_input={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "analysis_type": "transaction"
            },
            platform="fraud",
            dry_run=False
        )

    assert "Analysis complete" in result


@pytest.mark.asyncio
async def test_execute_cvplus_statistics_tool():
    """Test CV Plus statistics tool"""
    with patch('app.services.nlp.tool_dispatcher.execute_cvplus_tool', new_callable=AsyncMock) as mock_cvplus:
        mock_cvplus.return_value = '{"total_users": 1500, "active_users": 450}'

        result = await execute_tool(
            tool_name="get_user_statistics",
            tool_input={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "metrics": ["total_users", "active_users"]
            },
            platform="cvplus",
            dry_run=False
        )

    assert "total_users" in result


@pytest.mark.asyncio
async def test_execute_unknown_tool():
    """Test handling of unknown tool"""
    with pytest.raises(ValueError, match="Unknown tool"):
        await execute_tool(
            tool_name="nonexistent_tool",
            tool_input={},
            platform="bayit",
            dry_run=False
        )


@pytest.mark.asyncio
async def test_execute_tool_with_missing_params():
    """Test tool execution with missing required parameters"""
    # Web search requires 'query' parameter
    with pytest.raises(KeyError):
        await execute_tool(
            tool_name="web_search",
            tool_input={},  # Missing 'query'
            platform="bayit",
            dry_run=False
        )


@pytest.mark.asyncio
async def test_platform_tool_routing():
    """Test that platform-specific tools route correctly"""
    # Bayit tool
    with patch('app.services.nlp.tool_dispatcher.execute_bayit_tool', new_callable=AsyncMock) as mock_bayit:
        mock_bayit.return_value = "Bayit result"
        result = await execute_tool("search_bayit_content", {"query": "test"}, "bayit", False)
        assert mock_bayit.called

    # Fraud tool
    with patch('app.services.nlp.tool_dispatcher.execute_fraud_tool', new_callable=AsyncMock) as mock_fraud:
        mock_fraud.return_value = "Fraud result"
        result = await execute_tool("run_fraud_analysis", {"start_date": "2024-01-01", "end_date": "2024-01-31"}, "fraud", False)
        assert mock_fraud.called

    # CVPlus tool
    with patch('app.services.nlp.tool_dispatcher.execute_cvplus_tool', new_callable=AsyncMock) as mock_cvplus:
        mock_cvplus.return_value = "CVPlus result"
        result = await execute_tool("get_user_statistics", {"start_date": "2024-01-01", "end_date": "2024-01-31"}, "cvplus", False)
        assert mock_cvplus.called
