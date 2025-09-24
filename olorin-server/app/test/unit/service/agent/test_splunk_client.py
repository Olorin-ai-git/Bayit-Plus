import asyncio
import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.service.agent.tools.splunk_tool.splunk_tool import MockSplunkClient

# OBSOLETE TEST: Complex SplunkClient with many methods from ato_agents has been removed
# Current implementation only has basic MockSplunkClient with connect/disconnect/search
# Most of these tests are for functionality that no longer exists
pytestmark = pytest.mark.skip(reason="Complex SplunkClient removed - test for obsolete functionality")


@pytest.fixture
def mock_client():
    return MockSplunkClient("host", 8089, "user", "pw")


@pytest.mark.asyncio
async def test_connect_and_disconnect(mock_client):
    await mock_client.connect()
    await mock_client.disconnect()


@pytest.mark.asyncio
async def test_mock_client_basic_operations(mock_client):
    # Test basic mock client operations
    await mock_client.connect()
    result = await mock_client.search("search index=* | head 10")
    assert result == {"results": []}  # Mock returns empty results
    await mock_client.disconnect()


@pytest.mark.asyncio
async def test_search_success():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0", "resultCount": "1"}[k]
    job.results.return_value.read.return_value = b'{"fields": ["f1"], "rows": [["v1"]]}'
    client.service.jobs.create.return_value = job
    result = await client.search("query")
    assert result == [{"f1": "v1"}]


@pytest.mark.asyncio
async def test_search_job_failed():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {
        "isFailed": "1",
        "messages": "fail",
        "resultCount": "0",
    }[k]
    job.get.side_effect = lambda k, default=None: {"messages": "fail"}.get(k, default)
    client.service.jobs.create.return_value = job
    result = await client.search("query")
    assert result == []


@pytest.mark.asyncio
async def test_search_not_connected():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        await client.search("query")


@pytest.mark.asyncio
async def test_list_saved_searches():
    client = RealSplunkClient("host", 8089, "user", "pw")
    saved_search = MagicMock()
    saved_search.name = "n"
    saved_search.content = {
        "search": "s",
        "description": "d",
        "cron_schedule": "c",
        "disabled": False,
    }
    client.service = MagicMock()
    client.service.saved_searches = [saved_search]
    result = await client.list_saved_searches()
    assert result[0]["name"] == "n"


@pytest.mark.asyncio
async def test_get_sourcetypes(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return {"results": [{"sourcetype": "foo"}]}

    monkeypatch.setattr(client, "search", mock_search)
    result = await client.get_sourcetypes()
    assert result == ["foo"]


@pytest.mark.asyncio
async def test_get_field_summary(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return {"fields": ["f"], "rows": [["v"]]}

    monkeypatch.setattr(client, "search", mock_search)
    result = await client.get_field_summary("bar")
    assert "fields" in result


@pytest.mark.asyncio
async def test_run_stats_query(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return {"fields": ["f"], "rows": [["v"]]}

    monkeypatch.setattr(client, "search", mock_search)
    result = await client.run_stats_query("f", "s")
    assert "fields" in result


def test_run_query_success():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.results.return_value = [
        {"_time": "t", "source": "s", "sourcetype": "st", "host": "h", "_raw": "r"}
    ]
    client.service.jobs.create.return_value = job
    with patch(
        "splunklib.results.ResultsReader", return_value=job.results.return_value
    ):
        result = client.run_query("q")
        assert result[0]["time"] == "t"


def test_run_query_not_connected():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        client.run_query("q")


def test_is_connected():
    client = RealSplunkClient("host", 8089, "user", "pw")
    assert not client.is_connected()
    client.service = MagicMock()
    assert client.is_connected()


@pytest.mark.asyncio
def test_create_visualization_not_connected():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(
            client.create_visualization(
                sourcetype="testtype",
                x_field="x",
                y_field="y",
                chart_type="bar",
                groupby=None,
                limit=10,
                span=None,
            )
        )


@pytest.mark.asyncio
def test_create_visualization_success(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = True

    async def mock_search(query):
        return {"results": [{"foo": "bar"}]}

    monkeypatch.setattr(client, "search", mock_search)
    result = asyncio.run(
        client.create_visualization(
            sourcetype="testtype",
            x_field="x",
            y_field="y",
            chart_type="bar",
            groupby=None,
            limit=10,
            span=None,
        )
    )
    assert result["chart_data"] == [{"foo": "bar"}]


@pytest.mark.asyncio
def test_create_timechart_not_connected():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(
            client.create_timechart(
                sourcetype="testtype",
                value_field="val",
                span="1h",
                groupby=None,
                function="count",
                limit=10,
            )
        )


@pytest.mark.asyncio
def test_create_timechart_success(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = True

    async def mock_search(query):
        return {"results": [{"foo": "bar"}]}

    monkeypatch.setattr(client, "search", mock_search)
    result = asyncio.run(
        client.create_timechart(
            sourcetype="testtype",
            value_field="val",
            span="1h",
            groupby=None,
            function="count",
            limit=10,
        )
    )
    assert result["chart_data"] == [{"foo": "bar"}]


def test_del_executor_shutdown():
    client = RealSplunkClient("host", 8089, "user", "pw")
    # Should not raise
    del client


def test_run_query_error():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    client.service.jobs.create.side_effect = Exception("fail")
    with pytest.raises(Exception):
        client.run_query("q")


@pytest.mark.asyncio
def test_get_sourcetypes_empty(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return {"results": []}

    monkeypatch.setattr(client, "search", mock_search)
    result = asyncio.run(client.get_sourcetypes())
    assert result == []


@pytest.mark.asyncio
def test_get_field_summary_empty(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return {}

    monkeypatch.setattr(client, "search", mock_search)
    result = asyncio.run(client.get_field_summary("bar"))
    assert result == {}


@pytest.mark.asyncio
def test_mock_connect_and_disconnect(mock_client):
    asyncio.run(mock_client.connect())
    asyncio.run(mock_client.disconnect())


@pytest.mark.asyncio
def test_get_login_history_normal(mock_client):
    result = asyncio.run(mock_client.get_login_history("user1"))
    assert isinstance(result, list)
    assert result[0]["event_type"] == "login"


@pytest.mark.asyncio
def test_get_error_events_normal(mock_client):
    result = asyncio.run(mock_client.get_error_events("user1"))
    assert isinstance(result, list)
    assert result[0]["event_type"] == "error"


@pytest.mark.asyncio
def test_get_device_history_normal(mock_client):
    now = datetime.datetime.now(datetime.timezone.utc)
    result = asyncio.run(mock_client.get_device_history("user1", now))
    assert isinstance(result, list)
    assert result[0]["device_type"] == "desktop"


@pytest.mark.asyncio
def test_get_user_history_normal(mock_client):
    now = datetime.datetime.now(datetime.timezone.utc)
    result = asyncio.run(mock_client.get_user_history("user1", now))
    assert isinstance(result, list)
    assert "login_frequency" in result[0]


@pytest.mark.asyncio
def test_get_login_history_empty_user(mock_client):
    result = asyncio.run(mock_client.get_login_history(""))
    assert isinstance(result, list)


@pytest.mark.asyncio
def test_get_error_events_empty_user(mock_client):
    result = asyncio.run(mock_client.get_error_events(""))
    assert isinstance(result, list)


@pytest.mark.asyncio
def test_get_device_history_empty_user(mock_client):
    now = datetime.datetime.now(datetime.timezone.utc)
    result = asyncio.run(mock_client.get_device_history("", now))
    assert isinstance(result, list)


@pytest.mark.asyncio
def test_get_user_history_empty_user(mock_client):
    now = datetime.datetime.now(datetime.timezone.utc)
    result = asyncio.run(mock_client.get_user_history("", now))
    assert isinstance(result, list)


def test_get_login_history_none(mock_client, monkeypatch):
    monkeypatch.setattr(mock_client, "get_login_history", AsyncMock(return_value=None))
    result = asyncio.run(mock_client.get_login_history("user1"))
    assert result is None


def test_get_error_events_none(mock_client, monkeypatch):
    monkeypatch.setattr(mock_client, "get_error_events", AsyncMock(return_value=None))
    result = asyncio.run(mock_client.get_error_events("user1"))
    assert result is None


def test_get_device_history_none(mock_client, monkeypatch):
    now = datetime.datetime.now(datetime.timezone.utc)
    monkeypatch.setattr(mock_client, "get_device_history", AsyncMock(return_value=None))
    result = asyncio.run(mock_client.get_device_history("user1", now))
    assert result is None


def test_get_user_history_none(mock_client, monkeypatch):
    now = datetime.datetime.now(datetime.timezone.utc)
    monkeypatch.setattr(mock_client, "get_user_history", AsyncMock(return_value=None))
    result = asyncio.run(mock_client.get_user_history("user1", now))
    assert result is None


def test_get_login_history_exception(mock_client, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(mock_client, "get_login_history", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(mock_client.get_login_history("user1"))


def test_get_error_events_exception(mock_client, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(mock_client, "get_error_events", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(mock_client.get_error_events("user1"))


def test_get_device_history_exception(mock_client, monkeypatch):
    now = datetime.datetime.now(datetime.timezone.utc)

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(mock_client, "get_device_history", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(mock_client.get_device_history("user1", now))


def test_get_user_history_exception(mock_client, monkeypatch):
    now = datetime.datetime.now(datetime.timezone.utc)

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(mock_client, "get_user_history", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(mock_client.get_user_history("user1", now))


def test_connect_invalid_credentials(monkeypatch):
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    monkeypatch.setattr(
        "splunklib.client.connect",
        lambda **kwargs: (_ for _ in ()).throw(Exception("fail")),
    )
    with pytest.raises(Exception):
        asyncio.run(client.connect())


def test_search_job_failed(monkeypatch):
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {
        "isFailed": "1",
        "messages": "fail",
        "resultCount": "0",
    }[k]
    job.get.side_effect = lambda k, default=None: {"messages": "fail"}.get(k, default)
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_result_count_zero(monkeypatch):
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0", "resultCount": "0"}[k]
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_malformed_json(monkeypatch):
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0", "resultCount": "1"}[k]
    job.results.return_value.read.return_value = b"{bad json}"
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_list_saved_searches_no_service():
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(client.list_saved_searches())


def test_run_query_job_exception():
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    client.service.jobs.create.side_effect = Exception("fail")
    with pytest.raises(Exception):
        client.run_query("q")


def test_is_connected_true_false():
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    assert not client.is_connected()
    client.service = object()
    assert client.is_connected()


def test_create_visualization_not_connected():
    from app.service.agent.ato_agents.splunk_agent.client import ChartType, SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(
            client.create_visualization(
                sourcetype="t", x_field="x", y_field="y", chart_type=ChartType.BAR
            )
        )


def test_create_timechart_not_connected():
    from app.service.agent.ato_agents.splunk_agent.client import SplunkClient

    client = SplunkClient("host", 8089, "user", "pw")
    client.service = None
    with pytest.raises(ConnectionError):
        asyncio.run(client.create_timechart(sourcetype="t", value_field="v"))


def test_search_job_results_raises(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0", "resultCount": "1"}[k]

    def raise_results(*a, **k):
        raise Exception("fail")

    job.results.side_effect = raise_results
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_job_results_malformed_json(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0", "resultCount": "1"}[k]
    job.results.return_value.read.return_value = b"{bad json"
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_job_missing_resultCount(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"isFailed": "0"}[k]
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_job_missing_isFailed(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.__getitem__.side_effect = lambda k: {"resultCount": "1"}[k]
    job.results.return_value.read.return_value = b'{"fields": ["f1"], "rows": [["v1"]]}'
    client.service.jobs.create.return_value = job
    result = asyncio.run(client.search("query"))
    assert result == []


def test_search_job_timeout(monkeypatch):
    import time

    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.return_value = False
    client.service.jobs.create.return_value = job
    # Patch time.sleep to break loop
    orig_sleep = time.sleep

    def fake_sleep(secs):
        raise Exception("timeout")

    time.sleep = fake_sleep
    result = asyncio.run(client.search("query"))
    assert result == []
    time.sleep = orig_sleep


def test_list_saved_searches_empty():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    client.service.saved_searches = []
    result = asyncio.run(client.list_saved_searches())
    assert result == []


def test_get_sourcetypes_non_dict(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def mock_search(*a, **k):
        return [1, 2, 3]

    monkeypatch.setattr(client, "search", mock_search)
    result = asyncio.run(client.get_sourcetypes())
    assert result == []


def test_get_field_summary_raises(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "search", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.get_field_summary("foo"))


def test_run_stats_query_raises(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "search", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.run_stats_query("foo", "bar"))


def test_run_query_results_raises():
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = MagicMock()
    job = MagicMock()
    job.is_done.side_effect = [False, True]
    job.results.side_effect = Exception("fail")
    client.service.jobs.create.return_value = job
    with patch("splunklib.results.ResultsReader", side_effect=Exception("fail")):
        with pytest.raises(Exception):
            client.run_query("q")


def test_create_visualization_search_raises(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = True

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "search", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.create_visualization("type", "x", "y", "bar"))


def test_create_timechart_search_raises(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    client.service = True

    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "search", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.create_timechart("type", "val"))


def test_del_executor_none(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    monkeypatch.setattr(client, "_executor", None)
    try:
        client.__del__()
    except Exception:
        pytest.fail("__del__ raised with _executor None")


def test_connect_disconnect_idempotent(monkeypatch):
    client = RealSplunkClient("host", 8089, "user", "pw")
    with patch("splunklib.client.connect", return_value=MagicMock()):
        asyncio.run(client.connect())
        asyncio.run(client.connect())
        asyncio.run(client.disconnect())
        asyncio.run(client.disconnect())
