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
"""

from .service import UploadService
from .gcs import gcs_uploader, GCSUploader
from .metadata import metadata_extractor, MetadataExtractor
from .content import content_creator, ContentEntryCreator
from .background import background_enricher, BackgroundEnricher

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
]
