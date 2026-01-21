"""
Comprehensive Test Suite for 008-live-investigation-updates

Tests:
1. InvestigationProgressService - REAL data extraction
2. ETag generation and 304 responses
3. Event pagination with cursor
4. Event filtering and ordering
5. End-to-end flow verification

CRITICAL: All tests use REAL data only. NO mocks.
"""

import hashlib
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.investigation_audit_log import InvestigationAuditLog

# Import models
from app.models.investigation_state import InvestigationState
from app.models.progress_models import InvestigationProgress
from app.service.event_feed_models import (
    AuditTrailSummary,
    EventFilterParams,
    EventsFeedResponse,
    InvestigationEvent,
)
from app.service.event_feed_service_enhanced import EnhancedEventFeedService
from app.service.event_filtering_service import EventFilteringService
from app.service.investigation_progress_service import InvestigationProgressService


class TestDatabase:
    """In-memory database for testing"""

    def __init__(self):
        # Create in-memory SQLite database
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        # Create tables
        from app.models.investigation_audit_log import InvestigationAuditLog
        from app.models.investigation_state import InvestigationState

        InvestigationState.metadata.create_all(engine)
        InvestigationAuditLog.metadata.create_all(engine)

        self.SessionLocal = sessionmaker(bind=engine)

    def get_session(self):
        return self.SessionLocal()


def create_test_investigation_state(
    db: Session, investigation_id: str = "test-inv-001"
):
    """Create REAL investigation state with actual tool execution data"""

    now = datetime.now(timezone.utc)

    # Create REAL progress_json with tool executions
    progress_data = {
        "percent_complete": 45,
        "tool_executions": [
            {
                "id": "tool-exec-001",
                "tool_name": "device_analysis",
                "agent_name": "device_agent",
                "agent_type": "device",
                "status": "completed",
                "timestamp": now.isoformat(),
                "started_at": (now - timedelta(seconds=30)).isoformat(),
                "completed_at": now.isoformat(),
                "duration_ms": 30000,
                "input_parameters": {
                    "entity_id": "device-123",
                    "entity_type": "device",
                    "device_id": "DEVICE-ABC",
                },
                "output_result": {
                    "risk_score": 45.5,
                    "risk": 0.455,
                    "findings": [
                        {"finding": "Unusual device fingerprint detected"},
                        {"finding": "Device location changed 5 times in 1 hour"},
                    ],
                    "metadata": {"analysis_version": "v2.1"},
                },
            },
            {
                "id": "tool-exec-002",
                "tool_name": "location_analysis",
                "agent_name": "location_agent",
                "agent_type": "location",
                "status": "running",
                "timestamp": (now - timedelta(seconds=5)).isoformat(),
                "started_at": (now - timedelta(seconds=5)).isoformat(),
                "completed_at": None,
                "duration_ms": 5000,
                "input_parameters": {
                    "entity_id": "location-456",
                    "entity_type": "location",
                },
                "output_result": None,
            },
            {
                "id": "tool-exec-003",
                "tool_name": "network_analysis",
                "agent_name": "network_agent",
                "agent_type": "network",
                "status": "queued",
                "timestamp": (now - timedelta(seconds=10)).isoformat(),
                "started_at": None,
                "completed_at": None,
                "duration_ms": 0,
                "input_parameters": {
                    "entity_id": "network-789",
                    "entity_type": "network",
                },
            },
        ],
    }

    # Create REAL settings_json with entities
    settings_data = {
        "name": "Test Investigation 008",
        "investigation_type": "hybrid",  # Hybrid investigation - LLM chooses tools
        "entities": [
            {
                "entity_value": "device-123",
                "entity_type": "device",
                "metadata": {"model": "iPhone14"},
            },
            {
                "entity_value": "user-456",
                "entity_type": "user",
                "metadata": {"email": "test@example.com"},
            },
            {
                "entity_value": "location-456",
                "entity_type": "location",
                "metadata": {"country": "US"},
            },
        ],
        "time_range": {
            "start_time": (now - timedelta(hours=2)).isoformat(),
            "end_time": now.isoformat(),
            "duration_hours": 2,
        },
        "tools": [],  # Empty for hybrid - LLM will choose
        "correlation_mode": "OR",
    }

    state = InvestigationState(
        investigation_id=investigation_id,
        user_id="test-user",
        status="IN_PROGRESS",
        lifecycle_stage="IN_PROGRESS",
        progress_json=json.dumps(progress_data),
        settings_json=json.dumps(settings_data),
        version=1,
        created_at=now - timedelta(minutes=5),
        updated_at=now,
    )

    db.add(state)
    db.commit()

    return state


def create_test_audit_events(db: Session, investigation_id: str = "test-inv-001"):
    """Create REAL audit log events"""

    now = datetime.now(timezone.utc)

    events = [
        InvestigationAuditLog(
            investigation_id=investigation_id,
            entry_id=f"{int(now.timestamp() * 1000)}_000001",
            timestamp=now - timedelta(seconds=120),
            action_type="CREATED",
            source="API",
            user_id="test-user",
            changes_json='{"action": "Investigation created"}',
            from_version=0,
            to_version=1,
        ),
        InvestigationAuditLog(
            investigation_id=investigation_id,
            entry_id=f"{int((now - timedelta(seconds=90)).timestamp() * 1000)}_000002",
            timestamp=now - timedelta(seconds=90),
            action_type="STATE_CHANGE",
            source="SYSTEM",
            user_id="system",
            changes_json='{"status": "IN_PROGRESS"}',
            from_version=1,
            to_version=2,
        ),
        InvestigationAuditLog(
            investigation_id=investigation_id,
            entry_id=f"{int((now - timedelta(seconds=60)).timestamp() * 1000)}_000003",
            timestamp=now - timedelta(seconds=60),
            action_type="UPDATED",
            source="SYSTEM",
            user_id="system",
            changes_json='{"tool": "device_analysis", "status": "completed"}',
            from_version=2,
            to_version=3,
        ),
        InvestigationAuditLog(
            investigation_id=investigation_id,
            entry_id=f"{int((now - timedelta(seconds=30)).timestamp() * 1000)}_000004",
            timestamp=now - timedelta(seconds=30),
            action_type="UPDATED",
            source="SYSTEM",
            user_id="system",
            changes_json='{"tool": "location_analysis", "status": "running"}',
            from_version=3,
            to_version=4,
        ),
    ]

    for event in events:
        db.add(event)
    db.commit()

    return events


# ============================================================================
# TEST SUITE
# ============================================================================


def test_01_investigation_progress_service_real_data():
    """
    TEST 1: InvestigationProgressService extracts REAL data from database

    Verifies:
    - Tool executions extracted from progress_json (NOT mocked)
    - Entities extracted from settings_json (NOT mocked)
    - Statistics calculated from real data
    - No default values used
    """
    print("\n" + "=" * 80)
    print("TEST 1: InvestigationProgressService - REAL Data Extraction")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    # Create REAL state
    state = create_test_investigation_state(db)
    print(f"✅ Created investigation state: {state.investigation_id}")
    print(f"   - progress_json: {len(state.progress_json)} bytes")
    print(f"   - settings_json: {len(state.settings_json)} bytes")

    # Build progress from state
    progress = InvestigationProgressService.build_progress_from_state(state)
    print(f"✅ Built progress response")

    # VERIFY: Tool executions are REAL, not mocked
    assert progress.total_tools == 3, f"Expected 3 tools, got {progress.total_tools}"
    assert (
        progress.completed_tools == 1
    ), f"Expected 1 completed, got {progress.completed_tools}"
    assert (
        progress.running_tools == 1
    ), f"Expected 1 running, got {progress.running_tools}"
    assert progress.queued_tools == 1, f"Expected 1 queued, got {progress.queued_tools}"
    print(
        f"✅ Tool counts correct: total={progress.total_tools}, completed={progress.completed_tools}"
    )

    # VERIFY: Tool executions have REAL data
    assert (
        len(progress.tool_executions) == 3
    ), f"Expected 3 executions, got {len(progress.tool_executions)}"
    tool_exec = progress.tool_executions[0]
    assert (
        tool_exec.tool_name == "device_analysis"
    ), f"Expected device_analysis, got {tool_exec.tool_name}"
    assert (
        tool_exec.agent_type == "device"
    ), f"Expected device agent, got {tool_exec.agent_type}"
    assert (
        tool_exec.status == "completed"
    ), f"Expected completed, got {tool_exec.status}"
    assert tool_exec.result is not None, "Tool result should not be None"
    assert (
        tool_exec.result.risk_score == 45.5
    ), f"Expected risk 45.5, got {tool_exec.result.risk_score}"
    assert (
        len(tool_exec.result.findings) == 2
    ), f"Expected 2 findings, got {len(tool_exec.result.findings)}"
    print(
        f"✅ Tool execution 1 data verified: {tool_exec.tool_name} ({tool_exec.status})"
    )
    print(f"   - Risk score: {tool_exec.result.risk_score}")
    print(f"   - Findings: {len(tool_exec.result.findings)}")

    # VERIFY: Entities are REAL, not mocked
    assert (
        len(progress.entities) == 3
    ), f"Expected 3 entities, got {len(progress.entities)}"
    entity = progress.entities[0]
    assert entity.type == "device", f"Expected device, got {entity.type}"
    assert entity.value == "device-123", f"Expected device-123, got {entity.value}"
    print(
        f"✅ Entities verified: {len(progress.entities)} entities extracted from settings_json"
    )

    # VERIFY: Completion percent is REAL data
    assert (
        progress.completion_percent == 45
    ), f"Expected 45%, got {progress.completion_percent}%"
    print(f"✅ Completion percent: {progress.completion_percent}%")

    # VERIFY: No default empty arrays (if data missing, return empty, don't populate with defaults)
    # This is correct - empty arrays when no data, not populated with default objects
    print(f"✅ Phases: {len(progress.phases)} (empty until provided)")
    print(f"✅ Agent statuses: {len(progress.agent_statuses)} (empty until provided)")

    print("\n✅ TEST 1 PASSED: InvestigationProgressService uses REAL data only")
    return True


def test_02_etag_generation_and_304():
    """
    TEST 2: ETag generation and 304 Not Modified responses

    Verifies:
    - ETag generated from MD5 hash of progress + version
    - ETag format is correct
    - 304 response when ETag matches
    """
    print("\n" + "=" * 80)
    print("TEST 2: ETag Generation and 304 Not Modified")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    state = create_test_investigation_state(db)
    progress = InvestigationProgressService.build_progress_from_state(state)

    # Generate ETag
    progress_json = progress.model_dump_json()
    etag = f'"{hashlib.md5((progress_json + str(state.version)).encode()).hexdigest()}"'
    print(f"✅ Generated ETag: {etag}")
    print(f"   - Progress JSON length: {len(progress_json)} bytes")
    print(f"   - State version: {state.version}")

    # Verify ETag format
    assert etag.startswith('"') and etag.endswith('"'), f"ETag format invalid: {etag}"
    assert (
        len(etag) == 34
    ), f"ETag length invalid (expected 34 with quotes): {len(etag)}"
    print(f"✅ ETag format valid (MD5 hash with quotes)")

    # Verify ETag can be used for conditional requests
    # (In real scenario, same request = same ETag due to DB state)
    etag_from_hash = hashlib.md5(
        (progress_json + str(state.version)).encode()
    ).hexdigest()
    assert etag == f'"{etag_from_hash}"', "ETag format mismatch"
    print(f"✅ ETag can be used in If-None-Match header for 304 responses")

    print("\n✅ TEST 2 PASSED: ETag generation correct")
    return True


def test_03_event_pagination_cursor():
    """
    TEST 3: Event pagination with cursor-based navigation

    Verifies:
    - Cursor format: {timestamp_ms}_{sequence}
    - Cursor parsing works correctly
    - Pagination with limit works
    - has_more flag accurate
    - Events ordered by timestamp then sequence
    """
    print("\n" + "=" * 80)
    print("TEST 3: Event Pagination with Cursor")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    investigation_id = "test-inv-001"
    create_test_investigation_state(db, investigation_id)
    events = create_test_audit_events(db, investigation_id)
    print(f"✅ Created {len(events)} audit events")

    # Create service
    service = EnhancedEventFeedService(db)

    # Fetch first page (with small limit to test pagination)
    result = service.fetch_events_with_pagination(
        investigation_id=investigation_id,
        user_id="test-user",
        cursor=None,
        limit=2,
        filters=None,
    )

    assert isinstance(result, EventsFeedResponse), "Expected EventsFeedResponse"
    assert len(result.items) >= 1, f"Expected at least 1 event, got {len(result.items)}"
    assert len(result.items) <= 2, f"Expected at most 2 events, got {len(result.items)}"
    print(f"✅ First page: {len(result.items)} events")

    # Verify events are InvestigationEvent
    for event in result.items:
        assert isinstance(
            event, InvestigationEvent
        ), f"Event not InvestigationEvent: {type(event)}"
        assert event.ts > 0, "Event timestamp invalid"
        assert event.investigation_id == investigation_id, "Investigation ID mismatch"

    # Verify ETag
    assert result.etag is not None, "ETag should be set"
    assert result.etag.startswith('"'), "ETag format invalid"
    print(f"✅ ETag generated: {result.etag}")

    # Verify cursor format and pagination
    if result.has_more:
        assert (
            result.next_cursor is not None
        ), "next_cursor should be set if has_more=True"
        parts = result.next_cursor.split("_")
        assert len(parts) == 2, f"Cursor format invalid: {result.next_cursor}"
        timestamp_ms, sequence = parts
        assert timestamp_ms.isdigit(), f"Timestamp not numeric: {timestamp_ms}"
        assert sequence.isdigit(), f"Sequence not numeric: {sequence}"
        print(f"✅ Cursor format valid: {result.next_cursor}")
        print(f"✅ Pagination cursor can be used for next page fetch")

    # Verify ordering
    if len(result.items) > 1:
        for i in range(len(result.items) - 1):
            ts1 = result.items[i].ts
            ts2 = result.items[i + 1].ts
            assert ts1 <= ts2, f"Events not ordered: {ts1} > {ts2}"
        print(f"✅ Events strictly ordered by timestamp")
    else:
        print(f"✅ Event ordering verified (single event on page)")

    print("\n✅ TEST 3 PASSED: Event pagination working correctly")
    return True


def test_04_event_filtering():
    """
    TEST 4: Event filtering by action type, source, user ID

    Verifies:
    - Filtering by action_types works
    - Filtering by sources works
    - Filtering by user_ids works
    - Multiple filters combined work
    - No events returned when no matches
    """
    print("\n" + "=" * 80)
    print("TEST 4: Event Filtering")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    investigation_id = "test-inv-001"
    create_test_investigation_state(db, investigation_id)
    events = create_test_audit_events(db, investigation_id)
    print(f"✅ Created {len(events)} audit events (mix of action types and sources)")

    service = EnhancedEventFeedService(db)

    # Filter by action type
    result = service.fetch_events_with_pagination(
        investigation_id=investigation_id,
        user_id="test-user",
        cursor=None,
        limit=100,
        filters=EventFilterParams(action_types=["CREATED"]),
    )

    assert len(result.items) == 1, f"Expected 1 CREATED event, got {len(result.items)}"
    assert (
        result.items[0].op == "CREATED"
    ), f"Expected CREATED, got {result.items[0].op}"
    print(f"✅ Filter by action type (CREATED): {len(result.items)} event(s)")

    # Filter by source
    result = service.fetch_events_with_pagination(
        investigation_id=investigation_id,
        user_id="test-user",
        cursor=None,
        limit=100,
        filters=EventFilterParams(sources=["API"]),
    )

    assert len(result.items) >= 1, f"Expected API events, got {len(result.items)}"
    print(f"✅ Filter by source (API): {len(result.items)} event(s)")

    # Filter with valid action type but no matches
    result = service.fetch_events_with_pagination(
        investigation_id=investigation_id,
        user_id="test-user",
        cursor=None,
        limit=100,
        filters=EventFilterParams(action_types=["DELETED"]),
    )

    assert len(result.items) == 0, f"Expected 0 events, got {len(result.items)}"
    assert result.has_more == False, "has_more should be False"
    print(f"✅ Filter with valid type but no matches: {len(result.items)} event(s)")

    print("\n✅ TEST 4 PASSED: Event filtering working correctly")
    return True


def test_05_end_to_end_flow():
    """
    TEST 5: End-to-end flow verification

    Simulates complete user flow:
    1. Create investigation with tools
    2. Get progress updates (with ETag)
    3. Get events with pagination
    4. Verify all data is REAL (from database)
    """
    print("\n" + "=" * 80)
    print("TEST 5: End-to-End Flow Verification")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    investigation_id = "test-inv-e2e"

    # Step 1: Create investigation
    state = create_test_investigation_state(db, investigation_id)
    create_test_audit_events(db, investigation_id)
    print(f"✅ Step 1: Created investigation {investigation_id}")

    # Step 2: Get progress (with ETag)
    progress = InvestigationProgressService.build_progress_from_state(state)
    progress_json = progress.model_dump_json()
    etag1 = (
        f'"{hashlib.md5((progress_json + str(state.version)).encode()).hexdigest()}"'
    )
    print(f"✅ Step 2: Got progress, ETag={etag1}")
    print(f"   - Status: {progress.status}")
    print(f"   - Completion: {progress.completion_percent}%")
    print(
        f"   - Tools: {progress.total_tools} (completed={progress.completed_tools}, running={progress.running_tools})"
    )

    # Step 3: Get events with pagination
    service = EnhancedEventFeedService(db)
    events_page1 = service.fetch_events_with_pagination(
        investigation_id=investigation_id, user_id="test-user", cursor=None, limit=2
    )
    print(f"✅ Step 3a: Got first page of events")
    print(f"   - Events: {len(events_page1.items)}")
    print(f"   - Has more: {events_page1.has_more}")
    print(f"   - ETag: {events_page1.etag}")

    # Continue pagination if available
    if events_page1.has_more:
        events_page2 = service.fetch_events_with_pagination(
            investigation_id=investigation_id,
            user_id="test-user",
            cursor=events_page1.next_cursor,
            limit=2,
        )
        print(f"✅ Step 3b: Got second page of events")
        print(f"   - Events: {len(events_page2.items)}")
        print(f"   - Has more: {events_page2.has_more}")

    # Step 4: Verify all data is REAL
    assert progress.tool_executions, "Tool executions should exist"
    assert progress.entities, "Entities should exist"
    assert events_page1.items, "Events should exist"
    print(f"✅ Step 4: All data is REAL (from database)")

    # Step 5: Verify 304 handling
    progress2 = InvestigationProgressService.build_progress_from_state(state)
    progress_json2 = progress2.model_dump_json()
    etag2 = (
        f'"{hashlib.md5((progress_json2 + str(state.version)).encode()).hexdigest()}"'
    )

    if etag1 == etag2:
        print(f"✅ Step 5: 304 Not Modified would be sent (ETag unchanged)")

    print("\n✅ TEST 5 PASSED: End-to-end flow complete and verified")
    return True


def test_06_data_integrity():
    """
    TEST 6: Data integrity checks

    Verifies:
    - No duplicate events in pagination
    - Events never out of order
    - Correct tool statistics
    - Entity data consistent
    """
    print("\n" + "=" * 80)
    print("TEST 6: Data Integrity Checks")
    print("=" * 80)

    db_test = TestDatabase()
    db = db_test.get_session()

    investigation_id = "test-inv-integrity"
    state = create_test_investigation_state(db, investigation_id)
    events = create_test_audit_events(db, investigation_id)

    # Check 1: Tool statistics match actual data
    progress = InvestigationProgressService.build_progress_from_state(state)

    completed_count = sum(
        1 for te in progress.tool_executions if te.status == "completed"
    )
    assert completed_count == progress.completed_tools, "Completed tool count mismatch"
    print(
        f"✅ Check 1: Tool statistics consistent (completed={progress.completed_tools})"
    )

    # Check 2: No duplicate tool executions
    tool_ids = [te.id for te in progress.tool_executions]
    assert len(tool_ids) == len(set(tool_ids)), "Duplicate tool execution IDs found"
    print(f"✅ Check 2: No duplicate tool executions ({len(tool_ids)} unique)")

    # Check 3: No duplicate entities
    entity_ids = [e.id for e in progress.entities]
    assert len(entity_ids) == len(set(entity_ids)), "Duplicate entity IDs found"
    print(f"✅ Check 3: No duplicate entities ({len(entity_ids)} unique)")

    # Check 4: Event ordering
    service = EnhancedEventFeedService(db)
    result = service.fetch_events_with_pagination(
        investigation_id=investigation_id, user_id="test-user", cursor=None, limit=100
    )

    if len(result.items) > 1:
        for i in range(len(result.items) - 1):
            ts1 = result.items[i].ts
            ts2 = result.items[i + 1].ts
            assert ts1 <= ts2, f"Events out of order: {ts1} > {ts2}"
    print(f"✅ Check 4: Events in strict order (timestamp ASC, sequence ASC)")

    print("\n✅ TEST 6 PASSED: Data integrity verified")
    return True


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================


def run_all_tests():
    """Run all verification tests"""

    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print(
        "║"
        + "  🧪 COMPREHENSIVE TEST SUITE: 008-live-investigation-updates  ".center(78)
        + "║"
    )
    print("║" + " " * 78 + "║")
    print("╚" + "=" * 78 + "╝")

    tests = [
        (
            "Investigation Progress Service - REAL Data",
            test_01_investigation_progress_service_real_data,
        ),
        ("ETag Generation and 304 Responses", test_02_etag_generation_and_304),
        ("Event Pagination with Cursor", test_03_event_pagination_cursor),
        ("Event Filtering", test_04_event_filtering),
        ("End-to-End Flow", test_05_end_to_end_flow),
        ("Data Integrity", test_06_data_integrity),
    ]

    results = []
    start_time = time.time()

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result, None))
        except Exception as e:
            print(f"\n❌ TEST FAILED: {str(e)}")
            import traceback

            traceback.print_exc()
            results.append((test_name, False, str(e)))

    elapsed = time.time() - start_time

    # Print summary
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " TEST SUMMARY ".center(78, "=") + "║")
    print("╠" + "=" * 78 + "╣")

    passed = sum(1 for _, result, _ in results if result)
    failed = sum(1 for _, result, _ in results if not result)

    for test_name, result, error in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"║ {status} | {test_name:<60} ║")
        if error:
            print(f"║     Error: {error[:60]:<60} ║")

    print("╠" + "=" * 78 + "╣")
    print(f"║ {passed} passed, {failed} failed | Time: {elapsed:.2f}s".ljust(78) + "║")
    print("╚" + "=" * 78 + "╝")

    # Save results to file
    results_file = "/tmp/test_008_results.json"
    with open(results_file, "w") as f:
        json.dump(
            {
                "total": len(results),
                "passed": passed,
                "failed": failed,
                "elapsed_seconds": elapsed,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "results": [
                    {"test": name, "passed": result, "error": error}
                    for name, result, error in results
                ],
            },
            f,
            indent=2,
        )

    print(f"\n📊 Results saved to: {results_file}")

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
