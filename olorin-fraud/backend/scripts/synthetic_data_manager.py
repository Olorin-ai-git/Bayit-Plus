#!/usr/bin/env python3
"""
Unified Synthetic Data Manager
=============================
Single authoritative source for synthetic data generation in Olorin.
Handles both CREATION (INSERT) and ENRICHMENT (UPDATE) of transaction data.

STRICTLY FORBIDDEN IN PRODUCTION ENVIRONMENTS.

Usage:
    poetry run python scripts/synthetic_data_manager.py --action create --count 5000
    poetry run python scripts/synthetic_data_manager.py --action enrich
"""

import asyncio
import os
import sys
import random
import uuid
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.config_loader import get_config_loader
from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger
from scripts.data_generators import FraudDataGenerator

logger = get_bridge_logger(__name__)

class SyntheticDataManager:
    def __init__(self):
        self.config_loader = get_config_loader()
        self.config = self.config_loader.load_app_config()
        self.env = self.config.get("env", "development").lower()
        self.generator = FraudDataGenerator()
        
        # Safety Check
        if self.env == "production":
            logger.error("🚨 CRITICAL: Synthetic data generation attempted in PRODUCTION environment.")
            logger.error("Operation aborted immediately to protect production data.")
            sys.exit(1)
            
        logger.info(f"✅ Environment verified: {self.env} (Safe for synthetic data)")

    async def create_dataset(self, count: int = 5000):
        """
        Creates new transaction records from scratch (INSERT).
        Used when populating an empty database.
        """
        logger.info("=" * 80)
        logger.info(f"🏗️  CREATING {count:,} Synthetic Transactions")
        logger.info("=" * 80)
        
        pg = get_database_provider("postgresql")
        pg.connect()
        
        # Generate in batches
        batch_size = 100
        total_batches = (count + batch_size - 1) // batch_size
        
        start_date = datetime.now() - timedelta(days=180)
        
        for batch_num in range(total_batches):
            batch_records = []
            current_batch_size = min(batch_size, count - (batch_num * batch_size))
            
            for i in range(current_batch_size):
                # 1. Create Skeleton (IDs, Timestamps, Amounts)
                tx_datetime = start_date + timedelta(
                    days=random.randint(0, 180),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
                
                # Determine basic fraud status for consistency
                is_fraud = random.random() < 0.20
                model_score = random.uniform(0.7, 0.99) if is_fraud else random.uniform(0.01, 0.3)
                
                record_skeleton = {
                    "tx_datetime": tx_datetime.isoformat(),
                    "tx_id": f"TX_{tx_datetime.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}",
                    "tx_id_key": str(uuid.uuid4()),
                    "original_tx_id": str(uuid.uuid4()),
                    "gmv": round(random.uniform(10, 5000) if is_fraud else random.uniform(10, 500), 2),
                    "model_score": model_score,
                    "is_fraud_tx": 1 if is_fraud else 0,
                    # Basic Placeholders needed by FraudDataGenerator
                    "email": f"user_{uuid.uuid4().hex[:8]}@example.com" 
                }
                
                # 2. Enrich with Detailed Data
                # FraudDataGenerator fills: device, network, user details, merchant, etc.
                detailed_data = self.generator.generate_all_fields(record_skeleton)
                
                # Merge
                full_record = {**record_skeleton, **detailed_data}
                
                # Ensure snake_case keys match DB schema (basic mapping)
                # Note: FraudDataGenerator returns snake_case.
                # We need to ensure we have all required DB columns.
                # This is a simplified schema compliance.
                
                batch_records.append(full_record)
            
            # 3. Insert Batch
            try:
                await self._insert_batch(pg, batch_records)
                logger.info(f"   ✅ Batch {batch_num + 1}/{total_batches}: Inserted {len(batch_records)} records")
            except Exception as e:
                logger.error(f"   ❌ Batch {batch_num + 1} failed: {e}")
                
        logger.info("✅ Dataset Creation Complete")

    async def _insert_batch(self, pg_provider, records: List[Dict]):
        """Helper to insert a batch of records."""
        if not records:
            return

        columns = list(records[0].keys())
        placeholders = ", ".join([f"${i+1}" for i in range(len(columns))])
        column_names = ", ".join(columns)
        
        insert_sql = f"INSERT INTO transactions_enriched ({column_names}) VALUES ({placeholders})"
        
        for record in records:
            values = tuple(record.get(col) for col in columns)
            # Use execute_query_async (simulated batch via loop as asyncpg doesn't support executemany easily in this wrapper)
            await pg_provider._execute_query_async(insert_sql, values)

    async def enrich_existing(self):
        """
        Updates existing NULL columns with synthetic data (UPDATE).
        Used when records exist but are incomplete.
        """
        logger.info("=" * 80)
        logger.info("🎨 ENRICHING Existing Transactions")
        logger.info("=" * 80)
        
        from app.models.transaction import Transaction
        from app.service.persistence.database import get_db_session
        
        db = get_db_session()
        
        # Fetch records with missing data (heuristic: check if ip_country is null)
        # Or just fetch all and update if missing.
        records = db.query(Transaction).all() # Warning: Fetching all might be slow for large DBs
        logger.info(f"Found {len(records)} transactions to process.")
        
        updated_count = 0
        for i, record in enumerate(records):
            # Convert SQLAlchemy model to dict for generator
            record_dict = record.__dict__.copy()
            if '_sa_instance_state' in record_dict:
                del record_dict['_sa_instance_state']
                
            # Generate missing fields
            generated_data = self.generator.generate_all_fields(record_dict)
            
            # Update record
            changed = False
            for key, value in generated_data.items():
                if hasattr(record, key):
                    current_val = getattr(record, key)
                    if current_val is None or current_val == "":
                        setattr(record, key, value)
                        changed = True
            
            if changed:
                updated_count += 1
                
            if (i + 1) % 100 == 0:
                db.commit() # Commit batches
                logger.info(f"   Processed {i + 1}/{len(records)} records...")
                
        db.commit()
        db.close()
        logger.info(f"✅ Enrichment Complete. Updated {updated_count} records.")

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Manage Synthetic Data")
    parser.add_argument("--action", choices=["create", "enrich"], required=True, help="Action to perform")
    parser.add_argument("--count", type=int, default=5000, help="Number of records to create")
    
    args = parser.parse_args()
    
    manager = SyntheticDataManager()
    
    if args.action == "create":
        await manager.create_dataset(args.count)
    elif args.action == "enrich":
        await manager.enrich_existing()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Fatal Error: {e}")
        sys.exit(1)

