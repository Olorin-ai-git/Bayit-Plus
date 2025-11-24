"""
Database Tool Module.

This module provides database abstraction layer for multiple providers.
Exports the main classes and functions for database operations.
"""

from .database_tool import DatabaseQueryTool, DatabaseSchemaTool
from .database_provider import DatabaseProvider
from .database_factory import DatabaseFactory, get_database_provider
from .snowflake_provider import SnowflakeProvider
from .postgres_client import PostgreSQLProvider
from .schema_validator import SchemaValidator
from .schema_models import (
    ColumnInfo,
    SchemaInfo,
    SchemaDifference,
    TypeMismatch,
    ValidationResult
)
from .query_translator import QueryTranslator
from .query_cache import QueryCache
from .migration_manager import MigrationManager
from .postgres_indexes import PostgreSQLIndexManager
from .postgres_pool_tuning import PostgreSQLPoolTuner
from .query_monitor import QueryPerformanceMonitor, monitor_query_performance, get_global_query_monitor
from .query_optimizer import PostgreSQLQueryOptimizer

__all__ = [
    "DatabaseQueryTool",
    "DatabaseSchemaTool",
    "DatabaseProvider",
    "DatabaseFactory",
    "get_database_provider",
    "SnowflakeProvider",
    "PostgreSQLProvider",
    "SchemaValidator",
    "ColumnInfo",
    "SchemaInfo",
    "SchemaDifference",
    "TypeMismatch",
    "ValidationResult",
    "QueryTranslator",
    "QueryCache",
    "MigrationManager",
    "PostgreSQLIndexManager",
    "PostgreSQLPoolTuner",
    "QueryPerformanceMonitor",
    "monitor_query_performance",
    "get_global_query_monitor",
    "PostgreSQLQueryOptimizer",
]