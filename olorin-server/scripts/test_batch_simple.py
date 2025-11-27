#!/usr/bin/env python3
"""
Simple batch test - minimal dependencies.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Create 20K fake transactions
print("Creating fake transactions...")
fake_txs = [
    {
        "TX_ID_KEY": f"TX-{i}",
        "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
        "TX_DATETIME": "2025-01-15T12:00:00",
        "IP": "1.2.3.4",
        "DEVICE_ID": f"dev-{i}",
        "MERCHANT_NAME": "Test",
    }
    for i in range(20000)
]

print(f"Created {len(fake_txs):,} transactions")
print()

# Import and test
from app.service.agent.orchestration.domain_agents.risk_agent import _calculate_per_transaction_scores
from app.service.transaction_score_service import TransactionScoreService

facts = {"results": fake_txs}
domain_findings = {"network": {"risk_score": 0.5}}
inv_id = "test-batch-simple"

print(f"Calling _calculate_per_transaction_scores with {len(fake_txs):,} transactions...")
print(f"Investigation ID: {inv_id}")
print(f"Should use streaming: {len(fake_txs)} > 10000 = {len(fake_txs) > 10000}")
print()

scores = _calculate_per_transaction_scores(
    facts=facts,
    domain_findings=domain_findings,
    investigation_id=inv_id
)

print()
print(f"Returned: {len(scores):,} scores")
db_count = TransactionScoreService.get_score_count(inv_id)
print(f"Database: {db_count:,} scores")
print()

if db_count >= 18000:  # Allow some exclusions
    print("✅ SUCCESS!")
    TransactionScoreService.delete_transaction_scores(inv_id)
else:
    print(f"❌ FAILURE: Expected ~20K, got {db_count}")

