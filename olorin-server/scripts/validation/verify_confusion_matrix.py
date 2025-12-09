import asyncio
import os
import sys
import psycopg2
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Configure Logging to Stdout
logging.basicConfig(level=logging.INFO)

# Add app to path
sys.path.append(os.getcwd())
load_dotenv()

# FORCE DATABASE_URL to Postgres
db_user = os.getenv("POSTGRES_USER", "postgres")
db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
db_host = os.getenv("POSTGRES_HOST", "localhost")
db_port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "olorin")

# Set the environment variable BEFORE importing app modules
os.environ["DATABASE_URL"] = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
print(f"Set DATABASE_URL to: postgresql://{db_user}:***@{db_host}:{db_port}/{db_name}")

from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
from app.service.transaction_score_service import TransactionScoreService
from app.persistence.database import get_db

def get_investigation_details(inv_id):
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port
    )
    cur = conn.cursor()
    cur.execute(f"SELECT created_at, settings_json FROM investigation_states WHERE investigation_id = '{inv_id}'")
    row = cur.fetchone()
    conn.close()
    if row:
        created_at = row[0]
        settings_str = row[1]
        entity_id = "unknown"
        if settings_str:
            try:
                settings = json.loads(settings_str)
                entity_id = settings.get("entity_id", "Eneba") 
            except:
                pass
        return created_at, entity_id
    return datetime.now(), "unknown"

async def verify_matrix(investigation_id):
    print(f"Verifying Confusion Matrix for {investigation_id}...")
    
    # 1. Get Investigation Details
    created_at, entity_id = get_investigation_details(investigation_id)
    print(f"Investigation created at: {created_at}")
    print(f"Entity: {entity_id}")
    
    # 1.5 DIRECT CHECK of TransactionScoreService
    print("\n--- Direct Service Check ---")
    try:
        db_gen = get_db()
        db = next(db_gen)
        scores = TransactionScoreService.get_transaction_scores(investigation_id, db=db)
        print(f"Service returned {len(scores)} scores.")
        db.close()
        if not scores:
            print("ERROR: Service returned empty scores!")
            return
    except Exception as e:
        print(f"Service check failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # Mock Investigation Dict
    investigation_dict = {
        "id": investigation_id,
        "entity_type": "merchant",
        "entity_id": entity_id,
        "created_at": created_at,
        "overall_risk_score": 0.5,
        "progress_json": "{}" # Required to trigger DB fetch logic
    }

    # 2. Map transactions
    window_start = created_at - timedelta(days=180)
    window_end = created_at

    print("\nMapping transactions (fetching scores + ground truth)...")
    try:
        transactions, source, predicted_risk = await map_investigation_to_transactions(
            investigation=investigation_dict,
            window_start=window_start,
            window_end=window_end,
            entity_type="merchant",
            entity_id=entity_id
        )
    except Exception as e:
        print(f"Error mapping transactions: {e}")
        return

    print(f"Mapped {len(transactions)} transactions.")
    
    # 3. Calculate Matrix
    tp = 0
    fp = 0
    tn = 0
    fn = 0
    
    print("\n--- Confusion Matrix Calculation ---")
    for tx in transactions:
        # Risk Score (Predicted)
        risk_score = tx.get("predicted_risk", 0.0) # Check predicted_risk
        # Use 0.35 threshold
        predicted_fraud = risk_score >= 0.35
        
        # IS_FRAUD_TX (Actual)
        actual_fraud_val = tx.get("is_fraud_tx", 0)
        actual_fraud = False
        if isinstance(actual_fraud_val, int):
            actual_fraud = actual_fraud_val == 1
        elif isinstance(actual_fraud_val, str):
             actual_fraud = actual_fraud_val == '1' or actual_fraud_val.lower() == 'true'
            
        # Classify
        if predicted_fraud and actual_fraud:
            tp += 1
        elif predicted_fraud and not actual_fraud:
            fp += 1
        elif not predicted_fraud and not actual_fraud:
            tn += 1
        elif not predicted_fraud and actual_fraud:
            fn += 1
            
    print(f"\nTP: {tp}")
    print(f"FP: {fp}")
    print(f"TN: {tn}")
    print(f"FN: {fn}")
    
    total = tp + fp + tn + fn
    if total > 0:
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        accuracy = (tp + tn) / total
        
        print(f"\nPrecision: {precision:.4f}")
        print(f"Recall:    {recall:.4f}")
        print(f"F1 Score:  {f1:.4f}")
        print(f"Accuracy:  {accuracy:.4f}")
    else:
        print("Total transactions is 0")
    
    if tp == 0 and fp == 0 and tn == 0 and fn == 0:
        print("\nWARNING: Matrix is empty.")

if __name__ == "__main__":
    inv_id = "auto-comp-15b5798d9e21" 
    asyncio.run(verify_matrix(inv_id))
