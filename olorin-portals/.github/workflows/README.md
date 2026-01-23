# Olorin Portals CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment of all Olorin portals.

## Workflows Overview

### 1. Continuous Integration (`ci.yml`)
**Trigger**: Pull requests and pushes to `main` or `develop` branches

**Purpose**: Automated quality checks before merging code

**Jobs**:
- **Lint & Type Check**: ESLint and TypeScript validation for all portals
- **Build Verification**: Ensures all portals build successfully
- **Bundle Size Analysis**: Monitors JavaScript/CSS bundle sizes
- **Security Scan**: npm audit for vulnerability detection

**Matrix Strategy**: Runs in parallel for all 4 portals:
- `portal-main`
- `portal-fraud`
- `portal-streaming`
- `portal-station`

**Artifacts**: Uploads build outputs for 7 days

**Bundle Size Limits**:
- Warning threshold: 500 KB JavaScript
- Recommended: Keep bundles under this limit for optimal performance

**Security**: Fails CI on critical vulnerabilities

---

### 2. Staging Deployment (`staging-deploy.yml`)
**Trigger**:
- Push to `develop` or `staging` branches
- Pull requests (opened, synchronized, reopened)
- Manual dispatch with portal selection

**Purpose**: Deploy preview environments for testing before production

**Jobs**:
- **Determine Portals**: Selects which portals to deploy
- **Deploy Staging**: Deploys to Firebase Preview Channels
- **Smoke Tests**: Basic health checks post-deployment

**Firebase Preview Channels**:
- Automatically creates unique preview URLs
- Expires after 7 days
- Comments preview URL on pull requests

**Manual Deployment**:
```bash
# Via GitHub UI: Actions → Deploy to Staging → Run workflow
# Select portal: all | portal-main | portal-fraud | portal-streaming | portal-station
```

**Environment Variables**:
- `REACT_APP_ENV=staging` (set automatically)

---

### 3. Production Deployment (`deploy-portals.yml`)
**Trigger**:
- Push to `main` branch
- Manual dispatch

**Purpose**: Deploy to production Firebase hosting

**Jobs**:
- **Build and Deploy**: Builds and deploys all portals to live sites

**Firebase Hosting Targets**:
- `portal-main` → `olorin-main` (https://olorin.ai)
- `portal-fraud` → `olorin-fraud` (https://fraud.olorin.ai)
- `portal-streaming` → `olorin-streaming` (https://streaming.olorin.ai)
- `portal-station` → `olorin-station` (https://marketing.station.olorin.ai)

**Deployment Strategy**: Matrix deployment (all portals in parallel)

**Channel**: `live` (production)

---

## Required Secrets

Configure these in GitHub repository settings:

### GitHub Secrets
- `GITHUB_TOKEN` (automatically provided by GitHub)
- `FIREBASE_SERVICE_ACCOUNT` (Firebase service account JSON)

### Obtaining Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy the JSON content
4. In GitHub: Settings → Secrets → Actions → New repository secret
5. Name: `FIREBASE_SERVICE_ACCOUNT`
6. Value: Paste the entire JSON

---

## Workflow Usage

### For Pull Requests

1. Create a feature branch
2. Make changes to portal code
3. Push branch and create pull request
4. CI workflow runs automatically:
   - Linting and type checking
   - Build verification
   - Bundle size analysis
   - Security scanning
5. Staging workflow deploys preview:
   - Preview URL commented on PR
   - Test changes in isolated environment
6. Once approved and merged → Production deployment

### For Hotfixes

1. Create hotfix branch from `main`
2. Make critical fix
3. CI runs on push
4. Merge to `main`
5. Production deployment triggers automatically

### Manual Deployments

**Staging**:
```
Actions → Deploy to Staging → Run workflow → Select portal → Run
```

**Production**:
```
Actions → Deploy Olorin Portals → Run workflow → Run
```

---

## CI Failure Troubleshooting

### Lint Errors
```bash
# Locally fix linting issues
npm run lint -w packages/portal-station

# Auto-fix where possible
npm run lint --fix -w packages/portal-station
```

### Type Errors
```bash
# Check types locally
npx tsc --noEmit -p packages/portal-station/tsconfig.json

# Common fixes:
# - Add missing type definitions
# - Fix import paths
# - Update TypeScript version
```

### Build Failures
```bash
# Build locally to reproduce
npm run build -w packages/portal-station

# Check for:
# - Missing dependencies (npm install)
# - Environment variables (.env files)
# - Syntax errors
```

### Bundle Size Warnings
```bash
# Analyze bundle locally
npm run build -w packages/portal-station
npx source-map-explorer packages/portal-station/build/static/js/*.js

# Optimization strategies:
# - Code splitting
# - Lazy loading
# - Remove unused dependencies
# - Tree shaking
```

### Security Vulnerabilities
```bash
# Check vulnerabilities locally
npm audit

# Fix auto-fixable vulnerabilities
npm audit fix

# For manual fixes:
# - Update package versions
# - Find alternative packages
# - Check for patches
```

---

## Deployment Verification

### Post-Deployment Checks

**Staging**:
1. Visit preview URL from PR comment
2. Verify all pages load correctly
3. Test interactive features
4. Check console for errors
5. Validate mobile responsiveness

**Production**:
1. Visit production URL
2. Verify DNS resolves correctly
3. Check SSL certificate is valid
4. Test all critical user flows
5. Monitor for errors in first 24 hours

### Rollback Procedure

**Firebase Hosting Rollback**:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# List previous deployments
firebase hosting:channel:list --project olorin-station

# Rollback to previous version
firebase hosting:rollback --project olorin-station
```

**Git Rollback**:
```bash
# Revert last commit
git revert HEAD
git push origin main

# Triggers automatic redeployment of previous version
```

---

## Performance Monitoring

### Metrics to Track

- **Build Time**: Should be < 5 minutes per portal
- **Deployment Time**: Should be < 3 minutes per portal
- **Bundle Size**: JavaScript < 500 KB, CSS < 100 KB
- **Lighthouse Scores**: Performance > 90, Accessibility > 95

### Optimization Opportunities

1. **Caching**: Leverage npm cache in workflows
2. **Parallelization**: Matrix strategy for concurrent builds
3. **Conditional Execution**: Skip unchanged portals
4. **Artifact Sharing**: Reuse build artifacts across jobs

---

## Future Enhancements

### Planned Improvements

- [ ] **Unit Tests**: Add Jest/Vitest test runners
- [ ] **E2E Tests**: Playwright or Cypress integration
- [ ] **Visual Regression**: Percy or Chromatic
- [ ] **Lighthouse CI**: Automated performance checks
- [ ] **Code Coverage**: Codecov or Coveralls integration
- [ ] **Dependency Updates**: Renovate or Dependabot
- [ ] **Release Notes**: Automated changelog generation
- [ ] **Slack Notifications**: Deployment status alerts
- [ ] **Canary Deployments**: Gradual rollouts
- [ ] **A/B Testing**: Firebase Remote Config integration

---

## Workflow Maintenance

### Updating Workflows

1. Edit `.github/workflows/*.yml` files
2. Test changes on feature branch
3. Validate workflow syntax:
   ```bash
   # Use GitHub Actions extension in VS Code
   # Or validate on GitHub: Actions → workflow → Edit → Validate
   ```
4. Merge to main after validation

### Adding New Portals

1. Update matrix in all three workflows:
   ```yaml
   matrix:
     portal: [portal-main, portal-fraud, portal-streaming, portal-station, portal-new]
   ```

2. Add Firebase deployment step:
   ```yaml
   - name: Deploy to Firebase - New Portal
     if: matrix.portal == 'portal-new'
     uses: FirebaseExtended/action-hosting-deploy@v0
     with:
       repoToken: '${{ secrets.GITHUB_TOKEN }}'
       firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
       channelId: live
       projectId: olorin-new
       target: olorin-new
   ```

3. Update Firebase config:
   ```json
   // config/firebase.json
   {
     "site": "olorin-new",
     "public": "packages/portal-new/build",
     "target": "new"
   }
   ```

---

## Support

For CI/CD issues:
1. Check workflow logs in GitHub Actions tab
2. Review error messages and stack traces
3. Test locally to reproduce issues
4. Consult Firebase documentation for deployment errors
5. Open issue in repository with workflow run link

**Documentation**: https://docs.github.com/en/actions
**Firebase**: https://firebase.google.com/docs/hosting
**Support**: Create GitHub issue with `ci/cd` label
