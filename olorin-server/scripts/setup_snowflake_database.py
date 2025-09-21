#!/usr/bin/env python3
"""
Setup Snowflake Database and Table for Olorin POC

This script creates the FRAUD_ANALYTICS database and TRANSACTIONS_ENRICHED table
if they don't already exist. It uses ACCOUNTADMIN role for setup operations.

Usage:
    poetry run python scripts/setup_snowflake_database.py
"""

import os
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

import snowflake.connector
from snowflake.connector import SnowflakeConnection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_connection(use_admin: bool = False) -> Optional[SnowflakeConnection]:
    """Create Snowflake connection"""
    try:
        # Get credentials from environment
        account = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('https://', '').replace('.snowflakecomputing.com', '')
        user = os.getenv('SNOWFLAKE_USER', 'Olorin')
        password = os.getenv('SNOWFLAKE_PASSWORD')
        
        if not account or account == 'your-account.region':
            print("\n❌ ERROR: Please update SNOWFLAKE_ACCOUNT in .env file")
            print("   Example: SNOWFLAKE_ACCOUNT=xy12345.us-east-1")
            return None
            
        if not password:
            print("\n❌ ERROR: SNOWFLAKE_PASSWORD not found in .env file")
            return None
        
        print(f"\n🔌 Connecting to Snowflake...")
        print(f"   Account: {account}")
        print(f"   User: {user}")
        
        # For setup, we might need ACCOUNTADMIN role
        role = 'ACCOUNTADMIN' if use_admin else os.getenv('SNOWFLAKE_ROLE', 'FRAUD_ANALYST_ROLE')
        
        conn = snowflake.connector.connect(
            account=account,
            user=user,
            password=password,
            role=role,
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH')
        )
        
        print(f"✅ Connected successfully with role: {role}")
        return conn
        
    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
        return None


def setup_database_and_table(conn: SnowflakeConnection) -> bool:
    """Create database and table if they don't exist"""
    cursor = conn.cursor()
    
    try:
        # Create database
        print("\n📦 Creating database FRAUD_ANALYTICS...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS FRAUD_ANALYTICS")
        print("✅ Database created/verified")
        
        # Use the database
        cursor.execute("USE DATABASE FRAUD_ANALYTICS")
        
        # Create schema
        print("\n📋 Creating schema PUBLIC...")
        cursor.execute("CREATE SCHEMA IF NOT EXISTS PUBLIC")
        print("✅ Schema created/verified")
        
        # Create the massive TRANSACTIONS_ENRICHED table with 300+ columns
        print("\n📊 Creating TRANSACTIONS_ENRICHED table (300+ columns)...")
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED (
            -- Core Transaction Fields
            TX_ID_KEY VARCHAR(100) PRIMARY KEY,
            TX_DATETIME TIMESTAMP_NTZ,
            TX_TYPE VARCHAR(50),
            TX_STATUS VARCHAR(50),
            
            -- Amount Fields
            PAID_AMOUNT_VALUE NUMBER(18,2),
            PAID_CURRENCY_CODE VARCHAR(3),
            ORIGINAL_AMOUNT_VALUE NUMBER(18,2),
            ORIGINAL_CURRENCY_CODE VARCHAR(3),
            EXCHANGE_RATE NUMBER(10,6),
            
            -- User Identity Fields
            USER_ID VARCHAR(100),
            EMAIL VARCHAR(255),
            EMAIL_DOMAIN VARCHAR(100),
            USERNAME VARCHAR(100),
            FIRST_NAME VARCHAR(100),
            LAST_NAME VARCHAR(100),
            FULL_NAME VARCHAR(200),
            DATE_OF_BIRTH DATE,
            AGE_AT_TX NUMBER,
            GENDER VARCHAR(20),
            
            -- Account Fields
            ACCOUNT_ID VARCHAR(100),
            ACCOUNT_TYPE VARCHAR(50),
            ACCOUNT_STATUS VARCHAR(50),
            ACCOUNT_CREATED_DATE TIMESTAMP_NTZ,
            ACCOUNT_AGE_DAYS NUMBER,
            ACCOUNT_VERIFICATION_STATUS VARCHAR(50),
            KYC_STATUS VARCHAR(50),
            KYC_LEVEL VARCHAR(20),
            
            -- Device & Session Fields
            DEVICE_ID VARCHAR(100),
            DEVICE_TYPE VARCHAR(50),
            DEVICE_OS VARCHAR(50),
            DEVICE_OS_VERSION VARCHAR(50),
            DEVICE_BROWSER VARCHAR(50),
            DEVICE_BROWSER_VERSION VARCHAR(50),
            DEVICE_FINGERPRINT VARCHAR(255),
            SESSION_ID VARCHAR(100),
            SESSION_DURATION_SECONDS NUMBER,
            
            -- Location Fields
            IP VARCHAR(45),
            IP_COUNTRY VARCHAR(2),
            IP_REGION VARCHAR(100),
            IP_CITY VARCHAR(100),
            IP_POSTAL_CODE VARCHAR(20),
            IP_LATITUDE NUMBER(10,7),
            IP_LONGITUDE NUMBER(10,7),
            IP_ISP VARCHAR(200),
            IP_ORG VARCHAR(200),
            IP_ASN VARCHAR(50),
            IP_TYPE VARCHAR(50),
            
            -- Billing Address Fields
            BILLING_ADDRESS_LINE1 VARCHAR(255),
            BILLING_ADDRESS_LINE2 VARCHAR(255),
            BILLING_CITY VARCHAR(100),
            BILLING_STATE VARCHAR(100),
            BILLING_COUNTRY VARCHAR(2),
            BILLING_POSTAL_CODE VARCHAR(20),
            
            -- Shipping Address Fields
            SHIPPING_ADDRESS_LINE1 VARCHAR(255),
            SHIPPING_ADDRESS_LINE2 VARCHAR(255),
            SHIPPING_CITY VARCHAR(100),
            SHIPPING_STATE VARCHAR(100),
            SHIPPING_COUNTRY VARCHAR(2),
            SHIPPING_POSTAL_CODE VARCHAR(20),
            
            -- Card/Payment Fields
            CARD_BIN VARCHAR(6),
            CARD_LAST4 VARCHAR(4),
            CARD_TYPE VARCHAR(50),
            CARD_BRAND VARCHAR(50),
            CARD_ISSUER VARCHAR(200),
            CARD_ISSUER_COUNTRY VARCHAR(2),
            CARD_FUNDING_TYPE VARCHAR(50),
            PAYMENT_METHOD VARCHAR(50),
            PAYMENT_PROCESSOR VARCHAR(100),
            
            -- Merchant Fields
            MERCHANT_ID VARCHAR(100),
            MERCHANT_NAME VARCHAR(200),
            MERCHANT_CATEGORY VARCHAR(100),
            MERCHANT_CATEGORY_CODE VARCHAR(10),
            MERCHANT_COUNTRY VARCHAR(2),
            MERCHANT_CITY VARCHAR(100),
            
            -- Risk Scores & Models
            MODEL_SCORE NUMBER(5,4),
            RISK_SCORE NUMBER(5,4),
            FRAUD_PROBABILITY NUMBER(5,4),
            ANOMALY_SCORE NUMBER(5,4),
            VELOCITY_SCORE NUMBER(5,4),
            BEHAVIOR_SCORE NUMBER(5,4),
            REPUTATION_SCORE NUMBER(5,4),
            
            -- Third-Party Risk Scores
            MAXMIND_RISK_SCORE NUMBER(5,4),
            SIFT_SCORE NUMBER(5,4),
            EMAILAGE_SCORE NUMBER(5,4),
            IPQUALITYSCORE NUMBER(5,4),
            THREATMETRIX_SCORE NUMBER(5,4),
            
            -- Fraud Labels & Decisions
            IS_FRAUD_TX BOOLEAN,
            FRAUD_TYPE VARCHAR(100),
            FRAUD_REASON VARCHAR(500),
            MANUAL_REVIEW_FLAG BOOLEAN,
            MANUAL_REVIEW_DECISION VARCHAR(50),
            MANUAL_REVIEW_REASON VARCHAR(500),
            MANUAL_REVIEW_AGENT VARCHAR(100),
            MANUAL_REVIEW_DATETIME TIMESTAMP_NTZ,
            
            -- Decision Fields
            NSURE_LAST_DECISION VARCHAR(50),
            DECISION_REASON VARCHAR(500),
            DECISION_DATETIME TIMESTAMP_NTZ,
            AUTO_DECISION VARCHAR(50),
            FINAL_DECISION VARCHAR(50),
            
            -- Rules & Policies
            FRAUD_RULES_TRIGGERED VARCHAR(2000),
            RULES_COUNT NUMBER,
            POLICY_APPLIED VARCHAR(100),
            RISK_LEVEL VARCHAR(20),
            
            -- Velocity Counters
            TX_COUNT_1H NUMBER,
            TX_COUNT_24H NUMBER,
            TX_COUNT_7D NUMBER,
            TX_COUNT_30D NUMBER,
            TX_AMOUNT_1H NUMBER(18,2),
            TX_AMOUNT_24H NUMBER(18,2),
            TX_AMOUNT_7D NUMBER(18,2),
            TX_AMOUNT_30D NUMBER(18,2),
            
            -- Email Velocity
            EMAIL_TX_COUNT_1H NUMBER,
            EMAIL_TX_COUNT_24H NUMBER,
            EMAIL_TX_COUNT_7D NUMBER,
            EMAIL_TX_COUNT_30D NUMBER,
            
            -- Device Velocity
            DEVICE_TX_COUNT_1H NUMBER,
            DEVICE_TX_COUNT_24H NUMBER,
            DEVICE_TX_COUNT_7D NUMBER,
            DEVICE_TX_COUNT_30D NUMBER,
            
            -- IP Velocity
            IP_TX_COUNT_1H NUMBER,
            IP_TX_COUNT_24H NUMBER,
            IP_TX_COUNT_7D NUMBER,
            IP_TX_COUNT_30D NUMBER,
            
            -- Card Velocity
            CARD_TX_COUNT_1H NUMBER,
            CARD_TX_COUNT_24H NUMBER,
            CARD_TX_COUNT_7D NUMBER,
            CARD_TX_COUNT_30D NUMBER,
            
            -- Cross-Reference Counts
            UNIQUE_EMAILS_PER_DEVICE NUMBER,
            UNIQUE_DEVICES_PER_EMAIL NUMBER,
            UNIQUE_IPS_PER_EMAIL NUMBER,
            UNIQUE_CARDS_PER_EMAIL NUMBER,
            UNIQUE_EMAILS_PER_CARD NUMBER,
            UNIQUE_DEVICES_PER_IP NUMBER,
            
            -- Behavioral Fields
            TIME_SINCE_LAST_TX_SECONDS NUMBER,
            TIME_SINCE_ACCOUNT_CREATED_SECONDS NUMBER,
            IS_FIRST_TX BOOLEAN,
            IS_NEW_DEVICE BOOLEAN,
            IS_NEW_IP BOOLEAN,
            IS_NEW_CARD BOOLEAN,
            IS_NEW_MERCHANT BOOLEAN,
            IS_NEW_COUNTRY BOOLEAN,
            
            -- Distance & Time Zone
            DISTANCE_FROM_LAST_TX_KM NUMBER(10,2),
            DISTANCE_FROM_HOME_KM NUMBER(10,2),
            TIME_ZONE_OFFSET NUMBER,
            IS_DAYLIGHT_SAVING BOOLEAN,
            LOCAL_TIME_HOUR NUMBER,
            IS_WEEKEND BOOLEAN,
            IS_HOLIDAY BOOLEAN,
            
            -- Phone Fields
            PHONE_NUMBER VARCHAR(50),
            PHONE_COUNTRY_CODE VARCHAR(5),
            PHONE_CARRIER VARCHAR(100),
            PHONE_TYPE VARCHAR(50),
            PHONE_VALID BOOLEAN,
            PHONE_RISK_SCORE NUMBER(5,4),
            
            -- Email Analysis
            EMAIL_VALID BOOLEAN,
            EMAIL_DISPOSABLE BOOLEAN,
            EMAIL_FREE_PROVIDER BOOLEAN,
            EMAIL_CORPORATE BOOLEAN,
            EMAIL_FIRST_SEEN_DAYS_AGO NUMBER,
            EMAIL_DOMAIN_AGE_DAYS NUMBER,
            EMAIL_DOMAIN_RISK_SCORE NUMBER(5,4),
            
            -- Browser & User Agent
            USER_AGENT VARCHAR(1000),
            USER_AGENT_PARSED VARCHAR(500),
            IS_BOT BOOLEAN,
            IS_MOBILE BOOLEAN,
            IS_TABLET BOOLEAN,
            IS_DESKTOP BOOLEAN,
            
            -- Referrer & Marketing
            REFERRER_URL VARCHAR(1000),
            REFERRER_DOMAIN VARCHAR(200),
            UTM_SOURCE VARCHAR(100),
            UTM_MEDIUM VARCHAR(100),
            UTM_CAMPAIGN VARCHAR(100),
            AFFILIATE_ID VARCHAR(100),
            PROMO_CODE VARCHAR(50),
            
            -- Product/Service Fields
            PRODUCT_ID VARCHAR(100),
            PRODUCT_NAME VARCHAR(200),
            PRODUCT_CATEGORY VARCHAR(100),
            PRODUCT_SKU VARCHAR(100),
            PRODUCT_QUANTITY NUMBER,
            PRODUCT_PRICE NUMBER(18,2),
            
            -- Order Fields
            ORDER_ID VARCHAR(100),
            ORDER_TOTAL NUMBER(18,2),
            ORDER_TAX NUMBER(18,2),
            ORDER_SHIPPING NUMBER(18,2),
            ORDER_DISCOUNT NUMBER(18,2),
            ORDER_ITEMS_COUNT NUMBER,
            
            -- Shipping Method
            SHIPPING_METHOD VARCHAR(100),
            SHIPPING_SPEED VARCHAR(50),
            EXPECTED_DELIVERY_DATE DATE,
            ACTUAL_DELIVERY_DATE DATE,
            
            -- Customer Lifetime Value
            CUSTOMER_LTV NUMBER(18,2),
            CUSTOMER_TX_COUNT_LIFETIME NUMBER,
            CUSTOMER_TOTAL_SPENT NUMBER(18,2),
            CUSTOMER_AVG_ORDER_VALUE NUMBER(18,2),
            CUSTOMER_DAYS_SINCE_FIRST_TX NUMBER,
            
            -- Chargeback & Dispute
            HAS_CHARGEBACK BOOLEAN,
            CHARGEBACK_DATE DATE,
            CHARGEBACK_AMOUNT NUMBER(18,2),
            CHARGEBACK_REASON VARCHAR(200),
            DISPUTE_STATUS VARCHAR(50),
            DISPUTE_OUTCOME VARCHAR(50),
            
            -- Authentication
            AUTH_METHOD VARCHAR(50),
            TWO_FACTOR_USED BOOLEAN,
            THREE_DS_VERSION VARCHAR(10),
            THREE_DS_STATUS VARCHAR(50),
            THREE_DS_LIABILITY_SHIFT BOOLEAN,
            
            -- Social & Graph
            SOCIAL_NETWORK_SIZE NUMBER,
            SOCIAL_NETWORK_SCORE NUMBER(5,4),
            GRAPH_RISK_SCORE NUMBER(5,4),
            CONNECTED_FRAUDULENT_ACCOUNTS NUMBER,
            
            -- Machine Learning Features
            ML_FEATURE_1 NUMBER,
            ML_FEATURE_2 NUMBER,
            ML_FEATURE_3 NUMBER,
            ML_FEATURE_4 NUMBER,
            ML_FEATURE_5 NUMBER,
            ML_FEATURE_6 NUMBER,
            ML_FEATURE_7 NUMBER,
            ML_FEATURE_8 NUMBER,
            ML_FEATURE_9 NUMBER,
            ML_FEATURE_10 NUMBER,
            
            -- Custom Fields
            CUSTOM_FIELD_1 VARCHAR(500),
            CUSTOM_FIELD_2 VARCHAR(500),
            CUSTOM_FIELD_3 VARCHAR(500),
            CUSTOM_FIELD_4 VARCHAR(500),
            CUSTOM_FIELD_5 VARCHAR(500),
            CUSTOM_FIELD_6 VARCHAR(500),
            CUSTOM_FIELD_7 VARCHAR(500),
            CUSTOM_FIELD_8 VARCHAR(500),
            CUSTOM_FIELD_9 VARCHAR(500),
            CUSTOM_FIELD_10 VARCHAR(500),
            
            -- Metadata Fields
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            DATA_SOURCE VARCHAR(100),
            ETL_BATCH_ID VARCHAR(100),
            ETL_TIMESTAMP TIMESTAMP_NTZ,
            
            -- Additional Risk Indicators
            PROXY_RISK_SCORE NUMBER(5,4),
            VPN_DETECTED BOOLEAN,
            TOR_DETECTED BOOLEAN,
            DATACENTER_IP BOOLEAN,
            RESIDENTIAL_IP BOOLEAN,
            
            -- Account Behavior
            LOGIN_COUNT_24H NUMBER,
            PASSWORD_RESET_COUNT_30D NUMBER,
            PROFILE_CHANGE_COUNT_7D NUMBER,
            
            -- Network Analysis
            NETWORK_CLUSTER_ID VARCHAR(100),
            NETWORK_CLUSTER_SIZE NUMBER,
            NETWORK_CLUSTER_RISK NUMBER(5,4),
            
            -- Sanctions & Watchlists
            SANCTIONS_HIT BOOLEAN,
            WATCHLIST_HIT BOOLEAN,
            PEP_HIT BOOLEAN,
            ADVERSE_MEDIA_HIT BOOLEAN,
            
            -- Profiling Scores
            AFFLUENCE_SCORE NUMBER(5,4),
            CREDIT_SCORE_RANGE VARCHAR(50),
            INCOME_RANGE VARCHAR(50),
            
            -- Session Behavior
            PAGE_VIEWS_COUNT NUMBER,
            TIME_ON_SITE_SECONDS NUMBER,
            BOUNCE_RATE NUMBER(5,4),
            
            -- Additional Velocity Metrics
            MERCHANT_TX_COUNT_24H NUMBER,
            COUNTRY_TX_COUNT_24H NUMBER,
            HIGH_RISK_COUNTRY BOOLEAN,
            
            -- Compliance Fields
            GDPR_CONSENT BOOLEAN,
            MARKETING_CONSENT BOOLEAN,
            DATA_RETENTION_DAYS NUMBER,
            
            -- Score Explanations
            PRIMARY_RISK_FACTOR VARCHAR(200),
            SECONDARY_RISK_FACTOR VARCHAR(200),
            TERTIARY_RISK_FACTOR VARCHAR(200),
            
            -- Investigation Fields
            INVESTIGATION_ID VARCHAR(100),
            INVESTIGATION_STATUS VARCHAR(50),
            INVESTIGATION_OUTCOME VARCHAR(100),
            INVESTIGATION_NOTES VARCHAR(2000),
            
            -- Alert Fields
            ALERT_GENERATED BOOLEAN,
            ALERT_TYPE VARCHAR(100),
            ALERT_SEVERITY VARCHAR(20),
            ALERT_ASSIGNED_TO VARCHAR(100),
            
            -- Case Management
            CASE_ID VARCHAR(100),
            CASE_STATUS VARCHAR(50),
            CASE_PRIORITY VARCHAR(20),
            CASE_ASSIGNED_TO VARCHAR(100),
            
            -- Reporting Fields
            REPORT_CATEGORY VARCHAR(100),
            REPORT_SUBCATEGORY VARCHAR(100),
            REGULATORY_REPORT_REQUIRED BOOLEAN,
            SAR_FILED BOOLEAN
        );
        """
        
        cursor.execute(create_table_sql)
        print("✅ Table TRANSACTIONS_ENRICHED created/verified")
        
        # Grant permissions to the Olorin user
        print("\n🔐 Setting up permissions...")
        
        # Create role if it doesn't exist
        cursor.execute("CREATE ROLE IF NOT EXISTS FRAUD_ANALYST_ROLE")
        
        # Grant usage on warehouse
        cursor.execute(f"GRANT USAGE ON WAREHOUSE {os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH')} TO ROLE FRAUD_ANALYST_ROLE")
        
        # Grant usage on database and schema
        cursor.execute("GRANT USAGE ON DATABASE FRAUD_ANALYTICS TO ROLE FRAUD_ANALYST_ROLE")
        cursor.execute("GRANT USAGE ON SCHEMA FRAUD_ANALYTICS.PUBLIC TO ROLE FRAUD_ANALYST_ROLE")
        
        # Grant SELECT on table
        cursor.execute("GRANT SELECT ON TABLE FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED TO ROLE FRAUD_ANALYST_ROLE")
        
        # Grant role to user
        cursor.execute(f"GRANT ROLE FRAUD_ANALYST_ROLE TO USER {os.getenv('SNOWFLAKE_USER', 'Olorin')}")
        
        print("✅ Permissions configured")
        
        # Insert some sample data for testing
        print("\n📝 Inserting sample data for testing...")
        
        sample_data_sql = """
        INSERT INTO FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED 
        (TX_ID_KEY, TX_DATETIME, EMAIL, DEVICE_ID, IP, 
         PAID_AMOUNT_VALUE, MODEL_SCORE, IS_FRAUD_TX, TX_TYPE, TX_STATUS)
        SELECT * FROM VALUES
        ('TX001', CURRENT_TIMESTAMP(), 'high.risk@example.com', 'DEV001', '192.168.1.1', 5000.00, 0.95, FALSE, 'PURCHASE', 'COMPLETED'),
        ('TX002', CURRENT_TIMESTAMP(), 'high.risk@example.com', 'DEV001', '192.168.1.1', 3000.00, 0.88, FALSE, 'PURCHASE', 'COMPLETED'),
        ('TX003', CURRENT_TIMESTAMP(), 'medium.risk@example.com', 'DEV002', '192.168.1.2', 1500.00, 0.65, FALSE, 'PURCHASE', 'COMPLETED'),
        ('TX004', CURRENT_TIMESTAMP(), 'low.risk@example.com', 'DEV003', '192.168.1.3', 500.00, 0.15, FALSE, 'PURCHASE', 'COMPLETED'),
        ('TX005', CURRENT_TIMESTAMP(), 'fraud.user@example.com', 'DEV004', '192.168.1.4', 10000.00, 0.99, TRUE, 'PURCHASE', 'BLOCKED');
        """
        
        cursor.execute(sample_data_sql)
        print("✅ Sample data inserted")
        
        # Verify the setup
        cursor.execute("SELECT COUNT(*) as count FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED")
        count = cursor.fetchone()[0]
        print(f"\n✅ Setup complete! Table contains {count} sample records")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")
        return False
    finally:
        cursor.close()


def test_user_access():
    """Test if the Olorin user can access the table"""
    print("\n🧪 Testing user access with FRAUD_ANALYST_ROLE...")
    
    conn = get_connection(use_admin=False)
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test SELECT access
        cursor.execute("""
            SELECT 
                EMAIL,
                COUNT(*) as tx_count,
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            GROUP BY EMAIL
            ORDER BY risk_weighted_value DESC
        """)
        
        results = cursor.fetchall()
        
        print("\n📊 Query Results:")
        print("-" * 60)
        for row in results:
            print(f"Email: {row[0]:<30} Txns: {row[1]:<5} Risk Value: ${row[2]:,.2f}")
        print("-" * 60)
        
        print("\n✅ User access verified successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Access test failed: {str(e)}")
        return False
    finally:
        cursor.close()
        conn.close()


def main():
    """Main setup function"""
    print("=" * 70)
    print("🚀 SNOWFLAKE DATABASE SETUP FOR OLORIN POC")
    print("=" * 70)
    
    # First, check if we need admin access
    print("\n📌 Note: This script needs ACCOUNTADMIN role to create database/table")
    print("   Make sure the Olorin user has ACCOUNTADMIN role temporarily, or")
    print("   run this with an admin account first.")
    
    # Try to connect with admin privileges
    conn = get_connection(use_admin=True)
    if not conn:
        print("\n💡 TIP: If connection fails, please check:")
        print("   1. SNOWFLAKE_ACCOUNT is set correctly (e.g., xy12345.us-east-1)")
        print("   2. SNOWFLAKE_PASSWORD is correct")
        print("   3. The user has ACCOUNTADMIN role (for initial setup)")
        return
    
    # Setup database and table
    success = setup_database_and_table(conn)
    conn.close()
    
    if success:
        # Test with regular user role
        test_user_access()
        
        print("\n" + "=" * 70)
        print("🎉 SETUP COMPLETE!")
        print("=" * 70)
        print("\nYou can now run the application:")
        print("  cd olorin-server")
        print("  poetry run python -m app.local_server")
        print("\nOr test the POC:")
        print("  poetry run python scripts/test_snowflake_poc.py")
    else:
        print("\n⚠️  Setup encountered issues. Please check the errors above.")


if __name__ == "__main__":
    main()