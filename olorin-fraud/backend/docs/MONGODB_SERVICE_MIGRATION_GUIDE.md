# MongoDB Service Layer Migration Guide

## Overview

This guide provides patterns for migrating service layer files from SQLAlchemy to MongoDB repositories.

## Migration Strategy

### Phase Approach

1. **Core Services First** - Migrate investigation_state_service.py and other core CRUD services
2. **Dependent Services** - Migrate services that depend on core services
3. **Background Services** - Migrate async/background task services
4. **Utility Services** - Migrate helper and utility services last

### Compatibility Layer

During migration, services can coexist:
- New services use MongoDB repositories directly
- Old services continue using SQLAlchemy (deprecated)
- Gradually phase out old services

## Conversion Patterns

### Pattern 1: Service Class Constructor

**Before (SQLAlchemy):**
```python
from sqlalchemy.orm import Session

class InvestigationStateService:
    def __init__(self, db: Session):
        self.db = db
```

**After (MongoDB):**
```python
from app.persistence.repositories import InvestigationRepository

class InvestigationStateService:
    def __init__(self, repository: InvestigationRepository):
        self.repository = repository
```

### Pattern 2: Create Operation

**Before (SQLAlchemy):**
```python
def create_state(self, user_id: str, data: InvestigationStateCreate):
    state = InvestigationState(
        investigation_id=investigation_id,
        user_id=user_id,
        settings_json=json.dumps(settings_dict),
        version=1,
    )
    self.db.add(state)
    self.db.commit()
    self.db.refresh(state)
    return state
```

**After (MongoDB):**
```python
async def create_state(self, user_id: str, data: InvestigationStateCreate):
    investigation = Investigation(
        investigation_id=investigation_id,
        user_id=user_id,
        settings=InvestigationSettings(**settings_dict),
        version=1,
    )
    created = await self.repository.create(investigation)
    return created
```

### Pattern 3: Query Operations

**Before (SQLAlchemy):**
```python
def get_by_id(self, investigation_id: str):
    return self.db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()
```

**After (MongoDB):**
```python
async def get_by_id(self, investigation_id: str, tenant_id: Optional[str] = None):
    return await self.repository.find_by_id(investigation_id, tenant_id=tenant_id)
```

### Pattern 4: Update Operations

**Before (SQLAlchemy):**
```python
def update_state(self, investigation_id: str, updates: dict):
    state = self.db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not state:
        return None

    for key, value in updates.items():
        setattr(state, key, value)

    self.db.commit()
    self.db.refresh(state)
    return state
```

**After (MongoDB):**
```python
async def update_state(
    self,
    investigation_id: str,
    current_version: int,
    updates: dict,
    tenant_id: Optional[str] = None,
):
    return await self.repository.update_with_version(
        investigation_id,
        current_version=current_version,
        updates=updates,
        tenant_id=tenant_id,
    )
```

### Pattern 5: List/Filter Operations

**Before (SQLAlchemy):**
```python
def list_by_user(self, user_id: str, limit: int = 100):
    return self.db.query(InvestigationState).filter(
        InvestigationState.user_id == user_id
    ).order_by(InvestigationState.created_at.desc()).limit(limit).all()
```

**After (MongoDB):**
```python
async def list_by_user(
    self,
    user_id: str,
    tenant_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    return await self.repository.find_by_user(
        user_id, tenant_id=tenant_id, limit=limit, skip=skip
    )
```

### Pattern 6: Delete Operations

**Before (SQLAlchemy):**
```python
def delete_state(self, investigation_id: str):
    state = self.db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if state:
        self.db.delete(state)
        self.db.commit()
        return True
    return False
```

**After (MongoDB):**
```python
async def delete_state(
    self, investigation_id: str, tenant_id: Optional[str] = None
):
    return await self.repository.delete(investigation_id, tenant_id=tenant_id)
```

## Data Model Changes

### JSON Fields → Embedded Documents

**Before (SQLAlchemy):**
```python
settings_json: str  # JSON string
progress_json: str  # JSON string

# Usage:
settings_dict = json.loads(state.settings_json)
```

**After (MongoDB):**
```python
settings: Optional[InvestigationSettings]  # Pydantic model
progress: Optional[InvestigationProgress]  # Pydantic model

# Usage:
settings_dict = investigation.settings.dict() if investigation.settings else {}
```

### Type Conversions

| SQLAlchemy Type | MongoDB/Pydantic Type |
|----------------|----------------------|
| `String` | `str` |
| `Integer` | `int` |
| `Float` | `float` |
| `Boolean` | `bool` |
| `DateTime` | `datetime` |
| `JSON` column | Embedded Pydantic model |
| `Text` | `str` |
| `Enum` | Pydantic `Enum` |

## Multi-Tenancy

### Add Tenant ID Everywhere

All repository operations should include `tenant_id` for data isolation:

```python
# Always pass tenant_id when available
investigation = await self.repository.find_by_id(
    investigation_id,
    tenant_id=user_tenant_id  # From auth context
)
```

## Async/Await Conversion

### Function Signatures

All service methods that access database must become `async`:

**Before:**
```python
def get_investigation(self, investigation_id: str):
    return self.db.query(...).first()
```

**After:**
```python
async def get_investigation(self, investigation_id: str):
    return await self.repository.find_by_id(investigation_id)
```

### Calling Async Methods

**Before:**
```python
investigation = service.get_investigation("inv-123")
```

**After:**
```python
investigation = await service.get_investigation("inv-123")
```

## Error Handling

### Duplicate Key Errors

**Before (SQLAlchemy):**
```python
from sqlalchemy.exc import IntegrityError

try:
    self.db.add(state)
    self.db.commit()
except IntegrityError:
    raise ValueError("Investigation already exists")
```

**After (MongoDB):**
```python
from pymongo.errors import DuplicateKeyError

try:
    await self.repository.create(investigation)
except DuplicateKeyError:
    raise ValueError("Investigation already exists")
```

### Not Found

**Before:**
```python
state = self.db.query(InvestigationState).filter(...).first()
if not state:
    raise NotFoundException("Investigation not found")
```

**After:**
```python
investigation = await self.repository.find_by_id(investigation_id)
if not investigation:
    raise NotFoundException("Investigation not found")
```

## Testing

### Update Service Tests

**Before:**
```python
def test_create_investigation(db_session):
    service = InvestigationStateService(db_session)
    result = service.create_state(user_id="user-123", data=...)
    assert result.investigation_id is not None
```

**After:**
```python
@pytest.mark.asyncio
async def test_create_investigation(investigation_repository):
    service = InvestigationStateService(investigation_repository)
    result = await service.create_state(user_id="user-123", data=...)
    assert result.investigation_id is not None
```

## Dependency Injection

### FastAPI Route Dependencies

**Before:**
```python
from app.persistence.database import get_db

@router.post("/investigations")
def create_investigation(
    data: InvestigationCreate,
    db: Session = Depends(get_db)
):
    service = InvestigationStateService(db)
    return service.create_state(user_id, data)
```

**After:**
```python
from app.persistence.mongodb import get_mongodb
from app.persistence.repositories import InvestigationRepository

async def get_investigation_repository():
    db = get_mongodb()
    return InvestigationRepository(db)

@router.post("/investigations")
async def create_investigation(
    data: InvestigationCreate,
    repository: InvestigationRepository = Depends(get_investigation_repository)
):
    service = InvestigationStateService(repository)
    return await service.create_state(user_id, data)
```

## Migration Checklist

For each service file:

- [ ] Update constructor to accept repository instead of Session
- [ ] Convert all methods to async
- [ ] Replace SQLAlchemy queries with repository methods
- [ ] Add tenant_id parameters where applicable
- [ ] Update JSON field handling to use Pydantic models
- [ ] Update error handling for MongoDB exceptions
- [ ] Update tests to use async/await
- [ ] Update dependency injection in routes
- [ ] Verify optimistic locking where needed
- [ ] Test with real MongoDB (integration tests)

## Common Pitfalls

### 1. Forgetting async/await

❌ **Wrong:**
```python
investigation = service.get_investigation("inv-123")
```

✅ **Correct:**
```python
investigation = await service.get_investigation("inv-123")
```

### 2. Not Passing Tenant ID

❌ **Wrong:**
```python
investigation = await repository.find_by_id(investigation_id)
```

✅ **Correct:**
```python
investigation = await repository.find_by_id(
    investigation_id, tenant_id=user_tenant_id
)
```

### 3. Using JSON Strings

❌ **Wrong:**
```python
settings = json.loads(investigation.settings)
```

✅ **Correct:**
```python
settings = investigation.settings  # Already a Pydantic model
settings_dict = settings.dict() if settings else {}
```

### 4. Ignoring Version in Updates

❌ **Wrong:**
```python
await repository.update(investigation_id, updates)
```

✅ **Correct:**
```python
await repository.update_with_version(
    investigation_id, current_version=investigation.version, updates=updates
)
```

## Tools

### Automated Migration Script

```bash
# Find files using SQLAlchemy Session
grep -r "Session" app/service --include="*.py"

# Find sync methods that need async conversion
grep -r "def.*(" app/service --include="*.py" | grep -v "async def"
```

### Validation

After migrating a service:

1. **Run tests**: `poetry run pytest test/integration/test_<service>_repository.py`
2. **Check imports**: No SQLAlchemy imports in migrated files
3. **Verify async**: All database methods are async
4. **Test multi-tenancy**: Verify tenant isolation works

## Support

Questions? Check:
1. Example: `app/persistence/repositories/investigation_repository.py`
2. Tests: `test/integration/test_investigation_repository.py`
3. This guide

## Timeline

Estimated migration time per service:
- Simple CRUD service: 1-2 hours
- Complex service with business logic: 3-4 hours
- Service with many dependencies: 4-8 hours

Total estimated time for ~50 core services: 2-3 weeks with 2-3 engineers.
