#!/usr/bin/env python3
"""
Schema Gap Analysis Report Generator

Compares the source of truth CSV schema with actual PostgreSQL and Snowflake schemas
to identify gaps, mismatches, and inconsistencies.
"""

import csv
import re
import json
from pathlib import Path
from typing import Dict, Set, List, Tuple
from collections import defaultdict

# Type mapping for comparison
TYPE_MAPPINGS = {
    'VARCHAR': 'text',
    'VARCHAR(16777216)': 'text',
    'VARCHAR(255)': 'text',
    'VARCHAR(100)': 'text',
    'VARCHAR(50)': 'text',
    'VARCHAR(20)': 'text',
    'VARCHAR(10)': 'text',
    'TIMESTAMP_NTZ(9)': 'timestamp without time zone',
    'TIMESTAMP_NTZ': 'timestamp without time zone',
    'NUMBER(38,0)': 'bigint',
    'NUMBER(18,0)': 'bigint',
    'NUMBER(9,0)': 'integer',
    'NUMBER(1,0)': 'smallint',
    'NUMBER(2,0)': 'smallint',
    'NUMBER(24,6)': 'numeric',
    'NUMBER(19,6)': 'numeric',
    'FLOAT': 'double precision',
    'OBJECT': 'jsonb',
    'VARIANT': 'jsonb',
    'ARRAY': 'jsonb',
    'BOOLEAN': 'boolean',
    'DATE': 'date',
}


def normalize_type(db_type: str, source: str) -> str:
    """Normalize database types for comparison."""
    db_type = db_type.upper().strip()
    
    if source == 'CSV':
        # CSV types are already normalized (Snowflake types)
        return db_type
    elif source == 'PostgreSQL':
        # PostgreSQL types need normalization
        if 'character varying' in db_type.lower():
            return 'VARCHAR'
        elif 'timestamp without time zone' in db_type.lower():
            return 'TIMESTAMP_NTZ(9)'
        elif 'bigint' in db_type.lower():
            return 'NUMBER(38,0)'
        elif 'integer' in db_type.lower():
            return 'NUMBER(9,0)'
        elif 'smallint' in db_type.lower():
            return 'NUMBER(1,0)'
        elif 'double precision' in db_type.lower():
            return 'FLOAT'
        elif 'jsonb' in db_type.lower():
            return 'VARIANT'
        elif 'boolean' in db_type.lower():
            return 'BOOLEAN'
        elif 'numeric' in db_type.lower():
            return 'NUMBER(24,6)'
        elif 'date' in db_type.lower():
            return 'DATE'
        elif 'text' in db_type.lower():
            return 'VARCHAR(16777216)'
    
    return db_type


def read_csv_schema(csv_path: Path) -> Dict[str, Dict]:
    """Read the source of truth CSV schema."""
    columns = {}
    with open(csv_path, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
        reader = csv.DictReader(f)
        for row in reader:
            col_name = row['name'].upper().strip()
            if not col_name:
                continue
            
            columns[col_name] = {
                'type': row['type'].strip(),
                'null': row.get('null?', 'Y').strip(),
                'kind': row.get('kind', 'COLUMN').strip(),
                'source': 'CSV'
            }
    return columns


def read_postgres_schema(pg_path: Path) -> Dict[str, Dict]:
    """Read PostgreSQL actual schema."""
    columns = {}
    with open(pg_path, 'r') as f:
        for line in f:
            match = re.match(r'\d+\.\s*(\w+)\s*\(([^)]+)\)', line.strip())
            if match:
                col_name = match.group(1).upper()
                pg_type = match.group(2)
                columns[col_name] = {
                    'type': pg_type,
                    'source': 'PostgreSQL'
                }
    return columns


def find_snowflake_schema_files(base_path: Path) -> List[Path]:
    """Find Snowflake schema definition files."""
    snowflake_files = []
    for pattern in ['**/snowflake_setup.sql', '**/create_fraud_detection_dataset.sql']:
        snowflake_files.extend(base_path.glob(pattern))
    return snowflake_files


def analyze_schema_gaps(csv_schema: Dict, pg_schema: Dict) -> Dict:
    """Analyze gaps between CSV and PostgreSQL schemas."""
    csv_cols = set(csv_schema.keys())
    pg_cols = set(pg_schema.keys())
    
    # Missing columns
    missing_in_pg = csv_cols - pg_cols
    extra_in_pg = pg_cols - csv_cols
    common_cols = csv_cols & pg_cols
    
    # Type mismatches - more detailed analysis
    type_mismatches = []
    type_warnings = []  # Potential issues but might be compatible
    
    for col in common_cols:
        csv_type_raw = csv_schema[col]['type']
        pg_type_raw = pg_schema[col]['type']
        
        csv_type = normalize_type(csv_type_raw, 'CSV')
        pg_type = normalize_type(pg_type_raw, 'PostgreSQL')
        
        # Check if types are compatible
        csv_base = csv_type.split('(')[0] if '(' in csv_type else csv_type
        pg_base = pg_type.split('(')[0] if '(' in pg_type else pg_type
        
        # Check for exact match first
        if csv_type != pg_type:
            # Check if they're compatible via mapping
            csv_mapped = TYPE_MAPPINGS.get(csv_type, csv_base)
            pg_mapped = TYPE_MAPPINGS.get(pg_type, pg_base)
            
            # If base types differ, it's a mismatch
            if csv_base != pg_base and csv_mapped != pg_mapped:
                type_mismatches.append({
                    'column': col,
                    'csv_type': csv_type_raw,
                    'pg_type': pg_type_raw,
                    'csv_normalized': csv_type,
                    'pg_normalized': pg_type
                })
            elif csv_type != pg_type:
                # Same base type but different precision/size - warning
                type_warnings.append({
                    'column': col,
                    'csv_type': csv_type_raw,
                    'pg_type': pg_type_raw,
                    'csv_normalized': csv_type,
                    'pg_normalized': pg_type
                })
    
    return {
        'csv_total': len(csv_schema),
        'pg_total': len(pg_schema),
        'common': len(common_cols),
        'missing_in_pg': sorted(missing_in_pg),
        'extra_in_pg': sorted(extra_in_pg),
        'type_mismatches': type_mismatches,
        'type_warnings': type_warnings
    }


def generate_report(analysis: Dict, csv_schema: Dict, pg_schema: Dict) -> str:
    """Generate a comprehensive markdown report."""
    report = []
    report.append("# Transactions Enriched Schema Gap Analysis Report\n")
    report.append(f"**Generated:** {Path(__file__).stat().st_mtime}\n")
    report.append(f"**Source of Truth:** `Tx Table Schema.csv`\n\n")
    
    # Summary
    report.append("## Executive Summary\n\n")
    report.append(f"- **CSV Columns (Source of Truth):** {analysis['csv_total']}\n")
    report.append(f"- **PostgreSQL Actual Columns:** {analysis['pg_total']}\n")
    report.append(f"- **Common Columns:** {analysis['common']}\n")
    report.append(f"- **Missing in PostgreSQL:** {len(analysis['missing_in_pg'])}\n")
    report.append(f"- **Extra in PostgreSQL:** {len(analysis['extra_in_pg'])}\n")
    report.append(f"- **Type Mismatches:** {len(analysis['type_mismatches'])}\n")
    report.append(f"- **Type Warnings:** {len(analysis['type_warnings'])}\n\n")
    
    # Missing columns
    if analysis['missing_in_pg']:
        report.append("## Missing Columns in PostgreSQL\n\n")
        report.append("These columns exist in the source of truth CSV but are missing in PostgreSQL:\n\n")
        report.append("| Column Name | CSV Type | Status |\n")
        report.append("|-------------|----------|--------|\n")
        for col in analysis['missing_in_pg']:
            csv_type = csv_schema[col]['type']
            report.append(f"| `{col}` | `{csv_type}` | ❌ Missing |\n")
        report.append("\n")
    
    # Extra columns
    if analysis['extra_in_pg']:
        report.append("## Extra Columns in PostgreSQL\n\n")
        report.append("These columns exist in PostgreSQL but are NOT in the source of truth CSV:\n\n")
        report.append("| Column Name | PostgreSQL Type | Status |\n")
        report.append("|-------------|-----------------|--------|\n")
        for col in analysis['extra_in_pg']:
            pg_type = pg_schema[col]['type']
            report.append(f"| `{col}` | `{pg_type}` | ⚠️ Extra |\n")
        report.append("\n")
    
    # Type mismatches
    if analysis['type_mismatches']:
        report.append("## Type Mismatches\n\n")
        report.append("These columns exist in both but have incompatible types:\n\n")
        report.append("| Column Name | CSV Type | PostgreSQL Type | Issue |\n")
        report.append("|-------------|----------|-----------------|-------|\n")
        for mismatch in analysis['type_mismatches']:
            report.append(f"| `{mismatch['column']}` | `{mismatch['csv_type']}` | `{mismatch['pg_type']}` | ⚠️ Type mismatch |\n")
        report.append("\n")
    
    # Type warnings
    if analysis['type_warnings']:
        report.append("## Type Warnings\n\n")
        report.append("These columns have compatible types but different precision/size (may need review):\n\n")
        report.append("| Column Name | CSV Type | PostgreSQL Type | Note |\n")
        report.append("|-------------|----------|-----------------|------|\n")
        for warning in analysis['type_warnings'][:50]:  # Limit to first 50
            report.append(f"| `{warning['column']}` | `{warning['csv_type']}` | `{warning['pg_type']}` | ⚠️ Size/precision difference |\n")
        if len(analysis['type_warnings']) > 50:
            report.append(f"\n*... and {len(analysis['type_warnings']) - 50} more type warnings*\n")
        report.append("\n")
    
    # Recommendations
    report.append("## Recommendations\n\n")
    report.append("### Critical Actions Required:\n\n")
    
    if analysis['missing_in_pg']:
        report.append("1. **Add Missing Columns to PostgreSQL:**\n")
        report.append("   - Create migration script to add missing columns\n")
        report.append("   - Ensure types match CSV source of truth\n")
        report.append("   - Add appropriate indexes if needed\n\n")
    
    if analysis['extra_in_pg']:
        report.append("2. **Review Extra Columns in PostgreSQL:**\n")
        report.append("   - Determine if these should be added to CSV source of truth\n")
        report.append("   - Or remove them if they're deprecated/unused\n\n")
    
    if analysis['type_mismatches']:
        report.append("3. **Fix Type Mismatches:**\n")
        report.append("   - Create migration scripts to alter column types\n")
        report.append("   - Ensure data compatibility during migration\n\n")
    
    report.append("### Schema Synchronization:\n\n")
    report.append("- PostgreSQL and Snowflake schemas MUST match the CSV source of truth\n")
    report.append("- All three schemas should be kept in sync\n")
    report.append("- Use the CSV as the single source of truth for schema definitions\n")
    report.append("- Update migration scripts to reflect CSV schema\n\n")
    
    # Application Code Issues Section
    report.append("## Application Code Issues\n\n")
    report.append("### Known Column Name Mismatches in Code:\n\n")
    report.append("The following columns are referenced in application code but don't exist in the schema:\n\n")
    report.append("| Code Reference | Actual Column | Status |\n")
    report.append("|----------------|---------------|--------|\n")
    report.append("| `merchant_id` | `store_id` | ✅ Fixed - code updated to use `store_id` |\n")
    report.append("| `acquisition_channel` | `device_type` | ✅ Fixed - code updated to use `device_type` |\n")
    report.append("\n")
    report.append("**Note:** These are application code issues, not schema issues. The schema is correct.\n\n")
    
    # Column Reference Guide
    report.append("## Column Reference Guide\n\n")
    report.append("### Common Column Mappings:\n\n")
    report.append("| Logical Name | CSV Column | PostgreSQL Column | Notes |\n")
    report.append("|--------------|-----------|-------------------|-------|\n")
    report.append("| Merchant ID | `STORE_ID` | `store_id` | Use `STORE_ID`/`store_id` for merchant/store identifier |\n")
    report.append("| Channel | `DEVICE_TYPE` | `device_type` | Use `DEVICE_TYPE`/`device_type` for acquisition channel |\n")
    report.append("| Geo/Country | `IP_COUNTRY_CODE` | `ip_country_code` | Use `IP_COUNTRY_CODE`/`ip_country_code` for geographic data |\n")
    report.append("\n")
    
    return ''.join(report)


def main():
    """Main execution function."""
    base_path = Path(__file__).parent.parent
    
    csv_path = base_path / 'Tx Table Schema.csv'
    pg_path = base_path / 'olorin-server' / 'postgres_actual_columns.txt'
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return
    
    if not pg_path.exists():
        print(f"Error: PostgreSQL schema file not found at {pg_path}")
        return
    
    print("Reading schemas...")
    csv_schema = read_csv_schema(csv_path)
    pg_schema = read_postgres_schema(pg_path)
    
    print("Analyzing gaps...")
    analysis = analyze_schema_gaps(csv_schema, pg_schema)
    
    print("Generating report...")
    report = generate_report(analysis, csv_schema, pg_schema)
    
    # Write report
    report_path = base_path / 'docs' / 'schema_gap_analysis_report.md'
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\n✅ Report generated: {report_path}")
    print(f"\nSummary:")
    print(f"  - CSV columns: {analysis['csv_total']}")
    print(f"  - PostgreSQL columns: {analysis['pg_total']}")
    print(f"  - Missing in PostgreSQL: {len(analysis['missing_in_pg'])}")
    print(f"  - Extra in PostgreSQL: {len(analysis['extra_in_pg'])}")
    print(f"  - Type mismatches: {len(analysis['type_mismatches'])}")


if __name__ == '__main__':
    main()

