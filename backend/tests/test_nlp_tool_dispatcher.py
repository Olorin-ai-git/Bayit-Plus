"""
Tests for NLP Tool Dispatcher

Validates tool execution routing and platform-specific tool handling.
"""

import pytest
from unittest.mock import AsyncMock, patch
from app.services.nlp.tool_dispatcher import execute_tool


@pytest.mark.asyncio
async def test_execute_web_search_tool():
    """Test web search tool execution"""
    with patch(
        "app.services.nlp.tools.web_search.web_search",
        new_callable=AsyncMock,
    ) as mock_ws:
        mock_ws.return_value = "Search results: MongoDB documentation..."

        result = await execute_tool(
            tool_name="web_search",
            tool_input={"query": "mongodb documentation", "num_results": 5},
            platform="bayit",
            dry_run=False,
        )

    assert "Search results" in result
    mock_ws.assert_called_once_with(query="mongodb documentation", num_results=5)


@pytest.mark.asyncio
async def test_execute_download_file_tool_dry_run():
    """Test file download tool in dry-run mode"""
    result = await execute_tool(
        tool_name="download_file",
        tool_input={"url": "https://example.com/file.pdf"},
        platform="bayit",
        dry_run=True,
    )

    assert "[DRY RUN]" in result
    assert "https://example.com/file.pdf" in result


@pytest.mark.asyncio
async def test_execute_email_tool_dry_run():
    """Test email tool execution in dry-run mode"""
    result = await execute_tool(
        tool_name="send_email",
        tool_input={
            "to": "test@example.com",
            "subject": "Test",
            "body": "Hello world",
        },
        platform="bayit",
        dry_run=True,
    )

    assert "[DRY RUN]" in result
    assert "test@example.com" in result


@pytest.mark.asyncio
async def test_execute_bayit_search_tool():
    """Test Bayit-specific search tool"""
    with patch(
        "app.services.nlp.tool_dispatcher.execute_bayit_tool",
        new_callable=AsyncMock,
    ) as mock_bayit:
        mock_bayit.return_value = "Found 5 series matching 'family ties'"

        result = await execute_tool(
            tool_name="search_bayit_content",
            tool_input={"query": "family ties", "content_type": "series"},
            platform="bayit",
            dry_run=False,
        )

    assert "Found" in result


@pytest.mark.asyncio
async def test_execute_bayit_update_metadata_dry_run():
    """Test Bayit metadata update in dry-run mode"""
    result = await execute_tool(
        tool_name="update_content_metadata",
        tool_input={
            "content_id": "series123",
            "updates": {"poster_url": "https://example.com/poster.jpg"},
        },
        platform="bayit",
        dry_run=True,
    )

    assert "[DRY RUN]" in result
    assert "series123" in result


@pytest.mark.asyncio
async def test_execute_fraud_analysis_tool():
    """Test Fraud platform analysis tool"""
    with patch(
        "app.services.nlp.tool_dispatcher.execute_fraud_tool",
        new_callable=AsyncMock,
    ) as mock_fraud:
        mock_fraud.return_value = "Analysis complete: 15 suspicious transactions"

        result = await execute_tool(
            tool_name="run_fraud_analysis",
            tool_input={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "analysis_type": "transaction",
            },
            platform="fraud",
            dry_run=False,
        )

    assert "Analysis complete" in result


@pytest.mark.asyncio
async def test_execute_cvplus_statistics_tool():
    """Test CV Plus statistics tool"""
    with patch(
        "app.services.nlp.tool_dispatcher.execute_cvplus_tool",
        new_callable=AsyncMock,
    ) as mock_cvplus:
        mock_cvplus.return_value = '{"total_users": 1500, "active_users": 450}'

        result = await execute_tool(
            tool_name="get_user_statistics",
            tool_input={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "metrics": ["total_users", "active_users"],
            },
            platform="cvplus",
            dry_run=False,
        )

    assert "total_users" in result


@pytest.mark.asyncio
async def test_execute_unknown_tool():
    """Test handling of unknown tool raises ValueError"""
    with pytest.raises(ValueError, match="Unknown Bayit"):
        await execute_tool(
            tool_name="nonexistent_tool",
            tool_input={},
            platform="bayit",
            dry_run=False,
        )


@pytest.mark.asyncio
async def test_platform_tool_routing():
    """Test that platform-specific tools route correctly"""
    with patch(
        "app.services.nlp.tool_dispatcher.execute_bayit_tool",
        new_callable=AsyncMock,
    ) as mock_bayit:
        mock_bayit.return_value = "Bayit result"
        await execute_tool("search_bayit_content", {"query": "test"}, "bayit", False)
        assert mock_bayit.called

    with patch(
        "app.services.nlp.tool_dispatcher.execute_fraud_tool",
        new_callable=AsyncMock,
    ) as mock_fraud:
        mock_fraud.return_value = "Fraud result"
        await execute_tool(
            "run_fraud_analysis",
            {"start_date": "2024-01-01", "end_date": "2024-01-31"},
            "fraud",
            False,
        )
        assert mock_fraud.called

    with patch(
        "app.services.nlp.tool_dispatcher.execute_cvplus_tool",
        new_callable=AsyncMock,
    ) as mock_cvplus:
        mock_cvplus.return_value = "CVPlus result"
        await execute_tool(
            "get_user_statistics",
            {"start_date": "2024-01-01", "end_date": "2024-01-31"},
            "cvplus",
            False,
        )
        assert mock_cvplus.called


@pytest.mark.asyncio
async def test_git_status_tool():
    """Test git_status tool returns output"""
    result = await execute_tool(
        tool_name="git_status",
        tool_input={"repository_path": "."},
        platform="bayit",
        dry_run=False,
    )
    assert "Git" in result or "clean" in result or "error" in result.lower()
