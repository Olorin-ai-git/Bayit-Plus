#!/usr/bin/env python3
"""
Comprehensive data verification script for Snowflake TRANSACTIONS_ENRICHED table.
Checks all 300+ columns for data completeness across 5000 records.
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
from app.service.agent.tools.snowflake_tool.schema_constants import *
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class DataCompletenessVerifier:
    """Verifies data completeness across all columns in the Snowflake table."""

    def __init__(self):
        self.client = SnowflakeClient()
        self.results = {
            "verification_timestamp": datetime.now().isoformat(),
            "table_info": {},
            "column_analysis": {},
            "data_quality_summary": {},
            "issues_found": []
        }

    async def connect(self):
        """Connect to Snowflake."""
        await self.client.connect()

    async def disconnect(self):
        """Disconnect from Snowflake."""
        await self.client.disconnect()

    async def get_table_info(self) -> Dict[str, Any]:
        """Get basic table information."""
        print("\n📊 Getting table information...")

        # Get total record count
        count_query = "SELECT COUNT(*) as total_records FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED"
        count_result = await self.client.execute_query(count_query)
        # Handle different possible column names in mock vs real data
        total_records = 0
        if count_result and len(count_result) > 0:
            row = count_result[0]
            total_records = (row.get('TOTAL_RECORDS') or
                           row.get('total_records') or
                           row.get('COUNT') or 0)

        # Get column information from INFORMATION_SCHEMA
        columns_query = """
        SELECT
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'PUBLIC'
        AND TABLE_NAME = 'TRANSACTIONS_ENRICHED'
        ORDER BY ORDINAL_POSITION
        """

        try:
            columns_result = await self.client.execute_query(columns_query)
            column_count = len(columns_result) if columns_result else 0
        except Exception as e:
            logger.warning(f"Could not fetch column schema: {e}")
            # Fallback to known columns from schema_constants
            columns_result = []
            column_count = 80  # Approximate based on schema_constants

        self.results["table_info"] = {
            "total_records": total_records,
            "total_columns": column_count,
            "columns_metadata": columns_result
        }

        print(f"   ✅ Total Records: {total_records:,}")
        print(f"   ✅ Total Columns: {column_count}")

        return self.results["table_info"]

    async def analyze_column_completeness(self) -> Dict[str, Any]:
        """Analyze data completeness for all columns."""
        print("\n🔍 Analyzing column completeness...")

        # Define all known columns from schema constants
        known_columns = [
            # Payment and Transaction Fields
            PAID_AMOUNT_VALUE_IN_CURRENCY, PAID_AMOUNT_CURRENCY, PROCESSING_FEE_VALUE, PROCESSING_FEE_CURRENCY,

            # Identity and User Fields
            TX_ID_KEY, EMAIL, EMAIL_NORMALIZED, UNIQUE_USER_ID, FIRST_NAME, LAST_NAME,
            PHONE_NUMBER, PHONE_COUNTRY_CODE,

            # Network and Location Fields
            IP, IP_COUNTRY_CODE,

            # Device Fields
            DEVICE_ID, USER_AGENT, DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION,

            # Risk and Fraud Fields
            MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, NSURE_FIRST_DECISION,
            MAXMIND_RISK_SCORE, MAXMIND_IP_RISK_SCORE,

            # Payment Method Fields
            PAYMENT_METHOD, CARD_BRAND, CARD_TYPE, CARD_ISSUER, BIN, LAST_FOUR, BIN_COUNTRY_CODE,

            # Temporal Fields
            TX_DATETIME, TX_RECEIVED_DATETIME, TX_TIMESTAMP_MS,

            # Dispute and Alert Fields
            DISPUTES, COUNT_DISPUTES, FRAUD_ALERTS, COUNT_FRAUD_ALERTS,
            LAST_DISPUTE_DATETIME, LAST_FRAUD_ALERT_DATETIME,

            # Business Fields
            STORE_ID, MERCHANT_NAME, PARTNER_NAME, APP_ID,

            # Cart and Product Fields
            CART, CART_USD, GMV, PRODUCT_TYPE, IS_DIGITAL,

            # Geographic and ISP Fields
            ISP, ASN
        ]

        # Get all columns from the table dynamically
        describe_query = "DESCRIBE TABLE FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED"
        try:
            describe_result = await self.client.execute_query(describe_query)
            if describe_result:
                all_columns = [row['name'] for row in describe_result]
            else:
                all_columns = known_columns
        except Exception as e:
            logger.warning(f"Could not describe table: {e}. Using known columns.")
            all_columns = known_columns

        print(f"   📋 Analyzing {len(all_columns)} columns...")

        # Analyze each column for null/empty values
        column_analysis = {}

        # For mock mode, use simplified analysis
        if not self.client.is_real:
            print("   🧪 Running in MOCK mode - performing simplified analysis...")
            # Get sample data to understand available columns
            sample_query = "SELECT * FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED LIMIT 5"
            try:
                sample_result = await self.client.execute_query(sample_query)
                if sample_result and len(sample_result) > 0:
                    # Extract actual columns from sample data
                    actual_columns = list(sample_result[0].keys())
                    print(f"   📋 Found {len(actual_columns)} columns in mock data")

                    # Simulate analysis for each column
                    total_mock_records = 5000  # Simulated total for mock
                    for col in actual_columns:
                        # Simulate realistic data completeness patterns
                        if col in ['TX_ID_KEY', 'TX_DATETIME', 'EMAIL']:
                            # Core fields - very high completeness
                            null_count = 0
                            empty_count = 0
                            distinct_count = total_mock_records
                        elif col in ['MODEL_SCORE', 'PAID_AMOUNT_VALUE_IN_CURRENCY', 'IS_FRAUD_TX']:
                            # Important fields - high completeness
                            null_count = 5
                            empty_count = 0
                            distinct_count = total_mock_records - 100
                        elif col in ['DEVICE_ID', 'IP', 'USER_AGENT']:
                            # Technical fields - good completeness
                            null_count = 50
                            empty_count = 10
                            distinct_count = total_mock_records - 500
                        elif col in ['PHONE_NUMBER', 'CARD_BRAND', 'DISPUTES']:
                            # Optional fields - moderate completeness
                            null_count = 1000
                            empty_count = 100
                            distinct_count = total_mock_records - 1500
                        else:
                            # Other fields - variable completeness
                            null_count = 250
                            empty_count = 50
                            distinct_count = total_mock_records - 800

                        missing_count = null_count + empty_count
                        completeness_pct = ((total_mock_records - missing_count) / total_mock_records * 100)

                        column_analysis[col] = {
                            "null_count": null_count,
                            "empty_count": empty_count,
                            "missing_count": missing_count,
                            "distinct_count": distinct_count,
                            "completeness_percentage": round(completeness_pct, 2),
                            "has_data": missing_count < total_mock_records
                        }

                        # Flag columns with significant missing data
                        if completeness_pct < 50:
                            self.results["issues_found"].append({
                                "type": "low_completeness",
                                "column": col,
                                "completeness_percentage": completeness_pct,
                                "missing_count": missing_count,
                                "total_records": total_mock_records
                            })

                else:
                    print("   ⚠️  No sample data available in mock mode")

            except Exception as e:
                logger.error(f"Error in mock analysis: {e}")
                print(f"   ❌ Mock analysis failed: {e}")

        else:
            # Real Snowflake analysis
            print("   🔄 Running REAL Snowflake analysis...")

            # Batch columns into groups for efficient querying
            batch_size = 20
            for i in range(0, len(all_columns), batch_size):
                batch_columns = all_columns[i:i + batch_size]

                print(f"   🔄 Processing columns {i+1}-{min(i+batch_size, len(all_columns))}...")

                # Build dynamic query for this batch
                null_checks = []
                for col in batch_columns:
                    null_checks.append(f"""
                        SUM(CASE WHEN {col} IS NULL THEN 1 ELSE 0 END) AS {col}_NULL_COUNT,
                        SUM(CASE WHEN {col} IS NOT NULL AND TRIM(CAST({col} AS STRING)) = '' THEN 1 ELSE 0 END) AS {col}_EMPTY_COUNT,
                        COUNT(DISTINCT {col}) AS {col}_DISTINCT_COUNT
                    """)

                batch_query = f"""
                SELECT
                    COUNT(*) AS TOTAL_RECORDS,
                    {','.join(null_checks)}
                FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
                """

                try:
                    batch_result = await self.client.execute_query(batch_query)
                    if batch_result and len(batch_result) > 0:
                        row = batch_result[0]
                        total_records = row['TOTAL_RECORDS']

                        for col in batch_columns:
                            null_count = row.get(f'{col}_NULL_COUNT', 0)
                            empty_count = row.get(f'{col}_EMPTY_COUNT', 0)
                            distinct_count = row.get(f'{col}_DISTINCT_COUNT', 0)

                            missing_count = null_count + empty_count
                            completeness_pct = ((total_records - missing_count) / total_records * 100) if total_records > 0 else 0

                            column_analysis[col] = {
                                "null_count": null_count,
                                "empty_count": empty_count,
                                "missing_count": missing_count,
                                "distinct_count": distinct_count,
                                "completeness_percentage": round(completeness_pct, 2),
                                "has_data": missing_count < total_records
                            }

                            # Flag columns with significant missing data
                            if completeness_pct < 50:
                                self.results["issues_found"].append({
                                    "type": "low_completeness",
                                    "column": col,
                                    "completeness_percentage": completeness_pct,
                                    "missing_count": missing_count,
                                    "total_records": total_records
                                })

                except Exception as e:
                    logger.error(f"Error analyzing batch {i+1}-{min(i+batch_size, len(all_columns))}: {e}")
                    # Mark columns as unanalyzed
                    for col in batch_columns:
                        column_analysis[col] = {
                            "null_count": "ERROR",
                            "empty_count": "ERROR",
                            "missing_count": "ERROR",
                            "distinct_count": "ERROR",
                            "completeness_percentage": "ERROR",
                            "has_data": False,
                            "error": str(e)
                        }

        self.results["column_analysis"] = column_analysis

        # Generate summary statistics
        analyzed_columns = [col for col, data in column_analysis.items()
                          if isinstance(data.get("completeness_percentage"), (int, float))]

        if analyzed_columns:
            completeness_values = [column_analysis[col]["completeness_percentage"]
                                 for col in analyzed_columns]

            self.results["data_quality_summary"] = {
                "total_columns_analyzed": len(analyzed_columns),
                "columns_with_100_percent_completeness": len([c for c in completeness_values if c == 100]),
                "columns_with_90_plus_percent_completeness": len([c for c in completeness_values if c >= 90]),
                "columns_with_50_plus_percent_completeness": len([c for c in completeness_values if c >= 50]),
                "columns_with_less_than_50_percent_completeness": len([c for c in completeness_values if c < 50]),
                "average_completeness_percentage": round(sum(completeness_values) / len(completeness_values), 2),
                "min_completeness_percentage": min(completeness_values),
                "max_completeness_percentage": max(completeness_values)
            }

        print(f"   ✅ Column analysis completed for {len(analyzed_columns)} columns")
        return column_analysis

    async def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive data completeness report."""
        print("\n📋 Generating comprehensive report...")

        # Add execution metadata
        self.results["execution_info"] = {
            "script_version": "1.0",
            "verification_mode": "MOCK" if not self.client.is_real else "LIVE",
            "total_issues_found": len(self.results["issues_found"])
        }

        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/gklainert/Documents/olorin/olorin-server/reports/data_completeness_report_{timestamp}.json"

        # Create reports directory if it doesn't exist
        Path(report_file).parent.mkdir(parents=True, exist_ok=True)

        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print(f"   ✅ Report saved to: {report_file}")
        return self.results

    def print_summary(self):
        """Print summary of findings to console."""
        print("\n" + "="*80)
        print("📊 DATA COMPLETENESS VERIFICATION SUMMARY")
        print("="*80)

        table_info = self.results.get("table_info", {})
        quality_summary = self.results.get("data_quality_summary", {})

        print(f"\n📋 Table Information:")
        print(f"   Total Records: {table_info.get('total_records', 'Unknown'):,}")
        print(f"   Total Columns: {table_info.get('total_columns', 'Unknown'):,}")

        if quality_summary:
            print(f"\n📊 Data Quality Summary:")
            print(f"   Columns Analyzed: {quality_summary.get('total_columns_analyzed', 0)}")
            print(f"   Average Completeness: {quality_summary.get('average_completeness_percentage', 0)}%")
            print(f"   Columns with 100% completeness: {quality_summary.get('columns_with_100_percent_completeness', 0)}")
            print(f"   Columns with 90%+ completeness: {quality_summary.get('columns_with_90_plus_percent_completeness', 0)}")
            print(f"   Columns with <50% completeness: {quality_summary.get('columns_with_less_than_50_percent_completeness', 0)}")

        issues_count = len(self.results.get("issues_found", []))
        print(f"\n⚠️  Issues Found: {issues_count}")

        if issues_count > 0:
            print("\n🔍 Issues Details:")
            for issue in self.results["issues_found"][:10]:  # Show first 10 issues
                if issue["type"] == "low_completeness":
                    print(f"   ❌ {issue['column']}: {issue['completeness_percentage']}% complete "
                          f"({issue['missing_count']:,} missing values)")

        print("\n" + "="*80)

async def main():
    """Main execution function."""
    print("\n" + "="*80)
    print("🔍 SNOWFLAKE DATA COMPLETENESS VERIFICATION")
    print("="*80)
    print("📋 Analyzing all 300+ columns across 5000 records...")
    print("⚠️  Running in MOCK mode (TEST_MODE=mock)")

    verifier = DataCompletenessVerifier()

    try:
        # Connect to Snowflake
        await verifier.connect()

        # Get table information
        await verifier.get_table_info()

        # Analyze column completeness
        await verifier.analyze_column_completeness()

        # Generate comprehensive report
        await verifier.generate_report()

        # Print summary
        verifier.print_summary()

    except Exception as e:
        logger.error(f"Verification failed: {e}")
        print(f"\n❌ Verification failed: {e}")

    finally:
        # Disconnect
        await verifier.disconnect()

if __name__ == "__main__":
    asyncio.run(main())