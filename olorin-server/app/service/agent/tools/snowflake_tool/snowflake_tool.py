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
# Real column names from Snowflake schema
REAL_COLUMNS = [
    'TX_ID_KEY', 'EMAIL', 'MODEL_SCORE', 'IS_FRAUD_TX', 'NSURE_LAST_DECISION',
    'PAID_AMOUNT_VALUE', 'TX_DATETIME', 'PAYMENT_METHOD', 'CARD_BRAND',
    'IP_ADDRESS', 'IP_COUNTRY', 'DEVICE_ID', 'USER_AGENT', 'DEVICE_TYPE',
    'USER_ID', 'FIRST_NAME', 'LAST_NAME', 'PHONE_NUMBER', 'CARD_BIN', 'CARD_LAST4',
    'CARD_ISSUER', 'PAYMENT_PROCESSOR', 'FRAUD_RULES_TRIGGERED', 'MAXMIND_RISK_SCORE'
]
from app.service.logging import get_bridge_logger

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
            "NSURE_LAST_DECISION (approval/reject decision), PAID_AMOUNT_VALUE (transaction amount), "
            "TX_DATETIME (timestamp), PAYMENT_METHOD, CARD_BRAND, IP_ADDRESS (client IP address), "
            "IP_COUNTRY (country from IP), "
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
        "PAYMENT_METHOD, CARD_BRAND, IP_ADDRESS, IP_COUNTRY, IP_CITY, DEVICE_ID, DEVICE_FINGERPRINT, "
        "NSURE_LAST_DECISION, PROXY_RISK_SCORE, FRAUD_RULES_TRIGGERED (NOT TRIGGERED_RULES), DISPUTES, "
        "FRAUD_ALERTS, PAID_AMOUNT_VALUE (NOT GMV). NEVER use: GMV, SMART_ID, IS_PROXY, GEO_IP_*. "
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
            'GMV': 'PAID_AMOUNT_VALUE',
            'GEO_IP_COUNTRY': 'IP_COUNTRY',
            'GEO_IP_CITY': 'IP_CITY',
            'GEO_IP_REGION': 'IP_REGION',
            'TRIGGERED_RULES': 'FRAUD_RULES_TRIGGERED',
            'DISPUTE_FLAG': 'DISPUTES',  # Map DISPUTE_FLAG to DISPUTES for consistency
            # Map all TX_ID variants to the correct TX_ID_KEY column
            'ORIGINAL_TX_ID': 'TX_ID_KEY',
            'SURROGATE_APP_TX_ID': 'TX_ID_KEY', 
            'NSURE_UNIQUE_TX_ID': 'TX_ID_KEY',
            'IP\b': 'IP_ADDRESS',  # Replace standalone IP with IP_ADDRESS
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
                corrected_query = re.sub(r'\bIP\b(?!_)', 'IP_ADDRESS', corrected_query, flags=re.IGNORECASE)
        
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
        """Async execution of the Snowflake query."""
        from app.service.config import get_settings_for_env
        from app.utils.firebase_secrets import get_app_secret
        
        # Auto-correct common column name mistakes
        query = self._correct_column_names(query)
        
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
            
            # Convert results to JSON-serializable format
            json_safe_results = json.loads(json.dumps(results, cls=SnowflakeJSONEncoder))
            
            return {
                "results": json_safe_results,
                "row_count": len(results),
                "columns": columns,
                "database": database,
                "schema": db_schema,
                "table": "TRANSACTIONS_ENRICHED",
                "query_insights": query_insights,
                "query_status": "success",
                "execution_timestamp": datetime.now().isoformat(),
                "schema_info": {
                    "available_columns": REAL_COLUMNS,
                    "main_table": "TRANSACTIONS_ENRICHED"
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