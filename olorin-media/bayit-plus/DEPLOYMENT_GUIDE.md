# Deployment Guide

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Backend Deployment](#backend-deployment)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [Release Process](#release-process)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Deployment Overview

BayitPlus uses a multi-tier deployment strategy:

### Environment Stages

| Stage | Purpose | Audience | Frequency |
|-------|---------|----------|-----------|
| **Development** | Feature development and testing | Developers | Continuous |
| **Staging** | Pre-production testing | QA team, beta testers | Weekly |
| **TestFlight** | Public beta testing | Early adopters | Bi-weekly |
| **Production** | Live application | All users | Monthly |

### Deployment Tools

- **Backend**: Docker + AWS/Azure cloud platform
- **Mobile**: TestFlight (beta) + App Store (production)
- **CI/CD**: GitHub Actions for automated pipelines
- **Monitoring**: Sentry for error tracking, CloudWatch for infrastructure

---

## Pre-Deployment Checklist

### Code Quality Verification

```bash
# Backend - Run all tests
cd backend
poetry run pytest --cov=app --cov-report=term-missing
# Verify: >87% code coverage

# Run quality checks
poetry run tox
# Expected: All checks pass (black, isort, mypy, pylint)

# Security scan
poetry run bandit -r app/
# Expected: No high/critical issues

# Check dependencies for vulnerabilities
poetry check --lock

# Mobile - Run linting and tests
cd ../mobile-app
npm run lint
npm run test
npm run test:coverage
# Expected: No errors, >80% coverage
```

### Version and Documentation

```bash
# Update version numbers
# Backend: backend/pyproject.toml → version = "1.0.0"
# Mobile: mobile-app/package.json → "version": "1.0.0"
# Mobile: mobile-app/ios/BayitPlus/Info.plist → CFBundleShortVersionString: 1.0.0

# Update CHANGELOG.md with release notes
# Verify PRIVACY_POLICY.md is current
# Verify all documentation is up-to-date

# Create git tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Environment Configuration

```bash
# Prepare production .env files (do NOT commit)
# Backend: Create backend/.env.production
# Mobile: Create mobile-app/.env.production

# Verify all required variables are set:
echo "Checking API_BASE_URL: $API_BASE_URL"
echo "Checking SENTRY_DSN: ${SENTRY_DSN:0:30}..."  # Partial for security
echo "Checking database: $MONGODB_URI"

# Test database connection
poetry run python scripts/verify-db.py

# Test third-party API keys
poetry run python scripts/verify-api-keys.py
# Expected: ✓ ElevenLabs API: Connected
# Expected: ✓ Picovoice API: Connected
# Expected: ✓ Sentry: Connected
```

### Security Verification

```bash
# Verify no secrets in code
git log --all -S "api_key\|password\|secret" --oneline
# Expected: No recent commits with secrets

# Verify .gitignore protects sensitive files
git check-ignore .env .env.production .env.*.local

# Security scanning
poetry run safety check
# Expected: No known vulnerabilities
```

---

## Backend Deployment

### Step 1: Build Docker Image

```bash
# Navigate to backend
cd backend

# Build Docker image
docker build -t bayitplus-backend:1.0.0 .

# Tag for registry
docker tag bayitplus-backend:1.0.0 registry.example.com/bayitplus/backend:1.0.0

# Verify image
docker image inspect bayitplus-backend:1.0.0
# Expected: Size < 500MB, all layers present
```

### Step 2: Push to Container Registry

```bash
# Login to registry
docker login registry.example.com

# Push image
docker push registry.example.com/bayitplus/backend:1.0.0

# Verify push
docker pull registry.example.com/bayitplus/backend:1.0.0
# Expected: Image downloads successfully
```

### Step 3: Deploy to Production Server

#### Option A: Docker Compose (Single Server)

```bash
# Create docker-compose.yml for production
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: registry.example.com/bayitplus/backend:1.0.0
    container_name: bayitplus-backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      ENVIRONMENT: production
      MONGODB_URI: ${MONGODB_URI}
      SECRET_KEY: ${SECRET_KEY}
      SENTRY_DSN: ${SENTRY_DSN}
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

  nginx:
    image: nginx:alpine
    container_name: bayitplus-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify containers are running
docker-compose -f docker-compose.prod.yml ps
# Expected: backend and nginx showing "Up"
```

#### Option B: Kubernetes (Multi-Server)

```bash
# Create Kubernetes manifests (example)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n bayitplus
# Expected: backend pods showing "Running"

kubectl get svc -n bayitplus
# Expected: backend service with external IP
```

#### Option C: Cloud Platform (AWS/Azure/GCP)

```bash
# Deploy to AWS Elastic Beanstalk
eb init -p python-3.11 bayitplus-backend
eb create production-env
eb deploy production-env

# Or deploy to Azure Container Instances
az container create \
  --resource-group bayitplus \
  --name bayitplus-backend \
  --image registry.example.com/bayitplus/backend:1.0.0 \
  --environment-variables ENVIRONMENT=production ...

# Or deploy to Google Cloud Run
gcloud run deploy bayitplus-backend \
  --image registry.example.com/bayitplus/backend:1.0.0 \
  --platform managed \
  --region us-central1 \
  --set-env-vars ENVIRONMENT=production,...
```

### Step 4: Configure DNS and SSL

```bash
# Update DNS records (example for AWS Route 53)
# Create A record: api.bayitplus.com → Load Balancer IP

# Configure SSL certificate (using Let's Encrypt + certbot)
certbot certonly -d api.bayitplus.com -d *.bayitplus.com
# Copy certificates to deployment location

# Verify SSL
curl -I https://api.bayitplus.com/api/health
# Expected: HTTP/2 200, valid certificate
```

### Step 5: Verify Backend Deployment

```bash
# Test API endpoints
curl -X GET https://api.bayitplus.com/api/health
# Expected: {"status": "healthy"}

curl -X GET https://api.bayitplus.com/api/content
# Expected: Content list returned

# Check logs
docker logs bayitplus-backend | tail -20
# Expected: "Application startup complete"

# Monitor performance
# Visit Sentry dashboard
# Expected: No errors in last deployment
```

---

## Mobile App Deployment

### Step 1: Build for TestFlight (Beta)

```bash
# Navigate to mobile app
cd mobile-app

# Update version number in Xcode
# 1. Open ios/BayitPlus.xcworkspace
# 2. Select project "BayitPlus"
# 3. Select target "BayitPlus"
# 4. Build Settings tab
# 5. Update:
#    - Marketing Version: 1.0.0
#    - Build Number: 1

# Clean build
npm run clean

# Install dependencies
npm install
cd ios && pod install && cd ..

# Build for beta
npm run build:ios:testflight

# Or in Xcode:
# 1. Select "BayitPlus" project
# 2. Select "BayitPlus" target
# 3. Generic iOS Device
# 4. Product → Archive
```

### Step 2: Upload to TestFlight

```bash
# In Xcode Archive view:
# 1. Select latest archive
# 2. "Distribute App"
# 3. Select "TestFlight & App Store"
# 4. Select "Upload"
# 5. Sign in with Apple ID (with App Manager role)
# 6. Select team and app
# 7. Complete upload

# Alternative: Use command line
xcodebuild -exportArchive \
  -archivePath BayitPlus.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ExportedApp

xcrun altool --upload-app \
  --file ExportedApp/BayitPlus.ipa \
  --type ios \
  --apiKey [key] \
  --apiIssuer [issuer]
```

### Step 3: Configure TestFlight Beta Testing

```bash
# In App Store Connect:
# 1. Go to TestFlight tab
# 2. Select Build
# 3. Add beta test information:
#    - Beta app name: BayitPlus Beta
#    - Beta app description: "Test new features"
#    - Feedback email: beta@bayitplus.com
# 4. Select "Add Groups" or "Add Testers"
# 5. Invite internal testers (team members)
# 6. Configure automatic invitations for external testers

# Add beta testers
# Option A: Provide public link to testers
# Option B: Invite specific email addresses
# Option C: Open for automatic invitations
```

### Step 4: Promote to App Store (Production)

```bash
# Wait for TestFlight testing complete (minimum 1 week)
# Verify bug-free status

# In Xcode, build next version:
# Update build number: 2
# Archive and upload to TestFlight as Release Candidate

# In App Store Connect:
# 1. Go to App Information
# 2. Set pricing and availability
# 3. Go to Version Information
# 4. Set release notes:
#    - "BayitPlus 1.0.0
#     - Voice features for hands-free control
#     - Multi-language support (English, Hebrew, Spanish)
#     - Performance improvements (66% faster startup)
#     - Accessibility framework"
# 5. Select build for submission
# 6. Submit for review

# Or use command line
xcrun altool --validate-app \
  --file BayitPlus.ipa \
  --type ios \
  --apiKey [key]

xcrun altool --upload-app \
  --file BayitPlus.ipa \
  --type ios \
  --apiKey [key] \
  --bundle-short-version-string 1.0.0 \
  --bundle-version 1
```

### Step 5: App Store Review

**Timeline**: 24-48 hours typically

**Review Guidelines Compliance**:
- ✓ App privacy policy displayed
- ✓ Microphone usage documented
- ✓ No private APIs used
- ✓ No hardcoded credentials
- ✓ Proper error handling
- ✓ Crash-free performance

**If Rejected**:
1. Read rejection reason carefully
2. Fix issues identified
3. Prepare response explaining fix
4. Resubmit (usually approved next attempt)

**On Approval**:
- App automatically released to App Store
- Users can download from App Store
- Sentry and analytics begin tracking

---

## Release Process

### Pre-Release (T-minus 5 days)

```bash
# Day 1: Create release branch
git checkout -b release/1.0.0
# Make only critical bug fixes, no features

# Day 2: Build and test
npm run build:ios:testflight
# Deploy to TestFlight
# Distribute to internal testers

# Day 3-4: Internal testing
# Run comprehensive test plan
# Report bugs
# Fix critical issues only

# Day 5: Release branch review
# Code review all changes
# Verify all tests pass
# Sign off on release
```

### Release Day (Promotion to Production)

```bash
# 1. Ensure all tests pass
npm run test
poetry run pytest
# Expected: ✓ All pass

# 2. Merge to main
git checkout main
git pull
git merge release/1.0.0
git push

# 3. Create release tag
git tag -a v1.0.0 -m "Release BayitPlus 1.0.0"
git push --tags

# 4. Build production version
npm run build:ios:production
# Expected: App signed with distribution certificate

# 5. Upload to App Store
# See "Step 4: Promote to App Store" above

# 6. Monitor deployment
# Watch Sentry dashboard for errors
# Monitor App Store Connect charts
# Respond to user feedback

# 7. Keep release/1.0.0 branch for hotfixes
# Don't delete until next major release
```

### Post-Release Monitoring

```bash
# First 24 hours: Active monitoring
# - Check crash rate
# - Monitor error rates
# - Review user ratings
# - Check support tickets

# Commands to monitor:
# Sentry dashboard: All issues
# App Store: Ratings and reviews
# Analytics: Usage metrics
# Error rate: Should be <0.1%
```

---

## Rollback Procedures

### If Critical Issue Discovered

```bash
# Step 1: Assess severity
# Critical: App crashing, major features broken, security issue
# Major: Important functionality unavailable
# Minor: Cosmetic or edge case issues

# Step 2: For Critical Issues - Immediate Rollback
if [ "CRITICAL" == true ]; then
  # Option A: App Store (wait for review, fastest is ~24 hours)
  # Create new build with fix, resubmit

  # Option B: TestFlight (immediate)
  # Promote previous TestFlight build to production
  # Users on beta will get rolled-back version

  # Option C: Feature flag (fastest if implemented)
  # Toggle feature off server-side
  # Maintains current version, disables problematic feature
fi

# Step 3: Root cause analysis
# Create incident report
# Identify what caused issue
# Plan prevention

# Step 4: Fix and re-release
# Create hotfix branch from release tag
git checkout -b hotfix/1.0.1 v1.0.0
# Make targeted fix
# Test thoroughly
# Merge to main and release/1.0.0
# Tag as v1.0.1
# Re-submit to App Store
```

### Rollback Without Feature Flag

```bash
# If you need to roll back version in App Store:
# 1. In App Store Connect
# 2. Go to Version History
# 3. Previous version should still be available
# 4. Click "+" to add it back
# 5. Submit version selection for review
# 6. Apple typically approves quickly

# Timeline: 4-8 hours instead of 24-48 hours

# Note: Users who updated will need to downgrade manually
# Not ideal - prevent with thorough testing!
```

---

## Post-Deployment Verification

### Immediate Verification (First 30 minutes)

```bash
# Backend Health
curl https://api.bayitplus.com/api/health
# Expected: {"status": "healthy"}

# Critical endpoints
curl https://api.bayitplus.com/api/content
curl https://api.bayitplus.com/api/voice/health
curl https://api.bayitplus.com/api/user/profile

# Check error logs
# Expected: No new errors in Sentry

# Database connectivity
# Expected: Queries returning data within normal latency

# Third-party service status
# Expected: ElevenLabs, Picovoice, Sentry all responding
```

### Short-Term Verification (24 hours)

```bash
# Performance metrics
# - API response time: <200ms p95
# - Error rate: <0.1%
# - Crash rate: <0.05%
# - Voice command success: >95%

# User feedback
# - Check App Store reviews
# - Monitor support email
# - Review social media mentions

# Analytics
# - Active users increasing
# - No unusual drop-off patterns
# - Feature usage as expected

# Sentry dashboard
# - No new exception patterns
# - Error rate stable
# - Performance baseline maintained
```

### Long-Term Verification (1 week)

```bash
# Stability metrics
# - Crash rate trending down (if any issues found)
# - Error rate stable
# - Performance stable
# - User retention stable

# Feature adoption
# - Voice commands being used
# - Multi-language adoption
# - Accessibility features used

# Database performance
# - Query response times normal
# - No slow queries emerging
# - Indexes performing well

# Prepare for next release
# - Archive logs
# - Document lessons learned
# - Plan next version
```

---

## Monitoring and Maintenance

### Daily Monitoring

```bash
# Check Sentry dashboard
# Expected: <0.1% error rate, stable

# Check App Store Connect
# Expected: Positive trend in ratings/reviews

# Check analytics
# Expected: Normal usage patterns

# Check uptime/status page
# Expected: 99.9%+ uptime
```

### Weekly Maintenance

```bash
# Backend
# - Review slow query logs
# - Check database growth rate
# - Verify backups completed

# Mobile
# - Monitor crash reports
# - Review user ratings
# - Check for platform updates needed

# Infrastructure
# - Check resource utilization
# - Review security logs
# - Verify SSL certificates (renewal if needed)
```

### Monthly Review

```bash
# Performance analysis
# - Compile metrics report
# - Compare to baseline
# - Identify optimization opportunities

# Security audit
# - Review access logs
# - Check for suspicious activity
# - Verify security patches applied

# User feedback
# - Analyze support tickets
# - Review feature requests
# - Plan next version improvements

# Release planning
# - Document completed items
# - Plan next features
# - Prepare next version deployment plan
```

---

## Support and Escalation

### Contact Information

- **Production Issues**: operations@bayitplus.com
- **Security Issues**: security@bayitplus.com
- **Support Requests**: support@bayitplus.com

### Escalation Path

1. **P1 (Critical)**: Immediate notification, executive team
2. **P2 (High)**: Within 2 hours, engineering team
3. **P3 (Medium)**: Within 8 hours, product team
4. **P4 (Low)**: Within 24 hours, standard process

---

## Version History

| Version | Release Date | Notes |
|---------|-------------|-------|
| 1.0.0 | 2026-01-20 | Initial production release |

---

**Last Updated**: January 20, 2026
**Next Review**: February 20, 2026
