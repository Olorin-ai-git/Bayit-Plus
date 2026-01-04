"""
Blindspot Analysis SQL Query Builder.

Constructs SQL queries for 2D distribution analysis.

Feature: blindspot-analysis
"""

from datetime import datetime
from typing import List, Optional

from app.service.agent.tools.snowflake_tool.schema_constants import (
    EMAIL,
    GMV,
    IS_FRAUD_TX,
    MODEL_SCORE,
    NSURE_LAST_DECISION,
    TX_DATETIME,
)


def build_gmv_case_statement(gmv_bins: List[int]) -> str:
    """Build CASE statement for GMV binning."""
    cases = []
    for i in range(len(gmv_bins) - 1):
        low, high = gmv_bins[i], gmv_bins[i + 1]
        cases.append(f"WHEN {GMV} >= {low} AND {GMV} < {high} THEN '{low}-{high}'")
    last_bin = gmv_bins[-1]
    cases.append(f"WHEN {GMV} >= {last_bin} THEN '{last_bin}+'")
    return "CASE " + " ".join(cases) + " ELSE 'unknown' END"


def build_2d_distribution_query(
    table_name: str,
    gmv_bins: List[int],
    num_score_bins: int,
    threshold: float,
    start_date: datetime,
    end_date: datetime,
    nsure_approved_only: bool = False,
    entity_ids: Optional[List[str]] = None,
) -> str:
    """
    Build SQL query for 2D binning analysis.

    Args:
        table_name: Full table name to query
        gmv_bins: GMV bin boundaries
        num_score_bins: Number of score bins
        threshold: Olorin threshold for fraud classification
        start_date: Start date for analysis window
        end_date: End date for analysis window
        nsure_approved_only: If True, only include nSure approved transactions
        entity_ids: Optional list of entity IDs (emails) to filter by

    Returns:
        SQL query string
    """
    gmv_case = build_gmv_case_statement(gmv_bins)

    # Optional filter for nSure approved transactions only
    nsure_filter = ""
    if nsure_approved_only:
        nsure_filter = f"AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'"

    # Optional filter for specific entity IDs (emails)
    entity_filter = ""
    if entity_ids:
        escaped_ids = [id.replace("'", "''") for id in entity_ids]
        ids_list = ", ".join(f"'{id}'" for id in escaped_ids)
        entity_filter = f"AND {EMAIL} IN ({ids_list})"

    return f"""
    WITH binned_transactions AS (
        SELECT
            FLOOR({MODEL_SCORE} * {num_score_bins}) / {num_score_bins} AS score_bin,
            {gmv_case} AS gmv_bin,
            CASE WHEN {MODEL_SCORE} >= {threshold} THEN 1 ELSE 0 END AS olorin_predicted,
            CASE WHEN UPPER({NSURE_LAST_DECISION}) IN ('REJECTED', 'DECLINED', 'BLOCKED') THEN 1 ELSE 0 END AS nsure_flagged,
            {IS_FRAUD_TX} AS actual_fraud,
            {GMV},
            {MODEL_SCORE}
        FROM {table_name}
        WHERE {TX_DATETIME} >= '{start_date.isoformat()}'
          AND {TX_DATETIME} < '{end_date.isoformat()}'
          AND {MODEL_SCORE} IS NOT NULL
          AND {GMV} IS NOT NULL
          {nsure_filter}
          {entity_filter}
    )
    SELECT
        score_bin,
        gmv_bin,
        -- Olorin classifications (based on Olorin threshold)
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS tp,
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS fp,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS fn,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS tn,
        COUNT(*) AS total_transactions,
        SUM({GMV}) AS total_gmv,
        SUM(CASE WHEN actual_fraud = 1 THEN {GMV} ELSE 0 END) AS fraud_gmv,
        -- Olorin GMV breakdown
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 1 THEN {GMV} ELSE 0 END) AS tp_gmv,
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 0 THEN {GMV} ELSE 0 END) AS fp_gmv,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 1 THEN {GMV} ELSE 0 END) AS fn_gmv,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 0 THEN {GMV} ELSE 0 END) AS tn_gmv,
        -- nSure classifications (based on actual nSure decision)
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS nsure_tp,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS nsure_fp,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS nsure_fn,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS nsure_tn,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 1 THEN {GMV} ELSE 0 END) AS nsure_tp_gmv,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 0 THEN {GMV} ELSE 0 END) AS nsure_fp_gmv,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 1 THEN {GMV} ELSE 0 END) AS nsure_fn_gmv,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 0 THEN {GMV} ELSE 0 END) AS nsure_tn_gmv,
        AVG({MODEL_SCORE}) AS avg_score
    FROM binned_transactions
    GROUP BY score_bin, gmv_bin
    ORDER BY gmv_bin, score_bin
    """
