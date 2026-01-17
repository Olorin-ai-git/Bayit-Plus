"""
WebSocket Connection Manager for real-time features.
Manages WebSocket connections for watch parties and live features.
"""
from typing import Dict, List, Optional, Set
from fastapi import WebSocket
from dataclasses import dataclass, field
import asyncio
import json
from datetime import datetime


@dataclass
class Connection:
    """Represents a single WebSocket connection"""
    websocket: WebSocket
    user_id: str
    user_name: str
    party_id: Optional[str] = None
    connected_at: datetime = field(default_factory=datetime.utcnow)


class ConnectionManager:
    """
    Manages WebSocket connections for the application.
    Handles connection lifecycle, message broadcasting, and room-based messaging.
    """

    def __init__(self):
        # All active connections: {connection_id: Connection}
        self._connections: Dict[str, Connection] = {}
        # Connections by party: {party_id: set of connection_ids}
        self._party_connections: Dict[str, Set[str]] = {}
        # User to connection mapping: {user_id: connection_id}
        self._user_connections: Dict[str, str] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    def _generate_connection_id(self, user_id: str) -> str:
        """Generate a unique connection ID"""
        return f"{user_id}_{datetime.utcnow().timestamp()}"

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_name: str,
        party_id: Optional[str] = None,
        skip_accept: bool = False
    ) -> str:
        """
        Accept a new WebSocket connection.
        Returns the connection ID.

        Args:
            skip_accept: If True, skip calling websocket.accept() (useful if already accepted)
        """
        if not skip_accept:
            await websocket.accept()

        async with self._lock:
            # Disconnect existing connection for this user if any
            if user_id in self._user_connections:
                old_conn_id = self._user_connections[user_id]
                await self._remove_connection(old_conn_id)

            connection_id = self._generate_connection_id(user_id)
            connection = Connection(
                websocket=websocket,
                user_id=user_id,
                user_name=user_name,
                party_id=party_id
            )

            self._connections[connection_id] = connection
            self._user_connections[user_id] = connection_id

            if party_id:
                if party_id not in self._party_connections:
                    self._party_connections[party_id] = set()
                self._party_connections[party_id].add(connection_id)

        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """Remove a connection"""
        async with self._lock:
            await self._remove_connection(connection_id)

    async def _remove_connection(self, connection_id: str) -> None:
        """Internal method to remove a connection (must be called with lock held)"""
        if connection_id not in self._connections:
            return

        connection = self._connections[connection_id]

        # Remove from party connections
        if connection.party_id and connection.party_id in self._party_connections:
            self._party_connections[connection.party_id].discard(connection_id)
            if not self._party_connections[connection.party_id]:
                del self._party_connections[connection.party_id]

        # Remove from user connections
        if connection.user_id in self._user_connections:
            if self._user_connections[connection.user_id] == connection_id:
                del self._user_connections[connection.user_id]

        # Remove connection
        del self._connections[connection_id]

        # Try to close the websocket
        try:
            await connection.websocket.close()
        except Exception:
            pass

    async def join_party(self, connection_id: str, party_id: str) -> None:
        """Add a connection to a party"""
        async with self._lock:
            if connection_id not in self._connections:
                return

            connection = self._connections[connection_id]

            # Leave current party if any
            if connection.party_id and connection.party_id in self._party_connections:
                self._party_connections[connection.party_id].discard(connection_id)

            # Join new party
            connection.party_id = party_id
            if party_id not in self._party_connections:
                self._party_connections[party_id] = set()
            self._party_connections[party_id].add(connection_id)

    async def leave_party(self, connection_id: str) -> None:
        """Remove a connection from its current party"""
        async with self._lock:
            if connection_id not in self._connections:
                return

            connection = self._connections[connection_id]

            if connection.party_id and connection.party_id in self._party_connections:
                self._party_connections[connection.party_id].discard(connection_id)
                if not self._party_connections[connection.party_id]:
                    del self._party_connections[connection.party_id]

            connection.party_id = None

    async def send_personal_message(self, message: dict, connection_id: str) -> bool:
        """Send a message to a specific connection"""
        if connection_id not in self._connections:
            return False

        try:
            await self._connections[connection_id].websocket.send_json(message)
            return True
        except Exception:
            await self.disconnect(connection_id)
            return False

    async def send_to_user(self, message: dict, user_id: str) -> bool:
        """Send a message to a specific user"""
        if user_id not in self._user_connections:
            return False

        connection_id = self._user_connections[user_id]
        return await self.send_personal_message(message, connection_id)

    async def broadcast_to_party(
        self,
        message: dict,
        party_id: str,
        exclude_user_id: Optional[str] = None
    ) -> int:
        """
        Broadcast a message to all connections in a party.
        Returns the number of successful sends.
        """
        if party_id not in self._party_connections:
            return 0

        connection_ids = list(self._party_connections[party_id])
        success_count = 0

        for conn_id in connection_ids:
            if conn_id not in self._connections:
                continue

            connection = self._connections[conn_id]
            if exclude_user_id and connection.user_id == exclude_user_id:
                continue

            try:
                await connection.websocket.send_json(message)
                success_count += 1
            except Exception:
                await self.disconnect(conn_id)

        return success_count

    async def broadcast_all(self, message: dict) -> int:
        """Broadcast a message to all connections"""
        connection_ids = list(self._connections.keys())
        success_count = 0

        for conn_id in connection_ids:
            try:
                await self._connections[conn_id].websocket.send_json(message)
                success_count += 1
            except Exception:
                await self.disconnect(conn_id)

        return success_count

    def get_party_users(self, party_id: str) -> List[dict]:
        """Get list of users in a party"""
        if party_id not in self._party_connections:
            return []

        users = []
        for conn_id in self._party_connections[party_id]:
            if conn_id in self._connections:
                conn = self._connections[conn_id]
                users.append({
                    "user_id": conn.user_id,
                    "user_name": conn.user_name,
                    "connected_at": conn.connected_at.isoformat()
                })

        return users

    def get_party_count(self, party_id: str) -> int:
        """Get number of connections in a party"""
        if party_id not in self._party_connections:
            return 0
        return len(self._party_connections[party_id])

    def get_connection_info(self, connection_id: str) -> Optional[dict]:
        """Get info about a connection"""
        if connection_id not in self._connections:
            return None

        conn = self._connections[connection_id]
        return {
            "connection_id": connection_id,
            "user_id": conn.user_id,
            "user_name": conn.user_name,
            "party_id": conn.party_id,
            "connected_at": conn.connected_at.isoformat()
        }

    @property
    def total_connections(self) -> int:
        """Total number of active connections"""
        return len(self._connections)

    @property
    def total_parties(self) -> int:
        """Total number of active parties with connections"""
        return len(self._party_connections)


# Global connection manager instance
connection_manager = ConnectionManager()
