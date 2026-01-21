# MongoDB Migration - Reference Implementation

## Overview

This document provides a **complete reference implementation** showing how to migrate the Investigation State router from PostgreSQL to MongoDB. Use this as a concrete example when migrating other routers.

**Source File**: `app/router/investigation_state_router.py`

**Target**: MongoDB-based implementation using InvestigationRepository

---

## Table of Contents

1. [File Structure](#file-structure)
2. [Complete Before/After Comparison](#complete-beforeafter-comparison)
3. [Endpoint-by-Endpoint Migration](#endpoint-by-endpoint-migration)
4. [Service Layer Updates](#service-layer-updates)
5. [Testing the Migration](#testing-the-migration)

---

## File Structure

### Before (PostgreSQL)
```
app/
├── router/
│   └── investigation_state_router.py      # FastAPI router (SQLAlchemy)
├── service/
│   └── investigation_state_service.py     # Business logic (SQLAlchemy)
└── models/
    └── investigation_state.py             # SQLAlchemy ORM model
```

### After (MongoDB)
```
app/
├── router/
│   └── investigation_state_router.py      # FastAPI router (MongoDB) - UPDATED
├── service/
│   └── investigation_state_service.py     # Business logic (MongoDB) - UPDATED
├── models/
│   └── mongodb/
│       └── investigation.py               # Pydantic model - ALREADY CREATED
└── persistence/
    └── repositories/
        └── investigation_repository.py    # MongoDB repository - ALREADY CREATED
```

---

## Complete Before/After Comparison

### Router Imports

#### Before (SQLAlchemy)
```python
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.schemas.investigation_state import (
    InvestigationStateCreate,
    InvestigationStateResponse,
    InvestigationStateUpdate,
    PaginatedInvestigations,
    InvestigationStatus,
)
from app.security.auth import User, require_read_or_dev, require_write_or_dev
from app.service.investigation_state_service import InvestigationStateService
```

#### After (MongoDB)
```python
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.persistence.mongodb import get_mongodb
from app.schemas.investigation_state import (
    InvestigationStateCreate,
    InvestigationStateResponse,
    InvestigationStateUpdate,
    PaginatedInvestigations,
    InvestigationStatus,
)
from app.security.auth import User, require_read_or_dev, require_write_or_dev, get_tenant_id
from app.service.investigation_state_service import InvestigationStateService
```

**Key Changes**:
- Replace `sqlalchemy.orm.Session` → `motor.motor_asyncio.AsyncIOMotorDatabase`
- Replace `app.persistence.database.get_db` → `app.persistence.mongodb.get_mongodb`
- Add `get_tenant_id` for multi-tenancy

---

### Endpoint 1: List Investigations

#### Before (SQLAlchemy)
```python
@router.get(
    "/",
    response_model=PaginatedInvestigations,
    summary="List investigation states",
)
async def list_investigation_states(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[InvestigationStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> PaginatedInvestigations:
    """Get paginated investigation states."""
    service = InvestigationStateService(db)

    return service.get_states(
        user_id=None,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )
```

#### After (MongoDB)
```python
@router.get(
    "/",
    response_model=PaginatedInvestigations,
    summary="List investigation states",
)
async def list_investigation_states(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[InvestigationStatus] = None,
    search: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_read_or_dev),
    tenant_id: Optional[str] = Depends(get_tenant_id),
) -> PaginatedInvestigations:
    """Get paginated investigation states."""
    service = InvestigationStateService(db)

    return await service.get_states(
        user_id=None,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
        tenant_id=tenant_id,
    )
```

**Changes**:
1. Change dependency: `db: Session = Depends(get_db)` → `db: AsyncIOMotorDatabase = Depends(get_mongodb)`
2. Add tenant_id parameter: `tenant_id: Optional[str] = Depends(get_tenant_id)`
3. Add `await` before service call
4. Pass `tenant_id` to service method

---

### Endpoint 2: Create Investigation

#### Before (SQLAlchemy)
```python
@router.post(
    "/",
    response_model=InvestigationStateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create investigation state",
)
async def create_investigation_state(
    data: InvestigationStateCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_or_dev),
) -> InvestigationStateResponse:
    """Create investigation state with automatic execution trigger."""
    service = InvestigationStateService(db)
    state = await service.create_state(
        user_id=current_user.username,
        data=data,
        background_tasks=background_tasks
    )

    response.headers["ETag"] = _generate_etag(state)
    response.headers["Location"] = (
        f"/api/v1/investigation-state/{state.investigation_id}"
    )

    return state
```

#### After (MongoDB)
```python
@router.post(
    "/",
    response_model=InvestigationStateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create investigation state",
)
async def create_investigation_state(
    data: InvestigationStateCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Create investigation state with automatic execution trigger."""
    service = InvestigationStateService(db)
    state = await service.create_state(
        user_id=current_user.username,
        data=data,
        background_tasks=background_tasks,
        tenant_id=tenant_id,
    )

    response.headers["ETag"] = _generate_etag(state)
    response.headers["Location"] = (
        f"/api/v1/investigation-state/{state.investigation_id}"
    )

    return state
```

**Changes**:
1. Change dependency: `db: Session` → `db: AsyncIOMotorDatabase`
2. Add tenant_id parameter: `tenant_id: str = Depends(get_tenant_id)` (required for create)
3. Pass `tenant_id` to service method

---

### Endpoint 3: Get Single Investigation

#### Before (SQLAlchemy)
```python
@router.get(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Get investigation state",
)
async def get_investigation_state(
    investigation_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> InvestigationStateResponse:
    """Get investigation state with conditional GET support."""
    from app.service.logging import get_bridge_logger
    logger = get_bridge_logger(__name__)

    # Reject reserved route names
    reserved_names = ["visualization", "charts", "maps", ...]
    if investigation_id.lower() in reserved_names:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation state not found: {investigation_id}",
        )

    service = InvestigationStateService(db)

    # Get state with authorization check
    state = service.get_state_with_auth(
        investigation_id=investigation_id,
        user_id=current_user.username
    )

    # Set ETag
    if not state.etag:
        state.etag = _generate_etag(state)

    # Check If-None-Match header
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match == state.etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return state

    response.headers["ETag"] = state.etag
    return state
```

#### After (MongoDB)
```python
@router.get(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Get investigation state",
)
async def get_investigation_state(
    investigation_id: str,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_read_or_dev),
    tenant_id: Optional[str] = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Get investigation state with conditional GET support."""
    from app.service.logging import get_bridge_logger
    logger = get_bridge_logger(__name__)

    # Reject reserved route names
    reserved_names = ["visualization", "charts", "maps", ...]
    if investigation_id.lower() in reserved_names:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation state not found: {investigation_id}",
        )

    service = InvestigationStateService(db)

    # Get state with authorization check
    state = await service.get_state_with_auth(
        investigation_id=investigation_id,
        user_id=current_user.username,
        tenant_id=tenant_id,
    )

    # Set ETag
    if not state.etag:
        state.etag = _generate_etag(state)

    # Check If-None-Match header
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match == state.etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return state

    response.headers["ETag"] = state.etag
    return state
```

**Changes**:
1. Change dependency: `db: Session` → `db: AsyncIOMotorDatabase`
2. Add tenant_id parameter
3. Add `await` before `service.get_state_with_auth()`
4. Pass `tenant_id` to service method

---

### Endpoint 4: Update Investigation

#### Before (SQLAlchemy)
```python
@router.put(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Update investigation state",
)
async def update_investigation_state(
    investigation_id: str,
    data: InvestigationStateUpdate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_or_dev),
) -> InvestigationStateResponse:
    """Update investigation state with optimistic locking."""
    service = InvestigationStateService(db)

    # Update with version check
    state = service.update_state(
        investigation_id=investigation_id,
        data=data,
        user_id=current_user.username,
    )

    response.headers["ETag"] = _generate_etag(state)
    return state
```

#### After (MongoDB)
```python
@router.put(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Update investigation state",
)
async def update_investigation_state(
    investigation_id: str,
    data: InvestigationStateUpdate,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: Optional[str] = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Update investigation state with optimistic locking."""
    service = InvestigationStateService(db)

    # Update with version check
    state = await service.update_state(
        investigation_id=investigation_id,
        data=data,
        user_id=current_user.username,
        tenant_id=tenant_id,
    )

    response.headers["ETag"] = _generate_etag(state)
    return state
```

**Changes**:
1. Change dependency: `db: Session` → `db: AsyncIOMotorDatabase`
2. Add tenant_id parameter
3. Add `await` before service call
4. Pass `tenant_id` to service method

---

### Endpoint 5: Delete Investigation

#### Before (SQLAlchemy)
```python
@router.delete(
    "/{investigation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete investigation state",
)
async def delete_investigation_state(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_or_dev),
):
    """Delete investigation state."""
    service = InvestigationStateService(db)

    service.delete_state(
        investigation_id=investigation_id,
        user_id=current_user.username,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

#### After (MongoDB)
```python
@router.delete(
    "/{investigation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete investigation state",
)
async def delete_investigation_state(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: Optional[str] = Depends(get_tenant_id),
):
    """Delete investigation state."""
    service = InvestigationStateService(db)

    await service.delete_state(
        investigation_id=investigation_id,
        user_id=current_user.username,
        tenant_id=tenant_id,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

**Changes**:
1. Change dependency: `db: Session` → `db: AsyncIOMotorDatabase`
2. Add tenant_id parameter
3. Add `await` before service call
4. Pass `tenant_id` to service method

---

## Service Layer Updates

The service layer (`app/service/investigation_state_service.py`) also needs updates:

### Service Constructor

#### Before (SQLAlchemy)
```python
class InvestigationStateService:
    """Service for managing investigation states."""

    def __init__(self, db: Session):
        self.db = db
```

#### After (MongoDB)
```python
from app.persistence.repositories import InvestigationRepository

class InvestigationStateService:
    """Service for managing investigation states."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = InvestigationRepository(db)
```

### Service Methods

#### Before (SQLAlchemy) - Get State
```python
def get_state_with_auth(
    self,
    investigation_id: str,
    user_id: str,
) -> InvestigationStateResponse:
    """Get investigation state with authorization check."""
    state = self.db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id,
        InvestigationState.user_id == user_id,
    ).first()

    if not state:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation {investigation_id} not found"
        )

    return InvestigationStateResponse.from_orm(state)
```

#### After (MongoDB) - Get State
```python
async def get_state_with_auth(
    self,
    investigation_id: str,
    user_id: str,
    tenant_id: Optional[str] = None,
) -> InvestigationStateResponse:
    """Get investigation state with authorization check."""
    investigation = await self.repository.find_by_id(
        investigation_id,
        tenant_id=tenant_id
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation {investigation_id} not found"
        )

    # Check authorization
    if investigation.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this investigation"
        )

    return InvestigationStateResponse(**investigation.dict())
```

---

## Testing the Migration

### Integration Test Example

```python
# test/integration/api/test_investigation_state_api_mongodb.py

import pytest
from httpx import AsyncClient
from datetime import datetime

from app.main import app
from app.models.mongodb.investigation import Investigation, InvestigationLifecycleStage, InvestigationStatus


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.mongodb
async def test_list_investigations_mongodb(
    test_mongodb,
    investigation_repository,
    auth_headers,
):
    """Test listing investigations with MongoDB."""
    # Create test investigations
    for i in range(5):
        inv = Investigation(
            investigation_id=f"test-inv-{i}",
            user_id="test-user",
            tenant_id="test-tenant",
            lifecycle_stage=InvestigationLifecycleStage.CREATED,
            status=InvestigationStatus.PENDING,
            version=1,
            created_at=datetime.utcnow(),
        )
        await investigation_repository.create(inv)

    # Test listing
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/investigation-state/?page=1&page_size=10",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 5


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.mongodb
async def test_create_investigation_mongodb(
    test_mongodb,
    auth_headers,
):
    """Test creating investigation with MongoDB."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/investigation-state/",
            json={
                "entity_type": "user",
                "entity_value": "test@example.com",
                "investigation_name": "Test Investigation",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert "investigation_id" in data
        assert data["status"] == "PENDING"
        assert "ETag" in response.headers


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.mongodb
async def test_get_investigation_etag_mongodb(
    test_mongodb,
    investigation_repository,
    auth_headers,
):
    """Test getting investigation with ETag support."""
    # Create test investigation
    inv = Investigation(
        investigation_id="test-etag-inv",
        user_id="test-user",
        tenant_id="test-tenant",
        lifecycle_stage=InvestigationLifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
        created_at=datetime.utcnow(),
    )
    await investigation_repository.create(inv)

    async with AsyncClient(app=app, base_url="http://test") as client:
        # First request - get ETag
        response = await client.get(
            "/api/v1/investigation-state/test-etag-inv",
            headers=auth_headers,
        )

        assert response.status_code == 200
        etag = response.headers.get("ETag")
        assert etag is not None

        # Second request with If-None-Match - should get 304
        response = await client.get(
            "/api/v1/investigation-state/test-etag-inv",
            headers={**auth_headers, "If-None-Match": etag},
        )

        assert response.status_code == 304


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.mongodb
async def test_update_investigation_optimistic_locking_mongodb(
    test_mongodb,
    investigation_repository,
    auth_headers,
):
    """Test update with optimistic locking."""
    # Create test investigation
    inv = Investigation(
        investigation_id="test-update-inv",
        user_id="test-user",
        tenant_id="test-tenant",
        lifecycle_stage=InvestigationLifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
        created_at=datetime.utcnow(),
    )
    await investigation_repository.create(inv)

    async with AsyncClient(app=app, base_url="http://test") as client:
        # Update investigation
        response = await client.put(
            "/api/v1/investigation-state/test-update-inv",
            json={
                "status": "RUNNING",
                "version": 1,  # Current version
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "RUNNING"
        assert data["version"] == 2  # Version incremented

        # Try to update with old version - should fail
        response = await client.put(
            "/api/v1/investigation-state/test-update-inv",
            json={
                "status": "COMPLETED",
                "version": 1,  # Old version
            },
            headers=auth_headers,
        )

        assert response.status_code == 409  # Version conflict
```

---

## Migration Checklist

Use this checklist when migrating the investigation state router:

### Router Updates
- [ ] Update imports (Session → AsyncIOMotorDatabase, get_db → get_mongodb)
- [ ] Add get_tenant_id import
- [ ] Update all endpoint dependencies
- [ ] Add tenant_id parameter to all endpoints
- [ ] Add `await` before all service calls
- [ ] Pass tenant_id to service methods
- [ ] Update error handling if needed

### Service Updates
- [ ] Update constructor (Session → AsyncIOMotorDatabase)
- [ ] Create repository instance in constructor
- [ ] Add `async` to all methods
- [ ] Replace SQLAlchemy queries with repository calls
- [ ] Add `await` before repository calls
- [ ] Add tenant_id parameter to all methods
- [ ] Pass tenant_id to repository methods
- [ ] Remove db.commit() and db.refresh() calls
- [ ] Update error handling for MongoDB errors

### Testing
- [ ] Create MongoDB integration tests
- [ ] Test all CRUD operations
- [ ] Test pagination
- [ ] Test filtering
- [ ] Test ETag support
- [ ] Test optimistic locking
- [ ] Test tenant isolation
- [ ] Test error cases

### Deployment
- [ ] Test in local development
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Monitor metrics
- [ ] Deploy to production (canary)

---

## Summary

This reference implementation demonstrates the complete migration pattern for the Investigation State router. The key changes are:

1. **Dependencies**: Session → AsyncIOMotorDatabase, get_db → get_mongodb
2. **Async/Await**: Add `async`/`await` throughout
3. **Repository Pattern**: Service uses repository instead of direct DB access
4. **Multi-Tenancy**: Add tenant_id parameter and pass through all layers
5. **Testing**: MongoDB testcontainers for integration tests

Use this pattern to migrate other routers in the application.

---

**Last Updated**: 2026-01-15

**Status**: Ready for implementation
