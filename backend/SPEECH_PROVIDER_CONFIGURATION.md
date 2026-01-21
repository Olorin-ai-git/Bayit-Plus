# Speech-to-Text & Translation Provider Configuration

## Overview

Bayit+ supports **three speech-to-text providers** and **three translation providers** for live subtitle transcription:

### Speech-to-Text Providers
1. **ElevenLabs Scribe v2** (recommended) - Ultra-low latency, best Hebrew accuracy
2. **Google Cloud Speech-to-Text** - Reliable, auto-configured on Cloud Run
3. **OpenAI Whisper** - Good accuracy but buffered (not real-time)

### Translation Providers
1. **Google Cloud Translate** (recommended) - Fast, reliable, battle-tested
2. **OpenAI GPT-4o-mini** - Context-aware, high quality
3. **Claude** - Excellent for nuanced translations

---

## 🔄 Provider Comparison

### Speech-to-Text Providers

| Feature | ElevenLabs Scribe v2 | Google Cloud STT | OpenAI Whisper |
|---------|---------------------|------------------|----------------|
| **Streaming** | ✅ True WebSocket streaming | ✅ True streaming | ⚠️ Buffered (5s chunks) |
| **Latency** | 🟢 Ultra-low (~150ms) | 🟢 Low (~500ms) | 🟡 Moderate (~5-7s) |
| **Accuracy (Hebrew)** | 🟢 Best (3.1% WER) | 🟡 Good | 🟢 Excellent |
| **Accuracy (English)** | 🟢 Excellent | 🟢 Excellent | 🟢 Excellent |
| **Setup Complexity** | 🟢 Simple (API key) | 🟡 Moderate (GCP creds) | 🟢 Simple (API key) |
| **Cost** | ~$0.02/min | $0.024/min | $0.006/min |

### Translation Providers

| Feature | Google Translate | OpenAI GPT-4o-mini | Claude |
|---------|-----------------|-------------------|--------|
| **Speed** | 🟢 Very Fast | 🟢 Fast | 🟡 Moderate |
| **Quality** | 🟢 Good | 🟢 Excellent | 🟢 Excellent |
| **Context Awareness** | 🟡 Basic | 🟢 High | 🟢 High |
| **Cost** | ~$0.002/1K chars | $0.15/1M tokens | $0.25/1M tokens |

---

## 📋 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# API Keys
ELEVENLABS_API_KEY=your-elevenlabs-key    # Required for ElevenLabs STT
OPENAI_API_KEY=sk-proj-...                 # Required for Whisper STT or OpenAI translation
ANTHROPIC_API_KEY=sk-ant-...               # Required for Claude translation

# Speech-to-Text Provider Selection
# Options: "elevenlabs" (recommended), "google", or "whisper"
SPEECH_TO_TEXT_PROVIDER=elevenlabs

# Live Translation Provider Selection
# Options: "google" (recommended), "openai", or "claude"
LIVE_TRANSLATION_PROVIDER=google
```

### Recommended Configuration (Production)

```bash
SPEECH_TO_TEXT_PROVIDER=elevenlabs
LIVE_TRANSLATION_PROVIDER=google
```
- 🟢 Ultra-low latency (~150ms) with ElevenLabs
- 🟢 Best Hebrew accuracy (3.1% WER)
- 🟢 Fast, reliable translation with Google
- 🟢 Estimated cost: ~$1.30/hour of live content

### Provider Selection

**Option 1: ElevenLabs Scribe v2 (Recommended)**
```bash
SPEECH_TO_TEXT_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-key
```
- ✅ Ultra-low latency (~150ms)
- ✅ Best Hebrew accuracy (3.1% WER)
- ✅ True WebSocket streaming
- ✅ Simple API key authentication

**Option 2: Google Cloud Speech-to-Text**
```bash
SPEECH_TO_TEXT_PROVIDER=google
```
- ✅ Auto-configured on Google Cloud Run
- ✅ Low latency (~500ms)
- ✅ True real-time streaming
- ❌ Requires Google Cloud credentials locally

**Option 3: OpenAI Whisper**
```bash
SPEECH_TO_TEXT_PROVIDER=whisper
OPENAI_API_KEY=sk-proj-...
```
- ✅ Good accuracy for Hebrew/Arabic
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
