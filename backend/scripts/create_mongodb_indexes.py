"""Create MongoDB Indexes Script.

SYSTEM MANDATE Compliance:
- No hardcoded values: MongoDB URL from environment
- Complete implementation: All indexes from migration plan
- No placeholders or TODOs

Creates all required indexes for MongoDB collections per the migration plan.
"""

import asyncio
import logging
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)


async def create_indexes():
    """Create all required MongoDB indexes."""
    # Get MongoDB connection from environment
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

    logger.info("=" * 80)
    logger.info("🔨 Creating MongoDB Indexes")
    logger.info("=" * 80)
    logger.info(f"MongoDB URI: {mongodb_uri}")
    logger.info(f"Database: {mongodb_database}")
    logger.info("")

    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(mongodb_uri)
        db = client[mongodb_database]

        # Test connection
        await db.command("ping")
        logger.info("✅ Connected to MongoDB")
        logger.info("")

        # 1. Investigations collection indexes
        logger.info("1. Creating investigations indexes...")
        await db.investigations.create_index("investigation_id", unique=True)
        logger.info("   ✅ Created index: investigation_id (unique)")

        await db.investigations.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("   ✅ Created index: user_id_1_created_at_-1")

        await db.investigations.create_index([("tenant_id", 1), ("status", 1)])
        logger.info("   ✅ Created index: tenant_id_1_status_1")

        await db.investigations.create_index([("status", 1), ("updated_at", -1)])
        logger.info("   ✅ Created index: status_1_updated_at_-1")
        logger.info("")

        # 2. Detectors collection indexes
        logger.info("2. Creating detectors indexes...")
        await db.detectors.create_index("detector_id", unique=True)
        logger.info("   ✅ Created index: detector_id (unique)")

        await db.detectors.create_index("type")
        logger.info("   ✅ Created index: type")

        await db.detectors.create_index("enabled")
        logger.info("   ✅ Created index: enabled")
        logger.info("")

        # 3. Detection runs collection indexes
        logger.info("3. Creating detection_runs indexes...")
        await db.detection_runs.create_index("run_id", unique=True)
        logger.info("   ✅ Created index: run_id (unique)")

        await db.detection_runs.create_index("metadata.detector_id")
        logger.info("   ✅ Created index: metadata.detector_id")

        await db.detection_runs.create_index("metadata.status")
        logger.info("   ✅ Created index: metadata.status")
        logger.info("")

        # 4. Anomaly events collection indexes
        logger.info("4. Creating anomaly_events indexes...")
        await db.anomaly_events.create_index("anomaly_id", unique=True)
        logger.info("   ✅ Created index: anomaly_id (unique)")

        await db.anomaly_events.create_index("run_id")
        logger.info("   ✅ Created index: run_id")

        await db.anomaly_events.create_index("detector_id")
        logger.info("   ✅ Created index: detector_id")

        await db.anomaly_events.create_index("investigation_id")
        logger.info("   ✅ Created index: investigation_id")

        await db.anomaly_events.create_index("score")
        logger.info("   ✅ Created index: score")

        await db.anomaly_events.create_index("severity")
        logger.info("   ✅ Created index: severity")

        await db.anomaly_events.create_index("status")
        logger.info("   ✅ Created index: status")
        logger.info("")

        # 5. Transaction scores collection indexes
        logger.info("5. Creating transaction_scores indexes...")
        await db.transaction_scores.create_index([("investigation_id", 1), ("transaction_id", 1)], unique=True)
        logger.info("   ✅ Created index: investigation_id_1_transaction_id_1 (unique)")

        await db.transaction_scores.create_index("investigation_id")
        logger.info("   ✅ Created index: investigation_id")

        await db.transaction_scores.create_index("transaction_id")
        logger.info("   ✅ Created index: transaction_id")
        logger.info("")

        # 6. Audit log collection indexes
        logger.info("6. Creating audit_log indexes...")
        await db.audit_log.create_index("entry_id", unique=True)
        logger.info("   ✅ Created index: entry_id (unique)")

        await db.audit_log.create_index("metadata.investigation_id")
        logger.info("   ✅ Created index: metadata.investigation_id")

        await db.audit_log.create_index("metadata.action_type")
        logger.info("   ✅ Created index: metadata.action_type")

        await db.audit_log.create_index("timestamp")
        logger.info("   ✅ Created index: timestamp")
        logger.info("")

        # 7. Templates collection indexes
        logger.info("7. Creating templates indexes...")
        await db.templates.create_index("template_id", unique=True)
        logger.info("   ✅ Created index: template_id (unique)")
        logger.info("")

        # 8. Composio connections collection indexes
        logger.info("8. Creating composio_connections indexes...")
        await db.composio_connections.create_index("connection_id", unique=True)
        logger.info("   ✅ Created index: connection_id (unique)")
        logger.info("")

        # 9. Composio action audits collection indexes
        logger.info("9. Creating composio_action_audits indexes...")
        await db.composio_action_audits.create_index("audit_id", unique=True)
        logger.info("   ✅ Created index: audit_id (unique)")

        await db.composio_action_audits.create_index("connection_id")
        logger.info("   ✅ Created index: connection_id")
        logger.info("")

        # 10. SOAR playbook executions collection indexes
        logger.info("10. Creating soar_playbook_executions indexes...")
        await db.soar_playbook_executions.create_index("execution_id", unique=True)
        logger.info("   ✅ Created index: execution_id (unique)")

        await db.soar_playbook_executions.create_index("playbook_id")
        logger.info("   ✅ Created index: playbook_id")
        logger.info("")

        # ============================================================================
        # B2B Partner Platform Indexes (Feature: unified-b2b-platform)
        # ============================================================================

        # 11. B2B Partner Organizations collection indexes
        logger.info("11. Creating b2b_partner_organizations indexes...")
        await db.b2b_partner_organizations.create_index("org_id", unique=True)
        logger.info("   ✅ Created index: org_id (unique)")

        await db.b2b_partner_organizations.create_index("partner_id", unique=True)
        logger.info("   ✅ Created index: partner_id (unique)")

        await db.b2b_partner_organizations.create_index("stripe_customer_id", sparse=True)
        logger.info("   ✅ Created index: stripe_customer_id (sparse)")

        await db.b2b_partner_organizations.create_index([("is_active", 1), ("enabled_categories", 1)])
        logger.info("   ✅ Created index: is_active_1_enabled_categories_1")

        await db.b2b_partner_organizations.create_index("parent_org_id", sparse=True)
        logger.info("   ✅ Created index: parent_org_id (sparse)")

        await db.b2b_partner_organizations.create_index("contact_email")
        logger.info("   ✅ Created index: contact_email")
        logger.info("")

        # 12. B2B Partner Users collection indexes
        logger.info("12. Creating b2b_partner_users indexes...")
        await db.b2b_partner_users.create_index("user_id", unique=True)
        logger.info("   ✅ Created index: user_id (unique)")

        await db.b2b_partner_users.create_index([("org_id", 1), ("email", 1)], unique=True)
        logger.info("   ✅ Created index: org_id_1_email_1 (unique)")

        await db.b2b_partner_users.create_index("email")
        logger.info("   ✅ Created index: email")

        await db.b2b_partner_users.create_index([("org_id", 1), ("is_active", 1), ("role", 1)])
        logger.info("   ✅ Created index: org_id_1_is_active_1_role_1")
        logger.info("")

        # 13. B2B Partner API Keys collection indexes
        logger.info("13. Creating b2b_partner_api_keys indexes...")
        await db.b2b_partner_api_keys.create_index("key_id", unique=True)
        logger.info("   ✅ Created index: key_id (unique)")

        await db.b2b_partner_api_keys.create_index([("key_prefix", 1), ("is_active", 1)])
        logger.info("   ✅ Created index: key_prefix_1_is_active_1")

        await db.b2b_partner_api_keys.create_index([("org_id", 1), ("revoked_at", 1)])
        logger.info("   ✅ Created index: org_id_1_revoked_at_1")

        await db.b2b_partner_api_keys.create_index("created_by_user_id")
        logger.info("   ✅ Created index: created_by_user_id")
        logger.info("")

        # 14. B2B Billing Plans collection indexes
        logger.info("14. Creating b2b_billing_plans indexes...")
        await db.b2b_billing_plans.create_index("plan_id", unique=True)
        logger.info("   ✅ Created index: plan_id (unique)")

        await db.b2b_billing_plans.create_index([("is_active", 1), ("is_public", 1), ("display_order", 1)])
        logger.info("   ✅ Created index: is_active_1_is_public_1_display_order_1")

        await db.b2b_billing_plans.create_index("stripe_product_id", sparse=True)
        logger.info("   ✅ Created index: stripe_product_id (sparse)")
        logger.info("")

        # 15. B2B Subscriptions collection indexes
        logger.info("15. Creating b2b_subscriptions indexes...")
        await db.b2b_subscriptions.create_index("subscription_id", unique=True)
        logger.info("   ✅ Created index: subscription_id (unique)")

        await db.b2b_subscriptions.create_index([("org_id", 1), ("status", 1)])
        logger.info("   ✅ Created index: org_id_1_status_1")

        await db.b2b_subscriptions.create_index("stripe_subscription_id", sparse=True)
        logger.info("   ✅ Created index: stripe_subscription_id (sparse)")

        await db.b2b_subscriptions.create_index([("current_period_end", 1), ("status", 1)])
        logger.info("   ✅ Created index: current_period_end_1_status_1")
        logger.info("")

        # 16. B2B Invoices collection indexes
        logger.info("16. Creating b2b_invoices indexes...")
        await db.b2b_invoices.create_index("invoice_id", unique=True)
        logger.info("   ✅ Created index: invoice_id (unique)")

        await db.b2b_invoices.create_index("invoice_number", unique=True, sparse=True)
        logger.info("   ✅ Created index: invoice_number (unique, sparse)")

        await db.b2b_invoices.create_index([("org_id", 1), ("created_at", -1)])
        logger.info("   ✅ Created index: org_id_1_created_at_-1")

        await db.b2b_invoices.create_index("stripe_invoice_id", sparse=True)
        logger.info("   ✅ Created index: stripe_invoice_id (sparse)")

        await db.b2b_invoices.create_index([("status", 1), ("due_date", 1)])
        logger.info("   ✅ Created index: status_1_due_date_1")
        logger.info("")

        # 17. B2B Payment Methods collection indexes
        logger.info("17. Creating b2b_payment_methods indexes...")
        await db.b2b_payment_methods.create_index("payment_method_id", unique=True)
        logger.info("   ✅ Created index: payment_method_id (unique)")

        await db.b2b_payment_methods.create_index([("org_id", 1), ("is_default", -1), ("is_active", 1)])
        logger.info("   ✅ Created index: org_id_1_is_default_-1_is_active_1")

        await db.b2b_payment_methods.create_index("stripe_payment_method_id", sparse=True)
        logger.info("   ✅ Created index: stripe_payment_method_id (sparse)")
        logger.info("")

        # 18. B2B Usage Records collection indexes
        logger.info("18. Creating usage_records indexes...")
        await db.usage_records.create_index([("partner_id", 1), ("capability", 1), ("period_start", 1), ("granularity", 1)], unique=True)
        logger.info("   ✅ Created index: partner_id_1_capability_1_period_start_1_granularity_1 (unique)")

        await db.usage_records.create_index([("partner_id", 1), ("period_start", 1)])
        logger.info("   ✅ Created index: partner_id_1_period_start_1")

        await db.usage_records.create_index("period_start")
        logger.info("   ✅ Created index: period_start")
        logger.info("")

        logger.info("=" * 80)
        logger.info("✅ All MongoDB indexes created successfully!")
        logger.info("=" * 80)

        # Close connection
        client.close()
        sys.exit(0)

    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(create_indexes())
