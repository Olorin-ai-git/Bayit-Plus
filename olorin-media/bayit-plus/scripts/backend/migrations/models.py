"""
DEPRECATED: This file has been moved to app/models/migration.py

These models are now part of the application's model layer and are registered
with Beanie in the database initialization.

DO NOT import from this location. Use instead:
    from app.models.migration import MigrationRecord, RollbackData

This file is kept temporarily for reference only and will be removed in a future update.
"""

# Re-export from new location for backward compatibility
from app.models.migration import MigrationRecord, RollbackData

__all__ = ["MigrationRecord", "RollbackData"]
