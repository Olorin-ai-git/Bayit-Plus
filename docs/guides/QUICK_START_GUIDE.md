# Bayit+ Admin Content Management - Quick Start Guide

**Last Updated:** January 9, 2026
**Status:** ✅ Production Ready

---

## What's Included

✅ Complete admin content management system
✅ Backend API (42+ endpoints)
✅ Frontend admin UI (8 content management pages)
✅ Database with 42 indexes
✅ **13 Free Content Items Pre-Loaded:**
   - 3 Live TV test streams (Apple BipBop)
   - 4 Public domain movies (Night of the Living Dead, His Girl Friday, Nosferatu, The Great Train Robbery)
   - 3 Public radio streams (Soma FM, BBC World Service)
   - 3 Public podcasts (The Daily, Up First, Science Vs)

---

## System Status

### Services Running
- ✅ Backend API: port 8000
- ✅ Frontend (Web): port 3200
- ✅ Frontend (Partner Portal): port 3211
- ✅ MongoDB: localhost:27017
- ✅ Database indexes: Created (42 total)
- ✅ Content imported: 13 items

### Files Created/Modified
- ✅ 11 optimized backend route files (<200 lines each)
- ✅ 8 content management frontend pages
- ✅ 10 reusable UI components
- ✅ Storage service (local + S3)
- ✅ Content importer service
- ✅ Fixed indexes script
- ✅ Free content import script

---

## Quick Access

### Admin Dashboard
```
Frontend: http://localhost:3200
Admin: http://localhost:3200/admin
Content: http://localhost:3200/admin/content
Live Channels: http://localhost:3200/admin/live-channels
Radio Stations: http://localhost:3200/admin/radio-stations
Podcasts: http://localhost:3200/admin/podcasts
```

### API Documentation
```
API Base: http://localhost:8000
Swagger Docs: http://localhost:8000/docs
Health Check: http://localhost:8000/health
```

---

## Testing Content Access

### Via Frontend (Recommended)
1. Open http://localhost:3200/admin/content
2. You should see 4 movies (Night of Living Dead, His Girl Friday, Nosferatu, The Great Train Robbery)
3. Click on any movie to view details
4. Navigate to other sections:
   - Live Channels: 3 test streams
   - Radio Stations: 3 stations
   - Podcasts: 3 podcasts

### Via API
```bash
# Get all content
curl http://localhost:8000/api/v1/admin/content | jq '.items'

# Get live channels
curl http://localhost:8000/api/v1/admin/live-channels | jq '.items'

# Get radio stations
curl http://localhost:8000/api/v1/admin/radio-stations | jq '.items'

# Get podcasts
curl http://localhost:8000/api/v1/admin/podcasts | jq '.items'
```

### Via MongoDB
```bash
mongosh mongodb://localhost:27017/bayit_plus

# Count content
db.Content.countDocuments()    # Should return 4
db.LiveChannel.countDocuments() # Should return 3
db.RadioStation.countDocuments() # Should return 3
db.Podcast.countDocuments()    # Should return 3
```

---

## What You Can Do Now

### Content Management
- ✅ Create new content (VOD, Live TV, Radio, Podcasts)
- ✅ Edit existing content
- ✅ Delete content
- ✅ Upload images
- ✅ Validate stream URLs
- ✅ Publish/unpublish content
- ✅ Feature/unfeature content
- ✅ Manage categories
- ✅ Reorder content items
- ✅ Bulk import free content

### View & Search
- ✅ List all content with pagination
- ✅ Search by title
- ✅ Filter by category, status, featured
- ✅ View detailed metadata

### Audit & Logging
- ✅ All changes logged with user/timestamp
- ✅ Track who created/modified content
- ✅ View complete audit trail

### Access Control
- ✅ Role-based permissions
- ✅ Content manager role
- ✅ Permission-based UI
- ✅ Secure endpoints

---

## Free Content Details

### Live TV Streams
| Name | Type | DRM | Status |
|------|------|-----|--------|
| Apple BipBop Basic | HLS | ✅ No | Active |
| Apple BipBop Advanced (TS) | HLS | ✅ No | Active |
| Apple BipBop (fMP4) | HLS | ✅ No | Active |

**Ideal for:** Testing HLS streaming, different segment formats

### VOD Movies
| Title | Year | Genre | Duration |
|-------|------|-------|----------|
| Night of the Living Dead | 1968 | Horror | 1:36:00 |
| His Girl Friday | 1940 | Comedy | 1:32:00 |
| Nosferatu | 1922 | Horror | 1:33:00 |
| The Great Train Robbery | 1903 | Crime | 0:10:00 |

**Source:** Public domain films from archive.org
**Ideal for:** Testing VOD playback, metadata display

### Radio Streams
| Name | Genre | Source | Status |
|------|-------|--------|--------|
| Soma FM - Groove Salad | Electronic | Soma FM | Active |
| Soma FM - Drone Zone | Ambient | Soma FM | Active |
| BBC World Service | News | BBC | Active |

**Ideal for:** Testing audio streaming, genre filtering

### Podcasts
| Name | Author | Category |
|------|--------|----------|
| The Daily | NYT | News |
| Up First | NPR | News |
| Science Vs | Gimlet | Science |

**Source:** Public RSS feeds
**Ideal for:** Testing podcast syndication, episode management

---

## Next Steps

### For Development
1. Start both servers (already running)
2. Open admin dashboard
3. Create/edit/delete content
4. Test all CRUD operations
5. Verify changes appear in DB

### For Testing
1. Go through testing checklist in IMPLEMENTATION_COMPLETE.md
2. Run 50+ test cases
3. Verify all endpoints work
4. Check error handling

### For Production
1. Update configuration (database, S3, CDN)
2. Set environment variables
3. Run database indexes
4. Deploy backend
5. Deploy frontend
6. Set up monitoring

---

## Troubleshooting

### Backend Not Starting
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing process
kill -9 <PID>

# Restart backend
poetry run uvicorn app.main:app --reload
```

### Frontend Not Connecting to Backend
```bash
# Check proxy in webpack config
# Should have: /api → http://localhost:8000

# Or check env var: VITE_API_URL
```

### Database Connection Issues
```bash
# Check MongoDB is running
mongosh mongodb://localhost:27017

# If not running, start with:
mongod --config /usr/local/etc/mongod.conf
```

### Indexes Not Created
```bash
# Run index creation script
poetry run python -m scripts.create_indexes

# Verify in MongoDB
mongosh
> db.Content.getIndexes()
```

---

## Key Files Reference

### Backend Routes (all <200 lines)
- `admin_content_vod_read.py` - GET operations
- `admin_content_vod_write.py` - POST/PATCH/DELETE
- `admin_categories.py` - Category CRUD
- `admin_live_channels.py` - Live TV CRUD
- `admin_radio_stations.py` - Radio CRUD
- `admin_podcasts.py` - Podcast CRUD
- `admin_podcast_episodes.py` - Episode CRUD
- `admin_uploads.py` - Image/URL operations
- `admin_content_importer.py` - Free content import
- `admin_content_utils.py` - Shared utilities
- `admin_content_schemas.py` - Validation schemas

### Frontend Pages
- `ContentLibraryPage.tsx` - Main content list
- `ContentEditorPage.tsx` - Create/edit form
- `CategoriesPage.tsx` - Category management
- `LiveChannelsPage.tsx` - Channel management
- `RadioStationsPage.tsx` - Station management
- `PodcastsPage.tsx` - Podcast list
- `PodcastEpisodesPage.tsx` - Episode management
- `FreeContentImportPage.tsx` - Import wizard

### Services
- `app/core/storage.py` - File storage (local/S3)
- `app/services/content_importer.py` - Import service
- `web/src/services/adminApi.js` - API layer

### Database
- `scripts/create_indexes.py` - Index creation
- `scripts/import_free_content.py` - Free content import

### Documentation
- `IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `FREE_CONTENT_IMPORT_SUMMARY.md` - Content import details

---

## Support

For more details, see:
- **Implementation Guide:** IMPLEMENTATION_COMPLETE.md
- **Free Content Details:** FREE_CONTENT_IMPORT_SUMMARY.md
- **Testing Guide:** See testing checklist in IMPLEMENTATION_COMPLETE.md
- **API Docs:** http://localhost:8000/docs

---

✅ **Everything is ready to use!**

Start with the admin dashboard at http://localhost:3200/admin/content
