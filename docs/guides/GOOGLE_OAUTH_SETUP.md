# Google OAuth Setup Guide

## Issue: Google Login Failing

The Google login was failing because the redirect URI was hardcoded to `http://localhost:3200/auth/google/callback`, but the application is deployed at `https://bayit.tv`.

## Solution Implemented

The backend has been updated to accept dynamic redirect URIs from the frontend, allowing the same OAuth configuration to work in both development and production environments.

### Changes Made

1. **Backend Updates** (`backend/app/api/routes/auth.py`):
   - Modified `get_google_auth_url()` to accept optional `redirect_uri` parameter
   - Modified `google_callback()` to accept optional `redirect_uri` in request body
   - Both endpoints now use the provided redirect_uri or fall back to the configured default

2. **Frontend Updates**:
   - Updated `web/src/stores/authStore.js` to dynamically build redirect URI from `window.location.origin`
   - Updated `web/src/services/api.js` to pass redirect_uri to both endpoints

3. **Configuration Updates**:
   - Updated `backend/.env` with production redirect URI as default
   - Updated `backend/.env.example` with documentation

## Google Cloud Console Configuration

To fix the Google login, you need to add the production redirect URI to your Google Cloud Console OAuth 2.0 Client ID.

### Steps to Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Navigate to:
   - **APIs & Services** > **Credentials**

3. Find your OAuth 2.0 Client ID:
   - Client ID: `624470113582-pcprpngjog3kmi4epjesm0v466p7oas5.apps.googleusercontent.com`

4. Click on the Client ID to edit it

5. Under **Authorized redirect URIs**, add the following URIs:
   - `https://bayit.tv/auth/google/callback` (production)
   - `https://www.bayit.tv/auth/google/callback` (production with www)
   - `http://localhost:3200/auth/google/callback` (development)
   - `http://localhost:8000/auth/google/callback` (alternative local port)

6. Click **Save**

### Important Notes

- **Exact Match Required**: Google OAuth requires the redirect URI to match exactly (including protocol, domain, port, and path)
- **Multiple URIs**: You can add multiple authorized redirect URIs for different environments
- **No Wildcards**: Google does not support wildcards in redirect URIs
- **HTTPS in Production**: Always use HTTPS for production redirect URIs

## Testing

After updating Google Cloud Console:

1. Clear your browser cache and cookies for bayit.tv
2. Navigate to https://bayit.tv/login
3. Click "Continue with Google"
4. You should be redirected to Google's login page
5. After authentication, you should be redirected back to bayit.tv and logged in

## Troubleshooting

If Google login still fails after updating:

1. **Check the Error Message**:
   - Open browser console (F12) and check for errors
   - Common errors:
     - `redirect_uri_mismatch`: The URI doesn't match what's configured in Google Cloud Console
     - `invalid_client`: Client ID or secret is incorrect
     - `access_denied`: User cancelled the login flow

2. **Verify Configuration**:
   - Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` match Google Cloud Console
   - Ensure the redirect URI in Google Cloud Console matches exactly: `https://bayit.tv/auth/google/callback`

3. **Check Backend Logs**:
   ```bash
   # View backend logs for OAuth errors
   docker logs bayit-backend
   ```

4. **Test Locally**:
   - Try logging in with Google on localhost:3200 first
   - If it works locally but not in production, it's likely a redirect URI mismatch

## Security Considerations

- **Never commit `.env` with real credentials** to version control (it's in `.gitignore`)
- **Rotate secrets regularly**: Consider rotating `GOOGLE_CLIENT_SECRET` periodically
- **Restrict API access**: In Google Cloud Console, restrict the OAuth client to only necessary scopes
- **Monitor usage**: Check Google Cloud Console for unusual OAuth activity

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Troubleshooting OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)
