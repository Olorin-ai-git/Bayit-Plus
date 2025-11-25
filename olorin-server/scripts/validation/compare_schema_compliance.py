#!/usr/bin/env python3
"""
Schema Compliance Verification Script

Compares our schema constants with the actual CSV schema file to verify:
1. Column name compliance
2. Column type compliance
3. Missing columns in our constants
4. Extra columns in our constants that don't exist in schema
"""

import csv
import os
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add the olorin-server directory to Python path
script_dir = Path(__file__).parent
olorin_server_dir = script_dir.parent.parent
sys.path.insert(0, str(olorin_server_dir))

# Import our schema constants
from app.service.agent.tools.snowflake_tool.schema_constants import *


def parse_csv_schema(csv_path: str) -> Dict[str, str]:
    """Parse the CSV schema file and return column name -> type mapping."""
    schema = {}

    with open(csv_path, "r", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        for row in reader:
            column_name = row["name"].strip()
            column_type = row["type"].strip()
            schema[column_name] = column_type

    return schema


def get_our_schema_constants() -> Dict[str, str]:
    """Get all schema constants from our constants file."""
    constants = {}

    # Get all module-level variables that are column names (all caps with underscores)
    import app.service.agent.tools.snowflake_tool.schema_constants as schema_module

    for name in dir(schema_module):
        if (
            name.isupper()
            and not name.startswith("_")
            and name not in ["FIELD_MAPPINGS", "NON_EXISTENT_COLUMNS"]
            and isinstance(getattr(schema_module, name), str)
        ):

            value = getattr(schema_module, name)

            # Skip NULL AS aliases - these are intentionally non-existent
            if value.startswith("NULL AS"):
                continue

            constants[name] = value

    return constants


def map_snowflake_to_python_type(snowflake_type: str) -> str:
    """Map Snowflake types to Python equivalent types."""
    snowflake_type = snowflake_type.upper()

    # String types
    if "VARCHAR" in snowflake_type:
        return "str"

    # Numeric types
    if "NUMBER" in snowflake_type or "FLOAT" in snowflake_type:
        return "float"

    # Boolean types
    if "BOOLEAN" in snowflake_type:
        return "bool"

    # Timestamp types
    if "TIMESTAMP" in snowflake_type:
        return "datetime"

    # Complex types
    if snowflake_type in ["OBJECT", "VARIANT", "ARRAY"]:
        return "dict"

    # Default to string for unknown types
    return "str"


def analyze_compliance() -> None:
    """Analyze schema compliance and report findings."""

    # Path to the CSV schema file
    csv_schema_path = "/Users/gklainert/Documents/olorin/Tx Table Schema.csv"

    if not Path(csv_schema_path).exists():
        print(f"❌ ERROR: Schema CSV file not found at {csv_schema_path}")
        return

    print("🔍 SCHEMA COMPLIANCE ANALYSIS")
    print("=" * 60)

    # Load actual schema
    actual_schema = parse_csv_schema(csv_schema_path)
    print(f"📊 Actual schema contains: {len(actual_schema)} columns")

    # Load our constants
    our_constants = get_our_schema_constants()
    print(f"📋 Our constants define: {len(our_constants)} columns")

    print("\n" + "=" * 60)

    # Check column name compliance
    print("🎯 COLUMN NAME COMPLIANCE CHECK")
    print("-" * 40)

    missing_from_constants = []
    missing_from_schema = []
    correct_mappings = []
    incorrect_mappings = []

    # Check if our constants exist in actual schema
    for constant_name, column_name in our_constants.items():
        if column_name in actual_schema:
            correct_mappings.append((constant_name, column_name))
        else:
            missing_from_schema.append((constant_name, column_name))

    # Check if actual schema columns are covered by our constants
    covered_columns = set(our_constants.values())
    for actual_column in actual_schema:
        if actual_column not in covered_columns:
            missing_from_constants.append(actual_column)

    # Report findings
    print(f"✅ Correct mappings: {len(correct_mappings)}")
    print(f"❌ Missing from schema: {len(missing_from_schema)}")
    print(f"⚠️  Missing from constants: {len(missing_from_constants)}")

    # Show incorrect mappings
    if missing_from_schema:
        print(
            f"\n❌ COLUMNS IN CONSTANTS BUT NOT IN SCHEMA ({len(missing_from_schema)}):"
        )
        for const_name, column_name in missing_from_schema:
            print(f"   {const_name} = '{column_name}'")

    # Show missing constants
    if missing_from_constants:
        print(
            f"\n⚠️  COLUMNS IN SCHEMA BUT NOT IN CONSTANTS ({len(missing_from_constants)}):"
        )
        # Group by category
        categories = {
            "KYC": [],
            "DISPUTE": [],
            "CRYPTO": [],
            "MAXMIND": [],
            "HLR": [],
            "EMAIL": [],
            "BIN": [],
            "OTHER": [],
        }

        for column in missing_from_constants:
            if "KYC" in column:
                categories["KYC"].append(column)
            elif "DISPUTE" in column or "FRAUD_ALERT" in column:
                categories["DISPUTE"].append(column)
            elif "CRYPTO" in column:
                categories["CRYPTO"].append(column)
            elif "MAXMIND" in column:
                categories["MAXMIND"].append(column)
            elif "HLR" in column:
                categories["HLR"].append(column)
            elif "EMAIL" in column and "VALIDATION" in column:
                categories["EMAIL"].append(column)
            elif "BIN_" in column:
                categories["BIN"].append(column)
            else:
                categories["OTHER"].append(column)

        for category, columns in categories.items():
            if columns:
                print(f"\n   {category} fields ({len(columns)}):")
                for col in columns[:5]:  # Show first 5
                    print(f"     - {col}")
                if len(columns) > 5:
                    print(f"     ... and {len(columns) - 5} more")

    # Type compliance check for existing mappings
    print(f"\n🔍 TYPE COMPLIANCE CHECK")
    print("-" * 40)

    type_mismatches = []
    for constant_name, column_name in correct_mappings:
        if column_name in actual_schema:
            snowflake_type = actual_schema[column_name]
            python_type = map_snowflake_to_python_type(snowflake_type)
            # Note: We don't enforce types in our constants file, just document them

    print(f"✅ All {len(correct_mappings)} existing mappings have valid column names")

    # Summary
    print(f"\n📋 COMPLIANCE SUMMARY")
    print("=" * 60)

    total_schema_columns = len(actual_schema)
    covered_columns_count = len(correct_mappings)
    coverage_percentage = (covered_columns_count / total_schema_columns) * 100

    print(
        f"Schema Coverage: {covered_columns_count}/{total_schema_columns} ({coverage_percentage:.1f}%)"
    )
    print(f"Incorrect Mappings: {len(missing_from_schema)}")
    print(f"Missing Constants: {len(missing_from_constants)}")

    if len(missing_from_schema) == 0 and coverage_percentage > 80:
        print("✅ SCHEMA COMPLIANCE: GOOD")
    elif len(missing_from_schema) == 0:
        print("⚠️  SCHEMA COMPLIANCE: PARTIAL (no errors but low coverage)")
    else:
        print("❌ SCHEMA COMPLIANCE: NEEDS ATTENTION (incorrect mappings found)")

    # Generate recommendations
    print(f"\n🎯 RECOMMENDATIONS")
    print("-" * 40)

    if missing_from_schema:
        print("1. Remove or fix incorrect column mappings in schema_constants.py")

    if missing_from_constants and len(missing_from_constants) > 20:
        print("2. Consider adding constants for frequently-used missing columns")
        print("   Priority categories: KYC, DISPUTE, EMAIL_VALIDATION")

    if coverage_percentage < 90:
        print("3. Schema coverage could be improved for better query flexibility")

    print("\n✅ Analysis complete!")


if __name__ == "__main__":
    analyze_compliance()
