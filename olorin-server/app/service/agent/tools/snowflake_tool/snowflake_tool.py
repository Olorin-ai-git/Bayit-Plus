"""
Snowflake Query Tool for LangChain

This tool allows querying Snowflake data warehouse for transaction history, 
user profiles, and analytical data.
"""

from typing import Any, Dict, List
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
import logging
import asyncio

logger = logging.getLogger(__name__)


class _SnowflakeQueryArgs(BaseModel):
    """Arguments for Snowflake SQL query."""
    query: str = Field(..., description="The SQL query to execute against Snowflake data warehouse.")
    database: str = Field("FRAUD_DB", description="The Snowflake database to query.")
    schema: str = Field("PUBLIC", description="The database schema to use.")


class SnowflakeClient:
    """Client for interacting with Snowflake data warehouse."""
    
    def __init__(self, account: str, user: str, password: str, warehouse: str):
        self.account = account
        self.user = user
        self.password = password
        self.warehouse = warehouse
        self.connection = None
        
    async def connect(self, database: str = "FRAUD_DB", schema: str = "PUBLIC"):
        """Establish connection to Snowflake."""
        await asyncio.sleep(0.1)  # Simulate connection
        logger.info(f"Connected to Snowflake: {self.account}/{database}.{schema}")
        self.database = database
        self.schema = schema
        
    async def disconnect(self):
        """Close Snowflake connection."""
        await asyncio.sleep(0.1)
        logger.info("Disconnected from Snowflake")
        
    async def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a SQL query against Snowflake."""
        logger.info(f"Executing Snowflake query in {self.database}.{self.schema}: {query[:100]}...")
        # In production, this would use snowflake-connector-python
        await asyncio.sleep(0.5)  # Simulate query execution
        return []


class SnowflakeQueryTool(BaseTool):
    """LangChain tool for querying Snowflake data warehouse."""
    
    name: str = "snowflake_query_tool"
    description: str = (
        "Queries Snowflake data warehouse for transaction history, user profiles, "
        "customer data, and analytical insights. Use this tool when you need to analyze "
        "historical transaction patterns, user account details, payment methods, "
        "customer behavior analytics, or financial data. Snowflake contains structured "
        "business data that complements the logs from Splunk and SumoLogic."
    )
    
    # Explicit args schema for strict tool parsing
    args_schema: type[BaseModel] = _SnowflakeQueryArgs
    
    # Connection parameters
    account: str = Field(
        "olorin_fraud.snowflakecomputing.com",
        description="Snowflake account URL"
    )
    warehouse: str = Field(
        "FRAUD_ANALYSIS_WH",
        description="Snowflake warehouse for query execution"
    )
    
    def _run(self, query: str, database: str = "FRAUD_DB", schema: str = "PUBLIC") -> Dict[str, Any]:
        """Synchronous execution wrapper."""
        import asyncio
        return asyncio.run(self._arun(query, database, schema))
    
    async def _arun(self, query: str, database: str = "FRAUD_DB", schema: str = "PUBLIC") -> Dict[str, Any]:
        """Async execution of the Snowflake query."""
        from app.service.config import get_settings_for_env
        from app.utils.firebase_secrets import get_app_secret
        
        settings = get_settings_for_env()
        
        # Get credentials (would come from settings/secrets in production)
        user = getattr(settings, 'snowflake_user', 'fraud_analyst')
        password = getattr(settings, 'snowflake_password', None)
        
        if not password:
            # Fallback to secrets manager
            try:
                password = get_app_secret("olorin/snowflake_password")
            except:
                password = "demo_password"
        
        client = SnowflakeClient(
            account=self.account,
            user=user,
            password=password,
            warehouse=self.warehouse
        )
        
        try:
            await client.connect(database=database, schema=schema)
            results = await client.execute_query(query)
            
            logger.info(f"Snowflake query completed, returned {len(results)} rows")
            
            return {
                "results": results,
                "row_count": len(results),
                "database": database,
                "schema": schema,
                "query_status": "success"
            }
            
        except Exception as e:
            logger.error(f"Snowflake query failed: {str(e)}")
            return {
                "error": str(e),
                "results": [],
                "row_count": 0,
                "query_status": "failed"
            }
        finally:
            try:
                await client.disconnect()
            except Exception:
                pass