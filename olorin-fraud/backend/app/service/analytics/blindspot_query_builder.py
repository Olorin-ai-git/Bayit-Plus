"""
Blindspot Analysis SQL Query Builder.

Constructs SQL queries for 2D distribution analysis using actual Olorin scores.
Joins Olorin-computed scores from PostgreSQL with Snowflake transaction data.

Feature: blindspot-analysis
"""

from datetime import datetime
from typing import List, Optional

from app.service.agent.tools.snowflake_tool.schema_constants import (
    GMV,
    IS_FRAUD_TX,
    MODEL_SCORE,
    NSURE_LAST_DECISION,
    TX_DATETIME,
    TX_ID_KEY,
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


def build_olorin_comparison_query(
    table_name: str,
    gmv_bins: List[int],
    num_score_bins: int,
    threshold: float,
    start_date: datetime,
    end_date: datetime,
    olorin_scores: dict,
    nsure_approved_only: bool = False,
) -> Optional[str]:
    """
    Build query with actual Olorin scores from PostgreSQL.

    Embeds Olorin-computed scores directly in the query using VALUES clause,
    then joins with Snowflake transaction data to compare Olorin vs nSure.

    Args:
        table_name: Full Snowflake table name
        gmv_bins: GMV bin boundaries
        num_score_bins: Number of score bins
        threshold: Olorin threshold for fraud classification
        start_date: Start date
        end_date: End date
        olorin_scores: Dict mapping transaction_id -> olorin_score (from PostgreSQL)
        nsure_approved_only: If True, only include nSure approved transactions

    Returns:
        SQL query string, or None if too many scores for inline embedding
    """
    if not olorin_scores:
        return None

    # Snowflake VALUES clause has limits
    max_inline_scores = 5000
    if len(olorin_scores) > max_inline_scores:
        return None

    gmv_case = build_gmv_case_statement(gmv_bins)

    nsure_filter = ""
    if nsure_approved_only:
        nsure_filter = f"AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'"

    # Build VALUES clause for Olorin scores
    values_rows = []
    for tx_id, score in olorin_scores.items():
        escaped_tx_id = str(tx_id).replace("'", "''")
        values_rows.append(f"('{escaped_tx_id}', {score})")

    values_clause = ", ".join(values_rows)

    return f"""
    WITH olorin_scores AS (
        SELECT column1 AS tx_id, column2 AS olorin_score
        FROM VALUES {values_clause}
    ),
    scored_transactions AS (
        SELECT
            t.{TX_ID_KEY} AS transaction_id,
            FLOOR(t.{MODEL_SCORE} * {num_score_bins}) / {num_score_bins} AS score_bin,
            {gmv_case.replace(GMV, f't.{GMV}')} AS gmv_bin,
            os.olorin_score AS olorin_risk_score,
            CASE WHEN os.olorin_score >= {threshold} THEN 1 ELSE 0 END AS olorin_predicted,
            CASE WHEN UPPER(t.{NSURE_LAST_DECISION}) IN ('REJECTED', 'DECLINED', 'BLOCKED') THEN 1 ELSE 0 END AS nsure_flagged,
            t.{IS_FRAUD_TX} AS actual_fraud,
            t.{GMV} AS gmv,
            t.{MODEL_SCORE} AS model_score
        FROM {table_name} t
        INNER JOIN olorin_scores os ON t.{TX_ID_KEY} = os.tx_id
        WHERE t.{TX_DATETIME} >= '{start_date.isoformat()}'
          AND t.{TX_DATETIME} < '{end_date.isoformat()}'
          AND t.{MODEL_SCORE} IS NOT NULL
          AND t.{GMV} IS NOT NULL
          {nsure_filter}
    )
    SELECT
        score_bin,
        gmv_bin,
        -- Olorin classifications (using actual Olorin scores)
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS tp,
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS fp,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS fn,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS tn,
        COUNT(*) AS total_transactions,
        SUM(gmv) AS total_gmv,
        SUM(CASE WHEN actual_fraud = 1 THEN gmv ELSE 0 END) AS fraud_gmv,
        -- Olorin GMV breakdown
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 1 THEN gmv ELSE 0 END) AS tp_gmv,
        SUM(CASE WHEN olorin_predicted = 1 AND actual_fraud = 0 THEN gmv ELSE 0 END) AS fp_gmv,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 1 THEN gmv ELSE 0 END) AS fn_gmv,
        SUM(CASE WHEN olorin_predicted = 0 AND actual_fraud = 0 THEN gmv ELSE 0 END) AS tn_gmv,
        -- nSure classifications
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS nsure_tp,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS nsure_fp,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 1 THEN 1 ELSE 0 END) AS nsure_fn,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 0 THEN 1 ELSE 0 END) AS nsure_tn,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 1 THEN gmv ELSE 0 END) AS nsure_tp_gmv,
        SUM(CASE WHEN nsure_flagged = 1 AND actual_fraud = 0 THEN gmv ELSE 0 END) AS nsure_fp_gmv,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 1 THEN gmv ELSE 0 END) AS nsure_fn_gmv,
        SUM(CASE WHEN nsure_flagged = 0 AND actual_fraud = 0 THEN gmv ELSE 0 END) AS nsure_tn_gmv,
        AVG(model_score) AS avg_score,
        COUNT(*) AS olorin_scored_count
    FROM scored_transactions
    GROUP BY score_bin, gmv_bin
    ORDER BY gmv_bin, score_bin
    """
