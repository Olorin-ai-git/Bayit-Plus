"""
Redis-backed WebSocket Connection Manager.

Replaces the in-memory ConnectionManager with a hybrid local+Redis approach:
- Local dict tracks WebSocket objects on THIS instance (not serializable)
- Redis tracks connection metadata across ALL instances (user->instance, rooms)
- Redis pub/sub delivers messages cross-instance

When Redis is unavailable, degrades to local-only (same as original behavior).
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set

from fastapi import WebSocket

from app.core.config import settings
from app.core.pubsub import get_pubsub_manager

logger = logging.getLogger(__name__)

INSTANCE_ID = os.getenv("K_REVISION", f"local-{os.getpid()}")

# Redis key prefixes
_PREFIX = "bayit:ws"
_CONN_KEY = f"{_PREFIX}:conn"  # bayit:ws:conn:{user_id} -> hash
_ROOM_MEMBERS_KEY = f"{_PREFIX}:room"  # bayit:ws:room:{type}:{id}:members -> set
_ROOM_CHANNEL_KEY = f"{_PREFIX}:room"  # bayit:ws:room:{type}:{id} -> pub/sub channel
_ACTIVE_SESSIONS_KEY = f"{_PREFIX}:active_sessions"  # bayit:ws:active_sessions:{channel}
_CONN_TTL_SECONDS = 3600  # 1 hour TTL for connection metadata


@dataclass
class LocalConnection:
    """A WebSocket connection on this instance."""

    websocket: WebSocket
    user_id: str
    user_name: str
    rooms: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)


class RedisConnectionManager:
    """
    Hybrid local+Redis WebSocket connection manager.

    Local state (this instance only):
      - _connections: {connection_id: LocalConnection}
      - _user_connections: {user_id: connection_id}

    Redis state (shared across instances):
      - bayit:ws:conn:{user_id} -> hash with instance_id, rooms, connected_at
      - bayit:ws:room:{type}:{id}:members -> set of user_ids
      - pub/sub channels for room message delivery
    """

    def __init__(self):
        self._connections: Dict[str, LocalConnection] = {}
        self._user_connections: Dict[str, str] = {}
        self._lock = asyncio.Lock()
        self._pubsub_initialized = False

    async def _get_redis(self):
        """Get Redis client, returning None if unavailable."""
        try:
            from app.core.redis_client import get_redis_client
            client = await get_redis_client()
            if client.is_connected:
                return client
        except Exception:
            pass
        return None

    async def _get_raw_redis(self):
        """Get raw redis.asyncio.Redis client for operations not on AsyncRedisClient."""
        try:
            from app.core.redis_client import get_redis_client
            client = await get_redis_client()
            if client.is_connected and client._client:
                return client._client
        except Exception:
            pass
        return None

    def _generate_connection_id(self, user_id: str) -> str:
        """Generate a unique connection ID."""
        return f"{user_id}_{datetime.utcnow().timestamp()}"

    def _room_key(self, room_type: str, room_id: str) -> str:
        """Redis key for room membership set."""
        return f"{_ROOM_MEMBERS_KEY}:{room_type}:{room_id}:members"

    def _room_channel(self, room_type: str, room_id: str) -> str:
        """Redis pub/sub channel for room messages."""
        return f"{_ROOM_CHANNEL_KEY}:{room_type}:{room_id}"

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_name: str,
        room_type: Optional[str] = None,
        room_id: Optional[str] = None,
        party_id: Optional[str] = None,
        skip_accept: bool = False,
    ) -> str:
        """
        Register a new WebSocket connection.

        Returns the connection ID. Disconnects previous connection
        for the same user if one exists.

        Args:
            party_id: Backward-compat alias for room_type="party", room_id=party_id.
        """
        # Backward compatibility: party_id maps to room_type="party"
        if party_id and not room_type:
            room_type = "party"
            room_id = party_id
        if not skip_accept:
            await websocket.accept()

        async with self._lock:
            # Disconnect existing connection for this user
            if user_id in self._user_connections:
                old_conn_id = self._user_connections[user_id]
                await self._remove_connection(old_conn_id)

            connection_id = self._generate_connection_id(user_id)
            rooms = set()
            if room_type and room_id:
                rooms.add(f"{room_type}:{room_id}")

            connection = LocalConnection(
                websocket=websocket,
                user_id=user_id,
                user_name=user_name,
                rooms=rooms,
            )

            self._connections[connection_id] = connection
            self._user_connections[user_id] = connection_id

        # Register in Redis (non-blocking, best-effort)
        redis = await self._get_raw_redis()
        if redis:
            try:
                conn_key = f"{_CONN_KEY}:{user_id}"
                await redis.hset(conn_key, mapping={
                    "instance_id": INSTANCE_ID,
                    "connection_id": connection_id,
                    "user_name": user_name,
                    "connected_at": datetime.utcnow().isoformat(),
                })
                await redis.expire(conn_key, _CONN_TTL_SECONDS)

                if room_type and room_id:
                    room_key = self._room_key(room_type, room_id)
                    await redis.sadd(room_key, user_id)
                    await redis.expire(room_key, _CONN_TTL_SECONDS)
            except Exception as exc:
                logger.warning("Redis registration failed for %s: %s", user_id, exc)

        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """Remove a connection from local state and Redis."""
        async with self._lock:
            await self._remove_connection(connection_id)

    async def _remove_connection(self, connection_id: str) -> None:
        """Internal removal (must be called with lock held)."""
        if connection_id not in self._connections:
            return

        conn = self._connections[connection_id]
        user_id = conn.user_id

        # Remove from user mapping
        if user_id in self._user_connections:
            if self._user_connections[user_id] == connection_id:
                del self._user_connections[user_id]

        # Clean up Redis
        redis = await self._get_raw_redis()
        if redis:
            try:
                await redis.delete(f"{_CONN_KEY}:{user_id}")
                for room_ref in conn.rooms:
                    parts = room_ref.split(":", 1)
                    if len(parts) == 2:
                        room_key = self._room_key(parts[0], parts[1])
                        await redis.srem(room_key, user_id)
            except Exception as exc:
                logger.warning("Redis cleanup failed for %s: %s", user_id, exc)

        del self._connections[connection_id]

        try:
            await conn.websocket.close()
        except Exception:
            pass

    async def join_room(
        self, connection_id: str, room_type: str, room_id: str
    ) -> None:
        """Add a connection to a room."""
        async with self._lock:
            if connection_id not in self._connections:
                return

            conn = self._connections[connection_id]
            room_ref = f"{room_type}:{room_id}"
            conn.rooms.add(room_ref)

        redis = await self._get_raw_redis()
        if redis:
            try:
                room_key = self._room_key(room_type, room_id)
                await redis.sadd(room_key, conn.user_id)
                await redis.expire(room_key, _CONN_TTL_SECONDS)
            except Exception as exc:
                logger.warning("Redis join_room failed: %s", exc)

        # Subscribe to room channel for cross-instance messages
        await self._subscribe_to_room(room_type, room_id)

    async def leave_room(
        self, connection_id: str, room_type: str, room_id: str
    ) -> None:
        """Remove a connection from a room."""
        async with self._lock:
            if connection_id not in self._connections:
                return

            conn = self._connections[connection_id]
            room_ref = f"{room_type}:{room_id}"
            conn.rooms.discard(room_ref)

        redis = await self._get_raw_redis()
        if redis:
            try:
                room_key = self._room_key(room_type, room_id)
                await redis.srem(room_key, conn.user_id)
            except Exception as exc:
                logger.warning("Redis leave_room failed: %s", exc)

    async def broadcast_to_room(
        self,
        room_type: str,
        room_id: str,
        message: dict,
        exclude_user_id: Optional[str] = None,
        source_instance: Optional[str] = None,
    ) -> int:
        """
        Broadcast a message to all connections in a room.

        First delivers to local connections, then publishes to Redis
        for cross-instance delivery (unless this was already a Redis delivery).
        Returns count of local successful sends.
        """
        room_ref = f"{room_type}:{room_id}"
        success_count = 0
        failed_conn_ids = []

        # Deliver to local connections
        for conn_id, conn in list(self._connections.items()):
            if room_ref not in conn.rooms:
                continue
            if exclude_user_id and conn.user_id == exclude_user_id:
                continue

            try:
                await conn.websocket.send_json(message)
                success_count += 1
            except Exception:
                failed_conn_ids.append(conn_id)

        # Clean up failed connections
        for conn_id in failed_conn_ids:
            await self.disconnect(conn_id)

        # Publish to Redis for other instances (skip if this IS a Redis delivery)
        if source_instance is None:
            pubsub = await get_pubsub_manager()
            if pubsub.is_connected:
                channel = self._room_channel(room_type, room_id)
                await pubsub.publish(channel, {
                    "message": message,
                    "exclude_user_id": exclude_user_id,
                    "source_instance": INSTANCE_ID,
                })

        return success_count

    async def send_to_user(self, user_id: str, message: dict) -> bool:
        """Send a message to a specific user on this instance."""
        if user_id not in self._user_connections:
            return False

        conn_id = self._user_connections[user_id]
        if conn_id not in self._connections:
            return False

        try:
            await self._connections[conn_id].websocket.send_json(message)
            return True
        except Exception:
            await self.disconnect(conn_id)
            return False

    async def send_personal_message(
        self, message: dict, connection_id: str
    ) -> bool:
        """Send a message to a specific connection."""
        if connection_id not in self._connections:
            return False

        try:
            await self._connections[connection_id].websocket.send_json(message)
            return True
        except Exception:
            await self.disconnect(connection_id)
            return False

    # ---------------------------------------------------------------
    # Backward-compatible party methods (delegates to room methods)
    # ---------------------------------------------------------------

    async def join_party(self, connection_id: str, party_id: str) -> None:
        """Add a connection to a watch party room."""
        await self.join_room(connection_id, "party", party_id)

    async def leave_party(self, connection_id: str) -> None:
        """Remove a connection from its current party rooms."""
        async with self._lock:
            if connection_id not in self._connections:
                return
            conn = self._connections[connection_id]
            party_rooms = [r for r in conn.rooms if r.startswith("party:")]

        for room_ref in party_rooms:
            parts = room_ref.split(":", 1)
            if len(parts) == 2:
                await self.leave_room(connection_id, parts[0], parts[1])

    async def broadcast_to_party(
        self,
        message: dict,
        party_id: str,
        exclude_user_id: Optional[str] = None,
    ) -> int:
        """Broadcast a message to all connections in a watch party."""
        return await self.broadcast_to_room(
            "party", party_id, message, exclude_user_id
        )

    async def broadcast_interaction_event(
        self,
        party_id: str,
        event_type: str,
        data: dict,
        exclude_user_id: Optional[str] = None,
    ) -> int:
        """Broadcast a VOD interaction event to all party members."""
        message = {"type": "interaction_event", "event": event_type, **data}
        return await self.broadcast_to_party(message, party_id, exclude_user_id)

    async def broadcast_all(self, message: dict) -> int:
        """Broadcast a message to all local connections."""
        success_count = 0
        failed_conn_ids = []

        for conn_id, conn in list(self._connections.items()):
            try:
                await conn.websocket.send_json(message)
                success_count += 1
            except Exception:
                failed_conn_ids.append(conn_id)

        for conn_id in failed_conn_ids:
            await self.disconnect(conn_id)

        return success_count

    def get_party_users(self, party_id: str) -> List[dict]:
        """Get list of users in a party (local instance only)."""
        room_ref = f"party:{party_id}"
        users = []
        for conn in self._connections.values():
            if room_ref in conn.rooms:
                users.append({
                    "user_id": conn.user_id,
                    "user_name": conn.user_name,
                    "connected_at": conn.connected_at.isoformat(),
                })
        return users

    def get_party_count(self, party_id: str) -> int:
        """Get number of local connections in a party."""
        room_ref = f"party:{party_id}"
        return sum(1 for c in self._connections.values() if room_ref in c.rooms)

    def get_party_connections(self, party_id: str) -> List[tuple]:
        """Get (websocket, user_id) tuples for a party (local only)."""
        room_ref = f"party:{party_id}"
        return [
            (c.websocket, c.user_id)
            for c in self._connections.values()
            if room_ref in c.rooms
        ]

    def get_connection_info(self, connection_id: str) -> Optional[dict]:
        """Get info about a connection."""
        if connection_id not in self._connections:
            return None
        conn = self._connections[connection_id]
        return {
            "connection_id": connection_id,
            "user_id": conn.user_id,
            "user_name": conn.user_name,
            "rooms": list(conn.rooms),
            "connected_at": conn.connected_at.isoformat(),
        }

    @property
    def total_connections(self) -> int:
        """Total local connections."""
        return len(self._connections)

    @property
    def total_parties(self) -> int:
        """Total unique party rooms with local connections."""
        party_ids = set()
        for conn in self._connections.values():
            for room in conn.rooms:
                if room.startswith("party:"):
                    party_ids.add(room)
        return len(party_ids)

    # ---------------------------------------------------------------
    # Redis pub/sub integration
    # ---------------------------------------------------------------

    async def _subscribe_to_room(self, room_type: str, room_id: str) -> None:
        """Subscribe to a room's Redis channel for cross-instance delivery."""
        pubsub = await get_pubsub_manager()
        if not pubsub.is_connected:
            return

        channel = self._room_channel(room_type, room_id)
        await pubsub.subscribe(channel, self._handle_room_message)

    async def _handle_room_message(self, channel: str, data: dict) -> None:
        """Handle a message received from Redis pub/sub for a room."""
        source_instance = data.get("source_instance")
        if source_instance == INSTANCE_ID:
            # Message originated from this instance; already delivered locally
            return

        message = data.get("message", {})
        exclude_user_id = data.get("exclude_user_id")

        # Extract room_type and room_id from channel name
        # Channel format: bayit:ws:room:{type}:{id}
        parts = channel.split(":")
        if len(parts) >= 5:
            room_type = parts[3]
            room_id = ":".join(parts[4:])
            await self.broadcast_to_room(
                room_type, room_id, message, exclude_user_id,
                source_instance=source_instance,
            )

    # ---------------------------------------------------------------
    # Active sessions tracking (replaces websocket_helpers._active_sessions)
    # ---------------------------------------------------------------

    async def add_active_session(self, channel: str, session_id: str) -> None:
        """Track an active session in Redis (e.g., live dubbing sessions)."""
        redis = await self._get_raw_redis()
        if redis:
            try:
                key = f"{_ACTIVE_SESSIONS_KEY}:{channel}"
                await redis.sadd(key, session_id)
                await redis.expire(key, _CONN_TTL_SECONDS)
            except Exception as exc:
                logger.warning("Failed to add active session: %s", exc)

    async def remove_active_session(self, channel: str, session_id: str) -> None:
        """Remove an active session from Redis."""
        redis = await self._get_raw_redis()
        if redis:
            try:
                key = f"{_ACTIVE_SESSIONS_KEY}:{channel}"
                await redis.srem(key, session_id)
            except Exception as exc:
                logger.warning("Failed to remove active session: %s", exc)

    async def get_active_session_count(self, channel: str) -> int:
        """Get count of active sessions for a channel (cross-instance)."""
        redis = await self._get_raw_redis()
        if redis:
            try:
                key = f"{_ACTIVE_SESSIONS_KEY}:{channel}"
                return await redis.scard(key)
            except Exception as exc:
                logger.warning("Failed to get active session count: %s", exc)
        return 0


# Global singleton (replaces the old connection_manager)
redis_connection_manager = RedisConnectionManager()
