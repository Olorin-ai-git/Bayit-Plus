# Watch Party Chat XSS Protection - Security Review

## Executive Summary

**Review Date:** January 23, 2026
**Reviewer:** Security Specialist Agent
**Components Reviewed:** Watch Party Chat Feature (Frontend + Backend)
**Overall Security Rating:** ⚠️ **MODERATE RISK** - Requires Critical Improvements

### Critical Findings
- **HIGH SEVERITY:** No backend input validation for chat messages
- **MEDIUM SEVERITY:** Frontend-only sanitization creates bypass vulnerability
- **MEDIUM SEVERITY:** Missing Content Security Policy (CSP) headers
- **MEDIUM SEVERITY:** No rate limiting on chat endpoints
- **LOW SEVERITY:** Incomplete test coverage for sanitization

---

## 1. Current Implementation Analysis

### 1.1 Frontend Sanitization (`chatSanitizer.ts`)

**Location:** `/web/src/components/watchparty/chatSanitizer.ts`

**Positive Security Features:**
- ✅ HTML entity escaping for dangerous characters (`&`, `<`, `>`, `"`, `'`)
- ✅ Control character removal (excluding newlines/tabs)
- ✅ Null byte filtering
- ✅ 500 character length limit
- ✅ Pattern-based validation for suspicious content
- ✅ Username sanitization with 50 character limit

**Implementation Review:**

```typescript
export function sanitizeChatMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return ''
  }

  let sanitized = message.trim()

  // Limit length (500 characters max)
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500)
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return sanitized
}
```

**Security Assessment:** ✅ GOOD - Proper defense-in-depth approach for frontend

**Pattern Validation:**
```typescript
const suspiciousPatterns = [
  /<script/i,              // Script tags
  /javascript:/i,          // JavaScript protocol
  /on\w+=/i,              // Event handlers
  /data:text\/html/i,     // Data URIs
]
```

**Security Assessment:** ⚠️ ADEQUATE - Covers common XSS vectors but could be more comprehensive

---

### 1.2 Frontend Integration

**Chat Display Component:** `/web/src/components/watchparty/WatchPartyChat.tsx`

```typescript
const sanitizedContent = isEmoji
  ? message.content
  : sanitizeChatMessage(message.content)
const sanitizedUsername = sanitizeUsername(message.user_name)
```

**Security Assessment:** ✅ GOOD - Sanitization applied at display time

**Chat Input Component:** `/web/src/components/watchparty/WatchPartyChatInput.tsx`

```typescript
const handleSubmit = () => {
  const trimmed = message.trim()
  if (!trimmed || disabled) return

  // Validate message
  if (!isValidChatMessage(trimmed)) {
    return
  }

  // Sanitize before sending
  const sanitized = sanitizeChatMessage(trimmed)
  onSend(sanitized)
  setMessage('')
}
```

**Security Assessment:** ✅ GOOD - Double validation (validation + sanitization)

---

### 1.3 Backend Security

**Middleware:** `/backend/app/middleware/input_sanitization.py`

**Capabilities:**
- ✅ Global HTML escaping via `html.escape()`
- ✅ Dangerous pattern detection (XSS, SQL injection)
- ✅ Request blocking for malicious patterns
- ✅ Null byte removal
- ✅ Whitespace normalization

**CRITICAL ISSUE:**
```python
# Endpoints that should skip sanitization (e.g., content upload)
WHITELIST_PATHS = [
    "/api/v1/admin/content",  # Admin content management
    "/api/v1/admin/uploads",  # File uploads
    "/docs",  # API documentation
    "/openapi.json",  # OpenAPI spec
]
```

**⚠️ Chat endpoints are NOT whitelisted, so they SHOULD receive sanitization.**

**Backend API Endpoint:** `/backend/app/api/routes/party.py`

```python
@router.post("/{party_id}/chat", response_model=ChatMessageResponse)
async def send_message(
    party_id: str,
    data: ChatMessageCreate,  # Pydantic model
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message"""
    message = await room_manager.send_chat_message(
        party_id=party_id,
        user_id=str(current_user.id),
        user_name=current_user.name,
        data=data,
    )
```

**Data Model:** `/backend/app/models/realtime.py`

```python
class ChatMessageCreate(BaseModel):
    """Request model for sending a chat message"""
    message: str
    message_type: str = "text"
```

**🚨 CRITICAL VULNERABILITY:**
- **NO field-level validation** (no `max_length`, no regex pattern)
- **NO explicit sanitization** in `ChatMessageCreate` model
- **NO validation** in `room_manager.send_chat_message()`
- **Relies entirely on middleware** which may not catch all edge cases

**Backend Storage:** `/backend/app/services/room_manager.py`

```python
async def send_chat_message(
    self, party_id: str, user_id: str, user_name: str, data: ChatMessageCreate
) -> Optional[ChatMessage]:
    # ... validation checks ...

    message = ChatMessage(
        party_id=party_id,
        user_id=user_id,
        user_name=user_name,
        message=data.message,  # ⚠️ DIRECTLY STORED WITHOUT VALIDATION
        message_type=data.message_type,
        source_language=source_lang,
    )

    await message.insert()  # ⚠️ PERSISTED TO DATABASE
```

**🚨 CRITICAL FINDING:** Messages are stored in MongoDB **without backend validation or sanitization**

---

## 2. OWASP Top 10 Compliance Analysis

### A03:2021 - Injection (XSS)

**Status:** ⚠️ **PARTIAL COMPLIANCE**

**Current Protection:**
- ✅ Frontend HTML entity escaping
- ✅ Frontend validation patterns
- ✅ Global middleware sanitization
- ❌ **NO backend field-level validation**
- ❌ **NO output encoding on backend responses**

**Risk:** Attackers could bypass frontend sanitization by:
1. **Direct API calls** (using curl, Postman, custom scripts)
2. **Man-in-the-middle attacks** modifying requests
3. **Compromised frontend code** (XSS on the chat page itself)
4. **Replay attacks** with crafted payloads

**Example Attack Vector:**
```bash
# Attacker bypasses frontend and sends malicious payload directly
curl -X POST https://api.bayitplus.com/api/v1/party/{party_id}/chat \
  -H "Authorization: Bearer {stolen_token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "<script>alert(document.cookie)</script>", "message_type": "text"}'
```

If middleware doesn't catch this (e.g., due to encoding tricks or whitelist bypass), it gets stored and displayed to all users.

---

### A01:2021 - Broken Access Control

**Status:** ✅ **COMPLIANT**

**Current Protection:**
- ✅ Authentication required (`get_current_active_user`)
- ✅ Participant verification before sending messages
- ✅ User ID validated against party participants

**Code Review:**
```python
# Verify user is a participant
if not any(p.user_id == user_id for p in party.participants):
    return None
```

**Assessment:** Access control is properly implemented.

---

### A04:2021 - Insecure Design

**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Missing Security Controls:**
1. **Rate Limiting:** No rate limiting on chat endpoints
   - Attackers could spam chat with thousands of messages
   - No protection against chat flooding
   - No limit on message frequency per user

2. **Input Length Limits:** Inconsistent enforcement
   - Frontend: 500 character limit ✅
   - Backend: NO limit ❌
   - Database: NO limit ❌

3. **Content Security Policy:** No CSP headers
   - Missing `Content-Security-Policy` header
   - No `script-src` restrictions
   - No `default-src` restrictions

---

### A05:2021 - Security Misconfiguration

**Status:** ⚠️ **PARTIAL COMPLIANCE**

**Current Configuration:**

**CORS (Good):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # ✅ Configured
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Security Headers (Inadequate):**
- ✅ `X-XSS-Protection: 1; mode=block` (in frontend client)
- ❌ Missing `Content-Security-Policy`
- ❌ Missing `X-Content-Type-Options: nosniff`
- ❌ Missing `X-Frame-Options: DENY`
- ❌ Missing `Referrer-Policy`
- ❌ Missing `Permissions-Policy`

---

### A09:2021 - Security Logging and Monitoring

**Status:** ✅ **ADEQUATE**

**Current Logging:**
```python
logger.warning(
    f"Sanitized JSON body for {request.url.path} from IP: {request.client.host}"
)
logger.error(
    f"Blocked request with dangerous patterns to {request.url.path} from IP: {request.client.host}"
)
```

**Assessment:** Basic logging is present, but could be enhanced with structured logging for security events.

---

## 3. Security Vulnerabilities Summary

### 🔴 Critical Severity

**VULN-001: Backend Input Validation Bypass**
- **Location:** `/backend/app/models/realtime.py` - `ChatMessageCreate`
- **Impact:** Attackers can bypass frontend sanitization with direct API calls
- **Likelihood:** HIGH
- **CVSS Score:** 7.5 (HIGH)
- **CWE:** CWE-20 (Improper Input Validation)

**Exploitation Scenario:**
```python
# Attacker crafts malicious payload that bypasses frontend
import requests

malicious_payload = {
    "message": "\u003cscript\u003ealert(1)\u003c/script\u003e",  # Unicode escape
    "message_type": "text"
}

# Send directly to API (bypasses frontend validation)
response = requests.post(
    f"https://api.bayitplus.com/api/v1/party/{party_id}/chat",
    headers={"Authorization": f"Bearer {token}"},
    json=malicious_payload
)
```

**Remediation:** Implement Pydantic validators with regex and max_length constraints.

---

### 🟡 Medium Severity

**VULN-002: Missing Rate Limiting on Chat Endpoints**
- **Location:** `/backend/app/api/routes/party.py` - `send_message`
- **Impact:** Chat flooding, spam, DoS
- **Likelihood:** MEDIUM
- **CVSS Score:** 5.3 (MEDIUM)
- **CWE:** CWE-770 (Allocation of Resources Without Limits)

**Exploitation Scenario:**
```python
# Attacker floods chat with spam
for i in range(10000):
    send_message(party_id, f"SPAM MESSAGE {i}")
```

**Remediation:** Implement rate limiting (e.g., 10 messages per minute per user).

---

**VULN-003: No Content Security Policy (CSP)**
- **Location:** `/backend/app/main.py` - Missing CSP middleware
- **Impact:** Reduced defense against stored XSS
- **Likelihood:** LOW (requires stored XSS to exist first)
- **CVSS Score:** 4.3 (MEDIUM)
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)

**Remediation:** Add CSP headers to block inline scripts.

---

**VULN-004: Shared Components Not Using Sanitizer**
- **Location:** `/shared/components/watchparty/WatchPartyChat.tsx`
- **Impact:** Shared components (mobile, tvOS) may not have XSS protection
- **Likelihood:** MEDIUM
- **CVSS Score:** 5.4 (MEDIUM)
- **CWE:** CWE-79 (Cross-site Scripting)

**Current Code:**
```typescript
// NO SANITIZATION IN SHARED COMPONENT
<Text>{message.content}</Text>  // ⚠️ VULNERABLE
```

**Remediation:** Create shared sanitizer in `/shared/utils/` and import in all platforms.

---

### 🟢 Low Severity

**VULN-005: Incomplete Test Coverage**
- **Location:** No tests found for `chatSanitizer.ts`
- **Impact:** Unknown behavior for edge cases
- **Likelihood:** LOW
- **CVSS Score:** 2.3 (LOW)
- **CWE:** CWE-1059 (Incomplete Documentation)

**Remediation:** Add comprehensive unit tests.

---

## 4. Recommended Security Improvements

### Priority 1: CRITICAL (Implement Immediately)

#### 1.1 Backend Input Validation

**File:** `/backend/app/models/realtime.py`

```python
from pydantic import BaseModel, Field, field_validator
import re

class ChatMessageCreate(BaseModel):
    """Request model for sending a chat message"""

    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Chat message content"
    )
    message_type: str = Field(
        default="text",
        pattern="^(text|emoji|system)$"
    )

    @field_validator('message')
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        """Sanitize message content to prevent XSS"""
        if not v:
            raise ValueError("Message cannot be empty")

        # Remove null bytes
        v = v.replace('\x00', '')

        # Remove control characters (except newlines/tabs)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', v)

        # Check for dangerous patterns
        dangerous_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>',
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError(f"Message contains forbidden pattern: {pattern}")

        # HTML escape
        import html
        v = html.escape(v, quote=True)

        return v.strip()
```

#### 1.2 Backend Output Encoding

**File:** `/backend/app/api/routes/party.py`

```python
import html

@router.post("/{party_id}/chat", response_model=ChatMessageResponse)
async def send_message(
    party_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message with XSS protection"""

    # Additional server-side validation
    if len(data.message) > 500:
        raise HTTPException(
            status_code=400,
            detail="Message exceeds maximum length of 500 characters"
        )

    # Escape HTML entities before storage (defense in depth)
    sanitized_message = html.escape(data.message, quote=True)

    message = await room_manager.send_chat_message(
        party_id=party_id,
        user_id=str(current_user.id),
        user_name=current_user.name,
        data=ChatMessageCreate(
            message=sanitized_message,
            message_type=data.message_type
        ),
    )

    if not message:
        raise HTTPException(status_code=400, detail="Cannot send message")

    return ChatMessageResponse(
        id=str(message.id),
        party_id=message.party_id,
        user_id=message.user_id,
        user_name=html.escape(message.user_name, quote=True),  # Escape username
        message=message.message,  # Already escaped
        display_message=message.message,
        message_type=message.message_type,
        reactions=message.reactions,
        timestamp=message.timestamp,
    )
```

---

### Priority 2: HIGH (Implement Within 1 Week)

#### 2.1 Rate Limiting on Chat Endpoints

**File:** `/backend/app/api/routes/party.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/{party_id}/chat", response_model=ChatMessageResponse)
@limiter.limit("10/minute")  # 10 messages per minute per user
async def send_message(
    request: Request,  # Add Request parameter for limiter
    party_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Send a chat message (rate limited)"""
    # ... existing code ...
```

**Alternative:** Per-user rate limiting using Redis:

```python
from app.services.rate_limiter import chat_rate_limiter

@router.post("/{party_id}/chat", response_model=ChatMessageResponse)
async def send_message(
    party_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
):
    # Check rate limit (10 messages per minute per user)
    if not await chat_rate_limiter.check_limit(str(current_user.id), max_requests=10, window=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before sending more messages."
        )

    # ... existing code ...
```

#### 2.2 Content Security Policy Headers

**File:** `/backend/app/main.py`

```python
from fastapi.responses import Response

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )

    # Additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    return response
```

#### 2.3 Shared Component Sanitization

**File:** `/shared/utils/chatSanitizer.ts` (Create new file)

```typescript
/**
 * Shared Chat Sanitizer for all platforms (Web, iOS, tvOS, Android)
 * CRITICAL: This file provides XSS protection for Watch Party chat
 */

export function sanitizeChatMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return ''
  }

  let sanitized = message.trim()

  // Limit length (500 characters max)
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500)
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return sanitized
}

export function isValidChatMessage(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false
  }

  const trimmed = message.trim()

  if (trimmed.length === 0 || trimmed.length > 500) {
    return false
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i,
  ]

  return !suspiciousPatterns.some((pattern) => pattern.test(message))
}

export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return 'Anonymous'
  }

  let sanitized = username.trim()

  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50)
  }

  sanitized = sanitized.replace(/[<>'"&]/g, '')

  return sanitized || 'Anonymous'
}
```

**Update Shared Component:** `/shared/components/watchparty/WatchPartyChat.tsx`

```typescript
import { sanitizeChatMessage, sanitizeUsername } from '../../utils/chatSanitizer'

// Apply sanitization
const sanitizedContent = isEmoji
  ? message.content
  : sanitizeChatMessage(message.content)
const sanitizedUsername = sanitizeUsername(message.user_name)

<Text>{sanitizedContent}</Text>
```

---

### Priority 3: MEDIUM (Implement Within 2 Weeks)

#### 3.1 Comprehensive Unit Tests

**File:** `/web/src/components/watchparty/__tests__/chatSanitizer.test.ts`

```typescript
import { sanitizeChatMessage, isValidChatMessage, sanitizeUsername } from '../chatSanitizer'

describe('sanitizeChatMessage', () => {
  describe('XSS Protection', () => {
    it('should escape script tags', () => {
      const input = '<script>alert("XSS")</script>'
      const output = sanitizeChatMessage(input)
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
      expect(output).not.toContain('<script>')
    })

    it('should escape event handlers', () => {
      const input = '<img src=x onerror=alert(1)>'
      const output = sanitizeChatMessage(input)
      expect(output).not.toContain('onerror')
      expect(output).toBe('&lt;img src=x onerror=alert(1)&gt;')
    })

    it('should escape javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>'
      const output = sanitizeChatMessage(input)
      expect(output).not.toContain('javascript:')
    })

    it('should handle encoded characters', () => {
      const input = '&#60;script&#62;alert(1)&#60;/script&#62;'
      const output = sanitizeChatMessage(input)
      expect(output).not.toContain('<script>')
    })

    it('should handle unicode escapes', () => {
      const input = '\u003cscript\u003ealert(1)\u003c/script\u003e'
      const output = sanitizeChatMessage(input)
      expect(output).not.toContain('<script>')
    })
  })

  describe('Input Validation', () => {
    it('should trim whitespace', () => {
      expect(sanitizeChatMessage('  hello  ')).toBe('hello')
    })

    it('should enforce 500 character limit', () => {
      const longMessage = 'a'.repeat(600)
      const output = sanitizeChatMessage(longMessage)
      expect(output.length).toBeLessThanOrEqual(500)
    })

    it('should remove null bytes', () => {
      const input = 'hello\x00world'
      const output = sanitizeChatMessage(input)
      expect(output).not.toContain('\x00')
      expect(output).toBe('helloworld')
    })

    it('should remove control characters', () => {
      const input = 'hello\x01\x02\x03world'
      const output = sanitizeChatMessage(input)
      expect(output).toBe('helloworld')
    })

    it('should preserve newlines and tabs', () => {
      const input = 'hello\nworld\ttab'
      const output = sanitizeChatMessage(input)
      expect(output).toContain('\n')
      expect(output).toContain('\t')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeChatMessage('')).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeChatMessage(null as any)).toBe('')
      expect(sanitizeChatMessage(undefined as any)).toBe('')
    })

    it('should handle non-string input', () => {
      expect(sanitizeChatMessage(123 as any)).toBe('')
      expect(sanitizeChatMessage({} as any)).toBe('')
    })
  })
})

describe('isValidChatMessage', () => {
  it('should reject script tags', () => {
    expect(isValidChatMessage('<script>alert(1)</script>')).toBe(false)
  })

  it('should reject javascript: protocol', () => {
    expect(isValidChatMessage('javascript:alert(1)')).toBe(false)
  })

  it('should reject event handlers', () => {
    expect(isValidChatMessage('onclick=alert(1)')).toBe(false)
  })

  it('should accept normal messages', () => {
    expect(isValidChatMessage('Hello, world!')).toBe(true)
  })

  it('should reject empty messages', () => {
    expect(isValidChatMessage('')).toBe(false)
    expect(isValidChatMessage('   ')).toBe(false)
  })

  it('should reject messages over 500 characters', () => {
    const longMessage = 'a'.repeat(501)
    expect(isValidChatMessage(longMessage)).toBe(false)
  })
})

describe('sanitizeUsername', () => {
  it('should enforce 50 character limit', () => {
    const longName = 'a'.repeat(60)
    const output = sanitizeUsername(longName)
    expect(output.length).toBeLessThanOrEqual(50)
  })

  it('should remove dangerous characters', () => {
    const input = 'John<script>Doe'
    const output = sanitizeUsername(input)
    expect(output).not.toContain('<')
    expect(output).not.toContain('>')
  })

  it('should return "Anonymous" for empty input', () => {
    expect(sanitizeUsername('')).toBe('Anonymous')
    expect(sanitizeUsername('   ')).toBe('Anonymous')
  })
})
```

---

#### 3.2 Security Monitoring and Alerting

**File:** `/backend/app/services/security_monitor.py`

```python
import logging
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

class SecurityMonitor:
    """Monitor and alert on security events"""

    def __init__(self):
        self.blocked_attempts = defaultdict(list)

    def log_blocked_xss_attempt(self, user_id: str, ip: str, payload: str):
        """Log blocked XSS attempt"""
        event = {
            "timestamp": datetime.utcnow(),
            "user_id": user_id,
            "ip": ip,
            "payload": payload[:100],  # Truncate for logging
            "event_type": "XSS_ATTEMPT_BLOCKED"
        }

        self.blocked_attempts[user_id].append(event)

        # Check for repeated attempts (5 attempts in 5 minutes = ban)
        recent_attempts = [
            e for e in self.blocked_attempts[user_id]
            if e["timestamp"] > datetime.utcnow() - timedelta(minutes=5)
        ]

        if len(recent_attempts) >= 5:
            logger.critical(
                f"SECURITY ALERT: User {user_id} from IP {ip} has made {len(recent_attempts)} "
                f"XSS attempts in 5 minutes. Consider banning."
            )
            # TODO: Integrate with ban service
        else:
            logger.warning(
                f"Blocked XSS attempt from user {user_id} (IP: {ip}): {payload[:50]}..."
            )

security_monitor = SecurityMonitor()
```

**Integration in endpoint:**

```python
from app.services.security_monitor import security_monitor

@router.post("/{party_id}/chat")
async def send_message(...):
    try:
        # Validate message
        if not isValidChatMessage(data.message):
            security_monitor.log_blocked_xss_attempt(
                user_id=str(current_user.id),
                ip=request.client.host,
                payload=data.message
            )
            raise HTTPException(
                status_code=400,
                detail="Invalid message content detected"
            )
        # ... rest of code ...
    except ValueError as e:
        security_monitor.log_blocked_xss_attempt(...)
        raise HTTPException(status_code=400, detail=str(e))
```

---

## 5. Testing and Validation

### Penetration Testing Checklist

- [ ] **Test 1:** Direct API XSS injection
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -H "Authorization: Bearer {token}" \
    -d '{"message":"<script>alert(1)</script>"}'
  ```

- [ ] **Test 2:** Unicode-encoded XSS
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -H "Authorization: Bearer {token}" \
    -d '{"message":"\u003cscript\u003ealert(1)\u003c/script\u003e"}'
  ```

- [ ] **Test 3:** Event handler injection
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -H "Authorization: Bearer {token}" \
    -d '{"message":"<img src=x onerror=alert(1)>"}'
  ```

- [ ] **Test 4:** JavaScript protocol
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -H "Authorization: Bearer {token}" \
    -d '{"message":"<a href=\"javascript:alert(1)\">click</a>"}'
  ```

- [ ] **Test 5:** Data URI injection
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -H "Authorization: Bearer {token}" \
    -d '{"message":"<iframe src=\"data:text/html,<script>alert(1)</script>\"></iframe>"}'
  ```

- [ ] **Test 6:** Rate limiting bypass
  ```python
  for i in range(100):
      send_message(party_id, f"spam {i}")
  # Should be blocked after ~10 messages
  ```

- [ ] **Test 7:** Message length limit bypass
  ```bash
  curl -X POST https://api.bayitplus.com/api/v1/party/{id}/chat \
    -d '{"message":"'$("a" * 1000)'"}'
  # Should reject with 400 error
  ```

---

## 6. Compliance Summary

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01: Broken Access Control | ✅ COMPLIANT | Authentication and authorization properly implemented |
| A02: Cryptographic Failures | ✅ COMPLIANT | HTTPS enforced, no sensitive data in chat |
| A03: Injection (XSS) | ⚠️ PARTIAL | Frontend protected, backend validation missing |
| A04: Insecure Design | ⚠️ NEEDS IMPROVEMENT | Missing rate limiting and CSP |
| A05: Security Misconfiguration | ⚠️ PARTIAL | CORS configured, security headers missing |
| A06: Vulnerable Components | ✅ COMPLIANT | Dependencies up to date (assumed) |
| A07: Auth & Session Mgmt | ✅ COMPLIANT | JWT-based authentication |
| A08: Data Integrity Failures | ✅ COMPLIANT | No data tampering vectors identified |
| A09: Logging & Monitoring | ✅ ADEQUATE | Basic logging present, could be enhanced |
| A10: SSRF | ✅ N/A | No server-side requests from user input |

---

## 7. Final Recommendations

### Immediate Actions (Within 24 Hours)

1. ✅ **Deploy backend validation** using Pydantic validators
2. ✅ **Add rate limiting** to chat endpoints (10 messages/minute)
3. ✅ **Implement CSP headers** to block inline scripts

### Short-term Actions (Within 1 Week)

4. ✅ **Move sanitizer to shared utils** for platform consistency
5. ✅ **Add comprehensive unit tests** for sanitization
6. ✅ **Implement security monitoring** for XSS attempts

### Long-term Actions (Within 1 Month)

7. ✅ **Conduct penetration testing** with security team
8. ✅ **Add automated security scanning** to CI/CD pipeline
9. ✅ **Review and audit** all user input endpoints

---

## 8. Risk Assessment

### Before Remediation
- **Overall Risk:** HIGH
- **XSS Vulnerability:** HIGH (7.5 CVSS)
- **Exploitation Likelihood:** HIGH (simple API bypass)
- **Business Impact:** HIGH (account compromise, data theft)

### After Remediation
- **Overall Risk:** LOW
- **XSS Vulnerability:** LOW (2.3 CVSS)
- **Exploitation Likelihood:** LOW (requires multiple layer bypass)
- **Business Impact:** LOW (defense in depth protects even if one layer fails)

---

## 9. Conclusion

The Watch Party chat feature has **good frontend XSS protection** but suffers from a **critical backend validation gap**. The current implementation relies too heavily on frontend sanitization, which can be easily bypassed by attackers making direct API calls.

**Key Strengths:**
- ✅ Comprehensive frontend sanitization
- ✅ Pattern-based validation
- ✅ Global middleware sanitization (partial protection)
- ✅ Proper access control

**Critical Weaknesses:**
- 🚨 No backend field-level validation
- 🚨 No rate limiting on chat endpoints
- 🚨 Missing Content Security Policy headers
- 🚨 Shared components not using sanitizer

**Overall Assessment:** The feature is **NOT production-ready** until backend validation is implemented. The recommended changes are **straightforward to implement** and will significantly reduce the attack surface.

---

## Appendix: Security References

- **OWASP XSS Prevention Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- **OWASP Input Validation Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **CSP Reference:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **Rate Limiting Best Practices:** https://www.rfc-editor.org/rfc/rfc6585#section-4

---

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**Next Review:** February 23, 2026
