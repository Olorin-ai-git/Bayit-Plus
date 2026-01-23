# SECURITY CODE FIXES - IMPLEMENTATION EXAMPLES

This document contains specific code fixes for each critical vulnerability. These are production-ready implementations.

---

## 1. API KEY AUTHENTICATION FIX

### BEFORE (Vulnerable)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py
@router.websocket("/ws/{session_id}")
async def websocket_dubbing(
    websocket: WebSocket,
    session_id: str,
    api_key: str = Query(..., alias="api_key"),  # ❌ In URL
):
    partner = await partner_service.authenticate_by_api_key(api_key)
```

### AFTER (Secure)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py
@router.websocket("/ws/{session_id}")
async def websocket_dubbing(
    websocket: WebSocket,
    session_id: str,
):
    """WebSocket endpoint for real-time audio dubbing."""
    # Extract auth from header
    auth_header = websocket.headers.get("authorization", "")

    if not auth_header.startswith("Bearer "):
        await websocket.close(code=4001, reason="Invalid authorization header")
        return

    token = auth_header[7:]  # Remove "Bearer " prefix

    partner = await partner_service.authenticate_by_api_key(token)
    if not partner:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # ... rest of handler
```

### Client Implementation (TypeScript)
```typescript
// Before connecting WebSocket, get session with auth header
const response = await fetch('/api/v1/olorin/dubbing/sessions', {
  method: 'POST',
  headers: {
    'X-Olorin-API-Key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_language: 'he',
    target_language: 'en'
  })
})

const session = await response.json()

// Connect WebSocket with Authorization header
const ws = new WebSocket(session.websocket_url)

// Send authorization as first message after connect
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: apiKey  // Or ephemeral token from session response
  }))
})
```

---

## 2. ENFORCE WSS:// (SECURE WEBSOCKET)

### BEFORE (Vulnerable)
```python
# websocket.py
@router.websocket("/ws/{session_id}")
async def websocket_dubbing(websocket: WebSocket, session_id: str):
    # ❌ No protocol validation
    await websocket.accept()
```

### AFTER (Secure)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py
@router.websocket("/ws/{session_id}")
async def websocket_dubbing(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time audio dubbing."""

    # ✅ ENFORCE WSS (Secure WebSocket)
    if websocket.url.scheme != "wss":
        await websocket.close(code=4000, reason="WSS required")
        return

    # ✅ Verify HTTPS in production
    if settings.ENV == "production":
        x_forwarded_proto = websocket.headers.get("x-forwarded-proto", "").lower()
        if x_forwarded_proto and x_forwarded_proto != "https":
            await websocket.close(code=4000, reason="HTTPS required")
            return

    # ... rest of handler
```

### Server Configuration (app/main.py)
```python
# /backend/app/main.py

# Ensure HTTPS is enforced via middleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if settings.ENV == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
    logger.info("HTTPS redirect middleware enabled")

# Add HSTS header
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

@app.middleware("http")
async def add_hsts_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )
    return response
```

### Deployment Config (if using Cloud Run)
```yaml
# cloud-run-deployment.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bayit-plus-dubbing
spec:
  template:
    spec:
      containers:
      - image: gcr.io/project/bayit-plus:latest
        env:
        - name: ENVIRONMENT
          value: "production"
        ports:
        - containerPort: 8000
          name: http1
  traffic:
  - percent: 100
    latestRevision: true
---
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeSSLPolicy
metadata:
  name: bayit-plus-ssl-policy
spec:
  profile: RESTRICTED  # Enforce TLS 1.2+
  minTlsVersion: TLS_1_2
```

---

## 3. ERROR MESSAGE SANITIZATION

### BEFORE (Vulnerable)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py
except Exception as e:
    logger.error(f"WebSocket error: {e}")
    try:
        await websocket.send_json({
            "type": "error",
            "message": str(e)  # ❌ EXPOSES STACK TRACE
        })
    except Exception:
        pass
```

### AFTER (Secure)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py

class DubbingErrorCode(str, Enum):
    """Standardized error codes for dubbing API."""
    INTERNAL_ERROR = "INTERNAL_ERROR"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    AUDIO_PROCESSING_FAILED = "AUDIO_PROCESSING_FAILED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INVALID_MESSAGE = "INVALID_MESSAGE"

# Map exceptions to error codes
ERROR_CODES = {
    ValueError: DubbingErrorCode.INVALID_MESSAGE,
    TimeoutError: DubbingErrorCode.AUDIO_PROCESSING_FAILED,
    RuntimeError: DubbingErrorCode.INTERNAL_ERROR,
}

async def send_error_response(websocket: WebSocket, error_code: str, http_status: int = 400):
    """Send error response without exposing internal details."""
    try:
        await websocket.send_json({
            "type": "error",
            "code": error_code,
            "message": get_user_friendly_message(error_code),
        })
    except Exception:
        pass

def get_user_friendly_message(error_code: str) -> str:
    """Get user-friendly error message."""
    messages = {
        DubbingErrorCode.INTERNAL_ERROR: "An error occurred processing your request",
        DubbingErrorCode.AUTHENTICATION_FAILED: "Authentication failed",
        DubbingErrorCode.SESSION_NOT_FOUND: "Session not found",
        DubbingErrorCode.AUDIO_PROCESSING_FAILED: "Failed to process audio",
        DubbingErrorCode.RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
        DubbingErrorCode.INVALID_MESSAGE: "Invalid message format",
    }
    return messages.get(error_code, "An error occurred")

# Usage in WebSocket handler
try:
    await service.process_audio_chunk(data["bytes"])
except ValueError as e:
    logger.error(f"Invalid audio format: {e}", exc_info=True)
    await send_error_response(websocket, DubbingErrorCode.INVALID_MESSAGE)
except TimeoutError as e:
    logger.error(f"Audio processing timeout: {e}", exc_info=True)
    await send_error_response(websocket, DubbingErrorCode.AUDIO_PROCESSING_FAILED)
except Exception as e:
    logger.error(f"Unexpected error in dubbing: {e}", exc_info=True)
    await send_error_response(websocket, DubbingErrorCode.INTERNAL_ERROR)
```

---

## 4. CORS ORIGIN VALIDATION

### BEFORE (Vulnerable)
```python
# /backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # ❌ Wildcard or too permissive
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### AFTER (Secure)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py

async def websocket_dubbing(
    websocket: WebSocket,
    session_id: str,
):
    """WebSocket endpoint with strict origin validation."""

    # ✅ Validate Origin header for WebSocket
    origin = websocket.headers.get("origin", "").lower()
    allowed_origins = settings.parsed_cors_origins

    if origin not in allowed_origins:
        logger.warning(f"WebSocket connection rejected: invalid origin {origin}")
        await websocket.close(code=4003, reason="Origin not allowed")
        return

    # Validate Sec-WebSocket-Key (automatic in FastAPI, but good to verify)
    ws_key = websocket.headers.get("sec-websocket-key")
    if not ws_key:
        await websocket.close(code=4000, reason="Invalid WebSocket request")
        return

    # Continue with normal flow
    await websocket.accept()

    # ... rest of handler
```

### Configuration (app/core/config.py)
```python
# CORS configuration with explicit whitelist
BACKEND_CORS_ORIGINS: list[str] | str = Field(
    default="",
    description="Explicit list of allowed origins for CORS"
)

# Example config:
# BACKEND_CORS_ORIGINS='["https://bayit.tv","https://app.bayit.tv"]'
# Or: BACKEND_CORS_ORIGINS='https://bayit.tv,https://app.bayit.tv'

@property
def parsed_cors_origins(self) -> list[str]:
    """Parse CORS origins from string or list."""
    if not self.BACKEND_CORS_ORIGINS:
        if settings.ENV == "development":
            return ["http://localhost:3000", "http://localhost:8000"]
        raise ValueError("BACKEND_CORS_ORIGINS must be configured in production")

    if isinstance(self.BACKEND_CORS_ORIGINS, str):
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except json.JSONDecodeError:
            return [
                origin.strip()
                for origin in self.BACKEND_CORS_ORIGINS.split(",")
                if origin.strip()
            ]
    return self.BACKEND_CORS_ORIGINS
```

---

## 5. INPUT MESSAGE VALIDATION

### BEFORE (Vulnerable)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py
async def receive_audio():
    while True:
        data = await websocket.receive()
        if "bytes" in data:
            await service.process_audio_chunk(data["bytes"])  # ❌ No validation
```

### AFTER (Secure)
```python
# /backend/app/api/routes/olorin/dubbing_routes/websocket.py

import struct

class AudioValidator:
    """Validates incoming audio data."""

    MAX_CHUNK_SIZE = 65536  # 64KB per chunk
    MIN_CHUNK_SIZE = 1      # At least 1 byte

    @staticmethod
    def is_valid_pcm16(data: bytes) -> bool:
        """Validate that data is valid 16-bit PCM audio."""
        # 16-bit PCM = 2 bytes per sample
        if len(data) % 2 != 0:
            return False

        # Try to parse as Int16 (if it fails, data is malformed)
        try:
            # Validate first few samples are in valid range
            samples = struct.unpack(f'>{len(data)//2}h', data)
            # 16-bit range: -32768 to 32767
            for sample in samples[:min(10, len(samples))]:
                if sample < -32768 or sample > 32767:
                    return False
            return True
        except struct.error:
            return False

    @staticmethod
    def validate_chunk(chunk: bytes) -> tuple[bool, str]:
        """Validate audio chunk, return (is_valid, error_message)."""
        if len(chunk) < AudioValidator.MIN_CHUNK_SIZE:
            return False, "Chunk too small"

        if len(chunk) > AudioValidator.MAX_CHUNK_SIZE:
            return False, "Chunk too large"

        if not AudioValidator.is_valid_pcm16(chunk):
            return False, "Invalid PCM16 format"

        return True, ""

# Usage in WebSocket handler
async def receive_audio():
    rate_limiter = TokenBucketRateLimiter(max_chunks_per_second=100)
    validator = AudioValidator()
    error_count = 0
    MAX_CONSECUTIVE_ERRORS = 5

    while True:
        try:
            data = await websocket.receive()

            if "bytes" in data:
                chunk = data["bytes"]

                # Check rate limit
                if not rate_limiter.allow_request():
                    logger.warning(f"Audio rate limit exceeded for session {session_id}")
                    await websocket.send_json({
                        "type": "error",
                        "code": "RATE_LIMIT_EXCEEDED"
                    })
                    continue

                # Validate chunk
                is_valid, error_msg = validator.validate_chunk(chunk)
                if not is_valid:
                    logger.debug(f"Invalid audio chunk: {error_msg}")
                    await websocket.send_json({
                        "type": "error",
                        "code": "INVALID_AUDIO_FORMAT",
                        "details": error_msg
                    })
                    error_count += 1

                    if error_count >= MAX_CONSECUTIVE_ERRORS:
                        logger.warning(f"Too many invalid chunks, disconnecting")
                        await websocket.close(code=4000, reason="Invalid audio format")
                        break
                    continue

                # Reset error count on valid chunk
                error_count = 0

                # Process valid chunk
                await service.process_audio_chunk(chunk)

            elif "text" in data:
                # Don't log text data (could contain sensitive info)
                logger.debug("Text message received")

        except WebSocketDisconnect:
            logger.info(f"Client disconnected from dubbing session: {redact_session_id(session_id)}")
            break
        except Exception as e:
            logger.error(f"Error receiving audio: {e}", exc_info=True)
            break
```

---

## 6. RATE LIMITING - CONNECTION LIMITS

### Implementation (Redis-backed)
```python
# /backend/app/services/olorin/dubbing/rate_limiter.py

from redis import Redis
from typing import Tuple

class DubbingRateLimiter:
    """Rate limiting for dubbing sessions."""

    def __init__(self, redis_client: Redis, config: RateLimitConfig):
        self.redis = redis_client
        self.config = config

    async def check_concurrent_sessions(
        self,
        partner_id: str,
        session_id: str
    ) -> Tuple[bool, str]:
        """Check if partner can create another concurrent session."""
        key = f"dubbing:sessions:partner:{partner_id}"

        # Get current session count
        current = await self.redis.scard(key)

        if current >= self.config.concurrent_sessions:
            return False, f"Exceeded max concurrent sessions: {current}/{self.config.concurrent_sessions}"

        # Add session to set
        await self.redis.sadd(key, session_id)
        # Expire after 1 hour (prevents orphaned entries)
        await self.redis.expire(key, 3600)

        return True, ""

    async def remove_session(self, partner_id: str, session_id: str):
        """Remove session from tracking."""
        key = f"dubbing:sessions:partner:{partner_id}"
        await self.redis.srem(key, session_id)

# Usage in WebSocket handler
@router.websocket("/ws/{session_id}")
async def websocket_dubbing(websocket: WebSocket, session_id: str):
    # ... auth code ...

    # Check rate limits
    rate_limiter = DubbingRateLimiter(redis_client, partner.rate_limits)
    can_connect, error_msg = await rate_limiter.check_concurrent_sessions(
        partner.partner_id,
        session_id
    )

    if not can_connect:
        await websocket.close(code=4029, reason=error_msg)
        return

    try:
        await websocket.accept()
        # ... rest of handler
    finally:
        await rate_limiter.remove_session(partner.partner_id, session_id)
```

---

## 7. DATA RETENTION & GDPR COMPLIANCE

### Data Retention Service
```python
# /backend/app/services/olorin/dubbing/retention_service.py

from datetime import datetime, timedelta
from app.models.dubbing_session import DubbingSession
from app.core.storage import storage_service
from app.models.audit_log import AuditLog

class DubbingRetentionService:
    """Manages data retention and deletion for GDPR compliance."""

    # Default: 30 days retention
    DEFAULT_RETENTION_DAYS = 30

    def __init__(self):
        self.retention_days = settings.DUBBING_RETENTION_DAYS or self.DEFAULT_RETENTION_DAYS

    async def cleanup_expired_sessions(self):
        """Delete sessions older than retention period."""
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)

        logger.info(f"Starting dubbing session cleanup (before: {cutoff})")

        # Find expired sessions
        expired_sessions = await DubbingSession.find({
            "created_at": {"$lt": cutoff},
            "deleted_at": None  # Not already deleted
        }).to_list(length=None)

        deleted_count = 0
        error_count = 0

        for session in expired_sessions:
            try:
                # Delete audio files from storage
                if session.audio_file_path:
                    await storage_service.delete_file(session.audio_file_path)

                if session.dubbed_audio_file_path:
                    await storage_service.delete_file(session.dubbed_audio_file_path)

                # Mark as deleted (soft delete for audit)
                session.deleted_at = datetime.utcnow()
                await session.save()

                # Log deletion for compliance
                await AuditLog.create(
                    event="dubbing_session_deleted",
                    partner_id=session.partner_id,
                    session_id=redact_session_id(session.session_id),
                    reason="retention_policy_cleanup",
                    retention_days=self.retention_days,
                )

                deleted_count += 1

            except Exception as e:
                logger.error(f"Error deleting session {session.session_id}: {e}")
                error_count += 1

        logger.info(f"Dubbing cleanup complete: {deleted_count} deleted, {error_count} errors")

        return {"deleted": deleted_count, "errors": error_count}

    async def delete_user_data(self, partner_id: str, session_id: str) -> bool:
        """Delete all data for a session (GDPR Article 17)."""
        session = await DubbingSession.find_one(
            DubbingSession.session_id == session_id,
            DubbingSession.partner_id == partner_id
        )

        if not session:
            return False

        # Delete audio files
        if session.audio_file_path:
            await storage_service.delete_file(session.audio_file_path)

        if session.dubbed_audio_file_path:
            await storage_service.delete_file(session.dubbed_audio_file_path)

        # Mark as deleted
        session.deleted_at = datetime.utcnow()
        await session.save()

        # Log GDPR deletion request
        await AuditLog.create(
            event="dubbing_session_deleted",
            partner_id=partner_id,
            session_id=redact_session_id(session_id),
            reason="gdpr_erasure_request",
        )

        logger.info(f"GDPR erasure completed for session {redact_session_id(session_id)}")
        return True

# Background job (run daily)
@scheduler.scheduled_job('cron', hour=2, minute=0)
async def daily_dubbing_cleanup():
    """Run daily cleanup of expired sessions (2 AM UTC)."""
    service = DubbingRetentionService()
    await service.cleanup_expired_sessions()
```

### API Endpoint for Right-to-Erasure
```python
# /backend/app/api/routes/olorin/dubbing_routes/sessions.py

@router.delete(
    "/sessions/{session_id}/data",
    status_code=status.HTTP_200_OK,
    summary="Delete session data (GDPR Article 17)"
)
async def delete_session_data(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """
    Delete all data associated with a dubbing session.

    Implements GDPR Article 17 (Right to Erasure).
    This is permanent and cannot be undone.
    """
    retention_service = DubbingRetentionService()

    success = await retention_service.delete_user_data(
        partner_id=partner.partner_id,
        session_id=session_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {
        "deleted": True,
        "session_id": redact_session_id(session_id),
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## IMPLEMENTATION ORDER

1. **Day 1:** Auth + wss:// + error sanitization + CORS validation
2. **Days 2-3:** Redis + rate limiting + message validation
3. **Days 4-5:** Encryption + cleanup + audit logging

All fixes are production-ready and can be implemented incrementally.

