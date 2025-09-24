import asyncio
from unittest.mock import AsyncMock, patch

import pytest

# OBSOLETE TEST: SplunkAgent from ato_agents has been removed
# Splunk functionality is now handled by SplunkQueryTool and MockSplunkClient
pytestmark = pytest.mark.skip(reason="SplunkAgent from ato_agents removed - obsolete test file")


@pytest.fixture
def agent():
    return SplunkAgent(host="localhost", port=8089, username="user", password="pass")


@pytest.mark.asyncio
async def test_execute_query_success(agent):
    # Patch the 'search' method of SplunkClient
    with patch.object(
        agent.client, "search", new_callable=AsyncMock, return_value=[{"result": "ok"}]
    ):
        # The execute_query function is defined in __init__, so we need to call it via the agent
        # We'll test the 'search' method directly for coverage
        result = await agent.client.search("search *")
        assert isinstance(result, list)
        assert result[0]["result"] == "ok"


@pytest.mark.asyncio
async def test_execute_query_error(agent):
    with patch.object(
        agent.client, "search", new_callable=AsyncMock, side_effect=Exception("fail")
    ):
        with pytest.raises(Exception):
            await agent.client.search("search *")


@pytest.mark.asyncio
async def test_create_visualization(agent):
    with patch.object(
        agent.client,
        "create_visualization",
        new_callable=AsyncMock,
        return_value={"chart": "data"},
    ):
        result = await agent.client.create_visualization(
            sourcetype="testtype",
            x_field="x",
            y_field="y",
            chart_type=ChartType.BAR,
            groupby=None,
            limit=10,
            span=None,
        )
        assert result["chart"] == "data"


@pytest.mark.asyncio
def test_create_timechart(agent):
    with patch.object(
        agent.client,
        "create_timechart",
        new_callable=AsyncMock,
        return_value={"timechart": "data"},
    ):
        result = asyncio.run(
            agent.client.create_timechart(
                sourcetype="testtype",
                value_field="val",
                span="1h",
                groupby=None,
                function="count",
                limit=10,
            )
        )
        assert result["timechart"] == "data"


@pytest.mark.asyncio
def test_get_sourcetypes(agent):
    with patch.object(
        agent.client,
        "search",
        new_callable=AsyncMock,
        return_value={"results": [{"sourcetype": "foo"}]},
    ):
        result = asyncio.run(agent.client.get_sourcetypes())
        assert result == ["foo"]


@pytest.mark.asyncio
def test_get_field_summary(agent):
    with patch.object(
        agent.client,
        "search",
        new_callable=AsyncMock,
        return_value={"fields": ["f1", "f2"]},
    ):
        result = asyncio.run(agent.client.get_field_summary("foo"))
        assert "fields" in result


@pytest.mark.asyncio
def test_get_saved_searches(agent):
    with patch.object(
        agent.client,
        "list_saved_searches",
        new_callable=AsyncMock,
        return_value=[{"name": "s1"}],
    ):
        result = asyncio.run(agent.client.list_saved_searches())
        assert result[0]["name"] == "s1"


@pytest.mark.asyncio
def test_run_stats_query(agent):
    with patch.object(
        agent.client, "search", new_callable=AsyncMock, return_value={"stats": "ok"}
    ):
        result = asyncio.run(agent.client.run_stats_query("field", "stype"))
        assert "stats" in result


@pytest.mark.asyncio
def test_connect_and_disconnect(agent):
    with patch.object(agent.client, "connect", new_callable=AsyncMock) as mock_connect:
        with patch.object(
            agent.client, "disconnect", new_callable=AsyncMock
        ) as mock_disconnect:
            asyncio.run(agent.client.connect())
            asyncio.run(agent.client.disconnect())
            mock_connect.assert_called()
            mock_disconnect.assert_called()


def test_format_results(agent):
    results = {"results": [{"field": "value"}]}
    # The format_results method is on the agent, not the client
    formatted = agent.format_results(results)
    assert isinstance(formatted, str)


def test_list_saved_searches_not_connected(agent):
    agent.client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(agent.client.list_saved_searches())


def test_get_sourcetypes_empty_results(agent, monkeypatch):
    async def mock_search(*a, **k):
        return {}

    monkeypatch.setattr(agent.client, "search", mock_search)
    result = asyncio.run(agent.client.get_sourcetypes())
    assert result == []


def test_get_field_summary_empty(agent, monkeypatch):
    async def mock_search(*a, **k):
        return {}

    monkeypatch.setattr(agent.client, "search", mock_search)
    result = asyncio.run(agent.client.get_field_summary("foo"))
    assert result == {}


def test_run_stats_query_error(agent, monkeypatch):
    async def mock_search(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "search", mock_search)
    with pytest.raises(Exception):
        asyncio.run(agent.client.run_stats_query("f", "s"))


def test_disconnect_double(agent):
    agent.client.service = None
    asyncio.run(agent.client.disconnect())
    asyncio.run(agent.client.disconnect())


def test_run_query_job_exception(agent):
    agent.client.service = None
    with pytest.raises(ConnectionError):
        agent.client.run_query("q")


def test_is_connected(agent):
    agent.client.service = None
    assert not agent.client.is_connected()
    agent.client.service = object()
    assert agent.client.is_connected()


def test_create_visualization_not_connected(agent):
    agent.client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(
            agent.client.create_visualization(
                sourcetype="t", x_field="x", y_field="y", chart_type=ChartType.BAR
            )
        )


def test_create_timechart_not_connected(agent):
    agent.client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(agent.client.create_timechart(sourcetype="t", value_field="v"))


def test_create_visualization_empty_results(agent, monkeypatch):
    agent.client.service = True

    async def mock_search(*a, **k):
        return {}

    monkeypatch.setattr(agent.client, "search", mock_search)
    result = asyncio.run(
        agent.client.create_visualization(
            sourcetype="t", x_field="x", y_field="y", chart_type=ChartType.BAR
        )
    )
    assert result["chart_data"] == []


def test_create_timechart_empty_results(agent, monkeypatch):
    agent.client.service = True

    async def mock_search(*a, **k):
        return {}

    monkeypatch.setattr(agent.client, "search", mock_search)
    result = asyncio.run(agent.client.create_timechart(sourcetype="t", value_field="v"))
    assert result["chart_data"] == []


def test_connect_exception(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "connect", raise_exc)
    agent._connected = False
    with pytest.raises(ConnectionError):
        asyncio.run(agent.connect())


def test_disconnect_not_connected(agent):
    agent._connected = False
    # Should not raise
    asyncio.run(agent.disconnect())


def test_format_results_no_results(agent):
    assert agent.format_results({}) == "No results found."
    assert agent.format_results({"results": []}) == "No results found."


def test_format_results_chart_data(agent):
    results = {
        "chart_data": [1, 2, 3],
        "chart_type": "bar",
        "chart_config": {"foo": "bar"},
        "results": [1],
    }
    out = agent.format_results(results)
    assert "Visualization created" in out
    assert "Type: bar" in out
    assert "Data points: 3" in out
    assert "foo" in out


def test_format_results_empty(agent):
    assert agent.format_results(None) == "No results found."


def test_tool_execute_query_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "search", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(agent.client.search("q"))


def test_tool_create_visualization_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "create_visualization", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(
            agent.client.create_visualization(
                sourcetype="t",
                x_field="x",
                y_field="y",
                chart_type=ChartType.BAR,
                groupby=None,
                limit=10,
                span=None,
            )
        )


def test_tool_create_timechart_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "create_timechart", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(
            agent.client.create_timechart(
                sourcetype="t",
                value_field="v",
                span="1h",
                groupby=None,
                function="count",
                limit=10,
            )
        )


def test_tool_get_sourcetypes_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "search", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(
            agent.client.search("| metadata type=sourcetypes | table sourcetype")
        )


def test_tool_get_field_summary_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "search", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(
            agent.client.search(
                '| metadata type=fields sourcetype="foo" | table field, type, count, distinct_count | sort - count'
            )
        )


def test_tool_get_saved_searches_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "list_saved_searches", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(agent.client.list_saved_searches())


def test_tool_run_stats_query_error(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(agent.client, "search", raise_exc)
    agent._connected = True
    with pytest.raises(Exception):
        asyncio.run(
            agent.client.search(
                'search sourcetype="foo" | stats count avg(f) max(f) min(f) stdev(f)'
            )
        )


def test_format_results_chart_data_missing_fields(agent):
    # chart_data present but missing chart_type and chart_config
    results = {"chart_data": [1, 2, 3]}
    formatted = agent.format_results(results)
    assert formatted == "No results found."


def test_format_results_none_and_empty(agent):
    assert agent.format_results(None) == "No results found."
    assert agent.format_results({}) == "No results found."


def test_tool_methods_success_and_error(agent, monkeypatch):
    # Simulate the tool-wrapped methods by calling the underlying functions
    # (since agent.tools is a list of function_tool-wrapped callables)
    # We'll patch client methods to simulate success and error
    async def ok(*a, **k):
        return {"ok": True}

    async def fail(*a, **k):
        raise Exception("fail")

    # Patch all client methods
    monkeypatch.setattr(agent.client, "search", ok)
    monkeypatch.setattr(agent.client, "create_visualization", ok)
    monkeypatch.setattr(agent.client, "create_timechart", ok)
    monkeypatch.setattr(agent.client, "list_saved_searches", ok)
    monkeypatch.setattr(agent.client, "run_stats_query", ok)
    # Call all tool methods for success
    for tool in agent.tools:
        if hasattr(tool, "func"):
            if asyncio.iscoroutinefunction(tool.func):
                result = asyncio.run(
                    tool.func(*(["foo"] * tool.func.__code__.co_argcount))
                )
                assert isinstance(result, dict) or isinstance(result, list)
    # Patch to fail
    monkeypatch.setattr(agent.client, "search", fail)
    monkeypatch.setattr(agent.client, "create_visualization", fail)
    monkeypatch.setattr(agent.client, "create_timechart", fail)
    monkeypatch.setattr(agent.client, "list_saved_searches", fail)
    monkeypatch.setattr(agent.client, "run_stats_query", fail)
    for tool in agent.tools:
        if hasattr(tool, "func"):
            if asyncio.iscoroutinefunction(tool.func):
                try:
                    asyncio.run(tool.func(*(["foo"] * tool.func.__code__.co_argcount)))
                except Exception as e:
                    assert "fail" in str(e)


def test_connected_flag_transitions(agent, monkeypatch):
    # Patch connect/disconnect to do nothing
    async def noop(*a, **k):
        pass

    monkeypatch.setattr(agent.client, "connect", noop)
    monkeypatch.setattr(agent.client, "disconnect", noop)
    agent._connected = False
    asyncio.run(agent.connect())
    assert agent._connected
    asyncio.run(agent.disconnect())
    agent._connected = False


def test_connect_exception_message(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail connect")

    monkeypatch.setattr(agent.client, "connect", raise_exc)
    agent._connected = False
    with pytest.raises(ConnectionError) as exc:
        asyncio.run(agent.connect())
    assert "Failed to connect to Splunk: fail connect" in str(exc.value)


def test_disconnect_raises(agent, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail disconnect")

    monkeypatch.setattr(agent.client, "disconnect", raise_exc)
    agent._connected = True
    with pytest.raises(Exception) as exc:
        asyncio.run(agent.disconnect())
    assert "fail disconnect" in str(exc.value)
    # _connected should remain True if disconnect fails
    assert agent._connected


def test_format_results_unexpected_types(agent):
    # results as a list should raise AttributeError
    with pytest.raises(AttributeError):
        agent.format_results([1, 2, 3])
    # results as a dict with neither 'results' nor 'chart_data'
    assert agent.format_results({"foo": "bar"}) == "No results found."
    # results as a dict with 'chart_data' as a string
    out = agent.format_results({"chart_data": "notalist"})
    assert out == "No results found."


def test_format_results_chart_data_not_list(agent):
    # chart_data is a string
    results = {"chart_data": "notalist", "chart_type": "pie", "chart_config": {}}
    out = agent.format_results(results)
    assert out == "No results found."
