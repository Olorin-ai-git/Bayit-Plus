"""MySQL client configuration and types."""

from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class TableInfo:
    """Information about a database table."""
    name: str
    columns: List[Dict[str, str]]
    row_count: int
    engine: str
    charset: str


@dataclass
class MySQLConfig:
    """MySQL connection configuration."""
    host: str
    port: int
    user: str
    password: str
    database: str
    charset: str = 'utf8mb4'
    autocommit: bool = True
    minsize: int = 1
    maxsize: int = 10


class MySQLError(Exception):
    """Base exception for MySQL client errors."""
    pass


class MySQLConnectionError(MySQLError):
    """MySQL connection error."""
    pass


class MySQLQueryError(MySQLError):
    """MySQL query execution error."""
    pass