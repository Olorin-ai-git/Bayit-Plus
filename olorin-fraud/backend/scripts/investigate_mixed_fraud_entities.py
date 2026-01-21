#!/usr/bin/env python3
"""
Investigation Script: Mixed Fraud Entities Analysis

Analyzes entities (emails, device IDs, IPs) that have at least one fraudulent
transaction but also non-fraudulent transactions. Only considers transactions
from 6+ months ago.

This script investigates:
1. Which entities have both fraud and non-fraud transactions
2. Whether they belong to the same merchant
3. Characteristics and patterns of these mixed entities
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MixedFraudEntityInvestigator:
    """Investigates entities with mixed fraud/non-fraud transactions."""

    def __init__(self):
        """Initialize with database provider."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        self.table_name = self.client.get_full_table_name()
        # 6 months ago cutoff
        self.cutoff_date = datetime.now() - timedelta(days=180)
        logger.info(f"Using table: {self.table_name}")
        logger.info(f"Cutoff date for analysis: {self.cutoff_date}")

    def get_mixed_fraud_entities_by_email(self) -> List[Dict[str, Any]]:
        """Find email entities with both fraud and non-fraud transactions."""
        query = f"""
        SELECT
            EMAIL_NORMALIZED as ENTITY_VALUE,
            'email' as ENTITY_TYPE,
            COUNT(*) as TOTAL_TRANSACTIONS,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as FRAUD_COUNT,
            SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as NON_FRAUD_COUNT,
            COUNT(DISTINCT STORE_ID) as UNIQUE_MERCHANTS,
            COUNT(DISTINCT MERCHANT_NAME) as UNIQUE_MERCHANT_NAMES,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as TOTAL_AMOUNT,
            AVG(MODEL_SCORE) as AVG_MODEL_SCORE,
            MAX(MODEL_SCORE) as MAX_MODEL_SCORE,
            MIN(MODEL_SCORE) as MIN_MODEL_SCORE,
            MIN(TX_DATETIME) as FIRST_TRANSACTION,
            MAX(TX_DATETIME) as LAST_TRANSACTION,
            COUNT(DISTINCT BIN) as UNIQUE_CARDS,
            COUNT(DISTINCT DEVICE_ID) as UNIQUE_DEVICES,
            COUNT(DISTINCT IP) as UNIQUE_IPS
        FROM {self.table_name}
        WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
            AND EMAIL_NORMALIZED IS NOT NULL
            AND EMAIL_NORMALIZED != ''
        GROUP BY EMAIL_NORMALIZED
        HAVING FRAUD_COUNT > 0 AND NON_FRAUD_COUNT > 0
        ORDER BY FRAUD_COUNT DESC, TOTAL_TRANSACTIONS DESC
        LIMIT 500
        """
        return self._execute_query(query)

    def get_merchant_distribution_for_mixed_entities(self) -> List[Dict[str, Any]]:
        """Analyze merchant distribution for mixed-fraud email entities."""
        query = f"""
        WITH mixed_entities AS (
            SELECT EMAIL_NORMALIZED as entity
            FROM {self.table_name}
            WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND EMAIL_NORMALIZED IS NOT NULL
                AND EMAIL_NORMALIZED != ''
            GROUP BY EMAIL_NORMALIZED
            HAVING
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
        ),
        merchant_fraud_analysis AS (
            SELECT
                t.STORE_ID,
                t.MERCHANT_NAME,
                COUNT(DISTINCT me.entity) as MIXED_ENTITY_COUNT,
                COUNT(*) as TOTAL_TRANSACTIONS,
                SUM(CASE WHEN t.IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as FRAUD_TXS,
                SUM(CASE WHEN t.IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as LEGIT_TXS,
                AVG(t.MODEL_SCORE) as AVG_MODEL_SCORE,
                SUM(t.PAID_AMOUNT_VALUE_IN_CURRENCY) as TOTAL_AMOUNT
            FROM {self.table_name} t
            INNER JOIN mixed_entities me ON t.EMAIL_NORMALIZED = me.entity
            WHERE t.TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
            GROUP BY t.STORE_ID, t.MERCHANT_NAME
        )
        SELECT
            STORE_ID,
            MERCHANT_NAME,
            MIXED_ENTITY_COUNT,
            TOTAL_TRANSACTIONS,
            FRAUD_TXS,
            LEGIT_TXS,
            ROUND(FRAUD_TXS * 100.0 / NULLIF(TOTAL_TRANSACTIONS, 0), 2) as FRAUD_RATE_PCT,
            AVG_MODEL_SCORE,
            TOTAL_AMOUNT
        FROM merchant_fraud_analysis
        ORDER BY MIXED_ENTITY_COUNT DESC, FRAUD_TXS DESC
        LIMIT 100
        """
        return self._execute_query(query)

    def get_fraud_ratio_distribution(self) -> List[Dict[str, Any]]:
        """Analyze the distribution of fraud ratios among mixed entities."""
        query = f"""
        WITH entity_fraud_ratios AS (
            SELECT
                EMAIL_NORMALIZED as entity,
                COUNT(*) as total_tx,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_tx,
                ROUND(
                    SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(*), 0),
                    2
                ) as fraud_ratio_pct
            FROM {self.table_name}
            WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND EMAIL_NORMALIZED IS NOT NULL
            GROUP BY EMAIL_NORMALIZED
            HAVING fraud_tx > 0
                AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
        )
        SELECT
            CASE
                WHEN fraud_ratio_pct <= 10 THEN '01: 0-10%'
                WHEN fraud_ratio_pct <= 20 THEN '02: 10-20%'
                WHEN fraud_ratio_pct <= 30 THEN '03: 20-30%'
                WHEN fraud_ratio_pct <= 40 THEN '04: 30-40%'
                WHEN fraud_ratio_pct <= 50 THEN '05: 40-50%'
                WHEN fraud_ratio_pct <= 60 THEN '06: 50-60%'
                WHEN fraud_ratio_pct <= 70 THEN '07: 60-70%'
                WHEN fraud_ratio_pct <= 80 THEN '08: 70-80%'
                WHEN fraud_ratio_pct <= 90 THEN '09: 80-90%'
                ELSE '10: 90-100%'
            END as FRAUD_RATIO_BUCKET,
            COUNT(*) as ENTITY_COUNT,
            SUM(total_tx) as TOTAL_TRANSACTIONS,
            SUM(fraud_tx) as TOTAL_FRAUD_TXS,
            ROUND(AVG(total_tx), 2) as AVG_TX_PER_ENTITY,
            ROUND(AVG(fraud_tx), 2) as AVG_FRAUD_PER_ENTITY
        FROM entity_fraud_ratios
        GROUP BY FRAUD_RATIO_BUCKET
        ORDER BY FRAUD_RATIO_BUCKET
        """
        return self._execute_query(query)

    def get_temporal_pattern_analysis(self) -> List[Dict[str, Any]]:
        """Analyze temporal patterns of fraud vs non-fraud for mixed entities."""
        query = f"""
        WITH mixed_entities AS (
            SELECT EMAIL_NORMALIZED as entity
            FROM {self.table_name}
            WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND EMAIL_NORMALIZED IS NOT NULL
            GROUP BY EMAIL_NORMALIZED
            HAVING
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
        ),
        temporal_analysis AS (
            SELECT
                me.entity,
                MIN(CASE WHEN t.IS_FRAUD_TX = 1 THEN t.TX_DATETIME END) as FIRST_FRAUD_TX,
                MAX(CASE WHEN t.IS_FRAUD_TX = 1 THEN t.TX_DATETIME END) as LAST_FRAUD_TX,
                MIN(CASE WHEN t.IS_FRAUD_TX = 0 THEN t.TX_DATETIME END) as FIRST_LEGIT_TX,
                MAX(CASE WHEN t.IS_FRAUD_TX = 0 THEN t.TX_DATETIME END) as LAST_LEGIT_TX,
                MIN(t.TX_DATETIME) as FIRST_ANY_TX,
                MAX(t.TX_DATETIME) as LAST_ANY_TX,
                SUM(CASE WHEN t.IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as FRAUD_COUNT,
                SUM(CASE WHEN t.IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as LEGIT_COUNT
            FROM {self.table_name} t
            INNER JOIN mixed_entities me ON t.EMAIL_NORMALIZED = me.entity
            WHERE t.TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
            GROUP BY me.entity
        )
        SELECT
            entity as ENTITY,
            FIRST_FRAUD_TX,
            LAST_FRAUD_TX,
            FIRST_LEGIT_TX,
            LAST_LEGIT_TX,
            FIRST_ANY_TX,
            LAST_ANY_TX,
            FRAUD_COUNT,
            LEGIT_COUNT,
            CASE
                WHEN FIRST_FRAUD_TX < FIRST_LEGIT_TX THEN 'fraud_first'
                WHEN FIRST_FRAUD_TX > FIRST_LEGIT_TX THEN 'legit_first'
                ELSE 'same_time'
            END as TRANSACTION_ORDER,
            DATEDIFF('day', FIRST_ANY_TX, LAST_ANY_TX) as ENTITY_LIFETIME_DAYS
        FROM temporal_analysis
        ORDER BY FRAUD_COUNT DESC
        LIMIT 200
        """
        return self._execute_query(query)

    def get_card_switching_pattern(self) -> List[Dict[str, Any]]:
        """Analyze if mixed entities switch cards between fraud/non-fraud."""
        query = f"""
        WITH mixed_entities AS (
            SELECT EMAIL_NORMALIZED as entity
            FROM {self.table_name}
            WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND EMAIL_NORMALIZED IS NOT NULL
            GROUP BY EMAIL_NORMALIZED
            HAVING
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
        ),
        card_analysis AS (
            SELECT
                me.entity,
                COUNT(DISTINCT t.BIN) as TOTAL_UNIQUE_CARDS,
                COUNT(DISTINCT CASE WHEN t.IS_FRAUD_TX = 1 THEN t.BIN END) as FRAUD_CARDS,
                COUNT(DISTINCT CASE WHEN t.IS_FRAUD_TX = 0 THEN t.BIN END) as LEGIT_CARDS,
                SUM(CASE WHEN t.IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as FRAUD_TX_COUNT,
                SUM(CASE WHEN t.IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as LEGIT_TX_COUNT
            FROM {self.table_name} t
            INNER JOIN mixed_entities me ON t.EMAIL_NORMALIZED = me.entity
            WHERE t.TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND t.BIN IS NOT NULL
            GROUP BY me.entity
        )
        SELECT
            CASE
                WHEN FRAUD_CARDS = LEGIT_CARDS AND FRAUD_CARDS = 1
                    THEN 'same_single_card'
                WHEN FRAUD_CARDS = LEGIT_CARDS
                    THEN 'same_card_set'
                WHEN FRAUD_CARDS > LEGIT_CARDS
                    THEN 'more_fraud_cards'
                WHEN FRAUD_CARDS < LEGIT_CARDS
                    THEN 'more_legit_cards'
                ELSE 'unknown'
            END as CARD_PATTERN,
            COUNT(*) as ENTITY_COUNT,
            ROUND(AVG(TOTAL_UNIQUE_CARDS), 2) as AVG_TOTAL_CARDS,
            ROUND(AVG(FRAUD_CARDS), 2) as AVG_FRAUD_CARDS,
            ROUND(AVG(LEGIT_CARDS), 2) as AVG_LEGIT_CARDS,
            SUM(FRAUD_TX_COUNT) as TOTAL_FRAUD_TX,
            SUM(LEGIT_TX_COUNT) as TOTAL_LEGIT_TX
        FROM card_analysis
        GROUP BY CARD_PATTERN
        ORDER BY ENTITY_COUNT DESC
        """
        return self._execute_query(query)

    def get_single_vs_multi_merchant(self) -> List[Dict[str, Any]]:
        """Analyze how many mixed entities use single vs multiple merchants."""
        query = f"""
        WITH entity_merchants AS (
            SELECT
                EMAIL_NORMALIZED as entity,
                COUNT(DISTINCT STORE_ID) as merchant_count,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as legit_count,
                COUNT(*) as total_tx
            FROM {self.table_name}
            WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                AND EMAIL_NORMALIZED IS NOT NULL
            GROUP BY EMAIL_NORMALIZED
            HAVING fraud_count > 0 AND legit_count > 0
        )
        SELECT
            CASE
                WHEN merchant_count = 1 THEN 'single_merchant'
                WHEN merchant_count <= 3 THEN '2-3_merchants'
                WHEN merchant_count <= 5 THEN '4-5_merchants'
                ELSE '6+_merchants'
            END as MERCHANT_CATEGORY,
            COUNT(*) as ENTITY_COUNT,
            SUM(fraud_count) as TOTAL_FRAUD,
            SUM(legit_count) as TOTAL_LEGIT,
            SUM(total_tx) as TOTAL_TRANSACTIONS,
            ROUND(AVG(fraud_count), 2) as AVG_FRAUD_PER_ENTITY,
            ROUND(AVG(legit_count), 2) as AVG_LEGIT_PER_ENTITY,
            ROUND(SUM(fraud_count) * 100.0 / NULLIF(SUM(total_tx), 0), 2) as FRAUD_RATE_PCT
        FROM entity_merchants
        GROUP BY MERCHANT_CATEGORY
        ORDER BY MERCHANT_CATEGORY
        """
        return self._execute_query(query)

    def get_summary_statistics(self) -> Dict[str, Any]:
        """Get overall summary statistics for the investigation."""
        query = f"""
        SELECT
            COUNT(*) as TOTAL_TRANSACTIONS,
            COUNT(DISTINCT EMAIL_NORMALIZED) as TOTAL_UNIQUE_EMAILS,
            COUNT(DISTINCT DEVICE_ID) as TOTAL_UNIQUE_DEVICES,
            COUNT(DISTINCT IP) as TOTAL_UNIQUE_IPS,
            COUNT(DISTINCT STORE_ID) as TOTAL_UNIQUE_MERCHANTS,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as FRAUD_TRANSACTIONS,
            SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as LEGIT_TRANSACTIONS,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as TOTAL_AMOUNT,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN PAID_AMOUNT_VALUE_IN_CURRENCY ELSE 0 END) as FRAUD_AMOUNT,
            AVG(MODEL_SCORE) as OVERALL_AVG_MODEL_SCORE,
            AVG(CASE WHEN IS_FRAUD_TX = 1 THEN MODEL_SCORE END) as FRAUD_AVG_MODEL_SCORE,
            AVG(CASE WHEN IS_FRAUD_TX = 0 THEN MODEL_SCORE END) as LEGIT_AVG_MODEL_SCORE
        FROM {self.table_name}
        WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
        """
        results = self._execute_query(query)
        return results[0] if results else {}

    def get_mixed_entity_count(self) -> Dict[str, Any]:
        """Get count of mixed entities by type."""
        query = f"""
        SELECT
            (SELECT COUNT(*) FROM (
                SELECT EMAIL_NORMALIZED
                FROM {self.table_name}
                WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                    AND EMAIL_NORMALIZED IS NOT NULL
                GROUP BY EMAIL_NORMALIZED
                HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                    AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
            )) as MIXED_EMAILS,
            (SELECT COUNT(*) FROM (
                SELECT DEVICE_ID
                FROM {self.table_name}
                WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                    AND DEVICE_ID IS NOT NULL
                GROUP BY DEVICE_ID
                HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                    AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
            )) as MIXED_DEVICES,
            (SELECT COUNT(*) FROM (
                SELECT IP
                FROM {self.table_name}
                WHERE TX_DATETIME < '{self.cutoff_date.strftime("%Y-%m-%d")}'
                    AND IP IS NOT NULL
                    AND IP NOT LIKE '10.%'
                    AND IP NOT LIKE '192.168.%'
                    AND IP NOT LIKE '172.1%'
                    AND IP NOT LIKE '127.%'
                GROUP BY IP
                HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
                    AND SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) > 0
            )) as MIXED_IPS
        """
        results = self._execute_query(query)
        return results[0] if results else {}

    def _execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute query and return results."""
        try:
            logger.info("Executing query...")
            result = self.client.execute_query(query)
            if isinstance(result, list):
                logger.info(f"Query returned {len(result)} rows")
                return result
            elif result and "data" in result:
                return result["data"]
            return []
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return []


def main():
    """Run the mixed fraud entity investigation."""
    print("=" * 80)
    print("MIXED FRAUD ENTITY INVESTIGATION")
    print("Analyzing entities with both fraud and non-fraud transactions")
    print("Cutoff: Transactions from 6+ months ago only")
    print("=" * 80)

    investigator = MixedFraudEntityInvestigator()

    # 1. Summary Statistics
    print("\n" + "=" * 60)
    print("1. OVERALL SUMMARY STATISTICS")
    print("=" * 60)
    summary = investigator.get_summary_statistics()
    if summary:
        for key, value in summary.items():
            if isinstance(value, float):
                print(f"  {key}: {value:,.4f}")
            elif isinstance(value, int) or (isinstance(value, float) and value > 1000):
                print(f"  {key}: {value:,}")
            else:
                print(f"  {key}: {value}")

    # 1b. Mixed Entity Counts
    print("\n" + "-" * 40)
    print("MIXED ENTITY COUNTS")
    print("-" * 40)
    counts = investigator.get_mixed_entity_count()
    if counts:
        print(f"  Emails with mixed fraud/legit: {counts.get('MIXED_EMAILS', 0):,}")
        print(f"  Devices with mixed fraud/legit: {counts.get('MIXED_DEVICES', 0):,}")
        print(f"  IPs with mixed fraud/legit: {counts.get('MIXED_IPS', 0):,}")

    # 2. Mixed Fraud Entities by Email (Top 20)
    print("\n" + "=" * 60)
    print("2. TOP 20 MIXED FRAUD ENTITIES BY EMAIL")
    print("=" * 60)
    email_entities = investigator.get_mixed_fraud_entities_by_email()
    print(f"Total mixed-fraud email entities: {len(email_entities)} (showing top 20)")

    for i, entity in enumerate(email_entities[:20]):
        ev = entity.get('ENTITY_VALUE', 'N/A')
        tt = entity.get('TOTAL_TRANSACTIONS', 0)
        fc = entity.get('FRAUD_COUNT', 0)
        nfc = entity.get('NON_FRAUD_COUNT', 0)
        um = entity.get('UNIQUE_MERCHANTS', 0)
        ams = entity.get('AVG_MODEL_SCORE', 0) or 0
        uc = entity.get('UNIQUE_CARDS', 0)
        ta = entity.get('TOTAL_AMOUNT', 0) or 0
        print(f"\n  [{i+1}] {str(ev)[:50]}...")
        print(f"      Total Tx: {tt:,} | Fraud: {fc:,} | Legit: {nfc:,}")
        print(f"      Fraud Rate: {(fc*100/(fc+nfc)) if (fc+nfc) > 0 else 0:.1f}%")
        print(f"      Merchants: {um} | Cards: {uc}")
        print(f"      Avg Model Score: {float(ams):.4f}")
        print(f"      Total Amount: ${float(ta):,.2f}")

    # 3. Single vs Multi-Merchant Analysis
    print("\n" + "=" * 60)
    print("3. SINGLE VS MULTI-MERCHANT DISTRIBUTION")
    print("=" * 60)
    print("(Do mixed entities use one merchant or spread across many?)")
    merchant_dist = investigator.get_single_vs_multi_merchant()
    for row in merchant_dist:
        cat = row.get('MERCHANT_CATEGORY', 'N/A')
        cnt = row.get('ENTITY_COUNT', 0)
        fraud = row.get('TOTAL_FRAUD', 0)
        legit = row.get('TOTAL_LEGIT', 0)
        rate = row.get('FRAUD_RATE_PCT', 0) or 0
        print(f"\n  {cat}:")
        print(f"      Entities: {cnt:,}")
        print(f"      Total Fraud Tx: {fraud:,} | Total Legit Tx: {legit:,}")
        print(f"      Overall Fraud Rate: {float(rate):.2f}%")

    # 4. Fraud Ratio Distribution
    print("\n" + "=" * 60)
    print("4. FRAUD RATIO DISTRIBUTION")
    print("=" * 60)
    print("(What % of each entity's transactions are fraudulent?)")
    ratio_dist = investigator.get_fraud_ratio_distribution()
    for bucket in ratio_dist:
        b = bucket.get('FRAUD_RATIO_BUCKET', 'N/A')
        ec = bucket.get('ENTITY_COUNT', 0)
        tt = bucket.get('TOTAL_TRANSACTIONS', 0)
        ft = bucket.get('TOTAL_FRAUD_TXS', 0)
        print(f"  {b}: {ec:>8,} entities | {tt:>10,} txns | {ft:>8,} fraud txns")

    # 5. Temporal Patterns
    print("\n" + "=" * 60)
    print("5. TEMPORAL PATTERNS")
    print("=" * 60)
    print("(Which came first - fraud or legit transactions?)")
    temporal = investigator.get_temporal_pattern_analysis()

    order_counts = {}
    lifetime_by_order = {}
    for t in temporal:
        order = t.get('TRANSACTION_ORDER', 'unknown')
        order_counts[order] = order_counts.get(order, 0) + 1
        lifetime = t.get('ENTITY_LIFETIME_DAYS', 0) or 0
        if order not in lifetime_by_order:
            lifetime_by_order[order] = []
        lifetime_by_order[order].append(lifetime)

    print("\n  Transaction Order Distribution:")
    for order, count in sorted(order_counts.items(), key=lambda x: -x[1]):
        avg_lifetime = sum(lifetime_by_order[order]) / len(lifetime_by_order[order]) if lifetime_by_order.get(order) else 0
        print(f"    {order}: {count:,} entities (avg lifetime: {avg_lifetime:.1f} days)")

    # 6. Card Switching Patterns
    print("\n" + "=" * 60)
    print("6. CARD SWITCHING PATTERNS")
    print("=" * 60)
    print("(Do entities use same cards for fraud and legit, or different?)")
    card_patterns = investigator.get_card_switching_pattern()
    for pattern in card_patterns:
        cp = pattern.get('CARD_PATTERN', 'N/A')
        ec = pattern.get('ENTITY_COUNT', 0)
        atc = pattern.get('AVG_TOTAL_CARDS', 0) or 0
        afc = pattern.get('AVG_FRAUD_CARDS', 0) or 0
        alc = pattern.get('AVG_LEGIT_CARDS', 0) or 0
        print(f"\n  {cp}:")
        print(f"      Entities: {ec:,}")
        print(f"      Avg Total Cards: {float(atc):.2f}")
        print(f"      Avg Fraud Cards: {float(afc):.2f} | Avg Legit Cards: {float(alc):.2f}")

    # 7. Top Merchants for Mixed Entities
    print("\n" + "=" * 60)
    print("7. TOP MERCHANTS WITH MIXED-FRAUD ENTITIES")
    print("=" * 60)
    merchant_dist = investigator.get_merchant_distribution_for_mixed_entities()
    print(f"Total merchants with mixed-fraud entities: {len(merchant_dist)}")
    print("\n  Top 15 by mixed entity count:")
    for i, merchant in enumerate(merchant_dist[:15]):
        mn = merchant.get('MERCHANT_NAME', 'N/A')
        sid = merchant.get('STORE_ID', 'N/A')
        mec = merchant.get('MIXED_ENTITY_COUNT', 0)
        tt = merchant.get('TOTAL_TRANSACTIONS', 0)
        fr = merchant.get('FRAUD_RATE_PCT', 0) or 0
        print(f"\n    [{i+1}] {mn}")
        print(f"        Store ID: {sid}")
        print(f"        Mixed Entities: {mec:,}")
        print(f"        Total Txns: {tt:,} | Fraud Rate: {float(fr):.2f}%")

    print("\n" + "=" * 80)
    print("INVESTIGATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
