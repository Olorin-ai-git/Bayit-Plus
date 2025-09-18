#!/usr/bin/env python3
"""
Test direct Snowflake query to debug the issue.
"""

import os
import snowflake.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def main():
    print("\n" + "="*70)
    print("🔍 TESTING DIRECT SNOWFLAKE QUERY")
    print("="*70)
    
    # Connect to Snowflake
    conn = snowflake.connector.connect(
        account=os.getenv('SNOWFLAKE_ACCOUNT', '').replace('https://', '').replace('.snowflakecomputing.com', ''),
        user=os.getenv('SNOWFLAKE_USER'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        database=os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS'),
        schema=os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC'),
        warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
        role=os.getenv('SNOWFLAKE_ROLE', 'FRAUD_ANALYST_ROLE')
    )
    
    cursor = conn.cursor()
    
    # This is the query the risk analyzer uses
    hours = 7 * 24  # 7 days
    group_by = 'EMAIL'
    top_decimal = 0.1  # 10%

    # Get table configuration from environment
    database = os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
    table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')

    query = f"""
    WITH risk_calculations AS (
        SELECT
            {group_by} as entity,
            COUNT(*) as transaction_count,
            SUM(PAID_AMOUNT_VALUE) as total_amount,
            AVG(MODEL_SCORE) as avg_risk_score,
            SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value,
            MAX(MODEL_SCORE) as max_risk_score,
            MIN(MODEL_SCORE) as min_risk_score,
            SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count,
            SUM(CASE WHEN TX_STATUS = 'BLOCKED' THEN 1 ELSE 0 END) as rejected_count,
            MAX(TX_DATETIME) as last_transaction,
            MIN(TX_DATETIME) as first_transaction
        FROM {database}.{schema}.{table}
        WHERE TX_DATETIME >= DATEADD(hour, -{hours}, CURRENT_TIMESTAMP())
            AND {group_by} IS NOT NULL
        GROUP BY {group_by}
        HAVING COUNT(*) >= 1
    ),
    ranked AS (
        SELECT *,
            ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
            COUNT(*) OVER() as total_entities,
            PERCENT_RANK() OVER (ORDER BY risk_weighted_value DESC) as percentile
        FROM risk_calculations
    )
    SELECT * FROM ranked
    WHERE risk_rank <= CEIL(total_entities * {top_decimal})
    ORDER BY risk_weighted_value DESC
    """
    
    print("\nExecuting query...")
    print(f"Time filter: Last {hours} hours")
    print(f"Group by: {group_by}")
    print(f"Top percentage: {top_decimal * 100}%")
    
    cursor.execute(query)
    results = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    
    print(f"\nFound {len(results)} results")
    print("\nColumn names:", columns)
    
    if results:
        print("\n🎯 Top Risk Entities:")
        print(f"{'Rank':<6} {'Entity':<30} {'Risk Value':<15} {'Txns':<6} {'Risk Score'}")
        print("-"*75)
        
        for row in results:
            # Convert row to dict for easier access
            data = dict(zip(columns, row))
            rank = data.get('RISK_RANK', 0)
            entity = data.get('ENTITY', 'Unknown')
            risk_value = data.get('RISK_WEIGHTED_VALUE', 0)
            tx_count = data.get('TRANSACTION_COUNT', 0)
            avg_risk = data.get('AVG_RISK_SCORE', 0)
            
            print(f"{rank:<6} {entity:<30} ${risk_value:<14,.2f} {tx_count:<6} {avg_risk:.4f}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*70)


if __name__ == "__main__":
    main()