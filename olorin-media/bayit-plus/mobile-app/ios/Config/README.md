# iOS Build Configuration

This directory contains xcconfig files for iOS build configuration.

## Files

- `Debug.xcconfig` - Debug build configuration
- `Release.xcconfig` - Release/App Store build configuration

## Environment Variables

### Local Development

For local development, set the following environment variables in your shell or Xcode scheme:

```bash
export SENTRY_DSN_DEBUG="your-sentry-dsn-for-development"
export SENTRY_DSN_RELEASE="your-sentry-dsn-for-production"
```

### CI/CD (GitHub Actions)

The following secrets must be configured in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `IOS_DISTRIBUTION_CERT_P12` | Base64-encoded distribution certificate (.p12) |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password for the distribution certificate |
| `IOS_PROVISIONING_PROFILE` | Base64-encoded App Store provisioning profile (.mobileprovision) |
| `SENTRY_DSN` | Sentry DSN for error tracking |
| `APP_STORE_API_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_API_ISSUER` | App Store Connect API Issuer ID |
| `APP_STORE_API_KEY` | Base64-encoded App Store Connect API Key (.p8) |

### Creating Secrets

1. **Distribution Certificate**
   ```bash
   base64 -i distribution_certificate.p12 | pbcopy
   ```

2. **Provisioning Profile**
   ```bash
   base64 -i BayitPlus_Distribution.mobileprovision | pbcopy
   ```

3. **App Store Connect API Key**
   ```bash
   base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
   ```

## Bundle ID

Production Bundle ID: `olorin.media.bayitplus`

## Team ID

Development Team: `963B7732N5`

## App Store Connect API

| Setting | Value |
|---------|-------|
| Key ID | `LMYW5G8928` |
| Key File | `credentials/apple/AuthKey_LMYW5G8928.p8` |
| Issuer ID | *(Get from App Store Connect > Users and Access > Keys)* |

## Sentry Error Tracking

DSN: `https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280`

## Required Capabilities

Ensure the following capabilities are enabled in Apple Developer Portal:

- Push Notifications
- Siri
- Background Modes (audio, fetch)
- Speech Recognition

## Running the Build Workflow

1. Go to GitHub Actions
2. Select "iOS Build & Deploy"
3. Click "Run workflow"
4. Select environment (testflight or production)
5. Optionally specify a build number
