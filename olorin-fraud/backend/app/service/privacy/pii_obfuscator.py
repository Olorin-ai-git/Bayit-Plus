"""
PII Obfuscator for DPA Compliance.

Automatically detects and obfuscates Personal Identifiable Information (PII)
before data is sent to LLM sub-processors (Anthropic Claude, OpenAI).

Per DPA Section 9.4: "To the extent practicable, Contractor shall anonymize
or irreversibly de-identify Personal Data prior to processing."

Supported PII types:
- Email addresses
- IP addresses (IPv4, IPv6)
- Device IDs / Fingerprints
- Phone numbers
- Transaction IDs
- Card numbers (last 4 digits preserved)
"""

import hashlib
import re
import threading
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class ObfuscationContext:
    """
    Context for a single obfuscation session.

    Maintains consistent mappings within a request so the same PII
    always maps to the same token within that context.
    """
    context_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    mappings: Dict[str, str] = field(default_factory=dict)
    reverse_mappings: Dict[str, str] = field(default_factory=dict)
    counters: Dict[str, int] = field(default_factory=dict)

    def get_or_create_token(self, pii_type: str, original_value: str) -> str:
        """Get existing token or create new one for PII value."""
        if original_value in self.mappings:
            return self.mappings[original_value]

        count = self.counters.get(pii_type, 0) + 1
        self.counters[pii_type] = count
        token = f"[{pii_type}_{count}]"

        self.mappings[original_value] = token
        self.reverse_mappings[token] = original_value
        return token

    def deobfuscate(self, text: str) -> str:
        """Reverse obfuscation using stored mappings."""
        result = text
        for token, original in self.reverse_mappings.items():
            result = result.replace(token, original)
        return result


class PIIObfuscator:
    """
    PII detection and obfuscation for DPA compliance.

    Thread-safe singleton that processes text before LLM transmission.
    """

    _instance: Optional["PIIObfuscator"] = None
    _lock = threading.Lock()

    # PII detection patterns
    PATTERNS = {
        "EMAIL": re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            re.IGNORECASE
        ),
        "IPV4": re.compile(
            r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
            r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        ),
        "IPV6": re.compile(
            r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|'
            r'\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|'
            r'\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b'
        ),
        "PHONE": re.compile(
            r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'
        ),
        "CARD_NUM": re.compile(
            r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|'
            r'3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b'
        ),
        "DEVICE_ID": re.compile(
            r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
            r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b'
        ),
        "TX_ID": re.compile(
            r'\b(?:TX|TXN|TRANS)[_-]?[A-Z0-9]{8,32}\b',
            re.IGNORECASE
        ),
    }

    # Fields that commonly contain PII in structured data
    PII_FIELD_NAMES = {
        "email", "user_email", "customer_email", "payer_email",
        "ip", "ip_address", "user_ip", "client_ip", "source_ip",
        "device_id", "device_fingerprint", "fingerprint_id",
        "phone", "phone_number", "mobile", "telephone",
        "name", "first_name", "last_name", "full_name", "customer_name",
        "card_number", "pan", "account_number",
        "address", "street", "city", "zip", "postal_code",
        "ssn", "social_security", "tax_id",
        "entity_value", "entity_id",
    }

    def __new__(cls) -> "PIIObfuscator":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._stats = {"obfuscated": 0, "calls": 0}
        logger.info("PIIObfuscator initialized for DPA compliance")

    def obfuscate_text(
        self,
        text: str,
        context: Optional[ObfuscationContext] = None
    ) -> Tuple[str, ObfuscationContext]:
        """
        Obfuscate all PII in text.

        Args:
            text: Input text potentially containing PII
            context: Optional existing context for consistent mapping

        Returns:
            Tuple of (obfuscated_text, context)
        """
        if not text:
            return text, context or ObfuscationContext()

        if context is None:
            context = ObfuscationContext()

        result = text
        pii_found = []

        # Apply each pattern
        for pii_type, pattern in self.PATTERNS.items():
            matches = pattern.findall(result)
            for match in matches:
                if match and len(match) > 3:  # Skip very short matches
                    token = context.get_or_create_token(pii_type, match)
                    result = result.replace(match, token)
                    pii_found.append((pii_type, match[:20] + "..." if len(match) > 20 else match))

        if pii_found:
            self._stats["obfuscated"] += len(pii_found)
            logger.debug(
                f"[PII_OBFUSCATOR] Obfuscated {len(pii_found)} PII items in context {context.context_id}"
            )

        self._stats["calls"] += 1
        return result, context

    def obfuscate_dict(
        self,
        data: Dict[str, Any],
        context: Optional[ObfuscationContext] = None
    ) -> Tuple[Dict[str, Any], ObfuscationContext]:
        """
        Recursively obfuscate PII in dictionary structures.

        Args:
            data: Dictionary potentially containing PII
            context: Optional existing context

        Returns:
            Tuple of (obfuscated_dict, context)
        """
        if context is None:
            context = ObfuscationContext()

        return self._obfuscate_value(data, context), context

    def _obfuscate_value(
        self,
        value: Any,
        context: ObfuscationContext
    ) -> Any:
        """Recursively obfuscate a value."""
        if isinstance(value, str):
            obfuscated, _ = self.obfuscate_text(value, context)
            return obfuscated
        elif isinstance(value, dict):
            return {
                k: self._obfuscate_field(k, v, context)
                for k, v in value.items()
            }
        elif isinstance(value, list):
            return [self._obfuscate_value(item, context) for item in value]
        else:
            return value

    def _obfuscate_field(
        self,
        field_name: str,
        value: Any,
        context: ObfuscationContext
    ) -> Any:
        """Obfuscate a specific field, with extra handling for known PII fields."""
        field_lower = field_name.lower()

        # Check if this is a known PII field
        if any(pii_field in field_lower for pii_field in self.PII_FIELD_NAMES):
            if isinstance(value, str) and value:
                # Determine PII type from field name
                pii_type = self._infer_pii_type(field_lower)
                token = context.get_or_create_token(pii_type, value)
                logger.debug(f"[PII_OBFUSCATOR] Field '{field_name}' obfuscated as {pii_type}")
                return token

        # Otherwise, recursively process
        return self._obfuscate_value(value, context)

    def _infer_pii_type(self, field_name: str) -> str:
        """Infer PII type from field name."""
        if "email" in field_name:
            return "EMAIL"
        elif "ip" in field_name:
            return "IP"
        elif "device" in field_name or "fingerprint" in field_name:
            return "DEVICE"
        elif "phone" in field_name or "mobile" in field_name:
            return "PHONE"
        elif "card" in field_name or "pan" in field_name:
            return "CARD"
        elif "name" in field_name:
            return "NAME"
        elif "address" in field_name:
            return "ADDRESS"
        else:
            return "PII"

    def obfuscate_messages(
        self,
        messages: List[Any],
        context: Optional[ObfuscationContext] = None
    ) -> Tuple[List[Any], ObfuscationContext]:
        """
        Obfuscate PII in LangChain message objects.

        Args:
            messages: List of BaseMessage objects
            context: Optional existing context

        Returns:
            Tuple of (obfuscated_messages, context)
        """
        if context is None:
            context = ObfuscationContext()

        obfuscated_messages = []
        for msg in messages:
            if hasattr(msg, "content"):
                obfuscated_content, _ = self.obfuscate_text(str(msg.content), context)
                # Create new message with obfuscated content
                msg_copy = msg.copy()
                msg_copy.content = obfuscated_content
                obfuscated_messages.append(msg_copy)
            else:
                obfuscated_messages.append(msg)

        return obfuscated_messages, context

    def deobfuscate_text(self, text: str, context: ObfuscationContext) -> str:
        """
        Reverse obfuscation using context mappings.

        Note: This should only be used for internal processing,
        never for data that leaves the system.
        """
        return context.deobfuscate(text)

    def get_stats(self) -> Dict[str, int]:
        """Get obfuscation statistics."""
        return self._stats.copy()

    def create_audit_hash(self, original_value: str) -> str:
        """
        Create a one-way hash for audit purposes.

        This allows tracking unique entities without storing PII.
        """
        return hashlib.sha256(original_value.encode()).hexdigest()[:16]


# Global singleton instance
_obfuscator: Optional[PIIObfuscator] = None


def get_pii_obfuscator() -> PIIObfuscator:
    """Get the global PII obfuscator instance."""
    global _obfuscator
    if _obfuscator is None:
        _obfuscator = PIIObfuscator()
    return _obfuscator
