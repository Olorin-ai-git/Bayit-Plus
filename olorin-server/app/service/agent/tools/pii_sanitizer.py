"""
PII Sanitization Framework

Comprehensive detection and sanitization of Personally Identifiable Information (PII)
in web tool outputs to ensure privacy protection during fraud investigations.
"""

import re
import logging
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class PIIType(str, Enum):
    """Types of PII that can be detected."""
    SSN = "ssn"
    CREDIT_CARD = "credit_card"
    EMAIL = "email"
    PHONE = "phone"
    BANK_ACCOUNT = "bank_account"
    DRIVER_LICENSE = "driver_license"
    PASSPORT = "passport"
    IP_ADDRESS = "ip_address"
    MAC_ADDRESS = "mac_address"
    FULL_NAME = "full_name"
    ADDRESS = "address"


class SanitizationMethod(str, Enum):
    """Methods for sanitizing PII."""
    REDACT = "redact"
    MASK = "mask"
    TOKENIZE = "tokenize"
    PRESERVE = "preserve"  # For investigation-relevant data


class PIISanitizer:
    """
    Sanitizes PII from text content while preserving investigation utility.
    """
    
    def __init__(self):
        """Initialize PII sanitizer with detection patterns."""
        self.pii_patterns = {
            PIIType.SSN: [
                r'\b\d{3}-\d{2}-\d{4}\b',  # 123-45-6789
                r'\b\d{3}\s\d{2}\s\d{4}\b',  # 123 45 6789
                r'\b\d{9}\b'  # 123456789 (context-dependent)
            ],
            PIIType.CREDIT_CARD: [
                r'\b(?:\d{4}[-\s]?){3}\d{4}\b',  # 1234-5678-9012-3456
                r'\b\d{13,19}\b'  # 13-19 digit numbers
            ],
            PIIType.EMAIL: [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            ],
            PIIType.PHONE: [
                r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',  # US phone
                r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'  # 123-456-7890
            ],
            PIIType.BANK_ACCOUNT: [
                r'\b\d{8,17}\b'  # Bank account numbers
            ],
            PIIType.DRIVER_LICENSE: [
                r'\b[A-Z]{1,2}\d{6,8}\b',  # State format variations
                r'\b\d{8,9}\b'  # Numeric DL numbers
            ],
            PIIType.PASSPORT: [
                r'\b[A-Z]{2}\d{7}\b',  # US passport format
                r'\b\d{9}\b'  # Passport numbers
            ],
            PIIType.IP_ADDRESS: [
                r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
            ],
            PIIType.MAC_ADDRESS: [
                r'\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b'
            ],
            PIIType.FULL_NAME: [
                r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # First Last
                r'\b[A-Z][a-z]+, [A-Z][a-z]+\b'  # Last, First
            ],
            PIIType.ADDRESS: [
                r'\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b'
            ]
        }
        
        # Investigation-relevant contexts where PII should be preserved
        self.investigation_contexts = [
            'fraud investigation',
            'suspicious activity',
            'target analysis',
            'subject information',
            'investigation target',
            'fraud subject'
        ]
        
        # Token mapping for correlation
        self._token_mapping: Dict[str, str] = {}
        
    def sanitize_content(
        self,
        content: str,
        method: SanitizationMethod = SanitizationMethod.REDACT,
        preserve_investigation_data: bool = True,
        investigation_targets: Optional[List[str]] = None
    ) -> Tuple[str, Dict[str, List[str]]]:
        """
        Sanitize PII from content.
        
        Args:
            content: Text content to sanitize
            method: Sanitization method to use
            preserve_investigation_data: Whether to preserve investigation-relevant data
            investigation_targets: Known investigation targets to preserve
            
        Returns:
            Tuple of (sanitized_content, detected_pii_summary)
        """
        if not content:
            return content, {}
        
        sanitized_content = content
        detected_pii = {}
        
        # Process each PII type
        for pii_type in PIIType:
            patterns = self.pii_patterns.get(pii_type, [])
            pii_instances = []
            
            for pattern in patterns:
                matches = re.finditer(pattern, sanitized_content, re.IGNORECASE)
                for match in matches:
                    matched_text = match.group()
                    
                    # Check if this should be preserved for investigation
                    should_preserve = (
                        preserve_investigation_data and
                        self._is_investigation_relevant(content, match, investigation_targets)
                    )
                    
                    if should_preserve:
                        # Keep investigation-relevant data
                        pii_instances.append({
                            "value": matched_text,
                            "status": "preserved_for_investigation"
                        })
                    else:
                        # Sanitize the PII
                        sanitized_value = self._apply_sanitization(
                            matched_text, pii_type, method
                        )
                        
                        sanitized_content = sanitized_content.replace(
                            matched_text, sanitized_value, 1
                        )
                        
                        pii_instances.append({
                            "original_length": len(matched_text),
                            "sanitized_value": sanitized_value,
                            "method": method.value
                        })
            
            if pii_instances:
                detected_pii[pii_type.value] = pii_instances
        
        return sanitized_content, detected_pii
    
    def _is_investigation_relevant(
        self,
        content: str,
        match: re.Match,
        investigation_targets: Optional[List[str]] = None
    ) -> bool:
        """
        Determine if a PII match is relevant to the investigation.
        """
        matched_text = match.group()
        
        # Check if it's a known investigation target
        if investigation_targets:
            for target in investigation_targets:
                if target.lower() in matched_text.lower():
                    return True
        
        # Check surrounding context for investigation keywords
        start = max(0, match.start() - 100)
        end = min(len(content), match.end() + 100)
        context = content[start:end].lower()
        
        for inv_context in self.investigation_contexts:
            if inv_context in context:
                return True
        
        return False
    
    def _apply_sanitization(
        self,
        text: str,
        pii_type: PIIType,
        method: SanitizationMethod
    ) -> str:
        """
        Apply the specified sanitization method.
        """
        if method == SanitizationMethod.REDACT:
            return f"[REDACTED-{pii_type.value.upper()}]"
        
        elif method == SanitizationMethod.MASK:
            return self._mask_text(text, pii_type)
        
        elif method == SanitizationMethod.TOKENIZE:
            return self._tokenize_text(text, pii_type)
        
        elif method == SanitizationMethod.PRESERVE:
            return text
        
        else:
            return f"[REDACTED-{pii_type.value.upper()}]"
    
    def _mask_text(self, text: str, pii_type: PIIType) -> str:
        """
        Mask PII while showing partial information.
        """
        if pii_type == PIIType.SSN:
            # Show last 4 digits: ***-**-1234
            if len(text) >= 4:
                return f"***-**-{text[-4:]}"
        
        elif pii_type == PIIType.CREDIT_CARD:
            # Show last 4 digits: ****-****-****-1234
            digits_only = re.sub(r'\D', '', text)
            if len(digits_only) >= 4:
                return f"****-****-****-{digits_only[-4:]}"
        
        elif pii_type == PIIType.EMAIL:
            # Show domain: ***@example.com
            if '@' in text:
                domain = text.split('@')[1]
                return f"***@{domain}"
        
        elif pii_type == PIIType.PHONE:
            # Show area code: (123) ***-****
            digits_only = re.sub(r'\D', '', text)
            if len(digits_only) >= 10:
                return f"({digits_only[:3]}) ***-****"
        
        # Default masking
        if len(text) <= 3:
            return "*" * len(text)
        elif len(text) <= 6:
            return text[:1] + "*" * (len(text) - 2) + text[-1:]
        else:
            return text[:2] + "*" * (len(text) - 4) + text[-2:]
    
    def _tokenize_text(self, text: str, pii_type: PIIType) -> str:
        """
        Replace PII with consistent tokens for correlation.
        """
        # Generate or retrieve token for this text
        token_key = f"{pii_type.value}_{text}"
        
        if token_key not in self._token_mapping:
            # Generate a consistent hash-based token
            hash_object = hashlib.md5(token_key.encode())
            token_hash = hash_object.hexdigest()[:8]
            self._token_mapping[token_key] = f"TOKEN_{pii_type.value.upper()}_{token_hash}"
        
        return self._token_mapping[token_key]
    
    def get_sanitization_summary(self, detected_pii: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Generate a summary of sanitization actions.
        """
        total_pii_found = sum(len(instances) for instances in detected_pii.values())
        pii_types_found = list(detected_pii.keys())
        
        preserved_count = 0
        sanitized_count = 0
        
        for instances in detected_pii.values():
            for instance in instances:
                if instance.get("status") == "preserved_for_investigation":
                    preserved_count += 1
                else:
                    sanitized_count += 1
        
        return {
            "total_pii_detected": total_pii_found,
            "pii_types_found": pii_types_found,
            "pii_preserved_for_investigation": preserved_count,
            "pii_sanitized": sanitized_count,
            "sanitization_effective": sanitized_count > 0
        }


# Global sanitizer instance for reuse
_sanitizer_instance = None

def get_pii_sanitizer() -> PIISanitizer:
    """Get the global PII sanitizer instance."""
    global _sanitizer_instance
    if _sanitizer_instance is None:
        _sanitizer_instance = PIISanitizer()
    return _sanitizer_instance


def sanitize_web_content(
    content: str,
    investigation_targets: Optional[List[str]] = None,
    method: SanitizationMethod = SanitizationMethod.REDACT
) -> Tuple[str, Dict[str, Any]]:
    """
    Convenience function for sanitizing web tool content.
    
    Args:
        content: Content to sanitize
        investigation_targets: Known targets to preserve
        method: Sanitization method
        
    Returns:
        Tuple of (sanitized_content, sanitization_summary)
    """
    sanitizer = get_pii_sanitizer()
    sanitized_content, detected_pii = sanitizer.sanitize_content(
        content=content,
        method=method,
        preserve_investigation_data=True,
        investigation_targets=investigation_targets
    )
    
    summary = sanitizer.get_sanitization_summary(detected_pii)
    summary["detected_pii"] = detected_pii
    
    return sanitized_content, summary