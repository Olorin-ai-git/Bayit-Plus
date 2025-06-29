import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.service.agent.ato_agents.clients.kk_dash_client import KKDashClient


@pytest.fixture
def client():
    return KKDashClient()


def test_get_device_data_success(client):
    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        return_value={"results": [{"device_id": "dev1"}]},
    ):
        result = asyncio.run(client.get_device_data("testuser"))
        assert isinstance(result, list)
        assert result[0]["device_id"] == "dev1"


def test_get_device_data_error(client):
    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        side_effect=Exception("fail"),
    ):
        with pytest.raises(Exception):
            asyncio.run(client.get_device_data("testuser"))


@pytest.mark.asyncio
def test_connect_and_disconnect(client):
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())


@pytest.mark.asyncio
def test_get_current_network_data_success(client):
    with patch.object(
        type(client.splunk_tool),
        "_arun",
        new_callable=AsyncMock,
        return_value={"results": [{"network": "data"}]},
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert isinstance(result, dict)
        assert result["network"] == "data"


@pytest.mark.asyncio
def test_get_current_network_data_empty(client):
    with patch.object(
        type(client.splunk_tool), "_arun", new_callable=AsyncMock, return_value={}
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert result == {}


@pytest.mark.asyncio
def test_get_current_network_data_error(client):
    with patch.object(
        type(client.splunk_tool),
        "_arun",
        new_callable=AsyncMock,
        side_effect=Exception("fail"),
    ):
        with pytest.raises(Exception):
            asyncio.run(client.get_current_network_data("user1"))


@pytest.mark.asyncio
def test_get_user_events(client):
    result = asyncio.run(client.get_user_events("user1"))
    assert isinstance(result, list)
    assert "event_type" in result[0]


@pytest.mark.asyncio
def test_get_device_info(client):
    result = asyncio.run(client.get_device_info("user1"))
    assert isinstance(result, dict)
    assert "device_type" in result


@pytest.mark.asyncio
def test_get_login_data(client):
    result = asyncio.run(client.get_login_data("user1"))
    assert isinstance(result, dict)
    assert "login_timestamps" in result
    assert "session_data" in result
    assert "last_login" in result


def test_init_sets_splunk_tool():
    client = KKDashClient()
    assert hasattr(client, "splunk_tool")


def test_get_device_data_none_result(client):
    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        return_value=None,
    ):
        result = asyncio.run(client.get_device_data("testuser"))
        assert result == []


def test_get_current_network_data_none_result(client):
    with patch.object(
        type(client.splunk_tool), "_arun", new_callable=AsyncMock, return_value=None
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert result == {}


def test_get_user_events_empty_user():
    client = KKDashClient()
    result = asyncio.run(client.get_user_events(""))
    assert isinstance(result, list)
    assert result[0]["event_type"] == "login"


def test_get_device_info_empty_user():
    client = KKDashClient()
    result = asyncio.run(client.get_device_info(""))
    assert isinstance(result, dict)
    assert result["device_type"] == "desktop"


def test_get_login_data_empty_user():
    client = KKDashClient()
    result = asyncio.run(client.get_login_data(""))
    assert isinstance(result, dict)
    assert isinstance(result["login_timestamps"], list)
    assert isinstance(result["session_data"], list)
    assert result["last_login"]
    # Check types of session_data
    for session in result["session_data"]:
        assert "start_time" in session and "end_time" in session


@pytest.mark.asyncio
def test_connect_and_disconnect_no_error():
    client = KKDashClient()
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())


def test_connect_and_disconnect_noop(client):
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())


def test_get_current_network_data_dict_no_results(client):
    with patch.object(
        client.splunk_tool, "_arun", new_callable=AsyncMock, return_value={}
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert result == {}


def test_get_current_network_data_list(client):
    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        return_value=[{"foo": "bar"}],
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert result == {}


def test_get_current_network_data_none(client):
    with patch.object(
        client.splunk_tool, "_arun", new_callable=AsyncMock, return_value=None
    ):
        result = asyncio.run(client.get_current_network_data("user1"))
        assert result == {}


def test_get_current_network_data_http_exception(client):
    from fastapi import HTTPException

    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=500, detail="fail"),
    ):
        with pytest.raises(HTTPException):
            asyncio.run(client.get_current_network_data("user1"))


def test_get_device_data_dict_no_results(client):
    with patch.object(
        client.splunk_tool, "_arun", new_callable=AsyncMock, return_value={}
    ):
        result = asyncio.run(client.get_device_data("user1"))
        assert result == []


def test_get_device_data_list(client):
    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        return_value=[{"foo": "bar"}],
    ):
        result = asyncio.run(client.get_device_data("user1"))
        assert result == []


def test_get_device_data_none(client):
    with patch.object(
        client.splunk_tool, "_arun", new_callable=AsyncMock, return_value=None
    ):
        result = asyncio.run(client.get_device_data("user1"))
        assert result == []


def test_get_device_data_http_exception(client):
    from fastapi import HTTPException

    with patch.object(
        client.splunk_tool,
        "_arun",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=500, detail="fail"),
    ):
        with pytest.raises(HTTPException):
            asyncio.run(client.get_device_data("user1"))


def test_get_login_data_types(client):
    result = asyncio.run(client.get_login_data("user1"))
    assert isinstance(result["login_timestamps"], list)
    assert isinstance(result["session_data"], list)
    assert isinstance(result["last_login"], datetime)
    for session in result["session_data"]:
        assert "start_time" in session and "end_time" in session
        assert isinstance(session["start_time"], datetime)
        assert isinstance(session["end_time"], datetime)


def test_get_user_events_empty_user():
    client = KKDashClient()
    result = asyncio.run(client.get_user_events(""))
    assert isinstance(result, list)
    assert result[0]["event_type"] == "login"


def test_get_device_info_empty_user():
    client = KKDashClient()
    result = asyncio.run(client.get_device_info(""))
    assert isinstance(result, dict)
    assert result["device_type"] == "desktop"
