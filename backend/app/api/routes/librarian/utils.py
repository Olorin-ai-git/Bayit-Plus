"""
Librarian utility functions.
"""

import asyncio
import logging

from beanie import PydanticObjectId

from app.models.librarian import AuditReport
from app.services.audit_task_manager import audit_task_manager

logger = logging.getLogger(__name__)


async def run_audit_with_tracking(audit_id: str, audit_func, **kwargs):
    """
    Wrapper to run an audit function and track it with the task manager.
    Handles cancellation and cleanup properly.
    """
    try:
        logger.info(f"Starting tracked audit {audit_id}")
        await audit_func(**kwargs, audit_id=audit_id)
        logger.info(f"Completed tracked audit {audit_id}")
    except asyncio.CancelledError:
        logger.info(f"Audit {audit_id} was cancelled")
        try:
            try:
                object_id = PydanticObjectId(audit_id)
                audit = await AuditReport.get(object_id)
            except Exception:
                audit = await AuditReport.find_one({"audit_id": audit_id})

            if audit:
                audit.status = "cancelled"
                await audit.save()
        except Exception as e:
            logger.error(f"Failed to update cancelled audit status: {e}")
        raise
    except Exception as e:
        logger.error(f"Error in tracked audit {audit_id}: {e}", exc_info=True)
        raise
    finally:
        audit_task_manager.unregister_task(audit_id)
