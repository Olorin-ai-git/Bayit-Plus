# WebSocket Event Contracts: Anomaly Detection

**Feature**: Fraud Anomaly Detection  
**Date**: 2025-11-09  
**Status**: Complete

## Overview

This document defines the WebSocket event contracts for real-time anomaly streaming.

## Endpoint

**URL**: `ws://localhost:8090/v1/stream/anomalies` (development)  
**Protocol**: WebSocket (RFC 6455)

## Connection

### Connect

Client initiates WebSocket connection:

```javascript
const ws = new WebSocket('ws://localhost:8090/v1/stream/anomalies');
```

### Authentication

Authentication via query parameter or header (matches REST API authentication):

```
ws://localhost:8090/v1/stream/anomalies?token=<jwt_token>
```

Or via WebSocket subprotocol header (if supported).

## Message Format

All messages are JSON-encoded UTF-8 strings.

## Client → Server Messages

### Subscribe

Subscribe to anomaly events with optional filters:

```json
{
  "type": "subscribe",
  "filters": {
    "severity": ["critical", "warn"],
    "metric": ["decline_rate"],
    "cohort": {
      "merchant_id": "m_01"
    }
  },
  "last_timestamp": "2025-11-09T10:00:00Z"
}
```

**Fields**:
- `type` (string, required): Always "subscribe"
- `filters` (object, optional): Filter criteria
  - `severity` (array of strings, optional): Filter by severity levels
  - `metric` (array of strings, optional): Filter by metric names
  - `cohort` (object, optional): Filter by cohort dimensions
- `last_timestamp` (string, ISO 8601, optional): Resume from this timestamp

### Unsubscribe

Unsubscribe from anomaly events:

```json
{
  "type": "unsubscribe"
}
```

## Server → Client Messages

### Anomaly Event

Real-time anomaly detection event:

```json
{
  "type": "anomaly",
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "run_id": "660e8400-e29b-41d4-a716-446655440001",
    "detector_id": "770e8400-e29b-41d4-a716-446655440002",
    "cohort": {
      "merchant_id": "m_01",
      "channel": "web",
      "geo": "US-CA"
    },
    "window_start": "2025-11-09T10:15:00Z",
    "window_end": "2025-11-09T10:30:00Z",
    "metric": "decline_rate",
    "observed": 0.24,
    "expected": 0.08,
    "score": 5.1,
    "severity": "critical",
    "persisted_n": 2,
    "evidence": {
      "residuals": [0.12, 0.15, 0.16],
      "mad": 0.03
    },
    "status": "new",
    "created_at": "2025-11-09T10:30:15Z"
  }
}
```

**Fields**: Match `AnomalyEventResponse` schema from REST API.

### Detection Run Status

Update on detection run progress:

```json
{
  "type": "run_status",
  "run": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "detector_id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "running",
    "progress": 0.65,
    "cohorts_processed": 65,
    "cohorts_total": 100,
    "anomalies_detected": 3
  }
}
```

### Error

Error message:

```json
{
  "type": "error",
  "error": "invalid_filter",
  "message": "Invalid filter criteria: severity must be one of [info, warn, critical]"
}
```

### Ping/Pong

Server sends ping, client responds with pong:

**Server → Client**:
```json
{
  "type": "ping",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

**Client → Server**:
```json
{
  "type": "pong",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

## Reconnection

### Automatic Reconnection

Client should implement automatic reconnection with exponential backoff:

1. On connection close, wait 1 second
2. Retry connection
3. If fails, wait 2 seconds
4. Retry, wait 4 seconds, etc.
5. Max backoff: 60 seconds

### Resume from Last Timestamp

On reconnection, client should send `last_timestamp` in subscribe message to resume from last received event:

```json
{
  "type": "subscribe",
  "last_timestamp": "2025-11-09T10:30:15Z"
}
```

Server will send any events that occurred after this timestamp.

## Error Handling

### Connection Errors

- **1006**: Abnormal closure (network error, server crash)
- **1001**: Client going away (normal closure)
- **1011**: Server error (internal error)

### Message Errors

If server receives invalid message:

```json
{
  "type": "error",
  "error": "invalid_message",
  "message": "Unknown message type: invalid_type"
}
```

Server does not close connection on message errors, only on protocol errors.

## Rate Limiting

- Maximum message size: 64 KB
- Maximum messages per second: 100
- Connection timeout: 5 minutes of inactivity

## Example Client Implementation

```typescript
class AnomalyWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private lastTimestamp: string | null = null;

  connect(filters?: AnomalyFilters) {
    const url = `${this.baseUrl}/v1/stream/anomalies?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.subscribe(filters);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  private subscribe(filters?: AnomalyFilters) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      filters: filters,
      last_timestamp: this.lastTimestamp
    }));
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'anomaly':
        this.onAnomaly(message.event);
        this.lastTimestamp = message.event.created_at;
        break;
      case 'run_status':
        this.onRunStatus(message.run);
        break;
      case 'error':
        console.error('Server error:', message.message);
        break;
      case 'ping':
        this.pong(message.timestamp);
        break;
    }
  }

  private reconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
```

