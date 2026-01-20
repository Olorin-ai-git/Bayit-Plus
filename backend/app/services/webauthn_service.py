"""
WebAuthn (Passkey) Service.

Handles passkey registration, authentication, and session management
for accessing passkey-protected content.

Uses the py_webauthn library for FIDO2/WebAuthn protocol implementation.
"""

import base64
import logging
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from app.core.config import get_settings
from app.models.passkey_credential import (
    PasskeyChallenge,
    PasskeyCredential,
    PasskeySession,
)
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class WebAuthnService:
    """Service for WebAuthn passkey operations."""

    def __init__(self):
        self.rp_id = settings.WEBAUTHN_RP_ID
        self.rp_name = settings.WEBAUTHN_RP_NAME
        self.origins = settings.webauthn_origins
        self.session_duration_days = settings.PASSKEY_SESSION_DURATION_DAYS
        self.challenge_expiry_seconds = settings.PASSKEY_CHALLENGE_EXPIRY_SECONDS
        self.max_credentials = settings.PASSKEY_MAX_CREDENTIALS_PER_USER

    async def generate_registration_options_for_user(
        self,
        user_id: str,
        user_email: str,
        user_name: str,
    ) -> dict:
        """
        Generate WebAuthn registration options for a user.

        Returns options that should be passed to navigator.credentials.create()
        on the client side.
        """
        # Check if user has reached max credentials
        existing_credentials = await PasskeyCredential.find(
            PasskeyCredential.user_id == user_id,
            PasskeyCredential.is_active == True,
        ).to_list()

        if len(existing_credentials) >= self.max_credentials:
            raise ValueError(
                f"Maximum passkey limit reached ({self.max_credentials}). "
                "Please remove an existing passkey before adding a new one."
            )

        # Prepare exclude credentials list (existing passkeys for this user)
        exclude_credentials = [
            PublicKeyCredentialDescriptor(
                id=base64url_to_bytes(cred.credential_id),
                transports=[AuthenticatorTransport(t) for t in cred.transports if t]
                if cred.transports
                else None,
            )
            for cred in existing_credentials
        ]

        # Generate registration options
        options = generate_registration_options(
            rp_id=self.rp_id,
            rp_name=self.rp_name,
            user_id=user_id.encode(),
            user_name=user_email,
            user_display_name=user_name,
            exclude_credentials=exclude_credentials if exclude_credentials else None,
            authenticator_selection=AuthenticatorSelectionCriteria(
                # Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
                # but allow security keys too
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                # Require user verification (biometric or PIN)
                user_verification=UserVerificationRequirement.REQUIRED,
                # Create a discoverable credential (passkey)
                resident_key=ResidentKeyRequirement.REQUIRED,
            ),
            timeout=self.challenge_expiry_seconds * 1000,  # Convert to milliseconds
        )

        # Store challenge for verification
        challenge_expiry = datetime.utcnow() + timedelta(
            seconds=self.challenge_expiry_seconds
        )
        challenge_doc = PasskeyChallenge(
            challenge=bytes_to_base64url(options.challenge),
            challenge_type="registration",
            user_id=user_id,
            expires_at=challenge_expiry,
        )
        await challenge_doc.insert()

        logger.info(f"Generated registration options for user {user_id}")

        # Convert to JSON-serializable format
        return {
            "options": options_to_json(options),
            "challenge_id": str(challenge_doc.id),
        }

    async def verify_registration(
        self,
        user_id: str,
        credential: dict,
        device_name: Optional[str] = None,
    ) -> PasskeyCredential:
        """
        Verify a WebAuthn registration response and store the credential.

        Args:
            user_id: The user's ID
            credential: The credential response from navigator.credentials.create()
            device_name: Optional friendly name for this passkey

        Returns:
            The created PasskeyCredential document
        """
        # Find the challenge
        challenge_doc = await PasskeyChallenge.find_one(
            PasskeyChallenge.user_id == user_id,
            PasskeyChallenge.challenge_type == "registration",
            PasskeyChallenge.is_used == False,
        )

        if not challenge_doc or not challenge_doc.is_valid():
            raise ValueError(
                "Challenge expired or not found. Please start registration again."
            )

        # Mark challenge as used
        challenge_doc.is_used = True
        challenge_doc.used_at = datetime.utcnow()
        await challenge_doc.save()

        # Verify the registration response
        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=base64url_to_bytes(challenge_doc.challenge),
                expected_rp_id=self.rp_id,
                expected_origin=self.origins,
                require_user_verification=True,
            )
        except Exception as e:
            logger.error(f"Registration verification failed for user {user_id}: {e}")
            raise ValueError(f"Passkey registration failed: {str(e)}")

        # Extract credential data
        credential_id = bytes_to_base64url(verification.credential_id)
        public_key = bytes_to_base64url(verification.credential_public_key)

        # Extract transports if provided
        transports = []
        if hasattr(credential, "response") and hasattr(
            credential["response"], "transports"
        ):
            transports = credential["response"]["transports"]
        elif "transports" in credential.get("response", {}):
            transports = credential["response"]["transports"]

        # Store the credential
        passkey = PasskeyCredential(
            user_id=user_id,
            credential_id=credential_id,
            public_key=public_key,
            sign_count=verification.sign_count,
            device_name=device_name,
            transports=transports,
            aaguid=bytes_to_base64url(verification.aaguid)
            if verification.aaguid
            else None,
            attestation_format=verification.fmt
            if hasattr(verification, "fmt")
            else None,
        )
        await passkey.insert()

        logger.info(
            f"Passkey registered for user {user_id}, credential_id: {credential_id[:20]}..."
        )

        return passkey

    async def generate_authentication_options_for_user(
        self,
        user_id: Optional[str] = None,
        is_qr_flow: bool = False,
    ) -> dict:
        """
        Generate WebAuthn authentication options.

        Args:
            user_id: Optional user ID to limit to that user's credentials
            is_qr_flow: Whether this is for cross-device QR authentication

        Returns:
            Options to pass to navigator.credentials.get()
        """
        allow_credentials = None

        if user_id:
            # Get user's existing credentials
            credentials = await PasskeyCredential.find(
                PasskeyCredential.user_id == user_id,
                PasskeyCredential.is_active == True,
            ).to_list()

            if not credentials:
                raise ValueError("No passkeys registered for this user.")

            allow_credentials = [
                PublicKeyCredentialDescriptor(
                    id=base64url_to_bytes(cred.credential_id),
                    transports=[AuthenticatorTransport(t) for t in cred.transports if t]
                    if cred.transports
                    else None,
                )
                for cred in credentials
            ]

        # Generate authentication options
        options = generate_authentication_options(
            rp_id=self.rp_id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
            timeout=self.challenge_expiry_seconds * 1000,
        )

        # Store challenge
        challenge_expiry = datetime.utcnow() + timedelta(
            seconds=self.challenge_expiry_seconds
        )
        qr_session_id = secrets.token_urlsafe(32) if is_qr_flow else None

        challenge_doc = PasskeyChallenge(
            challenge=bytes_to_base64url(options.challenge),
            challenge_type="authentication",
            user_id=user_id,
            is_qr_flow=is_qr_flow,
            qr_session_id=qr_session_id,
            expires_at=challenge_expiry,
        )
        await challenge_doc.insert()

        logger.info(
            f"Generated authentication options"
            + (f" for user {user_id}" if user_id else "")
            + (" (QR flow)" if is_qr_flow else "")
        )

        response = {
            "options": options_to_json(options),
            "challenge_id": str(challenge_doc.id),
        }

        if is_qr_flow:
            response["qr_session_id"] = qr_session_id

        return response

    async def verify_authentication(
        self,
        credential: dict,
        challenge_id: Optional[str] = None,
        qr_session_id: Optional[str] = None,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[PasskeySession, str]:
        """
        Verify a WebAuthn authentication response and create a session.

        Args:
            credential: The credential response from navigator.credentials.get()
            challenge_id: The challenge ID to verify against
            qr_session_id: For QR flow, the QR session ID
            device_info: Optional device/user agent info
            ip_address: Optional IP address

        Returns:
            Tuple of (PasskeySession, user_id)
        """
        # Find the challenge
        if qr_session_id:
            challenge_doc = await PasskeyChallenge.find_one(
                PasskeyChallenge.qr_session_id == qr_session_id,
                PasskeyChallenge.is_used == False,
            )
        elif challenge_id:
            challenge_doc = await PasskeyChallenge.get(challenge_id)
        else:
            raise ValueError("Either challenge_id or qr_session_id must be provided.")

        if not challenge_doc or not challenge_doc.is_valid():
            raise ValueError("Challenge expired or not found. Please try again.")

        # Find the credential
        credential_id = credential.get("id") or credential.get("rawId")
        passkey = await PasskeyCredential.find_one(
            PasskeyCredential.credential_id == credential_id,
            PasskeyCredential.is_active == True,
        )

        if not passkey:
            raise ValueError("Passkey not found or has been deactivated.")

        # Verify the authentication response
        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=base64url_to_bytes(challenge_doc.challenge),
                expected_rp_id=self.rp_id,
                expected_origin=self.origins,
                credential_public_key=base64url_to_bytes(passkey.public_key),
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=True,
            )
        except Exception as e:
            logger.error(f"Authentication verification failed: {e}")
            raise ValueError(f"Passkey authentication failed: {str(e)}")

        # Update sign count (replay attack prevention)
        passkey.sign_count = verification.new_sign_count
        passkey.last_used_at = datetime.utcnow()
        await passkey.save()

        # Mark challenge as used
        challenge_doc.is_used = True
        challenge_doc.used_at = datetime.utcnow()

        # Create session token
        session_token = secrets.token_urlsafe(64)
        session_expires = datetime.utcnow() + timedelta(days=self.session_duration_days)

        session = PasskeySession(
            user_id=passkey.user_id,
            session_token=session_token,
            credential_id=passkey.credential_id,
            device_info=device_info,
            ip_address=ip_address,
            expires_at=session_expires,
        )
        await session.insert()

        # For QR flow, store the result in the challenge for polling
        if challenge_doc.is_qr_flow:
            challenge_doc.authenticated_by_user_id = passkey.user_id
            challenge_doc.authenticated_session_token = session_token

        await challenge_doc.save()

        logger.info(f"Passkey authentication successful for user {passkey.user_id}")

        return session, passkey.user_id

    async def check_qr_authentication_status(
        self,
        qr_session_id: str,
    ) -> Optional[dict]:
        """
        Check if QR-based authentication has been completed.

        Used by the TV/device polling for cross-device authentication.

        Returns:
            Dict with session_token and user_id if authenticated, None otherwise
        """
        challenge_doc = await PasskeyChallenge.find_one(
            PasskeyChallenge.qr_session_id == qr_session_id,
        )

        if not challenge_doc:
            return None

        if challenge_doc.authenticated_session_token:
            return {
                "session_token": challenge_doc.authenticated_session_token,
                "user_id": challenge_doc.authenticated_by_user_id,
                "status": "authenticated",
            }

        if not challenge_doc.is_valid():
            return {
                "status": "expired",
            }

        return {
            "status": "pending",
        }

    async def validate_session(
        self,
        session_token: str,
    ) -> Optional[PasskeySession]:
        """
        Validate a passkey session token.

        Returns the session if valid, None otherwise.
        """
        session = await PasskeySession.find_one(
            PasskeySession.session_token == session_token,
            PasskeySession.is_revoked == False,
        )

        if not session or not session.is_valid():
            return None

        return session

    async def get_user_credentials(
        self,
        user_id: str,
    ) -> List[dict]:
        """
        Get all active passkeys for a user.

        Returns a list of credential info (without sensitive data).
        """
        credentials = await PasskeyCredential.find(
            PasskeyCredential.user_id == user_id,
            PasskeyCredential.is_active == True,
        ).to_list()

        return [
            {
                "id": str(cred.id),
                "device_name": cred.device_name,
                "created_at": cred.created_at.isoformat(),
                "last_used_at": cred.last_used_at.isoformat()
                if cred.last_used_at
                else None,
            }
            for cred in credentials
        ]

    async def remove_credential(
        self,
        user_id: str,
        credential_db_id: str,
    ) -> bool:
        """
        Remove (deactivate) a passkey.

        Returns True if successful, False if not found or not owned by user.
        """
        credential = await PasskeyCredential.get(credential_db_id)

        if not credential or credential.user_id != user_id:
            return False

        credential.is_active = False
        await credential.save()

        logger.info(f"Passkey {credential_db_id} removed for user {user_id}")
        return True

    async def revoke_session(
        self,
        session_token: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Revoke a passkey session.

        Returns True if successful, False if not found.
        """
        session = await PasskeySession.find_one(
            PasskeySession.session_token == session_token,
        )

        if not session:
            return False

        session.is_revoked = True
        session.revoked_at = datetime.utcnow()
        session.revoked_reason = reason
        await session.save()

        logger.info(f"Session revoked for user {session.user_id}")
        return True

    async def revoke_all_user_sessions(
        self,
        user_id: str,
        reason: Optional[str] = None,
    ) -> int:
        """
        Revoke all active sessions for a user.

        Returns the number of sessions revoked.
        """
        sessions = await PasskeySession.find(
            PasskeySession.user_id == user_id,
            PasskeySession.is_revoked == False,
        ).to_list()

        count = 0
        for session in sessions:
            session.is_revoked = True
            session.revoked_at = datetime.utcnow()
            session.revoked_reason = reason
            await session.save()
            count += 1

        logger.info(f"Revoked {count} sessions for user {user_id}")
        return count

    async def cleanup_expired_challenges(self) -> int:
        """
        Clean up expired challenges.

        Should be run periodically (e.g., hourly) to remove old challenges.
        Returns the number of challenges deleted.
        """
        now = datetime.utcnow()
        result = await PasskeyChallenge.find(
            PasskeyChallenge.expires_at < now,
        ).delete()

        deleted_count = result.deleted_count if result else 0
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired passkey challenges")

        return deleted_count


# Singleton instance
_webauthn_service: Optional[WebAuthnService] = None


def get_webauthn_service() -> WebAuthnService:
    """Get the WebAuthn service singleton."""
    global _webauthn_service
    if _webauthn_service is None:
        _webauthn_service = WebAuthnService()
    return _webauthn_service
