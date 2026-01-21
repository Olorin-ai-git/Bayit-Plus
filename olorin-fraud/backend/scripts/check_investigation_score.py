#!/usr/bin/env python3
"""
Verify transaction score for investigation auto-comp-1b8f14e1f64c.
"""
import os
import sys
from sqlalchemy import create_engine, text

def main():
    # Connect to local Postgres
    user = os.environ.get("USER", "olorin")
    url = f"postgresql://{user}@localhost:5432/olorin"
    engine = create_engine(url)
    
    inv_id = "auto-comp-1b8f14e1f64c"
    
    print(f"🔍 Checking transaction_scores for {inv_id}...")
    
    with engine.connect() as conn:
        # Check transaction_scores
        query = text("SELECT * FROM transaction_scores WHERE investigation_id = :inv_id")
        result = conn.execute(query, {"inv_id": inv_id}).fetchone()
        
        if result:
            print("✅ Found score in transaction_scores:")
            print(f"   Risk Score: {result.risk_score}")
            print(f"   Entity: {result.entity_id}")
            print(f"   Merchant: {result.merchant_id}")
        else:
            print("❌ No score found in transaction_scores!")

        # Check predictions (to see if my fallback logic was needed or if it got populated)
        query_pred = text("SELECT count(*) FROM predictions WHERE investigation_id = :inv_id")
        count = conn.execute(query_pred, {"inv_id": inv_id}).scalar()
        print(f"ℹ️  Entries in 'predictions' table: {count}")

if __name__ == "__main__":
    main()

