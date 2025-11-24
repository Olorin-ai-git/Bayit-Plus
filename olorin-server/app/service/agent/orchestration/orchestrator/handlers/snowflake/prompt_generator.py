"""
Prompt Generator

Generates prompts for Snowflake analysis.
"""

import os
from typing import Dict, Any

from app.service.agent.tools.snowflake_tool.schema_constants import (
<<<<<<< HEAD
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, IP_COUNTRY_CODE,
=======
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, IP_COUNTRY_CODE, EMAIL,
>>>>>>> 001-modify-analyzer-method
    DEVICE_ID, USER_AGENT, TX_DATETIME, TX_ID_KEY,
    MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, PAYMENT_METHOD,
    CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, MAXMIND_RISK_SCORE,
    UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER,
    DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION, PARSED_USER_AGENT,
    get_full_table_name
)


class PromptGenerator:
    """Generates prompts for Snowflake analysis."""

    @staticmethod
    def create_snowflake_prompt(state: Dict[str, Any], date_range_days: int) -> str:
        """Create the Snowflake query prompt."""
<<<<<<< HEAD
        return f"""
        You MUST use the snowflake_query_tool to analyze ALL data for the past {date_range_days} days.

        Entity to investigate: {state['entity_type']} = {state['entity_id']}

        Required Snowflake queries:
        1. Query {get_full_table_name()} table for ALL records where:
           - {IP} = '{state['entity_id']}' (if entity is IP)
           - Or related fields match the entity
           - Date range: LAST {date_range_days} DAYS
=======
        # Check if explicit time_range is provided
        time_range = state.get('time_range')

        if time_range:
            date_range_description = f"between {time_range['start_time']} and {time_range['end_time']}"
            date_range_instruction = f"Date range: {time_range['start_time']} to {time_range['end_time']}"
        else:
            date_range_description = f"for the past {date_range_days} days"
            date_range_instruction = f"Date range: LAST {date_range_days} DAYS"

        # Map entity_type to database column name dynamically
        entity_type = state.get('entity_type', 'unknown').lower()
        database_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        
        if database_provider == 'snowflake':
            # Snowflake: uppercase column names
            entity_column_map = {
                'ip': IP,
                'email': EMAIL,
                'device': DEVICE_ID,
                'device_id': DEVICE_ID,
                'phone': 'PHONE_NUMBER',
                'user_id': UNIQUE_USER_ID
            }
        else:
            # PostgreSQL: lowercase column names
            entity_column_map = {
                'ip': 'ip',
                'email': 'email',
                'device': 'device_id',
                'device_id': 'device_id',
                'phone': 'phone_number',
                'user_id': 'unique_user_id'
            }
        
        # Get the appropriate column name for the entity type
        entity_column = entity_column_map.get(entity_type, entity_type.upper() if database_provider == 'snowflake' else entity_type)
        
        return f"""
        You MUST use the database_query tool to analyze ALL data {date_range_description}.
        The database_query tool works with both Snowflake and PostgreSQL databases.
        
        CRITICAL INSTRUCTIONS:
        1. You MUST call the database_query tool - this is the ONLY available tool for data retrieval
        2. Do NOT provide a text response without calling database_query
        3. The tool name is exactly: "database_query"
        4. Use SQL SELECT queries to retrieve transaction data

        Entity to investigate: {state['entity_type']} = {state['entity_id']}

        Required database queries:
        1. Query {get_full_table_name()} table for ALL records where:
           - {entity_column} = '{state['entity_id']}' (entity type: {entity_type})
           - {date_range_instruction}
>>>>>>> 001-modify-analyzer-method

        2. Retrieve COMPREHENSIVE evidence fields for thorough analysis:

           CORE TRANSACTION:
           - {TX_ID_KEY}, {TX_DATETIME}, {PAID_AMOUNT_VALUE_IN_CURRENCY}, {PAYMENT_METHOD}

           RISK & FRAUD ANALYSIS:
<<<<<<< HEAD
           - {MODEL_SCORE}, {IS_FRAUD_TX}, {NSURE_LAST_DECISION}, {MAXMIND_RISK_SCORE}
           - TRIGGERED_RULES, COUNT_TRIGGERED_RULES, RULE_DECISION
=======
           - {NSURE_LAST_DECISION}, {MAXMIND_RISK_SCORE}
           - TRIGGERED_RULES, COUNT_TRIGGERED_RULES, RULE_DECISION
           - CRITICAL: MODEL_SCORE, IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS excluded to prevent data leakage
>>>>>>> 001-modify-analyzer-method

           USER IDENTITY:
           - {UNIQUE_USER_ID}, {FIRST_NAME}, {LAST_NAME}, {PHONE_NUMBER}
           - EMAIL_FIRST_SEEN, DAYS_FROM_FIRST_EMAIL_SEEN_TO_TX

           DEVICE ANALYSIS:
           - {DEVICE_ID}, {USER_AGENT}, {DEVICE_TYPE}, {DEVICE_MODEL}
           - {DEVICE_OS_VERSION}, {PARSED_USER_AGENT}, IS_DEVICE_ID_AUTHENTICATED

           NETWORK & LOCATION:
           - {IP}, {IP_COUNTRY_CODE}, ASN, ISP, MAXMIND_IP_RISK_SCORE

           PAYMENT METHOD:
           - {CARD_BRAND}, {BIN}, {LAST_FOUR}, {CARD_ISSUER}
           - CARD_TYPE, IS_CARD_COMMERCIAL, IS_CARD_PREPAID

           FRAUD HISTORY:
<<<<<<< HEAD
           - DISPUTES, COUNT_DISPUTES, FRAUD_ALERTS, COUNT_FRAUD_ALERTS
           - LAST_DISPUTE_REASON, IS_LAST_DISPUTE_FRAUD_RELATED_REASON

        3. Look for:
           - High risk scores (MODEL_SCORE > 0.7)
           - Confirmed fraud transactions (IS_FRAUD_TX = true)
           - Rejected transactions (NSURE_LAST_DECISION = 'reject')
           - Unusual patterns or anomalies
           - Related entities (other IPs, devices, users)

        This is MANDATORY - you MUST query Snowflake before any other analysis.
        Use SQL to get comprehensive {date_range_days}-day data.
=======
           - CRITICAL: All fraud outcome columns (DISPUTES, COUNT_DISPUTES, FRAUD_ALERTS, COUNT_FRAUD_ALERTS, etc.) excluded to prevent data leakage
           - Only behavioral fields available: NSURE_LAST_DECISION, TRIGGERED_RULES

        3. Look for:
           - Rejected transactions (NSURE_LAST_DECISION = 'reject' or 'block')
           - Unusual patterns or anomalies
           - Behavioral indicators (velocity, device changes, IP changes, etc.)
           - CRITICAL: Do NOT use MODEL_SCORE, IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, or any fraud outcome columns - these are excluded to prevent data leakage
           - Related entities (other IPs, devices, users)

        This is MANDATORY - you MUST query the database using the database_query tool before any other analysis.
        Use SQL to get comprehensive data {date_range_description}.
        
        CRITICAL: You MUST call the database_query tool. Do NOT provide a text response without calling the tool.
        The database_query tool is the ONLY way to retrieve transaction data for this investigation.
>>>>>>> 001-modify-analyzer-method
        """