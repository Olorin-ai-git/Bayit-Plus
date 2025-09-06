import pytest
import asyncio

from app.service.agent.tools.retriever_tool.retriever_tool import RAGApi


def test_ragapi_search_http_error(monkeypatch):
    import httpx
    from fastapi import HTTPException

    class DummyResp:
        status_code = 418
        text = "fail"

    def raise_exc(*a, **k):
        raise httpx.HTTPStatusError("fail", request=None, response=DummyResp())

    monkeypatch.setattr("httpx.post", raise_exc)
    with pytest.raises(HTTPException) as exc:
        RAGApi.search({}, {})
    assert exc.value.status_code == 418
    assert exc.value.detail == "fail"


def test_ragapi_asearch_http_error(monkeypatch):
    import httpx
    from fastapi import HTTPException

    class DummyResp:
        status_code = 418
        text = "fail"

    class DummyAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            pass

        async def post(self, *a, **k):
            raise httpx.HTTPStatusError("fail", request=None, response=DummyResp())

    monkeypatch.setattr("httpx.AsyncClient", lambda *a, **k: DummyAsyncClient())

    with pytest.raises(HTTPException) as exc:
        asyncio.run(RAGApi.asearch({}, {}))
    assert exc.value.status_code == 418
    assert exc.value.detail == "fail"


