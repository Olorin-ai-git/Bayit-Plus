"""
Test Runner Data Loading Module

Extracted data loading methods from unified_ai_investigation_test_runner.py
"""

import csv
import os
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TestDataLoader:
    """Handles loading test data from various sources"""

    def __init__(self, logger_instance=None):
        self.logger = logger_instance or logger

    def load_csv_data(self, csv_file: str, limit: int = 2000) -> List[Dict]:
        """Load transaction data from CSV file"""
        if not os.path.exists(csv_file):
            self.logger.warning(f"CSV file not found: {csv_file}")
            return []

        transactions = []
        try:
            with open(csv_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= limit:
                        break
                    transactions.append(row)

            self.logger.info(
                f"✅ Loaded {len(transactions)} transactions from {csv_file}"
            )
            return transactions
        except Exception as e:
            self.logger.error(f"❌ Failed to load CSV data: {e}")
            return []

    def extract_csv_user_samples(
        self, transactions: List[Dict], sample_size: int = 10
    ) -> List[Dict]:
        """Extract user samples from CSV transactions"""
        if not transactions:
            return []

        # Group by user_id or email
        user_groups = {}
        for tx in transactions:
            user_id = tx.get("user_id") or tx.get("email") or tx.get("customer_id")
            if user_id:
                if user_id not in user_groups:
                    user_groups[user_id] = []
                user_groups[user_id].append(tx)

        # Extract samples
        samples = []
        for user_id, user_txs in list(user_groups.items())[:sample_size]:
            samples.append(
                {
                    "user_id": user_id,
                    "transactions": user_txs[:10],  # Limit transactions per user
                }
            )

        return samples

    async def load_snowflake_data(
        self,
        time_window: str = "24h",
        top_percentage: int = 10,
        group_by: str = "email",
    ) -> List[Dict]:
        """Load top risk entities from Snowflake/PostgreSQL"""
        try:
            from app.service.agent.tools.snowflake_tool.schema_constants import (
                EMAIL,
                IP,
            )
            from app.service.analytics.risk_analyzer import get_risk_analyzer

            analyzer = get_risk_analyzer()

            # Map group_by string to schema constant
            group_by_column = EMAIL if group_by.upper() == "EMAIL" else IP

            results = await analyzer.get_top_risk_entities(
                time_window=time_window,
                group_by=group_by_column,
                top_percentage=top_percentage,
            )

            self.logger.info(
                f"✅ Loaded {len(results)} high-risk entities from database"
            )
            return results
        except Exception as e:
            self.logger.error(f"❌ Failed to load Snowflake data: {e}")
            return []
