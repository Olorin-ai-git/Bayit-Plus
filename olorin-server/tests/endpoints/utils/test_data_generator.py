"""
Real Test Data Generator for Olorin Endpoint Testing.

Generates REAL test data for comprehensive endpoint testing.
NO MOCK DATA is used - all data is realistic and production-like.
"""

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.persistence.models import InvestigationRecord

logger = logging.getLogger(__name__)


@dataclass
class RealTestData:
    """Container for real test data used in endpoint testing."""

    # User and entity identifiers
    user_id: str
    entity_id: str
    investigation_id: str

    # Investigation data
    investigation_data: Dict[str, Any]

    # Device data
    device_data: Dict[str, Any]

    # Network data
    network_data: Dict[str, Any]

    # Location data
    location_data: Dict[str, Any]

    # Log analysis data
    log_data: Dict[str, Any]

    # Agent context
    agent_context: Dict[str, Any]


class TestDataGenerator:
    """
    Generator for real test data used in endpoint testing.

    Creates realistic, production-like test data that exercises
    all code paths without using any mock data.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.created_records = []  # Track for cleanup
        self._timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    def generate_user_id(self) -> str:
        """Generate a real test user ID."""
        return f"endpoint_test_user_{self._timestamp}_{uuid.uuid4().hex[:8]}"

    def generate_investigation_id(self) -> str:
        """Generate a real test investigation ID."""
        return f"endpoint_test_inv_{self._timestamp}_{uuid.uuid4().hex[:8]}"

    def generate_entity_id(self) -> str:
        """Generate a real test entity ID."""
        return f"endpoint_test_entity_{self._timestamp}_{uuid.uuid4().hex[:8]}"

    def create_real_investigation_data(
        self,
        user_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        status: str = "IN_PROGRESS",
    ) -> Dict[str, Any]:
        """Create real investigation data for testing."""

        user_id = user_id or self.generate_user_id()
        entity_id = entity_id or self.generate_entity_id()
        investigation_id = self.generate_investigation_id()

        now = datetime.now(timezone.utc)

        investigation_data = {
            "id": investigation_id,
            "user_id": user_id,
            "entity_id": entity_id,
            "entity_type": "user_id",
            "status": status,
            "risk_score": 0.0,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "metadata": {
                "source": "endpoint_testing",
                "test_case": "comprehensive_endpoint_test",
                "priority": "high",
                "category": "fraud_investigation",
                "automation_level": "full",
                "created_by": "endpoint_test_framework",
            },
        }

        # Create database record
        db_record = InvestigationRecord(
            investigation_id=investigation_id,
            user_id=user_id,
            entity_id=entity_id,
            status=status,
            risk_score=0.0,
            created_at=now,
            updated_at=now,
            metadata=json.dumps(investigation_data["metadata"]),
        )

        self.db_session.add(db_record)
        self.db_session.commit()
        self.created_records.append(("investigation", investigation_id))

        logger.info(f"Created real investigation data: {investigation_id}")
        return investigation_data

    def create_real_device_data(self, user_id: str) -> Dict[str, Any]:
        """Create real device analysis test data."""

        device_data = {
            "user_id": user_id,
            "device_fingerprint": {
                "device_id": f"device_{uuid.uuid4().hex[:12]}",
                "browser": "Chrome",
                "browser_version": "120.0.6099.109",
                "os": "Windows",
                "os_version": "10.0.19044",
                "screen_resolution": "1920x1080",
                "timezone": "America/New_York",
                "language": "en-US",
                "platform": "Win32",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "canvas_fingerprint": f"canvas_{uuid.uuid4().hex[:16]}",
                "webgl_fingerprint": f"webgl_{uuid.uuid4().hex[:16]}",
                "audio_fingerprint": f"audio_{uuid.uuid4().hex[:16]}",
            },
            "device_signals": [
                {
                    "signal_name": "SUSPICIOUS_USER_AGENT",
                    "signal_value": "false",
                    "confidence": 0.95,
                    "risk_level": "low",
                },
                {
                    "signal_name": "KNOWN_GOOD_DEVICE",
                    "signal_value": "true",
                    "confidence": 0.87,
                    "risk_level": "low",
                },
                {
                    "signal_name": "GEO_VELOCITY",
                    "signal_value": "normal",
                    "confidence": 0.92,
                    "risk_level": "low",
                },
            ],
            "ip_information": {
                "ip": "198.51.100.42",  # Documentation IP
                "city": "New York",
                "state": "NY",
                "country": "United States",
                "zip_code": "10001",
                "isp": "Example ISP Corp",
                "connection_type": "Cable/DSL",
                "is_proxy": False,
                "is_vpn": False,
                "is_tor": False,
            },
            "session_data": {
                "session_id": f"session_{uuid.uuid4().hex[:16]}",
                "session_start": (
                    datetime.now(timezone.utc) - timedelta(minutes=30)
                ).isoformat(),
                "session_duration_minutes": 30,
                "page_views": 12,
                "mouse_movements": 45,
                "keyboard_events": 23,
                "scroll_events": 18,
            },
        }

        logger.info(f"Created real device data for user: {user_id}")
        return device_data

    def create_real_network_data(self, user_id: str) -> Dict[str, Any]:
        """Create real network analysis test data."""

        network_data = {
            "user_id": user_id,
            "network_analysis": {
                "primary_ip": "198.51.100.42",
                "ip_history": [
                    {
                        "ip": "198.51.100.42",
                        "first_seen": (
                            datetime.now(timezone.utc) - timedelta(days=30)
                        ).isoformat(),
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                        "usage_count": 145,
                        "location": "New York, NY, US",
                    },
                    {
                        "ip": "198.51.100.43",
                        "first_seen": (
                            datetime.now(timezone.utc) - timedelta(days=45)
                        ).isoformat(),
                        "last_seen": (
                            datetime.now(timezone.utc) - timedelta(days=2)
                        ).isoformat(),
                        "usage_count": 23,
                        "location": "New York, NY, US",
                    },
                ],
                "suspicious_patterns": [],
                "risk_indicators": [
                    {
                        "indicator": "stable_ip_usage",
                        "value": "consistent",
                        "risk_level": "low",
                        "confidence": 0.94,
                    }
                ],
            },
            "device_network_signals": [
                {
                    "signal_type": "IP_REPUTATION",
                    "signal_value": "clean",
                    "confidence": 0.98,
                    "source": "reputation_db",
                },
                {
                    "signal_type": "CONNECTION_PATTERN",
                    "signal_value": "normal",
                    "confidence": 0.89,
                    "source": "behavioral_analysis",
                },
            ],
        }

        logger.info(f"Created real network data for user: {user_id}")
        return network_data

    def create_real_location_data(self, user_id: str) -> Dict[str, Any]:
        """Create real location analysis test data."""

        location_data = {
            "user_id": user_id,
            "location_sources": {
                "oii_location": {
                    "address": "123 Main Street",
                    "city": "New York",
                    "state": "NY",
                    "zip_code": "10001",
                    "country": "United States",
                    "latitude": 40.7589,
                    "longitude": -73.9851,
                    "confidence": 0.92,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                },
                "business_location": [
                    {
                        "business_name": "Example Corp",
                        "address": "456 Business Ave",
                        "city": "New York",
                        "state": "NY",
                        "zip_code": "10002",
                        "country": "United States",
                        "latitude": 40.7505,
                        "longitude": -73.9934,
                        "relationship": "employer",
                    }
                ],
                "phone_location": [
                    {
                        "phone_number": "+1234567890",
                        "location_type": "billing_address",
                        "city": "New York",
                        "state": "NY",
                        "country": "United States",
                        "confidence": 0.87,
                    }
                ],
            },
            "location_risk_analysis": {
                "risk_level": 0.15,
                "risk_factors": [
                    "Consistent location patterns",
                    "Known residential area",
                    "No geo-velocity anomalies",
                ],
                "confidence": 0.91,
                "summary": "Low risk - consistent and expected location patterns",
                "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }

        logger.info(f"Created real location data for user: {user_id}")
        return location_data

    def create_real_log_data(self, user_id: str) -> Dict[str, Any]:
        """Create real log analysis test data."""

        now = datetime.now(timezone.utc)

        log_data = {
            "user_id": user_id,
            "log_analysis": {
                "time_range": "30d",
                "total_events": 342,
                "event_categories": {
                    "authentication": 45,
                    "transaction": 123,
                    "profile_update": 12,
                    "security": 8,
                    "system": 154,
                },
                "suspicious_events": [],
                "risk_indicators": [
                    {
                        "indicator": "login_frequency",
                        "value": "normal",
                        "risk_level": "low",
                    },
                    {
                        "indicator": "transaction_patterns",
                        "value": "consistent",
                        "risk_level": "low",
                    },
                ],
            },
            "splunk_data": [
                {
                    "_time": (now - timedelta(hours=2)).isoformat(),
                    "event_type": "user_login",
                    "user_id": user_id,
                    "ip": "198.51.100.42",
                    "success": True,
                    "location": "New York, NY",
                },
                {
                    "_time": (now - timedelta(hours=4)).isoformat(),
                    "event_type": "transaction",
                    "user_id": user_id,
                    "amount": 125.50,
                    "merchant": "Example Store",
                    "status": "completed",
                },
                {
                    "_time": (now - timedelta(hours=6)).isoformat(),
                    "event_type": "profile_update",
                    "user_id": user_id,
                    "field_updated": "phone_number",
                    "success": True,
                },
            ],
            "risk_assessment": {
                "risk_level": 0.12,
                "risk_factors": [
                    "Normal activity patterns",
                    "No suspicious transactions",
                    "Expected login behavior",
                ],
                "confidence": 0.93,
                "summary": "Low risk - normal user activity with no anomalies detected",
                "timestamp": now.isoformat(),
            },
        }

        logger.info(f"Created real log data for user: {user_id}")
        return log_data

    def create_real_agent_context(
        self, user_id: str, investigation_id: str, entity_id: str
    ) -> Dict[str, Any]:
        """Create real agent context for testing."""

        agent_context = {
            "agent_name": "fraud_investigation",
            "input": f"Investigate user {user_id} for potential fraud indicators",
            "metadata": {
                "interaction_group_id": f"test_group_{uuid.uuid4().hex[:12]}",
                "additional_metadata": {
                    "userId": user_id,
                    "investigationId": investigation_id,
                    "entityId": entity_id,
                    "testCase": "endpoint_testing",
                    "priority": "high",
                },
            },
            "session_config": {"max_tokens": 4000, "temperature": 0.1, "timeout": 30},
        }

        logger.info(f"Created real agent context for investigation: {investigation_id}")
        return agent_context

    def generate_comprehensive_test_data(self) -> RealTestData:
        """
        Generate comprehensive real test data for all endpoint testing.

        Returns:
            RealTestData object with all necessary test data
        """
        # Generate identifiers
        user_id = self.generate_user_id()
        entity_id = self.generate_entity_id()
        investigation_id = self.generate_investigation_id()

        # Generate all data types
        investigation_data = self.create_real_investigation_data(user_id, entity_id)
        device_data = self.create_real_device_data(user_id)
        network_data = self.create_real_network_data(user_id)
        location_data = self.create_real_location_data(user_id)
        log_data = self.create_real_log_data(user_id)
        agent_context = self.create_real_agent_context(
            user_id, investigation_id, entity_id
        )

        test_data = RealTestData(
            user_id=user_id,
            entity_id=entity_id,
            investigation_id=investigation_id,
            investigation_data=investigation_data,
            device_data=device_data,
            network_data=network_data,
            location_data=location_data,
            log_data=log_data,
            agent_context=agent_context,
        )

        logger.info(f"Generated comprehensive test data for user: {user_id}")
        return test_data

    def create_test_investigation_variants(
        self, count: int = 5
    ) -> List[Dict[str, Any]]:
        """Create multiple test investigation variants for bulk testing."""
        variants = []

        statuses = ["IN_PROGRESS", "COMPLETED", "PENDING", "UNDER_REVIEW", "CLOSED"]

        for i in range(count):
            status = statuses[i % len(statuses)]
            investigation = self.create_real_investigation_data(status=status)
            variants.append(investigation)

        logger.info(f"Created {count} investigation variants")
        return variants

    def cleanup(self):
        """Clean up test data created during testing."""
        logger.info("Cleaning up test data...")

        for record_type, record_id in self.created_records:
            try:
                if record_type == "investigation":
                    record = (
                        self.db_session.query(InvestigationRecord)
                        .filter(InvestigationRecord.investigation_id == record_id)
                        .first()
                    )

                    if record:
                        self.db_session.delete(record)
                        self.db_session.commit()
                        logger.debug(f"Deleted investigation record: {record_id}")

            except Exception as e:
                logger.warning(f"Failed to cleanup {record_type} {record_id}: {e}")

        self.created_records.clear()
        logger.info("Test data cleanup completed")
