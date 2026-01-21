# SOAR Playbooks API Documentation

## Overview

The SOAR Playbooks API provides endpoints for executing Splunk SOAR playbooks for automated fraud response, tracking execution status, and integrating with Composio actions.

## Base URL

```
/api/soar/playbooks
```

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tenant ID is automatically extracted from the authenticated user's context.

## Endpoints

### Execute Playbook

**POST** `/api/soar/playbooks/execute`

Execute a SOAR playbook for fraud response automation.

**Request Body:**
```json
{
  "playbook_id": "fraud_response_playbook",
  "investigation_id": "inv_abc123",
  "anomaly_id": "anom_xyz789",
  "trigger_reason": "High risk transaction detected",
  "context": {
    "transaction_id": "txn_abc123",
    "risk_score": 0.85,
    "user_id": "user_456"
  }
}
```

**Response:**
```json
{
  "id": "exec_123456",
  "playbook_id": "fraud_response_playbook",
  "investigation_id": "inv_abc123",
  "anomaly_id": "anom_xyz789",
  "tenant_id": "tenant_123",
  "status": "running",
  "trigger_reason": "High risk transaction detected",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": null,
  "actions_executed": null,
  "error_message": null
}
```

**Example:**
```bash
curl -X POST https://api.olorin.com/api/soar/playbooks/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "playbook_id": "fraud_response_playbook",
    "investigation_id": "inv_abc123",
    "anomaly_id": "anom_xyz789",
    "trigger_reason": "High risk transaction detected"
  }'
```

### Get Execution Status

**GET** `/api/soar/playbooks/executions/{execution_id}`

Get the status of a SOAR playbook execution.

**Path Parameters:**
- `execution_id` (string, required): Execution identifier

**Response:**
```json
{
  "id": "exec_123456",
  "playbook_id": "fraud_response_playbook",
  "investigation_id": "inv_abc123",
  "anomaly_id": "anom_xyz789",
  "tenant_id": "tenant_123",
  "status": "completed",
  "trigger_reason": "High risk transaction detected",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:31:30Z",
  "actions_executed": {
    "stripe_void_payment": {
      "status": "success",
      "result": {"id": "pay_123", "status": "voided"}
    },
    "slack_notification": {
      "status": "success",
      "result": {"channel": "#fraud-alerts", "ts": "1234567890"}
    }
  },
  "error_message": null
}
```

**Example:**
```bash
curl https://api.olorin.com/api/soar/playbooks/executions/exec_123456 \
  -H "Authorization: Bearer <token>"
```

## Execution Status Values

- `running`: Playbook is currently executing
- `completed`: Playbook completed successfully
- `failed`: Playbook execution failed
- `cancelled`: Playbook execution was cancelled

## Playbook Actions

SOAR playbooks can execute Composio actions via webhook:

**Webhook Endpoint:** `/api/composio/soar-action`

**Webhook Request:**
```json
{
  "toolkit": "stripe",
  "action": "void_payment",
  "connection_id": "comp_conn_456",
  "parameters": {
    "payment_id": "pay_123"
  },
  "execution_id": "exec_123456",
  "tenant_id": "tenant_123"
}
```

**Webhook Response:**
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
  "executed_at": "2024-01-15T10:31:00Z"
}
```

## Data Flow

1. **POST /execute** triggers SOAR playbook execution
2. **SOAR API** receives playbook execution request
3. **Playbook Execution** tracked in `soar_playbook_executions` table
4. **SOAR Playbook** executes actions (evidence collection, analysis)
5. **Composio Actions** executed via webhook (`/api/composio/soar-action`)
6. **Action Results** stored in `composio_action_audit` table
7. **Execution Status** updated in real-time via polling

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid playbook request"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Missing or invalid authentication token"
}
```

**404 Not Found:**
```json
{
  "detail": "Playbook not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to execute playbook"
}
```

## Rate Limiting

- Playbook execution: 10 requests per minute per tenant
- Status polling: 60 requests per minute per tenant

## Security

- SOAR webhook signatures validated using HMAC-SHA256
- Tenant isolation enforced at database level
- Action execution scoped to tenant connections
- Audit logging for all action executions

## Monitoring

- Execution status tracked in real-time
- Failed executions logged with error messages
- Action execution times monitored
- Playbook completion rates tracked

