import os
import psycopg2
import json
from dotenv import load_dotenv

load_dotenv()

# Get DB config
DB_NAME = os.getenv("POSTGRES_DB", "olorin")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)
cur = conn.cursor()

inv_id = "auto-comp-15b5798d9e21"
print(f"Checking investigation: {inv_id}")

cur.execute(f"SELECT progress_json, settings_json, created_at FROM investigation_states WHERE investigation_id = '{inv_id}'")
row = cur.fetchone()

if row:
    progress_json, settings_json, created_at = row
    
    print(f"Created At: {created_at}")
    
    window_start = None
    window_end = None
    
    # Try progress_json
    if progress_json:
        try:
            p = json.loads(progress_json)
            window_start = p.get("from_date") or p.get("window_start")
            window_end = p.get("to_date") or p.get("window_end")
            print(f"Window from Progress: {window_start} to {window_end}")
        except:
            pass
            
    # Try settings_json
    if not window_start and settings_json:
        try:
            s = json.loads(settings_json)
            window_start = s.get("from_date") or s.get("window_start")
            window_end = s.get("to_date") or s.get("window_end")
            
            if not window_start and "time_range" in s:
                window_start = s["time_range"].get("start_time")
                window_end = s["time_range"].get("end_time")
                
            print(f"Window from Settings: {window_start} to {window_end}")
        except:
            pass

else:
    print("Investigation not found")

conn.close()

