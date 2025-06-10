import pytest
from unittest.mock import MagicMock, patch

from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool

@pytest.mark.asyncio
async def test_snowflake_query_tool():
    mock_cursor = MagicMock()
    mock_cursor.description = [("COL1",), ("COL2",)]
    mock_cursor.fetchall.return_value = [("a", 1), ("b", 2)]
    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    with patch("snowflake.connector.connect", return_value=mock_conn):
        tool = SnowflakeQueryTool()
        result = await tool._arun("SELECT * FROM test")
        assert result == [{"COL1": "a", "COL2": 1}, {"COL1": "b", "COL2": 2}]
        mock_conn.cursor.assert_called()
        mock_cursor.execute.assert_called_with("SELECT * FROM test")
        mock_cursor.close.assert_called()
        mock_conn.close.assert_called()
