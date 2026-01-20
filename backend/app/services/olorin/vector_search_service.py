"""
Vector Search Service for Olorin.ai Platform

DEPRECATED: This module has been refactored into the search/ subpackage.
This file is kept for backward compatibility.

Import from app.services.olorin.search instead.
"""

# Re-export from new location for backward compatibility
from app.services.olorin.search import VectorSearchService, vector_search_service

__all__ = ["VectorSearchService", "vector_search_service"]
