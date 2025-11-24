"""
Entity Extractor Tool for Entity Mining

Extracts candidate entities (devices, cards, users, IPs, ASNs, issuers) from top segments.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import BaseTool
from datetime import datetime

import os
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool.database_tool import DatabaseQueryTool

logger = get_bridge_logger(__name__)


class _EntityExtractorArgs(BaseModel):
    """Arguments for entity_extractor tool."""
    
    dimension: str = Field(..., description="Dimension name (e.g., reason_code, issuer, asn)")
    dimension_value: str = Field(..., description="Specific dimension value to extract entities from")
    cohort_filters: Dict[str, Any] = Field(
        ...,
        description="Cohort filters (merchant_id, channel, geo, etc.)"
    )
    window_start: str = Field(..., description="Anomaly window start (ISO format)")
    window_end: str = Field(..., description="Anomaly window end (ISO format)")
    entity_types: List[str] = Field(
        default_factory=lambda: ['device_id', 'ip', 'email', 'user_id', 'card_bin'],
        description="Types of entities to extract (default: device_id, ip, email, user_id, card_bin)"
    )
    limit_per_type: int = Field(
        50,
        ge=1,
        le=100,
        description="Maximum entities to extract per type (default: 50, max: 100)"
    )


class EntityExtractorTool(BaseTool):
    """
    Tool for extracting candidate entities from high-impact segments.
    
    Samples atomic IDs (cards, users, devices, IPs, merchants, ASNs) from
    segments that contributed significantly to the anomaly.
    """
    
    name: str = "entity_extractor"
    description: str = (
        "Extract candidate entities (devices, cards, users, IPs, ASNs, issuers) "
        "from a specific dimension segment that contributed to an anomaly. "
        "Use this after SegmentHunter identifies top segments to find the actual "
        "entities (user IDs, device IDs, IPs, etc.) that drove the deviation."
    )
    args_schema: type[BaseModel] = _EntityExtractorArgs
    
    def _build_entity_extraction_query(
        self,
        dimension: str,
        dimension_value: str,
        cohort_filters: Dict[str, Any],
        window_start: str,
        window_end: str,
        entity_types: List[str],
        limit_per_type: int
    ) -> str:
        """Build Snowflake query to extract entities from a segment."""
        
        # Detect database provider
        database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
        use_snowflake = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
        is_snowflake = database_provider == 'snowflake' or (use_snowflake and database_provider != 'postgresql')
        
        # Map dimension names to column names (updated for DBT.DBT_PROD.TXS schema)
        if is_snowflake:
            dimension_mapping = {
                'reason_code': 'FAILURE_REASON',  # TXS column: FAILURE_REASON
                'issuer': 'CARD_ISSUER',  # TXS column: CARD_ISSUER
                'bin': 'BIN',  # TXS column: BIN
                'payment_method': 'PAYMENT_METHOD',  # TXS column: PAYMENT_METHOD
                'device_fp': 'DEVICE_ID',  # TXS column: DEVICE_ID
                'ip_prefix': 'IP',  # TXS column: IP
                'asn': 'ASN',  # TXS column: ASN
                'email_domain': 'EMAIL',  # TXS column: EMAIL
                'country': 'IP_COUNTRY_CODE',  # TXS column: IP_COUNTRY_CODE
                # 'gateway': 'GATEWAY',  # REMOVED: No GATEWAY column in TXS schema
                'processor': 'PROCESSOR',  # TXS column: PROCESSOR
                'product_id': 'PRODUCT',  # TXS column: PRODUCT
                # 'terminal_id': 'TERMINAL_ID',  # REMOVED: No TERMINAL_ID column in TXS schema
            }
            dimension_col = dimension_mapping.get(dimension.lower(), dimension.upper())
        else:
            # PostgreSQL mappings
            dimension_mapping = {
                'reason_code': 'failure_reason',
                'issuer': 'card_issuer',
                'bin': 'bin',
                'payment_method': 'payment_method',
                'device_fp': 'device_id',
                'ip_prefix': 'ip',
                'asn': 'asn',
                'email_domain': 'email',
                'country': 'ip_country_code',
                'processor': 'processor',
            }
            dimension_col = dimension_mapping.get(dimension.lower(), dimension.lower())
        
        # Get table name based on database provider using get_full_table_name()
        from app.service.agent.tools.database_tool.database_factory import get_database_provider
        db_provider_instance = get_database_provider()
        table_name = db_provider_instance.get_full_table_name()
        datetime_col = 'TX_DATETIME' if is_snowflake else 'tx_datetime'
        
        # Build cohort filter conditions
        cohort_conditions = []
        for key, value in cohort_filters.items():
            if key.upper() == 'MERCHANT_ID':
                col_name = 'STORE_ID' if is_snowflake else 'store_id'  # TXS uses STORE_ID
                cohort_conditions.append(f"{col_name} = '{value}'")
            elif key.upper() == 'CHANNEL':
                col_name = 'DEVICE_TYPE' if is_snowflake else 'device_type'  # TXS uses DEVICE_TYPE
                cohort_conditions.append(f"{col_name} = '{value}'")
            elif key.upper() == 'GEO':
                col_name = 'IP_COUNTRY_CODE' if is_snowflake else 'ip_country_code'
                cohort_conditions.append(f"{col_name} = '{value}'")
            else:
                col_name = key.upper() if is_snowflake else key.lower()
                cohort_conditions.append(f"{col_name} = '{value}'")
        
        cohort_filter = " AND ".join(cohort_conditions) if cohort_conditions else "1=1"
        
        # Handle special dimension matching
        if dimension.lower() == 'ip_prefix':
            dimension_condition = f"IP LIKE '{dimension_value.replace('/24', '')}%'"
        elif dimension.lower() == 'email_domain':
            dimension_condition = f"EMAIL LIKE '%@{dimension_value}'"
        else:
            dimension_condition = f"{dimension_col} = '{dimension_value}'"
        
        # Build entity extraction queries for each entity type
        entity_queries = []
        
        if 'device_id' in entity_types:
            device_col = 'DEVICE_ID' if is_snowflake else 'device_id'
            entity_queries.append(f"""
                SELECT 'device_id' as entity_type, {device_col} as entity_value, COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{window_start}'
                  AND {datetime_col} < '{window_end}'
                  AND {cohort_filter}
                  AND {dimension_condition}
                  AND {device_col} IS NOT NULL
                GROUP BY {device_col}
                ORDER BY tx_count DESC
                LIMIT {limit_per_type}
            """)
        
        if 'ip' in entity_types:
            ip_col = 'IP' if is_snowflake else 'ip'
            entity_queries.append(f"""
                SELECT 'ip' as entity_type, {ip_col} as entity_value, COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{window_start}'
                  AND {datetime_col} < '{window_end}'
                  AND {cohort_filter}
                  AND {dimension_condition}
                  AND {ip_col} IS NOT NULL
                GROUP BY {ip_col}
                ORDER BY tx_count DESC
                LIMIT {limit_per_type}
            """)
        
        if 'email' in entity_types:
            email_col = 'EMAIL' if is_snowflake else 'email'
            entity_queries.append(f"""
                SELECT 'email' as entity_type, {email_col} as entity_value, COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{window_start}'
                  AND {datetime_col} < '{window_end}'
                  AND {cohort_filter}
                  AND {dimension_condition}
                  AND {email_col} IS NOT NULL
                GROUP BY {email_col}
                ORDER BY tx_count DESC
                LIMIT {limit_per_type}
            """)
        
        if 'user_id' in entity_types:
            user_col = 'UNIQUE_USER_ID' if is_snowflake else 'unique_user_id'
            entity_queries.append(f"""
                SELECT 'user_id' as entity_type, {user_col} as entity_value, COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{window_start}'
                  AND {datetime_col} < '{window_end}'
                  AND {cohort_filter}
                  AND {dimension_condition}
                  AND {user_col} IS NOT NULL
                GROUP BY {user_col}
                ORDER BY tx_count DESC
                LIMIT {limit_per_type}
            """)
        
        if 'card_bin' in entity_types:
            bin_col = 'BIN' if is_snowflake else 'bin'
            entity_queries.append(f"""
                SELECT 'card_bin' as entity_type, {bin_col} as entity_value, COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{window_start}'
                  AND {datetime_col} < '{window_end}'
                  AND {cohort_filter}
                  AND {dimension_condition}
                  AND {bin_col} IS NOT NULL
                GROUP BY {bin_col}
                ORDER BY tx_count DESC
                LIMIT {limit_per_type}
            """)
        
        if not entity_queries:
            return None
        
        # Combine all entity queries
        query = " UNION ALL ".join(entity_queries)
        
        return query
    
    def _run(
        self,
        dimension: str,
        dimension_value: str,
        cohort_filters: Dict[str, Any],
        window_start: str,
        window_end: str,
        entity_types: List[str] = None,
        limit_per_type: int = 50
    ) -> Dict[str, Any]:
        """Execute the entity_extractor tool."""
        try:
            if entity_types is None:
                entity_types = ['device_id', 'ip', 'email', 'user_id', 'card_bin']
            
            # Build extraction query
            query = self._build_entity_extraction_query(
                dimension=dimension,
                dimension_value=dimension_value,
                cohort_filters=cohort_filters,
                window_start=window_start,
                window_end=window_end,
                entity_types=entity_types,
                limit_per_type=limit_per_type
            )
            
            if not query:
                return {
                    'error': 'No valid entity types specified',
                    'entities': []
                }
            
            # Detect database provider FIRST - this determines which tool/provider to use
            database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
            use_snowflake = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
            is_snowflake = database_provider == "snowflake" or (use_snowflake and database_provider != "postgresql")
            
            logger.info(f"EntityExtractor: Using database provider: {database_provider} (is_snowflake={is_snowflake})")
            
            # Use correct database provider based on DATABASE_PROVIDER
            if is_snowflake:
                # Use SnowflakeProvider for Snowflake
                from app.service.agent.tools.database_tool.database_factory import get_database_provider
                db_provider = get_database_provider()
                db_provider.connect()
                
                result_data = db_provider.execute_query(query)
                
                # Convert to DatabaseQueryTool format for consistency
                result = {
                    'success': True,
                    'data': result_data if isinstance(result_data, list) else [result_data] if result_data else [],
                    'row_count': len(result_data) if isinstance(result_data, list) else 1 if result_data else 0,
                    'query': query
                }
            else:
                # Use DatabaseQueryTool for PostgreSQL
                connection_string = None
                
                # Try PostgreSQL individual environment variables first
                if database_provider == 'postgresql' or not database_provider:
                    postgres_host = os.getenv('POSTGRES_HOST') or os.getenv('DB_HOST')
                    postgres_port = os.getenv('POSTGRES_PORT') or os.getenv('DB_PORT', '5432')
                    postgres_database = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB') or os.getenv('DB_NAME')
                    postgres_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
                    postgres_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')
                    
                    if postgres_host and postgres_database and postgres_user and postgres_password:
                        # Add gssencmode=disable to avoid GSSAPI errors on local connections
                        connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                        logger.debug(f"EntityExtractor: Built PostgreSQL connection string from individual env vars")
                
                # Fallback to direct connection string environment variables
                if not connection_string:
                    connection_string = (
                        os.getenv('DATABASE_URL') or
                        os.getenv('POSTGRES_URL')
                    )
                
                if not connection_string:
                    error_msg = (
                        "No database connection string found. Set one of: "
                        "DATABASE_URL, POSTGRES_URL, "
                        "or PostgreSQL individual vars (POSTGRES_HOST, POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD)"
                    )
                    logger.error(f"EntityExtractor: {error_msg}")
                    return {
                        'error': error_msg,
                        'entities': []
                    }
                
                db_tool = DatabaseQueryTool(connection_string=connection_string)
                result = db_tool._run(query=query)
            
            if isinstance(result, dict) and 'error' in result:
                return {
                    'error': result['error'],
                    'entities': []
                }
            
            # Parse results
            entities = []
            if isinstance(result, dict) and 'results' in result:
                rows = result['results']
            elif isinstance(result, list):
                rows = result
            else:
                rows = []
            
            # Group entities by type
            entities_by_type = {}
            for row in rows:
                entity_type = row.get('entity_type')
                entity_value = row.get('entity_value')
                tx_count = row.get('tx_count', 0)
                
                if entity_type not in entities_by_type:
                    entities_by_type[entity_type] = []
                
                entities_by_type[entity_type].append({
                    'entity_value': entity_value,
                    'tx_count': tx_count
                })
            
            # Convert to list format
            for entity_type, entity_list in entities_by_type.items():
                entities.append({
                    'entity_type': entity_type,
                    'entities': entity_list,
                    'count': len(entity_list)
                })
            
            logger.info(
                f"EntityExtractor found {sum(len(e['entities']) for e in entities)} entities "
                f"from dimension {dimension}={dimension_value}"
            )
            
            return {
                'dimension': dimension,
                'dimension_value': dimension_value,
                'entities': entities,
                'total_entities': sum(len(e['entities']) for e in entities)
            }
            
        except Exception as e:
            logger.error(f"EntityExtractor tool error: {e}", exc_info=True)
            return {'error': str(e), 'entities': []}

