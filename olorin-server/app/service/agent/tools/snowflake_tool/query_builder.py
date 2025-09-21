"""
Snowflake Query Builder

Provides utilities for building comprehensive fraud investigation queries
with optimal field selection and performance considerations.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from .schema_constants import (
    TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID, PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAYMENT_METHOD, MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE,
    FIRST_NAME, LAST_NAME, PHONE_NUMBER, DEVICE_ID, USER_AGENT, DEVICE_TYPE,
    DEVICE_MODEL, DEVICE_OS_VERSION, PARSED_USER_AGENT, IP, IP_COUNTRY_CODE,
    CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, build_safe_select_columns
)

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SnowflakeQueryBuilder:
    """Builds optimized Snowflake queries for fraud investigations."""

    # Field collections for different investigation focuses
    EVIDENCE_FIELD_COLLECTIONS = {
        "minimal": [
            TX_ID_KEY, TX_DATETIME, EMAIL, MODEL_SCORE, IS_FRAUD_TX,
            DEVICE_ID, IP, PAID_AMOUNT_VALUE_IN_CURRENCY
        ],
        "core_fraud": [
            TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID, MODEL_SCORE,
            IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE,
            DEVICE_ID, USER_AGENT, IP, IP_COUNTRY_CODE,
            PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD
        ],
        "device_focus": [
            TX_ID_KEY, TX_DATETIME, DEVICE_ID, USER_AGENT, DEVICE_TYPE,
            DEVICE_MODEL, DEVICE_OS_VERSION, PARSED_USER_AGENT,
            "IS_DEVICE_ID_AUTHENTICATED", IP, MODEL_SCORE
        ],
        "user_profile": [
            TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID, FIRST_NAME,
            LAST_NAME, PHONE_NUMBER, "DATE_OF_BIRTH", "EMAIL_FIRST_SEEN",
            MODEL_SCORE, IS_FRAUD_TX
        ],
        "payment_analysis": [
            TX_ID_KEY, TX_DATETIME, PAYMENT_METHOD, CARD_BRAND, BIN,
            LAST_FOUR, CARD_ISSUER, "CARD_TYPE", "IS_CARD_COMMERCIAL",
            "IS_CARD_PREPAID", MODEL_SCORE
        ],
        "comprehensive": [
            # Core fields
            TX_ID_KEY, TX_DATETIME, EMAIL, UNIQUE_USER_ID,
            PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD,
            # Risk analysis
            MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE,
            "TRIGGERED_RULES", "COUNT_TRIGGERED_RULES",
            # User identity
            FIRST_NAME, LAST_NAME, PHONE_NUMBER,
            # Device analysis
            DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL,
            DEVICE_OS_VERSION, PARSED_USER_AGENT,
            # Network analysis
            IP, IP_COUNTRY_CODE, "ASN", "ISP", "MAXMIND_IP_RISK_SCORE",
            # Payment analysis
            CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, "CARD_TYPE",
            # Fraud history
            "DISPUTES", "COUNT_DISPUTES", "FRAUD_ALERTS", "COUNT_FRAUD_ALERTS"
        ]
    }

    @classmethod
    def build_investigation_query(
        cls,
        entity_type: str,
        entity_id: str,
        investigation_focus: str = "comprehensive",
        date_range_days: int = 7,
        limit: int = 1000,
        additional_filters: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Build an optimized investigation query with comprehensive evidence collection.

        Args:
            entity_type: Type of entity (IP, EMAIL, DEVICE_ID, etc.)
            entity_id: The entity identifier to search for
            investigation_focus: Focus area for field selection
            date_range_days: Number of days to look back
            limit: Maximum records to return
            additional_filters: Additional WHERE conditions

        Returns:
            Dictionary with query, metadata, and optimization info
        """
        # Get field collection based on focus
        if investigation_focus not in cls.EVIDENCE_FIELD_COLLECTIONS:
            logger.warning(f"Unknown investigation focus '{investigation_focus}', using comprehensive")
            investigation_focus = "comprehensive"

        field_collection = cls.EVIDENCE_FIELD_COLLECTIONS[investigation_focus]

        # Build safe column selection
        safe_columns = build_safe_select_columns(field_collection)

        # Build entity-specific WHERE clause
        where_clause = cls._build_entity_where_clause(entity_type, entity_id)

        # Build date filter
        date_filter = f"TX_DATETIME >= DATEADD(day, -{date_range_days}, CURRENT_TIMESTAMP())"

        # Combine filters
        filters = [where_clause, date_filter]
        if additional_filters:
            filters.extend(additional_filters)

        combined_filters = " AND ".join(f"({f})" for f in filters)

        # Build final query
        query = f"""
        SELECT {safe_columns}
        FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
        WHERE {combined_filters}
        ORDER BY TX_DATETIME DESC
        LIMIT {limit}
        """.strip()

        # Generate query metadata
        metadata = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "investigation_focus": investigation_focus,
            "field_count": len(field_collection),
            "date_range_days": date_range_days,
            "limit": limit,
            "generated_at": datetime.now().isoformat(),
            "query_complexity": cls._assess_query_complexity(field_collection, date_range_days),
            "evidence_categories": cls._categorize_fields(field_collection),
            "performance_estimate": cls._estimate_performance(field_collection, date_range_days, limit)
        }

        logger.info(f"🔍 Built {investigation_focus} investigation query for {entity_type}={entity_id}")
        logger.info(f"   Fields: {len(field_collection)}, Date range: {date_range_days} days")

        return {
            "query": query,
            "metadata": metadata,
            "field_collection": field_collection,
            "validation": cls._validate_query_completeness(field_collection)
        }

    @classmethod
    def _build_entity_where_clause(cls, entity_type: str, entity_id: str) -> str:
        """Build WHERE clause for different entity types."""
        entity_type_upper = entity_type.upper()

        entity_clauses = {
            "IP": f"{IP} = '{entity_id}'",
            "EMAIL": f"({EMAIL} = '{entity_id}' OR {EMAIL} LIKE '%{entity_id}%')",
            "DEVICE_ID": f"{DEVICE_ID} = '{entity_id}'",
            "USER_ID": f"{UNIQUE_USER_ID} = '{entity_id}'",
            "UNIQUE_USER_ID": f"{UNIQUE_USER_ID} = '{entity_id}'",
            "PHONE": f"{PHONE_NUMBER} = '{entity_id}'",
            "CARD": f"({BIN} LIKE '{entity_id}%' OR {LAST_FOUR} = '{entity_id[-4:]}' OR {CARD_ISSUER} LIKE '%{entity_id}%')",
            "BIN": f"{BIN} = '{entity_id}'"
        }

        if entity_type_upper in entity_clauses:
            return entity_clauses[entity_type_upper]
        else:
            # Multi-field fallback search
            logger.warning(f"⚠️ Unknown entity type '{entity_type}', using multi-field search")
            return f"({IP} = '{entity_id}' OR {EMAIL} = '{entity_id}' OR {DEVICE_ID} = '{entity_id}' OR {UNIQUE_USER_ID} = '{entity_id}')"

    @classmethod
    def _assess_query_complexity(cls, field_collection: List[str], date_range_days: int) -> str:
        """Assess query complexity for performance estimation."""
        complexity_score = len(field_collection) + (date_range_days / 7)

        if complexity_score < 10:
            return "low"
        elif complexity_score < 30:
            return "medium"
        else:
            return "high"

    @classmethod
    def _categorize_fields(cls, field_collection: List[str]) -> Dict[str, int]:
        """Categorize fields by evidence type."""
        categories = {
            "core_transaction": [TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE_IN_CURRENCY, PAYMENT_METHOD],
            "risk_analysis": [MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, MAXMIND_RISK_SCORE],
            "user_identity": [EMAIL, UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER],
            "device_analysis": [DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION],
            "network_analysis": [IP, IP_COUNTRY_CODE],
            "payment_analysis": [CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER]
        }

        category_counts = {}
        for category, category_fields in categories.items():
            count = sum(1 for field in field_collection if field in category_fields)
            category_counts[category] = count

        return category_counts

    @classmethod
    def _estimate_performance(cls, field_collection: List[str], date_range_days: int, limit: int) -> Dict[str, Any]:
        """Estimate query performance characteristics."""
        # Base estimates (would be calibrated with actual performance data)
        base_time_ms = 500
        field_overhead_ms = len(field_collection) * 10
        date_range_overhead_ms = date_range_days * 50
        limit_factor = min(1.0, limit / 1000)

        estimated_time_ms = int((base_time_ms + field_overhead_ms + date_range_overhead_ms) * limit_factor)

        return {
            "estimated_execution_time_ms": estimated_time_ms,
            "estimated_data_volume": f"{date_range_days * 1000} potential records",
            "performance_tier": "fast" if estimated_time_ms < 2000 else "moderate" if estimated_time_ms < 5000 else "slow",
            "optimization_suggestions": cls._get_optimization_suggestions(field_collection, date_range_days, limit)
        }

    @classmethod
    def _get_optimization_suggestions(cls, field_collection: List[str], date_range_days: int, limit: int) -> List[str]:
        """Generate optimization suggestions."""
        suggestions = []

        if len(field_collection) > 30:
            suggestions.append("Consider using 'core_fraud' focus for faster queries")

        if date_range_days > 14:
            suggestions.append("Consider reducing date range for better performance")

        if limit > 5000:
            suggestions.append("Large limit may impact performance, consider pagination")

        if not suggestions:
            suggestions.append("Query is well-optimized for current parameters")

        return suggestions

    @classmethod
    def _validate_query_completeness(cls, field_collection: List[str]) -> Dict[str, Any]:
        """Validate that query includes critical evidence fields."""
        critical_fields = [TX_ID_KEY, MODEL_SCORE, DEVICE_ID, IP]
        missing_critical = [f for f in critical_fields if f not in field_collection]

        evidence_coverage = cls._categorize_fields(field_collection)
        coverage_score = sum(min(count, 3) for count in evidence_coverage.values()) / (len(evidence_coverage) * 3)

        return {
            "is_comprehensive": len(missing_critical) == 0 and coverage_score > 0.6,
            "missing_critical_fields": missing_critical,
            "evidence_coverage_score": round(coverage_score, 2),
            "coverage_by_category": evidence_coverage,
            "recommendations": cls._get_completeness_recommendations(missing_critical, evidence_coverage)
        }

    @classmethod
    def _get_completeness_recommendations(cls, missing_critical: List[str], evidence_coverage: Dict[str, int]) -> List[str]:
        """Generate recommendations for improving query completeness."""
        recommendations = []

        if missing_critical:
            recommendations.append(f"Add critical fields: {', '.join(missing_critical)}")

        for category, count in evidence_coverage.items():
            if count == 0:
                recommendations.append(f"Consider adding {category} fields for comprehensive analysis")

        if not recommendations:
            recommendations.append("Query has comprehensive evidence coverage")

        return recommendations


def get_recommended_query_for_entity(entity_type: str, entity_id: str, **kwargs) -> str:
    """
    Convenience function to get a recommended query for entity investigation.

    Args:
        entity_type: Type of entity to investigate
        entity_id: Entity identifier
        **kwargs: Additional parameters for query building

    Returns:
        Optimized SQL query string
    """
    query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type=entity_type,
        entity_id=entity_id,
        **kwargs
    )

    logger.info(f"📋 Generated {query_info['metadata']['investigation_focus']} query")
    logger.info(f"   Evidence score: {query_info['validation']['evidence_coverage_score']}")

    return query_info["query"]