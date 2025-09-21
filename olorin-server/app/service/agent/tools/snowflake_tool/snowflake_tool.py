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
from decimal import Decimal
import json
from .client import SnowflakeClient
from .schema_constants import (
    TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION,
    PAID_AMOUNT_VALUE, TX_DATETIME, PAYMENT_METHOD, CARD_BRAND,
    IP, IP_COUNTRY_CODE, DEVICE_ID, USER_AGENT, DEVICE_TYPE,
    UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER, BIN, LAST_FOUR,
    CARD_ISSUER, FRAUD_RULES_TRIGGERED, MAXMIND_RISK_SCORE
)

class SnowflakeJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Snowflake data types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        return super().default(obj)
# Real column names from Snowflake schema - using schema constants
REAL_COLUMNS = [
    TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION,
    PAID_AMOUNT_VALUE, TX_DATETIME, PAYMENT_METHOD, CARD_BRAND,
    IP, IP_COUNTRY_CODE, DEVICE_ID, USER_AGENT, DEVICE_TYPE,
    UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER, BIN, LAST_FOUR,
    CARD_ISSUER, FRAUD_RULES_TRIGGERED, MAXMIND_RISK_SCORE
]
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.enhanced_tool_execution_logger import get_tool_execution_logger

logger = get_bridge_logger(__name__)


class _SnowflakeQueryArgs(BaseModel):
    """Arguments for Snowflake SQL query."""
    query: str = Field(
        ..., 
        description=(
            "The SQL query to execute against Snowflake data warehouse. "
            "Main table is TRANSACTIONS_ENRICHED with comprehensive fraud data. "
            "IMPORTANT - Use these EXACT column names: TX_ID_KEY (transaction ID), EMAIL (user email), "
            "MODEL_SCORE (fraud risk score 0-1), IS_FRAUD_TX (confirmed fraud flag), "
            f"NSURE_LAST_DECISION (approval/reject decision), {PAID_AMOUNT_VALUE} (transaction amount), "
            "TX_DATETIME (timestamp), PAYMENT_METHOD, CARD_BRAND, IP (client IP address), "
            f"{IP_COUNTRY_CODE} (country from IP), "
            "DEVICE_ID (NOT SMART_ID), PROXY_RISK_SCORE (NOT IS_PROXY), USER_AGENT, "
            "DEVICE_TYPE, DEVICE_FINGERPRINT. "
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
        "300+ columns. CRITICAL - Use EXACT column names: TX_ID_KEY, EMAIL, MODEL_SCORE (0-1), "
        f"PAYMENT_METHOD, CARD_BRAND, {IP}, {IP_COUNTRY_CODE}, IP_CITY, {DEVICE_ID}, DEVICE_FINGERPRINT, "
        "NSURE_LAST_DECISION, PROXY_RISK_SCORE, FRAUD_RULES_TRIGGERED (NOT TRIGGERED_RULES), DISPUTES, "
        f"FRAUD_ALERTS, {PAID_AMOUNT_VALUE} (NOT GMV). NEVER use: GMV, SMART_ID, IS_PROXY, GEO_IP_*. "
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
    
    def _correct_column_names(self, query: str) -> str:
        """Auto-correct common column name mistakes in queries."""
        corrections = {
            # Common mistakes -> Correct column names
            'SMART_ID': 'DEVICE_ID',
            'IS_PROXY': 'PROXY_RISK_SCORE',
            'GMV': PAID_AMOUNT_VALUE,
            'GEO_IP_COUNTRY': IP_COUNTRY_CODE,
            'GEO_IP_CITY': 'IP_CITY',
            'GEO_IP_REGION': 'IP_REGION',
            'TRIGGERED_RULES': 'FRAUD_RULES_TRIGGERED',
            'DISPUTE_FLAG': 'DISPUTES',  # Map DISPUTE_FLAG to DISPUTES for consistency
            # Map all TX_ID variants to the correct TX_ID_KEY column
            'ORIGINAL_TX_ID': 'TX_ID_KEY',
            'SURROGATE_APP_TX_ID': 'TX_ID_KEY', 
            'NSURE_UNIQUE_TX_ID': 'TX_ID_KEY',
            'IP\b': 'IP',  # Replace standalone IP with IP
        }
        
        import re
        corrected_query = query
        for wrong, correct in corrections.items():
            # Use word boundaries for more accurate replacement
            pattern = r'\b' + wrong + r'\b'
            if wrong != 'IP\\b':  # Special handling for IP pattern
                corrected_query = re.sub(pattern, correct, corrected_query, flags=re.IGNORECASE)
            else:
                # For IP, only replace if it's not part of another word
                corrected_query = re.sub(r'\bIP\b(?!_)', 'IP', corrected_query, flags=re.IGNORECASE)
        
        # Additional step: Remove problematic columns that don't exist in the real database
        # This is a temporary fix until the real schema columns are confirmed
        problematic_patterns = [
            r',\s*DISPUTES\s*(?=,|FROM|WHERE|GROUP|ORDER|LIMIT|$)',
            r'SELECT\s+DISPUTES\s*,',
            r',\s*DISPUTE_FLAG\s*(?=,|FROM|WHERE|GROUP|ORDER|LIMIT|$)',
            r'SELECT\s+DISPUTE_FLAG\s*,',
            r',\s*FRAUD_ALERTS\s*(?=,|FROM|WHERE|GROUP|ORDER|LIMIT|$)',
            r'SELECT\s+FRAUD_ALERTS\s*,'
            # Note: TX_ID variants are handled by corrections mapping above, not removal
        ]
        
        for pattern in problematic_patterns:
            corrected_query = re.sub(pattern, '', corrected_query, flags=re.IGNORECASE)
        
        # Clean up any double commas or trailing commas
        corrected_query = re.sub(r',\s*,', ',', corrected_query)
        corrected_query = re.sub(r',\s*(FROM|WHERE|GROUP|ORDER|LIMIT)', r' \1', corrected_query, flags=re.IGNORECASE)
        
        if corrected_query != query:
            logger.warning(f"Auto-corrected column names in query")
            logger.debug(f"Original: {query}")
            logger.debug(f"Corrected: {corrected_query}")
        
        return corrected_query
    
    def _run(self, query: str, database: str = "FRAUD_ANALYTICS", db_schema: str = "PUBLIC", limit: Optional[int] = 1000) -> Dict[str, Any]:
        """Synchronous execution wrapper."""
        import asyncio
        return asyncio.run(self._arun(query, database, db_schema, limit))
    
    async def _arun(self, query: str, database: str = "FRAUD_ANALYTICS", db_schema: str = "PUBLIC", limit: Optional[int] = 1000) -> Dict[str, Any]:
        """Async execution of the Snowflake query with comprehensive error logging."""
        from app.service.config import get_settings_for_env
        from app.utils.firebase_secrets import get_app_secret
        import time
        
        # Get tool execution logger for detailed logging
        tool_logger = get_tool_execution_logger()
        
        # Start execution logging
        tool_args = {
            "query": query[:200] + "..." if len(query) > 200 else query,
            "database": database,
            "schema": db_schema, 
            "limit": limit
        }
        execution_id = await tool_logger.log_tool_execution_start(
            tool_name=self.name,
            tool_args=tool_args
        )
        
        start_time = time.time()
        client = None
        
        try:
            # Auto-correct common column name mistakes
            corrected_query = self._correct_column_names(query)
            if corrected_query != query:
                logger.info(f"🔧 Auto-corrected column names in query")
                logger.debug(f"   Original: {query[:100]}...")
                logger.debug(f"   Corrected: {corrected_query[:100]}...")
            
            settings = get_settings_for_env()
            
            # Get credentials (would come from settings/secrets in production)
            user = getattr(settings, 'snowflake_user', 'fraud_analyst')
            password = getattr(settings, 'snowflake_password', None)
            
            if not password:
                # Fallback to secrets manager
                try:
                    password = get_app_secret("SNOWFLAKE_PASSWORD")
                    logger.debug("🔐 Retrieved Snowflake password from secrets manager")
                except Exception as secret_error:
                    logger.warning(f"⚠️ Failed to retrieve Snowflake password from secrets: {secret_error}")
                    password = "demo_password"
            
            logger.info(f"🗄️ Connecting to Snowflake...")
            logger.info(f"   Account: {self.account}")
            logger.info(f"   User: {user}")
            logger.info(f"   Database: {database}")
            logger.info(f"   Schema: {db_schema}")
            logger.info(f"   Warehouse: {self.warehouse}")
            
            client = SnowflakeClient(
                account=self.account,
                user=user,
                password=password,
                warehouse=self.warehouse
            )
            
            # Attempt connection with detailed error tracking
            try:
                await client.connect(database=database, schema=db_schema)
                logger.info(f"✅ Snowflake connection established successfully")
            except Exception as conn_error:
                logger.error(f"❌ Snowflake connection failed: {conn_error}")
                
                # Log specific connection failure
                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id,
                    error=conn_error,
                    tool_args=tool_args
                )
                
                # Determine specific connection error type
                error_msg = str(conn_error).lower()
                if "authentication" in error_msg or "invalid username" in error_msg:
                    detailed_error = "Authentication failed - check Snowflake credentials"
                elif "warehouse" in error_msg:
                    detailed_error = "Warehouse connection failed - warehouse may be suspended"
                elif "network" in error_msg or "timeout" in error_msg:
                    detailed_error = "Network connection failed - check connectivity to Snowflake"
                else:
                    detailed_error = f"Connection error: {str(conn_error)}"
                
                return {
                    "error": detailed_error,
                    "error_category": "connection_failure",
                    "results": [],
                    "row_count": 0,
                    "query_status": "connection_failed",
                    "execution_timestamp": datetime.now().isoformat(),
                    "execution_duration_ms": int((time.time() - start_time) * 1000),
                    "suggestion": (
                        "Check Snowflake credentials, network connectivity, and warehouse status. "
                        "Ensure the warehouse is not suspended."
                    )
                }
            
            # Execute query with detailed monitoring
            logger.info(f"🔍 Executing Snowflake query...")
            logger.debug(f"   Query: {corrected_query}")
            logger.debug(f"   Limit: {limit}")
            
            try:
                results = await client.execute_query(corrected_query, limit=limit)
                execution_duration_ms = int((time.time() - start_time) * 1000)
                
                logger.info(f"✅ Snowflake query completed successfully")
                logger.info(f"   Duration: {execution_duration_ms}ms")
                logger.info(f"   Rows returned: {len(results)}")
                
                # Check for empty results and provide detailed analysis
                if not results:
                    await tool_logger.log_empty_result(
                        tool_name=self.name,
                        execution_id=execution_id,
                        reason="no_data_found",
                        context={
                            "query": corrected_query[:200] + "..." if len(corrected_query) > 200 else corrected_query,
                            "database": database,
                            "schema": db_schema,
                            "limit": limit,
                            "execution_duration_ms": execution_duration_ms
                        }
                    )
                    
                    logger.warning(f"📭 Snowflake query returned empty results")
                    logger.warning(f"   This could indicate:")
                    logger.warning(f"   - No data matches the query criteria")
                    logger.warning(f"   - Date/time filters are too restrictive")
                    logger.warning(f"   - Column names or table references are incorrect")
                    logger.warning(f"   - Data may not be available for the specified time period")
                
                # Extract column names from first row if available
                columns = list(results[0].keys()) if results else []
                
                # Provide comprehensive query insights
                query_insights = {
                    "contains_fraud_analysis": any(keyword in corrected_query.upper() for keyword in ['FRAUD', 'MODEL_SCORE', 'RISK']),
                    "contains_user_analysis": any(keyword in corrected_query.upper() for keyword in ['EMAIL', 'USER', 'CUSTOMER']),
                    "contains_payment_analysis": any(keyword in corrected_query.upper() for keyword in ['PAYMENT', 'CARD', 'BIN']),
                    "contains_time_analysis": any(keyword in corrected_query.upper() for keyword in ['TX_DATETIME', 'DATE', 'TIME']),
                    "is_aggregate_query": any(keyword in corrected_query.upper() for keyword in ['COUNT', 'SUM', 'AVG', 'GROUP BY']),
                    "query_complexity": "complex" if len(corrected_query) > 500 else "medium" if len(corrected_query) > 200 else "simple",
                    "estimated_data_coverage": "comprehensive" if len(results) > 100 else "partial" if len(results) > 10 else "limited"
                }
                
                # Convert results to JSON-serializable format
                json_safe_results = json.loads(json.dumps(results, cls=SnowflakeJSONEncoder))
                
                # Create comprehensive result object
                result_object = {
                    "results": json_safe_results,
                    "row_count": len(results),
                    "columns": columns,
                    "database": database,
                    "schema": db_schema,
                    "table": "TRANSACTIONS_ENRICHED",
                    "query_insights": query_insights,
                    "query_status": "success",
                    "execution_timestamp": datetime.now().isoformat(),
                    "execution_duration_ms": execution_duration_ms,
                    "schema_info": {
                        "available_columns": REAL_COLUMNS,
                        "main_table": "TRANSACTIONS_ENRICHED"
                    }
                }
                
                # Log successful execution
                await tool_logger.log_tool_execution_success(
                    execution_id=execution_id,
                    result=result_object
                )
                
                return result_object
                
            except Exception as query_error:
                execution_duration_ms = int((time.time() - start_time) * 1000)
                
                logger.error(f"❌ Snowflake query execution failed")
                logger.error(f"   Duration: {execution_duration_ms}ms")
                logger.error(f"   Error: {query_error}")
                
                # Log query execution failure
                await tool_logger.log_tool_execution_failure(
                    execution_id=execution_id,
                    error=query_error,
                    tool_args=tool_args
                )
                
                # Categorize query error for better debugging
                error_msg = str(query_error).lower()
                if "syntax error" in error_msg or "sql compilation error" in error_msg:
                    error_category = "sql_syntax_error"
                    detailed_error = f"SQL syntax error: {str(query_error)}"
                    suggestion = "Check SQL syntax, table names, and column names. Verify against schema documentation."
                elif "timeout" in error_msg or "statement timeout" in error_msg:
                    error_category = "query_timeout"
                    detailed_error = f"Query timeout: {str(query_error)}"
                    suggestion = "Query took too long to execute. Try adding more specific filters or reducing the time range."
                elif "permission" in error_msg or "access denied" in error_msg:
                    error_category = "permission_error"
                    detailed_error = f"Permission error: {str(query_error)}"
                    suggestion = "Check user permissions for the specified database, schema, and tables."
                elif "warehouse" in error_msg:
                    error_category = "warehouse_error"
                    detailed_error = f"Warehouse error: {str(query_error)}"
                    suggestion = "Check if the Snowflake warehouse is active and not suspended."
                else:
                    error_category = "query_execution_error"
                    detailed_error = f"Query execution error: {str(query_error)}"
                    suggestion = "Review query logic and ensure all referenced tables and columns exist."
                
                return {
                    "error": detailed_error,
                    "error_category": error_category,
                    "results": [],
                    "row_count": 0,
                    "query_status": "query_failed",
                    "execution_timestamp": datetime.now().isoformat(),
                    "execution_duration_ms": execution_duration_ms,
                    "suggestion": suggestion,
                    "query_attempted": corrected_query[:500] + "..." if len(corrected_query) > 500 else corrected_query
                }
            
        except Exception as e:
            execution_duration_ms = int((time.time() - start_time) * 1000)
            
            logger.error(f"❌ Snowflake tool execution failed with unexpected error")
            logger.error(f"   Duration: {execution_duration_ms}ms") 
            logger.error(f"   Error: {str(e)}")
            
            # Log unexpected error
            await tool_logger.log_tool_execution_failure(
                execution_id=execution_id,
                error=e,
                tool_args=tool_args
            )
            
            return {
                "error": f"Unexpected Snowflake tool error: {str(e)}",
                "error_category": "unexpected_error",
                "results": [],
                "row_count": 0,
                "query_status": "tool_error",
                "execution_timestamp": datetime.now().isoformat(),
                "execution_duration_ms": execution_duration_ms,
                "suggestion": (
                    "An unexpected error occurred. Check Snowflake connectivity and credentials. "
                    "Contact system administrator if the issue persists."
                )
            }
            
        finally:
            # Clean up connection
            if client:
                try:
                    await client.disconnect()
                    logger.debug("🔌 Snowflake connection closed")
                except Exception as disconnect_error:
                    logger.warning(f"⚠️ Error closing Snowflake connection: {disconnect_error}")
                    # Don't re-raise - this is cleanup