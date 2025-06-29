import pytest

from app.service.agent.tools.retriever_tool.retriever_tool import (
    QBRetrieverTool,
    RAGApi,
)


# Dummy agent context to simulate getting headers.
class DummyAgentContext:
    def get_header(self):
        return {"Authorization": "Bearer testtoken"}


# Dummy RunnableConfig (using a simple dict) with agent_context injected.
@pytest.fixture
def dummy_config():
    return {"configurable": {"agent_context": DummyAgentContext()}}


# Dummy state fixture representing a typical RAGInputState.
@pytest.fixture
def dummy_state():
    # The state contains messages and conversation_id.
    return {
        "messages": [{"content": "Test message", "metadata": {}}],
        "conversation_id": "test-convo-id",
    }


# Dummy function to simulate the RAGApi.search call.
def dummy_rag_search(headers, payload):
    # Simulate a response with two choices.
    return {"choices": [{"content": "result1"}, {"content": "result2"}]}


def test_retrieve_run(monkeypatch, dummy_state, dummy_config):
    # Patch the RAGApi.search method with our dummy implementation.
    monkeypatch.setattr(RAGApi, "search", dummy_rag_search)

    # Instantiate the tool under test.
    tool = QBRetrieverTool()
    # Optionally, override index_name if needed.
    tool.index_name = "test_index"

    # Invoke the _run method.
    result = tool._run(dummy_state, dummy_config)

    # The expected result is a comma-separated string of the choices.
    expected = "result1, result2"
    assert result == expected, f"Expected '{expected}', but got '{result}'"


# Additional tests could be added here for error handling or asynchronous execution.


def dummy_rag_asearch(headers, payload):
    class DummyResp:
        async def __call__(self, *a, **k):
            return {"choices": [{"content": "async1"}, {"content": "async2"}]}

    return DummyResp()()


@pytest.mark.asyncio
async def test_aretrieve_arun(monkeypatch, dummy_state, dummy_config):
    monkeypatch.setattr(
        RAGApi,
        "asearch",
        lambda headers, payload: {
            "choices": [{"content": "async1"}, {"content": "async2"}]
        },
    )
    tool = QBRetrieverTool()
    tool.index_name = "test_index"
    # Patch agent_context.get_header
    dummy_config["configurable"]["agent_context"].get_header = lambda: {
        "Authorization": "Bearer testtoken"
    }

    # Patch aretrieve_arun to call dummy async
    async def dummy_asearch(headers, payload):
        return {"choices": [{"content": "async1"}, {"content": "async2"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    result = await tool.aretrieve_arun(dummy_state, dummy_config)
    assert "async1" in result and "async2" in result


def test_run_missing_metadata(monkeypatch, dummy_config):
    monkeypatch.setattr(RAGApi, "search", dummy_rag_search)
    tool = QBRetrieverTool()
    state = {
        "messages": [{"content": "Test message"}],
        "conversation_id": "test-convo-id",
    }
    result = tool._run(state, dummy_config)
    assert "result1" in result


def test_run_no_conversation_id(monkeypatch, dummy_config):
    monkeypatch.setattr(RAGApi, "search", dummy_rag_search)
    tool = QBRetrieverTool()
    state = {"messages": [{"content": "Test message", "metadata": {}}]}
    result = tool._run(state, dummy_config)
    assert "result1" in result


@pytest.mark.asyncio
async def test_aretrieve_arun_no_conversation_id(monkeypatch, dummy_config):
    async def dummy_asearch(headers, payload):
        return {"choices": [{"content": "async1"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    state = {"messages": [{"content": "Test message", "metadata": {}}]}
    result = await tool.aretrieve_arun(state, dummy_config)
    assert "async1" in result


@pytest.mark.asyncio
async def test_aretrieve_arun_invalid_message(monkeypatch, dummy_config):
    async def dummy_asearch(headers, payload):
        return {"choices": [{"content": "async1"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    # message is not a dict
    state = {"messages": ["notadict"], "conversation_id": "test-convo-id"}
    result = await tool.aretrieve_arun(state, dummy_config)
    assert "async1" in result


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
    import asyncio

    with pytest.raises(HTTPException) as exc:
        asyncio.run(RAGApi.asearch({}, {}))
    assert exc.value.status_code == 418
    assert exc.value.detail == "fail"


def test_build_message_metadata_deep_and_shallow():
    tool = QBRetrieverTool()
    # Shallow merge
    tool.query_configs = {"foo": "bar"}
    meta = tool._build_message_metadata()
    assert meta["query_configs"]["foo"] == "bar"
    # Deep merge
    tool.query_configs = {"query_configs": {"baz": 1}}
    meta = tool._build_message_metadata()
    assert meta["query_configs"]["baz"] == 1


def test_retrieve_run_empty_choices(monkeypatch, dummy_state, dummy_config):
    def dummy_search(*, headers=None, payload=None):
        return {"choices": []}

    monkeypatch.setattr(RAGApi, "search", dummy_search)
    tool = QBRetrieverTool()
    result = tool._run(dummy_state, dummy_config)
    assert result == ""


def test_aretrieve_arun_empty_choices(monkeypatch, dummy_state, dummy_config):
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": []}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    import asyncio

    result = asyncio.run(tool.aretrieve_arun(dummy_state, dummy_config))
    assert result == ""


def test_retrieve_run_non_dict_message(monkeypatch, dummy_config):
    monkeypatch.setattr(RAGApi, "search", dummy_rag_search)
    tool = QBRetrieverTool()
    state = {"messages": ["notadict"], "conversation_id": "test-convo-id"}
    result = tool._run(state, dummy_config)
    assert "result1" in result


def test_ttretrievertool_run_and_arun(monkeypatch, dummy_config):
    def dummy_search(*, headers=None, payload=None):
        return {"choices": [{"content": "result1"}, {"content": "result2"}]}

    monkeypatch.setattr(RAGApi, "search", dummy_search)
    tool = __import__(
        "app.service.agent.tools.retriever_tool.retriever_tool",
        fromlist=["TTRetrieverTool"],
    ).TTRetrieverTool()
    state = {
        "messages": [{"content": "Test message", "metadata": {}}],
        "conversation_id": "test-convo-id",
    }
    result = tool._run(state, dummy_config)
    assert "result1" in result

    # async
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": [{"content": "async1"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    import asyncio

    result2 = asyncio.run(tool._arun(state, dummy_config))
    assert "async1" in result2


def test_messageitem_validation():
    import pydantic

    from app.service.agent.tools.retriever_tool.retriever_tool import MessageItem

    # Missing required fields
    with pytest.raises(pydantic.ValidationError):
        MessageItem()
    # Extra field
    with pytest.raises(pydantic.ValidationError):
        MessageItem(role="user", content="hi", extra="nope")


def test_qbretrievertool_run_direct(monkeypatch, dummy_config):
    def dummy_search(*, headers=None, payload=None):
        return {"choices": [{"content": "direct1"}]}

    monkeypatch.setattr(RAGApi, "search", dummy_search)
    tool = QBRetrieverTool()
    state = {"messages": [{"content": "msg", "metadata": {}}], "conversation_id": "cid"}
    result = tool._run(state, dummy_config)
    assert result == "direct1"


import asyncio


@pytest.mark.asyncio
async def test_qbretrievertool_arun_direct(monkeypatch, dummy_config):
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": [{"content": "adirect1"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    state = {"messages": [{"content": "msg", "metadata": {}}], "conversation_id": "cid"}
    result = await tool._arun(state, dummy_config)
    assert result == "adirect1"


def test_ttretrievertool_run_direct(monkeypatch, dummy_config):
    def dummy_search(*, headers=None, payload=None):
        return {"choices": [{"content": "tdirect1"}]}

    monkeypatch.setattr(RAGApi, "search", dummy_search)
    from app.service.agent.tools.retriever_tool.retriever_tool import TTRetrieverTool

    tool = TTRetrieverTool()
    state = {"messages": [{"content": "msg", "metadata": {}}], "conversation_id": "cid"}
    result = tool._run(state, dummy_config)
    assert result == "tdirect1"


@pytest.mark.asyncio
async def test_ttretrievertool_arun_direct(monkeypatch, dummy_config):
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": [{"content": "atdirect1"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    from app.service.agent.tools.retriever_tool.retriever_tool import TTRetrieverTool

    tool = TTRetrieverTool()
    state = {"messages": [{"content": "msg", "metadata": {}}], "conversation_id": "cid"}
    result = await tool._arun(state, dummy_config)
    assert result == "atdirect1"


def test_ragapi_search_logs_debug(monkeypatch, caplog):
    # Patch httpx.post to return a dummy response
    class DummyResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"content": "foo"}]}

    monkeypatch.setattr("httpx.post", lambda *a, **k: DummyResp())
    with caplog.at_level("DEBUG"):
        RAGApi.search({"Authorization": "token"}, {"foo": "bar"})
    assert any("calling api" in m for m in caplog.messages)


def test_retrieve_run_logs_warning(monkeypatch, dummy_config, caplog):
    # Patch RAGApi.search to return a valid response
    monkeypatch.setattr(
        RAGApi, "search", lambda *a, **k: {"choices": [{"content": "foo"}]}
    )
    tool = QBRetrieverTool()
    # Use a message that is not a dict to trigger the warning
    state = {"messages": [123], "conversation_id": "cid"}
    with caplog.at_level("WARNING"):
        result = tool._run(state, dummy_config)
    assert "not a dict" in " ".join(caplog.messages)
    assert result == "foo"


@pytest.mark.asyncio
async def test_aretrieve_arun_logs_debug(monkeypatch, dummy_config, caplog):
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": [{"content": "foo"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    state = {"messages": [{"content": "msg", "metadata": {}}], "conversation_id": "cid"}
    with caplog.at_level("DEBUG"):
        result = await tool._arun(state, dummy_config)
    assert "async response from RAG search" in " ".join(caplog.messages)
    assert result == "foo"


@pytest.mark.asyncio
async def test_aretrieve_arun_logs_warning(monkeypatch, dummy_config, caplog):
    async def dummy_asearch(*, headers=None, payload=None):
        return {"choices": [{"content": "foo"}]}

    monkeypatch.setattr(RAGApi, "asearch", dummy_asearch)
    tool = QBRetrieverTool()
    state = {"messages": [123], "conversation_id": "cid"}
    with caplog.at_level("WARNING"):
        result = await tool._arun(state, dummy_config)
    assert "not a dict" in " ".join(caplog.messages)
    assert result == "foo"
