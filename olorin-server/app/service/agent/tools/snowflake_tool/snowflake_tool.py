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
from .query_builder import SnowflakeQueryBuilder, get_recommended_query_for_entity
from .schema_constants import (
    TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION,
    PAID_AMOUNT_VALUE_IN_CURRENCY, TX_DATETIME, PAYMENT_METHOD, CARD_BRAND,
    IP, IP_COUNTRY_CODE, DEVICE_ID, USER_AGENT, DEVICE_TYPE,
    UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER, BIN, LAST_FOUR,
    CARD_ISSUER, MAXMIND_RISK_SCORE, DEVICE_MODEL, DEVICE_OS_VERSION,
    PARSED_USER_AGENT, build_safe_select_columns, is_valid_column,
    get_full_table_name
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
# Comprehensive column selection for fraud investigation evidence
# Organized by investigation category for optimal query construction

# Core Transaction Fields - Always Required
CORE_TRANSACTION_FIELDS = [
    TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID,
    PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD
]

# Risk and Fraud Analysis Fields
RISK_ANALYSIS_FIELDS = [
    MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE,
    "TRIGGERED_RULES", "COUNT_TRIGGERED_RULES", "RULE_DECISION"
]

# User Identity and Profile Fields
USER_IDENTITY_FIELDS = [
    FIRST_NAME, LAST_NAME, PHONE_NUMBER, "DATE_OF_BIRTH",
    "EMAIL_FIRST_SEEN", "DAYS_FROM_FIRST_EMAIL_SEEN_TO_TX"
]

# Device Analysis Fields
DEVICE_ANALYSIS_FIELDS = [
    DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL,
    DEVICE_OS_VERSION, PARSED_USER_AGENT, "IS_DEVICE_ID_AUTHENTICATED"
]

# Network and Location Fields
NETWORK_LOCATION_FIELDS = [
    IP, IP_COUNTRY_CODE, "ASN", "ISP", "MAXMIND_IP_RISK_SCORE"
]

# Payment Method Analysis Fields
PAYMENT_ANALYSIS_FIELDS = [
    CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, "CARD_TYPE",
    "IS_CARD_COMMERCIAL", "IS_CARD_PREPAID", "BIN_COUNTRY_CODE"
]

# Behavioral and Temporal Fields
BEHAVIORAL_FIELDS = [
    "DAYS_FROM_FIRST_TX_ATTEMPT_TO_TX", "IS_USER_FIRST_TX_ATTEMPT",
    "IS_RECURRING_USER", "DAYS_FROM_FIRST_USER_ACCOUNT_ACTIVITY_DATE_TO_TX"
]

# Dispute and Fraud History Fields
FRAUD_HISTORY_FIELDS = [
    "DISPUTES", "COUNT_DISPUTES", "FRAUD_ALERTS", "COUNT_FRAUD_ALERTS",
    "LAST_DISPUTE_REASON", "IS_LAST_DISPUTE_FRAUD_RELATED_REASON"
]

# Comprehensive column set for fraud investigations
REAL_COLUMNS = (
    CORE_TRANSACTION_FIELDS +
    RISK_ANALYSIS_FIELDS +
    USER_IDENTITY_FIELDS +
    DEVICE_ANALYSIS_FIELDS +
    NETWORK_LOCATION_FIELDS +
    PAYMENT_ANALYSIS_FIELDS +
    BEHAVIORAL_FIELDS +
    FRAUD_HISTORY_FIELDS
)

# Priority fields for initial queries (most critical evidence)
PRIORITY_EVIDENCE_FIELDS = (
    CORE_TRANSACTION_FIELDS +
    RISK_ANALYSIS_FIELDS +
    DEVICE_ANALYSIS_FIELDS +
    NETWORK_LOCATION_FIELDS
)
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.enhanced_tool_execution_logger import get_tool_execution_logger

logger = get_bridge_logger(__name__)


class _SnowflakeQueryArgs(BaseModel):
    """Arguments for Snowflake SQL query."""
    query: str = Field(
        ..., 
        description=(
            "The SQL query to execute against Snowflake data warehouse. "
            "Main table: TRANSACTIONS_ENRICHED with 333+ evidence columns. "
            "COMPREHENSIVE EVIDENCE FIELDS AVAILABLE: "
            "CORE: TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID, PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD | "
            "RISK: MODEL_SCORE (0-1), IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE, TRIGGERED_RULES | "
            "DEVICE: DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION, PARSED_USER_AGENT | "
            "NETWORK: IP, IP_COUNTRY_CODE, ASN, ISP, MAXMIND_IP_RISK_SCORE | "
            "PAYMENT: CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, CARD_TYPE, IS_CARD_COMMERCIAL | "
            "USER: FIRST_NAME, LAST_NAME, PHONE_NUMBER, DATE_OF_BIRTH, EMAIL_FIRST_SEEN | "
            "FRAUD_HISTORY: DISPUTES, FRAUD_ALERTS, COUNT_DISPUTES, LAST_DISPUTE_REASON. "
            "For comprehensive investigations, SELECT all relevant evidence fields. "
            "Use LIMIT clause for large result sets. NEVER use: GMV, SMART_ID, IS_PROXY."
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
        "Queries comprehensive Snowflake fraud detection data warehouse with 333+ columns of "
        "evidence including: DEVICE ANALYSIS (USER_AGENT, DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION, "
        "PARSED_USER_AGENT), USER IDENTITY (UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER), "
        "RISK ANALYSIS (MODEL_SCORE, IS_FRAUD_TX, MAXMIND_RISK_SCORE, TRIGGERED_RULES), "
        "PAYMENT ANALYSIS (BIN, LAST_FOUR, CARD_ISSUER, CARD_TYPE, IS_CARD_COMMERCIAL), "
        "NETWORK ANALYSIS (IP, IP_COUNTRY_CODE, ASN, ISP, MAXMIND_IP_RISK_SCORE), "
        "FRAUD HISTORY (DISPUTES, FRAUD_ALERTS, LAST_DISPUTE_REASON). "
        f"Main table: TRANSACTIONS_ENRICHED. Core fields: {TX_ID_KEY}, {EMAIL}, {MODEL_SCORE}, "
        f"{PAYMENT_METHOD}, {CARD_BRAND}, {IP}, {IP_COUNTRY_CODE}, {DEVICE_ID}, "
        f"{PAID_AMOUNT_VALUE_IN_CURRENCY}, {NSURE_LAST_DECISION}. "
        "NEVER use: GMV, SMART_ID, IS_PROXY, GEO_IP_*. Supports comprehensive fraud investigations "
        "with complete evidence collection, device fingerprinting, user profiling, and risk assessment."
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
    
    def build_comprehensive_investigation_query(
        self,
        entity_type: str,
        entity_id: str,
        date_range_days: int = 7,
        include_priority_only: bool = False
    ) -> str:
        """
        Build a comprehensive investigation query with all available evidence fields.

        Args:
            entity_type: Type of entity (IP, EMAIL, DEVICE_ID, etc.)
            entity_id: The entity identifier to search for
            date_range_days: Number of days to look back
            include_priority_only: If True, use only priority fields for performance

        Returns:
            SQL query string with comprehensive field selection
        """
        # Select field set based on performance requirements
        if include_priority_only:
            columns_to_use = PRIORITY_EVIDENCE_FIELDS
            logger.info(f"🎯 Using priority evidence fields ({len(PRIORITY_EVIDENCE_FIELDS)} columns)")
        else:
            columns_to_use = REAL_COLUMNS
            logger.info(f"📊 Using comprehensive evidence fields ({len(REAL_COLUMNS)} columns)")

        # Build safe column selection
        safe_columns = build_safe_select_columns(columns_to_use)

        # Build WHERE clause based on entity type
        where_clause = self._build_entity_where_clause(entity_type, entity_id)

        # Build date filter
        date_filter = f"TX_DATETIME >= DATEADD(day, -{date_range_days}, CURRENT_TIMESTAMP())"

        query = f"""
        SELECT {safe_columns}
        FROM {get_full_table_name()}
        WHERE {where_clause}
          AND {date_filter}
        ORDER BY TX_DATETIME DESC
        LIMIT 1000
        """

        logger.debug(f"📝 Built comprehensive query for {entity_type}={entity_id}")
        logger.debug(f"   Date range: {date_range_days} days")
        logger.debug(f"   Field count: {len(columns_to_use)}")

        return query.strip()

    def get_optimized_investigation_query(
        self,
        entity_type: str,
        entity_id: str,
        investigation_focus: str = "comprehensive",
        date_range_days: int = 7
    ) -> Dict[str, Any]:
        """
        Get an optimized investigation query using the query builder.

        Args:
            entity_type: Type of entity to investigate
            entity_id: Entity identifier
            investigation_focus: Investigation focus (minimal, core_fraud, comprehensive, etc.)
            date_range_days: Number of days to look back

        Returns:
            Dictionary with query, metadata, and validation info
        """
        query_info = SnowflakeQueryBuilder.build_investigation_query(
            entity_type=entity_type,
            entity_id=entity_id,
            investigation_focus=investigation_focus,
            date_range_days=date_range_days
        )

        logger.info(f"🎨 Generated optimized {investigation_focus} query for {entity_type}={entity_id}")
        logger.info(f"   Evidence coverage: {query_info['validation']['evidence_coverage_score']}")
        logger.info(f"   Performance tier: {query_info['metadata']['performance_estimate']['performance_tier']}")

        return query_info

    def _build_entity_where_clause(self, entity_type: str, entity_id: str) -> str:
        """
        Build WHERE clause for different entity types.

        Args:
            entity_type: Type of entity to search for
            entity_id: The entity identifier

        Returns:
            WHERE clause string
        """
        entity_type_upper = entity_type.upper()

        if entity_type_upper == "IP":
            return f"{IP} = '{entity_id}'"
        elif entity_type_upper == "EMAIL":
            return f"({EMAIL} = '{entity_id}' OR {EMAIL} LIKE '%{entity_id}%')"
        elif entity_type_upper == "DEVICE_ID":
            return f"{DEVICE_ID} = '{entity_id}'"
        elif entity_type_upper == "USER_ID" or entity_type_upper == "UNIQUE_USER_ID":
            return f"{UNIQUE_USER_ID} = '{entity_id}'"
        elif entity_type_upper == "PHONE":
            return f"{PHONE_NUMBER} = '{entity_id}'"
        elif entity_type_upper == "CARD" or entity_type_upper == "BIN":
            return f"({BIN} = '{entity_id}' OR {LAST_FOUR} = '{entity_id[-4:]}' OR {CARD_ISSUER} LIKE '%{entity_id}%')"
        else:
            # Fallback: search across multiple key fields
            logger.warning(f"⚠️ Unknown entity type '{entity_type}', using multi-field search")
            return f"("\
                   f"{IP} = '{entity_id}' OR "\
                   f"{EMAIL} = '{entity_id}' OR "\
                   f"{DEVICE_ID} = '{entity_id}' OR "\
                   f"{UNIQUE_USER_ID} = '{entity_id}' OR "\
                   f"{PHONE_NUMBER} = '{entity_id}'"\
                   f")"

    def validate_query_fields(self, query: str) -> Dict[str, Any]:
        """
        Validate that query includes critical evidence fields.

        Args:
            query: SQL query to validate

        Returns:
            Validation result with missing fields and recommendations
        """
        import re

        # Extract SELECT columns from query
        select_match = re.search(r'SELECT\s+(.+?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
        if not select_match:
            return {
                "valid": False,
                "error": "Could not parse SELECT clause",
                "missing_critical_fields": [],
                "recommendations": ["Use proper SELECT ... FROM syntax"]
            }

        select_clause = select_match.group(1)

        # Define critical fields that should always be included
        critical_fields = [
            TX_ID_KEY, MODEL_SCORE, IS_FRAUD_TX, DEVICE_ID,
            USER_AGENT, IP, IP_COUNTRY_CODE, MAXMIND_RISK_SCORE
        ]

        missing_fields = []
        for field in critical_fields:
            if field not in select_clause:
                missing_fields.append(field)

        recommendations = []
        if missing_fields:
            recommendations.append(f"Add missing critical fields: {', '.join(missing_fields)}")

        # Check for evidence completeness
        device_fields = [DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL]
        device_coverage = sum(1 for field in device_fields if field in select_clause)
        if device_coverage < 2:
            recommendations.append("Include more device analysis fields for better device fingerprinting")

        risk_fields = [MODEL_SCORE, IS_FRAUD_TX, MAXMIND_RISK_SCORE]
        risk_coverage = sum(1 for field in risk_fields if field in select_clause)
        if risk_coverage < 2:
            recommendations.append("Include more risk analysis fields for comprehensive fraud assessment")

        return {
            "valid": len(missing_fields) == 0,
            "missing_critical_fields": missing_fields,
            "device_field_coverage": f"{device_coverage}/{len(device_fields)}",
            "risk_field_coverage": f"{risk_coverage}/{len(risk_fields)}",
            "recommendations": recommendations,
            "total_evidence_score": max(0.0, 1.0 - (len(missing_fields) / len(critical_fields)))
        }

    def _correct_column_names(self, query: str) -> str:
        """Auto-correct common column name mistakes in queries."""
        corrections = {
            # Common mistakes -> Correct column names
            'SMART_ID': 'DEVICE_ID',
            'IS_PROXY': 'NULL AS IS_PROXY',  # Column doesn't exist
            'GMV': PAID_AMOUNT_VALUE_IN_CURRENCY,
            'GEO_IP_COUNTRY': IP_COUNTRY_CODE,
            'GEO_IP_CITY': 'NULL AS IP_CITY',  # Column doesn't exist
            'GEO_IP_REGION': 'IP_REGION',
            'TRIGGERED_RULES': 'NULL AS TRIGGERED_RULES',  # Column doesn't exist
            'PROXY_RISK_SCORE': 'NULL AS PROXY_RISK_SCORE',  # Column doesn't exist
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
        
        # Fix missing commas between column names and FROM keyword
        # Pattern matches: COLUMN_NAMEFROM -> COLUMN_NAME,\nFROM
        corrected_query = re.sub(r'([A-Z_]+)(FROM\s+)', r'\1,\n    \2', corrected_query, flags=re.IGNORECASE)

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
                
                # Validate query for evidence completeness
                query_validation = self.validate_query_fields(corrected_query)

                # Create comprehensive result object
                result_object = {
                    "results": json_safe_results,
                    "row_count": len(results),
                    "columns": columns,
                    "database": database,
                    "schema": db_schema,
                    "table": "TRANSACTIONS_ENRICHED",
                    "query_insights": query_insights,
                    "query_validation": query_validation,
                    "evidence_completeness": {
                        "total_available_fields": len(REAL_COLUMNS),
                        "fields_retrieved": len(columns),
                        "coverage_percentage": round((len(columns) / len(REAL_COLUMNS)) * 100, 1),
                        "critical_fields_included": len([c for c in columns if c in [TX_ID_KEY, MODEL_SCORE, IS_FRAUD_TX, DEVICE_ID, USER_AGENT, IP]])
                    },
                    "query_status": "success",
                    "execution_timestamp": datetime.now().isoformat(),
                    "execution_duration_ms": execution_duration_ms,
                    "schema_info": {
                        "available_evidence_fields": len(REAL_COLUMNS),
                        "priority_fields": len(PRIORITY_EVIDENCE_FIELDS),
                        "field_categories": {
                            "core_transaction": len([f for f in columns if f in [TX_ID_KEY, EMAIL, PAID_AMOUNT_VALUE_IN_CURRENCY]]),
                            "risk_analysis": len([f for f in columns if f in [MODEL_SCORE, IS_FRAUD_TX, MAXMIND_RISK_SCORE]]),
                            "device_analysis": len([f for f in columns if f in [DEVICE_ID, USER_AGENT, DEVICE_TYPE]]),
                            "network_analysis": len([f for f in columns if f in [IP, IP_COUNTRY_CODE]])
                        },
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