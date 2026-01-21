"""
Database Tool Module.

This module provides database abstraction layer for multiple providers.
Exports the main classes and functions for database operations.
"""

from .database_factory import DatabaseFactory, get_database_provider
from .database_provider import DatabaseProvider
from .database_tool import DatabaseQueryTool, DatabaseSchemaTool
from .migration_manager import MigrationManager
from .postgres_client import PostgreSQLProvider
from .postgres_indexes import PostgreSQLIndexManager
from .postgres_pool_tuning import PostgreSQLPoolTuner
from .query_cache import QueryCache
from .query_monitor import (
    QueryPerformanceMonitor,
    get_global_query_monitor,
    monitor_query_performance,
)
from .query_optimizer import PostgreSQLQueryOptimizer
from .query_translator import QueryTranslator
from .schema_models import (
    ColumnInfo,
    SchemaDifference,
    SchemaInfo,
    TypeMismatch,
    ValidationResult,
)
from .schema_validator import SchemaValidator
from .snowflake_provider import SnowflakeProvider

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
