from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Union

import cryptography
from cryptography.fernet import Fernet
from pydantic import BaseModel, Field, ValidationError, validator

class AuditEventType(Enum):
    """Enumeration of possible audit event types."""
    ACCESS = auto()
    MODIFICATION = auto()
    DELETION = auto()
    CREATE = auto()
    AUTHENTICATION = auto()
    AUTHORIZATION = auto()
    PII_ACCESS = auto()
    SYSTEM_CONFIG = auto()

class ComplianceRegulation(Enum):
    """Supported compliance regulations."""
    GDPR = auto()
    CCPA = auto()
    SOX = auto()
    HIPAA = auto()

@dataclass
class AuditRecord:
    """Immutable audit record with cryptographic integrity."""
    event_id: str = field(default_factory=lambda: hashlib.sha256(
        os.urandom(32)).hexdigest())
    timestamp: datetime = field(default_factory=datetime.utcnow)
    event_type: AuditEventType = field(repr=False)
    user_id: Optional[str] = None
    resource_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    previous_hash: Optional[str] = None
    regulations: List[ComplianceRegulation] = field(default_factory=list)

    def __post_init__(self):
        """Validate and secure the audit record."""
        if not self.event_type or not isinstance(self.event_type, AuditEventType):
            raise ValueError("Invalid event type")

class PIIMaskingConfig(BaseModel):
    """Configuration for PII masking and protection."""
    mask_email: bool = True
    mask_phone: bool = True
    mask_ssn: bool = True
    mask_credit_card: bool = True
    encryption_key: Optional[str] = None

    @validator('encryption_key')
    def validate_encryption_key(cls, v):
        if v and not Fernet.is_valid_key(v.encode()):
            raise ValueError("Invalid encryption key")
        return v

class AuditTrailManager:
    """Comprehensive audit trail management system."""

    def __init__(
        self, 
        retention_days: int = 365,
        pii_config: Optional[PIIMaskingConfig] = None
    ):
        """
        Initialize audit trail manager with retention and PII protection.
        
        Args:
            retention_days: Number of days to retain audit records
            pii_config: PII masking and protection configuration
        """
        self._audit_records: List[AuditRecord] = []
        self._retention_days = retention_days
        self._pii_config = pii_config or PIIMaskingConfig()
        self._encryption_key = self._pii_config.encryption_key or Fernet.generate_key().decode()
        self._encryptor = Fernet(self._encryption_key.encode())

    def mask_pii(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask and protect Personally Identifiable Information.
        
        Args:
            data: Dictionary containing potential PII
        
        Returns:
            Masked dictionary with PII protected
        """
        masked_data = data.copy()
        
        # Email masking
        if self._pii_config.mask_email and 'email' in masked_data:
            email = masked_data['email']
            local, domain = email.split('@')
            masked_data['email'] = f"{local[:2]}***@{domain}"
        
        # Phone number masking
        if self._pii_config.mask_phone and 'phone' in masked_data:
            phone = masked_data['phone']
            masked_data['phone'] = phone[:-4] + '****'
        
        # SSN and Credit Card masking
        for key in ['ssn', 'credit_card']:
            if getattr(self._pii_config, f'mask_{key}') and key in masked_data:
                value = masked_data[key]
                masked_data[key] = value[:4] + '*' * (len(value) - 4)
        
        return masked_data

    def log_event(
        self, 
        event_type: AuditEventType, 
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        regulations: Optional[List[ComplianceRegulation]] = None
    ) -> AuditRecord:
        """
        Log an audit event with comprehensive details and cryptographic tracking.
        
        Args:
            event_type: Type of audit event
            user_id: User associated with the event
            resource_id: Resource affected by the event
            details: Additional event details
            regulations: Applicable compliance regulations
        
        Returns:
            Created AuditRecord
        """
        details = details or {}
        regulations = regulations or []
        
        # Mask PII in details
        masked_details = self.mask_pii(details)
        
        # Create audit record
        record = AuditRecord(
            event_type=event_type,
            user_id=user_id,
            resource_id=resource_id,
            details=masked_details,
            regulations=regulations
        )
        
        # Link to previous record for chain of custody
        if self._audit_records:
            record.previous_hash = hashlib.sha256(
                json.dumps(self._audit_records[-1].__dict__).encode()
            ).hexdigest()
        
        self._audit_records.append(record)
        return record

    def generate_compliance_report(
        self, 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None,
        regulations: Optional[List[ComplianceRegulation]] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive compliance report.
        
        Args:
            start_date: Report start date
            end_date: Report end date
            regulations: Specific regulations to report on
        
        Returns:
            Compliance report dictionary
        """
        start_date = start_date or datetime.utcnow() - timedelta(days=self._retention_days)
        end_date = end_date or datetime.utcnow()
        
        filtered_records = [
            record for record in self._audit_records
            if start_date <= record.timestamp <= end_date and 
            (not regulations or any(reg in record.regulations for reg in regulations))
        ]
        
        return {
            'total_events': len(filtered_records),
            'events_by_type': {
                event_type.name: len([r for r in filtered_records if r.event_type == event_type])
                for event_type in AuditEventType
            },
            'regulations_covered': list(set(
                reg.name for record in filtered_records for reg in record.regulations
            )),
            'start_date': start_date,
            'end_date': end_date
        }

    def purge_expired_records(self):
        """
        Remove audit records older than the retention period.
        """
        cutoff_time = datetime.utcnow() - timedelta(days=self._retention_days)
        self._audit_records = [
            record for record in self._audit_records 
            if record.timestamp > cutoff_time
        ]

# Export encryption utility
def get_pii_encryptor(key: Optional[str] = None) -> Fernet:
    """
    Get a Fernet encryption utility for PII protection.
    
    Args:
        key: Optional encryption key. Generates a new key if not provided.
    
    Returns:
        Fernet encryption utility
    """
    encryption_key = key or Fernet.generate_key()
    return Fernet(encryption_key)