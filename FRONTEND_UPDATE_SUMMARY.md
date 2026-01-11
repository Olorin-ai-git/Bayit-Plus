# Frontend Apps Update Summary

## ✅ All Frontend Apps Updated

All frontend applications have been updated to use the new Google Cloud Run backend API.

**New API URL**: `https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1`

---

## Updated Configuration Files

### 1. Web App

**Files Updated:**
- ✅ `/web/.env`
- ✅ `/web/.env.production`

**Changes:**
```bash
# Old
VITE_API_URL=http://localhost:8000/api/v1

# New
VITE_API_URL=https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1
```

**To Deploy:**
```bash
cd web
npm run build
# Deploy dist/ to your hosting platform
```

### 2. Tizen TV App

**Note:** Tizen TV app is built from the web app using webpack, so updating the web app's `.env` files automatically updates Tizen as well.

**To Build Tizen Package:**
```bash
cd web
npm run build:tizen
# This creates tizen/dist/ and packages it as tizen/Bayit+.wgt
```

**To Deploy to TV:**
```bash
cd tizen
./deploy.sh
```

### 3. Android TV App (tv-app/)

**Files Updated:**
- ✅ `/tv-app/.env`
- ✅ `/tv-app/.env.production`

**Changes:**
```bash
# Old
API_BASE_URL=http://localhost:8000

# New
API_BASE_URL=https://bayit-plus-backend-534446777606.us-east1.run.app
```

**To Deploy:**
```bash
cd tv-app
npm run build
# Follow Android TV deployment process
```

### 4. Apple TV App (tvos-app/)

**Files Updated:**
- ✅ `/tvos-app/.env`
- ✅ `/tvos-app/.env.production`

**Changes:**
```bash
# Old
API_BASE_URL=http://localhost:8000

# New
API_BASE_URL=https://bayit-plus-backend-534446777606.us-east1.run.app
```

**To Deploy:**
```bash
cd tvos-app
npm run ios
# Follow Apple TV deployment process
```

---

## ✅ Google OAuth Configuration Updated

The Google OAuth redirect URI has been updated in Secret Manager:

**New Redirect URI:**
```
https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/auth/google/callback
```

### Next Step: Update Google Cloud Console

You need to add this redirect URI to your Google OAuth Client:

1. Go to: https://console.cloud.google.com/apis/credentials?project=israeli-radio-475c9
2. Click on your OAuth 2.0 Client ID (the one used for Bayit+)
3. Under "Authorized redirect URIs", click "ADD URI"
4. Add: `https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/auth/google/callback`
5. Click "SAVE"

---

## ✅ Movie Upload Script Created

A script has been created to upload movies from the USB drive to MongoDB.

**Script Location:** `/backend/scripts/upload_movies_from_usb.py`

### Features:
- Scans directory for movie files (mp4, mkv, avi, mov, webm, m4v)
- Extracts title and year from filenames
- Fetches metadata from TMDB API (if configured)
- Uploads to MongoDB with proper categorization
- Dry-run mode for testing

### Usage:

**Dry run (test without making changes):**
```bash
cd backend
python scripts/upload_movies_from_usb.py --dry-run
```

**Upload movies:**
```bash
cd backend
python scripts/upload_movies_from_usb.py
```

**Custom source directory:**
```bash
python scripts/upload_movies_from_usb.py --source="/path/to/movies"
```

### What It Does:

1. Connects to MongoDB Atlas (`bayit_plus` database)
2. Creates/uses "Movies" category
3. For each movie:
   - Extracts title and year from filename
   - Queries TMDB API for metadata (poster, backdrop, description, rating)
   - Creates Content document in MongoDB
   - Stores local file path (for now)

### Example Output:

```
2026-01-11 12:00:00 - INFO - Scanning directory: /Volumes/USB Drive/Movies
2026-01-11 12:00:00 - INFO - Connected to MongoDB
2026-01-11 12:00:00 - INFO - Using existing 'Movies' category: 679ae3b1c2d3e4f5a6b7c8d9
2026-01-11 12:00:00 - INFO - Found 150 movie files
2026-01-11 12:00:01 - INFO - Processing: A Man Called Otto (2022)
2026-01-11 12:00:02 - INFO -   Found TMDB metadata: A Man Called Otto
2026-01-11 12:00:03 - INFO -   Added to database: 679ae3b1c2d3e4f5a6b7c8da
...
2026-01-11 12:05:00 - INFO - ============================================================
2026-01-11 12:05:00 - INFO - Upload complete!
2026-01-11 12:05:00 - INFO -   Processed: 145
2026-01-11 12:05:00 - INFO -   Skipped:   3
2026-01-11 12:05:00 - INFO -   Failed:    2
2026-01-11 12:05:00 - INFO - ============================================================
```

### Future Enhancement: GCS Upload

The current script stores local file paths (`file:///Volumes/...`). To serve movies from Cloud Run, you'll need to:

1. **Upload videos to GCS bucket** (`bayit-plus-media`)
2. **Update video_url** to use GCS URLs
3. **Enable Cloud CDN** for faster delivery

Example GCS upload code (to add to the script):
```python
from google.cloud import storage

# Upload to GCS
storage_client = storage.Client()
bucket = storage_client.bucket('bayit-plus-media')
blob = bucket.blob(f'movies/{title.replace(" ", "_")}/{filename}')
blob.upload_from_filename(full_path)
blob.make_public()
video_url = blob.public_url
```

---

## Testing Checklist

### Backend (Cloud Run)
- ✅ Health check: `curl https://bayit-plus-backend-534446777606.us-east1.run.app/health`
- ✅ API docs: https://bayit-plus-backend-534446777606.us-east1.run.app/docs
- ✅ MongoDB connection verified
- ✅ Public access enabled

### Frontend Updates Needed
- [ ] Rebuild web app: `cd web && npm run build`
- [ ] Rebuild Tizen app: `cd web && npm run build:tizen`
- [ ] Rebuild Android TV app: `cd tv-app && npm run build`
- [ ] Rebuild Apple TV app: `cd tvos-app && npm run ios`
- [ ] Deploy updated apps to respective platforms

### Google OAuth
- [ ] Add new redirect URI in Google Cloud Console (see instructions above)
- [ ] Test Google login flow from web app
- [ ] Test Google login flow from TV apps

### Content Database
- [ ] Run movie upload script in dry-run mode to verify
- [ ] Run movie upload script to populate database
- [ ] Verify movies appear in `/api/v1/content/featured`
- [ ] Test playback from frontend apps

---

## Summary

**What was done:**
1. ✅ Updated all frontend apps to use Cloud Run backend
2. ✅ Updated Google OAuth redirect URI in Secret Manager
3. ✅ Created movie upload script with TMDB integration
4. ✅ Tested API connectivity

**What you need to do:**
1. Update Google OAuth redirect URI in Google Cloud Console
2. Rebuild and redeploy frontend apps
3. Run movie upload script to populate database
4. Test the complete flow: frontend → Cloud Run → MongoDB Atlas

**Optional:**
- Configure custom domain (api.bayit.tv)
- Upload movie files to GCS for serving
- Setup CI/CD for automatic deployments

---

## Support Links

- **Backend API**: https://bayit-plus-backend-534446777606.us-east1.run.app/docs
- **Cloud Run Console**: https://console.cloud.google.com/run/detail/us-east1/bayit-plus-backend?project=israeli-radio-475c9
- **MongoDB Atlas**: https://cloud.mongodb.com/
- **Google OAuth Console**: https://console.cloud.google.com/apis/credentials?project=israeli-radio-475c9
- **GCS Bucket**: https://console.cloud.google.com/storage/browser/bayit-plus-media?project=israeli-radio-475c9

---

## Next Steps

Choose one of the following paths:

### Path A: Test Frontend Apps
1. Rebuild web app: `cd web && npm run build`
2. Serve locally: `npm run preview`
3. Test API connectivity and Google OAuth

### Path B: Populate Database
1. Run upload script: `cd backend && python scripts/upload_movies_from_usb.py --dry-run`
2. Review output
3. Run actual upload: `python scripts/upload_movies_from_usb.py`

### Path C: Deploy to Production
1. Update Google OAuth redirect URI
2. Build and deploy all apps
3. Test end-to-end flow

Let me know which path you'd like to take next!
