import asyncio
from unittest.mock import MagicMock, patch

import pytest

from app.service.agent.tools.di_tool.di_tool import (
    DIResponse,
    DITool,
    mock_external_api,
)


@pytest.mark.asyncio
async def test_run_use_mock():
    tool = DITool()
    resp = await tool.run("sess1", "user1", use_mock=True)
    assert isinstance(resp, DIResponse)
    assert resp.session_id == "sess1"
    assert resp.user_id == "user1"
    assert resp.data["device_type"] == "mobile"
    assert resp.status == "SUCCESS"


@pytest.mark.asyncio
async def test_run_success(monkeypatch):
    tool = DITool()

    class MockResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "data": '{"foo": "bar"}',
                "errorMessage": None,
                "elapsedTime": 0.2,
                "status": "OK",
            }

    async def mock_post(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)
    resp = await tool.run("sess2", "user2", use_mock=False)
    assert resp.session_id == "sess2"
    assert resp.user_id == "user2"
    assert resp.data["foo"] == "bar"
    assert resp.status == "OK"


@pytest.mark.asyncio
async def test_run_error(monkeypatch):
    tool = DITool()

    async def mock_post(*args, **kwargs):
        raise Exception("fail")

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)
    resp = await tool.run("sess3", "user3", use_mock=False)
    assert resp.session_id == "sess3"
    assert resp.user_id == "user3"
    assert resp.status == "ERROR"
    assert "fail" in resp.errorMessage


@pytest.mark.asyncio
async def test_mock_external_api():
    result = await mock_external_api("sess4", "user4")
    assert result["data"]["device_type"] == "mobile"
    assert result["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_run_data_field_not_json(monkeypatch):
    tool = DITool()

    class MockResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "data": "notjson",
                "errorMessage": None,
                "elapsedTime": 0.3,
                "status": "OK",
            }

    async def mock_post(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)
    resp = await tool.run("sess5", "user5", use_mock=False)
    assert resp.data == "notjson"
    assert resp.status == "OK"


@pytest.mark.asyncio
async def test_run_data_field_not_string(monkeypatch):
    tool = DITool()

    class MockResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "data": {"bar": 1},
                "errorMessage": None,
                "elapsedTime": 0.4,
                "status": "OK",
            }

    async def mock_post(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)
    resp = await tool.run("sess6", "user6", use_mock=False)
    assert resp.data == {"bar": 1}
    assert resp.status == "OK"
