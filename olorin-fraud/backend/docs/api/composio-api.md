# Composio API Documentation

## Overview

The Composio API provides endpoints for managing tenant connections to Composio-integrated tools (Stripe, Shopify, Square, Okta, Slack, Jira, etc.) via OAuth flows and executing actions for automated fraud response.

## Base URL

```
/api/composio
```

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tenant ID is automatically extracted from the authenticated user's context.

## Endpoints

### OAuth Flow

#### Initiate OAuth Connection

**POST** `/api/composio/connect/{toolkit}`

Initiate OAuth flow for connecting a toolkit.

**Path Parameters:**
- `toolkit` (string, required): Toolkit name (e.g., 'stripe', 'shopify', 'okta')

**Request Body:**
```json
{
  "redirect_uri": "https://your-app.com/callback",
  "scopes": ["read", "write"]
}
```

**Response:**
```json
{
  "oauth_url": "https://app.composio.dev/oauth/authorize?...",
  "toolkit": "stripe",
  "tenant_id": "tenant_123"
}
```

**Example:**
```bash
curl -X POST https://api.olorin.com/api/composio/connect/stripe \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uri": "https://your-app.com/callback",
    "scopes": ["read", "write"]
  }'
```

#### OAuth Callback

**GET** `/api/composio/callback`

Process OAuth callback and store connection.

**Query Parameters:**
- `toolkit` (string, required): Toolkit name
- `code` (string, required): Authorization code from Composio
- `redirect_uri` (string, required): Redirect URI used in OAuth flow
- `state` (string, optional): State parameter

**Response:**
```json
{
  "id": "conn_123",
  "tenant_id": "tenant_123",
  "toolkit_name": "stripe",
  "connection_id": "comp_conn_456",
  "status": "active",
  "expires_at": "2024-12-31T23:59:59Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_used_at": null
}
```

### Connection Management

#### List Connections

**GET** `/api/composio/connections`

List all Composio connections for the tenant.

**Query Parameters:**
- `toolkit` (string, optional): Filter by toolkit name
- `status_filter` (string, optional): Filter by status ('active', 'expired', 'revoked')

**Response:**
```json
[
  {
    "id": "conn_123",
    "tenant_id": "tenant_123",
    "toolkit_name": "stripe",
    "connection_id": "comp_conn_456",
    "status": "active",
    "expires_at": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "last_used_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Connection

**GET** `/api/composio/connections/{connection_id}`

Get connection details by ID.

**Path Parameters:**
- `connection_id` (string, required): Composio connection ID

**Response:**
```json
{
  "id": "conn_123",
  "tenant_id": "tenant_123",
  "toolkit_name": "stripe",
  "connection_id": "comp_conn_456",
  "status": "active",
  "expires_at": "2024-12-31T23:59:59Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_used_at": "2024-01-15T10:30:00Z"
}
```

#### Delete Connection

**DELETE** `/api/composio/connections/{connection_id}`

Delete (revoke) a Composio connection.

**Path Parameters:**
- `connection_id` (string, required): Composio connection ID

**Response:** 204 No Content

#### Test Connection

**POST** `/api/composio/test-connection/{connection_id}`

Test a connection by executing a test action.

**Path Parameters:**
- `connection_id` (string, required): Composio connection ID

**Request Body:**
```json
{
  "toolkit": "stripe",
  "action": "get_account",
  "parameters": {}
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "acct_123",
    "email": "merchant@example.com"
  },
  "connection_id": "comp_conn_456",
  "toolkit": "stripe",
  "action": "get_account"
}
```

### Toolkit Discovery

#### List Toolkits

**GET** `/api/composio/toolkits`

List available Composio toolkits.

**Response:**
```json
[
  {
    "name": "stripe",
    "display_name": "Stripe",
    "description": "Payment processing and financial services",
    "actions_count": 150
  }
]
```

#### List Toolkit Actions

**GET** `/api/composio/toolkits/{toolkit}/actions`

List available actions for a toolkit.

**Path Parameters:**
- `toolkit` (string, required): Toolkit name

**Response:**
```json
[
  {
    "name": "void_payment",
    "display_name": "Void Payment",
    "description": "Void a payment transaction",
    "parameters": {
      "payment_id": {
        "type": "string",
        "required": true
      }
    }
  }
]
```

### SOAR Webhook

#### Execute SOAR Action

**POST** `/api/composio/soar-action`

Webhook endpoint for SOAR playbooks to execute Composio actions.

**Headers:**
- `X-SOAR-Signature` (string, required): HMAC-SHA256 signature of request body

**Request Body:**
```json
{
  "toolkit": "stripe",
  "action": "void_payment",
  "connection_id": "comp_conn_456",
  "parameters": {
    "payment_id": "pay_123"
  },
  "execution_id": "soar_exec_789",
  "tenant_id": "tenant_123"
}
```

**Response:**
```json
{
  "status": "success",
  "action_id": "stripe_void_payment",
  "toolkit": "stripe",
  "action": "void_payment",
  "result": {
    "id": "pay_123",
    "status": "voided"
  },
  "executed_at": "2024-01-15T10:30:00Z"
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "detail": "Invalid request parameters"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Missing or invalid authentication token"
}
```

**403 Forbidden:**
```json
{
  "detail": "Access denied to this tenant"
}
```

**404 Not Found:**
```json
{
  "detail": "Connection not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting

- OAuth initiation: 10 requests per minute per tenant
- Connection operations: 60 requests per minute per tenant
- Action execution: 100 requests per minute per tenant

## Security

- All OAuth tokens are encrypted at rest using AES-256-GCM
- Encryption keys are managed via cloud provider KMS (AWS KMS, GCP KMS, or Azure Key Vault)
- Tenant isolation is enforced at the database level
- SOAR webhook signatures are validated using HMAC-SHA256

## Examples

### Complete OAuth Flow

```bash
# 1. Initiate OAuth
curl -X POST https://api.olorin.com/api/composio/connect/stripe \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "https://your-app.com/callback"}'

# 2. Redirect user to oauth_url

# 3. Handle callback
curl "https://api.olorin.com/api/composio/callback?toolkit=stripe&code=AUTH_CODE&redirect_uri=https://your-app.com/callback" \
  -H "Authorization: Bearer <token>"
```

### Execute Action via SOAR

```bash
curl -X POST https://api.olorin.com/api/composio/soar-action \
  -H "Authorization: Bearer <token>" \
  -H "X-SOAR-Signature: <signature>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolkit": "stripe",
    "action": "void_payment",
    "connection_id": "comp_conn_456",
    "parameters": {"payment_id": "pay_123"},
    "execution_id": "soar_exec_789"
  }'
```

