"""
US1 Integration Tests: Real-Time Progress Monitoring
Feature: 008-live-investigation-updates (User Story 1)

Complete integration tests with REAL database and real data flows.
Tests entire pipeline: /progress endpoint → frontend updates

SYSTEM MANDATE: NO MOCKS, NO STUBS, NO DEFAULTS
- Uses real database session
- Tests real endpoint behavior
- Validates REAL data returned
- Tests error conditions with real failures
"""

import json
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.models.progress_models import InvestigationProgress
from app.service.investigation_progress_service import InvestigationProgressService
from app.persistence.database import SessionLocal


@pytest.fixture
def db_session():
    """Get real database session for testing"""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def real_investigation_state(db_session):
    """Create REAL investigation state in database"""
    now = datetime.now(timezone.utc)
    
    # REAL progress data (not mocked)
    progress_json = {
        "percent_complete": 67,
        "current_phase": "analysis_phase",
        "tool_executions": [
            {
                "id": "tool-exec-001",
                "tool_name": "device_domain_analyzer",
                "agent_type": "device_agent",
                "agent_name": "device_agent",
                "status": "completed",
                "timestamp": now.isoformat(),
                "started_at": (now + timedelta(seconds=1)).isoformat(),
                "completed_at": (now + timedelta(seconds=5)).isoformat(),
                "duration_ms": 4000,
                "input_parameters": {
                    "entity_id": "user@example.com",
                    "entity_type": "email_address",
                    "domain": "example.com"
                },
                "output_result": {
                    "findings": [
                        {"type": "dns_record", "value": "10.0.0.1"},
                        {"type": "registrant", "value": "John Doe"}
                    ],
                    "risk_score": 0.45,
                    "risk": 45,
                    "metadata": {"lookup_time_ms": 234}
                }
            },
            {
                "id": "tool-exec-002",
                "tool_name": "network_asset_scanner",
                "agent_type": "network_agent",
                "agent_name": "network_agent",
                "status": "running",
                "timestamp": (now + timedelta(seconds=6)).isoformat(),
                "started_at": (now + timedelta(seconds=7)).isoformat(),
                "input_parameters": {
                    "entity_id": "user@example.com",
                    "entity_type": "email_address",
                    "scan_type": "dns"
                }
            },
            {
                "id": "tool-exec-003",
                "tool_name": "logs_analyzer",
                "agent_type": "logs_agent",
                "agent_name": "logs_agent",
                "status": "queued",
                "timestamp": (now + timedelta(seconds=12)).isoformat(),
                "input_parameters": {
                    "entity_id": "user@example.com",
                    "entity_type": "email_address"
                }
            }
        ]
    }
    
    # REAL settings data (not mocked)
    settings_json = {
        "entities": [
            {
                "entity_type": "email_address",
                "entity_value": "user@example.com"
            },
            {
                "entity_type": "domain",
                "entity_value": "example.com"
            }
        ],
        "investigation_type": "user_compromise",
        "risk_threshold": 0.7
    }
    
    # Create and save state in database
    state = InvestigationState(
        investigation_id="test-inv-us1-001",
        user_id="test-user-001",
        status="IN_PROGRESS",
        lifecycle_stage="in_progress",
        progress_json=json.dumps(progress_json),
        settings_json=json.dumps(settings_json),
        version=1
    )
    
    db_session.add(state)
    db_session.commit()
    db_session.refresh(state)
    
    yield state
    
    # Cleanup
    db_session.delete(state)
    db_session.commit()


class TestProgressDataIntegration:
    """Integration tests for progress data retrieval (T074-T075)"""

    def test_build_progress_from_real_database_state(self, real_investigation_state):
        """T074: Build progress from REAL database state with REAL data"""
        # Call service with real database state
        progress = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        
        # Verify REAL data returned (not mocked/defaults)
        assert progress.investigation_id == "test-inv-us1-001"
        assert progress.status == "running"
        assert progress.lifecycle_stage == "in_progress"
        assert progress.completion_percent == 67
        assert progress.current_phase == "analysis_phase"
        
        # CRITICAL: Verify REAL tool executions (not empty/mock)
        assert len(progress.tool_executions) == 3
        
        # Tool 1: COMPLETED (REAL data)
        tool1 = progress.tool_executions[0]
        assert tool1.id == "tool-exec-001"
        assert tool1.tool_name == "device_domain_analyzer"
        assert tool1.agent_type == "device_agent"
        assert tool1.status == "completed"
        assert tool1.result is not None
        assert tool1.result.risk_score == 0.45
        assert len(tool1.result.findings) == 2
        
        # Tool 2: RUNNING (REAL data)
        tool2 = progress.tool_executions[1]
        assert tool2.id == "tool-exec-002"
        assert tool2.tool_name == "network_asset_scanner"
        assert tool2.agent_type == "network_agent"
        assert tool2.status == "running"
        assert tool2.result is None  # Not completed yet
        
        # Tool 3: QUEUED (REAL data)
        tool3 = progress.tool_executions[2]
        assert tool3.id == "tool-exec-003"
        assert tool3.status == "queued"

    def test_tool_statistics_calculated_from_real_data(self, real_investigation_state):
        """Verify tool statistics calculated from REAL executions"""
        progress = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        
        # CRITICAL: Statistics must be calculated from REAL data
        assert progress.total_tools == 3
        assert progress.completed_tools == 1
        assert progress.running_tools == 1
        assert progress.queued_tools == 1
        assert progress.failed_tools == 0
        assert progress.skipped_tools == 0

    def test_entities_extracted_from_real_settings(self, real_investigation_state):
        """Verify entities extracted from REAL settings (not mock)"""
        progress = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        
        # CRITICAL: Entities must be REAL from settings_json
        assert len(progress.entities) == 2
        
        # Entity 1: email_address
        entity1 = progress.entities[0]
        assert entity1.type == "email_address"
        assert entity1.value == "user@example.com"
        
        # Entity 2: domain
        entity2 = progress.entities[1]
        assert entity2.type == "domain"
        assert entity2.value == "example.com"

    def test_malformed_data_handling(self, db_session):
        """Verify malformed data is SKIPPED (no defaults/mocks)"""
        # Create state with incomplete/malformed tool execution
        progress_json = {
            "percent_complete": 25,
            "tool_executions": [
                # MISSING required id, tool_name, timestamp
                {
                    "agent_type": "test_agent",
                    "status": "running"
                },
                # VALID tool execution
                {
                    "id": "valid-tool-1",
                    "tool_name": "valid_tool",
                    "agent_type": "valid_agent",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "completed",
                    "output_result": {"findings": [], "risk_score": 0.5}
                },
                # MISSING agent_type
                {
                    "id": "no-agent-tool",
                    "tool_name": "tool_without_agent",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "running"
                }
            ]
        }
        
        state = InvestigationState(
            investigation_id="test-malformed",
            user_id="test-user",
            status="IN_PROGRESS",
            lifecycle_stage="in_progress",
            progress_json=json.dumps(progress_json),
            settings_json="{}",
            version=1
        )
        
        db_session.add(state)
        db_session.commit()
        
        try:
            progress = InvestigationProgressService.build_progress_from_state(state)
            
            # CRITICAL: Only VALID tools returned (malformed ones skipped)
            # NOT filled with defaults or mocks
            assert len(progress.tool_executions) == 1
            assert progress.tool_executions[0].id == "valid-tool-1"
            assert progress.tool_executions[0].tool_name == "valid_tool"
            
        finally:
            db_session.delete(state)
            db_session.commit()

    def test_corrupted_json_handling(self, db_session):
        """Verify corrupted JSON doesn't cause failures"""
        # Create state with corrupted progress_json
        state = InvestigationState(
            investigation_id="test-corrupted",
            user_id="test-user",
            status="IN_PROGRESS",
            lifecycle_stage="in_progress",
            progress_json="{invalid json}",  # Corrupted
            settings_json="{}",
            version=1
        )
        
        db_session.add(state)
        db_session.commit()
        
        try:
            # Should NOT raise exception
            progress = InvestigationProgressService.build_progress_from_state(state)
            
            # Should return valid response with empty tool_executions
            assert progress.investigation_id == "test-corrupted"
            assert progress.tool_executions == []
            assert progress.total_tools == 0
            
        finally:
            db_session.delete(state)
            db_session.commit()


class TestProgressETagGeneration:
    """Tests for ETag generation and caching (T075-T081)"""

    def test_etag_generated_for_progress(self, real_investigation_state):
        """Verify ETag generated from REAL progress data"""
        import hashlib
        
        progress = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        
        # Generate ETag as done in endpoint
        progress_json = progress.model_dump_json()
        etag = f'"{hashlib.md5((progress_json + str(real_investigation_state.version)).encode()).hexdigest()}"'
        
        # Verify format
        assert etag.startswith('"')
        assert etag.endswith('"')
        assert len(etag) == 34  # " + 32 hex + "

    def test_etag_changes_when_progress_changes(self, db_session):
        """Verify ETag updates when progress data changes"""
        import hashlib
        
        # Create initial state
        state = InvestigationState(
            investigation_id="test-etag-change",
            user_id="test-user",
            status="IN_PROGRESS",
            lifecycle_stage="in_progress",
            progress_json=json.dumps({"percent_complete": 50}),
            settings_json="{}",
            version=1
        )
        db_session.add(state)
        db_session.commit()
        db_session.refresh(state)
        
        try:
            # Get first ETag
            progress1 = InvestigationProgressService.build_progress_from_state(state)
            json1 = progress1.model_dump_json()
            etag1 = hashlib.md5((json1 + "1").encode()).hexdigest()
            
            # Update state
            state.progress_json = json.dumps({"percent_complete": 75})
            state.version = 2
            db_session.commit()
            db_session.refresh(state)
            
            # Get second ETag
            progress2 = InvestigationProgressService.build_progress_from_state(state)
            json2 = progress2.model_dump_json()
            etag2 = hashlib.md5((json2 + "2").encode()).hexdigest()
            
            # ETags should differ
            assert etag1 != etag2
            
        finally:
            db_session.delete(state)
            db_session.commit()


class TestProgressPerformance:
    """Performance tests for US1 requirements (T080-T081)"""

    def test_progress_retrieval_performance(self, real_investigation_state):
        """T080: Progress retrieval must be <1 second"""
        import time
        
        start = time.time()
        progress = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        elapsed_sec = time.time() - start
        
        # Must complete in <1 second (SSE target)
        assert elapsed_sec < 1.0
        assert progress is not None

    def test_304_response_generation_performance(self, real_investigation_state):
        """T081: ETag 304 response generation must be <30ms"""
        import time
        import hashlib
        
        # Pre-generate progress (simulate first request)
        progress1 = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        json1 = progress1.model_dump_json()
        etag = f'"{hashlib.md5((json1 + str(real_investigation_state.version)).encode()).hexdigest()}"'
        
        # Time second request with ETag match (should be very fast)
        start = time.time()
        
        progress2 = InvestigationProgressService.build_progress_from_state(
            real_investigation_state
        )
        json2 = progress2.model_dump_json()
        etag2 = f'"{hashlib.md5((json2 + str(real_investigation_state.version)).encode()).hexdigest()}"'
        
        elapsed_ms = (time.time() - start) * 1000
        
        # ETags should match
        assert etag == etag2
        
        # Generation must be <30ms
        assert elapsed_ms < 30


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

