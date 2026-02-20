"""
Device Pairing Manager for QR-based TV authentication.
Manages pairing sessions (MongoDB) and WebSocket connections (in-memory).
"""

import asyncio
import base64
import io
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import WebSocket

from app.core.logging_config import get_logger
from app.models.device_pairing import DevicePairingSession

logger = get_logger(__name__)

try:
    import qrcode

    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False


class PairingManager:
    """
    Manages device pairing sessions for QR-based authentication.

    Session data is stored in MongoDB via DevicePairingSession model.
    WebSocket connections are kept in-memory (not persistent).
    """

    def __init__(self):
        # WebSocket connections (in-memory only, not persisted)
        self._tv_websockets: Dict[str, WebSocket] = {}
        self._companion_websockets: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return secrets.token_urlsafe(16)

    def _generate_session_token(self) -> str:
        """Generate a secure session token for QR code"""
        return secrets.token_urlsafe(32)

    def _build_pairing_url(self, data: dict, base_url: str) -> str:
        """Build the pairing URL that gets encoded into the QR code.

        Uses the bayitplus:// deep link scheme for mobile app compatibility.
        The base_url parameter is ignored in favor of the universal deep link scheme.
        """
        return (
            f"bayitplus://tv-login"
            f"?session={data['session_id']}"
            f"&token={data['token']}"
            f"&expires={data['expires_at']}"
        )

    def _generate_qr_code(self, pairing_url: str) -> str:
        """Generate QR code as base64 PNG from a pairing URL."""
        if not HAS_QRCODE:
            return ""

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(pairing_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#00d9ff", back_color="transparent")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    async def create_session(
        self, base_url: str = "https://bayit.plus"
    ) -> DevicePairingSession:
        """Create a new pairing session in MongoDB"""
        session_id = self._generate_session_id()
        session_token = self._generate_session_token()
        created_at = datetime.utcnow()
        expires_at = created_at + timedelta(minutes=20)

        qr_data = {
            "session_id": session_id,
            "token": session_token,
            "expires_at": expires_at.isoformat(),
        }

        pairing_url = self._build_pairing_url(qr_data, base_url)
        qr_code = self._generate_qr_code(pairing_url)

        # Create and save to MongoDB
        session = DevicePairingSession.create_new(
            session_id=session_id,
            session_token=session_token,
            qr_code_data=qr_code,
            pairing_code=pairing_url,
            ttl_minutes=20,
        )
        await session.insert()

        return session

    async def get_session(self, session_id: str) -> Optional[DevicePairingSession]:
        """Get a pairing session from MongoDB by ID"""
        session = await DevicePairingSession.find_one(
            DevicePairingSession.session_id == session_id
        )

        if session and session.is_expired():
            await self._expire_session(session_id)
            return None

        return session

    async def verify_session_token(
        self, session_id: str, token: str
    ) -> Optional[DevicePairingSession]:
        """Verify a session token from QR scan"""
        session = await self.get_session(session_id)
        if not session:
            return None

        if session.session_token != token:
            return None

        return session

    async def connect_tv(
        self, session_id: str, websocket: WebSocket
    ) -> Optional[DevicePairingSession]:
        """Connect TV WebSocket to session"""
        async with self._lock:
            session = await self.get_session(session_id)
            if not session or session.is_expired():
                return None

            # Close existing TV websocket if any
            if session_id in self._tv_websockets:
                try:
                    await self._tv_websockets[session_id].close()
                except Exception as exc:
                    logger.debug(
                        "Error closing existing TV WebSocket",
                        extra={
                            "session_id_prefix": session_id[:8],
                            "error": str(exc),
                        },
                    )

            self._tv_websockets[session_id] = websocket
            return session

    async def connect_companion(
        self,
        session_id: str,
        device_info: dict,
    ) -> dict:
        """Register companion device connection.

        Returns dict with 'success' and 'ws_notified' flags, or None if session not found.
        """
        session = await self.get_session(session_id)
        if not session or session.is_expired():
            return {"success": False, "ws_notified": False}

        # Update session in MongoDB
        session.companion_device_info = device_info
        session.status = "scanning"
        await session.save()

        # Notify TV via WebSocket
        ws_notified = False
        if session_id in self._tv_websockets:
            try:
                await self._tv_websockets[session_id].send_json(
                    {
                        "type": "companion_connected",
                        "device_info": device_info,
                    }
                )
                ws_notified = True
            except Exception as exc:
                logger.warning(
                    "Failed to notify TV via WebSocket for companion_connected",
                    extra={
                        "session_id_prefix": session_id[:8],
                        "error": str(exc),
                    },
                )
        else:
            logger.info(
                "No TV WebSocket connected for session; TV will rely on polling",
                extra={"session_id_prefix": session_id[:8]},
            )

        return {"success": True, "ws_notified": ws_notified}

    async def start_authentication(self, session_id: str) -> bool:
        """Mark session as authenticating"""
        session = await self.get_session(session_id)
        if not session or session.is_expired():
            return False

        # Update in MongoDB
        session.status = "authenticating"
        await session.save()

        # Notify TV via WebSocket
        if session_id in self._tv_websockets:
            try:
                await self._tv_websockets[session_id].send_json(
                    {
                        "type": "authenticating",
                    }
                )
            except Exception as exc:
                logger.warning(
                    "Failed to notify TV via WebSocket for authenticating",
                    extra={
                        "session_id_prefix": session_id[:8],
                        "error": str(exc),
                    },
                )

        return True

    async def complete_pairing(
        self,
        session_id: str,
        user_id: str,
        access_token: str,
        user_data: dict,
        refresh_token: str | None = None,
    ) -> bool:
        """Complete the pairing process with authentication"""
        session = await self.get_session(session_id)
        if not session or session.is_expired():
            return False

        # Update in MongoDB
        session.status = "success"
        session.authenticated_user_id = user_id
        session.authenticated_token = access_token
        session.authenticated_refresh_token = refresh_token
        await session.save()

        # Notify TV with auth credentials via WebSocket
        if session_id in self._tv_websockets:
            ws_payload = {
                "type": "pairing_success",
                "user": user_data,
                "access_token": access_token,
            }
            if refresh_token:
                ws_payload["refresh_token"] = refresh_token

            try:
                await self._tv_websockets[session_id].send_json(ws_payload)
            except Exception as exc:
                logger.warning(
                    "Failed to notify TV via WebSocket for pairing_success",
                    extra={
                        "session_id_prefix": session_id[:8],
                        "error": str(exc),
                    },
                )

        return True

    async def fail_pairing(self, session_id: str, reason: str) -> bool:
        """Mark pairing as failed"""
        session = await self.get_session(session_id)
        if not session:
            return False

        # Update in MongoDB
        session.status = "failed"
        await session.save()

        # Notify TV via WebSocket
        if session_id in self._tv_websockets:
            try:
                await self._tv_websockets[session_id].send_json(
                    {
                        "type": "pairing_failed",
                        "reason": reason,
                    }
                )
            except Exception as exc:
                logger.warning(
                    "Failed to notify TV via WebSocket for pairing_failed",
                    extra={
                        "session_id_prefix": session_id[:8],
                        "error": str(exc),
                    },
                )

        return True

    async def _expire_session(self, session_id: str) -> None:
        """Handle session expiration.

        Queries MongoDB directly (not via get_session) to avoid infinite
        recursion, since get_session calls _expire_session for expired sessions.
        """
        session = await DevicePairingSession.find_one(
            DevicePairingSession.session_id == session_id
        )
        if not session:
            return

        # Update in MongoDB
        session.status = "expired"
        await session.save()

        # Notify TV via WebSocket
        if session_id in self._tv_websockets:
            try:
                await self._tv_websockets[session_id].send_json(
                    {
                        "type": "session_expired",
                    }
                )
                await self._tv_websockets[session_id].close()
            except Exception as exc:
                logger.debug(
                    "Error notifying TV of session expiry",
                    extra={
                        "session_id_prefix": session_id[:8],
                        "error": str(exc),
                    },
                )

        # Clean up WebSocket connections
        self._tv_websockets.pop(session_id, None)
        self._companion_websockets.pop(session_id, None)

    async def disconnect_tv(self, session_id: str) -> None:
        """Handle TV WebSocket disconnection"""
        async with self._lock:
            self._tv_websockets.pop(session_id, None)
            # Session persists in MongoDB for potential reconnection

    async def remove_session(self, session_id: str) -> None:
        """Remove a session from MongoDB and close WebSockets"""
        async with self._lock:
            # Close WebSocket if exists
            if session_id in self._tv_websockets:
                try:
                    await self._tv_websockets[session_id].close()
                except Exception as exc:
                    logger.debug(
                        "Error closing TV WebSocket during session removal",
                        extra={
                            "session_id_prefix": session_id[:8],
                            "error": str(exc),
                        },
                    )

            # Remove from in-memory WebSocket tracking
            self._tv_websockets.pop(session_id, None)
            self._companion_websockets.pop(session_id, None)

            # Delete from MongoDB
            session = await self.get_session(session_id)
            if session:
                await session.delete()

    async def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions from MongoDB. Returns count of removed sessions."""
        expired_sessions = await DevicePairingSession.find(
            DevicePairingSession.expires_at < datetime.utcnow()
        ).to_list()

        count = 0
        for session in expired_sessions:
            # Notify TV if WebSocket connected
            if session.session_id in self._tv_websockets:
                try:
                    await self._tv_websockets[session.session_id].send_json(
                        {
                            "type": "session_expired",
                        }
                    )
                    await self._tv_websockets[session.session_id].close()
                except Exception as exc:
                    logger.debug(
                        "Error notifying TV during expired session cleanup",
                        extra={
                            "session_id_prefix": session.session_id[:8],
                            "error": str(exc),
                        },
                    )

            # Clean up
            self._tv_websockets.pop(session.session_id, None)
            self._companion_websockets.pop(session.session_id, None)
            await session.delete()
            count += 1

        return count

    async def get_session_status(self, session_id: str) -> Optional[dict]:
        """Get current session status.

        When status is 'success', includes access_token and authenticated_user_id
        so that polling clients can complete authentication without WebSocket.
        """
        session = await self.get_session(session_id)

        if not session:
            return None

        result = {
            "session_id": session.session_id,
            "status": session.status,
            "is_expired": session.is_expired(),
            "expires_at": session.expires_at.isoformat(),
            "has_companion": session.companion_device_info is not None,
            "companion_device": session.companion_device_info,
        }

        # Include credentials when pairing is complete so polling clients
        # can finish authentication even if the WebSocket message was lost
        if session.status == "success" and session.authenticated_token:
            result["access_token"] = session.authenticated_token
            result["authenticated_user_id"] = session.authenticated_user_id
            if session.authenticated_refresh_token:
                result["refresh_token"] = session.authenticated_refresh_token

        return result

    async def get_active_sessions_count(self) -> int:
        """Number of active (non-expired) sessions"""
        count = await DevicePairingSession.find(
            DevicePairingSession.expires_at > datetime.utcnow()
        ).count()

        return count


# Global pairing manager instance
pairing_manager = PairingManager()
