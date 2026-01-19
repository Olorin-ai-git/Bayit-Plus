"""
Upload Service Module

Modularized upload service for file upload queue management,
GCS uploads, metadata extraction, and content entry creation.

Package structure:
- service.py - Core UploadService class and queue management
- gcs.py - Google Cloud Storage upload operations
- metadata.py - Metadata extraction for different content types
- content.py - Database content entry creation
- background.py - Background enrichment tasks
- lock.py - Distributed lock manager for duplicate prevention
- transaction.py - Saga pattern transaction manager with rollback
- integrity.py - Orphan detection and cleanup service
"""

from .service import UploadService
from .gcs import gcs_uploader, GCSUploader
from .metadata import metadata_extractor, MetadataExtractor
from .content import content_creator, ContentEntryCreator
from .background import background_enricher, BackgroundEnricher
from .lock import upload_lock_manager, UploadLockManager
from .transaction import UploadTransaction, RollbackResult, CompensationAction
from .integrity import upload_integrity_service, UploadIntegrityService

# Global upload service instance for backwards compatibility
upload_service = UploadService()

__all__ = [
    # Main service
    "UploadService",
    "upload_service",
    # GCS
    "GCSUploader",
    "gcs_uploader",
    # Metadata
    "MetadataExtractor",
    "metadata_extractor",
    # Content
    "ContentEntryCreator",
    "content_creator",
    # Background
    "BackgroundEnricher",
    "background_enricher",
    # Lock manager
    "UploadLockManager",
    "upload_lock_manager",
    # Transaction manager
    "UploadTransaction",
    "RollbackResult",
    "CompensationAction",
    # Integrity service
    "UploadIntegrityService",
    "upload_integrity_service",
]
