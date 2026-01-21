# Olorin Frontend Deployment Guide

This guide explains how to deploy the Olorin frontend application to Firebase hosting at https://olorin-ai.web.app/.

## 🚀 Quick Deployment

For quick deployments, use the automated deployment script:

```bash
./scripts/deploy.sh
```

## 📋 Prerequisites

1. **Firebase CLI**: Install Firebase tools globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Authentication**: Ensure you're logged in to Firebase
   ```bash
   firebase login
   ```

3. **Project Access**: Ensure you have deployment permissions for the `olorin-ai` project

## 🔧 Manual Deployment Process

### Step 1: Build the Application
```bash
npm run build
```

### Step 2: Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

## 🌍 Environment Configuration

The application automatically detects the deployment environment and configures API endpoints accordingly:

### Production (Firebase Hosting)
- **URL**: https://olorin-ai.web.app/
- **API Base URL**: https://olorin-server.herokuapp.com
- **Analytics**: Enabled
- **Debug Mode**: Disabled

### Development (localhost)
- **URL**: http://localhost:3000
- **API Base URL**: http://localhost:8090
- **Analytics**: Disabled
- **Debug Mode**: Enabled

## 🔧 Environment Variables

You can override default configuration using environment variables:

```bash
# API Configuration
export REACT_APP_API_BASE_URL=https://your-api-server.com

# Firebase Configuration
export REACT_APP_FIREBASE_PROJECT_ID=olorin-ai
export REACT_APP_FIREBASE_AUTH_DOMAIN=olorin-ai.firebaseapp.com
export REACT_APP_FIREBASE_MEASUREMENT_ID=G-HM69PZF9QE

# Feature Flags
export REACT_APP_ENABLE_AUTONOMOUS_MODE=true
export REACT_APP_ENABLE_MOCK_DATA=false
export REACT_APP_ENABLE_DEBUG_LOGS=false
```

## 📁 Project Structure

```
olorin-front/
├── build/                  # Production build output (served by Firebase)
├── public/                 # Static assets
├── src/
│   ├── config/
│   │   └── environment.ts  # Environment configuration
│   ├── firebase.ts         # Firebase initialization
│   └── ...
├── scripts/
│   └── deploy.sh          # Automated deployment script
├── firebase.json          # Firebase hosting configuration
└── .firebaserc           # Firebase project configuration
```

## 🔥 Firebase Configuration

### Hosting Configuration (`firebase.json`)
```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Project Configuration (`.firebaserc`)
```json
{
  "projects": {
    "default": "olorin-ai"
  }
}
```

## 📊 Analytics Integration

Firebase Analytics is automatically configured for production deployments:

- **Project ID**: olorin-ai
- **Measurement ID**: G-HM69PZF9QE
- **Events Tracked**:
  - Page views
  - Investigation workflows
  - Agent activities
  - Error tracking

## 🔒 Security Features

### CORS Configuration
The application includes proper CORS headers for API communication:
- `Content-Type: application/json`
- `Accept: application/json`
- `Cache-Control: no-cache`

### Caching Strategy
Static assets are cached for 1 year, while HTML files are not cached to ensure fresh deployments.

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   npm run build:clean
   npm run build
   ```

2. **Firebase Authentication Issues**
   ```bash
   # Re-authenticate with Firebase
   firebase logout
   firebase login
   ```

3. **Deployment Permissions**
   - Ensure your Google account has access to the `olorin-ai` Firebase project
   - Contact project administrators for access

4. **API Connection Issues**
   - Verify the backend API server is running
   - Check environment variable configuration
   - Review browser console for CORS errors

### Debug Mode

Enable debug logging in development:
```typescript
// In environment.ts
debugMode: true
```

### Testing Deployment

After deployment, verify the application:

1. **URL Access**: https://olorin-ai.web.app/
2. **API Connectivity**: Check browser console for successful API calls
3. **Analytics**: Verify events in Firebase Console > Analytics
4. **Features**: Test core investigation functionality

## 📈 Monitoring

### Firebase Console
- **URL**: https://console.firebase.google.com/project/olorin-ai/overview
- **Hosting**: Monitor deployment status and traffic
- **Analytics**: View user behavior and application metrics

### Health Checks
The application includes automatic environment configuration logging in development mode.

## 🔄 CI/CD Integration

For automated deployments, integrate with your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Deploy to Firebase
  run: |
    npm install
    npm run build
    npx firebase deploy --only hosting --token ${{ secrets.FIREBASE_TOKEN }}
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review Firebase Console logs
3. Contact the development team with error details

---

**Last Updated**: January 2025  
**Deployment URL**: https://olorin-ai.web.app/  
**Firebase Project**: olorin-ai 