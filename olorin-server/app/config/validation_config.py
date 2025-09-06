"""
Validation Configuration Constants

This module contains all configuration constants for validation operations
to ensure consistency and easy maintenance.
"""

# Entity Type Validation Constants
ENTITY_TYPE_MAX_LENGTH = 100
ENTITY_TYPE_MIN_LENGTH = 1

# General String Validation Constants
GENERAL_STRING_MAX_LENGTH = 10000

# User ID Validation Constants
USER_ID_MAX_LENGTH = 200
USER_ID_MIN_LENGTH = 1

# Device ID Validation Constants
DEVICE_ID_MAX_LENGTH = 200
DEVICE_ID_MIN_LENGTH = 1

# Investigation ID Validation Constants
INVESTIGATION_ID_MAX_LENGTH = 100
INVESTIGATION_ID_MIN_LENGTH = 1

# Comment Validation Constants
COMMENT_MAX_LENGTH = 5000
COMMENT_MIN_LENGTH = 1

# Search Query Validation Constants
SEARCH_QUERY_MAX_LENGTH = 1000
SEARCH_QUERY_MIN_LENGTH = 1

# Time Range Validation Constants
TIME_RANGE_MAX_DAYS = 365
TIME_RANGE_MAX_HOURS = 8760  # 1 year in hours
TIME_RANGE_MAX_MINUTES = 525600  # 1 year in minutes

# Security Validation Constants
MAX_VALIDATION_FAILURES_PER_MINUTE = 100  # For future rate limiting
VALIDATION_CACHE_MAX_SIZE = 1000  # For LRU cache
VALIDATION_CACHE_TTL_SECONDS = 300  # 5 minutes

# Error Message Configuration
SHOW_DETAILED_ERRORS = True  # Set to False in production
MAX_SUGGESTIONS_COUNT = 5
MAX_ERROR_MESSAGE_LENGTH = 500

# Transaction Entity Validation Constants
TRANSACTION_EMAIL_MAX_LENGTH = 254
TRANSACTION_NAME_MAX_LENGTH = 50
TRANSACTION_ID_LENGTH = 32
TRANSACTION_APP_ID_LENGTH = 16
TRANSACTION_TIMESTAMP_MS_LENGTH = 13

# Transaction Validation Patterns (compiled in validator)
TRANSACTION_DATE_MIN_YEAR = 2020
TRANSACTION_DATE_MAX_YEAR = 2030

# CSV Validation Constants
CSV_EXPECTED_COLUMN_COUNT = 20
CSV_REQUIRED_COLUMNS_ALL = True  # All 20 columns must be present