# Composio API Contracts

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

API contract definitions for Composio OAuth and connection management endpoints.

## Endpoints

### POST /api/composio/connect/{toolkit}

Initiate OAuth flow for a specific toolkit.

**Path Parameters**:
- `toolkit` (string, required): Toolkit name (e.g., 'stripe', 'shopify', 'okta')

**Query Parameters**:
- `tenant_id` (string, required): Tenant identifier

**Request Body**: None

**Response** (200 OK):
```json
{
  "oauth_url": "https://app.composio.dev/oauth/authorize?client_id=...&redirect_uri=...&state=...",
  "state": "oauth_state_token",
  "expires_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid toolkit name
- `401 Unauthorized`: Invalid tenant_id
- `500 Internal Server Error`: Composio API error

### GET /api/composio/callback

OAuth callback endpoint (handles Composio redirect).

**Query Parameters**:
- `code` (string, required): Authorization code from Composio
- `state` (string, required): OAuth state token

**Response** (200 OK):
```json
{
  "connection_id": "conn_abc123",
  "toolkit_name": "stripe",
  "status": "active",
  "expires_at": "2025-02-28T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid authorization code or state
- `401 Unauthorized`: OAuth state expired or invalid
- `500 Internal Server Error`: Composio API error

### GET /api/composio/connections

List all connections for a tenant.

**Query Parameters**:
- `tenant_id` (string, required): Tenant identifier
- `toolkit` (string, optional): Filter by toolkit name
- `status` (string, optional): Filter by status ('active', 'expired', 'revoked')

**Response** (200 OK):
```json
{
  "connections": [
    {
      "connection_id": "conn_abc123",
      "toolkit_name": "stripe",
      "status": "active",
      "created_at": "2025-01-31T10:00:00Z",
      "last_used_at": "2025-01-31T11:30:00Z",
      "expires_at": "2025-02-28T12:00:00Z"
    }
  ],
  "total": 1
}
```

### DELETE /api/composio/connections/{connection_id}

Revoke a Composio connection.

**Path Parameters**:
- `connection_id` (string, required): Connection identifier

**Query Parameters**:
- `tenant_id` (string, required): Tenant identifier

**Response** (200 OK):
```json
{
  "connection_id": "conn_abc123",
  "status": "revoked",
  "revoked_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Connection not found
- `403 Forbidden`: Connection does not belong to tenant
- `500 Internal Server Error`: Composio API error

### POST /api/composio/test-connection/{connection_id}

Test a Composio connection.

**Path Parameters**:
- `connection_id` (string, required): Connection identifier

**Query Parameters**:
- `tenant_id` (string, required): Tenant identifier

**Response** (200 OK):
```json
{
  "connection_id": "conn_abc123",
  "status": "active",
  "test_result": "success",
  "tested_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Connection not found
- `403 Forbidden`: Connection does not belong to tenant
- `500 Internal Server Error`: Connection test failed

## Data Models

### Connection

```typescript
interface Connection {
  connection_id: string;
  toolkit_name: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;  // ISO 8601 timestamp
  last_used_at?: string;  // ISO 8601 timestamp
  expires_at?: string;  // ISO 8601 timestamp
}
```

### OAuth Response

```typescript
interface OAuthResponse {
  oauth_url: string;
  state: string;
  expires_at: string;  // ISO 8601 timestamp
}
```

