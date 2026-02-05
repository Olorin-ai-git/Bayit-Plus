# Location Content Seeding - Development Guide

## Problem Statement

The "Israelis in Your City" and "Israeli Businesses" sections on the homepage were showing empty because:
1. **Exa.ai API credits exceeded** (402 Payment Required error)
2. No fallback mechanism for development
3. Cache TTL was only 1 hour (expensive API usage)

## Solution Implemented

### 1. Seed Data for Local Development

**Script**: `backend/scripts/seed_location_content.py`

Populates realistic Israeli businesses and community events for major US cities.

**Usage**:
```bash
# Seed specific city
cd backend
poetry run python scripts/seed_location_content.py --city "New York" --state "NY"

# Seed all major cities
poetry run python scripts/seed_location_content.py --all-cities
```

**What it seeds**:
- ✅ **Community Events**: 10 upcoming Israeli community events (Yom Ha'atzmaut, tech meetups, film festivals, etc.)
- ✅ **News Articles**: 3 Israeli-related news articles (seed data fallback in code)
- ✅ **Businesses**: 7 Israeli businesses (restaurants, tech companies, synagogues, community centers)

**Seeded Cities**:
- New York, NY
- Los Angeles, CA
- Miami, FL
- Boston, MA
- San Francisco, CA
- Chicago, IL
- Philadelphia, PA
- Washington, DC
- Atlanta, GA
- Seattle, WA

### 2. 3-Day Caching in Production

**File**: `backend/app/services/location_content_service.py`

**Before**:
```python
_cache_ttl = timedelta(hours=1)  # 1 hour cache
```

**After**:
```python
# 3 days in production (reduce API costs), 1 hour in development
_cache_ttl = timedelta(days=3) if settings.APP_ENV == "production" else timedelta(hours=1)
```

**Benefits**:
- ✅ Reduces Exa.ai API calls by 72x (3 days vs 1 hour)
- ✅ Lower API costs in production
- ✅ Faster response times (serve from cache)
- ✅ Automatic rehydration after 3 days

### 3. Seed Data Fallback in Development

**File**: `backend/app/services/location_content_service.py`

When Exa API fails (no credits, timeout, error) in development:
- ✅ Automatically returns seed data instead of empty results
- ✅ Logs helpful message about running seed script
- ✅ **Production still uses real Exa data (no mocks in production!)**

**Flow**:
```
Development:
  Exa API fails → Seed data returned → Page shows content

Production:
  Exa API fails → Empty results → Page shows nothing (correct behavior)
  Exa API succeeds → Cache for 3 days → Serve from cache
```

## Testing the Implementation

### 1. Seed Data (Already Run)

```bash
cd backend
poetry run python scripts/seed_location_content.py --city "New York" --state "NY"

# Output:
# ============================================================
# Seeding location content for New York, NY
# ============================================================
#
# 🎉 Seeding community events for New York, NY...
#    ✓ Created 10 community events
#
# 🏢 Seeding Israeli businesses for New York, NY...
#    ✓ Prepared 7 business listings
#
# ============================================================
# ✅ Seeding complete for New York, NY
#    Events: 10
#    Businesses: 7
# ============================================================
```

### 2. Refresh the Web App

```bash
# The web app should now show:
# - "Israelis in New York" section with 3 news articles (seed data)
# - Community events section with 10 upcoming events
# - Israeli businesses section (on second load after cache populates)
```

### 3. Verify API Response

```bash
# Test the API directly
curl "http://localhost:8000/api/v1/content/israelis-in-city?city=New%20York&state=NY&limit_per_type=5" | jq

# Should return:
# {
#   "location": {...},
#   "content": {
#     "news_articles": [3 articles with seed data],
#     "community_events": [10 seeded events]
#   },
#   "total_items": 13,
#   "coverage": {
#     "has_content": true
#   }
# }
```

## Production Deployment

### Before Deploying to Production

1. **Top up Exa.ai credits** at https://dashboard.exa.ai
2. **Verify APP_ENV** is set to "production" in production environment
3. **Clear development cache** if any (cache is separate per environment)

### Production Behavior

- ✅ Uses real Exa.ai API (no seed data)
- ✅ Caches results for **3 days** (not 1 hour)
- ✅ Automatically rehydrates after 3 days
- ✅ No mocks/stubs in production code

## Environment Variables

No new environment variables needed. The system uses existing:
- `APP_ENV` - "development" or "production"
- `EXA_API_KEY` - Already configured
- `MONGODB_URI` - Already configured

## File Changes

### New Files Created:
1. `backend/scripts/seed_location_content.py` - Seed data script
2. `docs/development/LOCATION_CONTENT_SEEDING.md` - This document

### Modified Files:
1. `backend/app/services/location_content_service.py`
   - 3-day cache TTL in production
   - Seed data fallback in development
   - SEED_NEWS_ARTICLES constant

2. `web/src/config/geolocationConfig.ts`
   - Added DEFAULT_LOCATION (NYC) for users outside known timezones

3. `web/src/hooks/useUserGeolocation.ts`
   - Falls back to NYC if timezone not in fallback list
   - Better error logging

## Maintenance

### Adding More Seed Data

Edit `backend/scripts/seed_location_content.py`:

```python
ISRAELI_BUSINESSES = {
    "New York": [
        # Add more businesses here
        {
            "name": "New Israeli Restaurant",
            "type": "restaurant",
            "description": "Description here",
            "address": "123 Main St, New York, NY",
        },
    ],
}

SEED_NEWS_ARTICLES = {
    "New York": [
        # Add more articles in location_content_service.py
    ],
}
```

### Monitoring Cache Performance

Check backend logs for:
- `Cache hit for {city}, {state}` - Serving from cache
- `Background scraping completed` - Exa API called
- `Using seed data for development` - Fallback triggered

## Troubleshooting

### Issue: Sections still empty after seeding

**Solution**:
1. Clear browser localStorage: `localStorage.clear()`
2. Hard refresh (Cmd+Shift+R)
3. Wait 10 seconds for background scraping to complete
4. Refresh again

### Issue: Exa API still returning no results

**Solution**:
- Development: Seed data should be used automatically
- Production: Top up Exa.ai credits at dashboard.exa.ai

### Issue: Events not showing up

**Solution**:
```bash
# Verify events were seeded
cd backend
poetry run python << 'EOF'
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import asyncio

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    count = await db.community_events.count_documents({"_seed_data": True})
    print(f"Seeded events in database: {count}")
    client.close()

asyncio.run(check())
EOF

# Expected output: "Seeded events in database: 10" (or more)
```

## Next Steps

1. **✅ DONE**: Seed data created and loaded
2. **✅ DONE**: 3-day caching implemented
3. **✅ DONE**: Seed fallback in development
4. **TODO**: Top up Exa.ai credits for production
5. **TODO**: Deploy to production with production environment variables

## Related Documentation

- [Secrets Management](../deployment/SECRETS_MANAGEMENT.md)
- [Backend API Documentation](../api/)
- [Geolocation Configuration](../../web/src/config/geolocationConfig.ts)
