# Location Services Security Configuration Guide

## Overview

The location-aware content feature ("Israelis in [Your US City]") implements comprehensive security hardening including GDPR compliance, encryption at rest, and rate limiting.

## Required Environment Variables

### Geolocation Configuration

```bash
# GeoNames API credentials (free account required)
GEONAMES_USERNAME=your_geonames_username
GEONAMES_API_BASE_URL=https://secure.geonames.org
GEONAMES_TIMEOUT_SECONDS=5

# Location cache configuration
LOCATION_CACHE_TTL_HOURS=24
LOCATION_CACHE_COLLECTION=location_cache
```

### Encryption Configuration

```bash
# Fernet encryption key for location data at rest
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
LOCATION_ENCRYPTION_KEY=your_fernet_key_base64_here
```

### Rate Limiting Configuration

```bash
# Default values - adjust based on expected traffic
LOCATION_REVERSE_GEOCODE_RATE_LIMIT=30  # requests per minute per IP
LOCATION_CONTENT_RATE_LIMIT=60           # requests per minute per IP
```

## Security Features Implemented

### 1. GDPR Consent Tracking

**User Preferences Fields:**
- `location_consent_given`: Boolean flag for explicit consent
- `location_consent_timestamp`: ISO datetime when consent was granted
- `location_data_retention_days`: User preference for data retention (default 90 days)

**Endpoints:**
- `POST /api/v1/location-consent` - Grant or revoke consent
- `GET /api/v1/location-consent` - Check current consent status

**Enforcement:**
- Location data is only stored/returned when user has active consent
- Consent revocation immediately deletes stored location data
- All consent decisions are logged for audit trail

### 2. Encryption at Rest

**Implementation:**
- Fernet symmetric encryption (cryptography library)
- Sensitive fields encrypted in LocationCache: city, state, county
- Coordinates (latitude/longitude) stored unencrypted for spatial queries
- Hash of coordinates used as cache key (not reverse-geocoded)

**Automatic Graceful Degradation:**
- If LOCATION_ENCRYPTION_KEY not configured, encryption is disabled with warning
- Data stored unencrypted but service remains functional
- Logs indicate encryption status for debugging

**Key Rotation Strategy:**
- Generate new key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- Update LOCATION_ENCRYPTION_KEY environment variable
- Old data remains encrypted with old key (Fernet supports this)
- New data encrypted with new key

### 3. Rate Limiting

**Endpoints Protected:**
- `GET /location/reverse-geocode`: 30 requests/minute per IP
- `GET /content/israelis-in-city`: 60 requests/minute per IP

**Implementation:**
- Using slowapi (SlowAPI) rate limiter
- IP-based tracking via `get_remote_address()`
- Returns 429 (Too Many Requests) when limit exceeded

**Configuration:**
```python
from app.core.rate_limiter import RATE_LIMITS, limiter

@router.get("/endpoint")
@limiter.limit(RATE_LIMITS["endpoint_key"])
async def my_endpoint(request: Request, ...):
    pass
```

### 4. MongoDB TTL Expiration

**Configuration:**
- LocationCache documents automatically expire based on `expires_at` field
- MongoDB removes expired documents automatically
- TTL set by `LOCATION_CACHE_TTL_HOURS` (default 24 hours)

**Index:**
```python
class LocationCache(Document):
    expires_at: Indexed(datetime) = Field(...)
    class Settings:
        indexes = ["expires_at"]
```

### 5. Input Validation & Sanitization

**Regex Injection Prevention:**
- User input (city, state, county) escaped with `re.escape()` before MongoDB queries
- Prevents MongoDB operator injection attacks
- Applied to all search queries

**Query Parameter Validation:**
- City: minimum 2 characters
- State: exactly 2 characters (two-letter state code)
- County: optional
- limit_per_type: 1-50 range enforcement

**Example:**
```python
city = city.strip()
state = state.upper().strip()
if not city or len(city) < 2:
    raise HTTPException(status_code=400, detail="City too short")
if not state or len(state) != 2:
    raise HTTPException(status_code=400, detail="Invalid state code")
```

### 6. Structured Logging

All operations logged with context for audit trails:

```python
logger.info("Reverse geocode successful", extra={
    "latitude": latitude,
    "longitude": longitude,
    "city": location.city,
    "state": location.state,
})

logger.warning("Location consent revoked", extra={"user_id": user_id})
```

## Security Best Practices

### Production Deployment

1. **Encrypt Environment Variables:**
   - Store LOCATION_ENCRYPTION_KEY in AWS Secrets Manager / Google Secret Manager
   - Never hardcode encryption keys in code or config files
   - Rotate keys every 90 days

2. **Monitor Rate Limits:**
   - Set alerts when >80% of rate limit reached from single IP
   - Investigate unusual geographic queries (possible reconnaissance)

3. **Audit Consent Changes:**
   - Review location_consent_given changes weekly
   - Track which users revoked consent
   - Monitor consent grant patterns

4. **Cache Monitoring:**
   - Monitor LocationCache size (should stay bounded by TTL)
   - Alert if cache grows beyond 100MB
   - Verify TTL expiration is working (spot check random entries)

5. **Encryption Health:**
   - Verify encryption is enabled in logs on startup
   - Monitor decryption error rates
   - Test key rotation procedure monthly

### Development / Testing

**Generate Test Encryption Key:**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Test Encryption Manually:**
```python
from app.core.encryption import get_field_encryption

enc = get_field_encryption()
encrypted = enc.encrypt("New York")
decrypted = enc.decrypt(encrypted)
assert decrypted == "New York"
```

**Test Rate Limiting:**
```bash
# Should succeed (1st request)
curl http://localhost:${BACKEND_PORT:-8000}/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060

# Make 30+ requests rapidly - 31st should return 429
for i in {1..31}; do
  curl -w "%{http_code}\n" -o /dev/null -s \
    http://localhost:${BACKEND_PORT:-8000}/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060
done
```

**Test Consent Management:**
```bash
# Grant consent
curl -X POST http://localhost:${BACKEND_PORT:-8000}/api/v1/location-consent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_given": true, "retention_days": 90}'

# Check consent
curl http://localhost:${BACKEND_PORT:-8000}/api/v1/location-consent \
  -H "Authorization: Bearer $TOKEN"

# Revoke consent
curl -X POST http://localhost:${BACKEND_PORT:-8000}/api/v1/location-consent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_given": false}'
```

## Compliance & Standards

### GDPR Compliance Checklist

- [x] Explicit user consent before location tracking
- [x] Consent timestamp recorded (audit trail)
- [x] User data retention preference (configurable, default 90 days)
- [x] Right to revoke consent (data deleted immediately)
- [x] Data encryption at rest
- [x] Audit logging of all location operations
- [x] No third-party sharing of location data

### OWASP Security Checklist

- [x] A1: Injection Prevention (regex escaping, parameterized queries)
- [x] A2: Broken Authentication (rate limiting on endpoints)
- [x] A3: Sensitive Data Exposure (encryption at rest)
- [x] A4: XML External Entities (not applicable)
- [x] A5: Broken Access Control (consent-based access)
- [x] A6: Security Misconfiguration (no hardcoded keys)
- [x] A7: XSS (backend API, not applicable)
- [x] A8: Insecure Deserialization (Pydantic validation)
- [x] A9: Known Vulnerabilities (slowapi, cryptography up-to-date)
- [x] A10: Insufficient Logging & Monitoring (structured logging)

## Troubleshooting

### Encryption Not Working

**Symptom:** Log shows "Encryption disabled"

**Solution:**
1. Verify LOCATION_ENCRYPTION_KEY is set: `echo $LOCATION_ENCRYPTION_KEY`
2. Verify key is valid Fernet key (base64-encoded, 44 characters)
3. Generate new key: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
4. Update LOCATION_ENCRYPTION_KEY and restart service

### Rate Limit Errors

**Symptom:** Getting 429 errors unexpectedly

**Solution:**
1. Check IP address (behind proxy? CloudFlare? NAT?)
2. Increase rate limits in config if legitimate traffic pattern
3. Check slowapi version: `pip show slowapi`
4. Verify Request object passed to endpoint

### Consent Revocation Not Deleting Data

**Symptom:** Location data still visible after revoking consent

**Solution:**
1. Check that LocationConsentService.revoke_location_consent() was called
2. Verify user object was saved to MongoDB
3. Check logs for any exceptions during revocation
4. Manually verify user.preferences["location_consent_given"] in database

## Future Enhancements

- [ ] IP-based rate limiting improvements (distributed rate limiting with Redis)
- [ ] Encryption key rotation automation
- [ ] GDPR data export endpoint
- [ ] Compliance audit logging to separate service
- [ ] Location data anonymization after retention period
- [ ] End-to-end encryption with user-controlled keys
