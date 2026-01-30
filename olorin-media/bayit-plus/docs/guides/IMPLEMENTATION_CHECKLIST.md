# Audible OAuth Security Fixes - Implementation Checklist

This document tracks all files that need to be created, modified, or reviewed to implement the security fixes.

---

## Files to Create (New)

### 1. `backend/app/models/oauth_state.py`
**Purpose**: OAuth state token storage with PKCE support
**Status**: NEW FILE
**Complexity**: LOW
**Time**: 30 minutes

```
Create: backend/app/models/oauth_state.py
Contains:
- OAuthStateSession class
- State token creation and validation
- PKCE code_verifier storage
- Single-use state enforcement
- TTL expiration handling
```

### 2. `backend/app/core/encryption.py`
**Purpose**: Token encryption utilities
**Status**: NEW FILE
**Complexity**: MEDIUM
**Time**: 1 hour

```
Create: backend/app/core/encryption.py
Contains:
- TokenEncryption class
- AES-128 (Fernet) encryption/decryption
- PBKDF2 key derivation
- Global singleton initialization
- Error handling
```

### 3. `backend/tests/security/test_audible_oauth_security.py`
**Purpose**: Security test suite for OAuth flow
**Status**: NEW FILE
**Complexity**: MEDIUM
**Time**: 1.5 hours

```
Create: backend/tests/security/test_audible_oauth_security.py
Contains:
- State parameter validation tests
- PKCE implementation tests
- Token encryption tests
- Error message leakage tests
- Rate limiting tests
- Data isolation tests
```

---

## Files to Modify

### 1. `backend/app/api/routes/audible_integration.py`
**Purpose**: Add CSRF protection, PKCE support, error sanitization
**Status**: MODIFY
**Complexity**: HIGH
**Time**: 2-3 hours

**Changes Required**:

```python
# Line 33 (AFTER imports)
from app.models.oauth_state import oauth_state_session  # NEW
from app.core.rate_limiter import limiter  # NEW

# Line 72 (get_audible_oauth_url)
@router.post("/oauth/authorize")
@limiter.limit("5/minute")  # NEW: Rate limiting
async def get_audible_oauth_url(...):
    # NEW: Create and store state
    state = oauth_state_session.create_state(str(current_user.id), ttl_minutes=10)

    # MODIFIED: Use PKCE version
    oauth_url, code_verifier = await audible_service.get_oauth_url_with_pkce(state)

    # NEW: Store code_verifier with state
    oauth_state_session.store_code_verifier(state, code_verifier)

    return {"auth_url": oauth_url}

# Line 100 (handle_audible_oauth_callback)
@router.post("/oauth/callback")
@limiter.limit("10/minute")  # NEW: Rate limiting
async def handle_audible_oauth_callback(...):
    # NEW: Validate state and get code_verifier
    try:
        code_verifier = oauth_state_session.validate_and_retrieve_verifier(
            callback.state, user_id
        )
    except ValueError as e:
        logger.warning(f"OAuth validation failed: {str(e)}", ...)
        raise HTTPException(status_code=400, detail="Invalid OAuth state or PKCE parameters")

    # MODIFIED: Use PKCE version
    token = await audible_service.exchange_code_for_token_with_pkce(
        callback.code, code_verifier
    )

    # MODIFIED: Sanitize error messages
    except AudibleAPIError as e:
        logger.error("Audible API error during callback", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=503, detail="audible_service_unavailable")
    except Exception as e:
        logger.error("Unexpected error during callback", exc_info=True, ...)
        raise HTTPException(status_code=400, detail="audible_callback_failed")

# Line 227 (sync_audible_library)
@router.post("/library/sync")
@limiter.limit("5/hour")  # NEW: Rate limiting
async def sync_audible_library(...):
    # MODIFIED: Sanitize error messages throughout
    # (Same pattern as callback endpoint)

# Line 304 (get_audible_library)
@router.get("/library", ...)
@limiter.limit("30/minute")  # NEW: Rate limiting
async def get_audible_library(...):
    ...

# Line 362 (search_audible_catalog)
@router.get("/search", ...)
@limiter.limit("30/minute")  # NEW: Rate limiting
async def search_audible_catalog(...):
    ...

# Line 444 (get_audible_play_url)
@router.get("/{asin}/play-url")
async def get_audible_play_url(...):
    # MODIFIED: Sanitize error messages
    except Exception as e:
        logger.error("Failed to generate play URL", exc_info=True, extra={...})
        raise HTTPException(status_code=500, detail="Failed to generate play URL")
```

### 2. `backend/app/services/audible_service.py`
**Purpose**: Add PKCE support, sanitize error messages
**Status**: MODIFY
**Complexity**: HIGH
**Time**: 2-3 hours

**Changes Required**:

```python
# Add imports at top
import hashlib
import base64
from typing import Tuple

# Add new method after get_oauth_url()
async def get_oauth_url_with_pkce(self, state: str) -> Tuple[str, str]:
    """Generate OAuth URL with PKCE support."""
    # Generate PKCE pair
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')

    params = {
        "client_id": self.client_id,
        "response_type": "code",
        "redirect_uri": self.redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "scope": "library profile",
    }

    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    oauth_url = f"{self.auth_url}/authorize?{query_string}"

    logger.info("Generated Audible OAuth URL with PKCE", extra={"state": state, ...})

    return oauth_url, code_verifier

# Add new method after exchange_code_for_token()
async def exchange_code_for_token_with_pkce(self, code: str, code_verifier: str) -> AudibleOAuthToken:
    """Exchange code with PKCE verification."""
    logger.info("Exchanging code with PKCE", extra={"code": code[:10] + "..."})

    try:
        response = await self.http_client.post(
            f"{self.auth_url}/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "code_verifier": code_verifier,  # PKCE verification
            }
        )
        response.raise_for_status()

        data = response.json()

        if "access_token" not in data:
            logger.error("Audible API returned invalid response", extra={...})
            raise AudibleAPIError("Invalid Audible API response")

        return AudibleOAuthToken(...)

    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error", extra={"status_code": ...})
        raise AudibleAPIError("Failed to authenticate with Audible")
    except Exception as e:
        logger.error("Unexpected error", exc_info=True, extra={...})
        raise AudibleAPIError("An unexpected error occurred")

# MODIFY: exchange_code_for_token() - Sanitize errors
async def exchange_code_for_token(self, code: str) -> AudibleOAuthToken:
    """Exchange authorization code for access token."""
    # ... existing implementation ...
    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error", extra={"status_code": ...})
        raise AudibleAPIError("Failed to authenticate with Audible")
    except Exception as e:
        logger.error("Unexpected error", exc_info=True, extra={...})
        raise AudibleAPIError("An unexpected error occurred")

# MODIFY: refresh_access_token() - Sanitize errors
async def refresh_access_token(self, refresh_token: str) -> AudibleOAuthToken:
    # ... existing implementation ...
    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error during refresh", extra={...})
        raise AudibleAPIError("Failed to refresh access token")
    except Exception as e:
        logger.error("Unexpected error during refresh", exc_info=True, extra={...})
        raise AudibleAPIError("Failed to refresh access token")

# MODIFY: get_user_library() - Sanitize errors
async def get_user_library(...) -> List[AudibleAudiobook]:
    # ... existing implementation ...
    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error", extra={"status_code": ...})
        raise AudibleAPIError("Failed to fetch library")
    except Exception as e:
        logger.error("Unexpected error", exc_info=True, extra={...})
        raise AudibleAPIError("Failed to fetch library")

# MODIFY: search_catalog() - Sanitize errors
async def search_catalog(...) -> List[AudibleAudiobook]:
    # ... existing implementation ...
    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error", extra={"status_code": ...})
        raise AudibleAPIError("Search failed")
    except Exception as e:
        logger.error("Unexpected error", exc_info=True, extra={...})
        raise AudibleAPIError("Search failed")

# MODIFY: get_audiobook_details() - Sanitize errors
async def get_audiobook_details(self, asin: str) -> Optional[AudibleAudiobook]:
    # ... existing implementation ...
    except httpx.HTTPStatusError as e:
        logger.error("Audible API HTTP error", extra={"status_code": ...})
        raise AudibleAPIError("Failed to fetch details")
    except Exception as e:
        logger.error("Unexpected error", exc_info=True, extra={...})
        raise AudibleAPIError("Failed to fetch details")
```

### 3. `backend/app/models/user_audible_account.py`
**Purpose**: Add token encryption/decryption properties
**Status**: MODIFY
**Complexity**: HIGH
**Time**: 2 hours

**Changes Required**:

```python
# Add imports
from app.core.encryption import get_token_encryption
from pydantic import field_validator

# MODIFY: Change field names to store encrypted values
class UserAudibleAccount(Document):
    user_id: str
    audible_user_id: str

    # Change from: access_token: str
    # To encrypted storage:
    _access_token_encrypted: str = Field(
        default="",
        alias="access_token",
        description="Encrypted OAuth access token"
    )

    # Change from: refresh_token: str
    # To encrypted storage:
    _refresh_token_encrypted: str = Field(
        default="",
        alias="refresh_token",
        description="Encrypted OAuth refresh token"
    )

    expires_at: datetime
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync_error: Optional[str] = None

    # ADD: Property for access_token (encrypted on read/write)
    @property
    def access_token(self) -> str:
        """Get decrypted access token."""
        if not self._access_token_encrypted:
            return ""
        try:
            encryption = get_token_encryption()
            return encryption.decrypt(self._access_token_encrypted)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to decrypt access token: {type(e).__name__}", ...)
            raise

    @access_token.setter
    def access_token(self, value: str) -> None:
        """Set access token (encrypted on write)."""
        if not value:
            self._access_token_encrypted = ""
            return
        try:
            encryption = get_token_encryption()
            self._access_token_encrypted = encryption.encrypt(value)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to encrypt access token: {type(e).__name__}", ...)
            raise

    # ADD: Property for refresh_token (same as access_token)
    @property
    def refresh_token(self) -> str:
        """Get decrypted refresh token."""
        # Same implementation as access_token getter

    @refresh_token.setter
    def refresh_token(self, value: str) -> None:
        """Set refresh token (encrypted on write)."""
        # Same implementation as access_token setter
```

### 4. `backend/app/core/config.py`
**Purpose**: Add HTTPS validation for redirect URI
**Status**: MODIFY
**Complexity**: LOW
**Time**: 30 minutes

**Changes Required**:

```python
# Add import
from urllib.parse import urlparse
import os

# MODIFY: Add validator for AUDIBLE_REDIRECT_URI
class Settings(BaseSettings):
    # ... existing fields ...

    AUDIBLE_REDIRECT_URI: str = Field(default="")

    @field_validator("AUDIBLE_REDIRECT_URI")
    @classmethod
    def validate_audible_redirect_uri(cls, v: str) -> str:
        """Validate Audible redirect URI uses HTTPS in production."""
        if not v:
            return v  # Empty is OK, feature disabled

        parsed = urlparse(v)

        if parsed.scheme != "https":
            raise ValueError(
                "AUDIBLE_REDIRECT_URI must use HTTPS (not HTTP). "
                "OAuth tokens transmitted in redirect must be encrypted in transit."
            )

        # Prevent localhost in production
        if parsed.hostname in ["localhost", "127.0.0.1"]:
            if not os.getenv("ENVIRONMENT", "").lower() in ("dev", "development", "test"):
                raise ValueError(
                    "AUDIBLE_REDIRECT_URI cannot use localhost in production. "
                    "Use HTTPS domain."
                )

        return v
```

---

## Files to Review (No Changes)

These files should be reviewed to ensure they're compatible with changes:

1. `backend/app/core/database.py` - Verify Beanie can handle encrypted fields
2. `backend/app/core/logging_config.py` - Ensure logging is properly configured
3. `backend/app/core/rate_limiter.py` - Verify limiter is working as expected
4. `backend/app/core/security.py` - Review JWT and auth patterns
5. `backend/pyproject.toml` - Add cryptography dependency if not present

---

## Dependencies to Add

### Python Packages
```toml
# In pyproject.toml - Add if not present
cryptography = "^41.0.0"  # For AES-128 encryption

# Already should exist:
fastapi = "^0.104.0"
pydantic = "^2.5.0"
beanie = "^1.24.0"
httpx = "^0.25.0"
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
```

---

## Implementation Order

### Phase 1: Foundation (4 hours)

1. **Step 1: Create encryption module** (1 hour)
   - Create `backend/app/core/encryption.py`
   - Test encryption/decryption
   - Verify deterministic derivation

2. **Step 2: Create OAuth state module** (1 hour)
   - Create `backend/app/models/oauth_state.py`
   - Test state creation, validation, expiration
   - Test single-use enforcement

3. **Step 3: Update config validation** (30 min)
   - Modify `backend/app/core/config.py`
   - Add HTTPS redirect URI validation
   - Test in dev and prod environments

4. **Step 4: Update user model** (1.5 hours)
   - Modify `backend/app/models/user_audible_account.py`
   - Add encryption properties
   - Test backward compatibility with existing data

### Phase 2: Service Layer (2-3 hours)

5. **Step 5: Add PKCE to service** (2 hours)
   - Modify `backend/app/services/audible_service.py`
   - Add PKCE methods
   - Update error handling
   - Test PKCE flow

6. **Step 6: Sanitize service errors** (30 min)
   - Update all exception handling in service
   - Ensure logs contain full details
   - Verify client messages are generic

### Phase 3: API Routes (2-3 hours)

7. **Step 7: Update routes - State validation** (1.5 hours)
   - Modify `backend/app/api/routes/audible_integration.py`
   - Implement state validation
   - Test state enforcement

8. **Step 8: Update routes - PKCE** (1 hour)
   - Update OAuth methods to use PKCE
   - Verify code_verifier storage and retrieval

9. **Step 9: Add rate limiting** (30 min)
   - Add @limiter.limit() decorators to all OAuth endpoints
   - Configure rate limits for each endpoint

10. **Step 10: Sanitize route errors** (30 min)
    - Update all exception handling in routes
    - Verify error messages are generic

### Phase 4: Testing (2-3 hours)

11. **Step 11: Create security tests** (2 hours)
    - Create `backend/tests/security/test_audible_oauth_security.py`
    - Test all 5 security fixes
    - Aim for 87%+ coverage

12. **Step 12: Integration testing** (1 hour)
    - End-to-end testing of OAuth flow
    - Test encryption/decryption cycle
    - Verify rate limiting works

### Phase 5: Review & Deployment (2 hours)

13. **Step 13: Code review** (1 hour)
    - Security review
    - Performance review
    - Architecture review

14. **Step 14: Deploy to staging** (1 hour)
    - Database migration (if needed)
    - Health checks
    - Smoke tests

---

## Testing Strategy

### Unit Tests
```python
# Token encryption
- test_encrypt_decrypt_roundtrip()
- test_encryption_deterministic()
- test_invalid_ciphertext_rejected()

# State validation
- test_state_created_with_ttl()
- test_state_single_use()
- test_state_expiration()
- test_state_user_binding()

# PKCE
- test_code_challenge_generation()
- test_code_verifier_storage()
- test_invalid_verifier_rejected()

# Error handling
- test_no_exception_details_in_response()
- test_details_in_logs()
```

### Integration Tests
```python
# OAuth flow
- test_full_oauth_with_state_and_pkce()
- test_oauth_fails_with_invalid_state()
- test_oauth_fails_with_invalid_pkce()
- test_token_encrypted_in_db()

# Rate limiting
- test_rate_limit_enforced()
- test_rate_limit_headers()
```

---

## Verification Checklist

### Code Verification
- [ ] All new code follows existing style guide
- [ ] All functions have proper docstrings
- [ ] All error paths are handled
- [ ] No hardcoded values
- [ ] No TODO/FIXME comments

### Security Verification
- [ ] State parameter validated on callback
- [ ] State tokens are single-use
- [ ] PKCE code_verifier stored securely
- [ ] Tokens encrypted in database
- [ ] Error messages don't leak details
- [ ] Rate limiting enforced
- [ ] HTTPS-only redirect URI in prod

### Testing Verification
- [ ] Unit tests passing (87%+ coverage)
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] No console.log or print statements
- [ ] All endpoints tested

### Performance Verification
- [ ] No performance degradation
- [ ] Encryption overhead acceptable (<10ms)
- [ ] Rate limiting not affecting legitimate users
- [ ] Database queries optimized

---

## Rollback Plan

If critical issues are found after deployment:

1. **Immediate Rollback**
   - Revert to previous version
   - Clear OAuth state cache
   - Notify users of service interruption

2. **Data Integrity**
   - Encrypted tokens remain in database
   - No data loss expected
   - Previous code can decrypt tokens

3. **User Communication**
   - Brief service interruption message
   - No user action required
   - Service will be restored shortly

---

## Success Criteria

Implementation is complete when:

1. ✅ All 5 critical fixes implemented
2. ✅ Security tests passing (87%+ coverage)
3. ✅ Integration tests passing
4. ✅ Code reviewed and approved
5. ✅ Security review completed
6. ✅ Performance testing completed
7. ✅ Deployed to staging successfully
8. ✅ Smoke tests passing in staging
9. ✅ Ready for production deployment

---

## Support Resources

### For State Validation & PKCE
- See: `AUDIBLE_OAUTH_FIXES.md` - Fix 1 & 2
- RFC 6234: OAuth 2.0 Authorization Framework
- RFC 7636: Proof Key for Public OAuth 2.0 Clients (PKCE)

### For Token Encryption
- See: `AUDIBLE_OAUTH_FIXES.md` - Fix 3
- Cryptography docs: https://cryptography.io/
- Fernet (symmetric encryption): https://cryptography.io/en/latest/fernet/

### For Error Handling
- See: `AUDIBLE_OAUTH_FIXES.md` - Fix 4
- OWASP: Security Logging and Monitoring Failures

### For Rate Limiting
- See: `AUDIBLE_OAUTH_FIXES.md` - Fix 5
- FastAPI rate limiter documentation

---

## Questions?

Refer to:
1. `AUDIBLE_OAUTH_SECURITY_AUDIT.md` - Detailed security analysis
2. `AUDIBLE_OAUTH_FIXES.md` - Complete code templates
3. `SECURITY_AUDIT_SUMMARY.md` - Executive summary
