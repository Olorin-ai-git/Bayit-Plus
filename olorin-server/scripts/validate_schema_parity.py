#!/usr/bin/env python3
"""
Standalone Schema Parity Validation Script.

Validates that Snowflake and PostgreSQL databases have identical schemas.
Can be run independently or integrated into CI/CD pipelines.

Usage:
    python scripts/validate_schema_parity.py [OPTIONS]

Options:
    --provider <name>    Database provider to validate against Snowflake (default: postgresql)
    --fail-fast          Exit immediately on first difference found
    --verbose            Show detailed schema information
    --json              Output results in JSON format

Exit Codes:
    0 - Schemas match perfectly
    1 - Schema differences found
    2 - Configuration or connection error

Constitutional Compliance:
- NO hardcoded values - all from environment variables
- Fail-fast on errors
- Complete implementation
"""

import argparse
import json
import os
import sys
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.agent.tools.database_tool.schema_validator import SchemaValidator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def format_validation_result(result, verbose: bool = False) -> Dict[str, Any]:
    """Format validation result for output."""
    output = {
        'is_valid': result.is_valid,
        'summary': result.summary,
        'column_count_snowflake': result.column_count_snowflake,
        'column_count_postgresql': result.column_count_postgresql,
        'differences_count': len(result.differences),
        'missing_columns_count': len(result.missing_columns),
        'type_mismatches_count': len(result.type_mismatches),
        'nullability_mismatches_count': len(result.nullability_mismatches)
    }

    if verbose or not result.is_valid:
        output['missing_columns'] = result.missing_columns
        output['type_mismatches'] = [
            {
                'column': tm.column_name,
                'snowflake_type': tm.snowflake_type,
                'postgresql_type': tm.postgresql_type
            }
            for tm in result.type_mismatches
        ]
        output['nullability_mismatches'] = [
            {
                'column': nm.column_name,
                'snowflake_nullable': nm.snowflake_value,
                'postgresql_nullable': nm.postgresql_value
            }
            for nm in result.nullability_mismatches
        ]

    return output


def print_text_report(result, verbose: bool = False):
    """Print validation result in human-readable format."""
    print("\n" + "=" * 80)
    print("SCHEMA PARITY VALIDATION REPORT")
    print("=" * 80)
    print(f"\n{result.summary}\n")

    if result.is_valid:
        print("✅ VALIDATION PASSED: Schemas are identical")
        print(f"   All {result.column_count_snowflake} columns match perfectly")
    else:
        print("❌ VALIDATION FAILED: Schema differences detected")
        print(f"\n   Snowflake columns: {result.column_count_snowflake}")
        print(f"   PostgreSQL columns: {result.column_count_postgresql}")
        print(f"\n   Total differences: {len(result.differences)}")

        if result.missing_columns:
            print(f"\n   Missing columns in PostgreSQL: {len(result.missing_columns)}")
            for col in result.missing_columns:
                print(f"      - {col}")

        if result.type_mismatches:
            print(f"\n   Type mismatches: {len(result.type_mismatches)}")
            for tm in result.type_mismatches:
                print(f"      - {tm.column_name}")
                print(f"        Snowflake: {tm.snowflake_type}")
                print(f"        PostgreSQL: {tm.postgresql_type}")

        if result.nullability_mismatches:
            print(f"\n   Nullability mismatches: {len(result.nullability_mismatches)}")
            for nm in result.nullability_mismatches:
                print(f"      - {nm.column_name}")
                print(f"        Snowflake nullable: {nm.snowflake_value}")
                print(f"        PostgreSQL nullable: {nm.postgresql_value}")

    print("\n" + "=" * 80 + "\n")


def main():
    """Main entry point for schema validation script."""
    parser = argparse.ArgumentParser(
        description='Validate schema parity between Snowflake and PostgreSQL',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--provider',
        default='postgresql',
        choices=['postgresql'],
        help='Database provider to validate against Snowflake (default: postgresql)'
    )

    parser.add_argument(
        '--fail-fast',
        action='store_true',
        help='Exit immediately on first difference found'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed schema information'
    )

    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )

    args = parser.parse_args()

    try:
        # Initialize validator
        logger.info("🔍 Initializing schema validator...")
        validator = SchemaValidator()

        # Get Snowflake provider (source of truth)
        logger.info("🔌 Connecting to Snowflake...")
        snowflake_provider = get_database_provider('snowflake')
        snowflake_provider.connect()

        # Get comparison provider
        logger.info(f"🔌 Connecting to {args.provider}...")
        comparison_provider = get_database_provider(args.provider)
        comparison_provider.connect()

        # Validate schema parity
        logger.info("⚙️  Validating schema parity...")
        result = validator.validate_parity(snowflake_provider, comparison_provider)

        # Clean up connections
        logger.info("🔌 Disconnecting from databases...")
        snowflake_provider.disconnect()
        comparison_provider.disconnect()

        # Output results
        if args.json:
            output = format_validation_result(result, args.verbose)
            print(json.dumps(output, indent=2))
        else:
            print_text_report(result, args.verbose)

        # Exit with appropriate code
        if result.is_valid:
            logger.info("✅ Schema validation completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Schema validation failed - differences detected")
            sys.exit(1)

    except ValueError as e:
        logger.error(f"❌ Configuration error: {e}")
        if args.json:
            print(json.dumps({'error': 'configuration_error', 'message': str(e)}))
        else:
            print(f"\n❌ CONFIGURATION ERROR: {e}\n", file=sys.stderr)
        sys.exit(2)

    except ConnectionError as e:
        logger.error(f"❌ Database connection error: {e}")
        if args.json:
            print(json.dumps({'error': 'connection_error', 'message': str(e)}))
        else:
            print(f"\n❌ CONNECTION ERROR: {e}\n", file=sys.stderr)
        sys.exit(2)

    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        if args.json:
            print(json.dumps({'error': 'unexpected_error', 'message': str(e)}))
        else:
            print(f"\n❌ UNEXPECTED ERROR: {e}\n", file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
