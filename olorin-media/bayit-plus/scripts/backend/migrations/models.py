"""
MongoDB-backed migration tracking models using Beanie ODM.

Provides ACID-compliant migration registry and rollback storage.
Eliminates need for file-based tracking and supports concurrent operations.
"""
from datetime import datetime
from typing import Optional, List

from beanie import Document
from pydantic import Field


class MigrationRecord(Document):
    """
    MongoDB-backed migration registry.

    Tracks executed migrations with full audit trail.
    Prevents duplicate execution and supports rollback.
    """

    migration_id: str = Field(..., description="Unique migration identifier")
    description: str = Field(..., description="Human-readable migration description")
    script: str = Field(..., description="Script name that performed migration")
    executed_at: datetime = Field(
        default_factory=datetime.utcnow, description="Execution timestamp"
    )
    executed_by: str = Field(..., description="User who executed migration")
    status: str = Field(
        default="completed",
        description="Migration status: completed, failed, rolled_back",
    )
    affected_documents: int = Field(
        default=0, description="Number of documents modified"
    )
    document_ids: List[str] = Field(
        default_factory=list, description="List of affected document IDs"
    )
    rollback_available: bool = Field(
        default=False, description="Whether rollback data was stored"
    )
    rollback_migration_id: Optional[str] = Field(
        default=None, description="Migration ID of rollback operation"
    )
    mongodb_version: str = Field(..., description="MongoDB version at execution time")
    environment: str = Field(
        default="development",
        description="Environment: production, staging, development",
    )
    backup_reference: Optional[str] = Field(
        default=None, description="Reference to pre-migration backup"
    )
    checksum: str = Field(..., description="SHA256 checksum of affected document IDs")
    error_message: Optional[str] = Field(
        default=None, description="Error message if migration failed"
    )

    class Settings:
        name = "_migrations"  # MongoDB collection name
        indexes = [
            "migration_id",  # Unique index on migration_id
            [("executed_at", -1)],  # Descending index for recent queries
            "status",  # Index for filtering by status
            "environment",  # Index for environment-specific queries
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "migration_id": "bucket_upgrade_20260123_143022",
                "description": "URL transformation: bucket_upgrade",
                "script": "url_migrator.py:bucket_upgrade",
                "executed_by": "admin",
                "status": "completed",
                "affected_documents": 1234,
                "document_ids": ["507f1f77bcf86cd799439011", "..."],
                "rollback_available": True,
                "mongodb_version": "7.0.5",
                "environment": "production",
                "checksum": "abc123...",
            }
        }


class RollbackData(Document):
    """
    Stores original document values for rollback capability.

    One record per affected document, storing complete original state.
    TTL index automatically cleans up old rollback data.
    """

    migration_id: str = Field(
        ..., description="Migration ID this rollback data belongs to"
    )
    collection_name: str = Field(..., description="Name of the affected collection")
    document_id: str = Field(..., description="ObjectId of the affected document")
    original_values: dict = Field(..., description="Original field values before change")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp when stored"
    )

    class Settings:
        name = "_migration_rollback"  # MongoDB collection name
        indexes = [
            "migration_id",  # Index for fetching all rollback data for a migration
            [("created_at", 1)],  # TTL index for automatic cleanup (90 days)
        ]
        # TTL index: expire_after_seconds = 7776000  # 90 days
        # NOTE: TTL must be created manually via MongoDB shell or migration:
        # db._migration_rollback.createIndex({"created_at": 1}, {expireAfterSeconds: 7776000})

    class Config:
        json_schema_extra = {
            "example": {
                "migration_id": "bucket_upgrade_20260123_143022",
                "collection_name": "content",
                "document_id": "507f1f77bcf86cd799439011",
                "original_values": {
                    "stream_url": "gs://bayit-plus-media/movies/example.mp4",
                    "preview_url": "gs://bayit-plus-media/previews/example.jpg",
                },
                "created_at": "2026-01-23T14:30:22.123Z",
            }
        }
