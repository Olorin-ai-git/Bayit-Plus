# Required GitHub Repository Secrets

To enable the CI/CD pipelines, configure the following secrets in your GitHub repository settings:

## Firebase Secrets

### FIREBASE_SERVICE_ACCOUNT
Firebase service account JSON for deployment authentication.

```bash
# Generate service account key
firebase projects:list
firebase projects:addiamserviceaccount --project your-project-id

# Copy the JSON content to GitHub Secrets
```

## API Keys

### ANTHROPIC_API_KEY
Anthropic Claude API key for AI functionality.

```bash
# Get from Anthropic Console
# https://console.anthropic.com/
```

## Optional Secrets

### SLACK_WEBHOOK_URL (Variable)
Slack webhook URL for notifications.

### CODECOV_TOKEN (Optional)
Codecov token for coverage reporting.

## Environment Variables (Variables)

Set these as GitHub repository variables:

- **FIREBASE_PROJECT_ID**: Your Firebase project ID
- **STAGING_PROJECT_ID**: Staging Firebase project ID  
- **DEV_PROJECT_ID**: Development Firebase project ID

## Setup Instructions

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each secret using the "New repository secret" button
4. Add variables using the "Variables" tab

## Security Notes

- Never commit secrets to the repository
- Rotate secrets regularly
- Use least-privilege access for service accounts
- Monitor secret usage in Actions logs
