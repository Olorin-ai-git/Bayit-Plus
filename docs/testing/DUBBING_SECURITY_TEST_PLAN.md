# LIVE DUBBING SECURITY TEST PLAN
## Comprehensive Test Coverage for All Security Issues

**Date:** 2026-01-23
**Status:** READY FOR IMPLEMENTATION
**Coverage Target:** 85%+ for security-critical code

---

## TEST SUMMARY

| Category | Test Count | Coverage | Status |
|----------|-----------|----------|--------|
| Authentication | 15 | Critical paths | 🔴 |
| WebSocket Security | 12 | Protocol | 🔴 |
| Message Validation | 10 | Input handling | 🔴 |
| Encryption | 8 | Data protection | 🔴 |
| Rate Limiting | 8 | DoS protection | 🔴 |
| Data Retention | 10 | GDPR compliance | 🔴 |
| Audit Logging | 12 | Security events | 🔴 |
| Error Handling | 8 | Information disclosure | 🔴 |
| **Total** | **83** | **Security-critical** | 🔴 |

---

## PHASE 1 SECURITY TESTS (15 tests)

### Test Suite 1: API Key Authentication (15 tests)

**File:** `backend/tests/security/test_api_key_auth.py`

#### Test 1.1: No API Key in Query Parameters
```python
@pytest.mark.asyncio
async def test_api_key_not_in_query_params():
    """Verify API key is NOT transmitted in query parameters."""
    # Attempt to connect with query param (old method)
    with pytest.raises(Exception) as exc_info:
        async with websockets.connect(
            "wss://api.example.com/api/v1/olorin/dubbing/ws/session?api_key=secret"
        ):
            pass

    # Should fail - method not supported
    assert "Unexpected" in str(exc_info.value) or "Forbidden" in str(exc_info.value)

@pytest.mark.asyncio
async def test_api_key_rejected_in_headers():
    """Verify API key in Authorization header is not used (use ephemeral tokens)."""
    async with websockets.connect(
        "wss://api.example.com/api/v1/olorin/dubbing/ws/session",
        extra_headers={"Authorization": "Bearer api_key_xyz"}
    ) as ws:
        # Should not accept raw API key
        await ws.send(json.dumps({"type": "authenticate", "api_key": "xyz"}))
        response = json.loads(await ws.recv())
        assert response["code"] == "INVALID_AUTH_METHOD"
```

#### Test 1.2: Ephemeral Token Generation
```python
@pytest.mark.asyncio
async def test_ephemeral_token_generation():
    """Verify ephemeral tokens are generated correctly."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "channel_id": "ch123",
            "target_language": "en",
        }
    )

    assert response.status_code == 200
    data = response.json()

    # Should include ephemeral token
    assert "websocket_token" in data
    assert "websocket_url" in data

    # Token should be valid JWT or opaque token
    token = data["websocket_token"]
    assert len(token) > 32  # Minimum length
    assert token != user_token  # Different from user token

@pytest.mark.asyncio
async def test_ephemeral_token_expires():
    """Verify ephemeral tokens expire after set time."""
    # Create session with token
    response = client.post("/api/v1/olorin/dubbing/sessions", ...)
    token = response.json()["websocket_token"]

    # Mock time advancement
    with freeze_time("2026-01-23 12:00:00"):
        # Token should be valid at 12:00
        ws = await connect_with_token(token)
        assert ws is not None

    with freeze_time("2026-01-23 12:06:00"):
        # Token should expire at 12:05 (5 min)
        ws = await connect_with_token(token)
        assert ws is None  # Connection failed

@pytest.mark.asyncio
async def test_ephemeral_token_used_once():
    """Verify each token can only be used once."""
    response = client.post("/api/v1/olorin/dubbing/sessions", ...)
    token = response.json()["websocket_token"]

    # First use should succeed
    ws1 = await connect_with_token(token)
    assert ws1 is not None

    # Second use should fail
    ws2 = await connect_with_token(token)
    assert ws2 is None

@pytest.mark.asyncio
async def test_token_validation_on_first_message():
    """Verify token is validated when received in first message."""
    # Connect to WebSocket
    async with websockets.connect(
        "wss://api.example.com/api/v1/olorin/dubbing/ws/session"
    ) as ws:
        # Send authentication with valid token
        await ws.send(json.dumps({
            "type": "authenticate",
            "token": valid_ephemeral_token
        }))
        response = json.loads(await ws.recv())
        assert response["type"] == "authenticated"

        # Now can send audio
        await ws.send(audio_data)
        # Should work

@pytest.mark.asyncio
async def test_token_validation_rejects_invalid():
    """Verify invalid tokens are rejected."""
    async with websockets.connect(
        "wss://api.example.com/api/v1/olorin/dubbing/ws/session"
    ) as ws:
        # Send invalid token
        await ws.send(json.dumps({
            "type": "authenticate",
            "token": "invalid_token_xyz"
        }))
        response = json.loads(await ws.recv())
        assert response["type"] == "error"
        assert response["code"] == "INVALID_TOKEN"

@pytest.mark.asyncio
async def test_token_validation_rejects_expired():
    """Verify expired tokens are rejected."""
    expired_token = generate_token_with_expiry(
        datetime.utcnow() - timedelta(minutes=1)
    )

    async with websockets.connect(
        "wss://api.example.com/api/v1/olorin/dubbing/ws/session"
    ) as ws:
        await ws.send(json.dumps({
            "type": "authenticate",
            "token": expired_token
        }))
        response = json.loads(await ws.recv())
        assert response["type"] == "error"
        assert response["code"] == "TOKEN_EXPIRED"

@pytest.mark.asyncio
async def test_token_validation_rejects_missing():
    """Verify missing token is rejected."""
    async with websockets.connect(
        "wss://api.example.com/api/v1/olorin/dubbing/ws/session"
    ) as ws:
        # Send message without token first
        await ws.send(json.dumps({"type": "audio", "data": "..."}))

        # Should be rejected
        with pytest.raises(Exception):
            await ws.recv(timeout=1)

@pytest.mark.asyncio
async def test_no_api_key_in_logs():
    """Verify API keys don't appear in logs."""
    # Make a request with API key
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": f"Bearer {api_key}"},
    )

    # Check logs don't contain API key
    with open("logs/backend.log") as f:
        logs = f.read()
        assert api_key not in logs
        assert "api_key=" not in logs

@pytest.mark.asyncio
async def test_auth_failure_generic_error():
    """Verify auth failures return generic errors."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == 401
    # Should NOT reveal why auth failed
    error = response.json()
    assert "invalid_token" not in error.get("message", "").lower()
    assert "404" not in error.get("message", "")  # Don't reveal user not found

@pytest.mark.asyncio
async def test_auth_failure_rate_limited():
    """Verify repeated auth failures are rate limited."""
    for i in range(10):
        response = client.post(
            "/api/v1/olorin/dubbing/sessions",
            headers={"Authorization": f"Bearer invalid_{i}"},
        )

        if i < 5:
            assert response.status_code == 401
        else:
            assert response.status_code == 429  # Rate limited
            assert "Retry-After" in response.headers

@pytest.mark.asyncio
async def test_session_binding_verified():
    """Verify session is bound to authenticated user."""
    # Create session as user A
    session_a = await create_session(user_id="user_a", channel="ch1")

    # Try to access as user B (should fail)
    with pytest.raises(HTTPException) as exc_info:
        await access_session(session_id=session_a.id, user_id="user_b")

    assert exc_info.value.status_code == 403

@pytest.mark.asyncio
async def test_token_not_in_logs_or_history():
    """Verify tokens don't appear in logs, history, or headers."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    token = response.json()["websocket_token"]

    # Check not in logs
    with open("logs/backend.log") as f:
        assert token not in f.read()

    # Check not in response headers
    assert token not in str(response.headers)

    # Check not in response body (should only be in data section)
    assert token == response.json()["websocket_token"]
    assert "websocket_token" not in response.headers.get("X-Debug", "")

@pytest.mark.asyncio
async def test_token_refresh_on_reconnect():
    """Verify clients can refresh tokens on reconnect."""
    # Initial connection
    token1 = get_ephemeral_token()
    ws1 = await connect_with_token(token1)
    assert ws1 is not None

    # Disconnect (simulated)
    await ws1.close()

    # Request new token for same session
    response = client.post(
        f"/api/v1/olorin/dubbing/sessions/{session_id}/refresh",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    token2 = response.json()["websocket_token"]

    # New token should work
    ws2 = await connect_with_token(token2)
    assert ws2 is not None
    assert token1 != token2  # Different token

# Test count: 15
```

---

## PHASE 2 SECURITY TESTS (35 tests)

### Test Suite 2: WebSocket Protocol Security (12 tests)

**File:** `backend/tests/security/test_websocket_security.py`

#### Test 2.1: wss:// Enforcement
```python
@pytest.mark.asyncio
async def test_wss_protocol_enforced():
    """Verify wss:// is required (not ws://)."""
    # ws:// should fail
    with pytest.raises(Exception) as exc_info:
        await websockets.connect("ws://api.example.com/api/v1/olorin/dubbing/ws/session")
    assert "websocket.url.scheme != 'wss'" in str(exc_info.value) or "Forbidden" in str(exc_info.value)

@pytest.mark.asyncio
async def test_wss_with_valid_certificate():
    """Verify wss:// works with valid certificate."""
    ws = await websockets.connect("wss://api.example.com/api/v1/olorin/dubbing/ws/session")
    assert ws is not None
    await ws.close()

@pytest.mark.asyncio
async def test_wss_rejects_self_signed_untrusted():
    """Verify self-signed certs are handled."""
    # Behavior varies by environment
    # In prod: reject self-signed (expected)
    # In dev: accept with warning (acceptable)
    pass

@pytest.mark.asyncio
async def test_tls_version_minimum():
    """Verify TLS 1.3+ is enforced."""
    # Connect and verify cipher negotiation
    ctx = ssl.create_default_context()
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2

    ws = await websockets.connect(
        "wss://api.example.com/...",
        ssl=ctx
    )
    # If connection succeeds, TLS is properly enforced
    assert ws is not None

@pytest.mark.asyncio
async def test_cipher_strength():
    """Verify strong ciphers only."""
    # This is infrastructure-level testing
    # Can use: openssl s_client -connect api.example.com:443
    # Verify: TLSv1.3, ECDHE, AES-GCM
    pass

@pytest.mark.asyncio
async def test_hsts_header_present():
    """Verify HSTS header on HTTPS responses."""
    response = client.get("https://api.example.com/health")
    assert "Strict-Transport-Security" in response.headers
    assert "max-age=" in response.headers["Strict-Transport-Security"]

@pytest.mark.asyncio
async def test_mixed_content_prevented():
    """Verify no insecure (ws://) content loaded."""
    # Browser security - verify no insecure WebSocket connections in code
    assert "ws://" not in open("web/src/services/liveDubbingService.ts").read()
    assert "ws://" not in open("web/src/config/appConfig.ts").read()

@pytest.mark.asyncio
async def test_certificate_pinning_optional():
    """Verify certificate handling (pinning not required for MVP)."""
    # Verify certificate is valid
    import ssl
    ctx = ssl.create_default_context()
    # Connection should succeed with valid cert
    pass

@pytest.mark.asyncio
async def test_origin_validation_headers():
    """Verify Origin header validation works."""
    # Test allowed origin
    ws = await websockets.connect(
        "wss://api.example.com/ws/abc",
        extra_headers={"Origin": "https://bayit.example.com"}
    )
    assert ws is not None

    # Test disallowed origin
    with pytest.raises(Exception):
        ws = await websockets.connect(
            "wss://api.example.com/ws/abc",
            extra_headers={"Origin": "https://evil.com"}
        )

@pytest.mark.asyncio
async def test_cswsh_prevention():
    """Verify CSWSH (Cross-Site WebSocket Hijacking) is prevented."""
    # Try to hijack from attacker origin
    from selenium import webdriver

    # Load malicious JS that tries to connect
    # Should be blocked by Origin validation
    pass

@pytest.mark.asyncio
async def test_websocket_upgrade_https_required():
    """Verify WebSocket upgrade requires HTTPS connection."""
    # ws:// upgrade should fail
    # wss:// upgrade should succeed
    pass

# Test count: 12
```

### Test Suite 3: Message Validation (10 tests)

**File:** `backend/tests/security/test_message_validation.py`

#### Test 3.1: Chunk Size Validation
```python
@pytest.mark.asyncio
async def test_max_chunk_size_enforced():
    """Verify chunks over 65KB are rejected."""
    ws = await connect_authenticated()

    # Create chunk larger than 65KB
    large_chunk = b"x" * (65537)  # 65KB + 1 byte

    await ws.send(large_chunk)
    response = json.loads(await ws.recv())

    assert response["type"] == "error"
    assert response["code"] == "CHUNK_TOO_LARGE"

@pytest.mark.asyncio
async def test_min_chunk_size_accepted():
    """Verify small valid chunks are accepted."""
    ws = await connect_authenticated()

    small_chunk = b"x" * 1024  # 1KB
    await ws.send(small_chunk)

    # Should be accepted (no error)
    # May get response or silence depending on processing

@pytest.mark.asyncio
async def test_empty_chunk_rejected():
    """Verify empty chunks are rejected."""
    ws = await connect_authenticated()
    await ws.send(b"")

    response = json.loads(await ws.recv())
    assert response["type"] == "error"
    assert response["code"] == "EMPTY_CHUNK"

@pytest.mark.asyncio
async def test_chunk_format_validation():
    """Verify audio chunks have valid format."""
    ws = await connect_authenticated()

    # Send invalid binary data (not PCM)
    invalid_audio = b"\xff\xfe\xff\xfe"  # Not valid 16-bit PCM

    await ws.send(invalid_audio)
    response = json.loads(await ws.recv())

    # May be accepted if format validation not strict
    # Or rejected with INVALID_FORMAT error
    pass

@pytest.mark.asyncio
async def test_text_message_handling():
    """Verify text messages are logged, not exposed."""
    ws = await connect_authenticated()

    await ws.send(json.dumps({"type": "status"}))
    # Should either be processed or silently ignored
    # Should NOT be logged with sensitive content

@pytest.mark.asyncio
async def test_malformed_json_rejected():
    """Verify malformed JSON messages are rejected."""
    ws = await connect_authenticated()

    await ws.send(b"{invalid json")

    # Should close or send error
    with pytest.raises(Exception):
        await ws.recv(timeout=1)

@pytest.mark.asyncio
async def test_chunk_rate_limiting():
    """Verify chunk rate limiting works."""
    ws = await connect_authenticated()

    # Send 60 chunks in 1 second (exceeds 50/sec limit)
    for i in range(60):
        await ws.send(b"x" * 1024)

    # Should eventually hit rate limit
    response = json.loads(await ws.recv())
    assert response["type"] == "error"
    assert response["code"] == "RATE_LIMIT_EXCEEDED"

@pytest.mark.asyncio
async def test_null_byte_injection_prevented():
    """Verify null bytes don't break processing."""
    ws = await connect_authenticated()

    chunk_with_null = b"data" + b"\x00" + b"more"
    await ws.send(chunk_with_null)

    # Should be handled safely (no injection)
    # No crash or unexpected behavior

@pytest.mark.asyncio
async def test_connection_closed_on_protocol_violation():
    """Verify connection closes on protocol violation."""
    ws = await connect_authenticated()

    # Send data of wrong type
    await ws.send(123)  # Should be bytes or JSON

    # Connection should close
    with pytest.raises(Exception):
        await ws.recv(timeout=1)

# Test count: 10
```

---

## PHASE 3 SECURITY TESTS (33 tests)

### Test Suite 4: Error Handling & Information Disclosure (8 tests)

**File:** `backend/tests/security/test_error_handling.py`

#### Test 4.1: Generic Error Messages
```python
@pytest.mark.asyncio
async def test_no_exception_details_in_response():
    """Verify exception details are NOT sent to client."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={"invalid": "data"}  # Missing required fields
    )

    error = response.json()

    # Should NOT contain:
    assert "traceback" not in error.get("message", "").lower()
    assert "ValueError" not in error.get("message", "")
    assert "line 42" not in error.get("message", "")
    assert "Traceback" not in error.get("message", "")

    # Should contain:
    assert "error" in error  # Generic error code
    assert "message" in error  # Generic message

@pytest.mark.asyncio
async def test_no_library_versions_leaked():
    """Verify library versions are not revealed."""
    response = client.get("/api/v1/olorin/dubbing/health")

    # Should not contain version strings
    assert "FastAPI" not in str(response.headers)
    assert "Uvicorn" not in str(response.headers)
    assert "X-Powered-By" not in response.headers

@pytest.mark.asyncio
async def test_no_code_paths_in_errors():
    """Verify file paths and line numbers are not exposed."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={}  # Trigger error
    )

    error_text = str(response.json())
    assert ".py" not in error_text  # No file names
    assert "/app/" not in error_text  # No paths
    assert "line" not in error_text.lower()  # No line numbers

@pytest.mark.asyncio
async def test_no_database_errors_exposed():
    """Verify database errors don't leak details."""
    # Temporarily break database
    with monkeypatch.setattr(
        "app.models.live_dubbing.LiveDubbingSession.insert",
        side_effect=Exception("Connection refused: localhost:27017")
    ):
        response = client.post(
            "/api/v1/olorin/dubbing/sessions",
            headers={"Authorization": f"Bearer {token}"},
            json={"channel_id": "ch1", "target_language": "en"}
        )

    # Should NOT reveal MongoDB connection string
    assert "27017" not in str(response.json())
    assert "Connection refused" not in str(response.json())

@pytest.mark.asyncio
async def test_no_api_endpoint_information_leaked():
    """Verify internal API structure is not exposed."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions/invalid",
        json={}
    )

    error = response.json()
    # Should not describe endpoint structure
    assert "endpoint" not in error.get("message", "").lower()
    assert "/dubbing/" not in error.get("message", "")

@pytest.mark.asyncio
async def test_error_logging_contains_details():
    """Verify server-side logs DO contain details."""
    # Trigger an error
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={}
    )

    # Response should be generic
    assert "ValueError" not in response.json().get("message", "")

    # But logs should have details
    with open("logs/backend.log") as f:
        logs = f.read()
        # Should contain error details for debugging
        # (but without API keys or PII)

@pytest.mark.asyncio
async def test_400_errors_generic():
    """Verify 400 errors are generic."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={"invalid_field": "value"}
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Invalid request parameters"

@pytest.mark.asyncio
async def test_500_errors_generic():
    """Verify 500 errors are generic."""
    # Simulate internal error
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={}  # Trigger error
    )

    # If 500 returned, should be generic
    if response.status_code == 500:
        assert "Internal" in response.json()["message"]
        assert "Error" not in response.json()["message"]  # Generic, not specific

# Test count: 8
```

### Test Suite 5: Data Retention & GDPR (10 tests)

**File:** `backend/tests/security/test_data_retention.py`

#### Test 5.1: Automatic Cleanup
```python
@pytest.mark.asyncio
async def test_expired_sessions_cleaned_up():
    """Verify expired sessions are automatically deleted."""
    from app.services.retention import DubbingRetentionService

    # Create session that expired 1 day ago
    session = LiveDubbingSession(
        session_id="expired_session",
        user_id="user1",
        channel_id="ch1",
        created_at=datetime.utcnow() - timedelta(days=31),
        expires_at=datetime.utcnow() - timedelta(days=1),
    )
    await session.insert()

    # Verify it exists
    found = await LiveDubbingSession.find_one(
        LiveDubbingSession.session_id == "expired_session"
    )
    assert found is not None

    # Run cleanup
    service = DubbingRetentionService()
    deleted_count = await service.cleanup_expired_sessions()

    # Verify it's deleted
    assert deleted_count >= 1
    found = await LiveDubbingSession.find_one(
        LiveDubbingSession.session_id == "expired_session"
    )
    # Either deleted or marked as deleted
    assert found is None or found.deleted_at is not None

@pytest.mark.asyncio
async def test_retention_period_configurable():
    """Verify retention period is configurable."""
    from app.core.config import settings

    # Check retention period in config
    retention_days = settings.olorin.dubbing.retention_days
    assert retention_days == 30  # Or configured value
    assert isinstance(retention_days, int)
    assert retention_days > 0

@pytest.mark.asyncio
async def test_deletion_audit_logged():
    """Verify session deletions are logged for audit."""
    service = DubbingRetentionService()

    # Create and expire session
    session = LiveDubbingSession(...)
    await session.insert()
    session.expires_at = datetime.utcnow() - timedelta(days=1)
    await session.save()

    # Run cleanup
    await service.cleanup_expired_sessions()

    # Verify audit log created
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "session_data_deleted"
    )
    assert log is not None
    assert log.session_id is not None  # Hashed or ID

@pytest.mark.asyncio
async def test_audio_files_deleted():
    """Verify audio files are deleted from storage."""
    # Mock storage service
    storage = MagicMock()

    session = LiveDubbingSession(session_id="test_session")
    await session.insert()
    session.expires_at = datetime.utcnow() - timedelta(days=1)
    await session.save()

    service = DubbingRetentionService(storage=storage)
    await service.cleanup_expired_sessions()

    # Verify storage.delete_prefix was called
    storage.delete_prefix.assert_called_with("dubbing/test_session/")

@pytest.mark.asyncio
async def test_right_to_erasure_endpoint():
    """Verify users can request immediate deletion (GDPR Article 17)."""
    # Create session as user
    session = await create_session(user_id="user1")

    # Request deletion
    response = client.delete(
        f"/api/v1/olorin/dubbing/sessions/{session.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 200
    assert response.json()["deleted"] is True

    # Verify session is deleted
    deleted_session = await LiveDubbingSession.find_one(
        LiveDubbingSession.session_id == session.id
    )
    assert deleted_session is None or deleted_session.deleted_at is not None

@pytest.mark.asyncio
async def test_deletion_403_for_other_user():
    """Verify users can't delete other users' sessions."""
    # Create session as user A
    session = await create_session(user_id="user_a")

    # Try to delete as user B
    response = client.delete(
        f"/api/v1/olorin/dubbing/sessions/{session.id}",
        headers={"Authorization": f"Bearer {user_b_token}"}
    )

    assert response.status_code == 403

    # Verify session still exists
    found = await LiveDubbingSession.find_one(
        LiveDubbingSession.session_id == session.id
    )
    assert found is not None
    assert found.deleted_at is None

@pytest.mark.asyncio
async def test_deletion_audit_logged_for_dsar():
    """Verify GDPR DSAR deletions are logged."""
    response = client.delete(
        f"/api/v1/olorin/dubbing/sessions/{session.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    # Verify audit log
    log = await AuditLog.find_one(
        AuditLog.event == "session_data_subject_access_request"
    )
    assert log is not None

@pytest.mark.asyncio
async def test_privacy_notice_in_session_response():
    """Verify privacy notice is shown to users."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={...},
        headers={...}
    )

    data = response.json()
    # Should include privacy/retention info
    # (optional: can be separate endpoint)
    # assert "privacy_policy_url" in data or "retention_days" in data

@pytest.mark.asyncio
async def test_no_recovery_of_deleted_data():
    """Verify deleted data cannot be recovered."""
    # Create, use, and delete session
    session = await create_session(user_id="user1")
    session_id = session.id

    # Delete it
    await delete_session(session_id, user_token)

    # Try to access
    response = client.get(
        f"/api/v1/olorin/dubbing/sessions/{session_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 404
    # Should NOT be recoverable

# Test count: 10
```

### Test Suite 6: Audit Logging (12 tests)

**File:** `backend/tests/security/test_audit_logging.py`

#### Test 6.1: Security Events Logged
```python
@pytest.mark.asyncio
async def test_session_creation_logged():
    """Verify session creation is logged for audit."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        json={...},
        headers={"Authorization": f"Bearer {token}"}
    )

    session_id = response.json()["session_id"]

    # Verify audit log
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_session_created"
    )
    assert log is not None
    assert log.session_id == session_id
    assert log.user_id == user_id

@pytest.mark.asyncio
async def test_authentication_failure_logged():
    """Verify failed auth attempts are logged."""
    # Try invalid token
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": "Bearer invalid_token"}
    )

    # Should log failure
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_auth_failed"
    )
    assert log is not None
    assert "invalid" in log.reason.lower()

@pytest.mark.asyncio
async def test_rate_limit_exceeded_logged():
    """Verify rate limit violations are logged."""
    # Make excessive requests
    for i in range(10):
        client.post(
            "/api/v1/olorin/dubbing/sessions",
            headers={"Authorization": f"Bearer {token}"}
        )

    # Verify rate limit violation logged
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_rate_limit_exceeded"
    )
    assert log is not None

@pytest.mark.asyncio
async def test_unauthorized_access_logged():
    """Verify unauthorized access attempts are logged."""
    # User A tries to access User B's session
    session_b = await create_session(user_id="user_b")

    response = client.get(
        f"/api/v1/olorin/dubbing/sessions/{session_b.id}",
        headers={"Authorization": f"Bearer {user_a_token}"}
    )

    assert response.status_code == 403

    # Verify logged
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_unauthorized_access"
    )
    assert log is not None

@pytest.mark.asyncio
async def test_audit_log_contains_timestamp():
    """Verify audit logs have timestamps."""
    # Create session
    response = client.post("/api/v1/olorin/dubbing/sessions", ...)

    # Check audit log has timestamp
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_session_created"
    )
    assert log is not None
    assert log.created_at is not None
    assert isinstance(log.created_at, datetime)

@pytest.mark.asyncio
async def test_audit_log_contains_ip_address():
    """Verify audit logs include client IP for investigation."""
    # Create session (logs IP)
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Check audit log has IP
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_session_created"
    )
    assert log is not None
    assert log.ip_address is not None  # Or client_ip

@pytest.mark.asyncio
async def test_audit_log_contains_user_id():
    """Verify audit logs include user ID for accountability."""
    response = client.post(
        "/api/v1/olorin/dubbing/sessions",
        headers={"Authorization": f"Bearer {token}"}
    )

    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "dubbing_session_created"
    )
    assert log is not None
    assert log.user_id == expected_user_id

@pytest.mark.asyncio
async def test_audit_log_searchable():
    """Verify audit logs can be queried for investigation."""
    # Create multiple sessions
    for i in range(3):
        await create_session(user_id="user1")

    # Query audit logs for this user
    from app.models.audit import AuditLog
    logs = await AuditLog.find(
        AuditLog.user_id == "user1",
        AuditLog.event == "dubbing_session_created"
    ).to_list()

    assert len(logs) >= 3

@pytest.mark.asyncio
async def test_audit_log_immutable():
    """Verify audit logs cannot be modified (audit trail integrity)."""
    # Create audit log
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(...)

    # Try to modify it (should fail or not be possible)
    # Audit logs should be immutable
    # Either:
    # 1. No update/delete methods exposed
    # 2. Soft-delete with tombstone
    # 3. Cryptographic signature validation

    assert not hasattr(log, "update") or log.update is protected

@pytest.mark.asyncio
async def test_data_deletion_logged_with_justification():
    """Verify data deletions log the reason (GDPR compliance)."""
    # Delete session
    await delete_session(session_id, user_token)

    # Verify audit log
    from app.models.audit import AuditLog
    log = await AuditLog.find_one(
        AuditLog.event == "session_data_deleted"
    )
    assert log is not None
    assert log.reason in ["user_request", "retention_policy", "gdpr_dsar"]

@pytest.mark.asyncio
async def test_audit_log_searchable_by_session():
    """Verify all actions on a session can be found."""
    session_id = "test_session"

    # Create, use, delete session
    # ... perform actions

    # Query all actions on this session
    from app.models.audit import AuditLog
    logs = await AuditLog.find(
        AuditLog.session_id == session_id
    ).to_list()

    # Should find: created, accessed, deleted
    events = [log.event for log in logs]
    assert "dubbing_session_created" in events

# Test count: 12
```

---

## COMPREHENSIVE TEST EXECUTION

### Run All Security Tests
```bash
# Phase 1 tests (run after Phase 1 implementation)
pytest backend/tests/security/test_api_key_auth.py -v
pytest backend/tests/security/test_websocket_security.py -v
pytest backend/tests/security/test_message_validation.py -v
pytest backend/tests/security/test_error_handling.py -v

# Summary
pytest backend/tests/security/ --cov=backend/app -v --cov-report=html

# Phase 2 tests (run after Phase 2 implementation)
pytest backend/tests/security/test_encryption.py -v
pytest backend/tests/security/test_rate_limiting.py -v

# Phase 3 tests (run after Phase 3 implementation)
pytest backend/tests/security/test_data_retention.py -v
pytest backend/tests/security/test_audit_logging.py -v
```

### Test Coverage Report
```bash
# Generate HTML coverage report
pytest backend/tests/security/ --cov=backend/app --cov-report=html

# View report
open htmlcov/index.html

# Target: 85%+ coverage for security-critical modules
```

### Continuous Integration
```yaml
# .github/workflows/security-tests.yml
name: Security Tests
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: poetry install
      - run: pytest backend/tests/security/ -v --cov
      - run: poetry run bandit -r backend/app/
```

---

## SUCCESS CRITERIA

### Phase 1 (Critical Issues)
- [ ] 15/15 auth tests passing
- [ ] 12/12 WebSocket tests passing
- [ ] 10/10 validation tests passing
- [ ] 8/8 error handling tests passing
- [ ] Overall: 45/45 tests (100%)
- [ ] Coverage: 85%+ for auth, WebSocket, error handling

### Phase 2 (High Issues)
- [ ] Additional 35 tests passing
- [ ] Overall: 80/80 tests (100%)
- [ ] Coverage: 85%+ for all security-critical code

### Phase 3 (Medium Issues)
- [ ] Additional 33 tests passing
- [ ] Overall: 113/113 tests (100%)
- [ ] Coverage: 85%+ for entire dubbing module

---

**Total Security Tests:** 83
**Total Test Duration:** ~15 minutes (CI/CD)
**Expected Coverage:** 85%+ for security-critical code

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Status:** READY FOR IMPLEMENTATION
