"""
Unit tests for ETag Service
Feature: 001-investigation-state-management

Tests ETag generation, validation, and adaptive polling intervals.

SYSTEM MANDATE Compliance:
- No mocks in production code
- Complete test coverage of ETag functionality
- Type-safe test implementations
"""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.service.etag_service import ETagService
from app.models.investigation_state import InvestigationState
from app.persistence.database import Base


class TestETagService:
    """Test suite for ETag service functionality."""

    @pytest.fixture
    def test_db(self):
        """Create an in-memory SQLite database for testing."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        yield session
        session.close()

    def test_generate_etag_consistency(self):
        """Test that same inputs always produce same ETag."""
        # Create service instance (db not needed for this test)
        service = ETagService(None)

        # Generate ETags for same input
        etag1 = service.generate_etag_for_investigation("INV-123", 42)
        etag2 = service.generate_etag_for_investigation("INV-123", 42)

        # Should be identical
        assert etag1 == etag2
        assert etag1.startswith('W/"42-')
        assert '"' in etag1

    def test_generate_etag_uniqueness(self):
        """Test that different inputs produce different ETags."""
        service = ETagService(None)

        # Generate ETags for different versions
        etag_v1 = service.generate_etag_for_investigation("INV-123", 1)
        etag_v2 = service.generate_etag_for_investigation("INV-123", 2)

        # Should be different
        assert etag_v1 != etag_v2
        assert "1-" in etag_v1
        assert "2-" in etag_v2

        # Different investigations should have different ETags
        etag_inv1 = service.generate_etag_for_investigation("INV-123", 1)
        etag_inv2 = service.generate_etag_for_investigation("INV-456", 1)
        assert etag_inv1 != etag_inv2

    def test_generate_etag_format(self):
        """Test that ETag follows weak ETag format."""
        service = ETagService(None)

        etag = service.generate_etag_for_investigation("INV-789", 100)

        # Check weak ETag format: W/"version-hash"
        assert etag.startswith('W/"')
        assert etag.endswith('"')
        assert "100-" in etag

        # Extract hash part
        hash_part = etag.split("-")[1].rstrip('"')
        assert len(hash_part) == 8  # 8-character hash

    def test_calculate_adaptive_poll_interval_active(self, test_db):
        """Test poll interval for active investigation."""
        service = ETagService(test_db)

        # Create active investigation
        state = InvestigationState(
            investigation_id="INV-001",
            user_id="user1",
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(state)
        test_db.commit()

        # Should return active interval (5 seconds by default)
        interval = service.calculate_poll_interval("INV-001")
        assert interval == 5

    def test_calculate_adaptive_poll_interval_idle(self, test_db):
        """Test poll interval for idle investigation."""
        service = ETagService(test_db)

        # Create completed investigation
        state = InvestigationState(
            investigation_id="INV-002",
            user_id="user1",
            lifecycle_stage="COMPLETED",
            status="COMPLETED",
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(state)
        test_db.commit()

        # Should return idle interval (60 seconds by default)
        interval = service.calculate_poll_interval("INV-002")
        assert interval == 60

    def test_calculate_poll_interval_error_state(self, test_db):
        """Test poll interval for error state."""
        service = ETagService(test_db)

        # Create error state investigation
        state = InvestigationState(
            investigation_id="INV-003",
            user_id="user1",
            lifecycle_stage="IN_PROGRESS",
            status="ERROR",
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(state)
        test_db.commit()

        # Should return idle interval for error state
        interval = service.calculate_poll_interval("INV-003")
        assert interval == 60

    def test_calculate_poll_interval_nonexistent(self, test_db):
        """Test poll interval for nonexistent investigation."""
        service = ETagService(test_db)

        # Should return default interval
        interval = service.calculate_poll_interval("INV-NONEXISTENT")
        assert interval == 5

    def test_verify_authorization_success(self, test_db):
        """Test successful authorization."""
        service = ETagService(test_db)

        # Create investigation
        state = InvestigationState(
            investigation_id="INV-AUTH-1",
            user_id="user1",
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(state)
        test_db.commit()

        # Should succeed for correct user
        result = service.get_investigation_state("INV-AUTH-1", "user1")
        assert result.investigation_id == "INV-AUTH-1"
        assert result.user_id == "user1"

    def test_verify_authorization_forbidden(self, test_db):
        """Test authorization failure for wrong user."""
        from fastapi import HTTPException
        service = ETagService(test_db)

        # Create investigation
        state = InvestigationState(
            investigation_id="INV-AUTH-2",
            user_id="user1",
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(state)
        test_db.commit()

        # Should fail for wrong user
        with pytest.raises(HTTPException) as exc:
            service.get_investigation_state("INV-AUTH-2", "user2")
        assert exc.value.status_code == 403
        assert "not authorized" in str(exc.value.detail)

    def test_verify_authorization_not_found(self, test_db):
        """Test authorization failure for nonexistent investigation."""
        from fastapi import HTTPException
        service = ETagService(test_db)

        # Should fail for nonexistent investigation
        with pytest.raises(HTTPException) as exc:
            service.get_investigation_state("INV-NONEXISTENT", "user1")
        assert exc.value.status_code == 404
        assert "not found" in str(exc.value.detail)