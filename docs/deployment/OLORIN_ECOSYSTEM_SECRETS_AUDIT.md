# Olorin Ecosystem-Wide Secrets Audit

## Date: 2026-01-28

## 🚨 CRITICAL FINDINGS: ECOSYSTEM-WIDE SECURITY VULNERABILITIES

This audit reveals **SEVERE security issues** affecting ALL Olorin platforms due to hardcoded secrets in the base platform configuration and shared across multiple applications.

---

## Executive Summary

### Scope
- **Olorin Base Platform** (`olorin-infra/.env`)
- **Bayit+ Streaming** (4 .env files: backend, mobile, tvOS, web)
- **Fraud Detection** (backend .env)
- **CVPlus** (backend, frontend .env)
- **Portals** (5 portal .env files)

### Critical Findings

✅ **Total .env files audited**: 13
❌ **Files with hardcoded secrets**: 4
🚨 **Unique hardcoded secrets found**: 20+
⚠️ **Platforms affected**: ALL (Bayit+, Fraud Detection, CVPlus, Portals)

---

## Detailed Findings by Platform

### 1. Olorin Base Platform (`/olorin-infra/.env`)

**🔴 SEVERITY: CRITICAL - Affects ALL platforms**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/olorin-infra/.env`

**Hardcoded Secrets Found**:

| Secret Name | Type | Value Preview | Impact |
|-------------|------|---------------|---------|
| `MONGODB_URI` | Database Connection | `mongodb+srv://...Jersey1973!...` | ✅ Full database access |
| `ANTHROPIC_API_KEY` | AI Service | `sk-ant-api03-hmcwN58...` | ✅ Unlimited Claude API usage |
| `OPENAI_API_KEY` | AI Service | `sk-proj-ug15P6caD3Js...` | ✅ Unlimited GPT API usage |
| `ELEVENLABS_API_KEY` | AI Service | `sk_63c958e380a6c81...` | ✅ Voice synthesis usage |
| `PINECONE_API_KEY` | Vector DB | `pcsk_6vTbS4_Hbbd5d13...` | ✅ Vector database access |
| `SECRET_KEY` | Application | `Bhz6aGssxUZws7s0...` | ✅ JWT signing, sessions |
| `PARTNER_API_KEY_SALT` | Security | `olorin_partner_salt_2024...` | ✅ API key generation |
| `TMDB_API_KEY` | Content Metadata | `d9fc7a64a8bce8e36c91...` | Movie database API (⚠️ Bayit+ ONLY) |
| `TMDB_API_TOKEN` | Content Metadata | `eyJhbGciOiJIUzI1NiJ9...` | Movie database auth (⚠️ Bayit+ ONLY) |
| `OPENSUBTITLES_API_KEY` | Content Metadata | `cZR4Z0ac8JgPKZ4GUF...` | Subtitles API (⚠️ Bayit+ ONLY) |
| `SENTRY_DSN` | Monitoring | `https://cf75c674a6980...@sentry.io/...` | Error tracking |

**📢 CRITICAL**: These secrets are in the base platform file, but many should NOT be shared:

**Truly Shared** (affects all platforms if compromised):
- AI Service Keys (Anthropic, OpenAI, ElevenLabs)
- Core Platform (SECRET_KEY, PARTNER_API_KEY_SALT, PINECONE_API_KEY)
- Monitoring (SENTRY_DSN)

**Platform-Specific** (should be moved OUT of base platform):
- `MONGODB_URI` → Bayit+ ONLY
- `TMDB_API_KEY`, `TMDB_API_TOKEN` → Bayit+ ONLY (user confirmed)
- `OPENSUBTITLES_API_KEY` → Bayit+ ONLY

**Exposure Risk**: Currently, if ANY platform is compromised, ALL platforms are compromised due to shared credentials. This MUST be addressed by isolating platform-specific secrets.

---

### 2. Bayit+ Streaming Platform

#### A. Backend (`/backend/.env`)

**🟡 SEVERITY: HIGH - Already addressed in initial implementation**

**Status**: ✅ **FIXED** - Secrets replaced with placeholders referencing Secret Manager

**Previously Hardcoded** (now secured):
- Admin password
- MongoDB URIs (3 databases)
- Stripe keys
- Google OAuth credentials
- Twilio credentials
- Location encryption key
- Additional service keys

**Action Required**: None for backend - already migrated to Secret Manager.

#### B. Mobile App (`/mobile-app/.env`)

**🔴 SEVERITY: CRITICAL**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/mobile-app/.env`

**Hardcoded Secrets**:

| Secret Name | Type | Value Preview | Source |
|-------------|------|---------------|--------|
| `SENTRY_DSN` | Monitoring | `https://cf75c674...@sentry.io/...` | Inherited from base |
| `ELEVENLABS_API_KEY` | AI Service | `sk_63c958e380a6c81...` | Inherited from base |
| `PICOVOICE_ACCESS_KEY` | Voice AI | `Iiy+q/LvJfsreqidNu...` | Bayit+-specific |
| `APPLE_KEY_ID` | iOS Developer | `LMYW5G8928` | Bayit+-specific |
| `APPLE_TEAM_ID` | iOS Developer | `963B7732N5` | Bayit+-specific |
| `APPLE_BUNDLE_ID` | iOS App ID | `tv.bayit.plus` | Configuration (low risk) |
| `CHROMECAST_RECEIVER_APP_ID` | Casting | `F79FF160` | Configuration (low risk) |

**Impact**: iOS app binary contains API keys that could be extracted via reverse engineering.

#### C. tvOS App (`/tvos-app/.env`)

**🔴 SEVERITY: CRITICAL**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/tvos-app/.env`

**Hardcoded Secrets**: Same as mobile app (shared configuration)

**Impact**: Apple TV app binary contains API keys that could be extracted via reverse engineering.

#### D. Web App (`/web/.env`)

**🟢 SEVERITY: LOW**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web/.env`

**Hardcoded Values**:
- `VITE_STRIPE_PUBLIC_KEY`: Test key placeholder (low risk)
- `VITE_CHROMECAST_RECEIVER_APP_ID`: Public configuration (low risk)
- `VITE_SENTRY_DSN`: Empty (no risk)

**Status**: ✅ Acceptable - contains only public keys and placeholders.

---

### 3. Fraud Detection Platform

#### Backend (`/olorin-fraud/backend/.env`)

**🟢 SEVERITY: LOW - Development environment only**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/olorin-fraud/backend/.env`

**Findings**:
- Contains only development placeholders
- Uses local SQLite database
- `DEV_BYPASS_AUTH=true` (acceptable for local dev)
- No production secrets found

**Inherits from base**: `olorin-infra/.env` secrets still apply in production deployment.

**Status**: ✅ Development environment properly configured. **Action required for production deployment**.

---

### 4. CVPlus Platform

#### A. Backend (`/cvplus/backend/functions/.env`)

**🟢 SEVERITY: LOW - Development environment only**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/olorin-cv/cvplus/backend/functions/.env`

**Findings**:
- Contains only development placeholders
- Uses local MongoDB
- Development JWT secrets (acceptable)
- No production secrets found

**Status**: ✅ Development environment properly configured. **Action required for production deployment**.

#### B. Frontend (`/cvplus/frontend/.env`)

**🟢 SEVERITY: LOW - Development environment only**

**Location**: `/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/olorin-cv/cvplus/frontend/.env`

**Findings**:
- Contains only development placeholders
- Firebase development config (placeholder values)
- No production secrets found

**Status**: ✅ Properly configured.

---

### 5. Portals Platform

#### All Portal Packages (5 packages)

**🟢 SEVERITY: LOW - Public configuration only**

**Packages Audited**:
1. `portal-main` - Main landing page
2. `portal-omen` - Omen AI portal
3. `portal-fraud` - Fraud detection portal
4. `portal-streaming` - Bayit+ streaming portal
5. `portal-station` - Radio management portal

**Findings**:
- All contain only public configuration
- EmailJS placeholders (not real keys)
- Public URLs and CDN paths
- No secrets found

**Status**: ✅ No action required.

---

## Risk Assessment

### High-Risk Secrets (Immediate Action Required)

| Secret | Platforms Affected | Risk Level | Potential Impact |
|--------|-------------------|------------|------------------|
| `ANTHROPIC_API_KEY` | ALL | 🔴 CRITICAL | Unlimited Claude API usage → $1000s in unauthorized charges |
| `OPENAI_API_KEY` | ALL | 🔴 CRITICAL | Unlimited GPT API usage → $1000s in unauthorized charges |
| `ELEVENLABS_API_KEY` | ALL | 🔴 CRITICAL | Voice synthesis abuse → high costs |
| `MONGODB_URI` | ALL | 🔴 CRITICAL | Full database access → data breach |
| `SECRET_KEY` | ALL | 🔴 CRITICAL | JWT forgery → authentication bypass |
| `PINECONE_API_KEY` | ALL | 🔴 CRITICAL | Vector DB manipulation → AI system corruption |
| `PICOVOICE_ACCESS_KEY` | Bayit+ Mobile/TV | 🟡 HIGH | Voice recognition abuse |

### Medium-Risk Secrets

| Secret | Platforms Affected | Risk Level | Potential Impact |
|--------|-------------------|------------|------------------|
| `TMDB_API_KEY` | Bayit+ ONLY | 🟡 MEDIUM | Rate limiting, service disruption |
| `OPENSUBTITLES_API_KEY` | ALL | 🟡 MEDIUM | Rate limiting, service disruption |
| `SENTRY_DSN` | ALL | 🟡 MEDIUM | Error log access, data exposure |

### Low-Risk Configuration

| Secret | Platforms Affected | Risk Level | Notes |
|--------|-------------------|------------|-------|
| `APPLE_KEY_ID` | Bayit+ Mobile/TV | 🟢 LOW | Not sensitive, required for signing |
| `APPLE_TEAM_ID` | Bayit+ Mobile/TV | 🟢 LOW | Public developer ID |
| `CHROMECAST_RECEIVER_APP_ID` | Bayit+ Web/Mobile | 🟢 LOW | Public configuration |

---

## Financial Impact Estimate

**Worst-Case Scenario** (if API keys compromised):

| Service | Monthly Cost at Max Usage | Annual Cost |
|---------|---------------------------|-------------|
| Anthropic (Claude) | $10,000 | $120,000 |
| OpenAI (GPT-4) | $5,000 | $60,000 |
| ElevenLabs (Voice) | $3,000 | $36,000 |
| Pinecone (Vector DB) | $1,000 | $12,000 |
| **TOTAL** | **$19,000/month** | **$228,000/year** |

**Additional Risks**:
- Data breach from MongoDB access
- Reputational damage
- Compliance violations (GDPR, SOC 2)
- Service disruption

---

## Compliance Impact

### Regulations Affected

- **GDPR**: Insufficient protection of credentials accessing personal data
- **SOC 2**: Fails access control and encryption requirements
- **PCI DSS**: Stripe credentials potentially exposed (already addressed in backend)
- **ISO 27001**: Inadequate secrets management

### Audit Failures

❌ Secrets in version control
❌ Shared credentials across platforms
❌ No secret rotation policy
❌ Insufficient access controls
❌ No secrets encryption at rest (in .env files)

---

## Recommendations

### Immediate Actions (Within 24 Hours)

1. **🔴 CRITICAL**: Rotate ALL API keys in `olorin-infra/.env`
2. **🔴 CRITICAL**: Migrate base platform secrets to Google Cloud Secret Manager
3. **🔴 CRITICAL**: Update all platform deployments to reference Secret Manager
4. **🟡 HIGH**: Remove hardcoded secrets from mobile/tvOS .env files
5. **🟡 HIGH**: Implement environment-specific secret injection for mobile apps

### Short-Term Actions (Within 1 Week)

1. Create separate API keys for each platform (no sharing)
2. Implement secret rotation schedule (90 days)
3. Enable secret access logging and monitoring
4. Set up alerts for unusual API usage
5. Conduct security audit of all deployed applications

### Long-Term Actions (Within 1 Month)

1. Implement least-privilege access for all secrets
2. Enable secret version expiration
3. Create disaster recovery procedures for secret compromise
4. Document secrets management policies
5. Train team on secure secrets handling

---

## Success Criteria

✅ All secrets stored in Google Cloud Secret Manager
✅ No hardcoded secrets in any .env file across ecosystem
✅ Each platform uses isolated secrets (no sharing)
✅ Automated validation of secret references
✅ Secret rotation schedule implemented
✅ Access logging and monitoring enabled
✅ Compliance requirements met

---

## Next Steps

See **OLORIN_ECOSYSTEM_SECRETS_MIGRATION_PLAN.md** for detailed implementation steps.

---

## Appendix: Files Requiring Remediation

### Critical (Immediate Action)
1. `/olorin-infra/.env` - Base platform secrets
2. `/olorin-media/bayit-plus/mobile-app/.env` - iOS app secrets
3. `/olorin-media/bayit-plus/tvos-app/.env` - tvOS app secrets

### Already Addressed
1. `/olorin-media/bayit-plus/backend/.env` - ✅ Fixed (placeholders)
2. `/olorin-media/bayit-plus/backend/cloudbuild.yaml` - ✅ Updated
3. `/olorin-media/bayit-plus/cloudbuild.yaml` - ✅ Updated

### No Action Required
1. `/olorin-media/bayit-plus/web/.env` - ✅ Public keys only
2. `/olorin-fraud/backend/.env` - ✅ Development only
3. `/olorin-cv/cvplus/backend/functions/.env` - ✅ Development only
4. `/olorin-cv/cvplus/frontend/.env` - ✅ Development only
5. All portal .env files - ✅ Public configuration only

---

**Audit Conducted By**: Claude Sonnet 4.5
**Date**: 2026-01-28
**Severity**: 🔴 **CRITICAL**
**Priority**: **P0 - Immediate Action Required**
