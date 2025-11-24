# SOAR Playbooks API Contracts

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

API contract definitions for SOAR playbook execution endpoints.

## Endpoints

### POST /api/soar/playbooks/execute

Execute a SOAR playbook.

**Request Body**:
```json
{
  "playbook_id": "fraud_response_critical",
  "investigation_id": "inv_abc123",
  "anomaly_id": "anom_xyz789",
  "tenant_id": "tenant_123",
  "trigger_reason": "Critical anomaly detected (score: 5.2)",
  "context": {
    "entity_id": "192.0.2.1",
    "entity_type": "ip",
    "risk_score": 5.2,
    "severity": "critical"
  }
}
```

**Response** (202 Accepted):
```json
{
  "execution_id": "exec_abc123",
  "playbook_id": "fraud_response_critical",
  "status": "running",
  "started_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid playbook_id or missing required fields
- `404 Not Found`: Playbook not found
- `500 Internal Server Error`: SOAR API error

### GET /api/soar/playbooks/executions/{execution_id}

Get SOAR playbook execution status.

**Path Parameters**:
- `execution_id` (string, required): Execution identifier

**Query Parameters**:
- `tenant_id` (string, required): Tenant identifier

**Response** (200 OK):
```json
{
  "execution_id": "exec_abc123",
  "playbook_id": "fraud_response_critical",
  "investigation_id": "inv_abc123",
  "anomaly_id": "anom_xyz789",
  "tenant_id": "tenant_123",
  "status": "completed",
  "started_at": "2025-01-31T12:00:00Z",
  "completed_at": "2025-01-31T12:00:30Z",
  "actions_executed": [
    {
      "action_id": "act_001",
      "toolkit": "stripe",
      "action_name": "void_payment",
      "status": "success",
      "executed_at": "2025-01-31T12:00:15Z"
    },
    {
      "action_id": "act_002",
      "toolkit": "okta",
      "action_name": "force_mfa",
      "status": "success",
      "executed_at": "2025-01-31T12:00:20Z"
    }
  ]
}
```

**Error Responses**:
- `404 Not Found`: Execution not found
- `403 Forbidden`: Execution does not belong to tenant

### POST /api/composio/soar-action

Webhook endpoint for SOAR playbooks to execute Composio actions.

**Request Body**:
```json
{
  "execution_id": "exec_abc123",
  "toolkit": "stripe",
  "action": "void_payment",
  "tenant_id": "tenant_123",
  "parameters": {
    "payment_id": "pi_123456"
  },
  "soar_signature": "sha256=..."
}
```

**Response** (200 OK):
```json
{
  "action_id": "act_001",
  "status": "success",
  "result": {
    "payment_id": "pi_123456",
    "status": "voided"
  },
  "executed_at": "2025-01-31T12:00:15Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or missing required fields
- `401 Unauthorized`: Invalid SOAR signature
- `404 Not Found`: Tenant connection not found
- `500 Internal Server Error`: Composio action execution failed

## Data Models

### Playbook Execution Request

```typescript
interface PlaybookExecutionRequest {
  playbook_id: string;
  investigation_id?: string;
  anomaly_id?: string;
  tenant_id: string;
  trigger_reason?: string;
  context?: {
    entity_id?: string;
    entity_type?: string;
    risk_score?: number;
    severity?: string;
    [key: string]: any;
  };
}
```

### Playbook Execution Response

```typescript
interface PlaybookExecutionResponse {
  execution_id: string;
  playbook_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;  // ISO 8601 timestamp
  completed_at?: string;  // ISO 8601 timestamp
  actions_executed?: Array<{
    action_id: string;
    toolkit: string;
    action_name: string;
    status: 'success' | 'failed';
    executed_at: string;  // ISO 8601 timestamp
    error_message?: string;
  }>;
  error_message?: string;
}
```

### SOAR Action Request

```typescript
interface SOARActionRequest {
  execution_id: string;
  toolkit: string;
  action: string;
  tenant_id: string;
  parameters: Record<string, any>;
  soar_signature: string;  // HMAC signature for webhook authentication
}
```

