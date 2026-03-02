"""
Router registry for Bayit+ Auth Service.

Registers only the authentication routes extracted from the monolith.
Import paths match the monolith's router_registry.py exactly.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.user import User
from app.models.profile import Profile
from app.models.subscription import Subscription
from app.models.verification import VerificationToken
from app.models.passkey_credential import (
    PasskeyCredential,
    PasskeySession,
    PasskeyChallenge,
)
from app.models.device_pairing import DevicePairingSession
from app.models.security_audit import SecurityAuditLog
from app.models.biometric_consent import BiometricConsent

SERVICE_MODELS: List[Type[Document]] = [
    User,
    Profile,
    Subscription,
    VerificationToken,
    PasskeyCredential,
    PasskeySession,
    PasskeyChallenge,
    DevicePairingSession,
    SecurityAuditLog,
    BiometricConsent,
]


def register_routes(app: FastAPI) -> None:
    """Register auth API routers (mirrors monolith Auth Routes section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        auth,
        auth_proxy,
        mobile_auth,
        password_reset,
        verification,
        device_pairing,
        device_pairing_proxy,
        webauthn,
        security_settings,
        mfa,
        account_linking,
    )

    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(auth_proxy.router, prefix=f"{prefix}/auth", tags=["auth-proxy"])
    app.include_router(
        mobile_auth.router,
        prefix=f"{prefix}/auth",
        tags=["auth-mobile"],
    )
    app.include_router(
        password_reset.router,
        prefix=f"{prefix}/auth/password-reset",
        tags=["password-reset"],
    )
    app.include_router(verification.router, prefix=prefix, tags=["verification"])
    app.include_router(
        device_pairing.router,
        prefix=f"{prefix}/auth/device-pairing",
        tags=["device-pairing"],
    )
    app.include_router(
        device_pairing_proxy.router,
        prefix=f"{prefix}/auth/device-pairing",
        tags=["device-pairing-v2"],
    )
    app.include_router(
        webauthn.router, prefix=f"{prefix}/webauthn", tags=["webauthn"]
    )
    app.include_router(
        security_settings.router,
        prefix=f"{prefix}/auth",
        tags=["security-settings"],
    )
    app.include_router(
        mfa.router,
        prefix=f"{prefix}/auth",
        tags=["mfa"],
    )
    app.include_router(
        account_linking.router,
        prefix=f"{prefix}/auth",
        tags=["account-linking"],
    )

    logger.info(
        "Auth routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
