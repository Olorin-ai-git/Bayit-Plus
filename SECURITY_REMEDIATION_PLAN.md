# AUDIOBOOKS SECURITY REMEDIATION PLAN

**Target**: Fix 3 CRITICAL and 4 HIGH priority security issues
**Total Effort**: 2-3 hours implementation + testing
**Risk Level**: LOW (changes localized to validation layers)

---

## PHASE 1: CRITICAL FIXES (40 minutes)

### Fix 1: Add SSRF Validation to CREATE Endpoint

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/admin_audiobooks_crud.py`

**Current Code** (lines 28-80):
```python
@router.post("/audiobooks", response_model=AudiobookAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_audiobook(
    request_data: AudiobookCreateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
    request: Request = None,
):
    """Create a new audiobook."""
    audiobook = Content(
        title=request_data.title,
        author=request_data.author,
        narrator=request_data.narrator,
        # ... other fields ...
        stream_url=request_data.stream_url,  # ← NO VALIDATION
        # ... rest ...
    )
    await audiobook.insert()
```

**Fix Required**: Add validation before Content creation

```python
from app.core.ssrf_protection import validate_audio_url  # ← ADD IMPORT

@router.post("/audiobooks", response_model=AudiobookAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_audiobook(
    request_data: AudiobookCreateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
    request: Request = None,
):
    """Create a new audiobook."""

    # ← ADD VALIDATION
    if not validate_audio_url(request_data.stream_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stream URL domain not in allowed list",
        )

    audiobook = Content(
        title=request_data.title,
        author=request_data.author,
        narrator=request_data.narrator,
        description=request_data.description,
        duration=request_data.duration,
        year=request_data.year,
        rating=request_data.rating,
        thumbnail=request_data.thumbnail,
        backdrop=request_data.backdrop,
        stream_url=request_data.stream_url,
        stream_type=request_data.stream_type,
        is_drm_protected=request_data.is_drm_protected,
        drm_key_id=request_data.drm_key_id,
        content_format="audiobook",
        audio_quality=request_data.audio_quality,
        isbn=request_data.isbn,
        book_edition=request_data.book_edition,
        publisher_name=request_data.publisher_name,
        section_ids=request_data.section_ids,
        primary_section_id=request_data.primary_section_id,
        genre_ids=request_data.genre_ids,
        audience_id=request_data.audience_id,
        topic_tags=request_data.topic_tags,
        requires_subscription=request_data.requires_subscription,
        visibility_mode=request_data.visibility_mode,
        is_published=request_data.is_published,
    )
    await audiobook.insert()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_CREATED,
        resource_type="audiobook",
        resource_id=str(audiobook.id),
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "narrator": audiobook.narrator,
            "requires_subscription": audiobook.requires_subscription,
            "visibility_mode": audiobook.visibility_mode,
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)
```

**Test Case**:
```python
async def test_create_with_invalid_stream_url(client, admin_user, auth_token):
    """Test that invalid stream URL is rejected."""
    headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
    payload = {
        "title": "Malicious",
        "author": "Attacker",
        "stream_url": "https://internal.private/stream.m3u8",  # ← Not whitelisted
    }
    response = client.post(
        "/api/v1/admin/audiobooks",
        json=payload,
        headers=headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "domain not in allowed list" in response.json()["detail"]
```

**Environment Variable Required**:
```bash
ALLOWED_AUDIO_DOMAINS="cdn.example.com,stream.example.com,audio.example.com"
```

---

### Fix 2: Add SSRF Validation to PATCH Endpoint

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/admin_audiobooks_crud.py`

**Current Code** (lines 134-169):
```python
@router.patch("/audiobooks/{audiobook_id}", response_model=AudiobookAdminResponse)
async def update_audiobook(
    audiobook_id: str,
    request_data: AudiobookUpdateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Update audiobook details."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    update_data = request_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(audiobook, field, value)  # ← NO VALIDATION

    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()
```

**Fix Required**: Validate stream_url if being updated

```python
from app.core.ssrf_protection import validate_audio_url  # ← ADD IMPORT

@router.patch("/audiobooks/{audiobook_id}", response_model=AudiobookAdminResponse)
async def update_audiobook(
    audiobook_id: str,
    request_data: AudiobookUpdateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Update audiobook details."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    update_data = request_data.model_dump(exclude_unset=True)

    # ← ADD VALIDATION
    if "stream_url" in update_data and update_data["stream_url"]:
        if not validate_audio_url(update_data["stream_url"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stream URL domain not in allowed list",
            )

    for field, value in update_data.items():
        setattr(audiobook, field, value)

    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_UPDATED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "updated_fields": list(update_data.keys()),
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)
```

**Test Case**:
```python
async def test_update_with_invalid_stream_url(client, admin_user, sample_audiobook, auth_token):
    """Test that stream URL update validation works."""
    headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
    payload = {
        "stream_url": "https://127.0.0.1:8000/stream.m3u8",  # ← Invalid
    }
    response = client.patch(
        f"/api/v1/admin/audiobooks/{sample_audiobook.id}",
        json=payload,
        headers=headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "domain not in allowed list" in response.json()["detail"]
```

---

### Fix 3: Add DRM Key ID Format Validation

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/audiobook_schemas.py`

**Current Code** (lines 17-43):
```python
class AudiobookCreateRequest(BaseModel):
    """Request model for creating an audiobook."""
    title: str = Field(..., min_length=1, max_length=500)
    author: str = Field(..., min_length=1, max_length=300)
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: str = Field(..., min_length=1)
    stream_type: str = "hls"
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None  # ← NO VALIDATION
    # ... rest ...
```

**Fix Required**: Add pattern validation

```python
class AudiobookCreateRequest(BaseModel):
    """Request model for creating an audiobook."""
    title: str = Field(..., min_length=1, max_length=500)
    author: str = Field(..., min_length=1, max_length=300)
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: str = Field(..., min_length=1)
    stream_type: str = "hls"
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = Field(  # ← ADD VALIDATION
        None,
        max_length=128,
        pattern=r"^[a-zA-Z0-9\-_]{0,128}$"
    )
    # ... rest ...
```

**Also add to AudiobookUpdateRequest** (lines 46-70):
```python
class AudiobookUpdateRequest(BaseModel):
    """Request model for updating an audiobook."""
    # ... existing fields ...
    drm_key_id: Optional[str] = Field(  # ← ADD VALIDATION
        None,
        max_length=128,
        pattern=r"^[a-zA-Z0-9\-_]{0,128}$"
    )
    # ... rest ...
```

**Test Case**:
```python
async def test_create_with_invalid_drm_key_id(client, admin_user, auth_token):
    """Test that invalid DRM key ID is rejected."""
    headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
    payload = {
        "title": "Test",
        "author": "Test",
        "stream_url": "https://cdn.example.com/stream.m3u8",
        "drm_key_id": "'; DROP COLLECTION; --",  # ← Invalid format
    }
    response = client.post(
        "/api/v1/admin/audiobooks",
        json=payload,
        headers=headers,
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
```

---

## PHASE 2: HIGH PRIORITY VALIDATION (1.5 hours)

### Enhancement 1: Add AudioQuality Enum

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/audiobook_schemas.py`

**Add Before AudiobookCreateRequest**:
```python
from enum import Enum

class AudioQualityEnum(str, Enum):
    """Valid audio quality levels."""
    LOW = "low"
    STANDARD = "standard"
    HIGH = "high"
    HIGH_FIDELITY = "high-fidelity"
```

**Update AudiobookCreateRequest**:
```python
audio_quality: Optional[AudioQualityEnum] = None  # ← Changed from str
```

**Update AudiobookUpdateRequest**:
```python
audio_quality: Optional[AudioQualityEnum] = None  # ← Changed from str
```

---

### Enhancement 2: Add ISBN Format Validation

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/audiobook_schemas.py`

**Update AudiobookCreateRequest**:
```python
isbn: Optional[str] = Field(  # ← Add validation
    None,
    pattern=r"^[0-9\-]{10,17}$",  # ISBN-10 or ISBN-13 format
    description="ISBN-10 or ISBN-13"
)
```

**Update AudiobookUpdateRequest**:
```python
isbn: Optional[str] = Field(  # ← Add validation
    None,
    pattern=r"^[0-9\-]{10,17}$",
    description="ISBN-10 or ISBN-13"
)
```

---

### Enhancement 3: Add Stream URL Format Validation

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/api/routes/audiobook_schemas.py`

**Update AudiobookCreateRequest**:
```python
stream_url: str = Field(
    ...,
    min_length=1,
    pattern=r"^https?://.+"  # ← Add format validation
)
```

**Update AudiobookUpdateRequest**:
```python
stream_url: Optional[str] = Field(
    None,
    pattern=r"^https?://.+"  # ← Add format validation
)
```

---

### Enhancement 4: Add Rate Limiting

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/app/core/rate_limiter.py`

**Update RATE_LIMITS dictionary** (around line 14):
```python
RATE_LIMITS = {
    # ... existing limits ...

    # Audiobook endpoints
    "audiobook_create": "50/hour",      # ~1 per minute
    "audiobook_list": "100/minute",     # Admin browsing
    "audiobook_read": "500/minute",     # User browsing
    "audiobook_update": "100/hour",     # Admin edits
    "audiobook_delete": "10/hour",      # Destructive operations
    "audiobook_stream": "1000/hour",    # Streaming activity
}
```

**Apply to CRUD Endpoints** (`admin_audiobooks_crud.py`):
```python
from app.core.rate_limiter import limiter, RATE_LIMITS

@router.post("/audiobooks", response_model=AudiobookAdminResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["audiobook_create"])  # ← ADD
async def create_audiobook(...):
    ...

@router.get("/audiobooks", response_model=AudiobookAdminListResponse)
@limiter.limit(RATE_LIMITS["audiobook_list"])  # ← ADD
async def list_audiobooks(...):
    ...

@router.patch("/audiobooks/{audiobook_id}", response_model=AudiobookAdminResponse)
@limiter.limit(RATE_LIMITS["audiobook_update"])  # ← ADD
async def update_audiobook(...):
    ...

@router.delete("/audiobooks/{audiobook_id}")
@limiter.limit(RATE_LIMITS["audiobook_delete"])  # ← ADD
async def delete_audiobook(...):
    ...
```

**Apply to User Stream Endpoint** (`audiobooks.py`):
```python
@router.post("/audiobooks/{audiobook_id}/stream", response_model=AudiobookStreamResponse)
@limiter.limit(RATE_LIMITS["audiobook_stream"])  # ← ADD
async def get_audiobook_stream(...):
    ...
```

---

## PHASE 3: TESTING (2-3 hours)

### Add Security Test Suite

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/tests/test_audiobooks.py`

**Add New Test Class**:
```python
class TestAudiobooksSecurityValidation:
    """Tests for security validations on audiobook endpoints."""

    async def test_create_with_invalid_stream_url(self, client, admin_user, auth_token):
        """Test that invalid stream URL is rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "https://internal.private/stream.m3u8",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "domain not in allowed list" in response.json()["detail"]

    async def test_create_with_localhost_url(self, client, admin_user, auth_token):
        """Test that localhost URLs are rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "http://127.0.0.1:8000/stream.m3u8",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_create_with_cloud_metadata_url(self, client, admin_user, auth_token):
        """Test that cloud metadata service URLs are rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "http://169.254.169.254/latest/meta-data/",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_update_with_invalid_stream_url(self, client, admin_user, sample_audiobook, auth_token):
        """Test that stream URL update validation works."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "stream_url": "https://127.0.0.1:8000/stream.m3u8",
        }
        response = client.patch(
            f"/api/v1/admin/audiobooks/{sample_audiobook.id}",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_create_with_invalid_drm_key_id(self, client, admin_user, auth_token):
        """Test that invalid DRM key ID is rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "https://cdn.example.com/stream.m3u8",
            "drm_key_id": "'; DROP COLLECTION; --",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_create_with_invalid_isbn(self, client, admin_user, auth_token):
        """Test that invalid ISBN format is rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "https://cdn.example.com/stream.m3u8",
            "isbn": "invalid-isbn-format!@#",
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_create_with_valid_isbn(self, client, admin_user, auth_token):
        """Test that valid ISBN is accepted."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test Book",
            "author": "Test Author",
            "stream_url": "https://cdn.example.com/stream.m3u8",
            "isbn": "978-0-13-110362-7",  # Valid ISBN-13
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["isbn"] == "978-0-13-110362-7"

    async def test_create_with_invalid_audio_quality(self, client, admin_user, auth_token):
        """Test that invalid audio quality is rejected."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        payload = {
            "title": "Test",
            "author": "Test",
            "stream_url": "https://cdn.example.com/stream.m3u8",
            "audio_quality": "ultra-high",  # Invalid
        }
        response = client.post(
            "/api/v1/admin/audiobooks",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_create_with_valid_audio_quality(self, client, admin_user, auth_token):
        """Test that valid audio quality values are accepted."""
        headers = {"Authorization": f"Bearer {auth_token(admin_user)}"}
        for quality in ["low", "standard", "high", "high-fidelity"]:
            payload = {
                "title": f"Test - {quality}",
                "author": "Test",
                "stream_url": "https://cdn.example.com/stream.m3u8",
                "audio_quality": quality,
            }
            response = client.post(
                "/api/v1/admin/audiobooks",
                json=payload,
                headers=headers,
            )
            assert response.status_code == status.HTTP_201_CREATED


class TestAudiobooksRateLimiting:
    """Tests for rate limiting on audiobook endpoints."""

    async def test_rate_limiting_create(self, client, admin_user, auth_token):
        """Test that create endpoint is rate limited."""
        # This would require mock rate limiter or real slowapi testing
        # Implementation depends on test framework setup
        pass

    async def test_rate_limiting_delete(self, client, admin_user, auth_token):
        """Test that delete endpoint is rate limited (destructive ops)."""
        pass
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: CRITICAL (40 minutes)
- [ ] Import `validate_audio_url` in `admin_audiobooks_crud.py`
- [ ] Add SSRF validation to `create_audiobook()` function
- [ ] Add SSRF validation to `update_audiobook()` function
- [ ] Add pattern validation to `drm_key_id` in schemas
- [ ] Verify ALLOWED_AUDIO_DOMAINS configured in environment
- [ ] Run Phase 1 tests
- [ ] Code review Phase 1 changes

### Phase 2: HIGH (1.5 hours)
- [ ] Create `AudioQualityEnum` in schemas
- [ ] Update `audio_quality` fields to use enum
- [ ] Add pattern validation to `isbn` fields
- [ ] Add pattern validation to `stream_url` in schemas
- [ ] Add rate limit configs to `rate_limiter.py`
- [ ] Apply `@limiter.limit()` decorators to endpoints
- [ ] Run Phase 2 tests
- [ ] Code review Phase 2 changes

### Phase 3: TESTING (2-3 hours)
- [ ] Add `TestAudiobooksSecurityValidation` class
- [ ] Add `TestAudiobooksRateLimiting` class
- [ ] Run complete test suite
- [ ] Verify 87%+ test coverage
- [ ] Perform manual SSRF testing
- [ ] Verify rate limiting works
- [ ] Code review test changes

### Final Verification
- [ ] All tests passing
- [ ] No SSRF vulnerabilities detected
- [ ] Rate limiting properly applied
- [ ] Input validation comprehensive
- [ ] Code review completed
- [ ] Security approval obtained
- [ ] Ready for production deployment

---

## ROLLBACK PLAN

If issues discovered:
1. Revert changes to `admin_audiobooks_crud.py`
2. Revert changes to `audiobook_schemas.py`
3. Revert changes to `rate_limiter.py`
4. Restore from Git: `git checkout HEAD -- app/api/routes/ app/core/rate_limiter.py`

---

## VERIFICATION COMMANDS

```bash
# Run all audiobook tests
pytest tests/test_audiobooks.py -v

# Run security validation tests only
pytest tests/test_audiobooks.py::TestAudiobooksSecurityValidation -v

# Check test coverage
pytest tests/test_audiobooks.py --cov=app.api.routes.audiobook --cov-report=html

# Run type checking
mypy app/api/routes/admin_audiobooks_crud.py
mypy app/api/routes/audiobook_schemas.py

# Run linting
black --check app/api/routes/admin_audiobooks_crud.py
isort --check app/api/routes/admin_audiobooks_crud.py

# Start backend and test manually
poetry run python -m app.local_server
# Then use Postman or curl to test endpoints
```

---

## Sign-Off

**Implementation Date**: [TO BE FILLED]
**Completed By**: [Security Team]
**Review Date**: [TO BE FILLED]
**Approved By**: [Security Approver]

