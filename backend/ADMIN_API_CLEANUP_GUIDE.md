# Admin API - Database Cleanup Guide

## Overview

The Bayit+ backend now includes admin API endpoints for database maintenance tasks, including cleanup of duplicate culture cities.

## Endpoints

### Base URL
- Development: `http://localhost:8000/api/v1/admin`
- Production: `https://api.bayit.tv/api/v1/admin`

All endpoints require admin authentication.

---

## Culture Cities Cleanup

### 1. Verify Data Integrity

**GET** `/database/verify/culture-cities`

Check if there are any duplicate entries without making changes.

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/admin/database/verify/culture-cities" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "has_duplicates": true,
  "total_cities": 12,
  "unique_keys": 10,
  "duplicate_count": 2,
  "timestamp": "2026-01-28T12:00:00Z"
}
```

---

### 2. Find Duplicate Entries

**GET** `/database/duplicates/culture-cities`

Get detailed information about all duplicate entries.

**Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/admin/database/duplicates/culture-cities" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "total_duplicates": 2,
  "duplicates": {
    "israeli:jerusalem": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Jerusalem",
        "culture_id": "israeli",
        "city_id": "jerusalem",
        "created_at": "2026-01-01T00:00:00Z",
        "is_active": true,
        "is_featured": true
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "Jerusalem",
        "culture_id": "israeli",
        "city_id": "jerusalem",
        "created_at": "2026-01-15T00:00:00Z",
        "is_active": true,
        "is_featured": true
      }
    ],
    "israeli:tel-aviv": [
      {
        "id": "507f1f77bcf86cd799439013",
        "name": "Tel Aviv",
        "culture_id": "israeli",
        "city_id": "tel-aviv",
        "created_at": "2026-01-01T00:00:00Z",
        "is_active": true,
        "is_featured": true
      },
      {
        "id": "507f1f77bcf86cd799439014",
        "name": "Tel Aviv",
        "culture_id": "israeli",
        "city_id": "tel-aviv",
        "created_at": "2026-01-15T00:00:00Z",
        "is_active": true,
        "is_featured": true
      }
    ]
  }
}
```

---

### 3. Cleanup Duplicates (Dry Run)

**POST** `/database/cleanup/culture-cities?dry_run=true`

Simulate cleanup without making any changes to the database.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/admin/database/cleanup/culture-cities?dry_run=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "status": "dry_run",
  "message": "Dry run complete - no changes made",
  "total_duplicates_found": 2,
  "total_documents_removed": 2,
  "dry_run": true,
  "timestamp": "2026-01-28T12:00:00Z",
  "details": [
    {
      "key": "israeli:jerusalem",
      "culture_id": "israeli",
      "city_id": "jerusalem",
      "total_duplicates": 2,
      "kept": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Jerusalem",
        "created_at": "2026-01-01T00:00:00Z"
      },
      "removed": [
        {
          "id": "507f1f77bcf86cd799439012",
          "name": "Jerusalem",
          "created_at": "2026-01-15T00:00:00Z"
        }
      ]
    },
    {
      "key": "israeli:tel-aviv",
      "culture_id": "israeli",
      "city_id": "tel-aviv",
      "total_duplicates": 2,
      "kept": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Tel Aviv",
        "created_at": "2026-01-01T00:00:00Z"
      },
      "removed": [
        {
          "id": "507f1f77bcf86cd799439014",
          "name": "Tel Aviv",
          "created_at": "2026-01-15T00:00:00Z"
        }
      ]
    }
  ]
}
```

---

### 4. Cleanup Duplicates (Execute)

**POST** `/database/cleanup/culture-cities?dry_run=false`

⚠️ **CAUTION:** This will permanently delete duplicate entries from the database!

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/admin/database/cleanup/culture-cities?dry_run=false" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "status": "success",
  "message": "All duplicates successfully removed",
  "total_duplicates_found": 2,
  "total_documents_removed": 2,
  "dry_run": false,
  "timestamp": "2026-01-28T12:00:00Z",
  "details": [
    {
      "key": "israeli:jerusalem",
      "culture_id": "israeli",
      "city_id": "jerusalem",
      "total_duplicates": 2,
      "kept": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Jerusalem",
        "created_at": "2026-01-01T00:00:00Z"
      },
      "removed": [
        {
          "id": "507f1f77bcf86cd799439012",
          "name": "Jerusalem",
          "created_at": "2026-01-15T00:00:00Z"
        }
      ]
    }
  ],
  "verification": {
    "has_duplicates": false,
    "total_cities": 10,
    "unique_keys": 10,
    "duplicate_count": 0,
    "timestamp": "2026-01-28T12:00:00Z"
  }
}
```

---

## Recommended Workflow

1. **Verify** - Check if duplicates exist
   ```bash
   GET /database/verify/culture-cities
   ```

2. **Inspect** - View detailed duplicate information
   ```bash
   GET /database/duplicates/culture-cities
   ```

3. **Simulate** - Run dry run to see what would be removed
   ```bash
   POST /database/cleanup/culture-cities?dry_run=true
   ```

4. **Execute** - Actually remove duplicates (if dry run looks correct)
   ```bash
   POST /database/cleanup/culture-cities?dry_run=false
   ```

5. **Verify** - Confirm no duplicates remain
   ```bash
   GET /database/verify/culture-cities
   ```

---

## Authentication

All endpoints require admin authentication. Include your admin JWT token in the Authorization header:

```bash
Authorization: Bearer YOUR_ADMIN_TOKEN
```

To get an admin token:
1. Log in as admin user via `/api/v1/auth/login`
2. Use the returned `access_token` in subsequent requests

---

## Error Responses

**401 Unauthorized** - Missing or invalid authentication token
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden** - User is not an admin
```json
{
  "detail": "Admin access required"
}
```

**500 Internal Server Error** - Database operation failed
```json
{
  "detail": "Cleanup failed: <error details>"
}
```

---

## API Documentation

Full interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Navigate to the "admin-database" section to see and test these endpoints.
