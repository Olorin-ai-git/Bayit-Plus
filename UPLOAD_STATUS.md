# 🎬 Movie Upload Status - LIVE

## 🚀 Upload In Progress

**Status:** ✅ Running in background
**Started:** January 11, 2026 @ 3:58 PM
**Total Movies:** 362 files on USB drive

---

## 📊 Current Progress

**Movies uploaded so far:** 3
**Currently uploading:** Movie #4 - "300" (2006)

**Successfully Uploaded:**
1. ✅ Winnie the Pooh (2011)
2. ✅ 25th Hour (2002)
3. ✅ 65 (2023)

**Now Uploading:**
- 300 (2006) - 1080p BluRay (large file ~4-8GB)

---

## 📁 Upload Details

**Source:** `/Volumes/USB Drive/Movies`
**Destination:** Google Cloud Storage bucket `bayit-plus-media`
**Database:** MongoDB Atlas `bayit_plus`
**Category:** Movies (ID: 69640672b1fee876cf8d75b4)

**Process:**
1. Scan movie file from USB
2. Extract title & year from filename
3. Upload video to GCS (~2-10GB per file)
4. Fetch metadata from TMDB API
5. Create database entry in MongoDB Atlas
6. Repeat for next movie

---

## 📺 Monitoring Commands

**Watch live upload progress:**
```bash
tail -f /tmp/movie_upload_all.log
```

**Check how many uploaded:**
```bash
grep -c "Uploaded successfully:" /tmp/movie_upload_all.log
```

**Check how many added to database:**
```bash
grep -c "Added to database:" /tmp/movie_upload_all.log
```

**Check for errors:**
```bash
grep "ERROR" /tmp/movie_upload_all.log
```

**Kill the upload (if needed):**
```bash
pkill -f "upload_real_movies.py"
```

---

## ⏱️ Estimated Completion Time

**Average upload time per movie:** ~30-60 seconds (depends on file size)
**Estimated total time:** ~3-6 hours for all 362 movies
**Completion ETA:** ~6:00 PM - 9:00 PM today

**Factors affecting speed:**
- File size (300MB - 8GB per movie)
- Network speed to GCS
- TMDB API response time
- USB drive read speed

---

## 🔍 Verification

### Check in Database:
```bash
cd /Users/olorin/Documents/Bayit-Plus/backend
poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def check():
    client = AsyncIOMotorClient('mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority')
    db = client['bayit_plus']
    count = await db.content.count_documents({'category_name': 'Movies'})
    print(f'Movies in database: {count}')
    client.close()

asyncio.run(check())
"
```

### Check in GCS:
Visit: https://console.cloud.google.com/storage/browser/bayit-plus-media-new/movies?project=israeli-radio-475c9

### Check via API:
```bash
curl https://bayit-plus-backend-624470113582.us-east1.run.app/api/v1/content/featured | jq '.categories[] | select(.name == "Movies")'
```

---

## 📝 Log File Location

**Main upload log:** `/tmp/movie_upload_all.log`
**Monitor script:** `/Users/olorin/Documents/Bayit-Plus/backend/monitor_upload.sh`
**Upload script:** `/Users/olorin/Documents/Bayit-Plus/backend/scripts/upload_real_movies.py`

---

## 🎯 What Happens Next

Once upload completes:
1. **Movies will appear in web app** at https://bayit-plus-web.web.app
2. **Movies will be streamable** from GCS
3. **Categories will show content** in the Movies section
4. **TMDB metadata** will enrich each movie (posters, descriptions, ratings)

---

## ⚠️ Known Issues

**Issue:** Upload is slow for large files
**Solution:** This is normal - 4-8GB files take time to upload

**Issue:** Some movies may fail to get TMDB data
**Solution:** They'll still upload with title from filename

**Issue:** Upload might pause on very large files
**Solution:** Be patient, check log for "Uploading to GCS" messages

---

## 📊 Real-Time Stats

**Monitor the upload with:**
```bash
watch -n 5 'tail -20 /tmp/movie_upload_all.log'
```

**Count uploads in real-time:**
```bash
watch -n 10 'echo "Uploaded: $(grep -c "Uploaded successfully:" /tmp/movie_upload_all.log)"'
```

---

## 🎬 Sample Movie Data

Each movie entry includes:
- **Title:** From TMDB or filename
- **Description:** From TMDB
- **Year:** Extracted from filename or TMDB
- **Rating:** TMDB rating (0-10)
- **Thumbnail:** TMDB poster image
- **Backdrop:** TMDB backdrop image
- **Stream URL:** GCS public URL
- **TMDB ID:** For future updates

---

## ✅ Success Checklist

- [x] Local MongoDB data migrated to Atlas
- [x] 64 Podcasts with 782 episodes uploaded
- [x] 10 Radio stations uploaded
- [x] 6 Live TV channels uploaded
- [x] Upload script created and tested
- [x] GCS credentials configured
- [x] Upload process started
- [ ] 362 movies uploading (3/362 complete)
- [ ] Movies appear in web app
- [ ] Playback tested

---

## 🆘 If Something Goes Wrong

**Upload stops unexpectedly:**
```bash
# Restart the upload (it will skip already uploaded movies)
cd /Users/olorin/Documents/Bayit-Plus/backend
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/gcs-uploader-key.json"
export GCS_BUCKET_NAME="bayit-plus-media"
nohup poetry run python scripts/upload_real_movies.py > /tmp/movie_upload_all.log 2>&1 &
```

**Check for errors:**
```bash
grep -A 5 "ERROR" /tmp/movie_upload_all.log
```

**Verify GCS credentials:**
```bash
gcloud auth list
```

---

## 📞 Next Steps

While movies are uploading:
1. ✅ Monitor progress with `tail -f /tmp/movie_upload_all.log`
2. Test the web app with podcasts and radio
3. Update Google OAuth redirect URIs (if not done yet)
4. Prepare for testing movie playback once first batch completes

---

**Last Updated:** January 11, 2026 @ 3:59 PM
**Upload Progress:** 3/362 movies (0.8%)
**Status:** 🟢 RUNNING
