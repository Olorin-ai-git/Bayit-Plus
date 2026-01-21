# Content API

The Content API provides access to the Bayit+ media catalog including movies, series, channels, and podcasts. Use these endpoints to browse, search, and retrieve content details.

## List Content

Retrieve paginated content listings:

```
GET /v1/content
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by content type (movie, series, channel, podcast) |
| `category` | string | Filter by category slug |
| `rating` | string | Filter by age rating |
| `q` | string | Search query |
| `page` | integer | Page number |
| `per_page` | integer | Items per page (max 100) |

**Example Request**:

```bash
curl -X GET "https://api.bayit.plus/v1/content?type=movie&category=drama&per_page=20" \
  -H "Authorization: Bearer {access_token}"
```

## Get Content Details

Retrieve full details for a specific content item:

```
GET /v1/content/{content_id}
```

**Response**:

```json
{
  "data": {
    "id": "cnt_abc123",
    "type": "movie",
    "title": "Example Movie",
    "description": "A compelling story about...",
    "rating": "PG-13",
    "runtime_minutes": 120,
    "release_year": 2024,
    "categories": ["drama", "thriller"],
    "cast": [
      {"name": "Actor Name", "role": "Character"}
    ],
    "images": {
      "poster": "https://cdn.bayit.plus/...",
      "backdrop": "https://cdn.bayit.plus/..."
    }
  }
}
```

## Series and Episodes

List episodes for a series:

```
GET /v1/content/{series_id}/seasons/{season_number}/episodes
```

Get individual episode details:

```
GET /v1/content/{series_id}/episodes/{episode_id}
```

## Live Channels

Get current schedule for a channel:

```
GET /v1/content/channels/{channel_id}/schedule
  ?date=2024-01-15
```

## Podcasts

List podcast episodes:

```
GET /v1/content/podcasts/{podcast_id}/episodes
  ?page=1&per_page=50
```

## Content Categories

List all available categories:

```
GET /v1/categories
```

Get content within a category:

```
GET /v1/categories/{category_slug}/content
```

## Search

Full-text search across the catalog:

```
GET /v1/search?q=search+term&type=movie,series
```

Search results include relevance scoring and highlight matches in titles and descriptions.
