# Contract: Deployment and Rollback

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

## Contract Overview

This contract defines the rules and guarantees for safe deployment and automated rollback of frontend and backend changes. The system ensures zero production incidents from interface incompatibility through canary deployments and rapid rollback mechanisms.

**Contract Purpose**: Enable independent team deployment while guaranteeing interface compatibility and rapid recovery from failures.

**Parties**:
- **Provider**: DevOps/CI/CD pipeline (GitHub Actions, Kubernetes, Istio)
- **Consumer**: Development teams (frontend, backend)
- **Validator**: Health checks, error rate monitoring, contract tests

## Deployment Strategy

### 1. Canary Deployment

**Rule**: All backend deployments MUST use canary strategy with gradual traffic shifting.

**Canary Configuration**:
```yaml
# deployment/canary-config.yml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: olorin-backend-canary
spec:
  hosts:
    - olorin-backend.prod.svc.cluster.local
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: olorin-backend
            subset: canary
          weight: 100

    - route:
        - destination:
            host: olorin-backend
            subset: stable
          weight: 90
        - destination:
            host: olorin-backend
            subset: canary
          weight: 10
```

**Canary Traffic Progression**:
1. **Phase 1** (0-5 min): 10% traffic to canary
2. **Phase 2** (5-10 min): 25% traffic to canary (if healthy)
3. **Phase 3** (10-15 min): 50% traffic to canary (if healthy)
4. **Phase 4** (15+ min): 100% traffic to canary (promote to stable)

**Contract Guarantee**: Canary deployment limits blast radius to 10% of traffic initially.

### 2. Health Checks

**Rule**: Canary deployments MUST pass comprehensive health checks before traffic shifting.

**Health Check Types**:

**1. Readiness Probe**:
```yaml
# deployment/backend-deployment.yml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8090
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 2
  failureThreshold: 3
```

**2. Liveness Probe**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8090
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**3. Startup Probe**:
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8090
  initialDelaySeconds: 0
  periodSeconds: 2
  timeoutSeconds: 3
  failureThreshold: 30  # 60 seconds max startup time
```

**Health Check Implementation**:
```python
# olorin-server/app/health.py
from fastapi import APIRouter, status
from typing import Dict, Any

router = APIRouter()

@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Check if service is ready to receive traffic"""
    checks = {
        "database": await check_database_connection(),
        "external_services": await check_external_services(),
        "schema_validation": check_schema_loaded()
    }

    if all(checks.values()):
        return {"status": "ready", "checks": checks}
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "checks": checks}
        )

@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """Check if service is alive (not deadlocked/crashed)"""
    return {"status": "alive"}

@router.get("/health/startup")
async def startup_check() -> Dict[str, Any]:
    """Check if service has completed startup"""
    checks = {
        "openapi_schema": app.openapi_schema is not None,
        "routes_registered": len(app.routes) > 0,
        "config_loaded": config.is_initialized()
    }

    if all(checks.values()):
        return {"status": "started", "checks": checks}
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "starting", "checks": checks}
        )
```

**Contract Guarantee**: Canary receives traffic only after passing all health checks.

### 3. Monitoring and Metrics

**Rule**: Canary deployments MUST be monitored with the following metrics.

**Key Metrics**:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 2% for 2 minutes | Automatic rollback |
| Latency p95 | > 2x baseline for 5 minutes | Automatic rollback |
| Success rate | < 98% for 2 minutes | Automatic rollback |
| Contract test failures | > 0 | Block deployment |
| Health check failures | > 5% for 1 minute | Automatic rollback |

**Prometheus Metrics**:
```python
# olorin-server/app/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_latency = Histogram(
    'api_request_duration_seconds',
    'API request latency',
    ['method', 'endpoint']
)

# Error metrics
error_rate = Gauge(
    'api_error_rate',
    'API error rate percentage'
)

# Contract test metrics
contract_test_failures = Counter(
    'contract_test_failures_total',
    'Total contract test failures',
    ['endpoint', 'test_type']
)
```

**Contract Guarantee**: All metrics collected and evaluated for rollback decision.

### 4. Automated Rollback

**Rule**: Canary deployments MUST automatically rollback if failure conditions detected.

**Rollback Trigger Conditions**:
1. Error rate > 2% for 2 consecutive minutes
2. p95 latency > 2x baseline for 5 minutes
3. Health check failure rate > 5% for 1 minute
4. Any contract test failure in production
5. Critical alert triggered (manual trigger)

**Automated Rollback Script**:
```bash
#!/bin/bash
# deployment/rollback-canary.sh

set -e

NAMESPACE="production"
SERVICE="olorin-backend"
CANARY_DEPLOYMENT="${SERVICE}-canary"
STABLE_DEPLOYMENT="${SERVICE}-stable"

echo "🔄 Initiating automatic rollback for ${SERVICE}"

# Step 1: Route 100% traffic to stable version
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ${SERVICE}
  namespace: ${NAMESPACE}
spec:
  hosts:
    - ${SERVICE}
  http:
    - route:
        - destination:
            host: ${SERVICE}
            subset: stable
          weight: 100
        - destination:
            host: ${SERVICE}
            subset: canary
          weight: 0
EOF

echo "✅ Traffic routed 100% to stable version"

# Step 2: Scale down canary deployment
kubectl scale deployment ${CANARY_DEPLOYMENT} --replicas=0 -n ${NAMESPACE}

echo "✅ Canary deployment scaled to 0"

# Step 3: Wait for traffic to drain
sleep 30

# Step 4: Delete canary deployment
kubectl delete deployment ${CANARY_DEPLOYMENT} -n ${NAMESPACE}

echo "✅ Canary deployment deleted"

# Step 5: Post-rollback verification
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE}
kubectl get virtualservice ${SERVICE} -n ${NAMESPACE}

echo "✅ Rollback completed successfully"
echo "⏱️  Total rollback time: ${SECONDS}s"
```

**Contract Guarantee**: Rollback completes in < 120 seconds from detection to stable state.

### 5. Rollback Verification

**Rule**: Post-rollback system MUST verify stable version is serving all traffic.

**Verification Checks**:
```bash
#!/bin/bash
# deployment/verify-rollback.sh

echo "🔍 Verifying rollback completion..."

# Check 1: Verify traffic routing
CANARY_WEIGHT=$(kubectl get virtualservice olorin-backend -o jsonpath='{.spec.http[0].route[?(@.destination.subset=="canary")].weight}')

if [ "$CANARY_WEIGHT" -eq 0 ]; then
  echo "✅ Canary traffic: 0% (correct)"
else
  echo "❌ Canary traffic: ${CANARY_WEIGHT}% (expected 0%)"
  exit 1
fi

# Check 2: Verify canary pods terminated
CANARY_PODS=$(kubectl get pods -n production -l app=olorin-backend,version=canary --no-headers | wc -l)

if [ "$CANARY_PODS" -eq 0 ]; then
  echo "✅ Canary pods: 0 (correct)"
else
  echo "❌ Canary pods: ${CANARY_PODS} (expected 0)"
  exit 1
fi

# Check 3: Verify stable version health
STABLE_HEALTH=$(curl -s http://olorin-backend/health/ready | jq -r '.status')

if [ "$STABLE_HEALTH" = "ready" ]; then
  echo "✅ Stable version health: ready"
else
  echo "❌ Stable version health: ${STABLE_HEALTH}"
  exit 1
fi

# Check 4: Run contract tests against stable version
cd /olorin-server
poetry run pytest test/contract/ -v

if [ $? -eq 0 ]; then
  echo "✅ Contract tests: passed"
else
  echo "❌ Contract tests: failed"
  exit 1
fi

echo "✅ Rollback verification completed successfully"
```

**Contract Guarantee**: Rollback verification confirms stable operation before declaring success.

## Frontend Deployment

### 1. Frontend Build Validation

**Rule**: Frontend builds MUST pass all validation checks before deployment.

**Validation Pipeline**:
```yaml
# .github/workflows/frontend-deploy.yml
name: Frontend Deployment

on:
  push:
    branches: [main]
    paths: ['olorin-front/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate API types
        run: |
          cd olorin-front
          npm run generate-api-types

      - name: TypeScript type check
        run: |
          cd olorin-front
          npm run typecheck

      - name: Run contract tests
        run: |
          cd olorin-front
          npm run test:contract

      - name: Build production bundle
        run: |
          cd olorin-front
          npm run build

      - name: Verify build output
        run: |
          cd olorin-front/build
          test -f index.html || exit 1
          test -d static || exit 1
```

**Contract Guarantee**: Invalid frontends blocked before deployment.

### 2. Frontend Rollback

**Rule**: Frontend rollbacks MUST restore previous working version within 60 seconds.

**Frontend Rollback Strategy**:
```bash
#!/bin/bash
# deployment/rollback-frontend.sh

set -e

BUCKET="s3://olorin-frontend-prod"
CLOUDFRONT_ID="E1234567890ABC"

echo "🔄 Rolling back frontend to previous version"

# Step 1: Identify previous version
CURRENT_VERSION=$(aws s3 cp ${BUCKET}/version.txt -)
PREVIOUS_VERSION=$(aws s3 cp ${BUCKET}/version-history.txt - | tail -2 | head -1)

echo "Current version: ${CURRENT_VERSION}"
echo "Rolling back to: ${PREVIOUS_VERSION}"

# Step 2: Copy previous version files to current
aws s3 sync ${BUCKET}/releases/${PREVIOUS_VERSION}/ ${BUCKET}/ \
  --delete \
  --exclude "releases/*" \
  --exclude "version-history.txt"

# Step 3: Update version marker
echo ${PREVIOUS_VERSION} > /tmp/version.txt
aws s3 cp /tmp/version.txt ${BUCKET}/version.txt

# Step 4: Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_ID} \
  --paths "/*"

echo "✅ Frontend rollback completed"
echo "⏱️  Total rollback time: ${SECONDS}s"
```

**Contract Guarantee**: Frontend rollback completes in < 60 seconds.

## Independent Deployment

### 1. Backend-Only Deployment

**Rule**: Backend MUST be deployable independently without frontend changes.

**Backend Deployment Criteria**:
- ✅ Backward-compatible API changes only (adding optional fields, new endpoints)
- ✅ Schema version remains compatible with deployed frontend
- ✅ Contract tests pass with current frontend version
- ❌ Breaking changes require coordinated deployment

**Contract Guarantee**: Backward-compatible backend deployments succeed without frontend updates.

### 2. Frontend-Only Deployment

**Rule**: Frontend MUST be deployable independently without backend changes.

**Frontend Deployment Criteria**:
- ✅ Uses existing backend API version
- ✅ Generated types match deployed backend schema
- ✅ Contract tests pass with current backend version
- ❌ Requires new API version → wait for backend deployment

**Contract Guarantee**: Frontend deployments succeed with current backend version.

### 3. Coordinated Deployment

**Rule**: Breaking changes REQUIRE coordinated frontend + backend deployment.

**Coordinated Deployment Process**:
1. Deploy new backend version (v2) alongside existing (v1)
2. Verify v2 backend passes health checks
3. Deploy frontend with v2 API client
4. Gradually migrate traffic from v1 to v2 backend
5. Monitor metrics during migration
6. Deprecate v1 backend after 90-day sunset period

**Contract Guarantee**: Breaking changes deployed with zero downtime.

## Deployment Pipeline

### 1. CI/CD Integration

**Rule**: All deployments MUST go through automated CI/CD pipeline.

**Deployment Pipeline Stages**:
```yaml
# .github/workflows/deploy-production.yml
name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  # Stage 1: Validation
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests
      - name: Run integration tests
      - name: Run contract tests
      - name: Breaking change detection
      - name: Security scan

  # Stage 2: Build
  build:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Build backend Docker image
      - name: Build frontend bundle
      - name: Push artifacts to registry

  # Stage 3: Deploy to staging
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy backend to staging
      - name: Deploy frontend to staging
      - name: Run smoke tests

  # Stage 4: Deploy to production (canary)
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Deploy backend canary
      - name: Monitor canary metrics
      - name: Progressive traffic shifting
      - name: Promote or rollback

  # Stage 5: Post-deployment verification
  verify:
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - name: Run contract tests in production
      - name: Verify health checks
      - name: Monitor error rates
```

**Contract Guarantee**: All deployment stages must pass before production rollout.

### 2. Deployment Approval

**Rule**: Production deployments MAY require manual approval for high-risk changes.

**Approval Criteria**:
- **Automatic**: Backward-compatible changes, < 5% code changes
- **Manual**: Breaking changes, > 20% code changes, database migrations

**Approval Configuration**:
```yaml
deploy-production:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://olorin.prod.example.com
  steps:
    - name: Deploy to production
      # Manual approval required in GitHub Environments
```

**Contract Guarantee**: High-risk deployments reviewed before production.

### 3. Deployment Notifications

**Rule**: Deployment status MUST be communicated to relevant stakeholders.

**Notification Channels**:
- **Slack**: #deployments channel for all deployments
- **Email**: Development team on failures
- **PagerDuty**: On-call engineer for rollbacks

**Notification Example**:
```bash
# deployment/notify.sh
#!/bin/bash

DEPLOYMENT_STATUS="$1"  # success, failure, rollback
VERSION="$2"

if [ "$DEPLOYMENT_STATUS" = "success" ]; then
  MESSAGE="✅ Deployment ${VERSION} completed successfully"
  COLOR="good"
elif [ "$DEPLOYMENT_STATUS" = "rollback" ]; then
  MESSAGE="🔄 Deployment ${VERSION} rolled back automatically"
  COLOR="warning"
else
  MESSAGE="❌ Deployment ${VERSION} failed"
  COLOR="danger"
fi

# Send Slack notification
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"${MESSAGE}\",\"color\":\"${COLOR}\"}"
```

**Contract Guarantee**: All deployment events logged and notified.

## Disaster Recovery

### 1. Complete Rollback Procedure

**Rule**: System MUST support rolling back to any previous stable version.

**Complete Rollback Steps**:
1. Identify last known good version
2. Roll back backend to previous version
3. Roll back frontend to matching version
4. Verify health checks pass
5. Run full contract test suite
6. Monitor metrics for 30 minutes
7. Declare rollback successful

**Contract Guarantee**: Complete rollback to any previous version within 5 minutes.

### 2. Data Migration Rollback

**Rule**: Database migrations MUST be reversible or forward-compatible.

**Migration Strategy**:
- **Expand-Contract Pattern**: Add new columns without removing old ones
- **Backward-Compatible Changes**: Old code works with new schema
- **Rollback Scripts**: Every migration has a down() function

**Example**:
```python
# Migration: Add new field (backward-compatible)
def upgrade():
    op.add_column('investigations', sa.Column('new_field', sa.String(), nullable=True))

def downgrade():
    op.drop_column('investigations', 'new_field')
```

**Contract Guarantee**: All migrations reversible without data loss.

### 3. Incident Response

**Rule**: Production incidents MUST trigger automated incident response workflow.

**Incident Response Workflow**:
1. **Detection**: Monitoring alerts on metric thresholds
2. **Triage**: Automated rollback if criteria met
3. **Notification**: Page on-call engineer
4. **Investigation**: Review logs, metrics, contract tests
5. **Resolution**: Fix issue or complete rollback
6. **Post-Mortem**: Document incident and prevention

**Contract Guarantee**: Incidents detected and responded to within 2 minutes.

## Performance Requirements

| Metric | Target | Measured By |
|--------|--------|-------------|
| Canary rollout time | 15 minutes | Istio traffic shifting |
| Rollback time | < 120s backend, < 60s frontend | Automated script duration |
| Health check response | < 100ms | Kubernetes probe timeout |
| Zero-downtime deployment | 100% uptime | Error rate during deployment |
| Deployment frequency | 2-week sprints | GitHub Actions runs |

**Contract Guarantee**: All performance targets met in production.

## Success Criteria

1. ✅ Canary deployments limit blast radius to 10% initially
2. ✅ Automated rollback completes in < 120 seconds
3. ✅ Health checks validate canary before traffic shifting
4. ✅ Error rate, latency, success rate monitored continuously
5. ✅ Breaking changes detected and blocked before deployment
6. ✅ Independent deployment supported for backward-compatible changes
7. ✅ Coordinated deployment workflow for breaking changes
8. ✅ Post-rollback verification confirms stable operation
9. ✅ 100% deployment success rate with automated recovery
10. ✅ Zero production incidents from interface incompatibility (90 days)

## References

- **Kubernetes Deployment Strategies**: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- **Istio Traffic Management**: https://istio.io/latest/docs/concepts/traffic-management/
- **Canary Deployment Best Practices**: https://martinfowler.com/bliki/CanaryRelease.html
- **Feature Spec**: [../spec.md](../spec.md)
- **Implementation Plan**: [../plan.md](../plan.md)
- **Data Model**: [../data-model.md](../data-model.md)
