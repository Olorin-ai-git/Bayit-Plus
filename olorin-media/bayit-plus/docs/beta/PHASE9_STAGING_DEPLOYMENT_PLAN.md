# Phase 9: Staging Deployment - Implementation Plan

**Status**: In Progress ⏳
**Date**: 2026-01-30
**Target**: Deploy Beta 500 to staging with full monitoring

---

## 📋 Overview

Deploy Beta 500 closed beta program to staging environment for final validation before production launch. Includes backend services, frontend applications, monitoring stack, and comprehensive testing.

---

## 🎯 Objectives

1. **Deploy Infrastructure** - Staging environment with production-like configuration
2. **Deploy Services** - All Beta 500 backend services and APIs
3. **Deploy Monitoring** - Prometheus/Grafana/Alertmanager stack
4. **Validate Features** - Integration and load testing on staging
5. **Document Process** - Deployment runbook for production

---

## 🏗️ Architecture

### Staging Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                       │
│                   staging.bayit.plus                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Backend API    │  │  Frontend Apps   │                │
│  │  (FastAPI/Uvic)  │  │  (React/RN/tvOS) │                │
│  │                  │  │                  │                │
│  │  Port: 8080      │  │  Web: 443        │                │
│  │  Replicas: 2     │  │  Mobile: Build   │                │
│  └────────┬─────────┘  └──────────────────┘                │
│           │                                                  │
│  ┌────────▼─────────────────────────────────┐               │
│  │         MongoDB Atlas (Staging)          │               │
│  │  - Beta credits collection               │               │
│  │  - Beta users collection                 │               │
│  │  - Beta transactions collection          │               │
│  │  - Beta sessions collection              │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │     Monitoring Stack                   │                 │
│  │  - Prometheus (port 9090)              │                 │
│  │  - Grafana (port 3000)                 │                 │
│  │  - Alertmanager (port 9093)            │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │     External Services                  │                 │
│  │  - GCloud Secret Manager (staging)     │                 │
│  │  - ElevenLabs API                      │                 │
│  │  - OpenAI API                          │                 │
│  │  - Anthropic API                       │                 │
│  │  - Firebase Auth                       │                 │
│  └────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Components

### 1. Backend Services

**Container Image**: `gcr.io/bayit-plus/backend:beta-500-staging`

**Services to Deploy**:
- BetaCreditService (credit management)
- BetaAISearchService (natural language search)
- BetaAIRecommendationsService (personalized recommendations)
- SessionBasedCreditService (session tracking)
- EmailVerificationService (beta signup)
- FraudDetectionService (signup fraud prevention)
- BetaDubbingIntegration (VOD dubbing)
- BetaLiveDubbingIntegration (live channel dubbing)
- BetaLiveTranslationIntegration (live subtitle translation)
- BetaPodcastTranslationIntegration (podcast translation)

**API Endpoints** (8 total):
```
POST   /api/v1/beta/signup              # Beta program enrollment
POST   /api/v1/beta/verify-email        # Email verification
GET    /api/v1/beta/credits/balance     # Get credit balance
POST   /api/v1/beta/credits/history     # Transaction history
POST   /api/v1/beta/search              # AI-powered search
GET    /api/v1/beta/recommendations     # Personalized recommendations
POST   /api/v1/beta/sessions/start      # Start dubbing session
POST   /api/v1/beta/sessions/checkpoint # Session checkpoint
```

**Environment Requirements**:
- MongoDB Atlas connection (staging cluster)
- GCloud Secret Manager access (staging secrets)
- External API keys (ElevenLabs, OpenAI, Anthropic)
- Firebase Auth configuration

**Resource Allocation**:
- CPU: 2 vCPU per replica
- Memory: 4GB per replica
- Replicas: 2 (load balanced)
- Autoscaling: 2-4 replicas based on CPU (>70%)

### 2. Frontend Applications

#### Web Application
- **Deployment**: Firebase Hosting (staging)
- **URL**: `https://staging.bayit.plus`
- **Build**: Production build with staging API endpoints
- **Components**:
  - AISearchModal (natural language search)
  - AIRecommendationsPanel (personalized content)
  - BetaCreditBalance widget (credit display)

#### Mobile Application (iOS/Android)
- **Build**: Staging build via Expo
- **Distribution**: TestFlight (iOS), Firebase App Distribution (Android)
- **API**: Points to staging backend (`https://api-staging.bayit.plus`)

#### tvOS Application
- **Build**: Staging build via Xcode
- **Distribution**: TestFlight
- **API**: Points to staging backend

### 3. Monitoring Stack

#### Prometheus
- **Deployment**: Docker container on GCP Compute Engine
- **Port**: 9090
- **Configuration**: `/infrastructure/monitoring/prometheus/`
- **Scrape Targets**:
  - Backend API metrics (`/metrics` endpoint)
  - MongoDB Atlas exporter
  - Node exporter (system metrics)
- **Retention**: 15 days (staging)
- **Storage**: 50GB persistent disk

#### Grafana
- **Deployment**: Docker container on same GCP instance
- **Port**: 3000
- **Dashboard**: Beta 500 Overview (12 panels)
- **Data Source**: Prometheus
- **Alerts**: Configured via Alertmanager

#### Alertmanager
- **Deployment**: Docker container
- **Port**: 9093
- **Configuration**: `/infrastructure/monitoring/prometheus/beta-500-alerts.yml`
- **Notification Channels**:
  - Slack: #beta-500-alerts (high/critical only)
  - Email: devops@bayit.plus (all severities)
- **Alert Rules**: 40+ alerts (P0-P3 + SLO)

### 4. GCloud Secrets (Staging)

**16 Secrets to Provision**:

```bash
# Beta 500 Program Configuration
gcloud secrets create BETA_500_PROGRAM_ACTIVE --data-file=- <<< "true"
gcloud secrets create BETA_500_MAX_USERS --data-file=- <<< "500"
gcloud secrets create BETA_500_INITIAL_CREDITS --data-file=- <<< "5000"

# Email Verification
gcloud secrets create BETA_EMAIL_VERIFICATION_SECRET --data-file=- <<< "[generate-hmac-secret]"
gcloud secrets create BETA_EMAIL_FROM_ADDRESS --data-file=- <<< "beta@bayit.plus"
gcloud secrets create BETA_EMAIL_SMTP_HOST --data-file=- <<< "smtp.gmail.com"
gcloud secrets create BETA_EMAIL_SMTP_PORT --data-file=- <<< "587"
gcloud secrets create BETA_EMAIL_SMTP_PASSWORD --data-file=- <<< "[gmail-app-password]"

# Fraud Detection
gcloud secrets create BETA_FRAUD_FINGERPRINT_SALT --data-file=- <<< "[generate-salt]"
gcloud secrets create BETA_FRAUD_MAX_SIGNUPS_PER_FINGERPRINT --data-file=- <<< "3"
gcloud secrets create BETA_FRAUD_DISPOSABLE_EMAIL_DOMAINS --data-file=- <<< "tempmail.com,guerrillamail.com,10minutemail.com"

# Credit System
gcloud secrets create BETA_CREDIT_COST_PER_SECOND --data-file=- <<< "1"
gcloud secrets create BETA_SESSION_CHECKPOINT_INTERVAL --data-file=- <<< "30"

# Monitoring
gcloud secrets create BETA_PROMETHEUS_SCRAPE_INTERVAL --data-file=- <<< "15s"
gcloud secrets create BETA_GRAFANA_ADMIN_PASSWORD --data-file=- <<< "[generate-password]"
gcloud secrets create BETA_ALERTMANAGER_SLACK_WEBHOOK --data-file=- <<< "[slack-webhook-url]"
```

**Service Account Access**:
```bash
# Grant backend service account access to all Beta secrets
gcloud secrets add-iam-policy-binding BETA_500_PROGRAM_ACTIVE \
  --member="serviceAccount:bayit-backend-staging@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all 16 secrets...
```

---

## 🚀 Deployment Steps

### Pre-Deployment Checklist

- [ ] All Phase 7 unit tests passing (62/67 minimum)
- [ ] All Phase 8 infrastructure configured
- [ ] GCloud secrets provisioned for staging
- [ ] MongoDB Atlas staging cluster created
- [ ] Firebase Hosting staging site configured
- [ ] GitHub Actions secrets configured
- [ ] Monitoring stack Docker images built

### Step 1: Provision Infrastructure (1 hour)

```bash
# 1. Create GCP Compute Engine instance for monitoring
gcloud compute instances create beta-500-monitoring-staging \
  --zone=us-central1-a \
  --machine-type=n1-standard-2 \
  --boot-disk-size=50GB \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server

# 2. Create MongoDB Atlas staging cluster
# (Use Atlas UI - M10 cluster, us-east-1, auto-scaling enabled)

# 3. Configure Firebase Hosting staging
firebase hosting:channel:create staging --project bayit-plus

# 4. Provision GCloud secrets (run script)
./scripts/provision-beta-secrets-staging.sh
```

### Step 2: Deploy Backend (30 minutes)

```bash
# 1. Build Docker image
cd backend
docker build -t gcr.io/bayit-plus/backend:beta-500-staging .

# 2. Push to Google Container Registry
docker push gcr.io/bayit-plus/backend:beta-500-staging

# 3. Deploy to Cloud Run
gcloud run deploy bayit-backend-staging \
  --image=gcr.io/bayit-plus/backend:beta-500-staging \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --min-instances=2 \
  --max-instances=4 \
  --memory=4Gi \
  --cpu=2 \
  --set-env-vars="ENVIRONMENT=staging,MONGODB_URI=mongodb+srv://staging.bayit.plus" \
  --set-secrets="BETA_500_PROGRAM_ACTIVE=BETA_500_PROGRAM_ACTIVE:latest"

# 4. Verify deployment
curl https://bayit-backend-staging-xxx.run.app/health
curl https://bayit-backend-staging-xxx.run.app/api/v1/beta/credits/balance
```

### Step 3: Deploy Monitoring Stack (45 minutes)

```bash
# 1. SSH to monitoring instance
gcloud compute ssh beta-500-monitoring-staging

# 2. Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 3. Copy monitoring configs
scp -r infrastructure/monitoring/* beta-500-monitoring-staging:~/

# 4. Start monitoring stack
cd ~/monitoring
docker-compose up -d prometheus grafana alertmanager

# 5. Configure Grafana dashboard
# Import dashboard from infrastructure/monitoring/grafana/beta-500-dashboard.json
# Add Prometheus data source

# 6. Verify monitoring
curl http://localhost:9090/api/v1/targets  # Prometheus targets
curl http://localhost:3000  # Grafana UI
```

### Step 4: Deploy Frontend (30 minutes)

```bash
# Web Application
cd web
npm run build
firebase deploy --only hosting:staging --project bayit-plus

# Mobile Application (iOS)
cd mobile-app
eas build --platform ios --profile staging
eas submit --platform ios --profile staging

# Mobile Application (Android)
eas build --platform android --profile staging
eas submit --platform android --profile staging

# tvOS Application
cd tvos-app
xcodebuild -scheme "BayitTV Staging" -configuration Staging archive
# Upload to TestFlight via Xcode
```

### Step 5: Run Integration Tests (20 minutes)

```bash
# 1. Configure test environment
export API_BASE_URL="https://bayit-backend-staging-xxx.run.app"
export TEST_USER_EMAIL="test@bayit.plus"

# 2. Run integration tests
cd backend
PYTHONPATH=. poetry run pytest test/integration/test_beta_500_api.py -v
PYTHONPATH=. poetry run pytest test/integration/test_beta_ai_api.py -v

# Expected: 28/28 tests passing

# 3. Run E2E tests (web)
cd web
npx playwright test tests/beta/ --project=chromium

# 4. Verify API endpoints manually
curl -X POST https://api-staging.bayit.plus/api/v1/beta/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "browser_fingerprint": "test-123"}'
```

### Step 6: Run Load Tests (1 hour)

```bash
# 1. Configure Locust for staging
cd backend/tests/load/beta
export LOCUST_HOST="https://api-staging.bayit.plus"

# 2. Run load test (500 concurrent users)
locust -f locustfile.py \
  --users 500 \
  --spawn-rate 10 \
  --run-time 10m \
  --html=load-test-report.html

# 3. Monitor results in Grafana
# - p50 latency < 200ms ✅
# - p95 latency < 500ms ✅
# - p99 latency < 1000ms ✅
# - Error rate < 0.1% ✅
# - Credit operations < 100ms ✅

# 4. Validate monitoring alerts
# Check Prometheus for active alerts
curl http://monitoring-staging:9090/api/v1/alerts

# 5. Generate load test report
locust --html=reports/staging-load-test-$(date +%Y%m%d).html
```

### Step 7: Validate Beta Features (30 minutes)

**Manual Testing Checklist**:

- [ ] **Signup Flow**
  - [ ] Email verification sent
  - [ ] Verification token works
  - [ ] Fraud detection working
  - [ ] 5,000 initial credits granted

- [ ] **Credit System**
  - [ ] Balance displayed correctly
  - [ ] Transaction history accurate
  - [ ] Credit deduction working
  - [ ] Insufficient credits handled

- [ ] **AI Search**
  - [ ] Natural language queries work
  - [ ] Results relevant and ranked
  - [ ] 2 credits deducted per search
  - [ ] Multi-language queries work

- [ ] **AI Recommendations**
  - [ ] Personalized recommendations shown
  - [ ] Viewing history considered
  - [ ] 3 credits deducted per request
  - [ ] Recommendations refreshable

- [ ] **Live Dubbing**
  - [ ] Session starts with credit check
  - [ ] Checkpoints every 30 seconds
  - [ ] Session ends correctly
  - [ ] Credits deducted accurately

- [ ] **Live Translation**
  - [ ] Subtitles translated in real-time
  - [ ] Credits deducted per 30s
  - [ ] Translation stops when credits depleted

- [ ] **Podcast Translation**
  - [ ] Translation request accepted
  - [ ] Progress tracked
  - [ ] Credits deducted by stage
  - [ ] Final episode available

- [ ] **Monitoring**
  - [ ] Metrics flowing to Prometheus
  - [ ] Grafana dashboard updating
  - [ ] Alerts configured
  - [ ] Slack notifications working

---

## ✅ Success Criteria

### Deployment Success
- ✅ Backend API deployed and healthy (2 replicas running)
- ✅ Frontend apps deployed (web + mobile + tvOS)
- ✅ Monitoring stack operational (Prometheus + Grafana + Alertmanager)
- ✅ All secrets provisioned and accessible

### Testing Success
- ✅ Integration tests: 28/28 passing
- ✅ Load tests: p95 < 500ms, error rate < 0.1%
- ✅ Manual validation: All features working
- ✅ Monitoring: Metrics flowing, alerts configured

### Performance Targets (Staging)
- ✅ API availability: > 99.5%
- ✅ AI Search p95 latency: < 500ms
- ✅ AI Recommendations p95 latency: < 1000ms
- ✅ Credit operations p95 latency: < 100ms
- ✅ Concurrent users: 500 supported

---

## 📊 Monitoring & Alerts

### Prometheus Metrics (30+)
- `beta_users_total` - Total enrolled users
- `beta_users_active` - Active users (24h)
- `beta_credits_remaining` - Total credits remaining
- `beta_credits_deducted_total` - Total credits consumed
- `beta_ai_search_requests_total` - AI search requests
- `beta_ai_recommendations_requests_total` - AI recommendations
- `beta_api_errors_total` - API error count
- `beta_api_latency_seconds` - API latency histogram

### Grafana Dashboards
1. **Beta 500 Overview** (12 panels)
   - Program overview (enrolled/active/verified users)
   - Credit system health
   - API performance (p95 latency)
   - Feature usage (requests/min)
   - Error rates
   - Low credit users

### Alert Rules (40+)
- **P0 Critical**: API error rate > 5%, credit system down
- **P1 High**: API latency > 1s, massive credit depletion
- **P2 Medium**: Enrollment stalled, low email verification rate
- **P3 Low**: Program near capacity, average credits low
- **SLO Alerts**: Availability < 99.9%, latency thresholds

---

## 🔄 Rollback Plan

### Scenario 1: Backend Deployment Failure

```bash
# 1. Revert to previous Cloud Run revision
gcloud run services update-traffic bayit-backend-staging \
  --to-revisions=bayit-backend-staging-00001-xxx=100

# 2. Verify rollback
curl https://bayit-backend-staging-xxx.run.app/health
```

### Scenario 2: Database Migration Issues

```bash
# 1. Restore MongoDB Atlas snapshot
# (Use Atlas UI - restore to specific timestamp)

# 2. Verify data integrity
mongo "mongodb+srv://staging.bayit.plus" --eval "db.beta_credits.count()"
```

### Scenario 3: Frontend Issues

```bash
# 1. Revert Firebase Hosting deployment
firebase hosting:rollback --project bayit-plus

# 2. Verify rollback
curl https://staging.bayit.plus
```

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor Grafana dashboard for first 24 hours
- [ ] Check error logs for anomalies
- [ ] Verify all alerts configured correctly
- [ ] Send staging access to QA team
- [ ] Document any deployment issues

### Short-term (Week 1)
- [ ] Conduct UAT (User Acceptance Testing) with 10 beta testers
- [ ] Collect feedback on UI/UX
- [ ] Monitor credit consumption patterns
- [ ] Review load test results
- [ ] Optimize slow queries (if any)

### Medium-term (Week 2-3)
- [ ] Run chaos engineering tests (fault injection)
- [ ] Test disaster recovery procedures
- [ ] Conduct security penetration testing
- [ ] Performance optimization based on metrics
- [ ] Prepare production deployment plan

---

## 🔐 Security Considerations

### Access Control
- Backend API: Service account authentication
- MongoDB Atlas: IP whitelist + VPC peering
- GCloud Secrets: Service account with least privilege
- Monitoring: Basic auth for Grafana/Prometheus

### Secrets Management
- All secrets in GCloud Secret Manager
- No hardcoded credentials
- Automatic rotation every 90 days
- Audit logging enabled

### Network Security
- HTTPS only (TLS 1.3)
- CORS configured for staging domains
- Rate limiting per IP (100 req/min)
- DDoS protection via Cloud Armor

---

## 📈 KPIs to Track

### Business Metrics
- Beta user enrollment rate (target: 50/day)
- Email verification rate (target: > 70%)
- Feature adoption rates
- Average credits consumed per user
- User retention (7-day, 30-day)

### Technical Metrics
- API availability (target: > 99.9%)
- API latency (p95 target: < 500ms)
- Error rate (target: < 0.1%)
- Database query performance
- Credit system throughput

### Operational Metrics
- Deployment frequency
- Mean time to recovery (MTTR)
- Change failure rate
- Lead time for changes

---

## 🎯 Next Steps (Phase 10: Production)

Once staging deployment is validated:
1. **Production Deployment Plan** - Blue-green deployment strategy
2. **Beta Launch Communications** - Email to 500 families
3. **Community Outreach** - Israeli expat Facebook groups
4. **Support Documentation** - Beta 500 user manual
5. **Go-Live Checklist** - Final production readiness review

---

## 📚 References

- **Phase 7: Testing Strategy** - `/docs/beta/PHASE7_TESTING_STRATEGY.md`
- **Phase 8: Infrastructure** - `/docs/beta/PHASE8_INFRASTRUCTURE_SUMMARY.md`
- **GCloud Secrets** - `/docs/deployment/GCLOUD_SECRETS_BETA_500.md`
- **Monitoring Setup** - `/docs/deployment/MONITORING_SETUP.md`
- **GitHub Actions CI/CD** - `/.github/workflows/beta-ci-cd.yml`
- **Load Testing Guide** - `/backend/tests/load/beta/README.md`
