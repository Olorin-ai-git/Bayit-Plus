# Investigation API Contracts

**Created**: 2025-01-21
**Version**: 1.0.0
<<<<<<< HEAD
**Service**: autonomous-investigation microservice

## Overview

This document defines the API contracts for the Hybrid Graph Investigation UI microservice. These contracts ensure consistent communication between the autonomous-investigation microservice and other services in the Olorin ecosystem.
=======
**Service**: structured-investigation microservice

## Overview

This document defines the API contracts for the Hybrid Graph Investigation UI microservice. These contracts ensure consistent communication between the structured-investigation microservice and other services in the Olorin ecosystem.
>>>>>>> 001-modify-analyzer-method

## Base Configuration

### API Base URL
```
Development: http://localhost:3001/api/v1
Production: https://investigations.olorin.com/api/v1
```

### Authentication
All API requests require JWT authentication:
```http
Authorization: Bearer <jwt_token>
```

### Common Headers
```http
Content-Type: application/json
X-Request-ID: <uuid>
X-Correlation-ID: <investigation_id>
```

## Investigation Management APIs

### 1. Create Investigation

<<<<<<< HEAD
Creates a new autonomous investigation.
=======
Creates a new structured investigation.
>>>>>>> 001-modify-analyzer-method

```http
POST /investigations
```

**Request Body:**
```json
{
  "entity": {
    "type": "ip|user|transaction|device|email|domain",
    "value": "string"
  },
  "time_window": {
    "start": "2025-01-21T10:00:00Z",
    "end": "2025-01-23T10:00:00Z"
  },
  "priority": "low|medium|high|critical",
  "assigned_to": ["user_id_1", "user_id_2"],
  "trigger_reason": "string",
  "configuration": {
    "domains_to_analyze": ["network", "device", "authentication"],
    "analysis_depth": "shallow|standard|deep",
    "external_intel_enabled": true,
    "auto_escalation_enabled": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "INV-123",
    "entity": {
      "type": "ip",
      "value": "95.211.35.146"
    },
    "time_window": {
      "start": "2025-01-21T10:00:00Z",
      "end": "2025-01-23T10:00:00Z",
      "duration_hours": 48
    },
    "current_phase": "initiation",
    "status": "running",
    "priority": "medium",
    "confidence": 0.0,
    "quality_score": 0.0,
    "risk_score": 0.0,
    "created_by": "user_123",
    "assigned_to": ["user_123"],
    "created_at": "2025-01-21T09:00:00Z",
    "updated_at": "2025-01-21T09:00:00Z"
  },
  "meta": {
    "timestamp": "2025-01-21T09:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 2. Get Investigation

Retrieves detailed investigation information.

```http
GET /investigations/{investigation_id}
```

**Query Parameters:**
- `include_evidence`: boolean (default: false) - Include evidence details
- `include_timeline`: boolean (default: false) - Include timeline events
- `include_graph`: boolean (default: false) - Include graph data

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "INV-123",
    "entity": {
      "type": "ip",
      "value": "95.211.35.146"
    },
    "current_phase": "analysis",
    "status": "running",
    "confidence": 0.65,
    "quality_score": 0.72,
    "risk_score": 0.85,
    "risk_progression": [
      {
        "timestamp": "2025-01-21T10:00:00Z",
        "score": 0.0,
        "source": "initialization",
        "reason": "Investigation started"
      },
      {
        "timestamp": "2025-01-21T11:30:00Z",
        "score": 0.75,
        "source": "network_agent",
        "reason": "Geographic anomaly detected"
      }
    ],
    "domains": [
      {
        "name": "network",
        "risk_score": 0.90,
        "confidence": 0.85,
        "evidence_count": 7,
        "analysis_status": "complete",
        "indicators": [
          {
            "name": "geo-dispersion",
            "severity": "high",
            "weight": 0.8,
            "confidence": 0.9
          }
        ]
      }
    ]
  }
}
```

### 3. List Investigations

Retrieves a paginated list of investigations.

```http
GET /investigations
```

**Query Parameters:**
- `page`: number (default: 1) - Page number
- `limit`: number (default: 20, max: 100) - Items per page
- `status`: string - Filter by status
- `priority`: string - Filter by priority
- `assigned_to`: string - Filter by assignee
- `entity_type`: string - Filter by entity type
- `created_after`: ISO 8601 timestamp - Filter by creation date
- `search`: string - Search in entity values and IDs

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "INV-123",
      "entity": {
        "type": "ip",
        "value": "95.211.35.146"
      },
      "status": "running",
      "risk_score": 0.85,
      "created_at": "2025-01-21T09:00:00Z",
      "assigned_to": ["user_123"]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "has_next": false
    }
  }
}
```

### 4. Update Investigation

Updates investigation properties.

```http
PATCH /investigations/{investigation_id}
```

**Request Body:**
```json
{
  "priority": "high",
  "assigned_to": ["user_123", "user_456"],
  "status": "paused",
  "notes": "Escalating for senior review"
}
```

### 5. Delete Investigation

Soft deletes an investigation (archives it).

```http
DELETE /investigations/{investigation_id}
```

**Query Parameters:**
- `reason`: string (required) - Reason for deletion

## Evidence APIs

### 1. Get Evidence

Retrieves evidence for an investigation.

```http
GET /investigations/{investigation_id}/evidence
```

**Query Parameters:**
- `domain`: string - Filter by domain
- `type`: string - Filter by evidence type
- `strength_min`: number - Minimum evidence strength
- `verified_only`: boolean - Only verified evidence

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "EV-001",
      "investigation_id": "INV-123",
      "domain": "network",
      "type": "ip_geolocation",
      "strength": 0.85,
      "reliability": 0.90,
      "title": "Geographic anomaly detected",
      "description": "IP address showed location changes across 3 countries within 2 hours",
      "discovered_at": "2025-01-21T11:30:00Z",
      "verification_status": "verified",
      "display_data": {
        "summary": "Geographic anomaly: 3 countries in 2h",
        "details": "Detailed geolocation analysis..."
      }
    }
  ]
}
```

### 2. Add Evidence

Manually adds evidence to an investigation.

```http
POST /investigations/{investigation_id}/evidence
```

**Request Body:**
```json
{
  "domain": "network",
  "type": "manual_observation",
  "title": "Suspicious login pattern",
  "description": "Multiple failed login attempts from same IP",
  "strength": 0.7,
  "source": "manual_analysis",
  "raw_data": {
    "failed_attempts": 15,
    "time_span_minutes": 10
  }
}
```

## Timeline APIs

### 1. Get Timeline

Retrieves timeline events for an investigation.

```http
GET /investigations/{investigation_id}/timeline
```

**Query Parameters:**
- `page`: number - Page for pagination
- `limit`: number - Events per page (max 1000)
- `actor`: string - Filter by actor type
- `action`: string - Filter by action type
- `success_only`: boolean - Only successful events
- `since`: ISO 8601 timestamp - Events after this time

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "EVT-001",
      "investigation_id": "INV-123",
      "timestamp": "2025-01-21T11:30:00Z",
      "actor": "network_agent",
      "action": "tool_call",
      "duration_ms": 1163,
      "success": true,
      "input_data": {
        "summary": "Snowflake query: user activity",
        "size_bytes": 256
      },
      "output_data": {
        "summary": "Found 247 transactions",
        "size_bytes": 15420
      },
      "risk_delta": 0.15,
      "evidence_generated": ["EV-001", "EV-002"]
    }
  ]
}
```

## Graph APIs

### 1. Get Graph Data

Retrieves graph visualization data.

```http
GET /investigations/{investigation_id}/graph
```

**Query Parameters:**
- `layout`: string - Preferred layout (force|radial|hierarchical)
- `include_clusters`: boolean - Include clustered nodes
- `max_nodes`: number - Maximum nodes to return (default: 300)

**Response:**
```json
{
  "success": true,
  "data": {
    "investigation_id": "INV-123",
    "last_updated": "2025-01-21T12:00:00Z",
    "nodes": [
      {
        "id": "network_domain",
        "type": "domain",
        "label": "Network Analysis",
        "risk_score": 0.90,
        "status": "complete",
        "properties": {
          "evidence_count": 7,
          "indicators": ["geo-dispersion", "vpn-proxy"]
        },
        "aria_label": "Network domain node, risk 0.9, 7 evidence items"
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "network_domain",
        "target": "evidence_1",
        "type": "causal",
        "strength": 0.85,
        "direction": "directed"
      }
    ]
  }
}
```

## Export APIs

### 1. Generate Report

Generates investigation reports in various formats.

```http
POST /investigations/{investigation_id}/export
```

**Request Body:**
```json
{
  "format": "pdf|json|csv|markdown",
  "template": "executive|detailed|compliance|technical",
  "include_sections": [
    "summary",
    "evidence",
    "timeline",
    "recommendations",
    "audit_trail"
  ],
  "options": {
    "include_raw_data": false,
    "compress": true,
    "digital_signature": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "EXP-456",
    "format": "pdf",
    "status": "generating",
    "estimated_completion": "2025-01-21T12:05:00Z",
    "download_url": null
  }
}
```

### 2. Check Export Status

Checks the status of an export operation.

```http
GET /exports/{export_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "EXP-456",
    "status": "complete",
    "format": "pdf",
    "file_size_bytes": 2048576,
    "download_url": "https://exports.olorin.com/EXP-456.pdf",
    "expires_at": "2025-01-28T12:00:00Z"
  }
}
```

## Real-time APIs (WebSocket)

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/investigations');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));
```

### Event Subscriptions

Subscribe to investigation events:

```javascript
// Subscribe to specific investigation
ws.send(JSON.stringify({
  type: 'subscribe',
  investigation_id: 'INV-123'
}));

// Subscribe to all user's investigations
ws.send(JSON.stringify({
  type: 'subscribe_user_investigations'
}));
```

### Event Types

```javascript
// Investigation progress updates
{
  type: 'investigation.progress',
  investigation_id: 'INV-123',
  data: {
    current_phase: 'analysis',
    progress_percent: 65,
    estimated_completion: '2025-01-21T14:00:00Z'
  }
}

// New evidence found
{
  type: 'evidence.found',
  investigation_id: 'INV-123',
  data: {
    evidence_id: 'EV-007',
    domain: 'network',
    strength: 0.85,
    title: 'VPN usage detected'
  }
}

// Risk score update
{
  type: 'risk.updated',
  investigation_id: 'INV-123',
  data: {
    old_score: 0.75,
    new_score: 0.85,
    reason: 'Additional high-risk evidence found',
    confidence: 0.82
  }
}

// Timeline event
{
  type: 'timeline.event',
  investigation_id: 'INV-123',
  data: {
    timestamp: '2025-01-21T12:30:00Z',
    actor: 'location_agent',
    action: 'analysis_completed',
    success: true
  }
}
```

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVESTIGATION_NOT_FOUND",
    "message": "Investigation with ID INV-123 not found",
    "details": {
      "investigation_id": "INV-123",
      "available_investigations": ["INV-124", "INV-125"]
    }
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "request_id": "req_xyz789"
  }
}
```

### Error Codes

- `INVESTIGATION_NOT_FOUND` (404) - Investigation doesn't exist
- `UNAUTHORIZED` (401) - Invalid or missing authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `VALIDATION_ERROR` (400) - Invalid request data
- `INVESTIGATION_ALREADY_EXISTS` (409) - Duplicate investigation
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error
- `SERVICE_UNAVAILABLE` (503) - Service temporarily unavailable

### Rate Limiting

- **Investigation creation**: 10 per minute per user
- **API requests**: 100 per minute per user
- **WebSocket messages**: 1000 per minute per connection
- **Export generation**: 5 per hour per user

Headers in rate-limited responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642781400
Retry-After: 60
```

## Versioning

API versioning follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

Version is specified in the URL path: `/api/v1/investigations`

### Deprecation Policy

- Features are marked as deprecated for at least 6 months before removal
- Deprecated endpoints return a warning header:
  ```http
  Warning: 299 - "This endpoint is deprecated. Use /api/v2/investigations instead"
  ```

## Testing Contracts

### Mock Data Endpoints

For testing purposes, mock data endpoints are available in development:

```http
GET /dev/mock/investigations
GET /dev/mock/evidence
GET /dev/mock/timeline
```

### Contract Testing

API contracts are validated using:
- OpenAPI 3.0 specification
- Contract tests with Pact
- Schema validation with JSON Schema
- Integration tests with real data

This ensures backward compatibility and consistent behavior across all UI concepts.