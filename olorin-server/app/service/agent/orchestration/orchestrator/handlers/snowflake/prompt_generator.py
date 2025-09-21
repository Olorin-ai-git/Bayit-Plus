"""
Prompt Generator

Generates prompts for Snowflake analysis.
"""

from typing import Dict, Any

from app.service.agent.tools.snowflake_tool.schema_constants import (
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, IP_COUNTRY_CODE,
    DEVICE_ID, USER_AGENT, TX_DATETIME, TX_ID_KEY,
    MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, PAYMENT_METHOD,
    CARD_BRAND, BIN, LAST_FOUR, CARD_ISSUER, MAXMIND_RISK_SCORE,
    UNIQUE_USER_ID, FIRST_NAME, LAST_NAME, PHONE_NUMBER,
    DEVICE_TYPE, DEVICE_MODEL, DEVICE_OS_VERSION, PARSED_USER_AGENT
)


class PromptGenerator:
    """Generates prompts for Snowflake analysis."""

    @staticmethod
    def create_snowflake_prompt(state: Dict[str, Any], date_range_days: int) -> str:
        """Create the Snowflake query prompt."""
        return f"""
        You MUST use the snowflake_query_tool to analyze ALL data for the past {date_range_days} days.

        Entity to investigate: {state['entity_type']} = {state['entity_id']}

        Required Snowflake queries:
        1. Query FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED table for ALL records where:
           - {IP} = '{state['entity_id']}' (if entity is IP)
           - Or related fields match the entity
           - Date range: LAST {date_range_days} DAYS

        2. Retrieve COMPREHENSIVE evidence fields for thorough analysis:

           CORE TRANSACTION:
           - {TX_ID_KEY}, {TX_DATETIME}, {PAID_AMOUNT_VALUE_IN_CURRENCY}, {PAYMENT_METHOD}

           RISK & FRAUD ANALYSIS:
           - {MODEL_SCORE}, {IS_FRAUD_TX}, {NSURE_LAST_DECISION}, {MAXMIND_RISK_SCORE}
           - TRIGGERED_RULES, COUNT_TRIGGERED_RULES, RULE_DECISION

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
        """