# Speech-to-Text Provider Configuration

## Overview

Bayit+ now supports **two speech-to-text providers** for live subtitle transcription:

1. **Google Cloud Speech-to-Text** (default)
2. **OpenAI Whisper** (new)

You can switch between providers using a single configuration variable.

---

## 🔄 Provider Comparison

| Feature | Google Cloud Speech-to-Text | OpenAI Whisper |
|---------|----------------------------|----------------|
| **Streaming** | ✅ True streaming (real-time) | ⚠️ Buffered streaming (5s chunks) |
| **Latency** | 🟢 Very Low (~200-500ms) | 🟡 Moderate (~5-7s) |
| **Accuracy (Hebrew)** | 🟡 Good | 🟢 Excellent |
| **Accuracy (English)** | 🟢 Excellent | 🟢 Excellent |
| **Accuracy (Arabic)** | 🟡 Good | 🟢 Excellent |
| **Setup Complexity** | 🟡 Moderate (requires GCP credentials) | 🟢 Simple (just API key) |
| **Cost** | $0.024/min (standard), $0.048/min (enhanced) | $0.006/min |
| **Authentication** | Application Default Credentials | API key |
| **Deployment** | Auto-configured on Cloud Run | Requires OPENAI_API_KEY env var |

---

## 📋 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# OpenAI API Key (required for Whisper)
OPENAI_API_KEY=sk-proj-...

# Provider Selection
SPEECH_TO_TEXT_PROVIDER=google  # Options: "google" or "whisper"
```

### Provider Selection

**Option 1: Google Cloud Speech-to-Text (Default)**
```bash
SPEECH_TO_TEXT_PROVIDER=google
```
- ✅ Auto-configured on Google Cloud Run
- ✅ Lowest latency
- ✅ True real-time streaming
- ❌ Requires Google Cloud credentials locally

**Option 2: OpenAI Whisper**
```bash
SPEECH_TO_TEXT_PROVIDER=whisper
OPENAI_API_KEY=sk-proj-...
```
- ✅ Better accuracy for Hebrew/Arabic
- ✅ Simpler setup (just API key)
- ✅ Lower cost ($0.006/min vs $0.024/min)
- ❌ Higher latency (~5s buffering)

---

## 🚀 Deployment

### Local Development

1. **Add to `.env`:**
   ```bash
   # For Whisper
   OPENAI_API_KEY=sk-proj-your-key-here
   SPEECH_TO_TEXT_PROVIDER=whisper

   # For Google Cloud
   SPEECH_TO_TEXT_PROVIDER=google
   # Ensure you have Google Cloud credentials:
   # export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

2. **Install dependencies:**
   ```bash
   poetry install
   ```

3. **Start server:**
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

### Google Cloud Run Deployment

**Method 1: Cloud Run Console**

1. Navigate to Cloud Run service
2. Edit & Deploy New Revision
3. Under "Variables & Secrets", add:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SPEECH_TO_TEXT_PROVIDER`: `whisper` or `google`

**Method 2: gcloud CLI**

```bash
# Deploy with Whisper
gcloud run deploy bayit-backend \
  --source . \
  --region us-central1 \
  --set-env-vars SPEECH_TO_TEXT_PROVIDER=whisper \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest \
  --allow-unauthenticated

# Deploy with Google Cloud (default)
gcloud run deploy bayit-backend \
  --source . \
  --region us-central1 \
  --set-env-vars SPEECH_TO_TEXT_PROVIDER=google \
  --allow-unauthenticated
```

**Method 3: Secret Manager (Recommended)**

Store API keys in Secret Manager:

```bash
# Create secret
echo -n "sk-proj-your-key" | gcloud secrets create openai-api-key --data-file=-

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:YOUR-SERVICE-ACCOUNT@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy bayit-backend \
  --source . \
  --region us-central1 \
  --set-env-vars SPEECH_TO_TEXT_PROVIDER=whisper \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest
```

---

## 🧪 Testing Both Providers

### Test Script

```python
import asyncio
from app.services.live_translation_service import LiveTranslationService

async def test_providers():
    # Test Google Cloud
    print("Testing Google Cloud Speech-to-Text...")
    google_service = LiveTranslationService(provider="google")
    google_status = google_service.verify_service_availability()
    print(f"Google Cloud Status: {google_status}")

    # Test OpenAI Whisper
    print("\nTesting OpenAI Whisper...")
    whisper_service = LiveTranslationService(provider="whisper")
    whisper_status = whisper_service.verify_service_availability()
    print(f"Whisper Status: {whisper_status}")

asyncio.run(test_providers())
```

### WebSocket Test

```bash
# Start server with Whisper
SPEECH_TO_TEXT_PROVIDER=whisper poetry run uvicorn app.main:app --reload

# Connect with wscat (install: npm install -g wscat)
wscat -c "ws://localhost:8000/api/v1/ws/live/CHANNEL_ID/subtitles?token=YOUR_TOKEN&target_lang=en"

# Send audio chunks (binary data)
# You'll receive JSON subtitle cues back
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue 1: "Invalid speech provider"**
```
ValueError: Invalid speech provider: xyz. Must be 'google' or 'whisper'
```
**Solution:** Set `SPEECH_TO_TEXT_PROVIDER` to either `google` or `whisper`

**Issue 2: "OPENAI_API_KEY not configured"**
```
ValueError: OPENAI_API_KEY not configured
```
**Solution:** Add `OPENAI_API_KEY=sk-proj-...` to your environment

**Issue 3: Google Cloud credentials missing (local dev)**
```
google.auth.exceptions.DefaultCredentialsError
```
**Solution:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Issue 4: Higher latency with Whisper**
```
Subtitles appear ~5 seconds after speech
```
**Explanation:** This is expected. Whisper buffers audio in 5-second chunks for better accuracy. Adjust `chunk_duration_ms` parameter if needed.

---

## 📊 Cost Analysis

### Monthly Cost Estimates (100 hours of live streaming)

**Google Cloud Speech-to-Text:**
- Standard model: 100 hours × 60 min × $0.024 = **$144/month**
- Enhanced model: 100 hours × 60 min × $0.048 = **$288/month**

**OpenAI Whisper:**
- 100 hours × 60 min × $0.006 = **$36/month**

**Savings with Whisper:** ~75% ($108-252/month)

### Translation Costs (Same for Both)

**Google Cloud Translate:**
- $20 per 1M characters
- Estimate: ~$10-30/month for typical usage

---

## 🎯 Recommendations

### Use Google Cloud Speech-to-Text When:
- ✅ Real-time responsiveness is critical
- ✅ Streaming latency must be <1 second
- ✅ Already using Google Cloud Platform
- ✅ Live sports commentary, news, real-time events

### Use OpenAI Whisper When:
- ✅ Hebrew/Arabic accuracy is priority
- ✅ Cost optimization is important
- ✅ 5-7 second latency is acceptable
- ✅ Simpler deployment is preferred
- ✅ Most VOD and live content scenarios

---

## 🔐 Security Best Practices

### Production Deployment

1. **Never commit API keys** to version control
2. **Use Secret Manager** for all API keys
3. **Rotate keys regularly** (every 90 days)
4. **Set usage limits** in OpenAI dashboard
5. **Monitor costs** via billing alerts

### Secret Manager Setup

```bash
# Store OpenAI key
gcloud secrets create openai-api-key --data-file=- < openai-key.txt

# Grant access to Cloud Run
gcloud run services add-iam-policy-binding bayit-backend \
  --member=serviceAccount:PROJECT-NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## 📝 Architecture

### Request Flow

```
Client (Web/Mobile)
    ↓ WebSocket Connection
WebSocket Endpoint (/api/v1/ws/live/{channel_id}/subtitles)
    ↓ Authenticate & Verify Premium Tier
LiveTranslationService (initialized with configured provider)
    ↓
    ├─ If SPEECH_TO_TEXT_PROVIDER=google
    │  └─ Google Cloud Speech-to-Text (streaming)
    │
    └─ If SPEECH_TO_TEXT_PROVIDER=whisper
       └─ OpenAI Whisper API (buffered)
    ↓
Google Cloud Translate (same for both providers)
    ↓ JSON Subtitle Cues
Client Display
```

### Files Modified

- `backend/app/core/config.py` - Added `OPENAI_API_KEY` and `SPEECH_TO_TEXT_PROVIDER`
- `backend/app/services/whisper_transcription_service.py` - New OpenAI Whisper service
- `backend/app/services/live_translation_service.py` - Modified to support both providers
- `backend/.env.example` - Added new environment variables
- `backend/Dockerfile` - Added documentation comments
- `backend/pyproject.toml` - Added `openai` package dependency

---

## 🔄 Switching Providers

### Zero-Downtime Switch

To switch providers in production without downtime:

1. **Deploy new revision** with new `SPEECH_TO_TEXT_PROVIDER` value
2. **Cloud Run handles** gradual traffic migration
3. **Existing WebSocket connections** continue on old revision
4. **New connections** use new provider

```bash
# Switch from Google to Whisper
gcloud run deploy bayit-backend \
  --source . \
  --set-env-vars SPEECH_TO_TEXT_PROVIDER=whisper \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest \
  --no-traffic  # Deploy but don't route traffic yet

# Test the new revision
# If successful, gradually shift traffic
gcloud run services update-traffic bayit-backend \
  --to-revisions=LATEST=100
```

---

## 📞 Support

For issues with:
- **Google Cloud:** Check GCP console logs and service health
- **OpenAI Whisper:** Check OpenAI status page and API usage dashboard
- **Bayit+ Backend:** Check Cloud Run logs: `gcloud run logs read bayit-backend`

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2026-01-12
