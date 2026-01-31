# AI Features Troubleshooting Guide

**Last Updated:** 2026-01-30
**Status:** ✅ Production Ready

---

## Overview

This guide provides solutions to common issues with Bayit+ AI features (AI Search, AI Recommendations, Auto Catch-Up). For each issue, we provide symptoms, causes, and step-by-step solutions.

---

## Quick Reference

| Issue | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| Insufficient Credits Error | Balance < required credits | Check balance, wait for refill |
| Search Returns No Results | Query too vague | Make query more specific |
| Recommendations Not Personalized | No viewing history | Watch more content |
| Catch-Up Unavailable | Channel not live/transcribed | Try different channel |
| API Timeout | High load or slow LLM | Retry after 30 seconds |
| Rate Limit Exceeded | Too many requests | Wait for rate limit reset |
| Authentication Failed | Invalid/expired token | Re-login to refresh token |

---

## AI Search Issues

### Issue: Search Returns No Results

**Symptoms:**
- Empty results list
- "No results found" message

**Causes:**
1. Query too vague or generic
2. No matching content in database
3. Search filters too restrictive
4. Language mismatch

**Solutions:**

**1. Make Query More Specific**
```
❌ Bad: "movie"
✅ Good: "Israeli comedy movies from the 2020s"

❌ Bad: "show"
✅ Good: "Family-friendly series similar to Shtisel"
```

**2. Remove or Relax Filters**
```bash
# Web (Chrome DevTools Console)
# Check active filters
console.log(searchStore.getState().filters);

# Clear filters
searchStore.setState({ filters: {} });
```

**3. Try Different Languages**
```typescript
// If searching in English, try Hebrew
searchWithAI("קומדיה ישראלית");
```

**4. Check Content Availability**
```bash
# Backend - Check if matching content exists
cd backend
poetry run python -c "
from app.models.content import Content
import asyncio

async def check():
    count = await Content.find().count()
    print(f'Total content items: {count}')

asyncio.run(check())
"
```

---

### Issue: Results Not Relevant

**Symptoms:**
- Results don't match query intent
- Low relevance scores (<0.5)
- Unrelated content appears

**Causes:**
1. Query ambiguous or unclear
2. Metadata incomplete
3. Vector embeddings outdated
4. Model misinterpreting context

**Solutions:**

**1. Add More Context to Query**
```
❌ Vague: "something good"
✅ Specific: "Heartwarming Israeli family drama from recent years"

❌ Unclear: "action"
✅ Clear: "Fast-paced action movies with car chases, similar to Fast & Furious"
```

**2. Include Preferences and Constraints**
```
✅ "Israeli comedy movies from 2020-2025, suitable for family viewing, around 90 minutes long"
```

**3. Rebuild Vector Embeddings (Admin)**
```bash
# Backend
cd backend
poetry run python scripts/rebuild_vector_index.py
```

**4. Enrich Metadata (Admin)**
```bash
# Use AI Agent to enrich metadata
curl -X POST http://localhost:8000/api/v1/admin/ai-agent/enrich \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content_ids": ["all"]}'
```

---

### Issue: "Insufficient Credits" Error

**Symptoms:**
- Error message: "Insufficient AI credits"
- Balance shown as < 10 credits
- Search button disabled

**Causes:**
1. Beta 500 credits depleted
2. Credit deduction failed but balance not updated
3. User not enrolled in Beta 500

**Solutions:**

**1. Check Actual Balance**
```bash
# Web (Chrome DevTools Console)
fetch('/api/v1/beta/credits/balance', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
}).then(r => r.json()).then(console.log);
```

**2. Request Credit Refund (if operation failed)**
```bash
# Contact support with transaction details
# Include: user_id, timestamp, feature used, error message
```

**3. Verify Beta Enrollment**
```bash
# Backend - Check enrollment status
cd backend
poetry run python -c "
from app.models.beta_user import BetaUser
import asyncio

async def check():
    user = await BetaUser.find_one(BetaUser.email == 'user@example.com')
    print(f'Beta User: {user.is_beta_user if user else False}')
    print(f'Balance: {user.balance if user else 0}')

asyncio.run(check())
"
```

**4. Admin Credit Grant**
```bash
# Admin can grant additional credits
curl -X POST http://localhost:8000/api/v1/admin/beta/credits/grant \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "amount": 100,
    "reason": "Beta testing participation reward"
  }'
```

---

## AI Recommendations Issues

### Issue: Recommendations Not Personalized

**Symptoms:**
- Generic recommendations
- Same content shown repeatedly
- No consideration of viewing history

**Causes:**
1. No viewing history recorded
2. Insufficient history (<10 views)
3. Cache outdated
4. Context not detected

**Solutions:**

**1. Build Viewing History**
```
Minimum required: 10+ completed views
Optimal: 30+ views across different categories
```

**2. Set Explicit Preferences**
```typescript
// Web
fetch('/api/v1/preferences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    preferred_genres: ['comedy', 'drama'],
    preferred_languages: ['he', 'en'],
    content_types: ['movies', 'series'],
  }),
});
```

**3. Clear Recommendation Cache**
```bash
# Web (Chrome DevTools Console)
localStorage.removeItem('ai-recommendations');
recommendationsStore.setState({ recommendations: [], lastFetched: null });
```

**4. Provide Context**
```bash
# Request recommendations with specific context
curl -X GET "http://localhost:8000/api/v1/beta/recommendations?context=evening&mood=relaxing" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Issue: Same Recommendations Repeated

**Symptoms:**
- Identical recommendations every request
- No new suggestions
- Stale content

**Causes:**
1. Cache TTL too long
2. No new content added
3. Viewing history not updating
4. Algorithm not diversifying

**Solutions:**

**1. Force Refresh**
```typescript
// Web - Force new recommendations
await aiService.getRecommendations({ force_refresh: true });
```

**2. Check Content Updates**
```bash
# Backend - Check recent content additions
cd backend
poetry run python -c "
from app.models.content import Content
from datetime import datetime, timedelta
import asyncio

async def check():
    week_ago = datetime.utcnow() - timedelta(days=7)
    count = await Content.find(Content.created_at >= week_ago).count()
    print(f'New content last 7 days: {count}')

asyncio.run(check())
"
```

**3. Update Preferences to Increase Diversity**
```typescript
// Request more diverse recommendations
await aiService.getRecommendations({
  diversity: 0.8,  // 0.0-1.0, higher = more diverse
  exclude_watched: true,
});
```

---

## Auto Catch-Up Issues

### Issue: "No Content Available"

**Symptoms:**
- Error: "No content available for catch-up"
- Catch-up button disabled
- Empty summary

**Causes:**
1. Channel not live
2. Insufficient transcript data (<5 minutes)
3. Transcription service not enabled
4. Channel not configured for catch-up

**Solutions:**

**1. Verify Channel is Live**
```bash
# Check live channel status
curl http://localhost:8000/api/v1/live/channels | jq '.[] | select(.is_live == true)'
```

**2. Wait for More Content**
```
Minimum required: 5 minutes of live content
Optimal: 15-30 minutes for quality summaries
```

**3. Check Transcription Service**
```bash
# Backend - Verify transcription enabled
cd backend
poetry run python -c "
from app.core.config import settings
print(f'Transcription enabled: {settings.ENABLE_LIVE_TRANSCRIPTION}')
print(f'Transcription service: {settings.TRANSCRIPTION_SERVICE}')
"
```

**4. Enable Channel for Catch-Up (Admin)**
```bash
# Update channel configuration
curl -X PATCH http://localhost:8000/api/v1/admin/live/channels/{channel_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enable_catchup": true, "enable_transcription": true}'
```

---

### Issue: Summary Too Brief or Generic

**Symptoms:**
- Very short summary (< 50 words)
- Lacks detail
- Generic statements
- Missing key moments

**Causes:**
1. Insufficient source material
2. Poor transcript quality
3. Model selection (Haiku vs Sonnet)
4. Prompt not optimized

**Solutions:**

**1. Wait for More Content**
```
Brief summary: 5-10 minutes content
Detailed summary: 15-30 minutes content
Comprehensive: 30+ minutes content
```

**2. Request Detailed Mode (if available)**
```bash
curl -X GET "http://localhost:8000/api/v1/live/{channel_id}/catchup?detail=high" \
  -H "Authorization: Bearer $TOKEN"
```

**3. Check Transcript Quality**
::: v-pre
```bash
# Backend - Review transcript
cd backend
poetry run python scripts/view_channel_transcript.py --channel-id <channel_id>
```
:::

**4. Upgrade to Sonnet for Better Summaries (Admin)**
```bash
# Update LLM config to use Sonnet for catch-up
# Edit Google Cloud Secret: LLM_MODEL_CONFIG
# Change feature_model_mapping.catch_up to "claude-sonnet-4-5"
```

---

## General AI Feature Issues

### Issue: Features Loading Slowly

**Symptoms:**
- Spinner shows for >5 seconds
- Timeout errors
- User frustration

**Causes:**
1. LLM API latency
2. Network congestion
3. High server load
4. Large request payloads

**Solutions:**

**1. Check Network Connection**
```bash
# Test API connectivity
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health
```

**2. Monitor LLM API Latency**
```bash
# Backend - Check Prometheus metrics
curl http://localhost:9090/metrics | grep llm_request_duration_seconds
```

**3. Optimize Request Payload**
```typescript
// Reduce query length if too long
const optimizedQuery = query.substring(0, 500);  // Max 500 chars
```

**4. Enable Caching**
```bash
# Backend - Verify caching enabled
cd backend
grep "ENABLE_LLM_CACHE" .env
# Should be: ENABLE_LLM_CACHE=true
```

---

### Issue: "Service Unavailable" Error

**Symptoms:**
- HTTP 503 errors
- "AI service temporarily down" message
- Intermittent failures

**Causes:**
1. LLM API outage
2. Rate limit exceeded (global)
3. Circuit breaker open
4. Backend service down

**Solutions:**

**1. Check LLM Service Status**
```bash
# Anthropic Status Page
open https://status.anthropic.com

# OpenAI Status Page
open https://status.openai.com
```

**2. Verify Circuit Breaker State**
```bash
# Backend logs
cd backend
tail -f logs/backend.log | grep "circuit_breaker"
```

**3. Reset Circuit Breaker (Admin)**
```bash
# Reset circuit breaker
curl -X POST http://localhost:8000/api/v1/admin/llm/circuit-breaker/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**4. Check Backend Service**
```bash
# Health check
curl http://localhost:8000/health

# Service status
systemctl status bayit-plus-backend
```

---

## Error Codes Reference

### Credit System Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 402 | Insufficient credits | Balance too low | Check balance, wait for refill |
| 409 | Concurrent credit deduction | Race condition | Retry automatically handled |
| 422 | Invalid credit amount | Negative or zero amount | Check request payload |

### Rate Limiting Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 429 | Rate limit exceeded | Too many requests | Wait for reset (shown in headers) |
| 429 | Feature rate limit exceeded | Feature-specific limit hit | Wait or use different feature |

### LLM API Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 500 | LLM request failed | LLM API error | Check LLM service status, retry |
| 503 | Service temporarily unavailable | Circuit breaker open | Wait 60s for circuit breaker reset |
| 504 | LLM request timeout | Request too slow | Reduce request complexity |

---

## Debug Logging

### Enable Debug Logging (Web)

```bash
# Chrome DevTools Console
localStorage.setItem('debug', 'bayit:ai:*');
location.reload();
```

### Enable Debug Logging (Backend)

```bash
# .env
LOG_LEVEL=debug
AI_AGENT_LOG_LEVEL=debug

# Restart backend
poetry run uvicorn app.main:app --reload
```

### View Logs

**Web:**
```bash
# Chrome DevTools Console
# All AI-related logs automatically displayed
```

**Backend:**
```bash
cd backend
tail -f logs/backend.log | grep "AI"
```

**Structured Logging Query:**
```bash
# Query logs with jq
cat logs/backend.log | jq 'select(.component == "ai_service")'
```

---

## Performance Optimization

### Client-Side

**1. Enable Request Caching**
```typescript
// Cache search results for 5 minutes
const cacheKey = `search:${hashQuery(query)}`;
const cached = localStorage.getItem(cacheKey);
if (cached && Date.now() - JSON.parse(cached).timestamp < 300000) {
  return JSON.parse(cached).results;
}
```

**2. Debounce Search Input**
```typescript
// Wait 500ms after user stops typing
const debouncedSearch = debounce(searchWithAI, 500);
```

**3. Lazy Load Components**
```typescript
// Lazy load AI components
const AISearchModal = lazy(() => import('./components/ai/AISearchModal'));
```

### Server-Side

**1. Enable Redis Caching**
```bash
# .env
REDIS_ENABLE=true
LLM_CACHE_TTL=3600
```

**2. Use Haiku for High-Volume Operations**
```python
# For search and recommendations, use Haiku
model = "claude-haiku-3-5-20241022"  # $1/M tokens vs $15/M
```

**3. Batch Requests**
```python
# Process multiple items in one LLM request
results = await llm_service.batch_analyze(items)
```

---

## Getting Help

### Documentation

- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - Technical overview
- [AI API Reference](../api/AI_API_REFERENCE.md) - Complete API docs
- [Beta 500 User Manual](BETA_500_USER_MANUAL.md) - End-user guide
- [LLM Configuration](../deployment/LLM_CONFIGURATION.md) - Model setup

### Support Channels

**For Users:**
- Email: support@bayitplus.com
- Community: community.bayitplus.com
- GitHub Issues (for developers)

**For Developers:**
- Backend Issues: https://github.com/bayit-plus/backend/issues
- Frontend Issues: https://github.com/bayit-plus/web/issues
- Documentation Issues: docs@bayitplus.com

**Emergency Contact:**
- Critical production issues: emergency@bayitplus.com
- On-call engineer: +1-XXX-XXX-XXXX

### Information to Provide

When reporting issues, include:

1. **User Information**
   - User ID
   - Email address
   - Beta enrollment status

2. **Issue Details**
   - Feature used (AI Search, Recommendations, Catch-Up)
   - Error message (exact text)
   - Timestamp (with timezone)
   - Steps to reproduce

3. **Technical Context**
   - Platform (Web, iOS, Android, tvOS)
   - Browser/OS version
   - Network conditions
   - Request/response payloads (if available)

4. **Logs** (if available)
   - Browser console logs
   - Backend logs (for admins)
   - Network HAR file

---

## Preventive Measures

### For Users

1. **Monitor Credit Balance** - Check regularly to avoid interruptions
2. **Use Specific Queries** - More specific = better results
3. **Build Viewing History** - Watch content to improve recommendations
4. **Provide Feedback** - Help improve AI accuracy with thumbs up/down

### For Developers

1. **Enable Monitoring** - Prometheus + Grafana dashboards
2. **Set Budget Alerts** - Alert when AI costs exceed thresholds
3. **Test Edge Cases** - Low credits, no history, empty results
4. **Implement Retries** - Auto-retry failed requests with exponential backoff
5. **Cache Aggressively** - Reduce LLM API calls by 40-60%

### For Admins

1. **Monitor Error Rates** - Set alerts for >5% error rate
2. **Review Cost Daily** - Track AI spending trends
3. **Audit Credit Usage** - Identify unusual patterns
4. **Keep Metadata Updated** - Run weekly enrichment jobs
5. **Test Failover** - Verify fallback strategies work

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - API error codes and responses
- [Beta 500 User Manual](BETA_500_USER_MANUAL.md) - Feature usage guide
- [LLM Configuration](../deployment/LLM_CONFIGURATION.md) - Model and fallback config
- [Credit System](../technical/CREDIT_SYSTEM.md) - Credit architecture

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Support Team
**Next Review:** 2026-02-28
