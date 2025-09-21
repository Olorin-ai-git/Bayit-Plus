"""
Snowflake schema constants based on actual TRANSACTIONS_ENRICHED table structure.
This ensures all queries use the correct column names.
"""

# Payment and Transaction Fields
PAID_AMOUNT_VALUE = "PAID_AMOUNT_VALUE_IN_CURRENCY"  # Correct column name
PAID_AMOUNT_CURRENCY = "PAID_AMOUNT_CURRENCY"
PROCESSING_FEE_VALUE = "PROCESSING_FEE_VALUE_IN_CURRENCY"
PROCESSING_FEE_CURRENCY = "PROCESSING_FEE_CURRENCY"

# Identity and User Fields
TX_ID_KEY = "TX_ID_KEY"
EMAIL = "EMAIL"
EMAIL_NORMALIZED = "EMAIL_NORMALIZED"
UNIQUE_USER_ID = "UNIQUE_USER_ID"
FIRST_NAME = "FIRST_NAME"
LAST_NAME = "LAST_NAME"
PHONE_NUMBER = "PHONE_NUMBER"
PHONE_COUNTRY_CODE = "PHONE_COUNTRY_CODE"

# Network and Location Fields
IP_ADDRESS = "IP"  # Correct column name (not IP_ADDRESS)
IP_COUNTRY_CODE = "IP_COUNTRY_CODE"  # Correct column name
# Note: IP_CITY is not available in the schema

# Device Fields
DEVICE_ID = "DEVICE_ID"
USER_AGENT = "USER_AGENT"
DEVICE_TYPE = "DEVICE_TYPE"
DEVICE_MODEL = "DEVICE_MODEL"
DEVICE_OS_VERSION = "DEVICE_OS_VERSION"

# Risk and Fraud Fields
MODEL_SCORE = "MODEL_SCORE"
IS_FRAUD_TX = "IS_FRAUD_TX"
NSURE_LAST_DECISION = "NSURE_LAST_DECISION"
NSURE_FIRST_DECISION = "NSURE_FIRST_DECISION"
MAXMIND_RISK_SCORE = "MAXMIND_RISK_SCORE"
MAXMIND_IP_RISK_SCORE = "MAXMIND_IP_RISK_SCORE"

# Payment Method Fields
PAYMENT_METHOD = "PAYMENT_METHOD"
CARD_BRAND = "CARD_BRAND"
CARD_TYPE = "CARD_TYPE"
CARD_ISSUER = "CARD_ISSUER"
BIN = "BIN"
LAST_FOUR = "LAST_FOUR"
BIN_COUNTRY_CODE = "BIN_COUNTRY_CODE"

# Temporal Fields
TX_DATETIME = "TX_DATETIME"
TX_RECEIVED_DATETIME = "TX_RECEIVED_DATETIME"
TX_TIMESTAMP_MS = "TX_TIMESTAMP_MS"

# Dispute and Alert Fields
DISPUTES = "DISPUTES"
COUNT_DISPUTES = "COUNT_DISPUTES"
FRAUD_ALERTS = "FRAUD_ALERTS"
COUNT_FRAUD_ALERTS = "COUNT_FRAUD_ALERTS"
LAST_DISPUTE_DATETIME = "LAST_DISPUTE_DATETIME"
LAST_FRAUD_ALERT_DATETIME = "LAST_FRAUD_ALERT_DATETIME"

# Business Fields
STORE_ID = "STORE_ID"
MERCHANT_NAME = "MERCHANT_NAME"
PARTNER_NAME = "PARTNER_NAME"
APP_ID = "APP_ID"

# Cart and Product Fields
CART = "CART"
CART_USD = "CART_USD"
GMV = "GMV"
PRODUCT_TYPE = "PRODUCT_TYPE"
IS_DIGITAL = "IS_DIGITAL"

# Geographic and ISP Fields
ISP = "ISP"
ASN = "ASN"

# NON-EXISTENT COLUMNS - These columns don't exist in the schema
# Use NULL placeholders to prevent SQL errors
IP_CITY = "NULL AS IP_CITY"  # This column doesn't exist, use NULL
FRAUD_RULES_TRIGGERED = "NULL AS FRAUD_RULES_TRIGGERED"  # This column doesn't exist, use NULL
PROXY_RISK_SCORE = "NULL AS PROXY_RISK_SCORE"  # This column doesn't exist, use NULL

# Common field mappings for backward compatibility
FIELD_MAPPINGS = {
    # Payment fields
    "PAID_AMOUNT_VALUE": PAID_AMOUNT_VALUE,
    "PAID_AMOUNT": PAID_AMOUNT_VALUE,

    # Network fields
    "IP_ADDRESS": IP_ADDRESS,
    "IP_COUNTRY": IP_COUNTRY_CODE,
    "IP": IP_ADDRESS,

    # Non-existent columns mapped to NULL
    "IP_CITY": IP_CITY,
    "FRAUD_RULES_TRIGGERED": FRAUD_RULES_TRIGGERED,
    "PROXY_RISK_SCORE": PROXY_RISK_SCORE,

    # Risk/fraud fields
    "FRAUD_SCORE": MODEL_SCORE,
    "RISK_SCORE": MODEL_SCORE,

    # Device fields
    "DEVICE": DEVICE_ID,
    "USER_DEVICE": DEVICE_ID,

    # Temporal fields
    "TRANSACTION_DATE": TX_DATETIME,
    "TRANSACTION_TIME": TX_DATETIME,
    "TX_DATE": TX_DATETIME,
}

# Columns that don't exist in the schema - use these for validation
NON_EXISTENT_COLUMNS = {
    "IP_CITY",
    "FRAUD_RULES_TRIGGERED",
    "PROXY_RISK_SCORE",
}

def get_correct_column_name(old_name: str) -> str:
    """
    Get the correct column name for a given old/incorrect name.

    Args:
        old_name: The old or potentially incorrect column name

    Returns:
        The correct column name according to the schema, or NULL AS alias for non-existent columns
    """
    return FIELD_MAPPINGS.get(old_name, old_name)

def is_column_available(column_name: str) -> bool:
    """
    Check if a column actually exists in the schema.

    Args:
        column_name: The column name to check

    Returns:
        True if column exists, False if it should be replaced with NULL
    """
    return column_name not in NON_EXISTENT_COLUMNS

def get_safe_column_reference(column_name: str) -> str:
    """
    Get a safe column reference that won't cause SQL errors.
    For non-existent columns, returns NULL AS column_name.

    Args:
        column_name: The column name to make safe

    Returns:
        Safe column reference for SQL queries
    """
    if not is_column_available(column_name):
        return f"NULL AS {column_name}"
    return get_correct_column_name(column_name)

def build_safe_select_columns(columns: list) -> str:
    """
    Build a safe SELECT clause with proper column names and NULL fallbacks.

    Args:
        columns: List of column names to include in SELECT

    Returns:
        Comma-separated string of safe column references
    """
    safe_columns = [get_safe_column_reference(col) for col in columns]
    return ", ".join(safe_columns)