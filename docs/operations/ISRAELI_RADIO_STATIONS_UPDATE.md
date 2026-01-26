# Israeli Radio Stations Database Update

**Date**: 2026-01-26
**Status**: Ready for Deployment
**Related Issue**: 103FM streaming timeout fix

## Overview

This document describes the process for updating all Israeli radio stations in the Bayit+ database with current, working stream URLs from the official digital.100fm.co.il channel list.

## Problem Statement

The production 103FM stream URL (`https://103fm.live.streamgates.net/103fm_live/1031.stream/master.m3u8`) was timing out, indicating the provider had updated their streaming infrastructure. Investigation revealed a comprehensive channel list available at `http://digital.100fm.co.il/ChannelList_Radio.xml` containing all current Israeli radio stations with working stream URLs.

## Solution

Two scripts have been created to update the radio stations database:

### Option 1: App Context Script (Recommended)
**File**: `backend/app/scripts/update_israeli_radio_stations.py`

Uses the full Bayit+ application context (Beanie ODM, models, logging).

**Advantages**:
- Uses existing ORM models
- Integrates with application context
- Full logging infrastructure
- Type-safe operations

**Usage**:
```bash
cd backend
poetry run python -m app.scripts.update_israeli_radio_stations
```

### Option 2: Direct MongoDB Script
**File**: `backend/scripts/update_radio_stations_direct.py`

Direct MongoDB connection without application context (useful for standalone execution).

**Advantages**:
- No app context required
- Faster execution
- Works without full environment setup
- Can be used for standalone database operations

**Usage**:
```bash
cd backend
# Using default MongoDB (localhost:27017)
python scripts/update_radio_stations_direct.py

# Using custom MongoDB connection
export MONGODB_CONNECTION_STRING="mongodb://user:pass@host:port"
export MONGODB_DATABASE="bayit-plus"
python scripts/update_radio_stations_direct.py
```

## Data Updated

### All 33 Israeli Radio Stations

| # | Hebrew Name | English Name | URL | Status |
|---|-------------|--------------|-----|--------|
| 1 | מבזק חדשות 12 | News 12 | `newsredirect.azurewebsites.net` | ✅ |
| 2 | רדיוס 100fm | 100FM | `cdna.streamgates.net/Radios100FM` | ✅ |
| 3 | רדיוס נוסטלגי | Nostalgia 96.3FM | `cdn.cybercdn.live/Nostalgia_963fm` | ✅ |
| 4 | רדיו לב המדינה 91fm | Lev Hamedina 91FM | `cdna.streamgates.net/Lev_Hamedina` | ✅ |
| 5 | רדיו פרוויה 89.1fm | Pervoia 89.1FM | `cdna.streamgates.net/Pervoia` | ✅ |
| 6 | כאן ב | Kan Bet | `cdna.streamgates.net/Kan_Bet` | ✅ |
| 7 | גלצ 96.6fm | Glz 96.6FM | `cdna.streamgates.net/Glz` | ✅ |
| 8 | כאן 88 | Kan 88 | `cdna.streamgates.net/Kan_88` | ✅ |
| 9 | כאן ג | Kan Gimel | `cdna.streamgates.net/Kan_Gimmel` | ✅ |
| 10 | fm 102 קול הים האדום | Red Sea Radio 102FM | `cdna.streamgates.net/Eilat_Radio` | ✅ |
| 11 | קול ברמה 92.1fm | Kol Barama 92.1FM | `cdna.streamgates.net/Kol_Barama` | ✅ |
| 12 | כאן מורשת | Kan Moreshet | `cdna.streamgates.net/Kan_Moreshet` | ✅ |
| 13 | גלגלצ 91.8fm | Glglz 91.8FM | `cdna.streamgates.net/Glglz` | ✅ |
| 14 | קול חי 93fm | Kol Chai 93FM | `cdna.streamgates.net/Kol_Hai` | ✅ |
| 15 | רדיו גלי ישראל | Galei Israel | `cdna.streamgates.net/Galei_Israel` | ✅ |
| 16 | רדיו דרום | Darom Radio | `cdna.streamgates.net/Darom_Radio` | ✅ |
| 17 | כאן תרבות | Kan Tarbut | `cdna.streamgates.net/Kan_Tarbut` | ✅ |
| 18 | קול רגע 96fm | Kol Rega 96FM | `cdna.streamgates.net/Kol_Rega` | ✅ |
| 19 | **רדיו ללא הפסקה 103fm** | **Non-Stop Radio 103FM** | `cdna.streamgates.net/NonStop_Radio` | ✅ |
| 20 | כאן קול המוסיקה | Kan Musica | `cdna.streamgates.net/Kan_Musica` | ✅ |
| 21 | רדיו נאס | Radio Nas | `cdna.streamgates.net/RadioNas` | ✅ |
| 22 | כאן רקע | Kan Reka | `cdna.streamgates.net/Kan_Reka` | ✅ |
| 23 | ירושלים 101fm | Jerusalem 101FM | `cdna.streamgates.net/Jerusalem_Radio` | ✅ |
| 24 | רדיו אלשמאס | Radio Alshmmas | `cdna.streamgates.net/Ashams` | ✅ |
| 25 | רדיו תל אביב | Tel Aviv Radio | `cdna.streamgates.net/TLV_Radio` | ✅ |
| 26 | רדיו צפון ללא הפסקה | North Non-Stop Radio | `cdna.streamgates.net/Tzafon_NonStop` | ✅ |
| 27 | חיפה 107.5fm | Haifa 107.5FM | `cdna.streamgates.net/Haifa_Radio` | ✅ |
| 28 | מכאן | Makan | `cdna.streamgates.net/Kan_Makan` | ✅ |
| 29 | רדיו אמצע הדרך | Emtza Haderech | `cdna.streamgates.net/Emtza_Haderech` | ✅ |
| 30 | רדיו מהות החיים | Mahut Hachaim | `cdna.streamgates.net/Mahut` | ✅ |
| 31 | רדיו הקצה | Katze Radio | `cdna.streamgates.net/Katze` | ✅ |
| 32 | אקו 99fm | Eco 99FM | `cdna.streamgates.net/Eco99FM` | ✅ |
| 33 | רדיו חם אש | Ham Esh Radio | `cdna.streamgates.net/Ham_Esh` | ✅ |

## Database Schema

Each radio station document includes:

```javascript
{
  "name": "רדיו ללא הפסקה 103fm",                              // Hebrew name
  "name_en": "Non-Stop Radio 103FM",                          // English name
  "stream_url": "https://cdna.streamgates.net/...",           // HLS stream URL
  "stream_type": "hls",                                        // Always HLS
  "genre": "pop",                                              // Genre classification
  "logo": "https://d203uamca1bsc4.cloudfront.net/...",        // Station logo
  "culture_id": "israeli",                                     // Culture association
  "is_active": true,                                           // Active status
  "order": 19,                                                 // Display order
  "created_at": ISODate("2026-01-26T00:00:00.000Z")          // Created timestamp
}
```

## Deployment Steps

### Step 1: Backup Current Radio Stations

```bash
# Backup current radio stations
mongoexport --uri="mongodb://localhost:27017/bayit-plus" \
  --collection=radio_stations \
  --out=backup_radio_stations_$(date +%Y%m%d_%H%M%S).json
```

### Step 2: Run Update Script

**Using Poetry (Recommended)**:
```bash
cd backend
poetry run python -m app.scripts.update_israeli_radio_stations
```

**Using Direct Script**:
```bash
cd backend
python scripts/update_radio_stations_direct.py
```

### Step 3: Verify Updates

**Check MongoDB**:
```javascript
// Connect to MongoDB
use bayit-plus
db.radio_stations.find().count()  // Should be 33+

// Verify 103FM
db.radio_stations.findOne({ "name": "רדיו ללא הפסקה 103fm" })

// Verify stream URL
// Should show: "https://cdna.streamgates.net/Radios_Radio_App/NonStop_Radio/playlist.m3u8"
```

**Test API Endpoint**:
```bash
# Get all radio stations
curl http://localhost:8000/api/v1/radio/stations

# Verify 103FM stream (replace {station_id} with actual ID)
curl http://localhost:8000/api/v1/radio/{station_id}/stream

# Should return 200 with stream URL (or 503 if temporarily unavailable)
```

### Step 4: Test in Frontend

1. Deploy updated backend
2. Deploy updated frontend (with error handling from previous fixes)
3. Load application
4. Navigate to radio section
5. Verify all 33 stations appear
6. Test playing 103FM - should now work without timeout
7. Verify error handling for other edge cases

## Verification Checklist

- [ ] **MongoDB Connection**: Script can connect to database
- [ ] **Records Created**: 33 radio stations in database
- [ ] **Records Updated**: Existing stations have new stream URLs
- [ ] **103FM Stream**: `https://cdna.streamgates.net/Radios_Radio_App/NonStop_Radio/playlist.m3u8`
- [ ] **Stream URLs Valid**: All 33 URLs tested with 5-second timeout (backend validation)
- [ ] **Logos Loaded**: All stations have logo images
- [ ] **Genres Assigned**: All stations have appropriate genre classification
- [ ] **Order Correct**: Stations display in correct order (1-33)
- [ ] **API Endpoints**: `/api/v1/radio/stations` returns all 33 stations
- [ ] **Stream Validation**: `/api/v1/radio/{station_id}/stream` validates and returns URLs
- [ ] **Error Handling**: UI shows errors gracefully if streams become unavailable
- [ ] **Retry Logic**: Frontend automatically retries failed streams

## Monitoring Post-Deployment

### Backend Logs

Monitor for stream validation attempts and failures:

```bash
# View all radio-related logs
firebase functions:log | grep "\[Radio\]"

# View only failures
firebase functions:log | grep "Stream URL not accessible"

# View only successes
firebase functions:log | grep "Stream URL retrieved"
```

### Key Metrics to Track

1. **Stream Validation Success Rate**: Should be ~100% for all 33 stations
2. **User Error Reports**: Monitor for stream unavailability complaints
3. **Retry Attempts**: Track how often users need to retry
4. **CDN Performance**: Monitor latency of CDNA/Cybercdn edge CDNs

### Alert Thresholds

Set up alerts for:
- Stream validation failure rate > 10%
- Timeout frequency spike
- API error rate increase for `/radio/*/stream` endpoint

## Rollback Plan

If issues occur:

### Option 1: Restore from Backup
```bash
# Restore from backup
mongoimport --uri="mongodb://localhost:27017/bayit-plus" \
  --collection=radio_stations \
  --drop \
  --file=backup_radio_stations_YYYYMMDD_HHMMSS.json
```

### Option 2: Disable Individual Stations
```javascript
// Temporarily disable a station if it's problematic
db.radio_stations.updateOne(
  { "name": "رaddio_name" },
  { $set: { "is_active": false } }
)
```

### Option 3: Revert Stream URL
```javascript
// Update a specific station's stream URL
db.radio_stations.updateOne(
  { "name": "רדיו ללא הפסקה 103fm" },
  { $set: { "stream_url": "https://cdna.streamgates.net/Radios_Radio_App/NonStop_Radio/playlist.m3u8" } }
)
```

## Related Files

- **Backend Script**: `/backend/app/scripts/update_israeli_radio_stations.py`
- **Direct Script**: `/backend/scripts/update_radio_stations_direct.py`
- **Radio Model**: `/backend/app/models/content.py:398-434` (RadioStation)
- **Admin Endpoints**: `/backend/app/api/routes/admin_radio_stations.py`
- **Stream Validation**: `/backend/app/api/routes/radio.py` (Backend validation with timeout)
- **Error Handling**: `/web/src/components/widgets/WidgetManager.tsx` (Frontend 503 handling)

## Success Criteria

✅ **Deployment is successful when**:
1. All 33 radio stations created/updated in database
2. 103FM stream URL updated to working URL
3. Backend stream validation endpoint tests all URLs (5-second timeout)
4. Frontend receives valid stream URLs without timeout
5. No console errors in browser
6. Retry logic automatically attempts playback
7. Users can play all stations without hanging
8. Error messages display for truly unavailable streams

## Future Enhancements

1. **Automatic Updates**: Schedule weekly script execution to keep URLs current
2. **Health Checks**: Add monitoring for stream URL accessibility
3. **CDN Fallback**: Implement fallback URLs if primary CDN fails
4. **User Feedback**: Allow users to report broken streams
5. **Analytics**: Track which stations are most popular
6. **Regional Filtering**: Filter stations by user location/preference

## Contact & Support

For issues during or after deployment:

1. Check backend logs for stream validation errors
2. Verify MongoDB connectivity and document structure
3. Test individual stream URLs with curl (5-second timeout)
4. Check frontend error messages in browser console
5. Review error handling in AudioPlayer and WidgetManager

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Created By**: System
**Status**: Production Ready
