# Beta 500 Program API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

The Beta 500 program is a closed beta for testing AI-powered features. Each participant receives 500 AI credits for use with premium features like live dubbing, catch-up summaries, and AI search.

---

## Program Status

### GET `/api/v1/beta/status`

Get Beta 500 program status and availability.

- **Auth:** None
- **Response:** `ProgramStatusResponse`
  ```json
  {
    "program_name": "Beta 500",
    "is_open": true,
    "total_slots": 500,
    "remaining_slots": 123,
    "credits_per_user": 500
  }
  ```

---

## Signup

### POST `/api/v1/beta/signup`

Beta 500 signup with email verification and fraud detection.

- **Auth:** None
- **Request Body:** `SignupRequest`
  ```json
  {
    "email": "string",
    "name": "string"
  }
  ```
- **Response:** `SignupResponse`
  ```json
  {
    "success": true,
    "message": "Verification email sent",
    "requires_verification": true
  }
  ```

### GET `/api/v1/beta/verify/{token}`

Verify email with HMAC-SHA256 token and allocate credits.

- **Auth:** None
- **Path Params:** `token`
- **Response:** `VerifyResponse`
  ```json
  {
    "success": true,
    "message": "Email verified, credits allocated",
    "credits_allocated": 500
  }
  ```

---

## Credits

### GET `/api/v1/beta/credits/balance`

Get current authenticated user's credit balance.

- **Auth:** Required (Bearer token)
- **Response:** `CreditBalanceResponse`
  ```json
  {
    "balance": 450,
    "initial_credits": 500,
    "used_credits": 50,
    "is_beta_user": true
  }
  ```

### GET `/api/v1/beta/credits/balance/{user_id}`

Get user's credit balance by user_id (admin endpoint).

- **Auth:** None (admin/internal)
- **Path Params:** `user_id`
- **Response:** `CreditBalanceResponse`

### POST `/api/v1/beta/credits/deduct`

Deduct credits (internal service endpoint).

- **Auth:** None (internal)
- **Request Body:** `DeductRequest`
  ```json
  {
    "user_id": "string",
    "amount": 10,
    "reason": "live_dubbing_session",
    "session_id": "string (optional)"
  }
  ```
- **Response:** `DeductResponse`
  ```json
  {
    "success": true,
    "remaining_balance": 440,
    "deducted": 10
  }
  ```

---

## Sessions

Used for tracking credit consumption during live dubbing sessions.

### POST `/api/v1/beta/sessions/start`

Start dubbing session with credit tracking.

- **Auth:** None
- **Request Body:** `StartSessionRequest`
  ```json
  {
    "user_id": "string",
    "feature_type": "live_dubbing",
    "channel_id": "string (optional)"
  }
  ```
- **Response:** `StartSessionResponse`
  ```json
  {
    "session_id": "string",
    "started_at": "string",
    "credits_available": 450
  }
  ```

### POST `/api/v1/beta/sessions/{session_id}/checkpoint`

Checkpoint session - deduct accumulated credits.

- **Auth:** None
- **Path Params:** `session_id`
- **Response:** `CheckpointResponse`
  ```json
  {
    "session_id": "string",
    "credits_deducted": 5,
    "remaining_balance": 445
  }
  ```

### POST `/api/v1/beta/sessions/{session_id}/end`

End dubbing session - final credit deduction.

- **Auth:** None
- **Request Body:** `EndSessionRequest`
  ```json
  {
    "reason": "user_stopped"
  }
  ```
- **Response:** `EndSessionResponse`
  ```json
  {
    "session_id": "string",
    "duration_seconds": 300,
    "total_credits_used": 15,
    "remaining_balance": 435
  }
  ```

---

## Credit Costs by Feature

| Feature | Credits per Use | Description |
|---------|----------------|-------------|
| Live Dubbing | ~5 per minute | Real-time audio dubbing of live channels |
| AI Search (LLM) | 2 per query | Natural language content search |
| Catch-Up Summary | 3 per summary | AI-generated show summaries |
| Scene Search | 1 per search | Search scenes within content |
| Comprehension Quiz | 1 per question | AI-generated comprehension questions |

---

## Related Documents

- [API Overview](API_OVERVIEW.md)
- [AI API Reference](AI_API_REFERENCE.md)
- [Voice API Reference](VOICE_API_REFERENCE.md)

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
