# CORS Configuration for Cloud Run Backend

## Issue

The backend is deployed to Google Cloud Run and uses Secret Manager for configuration. The frontend is deployed to Firebase Hosting at `https://bayit-plus.web.app`, but the backend CORS configuration doesn't include this domain, causing:

```
Access to XMLHttpRequest at 'https://api.bayit.tv/api/v1/auth/google/url' from origin 'https://bayit-plus.web.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

Update the `backend-cors-origins` secret in Google Cloud Secret Manager to include the Firebase hosting domain.

### Steps to Fix

1. **Go to Google Cloud Console Secret Manager:**
   ```
   https://console.cloud.google.com/security/secret-manager?project=bayit-plus
   ```

2. **Find and edit the `backend-cors-origins` secret**

3. **Update the secret value** to include all required origins:

   **Option 1: JSON Array (Recommended)**
   ```json
   ["http://localhost:3000","http://localhost:8000","https://bayit.tv","https://www.bayit.tv","https://bayit-plus.web.app","https://api.bayit.tv"]
   ```

   **Option 2: Comma-Separated String**
   ```
   http://localhost:3000,http://localhost:8000,https://bayit.tv,https://www.bayit.tv,https://bayit-plus.web.app,https://api.bayit.tv
   ```

4. **Create a new secret version** (don't edit the existing version - add a new one)

5. **Redeploy the backend** or wait for the next deployment to pick up the new secret

### Required CORS Origins

The backend needs to allow requests from:

- `http://localhost:3000` - Local development (web)
- `http://localhost:8000` - Local development (alternative port)
- `https://bayit.tv` - Production (main domain)
- `https://www.bayit.tv` - Production (with www)
- `https://bayit-plus.web.app` - Firebase Hosting (frontend deployment)
- `https://api.bayit.tv` - API subdomain (if API calls itself)

### How It Works

The backend reads the `BACKEND_CORS_ORIGINS` secret and parses it using the `parsed_cors_origins` property in `app/core/config.py`:

```python
@property
def parsed_cors_origins(self) -> list[str]:
    """Parse CORS origins from string or list"""
    if isinstance(self.BACKEND_CORS_ORIGINS, str):
        # JSON string from Secret Manager
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except json.JSONDecodeError:
            # Comma-separated fallback
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
    return self.BACKEND_CORS_ORIGINS
```

The CORS middleware is configured in `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Deployment Configuration

The backend deployment is configured in `cloudbuild.yaml` to read secrets from Secret Manager:

```yaml
- 'BACKEND_CORS_ORIGINS=backend-cors-origins:latest'
```

### Testing

After updating the secret and redeploying:

1. Open browser console (F12)
2. Go to https://bayit-plus.web.app/login
3. Click "Continue with Google"
4. Check Network tab - the request to `https://api.bayit.tv/api/v1/auth/google/url` should succeed
5. You should NOT see any CORS errors

### Troubleshooting

**If CORS errors persist:**

1. **Check the secret was updated:**
   ```bash
   gcloud secrets versions access latest --secret=backend-cors-origins --project=bayit-plus
   ```

2. **Verify the backend is running:**
   ```bash
   curl https://api.bayit.tv/health
   ```

3. **Check backend logs for CORS configuration:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bayit-backend" --project=bayit-plus --limit=50
   ```

4. **Force a new deployment** to ensure the secret is reloaded:
   ```bash
   gcloud run services update bayit-backend --region=us-east1 --project=bayit-plus
   ```

### Security Notes

- Always use HTTPS in production CORS origins (except localhost)
- Never use wildcards (`*`) for `allow_origins` when `allow_credentials` is True
- Keep the list of allowed origins as minimal as necessary
- Regularly audit the CORS origins to remove unused domains

## Alternative: Environment Variable

If you prefer not to use Secret Manager for CORS origins (they're not sensitive), you can:

1. Remove `BACKEND_CORS_ORIGINS` from the Secret Manager secrets list in `cloudbuild.yaml`
2. Add it as an environment variable in the Cloud Run service:
   ```bash
   gcloud run services update bayit-backend \
     --set-env-vars='BACKEND_CORS_ORIGINS=["http://localhost:3000","https://bayit.tv","https://www.bayit.tv","https://bayit-plus.web.app"]' \
     --region=us-east1 \
     --project=bayit-plus
   ```

This approach is simpler but less secure if you ever need to keep CORS configuration private.
