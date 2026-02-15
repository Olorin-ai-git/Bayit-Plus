# Continue Watching API Documentation

**Version:** 1.0
**Base URL:** `https://api.bayit.tv/api/v1`
**Authentication:** Required (Firebase JWT)

## Overview

The Continue Watching API provides endpoints for retrieving and managing a user's recently watched content with playback progress. This API powers the Continue Watching widget and web UI.

## Endpoints

### GET /user/continue-watching

Retrieves the user's continue watching list with playback progress.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Maximum number of items to return (1-50) |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "the-chosen-s2e5",
      "title": "The Chosen: S2E5 - I Saw You",
      "type": "episode",
      "cover_url": "https://image.tmdb.org/t/p/w500/chosen-s2.jpg",
      "duration": 3600,
      "position": 2340
    },
    {
      "id": "sapiens-audiobook",
      "title": "Sapiens: A Brief History of Humankind",
      "type": "audiobook",
      "cover_url": "https://cdn.bayit.tv/covers/sapiens.jpg",
      "duration": 28800,
      "position": 10080
    }
  ]
}
```

**Filtering Logic:**
- Only includes content watched in the last **30 days**
- Excludes content with **>95% progress** (considered completed)
- Excludes content watched for **<30 seconds** (accidental plays)
- Orders by **most recently watched**
- Limits to **10 items** (or specified limit)

**Error Responses:**

`401 Unauthorized`
```json
{
  "detail": "Not authenticated"
}
```

`500 Internal Server Error`
```json
{
  "detail": "Failed to fetch continue watching data"
}
```

---

### POST /user/continue-watching/{content_id}/mark-completed

Marks content as completed, removing it from the continue watching list.

**Authentication:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `content_id` | string | ID of content to mark as completed |

**Response:** `200 OK`

```json
{
  "message": "Content marked as completed"
}
```

**Behavior:**
- Sets progress to **100%**
- Sets position to **duration**
- Updates `updated_at` timestamp
- Content will no longer appear in continue watching (>95% filter)

**Error Responses:**

`404 Not Found`
```json
{
  "detail": "Progress not found"
}
```

`401 Unauthorized`
```json
{
  "detail": "Not authenticated"
}
```

---

### DELETE /user/continue-watching/{content_id}

Removes content from the continue watching list by deleting playback progress.

**Authentication:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `content_id` | string | ID of content to remove |

**Response:** `200 OK`

```json
{
  "message": "Content removed from continue watching"
}
```

**Behavior:**
- **Permanently deletes** playback progress record
- Content immediately removed from continue watching
- Cannot be undone (user must re-watch to re-add)

**Error Responses:**

`404 Not Found`
```json
{
  "detail": "Progress not found"
}
```

`401 Unauthorized`
```json
{
  "detail": "Not authenticated"
}
```

## Data Models

### ContinueWatchingItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Content ID (unique identifier) |
| `title` | string | Yes | Display title (includes series name for episodes) |
| `type` | string | Yes | Content type: `movie`, `episode`, `audiobook`, `podcast` |
| `cover_url` | string | No | Cover image URL (poster, thumbnail, or artwork) |
| `duration` | integer | Yes | Total duration in seconds |
| `position` | integer | Yes | Current playback position in seconds |

**Computed Properties:**

- **Progress:** `position / duration` (0.0 to 1.0)
- **Progress Percent:** `(position / duration) * 100` (0 to 100)
- **Time Remaining:** `duration - position` (seconds)

**Title Formatting:**

- **Episodes:** `"Series Name: S2E5 - Episode Title"`
- **Other content:** Uses title as-is

### ContinueWatchingResponse

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | List of ContinueWatchingItem objects |

## Cover URL Priority

The API selects cover images in this priority order:

1. **`content.cover_url`** - Direct URL to cover image
2. **`content.poster_path`** - TMDB poster path (prefixed with CDN)
3. **`content.artwork`** - Audiobook/podcast artwork URL
4. **`null`** - Widget/UI shows placeholder

**TMDB Poster Path:**
- Stored as: `/abc123.jpg`
- Returned as: `https://image.tmdb.org/t/p/w500/abc123.jpg`

## Database Schema

### PlaybackProgress Collection

```python
{
  "_id": ObjectId,
  "user_id": str,              # User ID
  "content_id": str,           # Content ID
  "content_type": str,         # movie | episode | audiobook | podcast
  "position": int,             # Seconds
  "duration": int,             # Seconds (cached)
  "progress": float,           # 0.0 to 1.0
  "device_id": str,            # Optional
  "platform": str,             # web | ios | android | tvos
  "created_at": datetime,      # First playback
  "updated_at": datetime,      # Last update (indexed)
}
```

**Indexes:**
```python
[("user_id", 1), ("content_id", 1)]     # Lookup
[("user_id", 1), ("updated_at", -1)]    # Continue watching query
[("updated_at", -1)]                     # Cleanup old entries
```

## Usage Examples

### Fetch Continue Watching (cURL)

```bash
curl -X GET \
  "https://api.bayit.tv/api/v1/user/continue-watching?limit=3" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Fetch Continue Watching (JavaScript)

```javascript
const response = await fetch(
  'https://api.bayit.tv/api/v1/user/continue-watching?limit=3',
  {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
console.log(data.items);
```

### Mark Content as Completed (cURL)

```bash
curl -X POST \
  "https://api.bayit.tv/api/v1/user/continue-watching/the-chosen-s2e5/mark-completed" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Remove from Continue Watching (cURL)

```bash
curl -X DELETE \
  "https://api.bayit.tv/api/v1/user/continue-watching/sapiens-audiobook" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Integration Points

### Widget Integration

The iOS Continue Watching widget calls this endpoint:

```swift
// Swift - Widget Network Service
func fetchContinueWatching() async -> [WatchingContent]? {
    let url = URL(string: "\(baseURL)/user/continue-watching")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    let response = try decoder.decode(ContinueWatchingResponse.self, from: data)

    return response.items
}
```

### React Native Integration

```typescript
import api from '@bayit/shared-services/api'

export const fetchContinueWatching = async (limit = 10) => {
  const response = await api.get('/user/continue-watching', { params: { limit } })
  return response.items
}

export const markCompleted = async (contentId: string) => {
  await api.post(`/user/continue-watching/${contentId}/mark-completed`)
}

export const removeFromContinueWatching = async (contentId: string) => {
  await api.delete(`/user/continue-watching/${contentId}`)
}
```

## Performance

### Response Time

- **Target:** <200ms (95th percentile)
- **Typical:** 50-150ms
- **Components:**
  - Database query: 20-50ms
  - Content lookup: 30-80ms
  - Response serialization: <10ms

### Caching Strategy

- **Widget:** Caches response for 30 minutes
- **Web UI:** Caches for 5 minutes
- **Mobile app:** Caches for 2 minutes

### Rate Limiting

- **Limit:** 60 requests per minute per user
- **Widget:** ~48 requests per day (every 30 min)
- **App:** Variable based on usage

## Testing

### Test Coverage

- ✅ Get continue watching success
- ✅ Get continue watching with limit
- ✅ Get continue watching empty
- ✅ Filters completed content (>95%)
- ✅ Filters old content (>30 days)
- ✅ Filters short playback (<30 sec)
- ✅ Mark completed success
- ✅ Mark completed not found
- ✅ Remove from continue watching
- ✅ Cover URL priority logic
- ✅ Unauthorized access handling

### Run Tests

```bash
cd backend
poetry run pytest tests/test_continue_watching.py -v
```

## Monitoring

### Key Metrics

- **Request rate:** Requests per minute
- **Response time:** p50, p95, p99
- **Error rate:** 4xx and 5xx errors
- **Widget usage:** Requests from widget vs app

### Alerts

- **Error rate >5%** - Page engineering
- **Response time >500ms** - Investigate database
- **No requests for 1 hour** - Check service health

## Migration Notes

### Initial Deployment

1. **Create PlaybackProgress collection** with indexes
2. **Deploy backend** with continue watching endpoints
3. **Test with Postman** before widget deployment
4. **Deploy widget** with API integration
5. **Monitor errors** for first 24 hours

### Data Migration

If migrating from existing progress tracking:

```python
# Migrate old progress records
old_progress = db.progress.find()
for item in old_progress:
    PlaybackProgress(
        user_id=item["user_id"],
        content_id=item["content_id"],
        content_type=item["type"],
        position=item["current_time"],
        duration=item["total_duration"],
        progress=item["current_time"] / item["total_duration"],
        updated_at=item["last_updated"],
    ).insert()
```

## Support

For API issues or questions:
- **Backend team:** backend@bayit.tv
- **Documentation:** https://docs.bayit.tv/api
- **Status page:** https://status.bayit.tv
