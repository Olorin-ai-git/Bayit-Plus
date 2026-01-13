# EPG Data Configuration Guide

## Current Status

The EPG system is **fully implemented** with real data ingestion infrastructure, but external sources are currently blocked due to geographic restrictions.

### What's Implemented:
- ✅ Complete EPG database models
- ✅ EPG REST API endpoints
- ✅ Real-time EPG data ingestion service
- ✅ XMLTV parser
- ✅ Alternative source fallback system
- ✅ Automatic cleanup of old data

### Current Limitations:
- ❌ Kan.org.il API returns 403 (requires Israeli IP or authentication)
- ❌ Community XMLTV feeds unavailable or outdated
- ⚠️  Demo data currently in database for testing

## Getting Real EPG Data

### Option 1: Use Israeli IP/VPN
The Kan.org.il API works from Israeli IP addresses:

```bash
# With Israeli VPN active:
poetry run python scripts/ingest_epg.py
```

### Option 2: Configure Custom EPG Source

Edit `/backend/app/core/config.py` and add:

```python
# EPG Configuration
EPG_SOURCE_URL: str = "https://your-epg-source.com/api"
EPG_API_KEY: Optional[str] = None  # If source requires authentication
```

Then update `.env`:

```bash
EPG_SOURCE_URL=https://your-xmltv-feed.com/israel.xml
EPG_API_KEY=your_api_key_here
```

### Option 3: Use Paid EPG Services

Several commercial providers offer Israeli EPG data:

1. **EPG Editor** - https://www.epgeditor.com/channel-list/israel
   - Accurate quality EPG data for Israeli channels
   - Requires subscription

2. **TV Media API** - https://developer.tvmedia.ca/
   - Professional TV listing API
   - Requires API key

3. **Metaprofile EPG** - https://metaprofile.tv/epg-data-xml/
   - XMLTV format EPG data
   - Subscription required

### Option 4: Community XMLTV Feeds

When available, configure XMLTV feed URLs in the ingestion service:

```python
# In app/services/epg_ingestion_service.py
xmltv_urls = [
    "https://your-xmltv-source.com/israel.xml",
    "https://backup-source.com/kan11.xml",
]
```

## EPG Data Format

The system supports:

### XMLTV Format (Standard)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="YourSource">
  <channel id="kan11.il">
    <display-name>כאן 11</display-name>
  </channel>
  <programme start="20260113140000 +0200" stop="20260113150000 +0200" channel="kan11.il">
    <title lang="he">חדשות</title>
    <desc lang="he">מהדורת חדשות מרכזית</desc>
    <category lang="he">News</category>
  </programme>
</tv>
```

### JSON API Format (Custom)
```json
{
  "programs": [
    {
      "title": "חדשות הערב",
      "description": "מהדורת חדשות",
      "start_time": "2026-01-13T19:00:00Z",
      "end_time": "2026-01-13T19:30:00Z",
      "category": "News",
      "cast": ["אנכור 1", "אנכור 2"],
      "genres": ["News"],
      "rating": "General"
    }
  ]
}
```

## Running EPG Ingestion

### Manual Ingestion
```bash
cd backend
poetry run python scripts/ingest_epg.py
```

### Automated Schedule (Recommended)
Set up a cron job to run every 6 hours:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 00:00, 06:00, 12:00, 18:00)
0 */6 * * * cd /path/to/backend && poetry run python scripts/ingest_epg.py >> /var/log/epg_ingest.log 2>&1
```

### Using Cloud Scheduler (Google Cloud)
```yaml
# cloud-scheduler.yaml
- name: epg-ingestion
  schedule: "0 */6 * * *"  # Every 6 hours
  timeZone: "Asia/Jerusalem"
  httpTarget:
    uri: "https://your-api.com/api/v1/admin/ingest-epg"
    httpMethod: POST
    headers:
      Authorization: "Bearer YOUR_ADMIN_TOKEN"
```

## Monitoring EPG Data

### Check EPG Status
```bash
poetry run python -c "
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.content import EPGEntry
from app.core.config import settings
from datetime import datetime

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[EPGEntry])

    total = await EPGEntry.count()
    earliest = await EPGEntry.find_one(sort=[('start_time', 1)])
    latest = await EPGEntry.find_one(sort=[('start_time', -1)])

    print(f'Total EPG entries: {total}')
    if earliest and latest:
        print(f'Date range: {earliest.start_time} to {latest.start_time}')

    client.close()

asyncio.run(check())
"
```

### API Endpoints
```bash
# Get current EPG data
curl http://localhost:8000/api/v1/epg?start_time=2026-01-13T10:00:00Z&end_time=2026-01-13T16:00:00Z

# Get channel schedule
curl http://localhost:8000/api/v1/epg/CHANNEL_ID/schedule

# Get current program
curl http://localhost:8000/api/v1/epg/CHANNEL_ID/current
```

## Troubleshooting

### No Programs Returned
```bash
# Check if EPG entries exist in database
poetry run python -c "from app.models.content import EPGEntry; import asyncio; from motor.motor_asyncio import AsyncIOMotorClient; from beanie import init_beanie; from app.core.config import settings; asyncio.run((lambda: (client := AsyncIOMotorClient(settings.MONGODB_URL), init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[EPGEntry]), print(asyncio.run(EPGEntry.count())), client.close()))())"

# Check time range of EPG data matches your query
# EPG API uses UTC times, frontend converts to user timezone
```

### 403 Errors from Sources
- Use VPN with Israeli IP address
- Configure alternative EPG source
- Use paid EPG service with API key

### Outdated Data
```bash
# Run cleanup to remove old entries
poetry run python scripts/ingest_epg.py

# Or manually:
poetry run python -c "
import asyncio
from datetime import datetime, timedelta
from app.services.epg_ingestion_service import epg_ingestion_service

asyncio.run(epg_ingestion_service.cleanup_old_epg(days_to_keep=7))
"
```

## Contributing EPG Sources

If you have access to reliable Israeli EPG sources, please contribute by:

1. Adding source URLs to `epg_ingestion_service.py`
2. Implementing parser for the source format
3. Testing with real data
4. Submitting PR with documentation

## Sources Referenced

- [Open-EPG.com](https://www.open-epg.com/app/epgguide.php) - Free EPG XML TV guides
- [EPG Editor](https://www.epgeditor.com/channel-list/israel) - Quality EPG data for Israeli channels
- [IPTV-EPG.org](https://iptv-epg.org/) - Free EPG source aggregator
- [GitHub: iptv-org/epg](https://github.com/iptv-org/epg) - Community EPG database
- [GitHub: xmltv-israel](https://github.com/deepspace221/xmltv-israel) - Israel XMLTV grabbing

## Contact

For questions about EPG configuration, open an issue in the repository.
