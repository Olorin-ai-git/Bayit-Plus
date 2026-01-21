#!/usr/bin/env python3
"""
Clean application state tables in Postgres.
Preserves source data (transactions, merchants) and configuration (users, detectors).
"""
import os
import sys
from sqlalchemy import create_engine, text

def main():
    user = os.environ.get("USER", "olorin")
    url = f"postgresql://{user}@localhost:5432/olorin"
    engine = create_engine(url)
    
    tables_to_clean = [
        "investigation_states",
        "investigations",
        "transaction_scores",
        "predictions",
        "soar_playbook_executions",
        "composio_action_audit",
        "composio_connections",
        "detection_runs",
        "anomaly_events",
        "reports",
        "audit_logs",
        "investigation_audit_log",
        "replay_results",
        "replay_scenarios",
        "pipeline_health",
        "kpi_breakdown",
        "kpi_daily_metrics",
        "kpi_threshold_sweep"
    ]
    
    print("🧹 Cleaning application state tables...")
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        for table in tables_to_clean:
            try:
                # Check if table exists
                check = conn.execute(text(f"SELECT to_regclass('{table}')")).scalar()
                if check:
                    print(f"   Truncating {table}...")
                    conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                else:
                    print(f"   Skipping {table} (not found)")
            except Exception as e:
                print(f"   ❌ Error cleaning {table}: {e}")
                
    print("✅ Cleanup complete.")

if __name__ == "__main__":
    main()

