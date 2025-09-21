"""
Prompt Generator

Generates prompts for Snowflake analysis.
"""

from typing import Dict, Any

from app.service.agent.tools.snowflake_tool.schema_constants import (
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, IP_COUNTRY_CODE,
    DEVICE_ID, USER_AGENT, TX_DATETIME, TX_ID_KEY,
    MODEL_SCORE, IS_FRAUD_TX, NSURE_LAST_DECISION, PAYMENT_METHOD
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

        2. Retrieve these key fields:
           - {TX_ID_KEY}, {TX_DATETIME}
           - {MODEL_SCORE}, {IS_FRAUD_TX}
           - {NSURE_LAST_DECISION}
           - {PAID_AMOUNT_VALUE_IN_CURRENCY}, {PAYMENT_METHOD}
           - {IP_COUNTRY_CODE}
           - {DEVICE_ID}, {USER_AGENT}
           - Any fraud indicators

        3. Look for:
           - High risk scores (MODEL_SCORE > 0.7)
           - Confirmed fraud transactions (IS_FRAUD_TX = true)
           - Rejected transactions (NSURE_LAST_DECISION = 'reject')
           - Unusual patterns or anomalies
           - Related entities (other IPs, devices, users)

        This is MANDATORY - you MUST query Snowflake before any other analysis.
        Use SQL to get comprehensive {date_range_days}-day data.
        """