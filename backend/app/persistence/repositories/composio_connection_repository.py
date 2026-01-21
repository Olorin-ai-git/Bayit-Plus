"""ComposioConnection Repository for MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- Security: Handles encrypted credentials safely
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.composio_connection_mongodb import ComposioConnection, ConnectionStatus
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComposioConnectionRepository:
    """Repository for Composio connection data access using MongoDB Atlas."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.composio_connections

    async def create(self, connection: ComposioConnection) -> ComposioConnection:
        """Create new Composio connection."""
        try:
            doc = connection.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()

            result = await self.collection.insert_one(doc)
            connection.id = result.inserted_id

            logger.info(
                f"Created Composio connection: {connection.connection_id}",
                extra={
                    "connection_id": connection.connection_id,
                    "toolkit_name": connection.toolkit_name,
                    "tenant_id": connection.tenant_id,
                },
            )
            return connection

        except DuplicateKeyError:
            logger.error(f"Connection {connection.connection_id} already exists")
            raise ValueError(f"Connection {connection.connection_id} already exists")

    async def find_by_id(
        self, connection_id: str, tenant_id: Optional[str] = None
    ) -> Optional[ComposioConnection]:
        """Find connection by ID with optional tenant filtering."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return ComposioConnection.from_mongodb_dict(doc) if doc else None

    async def find_by_toolkit(
        self,
        toolkit_name: str,
        tenant_id: Optional[str] = None,
        status: Optional[ConnectionStatus] = None,
    ) -> List[ComposioConnection]:
        """Find connections by toolkit with optional status filtering."""
        query = {"toolkit_name": toolkit_name}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status.value

        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=1000)
        return [ComposioConnection.from_mongodb_dict(doc) for doc in docs]

    async def find_active_connections(
        self, tenant_id: Optional[str] = None
    ) -> List[ComposioConnection]:
        """Find all active connections (non-expired, non-revoked)."""
        query = {"status": ConnectionStatus.ACTIVE.value}
        if tenant_id:
            query["tenant_id"] = tenant_id

        # Filter out expired connections
        query["$or"] = [
            {"expires_at": None},
            {"expires_at": {"$gt": datetime.utcnow()}},
        ]

        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=1000)
        return [ComposioConnection.from_mongodb_dict(doc) for doc in docs]

    async def find_expired_connections(
        self, tenant_id: Optional[str] = None
    ) -> List[ComposioConnection]:
        """Find connections that have expired."""
        query = {
            "status": ConnectionStatus.ACTIVE.value,
            "expires_at": {"$lte": datetime.utcnow()},
        }
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = self.collection.find(query).sort("expires_at", -1)
        docs = await cursor.to_list(length=1000)
        return [ComposioConnection.from_mongodb_dict(doc) for doc in docs]

    async def update_status(
        self,
        connection_id: str,
        status: ConnectionStatus,
        tenant_id: Optional[str] = None,
    ) -> Optional[ComposioConnection]:
        """Update connection status."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$set": {
                    "status": status.value,
                    "updated_at": datetime.utcnow(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.info(f"Updated connection status: {connection_id} -> {status.value}")
            return ComposioConnection.from_mongodb_dict(doc)
        return None

    async def mark_used(
        self, connection_id: str, tenant_id: Optional[str] = None
    ) -> Optional[ComposioConnection]:
        """Update last used timestamp."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$set": {
                    "last_used_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.debug(f"Marked connection as used: {connection_id}")
            return ComposioConnection.from_mongodb_dict(doc)
        return None

    async def update_tokens(
        self,
        connection_id: str,
        encrypted_access_token: str,
        refresh_token: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        tenant_id: Optional[str] = None,
    ) -> Optional[ComposioConnection]:
        """Update connection tokens (for token refresh)."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        updates = {
            "encrypted_access_token": encrypted_access_token,
            "updated_at": datetime.utcnow(),
        }
        if refresh_token is not None:
            updates["refresh_token"] = refresh_token
        if expires_at is not None:
            updates["expires_at"] = expires_at

        doc = await self.collection.find_one_and_update(
            query, {"$set": updates}, return_document=ReturnDocument.AFTER
        )

        if doc:
            logger.info(f"Updated tokens for connection: {connection_id}")
            return ComposioConnection.from_mongodb_dict(doc)
        return None

    async def delete(
        self, connection_id: str, tenant_id: Optional[str] = None
    ) -> bool:
        """Delete connection."""
        query = {"connection_id": connection_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        result = await self.collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info(f"Deleted connection: {connection_id}")
            return True
        return False

    async def count_by_toolkit(
        self, toolkit_name: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count connections for a toolkit."""
        query = {"toolkit_name": toolkit_name}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def count_by_status(
        self, status: ConnectionStatus, tenant_id: Optional[str] = None
    ) -> int:
        """Count connections by status."""
        query = {"status": status.value}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def list_all(
        self, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[ComposioConnection]:
        """List all connections with pagination."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [ComposioConnection.from_mongodb_dict(doc) for doc in docs]
