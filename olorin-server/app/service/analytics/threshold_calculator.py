"""
Dynamic Risk Threshold Calculator.

Calculates adaptive thresholds based on real data distribution from Snowflake:
- Percentile-based thresholds (P90 for high, P70 for medium)
- Entity-type specific thresholds
- Time-window adaptive thresholds (7-day lookback)
- Merchant-category specific thresholds
- 1-hour cache for performance

Week 4 Phase 2 implementation.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

# Cache configuration
THRESHOLD_CACHE_TTL_SECONDS = 3600  # 1 hour cache
_threshold_cache: Dict[str, Tuple[float, float]] = {}  # {cache_key: (threshold_value, expiry_time)}

# Default thresholds (fallback if Snowflake query fails)
DEFAULT_HIGH_THRESHOLD = 0.75
DEFAULT_MEDIUM_THRESHOLD = 0.50
DEFAULT_LOW_THRESHOLD = 0.25
DEFAULT_DEVICE_THRESHOLD = 4
DEFAULT_CARD_THRESHOLD = 3
DEFAULT_VELOCITY_THRESHOLD = 25

# Percentile targets
HIGH_RISK_PERCENTILE = 0.90  # Top 10% are high risk
MEDIUM_RISK_PERCENTILE = 0.70  # Top 30% are medium risk
DEVICE_PERCENTILE = 0.95  # 95th percentile for device count
CARD_PERCENTILE = 0.95  # 95th percentile for card count
VELOCITY_PERCENTILE = 0.99  # 99th percentile for velocity


def get_dynamic_risk_threshold(
    level: str,
    entity_type: Optional[str] = None,
    merchant_category: Optional[str] = None,
    lookback_days: int = 7
) -> float:
    """
    Calculate dynamic risk threshold based on data distribution.

    Args:
        level: Threshold level ('high', 'medium', or 'low')
        entity_type: Optional entity type for type-specific thresholds
        merchant_category: Optional merchant category for category-specific thresholds
        lookback_days: Number of days to look back for data (default: 7)

    Returns:
        Dynamic threshold value (0.0-1.0)
    """
    try:
        # Build cache key
        cache_key = f"risk_threshold_{level}_{entity_type}_{merchant_category}_{lookback_days}"

        # Check cache
        cached_value = _get_from_cache(cache_key)
        if cached_value is not None:
            logger.debug(f"📊 Using cached threshold for {level}/{entity_type}: {cached_value:.3f}")
            return cached_value

        # Query Snowflake for percentile-based threshold
        threshold = _query_risk_threshold_from_snowflake(
            level=level,
            entity_type=entity_type,
            merchant_category=merchant_category,
            lookback_days=lookback_days
        )

        # Cache the result
        _set_in_cache(cache_key, threshold)

        logger.info(
            f"📊 Calculated dynamic {level} threshold "
            f"(entity: {entity_type or 'all'}, merchant: {merchant_category or 'all'}): {threshold:.3f}"
        )

        return threshold

    except Exception as e:
        logger.warning(f"⚠️ Failed to calculate dynamic threshold for {level}: {e}")
        # Fallback to defaults
        return _get_default_threshold(level)


def get_dynamic_device_threshold(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """
    Calculate dynamic device count threshold.

    Args:
        entity_type: Optional entity type for type-specific thresholds
        lookback_days: Number of days to look back for data

    Returns:
        Device count threshold
    """
    try:
        cache_key = f"device_threshold_{entity_type}_{lookback_days}"

        cached_value = _get_from_cache(cache_key)
        if cached_value is not None:
            return int(cached_value)

        threshold = _query_device_threshold_from_snowflake(
            entity_type=entity_type,
            lookback_days=lookback_days
        )

        _set_in_cache(cache_key, threshold)

        logger.info(f"📊 Calculated dynamic device threshold (entity: {entity_type or 'all'}): {threshold}")

        return threshold

    except Exception as e:
        logger.warning(f"⚠️ Failed to calculate device threshold: {e}")
        return DEFAULT_DEVICE_THRESHOLD


def get_dynamic_card_threshold(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """
    Calculate dynamic card count threshold.

    Args:
        entity_type: Optional entity type for type-specific thresholds
        lookback_days: Number of days to look back for data

    Returns:
        Card count threshold
    """
    try:
        cache_key = f"card_threshold_{entity_type}_{lookback_days}"

        cached_value = _get_from_cache(cache_key)
        if cached_value is not None:
            return int(cached_value)

        threshold = _query_card_threshold_from_snowflake(
            entity_type=entity_type,
            lookback_days=lookback_days
        )

        _set_in_cache(cache_key, threshold)

        logger.info(f"📊 Calculated dynamic card threshold (entity: {entity_type or 'all'}): {threshold}")

        return threshold

    except Exception as e:
        logger.warning(f"⚠️ Failed to calculate card threshold: {e}")
        return DEFAULT_CARD_THRESHOLD


def get_dynamic_velocity_threshold(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """
    Calculate dynamic velocity threshold.

    Args:
        entity_type: Optional entity type for type-specific thresholds
        lookback_days: Number of days to look back for data

    Returns:
        Velocity threshold (transactions per time window)
    """
    try:
        cache_key = f"velocity_threshold_{entity_type}_{lookback_days}"

        cached_value = _get_from_cache(cache_key)
        if cached_value is not None:
            return int(cached_value)

        threshold = _query_velocity_threshold_from_snowflake(
            entity_type=entity_type,
            lookback_days=lookback_days
        )

        _set_in_cache(cache_key, threshold)

        logger.info(f"📊 Calculated dynamic velocity threshold (entity: {entity_type or 'all'}): {threshold}")

        return threshold

    except Exception as e:
        logger.warning(f"⚠️ Failed to calculate velocity threshold: {e}")
        return DEFAULT_VELOCITY_THRESHOLD


def _query_risk_threshold_from_snowflake(
    level: str,
    entity_type: Optional[str] = None,
    merchant_category: Optional[str] = None,
    lookback_days: int = 7
) -> float:
    """
    Query Snowflake for percentile-based risk threshold.

    SQL Query calculates PERCENTILE_CONT for MODEL_SCORE distribution.
    """
    try:
        from app.service.snowflake_service import get_snowflake_connection

        # Determine percentile target
        if level == "high":
            percentile = HIGH_RISK_PERCENTILE
        elif level == "medium":
            percentile = MEDIUM_RISK_PERCENTILE
        else:
            percentile = 0.50  # Median for low

        # Build entity type filter
        entity_filter = ""
        if entity_type:
            entity_filter = f"AND ENTITY_TYPE = '{entity_type}'"

        # Build merchant category filter
        merchant_filter = ""
        if merchant_category:
            merchant_filter = f"AND MERCHANT_CATEGORY = '{merchant_category}'"

        # Calculate lookback date
        lookback_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

        # SQL query for percentile calculation
        query = f"""
        SELECT
            PERCENTILE_CONT({percentile}) WITHIN GROUP (ORDER BY MODEL_SCORE) as threshold_value
        FROM DBT.DBT_PROD.TXS
        WHERE TX_DATETIME >= '{lookback_date}'
          AND MODEL_SCORE IS NOT NULL
          AND MODEL_SCORE BETWEEN 0 AND 1
          {entity_filter}
          {merchant_filter}
        """

        conn = get_snowflake_connection()
        cursor = conn.cursor()

        logger.debug(f"📊 Querying Snowflake for {level} threshold (percentile: {percentile})")

        cursor.execute(query)
        result = cursor.fetchone()

        if result and result[0] is not None:
            threshold = float(result[0])
            logger.debug(f"📊 Snowflake returned {level} threshold: {threshold:.3f}")
            return threshold
        else:
            logger.warning(f"⚠️ Snowflake returned no data for {level} threshold, using default")
            return _get_default_threshold(level)

    except Exception as e:
        logger.warning(f"⚠️ Snowflake query failed for {level} threshold: {e}")
        return _get_default_threshold(level)


def _query_device_threshold_from_snowflake(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """Query Snowflake for device count percentile."""
    try:
        from app.service.snowflake_service import get_snowflake_connection

        entity_filter = f"AND ENTITY_TYPE = '{entity_type}'" if entity_type else ""
        lookback_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

        query = f"""
        SELECT
            PERCENTILE_CONT({DEVICE_PERCENTILE}) WITHIN GROUP (ORDER BY device_count) as threshold_value
        FROM (
            SELECT
                EMAIL_ADDRESS,
                COUNT(DISTINCT DEVICE_ID) as device_count
            FROM DBT.DBT_PROD.TXS
            WHERE TX_DATETIME >= '{lookback_date}'
              AND EMAIL_ADDRESS IS NOT NULL
              {entity_filter}
            GROUP BY EMAIL_ADDRESS
        )
        """

        conn = get_snowflake_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()

        if result and result[0] is not None:
            threshold = max(1, int(round(float(result[0]))))
            return threshold
        else:
            return DEFAULT_DEVICE_THRESHOLD

    except Exception as e:
        logger.warning(f"⚠️ Snowflake query failed for device threshold: {e}")
        return DEFAULT_DEVICE_THRESHOLD


def _query_card_threshold_from_snowflake(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """Query Snowflake for card count percentile."""
    try:
        from app.service.snowflake_service import get_snowflake_connection

        entity_filter = f"AND ENTITY_TYPE = '{entity_type}'" if entity_type else ""
        lookback_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

        query = f"""
        SELECT
            PERCENTILE_CONT({CARD_PERCENTILE}) WITHIN GROUP (ORDER BY card_count) as threshold_value
        FROM (
            SELECT
                EMAIL_ADDRESS,
                COUNT(DISTINCT CONCAT(CARD_BIN, CARD_LAST4)) as card_count
            FROM DBT.DBT_PROD.TXS
            WHERE TX_DATETIME >= '{lookback_date}'
              AND EMAIL_ADDRESS IS NOT NULL
              AND CARD_BIN IS NOT NULL
              {entity_filter}
            GROUP BY EMAIL_ADDRESS
        )
        """

        conn = get_snowflake_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()

        if result and result[0] is not None:
            threshold = max(1, int(round(float(result[0]))))
            return threshold
        else:
            return DEFAULT_CARD_THRESHOLD

    except Exception as e:
        logger.warning(f"⚠️ Snowflake query failed for card threshold: {e}")
        return DEFAULT_CARD_THRESHOLD


def _query_velocity_threshold_from_snowflake(
    entity_type: Optional[str] = None,
    lookback_days: int = 7
) -> int:
    """Query Snowflake for velocity percentile."""
    try:
        from app.service.snowflake_service import get_snowflake_connection

        entity_filter = f"AND ENTITY_TYPE = '{entity_type}'" if entity_type else ""
        lookback_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

        query = f"""
        SELECT
            PERCENTILE_CONT({VELOCITY_PERCENTILE}) WITHIN GROUP (ORDER BY tx_count_24h) as threshold_value
        FROM (
            SELECT
                EMAIL_ADDRESS,
                DATE_TRUNC('DAY', TX_DATETIME) as tx_day,
                COUNT(*) as tx_count_24h
            FROM DBT.DBT_PROD.TXS
            WHERE TX_DATETIME >= '{lookback_date}'
              AND EMAIL_ADDRESS IS NOT NULL
              {entity_filter}
            GROUP BY EMAIL_ADDRESS, tx_day
        )
        """

        conn = get_snowflake_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()

        if result and result[0] is not None:
            threshold = max(1, int(round(float(result[0]))))
            return threshold
        else:
            return DEFAULT_VELOCITY_THRESHOLD

    except Exception as e:
        logger.warning(f"⚠️ Snowflake query failed for velocity threshold: {e}")
        return DEFAULT_VELOCITY_THRESHOLD


def _get_from_cache(cache_key: str) -> Optional[float]:
    """Get value from cache if not expired."""
    if cache_key in _threshold_cache:
        threshold_value, expiry_time = _threshold_cache[cache_key]
        if time.time() < expiry_time:
            return threshold_value
        else:
            # Expired, remove from cache
            del _threshold_cache[cache_key]
    return None


def _set_in_cache(cache_key: str, value: float) -> None:
    """Set value in cache with expiry."""
    expiry_time = time.time() + THRESHOLD_CACHE_TTL_SECONDS
    _threshold_cache[cache_key] = (value, expiry_time)


def _get_default_threshold(level: str) -> float:
    """Get default threshold for fallback."""
    if level == "high":
        return DEFAULT_HIGH_THRESHOLD
    elif level == "medium":
        return DEFAULT_MEDIUM_THRESHOLD
    else:
        return DEFAULT_LOW_THRESHOLD


def clear_threshold_cache() -> None:
    """Clear the threshold cache (useful for testing or forced refresh)."""
    global _threshold_cache
    _threshold_cache.clear()
    logger.info("📊 Threshold cache cleared")
