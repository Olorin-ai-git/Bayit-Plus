"""MySQL table analysis operations."""

import logging
from typing import Any, Dict, List

from .config import MySQLQueryError

logger = logging.getLogger(__name__)


class MySQLAnalyzer:
    """MySQL table analysis operations."""

    def __init__(self, client):
        """Initialize with MySQL client."""
        self._client = client

    async def get_tables(self) -> List[Dict[str, Any]]:
        """Get information about all tables in the database."""
        query = """
        SELECT 
            table_name,
            engine,
            table_collation as charset,
            table_rows
        FROM information_schema.tables 
        WHERE table_schema = %s
        ORDER BY table_name
        """
        
        try:
            result = await self._client.execute_query(query, (self._client._config.database,))
            tables = []
            
            for table_row in result["results"]:
                columns = await self._get_table_columns(table_row["table_name"])
                tables.append({
                    "name": table_row["table_name"],
                    "columns": columns,
                    "row_count": table_row["table_rows"] or 0,
                    "engine": table_row["engine"] or "Unknown",
                    "charset": table_row["charset"] or "Unknown"
                })
            
            return tables
            
        except Exception as e:
            raise MySQLQueryError(f"Failed to get tables: {e}")

    async def _get_table_columns(self, table_name: str) -> List[Dict[str, str]]:
        """Get column information for a specific table."""
        query = """
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            column_key,
            extra
        FROM information_schema.columns 
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
        """
        
        result = await self._client.execute_query(query, (self._client._config.database, table_name))
        return [
            {
                "name": col["column_name"],
                "type": col["data_type"],
                "nullable": col["is_nullable"] == "YES",
                "default": col["column_default"],
                "key": col["column_key"],
                "extra": col["extra"]
            }
            for col in result["results"]
        ]

    async def analyze_table(self, table_name: str) -> Dict[str, Any]:
        """Get detailed analysis of a table including column statistics."""
        try:
            # Get basic table info
            table_info = await self._client.execute_query(
                "SELECT COUNT(*) as row_count FROM `{}`".format(table_name)
            )
            row_count = table_info["results"][0]["row_count"]
            
            # Get column information
            columns = await self._get_table_columns(table_name)
            
            # Get column statistics for numeric columns
            column_stats = []
            for col in columns:
                if col["type"] in ["int", "bigint", "decimal", "float", "double"]:
                    stats_query = f"""
                    SELECT 
                        MIN(`{col['name']}`) as min_val,
                        MAX(`{col['name']}`) as max_val,
                        AVG(`{col['name']}`) as avg_val,
                        COUNT(DISTINCT `{col['name']}`) as distinct_count,
                        COUNT(`{col['name']}`) as non_null_count
                    FROM `{table_name}`
                    """
                    stats_result = await self._client.execute_query(stats_query)
                    if stats_result["results"]:
                        col["stats"] = stats_result["results"][0]
                
                column_stats.append(col)
            
            return {
                "table_name": table_name,
                "row_count": row_count,
                "column_count": len(columns),
                "statistics": column_stats
            }
            
        except Exception as e:
            raise MySQLQueryError(f"Failed to analyze table '{table_name}': {e}")

    async def get_table_relationships(self) -> List[Dict[str, Any]]:
        """Get foreign key relationships between tables."""
        query = """
        SELECT 
            table_name,
            column_name,
            constraint_name,
            referenced_table_name,
            referenced_column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = %s 
        AND referenced_table_name IS NOT NULL
        ORDER BY table_name, constraint_name
        """
        
        try:
            result = await self._client.execute_query(query, (self._client._config.database,))
            return [
                {
                    "table": rel["table_name"],
                    "column": rel["column_name"],
                    "references_table": rel["referenced_table_name"],
                    "references_column": rel["referenced_column_name"],
                    "constraint_name": rel["constraint_name"]
                }
                for rel in result["results"]
            ]
            
        except Exception as e:
            raise MySQLQueryError(f"Failed to get table relationships: {e}")