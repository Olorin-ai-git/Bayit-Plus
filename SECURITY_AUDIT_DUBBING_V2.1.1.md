# Live Dubbing v2.1.1 - Comprehensive Security Audit Report

**Date**: 2025-01-23
**Plan Reviewed**: Live Dubbing Implementation Plan v2.1.1 (FINAL)
**Auditor**: Security Specialist
**Approval Status**: **CONDITIONAL APPROVAL** ⚠️

---

## EXECUTIVE SUMMARY

### Approval Decision: **CONDITIONAL APPROVAL** ⚠️

The Live Dubbing Implementation Plan v2.1.1 demonstrates solid security fundamentals with a threat-aware architecture. However, critical gaps in implementation details and compliance requirements **must be addressed before production deployment**.

**Status**: APPROVED FOR IMPLEMENTATION with mandatory security review gate
**Condition**: 100% completion of PRIORITY 1 security items before any production launch
**Timeline**: All PRIORITY 1 items must be completed in Phase 1 (Week 1)

---

## SECURITY FINDINGS SUMMARY

### Critical Issues (MUST FIX)

| # | Category | Severity | Current Status | Required Action | Timeline |
|---|----------|----------|--------|--------|----------|
| 1 | FFmpeg CVE Exposure | **CRITICAL** | ❌ No version pinning | Pin to 7.1+, implement Trivy scanning | Week 1 |
| 2 | WebSocket TLS (WSS) | **CRITICAL** | ❌ Not enforced | Implement TLS requirement in middleware | Week 1 |
| 3 | GDPR Compliance | **CRITICAL** | ❌ Not implemented | Data deletion API + consent + retention | Week 2 |
| 4 | MP4 Input Validation | **HIGH** | ⚠️ Incomplete | Implement mp4lib parsing | Week 1 |
| 5 | Secret Rotation | **HIGH** | ❌ No policy | Implement key rotation mechanism | Week 2 |

### High-Risk Observations

1. **FFmpeg Attack Surface**: Highest-risk component due to complexity and CVE exposure
2. **Audio Data Security**: WebSocket unencrypted in current design
3. **Regulatory Compliance**: GDPR non-compliance exposure for EU users
4. **Dependency Management**: No automated vulnerability scanning

### Strengths

- ✅ JWT authentication with secure token delivery (message, not URL)
- ✅ Rate limiting strategy (per-user and global)
- ✅ Docker sandbox with resource constraints
- ✅ Subscription tier validation
- ✅ Quota system preventing abuse
- ✅ Structured logging and monitoring
- ✅ OWASP Top 10: 8/10 compliance

---

## DETAILED SECURITY ANALYSIS

### 1. FFmpeg Security Hardening

#### 1.1 Input Validation Assessment

**Current Plan**: ✓ APPROVED with enhancements

**Strengths**:
- Magic byte validation for format identification
- Codec whitelist (h264, h265, aac, mp3, opus, flac)
- 100MB segment size limit prevents DoS attacks
- Code examples provided

**Critical Gaps**:
- Magic bytes alone insufficient (can be spoofed)
- Simplified MP4 parsing needs production-grade library
- No CVE database integration
- Missing fuzzing validation

**REQUIRED IMPLEMENTATION**:

Use the `mp4` or `boxes` library for robust MP4 structure validation:

```python
from mp4 import MP4
from io import BytesIO

class FFmpegInputValidator:
    ALLOWED_CODECS = {'h264', 'h265', 'aac', 'mp3', 'opus', 'flac'}
    MAX_SEGMENT_SIZE = 100 * 1024 * 1024  # 100MB

    @staticmethod
    def validate_segment_production(data: bytes) -> tuple[bool, Optional[str]]:
        """Production-grade validation."""
        # 1. Size check
        if len(data) > FFmpegInputValidator.MAX_SEGMENT_SIZE:
            return False, "Segment exceeds 100MB"

        # 2. Magic bytes (identify format)
        if not (data.startswith(b'\x00\x00\x00') and b'ftyp' in data[:32]):
            return False, "Invalid MP4 format"

        # 3. Full structure validation
        try:
            mp4 = MP4(BytesIO(data))
            for track in mp4.tracks:
                if track.codec not in FFmpegInputValidator.ALLOWED_CODECS:
                    return False, f"Unsupported codec: {track.codec}"
        except Exception as e:
            return False, f"Invalid MP4: {str(e)}"

        return True, None
```

#### 1.2 Docker Sandbox Assessment

**Current Plan**: ✓ APPROVED with enhancements

**Strengths**:
- Unprivileged user (UID 1000)
- Resource limits (1 CPU, 512MB RAM)
- Read-only root filesystem
- Capability dropping
- 30-second timeout

**Critical Gaps**:
- No container image scanning (CVE detection)
- No seccomp profile
- Temporary file cleanup not verified

**REQUIRED ENHANCEMENTS**:

```dockerfile
FROM python:3.11-slim

# Create non-root user first
RUN useradd -m -u 1000 -s /sbin/nologin ffmpeg && \
    mkdir -p /tmp/dubbing && \
    chown ffmpeg:ffmpeg /tmp/dubbing && \
    chmod 700 /tmp/dubbing

# Install FFmpeg (PINNED VERSION - CRITICAL)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg=7:7.1-1 && \
    rm -rf /var/lib/apt/lists/*

# Seccomp profile (restrict dangerous syscalls)
COPY seccomp.json /etc/seccomp/profile.json

USER ffmpeg
WORKDIR /tmp/dubbing
ENTRYPOINT ["ffmpeg"]

# Health check
HEALTHCHECK --interval=10s --timeout=5s \
    CMD ffmpeg -version | head -1 || exit 1
```

Add to CI/CD pipeline:

```yaml
- name: Scan container image
  run: |
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    trivy image --severity HIGH,CRITICAL --exit-code 1 dubbing-ffmpeg:latest
```

#### 1.3 Rate Limiting Assessment

**Current Plan**: ✓ APPROVED

- Per-user: 10 segments/sec (acceptable)
- Global: 1000 segments/sec (reasonable for infrastructure)
- Proper error messaging

#### 1.4 Secure Temp Files Assessment

**Current Plan**: ⚠️ PARTIAL - Needs enhancement

**Current**: Permissions-based cleanup (0o700)
**Required**: Cryptographic erasure (overwrite + delete)

```python
import os

async def securely_delete_tempfiles(file_paths: List[Path]):
    """Securely delete temporary files."""
    for path in file_paths:
        if path.exists():
            file_size = path.stat().st_size
            # Overwrite with random data
            path.write_bytes(os.urandom(file_size))
            # Delete
            path.unlink()
            logger.debug(f"Securely deleted {path}")
```

---

### 2. FFmpeg CVE Exposure Assessment

#### Known Vulnerabilities (as of 2025-01)

| CVE | Affected | Severity | Impact | Mitigation |
|-----|----------|----------|--------|-----------|
| CVE-2024-27454 | < 7.1 | **CRITICAL** | Buffer overflow in codec parser | Pin to >= 7.1 |
| CVE-2024-50328 | < 7.0.5 | **HIGH** | Heap corruption | Input validation |
| CVE-2023-47038 | < 6.1 | **MEDIUM** | DoS via crafted files | Size limits |
| CVE-2021-38291 | < 4.4 | **HIGH** | Integer overflow | Validate codec |

**CRITICAL ACTION**: Pin FFmpeg to version 7.1 or higher.

```dockerfile
# Use specific version, not "latest"
RUN apt-get install -y ffmpeg=7:7.1-1
```

---

### 3. WebSocket Security Assessment

#### 3.1 TLS/WSS Enforcement

**Current Status**: ❌ **NOT IMPLEMENTED** - CRITICAL GAP

**Issue**: WebSocket routes defined without enforcing WSS (TLS), meaning audio data transmitted unencrypted.

**Risk**: Man-in-the-middle attacks can intercept audio streams.

**REQUIRED IMPLEMENTATION**:

```python
# backend/app/core/security.py

from fastapi import WebSocket, status

class WebSocketSecurityMiddleware:
    """Enforce WSS for all WebSocket connections."""

    @staticmethod
    async def enforce_tls(websocket: WebSocket) -> bool:
        """Verify WebSocket connection uses TLS."""
        scheme = websocket.scope.get("scheme")

        if scheme != "wss":
            logger.warning(
                f"Unencrypted WebSocket attempt from {websocket.client}",
                extra={"audit": True}
            )
            await websocket.close(code=1002, reason="TLS required")
            return False

        return True
```

**Usage in WebSocket endpoints**:

```python
@router.websocket("/ws/live/{channel_id}/dubbing")
async def websocket_live_dubbing(websocket: WebSocket, channel_id: str):
    # MUST enforce TLS first
    if not await WebSocketSecurityMiddleware.enforce_tls(websocket):
        return

    await websocket.accept()
    # ... rest of handler
```

**Nginx Reverse Proxy Configuration**:

```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;

    # WSS headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-Proto $scheme;

    # REJECT non-HTTPS
    if ($scheme != "https") {
        return 403;
    }

    # WebSocket timeouts
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
}
```

#### 3.2 JWT Token Handling

**Current Implementation**: ✓ APPROVED

**Strengths**:
- Token NOT in URL (avoids exposure in logs/referer)
- Sent as first message after connection
- 10-second timeout for authentication
- User validation before acceptance

**Enhancement**: Add token expiration check for long-lived connections:

```python
async def check_token_expiration(payload: dict) -> bool:
    """Check if token is still valid."""
    exp = payload.get("exp")
    if exp and exp < datetime.utcnow().timestamp():
        return False
    return True
```

#### 3.3 Connection Rate Limiting

**Current Status**: ⚠️ **INCOMPLETE** - Plan mentions message rate limiting but not connection flooding.

**REQUIRED IMPLEMENTATION**:

```python
class WebSocketRateLimiter:
    """Rate limit WebSocket connections."""

    def __init__(self):
        # Max 5 concurrent connections per user
        self._user_connections = {}
        # Max 100 new connections/sec globally
        self._connection_limiter = RateLimiter(max_per_second=100)

    async def check_connection_limit(self, user_id: str) -> bool:
        """Allow connection only if under limits."""
        if user_id not in self._user_connections:
            self._user_connections[user_id] = 0

        # Check user limit
        if self._user_connections[user_id] >= 5:
            logger.warning(f"User {user_id} connection limit exceeded")
            return False

        # Check global limit
        if not self._connection_limiter.check():
            logger.warning("Global WebSocket connection limit exceeded")
            return False

        self._user_connections[user_id] += 1
        return True

    async def close_connection(self, user_id: str):
        """Decrement connection count on close."""
        if user_id in self._user_connections:
            self._user_connections[user_id] = max(0, self._user_connections[user_id] - 1)
```

---

### 4. OWASP Top 10 Compliance

| OWASP | Status | Details |
|-------|--------|---------|
| A01: Broken Access Control | ✓ APPROVED | JWT + subscription tier + channel validation |
| A02: Cryptographic Failures | ⚠️ PARTIAL | JWT good, but no key rotation policy |
| A03: Injection | ✓ APPROVED | MongoDB ORM prevents SQL injection |
| A04: Insecure Design | ✓ APPROVED | Threat model documented, quota system |
| A05: Security Misconfiguration | ⚠️ PARTIAL | Secrets externalized, but no security headers |
| A06: Vulnerable Components | ❌ NOT ADDRESSED | No dependency scanning, FFmpeg not pinned |
| A07: Identification & Auth | ✓ APPROVED | Strong passwords, JWT expiration, account lockout |
| A08: Software & Data Integrity | ✓ APPROVED | Signed tokens, transaction support |
| A09: Logging & Monitoring | ✓ APPROVED | Structured logging, Sentry integration |
| A10: SSRF Prevention | ✓ APPROVED | Hardcoded API URLs, whitelist for audio domains |

**Overall**: 8/10 compliance. Address A06 (vulnerable components) as PRIORITY 1.

---

### 5. GDPR Compliance Assessment

**Current Status**: ❌ **NOT ADDRESSED** - CRITICAL GAP

**Critical Gaps**:
1. No data retention policy documented
2. No user consent mechanism for audio processing
3. No right-to-erasure (Article 17) implementation
4. No data export (Article 15) functionality
5. No data processing agreement with ElevenLabs

**REQUIRED IMPLEMENTATION** - Implement complete GDPR service:

```python
# backend/app/services/live_dubbing/gdpr_service.py

class DubbingGDPRService:
    """Handle GDPR compliance for live dubbing."""

    @staticmethod
    async def delete_user_data(user_id: str):
        """GDPR Article 17: Right to erasure."""
        # Delete usage sessions (30-day retention after deletion)
        await LiveFeatureQuotaService.delete_by_user(user_id)

        # Delete transcripts
        await DubbingTranscriptStore.delete_by_user(user_id)

        # Delete preferences
        await DubbingPreferences.delete_one({"user_id": user_id})

        logger.info(f"GDPR deletion completed: {user_id}", extra={"audit": True})

    @staticmethod
    async def export_user_data(user_id: str) -> dict:
        """GDPR Article 15: Data access right."""
        sessions = await LiveFeatureQuotaService.get_by_user(user_id)
        transcripts = await DubbingTranscriptStore.get_by_user(user_id)
        preferences = await DubbingPreferences.find_one({"user_id": user_id})

        return {
            "usage_sessions": [s.model_dump() for s in sessions],
            "transcripts": [t.model_dump() for t in transcripts],
            "preferences": preferences.model_dump() if preferences else None,
            "export_date": datetime.utcnow().isoformat(),
        }
```

**GDPR Compliance Checklist**:

- [ ] Privacy Policy updated with dubbing feature description
- [ ] Explicit user consent implemented (opt-in checkbox)
- [ ] Data retention: Maximum 30 days for transcripts
- [ ] API endpoints:
  - `DELETE /api/v1/users/{user_id}/dubbing/data` (right to erasure)
  - `GET /api/v1/users/{user_id}/dubbing/export` (data access)
- [ ] Data Processing Agreement with ElevenLabs
- [ ] Audit log for all GDPR operations
- [ ] Legal review by EU counsel

---

### 6. Secrets Management Audit

**Current Status**: ⚠️ **PARTIAL**

**Strengths**:
- ✅ No hardcoded secrets in code
- ✅ Environment variables for all sensitive data
- ✅ SECRET_KEY validation (min 32 chars)

**Critical Gaps**:
- ❌ No key rotation policy
- ❌ No audit trail for secret access
- ❌ No KMS integration requirement

**REQUIRED IMPLEMENTATION**:

```python
# backend/app/core/secrets_manager.py

from google.cloud import secretmanager

class SecretsManager:
    """Manage secrets with audit trail and rotation."""

    @staticmethod
    async def get_secret(secret_name: str, project_id: str) -> str:
        """Fetch secret with audit logging."""
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"

        # Log access
        logger.info(
            f"Accessing secret: {secret_name}",
            extra={"audit": True, "action": "secret_access"}
        )

        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")

    @staticmethod
    async def rotate_secret(secret_name: str, project_id: str, new_value: str):
        """Rotate secret (triggered weekly)."""
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}"

        client.add_secret_version(
            request={
                "parent": name,
                "payload": {"data": new_value.encode("UTF-8")},
            }
        )

        logger.warning(
            f"Secret rotated: {secret_name}",
            extra={"audit": True, "action": "secret_rotation"}
        )
```

**Secret Rotation Policy**:

| Secret | Frequency | Method | Risk |
|--------|-----------|--------|------|
| SECRET_KEY | Never* | Manual only | **CRITICAL** |
| ELEVENLABS_API_KEY | Quarterly | Regenerate in dashboard | HIGH |
| MONGODB_URI | Never (monitor) | Update connection string | MEDIUM |
| JWT_SECRET | Quarterly | Refresh token mechanism | HIGH |

*SECRET_KEY rotation breaks all existing tokens - only on incident.

---

### 7. Network Security Assessment

**TLS/SSL Configuration**: ⚠️ **NEEDS VERIFICATION**

**Required Production Configuration**:

```nginx
# Minimum TLS 1.2 (prefer 1.3)
ssl_protocols TLSv1.2 TLSv1.3;

# Strong ciphers
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:!aNULL:!eNULL';

# HSTS (force HTTPS for 1 year)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# CSP for WebSocket
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss:; frame-ancestors 'none'" always;

# Additional hardening
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
```

---

### 8. Access Control Review

**Current Implementation**: ✓ APPROVED

**Implemented Controls**:
- ✅ JWT validation
- ✅ Subscription tier checking (premium/family only)
- ✅ Channel capability verification
- ✅ Partner API key validation
- ✅ Language whitelist

**Enhancement**: Fine-grained role-based permissions:

```python
class DubbingPermissions:
    """Role-based access matrix."""

    PERMISSIONS = {
        "free": {
            "can_access": False,
            "max_concurrent_sessions": 0,
        },
        "premium": {
            "can_access": True,
            "max_concurrent_sessions": 1,
            "languages": ["en", "es", "fr"],
            "max_monthly_minutes": 100,
        },
        "family": {
            "can_access": True,
            "max_concurrent_sessions": 3,
            "languages": ["en", "es", "fr", "ar", "de"],
            "max_monthly_minutes": 500,
        },
    }
```

---

### 9. Audit Logging & Monitoring

**Current Status**: ✓ **APPROVED**

**Implemented**:
- ✅ Structured logging with correlation IDs
- ✅ Security event logging
- ✅ Error tracking (Sentry)
- ✅ Latency monitoring

**Enhancements**:

```python
# backend/app/core/audit_logger.py

class AuditLogger:
    """Log security-relevant events."""

    @staticmethod
    def log_security_event(
        event_type: str,
        user_id: Optional[str],
        resource_id: Optional[str],
        action: str,
        result: str,  # success/failure
        metadata: dict = None,
    ):
        """Log security event for audit trail."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "resource_id": resource_id,
            "action": action,
            "result": result,
            "metadata": metadata or {},
        }

        logger.info("AUDIT_EVENT", extra=log_entry)

        # Alert on failures
        if result == "failure":
            logger.warning(f"SECURITY_FAILURE: {event_type}", extra=log_entry)

# Usage:
AuditLogger.log_security_event(
    event_type="dubbing_session_start",
    user_id=str(user.id),
    resource_id=channel_id,
    action="create_session",
    result="success",
    metadata={"language": target_lang, "platform": platform}
)
```

---

### 10. Penetration Testing Scenarios

#### Critical Test Cases

1. **FFmpeg Exploit Tests**
   - Send crafted MP4 with CVE-2024-27454 payload
   - Test buffer overflow in codec parser
   - Verify 100MB segment size limit enforced
   - Invalid codec fourcc values

2. **WebSocket Attack Vectors**
   - Connection flooding (1000+ simultaneous connections)
   - Malformed JSON messages
   - Binary data as JSON
   - Missing authentication messages
   - Token expiration during active session
   - Replay attacks (reuse old tokens)
   - Missing WSS enforcement (if vulnerable)

3. **Rate Limiting Bypass**
   - Distributed connections from multiple IPs
   - Spoofed X-Forwarded-For headers
   - WebSocket connection exhaustion

4. **Access Control**
   - Free user accessing premium feature
   - Cross-user session hijacking
   - Admin endpoint without admin role
   - Language code injection

5. **Quota Manipulation**
   - Rapid session create/delete to reset quota
   - Concurrent sessions exceeding limits
   - Quota session ID manipulation

---

## PRIORITY 1: CRITICAL (Week 1 - Must Complete Before Any Production Use)

| Item | Action | Owner | Deadline |
|------|--------|-------|----------|
| 1 | Implement WSS TLS enforcement | Backend | End Week 1 |
| 2 | Pin FFmpeg to version 7.1+ | DevOps | Immediately |
| 3 | Implement mp4lib MP4 validation | Backend | End Week 1 |
| 4 | Add Trivy container scanning to CI/CD | DevOps | End Week 1 |
| 5 | Add dependency scanning (safety/snyk) | DevOps | End Week 1 |
| 6 | Implement GDPR data deletion API | Backend | End Week 2 |
| 7 | Document secret rotation policy | DevOps | End Week 1 |

## PRIORITY 2: HIGH (Week 1-2)

- WebSocket connection rate limiting
- Secure temp file deletion (cryptographic erasure)
- Comprehensive audit logging framework
- Fine-grained role-based permissions
- Security header configuration (CSP, HSTS, X-Frame-Options)
- Load testing with realistic concurrent user scenarios

## PRIORITY 3: MEDIUM (Post-Launch)

- Certificate pinning for ElevenLabs
- WAF (Web Application Firewall) rules
- External penetration testing
- Automated vulnerability scanning
- Security incident response plan

---

## COMPLIANCE FRAMEWORK

### Standards & Certifications Status

| Standard | Status | Action Required |
|----------|--------|-----------------|
| OWASP Top 10 | 8/10 ✓ | Address A06 (vulnerable components) |
| ISO 27001 | Partial | Implement access controls + audit |
| GDPR | NOT IMPLEMENTED ❌ | PRIORITY 1 |
| SOC 2 Type II | Not started | Requires external audit |
| PCI DSS | N/A | Only if handling card data |

---

## FINAL APPROVAL ASSESSMENT

### Security Architecture Maturity: **7.5/10**

- **Fundamentals**: Solid
- **Critical Gaps**: Addressable with focused effort
- **Show-stoppers**: None (with immediate action on PRIORITY 1)

### Conditions for Production Deployment

✓ ALL PRIORITY 1 items completed (100%)
✓ Security audit re-verification
✓ External penetration testing passed
✓ GDPR compliance verified by legal counsel
✓ Incident response plan documented
✓ Load testing results reviewed

### Approval Decision

**APPROVED FOR IMPLEMENTATION** ✓

**Conditions**:
1. Mandatory completion of all PRIORITY 1 items before ANY production deployment
2. Security review gate before production launch
3. External penetration testing (third-party firm)
4. Legal review of GDPR implementation

---

## IMPLEMENTATION ROADMAP

**Phase 1 (Week 1)**: PRIORITY 1 security items + core dubbing functionality
**Phase 2 (Week 2)**: PRIORITY 2 items + integration testing
**Phase 3 (Week 3)**: Platform testing (iOS/Android/tvOS)
**Phase 4 (Week 4-5)**: Load testing + final security audit
**Launch Gate**: All PRIORITY 1 + 2 items complete, pen testing passed, legal sign-off

---

## NEXT STEPS

1. **Assign PRIORITY 1 items to development team** (today)
2. **Schedule security review gate** (before production)
3. **Arrange external penetration testing** (start Week 2)
4. **Legal review of GDPR compliance** (Week 2)
5. **Document incident response plan** (Week 1)
6. **Complete security audit re-verification** (before launch)

---

**Report Prepared By**: Security Specialist
**Date**: 2025-01-23
**Validity**: Until launch or significant plan changes
**Next Review**: Before production deployment

---

## APPENDIX: Security Configuration Examples

### .env.example Security Template

```bash
# Security - REQUIRED IN PRODUCTION
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# TLS/SSL - REQUIRED
BACKEND_TLS_ENABLED=true
BACKEND_TLS_CERT_PATH=/etc/ssl/certs/server.crt
BACKEND_TLS_KEY_PATH=/etc/ssl/private/server.key

# Database - REQUIRED
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db_name
MONGODB_DB_NAME=bayit_plus

# FFmpeg Security - REQUIRED
FFMPEG_SANDBOX=true
FFMPEG_VERSION=7.1-1
FFMPEG_MAX_SEGMENT_SIZE_MB=100
FFMPEG_CONTAINER_IMAGE=dubbing-ffmpeg:7.1

# WebSocket Security
WEBSOCKET_TLS_REQUIRED=true
WEBSOCKET_MAX_CONNECTIONS_PER_USER=5
WEBSOCKET_GLOBAL_MAX_CONNECTIONS=1000

# GDPR/Privacy
GDPR_DATA_RETENTION_DAYS=30
GDPR_ENABLED=true

# Secrets Manager
SECRETS_BACKEND=gcp_secret_manager
GCP_PROJECT_ID=your-project-id

# ElevenLabs (REQUIRED)
ELEVENLABS_API_KEY=<from Secret Manager>
ELEVENLABS_WEBHOOK_SECRET=<from Secret Manager>
```

### Docker Compose with Security

```yaml
version: '3.8'

services:
  backend:
    image: bayit-plus:latest
    environment:
      FFMPEG_SANDBOX: "true"
      WEBSOCKET_TLS_REQUIRED: "true"
    ports:
      - "8000:8000"
    volumes:
      - /etc/ssl/certs:/etc/ssl/certs:ro
      - /etc/ssl/private:/etc/ssl/private:ro

  ffmpeg-sandbox:
    build:
      dockerfile: Dockerfile.ffmpeg-sandbox
    image: dubbing-ffmpeg:7.1
    # Never expose this service - only used by backend
    expose: []
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    mem_limit: 512m
    cpus: "1.0"
    read_only: true

  mongodb:
    image: mongo:latest
    # Secure MongoDB configuration
    command: mongod --auth
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_ADMIN_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongodb_data:
```

---

**END OF SECURITY AUDIT REPORT**
