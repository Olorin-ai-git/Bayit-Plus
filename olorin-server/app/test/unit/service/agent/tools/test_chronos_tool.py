import asyncio
from unittest.mock import MagicMock, patch

import pytest

from app.service.agent.tools.chronos_tool.chronos_tool import ChronosTool


@pytest.mark.asyncio
def test_run_success():
    tool = ChronosTool()
    with patch.object(tool, "_query_chronos_api", return_value={"foo": "bar"}):
        result = tool._run("user1", ["field1"])
        assert "foo" in result


@pytest.mark.asyncio
def test_run_error():
    tool = ChronosTool()
    with patch.object(tool, "_query_chronos_api", side_effect=Exception("fail")):
        with pytest.raises(Exception):
            tool._run("user1", ["field1"])


@pytest.mark.asyncio
async def test_arun_success():
    tool = ChronosTool()
    with patch.object(tool, "_query_chronos_api", return_value={"foo": "bar"}):
        result = await tool._arun("user1", ["field1"])
        assert "foo" in result


@pytest.mark.asyncio
async def test_arun_error():
    tool = ChronosTool()
    with patch.object(tool, "_query_chronos_api", side_effect=Exception("fail")):
        result = await tool._arun("user1", ["field1"])
        assert "error" in result or result


def test_query_chronos_api_success(monkeypatch):
    tool = ChronosTool()

    class MockConn:
        def request(self, *a, **k):
            pass

        def getresponse(self):
            class Resp:
                status = 200

                def read(self):
                    return b'{"foo": "bar"}'

            return Resp()

    monkeypatch.setattr("http.client.HTTPSConnection", lambda *a, **k: MockConn())
    with patch.object(
        tool, "_get_fresh_auth_token", return_value=("uid", "tok", "rid")
    ):
        result = tool._query_chronos_api("user1", ["field1"])
        assert result["foo"] == "bar"


def test_query_chronos_api_error(monkeypatch):
    tool = ChronosTool()

    class MockConn:
        def request(self, *a, **k):
            pass

        def getresponse(self):
            class Resp:
                status = 500

                def read(self):
                    return b"fail"

            return Resp()

    monkeypatch.setattr("http.client.HTTPSConnection", lambda *a, **k: MockConn())
    with patch.object(
        tool, "_get_fresh_auth_token", return_value=("uid", "tok", "rid")
    ):
        result = tool._query_chronos_api("user1", ["field1"])
        assert "error" in result


def test_query_chronos_api_invalid_json(monkeypatch):
    tool = ChronosTool()

    class MockConn:
        def request(self, *a, **k):
            pass

        def getresponse(self):
            class Resp:
                status = 200

                def read(self):
                    return b"{bad json}"

            return Resp()

    monkeypatch.setattr("http.client.HTTPSConnection", lambda *a, **k: MockConn())
    with patch.object(
        tool, "_get_fresh_auth_token", return_value=("uid", "tok", "rid")
    ):
        result = tool._query_chronos_api("user1", ["field1"])
        assert "error" in result


def test_get_fresh_auth_token_success(monkeypatch):
    tool = ChronosTool()

    class MockConn:
        def request(self, *a, **k):
            pass

        def getresponse(self):
            class Resp:
                status = 200

                def read(self):
                    return b'{"data": {"identitySignInInternalApplicationWithPrivateAuth": {"authorizationHeader": "header"}}}'

            return Resp()

    monkeypatch.setattr("http.client.HTTPSConnection", lambda *a, **k: MockConn())
    with patch(
        "app.utils.auth_utils.get_userid_and_token_from_authn_header",
        return_value=("uid", "tok", "rid"),
    ):
        uid, tok, rid = tool._get_fresh_auth_token()
        assert uid == "uid"


def test_get_fresh_auth_token_error(monkeypatch):
    tool = ChronosTool()

    class MockConn:
        def request(self, *a, **k):
            pass

        def getresponse(self):
            class Resp:
                status = 500

                def read(self):
                    return b"fail"

            return Resp()

    monkeypatch.setattr("http.client.HTTPSConnection", lambda *a, **k: MockConn())
    uid, tok, rid = tool._get_fresh_auth_token()
    assert uid == ""
