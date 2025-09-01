# Comprehensive Endpoint Testing Plan for Olorin Fraud Investigation Platform

**Author**: Gil Klainert  
**Date**: 2025-09-01  
**Status**: ⏳ PENDING  
**Diagram**: [Endpoint Testing Flow](/docs/diagrams/2025-09-01-endpoint-testing-flow.mermaid)

## Executive Summary

This plan provides comprehensive testing coverage for all endpoints in the Olorin fraud investigation platform. The platform is currently running on http://localhost:8090 and includes 50+ endpoints across multiple domains including authentication, investigations, fraud analysis agents, and real-time WebSocket connections.

## Endpoint Inventory

### Total Endpoints Identified: 52

#### Categories:
- **Health & Utility**: 6 endpoints
- **Authentication**: 4 endpoints  
- **API Documentation**: 3 endpoints
- **Investigation Management**: 7 endpoints
- **Device Analysis**: 2 endpoints
- **Network Analysis**: 1 endpoint
- **Location Analysis**: 5 endpoints
- **Log Analysis**: 1 endpoint
- **Agent System**: 2 endpoints
- **Demo Mode**: 3 endpoints
- **WebSocket**: 1 endpoint
- **Admin & Settings**: 5+ endpoints
- **Performance Monitoring**: 2+ endpoints
- **MCP Bridge**: Multiple endpoints
- **Splunk Integration**: 1 endpoint

## Phase 1: Basic Health and Utility Testing ⏳ PENDING

### Objectives
- Verify server is running and accessible
- Test all health check endpoints
- Validate API documentation availability

### Endpoints to Test
1. `GET /` - Root endpoint
2. `GET /health` - Simple health check
3. `GET /health/full` - Comprehensive health check
4. `GET /version` - Version information
5. `GET /favicon.ico` - Favicon resource
6. `GET /performance/health` - Performance system health

### Test Implementation
```bash
# Quick health check script
#!/bin/bash
BASE_URL="http://localhost:8090"

echo "Testing root endpoint..."
curl -s "$BASE_URL/" | python -m json.tool

echo "Testing health endpoint..."
curl -s "$BASE_URL/health" | python -m json.tool

echo "Testing version endpoint..."
curl -s "$BASE_URL/version" | python -m json.tool
```

### Expected Results
- All endpoints return 200 OK
- JSON responses are well-formed
- Health status shows "healthy"

## Phase 2: Authentication Testing ⏳ PENDING

### Objectives
- Test authentication flow
- Validate token generation
- Test protected endpoint access

### Endpoints to Test
1. `POST /auth/login` - OAuth2 form login
2. `POST /auth/login-json` - JSON login
3. `GET /auth/me` - Current user info (requires auth)
4. `POST /auth/logout` - Logout

### Test Implementation
```python
import httpx
import pytest

@pytest.mark.asyncio
async def test_authentication_flow():
    async with httpx.AsyncClient() as client:
        # Test login
        response = await client.post(
            "http://localhost:8090/auth/login-json",
            json={"username": "testuser", "password": "testpass"}
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Test protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(
            "http://localhost:8090/auth/me",
            headers=headers
        )
        assert response.status_code == 200
```

### Expected Results
- Login returns JWT token
- Protected endpoints require valid token
- Invalid credentials return 401

## Phase 3: Investigation Management Testing ⏳ PENDING

### Objectives
- Test CRUD operations for investigations
- Validate data persistence
- Test bulk operations

### Endpoints to Test
1. `POST /api/investigation` - Create investigation
2. `GET /api/investigation/{id}` - Get investigation
3. `PUT /api/investigation/{id}` - Update investigation
4. `DELETE /api/investigation/{id}` - Delete investigation
5. `GET /api/investigations` - List all investigations
6. `DELETE /api/investigation` - Bulk delete
7. `DELETE /api/investigations/delete_all` - Delete all (admin)

### Test Data
```json
{
  "id": "test-inv-001",
  "entity_id": "user123",
  "entity_type": "user_id",
  "status": "IN_PROGRESS",
  "risk_score": 0.0,
  "created_at": "2025-09-01T12:00:00Z"
}
```

### Expected Results
- CRUD operations work correctly
- Data persists between requests
- Proper authorization enforced

## Phase 4: Core Business Logic Testing ⏳ PENDING

### Objectives
- Test fraud detection analysis endpoints
- Validate AI agent integrations
- Test external service integrations

### Device Analysis
- `GET /api/device/{entity_id}` - Analyze device risk
  - Parameters: investigation_id, entity_type, time_range
  - Expected: Risk assessment with device signals

### Network Analysis  
- `GET /api/network/{entity_id}` - Analyze network risk
  - Parameters: investigation_id, entity_type, time_range
  - Expected: Network risk indicators

### Location Analysis
- `GET /api/location/source/oii/{user_id}` - OII location
- `GET /api/location/source/business/{user_id}` - Business location
- `GET /api/location/source/phone/{user_id}` - Phone location
- `GET /api/location/risk-analysis/{user_id}` - Consolidated risk

### Log Analysis
- `GET /api/logs/{user_id}` - Analyze logs
  - Parameters: investigation_id, time_range
  - Expected: Splunk data with risk assessment

## Phase 5: Agent System Testing ⏳ PENDING

### Objectives
- Test AI agent invocation
- Validate autonomous investigation
- Test agent metadata handling

### Endpoints to Test
1. `POST /v1/agent/invoke` - General agent invocation
2. `POST /v1/agent/start/{entity_id}` - Start autonomous investigation

### Test Payload
```json
{
  "agent": {
    "name": "fraud_investigation"
  },
  "input": "Investigate user123 for fraud indicators",
  "metadata": {
    "interactionGroupId": "test-group-001",
    "additionalMetadata": {
      "userId": "user123"
    }
  }
}
```

### Required Headers
- `Authorization: Bearer {token}`
- `olorin_experience_id: test-experience-id`
- `olorin_originating_assetalias: Olorin.cas.hri.olorin`
- `olorin_tid: test-transaction-id`

## Phase 6: WebSocket Testing ⏳ PENDING

### Objectives
- Test real-time connection establishment
- Validate message flow
- Test authentication for WebSocket

### Implementation
```python
import websockets
import json

async def test_websocket():
    uri = f"ws://localhost:8090/ws/test-inv-001?token={jwt_token}"
    
    async with websockets.connect(uri) as websocket:
        # Send test message
        await websocket.send(json.dumps({"action": "test"}))
        
        # Receive response
        response = await websocket.recv()
        data = json.loads(response)
        assert "type" in data
```

## Phase 7: Error Handling Testing ⏳ PENDING

### Objectives
- Test authentication failures
- Test invalid parameters
- Test rate limiting
- Test timeout scenarios

### Test Scenarios
1. **Invalid Authentication**
   - Wrong credentials → 401
   - Missing token → 401
   - Expired token → 401

2. **Invalid Parameters**
   - Wrong entity_type → 422
   - Missing required params → 422
   - Invalid time_range → 422

3. **Service Unavailable**
   - External service down → 503
   - Timeout exceeded → 504

## Test Automation Framework

### Directory Structure
```
/tests/
├── conftest.py                 # Test configuration
├── test_health_endpoints.py    # Phase 1 tests
├── test_auth.py               # Phase 2 tests
├── test_investigations.py     # Phase 3 tests
├── test_fraud_analysis.py     # Phase 4 tests
├── test_agents.py             # Phase 5 tests
├── test_websockets.py         # Phase 6 tests
├── test_error_handling.py     # Phase 7 tests
└── utils/
    ├── auth_helper.py
    ├── test_data.py
    └── assertions.py
```

### Pytest Configuration
```python
# conftest.py
import pytest
import httpx
from typing import Dict

@pytest.fixture
async def client():
    async with httpx.AsyncClient(base_url="http://localhost:8090") as client:
        yield client

@pytest.fixture
async def auth_headers():
    # Get authentication token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8090/auth/login-json",
            json={"username": "testuser", "password": "testpass"}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
    return {}
```

## Execution Strategy

### Sequential Execution Order
1. Health checks (no dependencies)
2. Authentication (establishes tokens)
3. Investigation management (requires auth)
4. Core business logic (requires investigations)
5. Agent system (requires auth and investigations)
6. WebSocket (requires auth)
7. Error handling (can run anytime)

### Parallel Execution Groups
- **Group A**: All health endpoints
- **Group B**: Demo mode endpoints
- **Group C**: Location source endpoints
- **Group D**: Error scenarios

### Test Execution Commands
```bash
# Run all tests
pytest tests/ -v --asyncio-mode=auto

# Run specific phase
pytest tests/test_health_endpoints.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run in parallel
pytest tests/ -n 4 --asyncio-mode=auto
```

## Success Criteria

### Coverage Requirements
- ✅ 100% endpoint coverage
- ✅ All HTTP methods tested
- ✅ Success and error paths validated
- ✅ Authentication flows verified
- ✅ WebSocket connections tested

### Performance Benchmarks
- Health endpoints: < 100ms
- Authentication: < 500ms
- Analysis endpoints: < 30s
- Agent invocation: < 2 minutes
- WebSocket connection: < 1s

### Quality Gates
- All tests pass in CI/CD pipeline
- No regression from previous runs
- API responses match OpenAPI spec
- Error responses follow RFC 7807

## Risk Mitigation

### Identified Risks
1. **External Service Dependencies**
   - Splunk may be unavailable
   - OII service may timeout
   - Mitigation: Mock external services for unit tests

2. **Authentication Complexity**
   - JWT tokens may expire during tests
   - Mitigation: Generate fresh tokens for each test suite

3. **Data Consistency**
   - Tests may interfere with each other
   - Mitigation: Use unique test data IDs

4. **Performance Impact**
   - Long-running tests may timeout
   - Mitigation: Configurable timeouts and retry logic

## Monitoring and Reporting

### Test Metrics
- Total endpoints tested
- Pass/fail rate by category
- Average response times
- Error frequency analysis

### Reporting Format
```json
{
  "test_run": "2025-09-01T12:00:00Z",
  "total_endpoints": 52,
  "tested": 52,
  "passed": 50,
  "failed": 2,
  "coverage": "100%",
  "duration": "8m 32s",
  "categories": {
    "health": {"passed": 6, "failed": 0},
    "auth": {"passed": 4, "failed": 0},
    "investigations": {"passed": 7, "failed": 0},
    "analysis": {"passed": 8, "failed": 1},
    "agents": {"passed": 2, "failed": 1}
  }
}
```

## Next Steps

1. **Immediate Actions**
   - Set up test environment
   - Create test user accounts
   - Configure test database

2. **Implementation Timeline**
   - Phase 1-2: Day 1 (Health & Auth)
   - Phase 3-4: Day 2 (Investigations & Analysis)
   - Phase 5-6: Day 3 (Agents & WebSocket)
   - Phase 7: Day 4 (Error handling)
   - Integration: Day 5

3. **Deliverables**
   - Automated test suite
   - CI/CD integration
   - Test coverage report
   - Performance baseline

## Conclusion

This comprehensive testing plan ensures complete coverage of all Olorin platform endpoints. The phased approach allows for systematic validation while identifying issues early. Automation ensures repeatability and enables continuous validation as the platform evolves.

---

**Status Updates**:
- 2025-09-01 08:15: Plan created and documented
- Next: Begin Phase 1 implementation