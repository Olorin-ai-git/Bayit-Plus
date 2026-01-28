# Location Services Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration

Generate encryption key:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Set required environment variables:
```bash
# Copy to .env or Secret Manager
GEONAMES_USERNAME=your_geonames_username
GEONAMES_API_BASE_URL=https://secure.geonames.org
GEONAMES_TIMEOUT_SECONDS=5
LOCATION_CACHE_TTL_HOURS=24
LOCATION_ENCRYPTION_KEY=<generated_fernet_key>
LOCATION_REVERSE_GEOCODE_RATE_LIMIT=30
LOCATION_CONTENT_RATE_LIMIT=60
```

### 2. Database Initialization

Verify LocationCache collection exists with TTL index:
```bash
# MongoDB will automatically create TTL index on startup via Beanie
# Verify with:
db.location_cache.getIndexes()
# Should show: { "key": { "expires_at": 1 }, "expireAfterSeconds": 0 }
```

### 3. Dependencies

Verify required packages installed:
```bash
poetry install  # or pip install -r requirements.txt

# Key dependencies:
# - cryptography >= 41.0.0
# - slowapi >= 0.1.8
# - beanie >= 1.20.0
# - fastapi >= 0.104.0
# - motor >= 3.3.0
```

### 4. Code Validation

Run syntax checks:
```bash
python3 -m py_compile \
  app/models/location_cache.py \
  app/models/location_schemas.py \
  app/models/location_data.py \
  app/core/encryption.py \
  app/services/location_service.py \
  app/services/location_content_service.py \
  app/services/location_consent_service.py \
  app/api/routes/location.py \
  app/api/routes/content/location.py \
  app/api/routes/location_consent.py
```

---

## Deployment Steps

### 1. Backend Deployment

```bash
# 1. Stop existing service
systemctl stop bayit-plus-backend

# 2. Deploy new code
git pull origin main
poetry install --no-dev

# 3. Verify encryption key configured
[[ -z "$LOCATION_ENCRYPTION_KEY" ]] && echo "ERROR: LOCATION_ENCRYPTION_KEY not set" && exit 1

# 4. Start service
systemctl start bayit-plus-backend

# 5. Verify startup
sleep 5
curl http://localhost:8090/health
```

### 2. Frontend Deployment

```bash
# 1. Install dependencies
cd web
npm install

# 2. Build
npm run build

# 3. Deploy to hosting (Firebase, etc.)
npm run deploy

# 4. Verify deployment
curl https://bayit.tv
```

---

## Post-Deployment Validation

### 1. API Health Check

```bash
# Reverse geocode endpoint
curl "http://localhost:8090/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060"

# Expected response (200 OK):
{
  "city": "New York",
  "state": "NY",
  "county": "New York County",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2026-01-27T...",
  "source": "geonames"
}
```

### 2. Content Endpoint Check

```bash
# Location content endpoint
curl "http://localhost:8090/api/v1/content/israelis-in-city?city=New%20York&state=NY"

# Expected response (200 OK):
{
  "location": {...},
  "content": {"news_articles": [], "community_events": []},
  "total_items": 0,
  "updated_at": "2026-01-27T...",
  "coverage": {"has_content": false, ...}
}
```

### 3. Consent Endpoints Check

```bash
# Requires authentication token
TOKEN="your_jwt_token_here"

# Check current consent status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8090/api/v1/location-consent"

# Grant consent
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent_given": true, "retention_days": 90}' \
  "http://localhost:8090/api/v1/location-consent"
```

### 4. Rate Limiting Test

```bash
# Should succeed (within limit)
curl "http://localhost:8090/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060"
# Returns: 200 OK

# Make 30+ rapid requests from same IP
for i in {1..31}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:8090/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060")
  echo "Request $i: $STATUS"
  [[ $STATUS == "429" ]] && echo "Rate limiting working!" && break
done
```

### 5. Encryption Status Check

Look for startup logs:
```bash
grep -i "encryption" /var/log/bayit-plus/backend.log

# Expected (if enabled):
# INFO: Encryption enabled

# Expected (if disabled):
# WARNING: Encryption disabled - storing unencrypted
```

### 6. MongoDB TTL Expiration Verification

```bash
# Insert test document
db.location_cache.insertOne({
  coord_hash: "test",
  latitude: 0,
  longitude: 0,
  city_encrypted: "test",
  state_encrypted: "test",
  source: "test",
  cached_at: new Date(),
  expires_at: new Date(Date.now() + 5000)  // Expires in 5 seconds
})

# Wait 10 seconds, verify document is gone
sleep 10
db.location_cache.findOne({coord_hash: "test"})
# Should return: null
```

---

## Monitoring & Alerts

### 1. Critical Metrics to Monitor

```bash
# Error rate (target: < 1%)
grep "ERROR" /var/log/bayit-plus/backend.log | wc -l

# Rate limit hits (monitor for abuse)
grep "429" /var/log/bayit-plus/backend.log | tail -100

# Encryption errors
grep "Decryption failed" /var/log/bayit-plus/backend.log

# API response time (target: < 500ms cached, < 2s uncached)
curl -w "Time: %{time_total}s\n" \
  "http://localhost:8090/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060"
```

### 2. Alerting Rules (Suggested)

```yaml
# Prometheus/AlertManager format

groups:
  - name: location_services
    rules:
      # Alert on high error rate
      - alert: LocationServiceHighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "Location service error rate > 1%"

      # Alert on encryption failures
      - alert: LocationEncryptionFailures
        expr: rate(encryption_errors_total[5m]) > 0
        for: 1m
        annotations:
          summary: "Location encryption failures detected"

      # Alert on rate limit abuse (single IP > 50 req/min)
      - alert: LocationRateLimitAbuse
        expr: rate_limit_429_total > 50
        for: 2m
        annotations:
          summary: "Rate limit abuse detected from single IP"

      # Alert on API response time
      - alert: LocationAPILatency
        expr: location_api_latency_p95 > 2000  # milliseconds
        for: 5m
        annotations:
          summary: "Location API p95 latency > 2s"
```

### 3. Log Monitoring

```bash
# Monitor for critical events
tail -f /var/log/bayit-plus/backend.log | grep -E "(ERROR|WARNING|Encryption|Rate limit)"

# Count errors by type
grep "ERROR" /var/log/bayit-plus/backend.log | \
  sed 's/.*\[ERROR\] //' | cut -d' ' -f1 | sort | uniq -c

# Monitor consent changes
grep "consent" /var/log/bayit-plus/backend.log | \
  jq -r '.message + " (user: " + .user_id + ")"'
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop current service
systemctl stop bayit-plus-backend

# 2. Revert to previous code
git revert HEAD
git push origin main

# 3. Reinstall previous version
poetry install --no-dev

# 4. Start previous version
systemctl start bayit-plus-backend

# 5. Verify
curl http://localhost:8090/health

# 6. Check logs for errors
journalctl -u bayit-plus-backend -n 50
```

---

## Troubleshooting

### Issue: "LOCATION_ENCRYPTION_KEY not configured"

**Solution:**
```bash
# Generate key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Set in environment
export LOCATION_ENCRYPTION_KEY=<generated_key>

# Verify
echo $LOCATION_ENCRYPTION_KEY

# Restart service
systemctl restart bayit-plus-backend
```

### Issue: "No location found by GeoNames"

**Solution:**
```bash
# Verify GeoNames credentials
curl "https://secure.geonames.org/findNearbyJSON?lat=40.7128&lng=-74.0060&username=$GEONAMES_USERNAME"

# Check for valid response
# If error: verify GEONAMES_USERNAME is correct
# If no geonames array: coordinates may not have nearby cities
```

### Issue: "Rate limit 429 Too Many Requests"

**Solution:**
```bash
# Check current rate limits
grep "RATE_LIMIT" /var/log/bayit-plus/backend.log

# Increase if needed
export LOCATION_REVERSE_GEOCODE_RATE_LIMIT=60  # Double from 30
export LOCATION_CONTENT_RATE_LIMIT=120         # Double from 60

# Restart
systemctl restart bayit-plus-backend
```

### Issue: Cache documents not expiring

**Solution:**
```bash
# Verify TTL index exists
db.location_cache.getIndexes()

# Recreate if missing
db.location_cache.createIndex({expires_at: 1}, {expireAfterSeconds: 0})

# Check TTL hours setting
grep LOCATION_CACHE_TTL_HOURS /var/log/bayit-plus/backend.log
```

---

## Security Verification

### Pre-Production Checklist

- [ ] LOCATION_ENCRYPTION_KEY set and valid (43+ chars)
- [ ] No hardcoded secrets in code (grep -r "password\|secret\|key")
- [ ] Rate limiting configured and tested
- [ ] MongoDB TTL index created
- [ ] GeoNames API credentials valid
- [ ] CORS configured for frontend domain
- [ ] HTTPS enabled on all endpoints
- [ ] Logging configured (no sensitive data in logs)
- [ ] Backups configured for location_cache collection
- [ ] Encryption key backup stored separately
- [ ] Incident response plan documented

### Post-Production Validation

- [ ] Encryption working (check logs for "Encryption enabled")
- [ ] Rate limits enforced (429 responses for abuse)
- [ ] TTL expiration working (cache cleanup happening)
- [ ] Consent tracking working (test grant/revoke)
- [ ] Audit logs generated (grep for API calls)
- [ ] No PII in application logs
- [ ] No secrets in error messages

---

## Support Contacts

- **Backend Issues**: backend-team@example.com
- **GeoNames API**: support@geonames.org
- **Security**: security-team@example.com
