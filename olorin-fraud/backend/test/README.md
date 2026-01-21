# Test Infrastructure Guide

## Overview

The olorin-server test infrastructure uses MongoDB testcontainers for integration tests with full database isolation. Each test gets its own MongoDB database instance.

## Test Types

### Unit Tests (`test/unit/`)
- Fast, focused tests
- No external dependencies
- Mock external services if needed
- Run with: `pytest test/unit`

### Integration Tests (`test/integration/`)
- Uses MongoDB testcontainers
- Real database operations
- Full repository integration
- Run with: `pytest test/integration -m integration`

## MongoDB Test Fixtures

### Available Fixtures

#### Database Fixtures
- `mongodb_container` - MongoDB 7.0 testcontainer (session scope)
- `mongodb_client` - Motor async client (session scope)
- `test_mongodb` - Isolated test database (function scope)

#### Repository Fixtures (all function-scoped)
- `investigation_repository` - InvestigationRepository
- `detector_repository` - DetectorRepository
- `detection_run_repository` - DetectionRunRepository
- `anomaly_event_repository` - AnomalyEventRepository
- `transaction_score_repository` - TransactionScoreRepository
- `audit_log_repository` - AuditLogRepository
- `template_repository` - TemplateRepository
- `composio_connection_repository` - ComposioConnectionRepository
- `composio_action_audit_repository` - ComposioActionAuditRepository
- `soar_playbook_execution_repository` - SOARPlaybookExecutionRepository

## Writing Integration Tests

### Basic Test Example

```python
import pytest
from app.models.investigation_mongodb import Investigation, LifecycleStage, InvestigationStatus

@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_investigation(investigation_repository):
    """Test creating a new investigation."""
    investigation = Investigation(
        investigation_id="test-001",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    created = await investigation_repository.create(investigation)

    assert created.id is not None
    assert created.investigation_id == "test-001"
```

### Test Isolation

Each test function gets:
- Fresh MongoDB database
- All collections created with indexes
- Complete cleanup after test

No test pollution between tests.

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run only unit tests
poetry run pytest -m unit

# Run only integration tests
poetry run pytest -m integration

# Run only MongoDB tests
poetry run pytest -m mongodb

# Run specific test file
poetry run pytest test/integration/test_investigation_repository.py

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run in parallel (faster)
poetry run pytest -n auto

# Run with verbose output
poetry run pytest -v -s
```

### Test Markers

Tests are automatically marked based on:
- **Location**: `test/integration/` → `@pytest.mark.integration`
- **Fixtures**: Using `test_mongodb` → `@pytest.mark.mongodb`
- **Function**: `async def test_*` → `@pytest.mark.asyncio`

Manual markers (when needed):
```python
@pytest.mark.integration  # Integration test
@pytest.mark.mongodb      # Requires MongoDB
@pytest.mark.slow         # Slow test (>1s)
@pytest.mark.asyncio      # Async test (usually auto-detected)
```

## Configuration

### pytest.ini

Located at project root, configures:
- Test discovery patterns
- Asyncio mode (auto)
- Test markers
- Coverage settings
- Output formatting

### conftest.py Files

- `test/conftest.py` - Root configuration, path setup, marker auto-detection
- `test/integration/conftest.py` - MongoDB fixtures, repository fixtures

## Best Practices

### 1. Use Repository Fixtures

✅ **Correct:**
```python
async def test_find_investigation(investigation_repository):
    found = await investigation_repository.find_by_id("inv-123")
```

❌ **Incorrect:**
```python
async def test_find_investigation(test_mongodb):
    collection = test_mongodb.investigations
    doc = await collection.find_one({"investigation_id": "inv-123"})
```

### 2. Test Real Data Flows

✅ **Correct:**
```python
# Create real investigation
investigation = Investigation(...)
created = await investigation_repository.create(investigation)

# Verify it was created
found = await investigation_repository.find_by_id(created.investigation_id)
assert found is not None
```

❌ **Incorrect:**
```python
# Don't use mocks in integration tests
mock_repo = MagicMock()
mock_repo.create.return_value = fake_investigation
```

### 3. Test Error Cases

```python
async def test_optimistic_locking_conflict(investigation_repository):
    """Test version conflict detection."""
    inv = await investigation_repository.create(Investigation(...))

    # Try to update with wrong version
    result = await investigation_repository.update_with_version(
        inv.investigation_id, current_version=999, updates={}
    )

    assert result is None  # Update should fail
```

### 4. Test Tenant Isolation

```python
async def test_tenant_isolation(investigation_repository):
    """Test tenant filtering works."""
    inv = await investigation_repository.create(Investigation(
        investigation_id="inv-1",
        tenant_id="tenant-A",
        ...
    ))

    # Should not find with wrong tenant
    found = await investigation_repository.find_by_id(
        "inv-1", tenant_id="tenant-B"
    )
    assert found is None
```

### 5. Test Pagination

```python
async def test_pagination(investigation_repository):
    """Test pagination works correctly."""
    # Create 10 investigations
    for i in range(10):
        await investigation_repository.create(Investigation(...))

    # Get page 1
    page1 = await investigation_repository.find_by_user(
        "user-123", limit=3, skip=0
    )
    assert len(page1) == 3

    # Get page 2
    page2 = await investigation_repository.find_by_user(
        "user-123", limit=3, skip=3
    )
    assert len(page2) == 3
    assert page1[0].investigation_id != page2[0].investigation_id
```

## Troubleshooting

### MongoDB Container Won't Start

```bash
# Ensure Docker is running
docker ps

# Clean up old containers
docker system prune -a
```

### Slow Test Performance

```bash
# Run tests in parallel
poetry run pytest -n auto

# Skip slow tests
poetry run pytest -m "not slow"

# Only run fast unit tests
poetry run pytest -m unit
```

### Import Errors

```bash
# Ensure Poetry environment is activated
poetry shell

# Or use poetry run
poetry run pytest
```

### Async Test Not Running

Ensure test is properly marked:
```python
import pytest

@pytest.mark.asyncio
async def test_something(investigation_repository):
    result = await investigation_repository.find_by_id("inv-123")
    assert result is not None
```

## Environment Variables

Tests use environment variables from `.env` or system environment:

```bash
# MongoDB (testcontainer manages this)
MONGODB_URI=<set-by-testcontainer>

# Logging
LOG_LEVEL=INFO

# Feature flags
ENABLE_REAL_TIME_UPDATES=false
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Poetry
        run: curl -sSL https://install.python-poetry.org | python3 -

      - name: Install dependencies
        run: poetry install

      - name: Run tests
        run: poetry run pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

## Migration from SQLAlchemy

If migrating old tests:

1. **Replace database fixtures:**
   ```python
   # Old
   def test_something(db):  # SQLAlchemy session
       ...

   # New
   async def test_something(investigation_repository):  # Repository
       ...
   ```

2. **Convert to async:**
   ```python
   # Old
   def test_create(db):
       inv = Investigation(...)
       db.add(inv)
       db.commit()

   # New
   @pytest.mark.asyncio
   async def test_create(investigation_repository):
       inv = Investigation(...)
       created = await investigation_repository.create(inv)
   ```

3. **Update assertions:**
   ```python
   # Old
   result = db.query(Investigation).filter_by(investigation_id="inv-1").first()

   # New
   result = await investigation_repository.find_by_id("inv-1")
   ```

## Support

For questions or issues:
1. Check this README
2. Look at example tests in `test/integration/test_investigation_repository.py`
3. Review fixtures in `test/integration/conftest.py`
