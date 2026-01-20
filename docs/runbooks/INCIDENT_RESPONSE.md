# Incident Response Runbook
**Last Updated**: 2026-01-20

---

## Severity Levels

### P0: Critical
- **Service down** (all users affected)
- **Data loss or corruption**
- **Security breach**
- **Response Time**: < 5 minutes
- **Escalation**: Immediate

### P1: High
- **Significant performance degradation** (>50% of users affected)
- **Partial outage** (key feature unavailable)
- **High error rate** (>5% of requests)
- **Response Time**: < 15 minutes
- **Escalation**: Within 15 minutes

### P2: Medium
- **Non-critical feature broken** (<20% of users affected)
- **Intermittent errors**
- **Performance degradation** (minor impact)
- **Response Time**: < 1 hour
- **Escalation**: Within 1 hour if not resolved

### P3: Low
- **Minor bug** (cosmetic or non-blocking)
- **Feature request**
- **Documentation issue**
- **Response Time**: < 24 hours
- **Escalation**: Not required

---

## Response Procedures

### P0: Service Down

#### Step 1: Initial Assessment (0-2 minutes)
```bash
# Check Cloud Run service status
gcloud run services describe bayit-plus-backend \
  --region us-east1 \
  --format="value(status.conditions)"

# Check service URL
curl -I https://api.bayit.plus/health
```

**Expected**: HTTP 200 within 1 second

#### Step 2: Health Check Deep Dive (2-5 minutes)
```bash
# Get detailed health status
curl -s https://api.bayit.plus/health/deep | jq .

# Check specific services
curl -s https://api.bayit.plus/health/ready | jq '.services'
```

**Look for**:
- `status: "unhealthy"` on any critical service (MongoDB)
- High latency (>1000ms) on database
- Connection errors

#### Step 3: Review Recent Changes (3-5 minutes)
```bash
# List recent deployments
./scripts/rollback.sh -e production -l

# Check last 5 revisions
gcloud run revisions list \
  --service bayit-plus-backend \
  --region us-east1 \
  --limit 5
```

**If recent deployment** (< 30 minutes ago):
```bash
# IMMEDIATE ROLLBACK
./scripts/rollback.sh -e production -n 1

# Verify rollback
curl https://api.bayit.plus/health
```

#### Step 4: Check External Dependencies (5-10 minutes)
- **MongoDB Atlas**: Check cluster status in dashboard
- **Google Cloud Platform**: Check https://status.cloud.google.com
- **Sentry**: Check https://sentry.io/bayit-plus for error spikes

#### Step 5: Check Logs (5-15 minutes)
```bash
# Tail Cloud Run logs
gcloud run logs tail \
  --service bayit-plus-backend \
  --region us-east1 \
  --limit 100

# Filter errors
gcloud run logs read \
  --service bayit-plus-backend \
  --region us-east1 \
  --filter "severity>=ERROR" \
  --limit 50
```

**Common Error Patterns**:
- `pymongo.errors.ServerSelectionTimeoutError` → MongoDB connection issue
- `AuthenticationFailed` → Secret/credential issue
- `MemoryError` → Insufficient memory allocation
- `TimeoutError` → External API timeout

#### Step 6: Emergency Fixes

**MongoDB Connection Failure**:
```bash
# Check MongoDB secret
gcloud secrets versions access latest --secret=mongodb-url

# Verify IP allowlist in MongoDB Atlas
# Add Cloud Run IP range: 0.0.0.0/0 (temporarily if needed)
```

**Out of Memory**:
```bash
# Scale up memory immediately
gcloud run services update bayit-plus-backend \
  --region us-east1 \
  --memory 4Gi
```

**Too few instances**:
```bash
# Increase min instances
gcloud run services update bayit-plus-backend \
  --region us-east1 \
  --min-instances 3
```

#### Step 7: Escalation (15+ minutes)
If not resolved within 15 minutes:
1. Notify engineering manager
2. Create incident channel: `#incident-YYYY-MM-DD-description`
3. Page on-call engineer (if different from responder)
4. Consider emergency maintenance window

---

### P1: Performance Degradation

#### Step 1: Identify Bottleneck
```bash
# Check health endpoint latency
time curl https://api.bayit.plus/health/deep

# Check MongoDB latency
curl -s https://api.bayit.plus/health/deep | jq '.services.mongodb.latency_ms'
```

**Thresholds**:
- MongoDB latency > 100ms: Database issue
- OpenAI latency > 5000ms: External API slowdown
- Overall response > 2000ms: Application bottleneck

#### Step 2: Check Resource Utilization
```bash
# Cloud Run metrics (via console or API)
# - CPU utilization (should be < 80%)
# - Memory utilization (should be < 90%)
# - Request count (spike?)
# - Instance count (hitting max-instances?)
```

**If CPU/Memory high**:
```bash
# Scale up
gcloud run services update bayit-plus-backend \
  --region us-east1 \
  --cpu 4 \
  --memory 4Gi \
  --max-instances 20
```

#### Step 3: Check Sentry Performance
1. Go to https://sentry.io/bayit-plus
2. Navigate to Performance tab
3. Sort by P95 duration
4. Identify slow endpoints

**Common Slow Endpoints**:
- `/api/v1/content` → Database query optimization needed
- `/api/v1/search` → Pinecone/OpenAI API timeout
- `/api/v1/tts` → ElevenLabs API slowdown

#### Step 4: Temporary Mitigations
```python
# If OpenAI/ElevenLabs slow, reduce timeout
# In app/core/config.py
OPENAI_TIMEOUT = 5.0  # Reduce from 30s
ELEVENLABS_TIMEOUT = 5.0
```

**Deploy with reduced timeouts** → Fail fast instead of hanging

---

### P2: Database Connection Issues

#### Symptoms
- Health check shows: `"mongodb": {"status": "unhealthy"}`
- Logs show: `ServerSelectionTimeoutError`
- Users see: "Service Unavailable" errors

#### Step 1: Verify MongoDB Status
1. Login to MongoDB Atlas
2. Check cluster status (Paused? Upgrading?)
3. Check network access (IP allowlist)

#### Step 2: Check Secrets
```bash
# Verify MongoDB URL secret
gcloud secrets versions access latest --secret=mongodb-url

# Should be format: mongodb+srv://user:password@cluster.mongodb.net/db?retryWrites=true
```

#### Step 3: Test Connection Manually
```python
# Run from Cloud Shell or local machine with VPN
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    client = AsyncIOMotorClient("mongodb+srv://...")
    result = await client.admin.command("ping")
    print(result)

asyncio.run(test())
```

#### Step 4: Check MongoDB Logs
In MongoDB Atlas:
1. Navigate to Deployment → Metrics
2. Check Operations per Second
3. Check Connection count
4. Check Replication lag

**If connection pool exhausted**:
```python
# In app/core/database.py
# Increase max pool size
client = AsyncIOMotorClient(
    mongodb_url,
    maxPoolSize=100  # Increase from default 50
)
```

#### Step 5: Rollback or Wait
**If recent deployment**:
```bash
./scripts/rollback.sh -e production -n 1
```

**If MongoDB maintenance**:
- Update status page
- Monitor for completion
- Service will auto-recover when MongoDB comes back

---

### P1: External API Failures

#### OpenAI API Down
**Symptoms**: `/health/deep` shows `openai: degraded`

**Impact**: Search, embeddings, AI features unavailable

**Action**:
1. Check https://status.openai.com
2. If OpenAI is down, service will degrade but remain functional
3. Monitor for recovery
4. Consider switching to fallback model if available

**No immediate action required** (non-critical service)

#### ElevenLabs API Down
**Symptoms**: `/health/deep` shows `elevenlabs: degraded`

**Impact**: TTS features unavailable

**Action**:
1. Check ElevenLabs status page
2. Verify API key is valid: `curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/user`
3. Monitor for recovery

**Temporary workaround**: Disable TTS features in UI

#### Pinecone Down
**Symptoms**: `/health/deep` shows `pinecone: degraded`

**Impact**: Semantic search unavailable, fallback to keyword search

**Action**:
1. Check Pinecone status page
2. Verify API key
3. Service continues with degraded search quality

---

### P0: Security Incident

#### Unauthorized Access Detected
1. **IMMEDIATELY**: Rotate all secrets
   ```bash
   # Rotate MongoDB password in Atlas
   # Update secret
   echo -n "new-mongodb-url" | gcloud secrets versions add mongodb-url --data-file=-

   # Redeploy to pick up new secret
   gcloud run deploy bayit-plus-backend --region us-east1
   ```

2. Review access logs in MongoDB Atlas

3. Check Cloud Run logs for suspicious patterns

4. Notify security team

#### API Key Leak
If API keys leaked (e.g., in logs, public repo):

1. **Rotate immediately**:
   ```bash
   # OpenAI
   # 1. Generate new key in OpenAI dashboard
   # 2. Update secret
   echo -n "new-key" | gcloud secrets versions add bayit-openai-api-key --data-file=-

   # ElevenLabs (same process)
   # Anthropic (same process)
   ```

2. **Revoke old keys** in provider dashboards

3. **Redeploy**:
   ```bash
   gcloud run deploy bayit-plus-backend --region us-east1
   ```

4. Monitor for unauthorized usage

---

## Post-Incident Procedures

### Immediate (< 24 hours)
1. Update incident ticket with resolution
2. Notify stakeholders of resolution
3. Document timeline of events

### Short-term (< 1 week)
1. Schedule blameless post-mortem
2. Create action items to prevent recurrence
3. Update runbooks with learnings

### Post-Mortem Template
```markdown
# Post-Mortem: [Incident Title]

## Summary
- Date: YYYY-MM-DD
- Duration: XX minutes/hours
- Severity: P0/P1/P2
- Impact: XX users affected

## Timeline
- HH:MM - Initial detection
- HH:MM - Response began
- HH:MM - Rollback initiated
- HH:MM - Service restored

## Root Cause
[Technical explanation]

## Resolution
[What fixed it]

## Action Items
- [ ] Prevent: [Action to prevent recurrence]
- [ ] Detect: [Improve monitoring/alerting]
- [ ] Mitigate: [Faster response procedures]

## Lessons Learned
- What went well
- What could be improved
```

---

## Emergency Contacts

### Primary On-Call
- **Slack**: #incidents
- **PagerDuty**: [Configure when available]

### Escalation Path
1. On-call engineer (respond within 5 minutes)
2. Engineering manager (escalate at 15 minutes)
3. CTO (escalate at 30 minutes for P0)

### External Support
- **MongoDB Atlas Support**: support@mongodb.com
- **Google Cloud Support**: [GCP Support Portal]
- **OpenAI Support**: [OpenAI Help Center]
- **ElevenLabs Support**: [ElevenLabs Contact]

---

## Common Commands Quick Reference

```bash
# Check service health
curl https://api.bayit.plus/health/deep | jq .

# List recent revisions
./scripts/rollback.sh -l

# Rollback immediately
./scripts/rollback.sh -e production -n 1

# View logs
gcloud run logs tail --service bayit-plus-backend --region us-east1

# Scale resources
gcloud run services update bayit-plus-backend --region us-east1 --memory 4Gi --cpu 4

# Check current deployment
gcloud run services describe bayit-plus-backend --region us-east1

# Update secret
echo -n "new-value" | gcloud secrets versions add secret-name --data-file=-
```

---

## Monitoring Links
- **Cloud Run Console**: https://console.cloud.google.com/run
- **Sentry**: https://sentry.io/bayit-plus
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Status Page**: [Configure when available]
