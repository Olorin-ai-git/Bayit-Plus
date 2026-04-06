"""Shared dependencies + helpers for the partner comprehension router.

Split from partner.py to honour the 200-line file cap (bayit-plus CLAUDE.md).
"""
from typing import Any, Dict

from fastapi import Depends, HTTPException, status

from app.api.routes.olorin.dependencies import get_current_partner
from app.models.comprehension_session import ComprehensionSession
from app.models.integration_partner import IntegrationPartner


def training_config_dict(partner: IntegrationPartner) -> Dict[str, Any]:
    """Return partner.training_config as a plain mutable dict (D-15/D-16)."""
    cfg = partner.training_config
    if cfg is None:
        return {}
    if isinstance(cfg, dict):
        return cfg
    return dict(cfg)  # type: ignore[arg-type]


async def verify_comprehension_capability(
    partner: IntegrationPartner = Depends(get_current_partner),
) -> IntegrationPartner:
    """D-15: capability + organization sub-tier gate."""
    if not partner.has_capability("comprehension_mode"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="comprehension_mode capability not enabled",
        )
    cfg = training_config_dict(partner)
    if cfg.get("org_tier") != "organization":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="comprehension_mode requires organization tier",
        )
    return partner


async def load_session_for_partner(
    session_id: str, partner_id: str,
) -> ComprehensionSession:
    """Load a ComprehensionSession scoped to the calling partner (404 on miss)."""
    session = await ComprehensionSession.get(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )
    if session.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )
    return session
