import json
import time
from datetime import datetime, timedelta
import pytest
from cryptography.fernet import Fernet

from app.service.mcp_servers.compliance.audit_trail import (
    AuditTrailManager, 
    AuditEventType, 
    ComplianceRegulation, 
    PIIMaskingConfig
)

@pytest.fixture
def audit_manager():
    """Create an AuditTrailManager instance for testing."""
    return AuditTrailManager(
        retention_days=30,
        pii_config=PIIMaskingConfig(
            mask_email=True,
            mask_phone=True,
            mask_ssn=True,
            mask_credit_card=True
        )
    )

def test_log_event_basic(audit_manager):
    """Test basic event logging functionality."""
    record = audit_manager.log_event(
        event_type=AuditEventType.ACCESS,
        user_id='test_user',
        resource_id='resource_123',
        details={'action': 'view'}
    )
    
    assert record.event_type == AuditEventType.ACCESS
    assert record.user_id == 'test_user'
    assert record.resource_id == 'resource_123'
    assert record.details == {'action': 'view'}

def test_pii_masking(audit_manager):
    """Test PII masking capabilities."""
    record = audit_manager.log_event(
        event_type=AuditEventType.PII_ACCESS,
        details={
            'email': 'john.doe@example.com',
            'phone': '1234567890',
            'ssn': '123-45-6789',
            'credit_card': '4111111111111111'
        }
    )
    
    masked_details = record.details
    assert masked_details['email'] == 'jo***@example.com'
    assert masked_details['phone'] == '123****'
    assert masked_details['ssn'] == '123*******'
    assert masked_details['credit_card'] == '4111*******1111'

def test_audit_record_chaining(audit_manager):
    """Verify that audit records are cryptographically linked."""
    record1 = audit_manager.log_event(AuditEventType.ACCESS)
    record2 = audit_manager.log_event(AuditEventType.MODIFICATION)
    
    assert record2.previous_hash is not None
    assert record2.previous_hash != record1.event_id

def test_compliance_report(audit_manager):
    """Test generation of compliance reports."""
    # Log multiple events
    audit_manager.log_event(
        event_type=AuditEventType.ACCESS, 
        regulations=[ComplianceRegulation.GDPR]
    )
    audit_manager.log_event(
        event_type=AuditEventType.MODIFICATION, 
        regulations=[ComplianceRegulation.CCPA]
    )
    
    report = audit_manager.generate_compliance_report()
    
    assert report['total_events'] == 2
    assert report['events_by_type'][AuditEventType.ACCESS.name] == 1
    assert report['events_by_type'][AuditEventType.MODIFICATION.name] == 1
    assert set(report['regulations_covered']) == {'GDPR', 'CCPA'}

def test_record_retention(audit_manager):
    """Test automatic purging of expired records."""
    # Override retention to make testing faster
    audit_manager._retention_days = 0
    
    # Log multiple events
    audit_manager.log_event(AuditEventType.ACCESS)
    audit_manager.log_event(AuditEventType.MODIFICATION)
    
    # Purge expired records
    audit_manager.purge_expired_records()
    
    # Verify no records remain
    report = audit_manager.generate_compliance_report()
    assert report['total_events'] == 0

def test_encryption_utility():
    """Test PII encryption utility."""
    from app.service.mcp_servers.compliance.audit_trail import get_pii_encryptor
    
    # Generate encryptor
    encryptor = get_pii_encryptor()
    assert isinstance(encryptor, Fernet)
    
    # Test encryption and decryption
    test_data = b"Sensitive PII Data"
    encrypted = encryptor.encrypt(test_data)
    decrypted = encryptor.decrypt(encrypted)
    
    assert decrypted == test_data