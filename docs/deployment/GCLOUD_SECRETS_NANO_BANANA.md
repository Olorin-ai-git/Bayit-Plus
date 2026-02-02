# Google Cloud Secrets - Nano-Banana-MCP Integration

**Service**: Nano-Banana-MCP (AI Image Generation/Editing)  
**Created**: 2026-02-02  
**Purpose**: Gemini API key for AI-powered image generation and editing via MCP

## Secret Configuration

### GEMINI_API_KEY

**Type**: String  
**Required**: Yes (for Nano-Banana-MCP functionality)  
**Description**: Google Gemini 2.5 Flash Image API key for generating and editing wizard animation frames

**Usage**: 
- AI image generation from text prompts
- Editing existing wizard animation frames
- Style transfer and iterative refinement
- Maintaining visual consistency across animations

## Google Cloud Commands

### Create Secret
```bash
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --labels="service=nano-banana-mcp,environment=production"
```

### Grant Access to Service Accounts
```bash
# Default Compute Engine service account
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### Retrieve Secret
```bash
gcloud secrets versions access latest --secret=GEMINI_API_KEY
```

### Update Secret (New Version)
```bash
echo -n "NEW_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### Delete Secret (if needed)
```bash
gcloud secrets delete GEMINI_API_KEY
```

## MCP Configuration

Add to your MCP settings file (`~/.claude/mcp-servers.json` or project config):

```json
{
  "nano-banana": {
    "command": "npx",
    "args": ["nano-banana-mcp"],
    "env": {
      "GEMINI_API_KEY": "$(gcloud secrets versions access latest --secret=GEMINI_API_KEY)"
    }
  }
}
```

## Security Notes

- ✅ Secret stored in Google Cloud Secret Manager (single source of truth)
- ✅ Never commit API keys to git
- ✅ Access controlled via IAM policies
- ✅ Automatic replication for high availability
- ⚠️ If key is compromised, regenerate at [Google AI Studio](https://aistudio.google.com/app/apikey)

## Use Cases for Bayit+ Project

1. **Wizard Animation Consistency**: Generate new animation frames with consistent dimensions
2. **Frame Resizing**: Edit existing frames to match aspect ratios (e.g., waiting 528×1344 → 330×362)
3. **New Animations**: Create additional wizard gestures/states
4. **Style Transfer**: Maintain visual consistency across all wizard states

## Verification

```bash
# Check secret exists
gcloud secrets describe GEMINI_API_KEY

# Test retrieval
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# List all versions
gcloud secrets versions list GEMINI_API_KEY
```

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [Nano-Banana-MCP GitHub](https://github.com/ConechoAI/Nano-Banana-MCP)
- [Google AI Studio](https://aistudio.google.com/)
