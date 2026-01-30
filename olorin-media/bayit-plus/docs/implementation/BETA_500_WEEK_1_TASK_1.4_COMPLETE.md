# Beta 500 - Week 1 Task 1.4 Complete

**Task**: WebSocket Beta Integration
**Status**: ✅ COMPLETE
**Date Completed**: 2026-01-30

---

## Summary

WebSocket live dubbing endpoint has been **fully integrated with Beta 500 credit system**:

✅ **Beta User Detection**
- Checks if authenticated user is beta user
- Queries `beta_users` collection by email
- Verifies `is_beta_user` flag

✅ **Pre-Authorization**
- Estimates credit cost before session starts (60 credits for 1 minute)
- Calls `credit_service.authorize()` to verify sufficient balance
- Rejects connection if insufficient credits with user-friendly error message

✅ **Session Lifecycle Management**
- Starts Beta session with UUID on successful pre-authorization
- Tracks session with `SessionBasedCreditService`
- Checkpoint worker deducts credits every 30 seconds (Task 1.3)

✅ **Graceful Cleanup**
- Ends Beta session on WebSocket disconnect (reason: "user_stopped")
- Ends Beta session on quota failure (reason: "quota_failed")
- Ends Beta session on error (reason: "error")
- Logs remaining credits on session end

---

## Implementation Details

### Modified File

**`app/api/routes/websocket_live_dubbing.py`** - WebSocket live dubbing endpoint

### Integration Points

#### 1. Beta User Detection (Lines 123-168)

```python
# After authentication (Step 7.5)
beta_session_id = None
beta_user = None
session_service = None  # SessionBasedCreditService instance (if Beta user)

if settings.BETA_FEATURES_ENABLED:
    from app.core.database import get_database
    from app.services.beta.credit_service import BetaCreditService
    from app.services.beta.session_service import SessionBasedCreditService
    from app.services.olorin.metering.service import MeteringService

    db = get_database()
    beta_user = await db.beta_users.find_one({"email": user.email})

    if beta_user and beta_user.get("is_beta_user"):
        logger.info(f"Beta user detected: {user.email}, checking credits...")
```

#### 2. Pre-Authorization (Lines 138-168)

```python
# Estimate cost (60 credits for 1 minute of dubbing)
estimated_cost = 60
metering_service = MeteringService()
credit_service = BetaCreditService(settings, metering_service, db)
success, remaining = await credit_service.authorize(
    str(user.id), estimated_cost
)

if not success:
    await websocket.send_json(
        {
            "type": "error",
            "message": "Insufficient beta credits for live dubbing",
            "upgrade_required": True,
            "remaining_credits": remaining,
        }
    )
    await websocket.close(code=4003, reason="Insufficient beta credits")
    return

# Start Beta session
session_service = SessionBasedCreditService(credit_service, settings)
import uuid

beta_session_id = str(uuid.uuid4())
await session_service.start_dubbing_session(str(user.id), beta_session_id)
logger.info(
    f"Beta session started: session_id={beta_session_id}, "
    f"remaining_credits={remaining}"
)
```

#### 3. Quota Failure Cleanup (Lines 180-185)

```python
if not allowed:
    # End Beta session if quota check failed
    if beta_session_id and session_service:
        await session_service.end_session(beta_session_id, "quota_failed")
    return
```

#### 4. WebSocket Disconnect Cleanup (Lines 232-242)

```python
except WebSocketDisconnect:
    logger.info(
        f"Live dubbing session ended (disconnect): "
        f"user={user.id}, session={dubbing_service.session_id}"
    )
    await end_quota_session(quota_session, UsageSessionStatus.COMPLETED)

    # End Beta session
    if beta_session_id and session_service:
        remaining = await session_service.end_session(
            beta_session_id, "user_stopped"
        )
        logger.info(
            f"Beta session ended (disconnect): session_id={beta_session_id}, "
            f"remaining_credits={remaining}"
        )
```

#### 5. Error Cleanup (Lines 245-253)

```python
except Exception as e:
    logger.error(f"Error in live dubbing stream: {str(e)}")
    await end_quota_session(quota_session, UsageSessionStatus.ERROR)

    # End Beta session on error
    if beta_session_id and session_service:
        remaining = await session_service.end_session(beta_session_id, "error")
        logger.info(
            f"Beta session ended (error): session_id={beta_session_id}, "
            f"remaining_credits={remaining}"
        )
```

---

## WebSocket Flow with Beta Integration

### Pre-Connection Phase

```
1. Client opens WebSocket connection
2. Server accepts connection
3. Client sends authentication message with JWT token
4. Server validates token → User authenticated
5. Rate limiting check (5 connections/minute)
6. Subscription tier check (Premium/Family required)
7. Channel validation (exists and supports dubbing)

[NEW] 7.5. Beta 500 integration:
   - Check if user is beta user (query beta_users by email)
   - If beta user:
     a. Pre-authorize 60 credits (estimate for 1 minute)
     b. If insufficient credits → close connection with error
     c. If sufficient → start Beta session with UUID
     d. Log session start and remaining credits

8. Quota session check (live feature quotas)
9. Initialize dubbing service and audio pipeline
```

### Active Session Phase

```
Client sends: Binary audio chunks (16kHz mono LINEAR16 PCM)
Server processes: Transcription → Translation → Dubbing → Send back

[EXISTING] Quota updates every 10 seconds (live_feature_quota_service)
[NEW] Checkpoint worker deducts Beta credits every 30 seconds (Task 1.3)
```

### Disconnect Phase

```
User disconnects OR Error occurs OR Quota exceeded
↓
[EXISTING] End quota session (UsageSessionStatus.COMPLETED/ERROR)
[NEW] End Beta session if beta_session_id exists:
   - Calculate final elapsed time
   - Deduct remaining credits
   - Update BetaSession status to "ended"
   - Log remaining credits
```

---

## Error Messages for Beta Users

### Insufficient Credits (Pre-Authorization Failure)

```json
{
  "type": "error",
  "message": "Insufficient beta credits for live dubbing",
  "upgrade_required": true,
  "remaining_credits": 42
}
```

**WebSocket Close**: Code 4003, Reason: "Insufficient beta credits"

### Credits Exhausted During Session

```json
{
  "type": "error",
  "message": "Beta credits exhausted",
  "upgrade_required": true,
  "session_ended": true
}
```

**Note**: This error is sent by the checkpoint worker (Task 1.3) when credits reach 0 during an active session. The WebSocket connection is closed after sending this message.

---

## Testing

### Manual Testing - Beta User

```bash
# 1. Create beta user with invitation
cd backend
poetry run python scripts/create_beta_invitation.py beta@example.com

# 2. Enroll user (OAuth or manual)
poetry run python scripts/enroll_beta_user.py beta@example.com

# 3. Verify credit balance
poetry run python -c "
import asyncio
from app.core.database import get_database
async def check():
    db = get_database()
    credits = await db.beta_credits.find_one({'user_id': '<user_id>'})
    print(f'Credits: {credits[\"remaining_credits\"]}')
asyncio.run(check())
"

# 4. Start backend server
poetry run uvicorn app.main:app --port 8000

# 5. Connect to WebSocket (from frontend)
# - Select live channel with dubbing support
# - Click "Enable Live Dubbing"
# - Authenticate with beta user JWT token

# 6. Monitor logs for Beta integration
tail -f logs/backend.log | grep -E "(Beta|checkpoint|session)"

# Expected logs:
# INFO - Beta user detected: beta@example.com, checking credits...
# INFO - Beta session started: session_id=<uuid>, remaining_credits=500
# INFO - Processing checkpoints (active_sessions_count=1)  # Every 30s
# INFO - Checkpoint batch complete (total_sessions=1, checkpointed=1)
# INFO - Beta session ended (disconnect): session_id=<uuid>, remaining_credits=450
```

### Manual Testing - Non-Beta User

```bash
# 1. Sign up regular user (no beta invitation)

# 2. Start WebSocket connection

# Expected behavior:
# - No "Beta user detected" log
# - No Beta session started
# - Standard live feature quota system applies
# - Checkpoint worker does not track session
```

### Manual Testing - Insufficient Credits

```bash
# 1. Reduce beta credits to < 60
poetry run python -c "
import asyncio
from app.core.database import get_database
async def set_low():
    db = get_database()
    await db.beta_credits.update_one(
        {'user_id': '<user_id>'},
        {'$set': {'remaining_credits': 50}}
    )
asyncio.run(set_low())
"

# 2. Try to start WebSocket connection

# Expected:
# - WebSocket connection rejected immediately
# - Error message: "Insufficient beta credits for live dubbing"
# - Connection closed with code 4003
# - No Beta session created
```

---

## Integration with Other Systems

### Live Feature Quota System

Beta integration **coexists** with the live feature quota system:

- **Live Feature Quotas**: Tracks minutes per hour/day/month (Premium tier limits)
- **Beta Credits**: Tracks credit consumption for Beta 500 users

**Both systems run simultaneously** for Beta users:
1. Pre-authorization checks Beta credits (if Beta user)
2. Quota check verifies live feature quotas (all Premium/Family users)
3. During session:
   - Live feature quota service updates usage every 10s
   - Beta checkpoint worker deducts credits every 30s
4. On disconnect:
   - Quota session ended
   - Beta session ended

### Checkpoint Worker Integration

The WebSocket endpoint **starts** Beta sessions. The checkpoint worker (Task 1.3) **deducts** credits:

- **WebSocket**: `start_dubbing_session()` - Creates BetaSession with status="active"
- **Checkpoint Worker**: `checkpoint_session()` - Deducts credits every 30s
- **WebSocket**: `end_session()` - Final deduction and status="ended"

---

## Known Limitations

### Current Implementation

1. **Fixed Estimated Cost**
   - Pre-authorization uses fixed 60 credits (1 minute estimate)
   - Actual cost varies based on session duration
   - Mitigation: Checkpoint worker handles actual deduction

2. **No Credit Warnings**
   - User not warned when credits are low during session
   - Sudden disconnection when credits exhausted
   - Future: Add credit balance warnings at 20%, 10%, 5%

3. **No Credit Top-Up During Session**
   - If user's credits are topped up externally during session, session still ends
   - Future: Reload credit balance on checkpoint

---

## Other WebSocket Endpoints

### Live Subtitles (Already Has Beta Integration)

**File**: `app/api/routes/websocket_live_subtitles.py`

This endpoint already has Beta integration via `BetaLiveTranslationIntegration`:

```python
# Line 239-246
translation_integration = BetaLiveTranslationIntegration(
    user=user,
    source_lang=source_lang,
    target_lang=target_lang,
)

# Start session (Beta or standard mode)
session_info = await translation_integration.start_session()
```

**No changes needed** - already using Beta credit system.

### Other WebSocket Endpoints (No Beta Integration Needed)

- `websocket_dm.py` - Direct messaging (not a Beta feature)
- `websocket_chess.py` - Chess game (not a Beta feature)
- `websocket_diagnostics.py` - System diagnostics (not a Beta feature)
- `admin_uploads/websocket.py` - Admin file uploads (not a Beta feature)
- `olorin/dubbing_routes/websocket.py` - Partner API (uses API keys, not Beta credits)
- `dubbing/websocket.py` - User dubbing service (different implementation)

---

## Production Readiness

### ✅ Implementation Complete
- Beta user detection working
- Pre-authorization before session starts
- Session lifecycle fully managed
- Graceful error handling

### ✅ Integration Complete
- Works with existing live feature quota system
- Integrated with checkpoint worker (Task 1.3)
- Proper logging and monitoring
- User-friendly error messages

### ⏳ Testing Pending
- E2E tests with Playwright (Week 3)
- Load testing with concurrent Beta users (Week 4)
- Credit exhaustion edge cases (Week 3)

---

## Next Steps

**Week 1 Complete** 🎉
- All Week 1 tasks finished (1.1-1.4)
- Backend critical path complete
- Ready for Week 2 (Frontend Integration)

**Week 2 Tasks**:
- Task 2.1: Add Credit Balance Widget to UI (~1 day)
- Task 2.2: Add AI Search to Navigation (~1-2 days)
- Task 2.3: Add AI Recommendations Panel (~1 day)
- Task 2.4: Frontend Pre-Authorization Checks (~2 days)

---

**Status**: ✅ Week 1 Complete - All Backend Tasks Done
**Last Updated**: 2026-01-30
