"""
Privacy-Safe Display Utilities for Reports

Provides functions to display entity values in reports while maintaining
DPA Section 9.4 compliance (no raw PII in reports).

All entity values are obfuscated using consistent tokens like [EMAIL_1],
with optional deobfuscation for authorized users.
"""

import os
from typing import Optional

from app.service.logging import get_bridge_logger
from app.service.privacy.pii_obfuscator import get_pii_obfuscator

logger = get_bridge_logger(__name__)


def get_display_entity_value(
    entity_value: Optional[str],
    entity_type: Optional[str] = None,
    obfuscation_context_id: Optional[str] = None,
    allow_raw: bool = False,
) -> str:
    """
    Get privacy-safe display value for entity in reports.

    Args:
        entity_value: Raw entity value (email, phone, IP, etc.)
        entity_type: Type of entity (email, phone, ip_address, etc.)
        obfuscation_context_id: Context ID for consistent obfuscation
        allow_raw: Allow raw display (requires REPORT_ALLOW_RAW_PII=true)

    Returns:
        Obfuscated entity value like [EMAIL_1] or [PHONE_2]
        Returns "Unknown" if entity_value is None/empty
    """
    if not entity_value:
        return "Unknown"

    # Check if raw PII is explicitly allowed (DANGEROUS - should be false in production)
    raw_allowed_env = os.getenv("REPORT_ALLOW_RAW_PII", "false").lower() == "true"

    if allow_raw and raw_allowed_env:
        logger.warning(
            f"[DPA_WARNING] Displaying raw PII in report: {entity_value[:10]}... "
            f"(REPORT_ALLOW_RAW_PII=true)"
        )
        return entity_value

    # Obfuscate for DPA compliance
    try:
        obfuscator = get_pii_obfuscator()

        # Use existing context if provided, otherwise create new
        if obfuscation_context_id:
            # Retrieve existing context
            context = obfuscator._contexts.get(obfuscation_context_id)
            if context:
                # Check if already obfuscated
                for token, original in context.token_map.items():
                    if original == entity_value:
                        return token

        # Obfuscate (will create or reuse token)
        obfuscated_value = obfuscator.obfuscate_text(entity_value)

        logger.debug(
            f"[PRIVACY_DISPLAY] Obfuscated entity for report: "
            f"{entity_value[:10]}... → {obfuscated_value}"
        )

        return obfuscated_value

    except Exception as e:
        logger.error(f"[PRIVACY_ERROR] Failed to obfuscate entity value: {e}")
        # Fallback: mask with asterisks
        if len(entity_value) > 4:
            return f"{entity_value[:2]}***{entity_value[-2:]}"
        else:
            return "***"


def get_display_entity_label(
    entity_value: Optional[str],
    entity_type: Optional[str] = None,
    obfuscation_context_id: Optional[str] = None,
) -> str:
    """
    Get privacy-safe label for entity type:value display.

    Args:
        entity_value: Raw entity value
        entity_type: Type of entity
        obfuscation_context_id: Context ID for consistent obfuscation

    Returns:
        Label like "email:[EMAIL_1]" or "phone:[PHONE_2]"
    """
    display_value = get_display_entity_value(
        entity_value=entity_value,
        entity_type=entity_type,
        obfuscation_context_id=obfuscation_context_id,
    )

    if entity_type:
        return f"{entity_type}:{display_value}"
    else:
        return display_value


def get_privacy_notice_html() -> str:
    """
    Get HTML notice explaining PII obfuscation in reports.

    Returns:
        HTML string with privacy notice
    """
    return """
    <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent);
                border-radius: 8px; padding: 15px; margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🔒</span>
            <div>
                <strong style="color: var(--accent);">Privacy Protection Active</strong>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: var(--muted);">
                    Personal data in this report has been obfuscated per DPA Section 9.4.
                    Entity values are shown as tokens like [EMAIL_1], [PHONE_2], etc.
                </p>
            </div>
        </div>
    </div>
    """


def should_obfuscate_reports() -> bool:
    """
    Check if report obfuscation should be enabled.

    Returns:
        True if reports should obfuscate PII (default), False otherwise
    """
    # Default to true for DPA compliance
    return os.getenv("REPORT_OBFUSCATE_PII", "true").lower() == "true"
