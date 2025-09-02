"""Databricks client configuration and types."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class DatabricksConfig:
    """Databricks connection configuration."""
    server_hostname: str
    http_path: str
    access_token: str
    catalog: Optional[str] = None
    schema: Optional[str] = None
    timeout: int = 300


class DatabricksError(Exception):
    """Base exception for Databricks client errors."""
    pass


class DatabricksConnectionError(DatabricksError):
    """Databricks connection error."""
    pass


class DatabricksQueryError(DatabricksError):
    """Databricks query execution error."""
    pass