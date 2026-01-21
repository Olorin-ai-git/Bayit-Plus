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

from .background import BackgroundEnricher, background_enricher
from .content import ContentEntryCreator, content_creator
from .gcs import GCSUploader, gcs_uploader
from .integrity import UploadIntegrityService, upload_integrity_service
from .lock import UploadLockManager, upload_lock_manager
from .metadata import MetadataExtractor, metadata_extractor
from .service import UploadService
from .transaction import CompensationAction, RollbackResult, UploadTransaction

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
