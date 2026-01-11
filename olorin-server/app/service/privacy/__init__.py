"""
Privacy and Data Protection Module.

Provides PII obfuscation, audit logging, data retention controls,
and autonomous compliance enforcement for DPA compliance.

Per DPA Section 9.4: "To the extent practicable, Contractor shall anonymize
or irreversibly de-identify Personal Data prior to processing."

Per DPA Section 8: Data must be deleted upon request within 30 days.
"""

from app.service.privacy.audit_logger import (
    DataAccessType,
    DataCategory,
    PrivacyAuditLogger,
    get_privacy_audit_logger,
)
from app.service.privacy.compliance_agent import (
    ComplianceAgent,
    ComplianceDecision,
    get_compliance_agent,
)
from app.service.privacy.compliance_agent_tools import COMPLIANCE_TOOLS
from app.service.privacy.compliance_monitor_service import (
    ComplianceMonitorService,
    get_compliance_monitor_service,
)
from app.service.privacy.data_retention import (
    DataRetentionManager,
    DeletionStatus,
    get_data_retention_manager,
)
from app.service.privacy.dpa_compliance_audit import (
    DPAComplianceAuditor,
    DPAComplianceReport,
    get_dpa_compliance_auditor,
)
from app.service.privacy.llm_privacy_wrapper import (
    DPAComplianceError,
    LLMPrivacyWrapper,
    get_llm_privacy_wrapper,
)
from app.service.privacy.pii_obfuscator import (
    ObfuscationContext,
    PIIObfuscator,
    get_pii_obfuscator,
)

__all__ = [
    # PII Obfuscation
    "PIIObfuscator",
    "ObfuscationContext",
    "get_pii_obfuscator",
    # Audit Logging
    "PrivacyAuditLogger",
    "get_privacy_audit_logger",
    "DataAccessType",
    "DataCategory",
    # LLM Privacy Wrapper
    "LLMPrivacyWrapper",
    "get_llm_privacy_wrapper",
    "DPAComplianceError",
    # Data Retention
    "DataRetentionManager",
    "get_data_retention_manager",
    "DeletionStatus",
    # DPA Compliance Audit
    "DPAComplianceAuditor",
    "DPAComplianceReport",
    "get_dpa_compliance_auditor",
    # Compliance AI Agent
    "ComplianceAgent",
    "ComplianceDecision",
    "get_compliance_agent",
    "COMPLIANCE_TOOLS",
    # Compliance Monitoring Service
    "ComplianceMonitorService",
    "get_compliance_monitor_service",
]
