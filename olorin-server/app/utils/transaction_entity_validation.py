"""
Transaction Entity Validation

Comprehensive validation utilities for all transaction dataset CSV columns.
This module ensures 100% coverage of all CSV columns with proper entity type validation.
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from app.service.agent.multi_entity.entity_manager import EntityType
from app.utils.entity_validation import validate_entity_type_format


class ValidationResult(Enum):
    """Validation result status"""

    VALID = "valid"
    INVALID = "invalid"
    WARNING = "warning"


class TransactionEntityValidator:
    """
    Comprehensive validator for all transaction dataset entities.
    Ensures every CSV column has proper validation rules.
    """

    # Compiled regex patterns for security and format validation
    PATTERNS = {
        # Temporal patterns
        "datetime_iso": re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$"),
        "timestamp_ms": re.compile(r"^\d{13}$"),  # 13-digit millisecond timestamp
        # ID patterns
        "uuid_pattern": re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE,
        ),
        "hex_id": re.compile(r"^[0-9a-f]{32}$", re.IGNORECASE),
        "alphanumeric_id": re.compile(r"^[A-Z0-9]{16}$"),
        "composite_id": re.compile(r"^[A-Z0-9]+::[0-9a-f-]+$"),
        # Business identifiers
        "store_id_pattern": re.compile(r"^[A-Z0-9_-]{1,50}$"),
        "app_id_pattern": re.compile(r"^[A-Z0-9]{16}$"),
        "alphanumeric_string": re.compile(r"^[A-Za-z0-9_-]+$"),
        "processor_name": re.compile(r"^[A-Za-z0-9\s_-]+$"),
        "product_name": re.compile(r"^[A-Za-z0-9\s_.,&()-]+$"),
        # Email patterns
        "email_basic": re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
        "email_normalized": re.compile(r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"),
        # Name patterns
        "first_name": re.compile(r"^[a-zA-Z\s\'-]{1,50}$"),
        "full_name": re.compile(r"^[a-zA-Z\s\'-]{1,100}$"),
        # Phone patterns
        "country_code": re.compile(r"^\+?\d{1,4}$"),
        "phone_number_format": re.compile(r"^[\d\s\-\(\)\+\.]{7,20}$"),
        # Financial patterns
        "currency_code": re.compile(r"^[A-Z]{3}$"),  # ISO 4217 currency codes
        "decimal_amount": re.compile(r"^\d+(\.\d{1,4})?$"),
        # Payment patterns
        "bin_format": re.compile(r"^\d{6,8}$"),  # Bank Identification Number
        "last_four_format": re.compile(r"^\d{4}$"),
        "payment_method_type": re.compile(
            r"^(credit_card|debit_card|paypal|apple_pay|google_pay|bank_transfer|crypto)$"
        ),
        "token_format": re.compile(r"^[A-Za-z0-9_-]{10,100}$"),
        "identifier_format": re.compile(r"^[A-Za-z0-9_-]{5,50}$"),
        # Security patterns
        "three_d_secure_status": re.compile(r"^(Y|N|A|U|R|E)$"),  # 3DS result codes
        "boolean_nullable": re.compile(r"^(0|1|null)?$"),
        # Status patterns
        "authorization_stage": re.compile(
            r"^(authorized|declined|pending_review|flagged_suspicious|flagged_high_risk|under_investigation)$"
        ),
        "event_type": re.compile(r"^(tx|refund|chargeback|adjustment)$"),
        "boolean_int": re.compile(r"^[01]$"),
        # JSON patterns (basic validation)
        "json_basic": re.compile(r"^[\[\{].*[\]\}]$|^null$"),
    }

    @classmethod
    def validate_all_csv_columns(
        cls, row_data: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Validate all 20 CSV columns against their corresponding entity types.

        Args:
            row_data: Dictionary with CSV column names as keys

        Returns:
            Dict with validation results for each column
        """
        validation_results = {}

        # Validate each CSV column
        csv_column_mappings = cls._get_csv_entity_mappings()

        for csv_column, entity_info in csv_column_mappings.items():
            if csv_column in row_data:
                result = cls._validate_entity_value(
                    entity_info["entity_type"],
                    row_data[csv_column],
                    entity_info["validation_rules"],
                )
                validation_results[csv_column] = {
                    "entity_type": entity_info["entity_type"].value,
                    "validation_result": result["status"].value,
                    "is_valid": result["status"] == ValidationResult.VALID,
                    "errors": result["errors"],
                    "warnings": result["warnings"],
                    "normalized_value": result.get("normalized_value"),
                }
            else:
                validation_results[csv_column] = {
                    "entity_type": entity_info["entity_type"].value,
                    "validation_result": ValidationResult.INVALID.value,
                    "is_valid": False,
                    "errors": ["Column missing from row data"],
                    "warnings": [],
                    "normalized_value": None,
                }

        return validation_results

    @classmethod
    def _get_csv_entity_mappings(cls) -> Dict[str, Dict[str, Any]]:
        """
        Complete mapping of all 48+ CSV columns to their entity types and validation rules.

        Returns:
            Dict mapping CSV column names to entity info
        """
        return {
            # Temporal entities (5 columns)
            "TABLE_RECORD_CREATED_AT": {
                "entity_type": EntityType.RECORD_CREATED,
                "validation_rules": ["datetime_iso", "not_empty", "reasonable_date"],
            },
            "TABLE_RECORD_UPDATED_AT": {
                "entity_type": EntityType.RECORD_UPDATED,
                "validation_rules": [
                    "datetime_iso",
                    "not_empty",
                    "reasonable_date",
                    "after_created",
                ],
            },
            "TX_DATETIME": {
                "entity_type": EntityType.TX_DATETIME,
                "validation_rules": ["datetime_iso", "not_empty", "reasonable_date"],
            },
            "TX_RECEIVED_DATETIME": {
                "entity_type": EntityType.TX_RECEIVED,
                "validation_rules": ["datetime_iso", "not_empty", "reasonable_date"],
            },
            "TX_TIMESTAMP_MS": {
                "entity_type": EntityType.TX_TIMESTAMP_MS,
                "validation_rules": [
                    "timestamp_ms",
                    "not_empty",
                    "reasonable_timestamp_ms",
                ],
            },
            "TX_UPLOADED_TO_SNOWFLAKE": {
                "entity_type": EntityType.TX_UPLOADED_TO_SNOWFLAKE,
                "validation_rules": ["datetime_iso", "not_empty", "reasonable_date"],
            },
            "DATE_OF_BIRTH": {
                "entity_type": EntityType.DATE_OF_BIRTH,
                "validation_rules": [
                    "datetime_iso",
                    "allow_empty",
                    "reasonable_birth_date",
                ],
            },
            # Transaction identifier entities (5 columns)
            "ORIGINAL_TX_ID": {
                "entity_type": EntityType.ORIGINAL_TX_ID,
                "validation_rules": ["hex_id", "not_empty", "length_32"],
            },
            "TX_ID_KEY": {
                "entity_type": EntityType.TX_ID_KEY,
                "validation_rules": ["hex_id", "not_empty", "length_32"],
            },
            "SURROGATE_APP_TX_ID": {
                "entity_type": EntityType.SURROGATE_APP_TX_ID,
                "validation_rules": ["composite_id", "not_empty"],
            },
            "NSURE_UNIQUE_TX_ID": {
                "entity_type": EntityType.NSURE_UNIQUE_TX_ID,
                "validation_rules": ["composite_id", "not_empty"],
            },
            "CLIENT_REQUEST_ID": {
                "entity_type": EntityType.CLIENT_REQUEST_ID,
                "validation_rules": ["uuid_pattern", "allow_empty"],
            },
            # Business entities (8+ columns)
            "STORE_ID": {
                "entity_type": EntityType.STORE_ID,
                "validation_rules": ["store_id_pattern", "allow_empty"],
            },
            "APP_ID": {
                "entity_type": EntityType.APP_ID,
                "validation_rules": ["app_id_pattern", "not_empty", "length_16"],
            },
            "EVENT_TYPE": {
                "entity_type": EntityType.EVENT_TYPE,
                "validation_rules": ["event_type", "not_empty"],
            },
            "AUTHORIZATION_STAGE": {
                "entity_type": EntityType.AUTHORIZATION_STAGE,
                "validation_rules": ["authorization_stage", "not_empty"],
            },
            "MERCHANT_SEGMENT_ID": {
                "entity_type": EntityType.MERCHANT_SEGMENT_ID,
                "validation_rules": ["alphanumeric_string", "allow_empty"],
            },
            "PROCESSOR": {
                "entity_type": EntityType.PROCESSOR,
                "validation_rules": ["processor_name", "allow_empty"],
            },
            "PROCESSOR_MERCHANT_IDENTIFIER": {
                "entity_type": EntityType.PROCESSOR_MERCHANT_IDENTIFIER,
                "validation_rules": ["alphanumeric_string", "allow_empty"],
            },
            "PRODUCT": {
                "entity_type": EntityType.PRODUCT,
                "validation_rules": ["product_name", "allow_empty"],
            },
            # User identity entities (6+ columns)
            "EMAIL": {
                "entity_type": EntityType.EMAIL,
                "validation_rules": ["email_basic", "not_empty", "length_max_254"],
            },
            "EMAIL_NORMALIZED": {
                "entity_type": EntityType.EMAIL_NORMALIZED,
                "validation_rules": ["email_normalized", "not_empty", "length_max_254"],
            },
            "FIRST_NAME": {
                "entity_type": EntityType.FIRST_NAME,
                "validation_rules": ["first_name", "not_empty", "length_max_50"],
            },
            "LAST_NAME": {
                "entity_type": EntityType.LAST_NAME,
                "validation_rules": [
                    "first_name",
                    "allow_empty",
                    "length_max_50",
                ],  # Same pattern as first name
            },
            "UNIQUE_USER_ID": {
                "entity_type": EntityType.UNIQUE_USER_ID,
                "validation_rules": ["composite_id", "not_empty"],
            },
            "PHONE_COUNTRY_CODE": {
                "entity_type": EntityType.PHONE_COUNTRY_CODE,
                "validation_rules": ["country_code", "allow_empty"],
            },
            "PHONE_NUMBER": {
                "entity_type": EntityType.PHONE_NUMBER,
                "validation_rules": ["phone_number_format", "allow_empty"],
            },
            "CARD_HOLDER_NAME": {
                "entity_type": EntityType.CARD_HOLDER_NAME,
                "validation_rules": ["full_name", "allow_empty", "length_max_100"],
            },
            "PERSONAL_INFO_ADDITIONAL_DATA": {
                "entity_type": EntityType.PERSONAL_INFO_ADDITIONAL_DATA,
                "validation_rules": ["json_object", "allow_empty"],
            },
            # Address entities (1 column)
            "BILLING_ADDRESS": {
                "entity_type": EntityType.BILLING_ADDRESS,
                "validation_rules": ["json_variant", "allow_empty"],
            },
            # Shopping cart entities (6 columns)
            "CART": {
                "entity_type": EntityType.CART,
                "validation_rules": ["json_variant", "allow_empty"],
            },
            "CART_ITEMS_TYPES": {
                "entity_type": EntityType.CART_ITEMS_TYPES,
                "validation_rules": ["json_array", "allow_empty"],
            },
            "CART_SKUS": {
                "entity_type": EntityType.CART_SKUS,
                "validation_rules": ["json_array", "allow_empty"],
            },
            "CART_BRANDS": {
                "entity_type": EntityType.CART_BRANDS,
                "validation_rules": ["json_array", "allow_empty"],
            },
            "CART_ITEMS_ARE_GIFTS": {
                "entity_type": EntityType.CART_ITEMS_ARE_GIFTS,
                "validation_rules": ["json_array", "allow_empty"],
            },
            "CART_ITEMS_FULFILLMENT": {
                "entity_type": EntityType.CART_ITEMS_FULFILLMENT,
                "validation_rules": ["json_array", "allow_empty"],
            },
            # Financial entities (6 columns)
            "CREDIT_USE": {
                "entity_type": EntityType.CREDIT_USE,
                "validation_rules": ["json_variant", "allow_empty"],
            },
            "PAID_AMOUNT_CURRENCY": {
                "entity_type": EntityType.PAID_AMOUNT_CURRENCY,
                "validation_rules": ["currency_code", "allow_empty"],
            },
            "PAID_AMOUNT_VALUE_IN_CURRENCY": {
                "entity_type": EntityType.PAID_AMOUNT_VALUE_IN_CURRENCY,
                "validation_rules": [
                    "decimal_amount",
                    "allow_empty",
                    "positive_amount",
                ],
            },
            "PROCESSING_FEE_CURRENCY": {
                "entity_type": EntityType.PROCESSING_FEE_CURRENCY,
                "validation_rules": ["currency_code", "allow_empty"],
            },
            "PROCESSING_FEE_VALUE_IN_CURRENCY": {
                "entity_type": EntityType.PROCESSING_FEE_VALUE_IN_CURRENCY,
                "validation_rules": [
                    "decimal_amount",
                    "allow_empty",
                    "non_negative_amount",
                ],
            },
            # Payment method entities (6 columns)
            "BIN": {
                "entity_type": EntityType.BIN,
                "validation_rules": ["bin_format", "allow_empty"],
            },
            "LAST_FOUR": {
                "entity_type": EntityType.LAST_FOUR,
                "validation_rules": ["last_four_format", "allow_empty"],
            },
            "PAYMENT_METHOD": {
                "entity_type": EntityType.PAYMENT_METHOD,
                "validation_rules": ["payment_method_type", "allow_empty"],
            },
            "PAYMENT_METHOD_TOKEN": {
                "entity_type": EntityType.PAYMENT_METHOD_TOKEN,
                "validation_rules": ["token_format", "allow_empty"],
            },
            "PAYMENT_METHOD_INTERNAL_IDENTIFIER": {
                "entity_type": EntityType.PAYMENT_METHOD_INTERNAL_IDENTIFIER,
                "validation_rules": ["identifier_format", "allow_empty"],
            },
            # Security and verification entities (3 columns)
            "IS_SENT_FOR_NSURE_REVIEW": {
                "entity_type": EntityType.IS_SENT_FOR_NSURE_REVIEW,
                "validation_rules": ["boolean_int", "not_empty"],
            },
            "IS_THREE_D_SECURE_VERIFIED": {
                "entity_type": EntityType.IS_THREE_D_SECURE_VERIFIED,
                "validation_rules": ["boolean_nullable", "allow_empty"],
            },
            "THREE_D_SECURE_RESULT": {
                "entity_type": EntityType.THREE_D_SECURE_RESULT,
                "validation_rules": ["three_d_secure_status", "allow_empty"],
            },
        }

    @classmethod
    def _validate_entity_value(
        cls, entity_type: EntityType, value: Any, validation_rules: List[str]
    ) -> Dict[str, Any]:
        """
        Validate a single entity value against its rules.

        Args:
            entity_type: The entity type being validated
            value: The value to validate
            validation_rules: List of validation rule names

        Returns:
            Dict with validation result details
        """
        errors = []
        warnings = []
        normalized_value = value

        # Convert to string for validation
        str_value = str(value) if value is not None else ""

        # Apply each validation rule
        for rule in validation_rules:
            rule_result = cls._apply_validation_rule(rule, str_value, entity_type)

            if rule_result["status"] == ValidationResult.INVALID:
                errors.extend(rule_result["errors"])
            elif rule_result["status"] == ValidationResult.WARNING:
                warnings.extend(rule_result["warnings"])

            # Update normalized value if rule provides one
            if rule_result.get("normalized_value"):
                normalized_value = rule_result["normalized_value"]

        # Determine overall status
        if errors:
            status = ValidationResult.INVALID
        elif warnings:
            status = ValidationResult.WARNING
        else:
            status = ValidationResult.VALID

        return {
            "status": status,
            "errors": errors,
            "warnings": warnings,
            "normalized_value": normalized_value,
        }

    @classmethod
    def _apply_validation_rule(
        cls, rule_name: str, value: str, entity_type: EntityType
    ) -> Dict[str, Any]:
        """
        Apply a specific validation rule.

        Args:
            rule_name: Name of the validation rule
            value: Value to validate
            entity_type: Entity type context

        Returns:
            Dict with rule validation result
        """
        errors = []
        warnings = []
        normalized_value = None

        if rule_name == "not_empty":
            if not value or value.strip() == "":
                errors.append(f"{entity_type.value} cannot be empty")

        elif rule_name == "allow_empty":
            # Always passes - allows empty values
            pass

        elif rule_name == "datetime_iso":
            if value and not cls.PATTERNS["datetime_iso"].match(value):
                errors.append(
                    f"{entity_type.value} must be in ISO datetime format (YYYY-MM-DD HH:MM:SS.f)"
                )

        elif rule_name == "timestamp_ms":
            if value and not cls.PATTERNS["timestamp_ms"].match(value):
                errors.append(
                    f"{entity_type.value} must be a 13-digit millisecond timestamp"
                )

        elif rule_name == "uuid_pattern":
            if value and not cls.PATTERNS["uuid_pattern"].match(value):
                errors.append(f"{entity_type.value} must be a valid UUID format")

        elif rule_name == "hex_id":
            if value and not cls.PATTERNS["hex_id"].match(value):
                errors.append(
                    f"{entity_type.value} must be a 32-character hexadecimal ID"
                )

        elif rule_name == "composite_id":
            if value and not cls.PATTERNS["composite_id"].match(value):
                errors.append(
                    f"{entity_type.value} must be in composite format (PREFIX::SUFFIX)"
                )

        elif rule_name == "app_id_pattern":
            if value and not cls.PATTERNS["app_id_pattern"].match(value):
                errors.append(
                    f"{entity_type.value} must be a 16-character alphanumeric ID"
                )

        elif rule_name == "store_id_pattern":
            if value and not cls.PATTERNS["store_id_pattern"].match(value):
                errors.append(
                    f"{entity_type.value} must contain only alphanumeric characters, underscores, and hyphens"
                )

        elif rule_name == "email_basic":
            if value and not cls.PATTERNS["email_basic"].match(value):
                errors.append(f"{entity_type.value} must be a valid email address")

        elif rule_name == "email_normalized":
            if value and not cls.PATTERNS["email_normalized"].match(value):
                errors.append(
                    f"{entity_type.value} must be a normalized (lowercase) email address"
                )

        elif rule_name == "first_name":
            if value and not cls.PATTERNS["first_name"].match(value):
                errors.append(
                    f"{entity_type.value} must contain only letters, spaces, apostrophes, and hyphens"
                )

        elif rule_name == "authorization_stage":
            if value and not cls.PATTERNS["authorization_stage"].match(value):
                errors.append(
                    f"{entity_type.value} must be one of: authorized, declined, pending_review, flagged_suspicious, flagged_high_risk, under_investigation"
                )

        elif rule_name == "event_type":
            if value and not cls.PATTERNS["event_type"].match(value):
                errors.append(
                    f"{entity_type.value} must be one of: tx, refund, chargeback, adjustment"
                )

        elif rule_name == "boolean_int":
            if value and not cls.PATTERNS["boolean_int"].match(value):
                errors.append(f"{entity_type.value} must be 0 or 1")

        elif rule_name == "length_32":
            if value and len(value) != 32:
                errors.append(f"{entity_type.value} must be exactly 32 characters long")

        elif rule_name == "length_16":
            if value and len(value) != 16:
                errors.append(f"{entity_type.value} must be exactly 16 characters long")

        elif rule_name == "length_max_254":
            if value and len(value) > 254:
                errors.append(f"{entity_type.value} must be 254 characters or less")

        elif rule_name == "length_max_50":
            if value and len(value) > 50:
                errors.append(f"{entity_type.value} must be 50 characters or less")

        elif rule_name == "reasonable_date":
            if value:
                try:
                    # Parse datetime and check if reasonable (between 2020 and 2030)
                    dt = datetime.fromisoformat(value.replace(" ", "T").rstrip("Z"))
                    if dt.year < 2020 or dt.year > 2030:
                        warnings.append(
                            f"{entity_type.value} date seems unreasonable: {dt.year}"
                        )
                except ValueError:
                    errors.append(f"{entity_type.value} has invalid datetime format")

        elif rule_name == "reasonable_timestamp_ms":
            if value:
                try:
                    # Convert millisecond timestamp to datetime and check reasonableness
                    timestamp_sec = int(value) / 1000
                    dt = datetime.fromtimestamp(timestamp_sec)
                    if dt.year < 2020 or dt.year > 2030:
                        warnings.append(
                            f"{entity_type.value} timestamp seems unreasonable: {dt.year}"
                        )
                except (ValueError, OSError):
                    errors.append(f"{entity_type.value} has invalid timestamp format")

        elif rule_name == "after_created":
            # This rule requires context from TABLE_RECORD_CREATED_AT - skip for now
            # Could be enhanced to cross-validate timestamps
            pass

        elif rule_name == "reasonable_birth_date":
            if value:
                try:
                    dt = datetime.fromisoformat(value.replace(" ", "T").rstrip("Z"))
                    current_year = datetime.now().year
                    if (
                        dt.year < 1900 or dt.year > current_year - 13
                    ):  # Minimum 13 years old
                        warnings.append(
                            f"{entity_type.value} seems unreasonable for birth date: {dt.year}"
                        )
                except ValueError:
                    errors.append(f"{entity_type.value} has invalid birth date format")

        elif rule_name == "alphanumeric_string":
            if value and not cls.PATTERNS["alphanumeric_string"].match(value):
                errors.append(
                    f"{entity_type.value} must contain only alphanumeric characters, underscores, and hyphens"
                )

        elif rule_name == "processor_name":
            if value and not cls.PATTERNS["processor_name"].match(value):
                errors.append(f"{entity_type.value} must be a valid processor name")

        elif rule_name == "product_name":
            if value and not cls.PATTERNS["product_name"].match(value):
                errors.append(f"{entity_type.value} must be a valid product name")

        elif rule_name == "full_name":
            if value and not cls.PATTERNS["full_name"].match(value):
                errors.append(f"{entity_type.value} must be a valid full name")

        elif rule_name == "country_code":
            if value and not cls.PATTERNS["country_code"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid country code (1-4 digits)"
                )

        elif rule_name == "phone_number_format":
            if value and not cls.PATTERNS["phone_number_format"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid phone number format"
                )

        elif rule_name == "currency_code":
            if value and not cls.PATTERNS["currency_code"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid ISO 4217 currency code (3 letters)"
                )

        elif rule_name == "decimal_amount":
            if value and not cls.PATTERNS["decimal_amount"].match(value):
                errors.append(f"{entity_type.value} must be a valid decimal amount")

        elif rule_name == "positive_amount":
            if value:
                try:
                    amount = float(value)
                    if amount <= 0:
                        errors.append(f"{entity_type.value} must be a positive amount")
                except ValueError:
                    errors.append(f"{entity_type.value} must be a valid numeric amount")

        elif rule_name == "non_negative_amount":
            if value:
                try:
                    amount = float(value)
                    if amount < 0:
                        errors.append(f"{entity_type.value} must be non-negative")
                except ValueError:
                    errors.append(f"{entity_type.value} must be a valid numeric amount")

        elif rule_name == "bin_format":
            if value and not cls.PATTERNS["bin_format"].match(value):
                errors.append(f"{entity_type.value} must be a valid BIN (6-8 digits)")

        elif rule_name == "last_four_format":
            if value and not cls.PATTERNS["last_four_format"].match(value):
                errors.append(f"{entity_type.value} must be exactly 4 digits")

        elif rule_name == "payment_method_type":
            if value and not cls.PATTERNS["payment_method_type"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid payment method type"
                )

        elif rule_name == "token_format":
            if value and not cls.PATTERNS["token_format"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid token format (10-100 characters)"
                )

        elif rule_name == "identifier_format":
            if value and not cls.PATTERNS["identifier_format"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid identifier format (5-50 characters)"
                )

        elif rule_name == "three_d_secure_status":
            if value and not cls.PATTERNS["three_d_secure_status"].match(value):
                errors.append(
                    f"{entity_type.value} must be a valid 3D Secure result (Y/N/A/U/R/E)"
                )

        elif rule_name == "boolean_nullable":
            if value and not cls.PATTERNS["boolean_nullable"].match(value):
                errors.append(f"{entity_type.value} must be 0, 1, or null")

        elif rule_name == "json_object":
            if value:
                try:
                    import json

                    parsed = json.loads(value) if isinstance(value, str) else value
                    if not isinstance(parsed, dict):
                        errors.append(f"{entity_type.value} must be a JSON object")
                except (json.JSONDecodeError, TypeError):
                    errors.append(f"{entity_type.value} must be valid JSON object")

        elif rule_name == "json_variant":
            if value:
                try:
                    import json

                    if isinstance(value, str):
                        json.loads(value)
                    # Accept any JSON type for variant
                except (json.JSONDecodeError, TypeError):
                    errors.append(f"{entity_type.value} must be valid JSON")

        elif rule_name == "json_array":
            if value:
                try:
                    import json

                    parsed = json.loads(value) if isinstance(value, str) else value
                    if not isinstance(parsed, list):
                        errors.append(f"{entity_type.value} must be a JSON array")
                except (json.JSONDecodeError, TypeError):
                    errors.append(f"{entity_type.value} must be valid JSON array")

        elif rule_name == "length_max_100":
            if value and len(value) > 100:
                errors.append(f"{entity_type.value} must be 100 characters or less")

        else:
            warnings.append(f"Unknown validation rule: {rule_name}")

        # Determine status
        if errors:
            status = ValidationResult.INVALID
        elif warnings:
            status = ValidationResult.WARNING
        else:
            status = ValidationResult.VALID

        return {
            "status": status,
            "errors": errors,
            "warnings": warnings,
            "normalized_value": normalized_value,
        }

    @classmethod
    def get_validation_summary(
        cls, validation_results: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate a summary of validation results across all columns.

        Args:
            validation_results: Results from validate_all_csv_columns

        Returns:
            Dict with validation summary statistics
        """
        total_columns = len(validation_results)
        valid_columns = sum(
            1 for result in validation_results.values() if result["is_valid"]
        )
        invalid_columns = sum(
            1 for result in validation_results.values() if not result["is_valid"]
        )
        columns_with_warnings = sum(
            1 for result in validation_results.values() if result["warnings"]
        )

        all_errors = []
        all_warnings = []

        for column, result in validation_results.items():
            for error in result["errors"]:
                all_errors.append(f"{column}: {error}")
            for warning in result["warnings"]:
                all_warnings.append(f"{column}: {warning}")

        return {
            "total_columns": total_columns,
            "valid_columns": valid_columns,
            "invalid_columns": invalid_columns,
            "columns_with_warnings": columns_with_warnings,
            "validation_success_rate": (
                (valid_columns / total_columns * 100) if total_columns > 0 else 0
            ),
            "all_errors": all_errors,
            "all_warnings": all_warnings,
            "columns_missing_entity_mapping": [
                col
                for col in validation_results
                if validation_results[col]["errors"]
                and "missing from row data" in validation_results[col]["errors"][0]
            ],
        }

    @classmethod
    def validate_csv_row_completeness(cls, row_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that a CSV row contains all 20 expected columns.

        Args:
            row_data: Dictionary with CSV column data

        Returns:
            Dict with completeness validation results
        """
        expected_columns = set(cls._get_csv_entity_mappings().keys())
        provided_columns = set(row_data.keys())

        missing_columns = expected_columns - provided_columns
        extra_columns = provided_columns - expected_columns

        return {
            "is_complete": len(missing_columns) == 0,
            "expected_column_count": len(expected_columns),
            "provided_column_count": len(provided_columns),
            "missing_columns": list(missing_columns),
            "extra_columns": list(extra_columns),
            "completeness_percentage": (
                len(provided_columns & expected_columns) / len(expected_columns)
            )
            * 100,
        }


def validate_transaction_row(row_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to validate a complete transaction CSV row.

    Args:
        row_data: Dictionary with CSV column names as keys

    Returns:
        Dict with complete validation results
    """
    # Check row completeness
    completeness_result = TransactionEntityValidator.validate_csv_row_completeness(
        row_data
    )

    # Validate all columns
    validation_results = TransactionEntityValidator.validate_all_csv_columns(row_data)

    # Generate summary
    validation_summary = TransactionEntityValidator.get_validation_summary(
        validation_results
    )

    return {
        "row_completeness": completeness_result,
        "column_validations": validation_results,
        "validation_summary": validation_summary,
        "overall_valid": completeness_result["is_complete"]
        and validation_summary["invalid_columns"] == 0,
    }
