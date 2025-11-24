# Authorization Implementation Guide
**Olorin Fraud Detection Platform - Security Task 1.4**

**Author:** Security Team
**Date:** 2025-11-02
**Status:** In Progress (6/79 endpoints fixed)

---

## Overview

This guide provides step-by-step instructions for adding authentication and authorization to the remaining **73 unprotected API endpoints** in the Olorin backend.

### Progress Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Fixed | 6 | 8% |
| 🔄 In Progress | 73 | 92% |
| ✓ Already Protected | 25 | N/A |

### Files Completed

✅ **Completed Files:**
1. `comment_router.py` - 2 endpoints fixed
2. `device_router.py` - 1 endpoint fixed
3. `location_router.py` - 1 endpoint fixed
4. `network_router.py` - 1 endpoint fixed
5. `logs_router.py` - 1 endpoint fixed

🔄 **Remaining Files (Priority Order):**
1. `agent_router.py` (281 lines) - 2 critical endpoints
2. `structured_investigation_router.py` (564 lines) - 15 critical endpoints
3. `api_router.py` (832 lines) - 30+ endpoints
4. `settings_router.py` (518 lines) - 12 admin endpoints
5. `investigation_api.py` - 7 endpoints
6. `mcp_http_router.py` - 2 endpoints
7. `mcp_bridge_router.py` - 4 endpoints
8. `performance_router.py` - 5 endpoints
9. `risk_assessment_router.py` - remaining endpoints
10. `demo_router.py` - demo endpoints

---

## Step-by-Step Implementation

### Step 1: Import Authentication Dependencies

Add these imports to the top of each router file:

```python
from fastapi import APIRouter, Depends  # Ensure Depends is imported
from app.security.auth import User, require_read, require_write, require_admin
```

**Example:**

```python
# Before
from fastapi import APIRouter, HTTPException
from app.models.api_models import Investigation

# After
from fastapi import APIRouter, Depends, HTTPException
from app.models.api_models import Investigation
from app.security.auth import User, require_read, require_write, require_admin
```

### Step 2: Add Authentication Parameter to Endpoint Functions

Add the `current_user` parameter to each endpoint function using the appropriate authorization level:

**For Read-Only Endpoints (GET operations):**

```python
@router.get("/endpoint/{id}")
async def get_something(
    id: str,
    # ... other parameters ...
    current_user: User = Depends(require_read),  # Add this line
):
    # endpoint implementation
    pass
```

**For Write Endpoints (POST, PUT operations):**

```python
@router.post("/endpoint")
async def create_something(
    data: SomeModel,
    # ... other parameters ...
    current_user: User = Depends(require_write),  # Add this line
):
    # endpoint implementation
    pass
```

**For Admin Endpoints (DELETE all, system settings):**

```python
@router.delete("/endpoint/delete_all")
async def delete_all(
    current_user: User = Depends(require_admin),  # Add this line
):
    # endpoint implementation
    pass
```

### Step 3: Determine Appropriate Authorization Level

Use this decision tree to select the correct authorization dependency:

```
Is endpoint reading data only (GET)?
  └─> YES: Use `require_read`

Is endpoint creating/updating data (POST/PUT)?
  └─> YES: Use `require_write`

Is endpoint deleting data (DELETE)?
  └─> Is it deleting a single resource?
      └─> YES: Use `require_write`
      └─> NO (bulk delete/delete all): Use `require_admin`

Is endpoint modifying system configuration?
  └─> YES: Use `require_admin`

Is endpoint accessing external services (Splunk, Snowflake)?
  └─> YES: Use `require_write`

Is endpoint for demo/testing purposes?
  └─> YES: Use `require_write` (or `require_admin` for system demo controls)
```

### Authorization Level Matrix

| Endpoint Type | Method | Auth Level | Reason |
|---------------|--------|------------|--------|
| View investigation | GET | `require_read` | Read-only operation |
| View logs/metrics | GET | `require_read` | Read-only operation |
| View device/network data | GET | `require_read` | Read-only operation |
| Create investigation | POST | `require_write` | Data modification |
| Update investigation | PUT | `require_write` | Data modification |
| Delete single investigation | DELETE | `require_write` | Data modification |
| Delete all investigations | DELETE | `require_admin` | Bulk operation |
| Start AI agent | POST | `require_write` | Resource-intensive operation |
| Cancel AI agent | POST | `require_write` | Operational control |
| Modify settings | POST/PUT | `require_admin` | System configuration |
| Delete settings | DELETE | `require_admin` | System configuration |
| Cancel Splunk job | POST | `require_write` | External service control |
| MCP tool calls | POST | `require_write` | External service integration |
| Performance metrics | GET | `require_read` | Monitoring data |
| Reset metrics | POST | `require_admin` | System operation |

---

## File-by-File Implementation Guide

### Priority 1: Critical Investigation Endpoints

#### File: `agent_router.py` (281 lines - REQUIRES SPLITTING)

**Endpoints to Fix:**
1. `POST /agent/invoke` (line 21)
2. `POST /agent/start/{entity_id}` (line 128)

**Implementation:**

```python
# Add import
from app.security.auth import User, require_write

# Fix endpoint 1
@router.post("/agent/invoke")
async def agenerate_chat_response(
    payload: AgentInvoke,
    request: Request,
    current_user: User = Depends(require_write),  # Add this
):
    # existing implementation
    pass

# Fix endpoint 2
@router.post("/agent/start/{entity_id}")
async def astart_investigation(
    entity_id: str,
    request: Request,
    entity_type: str = Query("user_id"),
    investigation_id: Optional[str] = None,
    current_user: User = Depends(require_write),  # Add this
):
    # existing implementation
    pass
```

**File Splitting Required:**
This file exceeds 200 lines. After adding auth, split into:
- `agent_invocation.py` (<200 lines) - Agent invocation endpoints
- `agent_management.py` (<200 lines) - Agent management endpoints

#### File: `structured_investigation_router.py` (564 lines - REQUIRES SPLITTING)

**Endpoints to Fix (15 total):**
1. `POST /start_investigation` - Use `require_write`
2. `GET /investigation/{investigation_id}/status` - Use `require_read`
3. `GET /investigation/{investigation_id}/logs` - Use `require_read`
4. `GET /investigation/{investigation_id}/journey` - Use `require_read`
5. `GET /investigation/{investigation_id}` - Use `require_read`
6. `POST /investigation/{investigation_id}/cancel` - Use `require_write`
7. `GET /investigation/{investigation_id}/results` - Use `require_read`
8. `POST /investigation/{investigation_id}/update-depth` - Use `require_write`
9. `POST /investigation/{investigation_id}/add-entity` - Use `require_write`
10. Additional endpoints (see audit report)

**Implementation Pattern:**

```python
# Add import at top
from app.security.auth import User, require_read, require_write

# For each GET endpoint
@router.get("/investigation/{investigation_id}/status")
async def get_investigation_status_endpoint(
    investigation_id: str,
    current_user: User = Depends(require_read),  # Add this
):
    # existing implementation
    pass

# For each POST endpoint
@router.post("/start_investigation")
async def start_structured_investigation_endpoint(
    request_data: StructuredInvestigationRequest,
    current_user: User = Depends(require_write),  # Add this
):
    # existing implementation
    pass
```

**File Splitting Required:**
This file is 564 lines. Split into:
- `structured_basic.py` (<200 lines) - Start, status, cancel operations
- `structured_results.py` (<200 lines) - Results and journey endpoints
- `structured_advanced.py` (<200 lines) - Advanced operations (depth, add entity)

#### File: `api_router.py` (832 lines - REQUIRES MAJOR REFACTORING)

**Critical - This file has 30+ unprotected endpoints and exceeds 200-line limit by 4x.**

**Recommended Module Split:**

```
app/router/api/
├── __init__.py
├── demo.py             # Demo mode endpoints (<200 lines)
├── entities.py         # OII, device, network info (<200 lines)
├── location.py         # Location source endpoints (<200 lines)
├── splunk.py           # Splunk integration (<200 lines)
├── verification.py     # Verification stats and settings (<200 lines)
└── health.py           # Health check (<50 lines)
```

**Implementation Steps:**

1. **Create directory structure:**
```bash
mkdir -p app/router/api
touch app/router/api/__init__.py
```

2. **Extract demo endpoints to `demo.py`:**
```python
from fastapi import APIRouter, Depends
from app.security.auth import User, require_write

router = APIRouter(prefix="/demo", tags=["demo"])

@router.post("/{user_id}/off")
async def disable_demo_mode(
    user_id: str,
    current_user: User = Depends(require_write),
):
    # Move implementation from api_router.py
    pass

@router.get("/{user_id}/all")
async def get_all_demo_agent_responses(
    user_id: str,
    current_user: User = Depends(require_read),
):
    # Move implementation from api_router.py
    pass
```

3. **Extract entity endpoints to `entities.py`:**
```python
from fastapi import APIRouter, Depends
from app.security.auth import User, require_read

router = APIRouter(prefix="/oii", tags=["entities"])

@router.get("/{user_id}")
async def get_online_identity_info(
    user_id: str,
    current_user: User = Depends(require_read),
):
    # Move implementation from api_router.py
    pass
```

4. **Update main router registration in `main.py`:**
```python
from app.router.api import demo, entities, location, splunk, verification

app.include_router(demo.router, prefix="/api")
app.include_router(entities.router, prefix="/api")
app.include_router(location.router, prefix="/api")
app.include_router(splunk.router, prefix="/api")
app.include_router(verification.router, prefix="/api")
```

### Priority 2: Administrative Endpoints

#### File: `settings_router.py` (518 lines - REQUIRES SPLITTING)

**All 12 endpoints require admin authorization:**

```python
# Add import
from app.security.auth import User, require_admin

# Apply to all endpoints
@router.get("/settings")
async def get_settings(
    current_user: User = Depends(require_admin),  # Add to all
):
    pass

@router.post("/settings")
async def create_setting(
    setting: SettingCreate,
    current_user: User = Depends(require_admin),  # Add to all
):
    pass
```

**File Splitting:**
Split into:
- `settings_crud.py` (<200 lines) - CRUD operations
- `settings_templates.py` (<200 lines) - Template management
- `settings_tools.py` (<200 lines) - Tool configurations

### Priority 3: Integration Endpoints

#### File: `mcp_http_router.py`

**2 endpoints to fix:**

```python
from app.security.auth import User, require_write

@router.get("/mcp/tools")
async def list_mcp_tools(
    current_user: User = Depends(require_read),  # Add this
):
    pass

@router.post("/mcp/tools/call")
async def call_mcp_tool(
    request: MCPToolCallRequest,
    current_user: User = Depends(require_write),  # Add this
):
    pass
```

#### File: `mcp_bridge_router.py`

**4 endpoints to fix:**

```python
from app.security.auth import User, require_read, require_write

@router.post("/mcp/bridge/llm/generate")
async def generate_llm_response(
    request: LLMGenerateRequest,
    current_user: User = Depends(require_write),  # Add this
):
    pass

@router.get("/mcp/bridge/prompts")
async def get_prompts(
    current_user: User = Depends(require_read),  # Add this
):
    pass

@router.post("/mcp/bridge/tools/list")
async def list_tools(
    current_user: User = Depends(require_read),  # Add this
):
    pass

@router.post("/mcp/bridge/tools/call")
async def call_tool(
    request: ToolCallRequest,
    current_user: User = Depends(require_write),  # Add this
):
    pass
```

---

## Testing Requirements

### Unit Tests

Create tests for each fixed endpoint in `test/unit/router/test_authorization.py`:

```python
def test_endpoint_without_auth_returns_401(client):
    """Test that endpoint without auth returns 401"""
    response = client.get("/endpoint")
    assert response.status_code == 401

def test_endpoint_with_insufficient_permissions_returns_403(client, read_token):
    """Test that endpoint with insufficient permissions returns 403"""
    headers = {"Authorization": f"Bearer {read_token}"}
    response = client.post("/endpoint", headers=headers)
    assert response.status_code == 403

def test_endpoint_with_valid_auth_succeeds(client, write_token):
    """Test that endpoint with valid auth succeeds"""
    headers = {"Authorization": f"Bearer {write_token}"}
    response = client.post("/endpoint", headers=headers)
    assert response.status_code in [200, 201]
```

### Integration Tests

Test complete workflows with authentication:

```python
def test_investigation_workflow_with_auth(client, write_token):
    """Test complete investigation workflow with authentication"""
    headers = {"Authorization": f"Bearer {write_token}"}

    # Create investigation
    create_resp = client.post(
        "/investigation",
        json={"entity_id": "test", "entity_type": "user_id"},
        headers=headers
    )
    assert create_resp.status_code == 200

    # Get investigation
    inv_id = create_resp.json()["id"]
    get_resp = client.get(f"/investigation/{inv_id}", headers=headers)
    assert get_resp.status_code == 200
```

### Manual Testing Checklist

- [ ] Test login with valid credentials
- [ ] Test invalid token returns 401
- [ ] Test expired token returns 401
- [ ] Test read-only user cannot modify data
- [ ] Test write user can create/update but not delete all
- [ ] Test admin user has full access
- [ ] Test OPTIONS requests still work (CORS)
- [ ] Test health check endpoints remain public

---

## Validation Commands

### Run Authorization Audit

```bash
cd /Users/gklainert/Documents/olorin/olorin-server
poetry run python scripts/comprehensive_auth_audit.py
```

**Expected Output After Completion:**
```
Total Endpoints Analyzed: 134
  ✓ Protected (Auth Required): 104
  ⚠ Unprotected (NO AUTH): 0
  ℹ Public (Expected): 30
```

### Run Authorization Tests

```bash
poetry run pytest test/unit/router/test_authorization.py -v
```

**Expected: All tests pass**

### Run Full Test Suite

```bash
poetry run pytest
poetry run pytest --cov
```

**Expected: Coverage maintains >30% with all tests passing**

---

## Common Issues and Solutions

### Issue 1: Import Circular Dependencies

**Problem:**
```python
ImportError: cannot import name 'require_read' from partially initialized module 'app.security.auth'
```

**Solution:**
Move import inside function or use late import:

```python
def my_endpoint(current_user: User = Depends(require_read)):
    from app.security.auth import require_read  # Import here if needed
    pass
```

### Issue 2: Token Validation Errors

**Problem:**
```
HTTPException: Could not validate credentials
```

**Solution:**
Ensure JWT_SECRET_KEY is properly configured in environment:

```python
# Check in app/security/auth.py
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set")
```

### Issue 3: OPTIONS Requests Failing

**Problem:**
CORS preflight OPTIONS requests return 401

**Solution:**
OPTIONS handlers should NOT require authentication:

```python
@router.options("/endpoint")
def endpoint_options():
    """Handle CORS preflight - NO AUTH REQUIRED"""
    return {}
```

### Issue 4: Test Client Authentication

**Problem:**
Tests fail with 401 even with token

**Solution:**
Use proper token format in headers:

```python
# Correct
headers = {"Authorization": f"Bearer {token}"}
response = client.get("/endpoint", headers=headers)

# Incorrect
headers = {"Authorization": token}  # Missing "Bearer " prefix
```

---

## Completion Checklist

### Phase 1: Simple Routers (Completed ✅)
- [x] `comment_router.py` - 2 endpoints
- [x] `device_router.py` - 1 endpoint
- [x] `location_router.py` - 1 endpoint
- [x] `network_router.py` - 1 endpoint
- [x] `logs_router.py` - 1 endpoint

### Phase 2: Critical Investigation Routers (In Progress)
- [ ] `agent_router.py` - 2 endpoints + file split
- [ ] `structured_investigation_router.py` - 15 endpoints + file split
- [ ] `investigation_api.py` - 7 endpoints

### Phase 3: Large API Router (Major Refactoring)
- [ ] Split `api_router.py` into modules:
  - [ ] `api/demo.py`
  - [ ] `api/entities.py`
  - [ ] `api/location.py`
  - [ ] `api/splunk.py`
  - [ ] `api/verification.py`
  - [ ] `api/health.py`
- [ ] Add authentication to all extracted endpoints
- [ ] Update router registration in `main.py`

### Phase 4: Administrative Routers
- [ ] Split `settings_router.py` into modules:
  - [ ] `settings/crud.py`
  - [ ] `settings/templates.py`
  - [ ] `settings/tools.py`
- [ ] Add admin auth to all settings endpoints

### Phase 5: Integration Routers
- [ ] `mcp_http_router.py` - 2 endpoints
- [ ] `mcp_bridge_router.py` - 4 endpoints
- [ ] `performance_router.py` - 5 endpoints
- [ ] `risk_assessment_router.py` - remaining endpoints

### Phase 6: Testing & Validation
- [ ] Create comprehensive authorization tests
- [ ] Run authorization audit (0 unprotected endpoints)
- [ ] Run full test suite (all tests pass)
- [ ] Manual testing with different user roles
- [ ] Performance testing with auth overhead
- [ ] Security review and penetration testing

### Phase 7: Documentation
- [ ] Update API documentation with auth requirements
- [ ] Document authentication flow
- [ ] Create user role matrix
- [ ] Update deployment documentation
- [ ] Create security incident response plan

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|----------------|------------|
| Phase 1 | ✅ Completed | Simple |
| Phase 2 | 4-6 hours | Medium |
| Phase 3 | 8-12 hours | High |
| Phase 4 | 4-6 hours | Medium |
| Phase 5 | 2-4 hours | Low |
| Phase 6 | 4-6 hours | Medium |
| Phase 7 | 2-3 hours | Low |
| **Total** | **24-37 hours** | **3-5 days** |

---

## Contact and Support

For questions or issues during implementation:

- **Security Team:** security@olorin.com
- **Backend Team Lead:** backend-lead@olorin.com
- **Documentation:** `/docs/security/`
- **Slack Channel:** #security-implementation

---

## References

- [API Authorization Audit Report](./api-authorization-audit-report.md)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Status:** Living Document - Update as implementation progresses
