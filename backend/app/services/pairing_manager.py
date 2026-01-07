"""
Device Pairing Manager for QR-based TV authentication.
Manages pairing sessions and WebSocket connections for device pairing.
"""
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from fastapi import WebSocket
import asyncio
import secrets
import json
import base64
import io

try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False


@dataclass
class PairingSession:
    """Represents a device pairing session"""
    session_id: str
    session_token: str
    qr_code_data: str  # Base64 PNG
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = None
    tv_websocket: Optional[WebSocket] = None
    companion_websocket: Optional[WebSocket] = None
    status: str = "waiting"  # waiting, scanning, authenticating, success, failed, expired
    companion_device_info: Optional[dict] = None
    authenticated_user_id: Optional[str] = None
    authenticated_token: Optional[str] = None

    def __post_init__(self):
        if self.expires_at is None:
            self.expires_at = self.created_at + timedelta(minutes=5)

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at


class PairingManager:
    """
    Manages device pairing sessions for QR-based authentication.
    Allows TV apps to generate QR codes that companion devices can scan
    to authenticate the TV session.
    """

    def __init__(self):
        self._sessions: Dict[str, PairingSession] = {}
        self._lock = asyncio.Lock()
        # Start cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return secrets.token_urlsafe(16)

    def _generate_session_token(self) -> str:
        """Generate a secure session token for QR code"""
        return secrets.token_urlsafe(32)

    def _generate_qr_code(self, data: dict, base_url: str) -> str:
        """Generate QR code as base64 PNG"""
        if not HAS_QRCODE:
            # Return placeholder if qrcode not installed
            return ""

        # Create URL for companion to scan
        qr_url = f"{base_url}/tv-login?session={data['session_id']}&token={data['token']}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#00d9ff", back_color="transparent")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    async def create_session(self, base_url: str = "https://bayit.plus") -> PairingSession:
        """Create a new pairing session"""
        async with self._lock:
            session_id = self._generate_session_id()
            session_token = self._generate_session_token()

            qr_data = {
                "session_id": session_id,
                "token": session_token,
            }

            qr_code = self._generate_qr_code(qr_data, base_url)

            session = PairingSession(
                session_id=session_id,
                session_token=session_token,
                qr_code_data=qr_code,
            )

            self._sessions[session_id] = session
            return session

    async def get_session(self, session_id: str) -> Optional[PairingSession]:
        """Get a pairing session by ID"""
        session = self._sessions.get(session_id)
        if session and session.is_expired():
            await self._expire_session(session_id)
            return None
        return session

    async def verify_session_token(
        self, session_id: str, token: str
    ) -> Optional[PairingSession]:
        """Verify a session token from QR scan"""
        session = await self.get_session(session_id)
        if not session:
            return None

        if session.session_token != token:
            return None

        return session

    async def connect_tv(
        self, session_id: str, websocket: WebSocket
    ) -> Optional[PairingSession]:
        """Connect TV WebSocket to session"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or session.is_expired():
                return None

            # Close existing TV websocket if any
            if session.tv_websocket:
                try:
                    await session.tv_websocket.close()
                except Exception:
                    pass

            session.tv_websocket = websocket
            return session

    async def connect_companion(
        self,
        session_id: str,
        device_info: dict,
    ) -> bool:
        """Register companion device connection"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or session.is_expired():
                return False

            session.companion_device_info = device_info
            session.status = "scanning"

            # Notify TV that companion connected
            if session.tv_websocket:
                try:
                    await session.tv_websocket.send_json({
                        "type": "companion_connected",
                        "device_info": device_info,
                    })
                except Exception:
                    pass

            return True

    async def start_authentication(self, session_id: str) -> bool:
        """Mark session as authenticating"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or session.is_expired():
                return False

            session.status = "authenticating"

            # Notify TV
            if session.tv_websocket:
                try:
                    await session.tv_websocket.send_json({
                        "type": "authenticating",
                    })
                except Exception:
                    pass

            return True

    async def complete_pairing(
        self,
        session_id: str,
        user_id: str,
        access_token: str,
        user_data: dict,
    ) -> bool:
        """Complete the pairing process with authentication"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or session.is_expired():
                return False

            session.status = "success"
            session.authenticated_user_id = user_id
            session.authenticated_token = access_token

            # Notify TV with auth credentials
            if session.tv_websocket:
                try:
                    await session.tv_websocket.send_json({
                        "type": "pairing_success",
                        "user": user_data,
                        "token": access_token,
                    })
                except Exception:
                    pass

            return True

    async def fail_pairing(self, session_id: str, reason: str) -> bool:
        """Mark pairing as failed"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return False

            session.status = "failed"

            # Notify TV
            if session.tv_websocket:
                try:
                    await session.tv_websocket.send_json({
                        "type": "pairing_failed",
                        "reason": reason,
                    })
                except Exception:
                    pass

            return True

    async def _expire_session(self, session_id: str) -> None:
        """Handle session expiration"""
        session = self._sessions.get(session_id)
        if not session:
            return

        session.status = "expired"

        # Notify TV
        if session.tv_websocket:
            try:
                await session.tv_websocket.send_json({
                    "type": "session_expired",
                })
                await session.tv_websocket.close()
            except Exception:
                pass

        # Remove session
        del self._sessions[session_id]

    async def disconnect_tv(self, session_id: str) -> None:
        """Handle TV WebSocket disconnection"""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.tv_websocket = None
                # Keep session alive for a short time in case of reconnection
                # After that, cleanup task will remove it

    async def remove_session(self, session_id: str) -> None:
        """Remove a session"""
        async with self._lock:
            if session_id in self._sessions:
                session = self._sessions[session_id]
                if session.tv_websocket:
                    try:
                        await session.tv_websocket.close()
                    except Exception:
                        pass
                del self._sessions[session_id]

    async def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions. Returns count of removed sessions."""
        async with self._lock:
            expired = [
                sid for sid, session in self._sessions.items()
                if session.is_expired()
            ]

            for sid in expired:
                session = self._sessions[sid]
                if session.tv_websocket:
                    try:
                        await session.tv_websocket.send_json({
                            "type": "session_expired",
                        })
                        await session.tv_websocket.close()
                    except Exception:
                        pass
                del self._sessions[sid]

            return len(expired)

    def get_session_status(self, session_id: str) -> Optional[dict]:
        """Get current session status"""
        session = self._sessions.get(session_id)
        if not session:
            return None

        return {
            "session_id": session.session_id,
            "status": session.status,
            "is_expired": session.is_expired(),
            "expires_at": session.expires_at.isoformat(),
            "has_companion": session.companion_device_info is not None,
            "companion_device": session.companion_device_info,
        }

    @property
    def active_sessions(self) -> int:
        """Number of active (non-expired) sessions"""
        return sum(1 for s in self._sessions.values() if not s.is_expired())


# Global pairing manager instance
pairing_manager = PairingManager()
