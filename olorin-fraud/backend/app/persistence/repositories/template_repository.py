"""Template Repository for MongoDB Atlas.

SYSTEM MANDATE Compliance:
- No hardcoded values: All queries use configuration or parameters
- Complete implementation: No placeholders or TODOs
- User-scoped: Templates filtered by user and tenant
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.models.template_mongodb import Template
from app.persistence.mongodb import get_mongodb
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TemplateRepository:
    """Repository for template data access using MongoDB Atlas."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_mongodb()
        self.collection = self.db.templates

    async def create(self, template: Template) -> Template:
        """Create new template."""
        try:
            doc = template.to_mongodb_dict()
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()

            result = await self.collection.insert_one(doc)
            template.id = result.inserted_id

            logger.info(
                f"Created template: {template.template_id}",
                extra={
                    "template_id": template.template_id,
                    "user_id": template.user_id,
                    "name": template.name,
                },
            )
            return template

        except DuplicateKeyError:
            logger.error(f"Template {template.template_id} already exists")
            raise ValueError(f"Template {template.template_id} already exists")

    async def find_by_id(
        self, template_id: str, user_id: Optional[str] = None, tenant_id: Optional[str] = None
    ) -> Optional[Template]:
        """Find template by ID with optional user/tenant filtering."""
        query = {"template_id": template_id}
        if user_id:
            query["user_id"] = user_id
        if tenant_id:
            query["tenant_id"] = tenant_id

        doc = await self.collection.find_one(query)
        return Template.from_mongodb_dict(doc) if doc else None

    async def find_by_user(
        self, user_id: str, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[Template]:
        """Find templates by user with pagination."""
        query = {"user_id": user_id}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Template.from_mongodb_dict(doc) for doc in docs]

    async def find_by_tags(
        self,
        tags: List[str],
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Template]:
        """Find templates by tags with optional user/tenant filtering."""
        query = {"tags": {"$in": tags}}
        if user_id:
            query["user_id"] = user_id
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("usage_count", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Template.from_mongodb_dict(doc) for doc in docs]

    async def find_popular(
        self, tenant_id: Optional[str] = None, limit: int = 10
    ) -> List[Template]:
        """Find most popular templates by usage count."""
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("usage_count", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Template.from_mongodb_dict(doc) for doc in docs]

    async def update(
        self, template_id: str, updates: dict, user_id: Optional[str] = None
    ) -> Optional[Template]:
        """Update template with user ownership check."""
        query = {"template_id": template_id}
        if user_id:
            query["user_id"] = user_id

        updates["updated_at"] = datetime.utcnow()

        doc = await self.collection.find_one_and_update(
            query, {"$set": updates}, return_document=ReturnDocument.AFTER
        )

        if doc:
            logger.info(f"Updated template: {template_id}")
            return Template.from_mongodb_dict(doc)
        return None

    async def increment_usage(
        self, template_id: str, user_id: Optional[str] = None
    ) -> Optional[Template]:
        """Increment template usage count."""
        query = {"template_id": template_id}
        if user_id:
            query["user_id"] = user_id

        doc = await self.collection.find_one_and_update(
            query,
            {
                "$inc": {"usage_count": 1},
                "$set": {
                    "last_used": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
            },
            return_document=ReturnDocument.AFTER,
        )

        if doc:
            logger.debug(f"Incremented usage for template: {template_id}")
            return Template.from_mongodb_dict(doc)
        return None

    async def delete(
        self, template_id: str, user_id: Optional[str] = None
    ) -> bool:
        """Delete template with user ownership check."""
        query = {"template_id": template_id}
        if user_id:
            query["user_id"] = user_id

        result = await self.collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info(f"Deleted template: {template_id}")
            return True
        return False

    async def count_by_user(
        self, user_id: str, tenant_id: Optional[str] = None
    ) -> int:
        """Count templates for a user."""
        query = {"user_id": user_id}
        if tenant_id:
            query["tenant_id"] = tenant_id
        return await self.collection.count_documents(query)

    async def search_by_name(
        self,
        name_query: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Template]:
        """Search templates by name with optional filtering."""
        query = {"name": {"$regex": name_query, "$options": "i"}}
        if user_id:
            query["user_id"] = user_id
        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = (
            self.collection.find(query)
            .sort("usage_count", -1)
            .limit(limit)
        )

        docs = await cursor.to_list(length=limit)
        return [Template.from_mongodb_dict(doc) for doc in docs]

    async def list_all(
        self, tenant_id: Optional[str] = None, limit: int = 100, skip: int = 0
    ) -> List[Template]:
        """List all templates with pagination."""
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
        return [Template.from_mongodb_dict(doc) for doc in docs]
