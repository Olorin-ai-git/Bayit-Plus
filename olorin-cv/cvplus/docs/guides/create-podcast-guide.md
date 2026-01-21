# Create CV Podcast Guide

## Method 1: Using the Frontend (Recommended)

1. **Access the Frontend**:
   ```bash
   # The frontend is already running at:
   http://localhost:3000/
   ```

2. **Sign In**:
   - Click "Sign In" with your Google account
   - This provides the Firebase authentication required

3. **Process Your CV**:
   - Upload a CV file or provide a CV URL
   - Wait for the system to process and parse it

4. **Generate Podcast**:
   - Navigate to the CV dashboard
   - Look for "Generate Podcast" or podcast section
   - Choose style: professional, conversational, or storytelling
   - Click generate

## Method 2: Using Firebase CLI (Advanced)

If you want to test the functions directly:

```bash
# Test the podcast generation function
firebase functions:shell

# Then in the shell:
generatePodcast({jobId: "your-job-id", style: "professional", duration: "medium"})
```

## Method 3: Direct Firebase Function Call (Complex)

This requires Firebase authentication tokens, which are complex to obtain via curl.

### Prerequisites for Direct API Calls:
1. Firebase ID token (obtained through authentication)
2. Proper request headers
3. Correct function URL format

### Sample curl (requires authentication):
```bash
# Get Firebase ID token first (complex process)
# Then use it in the call:
curl -X POST https://us-central1-getmycv-ai.cloudfunctions.net/generatePodcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "data": {
      "jobId": "your-job-id",
      "style": "professional",
      "duration": "medium",
      "focus": "balanced"
    }
  }'
```

## Available Podcast Options:

### Styles:
- **professional**: Formal, business-focused
- **casual**: Relaxed, conversational  
- **enthusiastic**: Energetic, engaging

### Duration:
- **short**: 2-3 minutes
- **medium**: 5-7 minutes  
- **long**: 10-12 minutes

### Focus:
- **achievements**: Highlights accomplishments
- **journey**: Career progression story
- **skills**: Technical and soft skills emphasis
- **balanced**: Mix of all aspects

## Recommended Approach:

**Use the frontend** (http://localhost:3000/) as it handles:
- ✅ Firebase authentication automatically
- ✅ CV processing and parsing
- ✅ Job management
- ✅ Podcast status tracking
- ✅ Download links for generated audio

The frontend provides the complete user experience and handles all the complex authentication and state management required for podcast generation.