"""
Olorin Protocol Definitions

Defines protocol interfaces for content indexing and search.
These protocols enable loose coupling between Bayit+ models and Olorin services.
"""

from app.protocols.content_protocols import IndexableContent, SearchableContent

__all__ = ["IndexableContent", "SearchableContent"]
