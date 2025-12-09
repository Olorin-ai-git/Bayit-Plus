import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get DB config
DB_NAME = os.getenv("POSTGRES_DB", "olorin")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    cur = conn.cursor()

    inv_id = "auto-comp-15b5798d9e21"
    
    print(f"\n--- Key Analysis for {inv_id} ---")
    
    # Get sample IDs
    cur.execute(f"SELECT transaction_id FROM transaction_scores WHERE investigation_id = '{inv_id}' LIMIT 5")
    rows = cur.fetchall()
    print("Sample DB Keys:")
    for r in rows:
        print(f"  '{r[0]}' (Type: {type(r[0])})")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
