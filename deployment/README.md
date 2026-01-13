# Deployment Scripts & Configuration

This directory contains all deployment-related scripts and configurations for Bayit+.

## 📁 Contents

### `/scripts/`
Deployment and setup scripts:

#### Web Deployment
- `deploy-web.sh` - Deploy web application to hosting
- `setup_tagad_series.py` - Initial content setup script

#### Backend Deployment
- `deploy_server.sh` - Deploy backend server
- `deploy_with_Israeli-Radio.sh` - Deploy with Israeli radio channels
- `quick-deploy.sh` - Quick deployment without full rebuild
- `monitor_upload.sh` - Monitor file upload progress

## 🚀 Deployment Workflows

### Web Application
```bash
# Deploy to production
./deployment/scripts/deploy-web.sh

# Firebase deployment (see docs/deployment/FIREBASE_DEPLOYMENT.md)
firebase deploy
```

### Backend Server
```bash
# Full deployment
cd backend
./deployment/scripts/deploy_server.sh

# Quick deployment (code changes only)
./deployment/scripts/quick-deploy.sh
```

## 📝 Configuration Files

Located in project root:
- `docker-compose.yml` - Docker orchestration
- `firebase.json` - Firebase configuration
- `firebase.multi-site.json` - Multi-site Firebase setup

## 🔐 Environment Variables

Required for deployment:

### Backend
```bash
MONGODB_URL=<mongodb_connection_string>
JWT_SECRET=<jwt_secret>
OPENAI_API_KEY=<openai_key>
GCS_BUCKET_NAME=<bucket_name>
GOOGLE_APPLICATION_CREDENTIALS=<path_to_service_account>
```

### Web
```bash
VITE_API_BASE_URL=<backend_url>
VITE_FIREBASE_CONFIG=<firebase_config>
```

## 📚 Documentation

Detailed deployment guides:
- `/docs/deployment/DEPLOYMENT_COMPLETE.md` - Complete deployment guide
- `/docs/deployment/FIREBASE_DEPLOYMENT.md` - Firebase-specific deployment
- `/docs/deployment/UPLOAD_STATUS.md` - Content upload status tracking

Backend-specific:
- `/backend/docs/deployment/` - Backend deployment documentation

## ⚠️ Important Notes

1. **Always backup before deployment**
   ```bash
   cd backend
   ./scripts/backup_database.sh
   ```

2. **Test in staging first** - Never deploy untested code to production

3. **Monitor after deployment** - Check logs and metrics after deploying

4. **Rollback plan** - Know how to rollback if issues arise

5. **Database migrations** - Run migrations before deploying code changes

## 🏗️ Infrastructure

### Current Setup
- **Backend**: Google Cloud Run / VPS
- **Database**: MongoDB Atlas
- **Storage**: Google Cloud Storage
- **CDN**: Firebase Hosting / Cloudflare
- **Mobile**: App Store / Google Play

### Deployment Targets
- Production: `production` branch
- Staging: `staging` branch
- Development: `main` branch

## 📊 Monitoring

After deployment, monitor:
- Server logs: `gcloud logging`
- Error tracking: Sentry
- Performance: Google Analytics
- Uptime: Status page

## 🔄 Rollback Procedures

If deployment fails:

### Web Application
```bash
firebase hosting:rollback
```

### Backend
```bash
# Revert to previous version
gcloud run services update-traffic SERVICE --to-revisions=PREVIOUS_REVISION=100
```

### Database
```bash
cd backend
./scripts/restore_database.sh BACKUP_DATE
```
