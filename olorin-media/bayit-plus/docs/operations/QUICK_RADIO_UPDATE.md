# Quick Radio Stations Update - Fast Deploy Guide

**⏱️ Time to deploy: ~5 minutes**

## One-Command Deployment

```bash
# Step 1: Backup (optional but recommended)
mongoexport --uri="mongodb://localhost:27017" \
  --db=bayit-plus \
  --collection=radio_stations \
  --out=backup_$(date +%Y%m%d_%H%M%S).json

# Step 2: Update (pick ONE method)

# METHOD A: Using Poetry (recommended if app environment available)
cd /path/to/bayit-plus/backend
poetry run python -m app.scripts.update_israeli_radio_stations

# METHOD B: Direct MongoDB (no app context needed)
cd /path/to/bayit-plus/backend
python scripts/update_radio_stations_direct.py
```

## Verify It Worked

```bash
# Check count
mongosh "mongodb://localhost:27017/bayit-plus" --eval "db.radio_stations.count()"
# Should show: 33+ stations

# Verify 103FM (the main fix)
mongosh "mongodb://localhost:27017/bayit-plus" --eval \
  'db.radio_stations.findOne({name: "רדיו ללא הפסקה 103fm"})'
# Should show stream_url: https://cdna.streamgates.net/...

# Test API
curl http://localhost:8000/api/v1/radio/stations | head -20
```

## What Gets Updated

| Item | Details |
|------|---------|
| **Total Stations** | 33 Israeli radio stations |
| **Key Fix** | 103FM from timeout URL to working CDN |
| **Stream Type** | HLS (HTTP Live Streaming) |
| **Data Fields** | name, name_en, stream_url, genre, logo, order |
| **Status** | All marked as `is_active: true` |

## If Something Goes Wrong

### Rollback
```bash
# Restore from backup
mongoimport --uri="mongodb://localhost:27017/bayit-plus" \
  --collection=radio_stations \
  --drop \
  --file=backup_YYYYMMDD_HHMMSS.json
```

### Disable Single Station
```bash
mongosh "mongodb://localhost:27017/bayit-plus"
# In shell:
db.radio_stations.updateOne(
  { name: "station_name" },
  { $set: { is_active: false } }
)
```

## Files Involved

- Script 1: `backend/app/scripts/update_israeli_radio_stations.py` (with app)
- Script 2: `backend/scripts/update_radio_stations_direct.py` (standalone)
- Full Guide: `docs/operations/ISRAELI_RADIO_STATIONS_UPDATE.md`
- Summary: `docs/implementation/RADIO_STATIONS_BULK_UPDATE_SUMMARY.md`

## Key Improvements

✅ **103FM Fixed**: Timeout URL → Working CDN stream
✅ **Complete Coverage**: All 33 Israeli stations updated
✅ **Error Handling**: Already deployed (see previous fixes)
✅ **Automatic Retry**: Frontend automatically retries failed streams
✅ **User Feedback**: Clear error messages for unavailable streams

## Next Steps After Update

1. Restart backend services (if needed)
2. Test API: `GET /api/v1/radio/stations`
3. Test playback in frontend
4. Monitor logs: `firebase functions:log | grep "[Radio]"`
5. Watch for user reports over next 48 hours

## Support

**See detailed guide**: `docs/operations/ISRAELI_RADIO_STATIONS_UPDATE.md`

All scripts are:
- ✅ Syntax validated
- ✅ Data verified (all URLs tested)
- ✅ Ready for production
- ✅ Rollback capable

---

**Last Updated**: 2026-01-26 | **Status**: Ready for Deploy
