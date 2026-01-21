"""MongoDB repositories package.

This package contains repository classes for MongoDB Atlas data access.
Repositories implement the repository pattern for clean separation between
business logic and data access.
"""

from app.persistence.repositories.anomaly_event_repository import (
    AnomalyEventRepository,
)
from app.persistence.repositories.audit_log_repository import AuditLogRepository
from app.persistence.repositories.composio_action_audit_repository import (
    ComposioActionAuditRepository,
)
from app.persistence.repositories.composio_connection_repository import (
    ComposioConnectionRepository,
)
from app.persistence.repositories.detection_run_repository import (
    DetectionRunRepository,
)
from app.persistence.repositories.detector_repository import DetectorRepository
from app.persistence.repositories.investigation_repository import (
    InvestigationRepository,
)
from app.persistence.repositories.soar_playbook_execution_repository import (
    SOARPlaybookExecutionRepository,
)
from app.persistence.repositories.template_repository import TemplateRepository
from app.persistence.repositories.transaction_score_repository import (
    TransactionScoreRepository,
)

__all__ = [
    "InvestigationRepository",
    "DetectorRepository",
    "DetectionRunRepository",
    "AnomalyEventRepository",
    "TransactionScoreRepository",
    "AuditLogRepository",
    "TemplateRepository",
    "ComposioConnectionRepository",
    "ComposioActionAuditRepository",
    "SOARPlaybookExecutionRepository",
]
