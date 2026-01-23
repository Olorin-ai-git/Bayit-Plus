# Security Remediation Checklist

**Project:** Bayit+ Web Platform
**Date:** January 22, 2026
**Priority:** CRITICAL - Complete before production deployment

---

## 🔴 CRITICAL - Do IMMEDIATELY (Next 24 Hours)

### Task 1: Rotate All Exposed API Keys
**Time Estimate:** 30 minutes | **Assignee:** ___________ | **Status:** ⬜

- [ ] **Stripe API Keys**
  - [ ] Login to Stripe Dashboard
  - [ ] Navigate to Developers → API Keys
  - [ ] Click "Roll key" for the exposed public key
  - [ ] Update production environment variables
  - [ ] Test checkout flow still works

- [ ] **Picovoice Access Key**
  - [ ] Login to Picovoice Console
  - [ ] Navigate to Access Keys
  - [ ] Revoke exposed key: `Iiy+q/LvJfs...`
  - [ ] Generate new access key
  - [ ] Update production environment variables
  - [ ] Test wake word functionality

- [ ] **Sentry DSN** (Optional but recommended)
  - [ ] Login to Sentry
  - [ ] Navigate to Project Settings → Client Keys (DSN)
  - [ ] Disable old DSN
  - [ ] Generate new DSN
  - [ ] Update production environment variables
  - [ ] Verify error tracking still works

**Verification:**
```bash
# Ensure .env is in .gitignore
grep "^\.env$" .gitignore || echo ".env" >> .gitignore

# Verify .env.example has placeholders only
cat .env.example | grep -E "(pk_live|Iiy\+)"
# Should return: NO RESULTS
```

---

### Task 2: Remove Secrets from Git History
**Time Estimate:** 1 hour | **Assignee:** ___________ | **Status:** ⬜

**Option A: Using BFG Repo-Cleaner (Recommended)**
```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Clone mirror
git clone --mirror git@github.com:your-org/bayit-plus.git

# Remove .env from all commits
java -jar bfg-1.14.0.jar --delete-files .env bayit-plus.git

# Clean up
cd bayit-plus.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force
```

**Option B: Using git-filter-repo**
```bash
# Install
pip install git-filter-repo

# Remove .env
git filter-repo --path web/.env --invert-paths --force

# Force push (WARNING: This rewrites history)
git push --force --all
```

**Post-Cleanup:**
- [ ] Notify all team members to re-clone repository
- [ ] Update CI/CD pipelines if needed
- [ ] Verify .env is gone: `git log --all --full-history -- "*/.env"`

---

### Task 3: Add Security Headers to Production
**Time Estimate:** 2 hours | **Assignee:** ___________ | **Status:** ⬜

#### Step 3a: Add CSP to HTML
**File:** `public/index.html`

Add after `<meta charset="UTF-8" />`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://www.gstatic.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' http://localhost:8000 https://api.bayit.plus https://*.sentry.io;
  media-src 'self' https: blob:;
  frame-src https://js.stripe.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Checklist:**
- [ ] Add CSP meta tag to `public/index.html`
- [ ] Test all functionality (video, stripe, fonts, API calls)
- [ ] Adjust CSP if any features break
- [ ] Document any 'unsafe-inline' exceptions

---

#### Step 3b: Configure Server Headers (Cloud Run Example)
**File:** Create `nginx.conf` or update Cloud Run config

**For nginx:**
```nginx
server {
    # ... existing config ...

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # CSP (if not in HTML meta tag)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://trusted-cdn.com; ..." always;
}
```

**For Google Cloud Run (app.yaml):**
```yaml
handlers:
  - url: /.*
    script: auto
    secure: always
    http_headers:
      X-Frame-Options: DENY
      X-Content-Type-Options: nosniff
      X-XSS-Protection: "1; mode=block"
      Strict-Transport-Security: "max-age=31536000; includeSubDomains"
      Referrer-Policy: strict-origin-when-cross-origin
```

**Checklist:**
- [ ] Add security headers to web server config
- [ ] Deploy to staging environment
- [ ] Verify headers present: `curl -I https://staging.bayit.plus`
- [ ] Test all functionality in staging
- [ ] Deploy to production
- [ ] Verify headers in production

**Verification:**
```bash
# Test headers
curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|Strict-Transport|CSP)"

# Expected output:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: default-src 'self'; ...
```

---

#### Step 3c: Add Vite Dev Headers
**File:** `vite.config.js`

Add after `plugins: [react()]`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3200,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    proxy: {
      // ... existing proxy config
    }
  }
})
```

**Checklist:**
- [ ] Update `vite.config.js`
- [ ] Restart dev server: `npm run dev:vite`
- [ ] Verify headers in browser DevTools → Network → Headers

---

### Task 4: Fix npm Vulnerabilities
**Time Estimate:** 30 minutes | **Assignee:** ___________ | **Status:** ⬜

```bash
# Current working directory: /web/

# Step 1: Fix lodash vulnerability
npm audit fix

# Step 2: Upgrade Vite (may have breaking changes - test thoroughly)
npm install vite@7.3.1 --save-dev

# Step 3: Run tests
npm test

# Step 4: Manual testing
npm run dev:vite
# Test: Video playback, auth flow, admin panel, stripe checkout

# Step 5: Verify vulnerabilities fixed
npm audit
# Expected: 0 vulnerabilities
```

**Checklist:**
- [ ] Run `npm audit fix`
- [ ] Upgrade Vite to 7.3.1
- [ ] Run full test suite
- [ ] Manual testing of critical features
- [ ] Verify `npm audit` shows 0 critical/high vulnerabilities
- [ ] Document any remaining moderate vulnerabilities

---

## 🟡 HIGH PRIORITY - Do Within 1 Week

### Task 5: Implement CSRF Protection
**Time Estimate:** 4 hours | **Assignee:** ___________ | **Status:** ⬜

**Backend Changes (Python/FastAPI):**
```python
# Install: pip install fastapi-csrf-protect

from fastapi_csrf_protect import CsrfProtect

@app.get("/csrf-token")
async def get_csrf_token(csrf_protect: CsrfProtect = Depends()):
    token = csrf_protect.generate_csrf()
    return {"csrf_token": token}

@app.post("/api/v1/admin/users")
async def create_user(
    user_data: dict,
    csrf_protect: CsrfProtect = Depends()
):
    await csrf_protect.validate_csrf(request)
    # ... rest of endpoint
```

**Frontend Changes:**
```javascript
// File: src/services/api.js

// Fetch CSRF token on app load
let csrfToken = null

export const fetchCSRFToken = async () => {
  const response = await axios.get('/csrf-token')
  csrfToken = response.data.csrf_token
  return csrfToken
}

// Add to request interceptor
api.interceptors.request.use((config) => {
  // ... existing code ...

  // Add CSRF token to state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})
```

**Checklist:**
- [ ] Install `fastapi-csrf-protect` on backend
- [ ] Add CSRF token endpoint
- [ ] Add CSRF validation to all POST/PUT/DELETE endpoints
- [ ] Fetch CSRF token on app initialization
- [ ] Add CSRF token to request headers
- [ ] Test all forms and API mutations
- [ ] Verify CSRF protection with Burp Suite or OWASP ZAP

---

### Task 6: Upgrade Major Dependencies
**Time Estimate:** 8 hours | **Assignee:** ___________ | **Status:** ⬜

**Stripe SDK Upgrade:**
```bash
# Current: @stripe/react-stripe-js@2.9.0, @stripe/stripe-js@2.4.0
# Target: @stripe/react-stripe-js@5.4.1, @stripe/stripe-js@8.6.3

# Review migration guides
open https://github.com/stripe/stripe-js/blob/master/CHANGELOG.md
open https://github.com/stripe/react-stripe-js/blob/master/CHANGELOG.md

# Upgrade
npm install @stripe/react-stripe-js@latest @stripe/stripe-js@latest

# Update code for breaking changes
# Test payment flow thoroughly
```

**React 19 Upgrade:**
```bash
# Current: react@18.3.1, react-dom@18.3.1
# Target: react@19.2.3, react-dom@19.2.3

# Review migration guide
open https://react.dev/blog/2024/04/25/react-19-upgrade-guide

# Upgrade
npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19

# Update code for breaking changes
# Run full test suite
npm test

# Manual regression testing
```

**Checklist:**
- [ ] Review all migration guides
- [ ] Create feature branch: `security/dependency-upgrades`
- [ ] Upgrade Stripe SDK
- [ ] Test checkout flow end-to-end
- [ ] Upgrade React 19
- [ ] Fix breaking changes
- [ ] Run full test suite
- [ ] Manual regression testing
- [ ] Merge to main after QA approval

---

### Task 7: Add Security Event Logging
**Time Estimate:** 4 hours | **Assignee:** ___________ | **Status:** ⬜

**Add Audit Logger:**
```javascript
// File: src/utils/auditLogger.ts

import logger from '@bayit/shared-utils/logger'

export const logSecurityEvent = (event: string, metadata: Record<string, any> = {}) => {
  logger.warn('SECURITY_EVENT', {
    event,
    timestamp: new Date().toISOString(),
    userId: metadata.userId,
    ip: metadata.ip,
    userAgent: navigator.userAgent,
    ...metadata
  })

  // Send to Sentry as security breadcrumb
  if (window.Sentry) {
    window.Sentry.addBreadcrumb({
      category: 'security',
      message: event,
      level: 'warning',
      data: metadata
    })
  }
}
```

**Add to Auth Flow:**
```javascript
// File: src/stores/authStore.js

login: async (email, password) => {
  try {
    const response = await authService.login(email, password)

    logSecurityEvent('LOGIN_SUCCESS', {
      userId: response.user.id,
      email: response.user.email
    })

    return response
  } catch (error) {
    logSecurityEvent('LOGIN_FAILED', {
      email,
      reason: error.message
    })
    throw error
  }
}
```

**Checklist:**
- [ ] Create `src/utils/auditLogger.ts`
- [ ] Add security event logging to:
  - [ ] Login success/failure
  - [ ] Logout
  - [ ] Admin action attempts
  - [ ] 401/403 API responses
  - [ ] CSRF validation failures
- [ ] Configure Sentry alerts for security events
- [ ] Test logging in dev environment
- [ ] Verify events appear in Sentry dashboard

---

### Task 8: Implement Rate Limiting UI
**Time Estimate:** 4 hours | **Assignee:** ___________ | **Status:** ⬜

**Add Retry Logic:**
```javascript
// File: src/services/api.js

import axios from 'axios'

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second

const retryWithBackoff = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY_BASE) => {
  try {
    return await fn()
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      // Extract Retry-After header if present
      const retryAfter = error.response.headers['retry-after']
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay

      await new Promise(resolve => setTimeout(resolve, waitTime))
      return retryWithBackoff(fn, retries - 1, delay * 2) // Exponential backoff
    }
    throw error
  }
}
```

**Update Error Handling:**
```javascript
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60

      // Show user-friendly message
      toast.error(`Too many requests. Please wait ${retryAfter} seconds.`, {
        duration: retryAfter * 1000
      })
    }
    return Promise.reject(error)
  }
)
```

**Checklist:**
- [ ] Add exponential backoff retry logic
- [ ] Handle 429 responses gracefully
- [ ] Display user-friendly error messages
- [ ] Add loading states during retry
- [ ] Test with rate-limited endpoint
- [ ] Document retry behavior for users

---

## 🟢 MEDIUM PRIORITY - Do Within 1 Month

### Task 9: Migrate to HttpOnly Cookies
**Time Estimate:** 8 hours | **Assignee:** ___________ | **Status:** ⬜

**Backend Changes:**
```python
# File: backend/auth.py

@app.post("/auth/login")
async def login(response: Response, credentials: LoginRequest):
    # ... validate credentials ...

    # Set HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=86400  # 24 hours
    )

    return {"user": user_data}
```

**Frontend Changes:**
```javascript
// Remove token from localStorage
// Cookies handled automatically by browser

// Update Axios config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true  // ✅ Send cookies with requests
})

// Remove Authorization header (cookies used instead)
api.interceptors.request.use((config) => {
  // Remove: config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**Checklist:**
- [ ] Update backend to set HttpOnly cookies
- [ ] Update frontend to use `withCredentials: true`
- [ ] Remove token from localStorage
- [ ] Test authentication flow
- [ ] Test CORS with credentials
- [ ] Update logout to clear cookie
- [ ] Deploy and test in production

---

### Task 10: Implement Fine-Grained RBAC
**Time Estimate:** 8 hours | **Assignee:** ___________ | **Status:** ⬜

**Define Permission Matrix:**
```typescript
// File: src/types/permissions.ts

export const PERMISSIONS = {
  // User management
  'users.view': ['admin', 'support'],
  'users.create': ['admin'],
  'users.edit': ['admin', 'support'],
  'users.delete': ['admin'],

  // Content management
  'content.view': ['admin', 'content_manager'],
  'content.create': ['admin', 'content_manager'],
  'content.edit': ['admin', 'content_manager'],
  'content.delete': ['admin'],

  // Billing
  'billing.view': ['admin', 'billing_admin'],
  'billing.refund': ['admin', 'billing_admin'],
} as const

export type Permission = keyof typeof PERMISSIONS
```

**Add Permission Hook:**
```typescript
// File: src/hooks/usePermission.ts

export const usePermission = (permission: Permission): boolean => {
  const { user } = useAuthStore()
  if (!user) return false

  const allowedRoles = PERMISSIONS[permission]
  return allowedRoles.includes(user.role)
}
```

**Use in Components:**
```typescript
// File: src/pages/admin/UsersListPage.tsx

const DeleteButton = ({ userId }) => {
  const canDelete = usePermission('users.delete')

  if (!canDelete) return null

  return <button onClick={() => deleteUser(userId)}>Delete</button>
}
```

**Checklist:**
- [ ] Define permission matrix
- [ ] Create `usePermission` hook
- [ ] Add permission checks to all admin actions
- [ ] Hide UI elements based on permissions
- [ ] Add permission validation on backend
- [ ] Test all role combinations
- [ ] Document permissions in README

---

### Task 11: Add Schema Validation
**Time Estimate:** 4 hours | **Assignee:** ___________ | **Status:** ⬜

**localStorage Validation:**
```typescript
// File: src/stores/authStore.ts

import { z } from 'zod'

const AuthDataSchema = z.object({
  state: z.object({
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      role: z.string()
    }),
    token: z.string(),
    isAuthenticated: z.boolean()
  }),
  version: z.number()
})

// In Zustand store
onRehydrateStorage: () => (state) => {
  if (state) {
    const parsed = AuthDataSchema.safeParse(state)
    if (!parsed.success) {
      console.error('Invalid auth data in localStorage', parsed.error)
      localStorage.removeItem('bayit-auth')
      state.isHydrated = true
      return
    }
    state.isHydrated = true
  }
}
```

**API Response Validation:**
```typescript
// File: src/services/api.ts

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string()
})

export const getUser = async (userId: string) => {
  const response = await api.get(`/users/${userId}`)
  return UserSchema.parse(response) // ✅ Runtime validation
}
```

**Checklist:**
- [ ] Add Zod schemas for all localStorage data
- [ ] Add Zod schemas for critical API responses
- [ ] Add validation to Zustand rehydration
- [ ] Handle validation errors gracefully
- [ ] Log validation failures to Sentry
- [ ] Test with malformed data

---

### Task 12: Set Up Automated Security Scanning
**Time Estimate:** 4 hours | **Assignee:** ___________ | **Status:** ⬜

**GitHub Actions Workflow:**
```yaml
# File: .github/workflows/security-scan.yml

name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: |
          cd web
          npm ci
          npm audit --audit-level=moderate

      - name: Run OWASP ZAP
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'https://staging.bayit.plus'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

**Checklist:**
- [ ] Create `.github/workflows/security-scan.yml`
- [ ] Configure Dependabot alerts
- [ ] Set up OWASP ZAP scanning
- [ ] Configure Snyk (optional)
- [ ] Set up security notifications
- [ ] Test workflow on staging
- [ ] Enable for production

---

## Verification & Sign-Off

### Critical Tasks Verification

**Before deploying to production, verify ALL critical tasks are complete:**

```bash
# Checklist
✅ Task 1: API keys rotated and production updated
✅ Task 2: Secrets removed from git history
✅ Task 3: Security headers present in production
✅ Task 4: npm audit shows 0 critical/high vulnerabilities

# Automated verification
curl -I https://your-production-domain.com | grep -E "(X-Frame|X-Content|Strict-Transport)"

# Manual verification
1. Login works with new keys
2. Stripe checkout works
3. Video playback works
4. No console errors
5. Sentry receiving errors
```

**Sign-Off:**

- [ ] **Engineering Lead:** _________________ Date: _______
- [ ] **Security Engineer:** _________________ Date: _______
- [ ] **DevOps Lead:** _________________ Date: _______
- [ ] **Product Manager:** _________________ Date: _______

---

## Notes & Issues

Use this section to track any blockers or issues encountered:

```
Date: ___________
Issue: ___________________________________________________________
Resolution: _______________________________________________________

Date: ___________
Issue: ___________________________________________________________
Resolution: _______________________________________________________
```

---

## Additional Resources

- **Full Audit Report:** `SECURITY_AUDIT_REPORT.md`
- **Executive Summary:** `SECURITY_AUDIT_EXECUTIVE_SUMMARY.md`
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CSP Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **npm audit Docs:** https://docs.npmjs.com/cli/v8/commands/npm-audit

---

**Last Updated:** January 22, 2026
**Next Review:** After all critical tasks complete (within 2 weeks)
