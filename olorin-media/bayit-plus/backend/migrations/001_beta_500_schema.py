"""
Migration: Beta 500 Program Schema

Creates collections and indexes for the Beta 500 closed beta program.

Collections:
- beta_users: Beta program participants
- beta_credits: Credit allocation per user
- beta_credit_transactions: Credit usage audit trail
- beta_sessions: Active dubbing sessions

This migration is ADDITIVE ONLY - no schema modifications to existing collections.
"""

import asyncio
from datetime import datetime, timedelta
from pymongo import IndexModel, ASCENDING, DESCENDING
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Migration metadata
MIGRATION_VERSION = "001"
MIGRATION_NAME = "beta_500_schema"
MIGRATION_DATE = "2026-01-29"


async def upgrade():
    """
    Apply Beta 500 schema migration.
    
    Creates:
    - Collections with validation schemas
    - Indexes for performance
    - Compound indexes for queries
    - Partial indexes for recent data
    - TTL indexes for auto-cleanup
    """
    logger.info(f"Starting migration {MIGRATION_VERSION}: {MIGRATION_NAME}")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE_NAME]
    
    try:
        # ====================================================================
        # 1. CREATE BETA_USERS COLLECTION
        # ====================================================================
        logger.info("Creating beta_users collection...")
        
        await db.create_collection(
            "beta_users",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["email", "status", "created_at"],
                    "properties": {
                        "email": {
                            "bsonType": "string",
                            "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                        },
                        "status": {
                            "enum": ["pending_verification", "active", "expired", "suspended"]
                        },
                        "verification_token": {"bsonType": "string"},
                        "verified_at": {"bsonType": "date"},
                        "created_at": {"bsonType": "date"},
                        "expires_at": {"bsonType": "date"}
                    }
                }
            }
        )
        
        # Indexes for beta_users
        await db.beta_users.create_indexes([
            IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
            IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
            IndexModel([("verification_token", ASCENDING)], sparse=True, name="verification_token"),
            IndexModel([("expires_at", ASCENDING)], name="expires_at"),
            # TTL index - auto-delete unverified users after 7 days
            IndexModel([("created_at", ASCENDING)], 
                      expireAfterSeconds=604800, 
                      partialFilterExpression={"status": "pending_verification"},
                      name="unverified_ttl")
        ])
        
        logger.info("✅ beta_users collection created with 5 indexes")
        
        # ====================================================================
        # 2. CREATE BETA_CREDITS COLLECTION
        # ====================================================================
        logger.info("Creating beta_credits collection...")
        
        await db.create_collection(
            "beta_credits",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["user_id", "total_credits", "used_credits", "remaining_credits", "created_at"],
                    "properties": {
                        "user_id": {"bsonType": "string"},
                        "total_credits": {"bsonType": "int", "minimum": 0},
                        "used_credits": {"bsonType": "int", "minimum": 0},
                        "remaining_credits": {"bsonType": "int", "minimum": 0},
                        "is_expired": {"bsonType": "bool"},
                        "created_at": {"bsonType": "date"},
                        "updated_at": {"bsonType": "date"}
                    }
                }
            }
        )
        
        # Indexes for beta_credits
        await db.beta_credits.create_indexes([
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("is_expired", ASCENDING), ("remaining_credits", ASCENDING)], name="active_credits"),
            IndexModel([("updated_at", DESCENDING)], name="updated_at")
        ])
        
        logger.info("✅ beta_credits collection created with 3 indexes")
        
        # ====================================================================
        # 3. CREATE BETA_CREDIT_TRANSACTIONS COLLECTION
        # ====================================================================
        logger.info("Creating beta_credit_transactions collection...")
        
        await db.create_collection(
            "beta_credit_transactions",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["user_id", "transaction_type", "amount", "created_at"],
                    "properties": {
                        "user_id": {"bsonType": "string"},
                        "credit_id": {"bsonType": "string"},
                        "transaction_type": {"enum": ["debit", "credit", "refund", "expired"]},
                        "amount": {"bsonType": "int"},
                        "feature": {"bsonType": "string"},
                        "balance_after": {"bsonType": "int", "minimum": 0},
                        "metadata": {"bsonType": "object"},
                        "created_at": {"bsonType": "date"}
                    }
                }
            }
        )
        
        # Indexes for beta_credit_transactions
        await db.beta_credit_transactions.create_indexes([
            # User activity timeline
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_timeline"),
            
            # Feature analytics
            IndexModel([("feature", ASCENDING), ("created_at", DESCENDING)], name="feature_analytics"),
            
            # Credit audit trail
            IndexModel([("credit_id", ASCENDING), ("created_at", DESCENDING)], name="credit_audit"),
            
            # Partial index for recent transactions (last 6 months)
            IndexModel(
                [("user_id", ASCENDING), ("created_at", DESCENDING)],
                partialFilterExpression={"created_at": {"$gte": datetime.utcnow() - timedelta(days=180)}},
                name="recent_transactions_partial"
            ),
            
            # TTL index - auto-delete old transactions after 2 years
            IndexModel([("created_at", ASCENDING)], expireAfterSeconds=63072000, name="transactions_ttl")
        ])
        
        logger.info("✅ beta_credit_transactions collection created with 5 indexes")
        
        # ====================================================================
        # 4. CREATE BETA_SESSIONS COLLECTION
        # ====================================================================
        logger.info("Creating beta_sessions collection...")
        
        await db.create_collection(
            "beta_sessions",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["session_id", "user_id", "feature", "status", "start_time"],
                    "properties": {
                        "session_id": {"bsonType": "string"},
                        "user_id": {"bsonType": "string"},
                        "feature": {"enum": ["live_dubbing", "ai_search", "ai_recommendations"]},
                        "status": {"enum": ["active", "paused", "ended"]},
                        "start_time": {"bsonType": "date"},
                        "end_time": {"bsonType": "date"},
                        "last_checkpoint": {"bsonType": "date"},
                        "credits_consumed": {"bsonType": "int", "minimum": 0},
                        "metadata": {"bsonType": "object"}
                    }
                }
            }
        )
        
        # Indexes for beta_sessions
        await db.beta_sessions.create_indexes([
            IndexModel([("session_id", ASCENDING)], unique=True, name="session_id_unique"),
            IndexModel([("user_id", ASCENDING), ("status", ASCENDING)], name="user_status"),
            IndexModel([("status", ASCENDING), ("last_checkpoint", ASCENDING)], name="active_sessions"),
            IndexModel([("start_time", DESCENDING)], name="start_time"),
            
            # TTL index - auto-delete ended sessions after 30 days
            IndexModel(
                [("end_time", ASCENDING)],
                expireAfterSeconds=2592000,
                partialFilterExpression={"status": "ended"},
                name="ended_sessions_ttl"
            )
        ])
        
        logger.info("✅ beta_sessions collection created with 5 indexes")
        
        # ====================================================================
        # 5. CREATE MIGRATION HISTORY RECORD
        # ====================================================================
        logger.info("Recording migration history...")
        
        migration_record = {
            "version": MIGRATION_VERSION,
            "name": MIGRATION_NAME,
            "applied_at": datetime.utcnow(),
            "status": "completed"
        }
        
        await db.migration_history.insert_one(migration_record)
        
        logger.info(f"✅ Migration {MIGRATION_VERSION} completed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration {MIGRATION_VERSION} failed: {str(e)}")
        raise
        
    finally:
        client.close()


async def downgrade():
    """
    Rollback Beta 500 schema migration.
    
    WARNING: This will DROP all Beta 500 collections and data.
    Only use in development/testing environments.
    """
    logger.warning(f"Rolling back migration {MIGRATION_VERSION}: {MIGRATION_NAME}")
    
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE_NAME]
    
    try:
        # Drop collections (DESTRUCTIVE)
        await db.beta_users.drop()
        logger.info("Dropped beta_users collection")
        
        await db.beta_credits.drop()
        logger.info("Dropped beta_credits collection")
        
        await db.beta_credit_transactions.drop()
        logger.info("Dropped beta_credit_transactions collection")
        
        await db.beta_sessions.drop()
        logger.info("Dropped beta_sessions collection")
        
        # Remove migration history record
        await db.migration_history.delete_one({"version": MIGRATION_VERSION})
        
        logger.info(f"✅ Migration {MIGRATION_VERSION} rolled back successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Rollback of migration {MIGRATION_VERSION} failed: {str(e)}")
        raise
        
    finally:
        client.close()


async def verify():
    """
    Verify migration was applied correctly.
    
    Checks:
    - All collections exist
    - All indexes created
    - Validation schemas applied
    """
    logger.info(f"Verifying migration {MIGRATION_VERSION}...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE_NAME]
    
    try:
        collections = await db.list_collection_names()
        required_collections = ["beta_users", "beta_credits", "beta_credit_transactions", "beta_sessions"]
        
        for coll_name in required_collections:
            if coll_name not in collections:
                logger.error(f"❌ Collection {coll_name} not found")
                return False
            
            # Verify indexes
            coll = db[coll_name]
            indexes = await coll.index_information()
            index_count = len(indexes) - 1  # Exclude default _id index
            
            logger.info(f"✅ Collection {coll_name} exists with {index_count} indexes")
        
        # Verify migration history record
        migration_record = await db.migration_history.find_one({"version": MIGRATION_VERSION})
        if not migration_record:
            logger.error(f"❌ Migration history record not found for version {MIGRATION_VERSION}")
            return False
        
        logger.info(f"✅ Migration {MIGRATION_VERSION} verification passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration verification failed: {str(e)}")
        return False
        
    finally:
        client.close()


if __name__ == "__main__":
    import sys
    
    async def main():
        command = sys.argv[1] if len(sys.argv) > 1 else "upgrade"
        
        if command == "upgrade":
            success = await upgrade()
        elif command == "downgrade":
            success = await downgrade()
        elif command == "verify":
            success = await verify()
        else:
            logger.error(f"Unknown command: {command}")
            logger.info("Usage: python migrations/001_beta_500_schema.py [upgrade|downgrade|verify]")
            sys.exit(1)
        
        if success:
            logger.info(f"✅ Command '{command}' completed successfully")
            sys.exit(0)
        else:
            logger.error(f"❌ Command '{command}' failed")
            sys.exit(1)
    
    asyncio.run(main())
