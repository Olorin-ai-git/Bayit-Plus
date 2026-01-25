# Platform Deployment Order & Coordination

**Purpose**: Define the correct deployment order across all Bayit+ platforms to ensure dependencies are satisfied and minimize deployment risks.

**Last Updated**: 2026-01-25

---

## Deployment Order (Strictly Enforced)

```
1. Backend Services (Python/FastAPI)
   └─ Deploy to Cloud Run (staging or production)
   └─ Validate APIs functional
   └─ Run smoke tests
   └─ Duration: ~10 minutes

2. Shared Packages (@bayit/glass-ui)
   └─ Build and publish to npm
   └─ Validate package integrity
   └─ Duration: ~5 minutes

3. Web Application (React)
   └─ Deploy to Firebase Hosting (preview or production)
   └─ Run Playwright cross-browser tests
   └─ Duration: ~15 minutes

4. Mobile Apps (iOS/Android)
   └─ Build release candidates
   └─ TestFlight/Google Play internal testing
   └─ Beta tester validation (72h minimum)
   └─ Duration: ~20 minutes build + 72h beta

5. tvOS Application
   └─ Build release candidate
   └─ TestFlight beta
   └─ Beta testing (48h minimum)
   └─ Duration: ~15 minutes build + 48h beta
```

**Total Time**:
- **Staging**: ~65 minutes (all platforms built)
- **Production**: ~65 minutes build + 72h beta testing + manual approvals

---

## Why This Order?

### 1. Backend First (Foundation)

**Rationale**: Backend provides APIs that all frontend platforms depend on.

**Dependencies**:
- Database (MongoDB Atlas) - already running
- Google Cloud Storage - already configured
- Firebase Auth - already configured

**Deployment**:
```bash
cd backend
poetry install --no-dev
poetry build
gcloud run deploy bayit-backend-staging \
  --region=us-central1 \
  --tag=staging
```

**Validation**:
- Health endpoint: `GET /health`
- API endpoints: `GET /api/notifications`
- Database connectivity: `GET /api/health/db`
- Response time: <2s

**Rollback**:
- Git revert: ~2 minutes
- Traffic rollback: ~3 minutes

---

### 2. Shared Packages Second (Dependencies)

**Rationale**: Web and mobile apps import `@bayit/glass-ui` components.

**Dependencies**:
- None (standalone package)

**Deployment**:
```bash
cd packages/ui/glass-components
npm ci
npm run build
npm publish  # Production only
```

**Validation**:
- Package builds without errors
- TypeScript types generated
- All exports valid
- No missing dependencies

**Rollback**:
- Publish previous version: `npm publish @bayit/glass-ui@1.0.0`

---

### 3. Web Application Third (First Frontend)

**Rationale**: Fastest to deploy, easiest to rollback, widest reach.

**Dependencies**:
- Backend APIs (deployed in step 1)
- Shared packages (deployed in step 2)

**Deployment**:
```bash
cd web
npm ci
npm run build
firebase hosting:channel:deploy staging  # Staging
firebase deploy --only hosting:production  # Production
```

**Validation**:
- App loads successfully
- API calls working
- Notifications rendering
- No console errors
- Performance: FCP <1.5s, LCP <2.5s

**Rollback**:
- Firebase Hosting rollback: ~2 minutes
- Traffic split to previous version: instant

---

### 4. Mobile Apps Fourth (iOS/Android)

**Rationale**: Requires app store approval, longest deployment cycle.

**Dependencies**:
- Backend APIs (deployed in step 1)
- Shared packages (deployed in step 2)

**Deployment**:
```bash
cd mobile-app
npm ci

# iOS
npx react-native bundle --platform ios \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle

# Build in Xcode
# Upload to TestFlight (staging) or App Store (production)

# Android
npx react-native bundle --platform android \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle

# Build release APK/AAB
# Upload to Play Console internal (staging) or production
```

**Platform-Specific Considerations**:

**iOS**:
- Requires macOS for Xcode builds
- TestFlight beta review: 24-48h
- App Store review: 1-3 days
- Minimum iOS version: 14.0+
- Push notifications: APNs configured
- In-app purchases: StoreKit configured

**Android**:
- Can build on any platform
- Play Console internal: immediate
- Play Console production review: 1-3 days
- Minimum Android version: 10.0+ (API 29)
- Push notifications: FCM configured

**Validation**:
- App launches without crashes
- API calls working
- Notifications rendering
- Gestures working (swipe, haptics)
- Safe areas respected
- No memory leaks

**Rollback**:
- iOS: Revert to previous TestFlight build
- Android: Rollback via Play Console (percentage-based)

---

### 5. tvOS Application Fifth (Apple TV)

**Rationale**: Smallest user base, most specialized platform.

**Dependencies**:
- Backend APIs (deployed in step 1)
- Shared packages (deployed in step 2)

**Deployment**:
```bash
cd tvos-app
npm ci
npx react-native bundle --platform ios \
  --entry-file index.js \
  --bundle-output tvos/main.jsbundle

# Build in Xcode (tvOS target)
# Upload to TestFlight (staging) or App Store (production)
```

**Platform-Specific Considerations**:
- Requires macOS with Xcode
- TestFlight beta: 24-48h review
- App Store review: 1-3 days
- Minimum tvOS version: 15.0+
- Siri Remote navigation required
- 10-foot UI requirements (31pt+ font)
- Top Shelf extension configured

**Validation**:
- App launches on Apple TV 4K simulator
- Focus navigation working (no traps)
- D-pad navigation flows naturally
- Notifications render at bottom
- 10-foot UI legible
- Siri Remote gestures work

**Rollback**:
- Revert to previous TestFlight build

---

## Cross-Platform Validation

After all platforms deployed, validate:

### API Consistency
```bash
# Same backend serves all platforms
curl https://staging.bayitplus.com/api/notifications

# Verify response format matches all clients
```

### Authentication Flow
```bash
# Firebase Auth works across platforms
# Test login on: Web, iOS, Android, tvOS
```

### Notification System
```bash
# GlassToast renders on all platforms
# Test notification levels: success, error, warning, info
```

### Real-Time Updates
```bash
# WebSocket connections work on all platforms
# Test adaptive polling on all clients
```

---

## Deployment Coordination Script

**Script**: `./scripts/deployment/deploy-all-platforms.sh`

**Usage**:
```bash
# Staging deployment
ENVIRONMENT=staging ./scripts/deployment/deploy-all-platforms.sh

# Production deployment
ENVIRONMENT=production ./scripts/deployment/deploy-all-platforms.sh
```

**What It Does**:
1. Deploys backend to Cloud Run
2. Builds and publishes shared packages
3. Deploys web to Firebase Hosting
4. Builds mobile app bundles (iOS/Android)
5. Builds tvOS app bundle
6. Runs smoke tests (staging only)
7. Generates deployment summary log

**Output**: Deployment log saved to `logs/deployment/multi-platform-YYYYMMDD-HHMMSS.log`

---

## Beta Testing Process

### Staging Environment

**Backend**: `https://staging.bayitplus.com`
**Web**: `https://bayitplus-staging.web.app`

**Mobile Apps**:
- iOS: TestFlight internal testing (up to 100 testers)
- Android: Google Play internal testing (unlimited testers)

**tvOS App**:
- TestFlight internal testing (up to 100 testers)

### Beta Tester Requirements

**Minimum Beta Test Duration**:
- Mobile apps: 72 hours
- tvOS app: 48 hours
- Web: 24 hours (faster rollback available)

**Beta Tester Criteria**:
- At least 10 testers per platform
- Mix of devices (iPhone SE, 15, 15 Pro Max, iPad, various Android)
- Mix of OS versions (iOS 14-18, Android 10-14)
- Beta testers from different locales (for i18n testing)

**Beta Feedback Requirements**:
- No critical bugs reported
- No crashes in logs
- Performance acceptable (no lag, smooth animations)
- All core features functional (notifications, auth, content playback)
- Positive feedback from majority of testers

---

## Production Deployment Checklist

**Pre-Deployment**:
- [ ] All staging deployments successful
- [ ] All beta testing complete (72h mobile, 48h tvOS, 24h web)
- [ ] No critical bugs reported
- [ ] Performance metrics acceptable
- [ ] Rollback procedures tested
- [ ] Production monitoring configured
- [ ] On-call engineer assigned
- [ ] Stakeholders notified

**During Deployment**:
- [ ] Deploy backend (validate before proceeding)
- [ ] Publish shared packages
- [ ] Deploy web (validate before proceeding)
- [ ] Upload mobile builds to App Store/Play Store
- [ ] Upload tvOS build to App Store
- [ ] Monitor metrics continuously

**Post-Deployment**:
- [ ] All platforms deployed successfully
- [ ] Health checks passing
- [ ] Error rate within baseline
- [ ] Latency acceptable
- [ ] No user-reported issues
- [ ] 72h monitoring period complete

---

## Platform-Specific Deployment Notes

### Backend (Cloud Run)

**Configuration**:
- Region: `us-central1`
- Min instances: 1
- Max instances: 10
- Memory: 2Gi
- CPU: 2
- Timeout: 300s

**Environment Variables**:
```bash
ENV=production
DATABASE_URL=<MongoDB Atlas connection string>
GCS_BUCKET=bayit-storage-production
FIREBASE_PROJECT_ID=bayitplus
```

**Monitoring**:
- Cloud Run metrics dashboard
- Cloud Logging for errors
- Sentry for application errors

---

### Web (Firebase Hosting)

**Configuration**:
- Domain: `bayitplus.com`
- CDN: Firebase CDN (global)
- HTTPS: Automatic (Firebase-managed SSL)
- Caching: Static assets (1 year), HTML (1 hour)

**Performance Targets**:
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Cumulative Layout Shift (CLS): <0.1
- Time to Interactive (TTI): <3.5s

---

### Mobile Apps (iOS/Android)

**iOS Configuration**:
- Bundle ID: `com.olorin.bayitplus`
- Team ID: `<Apple Developer Team ID>`
- Provisioning: App Store Distribution
- Capabilities: Push Notifications, In-App Purchases, Background Modes
- Minimum OS: iOS 14.0

**Android Configuration**:
- Package: `com.olorin.bayitplus`
- Signing: Play App Signing
- Permissions: INTERNET, WAKE_LOCK, RECEIVE_BOOT_COMPLETED
- Minimum SDK: API 29 (Android 10)
- Target SDK: API 34 (Android 14)

---

### tvOS (Apple TV)

**Configuration**:
- Bundle ID: `com.olorin.bayitplus.tv`
- Team ID: `<Apple Developer Team ID>`
- Provisioning: App Store Distribution
- Capabilities: Top Shelf Extension
- Minimum OS: tvOS 15.0

**Top Shelf Extension**:
- Featured content displayed on Apple TV home screen
- Dynamic content updates
- Artwork: 1920x720px (wide) and 800x600px (square)

---

## Troubleshooting

### Backend Deployment Fails

**Issue**: Cloud Run deployment fails with "Image not found"

**Solution**:
```bash
# Rebuild Docker image
cd backend
docker build -t gcr.io/bayitplus/backend:latest .
docker push gcr.io/bayitplus/backend:latest
gcloud run deploy bayit-backend --image gcr.io/bayitplus/backend:latest
```

---

### Mobile Build Fails

**Issue**: React Native bundle fails with "Metro bundler error"

**Solution**:
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman
watchman watch-del-all

# Reinstall dependencies
rm -rf node_modules
npm ci
```

---

### tvOS Focus Navigation Broken

**Issue**: Focus traps or navigation not working

**Solution**:
- Verify `hasTVPreferredFocus` prop on first element
- Check for nested focusable components
- Test with Xcode tvOS simulator
- Verify Siri Remote gestures not conflicting

---

## Emergency Rollback

**If ANY platform deployment fails critically:**

1. **Stop all deployments immediately**
2. **Rollback in reverse order**:
   - tvOS: Revert TestFlight build
   - Mobile: Revert TestFlight/Play Console builds
   - Web: Firebase Hosting rollback
   - Shared packages: Publish previous version
   - Backend: Traffic rollback to previous revision
3. **Notify stakeholders**
4. **Create incident report**
5. **Schedule post-mortem**

**Rollback SLA**: <10 minutes for all platforms

---

## Next Steps

After successful multi-platform deployment:

1. **Phase 0 Complete**: All deployment infrastructure ready
2. **Begin Phase 1**: Console Logging Remediation (287 violations)
3. **Deployment Cadence**: Deploy after each batch (8 batches in Phase 1)
4. **Monitoring**: Continuous monitoring for all platforms
5. **Beta Testing**: Ongoing feedback collection from testers

---

## References

- **Deployment Scripts**: `/scripts/deployment/`
- **Monitoring Setup**: `/scripts/deployment/MONITORING_SETUP.md`
- **Rollback Procedures**: `/scripts/deployment/ROLLBACK_TESTING_CHECKLIST.md`
- **Smoke Tests**: `/scripts/deployment/smoke-tests-staging.sh`
- **Baseline Metrics**: `/scripts/deployment/record-baseline.sh`
