"""IPS-Cache (Redis-based) implementation of Langgraph checkpoint saver.

Inspired by the Langgraph RedisSaver implementation:
https://langchain-ai.github.io/langgraph/how-tos/persistence_redis/

Persistence and checkpoints in Langgraph:
https://langchain-ai.github.io/langgraph/concepts/persistence/
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from functools import reduce
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    PendingWrite,
    get_checkpoint_id,
)
from langgraph.checkpoint.serde.base import SerializerProtocol

from app.adapters.ips_cache_client import IPSCacheClient
from app.models.agent_headers import OlorinHeader
from app.service.config import get_settings_for_env

logger = logging.getLogger(__name__)

# Constants for expiration settings and Redis key separators
EXPIRATION_DAYS = 1
EXPIRATION_SECONDS = EXPIRATION_DAYS * 3600 * 24
REDIS_KEY_SEPARATOR = ":"
settings_for_env = get_settings_for_env()


def _create_chunks_commands(array, size=500):
    return list(
        array[i * size : i * size + size] for i in range(int(len(array) / size) + 1)
    )


def _alternating_list_to_dict(data: List) -> Dict:
    """Convert an alternating list of key-value pairs to a dictionary."""
    return {data[i]: data[i + 1] for i in range(0, len(data), 2)}


def _make_checkpoints_zset_name(
    project_name: str,
    thread_id: str,
) -> str:
    """Create a Redis key for a sorted set of checkpoint keys.
    The sorted set is used for faster scanning and search of checkpoint keys.
    """
    parts = [
        "checkpoint_keys",
        project_name,
        thread_id,
    ]

    checkpoints_zset_name = REDIS_KEY_SEPARATOR.join(parts)
    logger.debug(f"checkpoints_zset_name={checkpoints_zset_name}")
    return checkpoints_zset_name


def _make_writes_zset_name(
    project_name: str,
    thread_id: str,
    checkpoint_ns: str,
) -> str:
    """Create a Redis key for a sorted set of writes keys."""

    writes_zset_name = REDIS_KEY_SEPARATOR.join(
        [
            "writes_keys",
            project_name,
            thread_id,
            checkpoint_ns,
        ]
    )

    logger.debug(f"writes_zset_name={writes_zset_name}")
    return writes_zset_name


def _make_redis_checkpoint_key(
    project_name: str,
    thread_id: str,
    checkpoint_ns: str,
    checkpoint_id: str,
) -> str:
    """Create a Redis key for a specific checkpoint."""
    redis_checkpoint_key = REDIS_KEY_SEPARATOR.join(
        ["checkpoint", project_name, thread_id, checkpoint_ns, checkpoint_id]
    )
    logger.debug(f"redis_checkpoint_key={redis_checkpoint_key}")
    return redis_checkpoint_key


def _make_redis_writes_key(
    project_name: str,
    thread_id: str,
    checkpoint_ns: str,
    checkpoint_id: str,
    task_id: str,
    idx: int,
) -> str:
    """Create a Redis key for pending writes related to a specific checkpoint."""
    parts = [
        "writes",
        project_name,
        thread_id,
        checkpoint_ns,
        checkpoint_id,
        task_id,
        str(idx),
    ]
    redis_writes_key = REDIS_KEY_SEPARATOR.join(parts)
    logger.debug(f"redis_writes_key={redis_writes_key}")
    return redis_writes_key


def _parse_redis_checkpoint_key(redis_key: str) -> dict:
    """Parse a Redis checkpoint key into a configuration dictionary."""
    parts = redis_key.split(REDIS_KEY_SEPARATOR)
    if parts[0] != "checkpoint":
        raise ValueError("Expected checkpoint key to start with 'checkpoint'")
    thread_id = parts[2]
    checkpoint_id = parts[-1]
    checkpoint_ns = REDIS_KEY_SEPARATOR.join(parts[3:-1])
    redis_checkpoint_key = {
        "thread_id": thread_id,
        "checkpoint_ns": checkpoint_ns,
        "checkpoint_id": checkpoint_id,
    }
    logger.debug(f"redis_checkpoint_key={redis_checkpoint_key}")
    return redis_checkpoint_key


def _parse_redis_checkpoint_writes_key(redis_key: str) -> dict:
    """Parse a Redis writes key into a configuration dictionary."""
    parts = redis_key.split(REDIS_KEY_SEPARATOR)
    if parts[0] != "writes":
        raise ValueError("Expected writes key to start with 'writes'")
    thread_id = parts[2]
    idx = parts[-1]
    task_id = parts[-2]
    checkpoint_id = parts[-3]
    checkpoint_ns = REDIS_KEY_SEPARATOR.join(parts[2:-3])
    redis_checkpoint_writes_key = {
        "thread_id": thread_id,
        "checkpoint_ns": checkpoint_ns,
        "checkpoint_id": checkpoint_id,
        "task_id": task_id,
        "idx": idx,
    }
    logger.debug(f"redis_checkpoint_writes_key={redis_checkpoint_writes_key}")
    return redis_checkpoint_writes_key


def _filter_keys(
    keys: List[str], before: Optional[RunnableConfig], limit: Optional[int]
) -> list:
    """Filter the given list of checkpoint keys using the provided criteria.

    Args:
    keys (List[str]): List of keys to filter.
    before (Optional[RunnableConfig]): List checkpoints created before this configuration.
    limit (Optional[int]): Maximum number of checkpoints to return.
    """
    if before:
        keys = [
            k
            for k in keys
            if _parse_redis_checkpoint_key(k)["checkpoint_id"]
            < before["configurable"]["checkpoint_id"]
        ]

    # Sort keys by checkpoint_id in descending order
    keys = sorted(
        keys,
        key=lambda k: _parse_redis_checkpoint_key(k)["checkpoint_id"],
        reverse=True,
    )

    # Enforce limit if provided
    if limit:
        keys = keys[:limit]
    return keys


def _decode_if_bytes(item):
    """Decodes the given item if it is in bytes format."""
    if isinstance(item, bytes):
        try:
            return item.decode("latin1")
        except UnicodeDecodeError as e:
            raise e
    return item


def _serialize_writes(serde: SerializerProtocol, writes: tuple[str, Any]) -> list[dict]:
    """Serialize pending writes."""
    serialized_writes = []
    for channel, value in writes:
        type_, serialized_value = serde.dumps_typed(value)
        serialized_writes.append(
            {"channel": channel, "type": type_, "value": serialized_value}
        )
    return serialized_writes


def _deserialize_writes(
    serde: SerializerProtocol, task_id_to_data: dict[tuple[str, str], dict]
) -> list[PendingWrite]:
    """Deserialize pending writes."""
    writes = []
    for (task_id, _), data in task_id_to_data.items():
        data = _alternating_list_to_dict(data)
        writes.append(
            (
                task_id,
                data["channel"],
                serde.loads_typed((data["type"], data["value"].encode("latin1"))),
            )
        )
    return writes


def _parse_redis_checkpoint_data(
    serde: SerializerProtocol,
    key: str,
    data: list,
    pending_writes: Optional[List[PendingWrite]] = None,
) -> Optional[CheckpointTuple]:
    """Parse checkpoint data retrieved from Redis into a CheckpointTuple."""
    if not data:
        return None

    parsed_key = _parse_redis_checkpoint_key(key)
    thread_id = parsed_key["thread_id"]
    checkpoint_ns = parsed_key["checkpoint_ns"]
    checkpoint_id = parsed_key["checkpoint_id"]
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": checkpoint_ns,
            "checkpoint_id": checkpoint_id,
        }
    }

    data = _alternating_list_to_dict(data)
    checkpoint = serde.loads_typed((data["type"], data["checkpoint"].encode("latin1")))
    metadata = serde.loads(data["metadata"].encode("latin1"))
    parent_checkpoint_id = data.get("parent_checkpoint_id", "")

    parent_config = (
        {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": parent_checkpoint_id,
            }
        }
        if parent_checkpoint_id
        else None
    )
    return CheckpointTuple(
        config=config,
        checkpoint=checkpoint,
        metadata=metadata,
        parent_config=parent_config,
        pending_writes=pending_writes,
    )


class AsyncRedisSaver(BaseCheckpointSaver):
    """Async IPS Cache (Redis-based) implementation of Langgraph checkpoint saver."""

    # serde: SerializerProtocol = JsonPlusSerializer()
    # ips_cache: IPSCacheClient

    def __init__(self, namespace: str = "default") -> None:
        super().__init__()
        self.namespace = namespace
        self.ips_cache = IPSCacheClient()

    @classmethod
    @asynccontextmanager
    async def from_conn_info(
        cls, *, headers: Dict[str, str], namespace: str = "default"
    ) -> AsyncGenerator["AsyncRedisSaver", None]:
        """Async context manager to create an instance of AsyncRedisSaver."""
        try:
            yield AsyncRedisSaver(namespace=namespace)
        finally:
            pass

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions = None,
    ) -> RunnableConfig:
        """Asynchronously store a checkpoint with its configuration and metadata.

        Args:
            config (RunnableConfig): Configuration for the checkpoint.
            checkpoint (Checkpoint): The checkpoint to store.
            metadata (CheckpointMetadata): Additional metadata for the checkpoint.
            new_versions (ChannelVersions): New channel versions as of this write.

        Returns:
            RunnableConfig: Updated configuration after storing the checkpoint.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        thread_id = self.get_thread_id(config)
        olorin_header: Optional[OlorinHeader] = agent_context.get_header()
        checkpoint_ns = config["configurable"]["checkpoint_ns"]
        checkpoint_id = checkpoint["id"]
        parent_checkpoint_id = config["configurable"].get("checkpoint_id")

        key = _make_redis_checkpoint_key(
            self.namespace, thread_id, checkpoint_ns, checkpoint_id
        )
        type_, serialized_checkpoint = self.serde.dumps_typed(checkpoint)
        serialized_metadata = self.serde.dumps(metadata)
        data = {
            "checkpoint": serialized_checkpoint,
            "type": type_,
            "checkpoint_id": checkpoint_id,
            "metadata": serialized_metadata,
            "parent_checkpoint_id": (
                parent_checkpoint_id if parent_checkpoint_id else ""
            ),
        }

        data_as_list = [
            _decode_if_bytes(item) for sublist in data.items() for item in sublist
        ]

        # Adding key to the sorted set with expiration
        zset_name = _make_checkpoints_zset_name(
            self.namespace,
            thread_id,
        )
        score = time.time() + EXPIRATION_SECONDS

        # Pipeline HSET, EXPIRE, and ZADD commands
        pipeline_commands = [
            ["HSET", key] + data_as_list,
            ["EXPIRE", key, EXPIRATION_SECONDS],
            ["ZADD", zset_name, score, key],
            ["EXPIRE", zset_name, EXPIRATION_SECONDS],
        ]

        await self.ips_cache.pipeline(pipeline_commands, olorin_header=olorin_header)

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        }

    async def aput_writes(
        self,
        config: Dict[str, Any],
        writes: List[Tuple[str, Any]],
        task_id: str,
    ) -> Dict[str, Any]:
        """Asynchronously store intermediate writes linked to a checkpoint.

        Args:
            config (RunnableConfig): Configuration of the related checkpoint.
            writes (List[Tuple[str, Any]]): List of writes to store.
            task_id (str): Identifier for the task creating the writes.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        thread_id = self.get_thread_id(config)
        olorin_header: Optional[OlorinHeader] = agent_context.get_header()
        checkpoint_ns = config["configurable"]["checkpoint_ns"]
        checkpoint_id = config["configurable"]["checkpoint_id"]

        pipeline_commands = []
        for idx, data in enumerate(_serialize_writes(self.serde, writes)):
            key = _make_redis_writes_key(
                self.namespace,
                thread_id,
                checkpoint_ns,
                checkpoint_id,
                task_id,
                idx,
            )
            data_as_list = [
                _decode_if_bytes(item) for sublist in data.items() for item in sublist
            ]

            # Adding write key to the sorted set with expiration
            zset_name = _make_writes_zset_name(
                self.namespace,
                thread_id,
                checkpoint_ns,
            )
            score = time.time() + EXPIRATION_SECONDS

            pipeline_commands.extend(
                [
                    ["HSET", key] + data_as_list,
                    ["EXPIRE", key, EXPIRATION_SECONDS],
                    ["ZADD", zset_name, score, key],
                    ["EXPIRE", zset_name, EXPIRATION_SECONDS],
                ]
            )

        await self.ips_cache.pipeline(pipeline_commands, olorin_header=olorin_header)

        return config

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """Asynchronously fetch a checkpoint tuple using the given configuration.

        Args:
            config (RunnableConfig): Configuration specifying which checkpoint to retrieve.

        Returns:
            Optional[CheckpointTuple]: The requested checkpoint tuple, or None if not found.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        thread_id = self.get_thread_id(config)
        olorin_header: Optional[OlorinHeader] = agent_context.get_header()
        checkpoint_id = get_checkpoint_id(config)
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")

        # Get the checkpoint key
        checkpoint_key = await self._aget_checkpoint_key(
            thread_id, checkpoint_ns, checkpoint_id, olorin_header=olorin_header
        )
        if not checkpoint_key:
            return None

        coroutines = [
            self._load_checkpoint_data(checkpoint_key, olorin_header=olorin_header),
            self._load_pending_writes(
                thread_id,
                checkpoint_ns,
                checkpoint_id,
                checkpoint_key,
                olorin_header=olorin_header,
            ),
        ]
        checkpoint_data, pending_writes = await asyncio.gather(*coroutines)
        if not checkpoint_data:
            return None

        return _parse_redis_checkpoint_data(
            self.serde, checkpoint_key, checkpoint_data, pending_writes=pending_writes
        )

    async def _load_checkpoint_data(
        self, checkpoint_key: str, olorin_header: dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Asynchronously fetch checkpoint data using the checkpoint_key."""
        return await self.ips_cache.hgetall(checkpoint_key, olorin_header=olorin_header)

    async def _load_pending_writes(
        self,
        thread_id,
        checkpoint_ns,
        checkpoint_id,
        checkpoint_key,
        olorin_header: dict[str, Any] = None,
    ) -> List[PendingWrite]:
        """Asynchronously fetch intermediate writes linked to a checkpoint."""

        checkpoint_id = (
            checkpoint_id
            or _parse_redis_checkpoint_key(checkpoint_key)["checkpoint_id"]
        )

        # Use the zset to scan for write keys
        zset_name = _make_writes_zset_name(
            self.namespace,
            thread_id,
            checkpoint_ns,
        )
        matching_keys = await self.ips_cache.zscan(
            zset_name, olorin_header=olorin_header
        )
        if matching_keys:
            parsed_keys = [
                _parse_redis_checkpoint_writes_key(key) for key in matching_keys
            ]
            # Prepare HGETALL commands for pipelining
            commands = [["HGETALL", key] for key in matching_keys]
            # Execute all HGETALL commands in a pipeline
            batch_commands = _create_chunks_commands(commands, 500)
            tmp_results = await asyncio.gather(
                *[
                    self.ips_cache.pipeline(batch, olorin_header=olorin_header)
                    for batch in batch_commands
                ]
            )
            results = reduce(lambda x, y: x + y, tmp_results)
            # Deserialize the writes
            task_id_to_data = {
                (parsed_key["task_id"], parsed_key["idx"]): result
                for parsed_key, result in sorted(
                    zip(parsed_keys, results), key=lambda x: x[0]["idx"], reverse=False
                )
            }

            pending_writes = _deserialize_writes(
                self.serde,
                task_id_to_data,
            )
        else:
            pending_writes = []

        return pending_writes

    async def alist(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncGenerator[CheckpointTuple, None]:
        """List checkpoints that match the given criteria.

        Args:
            config (Optional[RunnableConfig]): Base configuration for filtering checkpoints.
            filter (Optional[Dict[str, Any]]): Additional filtering criteria.
            before (Optional[RunnableConfig]): List checkpoints created before this configuration.
            limit (Optional[int]): Maximum number of checkpoints to return.

        Returns:
            Iterator[CheckpointTuple]: Iterator of matching checkpoint tuples.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        thread_id = self.get_thread_id(config)
        olorin_header: dict[str, Any] = agent_context.get_header()
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")

        zset_name = _make_checkpoints_zset_name(
            self.namespace,
            thread_id,
        )

        matching_keys = await self.ips_cache.zscan(
            zset_name, olorin_header=olorin_header
        )
        pattern = f"checkpoint:{self.namespace}:{thread_id}"
        if checkpoint_ns:
            pattern = f"{pattern}:{checkpoint_ns}"
        matching_keys = [key for key in matching_keys if key.startswith(pattern)]

        keys = _filter_keys(matching_keys, before, limit)
        if not keys:
            yield None

        # Prepare HGETALL commands for all keys
        commands = [["HGETALL", str(key)] for key in keys]
        results = await self.ips_cache.pipeline(commands, olorin_header=olorin_header)

        # Process the results and yield them
        for key, data in zip(keys, results):
            if data and "checkpoint" in data and "metadata" in data:
                yield _parse_redis_checkpoint_data(
                    self.serde, key, data, pending_writes=[]
                )

    async def _aget_checkpoint_key(
        self,
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: Optional[str],
        olorin_header: dict[str, Any] = None,
    ) -> Optional[str]:
        """Get the key for a checkpoint corresponding to the given
        thread_id, checkpoint_ns and checkpont_id values.

        If checkpoint_id is not provided, the latest checkpoint
        key correspondingto the thread_id and checkpoint_ns is returned.
        """

        if checkpoint_id:
            return _make_redis_checkpoint_key(
                self.namespace, thread_id, checkpoint_ns, checkpoint_id
            )

        # Use the sorted set to find the latest checkpoint key if an ID is not directly provided
        zset_name = _make_checkpoints_zset_name(
            self.namespace,
            thread_id,
        )
        scan_keys = await self.ips_cache.zscan(zset_name, olorin_header=olorin_header)

        if not scan_keys:
            return None

        latest_key = max(
            scan_keys, key=lambda k: _parse_redis_checkpoint_key(k)["checkpoint_id"]
        )
        return latest_key

    def get_thread_id(self, config: RunnableConfig):
        from app.models.agent_context import AgentContext

        if (
            config
            and "configurable" in config
            and "thread_id" in config["configurable"]
        ):
            return config["configurable"]["thread_id"]
        agent_context: AgentContext = config["configurable"]["agent_context"]
        return agent_context.thread_id
