"""Database tools for LangGraph agents to interact with SQL databases."""

import json
from typing import Any, Dict, List, Optional, Union

import sqlalchemy as sa
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _DatabaseQueryArgs(BaseModel):
    """Arguments for the database query tool."""

    query: str = Field(..., description="SQL query to execute. Use proper SQL syntax.")
    parameters: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional parameters for parameterized queries"
    )
    limit: Optional[int] = Field(
        default=100, description="Maximum number of rows to return"
    )


class DatabaseQueryTool(BaseTool):
    """
    LangChain tool for executing SQL queries against a database.

    Supports parameterized queries and has safety features like row limits.
    """

    name: str = "database_query"
    description: str = (
        "Execute SQL queries against the database. "
        "Can run SELECT, INSERT, UPDATE, DELETE statements. "
        "Supports parameterized queries for safety. "
        "Returns query results as JSON."
    )
    args_schema: type[BaseModel] = _DatabaseQueryArgs

    def __init__(self, connection_string: str, **kwargs):
        """Initialize with database connection string."""
        super().__init__(**kwargs)
        self._connection_string = connection_string
        self._engine: Optional[Engine] = None

    @property
    def engine(self) -> Engine:
        """Get or create database engine."""
        if self._engine is None:
            self._engine = create_engine(self._connection_string)
        return self._engine

    def _run(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = 100,
    ) -> Dict[str, Any]:
        """Execute the SQL query."""
        try:
            # Add LIMIT clause for SELECT queries if not present
            query_upper = query.strip().upper()
            if (
                query_upper.startswith("SELECT")
                and limit
                and "LIMIT" not in query_upper
            ):
                query = f"{query.rstrip(';')} LIMIT {limit}"

            with self.engine.connect() as conn:
                if parameters:
                    result = conn.execute(text(query), parameters)
                else:
                    result = conn.execute(text(query))

                # Handle different types of queries
                if query_upper.startswith("SELECT"):
                    # Fetch results for SELECT queries
                    rows = result.fetchall()
                    columns = list(result.keys())

                    return {
                        "success": True,
                        "row_count": len(rows),
                        "columns": columns,
                        "data": [dict(zip(columns, row)) for row in rows],
                        "query": query,
                    }
                else:
                    # For INSERT/UPDATE/DELETE, return affected rows
                    conn.commit()
                    return {
                        "success": True,
                        "rows_affected": result.rowcount,
                        "query": query,
                    }

        except SQLAlchemyError as e:
            logger.error(f"Database query error: {e}")
            return {"success": False, "error": str(e), "query": query}
        except Exception as e:
            logger.error(f"Unexpected error in database query: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "query": query,
            }

    async def _arun(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = 100,
    ) -> Dict[str, Any]:
        """Async version of the query execution."""
        # For now, just call the sync version
        # In a real implementation, you'd use an async engine
        return self._run(query, parameters, limit)


class _DatabaseSchemaArgs(BaseModel):
    """Arguments for the database schema tool."""

    table_name: Optional[str] = Field(
        default=None,
        description="Specific table name to inspect. If None, returns all tables.",
    )
    include_columns: bool = Field(
        default=True, description="Whether to include column information"
    )
    include_indexes: bool = Field(
        default=False, description="Whether to include index information"
    )


class DatabaseSchemaTool(BaseTool):
    """
    LangChain tool for inspecting database schema and structure.

    Can retrieve table names, column information, data types, and indexes.
    """

    name: str = "database_schema"
    description: str = (
        "Inspect database schema and structure. "
        "Get table names, column information, data types, and constraints. "
        "Useful for understanding database structure before writing queries."
    )
    args_schema: type[BaseModel] = _DatabaseSchemaArgs

    def __init__(self, connection_string: str, **kwargs):
        """Initialize with database connection string."""
        super().__init__(**kwargs)
        self._connection_string = connection_string
        self._engine: Optional[Engine] = None

    @property
    def engine(self) -> Engine:
        """Get or create database engine."""
        if self._engine is None:
            self._engine = create_engine(self._connection_string)
        return self._engine

    def _run(
        self,
        table_name: Optional[str] = None,
        include_columns: bool = True,
        include_indexes: bool = False,
    ) -> Dict[str, Any]:
        """Inspect the database schema."""
        try:
            inspector = inspect(self.engine)

            if table_name:
                # Inspect specific table
                if table_name not in inspector.get_table_names():
                    return {
                        "success": False,
                        "error": f"Table '{table_name}' not found",
                    }

                table_info = {"name": table_name}

                if include_columns:
                    columns = inspector.get_columns(table_name)
                    table_info["columns"] = [
                        {
                            "name": col["name"],
                            "type": str(col["type"]),
                            "nullable": col["nullable"],
                            "default": col.get("default"),
                            "primary_key": col.get("primary_key", False),
                        }
                        for col in columns
                    ]

                if include_indexes:
                    indexes = inspector.get_indexes(table_name)
                    table_info["indexes"] = [
                        {
                            "name": idx["name"],
                            "columns": idx["column_names"],
                            "unique": idx["unique"],
                        }
                        for idx in indexes
                    ]

                return {"success": True, "table": table_info}

            else:
                # Get all tables
                table_names = inspector.get_table_names()
                tables_info = []

                for table in table_names:
                    table_info = {"name": table}

                    if include_columns:
                        columns = inspector.get_columns(table)
                        table_info["columns"] = [
                            {
                                "name": col["name"],
                                "type": str(col["type"]),
                                "nullable": col["nullable"],
                                "default": col.get("default"),
                                "primary_key": col.get("primary_key", False),
                            }
                            for col in columns
                        ]

                    if include_indexes:
                        indexes = inspector.get_indexes(table)
                        table_info["indexes"] = [
                            {
                                "name": idx["name"],
                                "columns": idx["column_names"],
                                "unique": idx["unique"],
                            }
                            for idx in indexes
                        ]

                    tables_info.append(table_info)

                return {
                    "success": True,
                    "table_count": len(table_names),
                    "tables": tables_info,
                }

        except SQLAlchemyError as e:
            logger.error(f"Database schema inspection error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in schema inspection: {e}")
            return {"success": False, "error": f"Unexpected error: {str(e)}"}

    async def _arun(
        self,
        table_name: Optional[str] = None,
        include_columns: bool = True,
        include_indexes: bool = False,
    ) -> Dict[str, Any]:
        """Async version of schema inspection."""
        return self._run(table_name, include_columns, include_indexes)
