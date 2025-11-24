# Quick-Start Guide: Frontend-Backend Interface Compatibility

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This guide provides developers with step-by-step instructions for working with the Frontend-Backend Interface Compatibility system. Follow these workflows for common development tasks.

**Target Audience**: Frontend and backend developers on the Olorin team

**Prerequisites**:
- Backend: Python 3.11, Poetry
- Frontend: Node.js 18+, npm
- Tools: Git, Docker (optional)

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Adding a New Endpoint](#adding-a-new-endpoint)
3. [Modifying an Existing Endpoint](#modifying-an-existing-endpoint)
4. [Running Contract Tests](#running-contract-tests)
5. [Debugging Type Mismatches](#debugging-type-mismatches)
6. [Deploying Changes](#deploying-changes)
7. [Rolling Back Changes](#rolling-back-changes)
8. [Troubleshooting](#troubleshooting)

## Initial Setup

### Backend Setup

```bash
# 1. Clone repository and navigate to backend
cd olorin-server

# 2. Install dependencies
poetry install

# 3. Start development server
poetry run python -m app.local_server

# Server starts at http://localhost:8090
# OpenAPI schema available at http://localhost:8090/openapi.json
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd olorin-front

# 2. Install dependencies
npm install

# 3. Generate TypeScript types from backend schema
npm run generate-api-types

# 4. Start development server
npm start

# Frontend starts at http://localhost:3000
```

### Verify Setup

```bash
# Backend: Verify OpenAPI schema is accessible
curl http://localhost:8090/openapi.json | jq '.info'

# Frontend: Verify types were generated
ls -la olorin-front/src/api/generated/

# Should see:
# - types.ts (TypeScript interfaces)
# - api.ts (API client functions)
```

## Adding a New Endpoint

### Step 1: Define Backend Model (Pydantic)

```python
# olorin-server/app/router/models/investigation_models.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RiskAssessmentRequest(BaseModel):
    """Request for risk assessment calculation"""
    investigation_id: str = Field(..., description="Investigation unique identifier")
    include_historical: bool = Field(default=True, description="Include historical data")

    class Config:
        json_schema_extra = {
            "example": {
                "investigation_id": "550e8400-e29b-41d4-a716-446655440000",
                "include_historical": true
            }
        }

class RiskAssessmentResponse(BaseModel):
    """Risk assessment result"""
    investigation_id: str
    risk_score: float = Field(..., ge=0, le=100, description="Overall risk score (0-100)")
    risk_factors: list[str] = Field(default=[], description="Contributing risk factors")
    assessed_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "investigation_id": "550e8400-e29b-41d4-a716-446655440000",
                "risk_score": 75.5,
                "risk_factors": ["multiple_devices", "unusual_location"],
                "assessed_at": "2025-10-15T12:30:00Z"
            }
        }
```

### Step 2: Create Backend Endpoint (FastAPI)

```python
# olorin-server/app/router/controllers/investigation_controller.py
from fastapi import APIRouter, HTTPException, status
from app.router.models.investigation_models import RiskAssessmentRequest, RiskAssessmentResponse

router = APIRouter()

@router.post(
    "/api/v1/investigations/{investigation_id}/risk-assessment",
    response_model=RiskAssessmentResponse,
    status_code=200,
    tags=["investigations"],
    summary="Calculate risk assessment",
    description="Calculate comprehensive risk assessment for investigation"
)
async def calculate_risk_assessment(
    investigation_id: str,
    request: RiskAssessmentRequest
) -> RiskAssessmentResponse:
    """
    Calculate risk assessment for the specified investigation.

    Returns risk score (0-100) and contributing risk factors.
    """
    # Implementation
    pass
```

### Step 3: Restart Backend

```bash
cd olorin-server
poetry run python -m app.local_server

# Verify endpoint in OpenAPI schema
curl http://localhost:8090/openapi.json | jq '.paths."/api/v1/investigations/{investigation_id}/risk-assessment"'
```

### Step 4: Regenerate Frontend Types

```bash
cd olorin-front

# Generate TypeScript types from updated schema
npm run generate-api-types

# Verify new types were generated
grep -A 10 "RiskAssessmentRequest" src/api/generated/types.ts
grep -A 10 "RiskAssessmentResponse" src/api/generated/types.ts
```

### Step 5: Use Generated Types in Frontend

```typescript
// olorin-front/src/components/RiskAssessment.tsx
import { InvestigationsService, RiskAssessmentRequest } from '@/api/generated';
import { useState } from 'react';

export function RiskAssessment({ investigationId }: { investigationId: string }) {
  const [riskScore, setRiskScore] = useState<number | null>(null);

  const calculateRisk = async () => {
    const request: RiskAssessmentRequest = {
      investigation_id: investigationId,
      include_historical: true
    };

    // TypeScript validates request structure at compile-time
    const response = await InvestigationsService.calculateRiskAssessment(
      investigationId,
      request
    );

    // TypeScript knows response structure
    setRiskScore(response.risk_score);
  };

  return (
    <button onClick={calculateRisk}>
      Calculate Risk
      {riskScore !== null && <span>Score: {riskScore}</span>}
    </button>
  );
}
```

### Step 6: Write Contract Tests

**Backend Contract Test**:
```python
# olorin-server/test/contract/test_risk_assessment_contract.py
import pytest
import schemathesis
from app.main import app

schema = schemathesis.from_asgi("/openapi.json", app)

@schema.parametrize(endpoint="/api/v1/investigations/{investigation_id}/risk-assessment")
def test_risk_assessment_contract(case):
    """Verify risk assessment endpoint matches schema"""
    response = case.call_asgi()
    case.validate_response(response)
```

**Frontend Contract Test**:
```typescript
// olorin-front/test/contract/risk-assessment.test.ts
import { InvestigationsService, RiskAssessmentRequest } from '@/api/generated';

describe('Risk Assessment Contract', () => {
  test('Valid request returns valid response', async () => {
    const request: RiskAssessmentRequest = {
      investigation_id: "test-id",
      include_historical: true
    };

    const response = await InvestigationsService.calculateRiskAssessment(
      "test-id",
      request
    );

    // Response structure validated by TypeScript types
    expect(response).toHaveProperty('risk_score');
    expect(response.risk_score).toBeGreaterThanOrEqual(0);
    expect(response.risk_score).toBeLessThanOrEqual(100);
  });
});
```

### Step 7: Run Contract Tests

```bash
# Backend
cd olorin-server
poetry run pytest test/contract/test_risk_assessment_contract.py -v

# Frontend
cd olorin-front
npm run test:contract
```

## Modifying an Existing Endpoint

### Backward-Compatible Change (Adding Optional Field)

**Step 1: Update Pydantic Model**

```python
# olorin-server/app/router/models/investigation_models.py
class InvestigationResponse(BaseModel):
    investigation_id: str
    entity_id: str
    status: str
    risk_score: float
    created_at: datetime
    # NEW OPTIONAL FIELD (backward-compatible)
    tags: Optional[list[str]] = Field(default=None, description="Investigation tags")
```

**Step 2: Restart Backend**

```bash
poetry run python -m app.local_server
```

**Step 3: Regenerate Frontend Types**

```bash
cd olorin-front
npm run generate-api-types
```

**Step 4: Use New Field (Optional)**

```typescript
// Frontend code using new optional field
const investigation = await InvestigationsService.getInvestigation(id);

// TypeScript knows 'tags' is optional
if (investigation.tags) {
  console.log('Tags:', investigation.tags);
}
```

**No Breaking Change**: Frontend works with or without the new field.

### Breaking Change (Renaming Field)

**❌ DO NOT DO THIS without API versioning!**

```python
# ❌ BREAKING: Renaming field
class InvestigationResponse(BaseModel):
    investigation_id: str
    entity_identifier: str  # Was: entity_id - BREAKS FRONTEND!
```

**✅ CORRECT: Use API Versioning**

**Step 1: Create v2 Models**

```python
# olorin-server/app/router/v2/models/investigation_models.py
class InvestigationResponseV2(BaseModel):
    investigation_id: str
    entity_identifier: str  # New name
    status: str
```

**Step 2: Create v2 Endpoint**

```python
# olorin-server/app/router/v2/controllers/investigation_controller.py
@router.get("/api/v2/investigations/{id}", response_model=InvestigationResponseV2)
async def get_investigation_v2(id: str) -> InvestigationResponseV2:
    pass
```

**Step 3: Keep v1 Endpoint**

```python
# olorin-server/app/router/v1/controllers/investigation_controller.py
# Keep existing v1 endpoint unchanged
@router.get("/api/v1/investigations/{id}", response_model=InvestigationResponse)
async def get_investigation_v1(id: str) -> InvestigationResponse:
    pass
```

**Step 4: Generate Both Type Versions**

```bash
# Generate v1 types
npx openapi-typescript http://localhost:8090/api/v1/openapi.json \
  --output src/api/generated/v1/types.ts

# Generate v2 types
npx openapi-typescript http://localhost:8090/api/v2/openapi.json \
  --output src/api/generated/v2/types.ts
```

**Step 5: Gradually Migrate Frontend**

```typescript
// Phase 1: Support both versions
import { InvestigationsService as V1Service } from '@/api/generated/v1';
import { InvestigationsService as V2Service } from '@/api/generated/v2';

const useV2 = featureFlags.enableV2API;
const service = useV2 ? V2Service : V1Service;

// Phase 2: Full migration to v2
import { InvestigationsService } from '@/api/generated/v2';
```

## Running Contract Tests

### Backend Contract Tests

```bash
cd olorin-server

# Run all contract tests
poetry run pytest test/contract/ -v

# Run contract tests for specific endpoint
poetry run pytest test/contract/test_investigations_contract.py::test_create_investigation -v

# Run with coverage
poetry run pytest test/contract/ --cov=app --cov-report=term
```

### Frontend Contract Tests

```bash
cd olorin-front

# Run Dredd contract tests
npm run test:contract

# Run with specific endpoints only
npx dredd --only="POST /api/v1/investigations/*"

# Run integration tests
npm run test:integration
```

### CI Contract Tests

Contract tests run automatically on every PR:

```yaml
# .github/workflows/contract-tests.yml
- name: Backend Contract Tests
  run: |
    cd olorin-server
    poetry run pytest test/contract/ -v

- name: Frontend Contract Tests
  run: |
    cd olorin-front
    npm run test:contract
```

**Contract tests must pass before PR can be merged.**

## Debugging Type Mismatches

### Problem: TypeScript Compilation Errors

**Symptom**:
```typescript
// Type error: Property 'entity_id' does not exist on type 'InvestigationResponse'
const id = investigation.entity_id;
```

**Solution**:

**Step 1: Verify Backend Schema**

```bash
# Check if field exists in schema
curl http://localhost:8090/openapi.json | jq '.components.schemas.InvestigationResponse.properties'
```

**Step 2: Regenerate Types**

```bash
cd olorin-front
npm run generate-api-types
```

**Step 3: Check Generated Types**

```bash
# View generated interface
cat src/api/generated/types.ts | grep -A 20 "interface InvestigationResponse"
```

**Step 4: If Field Missing from Schema**

The field doesn't exist in the backend model. Either:
1. Add it to the Pydantic model (backend)
2. Remove usage from frontend code

### Problem: Runtime Response Doesn't Match Types

**Symptom**:
```typescript
// TypeScript says risk_score is number, but runtime value is string
const score: number = response.risk_score;  // Runtime error!
```

**Solution**:

**Step 1: Enable Runtime Validation**

```typescript
// olorin-front/src/api/validators.ts
import Ajv from 'ajv';
import schema from './generated/openapi.json';

const ajv = new Ajv();

export function validateResponse<T>(data: any, schemaName: string): T {
  const validator = ajv.compile(schema.components.schemas[schemaName]);

  if (!validator(data)) {
    console.error('Validation errors:', validator.errors);
    throw new ValidationError('Response does not match schema');
  }

  return data as T;
}

// Usage
const response = await fetch('/api/v1/investigations/123');
const data = await response.json();
const investigation = validateResponse<InvestigationResponse>(data, 'InvestigationResponse');
```

**Step 2: Fix Backend Response**

If backend returns wrong type, fix the Pydantic model or implementation.

### Problem: Contract Test Failures

**Symptom**:
```
FAILED test_create_investigation_contract - Schema validation error:
  Response field 'risk_score' has type 'str', expected 'number'
```

**Solution**:

**Step 1: Check Backend Implementation**

```python
# olorin-server/app/router/controllers/investigation_controller.py
# ❌ WRONG: Returning string instead of float
return InvestigationResponse(
    risk_score="75.5"  # Should be float, not string
)

# ✅ CORRECT: Return proper type
return InvestigationResponse(
    risk_score=75.5  # Float as defined in schema
)
```

**Step 2: Run Contract Tests Again**

```bash
poetry run pytest test/contract/test_investigations_contract.py -v
```

## Deploying Changes

### Pre-Deployment Checklist

✅ All contract tests pass (backend and frontend)
✅ TypeScript type check passes (`npm run typecheck`)
✅ No breaking changes detected (`oasdiff`)
✅ Code review approved
✅ CI pipeline passes

### Deploy Backend (Backward-Compatible Change)

```bash
# 1. Merge to main branch
git checkout main
git merge feature/add-risk-assessment

# 2. CI automatically deploys via canary
# GitHub Actions workflow handles:
# - Running contract tests
# - Building Docker image
# - Deploying canary with 10% traffic
# - Monitoring metrics
# - Progressive traffic shifting
# - Promoting to stable or rolling back

# 3. Monitor deployment
kubectl get pods -n production -l app=olorin-backend
kubectl logs -f deployment/olorin-backend-canary
```

### Deploy Frontend

```bash
# 1. Regenerate types from deployed backend
BACKEND_URL=https://api.olorin.prod.example.com npm run generate-api-types

# 2. Build production bundle
npm run build

# 3. Deploy to CDN (automatic via CI)
# GitHub Actions workflow handles:
# - Building production bundle
# - Uploading to S3
# - Invalidating CloudFront cache

# 4. Verify deployment
curl https://olorin.prod.example.com/ | grep "version"
```

### Deploy Breaking Change (Requires Coordination)

```bash
# 1. Deploy backend v2 (keeps v1 running)
# Both /api/v1 and /api/v2 endpoints active

# 2. Deploy frontend with v2 client
# Frontend uses /api/v2 endpoints

# 3. Monitor v2 adoption
# Track percentage of traffic using v2

# 4. After 90 days, deprecate v1
# Remove v1 endpoints from backend
```

## Rolling Back Changes

### Automatic Rollback (Canary Failure)

If canary deployment fails health checks or metrics thresholds:

```
🚨 AUTOMATIC ROLLBACK TRIGGERED

Reason: Error rate exceeded 2% threshold
Canary version: v2.1.5
Rolling back to: v2.1.4

Steps:
1. Routing 100% traffic to stable version... ✅
2. Scaling down canary deployment... ✅
3. Verifying stable version health... ✅
4. Running contract tests... ✅

✅ Rollback completed in 87 seconds
```

**No manual action required.**

### Manual Rollback (Backend)

```bash
# 1. Identify last stable version
kubectl get deployments -n production

# 2. Rollback to previous version
kubectl rollout undo deployment/olorin-backend -n production

# 3. Verify rollback
kubectl rollout status deployment/olorin-backend -n production

# 4. Run contract tests
cd olorin-server
poetry run pytest test/contract/ -v
```

### Manual Rollback (Frontend)

```bash
# 1. Run rollback script
./deployment/rollback-frontend.sh

# 2. Script automatically:
# - Identifies previous version
# - Restores previous files from S3
# - Invalidates CloudFront cache

# 3. Verify rollback
curl https://olorin.prod.example.com/version.txt
```

## Troubleshooting

### Issue: "OpenAPI schema not found"

**Symptom**: `npm run generate-api-types` fails with connection error.

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8090/health

# If not running, start backend
cd olorin-server
poetry run python -m app.local_server
```

### Issue: "Type generation produces empty files"

**Symptom**: `types.ts` is empty or incomplete.

**Solution**:
```bash
# 1. Check schema is valid
curl http://localhost:8090/openapi.json | jq '.'

# 2. Validate schema against OpenAPI spec
npx @apidevtools/swagger-cli validate http://localhost:8090/openapi.json

# 3. If invalid, fix backend Pydantic models
```

### Issue: "Contract tests fail locally but pass in CI"

**Symptom**: Tests fail on your machine but succeed in GitHub Actions.

**Solution**:
```bash
# 1. Check Python/Node versions match CI
python --version  # Should be 3.11
node --version    # Should be 18+

# 2. Clean install dependencies
cd olorin-server && poetry install
cd olorin-front && rm -rf node_modules && npm ci

# 3. Regenerate types
npm run generate-api-types
```

### Issue: "TypeScript errors after backend update"

**Symptom**: TypeScript compilation errors after pulling backend changes.

**Solution**:
```bash
# 1. Regenerate types from updated backend
cd olorin-front
npm run generate-api-types

# 2. Check for breaking changes
git diff src/api/generated/types.ts

# 3. Update frontend code to match new types
# Fix any TypeScript errors highlighted by compiler
```

### Issue: "Deployment stuck in canary phase"

**Symptom**: Canary deployment doesn't progress to full rollout.

**Solution**:
```bash
# 1. Check canary health
kubectl get pods -n production -l version=canary

# 2. Check canary logs
kubectl logs -n production -l version=canary --tail=100

# 3. Check metrics
kubectl get virtualservice olorin-backend -n production -o yaml

# 4. If healthy, manually promote
kubectl apply -f deployment/promote-canary.yml
```

## Best Practices

### ✅ DO:

- Run `npm run generate-api-types` after every backend schema change
- Write contract tests for all new endpoints
- Use TypeScript strict mode for better type safety
- Add examples to Pydantic models for better documentation
- Monitor contract test coverage (target: 95%+)
- Use feature flags for gradual rollouts
- Test backward compatibility before deploying
- Keep frontend and backend types in sync

### ❌ DON'T:

- Manually modify generated types
- Deploy breaking changes without API versioning
- Skip contract tests ("they'll pass in CI")
- Hardcode API URLs or endpoints
- Use `any` type in TypeScript
- Ignore TypeScript compilation warnings
- Deploy without running tests locally
- Remove old API versions before deprecation period

## Additional Resources

- **Full Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**:
  - [OpenAPI Schema Contract](./contracts/openapi-schema-contract.md)
  - [Type Generation Contract](./contracts/type-generation-contract.md)
  - [Contract Testing Contract](./contracts/contract-testing-contract.md)
  - [Deployment Rollback Contract](./contracts/deployment-rollback-contract.md)
- **OpenAPI 3.1 Specification**: https://spec.openapis.org/oas/v3.1.0
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **openapi-typescript**: https://github.com/drwpow/openapi-typescript
- **Schemathesis**: https://schemathesis.readthedocs.io/

## Getting Help

**Questions?** Ask in:
- Slack: #olorin-development
- Email: dev-team@olorin.example.com

**Issues?** Create a ticket:
- JIRA: https://olorin.atlassian.net/

**Documentation updates?** Submit a PR to:
- Repository: `olorin/specs/001-frontend-backend-interface/`
