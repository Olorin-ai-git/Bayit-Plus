"""
Snowflake database schema information and common queries.
Contains the comprehensive schema mapping for the TRANSACTIONS_ENRICHED table.
"""

# Comprehensive Snowflake table schema for fraud detection platform
SNOWFLAKE_SCHEMA_INFO = {
    "main_table": "TRANSACTIONS_ENRICHED",
    "key_columns": {
        # Core Transaction Fields
        "transaction_id": "TX_ID_KEY",
        "original_tx_id": "ORIGINAL_TX_ID", 
        "store_id": "STORE_ID",
        "app_id": "APP_ID",
        "tx_datetime": "TX_DATETIME",
        "event_type": "EVENT_TYPE",
        
        # User Information
        "user_id": "UNIQUE_USER_ID",
        "email": "EMAIL",
        "email_normalized": "EMAIL_NORMALIZED", 
        "first_name": "FIRST_NAME",
        "last_name": "LAST_NAME",
        "phone": "PHONE_NUMBER",
        "phone_country": "PHONE_COUNTRY_CODE",
        "date_of_birth": "DATE_OF_BIRTH",
        
        # Payment Information
        "payment_method": "PAYMENT_METHOD",
        "card_bin": "BIN",
        "last_four": "LAST_FOUR",
        "card_brand": "CARD_BRAND",
        "card_type": "CARD_TYPE",
        "card_issuer": "CARD_ISSUER",
        "processor": "PROCESSOR",
        "paypal_email": "PAYPAL_EMAIL",
        
        # Financial Data
        "paid_amount": "PAID_AMOUNT_VALUE_IN_CURRENCY",
        "paid_currency": "PAID_AMOUNT_CURRENCY", 
        "processing_fee": "PROCESSING_FEE_VALUE_IN_CURRENCY",
        "paid_amount_value": "PAID_AMOUNT_VALUE",
        
        # Location & Session Data
        "ip_address": "IP",
        "ip_country": "IP_COUNTRY_CODE",
        "user_agent": "USER_AGENT",
        "device_id": "DEVICE_ID",
        "device_type": "DEVICE_TYPE",
        
        # Risk & Decision Data
        "nsure_decision": "NSURE_LAST_DECISION",
        "nsure_decision_datetime": "NSURE_LAST_DECISION_DATETIME",
        "model_score": "MODEL_SCORE",
        "model_decision": "MODEL_DECISION",
        "risk_score": "MAXMIND_RISK_SCORE",
        "triggered_rules": "FRAUD_RULES_TRIGGERED",
        
        # Fraud Indicators
        "is_fraud": "IS_FRAUD_TX",
        "fraud_status_datetime": "FIRST_FRAUD_STATUS_DATETIME",
        "disputes": "DISPUTES",
        "dispute_count": "COUNT_DISPUTES",
        "fraud_alerts": "FRAUD_ALERTS",
        "fraud_alert_count": "COUNT_FRAUD_ALERTS",
        
        # Cart & Product Data
        "cart": "CART",
        "cart_items": "CART_ITEMS_TYPES",
        "product": "PRODUCT",
        "product_type": "PRODUCT_TYPE",
        "is_digital": "IS_DIGITAL",
        "is_gifting": "IS_GIFTING",
        
        # Merchant Data
        "merchant_name": "MERCHANT_NAME",
        "partner_name": "PARTNER_NAME",
        "merchant_segment": "MERCHANT_SEGMENT_ID",
        
        # Timestamps
        "created_at": "TABLE_RECORD_CREATED_AT",
        "updated_at": "TABLE_RECORD_UPDATED_AT",
        "uploaded_to_snowflake": "TX_UPLOADED_TO_SNOWFLAKE"
    },
    
    "common_queries": {
        "fraud_transactions": """
            SELECT TX_ID_KEY, EMAIL, NSURE_LAST_DECISION, MODEL_SCORE, IS_FRAUD_TX, 
                   TX_DATETIME, PAID_AMOUNT_VALUE, FRAUD_RULES_TRIGGERED
            FROM TRANSACTIONS_ENRICHED 
            WHERE IS_FRAUD_TX = 1 
            ORDER BY TX_DATETIME DESC
        """,
        
        "high_risk_scores": """
            SELECT TX_ID_KEY, EMAIL, MODEL_SCORE, MAXMIND_RISK_SCORE, 
                   NSURE_LAST_DECISION, TX_DATETIME, PAID_AMOUNT_VALUE
            FROM TRANSACTIONS_ENRICHED 
            WHERE MODEL_SCORE > 0.8 OR MAXMIND_RISK_SCORE > 80
            ORDER BY MODEL_SCORE DESC, MAXMIND_RISK_SCORE DESC
        """,
        
        "disputed_transactions": """
            SELECT TX_ID_KEY, EMAIL, COUNT_DISPUTES, LAST_DISPUTE_STATUS,
                   LAST_DISPUTE_REASON, PAID_AMOUNT_VALUE, TX_DATETIME
            FROM TRANSACTIONS_ENRICHED 
            WHERE COUNT_DISPUTES > 0
            ORDER BY COUNT_DISPUTES DESC, TX_DATETIME DESC
        """,
        
        "user_transaction_history": """
            SELECT TX_ID_KEY, TX_DATETIME, PAID_AMOUNT_VALUE, NSURE_LAST_DECISION,
                   MODEL_SCORE, PAYMENT_METHOD, IS_FRAUD_TX
            FROM TRANSACTIONS_ENRICHED 
            WHERE EMAIL = '{email}' OR UNIQUE_USER_ID = '{user_id}'
            ORDER BY TX_DATETIME DESC
        """,
        
        "payment_method_analysis": """
            SELECT PAYMENT_METHOD, CARD_BRAND, CARD_ISSUER, BIN_COUNTRY_CODE,
                   COUNT(*) as transaction_count,
                   AVG(MODEL_SCORE) as avg_risk_score,
                   SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
                   SUM(PAID_AMOUNT_VALUE) as total_amount
            FROM TRANSACTIONS_ENRICHED 
            WHERE TX_DATETIME >= DATEADD(day, -30, CURRENT_DATE())
            GROUP BY PAYMENT_METHOD, CARD_BRAND, CARD_ISSUER, BIN_COUNTRY_CODE
            ORDER BY fraud_count DESC, avg_risk_score DESC
        """
    }
}