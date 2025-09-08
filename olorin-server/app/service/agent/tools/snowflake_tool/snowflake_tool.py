"""
Snowflake Query Tool for LangChain

This tool allows querying Snowflake data warehouse for comprehensive transaction analysis,
fraud detection, user profiling, and business intelligence. The tool provides access to
a rich dataset containing transaction records, user data, payment methods, risk scores,
disputes, fraud alerts, and much more.
"""

from typing import Any, Dict, Optional
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from datetime import datetime
from .client import SnowflakeClient
from .schema_info import SNOWFLAKE_SCHEMA_INFO
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _SnowflakeQueryArgs(BaseModel):
    """Arguments for Snowflake SQL query."""
    query: str = Field(
        ..., 
        description=(
            "The SQL query to execute against Snowflake data warehouse. "
            "Main table is TRANSACTIONS_ENRICHED with comprehensive fraud data. "
            "Key columns include: TX_ID_KEY (transaction ID), EMAIL (user email), "
            "MODEL_SCORE (fraud risk score 0-1), IS_FRAUD_TX (confirmed fraud flag), "
            "NSURE_LAST_DECISION (approval/reject decision), PAID_AMOUNT_VALUE (transaction amount), "
            "TX_DATETIME (transaction timestamp), PAYMENT_METHOD, CARD_BRAND, etc. "
            "Use LIMIT clause for large result sets."
        )
    )
    database: str = Field(
        "FRAUD_ANALYTICS", 
        description="The Snowflake database to query (default: FRAUD_ANALYTICS)."
    )
    db_schema: str = Field(
        "PUBLIC", 
        description="The database schema to use (default: PUBLIC)."
    )
    limit: Optional[int] = Field(
        1000,
        description="Maximum number of rows to return (default: 1000, max: 10000)."
    )



class SnowflakeQueryTool(BaseTool):
    """LangChain tool for querying Snowflake data warehouse."""
    
    name: str = "snowflake_query_tool" 
    description: str = (
        "Queries comprehensive Snowflake fraud detection data warehouse containing detailed "
        "transaction records, user profiles, payment methods, risk scores, fraud indicators, "
        "disputes, and business intelligence data. Main table is TRANSACTIONS_ENRICHED with "
        "300+ columns including: transaction IDs, user emails, fraud scores (MODEL_SCORE 0-1), "
        "payment methods, card details, IP geolocation, device fingerprints, merchant data, "
        "NSure decisions, MaxMind risk scores, triggered fraud rules, dispute records, "
        "fraud alerts, KYC data, and comprehensive transaction metadata. Use for fraud analysis, "
        "user investigation, payment method analysis, merchant risk assessment, and trend analysis. "
        "Supports complex queries with JOINs, aggregations, time-based filtering, and statistical analysis."
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
    
    def _run(self, query: str, database: str = "FRAUD_ANALYTICS", db_schema: str = "PUBLIC", limit: Optional[int] = 1000) -> Dict[str, Any]:
        """Synchronous execution wrapper."""
        import asyncio
        return asyncio.run(self._arun(query, database, db_schema, limit))
    
    async def _arun(self, query: str, database: str = "FRAUD_ANALYTICS", db_schema: str = "PUBLIC", limit: Optional[int] = 1000) -> Dict[str, Any]:
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
                password = get_app_secret("SNOWFLAKE_PASSWORD")
            except:
                password = "demo_password"
        
        client = SnowflakeClient(
            account=self.account,
            user=user,
            password=password,
            warehouse=self.warehouse
        )
        
        try:
            await client.connect(database=database, schema=db_schema)
            results = await client.execute_query(query, limit=limit)
            
            logger.info(f"Snowflake query completed, returned {len(results)} rows")
            
            # Extract column names from first row if available
            columns = list(results[0].keys()) if results else []
            
            # Provide query insights
            query_insights = {
                "contains_fraud_analysis": any(keyword in query.upper() for keyword in ['FRAUD', 'MODEL_SCORE', 'RISK']),
                "contains_user_analysis": any(keyword in query.upper() for keyword in ['EMAIL', 'USER', 'CUSTOMER']),
                "contains_payment_analysis": any(keyword in query.upper() for keyword in ['PAYMENT', 'CARD', 'BIN']),
                "contains_time_analysis": any(keyword in query.upper() for keyword in ['TX_DATETIME', 'DATE', 'TIME']),
                "is_aggregate_query": any(keyword in query.upper() for keyword in ['COUNT', 'SUM', 'AVG', 'GROUP BY'])
            }
            
            return {
                "results": results,
                "row_count": len(results),
                "columns": columns,
                "database": database,
                "schema": db_schema,
                "table": "TRANSACTIONS_ENRICHED",
                "query_insights": query_insights,
                "query_status": "success",
                "execution_timestamp": datetime.now().isoformat(),
                "schema_info": {
                    "available_columns": list(SNOWFLAKE_SCHEMA_INFO["key_columns"].keys()),
                    "common_queries": list(SNOWFLAKE_SCHEMA_INFO["common_queries"].keys())
                }
            }
            
        except Exception as e:
            logger.error(f"Snowflake query failed: {str(e)}")
            return {
                "error": str(e),
                "results": [],
                "row_count": 0,
                "query_status": "failed",
                "execution_timestamp": datetime.now().isoformat(),
                "suggestion": (
                    "Ensure your query uses SELECT statements only and references the "
                    "TRANSACTIONS_ENRICHED table. Check column names against schema documentation."
                )
            }
        finally:
            try:
                await client.disconnect()
            except Exception:
                pass