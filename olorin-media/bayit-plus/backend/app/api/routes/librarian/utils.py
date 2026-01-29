"""
Librarian utility functions.
"""

import asyncio
import logging
from datetime import UTC, datetime

from beanie import PydanticObjectId
from olorin_shared.database import get_mongodb_database

from app.core.config import settings
from app.models.librarian import AuditReport
from app.services.audit_task_manager import audit_task_manager

logger = logging.getLogger(__name__)


async def run_audit_with_tracking(audit_id: str, audit_func, **kwargs):
    """
    Wrapper to run an audit function and track it with the task manager.
    Handles cancellation, exceptions, and cleanup properly.
    Ensures audit status is always updated in the database.
    """
    audit = None

    try:
        logger.info(f"Starting tracked audit {audit_id}")

        # Load audit from database
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except Exception:
            audit = await AuditReport.find_one({"audit_id": audit_id})

        # Run the audit function
        await audit_func(**kwargs, audit_id=audit_id)
        logger.info(f"Completed tracked audit {audit_id}")

    except asyncio.CancelledError:
        logger.info(f"Audit {audit_id} was cancelled by user or system")
        try:
            if not audit:
                try:
                    object_id = PydanticObjectId(audit_id)
                    audit = await AuditReport.get(object_id)
                except Exception:
                    audit = await AuditReport.find_one({"audit_id": audit_id})

            if audit:
                # Use raw MongoDB update to avoid validation issues
                # Use shared MongoDB connection from olorin_shared.database
                db = get_mongodb_database()
                await db["audit_reports"].update_one(
                    {"audit_id": audit_id},
                    {
                        "$set": {
                            "status": "cancelled",
                            "completed_at": datetime.now(UTC),
                        },
                        "$push": {
                            "execution_logs": {
                                "id": f"cancel_{datetime.now(UTC).timestamp()}",
                                "timestamp": datetime.now(UTC).isoformat(),
                                "level": "warn",
                                "message": "Audit cancelled by user or system",
                                "source": "Audit Tracker",
                            }
                        },
                    },
                )
                logger.info(f"Updated audit {audit_id} status to cancelled")
        except Exception as e:
            logger.error(f"Failed to update cancelled audit status: {e}")
        raise

    except Exception as e:
        logger.error(f"Error in tracked audit {audit_id}: {e}", exc_info=True)

        # Update audit status to failed with error details
        try:
            if not audit:
                try:
                    object_id = PydanticObjectId(audit_id)
                    audit = await AuditReport.get(object_id)
                except Exception:
                    audit = await AuditReport.find_one({"audit_id": audit_id})

            if audit:
                # Use raw MongoDB update to avoid validation issues
                # Use shared MongoDB connection from olorin_shared.database
                db = get_mongodb_database()
                await db["audit_reports"].update_one(
                    {"audit_id": audit_id},
                    {
                        "$set": {
                            "status": "failed",
                            "completed_at": datetime.now(UTC),
                            "summary": {
                                "error_occurred": True,
                                "error_message": str(e),
                                "error_type": type(e).__name__,
                                "failed_at": datetime.now(UTC).isoformat(),
                            },
                        },
                        "$push": {
                            "execution_logs": {
                                "id": f"error_{datetime.now(UTC).timestamp()}",
                                "timestamp": datetime.now(UTC).isoformat(),
                                "level": "error",
                                "message": f"Audit failed with error: {str(e)[:200]}",
                                "source": "Audit Tracker",
                            }
                        },
                    },
                )
                logger.info(f"Updated audit {audit_id} status to failed")
        except Exception as update_error:
            logger.error(
                f"Failed to update failed audit status: {update_error}", exc_info=True
            )
        raise

    finally:
        audit_task_manager.unregister_task(audit_id)
