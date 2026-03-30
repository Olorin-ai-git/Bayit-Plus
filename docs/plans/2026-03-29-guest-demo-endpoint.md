# Guest Demo Endpoint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow unauthenticated users to try Pause & Ask on a pre-loaded demo video with 10 lifetime interactions, voice-only, no account required — fulfilling the Free tier's pricing page promise.

**Architecture:** Create a lightweight `GuestDemoUsage` MongoDB document that tracks anonymous usage by client fingerprint (UUID stored in localStorage). A new `POST /api/v1/demo/pause-ask` endpoint bypasses auth, validates the fingerprint's interaction count against a 10-interaction lifetime cap, then reuses the existing `pause_ask_orchestrator` by creating an ephemeral session under a system demo user. The endpoint enforces `voice_only=True` and restricts to a single pre-configured demo content.

**Tech Stack:** Python 3.11, FastAPI, Beanie ODM, MongoDB Atlas

---

## File Map

### New Files

| File                                    | Responsibility                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `backend/app/models/guest_demo.py`      | `GuestDemoUsage` Beanie document — tracks fingerprint, interaction count, IP |
| `backend/app/api/routes/guest_demo.py`  | `POST /demo/pause-ask` — unauthenticated guest demo endpoint                 |
| `backend/tests/unit/test_guest_demo.py` | Unit tests for guest demo model + endpoint logic                             |

### Modified Files

| File                                 | Change                                                        |
| ------------------------------------ | ------------------------------------------------------------- |
| `backend/app/core/config.py`         | Add `DEMO_CONTENT_ID`, `GUEST_DEMO_MAX_INTERACTIONS` settings |
| `backend/app/api/router_registry.py` | Register guest demo route                                     |

---

## Task 1: Add Guest Demo Config Settings

**Files:**

- Modify: `backend/app/core/config.py`
- Test: `backend/tests/unit/test_guest_demo.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/unit/test_guest_demo.py
"""Unit tests for guest demo endpoint."""

import pytest
from unittest.mock import Mock


class TestGuestDemoConfig:
    def test_demo_content_id_exists(self):
        from app.core.config import Settings
        s = Settings()
        assert hasattr(s, "DEMO_CONTENT_ID")

    def test_guest_demo_max_interactions_default(self):
        from app.core.config import Settings
        s = Settings()
        assert s.GUEST_DEMO_MAX_INTERACTIONS == 10
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py::TestGuestDemoConfig -v`
Expected: FAIL — `AttributeError`

- [ ] **Step 3: Add config settings**

In `backend/app/core/config.py`, after the `B2B_MONTHLY_CREDITS` field, add:

```python
    # Guest Demo (unauthenticated Pause & Ask)
    DEMO_CONTENT_ID: str = Field(
        default="",
        env="DEMO_CONTENT_ID",
        description="Content ID for the pre-loaded demo video (e.g. BTTF)"
    )
    GUEST_DEMO_MAX_INTERACTIONS: int = Field(
        default=10,
        env="GUEST_DEMO_MAX_INTERACTIONS",
        description="Maximum lifetime interactions for unauthenticated demo users"
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py::TestGuestDemoConfig -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add olorin-media/bayit-plus/backend/app/core/config.py olorin-media/bayit-plus/backend/tests/unit/test_guest_demo.py
git commit -m "feat(olorin): add DEMO_CONTENT_ID and GUEST_DEMO_MAX_INTERACTIONS config"
```

---

## Task 2: Create GuestDemoUsage Model

**Files:**

- Create: `backend/app/models/guest_demo.py`
- Test: append to `backend/tests/unit/test_guest_demo.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/unit/test_guest_demo.py`:

```python
class TestGuestDemoUsageModel:
    def test_model_fields(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage(
            fingerprint="test-fp-123",
            ip_address="127.0.0.1",
        )
        assert usage.fingerprint == "test-fp-123"
        assert usage.interaction_count == 0
        assert usage.ip_address == "127.0.0.1"

    def test_can_interact_under_limit(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage(
            fingerprint="fp",
            interaction_count=5,
        )
        assert usage.can_interact(max_interactions=10) is True

    def test_cannot_interact_at_limit(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage(
            fingerprint="fp",
            interaction_count=10,
        )
        assert usage.can_interact(max_interactions=10) is False

    def test_cannot_interact_over_limit(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage(
            fingerprint="fp",
            interaction_count=15,
        )
        assert usage.can_interact(max_interactions=10) is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py::TestGuestDemoUsageModel -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the model**

```python
# backend/app/models/guest_demo.py
"""
Guest Demo Usage Tracking

Tracks unauthenticated demo interactions by client fingerprint.
Enforces a lifetime cap (default: 10 interactions) per fingerprint.
"""

from datetime import datetime

from beanie import Document, Indexed
from pydantic import Field


class GuestDemoUsage(Document):
    fingerprint: Indexed(str, unique=True)  # type: ignore
    ip_address: str = ""
    interaction_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_interaction_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "guest_demo_usage"
        indexes = [
            "fingerprint",
        ]

    def can_interact(self, max_interactions: int) -> bool:
        return self.interaction_count < max_interactions
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py::TestGuestDemoUsageModel -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add olorin-media/bayit-plus/backend/app/models/guest_demo.py olorin-media/bayit-plus/backend/tests/unit/test_guest_demo.py
git commit -m "feat(olorin): add GuestDemoUsage model for anonymous demo tracking"
```

---

## Task 3: Create Guest Demo Endpoint

**Files:**

- Create: `backend/app/api/routes/guest_demo.py`
- Test: append to `backend/tests/unit/test_guest_demo.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/unit/test_guest_demo.py`:

```python
from unittest.mock import AsyncMock, patch


class TestGuestDemoEndpointLogic:
    @pytest.mark.asyncio
    async def test_get_or_create_usage_new(self):
        from app.api.routes.guest_demo import _get_or_create_usage
        with patch("app.api.routes.guest_demo.GuestDemoUsage") as MockUsage:
            MockUsage.find_one = AsyncMock(return_value=None)
            mock_new = Mock()
            mock_new.interaction_count = 0
            mock_new.insert = AsyncMock(return_value=mock_new)
            MockUsage.return_value = mock_new
            usage = await _get_or_create_usage("fp-new", "1.2.3.4")
        assert usage.interaction_count == 0

    @pytest.mark.asyncio
    async def test_get_or_create_usage_existing(self):
        from app.api.routes.guest_demo import _get_or_create_usage
        existing = Mock()
        existing.interaction_count = 5
        with patch("app.api.routes.guest_demo.GuestDemoUsage") as MockUsage:
            MockUsage.find_one = AsyncMock(return_value=existing)
            usage = await _get_or_create_usage("fp-exists", "1.2.3.4")
        assert usage.interaction_count == 5

    @pytest.mark.asyncio
    async def test_rejects_over_limit(self):
        from app.api.routes.guest_demo import _check_demo_limit
        from fastapi import HTTPException
        usage = Mock()
        usage.can_interact = Mock(return_value=False)
        usage.interaction_count = 10
        with pytest.raises(HTTPException) as exc:
            _check_demo_limit(usage, max_interactions=10)
        assert exc.value.status_code == 429

    @pytest.mark.asyncio
    async def test_allows_under_limit(self):
        from app.api.routes.guest_demo import _check_demo_limit
        usage = Mock()
        usage.can_interact = Mock(return_value=True)
        result = _check_demo_limit(usage, max_interactions=10)
        assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py::TestGuestDemoEndpointLogic -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the guest demo endpoint**

```python
# backend/app/api/routes/guest_demo.py
"""
Guest Demo Endpoint

Unauthenticated Pause & Ask for the pricing page free tier.
Limited to a pre-loaded demo video, voice-only, 10 lifetime interactions.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.guest_demo import GuestDemoUsage

logger = get_logger(__name__)

router = APIRouter(prefix="/demo", tags=["Guest Demo"])


class GuestDemoRequest(BaseModel):
    fingerprint: str = Field(
        ..., min_length=8, max_length=128,
        description="Client-generated UUID stored in localStorage",
    )
    message: str = Field(
        ..., min_length=1, max_length=500,
        description="User's question text",
    )
    character_name: str = Field(
        ..., min_length=1, max_length=100,
        description="Character to address",
    )
    language_hint: str = Field(
        default="en", max_length=10,
    )


class GuestDemoResponse(BaseModel):
    character_name: str
    character_response_text: str
    character_audio_url: str
    interactions_remaining: int


async def _get_or_create_usage(
    fingerprint: str, ip_address: str,
) -> GuestDemoUsage:
    usage = await GuestDemoUsage.find_one(
        {"fingerprint": fingerprint}
    )
    if usage is None:
        usage = GuestDemoUsage(
            fingerprint=fingerprint,
            ip_address=ip_address,
        )
        await usage.insert()
        logger.info(
            "New guest demo user",
            extra={"fingerprint": fingerprint[:8]},
        )
    return usage


def _check_demo_limit(
    usage: GuestDemoUsage, max_interactions: int,
) -> None:
    if not usage.can_interact(max_interactions):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo interaction limit reached. Sign up for a Fan plan to continue.",
        )


@router.post("/pause-ask", response_model=GuestDemoResponse)
@limiter.limit("5/minute")
async def guest_pause_ask(request: Request, body: GuestDemoRequest):
    """Voice-only Pause & Ask for unauthenticated demo users."""
    if not settings.DEMO_CONTENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo content not configured",
        )

    ip = request.client.host if request.client else "unknown"
    usage = await _get_or_create_usage(body.fingerprint, ip)
    _check_demo_limit(usage, settings.GUEST_DEMO_MAX_INTERACTIONS)

    from app.models.content import Content
    content = await Content.get(settings.DEMO_CONTENT_ID)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo content not found",
        )

    characters = getattr(content, "interactive_characters", [])
    character = next(
        (c for c in characters if c.name == body.character_name),
        None,
    )
    if not character:
        available = [c.name for c in characters[:5]]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character '{body.character_name}' not found. Available: {available}",
        )

    from app.services.vod_interaction.pause_ask_orchestrator import (
        pause_ask_orchestrator,
    )
    try:
        result = await pause_ask_orchestrator.generate_voice_only_response(
            character=character,
            content=content,
            user_message=body.message,
            language_hint=body.language_hint,
        )
    except Exception as exc:
        logger.error(
            "Guest demo Pause & Ask failed",
            extra={"fingerprint": body.fingerprint[:8], "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response",
        )

    usage.interaction_count += 1
    usage.last_interaction_at = datetime.utcnow()
    await usage.save()

    remaining = settings.GUEST_DEMO_MAX_INTERACTIONS - usage.interaction_count

    logger.info(
        "Guest demo interaction",
        extra={
            "fingerprint": body.fingerprint[:8],
            "character": body.character_name,
            "remaining": remaining,
        },
    )

    return GuestDemoResponse(
        character_name=character.name,
        character_response_text=result.response_text,
        character_audio_url=result.audio_url,
        interactions_remaining=remaining,
    )
```

**Note:** This endpoint calls `pause_ask_orchestrator.generate_voice_only_response()` — a method that may not exist yet. If the orchestrator doesn't have this method, the implementer should check the existing orchestrator and either:

- a) Use the existing `process_pause_ask()` method with a mock session, or
- b) Extract the voice-only response generation into a standalone method

The implementer should read `app/services/vod_interaction/pause_ask_orchestrator.py` to determine the right approach.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend && poetry run pytest tests/unit/test_guest_demo.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add olorin-media/bayit-plus/backend/app/api/routes/guest_demo.py olorin-media/bayit-plus/backend/tests/unit/test_guest_demo.py
git commit -m "feat(olorin): add unauthenticated guest demo Pause & Ask endpoint"
```

---

## Task 4: Register Route + Add GuestDemoUsage to Beanie Init

**Files:**

- Modify: `backend/app/api/router_registry.py`
- Modify: Beanie document model list (wherever `init_beanie` is called with document models)

- [ ] **Step 1: Register route**

In `backend/app/api/router_registry.py`, after the Olorin tier sync route registration, add:

```python
    from app.api.routes import guest_demo
    app.include_router(guest_demo.router, prefix=prefix, tags=["guest-demo"])
    logger.debug("Registered guest demo route")
```

- [ ] **Step 2: Add GuestDemoUsage to Beanie init**

Find where `init_beanie(document_models=[...])` is called in `app/core/database.py` or `app/main.py`. Add `GuestDemoUsage` to the document models list:

```python
from app.models.guest_demo import GuestDemoUsage
# Add GuestDemoUsage to the document_models list
```

- [ ] **Step 3: Commit**

```bash
git add olorin-media/bayit-plus/backend/app/api/router_registry.py olorin-media/bayit-plus/backend/app/core/database.py
git commit -m "feat(olorin): register guest demo route and GuestDemoUsage model"
```

---

## Task 5: Add DEMO_CONTENT_ID to GCloud Secrets

**Files:**

- Modify: `docs/deployment/GCLOUD_SECRETS_OLORIN_TIERS.md`

The demo content must be identified. Use the BTTF demo content. The implementer should:

- [ ] **Step 1: Find the BTTF content_id**

```bash
# Look up the BTTF demo manifest to find the content_id
gsutil cat gs://bayit-plus-media-new/demo/bttf-demo-manifest.json | python3 -c "import sys,json; print(json.load(sys.stdin)['content_id'])"
```

If that fails, query the database:

```python
# From the backend shell
from app.models.content import Content
content = await Content.find_one({"imdb_id": "tt0088763"})
print(str(content.id))
```

- [ ] **Step 2: Set the secret**

```bash
echo -n "<content_id_from_step_1>" | gcloud secrets create DEMO_CONTENT_ID --data-file=- --project=bayit-plus
```

- [ ] **Step 3: Update secrets documentation**

Add to `docs/deployment/GCLOUD_SECRETS_OLORIN_TIERS.md`:

| `DEMO_CONTENT_ID` | `<bttf-content-id>` | Content ID for the pre-loaded guest demo video |
| `GUEST_DEMO_MAX_INTERACTIONS` | `10` | Lifetime interaction cap for unauthenticated users |

- [ ] **Step 4: Commit**

```bash
git add olorin-media/bayit-plus/docs/deployment/GCLOUD_SECRETS_OLORIN_TIERS.md
git commit -m "docs(deployment): add DEMO_CONTENT_ID secret for guest demo"
```

---

## Implementation Notes

### Rate Limiting

The guest demo endpoint has aggressive rate limiting (`5/minute` per IP) to prevent abuse. This is more restrictive than authenticated endpoints (`10/minute`).

### Fingerprint Security

The fingerprint is client-generated (localStorage UUID). It is NOT cryptographically secure — a determined user can reset localStorage to get more interactions. This is acceptable for a "try before you buy" demo. The IP-based rate limit provides a secondary defense.

### Orchestrator Integration

The endpoint calls the existing Pause & Ask orchestrator for AI response + TTS generation. The implementer must verify the orchestrator has a method that works without a full VODInteractionSession. If it doesn't, extract the voice-only path into a standalone method.

### No Session Management

Guest demo interactions are NOT stored as VODInteractionSessions. They are fire-and-forget: the AI responds, TTS is generated, and only the interaction count is persisted. No dialogue history, no reels, no sharing.
