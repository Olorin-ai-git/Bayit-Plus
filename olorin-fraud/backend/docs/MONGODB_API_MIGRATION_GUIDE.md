# MongoDB API Endpoints Migration Guide

## Overview

This guide provides patterns and examples for migrating FastAPI endpoint handlers from SQLAlchemy/PostgreSQL to MongoDB repositories.

**Target Audience**: Backend developers updating API endpoints

**Prerequisites**:
- Read [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md)
- Understand MongoDB repository pattern
- Familiar with FastAPI dependency injection

---

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Dependency Injection Changes](#dependency-injection-changes)
3. [Endpoint Patterns](#endpoint-patterns)
4. [Error Handling](#error-handling)
5. [Request/Response Models](#requestresponse-models)
6. [Testing Endpoints](#testing-endpoints)
7. [Common Pitfalls](#common-pitfalls)
8. [Migration Checklist](#migration-checklist)

---

## Migration Strategy

### Phased Approach

Update endpoints in this order:

1. **Read-only endpoints first** (GET requests)
   - Lowest risk
   - Easy to validate
   - No data mutations

2. **Simple write endpoints** (POST, PUT, DELETE)
   - Single document operations
   - Straightforward validation

3. **Complex endpoints** (aggregations, joins)
   - Multiple collections
   - Complex business logic
   - Requires aggregation pipelines

### Testing Strategy

For each updated endpoint:

1. Update endpoint code
2. Update integration tests
3. Run tests locally
4. Deploy to staging
5. Run smoke tests
6. Validate in production (canary)

---

## Dependency Injection Changes

### Before (SQLAlchemy)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.persistence.database import get_db

router = APIRouter()

@router.get("/investigations/{investigation_id}")
def get_investigation(
    investigation_id: str,
    db: Session = Depends(get_db)
):
    investigation = db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")

    return investigation
```

### After (MongoDB)

```python
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.persistence.mongodb import get_mongodb
from app.persistence.repositories import InvestigationRepository

router = APIRouter()

@router.get("/investigations/{investigation_id}")
async def get_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    repository = InvestigationRepository(db)

    investigation = await repository.find_by_id(
        investigation_id,
        tenant_id=None  # Or get from auth context
    )

    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")

    return investigation.dict()
```

### Key Changes

1. **Import changes**:
   - Remove: `sqlalchemy.orm.Session`, `app.persistence.database.get_db`
   - Add: `motor.motor_asyncio.AsyncIOMotorDatabase`, `app.persistence.mongodb.get_mongodb`
   - Add: Repository imports

2. **Async/await**:
   - Add `async` before `def`
   - Add `await` before repository calls

3. **Dependency**:
   - Change: `db: Session = Depends(get_db)`
   - To: `db: AsyncIOMotorDatabase = Depends(get_mongodb)`

4. **Repository instantiation**:
   - Create repository from database: `InvestigationRepository(db)`

5. **Return value**:
   - Pydantic models need `.dict()` for JSON serialization
   - Or use `response_model` in decorator

---

## Endpoint Patterns

### Pattern 1: Simple GET (Single Document)

#### Before
```python
@router.get("/investigations/{investigation_id}")
def get_investigation(
    investigation_id: str,
    db: Session = Depends(get_db)
):
    investigation = db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return investigation
```

#### After
```python
@router.get("/investigations/{investigation_id}")
async def get_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)  # From auth
):
    repository = InvestigationRepository(db)

    investigation = await repository.find_by_id(
        investigation_id,
        tenant_id=tenant_id
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation {investigation_id} not found"
        )

    return investigation.dict()
```

---

### Pattern 2: List GET (Multiple Documents)

#### Before
```python
@router.get("/investigations/")
def list_investigations(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    investigations = db.query(InvestigationState).filter(
        InvestigationState.user_id == user_id
    ).offset(skip).limit(limit).all()

    return investigations
```

#### After
```python
@router.get("/investigations/")
async def list_investigations(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)

    investigations = await repository.find_by_user(
        user_id=user_id,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit
    )

    return [inv.dict() for inv in investigations]
```

**Key Points**:
- Pagination parameters remain the same
- Repository handles skip/limit
- Convert list of Pydantic models to dicts

---

### Pattern 3: POST (Create)

#### Before
```python
@router.post("/investigations/")
def create_investigation(
    data: InvestigationCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investigation = InvestigationState(
        investigation_id=str(uuid.uuid4()),
        user_id=user_id,
        lifecycle_stage="CREATED",
        status="PENDING",
        settings=data.dict(),
        created_at=datetime.utcnow()
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return investigation
```

#### After
```python
@router.post("/investigations/")
async def create_investigation(
    data: InvestigationCreateRequest,
    user_id: str = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    repository = InvestigationRepository(db)

    investigation = Investigation(
        investigation_id=str(uuid.uuid4()),
        user_id=user_id,
        tenant_id=tenant_id,
        lifecycle_stage=InvestigationLifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        settings=InvestigationSettings(**data.dict()),
        version=1,
        created_at=datetime.utcnow()
    )

    created = await repository.create(investigation)

    return created.dict()
```

**Key Points**:
- No `db.commit()` needed (MongoDB auto-commits)
- No `db.refresh()` needed (repository returns full document)
- Must set `version=1` for optimistic locking
- Must include `tenant_id`

---

### Pattern 4: PUT (Update)

#### Before
```python
@router.put("/investigations/{investigation_id}")
def update_investigation(
    investigation_id: str,
    data: InvestigationUpdateRequest,
    db: Session = Depends(get_db)
):
    investigation = db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")

    investigation.status = data.status
    investigation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(investigation)

    return investigation
```

#### After
```python
@router.put("/investigations/{investigation_id}")
async def update_investigation(
    investigation_id: str,
    data: InvestigationUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)

    # Get current document for version
    current = await repository.find_by_id(investigation_id, tenant_id)
    if not current:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation {investigation_id} not found"
        )

    # Update with optimistic locking
    updates = {
        "status": data.status.value,
        "updated_at": datetime.utcnow()
    }

    updated = await repository.update_with_version(
        investigation_id=investigation_id,
        current_version=current.version,
        updates=updates,
        tenant_id=tenant_id
    )

    if not updated:
        raise HTTPException(
            status_code=409,
            detail="Update conflict - document was modified by another request"
        )

    return updated.dict()
```

**Key Points**:
- Must use optimistic locking (`update_with_version`)
- Handle version conflicts (409 status)
- Get current version first
- Tenant isolation enforced

---

### Pattern 5: DELETE

#### Before
```python
@router.delete("/investigations/{investigation_id}")
def delete_investigation(
    investigation_id: str,
    db: Session = Depends(get_db)
):
    investigation = db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(investigation)
    db.commit()

    return {"status": "deleted"}
```

#### After
```python
@router.delete("/investigations/{investigation_id}")
async def delete_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)

    success = await repository.delete(investigation_id, tenant_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation {investigation_id} not found"
        )

    return {"status": "deleted", "investigation_id": investigation_id}
```

**Key Points**:
- Repository returns boolean for success
- Tenant isolation enforced
- Return confirmation message

---

### Pattern 6: Complex Queries (Filtering)

#### Before
```python
@router.get("/investigations/search")
def search_investigations(
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(InvestigationState)

    if status:
        query = query.filter(InvestigationState.status == status)

    if from_date:
        query = query.filter(InvestigationState.created_at >= from_date)

    return query.all()
```

#### After
```python
@router.get("/investigations/search")
async def search_investigations(
    status: Optional[InvestigationStatus] = None,
    from_date: Optional[datetime] = None,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)

    # Use repository method if available
    if status and not from_date:
        investigations = await repository.find_by_status(
            status=status,
            tenant_id=tenant_id
        )
    else:
        # Build custom query
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if status:
            query["status"] = status.value
        if from_date:
            query["created_at"] = {"$gte": from_date}

        cursor = repository.collection.find(query)
        docs = await cursor.to_list(length=100)
        investigations = [Investigation(**doc) for doc in docs]

    return [inv.dict() for inv in investigations]
```

**Key Points**:
- Use repository methods when available
- Build MongoDB query dict for custom filters
- Convert cursor results to Pydantic models
- Always include tenant_id in queries

---

### Pattern 7: Aggregations

#### Before
```python
@router.get("/investigations/stats")
def get_investigation_stats(
    user_id: str,
    db: Session = Depends(get_db)
):
    from sqlalchemy import func

    stats = db.query(
        InvestigationState.status,
        func.count(InvestigationState.id).label('count')
    ).filter(
        InvestigationState.user_id == user_id
    ).group_by(InvestigationState.status).all()

    return [{"status": row.status, "count": row.count} for row in stats]
```

#### After
```python
@router.get("/investigations/stats")
async def get_investigation_stats(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)

    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                **({"tenant_id": tenant_id} if tenant_id else {})
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "status": "$_id",
                "count": 1
            }
        }
    ]

    cursor = repository.collection.aggregate(pipeline)
    results = await cursor.to_list(length=None)

    return results
```

**Key Points**:
- Use MongoDB aggregation pipeline
- Match stage for filtering
- Group stage for aggregation
- Project stage for output shape
- Always include tenant_id in $match

---

## Error Handling

### HTTP Exception Mapping

```python
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError, PyMongoError

@router.post("/investigations/")
async def create_investigation(
    data: InvestigationCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    repository = InvestigationRepository(db)

    try:
        investigation = Investigation(...)
        created = await repository.create(investigation)
        return created.dict()

    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Investigation with this ID already exists"
        )

    except PyMongoError as e:
        logger.error(f"MongoDB error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database error occurred"
        )

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )
```

### Common Error Codes

| HTTP Code | MongoDB Error | Description |
|-----------|---------------|-------------|
| 404 | Document not found | `find_one` returns None |
| 409 | DuplicateKeyError | Unique index violation |
| 409 | Version conflict | Optimistic locking failed |
| 500 | PyMongoError | Database connection/query error |
| 503 | ServerSelectionTimeout | Cannot connect to MongoDB |

---

## Request/Response Models

### Response Model Configuration

Use FastAPI's `response_model` to avoid manual `.dict()` calls:

```python
from fastapi import APIRouter
from app.models.mongodb.investigation import Investigation
from app.schemas.investigation_response import InvestigationResponse

router = APIRouter()

@router.get(
    "/investigations/{investigation_id}",
    response_model=InvestigationResponse  # Automatic serialization
)
async def get_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb)
):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(investigation_id)

    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")

    return investigation  # No .dict() needed!
```

### Response Model Example

```python
# app/schemas/investigation_response.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class InvestigationResponse(BaseModel):
    """Response model for investigation endpoints."""

    investigation_id: str = Field(..., description="Unique investigation ID")
    user_id: str = Field(..., description="User who created investigation")
    tenant_id: str = Field(..., description="Tenant ID")
    lifecycle_stage: str = Field(..., description="Current lifecycle stage")
    status: str = Field(..., description="Current status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    version: int = Field(..., description="Document version for optimistic locking")

    class Config:
        from_attributes = True  # Allow ORM mode (Pydantic v2)
        # orm_mode = True  # For Pydantic v1
```

---

## Testing Endpoints

### Integration Test Example

```python
# test/integration/api/test_investigation_api.py

import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_investigation(
    mongodb_client,
    test_mongodb,
    auth_headers
):
    """Test investigation creation endpoint."""

    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create investigation
        response = await client.post(
            "/api/v1/investigations/",
            json={
                "entity_type": "user",
                "entity_value": "test@example.com",
                "time_range": {
                    "from": "2024-01-01T00:00:00Z",
                    "to": "2024-01-31T23:59:59Z"
                }
            },
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert "investigation_id" in data
        assert data["user_id"] == "test-user"
        assert data["status"] == "PENDING"

        investigation_id = data["investigation_id"]

        # Verify investigation exists
        response = await client.get(
            f"/api/v1/investigations/{investigation_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["investigation_id"] == investigation_id


@pytest.mark.asyncio
@pytest.mark.integration
async def test_list_investigations_pagination(
    mongodb_client,
    test_mongodb,
    investigation_repository,
    auth_headers
):
    """Test investigation list pagination."""

    # Create 25 test investigations
    for i in range(25):
        inv = Investigation(
            investigation_id=f"test-inv-{i}",
            user_id="test-user",
            tenant_id="test-tenant",
            lifecycle_stage=InvestigationLifecycleStage.CREATED,
            status=InvestigationStatus.PENDING,
            version=1,
            created_at=datetime.utcnow()
        )
        await investigation_repository.create(inv)

    async with AsyncClient(app=app, base_url="http://test") as client:
        # First page
        response = await client.get(
            "/api/v1/investigations/?skip=0&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10

        # Second page
        response = await client.get(
            "/api/v1/investigations/?skip=10&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10

        # Third page (partial)
        response = await client.get(
            "/api/v1/investigations/?skip=20&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
```

### Test Fixtures

```python
# test/integration/conftest.py

@pytest_asyncio.fixture
async def auth_headers(test_user):
    """Generate authentication headers for test requests."""
    token = create_test_token(test_user["user_id"])
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def test_user():
    """Create test user data."""
    return {
        "user_id": "test-user",
        "email": "test@example.com",
        "tenant_id": "test-tenant"
    }
```

---

## Common Pitfalls

### 1. Forgetting `async`/`await`

❌ **Wrong**:
```python
@router.get("/investigations/{id}")
def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = repository.find_by_id(id)  # Missing await!
    return investigation
```

✅ **Correct**:
```python
@router.get("/investigations/{id}")
async def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id)
    return investigation.dict()
```

### 2. Not Handling Version Conflicts

❌ **Wrong**:
```python
@router.put("/investigations/{id}")
async def update_investigation(id: str, data: UpdateRequest, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    # Direct update without version check
    updates = {"status": data.status}
    await repository.collection.update_one({"investigation_id": id}, {"$set": updates})
    return {"status": "updated"}
```

✅ **Correct**:
```python
@router.put("/investigations/{id}")
async def update_investigation(id: str, data: UpdateRequest, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    current = await repository.find_by_id(id)
    if not current:
        raise HTTPException(status_code=404, detail="Not found")

    updates = {"status": data.status.value}
    updated = await repository.update_with_version(id, current.version, updates)

    if not updated:
        raise HTTPException(status_code=409, detail="Version conflict")

    return updated.dict()
```

### 3. Missing Tenant Isolation

❌ **Wrong**:
```python
@router.get("/investigations/{id}")
async def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id)  # No tenant_id!
    return investigation.dict()
```

✅ **Correct**:
```python
@router.get("/investigations/{id}")
async def get_investigation(
    id: str,
    db = Depends(get_mongodb),
    tenant_id: Optional[str] = Depends(get_tenant_id)
):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id, tenant_id=tenant_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")
    return investigation.dict()
```

### 4. Not Converting Pydantic Models

❌ **Wrong**:
```python
@router.get("/investigations/{id}")
async def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id)
    return investigation  # Pydantic model - won't serialize properly!
```

✅ **Correct** (Option 1 - Manual):
```python
@router.get("/investigations/{id}")
async def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")
    return investigation.dict()
```

✅ **Correct** (Option 2 - response_model):
```python
@router.get("/investigations/{id}", response_model=InvestigationResponse)
async def get_investigation(id: str, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = await repository.find_by_id(id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Not found")
    return investigation  # response_model handles serialization
```

### 5. Not Handling MongoDB-Specific Errors

❌ **Wrong**:
```python
@router.post("/investigations/")
async def create_investigation(data: CreateRequest, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)
    investigation = Investigation(...)
    created = await repository.create(investigation)
    return created.dict()
    # What if duplicate key? Connection error? No error handling!
```

✅ **Correct**:
```python
from pymongo.errors import DuplicateKeyError, PyMongoError

@router.post("/investigations/")
async def create_investigation(data: CreateRequest, db = Depends(get_mongodb)):
    repository = InvestigationRepository(db)

    try:
        investigation = Investigation(...)
        created = await repository.create(investigation)
        return created.dict()

    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Investigation already exists")

    except PyMongoError as e:
        logger.error(f"MongoDB error: {e}")
        raise HTTPException(status_code=500, detail="Database error")
```

---

## Migration Checklist

Use this checklist for each endpoint:

### Pre-Migration
- [ ] Read endpoint code and understand current behavior
- [ ] Identify which models/tables are accessed
- [ ] Identify corresponding MongoDB repositories
- [ ] Check if repository has required methods
- [ ] Add missing repository methods if needed

### Code Changes
- [ ] Add `async` to function definition
- [ ] Change dependency from `Session` to `AsyncIOMotorDatabase`
- [ ] Add `tenant_id` parameter if missing
- [ ] Create repository instance from database
- [ ] Replace SQLAlchemy queries with repository calls
- [ ] Add `await` before all async operations
- [ ] Update error handling for MongoDB errors
- [ ] Handle optimistic locking for updates
- [ ] Convert return values (.dict() or response_model)
- [ ] Remove `db.commit()` and `db.refresh()` calls

### Testing
- [ ] Update integration tests
- [ ] Add test cases for new error conditions
- [ ] Test with real MongoDB (testcontainer)
- [ ] Test pagination if applicable
- [ ] Test filtering if applicable
- [ ] Test tenant isolation
- [ ] Test version conflicts (for updates)

### Documentation
- [ ] Update API documentation (OpenAPI/Swagger)
- [ ] Update request/response examples
- [ ] Document any breaking changes
- [ ] Update error response documentation

### Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Verify metrics (latency, errors)
- [ ] Deploy to production (canary)
- [ ] Monitor closely for 24 hours

---

## Next Steps

1. **Prioritize endpoints**: Start with read-only, then simple writes, then complex
2. **Update in batches**: Group related endpoints (e.g., all investigation endpoints)
3. **Test thoroughly**: Each batch should have full test coverage
4. **Monitor metrics**: Watch for performance regressions
5. **Document issues**: Track any problems encountered

---

## Support

### Internal Resources
- [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md)
- [MongoDB Configuration Guide](./MONGODB_CONFIGURATION.md)
- Repository code: `app/persistence/repositories/`

### Questions?
- Slack: #olorin-backend
- Code reviews: GitHub pull requests
- On-call: PagerDuty rotation

---

**Last Updated**: 2026-01-15
