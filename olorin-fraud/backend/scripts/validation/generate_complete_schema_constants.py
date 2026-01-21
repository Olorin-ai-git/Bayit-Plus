#!/usr/bin/env python3
"""
Generate Complete Schema Constants

Creates a comprehensive schema_constants.py file with ALL 333 columns from the CSV schema.
Ensures exact column name and type compliance.
"""

import csv
import re
from pathlib import Path
from typing import Dict, List


def parse_csv_schema(csv_path: str) -> List[Dict[str, str]]:
    """Parse the CSV schema file and return list of column definitions."""
    columns = []

    with open(csv_path, "r", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        for row in reader:
            columns.append(
                {
                    "name": row["name"].strip(),
                    "type": row["type"].strip(),
                    "kind": row["kind"].strip(),
                    "null": row["null?"].strip(),
                    "comment": row.get("comment", "").strip(),
                }
            )

    return columns


def categorize_columns(
    columns: List[Dict[str, str]],
) -> Dict[str, List[Dict[str, str]]]:
    """Categorize columns by functional area."""
    categories = {
        "metadata": [],
        "identity": [],
        "transaction": [],
        "payment": [],
        "network": [],
        "device": [],
        "risk": [],
        "fraud": [],
        "kyc": [],
        "dispute": [],
        "email": [],
        "bin": [],
        "hlr": [],
        "maxmind": [],
        "crypto": [],
        "cart": [],
        "temporal": [],
        "geography": [],
        "business": [],
        "features": [],
        "other": [],
    }

    for col in columns:
        name = col["name"].upper()

        # Metadata fields
        if any(
            x in name
            for x in [
                "TABLE_RECORD",
                "UPLOADED_TO_SNOWFLAKE",
                "CREATED_TIME",
                "EVENT_TYPE",
            ]
        ):
            categories["metadata"].append(col)
        # Identity fields
        elif any(
            x in name
            for x in [
                "USER_ID",
                "EMAIL",
                "FIRST_NAME",
                "LAST_NAME",
                "PHONE",
                "DATE_OF_BIRTH",
            ]
        ):
            categories["identity"].append(col)
        # Transaction fields
        elif any(
            x in name
            for x in [
                "TX_ID",
                "TX_DATETIME",
                "TX_TIMESTAMP",
                "AUTHORIZATION",
                "STORE_ID",
            ]
        ):
            categories["transaction"].append(col)
        # Payment fields
        elif any(
            x in name
            for x in [
                "PAID_AMOUNT",
                "PAYMENT_METHOD",
                "CARD_",
                "BIN",
                "LAST_FOUR",
                "PROCESSOR",
                "PAYPAL",
            ]
        ):
            categories["payment"].append(col)
        # Network/Location fields
        elif (
            any(x in name for x in ["IP", "ISP", "ASN", "COUNTRY_CODE"])
            and "PHONE" not in name
        ):
            categories["network"].append(col)
        # Device fields
        elif any(
            x in name for x in ["DEVICE", "USER_AGENT", "SESSION_INFO", "APP_INSTALL"]
        ):
            categories["device"].append(col)
        # Risk scoring fields
        elif any(
            x in name for x in ["MODEL_SCORE", "MODEL_", "RISK_SCORE", "THRESHOLD"]
        ):
            categories["risk"].append(col)
        # Fraud detection fields
        elif any(
            x in name for x in ["IS_FRAUD", "NSURE_", "RULE", "TRIGGERED", "DECISION"]
        ):
            categories["fraud"].append(col)
        # KYC fields
        elif "KYC" in name:
            categories["kyc"].append(col)
        # Dispute fields
        elif any(x in name for x in ["DISPUTE", "FRAUD_ALERT", "REFUND"]):
            categories["dispute"].append(col)
        # Email validation fields
        elif any(
            x in name
            for x in ["EMAIL_VALIDATION", "IS_DISPOSABLE", "IS_FREEMAIL", "SMTPV"]
        ):
            categories["email"].append(col)
        # BIN fields
        elif name.startswith("BIN_") or "BIN_" in name:
            categories["bin"].append(col)
        # HLR fields
        elif name.startswith("HLR_"):
            categories["hlr"].append(col)
        # MaxMind fields
        elif "MAXMIND" in name:
            categories["maxmind"].append(col)
        # Crypto fields
        elif "CRYPTO" in name:
            categories["crypto"].append(col)
        # Cart/Product fields
        elif any(x in name for x in ["CART", "PRODUCT", "GMV", "RECIPIENT"]):
            categories["cart"].append(col)
        # Temporal fields
        elif any(x in name for x in ["DATETIME", "TIMESTAMP", "DAYS_FROM", "_DATE"]):
            categories["temporal"].append(col)
        # Geographic fields
        elif any(x in name for x in ["DISTANCE_", "REGION"]):
            categories["geography"].append(col)
        # Business fields
        elif any(x in name for x in ["MERCHANT", "PARTNER", "SEGMENT", "APP_ID"]):
            categories["business"].append(col)
        # Model features
        elif "__MODEL_FEATURE" in name or any(
            x in name for x in ["GROUP_", "PM_", "USER_GRAPH"]
        ):
            categories["features"].append(col)
        else:
            categories["other"].append(col)

    return categories


def generate_schema_constants(columns: List[Dict[str, str]]) -> str:
    """Generate the complete schema_constants.py file content."""

    categories = categorize_columns(columns)

    content = '''"""
Snowflake schema constants for ALL 333 columns in TRANSACTIONS_ENRICHED table.
This ensures complete compliance with the actual schema structure.

Generated from: Tx Table Schema.csv
Total columns: 333
"""

from typing import Dict, Set

'''

    # Generate constants for each category
    for category_name, category_columns in categories.items():
        if not category_columns:
            continue

        # Create category header
        category_title = category_name.replace("_", " ").title()
        content += f"\n# {category_title} Fields ({len(category_columns)} columns)\n"

        # Sort columns alphabetically within category
        sorted_columns = sorted(category_columns, key=lambda x: x["name"])

        for col in sorted_columns:
            col_name = col["name"]
            col_type = col["type"]

            # Create Python constant name (same as column name)
            constant_name = col_name

            # Add type information as comment
            type_comment = f"  # {col_type}"
            if col["comment"]:
                type_comment += f" - {col['comment']}"

            content += f'{constant_name} = "{col_name}"{type_comment}\n'

    # Add utility mappings and functions
    content += """

# ============================================================================
# UTILITY MAPPINGS AND FUNCTIONS
# ============================================================================

# NO FIELD MAPPINGS - SCHEMA-LOCKED MODE
# Only valid schema columns allowed - no aliases or mappings permitted

# All column names as a set for validation
ALL_COLUMN_NAMES: Set[str] = {
"""

    # Add all column names to the set
    all_columns = [col["name"] for col in columns]
    for i, col_name in enumerate(sorted(all_columns)):
        ending = "," if i < len(all_columns) - 1 else ""
        content += f'    "{col_name}"{ending}\n'

    content += '''}

def get_column_type(column_name: str) -> str:
    """
    Get the Snowflake type for a given column name.

    Args:
        column_name: The column name to look up

    Returns:
        The Snowflake type string, or 'UNKNOWN' if not found
    """
    column_types = {
'''

    # Add column type mappings
    for col in columns:
        content += f'        "{col["name"]}": "{col["type"]}",\n'

    content += '''    }
    return column_types.get(column_name, "UNKNOWN")

def is_valid_column(column_name: str) -> bool:
    """
    Check if a column name exists in the schema.

    Args:
        column_name: The column name to validate

    Returns:
        True if column exists, False otherwise
    """
    return column_name in ALL_COLUMN_NAMES

def get_correct_column_name(old_name: str) -> str:
    """
    SCHEMA-LOCKED MODE: No field mappings allowed.
    Only valid schema column names are permitted.

    Args:
        old_name: Column name to validate

    Returns:
        The input name if valid, raises error if invalid
    """
    if old_name in ALL_COLUMN_NAMES:
        return old_name
    raise ValueError(f"Invalid column name '{old_name}' - not found in schema. Only valid schema columns allowed.")

def build_safe_select_columns(columns: list) -> str:
    """
    Build a safe SELECT clause with validated column names.

    Args:
        columns: List of column names to include in SELECT

    Returns:
        Comma-separated string of validated column references
    """
    safe_columns = []
    for col in columns:
        correct_name = get_correct_column_name(col)
        if is_valid_column(correct_name):
            safe_columns.append(correct_name)
        else:
            # For non-existent columns, use NULL with alias
            safe_columns.append(f"NULL AS {col}")

    return ", ".join(safe_columns)

# Column count validation
EXPECTED_COLUMN_COUNT = 333
ACTUAL_COLUMN_COUNT = len(ALL_COLUMN_NAMES)

if ACTUAL_COLUMN_COUNT != EXPECTED_COLUMN_COUNT:
    raise ValueError(
        f"Schema validation failed: Expected {EXPECTED_COLUMN_COUNT} columns, "
        f"but found {ACTUAL_COLUMN_COUNT} columns"
    )

# Schema validation passed
print(f"✅ Schema constants loaded: {ACTUAL_COLUMN_COUNT} columns validated")


def get_required_env_var(var_name: str) -> str:
    """Get required environment variable or raise error if missing."""
    import os
    value = os.getenv(var_name)
    if not value:
        raise ValueError(f"❌ Required environment variable {var_name} not found in .env file!")
    return value


def get_full_table_name(database: str = None, schema: str = None, table_name: str = None) -> str:
    """
    Get the full qualified table name using environment variables.

    Args:
        database: Database name override (defaults to SNOWFLAKE_DATABASE)
        schema: Schema name override (defaults to SNOWFLAKE_SCHEMA)
        table_name: Table name override (defaults to SNOWFLAKE_TRANSACTIONS_TABLE)

    Returns:
        Full qualified table name: database.schema.table

    Raises:
        ValueError: If required environment variables are missing from .env file
    """
    db = database or get_required_env_var('SNOWFLAKE_DATABASE')
    sch = schema or get_required_env_var('SNOWFLAKE_SCHEMA')
    tbl = table_name or get_required_env_var('SNOWFLAKE_TRANSACTIONS_TABLE')

    return f"{db}.{sch}.{tbl}"
'''

    return content


def main():
    """Generate the complete schema constants file."""

    # Path to the CSV schema file
    csv_schema_path = "/Users/gklainert/Documents/olorin/Tx Table Schema.csv"

    if not Path(csv_schema_path).exists():
        print(f"❌ ERROR: Schema CSV file not found at {csv_schema_path}")
        return

    print("🔄 Parsing CSV schema...")
    columns = parse_csv_schema(csv_schema_path)
    print(f"📊 Found {len(columns)} columns in schema")

    print("🔄 Generating schema constants...")
    content = generate_schema_constants(columns)

    # Write to schema constants file
    output_path = (
        Path(__file__).parent.parent.parent
        / "app/service/agent/tools/snowflake_tool/schema_constants.py"
    )

    print(f"💾 Writing complete schema to {output_path}")
    with open(output_path, "w") as f:
        f.write(content)

    print(f"✅ Complete schema constants generated!")
    print(f"📋 Total columns: {len(columns)}")

    # Categorization summary
    categories = categorize_columns(columns)
    print(f"\n📊 Column categorization:")
    for category, cols in categories.items():
        if cols:
            print(f"   {category}: {len(cols)} columns")


if __name__ == "__main__":
    main()
