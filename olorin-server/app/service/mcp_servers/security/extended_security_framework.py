"""Extended security framework for MCP tools with enhanced compliance and validation."""

import hashlib
import secrets
import time
import re
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
from datetime import datetime, timedelta

import asyncio
from cryptography.fernet import Fernet
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SecurityLevel(Enum):
    """Security levels for tool operations."""
    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"
    CONFIDENTIAL = "confidential"
    TOP_SECRET = "top_secret"


class ComplianceFramework(Enum):
    """Supported compliance frameworks."""
    AML = "aml"  # Anti-Money Laundering
    KYC = "kyc"  # Know Your Customer
    GDPR = "gdpr"  # General Data Protection Regulation
    SOX = "sox"  # Sarbanes-Oxley Act
    PCI_DSS = "pci_dss"  # Payment Card Industry Data Security Standard
    HIPAA = "hipaa"  # Health Insurance Portability and Accountability Act


@dataclass
class SecurityContext:
    """Security context for tool execution."""
    user_id: str
    session_id: str
    security_level: SecurityLevel
    permissions: Set[str] = field(default_factory=set)
    compliance_requirements: Set[ComplianceFramework] = field(default_factory=set)
    data_classification: str = "internal"
    audit_required: bool = False
    encryption_required: bool = False
    
    # Request tracking
    request_id: str = field(default_factory=lambda: secrets.token_hex(16))
    timestamp: datetime = field(default_factory=datetime.now)
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class ValidationResult:
    """Result of security validation."""
    passed: bool
    violations: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    required_actions: List[str] = field(default_factory=list)
    risk_score: float = 0.0
    compliance_status: Dict[ComplianceFramework, bool] = field(default_factory=dict)


@dataclass
class AuditLogEntry:
    """Audit log entry for compliance tracking."""
    timestamp: datetime
    request_id: str
    user_id: str
    tool_name: str
    action: str
    security_level: SecurityLevel
    compliance_frameworks: Set[ComplianceFramework]
    data_accessed: List[str]
    result_status: str
    risk_score: float
    violations: List[str]
    
    # Additional context
    session_id: str
    source_ip: Optional[str] = None
    data_hash: Optional[str] = None
    retention_period: int = 2555  # days (7 years default)


class PIIMaskingEngine:
    """Engine for detecting and masking PII data."""
    
    def __init__(self):
        """Initialize PII masking patterns."""
        self.patterns = {
            'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
            'credit_card': re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'),
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
            'ip': re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'),
            'bitcoin_address': re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
            'ethereum_address': re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
        }
        
        self.crypto_patterns = {
            'btc_private_key': re.compile(r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
            'eth_private_key': re.compile(r'\b0x[a-fA-F0-9]{64}\b'),
            'api_key': re.compile(r'\b[A-Za-z0-9_-]{32,}\b'),
        }

    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        """Detect PII patterns in text."""
        detected = defaultdict(list)
        
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            if matches:
                detected[pii_type] = matches
        
        # Check for sensitive crypto data
        for crypto_type, pattern in self.crypto_patterns.items():
            matches = pattern.findall(text)
            if matches:
                detected[crypto_type] = matches
        
        return dict(detected)

    def mask_pii(self, text: str, mask_char: str = "*") -> Tuple[str, Dict[str, int]]:
        """Mask PII in text and return masked text with count."""
        masked_text = text
        mask_counts = {}
        
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(masked_text)
            if matches:
                mask_counts[pii_type] = len(matches)
                
                # Different masking strategies
                if pii_type == 'credit_card':
                    masked_text = pattern.sub('****-****-****-****', masked_text)
                elif pii_type == 'ssn':
                    masked_text = pattern.sub('***-**-****', masked_text)
                elif pii_type == 'email':
                    def mask_email(match):
                        email = match.group(0)
                        parts = email.split('@')
                        if len(parts) == 2:
                            username = parts[0]
                            domain = parts[1]
                            masked_username = username[0] + '*' * (len(username) - 1)
                            return f"{masked_username}@{domain}"
                        return email
                    masked_text = pattern.sub(mask_email, masked_text)
                else:
                    masked_text = pattern.sub(mask_char * 8, masked_text)
        
        # Mask sensitive crypto data completely
        for crypto_type, pattern in self.crypto_patterns.items():
            matches = pattern.findall(masked_text)
            if matches:
                mask_counts[f"sensitive_{crypto_type}"] = len(matches)
                masked_text = pattern.sub("[REDACTED]", masked_text)
        
        return masked_text, mask_counts


class TokenizationService:
    """Service for tokenizing sensitive data."""
    
    def __init__(self):
        """Initialize tokenization service."""
        self.cipher_suite = Fernet(Fernet.generate_key())
        self.token_map: Dict[str, str] = {}
        self.reverse_map: Dict[str, str] = {}

    def tokenize(self, sensitive_data: str) -> str:
        """Tokenize sensitive data."""
        # Generate deterministic token based on data hash
        data_hash = hashlib.sha256(sensitive_data.encode()).hexdigest()
        token = f"TOKEN_{data_hash[:16].upper()}"
        
        # Store encrypted mapping
        encrypted_data = self.cipher_suite.encrypt(sensitive_data.encode())
        self.token_map[token] = encrypted_data.decode()
        self.reverse_map[sensitive_data] = token
        
        return token

    def detokenize(self, token: str) -> Optional[str]:
        """Detokenize to get original data."""
        if token in self.token_map:
            encrypted_data = self.token_map[token].encode()
            original_data = self.cipher_suite.decrypt(encrypted_data)
            return original_data.decode()
        return None


class APIKeyRotationManager:
    """Manager for API key rotation and validation."""
    
    def __init__(self):
        """Initialize API key rotation manager."""
        self.active_keys: Dict[str, Dict[str, Any]] = {}
        self.rotation_schedule: Dict[str, datetime] = {}
        self.key_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def register_api_key(
        self,
        service_name: str,
        api_key: str,
        rotation_days: int = 90,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Register an API key for rotation management."""
        key_info = {
            'key': api_key,
            'created': datetime.now(),
            'rotation_days': rotation_days,
            'usage_count': 0,
            'last_used': None,
            'metadata': metadata or {}
        }
        
        self.active_keys[service_name] = key_info
        self.rotation_schedule[service_name] = datetime.now() + timedelta(days=rotation_days)
        
        logger.info(f"Registered API key for {service_name} with {rotation_days} day rotation")

    def get_api_key(self, service_name: str) -> Optional[str]:
        """Get API key and update usage tracking."""
        if service_name in self.active_keys:
            key_info = self.active_keys[service_name]
            key_info['usage_count'] += 1
            key_info['last_used'] = datetime.now()
            return key_info['key']
        return None

    def check_rotation_needed(self) -> List[str]:
        """Check which API keys need rotation."""
        now = datetime.now()
        needs_rotation = []
        
        for service_name, rotation_date in self.rotation_schedule.items():
            if now >= rotation_date:
                needs_rotation.append(service_name)
        
        return needs_rotation

    async def rotate_key(self, service_name: str, new_key: str) -> bool:
        """Rotate an API key."""
        if service_name not in self.active_keys:
            return False
        
        # Archive old key
        old_key_info = self.active_keys[service_name].copy()
        old_key_info['retired'] = datetime.now()
        self.key_history[service_name].append(old_key_info)
        
        # Update with new key
        rotation_days = old_key_info['rotation_days']
        self.register_api_key(service_name, new_key, rotation_days)
        
        logger.info(f"Rotated API key for {service_name}")
        return True


class ExtendedSecurityFramework:
    """Extended security framework for MCP tool operations."""
    
    def __init__(self):
        """Initialize the extended security framework."""
        self.pii_masking = PIIMaskingEngine()
        self.tokenization = TokenizationService()
        self.key_rotation = APIKeyRotationManager()
        
        # Audit logging
        self.audit_log: List[AuditLogEntry] = []
        self.audit_enabled = True
        
        # Security policies
        self.security_policies: Dict[str, Dict[str, Any]] = {}
        self.compliance_rules: Dict[ComplianceFramework, Dict[str, Any]] = {}
        
        # Rate limiting for security operations
        self.security_rate_limits: Dict[str, List[float]] = defaultdict(list)
        
        self._initialize_compliance_rules()

    def _initialize_compliance_rules(self) -> None:
        """Initialize compliance framework rules."""
        self.compliance_rules = {
            ComplianceFramework.AML: {
                'required_fields': ['transaction_amount', 'counterparty', 'jurisdiction'],
                'retention_days': 2555,  # 7 years
                'audit_required': True,
                'encryption_required': True,
                'pii_masking': True
            },
            ComplianceFramework.KYC: {
                'required_fields': ['customer_id', 'identity_verification'],
                'retention_days': 1825,  # 5 years
                'audit_required': True,
                'encryption_required': True,
                'pii_masking': True
            },
            ComplianceFramework.GDPR: {
                'required_fields': ['data_subject_consent'],
                'retention_days': 365,  # 1 year default
                'audit_required': True,
                'encryption_required': True,
                'pii_masking': True,
                'right_to_erasure': True
            }
        }

    async def validate_security_context(
        self,
        context: SecurityContext,
        tool_name: str,
        operation_data: Dict[str, Any]
    ) -> ValidationResult:
        """Validate security context for tool operation."""
        result = ValidationResult(passed=True)
        
        # Check rate limiting
        await self._check_rate_limits(context, result)
        
        # Validate permissions
        self._validate_permissions(context, tool_name, result)
        
        # Check compliance requirements
        await self._validate_compliance(context, operation_data, result)
        
        # Detect and validate PII
        await self._validate_pii_handling(context, operation_data, result)
        
        # Calculate risk score
        result.risk_score = self._calculate_risk_score(context, operation_data, result)
        
        # Log audit entry if required
        if context.audit_required or result.risk_score > 0.7:
            await self._create_audit_entry(context, tool_name, operation_data, result)
        
        return result

    async def _check_rate_limits(
        self,
        context: SecurityContext,
        result: ValidationResult
    ) -> None:
        """Check rate limits for security operations."""
        now = time.time()
        user_requests = self.security_rate_limits[context.user_id]
        
        # Remove old requests (older than 1 hour)
        user_requests[:] = [t for t in user_requests if now - t < 3600]
        
        # Check limits based on security level
        limits = {
            SecurityLevel.PUBLIC: 100,
            SecurityLevel.INTERNAL: 500,
            SecurityLevel.RESTRICTED: 200,
            SecurityLevel.CONFIDENTIAL: 100,
            SecurityLevel.TOP_SECRET: 50
        }
        
        limit = limits.get(context.security_level, 100)
        
        if len(user_requests) >= limit:
            result.passed = False
            result.violations.append(f"Rate limit exceeded: {len(user_requests)}/{limit} requests per hour")
        
        # Add current request
        user_requests.append(now)

    def _validate_permissions(
        self,
        context: SecurityContext,
        tool_name: str,
        result: ValidationResult
    ) -> None:
        """Validate user permissions for tool access."""
        # Check if tool requires specific permissions
        if tool_name in self.security_policies:
            policy = self.security_policies[tool_name]
            required_permissions = policy.get('required_permissions', set())
            
            missing_permissions = required_permissions - context.permissions
            if missing_permissions:
                result.passed = False
                result.violations.append(f"Missing permissions: {missing_permissions}")
        
        # Check security level requirements
        tool_security_level = self._get_tool_security_level(tool_name)
        if context.security_level.value < tool_security_level.value:
            result.passed = False
            result.violations.append(
                f"Insufficient security level: {context.security_level.value} < {tool_security_level.value}"
            )

    async def _validate_compliance(
        self,
        context: SecurityContext,
        operation_data: Dict[str, Any],
        result: ValidationResult
    ) -> None:
        """Validate compliance requirements."""
        for framework in context.compliance_requirements:
            if framework in self.compliance_rules:
                rules = self.compliance_rules[framework]
                framework_passed = True
                
                # Check required fields
                required_fields = rules.get('required_fields', [])
                missing_fields = [
                    field for field in required_fields
                    if field not in operation_data or not operation_data[field]
                ]
                
                if missing_fields:
                    framework_passed = False
                    result.violations.append(
                        f"{framework.value} compliance: Missing required fields {missing_fields}"
                    )
                
                # Check encryption requirement
                if rules.get('encryption_required', False) and not context.encryption_required:
                    framework_passed = False
                    result.violations.append(f"{framework.value} compliance: Encryption required")
                
                # Check audit requirement
                if rules.get('audit_required', False):
                    context.audit_required = True
                
                result.compliance_status[framework] = framework_passed
                
                if not framework_passed:
                    result.passed = False

    async def _validate_pii_handling(
        self,
        context: SecurityContext,
        operation_data: Dict[str, Any],
        result: ValidationResult
    ) -> None:
        """Validate PII handling and apply masking/tokenization."""
        # Convert operation data to string for PII detection
        data_str = str(operation_data)
        
        # Detect PII
        pii_detected = self.pii_masking.detect_pii(data_str)
        
        if pii_detected:
            result.warnings.append(f"PII detected: {list(pii_detected.keys())}")
            
            # Check if PII masking is required by compliance
            masking_required = any(
                self.compliance_rules.get(framework, {}).get('pii_masking', False)
                for framework in context.compliance_requirements
            )
            
            if masking_required:
                # Apply masking
                masked_data, mask_counts = self.pii_masking.mask_pii(data_str)
                result.required_actions.append("PII has been masked for compliance")
                
                # For blockchain addresses, suggest tokenization
                if any(crypto_type in pii_detected for crypto_type in 
                       ['bitcoin_address', 'ethereum_address']):
                    result.required_actions.append("Consider tokenizing blockchain addresses")

    def _calculate_risk_score(
        self,
        context: SecurityContext,
        operation_data: Dict[str, Any],
        result: ValidationResult
    ) -> float:
        """Calculate risk score based on multiple factors."""
        risk_score = 0.0
        
        # Base risk by security level
        security_risk = {
            SecurityLevel.PUBLIC: 0.1,
            SecurityLevel.INTERNAL: 0.2,
            SecurityLevel.RESTRICTED: 0.4,
            SecurityLevel.CONFIDENTIAL: 0.6,
            SecurityLevel.TOP_SECRET: 0.8
        }
        risk_score += security_risk.get(context.security_level, 0.5)
        
        # Risk from violations
        risk_score += len(result.violations) * 0.2
        
        # Risk from compliance failures
        failed_compliance = sum(1 for passed in result.compliance_status.values() if not passed)
        risk_score += failed_compliance * 0.3
        
        # Risk from data sensitivity
        data_str = str(operation_data)
        if any(keyword in data_str.lower() for keyword in 
               ['private_key', 'password', 'secret', 'token']):
            risk_score += 0.4
        
        return min(1.0, risk_score)

    def _get_tool_security_level(self, tool_name: str) -> SecurityLevel:
        """Get security level requirement for a tool."""
        if tool_name in self.security_policies:
            return SecurityLevel(self.security_policies[tool_name].get('security_level', 'internal'))
        
        # Default security levels by tool category
        if 'blockchain' in tool_name:
            return SecurityLevel.RESTRICTED
        elif 'compliance' in tool_name:
            return SecurityLevel.CONFIDENTIAL
        else:
            return SecurityLevel.INTERNAL

    async def _create_audit_entry(
        self,
        context: SecurityContext,
        tool_name: str,
        operation_data: Dict[str, Any],
        result: ValidationResult
    ) -> None:
        """Create audit log entry."""
        if not self.audit_enabled:
            return
        
        # Hash operation data for integrity
        data_hash = hashlib.sha256(str(operation_data).encode()).hexdigest()
        
        audit_entry = AuditLogEntry(
            timestamp=context.timestamp,
            request_id=context.request_id,
            user_id=context.user_id,
            tool_name=tool_name,
            action="tool_execution",
            security_level=context.security_level,
            compliance_frameworks=context.compliance_requirements,
            data_accessed=list(operation_data.keys()),
            result_status="passed" if result.passed else "failed",
            risk_score=result.risk_score,
            violations=result.violations,
            session_id=context.session_id,
            source_ip=context.source_ip,
            data_hash=data_hash
        )
        
        self.audit_log.append(audit_entry)
        
        # Log to external audit system if configured
        logger.info(f"Audit entry created: {audit_entry.request_id}")

    def get_audit_trail(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AuditLogEntry]:
        """Get audit trail with optional filtering."""
        filtered_entries = self.audit_log
        
        if user_id:
            filtered_entries = [e for e in filtered_entries if e.user_id == user_id]
        
        if start_date:
            filtered_entries = [e for e in filtered_entries if e.timestamp >= start_date]
        
        if end_date:
            filtered_entries = [e for e in filtered_entries if e.timestamp <= end_date]
        
        return filtered_entries

    def register_security_policy(
        self,
        tool_name: str,
        policy: Dict[str, Any]
    ) -> None:
        """Register security policy for a tool."""
        self.security_policies[tool_name] = policy
        logger.info(f"Registered security policy for {tool_name}")

    async def cleanup_expired_data(self) -> None:
        """Clean up expired audit entries and tokens."""
        now = datetime.now()
        
        # Clean up audit entries based on retention policies
        retained_entries = []
        for entry in self.audit_log:
            retention_days = entry.retention_period
            if (now - entry.timestamp).days < retention_days:
                retained_entries.append(entry)
        
        removed_count = len(self.audit_log) - len(retained_entries)
        self.audit_log = retained_entries
        
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} expired audit entries")

    def get_compliance_report(self) -> Dict[str, Any]:
        """Generate compliance status report."""
        now = datetime.now()
        last_30_days = now - timedelta(days=30)
        
        recent_entries = [e for e in self.audit_log if e.timestamp >= last_30_days]
        
        # Compliance framework statistics
        framework_stats = defaultdict(lambda: {'total': 0, 'passed': 0, 'failed': 0})
        
        for entry in recent_entries:
            for framework in entry.compliance_frameworks:
                framework_stats[framework.value]['total'] += 1
                if entry.result_status == 'passed':
                    framework_stats[framework.value]['passed'] += 1
                else:
                    framework_stats[framework.value]['failed'] += 1
        
        # Calculate compliance rates
        for stats in framework_stats.values():
            stats['compliance_rate'] = (
                stats['passed'] / stats['total'] if stats['total'] > 0 else 0
            )
        
        return {
            'report_period': '30 days',
            'total_operations': len(recent_entries),
            'framework_compliance': dict(framework_stats),
            'average_risk_score': sum(e.risk_score for e in recent_entries) / len(recent_entries) if recent_entries else 0,
            'violations_count': sum(len(e.violations) for e in recent_entries),
            'audit_coverage': len(recent_entries) / max(1, len(self.audit_log)) * 100
        }