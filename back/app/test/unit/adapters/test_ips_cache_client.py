import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.adapters.ips_cache_client import IPSCacheClient


@pytest.fixture
def client():
    return IPSCacheClient()


def make_session_mock():
    session_mock = MagicMock()
    session_mock.__aenter__ = AsyncMock(return_value=session_mock)
    session_mock.__aexit__ = AsyncMock(return_value=None)
    return session_mock


@pytest.mark.asyncio
async def test_hset_success(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        post_ctx = MagicMock()
        post_ctx.__aenter__ = AsyncMock(return_value=post_ctx)
        post_ctx.__aexit__ = AsyncMock(return_value=None)
        post_ctx.json = AsyncMock(return_value={"result": "ok"})
        session_mock.post.return_value = post_ctx
        await client.hset("key", ["field", "value"])
        session_mock.post.assert_called()


@pytest.mark.asyncio
async def test_expire_success(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        post_ctx = MagicMock()
        post_ctx.__aenter__ = AsyncMock(return_value=post_ctx)
        post_ctx.__aexit__ = AsyncMock(return_value=None)
        post_ctx.json = AsyncMock(return_value={"result": "ok"})
        session_mock.post.return_value = post_ctx
        await client.expire("key", 10)
        session_mock.post.assert_called()


@pytest.mark.asyncio
async def test_zadd_success(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        post_ctx = MagicMock()
        post_ctx.__aenter__ = AsyncMock(return_value=post_ctx)
        post_ctx.__aexit__ = AsyncMock(return_value=None)
        post_ctx.json = AsyncMock(return_value={"result": "ok"})
        session_mock.post.return_value = post_ctx
        await client.zadd("zset", 1.0, "key")
        session_mock.post.assert_called()


@pytest.mark.asyncio
async def test_hgetall_success(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value={"result": {"field": "value"}})
        session_mock.get.return_value = get_ctx
        result = await client.hgetall("key")
        assert result == {"field": "value"}


@pytest.mark.asyncio
async def test_zscan_success(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        with patch.object(
            IPSCacheClient,
            "_send_request",
            side_effect=[(1, ["k1", 1.0]), (None, ["k2", 2.0])],
        ):
            result = await client.zscan("zset")
            assert result == ["k1", "k2"]


@pytest.mark.asyncio
async def test_pipeline_success(client):
    with patch.object(client, "_send_request", return_value=["ok"]):
        result = await client.pipeline([["HSET", "key", "field", "value"]])
        assert result == ["ok"]


@pytest.mark.asyncio
async def test_pipeline_empty(client):
    result = await client.pipeline([])
    assert result == []


@pytest.mark.asyncio
async def test_send_request_get_error(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value={"error": "fail"})
        session_mock.get.return_value = get_ctx
        with pytest.raises(Exception):
            await client._send_request("GET", "endpoint")


@pytest.mark.asyncio
async def test_send_request_post_error(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        post_ctx = MagicMock()
        post_ctx.__aenter__ = AsyncMock(return_value=post_ctx)
        post_ctx.__aexit__ = AsyncMock(return_value=None)
        post_ctx.json = AsyncMock(return_value={"error": "fail"})
        session_mock.post.return_value = post_ctx
        with pytest.raises(Exception):
            await client._send_request(
                "POST", "endpoint", data=["HSET", "key", "field", "value"]
            )


@pytest.mark.asyncio
async def test_send_request_unsupported_method(client):
    with pytest.raises(ValueError):
        await client._send_request("PUT", "endpoint")


@pytest.mark.asyncio
async def test_send_request_exception(client):
    with patch("aiohttp.ClientSession", side_effect=Exception("fail")):
        with pytest.raises(Exception):
            await client._send_request("GET", "endpoint")


def test_get_ips_cache_base_url(monkeypatch):
    monkeypatch.setattr(
        "app.adapters.ips_cache_client.get_settings_for_env",
        lambda: MagicMock(ips_base_url="http://test"),
    )
    from app.adapters.ips_cache_client import get_ips_cache_base_url

    assert get_ips_cache_base_url() == "http://test/v1/cache"


def test_ips_cache_client_init(monkeypatch):
    monkeypatch.setattr(
        "app.adapters.ips_cache_client.get_settings_for_env",
        lambda: MagicMock(ips_base_url="http://test"),
    )
    from app.adapters.ips_cache_client import IPSCacheClient

    client = IPSCacheClient()
    assert client.base_url == "http://test/v1/cache"


@pytest.mark.asyncio
async def test_send_request_result_list_with_result_and_error(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value=[{"result": 1}, {"error": "fail"}])
        session_mock.get.return_value = get_ctx
        result = await client._send_request("GET", "endpoint")
        assert result == [1, "fail"]


@pytest.mark.asyncio
async def test_send_request_result_list_only_error(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value=[{"error": "fail"}])
        session_mock.get.return_value = get_ctx
        result = await client._send_request("GET", "endpoint")
        assert result == ["fail"]


@pytest.mark.asyncio
async def test_send_request_result_list_only_result(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value=[{"result": 42}])
        session_mock.get.return_value = get_ctx
        result = await client._send_request("GET", "endpoint")
        assert result == [42]


@pytest.mark.asyncio
async def test_send_request_result_dict_neither_result_nor_error(client):
    with patch("aiohttp.ClientSession", autospec=True) as mock_session_cls:
        session_mock = make_session_mock()
        mock_session_cls.return_value = session_mock
        get_ctx = MagicMock()
        get_ctx.__aenter__ = AsyncMock(return_value=get_ctx)
        get_ctx.__aexit__ = AsyncMock(return_value=None)
        get_ctx.json = AsyncMock(return_value={"foo": "bar"})
        session_mock.get.return_value = get_ctx
        with pytest.raises(KeyError):
            await client._send_request("GET", "endpoint")


@pytest.mark.asyncio
async def test_zscan_immediate_none_cursor(client):
    with patch.object(client, "_send_request", return_value=(None, ["k1", 1.0])):
        result = await client.zscan("zset")
        assert result == ["k1"]


@pytest.mark.asyncio
async def test_pipeline_exception(client):
    with patch.object(client, "_send_request", side_effect=Exception("fail")):
        with pytest.raises(Exception):
            await client.pipeline([["HSET", "key", "field", "value"]])


@pytest.mark.asyncio
async def test_hset_with_and_without_headers(client):
    with patch.object(client, "_send_request", return_value=None) as mock_send:
        await client.hset("key", ["field", "value"], intuit_header={"foo": "bar"})
        await client.hset("key", ["field", "value"])
        assert mock_send.call_count == 2


@pytest.mark.asyncio
async def test_expire_with_and_without_headers(client):
    with patch.object(client, "_send_request", return_value=None) as mock_send:
        await client.expire("key", 10, intuit_header={"foo": "bar"})
        await client.expire("key", 10)
        assert mock_send.call_count == 2


@pytest.mark.asyncio
async def test_zadd_with_and_without_headers(client):
    with patch.object(client, "_send_request", return_value=None) as mock_send:
        await client.zadd("zset", 1.0, "key", intuit_header={"foo": "bar"})
        await client.zadd("zset", 1.0, "key")
        assert mock_send.call_count == 2
