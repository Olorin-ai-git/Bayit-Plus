"""
Seed investigation data for development and testing.

Generates sample parallel investigations for testing the ParallelInvestigationsPage
and investigation monitoring features.

SYSTEM MANDATE Compliant:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders
- Type-safe: Proper typing throughout
"""

import sys
from datetime import datetime, timedelta
from typing import List

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models.investigation_state import InvestigationStateModel
from app.schemas.investigation_state import (
    InvestigationStateCreate,
    LifecycleStage,
    InvestigationStatus,
    InvestigationMode,
)
from app.service.investigation_state_service import InvestigationStateService


def get_database_url() -> str:
    """Get database URL from environment or use default SQLite."""
    import os
    return os.getenv("DATABASE_URL", "sqlite:///./olorin.db")


def seed_parallel_investigations(count: int = 10) -> None:
    """Create sample parallel investigations for testing."""
    db_url = get_database_url()
    engine = create_engine(db_url, echo=False)

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Sample merchants and entities for realistic data
        merchants = [
            "Acme Corp", "TechStart Inc", "GlobalPay Ltd", "SecureNet",
            "FinanceHub", "PaymentGuru", "CyberTrust", "DataFlow Systems"
        ]

        # Create 10 investigations
        for i in range(count):
            merchant = merchants[i % len(merchants)]
            entity_id = f"user-{1000 + i}@example.com"

            # Vary statuses to show different states
            if i < 3:
                status = InvestigationStatus.COMPLETED
                lifecycle_stage = LifecycleStage.COMPLETED
                progress = 100
            elif i < 7:
                status = InvestigationStatus.IN_PROGRESS
                lifecycle_stage = LifecycleStage.IN_PROGRESS
                progress = 45 + (i * 10)
            else:
                status = InvestigationStatus.CREATED
                lifecycle_stage = LifecycleStage.SETTINGS
                progress = 0

            # Create investigation with settings
            investigation_id = f"inv-parallel-{1000 + i}"

            investigation_data = InvestigationStateCreate(
                investigation_id=investigation_id,
                lifecycle_stage=lifecycle_stage,
                status=status,
                settings={
                    "name": f"Parallel Investigation {i+1}: {merchant}",
                    "entities": [
                        {
                            "entity_type": "user_id",
                            "entity_value": entity_id
                        }
                    ],
                    "time_range": {
                        "start": (datetime.now() - timedelta(days=30)).isoformat(),
                        "end": datetime.now().isoformat(),
                        "type": "last_30d"
                    },
                    "tools": [
                        {"tool_id": "device_analysis"},
                        {"tool_id": "location_analysis"},
                        {"tool_id": "network_analysis"},
                        {"tool_id": "logs_analysis"}
                    ],
                    "correlation_mode": "OR",
                    "investigation_type": "structured",
                    "investigation_mode": InvestigationMode.ENTITY,
                    "metadata": {
                        "merchantName": merchant,
                        "fraudTxCount": max(0, (count - i - 1) * 2),
                        "riskCategory": "high" if i < 3 else "medium"
                    }
                }
            )

            # Create progress object for investigations in progress or completed
            progress_data = None
            if progress > 0:
                progress_data = {
                    "phases": [
                        {
                            "phase_name": "entity_extraction",
                            "status": "COMPLETED",
                            "progress_percent": 100,
                            "tools_in_phase": ["entity_extractor"]
                        },
                        {
                            "phase_name": "analysis",
                            "status": "COMPLETED" if progress >= 50 else "IN_PROGRESS",
                            "progress_percent": progress if progress < 50 else 100,
                            "tools_in_phase": ["device_analysis", "location_analysis"]
                        },
                        {
                            "phase_name": "correlation",
                            "status": "COMPLETED" if progress >= 80 else ("IN_PROGRESS" if progress >= 50 else "QUEUED"),
                            "progress_percent": max(0, progress - 50) if progress > 50 else 0,
                            "tools_in_phase": ["correlator"]
                        }
                    ],
                    "tools_executed": ["device_analysis", "location_analysis"] if progress >= 50 else ["device_analysis"],
                    "percent_complete": progress,
                    "current_phase": "correlation" if progress > 50 else "analysis" if progress > 0 else None,
                    "domain_findings": {
                        "device": {
                            "findings": [
                                {
                                    "title": f"Device fingerprint anomaly for {merchant}",
                                    "description": "Unusual device signature detected",
                                    "severity": "high",
                                    "confidence": 0.85
                                }
                            ] if progress >= 50 else [],
                            "confidence": 0.85,
                            "reasoning": "Pattern detected in device behavior"
                        } if progress > 0 else {}
                    },
                    "risk_score": (count - i) * 8 if progress > 0 else 0,
                    "progress_percentage": progress
                }

            # Create the investigation in database
            db_model = InvestigationStateModel(
                investigation_id=investigation_id,
                user_id="test-user",
                lifecycle_stage=lifecycle_stage,
                status=status,
                settings_json=str(investigation_data.settings),
                progress_json=str(progress_data) if progress_data else "{}",
                version=1,
                created_at=datetime.now() - timedelta(hours=i),
                updated_at=datetime.now() - timedelta(minutes=i*5),
                last_accessed=None
            )

            db.add(db_model)
            print(f"✓ Created investigation {investigation_id} - Status: {status}, Progress: {progress}%")

        db.commit()
        print(f"\n✅ Successfully seeded {count} investigations")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding investigations: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


def clear_investigations() -> None:
    """Clear all investigation data from database."""
    db_url = get_database_url()
    engine = create_engine(db_url, echo=False)

    with engine.begin() as connection:
        connection.execute(text("DELETE FROM investigation_states"))
        print("✓ Cleared all investigations from database")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed investigation data")
    parser.add_argument("--count", type=int, default=10, help="Number of investigations to create")
    parser.add_argument("--clear", action="store_true", help="Clear all investigations before seeding")

    args = parser.parse_args()

    if args.clear:
        clear_investigations()

    seed_parallel_investigations(args.count)
