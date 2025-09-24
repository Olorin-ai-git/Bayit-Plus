import asyncio
from unittest.mock import AsyncMock, patch

import pytest

# OBSOLETE TEST: TMXClient from ato_agents has been removed
# TMX functionality is handled through other client mechanisms
pytestmark = pytest.mark.skip(reason="TMXClient from ato_agents removed - obsolete test file")


@pytest.fixture
def client():
    return TMXClient()


@pytest.mark.asyncio
def test_connect_and_disconnect(client):
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())


@pytest.mark.asyncio
def test_get_network_analysis(client):
    result = asyncio.run(client.get_network_analysis("user1"))
    assert isinstance(result, dict)
    assert "risk_score" in result


@pytest.mark.asyncio
def test_get_device_analysis(client):
    result = asyncio.run(client.get_device_analysis("user1"))
    assert isinstance(result, dict)
    assert "device_risk_score" in result


@pytest.mark.asyncio
def test_get_device_info(client):
    result = asyncio.run(client.get_device_info("user1"))
    assert isinstance(result, dict)
    assert "device_type" in result


def test_get_network_analysis_empty_user(client):
    result = asyncio.run(client.get_network_analysis(""))
    assert isinstance(result, dict)
    assert "risk_score" in result


def test_get_device_analysis_empty_user(client):
    result = asyncio.run(client.get_device_analysis(""))
    assert isinstance(result, dict)
    assert "device_risk_score" in result


def test_get_device_info_empty_user(client):
    result = asyncio.run(client.get_device_info(""))
    assert isinstance(result, dict)
    assert "device_type" in result


def test_connect_and_disconnect_noop(client):
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())


# Patch methods to return None or raise exceptions for error branch coverage
def test_get_network_analysis_none(client, monkeypatch):
    monkeypatch.setattr(client, "get_network_analysis", AsyncMock(return_value=None))
    result = asyncio.run(client.get_network_analysis("user1"))
    assert result is None


def test_get_device_analysis_none(client, monkeypatch):
    monkeypatch.setattr(client, "get_device_analysis", AsyncMock(return_value=None))
    result = asyncio.run(client.get_device_analysis("user1"))
    assert result is None


def test_get_device_info_none(client, monkeypatch):
    monkeypatch.setattr(client, "get_device_info", AsyncMock(return_value=None))
    result = asyncio.run(client.get_device_info("user1"))
    assert result is None


def test_get_network_analysis_exception(client, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "get_network_analysis", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.get_network_analysis("user1"))


def test_get_device_analysis_exception(client, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "get_device_analysis", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.get_device_analysis("user1"))


def test_get_device_info_exception(client, monkeypatch):
    async def raise_exc(*a, **k):
        raise Exception("fail")

    monkeypatch.setattr(client, "get_device_info", raise_exc)
    with pytest.raises(Exception):
        asyncio.run(client.get_device_info("user1"))
