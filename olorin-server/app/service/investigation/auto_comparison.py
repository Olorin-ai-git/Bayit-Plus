"""
Auto Comparison Service

Automatically runs comparisons for top riskiest entities and generates HTML reports.
"""

import asyncio
import inspect
import json
import os
import re
import uuid
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pytz

from app.router.models.investigation_comparison_models import (
    ComparisonOptions,
    ComparisonRequest,
    WindowPreset,
    WindowSpec,
)
from app.service.logging import get_bridge_logger
from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format percentage value for logging."""
    return f"{value * 100:.{decimals}f}%"


from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.entity_filtering import build_entity_where_clause
from app.service.investigation.investigation_transaction_mapper import (
    get_investigation_by_id,
    get_investigations_for_time_window,
    select_best_investigation,
)

from .comparison_service import compare_windows
from .html_report_generator import generate_html_report

logger = get_bridge_logger(__name__)


async def find_entity_transaction_date_range(
    entity_type: str, entity_value: str, lookback_days: int = 90
) -> Optional[Tuple[datetime, datetime]]:
    """
    Find the date range when an entity had transactions.

    Args:
        entity_type: Entity type (email, device_id, ip, etc.)
        entity_value: Entity value
        lookback_days: Maximum days to look back (default: 90)

    Returns:
        Tuple of (earliest_date, latest_date) or None if no transactions found
    """
    try:
        db_provider = get_database_provider()
        db_provider.connect()
        is_snowflake = (
            os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
        )
        is_async = hasattr(db_provider, "execute_query_async")

        # Build entity where clause
        entity_clause, _ = build_entity_where_clause(
            entity_type, entity_value, is_snowflake
        )

        # Calculate lookback window
        now = datetime.now(pytz.timezone("America/New_York"))
        lookback_start = now - timedelta(days=lookback_days)

        # Build query to find transaction date range
        if is_snowflake:
            datetime_col = "TX_DATETIME"
            table_name = db_provider.get_full_table_name()
            query = f"""
            SELECT 
                MIN({datetime_col}) as earliest_date,
                MAX({datetime_col}) as latest_date,
                COUNT(*) as tx_count
            FROM {table_name}
            WHERE {datetime_col} >= '{lookback_start.isoformat()}'
              AND {entity_clause}
            """
        else:
            datetime_col = "tx_datetime"
            table_name = db_provider.get_full_table_name()
            query = f"""
            SELECT 
                MIN({datetime_col}) as earliest_date,
                MAX({datetime_col}) as latest_date,
                COUNT(*) as tx_count
            FROM {table_name}
            WHERE {datetime_col} >= '{lookback_start.isoformat()}'
              AND {entity_clause}
            """

        # Execute query
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        if not results or len(results) == 0:
            logger.debug(
                f"No transaction date range found for {entity_type}={entity_value}"
            )
            return None

        result = results[0]
        earliest_str = result.get("earliest_date") or result.get("EARLIEST_DATE")
        latest_str = result.get("latest_date") or result.get("LATEST_DATE")
        tx_count = result.get("tx_count") or result.get("TX_COUNT", 0)

        if not earliest_str or not latest_str or tx_count == 0:
            logger.debug(
                f"Empty transaction date range for {entity_type}={entity_value}"
            )
            return None

        # Parse dates and ensure timezone-aware
        tz = pytz.timezone("America/New_York")

        if isinstance(earliest_str, str):
            earliest = datetime.fromisoformat(earliest_str.replace("Z", "+00:00"))
        else:
            earliest = earliest_str

        if isinstance(latest_str, str):
            latest = datetime.fromisoformat(latest_str.replace("Z", "+00:00"))
        else:
            latest = latest_str

        # Ensure timezone-aware (convert naive to aware if needed)
        if earliest.tzinfo is None:
            earliest = tz.localize(earliest)
        else:
            earliest = earliest.astimezone(tz)

        if latest.tzinfo is None:
            latest = tz.localize(latest)
        else:
            latest = latest.astimezone(tz)

        logger.info(
            f"📅 Found transaction date range for {entity_type}={entity_value}: "
            f"{earliest.date()} to {latest.date()} ({tx_count} transactions)"
        )

        return (earliest, latest)

    except Exception as e:
        logger.warning(
            f"⚠️ Failed to find transaction date range for {entity_type}={entity_value}: {e}"
        )
        return None


def detect_entity_type(entity_value: str) -> str:
    """
    Detect entity type from entity value format.

    Args:
        entity_value: The entity value to analyze

    Returns:
        Detected entity type (email, device_id, ip, etc.)
    """
    if not entity_value:
        return "email"  # Default fallback

    entity_value = entity_value.strip()

    # Email detection: contains @ symbol
    if "@" in entity_value:
        return "email"

    # IPv6 detection: contains multiple colons
    if ":" in entity_value and entity_value.count(":") >= 2:
        return "ip"

    # IPv4 detection: 4 groups of digits separated by dots
    ipv4_pattern = r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"
    if re.match(ipv4_pattern, entity_value):
        return "ip"

    # UUID detection: 36 characters with dashes (device_id format)
    uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    if re.match(uuid_pattern, entity_value, re.IGNORECASE):
        return "device_id"

    # Phone number detection: starts with + or contains digits and dashes/parentheses
    phone_pattern = r"^\+?[\d\s\-\(\)]+$"
    if (
        re.match(phone_pattern, entity_value)
        and len(
            entity_value.replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
        )
        >= 10
    ):
        return "phone"

    # Default to email if we can't determine
    return "email"


async def create_and_wait_for_investigation(
    entity_type: str,
    entity_value: str,
    window_start: datetime,
    window_end: datetime,
    max_wait_seconds: int = 600,
) -> Optional[Dict[str, Any]]:
    """
    Create a new investigation and wait for it to complete.

    Args:
        entity_type: Entity type
        entity_value: Entity value
        window_start: Investigation window start
        window_end: Investigation window end
        max_wait_seconds: Maximum time to wait for completion (default: 10 minutes)

    Returns:
        Investigation dict if completed successfully, None otherwise
    """
    try:
        from sqlalchemy.orm import Session

        from app.persistence.database import get_db
        from app.schemas.investigation_state import Entity as EntitySchema
        from app.schemas.investigation_state import (
            InvestigationSettings,
            InvestigationStateCreate,
            InvestigationType,
        )
        from app.schemas.investigation_state import TimeRange as TimeRangeSchema
        from app.service.investigation_state_service import InvestigationStateService

        # Generate investigation ID
        investigation_id = f"auto-comp-{uuid.uuid4().hex[:12]}"

        logger.info(
            f"🔨 Creating investigation {investigation_id} for {entity_type}={entity_value}"
        )
        logger.info(f"   Window: {window_start.date()} to {window_end.date()}")

        # Create investigation settings
        settings = InvestigationSettings(
            name=f"Auto-comparison investigation for {entity_value}",
            entities=[EntitySchema(entity_type=entity_type, entity_value=entity_value)],
            time_range=TimeRangeSchema(
                start_time=window_start.isoformat(), end_time=window_end.isoformat()
            ),
            tools=[],  # Empty tools - LLM will auto-select for hybrid investigations
            correlation_mode="OR",
            investigation_type=InvestigationType.HYBRID,  # Use HYBRID to allow LLM tool selection
            auto_select_entities=False,
        )

        # Create investigation state
        create_data = InvestigationStateCreate(
            investigation_id=investigation_id,
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            settings=settings,
        )

        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)

        try:
            service = InvestigationStateService(db)

            # Create investigation state (without background_tasks, we'll trigger execution manually)
            state_response = await service.create_state(
                user_id="auto-comparison-system",
                data=create_data,
                background_tasks=None,  # We'll trigger execution manually below
            )

            # Manually trigger investigation execution
            from app.router.controllers.investigation_executor import (
                execute_structured_investigation,
            )
            from app.service.investigation_trigger_service import (
                InvestigationTriggerService,
            )

            trigger_service = InvestigationTriggerService(db)
            structured_request = trigger_service.extract_structured_request(
                investigation_id=investigation_id, settings=settings
            )

            if not structured_request:
                logger.error(
                    f"❌ Failed to extract structured request for investigation {investigation_id}"
                )
                return None

            entity = settings.entities[0] if settings.entities else None
            investigation_context = trigger_service.get_investigation_context(
                investigation_id=investigation_id, entity=entity, settings=settings
            )

            # Get state from database and update to IN_PROGRESS
            from app.service.state_query_helper import get_state_by_id

            state = get_state_by_id(db, investigation_id, "auto-comparison-system")
            trigger_service.update_state_to_in_progress(
                investigation_id=investigation_id,
                state=state,
                user_id="auto-comparison-system",
            )
            db.commit()
            db.refresh(state)

            # Initialize investigation folder structure with proper logging
            try:
                from app.service.logging.investigation_folder_manager import (
                    InvestigationMode,
                    get_folder_manager,
                )

                folder_manager = get_folder_manager()

                # Determine mode from environment
                import os

                mode_str = os.getenv("INVESTIGATION_MODE", "LIVE").upper()
                mode = (
                    InvestigationMode[mode_str]
                    if mode_str in ["LIVE", "MOCK", "DEMO"]
                    else InvestigationMode.LIVE
                )

                # Create investigation folder with metadata
                folder_path, metadata = folder_manager.create_investigation_folder(
                    investigation_id=investigation_id,
                    mode=mode,
                    scenario=f"auto_comparison_{entity_type}_{entity_value}",
                    config={
                        "entity_id": entity_value,
                        "entity_type": entity_type,
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                        "investigation_type": "auto_comparison",
                    },
                )
                logger.info(f"✅ Created investigation folder: {folder_path}")

            except Exception as fe:
                logger.warning(f"⚠️ Failed to create investigation folder: {fe}")
                # Don't fail investigation if folder creation fails

            # Initialize journey tracking before execution starts
            try:
                from app.service.agent.journey_tracker import get_journey_tracker

                journey_tracker = get_journey_tracker()
                journey_tracker.start_journey_tracking(
                    investigation_id=investigation_id,
                    initial_state={
                        "entity_id": entity_value,
                        "entity_type": entity_type,
                        "investigation_type": "auto_comparison",
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                    },
                )
                logger.info(
                    f"✅ Initialized journey tracking for investigation {investigation_id}"
                )
            except Exception as je:
                logger.warning(f"⚠️ Failed to initialize journey tracking: {je}")
                # Don't fail investigation if journey tracking fails

            # Trigger execution in background (fire and forget)
            logger.info(
                f"🚀 Triggering investigation execution for {investigation_id}..."
            )
            # Use asyncio.create_task to run in background
            task = asyncio.create_task(
                execute_structured_investigation(
                    investigation_id=investigation_id,
                    investigation_context=investigation_context,
                    request=structured_request,
                )
            )
            # Don't await - let it run in background
            logger.debug(f"   Background task created: {task}")

            logger.info(
                f"✅ Investigation {investigation_id} created and execution triggered, waiting for completion..."
            )

            # Give the task a moment to start
            await asyncio.sleep(2)

            # Poll for completion
            start_time = datetime.now()
            poll_interval = 5  # Check every 5 seconds

            while (datetime.now() - start_time).total_seconds() < max_wait_seconds:
                await asyncio.sleep(poll_interval)

                # Get current state
                try:
                    current_state = service.get_state_with_auth(
                        investigation_id=investigation_id,
                        user_id="auto-comparison-system",
                    )

                    status = current_state.status
                    lifecycle_stage = current_state.lifecycle_stage

                    logger.debug(f"   Status: {status}, Stage: {lifecycle_stage}")

                    if status == "COMPLETED" and lifecycle_stage == "COMPLETED":
                        logger.info(f"✅ Investigation {investigation_id} completed!")

                        # Get investigation from persistence layer
                        investigation = get_investigation_by_id(investigation_id)
                        if investigation:
                            # Trigger post-investigation packaging
                            asyncio.create_task(
                                _trigger_post_investigation_packaging(investigation_id)
                            )
                            return investigation
                        else:
                            logger.warning(
                                f"⚠️ Investigation {investigation_id} completed but not found in persistence layer"
                            )
                            return None

                    elif status in ["ERROR", "FAILED", "CANCELLED"]:
                        logger.error(
                            f"❌ Investigation {investigation_id} failed with status: {status}"
                        )
                        return None

                except Exception as e:
                    logger.warning(f"⚠️ Error checking investigation status: {e}")
                    continue

            logger.warning(
                f"⏱️ Investigation {investigation_id} did not complete within {max_wait_seconds} seconds"
            )
            return None

        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Failed to create investigation: {e}", exc_info=True)
        return None


async def run_auto_comparison_for_entity(
    entity_value: str,
    entity_type: Optional[str] = None,
    reports_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Run automatic comparison for a single entity.

    Args:
        entity_value: The entity value to compare
        entity_type: Optional entity type (will be detected if not provided)
        reports_dir: Directory to save HTML reports (defaults to artifacts/comparisons/)

    Returns:
        Dictionary with comparison results and report path
    """
    # Detect entity type if not provided
    if not entity_type:
        entity_type = detect_entity_type(entity_value)

    logger.info(f"🔍 Running auto-comparison for entity: {entity_type}={entity_value}")

    # Primary goal: Validate prediction quality by comparing historical investigation
    # with actual outcomes that occurred after the investigation period

    now = datetime.now(pytz.timezone("America/New_York"))
    window_duration_days = int(
        os.getenv("INVESTIGATION_DEFAULT_WINDOW_DAYS", "60")
    )  # Default: 60 days (changed from 14)

    # Get max lookback months from environment (default: 6 months)
    max_lookback_months = int(os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6"))
    max_lookback_days = max_lookback_months * 30  # Approximate months to days

    # Step 1: Try to find a historical investigation for this entity
    # Target: Investigation window that covers max_lookback_months ago (60 days of transactions by default)
    # IMPORTANT: We match by investigation WINDOW (from_date/to_date), not when investigation was created
    historical_window_end = now - timedelta(days=max_lookback_days)
    historical_window_start = historical_window_end - timedelta(
        days=window_duration_days
    )  # window_duration_days before that

    logger.info(
        f"🔍 Looking for investigations that cover time window: {historical_window_start.date()} to {historical_window_end.date()}"
    )
    logger.info(f"   (Matching by investigation window dates, not creation time)")

    # Check if we should use existing investigations
    use_existing = (
        os.getenv("USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON", "true").lower()
        == "true"
    )

    if not use_existing:
        logger.info(
            f"⚠️ USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON=false - will create new investigations instead of using existing ones"
        )
        all_investigations = []
    else:
        # Get all investigations for this entity (no time restriction on creation)
        all_investigations = get_investigations_for_time_window(
            entity_type=entity_type,
            entity_id=entity_value,
            window_start=None,  # No restriction on when investigation was created
            window_end=None,
        )

    # Filter to investigations that:
    # 1. Are completed
    # 2. Have a risk score
    # 3. Their investigation window overlaps with or matches the target historical window
    tz = pytz.timezone("America/New_York")
    matching_investigations = []

    for inv in all_investigations:
        inv_status = inv.get("status", "").upper()
        inv_risk_score = inv.get("overall_risk_score")

        # Must be completed and have risk score
        if inv_status != "COMPLETED" or inv_risk_score is None:
            continue

        # Check if investigation window matches target window
        inv_from = inv.get("from_date")
        inv_to = inv.get("to_date")

        if not inv_from or not inv_to:
            continue

        # Parse dates
        if isinstance(inv_from, str):
            inv_from = datetime.fromisoformat(inv_from.replace("Z", "+00:00"))
        if isinstance(inv_to, str):
            inv_to = datetime.fromisoformat(inv_to.replace("Z", "+00:00"))

        if inv_from.tzinfo is None:
            inv_from = tz.localize(inv_from)
        else:
            inv_from = inv_from.astimezone(tz)

        if inv_to.tzinfo is None:
            inv_to = tz.localize(inv_to)
        else:
            inv_to = inv_to.astimezone(tz)

        # Check if investigation window matches target window with ±10 days tolerance
        # Allow flexibility: investigation start/end can be within ±10 days of target window
        tolerance_days = 10
        tolerance = timedelta(days=tolerance_days)

        # Check if investigation window is within tolerance of target window
        # Match if investigation start is within ±10 days of target start
        # OR investigation end is within ±10 days of target end
        # OR investigation window overlaps with target window
        start_diff_start = abs((inv_from - historical_window_start).days)
        start_diff_end = abs((inv_from - historical_window_end).days)
        end_diff_start = abs((inv_to - historical_window_start).days)
        end_diff_end = abs((inv_to - historical_window_end).days)

        # Check overlap
        overlap_start = max(inv_from, historical_window_start)
        overlap_end = min(inv_to, historical_window_end)
        has_overlap = overlap_end > overlap_start

        # Check if within tolerance
        within_tolerance = (
            start_diff_start <= tolerance_days  # Investigation start near target start
            or start_diff_end <= tolerance_days  # Investigation start near target end
            or end_diff_start <= tolerance_days  # Investigation end near target start
            or end_diff_end <= tolerance_days  # Investigation end near target end
            or has_overlap  # Or windows overlap
        )

        if within_tolerance:
            # Calculate overlap percentage for ranking
            if has_overlap:
                target_duration = (
                    historical_window_end - historical_window_start
                ).total_seconds()
                overlap_duration = (overlap_end - overlap_start).total_seconds()
                overlap_pct = (
                    (overlap_duration / target_duration) * 100
                    if target_duration > 0
                    else 0
                )
            else:
                # No overlap but within tolerance - calculate proximity score
                # Closer windows get higher score
                min_start_diff = min(start_diff_start, start_diff_end)
                min_end_diff = min(end_diff_start, end_diff_end)
                avg_diff = (min_start_diff + min_end_diff) / 2
                # Convert to percentage (closer = higher score, max 50% for tolerance-only matches)
                overlap_pct = max(0, 50 - (avg_diff / tolerance_days) * 50)

            matching_investigations.append(
                {
                    "inv": inv,
                    "inv_from": inv_from,
                    "inv_to": inv_to,
                    "overlap_pct": overlap_pct,
                    "risk_score": inv_risk_score,
                }
            )

    # Select best matching investigation (highest overlap, then most recent)
    historical_inv = None
    if matching_investigations:
        # Sort by overlap percentage (desc), then by risk score (desc) as tiebreaker
        matching_investigations.sort(
            key=lambda x: (x["overlap_pct"], x["risk_score"]), reverse=True
        )
        best_match = matching_investigations[0]
        historical_inv = best_match["inv"]

        logger.info(
            f"✅ Found matching investigation: {historical_inv.get('id', 'unknown')}"
        )
        logger.info(
            f"   Investigation window: {best_match['inv_from'].date()} to {best_match['inv_to'].date()}"
        )
        logger.info(
            f"   Target window: {historical_window_start.date()} to {historical_window_end.date()}"
        )
        logger.info(f"   Overlap: {best_match['overlap_pct']:.1f}%")
        logger.info(f"   Risk Score: {best_match['risk_score']}")

    if historical_inv:
        # Validate window reasonableness (should be <= 30 days)
        inv_from = historical_inv.get("from_date")
        inv_to = historical_inv.get("to_date")
        if inv_from and inv_to:
            tz = pytz.timezone("America/New_York")
            if isinstance(inv_from, str):
                inv_from = datetime.fromisoformat(inv_from.replace("Z", "+00:00"))
            if isinstance(inv_to, str):
                inv_to = datetime.fromisoformat(inv_to.replace("Z", "+00:00"))

            if inv_from.tzinfo is None:
                inv_from = tz.localize(inv_from)
            else:
                inv_from = inv_from.astimezone(tz)

            if inv_to.tzinfo is None:
                inv_to = tz.localize(inv_to)
            else:
                inv_to = inv_to.astimezone(tz)

            window_duration = (inv_to - inv_from).days
            if window_duration > 30:
                logger.warning(
                    f"⚠️ Investigation {historical_inv.get('id', 'unknown')} has unreasonable window duration ({window_duration} days), skipping..."
                )
                historical_inv = None

    if historical_inv:
        # Found a historical investigation - use it for prediction validation
        inv_from = historical_inv.get("from_date")
        inv_to = historical_inv.get("to_date")

        # Parse and ensure timezone-aware
        tz = pytz.timezone("America/New_York")
        if isinstance(inv_from, str):
            inv_from = datetime.fromisoformat(inv_from.replace("Z", "+00:00"))
        if isinstance(inv_to, str):
            inv_to = datetime.fromisoformat(inv_to.replace("Z", "+00:00"))

        if inv_from.tzinfo is None:
            inv_from = tz.localize(inv_from)
        else:
            inv_from = inv_from.astimezone(tz)

        if inv_to.tzinfo is None:
            inv_to = tz.localize(inv_to)
        else:
            inv_to = inv_to.astimezone(tz)

        # Window A: Historical investigation period (has predicted risk)
        window_a_start = inv_from
        window_a_end = inv_to

        # Window B: Validation period (after investigation, check actual outcomes)
        # CRITICAL: Ensure timezone consistency and that end > start
        validation_period_end_candidate = inv_to + timedelta(days=90)
        # Ensure both are in same timezone as inv_to
        if validation_period_end_candidate.tzinfo is None:
            validation_period_end_candidate = tz.localize(
                validation_period_end_candidate
            )
        else:
            validation_period_end_candidate = (
                validation_period_end_candidate.astimezone(inv_to.tzinfo)
            )

        # Ensure now is in same timezone
        if now.tzinfo is None:
            now_tz = tz.localize(now)
        else:
            now_tz = now.astimezone(inv_to.tzinfo)

        validation_period_end = min(now_tz, validation_period_end_candidate)
        window_b_start = inv_to
        window_b_end = validation_period_end

        # CRITICAL VALIDATION: Ensure window_b_end > window_b_start
        # If validation_period_end is before or equal to inv_to, add at least 1 day
        if window_b_end <= window_b_start:
            logger.warning(
                f"⚠️ Validation period end ({window_b_end}) is not after investigation end ({window_b_start}). "
                f"Adjusting validation period to start 1 day after investigation end."
            )
            window_b_start = inv_to + timedelta(days=1)
            window_b_end = min(now_tz, window_b_start + timedelta(days=90))

            # Final safety check
            if window_b_end <= window_b_start:
                logger.error(
                    f"❌ Cannot create valid validation window: start={window_b_start}, end={window_b_end}. "
                    f"Investigation ended too recently or timezone mismatch. Skipping comparison."
                )
                # Return error instead of proceeding with invalid windows
                return {
                    "status": "error",
                    "entity_type": entity_type,
                    "entity_value": entity_value,
                    "error": f"Cannot create valid validation window: investigation ended at {inv_to}, but validation period end ({window_b_end}) is not after start ({window_b_start}). This may be due to timezone issues or investigation ending too recently.",
                    "error_type": "ValidationError",
                    "error_explanation": f"Investigation window ends at {inv_to}, but cannot create a valid validation period after it. This may occur if the investigation just completed or there's a timezone mismatch.",
                }

        logger.info(
            f"✅ Found valid historical investigation: {historical_inv.get('id', 'unknown')}"
        )
        logger.info(f"   Status: {historical_inv.get('status', 'unknown')}")
        logger.info(f"   Risk Score: {historical_inv.get('overall_risk_score', 'N/A')}")
        logger.info(f"📊 Prediction Validation Setup:")
        logger.info(
            f"   Window A (Historical Investigation): {window_a_start.date()} to {window_a_end.date()}"
        )
        logger.info(
            f"   Window B (Validation Period): {window_b_start.date()} to {window_b_end.date()}"
        )

        # Check data availability before proceeding
        from app.service.investigation.data_availability_check import (
            check_data_availability,
        )

        availability = await check_data_availability(
            entity_type=entity_type,
            entity_value=entity_value,
            window_a_start=window_a_start,
            window_a_end=window_a_end,
            window_b_start=window_b_start,
            window_b_end=window_b_end,
            merchant_ids=None,
            is_snowflake=None,
        )

        # If no transactions found, try to find oldest investigation window
        if not availability.get("available", False):
            window_a_count = availability.get("window_a_count", 0)
            window_b_count = availability.get("window_b_count", 0)
            logger.warning(
                f"⚠️ No transaction data found in investigation windows (Window A: {window_a_count}, Window B: {window_b_count})"
            )

            # Check if we should use existing investigations
            use_existing = (
                os.getenv("USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON", "true").lower()
                == "true"
            )

            if not use_existing:
                logger.info(
                    f"⚠️ USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON=false - skipping search for existing investigations"
                )
                all_investigations = []
            else:
                logger.info(
                    f"🔍 Searching for oldest investigation with transaction data..."
                )

                # Find all investigations for this entity (no time restriction)
                all_investigations = get_investigations_for_time_window(
                    entity_type=entity_type,
                    entity_id=entity_value,
                    window_start=None,
                    window_end=None,
                )

            # Filter to completed investigations with risk scores
            valid_investigations = [
                inv
                for inv in all_investigations
                if inv.get("status", "").upper() == "COMPLETED"
                and inv.get("overall_risk_score") is not None
            ]

            if valid_investigations:
                # Sort by from_date (oldest first)
                tz = pytz.timezone("America/New_York")
                for inv in valid_investigations:
                    inv_from = inv.get("from_date")
                    if inv_from:
                        if isinstance(inv_from, str):
                            inv_from = datetime.fromisoformat(
                                inv_from.replace("Z", "+00:00")
                            )
                        if inv_from.tzinfo is None:
                            inv_from = tz.localize(inv_from)
                        else:
                            inv_from = inv_from.astimezone(tz)
                        inv["_parsed_from"] = inv_from

                valid_investigations.sort(
                    key=lambda x: x.get("_parsed_from")
                    or datetime.min.replace(tzinfo=tz)
                )

                # Try each investigation from oldest to newest until we find one with transaction data
                for oldest_inv in valid_investigations:
                    oldest_from = oldest_inv.get("from_date")
                    oldest_to = oldest_inv.get("to_date")

                    if not oldest_from or not oldest_to:
                        continue

                    # Parse dates
                    if isinstance(oldest_from, str):
                        oldest_from = datetime.fromisoformat(
                            oldest_from.replace("Z", "+00:00")
                        )
                    if isinstance(oldest_to, str):
                        oldest_to = datetime.fromisoformat(
                            oldest_to.replace("Z", "+00:00")
                        )

                    if oldest_from.tzinfo is None:
                        oldest_from = tz.localize(oldest_from)
                    else:
                        oldest_from = oldest_from.astimezone(tz)

                    if oldest_to.tzinfo is None:
                        oldest_to = tz.localize(oldest_to)
                    else:
                        oldest_to = oldest_to.astimezone(tz)

                    # Check if this investigation window has transaction data
                    oldest_availability = await check_data_availability(
                        entity_type=entity_type,
                        entity_value=entity_value,
                        window_a_start=oldest_from,
                        window_a_end=oldest_to,
                        window_b_start=oldest_to,  # Validation window starts after investigation
                        window_b_end=min(
                            now, oldest_to + timedelta(days=90)
                        ),  # Up to 90 days after
                        merchant_ids=None,
                        is_snowflake=None,
                    )

                    if oldest_availability.get("available", False):
                        logger.info(
                            f"✅ Found oldest investigation with transaction data: {oldest_inv.get('id', 'unknown')}"
                        )
                        logger.info(
                            f"   Window: {oldest_from.date()} to {oldest_to.date()}"
                        )
                        logger.info(
                            f"   Risk Score: {oldest_inv.get('overall_risk_score', 'N/A')}"
                        )

                        # Use this investigation instead
                        historical_inv = oldest_inv
                        window_a_start = oldest_from
                        window_a_end = oldest_to

                        # CRITICAL: Ensure timezone consistency and that end > start
                        validation_period_end_candidate = oldest_to + timedelta(days=90)
                        if validation_period_end_candidate.tzinfo is None:
                            validation_period_end_candidate = tz.localize(
                                validation_period_end_candidate
                            )
                        else:
                            validation_period_end_candidate = (
                                validation_period_end_candidate.astimezone(
                                    oldest_to.tzinfo
                                )
                            )

                        if now.tzinfo is None:
                            now_tz = tz.localize(now)
                        else:
                            now_tz = now.astimezone(oldest_to.tzinfo)

                        validation_period_end = min(
                            now_tz, validation_period_end_candidate
                        )
                        window_b_start = oldest_to
                        window_b_end = validation_period_end

                        # CRITICAL VALIDATION: Ensure window_b_end > window_b_start
                        if window_b_end <= window_b_start:
                            logger.warning(
                                f"⚠️ Validation period end ({window_b_end}) is not after investigation end ({window_b_start}). "
                                f"Adjusting validation period to start 1 day after investigation end."
                            )
                            window_b_start = oldest_to + timedelta(days=1)
                            window_b_end = min(
                                now_tz, window_b_start + timedelta(days=90)
                            )

                            if window_b_end <= window_b_start:
                                logger.error(
                                    f"❌ Cannot create valid validation window for oldest investigation. Skipping."
                                )
                                continue

                        break
                else:
                    # No investigations found with transaction data
                    # Fallback: Use the oldest investigation window even without transactions
                    if valid_investigations:
                        oldest_inv_fallback = valid_investigations[
                            0
                        ]  # Already sorted by oldest first
                        oldest_from_fallback = oldest_inv_fallback.get("from_date")
                        oldest_to_fallback = oldest_inv_fallback.get("to_date")

                        if oldest_from_fallback and oldest_to_fallback:
                            # Parse dates
                            if isinstance(oldest_from_fallback, str):
                                oldest_from_fallback = datetime.fromisoformat(
                                    oldest_from_fallback.replace("Z", "+00:00")
                                )
                            if isinstance(oldest_to_fallback, str):
                                oldest_to_fallback = datetime.fromisoformat(
                                    oldest_to_fallback.replace("Z", "+00:00")
                                )

                            if oldest_from_fallback.tzinfo is None:
                                oldest_from_fallback = tz.localize(oldest_from_fallback)
                            else:
                                oldest_from_fallback = oldest_from_fallback.astimezone(
                                    tz
                                )

                            if oldest_to_fallback.tzinfo is None:
                                oldest_to_fallback = tz.localize(oldest_to_fallback)
                            else:
                                oldest_to_fallback = oldest_to_fallback.astimezone(tz)

                            logger.warning(
                                f"⚠️ No investigations found with transaction data"
                            )
                            logger.info(
                                f"📅 Using oldest investigation window (no transaction data): {oldest_inv_fallback.get('id', 'unknown')}"
                            )
                            logger.info(
                                f"   Window: {oldest_from_fallback.date()} to {oldest_to_fallback.date()}"
                            )
                            logger.info(
                                f"   Risk Score: {oldest_inv_fallback.get('overall_risk_score', 'N/A')}"
                            )

                            # Use oldest investigation even without transaction data
                            historical_inv = oldest_inv_fallback
                            window_a_start = oldest_from_fallback
                            window_a_end = oldest_to_fallback
                            validation_period_end = min(
                                now, oldest_to_fallback + timedelta(days=90)
                            )
                            window_b_start = oldest_to_fallback
                            window_b_end = validation_period_end
                        else:
                            logger.warning(
                                f"⚠️ Oldest investigation has invalid dates, will skip comparison"
                            )
                            historical_inv = None
                    else:
                        logger.warning(
                            f"⚠️ No valid completed investigations found, will skip comparison"
                        )
                        historical_inv = None
            else:
                logger.warning(f"⚠️ No valid completed investigations found for entity")
                historical_inv = None

        request = ComparisonRequest(
            entity={"type": entity_type, "value": entity_value},
            windowA=WindowSpec(
                preset=WindowPreset.CUSTOM,
                start=window_a_start,
                end=window_a_end,
                label=f"Historical Investigation ({window_a_start.date()} to {window_a_end.date()})",
            ),
            windowB=WindowSpec(
                preset=WindowPreset.CUSTOM,
                start=window_b_start,
                end=window_b_end,
                label=f"Validation Period ({window_b_start.date()} to {window_b_end.date()})",
            ),
            risk_threshold=float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")),
            options=ComparisonOptions(
                include_per_merchant=True,
                max_merchants=25,
                include_histograms=True,
                include_timeseries=True,
            ),
        )
    else:
        # No historical investigation found - MUST create one and wait for completion
        logger.info(
            f"⚠️ No historical investigation found - creating new investigation..."
        )

        # First, check if entity has transaction data in the desired historical window
        # Determine historical window respecting ANALYTICS_MAX_LOOKBACK_MONTHS constraint
        # Note: os is already imported at module level, don't re-import here
        max_lookback_months = int(os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6"))
        max_lookback_days = max_lookback_months * 30

        # Cap historical_window_end at max_lookback_days before now
        historical_window_end = now - timedelta(days=max_lookback_days)
        historical_window_start = historical_window_end - timedelta(
            days=window_duration_days
        )

        # Check data availability for this window before creating investigation
        from app.service.investigation.data_availability_check import (
            check_data_availability,
        )

        availability = await check_data_availability(
            entity_type=entity_type,
            entity_value=entity_value,
            window_a_start=historical_window_start,
            window_a_end=historical_window_end,
            window_b_start=historical_window_end,  # Validation window starts after historical
            window_b_end=now,  # Validation window ends now
            merchant_ids=None,
            is_snowflake=None,
        )

        # If no data in historical window, find when entity actually had transactions
        if availability.get("window_a_count", 0) == 0:
            logger.info(
                f"⚠️ No transaction data found in desired historical window ({historical_window_start.date()} to {historical_window_end.date()})"
            )
            logger.info(
                f"🔍 Finding actual transaction date range for {entity_type}={entity_value}..."
            )

            date_range = await find_entity_transaction_date_range(
                entity_type, entity_value, lookback_days=180
            )

            if date_range:
                earliest_date, latest_date = date_range
                days_span = (latest_date - earliest_date).days

                # Use actual transaction dates to determine historical window
                # Read minimum requirements from environment variables
                min_required_span = int(os.getenv("INVESTIGATION_MIN_REQUIRED_SPAN_DAYS", "30"))
                span_tolerance_days = int(os.getenv("INVESTIGATION_SPAN_TOLERANCE_DAYS", "10"))
                min_with_tolerance = min_required_span - span_tolerance_days

                if days_span >= min_with_tolerance:
                    # Find a historical window within the transaction date range
                    # Use actual span if less than target, otherwise use target duration
                    actual_window_days = min(days_span, window_duration_days)

                    # Get max lookback constraint
                    max_lookback_months = int(
                        os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
                    )
                    max_lookback_days = max_lookback_months * 30
                    max_allowed_end = now - timedelta(days=max_lookback_days)

                    # Calculate target window respecting BOTH constraints:
                    # 1. Must be within transaction date range (earliest_date to latest_date)
                    # 2. Must not exceed max lookback (end <= max_allowed_end)

                    # Start with the most restrictive end date
                    effective_max_end = min(latest_date, max_allowed_end)

                    # CRITICAL FIX: Calculate window ensuring start < end
                    # Strategy: Try to fit window_duration_days window ending at effective_max_end
                    # If that doesn't fit, use the maximum possible window within constraints

                    # First attempt: window ending at effective_max_end
                    target_end = effective_max_end
                    target_start = target_end - timedelta(days=actual_window_days)

                    # Ensure the window is within the actual transaction range
                    if target_start < earliest_date:
                        # Window doesn't fit ending at effective_max_end
                        # Try: window starting at earliest_date
                        target_start = earliest_date
                        target_end = target_start + timedelta(days=actual_window_days)

                        # Ensure end doesn't exceed effective_max_end
                        if target_end > effective_max_end:
                            # Can't fit full window - use what fits
                            target_end = effective_max_end
                            # Recalculate start to ensure we get maximum possible window
                            target_start = max(
                                earliest_date,
                                target_end - timedelta(days=actual_window_days),
                            )

                    # Final validation: ensure start < end
                    if target_start >= target_end:
                        # Still invalid - use minimal valid window
                        # Use earliest_date as start, effective_max_end as end (if they're different)
                        if earliest_date < effective_max_end:
                            # Use maximum possible window (could be less than actual_window_days)
                            target_start = earliest_date
                            target_end = effective_max_end
                            logger.warning(
                                f"⚠️ Using maximum available window: {target_start.date()} to {target_end.date()} "
                                f"({(target_end - target_start).days} days, requested {actual_window_days} days)"
                            )
                        else:
                            # Cannot create valid window - earliest_date >= effective_max_end
                            logger.error(
                                f"❌ Cannot create valid window: earliest_date ({earliest_date.date()}) >= "
                                f"effective_max_end ({effective_max_end.date()}). Transaction range too narrow."
                            )
                            # Fall back to default windows - skip this adjustment
                            logger.warning(
                                f"⚠️ Skipping transaction date range adjustment - using default windows"
                            )
                            # Don't set target_start/target_end to None - keep using default windows
                            # The code below will use the default historical_window_start/end
                            target_start = None  # Signal to skip adjustment
                            target_end = None

                    # Only use adjusted windows if they're valid
                    if target_start is not None and target_end is not None:
                        historical_window_start = target_start
                        historical_window_end = target_end

                        logger.info(f"📅 Using actual transaction date range:")
                        logger.info(
                            f"   Historical window: {historical_window_start.date()} to {historical_window_end.date()}"
                        )
                        logger.info(
                            f"   Window duration: {(historical_window_end - historical_window_start).days} days (tolerance: ±{span_tolerance_days} days)"
                        )
                    else:
                        logger.info(
                            f"📅 Using default window dates (transaction range adjustment skipped)"
                        )
                else:
                    logger.warning(
                        f"⚠️ Insufficient transaction span ({days_span} days, minimum {min_with_tolerance} days required)"
                    )
                    # Fall through to use default windows
            else:
                logger.warning(
                    f"⚠️ No transaction data found for {entity_type}={entity_value} in last 180 days"
                )
                # Fall through to use default windows

        # Final validation: Ensure window_end doesn't exceed max lookback constraint
        # and that start < end
        max_lookback_months = int(os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6"))
        max_lookback_days = max_lookback_months * 30
        max_allowed_end = now - timedelta(days=max_lookback_days)

        # Normalize to UTC for comparison
        utc = pytz.UTC
        if historical_window_end.tzinfo is None:
            historical_window_end_utc = utc.localize(historical_window_end)
        else:
            historical_window_end_utc = historical_window_end.astimezone(utc)

        if max_allowed_end.tzinfo is None:
            max_allowed_end_utc = utc.localize(max_allowed_end)
        else:
            max_allowed_end_utc = max_allowed_end.astimezone(utc)

        # Cap historical_window_end if it exceeds max lookback
        if historical_window_end_utc > max_allowed_end_utc:
            logger.warning(
                f"⚠️ Window end {historical_window_end_utc.date()} exceeds max lookback ({max_allowed_end_utc.date()}), capping to {max_allowed_end_utc.date()}"
            )
            historical_window_end = max_allowed_end
            historical_window_end_utc = max_allowed_end_utc

        # Normalize start to UTC for comparison
        if historical_window_start.tzinfo is None:
            historical_window_start_utc = utc.localize(historical_window_start)
        else:
            historical_window_start_utc = historical_window_start.astimezone(utc)

        # CRITICAL: Ensure start < end (fix invalid windows)
        if historical_window_start_utc >= historical_window_end_utc:
            logger.warning(
                f"⚠️ Invalid window: start {historical_window_start_utc.date()} >= end {historical_window_end_utc.date()}, adjusting..."
            )
            # Recalculate: set end to max_allowed_end, start to window_duration_days before that
            historical_window_end = max_allowed_end
            historical_window_end_utc = max_allowed_end_utc
            historical_window_start = historical_window_end - timedelta(
                days=window_duration_days
            )
            historical_window_start_utc = (
                historical_window_start.astimezone(utc)
                if historical_window_start.tzinfo
                else utc.localize(historical_window_start)
            )

            # Final check: if start is still >= end, use minimum valid window
            if historical_window_start_utc >= historical_window_end_utc:
                logger.error(
                    f"⚠️ Cannot create valid window with duration {window_duration_days} days within max lookback constraint"
                )
                # Use a minimal 1-day window ending at max_allowed_end
                historical_window_end = max_allowed_end
                historical_window_start = historical_window_end - timedelta(days=1)
                logger.warning(
                    f"⚠️ Using minimal 1-day window: {historical_window_start.date()} to {historical_window_end.date()}"
                )

        # Final validation: ensure start < end
        if historical_window_start.tzinfo is None:
            start_utc = utc.localize(historical_window_start)
        else:
            start_utc = historical_window_start.astimezone(utc)

        if historical_window_end.tzinfo is None:
            end_utc = utc.localize(historical_window_end)
        else:
            end_utc = historical_window_end.astimezone(utc)

        if start_utc >= end_utc:
            raise ValueError(
                f"Invalid window: start ({start_utc.date()}) must be before end ({end_utc.date()})"
            )

        logger.info(f"🔨 Creating historical investigation:")
        logger.info(
            f"   Window: {historical_window_start.date()} to {historical_window_end.date()}"
        )
        logger.info(f"   Duration: {(end_utc - start_utc).days} days")

        # Create and wait for investigation
        historical_inv = await create_and_wait_for_investigation(
            entity_type=entity_type,
            entity_value=entity_value,
            window_start=historical_window_start,
            window_end=historical_window_end,
            max_wait_seconds=600,  # Wait up to 10 minutes
        )

        if historical_inv:
            # Use the newly created investigation
            inv_from = historical_inv.get("from_date") or historical_window_start
            inv_to = historical_inv.get("to_date") or historical_window_end

            # Parse and ensure timezone-aware
            tz = pytz.timezone("America/New_York")
            if isinstance(inv_from, str):
                inv_from = datetime.fromisoformat(inv_from.replace("Z", "+00:00"))
            elif not isinstance(inv_from, datetime):
                inv_from = historical_window_start

            if isinstance(inv_to, str):
                inv_to = datetime.fromisoformat(inv_to.replace("Z", "+00:00"))
            elif not isinstance(inv_to, datetime):
                inv_to = historical_window_end

            if inv_from.tzinfo is None:
                inv_from = tz.localize(inv_from)
            else:
                inv_from = inv_from.astimezone(tz)

            if inv_to.tzinfo is None:
                inv_to = tz.localize(inv_to)
            else:
                inv_to = inv_to.astimezone(tz)

            # Window A: Historical investigation period (has predicted risk)
            window_a_start = inv_from
            window_a_end = inv_to

            # Window B: Validation period (after investigation, check actual outcomes)
            # CRITICAL: Ensure timezone consistency and that end > start
            validation_period_end_candidate = inv_to + timedelta(days=90)
            # Ensure both are in same timezone as inv_to
            if validation_period_end_candidate.tzinfo is None:
                validation_period_end_candidate = tz.localize(
                    validation_period_end_candidate
                )
            else:
                validation_period_end_candidate = (
                    validation_period_end_candidate.astimezone(inv_to.tzinfo)
                )

            # Ensure now is in same timezone
            if now.tzinfo is None:
                now_tz = tz.localize(now)
            else:
                now_tz = now.astimezone(inv_to.tzinfo)

            validation_period_end = min(now_tz, validation_period_end_candidate)
            window_b_start = inv_to
            window_b_end = validation_period_end

            # CRITICAL VALIDATION: Ensure window_b_end > window_b_start
            # If validation_period_end is before or equal to inv_to, add at least 1 day
            if window_b_end <= window_b_start:
                logger.warning(
                    f"⚠️ Validation period end ({window_b_end}) is not after investigation end ({window_b_start}). "
                    f"Adjusting validation period to start 1 day after investigation end."
                )
                window_b_start = inv_to + timedelta(days=1)
                window_b_end = min(now_tz, window_b_start + timedelta(days=90))

                # Final safety check
                if window_b_end <= window_b_start:
                    logger.error(
                        f"❌ Cannot create valid validation window: start={window_b_start}, end={window_b_end}. "
                        f"Investigation ended too recently or timezone mismatch. Skipping comparison."
                    )
                    # Skip this comparison - cannot create valid windows
                    historical_inv = None

            if historical_inv:
                logger.info(
                    f"✅ Created and completed historical investigation: {historical_inv.get('id', 'unknown')}"
                )
                logger.info(f"📊 Prediction Validation Setup:")
                logger.info(
                    f"   Window A (Historical Investigation): {window_a_start.date()} to {window_a_end.date()}"
                )
                logger.info(
                    f"   Window B (Validation Period): {window_b_start.date()} to {window_b_end.date()}"
                )

                # Extract predicted risk score (check domain_findings if overall_risk_score is 0.0 or None)
                predicted_risk_display = historical_inv.get("overall_risk_score", "N/A")
                if predicted_risk_display == 0.0 or predicted_risk_display is None:
                    domain_findings = historical_inv.get("domain_findings", {})
                    if domain_findings and isinstance(domain_findings, dict):
                        risk_domain = domain_findings.get("risk", {})
                        if isinstance(risk_domain, dict):
                            risk_score = risk_domain.get("risk_score")
                            if risk_score is not None and risk_score != 0.0:
                                predicted_risk_display = risk_score
                                logger.info(
                                    f"   Predicted Risk: {predicted_risk_display:.3f} (extracted from domain_findings.risk.risk_score)"
                                )
                            else:
                                logger.info(
                                    f"   Predicted Risk: {predicted_risk_display} (no risk score available)"
                                )
                        else:
                            logger.info(
                                f"   Predicted Risk: {predicted_risk_display} (no risk domain findings)"
                            )
                    else:
                        logger.info(
                            f"   Predicted Risk: {predicted_risk_display} (no domain_findings available)"
                        )
                else:
                    logger.info(f"   Predicted Risk: {predicted_risk_display:.3f}")

                request = ComparisonRequest(
                    entity={"type": entity_type, "value": entity_value},
                    windowA=WindowSpec(
                        preset=WindowPreset.CUSTOM,
                        start=window_a_start,
                        end=window_a_end,
                        label=f"Historical Investigation ({window_a_start.date()} to {window_a_end.date()})",
                    ),
                    windowB=WindowSpec(
                        preset=WindowPreset.CUSTOM,
                        start=window_b_start,
                        end=window_b_end,
                        label=f"Validation Period ({window_b_start.date()} to {window_b_end.date()})",
                    ),
                    risk_threshold=float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")),
                    options=ComparisonOptions(
                        include_per_merchant=True,
                        max_merchants=25,
                        include_histograms=True,
                        include_timeseries=True,
                    ),
                )
        else:
            # Investigation creation failed - fallback to transaction-based comparison
            logger.warning(
                f"⚠️ Failed to create historical investigation, falling back to transaction-based comparison..."
            )
            date_range = await find_entity_transaction_date_range(
                entity_type, entity_value, lookback_days=180
            )

            if date_range:
                earliest_date, latest_date = date_range
                days_span = (latest_date - earliest_date).days

                # If we have enough span, use earlier period as "historical" and later as "validation"
                if days_span >= 30:
                    # Split: earlier period = historical, later period = validation
                    mid_point = earliest_date + timedelta(days=days_span // 2)
                    window_a_start = earliest_date
                    window_a_end = mid_point
                    window_b_start = mid_point
                    window_b_end = latest_date

                    logger.info(
                        f"📊 Using transaction-based comparison (no investigation found):"
                    )
                    logger.info(
                        f"   Window A: {window_a_start.date()} to {window_a_end.date()}"
                    )
                    logger.info(
                        f"   Window B: {window_b_start.date()} to {window_b_end.date()}"
                    )

                    request = ComparisonRequest(
                        entity={"type": entity_type, "value": entity_value},
                        windowA=WindowSpec(
                            preset=WindowPreset.CUSTOM,
                            start=window_a_start,
                            end=window_a_end,
                            label=f"Historical Period ({window_a_start.date()} to {window_a_end.date()})",
                        ),
                        windowB=WindowSpec(
                            preset=WindowPreset.CUSTOM,
                            start=window_b_start,
                            end=window_b_end,
                            label=f"Recent Period ({window_b_start.date()} to {window_b_end.date()})",
                        ),
                        risk_threshold=float(
                            os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")
                        ),
                        options=ComparisonOptions(
                            include_per_merchant=True,
                            max_merchants=25,
                            include_histograms=True,
                            include_timeseries=True,
                        ),
                    )
                else:
                    # Not enough span - use default windows
                    logger.info(
                        f"📊 Using default windows (insufficient transaction span)"
                    )
                    request = ComparisonRequest(
                        entity={"type": entity_type, "value": entity_value},
                        windowA=WindowSpec(
                            preset=WindowPreset.RETRO_14D_6MO_BACK,
                            label="Retro 14d (6mo back)",
                        ),
                        windowB=WindowSpec(
                            preset=WindowPreset.RECENT_14D, label="Recent 14d"
                        ),
                        risk_threshold=float(
                            os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")
                        ),
                        options=ComparisonOptions(
                            include_per_merchant=True,
                            max_merchants=25,
                            include_histograms=True,
                            include_timeseries=True,
                        ),
                    )
            else:
                # Fallback: Use default windows
                logger.info(
                    f"📊 Using default windows (no transaction date range found)"
                )
                request = ComparisonRequest(
                    entity={"type": entity_type, "value": entity_value},
                    windowA=WindowSpec(
                        preset=WindowPreset.RETRO_14D_6MO_BACK,
                        label="Retro 14d (6mo back)",
                    ),
                    windowB=WindowSpec(
                        preset=WindowPreset.RECENT_14D, label="Recent 14d"
                    ),
                    risk_threshold=float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")),
                    options=ComparisonOptions(
                        include_per_merchant=True,
                        max_merchants=25,
                        include_histograms=True,
                        include_timeseries=True,
                    ),
                )

    # Check if we have a valid request to proceed with
    # If historical_inv was set to None after validation, we may still have a request from the else branch
    # But if we're in the else branch and historical_inv is None, we need to check if request exists
    if not historical_inv:
        # Check if we have a request from the else branch (investigation creation or fallback)
        if "request" not in locals():
            logger.warning(
                f"⚠️ No valid investigation found for {entity_type}={entity_value} after all checks"
            )
            return {
                "status": "skipped",
                "entity_type": entity_type,
                "entity_value": entity_value,
                "reason": "no_valid_investigation",
                "message": f"No valid completed investigation with risk score found for {entity_type}:{entity_value}",
            }

    try:
        # Final data availability check before running comparison
        # Need to resolve presets to actual dates first
        from app.service.investigation.data_availability_check import (
            check_data_availability,
        )
        from app.service.investigation.window_computation import compute_window

        # Resolve window A dates (handle presets)
        if request.windowA.preset == WindowPreset.CUSTOM:
            window_a_start = request.windowA.start
            window_a_end = request.windowA.end
        else:
            window_a_start, window_a_end, _ = compute_window(
                request.windowA.preset, request.windowA.start, request.windowA.end
            )

        # Resolve window B dates (handle presets)
        if request.windowB.preset == WindowPreset.CUSTOM:
            window_b_start = request.windowB.start
            window_b_end = request.windowB.end
        else:
            window_b_start, window_b_end, _ = compute_window(
                request.windowB.preset, request.windowB.start, request.windowB.end
            )

        final_availability = await check_data_availability(
            entity_type=entity_type,
            entity_value=entity_value,
            window_a_start=window_a_start,
            window_a_end=window_a_end,
            window_b_start=window_b_start,
            window_b_end=window_b_end,
            merchant_ids=None,
            is_snowflake=None,
        )

        if not final_availability.get("available", False):
            window_a_count = final_availability.get("window_a_count", 0)
            window_b_count = final_availability.get("window_b_count", 0)

            # If we have a historical investigation (including fallback without transactions),
            # proceed with comparison anyway - user requested using oldest investigation window
            if historical_inv:
                logger.warning(
                    f"⚠️ No transaction data found in comparison windows "
                    f"(Window A: {window_a_count}, Window B: {window_b_count}), "
                    f"but proceeding with comparison using investigation window as requested"
                )
            else:
                # No investigation found - skip comparison
                error_msg = (
                    f"No transaction data found for {entity_type}:{entity_value} in comparison windows. "
                    f"Window A: {window_a_count} transactions, Window B: {window_b_count} transactions. "
                    f"Skipping comparison - entity may not have sufficient historical data."
                )
                logger.warning(f"⚠️ {error_msg}")
                return {
                    "status": "skipped",
                    "entity_type": entity_type,
                    "entity_value": entity_value,
                    "reason": "insufficient_data",
                    "window_a_count": window_a_count,
                    "window_b_count": window_b_count,
                    "message": error_msg,
                }

        # Run comparison
        logger.info(f"⚙️ Running comparison for {entity_type}={entity_value}...")
        if historical_inv:
            logger.info(f"   Investigation ID: {historical_inv.get('id', 'unknown')}")
            logger.info(
                f"   Investigation Risk Score: {historical_inv.get('overall_risk_score', 'N/A')}"
            )
        logger.info(
            f"   Window A: {window_a_start.date()} to {window_a_end.date()} ({final_availability.get('window_a_count', 0)} transactions)"
        )
        logger.info(
            f"   Window B: {window_b_start.date()} to {window_b_end.date()} ({final_availability.get('window_b_count', 0)} transactions)"
        )
        response = await compare_windows(request)

        # Log auto-expand status
        if (
            response.windowA.auto_expand_meta
            and response.windowA.auto_expand_meta.expanded
        ):
            original_days = response.windowA.auto_expand_meta.attempts[0]
            effective_days = response.windowA.auto_expand_meta.attempts[1]
            logger.info(
                f"✅ Window A expanded: {original_days}d → {effective_days}d to reach minimum support"
            )
            if response.windowA.auto_expand_meta.reasons:
                logger.info(
                    f"   Expansion reasons: {', '.join(response.windowA.auto_expand_meta.reasons)}"
                )

        if (
            response.windowB.auto_expand_meta
            and response.windowB.auto_expand_meta.expanded
        ):
            original_days = response.windowB.auto_expand_meta.attempts[0]
            effective_days = response.windowB.auto_expand_meta.attempts[1]
            logger.info(
                f"✅ Window B expanded: {original_days}d → {effective_days}d to reach minimum support"
            )
            if response.windowB.auto_expand_meta.reasons:
                logger.info(
                    f"   Expansion reasons: {', '.join(response.windowB.auto_expand_meta.reasons)}"
                )

        # Log power status
        power_status_a = response.A.power.status if response.A.power else "unknown"
        power_status_b = response.B.power.status if response.B.power else "unknown"
        logger.info(
            f"📊 Power Status - Window A: {power_status_a}, Window B: {power_status_b}"
        )

        if power_status_a == "low_power" or power_status_b == "low_power":
            logger.warning(f"⚠️ Low power detected - results may be unreliable")
            if response.A.power and response.A.power.reasons:
                logger.info(
                    f"   Window A reasons: {', '.join(response.A.power.reasons)}"
                )
            if response.B.power and response.B.power.reasons:
                logger.info(
                    f"   Window B reasons: {', '.join(response.B.power.reasons)}"
                )

        # Log CI widths for validation
        if response.A.ci:
            for metric, ci in response.A.ci.items():
                if ci and len(ci) == 2:
                    width = ci[1] - ci[0]
                    if width > 0.10:
                        logger.warning(
                            f"⚠️ Wide CI for Window A {metric}: {width:.3f} (95% CI {format_percentage(ci[0], 1)}–{format_percentage(ci[1], 1)})"
                        )

        if response.B.ci:
            for metric, ci in response.B.ci.items():
                if ci and len(ci) == 2:
                    width = ci[1] - ci[0]
                    if width > 0.10:
                        logger.warning(
                            f"⚠️ Wide CI for Window B {metric}: {width:.3f} (95% CI {format_percentage(ci[0], 1)}–{format_percentage(ci[1], 1)})"
                        )

        # Generate HTML report using FileOrganizationService
        from app.config.file_organization_config import FileOrganizationConfig
        from app.service.investigation.file_organization_service import (
            FileOrganizationService,
        )

        file_org_config = FileOrganizationConfig()
        file_org_service = FileOrganizationService(file_org_config)

        # Resolve comparison report path using FileOrganizationService
        report_timestamp = datetime.now()
        report_path = file_org_service.resolve_comparison_report_path(
            source_type="auto_startup",
            entity_type=entity_type,
            entity_id=entity_value,
            timestamp=report_timestamp,
        )

        # Create directory structure with validation
        file_org_service.create_directory_structure(report_path.parent)

        logger.info(f"📄 Generating HTML report: {report_path}")
        html_content = generate_html_report(response, report_path)

        # Create individual entity package immediately after completion
        logger.info(
            f"📦 Creating individual package for {entity_type}={entity_value}..."
        )
        entity_package_path = None
        try:
            entity_package_path = await _create_individual_entity_package(
                entity_type=entity_type,
                entity_value=entity_value,
                investigation_id=historical_inv.get("id") if historical_inv else None,
                comparison_report_path=report_path,
                comparison_response=response,
                reports_dir=reports_dir,
            )
            logger.info(f"✅ Individual package created: {entity_package_path}")
        except Exception as e:
            logger.warning(
                f"⚠️ Failed to create individual entity package: {e}", exc_info=True
            )

        logger.info(f"✅ Auto-comparison completed for {entity_type}={entity_value}")
        logger.info(f"   Report saved: {report_path}")
        if entity_package_path:
            logger.info(f"   Package saved: {entity_package_path}")

        return {
            "status": "success",
            "entity_type": entity_type,
            "entity_value": entity_value,
            "report_path": str(report_path),
            "entity_package_path": (
                str(entity_package_path) if entity_package_path else None
            ),
            "comparison_response": response,
            "investigation_id": historical_inv.get("id") if historical_inv else None,
            "metrics": {
                "window_a_transactions": response.A.total_transactions,
                "window_b_transactions": response.B.total_transactions,
                "precision_delta": response.delta.precision if response.delta else None,
                "recall_delta": response.delta.recall if response.delta else None,
            },
        }

    except ValueError as e:
        # Handle validation errors gracefully - no fallback, but explain why it failed
        error_msg = str(e)
        logger.error(
            f"❌ Auto-comparison failed for {entity_type}={entity_value}: {error_msg}"
        )
        logger.info(f"   Reason: {error_msg}")
        return {
            "status": "error",
            "entity_type": entity_type,
            "entity_value": entity_value,
            "error": error_msg,
            "error_type": type(e).__name__,
            "error_explanation": error_msg,  # Include full explanation for report
        }
    except Exception as e:
        # Handle other unexpected errors
        error_msg = str(e)
        logger.error(
            f"❌ Auto-comparison failed for {entity_type}={entity_value}: {error_msg}",
            exc_info=True,
        )
        return {
            "status": "error",
            "entity_type": entity_type,
            "entity_value": entity_value,
            "error": error_msg,
            "error_type": type(e).__name__,
            "error_explanation": f"Unexpected error: {error_msg}",
        }


async def run_auto_comparisons_for_top_entities(
    risk_analyzer_results: Dict[str, Any],
    top_n: int = 10,
    reports_dir: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """
    Run automatic comparisons for top N riskiest entities.

    Unconditionally processes top N entities (or all available if fewer than N).
    This ensures consistent evaluation regardless of risk analyzer status or entity count.

    Args:
        risk_analyzer_results: Results from risk analyzer with 'entities' list
        top_n: Number of top entities to compare (default: 3)
        reports_dir: Directory to save HTML reports

    Returns:
        List of comparison results, one per entity
    """
    # Handle case where risk analyzer results are missing or failed
    if not risk_analyzer_results:
        logger.warning("⚠️ Risk analyzer results not available - no entities to process")
        return []

    # Get entities list (may be empty)
    entities = risk_analyzer_results.get("entities", [])

    # Handle case where no entities are found
    if not entities:
        logger.warning(
            "⚠️ No entities found in risk analyzer results - skipping investigation creation (no crash)"
        )
        return []

    # Get entity type from summary (group_by field)
    summary = risk_analyzer_results.get("summary", {})
    group_by = summary.get("group_by", "email")  # Default to email

    # Map group_by to entity_type (handle case variations)
    group_by_lower = group_by.lower()
    entity_type_map = {
        "email": "email",
        "device_id": "device_id",
        "ip": "ip",
        "user_id": "user_id",
        "phone": "phone",
        "account_id": "account_id",
        "merchant_name": "merchant",
        "merchant_id": "merchant",
    }
    default_entity_type = entity_type_map.get(group_by_lower, "email")

    # Get top N entities (or all available if fewer than N)
    # This ensures we always process available entities, even if fewer than requested
    top_entities = entities[:top_n]
    actual_count = len(top_entities)
    requested_count = top_n

    if actual_count < requested_count:
        logger.info(
            f"🚀 Starting auto-comparisons for top {actual_count} riskiest entities (requested {requested_count}, but only {actual_count} available)"
        )
    else:
        logger.info(
            f"🚀 Starting auto-comparisons for top {actual_count} riskiest entities (unconditional execution)"
        )
    logger.info(f"   Entity type (from group_by): {default_entity_type}")

    results = []
    for i, entity_data in enumerate(top_entities, 1):
        entity_value = entity_data.get("entity", "")
        if not entity_value:
            logger.warning(f"⚠️ Entity {i} has no entity value - skipping")
            continue

        # Use detected entity type (may override group_by if detection is more accurate)
        detected_type = detect_entity_type(entity_value)
        # Prefer detected type if it's more specific, otherwise use group_by
        entity_type = (
            detected_type
            if detected_type != "email" or default_entity_type == "email"
            else default_entity_type
        )

        risk_score = entity_data.get("risk_score") or entity_data.get(
            "avg_risk_score", 0
        )
        tx_count = entity_data.get("transaction_count", 0)

        logger.info(f"\n{'='*70}")
        logger.info(f"📊 Auto-Comparison {i}/{len(top_entities)}")
        logger.info(f"   Entity: {entity_value}")
        logger.info(f"   Entity Type: {entity_type}")
        logger.info(f"   Risk Score: {risk_score:.3f}")
        logger.info(f"   Transactions: {tx_count}")
        logger.info(f"{'='*70}")

        result = await run_auto_comparison_for_entity(
            entity_value=entity_value, entity_type=entity_type, reports_dir=reports_dir
        )

        results.append(result)

        # Add small delay between comparisons to avoid overwhelming the system
        import asyncio

        await asyncio.sleep(1)

    # Log summary
    successful = sum(1 for r in results if r.get("status") == "success")
    failed = len(results) - successful

    # Generate and log aggregate statistics
    summary_stats = summarize_comparison_results(results)

    logger.info(f"\n{'='*70}")
    logger.info(f"✅ Auto-comparison summary:")
    logger.info(f"   Total: {len(results)}")
    logger.info(f"   Successful: {successful}")
    logger.info(f"   Failed: {failed}")
    logger.info(f"\n📊 Aggregate Statistics:")
    logger.info(f"   Expanded windows: {summary_stats['expanded_windows']}")
    logger.info(f"   Low power windows: {summary_stats['low_power_windows']}")
    # Format CI widths with proper None handling
    ci_widths = summary_stats["avg_ci_widths"]
    if (
        ci_widths["precision"] is not None
        or ci_widths["recall"] is not None
        or ci_widths["accuracy"] is not None
    ):
        precision_str = (
            f"{ci_widths['precision']:.3f}"
            if ci_widths["precision"] is not None
            else "N/A"
        )
        recall_str = (
            f"{ci_widths['recall']:.3f}" if ci_widths["recall"] is not None else "N/A"
        )
        accuracy_str = (
            f"{ci_widths['accuracy']:.3f}"
            if ci_widths["accuracy"] is not None
            else "N/A"
        )
        logger.info(
            f"   Avg CI widths - Precision: {precision_str}, "
            f"Recall: {recall_str}, "
            f"Accuracy: {accuracy_str}"
        )
    logger.info(f"{'='*70}")

    return results


def summarize_comparison_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate summary statistics from comparison results.

    Args:
        results: List of comparison result dictionaries from run_auto_comparisons_for_top_entities

    Returns:
        Dictionary with aggregate statistics
    """
    successful = [r for r in results if r.get("status") == "success"]

    expanded_count = 0
    low_power_count = 0
    ci_widths = {"precision": [], "recall": [], "accuracy": []}

    for r in successful:
        response = r.get("comparison_response")
        if not response:
            continue

        # Count expanded windows
        if (
            response.windowA.auto_expand_meta
            and response.windowA.auto_expand_meta.expanded
        ):
            expanded_count += 1
        if (
            response.windowB.auto_expand_meta
            and response.windowB.auto_expand_meta.expanded
        ):
            expanded_count += 1

        # Count low power
        if response.A.power and response.A.power.status == "low_power":
            low_power_count += 1
        if response.B.power and response.B.power.status == "low_power":
            low_power_count += 1

        # Collect CI widths
        for window_metrics in [response.A, response.B]:
            if window_metrics.ci:
                for metric in ["precision", "recall", "accuracy"]:
                    ci = window_metrics.ci.get(metric)
                    if ci and len(ci) == 2:
                        ci_widths[metric].append(ci[1] - ci[0])

    return {
        "total_comparisons": len(successful),
        "expanded_windows": expanded_count,
        "low_power_windows": low_power_count,
        "avg_ci_widths": {
            metric: sum(widths) / len(widths) if widths else None
            for metric, widths in ci_widths.items()
        },
    }


async def _create_individual_entity_package(
    entity_type: str,
    entity_value: str,
    investigation_id: Optional[str],
    comparison_report_path: Path,
    comparison_response: Any,
    reports_dir: Path,
) -> Path:
    """
    Create an individual package (ZIP + comprehensive HTML) for a single entity immediately after completion.

    This function is called after each entity investigation completes, not waiting for all entities.

    Args:
        entity_type: Type of entity (e.g., 'email')
        entity_value: Entity identifier value
        investigation_id: Investigation ID
        comparison_report_path: Path to the comparison HTML report
        comparison_response: ComparisonResponse object
        reports_dir: Base directory for reports

    Returns:
        Path to created ZIP file
    """
    import json
    import zipfile
    from datetime import datetime as dt
    from pathlib import Path

    from app.service.logging.investigation_folder_manager import get_folder_manager

    logger.info(f"📦 Creating individual package for {entity_type}:{entity_value}")

    # Create timestamped package directory
    timestamp = dt.now()
    timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")
    package_dir = (
        reports_dir / f"entity_{entity_type}_{entity_value[:30]}_{timestamp_str}"
    )
    package_dir.mkdir(parents=True, exist_ok=True)

    # Create ZIP filename
    zip_filename = (
        f"entity_package_{entity_type}_{entity_value[:30]}_{timestamp_str}.zip"
    )
    zip_path = package_dir / zip_filename

    logger.info(f"📦 Creating ZIP: {zip_path}")

    folder_manager = get_folder_manager()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Add comparison report
        if comparison_report_path and Path(comparison_report_path).exists():
            zipf.write(comparison_report_path, f"comparison_report.html")
            logger.info(f"   ✅ Added comparison report")

        # Find and add confusion table HTML if it exists
        confusion_table_pattern = (
            f"confusion_table_{investigation_id}_*.html" if investigation_id else None
        )
        if confusion_table_pattern:
            confusion_tables = list(reports_dir.rglob(confusion_table_pattern))
            for conf_table in confusion_tables:
                zipf.write(conf_table, f"confusion_table_{conf_table.name}")
                logger.info(f"   ✅ Added confusion table: {conf_table.name}")

        # Find and add investigation folder if it exists
        # Investigation artifacts are stored in: workspace/investigations/{YYYY}/{MM}/{investigation_id}/
        if investigation_id:
            # Search for investigation folder in workspace structure
            workspace_base = Path("workspace/investigations")
            inv_folder = None

            # Search all year/month folders for the investigation_id
            if workspace_base.exists():
                for year_dir in workspace_base.iterdir():
                    if year_dir.is_dir() and year_dir.name.isdigit():
                        for month_dir in year_dir.iterdir():
                            if month_dir.is_dir() and month_dir.name.isdigit():
                                potential_inv_folder = month_dir / investigation_id
                                if (
                                    potential_inv_folder.exists()
                                    and potential_inv_folder.is_dir()
                                ):
                                    inv_folder = potential_inv_folder
                                    break
                    if inv_folder:
                        break

            if inv_folder and inv_folder.exists():
                logger.info(f"   📁 Adding investigation folder: {inv_folder}")
                file_count = 0
                for file_path in inv_folder.rglob("*"):
                    if file_path.is_file():
                        arcname = f"investigation/{file_path.relative_to(inv_folder)}"
                        try:
                            zipf.write(file_path, arcname)
                            file_count += 1
                        except Exception as e:
                            logger.warning(f"   ⚠️ Failed to add file {file_path}: {e}")
                logger.info(f"   ✅ Added investigation folder with {file_count} files")
            else:
                logger.warning(
                    f"   ⚠️ Investigation folder not found for {investigation_id}"
                )

        # Create entity summary HTML
        summary_html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Entity Investigation Summary - {entity_type}:{entity_value}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        .metric {{ display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #ecf0f1; border-radius: 5px; }}
        .metric-label {{ font-size: 12px; color: #7f8c8d; text-transform: uppercase; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
        .section {{ margin: 20px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid #3498db; }}
        .success {{ color: #27ae60; }}
        .warning {{ color: #f39c12; }}
        .error {{ color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Entity Investigation Summary</h1>
        <div class="section">
            <h2>Entity Information</h2>
            <div class="metric">
                <div class="metric-label">Entity Type</div>
                <div class="metric-value">{entity_type}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Entity Value</div>
                <div class="metric-value">{entity_value}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Investigation ID</div>
                <div class="metric-value">{investigation_id or 'N/A'}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Package Created</div>
                <div class="metric-value">{timestamp.strftime('%Y-%m-%d %H:%M:%S')}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Investigation Metrics</h2>
            <div class="metric">
                <div class="metric-label">Window A Transactions</div>
                <div class="metric-value">{comparison_response.A.total_transactions if comparison_response and comparison_response.A else 'N/A'}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Window B Transactions</div>
                <div class="metric-value">{comparison_response.B.total_transactions if comparison_response and comparison_response.B else 'N/A'}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Precision (A)</div>
                <div class="metric-value">{f"{comparison_response.A.precision:.3f}" if comparison_response and comparison_response.A and comparison_response.A.precision is not None else 'N/A'}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Recall (A)</div>
                <div class="metric-value">{f"{comparison_response.A.recall:.3f}" if comparison_response and comparison_response.A and comparison_response.A.recall is not None else 'N/A'}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📁 Package Contents</h2>
            <ul>
                <li class="success">✅ Comparison HTML Report (comparison_report.html)</li>
                {"<li class='success'>✅ Confusion Table HTML</li>" if confusion_table_pattern else "<li class='warning'>⚠️ Confusion Table (not generated)</li>"}
                {"<li class='success'>✅ Investigation Folder with All Artifacts</li>" if investigation_id else "<li class='warning'>⚠️ Investigation Folder (not available)</li>"}
                <li class="success">✅ This Summary (summary.html)</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>📖 Next Steps</h2>
            <p>This package contains all artifacts for this specific entity investigation:</p>
            <ol>
                <li>Open <code>comparison_report.html</code> for detailed comparison analysis</li>
                <li>Review <code>confusion_table_*.html</code> for fraud detection metrics</li>
                <li>Explore the <code>investigation/</code> folder for raw artifacts and evidence</li>
            </ol>
        </div>
    </div>
</body>
</html>"""

        zipf.writestr("summary.html", summary_html)
        logger.info(f"   ✅ Added entity summary HTML")

        # Add metadata JSON
        metadata = {
            "entity_type": entity_type,
            "entity_value": entity_value,
            "investigation_id": investigation_id,
            "package_created": timestamp.isoformat(),
            "metrics": {
                "window_a_transactions": (
                    comparison_response.A.total_transactions
                    if comparison_response and comparison_response.A
                    else None
                ),
                "window_b_transactions": (
                    comparison_response.B.total_transactions
                    if comparison_response and comparison_response.B
                    else None
                ),
                "precision_a": (
                    comparison_response.A.precision
                    if comparison_response and comparison_response.A
                    else None
                ),
                "recall_a": (
                    comparison_response.A.recall
                    if comparison_response and comparison_response.A
                    else None
                ),
            },
        }
        zipf.writestr("metadata.json", json.dumps(metadata, indent=2, default=str))
        logger.info(f"   ✅ Added metadata JSON")

    logger.info(f"✅ Individual entity package created: {zip_path}")
    return zip_path


async def package_comparison_results(
    comparison_results: List[Dict[str, Any]],
    output_dir: Optional[Path] = None,
    startup_report_path: Optional[str] = None,
) -> Path:
    """
    Package comparison results into a zip file containing:
    - 3 investigation folders
    - Comparison reports
    - Summary HTML
    - Startup analysis report (if provided)

    Args:
        comparison_results: List of comparison result dictionaries from run_auto_comparisons_for_top_entities
        output_dir: Directory to save zip file (defaults to artifacts/comparisons/)
        startup_report_path: Optional path to startup analysis report to include in zip

    Returns:
        Path to created zip file
    """
    # Use FileOrganizationService for path resolution
    from app.config.file_organization_config import FileOrganizationConfig
    from app.service.investigation.file_organization_service import (
        FileOrganizationService,
    )

    file_org_config = FileOrganizationConfig()
    file_org_service = FileOrganizationService(file_org_config)

    # Resolve output directory using FileOrganizationService
    # CRITICAL: Import datetime here to avoid UnboundLocalError if there's any local shadowing
    from datetime import datetime as dt

    if output_dir is None:
        # Use timestamp for directory structure
        timestamp = dt.now()
        # Create a comparison package directory path
        base_dir = file_org_config.artifacts_base_dir
        timestamp_str = timestamp.strftime(file_org_config.timestamp_format)
        output_dir = base_dir / "comparisons" / "auto_startup" / timestamp_str
    else:
        output_dir = Path(output_dir)
        # Still need a timestamp for the zip filename
        timestamp = dt.now()

    # Create directory structure with validation
    file_org_service.create_directory_structure(output_dir)

    # Create timestamped zip filename (reuse timestamp from above)
    zip_timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")
    zip_filename = f"comparison_package_{zip_timestamp_str}.zip"
    zip_path = output_dir / zip_filename

    logger.info(
        f"📦 Creating comparison package: {zip_path} (using FileOrganizationService)"
    )

    # Import investigation folder manager
    from app.service.logging.investigation_folder_manager import get_folder_manager

    folder_manager = get_folder_manager()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Process each comparison result
        investigation_data = []

        for i, result in enumerate(comparison_results, 1):
            if result.get("status") != "success":
                logger.warning(
                    f"⚠️ Skipping failed comparison {i}: {result.get('entity_value', 'unknown')}"
                )
                continue

            entity_value = result.get("entity_value", f"entity_{i}")
            entity_type = result.get("entity_type", "unknown")
            investigation_id = result.get("investigation_id")
            report_path = result.get("report_path")
            comparison_response = result.get("comparison_response")

            # Add comparison report to zip
            if report_path and Path(report_path).exists():
                report_name = f"comparison_reports/comparison_{i}_{entity_type}_{entity_value[:30]}.html"
                zipf.write(report_path, report_name)
                logger.info(f"   ✅ Added comparison report: {report_name}")
            else:
                logger.warning(f"   ⚠️ Comparison report not found: {report_path}")

            # Find and add investigation folder
            # Investigation artifacts are stored in: artifacts/investigations/{entity_type}/{entity_id}/
            if investigation_id:
                # Try to find investigation artifacts in the artifacts directory
                artifacts_base = Path("artifacts/investigations")
                investigation_metadata = None
                inv_folder = None

                # Normalize entity_id for directory name (match artifact_persistence.py logic)
                safe_entity_id = entity_value.replace(".", "-").replace("@", "-at-")
                entity_artifacts_dir = artifacts_base / entity_type / safe_entity_id

                # Also try the original entity_value format (some may use dots)
                entity_artifacts_dir_alt = (
                    artifacts_base / entity_type / entity_value.replace("@", "-at-")
                )

                # Check both possible paths
                if entity_artifacts_dir.exists():
                    inv_folder = entity_artifacts_dir
                elif entity_artifacts_dir_alt.exists():
                    inv_folder = entity_artifacts_dir_alt
                else:
                    # Fallback: try to find any folder with investigation files for this entity
                    entity_type_dir = artifacts_base / entity_type
                    if entity_type_dir.exists():
                        # Search for folders containing investigation files
                        for possible_folder in entity_type_dir.iterdir():
                            if possible_folder.is_dir():
                                # Check if this folder has investigation files
                                investigation_files = list(
                                    possible_folder.glob(
                                        f"investigation_{entity_type}_*.json"
                                    )
                                )
                                if investigation_files:
                                    inv_folder = possible_folder
                                    break

                if inv_folder and inv_folder.exists():
                    # Add entire investigation folder to zip
                    folder_name_in_zip = (
                        f"investigations/investigation_{i}_{investigation_id}"
                    )

                    # Ensure confusion table exists - generate if missing
                    confusion_table_path = (
                        inv_folder / f"confusion_table_{investigation_id}.html"
                    )
                    if not confusion_table_path.exists() and investigation_id:
                        logger.info(
                            f"   📊 Confusion table not found, generating for {investigation_id}..."
                        )
                        try:
                            from app.service.investigation.confusion_table_generator import (
                                generate_confusion_table_sync,
                            )

                            generated_path = generate_confusion_table_sync(
                                investigation_id, inv_folder
                            )
                            if generated_path and generated_path.exists():
                                logger.info(
                                    f"   ✅ Generated confusion table: {generated_path.name}"
                                )
                            else:
                                logger.warning(
                                    f"   ⚠️ Confusion table generation scheduled but not yet complete"
                                )
                        except Exception as e:
                            logger.warning(
                                f"   ⚠️ Failed to generate confusion table: {e}"
                            )

                    # Walk through folder and add all files
                    for root, dirs, files in os.walk(inv_folder):
                        # Skip __pycache__ and other unnecessary files
                        dirs[:] = [d for d in dirs if d not in ["__pycache__", ".git"]]

                        for file in files:
                            if file.endswith(".pyc") or file.startswith("."):
                                continue

                            file_path = Path(root) / file
                            original_file_path = (
                                file_path  # Keep original for arcname calculation
                            )

                            # CRITICAL: Handle symlinks - resolve to target before writing to zip
                            # If file_path is a symlink, resolve it to the actual target
                            if file_path.is_symlink():
                                try:
                                    # Read the symlink target
                                    symlink_target = os.readlink(file_path)

                                    # Determine how to resolve the target
                                    if os.path.isabs(symlink_target):
                                        # Target is already absolute
                                        resolved_path = Path(symlink_target)
                                    elif symlink_target.startswith("workspace/"):
                                        # Target is relative to workspace root (common case for canonical paths)
                                        # Resolve from workspace root, not from symlink's directory
                                        workspace_root = Path("workspace").resolve()
                                        resolved_path = workspace_root / Path(
                                            symlink_target
                                        ).relative_to("workspace")
                                    else:
                                        # Target is relative to symlink's directory
                                        resolved_path = (
                                            file_path.parent / symlink_target
                                        ).resolve()

                                    # Fallback: try Path.resolve() if above didn't work
                                    if not resolved_path.exists():
                                        try:
                                            resolved_path = file_path.resolve()
                                        except (OSError, RuntimeError):
                                            pass

                                    if not resolved_path.exists():
                                        logger.warning(
                                            f"   ⚠️ Symlink target does not exist: {file_path} -> {symlink_target} (resolved: {resolved_path}). Skipping."
                                        )
                                        continue

                                    # Use resolved path for zip, but keep original for arcname
                                    file_path = resolved_path
                                    logger.debug(
                                        f"   Resolved symlink: {original_file_path} -> {symlink_target} (resolved: {resolved_path})"
                                    )
                                except (OSError, RuntimeError) as e:
                                    logger.warning(
                                        f"   ⚠️ Failed to resolve symlink {file_path}: {e}. Skipping."
                                    )
                                    continue

                            # Verify file exists before adding to zip
                            if not file_path.exists():
                                logger.warning(
                                    f"   ⚠️ File does not exist: {file_path}. Skipping."
                                )
                                continue

                            # Calculate arcname using original path (relative to inv_folder)
                            # This ensures the zip structure matches the folder structure, even for symlinks
                            arcname = (
                                folder_name_in_zip
                                / original_file_path.relative_to(inv_folder)
                            )
                            try:
                                zipf.write(file_path, str(arcname))
                            except FileNotFoundError as e:
                                logger.warning(
                                    f"   ⚠️ Failed to add file to zip: {file_path}: {e}. Skipping."
                                )
                                continue

                    logger.info(
                        f"   ✅ Added investigation folder: {investigation_id} from {inv_folder}"
                    )

                    # Load investigation metadata for summary
                    # First try metadata.json in the folder
                    metadata_file = inv_folder / "metadata.json"
                    if metadata_file.exists():
                        try:
                            with open(metadata_file) as f:
                                investigation_metadata = json.load(f)
                        except Exception as e:
                            logger.warning(f"   ⚠️ Failed to load metadata.json: {e}")

                    # If no metadata.json, try to create metadata from investigation JSON files
                    if not investigation_metadata:
                        investigation_json_files = list(
                            inv_folder.glob(f"investigation_{entity_type}_*.json")
                        )
                        if investigation_json_files:
                            # Use the most recent JSON file
                            latest_json = max(
                                investigation_json_files,
                                key=lambda p: p.stat().st_mtime,
                            )
                            try:
                                with open(latest_json) as f:
                                    json_data = json.load(f)
                                    # Create metadata from JSON data
                                    from datetime import datetime

                                    file_mtime = latest_json.stat().st_mtime
                                    created_at = datetime.fromtimestamp(
                                        file_mtime
                                    ).isoformat()
                                    investigation_metadata = {
                                        "investigation_id": investigation_id,
                                        "entity_type": entity_type,
                                        "entity_value": entity_value,
                                        "created_at": created_at,
                                        "status": "COMPLETED",  # Assume completed if artifact exists
                                        "source": "artifact_json",
                                    }
                            except Exception as e:
                                logger.warning(
                                    f"   ⚠️ Failed to load investigation JSON: {e}"
                                )

                    # If still no metadata, create minimal metadata
                    if not investigation_metadata:
                        investigation_metadata = {
                            "investigation_id": investigation_id,
                            "entity_type": entity_type,
                            "entity_value": entity_value,
                            "status": "COMPLETED",
                            "source": "inferred",
                        }

                    investigation_data.append(
                        {
                            "index": i,
                            "entity_type": entity_type,
                            "entity_value": entity_value,
                            "investigation_id": investigation_id,
                            "investigation_folder": str(inv_folder),
                            "metadata": investigation_metadata,
                            "comparison_metrics": result.get("metrics", {}),
                            "comparison_response": comparison_response,
                        }
                    )
                else:
                    logger.warning(
                        f"   ⚠️ Investigation artifacts folder not found for {investigation_id}"
                    )
                    logger.warning(
                        f"      Looked in: {entity_artifacts_dir} and {entity_artifacts_dir_alt}"
                    )
                    # Still add to investigation_data with minimal info for summary
                    investigation_data.append(
                        {
                            "index": i,
                            "entity_type": entity_type,
                            "entity_value": entity_value,
                            "investigation_id": investigation_id,
                            "investigation_folder": None,
                            "metadata": {
                                "investigation_id": investigation_id,
                                "entity_type": entity_type,
                                "entity_value": entity_value,
                                "status": "UNKNOWN",
                                "source": "missing_folder",
                            },
                            "comparison_metrics": result.get("metrics", {}),
                            "comparison_response": comparison_response,
                        }
                    )
            else:
                logger.warning(f"   ⚠️ No investigation ID in result {i}")

        # Generate summary HTML
        summary_html = generate_summary_html(investigation_data)
        zipf.writestr("summary.html", summary_html)
        logger.info(f"   ✅ Added summary HTML")

        # Generate comparison manifest for each comparison
        try:
            from app.service.investigation.manifest_generator import (
                get_manifest_generator,
            )

            # Use module-level datetime import (already imported at top of file as 'datetime')
            # Use dt alias from function-level import to avoid shadowing issues

            manifest_generator = get_manifest_generator()
            comparison_manifests = []

            for i, result in enumerate(comparison_results, 1):
                if result.get("status") != "success":
                    continue

                entity_type = result.get("entity_type", "unknown")
                entity_value = result.get("entity_value", "unknown")
                investigation_id = result.get("investigation_id")
                report_path = result.get("report_path")

                # Generate comparison manifest
                # Use dt alias from function-level import to avoid UnboundLocalError
                comparison_id = f"cmp_{dt.now().strftime('%Y%m%d_%H%M%S')}_{i}"
                manifest = manifest_generator.generate_comparison_manifest(
                    comparison_id=comparison_id,
                    left_investigation=investigation_id or "unknown",
                    right_investigation=investigation_id
                    or "unknown",  # Same investigation for auto-comparisons
                    title=f"Comparison {i}: {entity_type}={entity_value}",
                    source_type="auto_startup",
                    entity_type=entity_type,
                    entity_id=entity_value,
                    canonical_path=str(report_path) if report_path else None,
                    entity_view_path=None,
                    created_at=dt.now(),
                    metadata={
                        "investigation_id": investigation_id,
                        "metrics": result.get("metrics", {}),
                    },
                )

                comparison_manifests.append(manifest)

                # Index comparison in registry
                try:
                    from app.service.investigation.workspace_registry import (
                        get_registry,
                    )

                    registry = get_registry()
                    registry.index_comparison(
                        comparison_id=comparison_id,
                        left_investigation=investigation_id or "unknown",
                        right_investigation=investigation_id or "unknown",
                        title=manifest["title"],
                        source_type="auto_startup",
                        entity_type=entity_type,
                        entity_id=entity_value,
                        canonical_path=str(report_path) if report_path else None,
                        metadata=manifest["metadata"],
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to index comparison {comparison_id} in registry: {e}"
                    )

            # Save comparison manifests to zip
            if comparison_manifests:
                manifests_json = json.dumps(comparison_manifests, indent=2, default=str)
                zipf.writestr("comparison_manifests.json", manifests_json)
                logger.info(
                    f"   ✅ Added comparison manifests ({len(comparison_manifests)} manifests)"
                )
        except Exception as e:
            logger.warning(f"Failed to generate comparison manifests: {e}")

        # Add startup analysis report if provided
        if startup_report_path:
            startup_report = Path(startup_report_path)
            if startup_report.exists():
                zipf.write(startup_report, "startup_analysis_report.html")
                logger.info(
                    f"   ✅ Added startup analysis report: startup_analysis_report.html"
                )
            else:
                logger.warning(f"   ⚠️ Startup report not found: {startup_report_path}")

    logger.info(f"✅ Comparison package created: {zip_path}")
    return zip_path


def generate_summary_html(investigation_data: List[Dict[str, Any]]) -> str:
    """
    Generate HTML summary of investigations and comparisons.

    Args:
        investigation_data: List of investigation data dictionaries

    Returns:
        HTML string
    """
    # Import logo functions
    from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header

    html_parts = [
        """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comparison Summary</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-left: 10px;
            border-left: 4px solid #3498db;
        }
        .investigation-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .investigation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .investigation-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
        }
        .investigation-id {
            font-family: monospace;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric-card {
            background: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 3px solid #3498db;
        }
        .metric-label {
            font-size: 0.85em;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2c3e50;
        }
        .delta-positive { color: #27ae60; }
        .delta-negative { color: #e74c3c; }
        .delta-neutral { color: #7f8c8d; }
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .entity-value {
            font-family: monospace;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        """
        + get_olorin_header("Comparison Summary Report")
        + """
"""
    ]

    # Summary statistics
    total_investigations = len(investigation_data)
    total_comparisons = sum(
        1 for inv in investigation_data if inv.get("comparison_response")
    )

    html_parts.append(
        """
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-value">"""
        + str(total_investigations)
        + """</div>
                <div class="stat-label">Investigations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">"""
        + str(total_comparisons)
        + """</div>
                <div class="stat-label">Comparisons</div>
            </div>
        </div>
    """
    )

    # Investigation details
    html_parts.append("<h2>Investigation Details</h2>")

    for inv in investigation_data:
        entity_value = inv.get("entity_value", "Unknown")
        entity_type = inv.get("entity_type", "unknown")
        investigation_id = inv.get("investigation_id", "N/A")
        metadata = inv.get("metadata", {})
        metrics = inv.get("comparison_metrics", {})
        comparison_response = inv.get("comparison_response")

        html_parts.append(
            f"""
        <div class="investigation-card">
            <div class="investigation-header">
                <div>
                    <div class="investigation-title">Investigation #{inv.get('index', '?')}: {entity_type}</div>
                    <div class="investigation-id">ID: {investigation_id}</div>
                </div>
            </div>
            
            <div style="margin-top: 15px;">
                <strong>Entity:</strong> <span class="entity-value">{entity_value}</span>
            </div>
        """
        )

        # Investigation metadata
        if metadata:
            created_at = metadata.get("created_at", "N/A")
            status = metadata.get("status", "N/A")
            html_parts.append(
                f"""
            <div style="margin-top: 10px; color: #7f8c8d; font-size: 0.9em;">
                Created: {created_at} | Status: {status}
            </div>
            """
            )

        # Comparison metrics
        if metrics:
            html_parts.append(
                """
            <div class="metrics-grid">
            """
            )

            window_a_tx = metrics.get("window_a_transactions", 0)
            window_b_tx = metrics.get("window_b_transactions", 0)
            precision_delta = metrics.get("precision_delta")
            recall_delta = metrics.get("recall_delta")

            html_parts.append(
                f"""
                <div class="metric-card">
                    <div class="metric-label">Window A Transactions</div>
                    <div class="metric-value">{window_a_tx:,}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Window B Transactions</div>
                    <div class="metric-value">{window_b_tx:,}</div>
                </div>
            """
            )

            if precision_delta is not None:
                delta_class = (
                    "delta-positive"
                    if precision_delta > 0
                    else "delta-negative" if precision_delta < 0 else "delta-neutral"
                )
                html_parts.append(
                    f"""
                <div class="metric-card">
                    <div class="metric-label">Precision Delta</div>
                    <div class="metric-value {delta_class}">{precision_delta:+.3f}</div>
                </div>
                """
                )

            if recall_delta is not None:
                delta_class = (
                    "delta-positive"
                    if recall_delta > 0
                    else "delta-negative" if recall_delta < 0 else "delta-neutral"
                )
                html_parts.append(
                    f"""
                <div class="metric-card">
                    <div class="metric-label">Recall Delta</div>
                    <div class="metric-value {delta_class}">{recall_delta:+.3f}</div>
                </div>
                """
                )

            html_parts.append("</div>")

        # Comparison response details
        if comparison_response:
            html_parts.append(
                """
            <details style="margin-top: 15px;">
                <summary style="cursor: pointer; font-weight: 600; color: #3498db;">View Detailed Comparison Metrics</summary>
                <div style="margin-top: 10px;">
            """
            )

            # Add key metrics from comparison response
            if hasattr(comparison_response, "A") and hasattr(comparison_response, "B"):
                html_parts.append(
                    """
                <table>
                    <tr>
                        <th>Metric</th>
                        <th>Window A</th>
                        <th>Window B</th>
                    </tr>
                """
                )

                metrics_to_show = [
                    ("Total Transactions", "total_transactions"),
                    ("Precision", "precision"),
                    ("Recall", "recall"),
                    ("F1 Score", "f1_score"),
                    ("Accuracy", "accuracy"),
                    ("Fraud Rate", "fraud_rate"),
                ]

                for label, attr in metrics_to_show:
                    val_a = getattr(comparison_response.A, attr, None)
                    val_b = getattr(comparison_response.B, attr, None)

                    if val_a is not None or val_b is not None:
                        html_parts.append(
                            f"""
                    <tr>
                        <td>{label}</td>
                        <td>{val_a if val_a is not None else 'N/A'}</td>
                        <td>{val_b if val_b is not None else 'N/A'}</td>
                    </tr>
                        """
                        )

                html_parts.append("</table>")

            html_parts.append(
                """
                </div>
            </details>
            """
            )

        html_parts.append("</div>")

    html_parts.append(OLORIN_FOOTER)
    html_parts.append(
        """
    </div>
</body>
</html>
    """
    )

    return "".join(html_parts)


async def _trigger_post_investigation_packaging(investigation_id: str) -> None:
    """
    Trigger post-investigation packaging in background.
    
    This creates confusion matrix ONLY (no ZIP package).
    """
    try:
        from app.service.investigation.post_investigation_packager import (
            generate_post_investigation_package
        )
        
        logger.info(f"📊 Generating confusion matrix for {investigation_id}")
        
        confusion_matrix_path = await generate_post_investigation_package(investigation_id)
        
        if confusion_matrix_path:
            logger.info(
                f"✅ Confusion matrix created: {confusion_matrix_path.name}"
            )
        else:
            logger.warning(
                f"⚠️ Post-investigation packaging failed for {investigation_id}"
            )
    except Exception as e:
        logger.error(
            f"❌ Error in post-investigation packaging for {investigation_id}: {e}",
            exc_info=True
        )
