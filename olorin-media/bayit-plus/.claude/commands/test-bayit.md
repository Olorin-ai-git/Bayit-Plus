# Test Bayit Command

Run backend tests for Bayit+ with pytest and generate coverage reports.

## Usage

```bash
/test-bayit [test-path] [--coverage] [--verbose]
```

## Description

Executes pytest test suite for the Bayit+ backend with proper configuration, coverage reporting, and detailed output. Ensures all tests pass before deployment.

## Arguments

- **test-path** - Specific test file or directory (optional, defaults to all tests)
- **--coverage** - Generate coverage report (default: true)
- **--verbose** - Show detailed test output (default: false)

## Examples

### Run All Tests with Coverage
```bash
/test-bayit
```

### Run Specific Test File
```bash
/test-bayit backend/tests/test_librarian.py
```

### Run Test Directory with Verbose Output
```bash
/test-bayit backend/tests/api --verbose
```

### Quick Test (No Coverage)
```bash
/test-bayit --no-coverage
```

## Test Categories

### Unit Tests
- `tests/test_models.py` - Database model tests
- `tests/test_utils.py` - Utility function tests
- `tests/test_services.py` - Service layer tests

### API Tests
- `tests/api/test_content.py` - Content API endpoints
- `tests/api/test_auth.py` - Authentication endpoints
- `tests/api/test_admin.py` - Admin endpoints
- `tests/api/test_librarian.py` - Librarian agent API

### Integration Tests
- `tests/integration/test_librarian_workflow.py` - Full audit workflow
- `tests/integration/test_content_flow.py` - Content CRUD flow
- `tests/integration/test_localization.py` - Multi-language support

## Commands Executed

```bash
cd backend
poetry run pytest \
  --cov=app \
  --cov-report=html \
  --cov-report=term \
  --cov-fail-under=87 \
  -v \
  tests/
```

## Coverage Requirements

- **Minimum Coverage:** 87%
- **Report Location:** `backend/htmlcov/index.html`
- **Excluded:** Demo files, migrations, test files

## Output

```
================================ test session starts =================================
platform darwin -- Python 3.13.0, pytest-7.4.3, pluggy-1.3.0
rootdir: /Users/olorin/Documents/olorin/backend
plugins: asyncio-0.21.1, cov-4.1.0
collected 156 items

tests/test_models.py ........................                           [ 15%]
tests/test_services.py .....................................            [ 38%]
tests/api/test_content.py ......................                        [ 52%]
tests/api/test_auth.py .................                                [ 63%]
tests/api/test_admin.py .......................                         [ 78%]
tests/api/test_librarian.py .....................                       [ 92%]
tests/integration/test_librarian_workflow.py ........                   [100%]

---------- coverage: platform darwin, python 3.13.0 -----------
Name                              Stmts   Miss  Cover
-----------------------------------------------------
app/__init__.py                       0      0   100%
app/main.py                          45      2    96%
app/models/content.py               156      8    95%
app/models/user.py                   89      4    96%
app/models/librarian.py             112      6    95%
app/services/librarian_service.py   234     12    95%
app/api/routes/content.py           145      8    94%
-----------------------------------------------------
TOTAL                              2847    145    95%

Required coverage of 87.0% reached. Total coverage: 95.0%

============================= 156 passed in 45.32s ================================
```

## Prerequisites

- Poetry installed
- MongoDB test database or test containers
- All dependencies installed (`poetry install`)

## Related Files

- `backend/pyproject.toml` - Test configuration
- `backend/pytest.ini` - Pytest settings
- `backend/.coveragerc` - Coverage configuration
- `backend/tests/conftest.py` - Shared fixtures

## Troubleshooting

### Tests Failing
- Check MongoDB connection in test environment
- Verify environment variables are set (`.env.test`)
- Ensure test database is clean between runs

### Coverage Too Low
- Identify uncovered code: `open backend/htmlcov/index.html`
- Add tests for critical paths first
- Use `pytest --cov-report=term-missing` to see missing lines

## See Also

- `/fixbuild` - Fix test failures automatically
- Global commands: `tools/test-harness.md`
