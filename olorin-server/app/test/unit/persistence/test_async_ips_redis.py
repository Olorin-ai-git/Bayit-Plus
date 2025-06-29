import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.adapters.ips_cache_client import IPSCacheClient
from app.models.agent_context import AgentContext
from app.models.agent_headers import IntuitHeader
from app.persistence.async_ips_redis import (
    AsyncRedisSaver,
    _create_chunks_commands,
    _make_checkpoints_zset_name,
    _make_redis_checkpoint_key,
    _parse_redis_checkpoint_key,
)


@pytest.fixture
def mock_ips_cache_client():
    """Create a mock IPSCacheClient with async methods mocked."""
    with patch("app.persistence.async_ips_redis.IPSCacheClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_agent_context():
    """Create a mock AgentContext for testing."""
    mock_context = MagicMock(spec=AgentContext)
    mock_context.thread_id = "test_thread_id"
    mock_context.get_header.return_value = {"intuit_tid": "test_tid"}
    return mock_context


@pytest.fixture
def mock_config(mock_agent_context):
    """Create a mock config dictionary for testing."""
    return {
        "configurable": {
            "agent_context": mock_agent_context,
            "checkpoint_ns": "test_namespace",
            "checkpoint_id": "test_checkpoint_id",
        }
    }


@pytest.fixture
def redis_saver(mock_ips_cache_client):
    """Create an instance of AsyncRedisSaver for testing with mocked IPSCacheClient."""
    return AsyncRedisSaver(namespace="test")


@pytest.mark.asyncio
async def test_create_chunks_commands():
    """Test the _create_chunks_commands utility function."""
    array = list(range(1000))
    chunks = _create_chunks_commands(array, size=300)

    assert len(chunks) == 4
    assert len(chunks[0]) == 300
    assert len(chunks[1]) == 300
    assert len(chunks[2]) == 300
    assert len(chunks[3]) == 100


@pytest.mark.asyncio
async def test_make_redis_checkpoint_key():
    """Test the _make_redis_checkpoint_key utility function."""
    key = _make_redis_checkpoint_key(
        "test_project", "test_thread", "test_ns", "test_id"
    )
    assert key == "checkpoint:test_project:test_thread:test_ns:test_id"


@pytest.mark.asyncio
async def test_make_checkpoints_zset_name():
    """Test the _make_checkpoints_zset_name utility function."""
    zset_name = _make_checkpoints_zset_name("test_project", "test_thread")
    assert zset_name == "checkpoint_keys:test_project:test_thread"


@pytest.mark.asyncio
async def test_parse_redis_checkpoint_key():
    """Test the _parse_redis_checkpoint_key utility function."""
    key = "checkpoint:test_project:test_thread:test_ns:test_id"
    parsed = _parse_redis_checkpoint_key(key)

    assert parsed["thread_id"] == "test_thread"
    assert parsed["checkpoint_ns"] == "test_ns"
    assert parsed["checkpoint_id"] == "test_id"


@pytest.mark.asyncio
async def test_aput(redis_saver, mock_config, mock_ips_cache_client):
    """Test the aput method of AsyncRedisSaver."""
    # Mock the serializer methods
    redis_saver.serde = MagicMock()
    redis_saver.serde.dumps_typed.return_value = ("test_type", "serialized_checkpoint")
    redis_saver.serde.dumps.return_value = "serialized_metadata"

    checkpoint = {"id": "test_checkpoint_id", "data": "test_data"}
    metadata = {"created_at": "2023-01-01"}

    # Setup the mock pipeline response
    mock_ips_cache_client.pipeline.return_value = ["OK", "OK", 1]

    # Call the method under test
    result = await redis_saver.aput(mock_config, checkpoint, metadata)

    # Verify the result
    assert result["configurable"]["checkpoint_id"] == "test_checkpoint_id"
    assert result["configurable"]["checkpoint_ns"] == "test_namespace"
    assert result["configurable"]["thread_id"] == "test_thread_id"

    # Verify the pipeline was called with expected arguments
    mock_ips_cache_client.pipeline.assert_called_once()
    # Check that the pipeline commands are correctly formatted
    call_args = mock_ips_cache_client.pipeline.call_args[0][0]
    assert len(call_args) == 4  # Should have HSET, EXPIRE, and ZADD commands


@pytest.mark.asyncio
async def test_aput_writes(redis_saver, mock_config, mock_ips_cache_client):
    """Test the aput_writes method of AsyncRedisSaver."""
    # Mock the serializer methods
    redis_saver.serde = MagicMock()
    redis_saver.serde.dumps_typed.return_value = ("test_type", "serialized_value")

    writes = [("channel1", "value1"), ("channel2", "value2")]
    task_id = "test_task_id"

    # Setup the mock pipeline response
    mock_ips_cache_client.pipeline.return_value = ["OK", "OK", 1, "OK", "OK", 1]

    # Call the method under test
    result = await redis_saver.aput_writes(mock_config, writes, task_id)

    # Verify the pipeline was called with expected arguments
    mock_ips_cache_client.pipeline.assert_called_once()
    # Verify that the result matches the input config
    call_args = mock_ips_cache_client.pipeline.call_args[0][0]
    assert len(call_args) == 8
    assert result == mock_config


@pytest.mark.asyncio
async def test_aget_tuple(redis_saver, mock_config, mock_ips_cache_client):
    """Test the aget_tuple method of AsyncRedisSaver."""
    # Mock the dependencies
    redis_saver.serde = MagicMock()
    redis_saver.serde.loads_typed.return_value = {"data": "test_data"}
    redis_saver.serde.loads.return_value = {"created_at": "2023-01-01"}

    # Setup mock responses for _aget_checkpoint_key
    mock_checkpoint_key = (
        "checkpoint:test:test_thread_id:test_namespace:test_checkpoint_id"
    )

    # Mock the _aget_checkpoint_key method to return our mock key directly
    with patch.object(
        redis_saver, "_aget_checkpoint_key", return_value=mock_checkpoint_key
    ):
        # Mock hgetall response for the checkpoint data
        mock_ips_cache_client.hgetall.return_value = [
            "checkpoint",
            "encoded_checkpoint",
            "type",
            "test_type",
            "checkpoint_id",
            "test_checkpoint_id",
            "metadata",
            "encoded_metadata",
            "parent_checkpoint_id",
            "",
        ]

        # For the writes zset, return an empty list to avoid parsing issues
        mock_ips_cache_client.zscan.return_value = []
        mock_ips_cache_client.pipeline.return_value = []

        # Call the method under test
        result = await redis_saver.aget_tuple(mock_config)

        # Verify the result
        assert result is not None
        assert result.config["configurable"]["checkpoint_id"] == "test_checkpoint_id"
        assert result.checkpoint == {"data": "test_data"}
        assert result.metadata == {"created_at": "2023-01-01"}

        # Verify that the client methods were called as expected
        mock_ips_cache_client.hgetall.assert_called_once()
        mock_ips_cache_client.zscan.assert_called_once()


@pytest.mark.asyncio
def test_make_writes_zset_name():
    from app.persistence.async_ips_redis import _make_writes_zset_name

    zset_name = _make_writes_zset_name("proj", "thread", "ns")
    assert zset_name == "writes_keys:proj:thread:ns"


@pytest.mark.asyncio
def test_make_redis_writes_key():
    from app.persistence.async_ips_redis import _make_redis_writes_key

    key = _make_redis_writes_key("proj", "thread", "ns", "cid", "tid", 5)
    assert key == "writes:proj:thread:ns:cid:tid:5"


@pytest.mark.asyncio
def test_parse_redis_checkpoint_writes_key():
    from app.persistence.async_ips_redis import _parse_redis_checkpoint_writes_key

    key = "writes:proj:thread:ns:cid:tid:5"
    parsed = _parse_redis_checkpoint_writes_key(key)
    assert parsed["thread_id"] == "thread"
    assert parsed["checkpoint_ns"] == "thread:ns"
    assert parsed["checkpoint_id"] == "cid"
    assert parsed["task_id"] == "tid"
    assert parsed["idx"] == "5"


@pytest.mark.asyncio
def test_decode_if_bytes():
    from app.persistence.async_ips_redis import _decode_if_bytes

    assert _decode_if_bytes(b"abc") == "abc"
    assert _decode_if_bytes("xyz") == "xyz"


@pytest.mark.asyncio
def test_filter_keys():
    from app.persistence.async_ips_redis import _filter_keys, _make_redis_checkpoint_key

    keys = [
        _make_redis_checkpoint_key("proj", "thread", "ns", str(i)) for i in range(5)
    ]
    # No before, no limit
    filtered = _filter_keys(keys, None, None)
    assert len(filtered) == 5
    # With limit
    filtered = _filter_keys(keys, None, 2)
    assert len(filtered) == 2
    # With before
    before = {"configurable": {"checkpoint_id": "2"}}
    filtered = _filter_keys(keys, before, None)
    assert all(int(k.split(":")[-1]) < 2 for k in filtered)
