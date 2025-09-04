# Investigation Polling API - Curl Examples

This document provides curl commands and sample responses for the investigation polling mechanism that supports polling for investigation status and messages in the same format as WebSocket messages.

## Overview

The polling mechanism provides three main endpoints:
- **Status Polling**: Get investigation status updates
- **Message Polling**: Get investigation messages with filtering
- **Latest Polling**: Get combined status + recent messages

All responses use the same message format as WebSocket messages for consistency.

---

## 1. Poll Investigation Status

Get real-time investigation status including participants, progress, and metadata.

### Curl Command
```bash
curl -X GET "http://127.0.0.1:8090/investigations/{investigation_id}/poll/status" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "include_participants=true"
```

### Example
```bash
curl -X GET "http://127.0.0.1:8090/investigations/demo-investigation/poll/status" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "include_participants=true"
```

### Sample Response
```json
{
  "type": "investigation_status",
  "investigation_id": "demo-investigation",
  "status": "IN_PROGRESS",
  "entity_id": "user123",
  "entity_type": "user_id",
  "current_phase": "location_analysis",
  "progress_percentage": 45.0,
  "last_activity": "2025-06-24T08:55:34.076342",
  "active_agents": ["location_agent", "device_agent"],
  "connected_users_count": 2,
  "parallel_execution": true,
  "overall_risk_score": 0.3,
  "timestamp": "2025-06-24T08:55:34.076342",
  "participants": [
    {
      "user_id": "investigator-1",
      "investigation_id": "demo-investigation",
      "status": "online",
      "role": "investigator",
      "last_seen": "2025-06-24T08:55:30.123456"
    },
    {
      "user_id": "observer-1", 
      "investigation_id": "demo-investigation",
      "status": "online",
      "role": "observer",
      "last_seen": "2025-06-24T08:55:25.654321"
    }
  ]
}
```

### Parameters
- `user_id` (required): User ID for access control
- `include_participants` (optional, default: true): Include participant information

---

## 2. Poll Investigation Messages

Get investigation messages with filtering options (timestamp, message ID, limit).

### Curl Command
```bash
curl -X GET "http://127.0.0.1:8090/investigations/{investigation_id}/poll/messages" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "limit=50"
```

### Example with Timestamp Filtering
```bash
curl -X GET "http://127.0.0.1:8090/investigations/demo-investigation/poll/messages" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "since_timestamp=2025-06-24T08:50:00.000000" \
  -d "limit=50"
```

### Example with Message ID Filtering
```bash
curl -X GET "http://127.0.0.1:8090/investigations/demo-investigation/poll/messages" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "since_id=3_1719235234.567890" \
  -d "limit=50"
```

### Sample Response
```json
{
  "type": "messages_poll_response",
  "investigation_id": "demo-investigation",
  "messages": [
    {
      "id": "0_1719235200.123456",
      "timestamp": "2025-06-24T08:53:20.123456",
      "type": "agent_started",
      "agent_name": "location_analysis",
      "message": "Starting location analysis..."
    },
    {
      "id": "1_1719235230.234567",
      "timestamp": "2025-06-24T08:53:50.234567",
      "type": "agent_progress",
      "agent_name": "location_analysis",
      "progress": 0.5,
      "message": "Location analysis 50% complete"
    },
    {
      "id": "2_1719235260.345678",
      "timestamp": "2025-06-24T08:54:20.345678",
      "type": "agent_completed",
      "agent_name": "location_analysis",
      "result": {
        "risk_score": 0.3,
        "locations": ["US", "CA"]
      },
      "message": "Location analysis completed"
    },
    {
      "id": "3_1719235290.456789",
      "timestamp": "2025-06-24T08:54:50.456789",
      "type": "custom_update",
      "message": "Investigation making good progress",
      "progress": 75,
      "phase": "analysis"
    },
    {
      "id": "4_1719235320.567890",
      "timestamp": "2025-06-24T08:55:20.567890",
      "type": "user_joined",
      "user_id": "investigator-2",
      "investigation_id": "demo-investigation",
      "role": "investigator"
    }
  ],
  "total_messages": 15,
  "returned_count": 5,
  "has_more": true,
  "timestamp": "2025-06-24T08:55:34.076342"
}
```

### Parameters
- `user_id` (required): User ID for access control
- `since_timestamp` (optional): Get messages since this timestamp (ISO format)
- `since_id` (optional): Get messages since this message ID
- `limit` (optional, default: 50, max: 100): Maximum number of messages to return

---

## 3. Poll Latest Data (Combined)

Get both investigation status and recent messages in a single call for efficiency.

### Curl Command
```bash
curl -X GET "http://127.0.0.1:8090/investigations/{investigation_id}/poll/latest" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "include_status=true" \
  -d "include_messages=true" \
  -d "message_limit=10"
```

### Example
```bash
curl -X GET "http://127.0.0.1:8090/investigations/demo-investigation/poll/latest" \
  -H "Content-Type: application/json" \
  -G \
  -d "user_id=demo-user" \
  -d "include_status=true" \
  -d "include_messages=true" \
  -d "message_limit=10"
```

### Sample Response
```json
{
  "type": "investigation_latest",
  "investigation_id": "demo-investigation",
  "timestamp": "2025-06-24T08:55:34.076342",
  "status": {
    "status": "IN_PROGRESS",
    "entity_id": "user123",
    "entity_type": "user_id",
    "current_phase": "device_analysis",
    "progress_percentage": 75.0,
    "last_activity": "2025-06-24T08:55:30.123456",
    "active_agents": ["device_agent", "risk_agent"],
    "connected_users_count": 3,
    "parallel_execution": true,
    "overall_risk_score": 0.4,
    "participants": [
      {
        "user_id": "investigator-1",
        "investigation_id": "demo-investigation",
        "status": "online",
        "role": "investigator",
        "last_seen": "2025-06-24T08:55:30.123456"
      },
      {
        "user_id": "investigator-2",
        "investigation_id": "demo-investigation", 
        "status": "online",
        "role": "investigator",
        "last_seen": "2025-06-24T08:55:25.654321"
      },
      {
        "user_id": "observer-1",
        "investigation_id": "demo-investigation",
        "status": "online", 
        "role": "observer",
        "last_seen": "2025-06-24T08:55:20.987654"
      }
    ]
  },
  "messages": {
    "recent_messages": [
      {
        "id": "10_1719235500.123456",
        "timestamp": "2025-06-24T08:58:20.123456",
        "type": "agent_started",
        "agent_name": "device_analysis",
        "message": "Starting device analysis..."
      },
      {
        "id": "11_1719235530.234567",
        "timestamp": "2025-06-24T08:58:50.234567",
        "type": "agent_progress",
        "agent_name": "device_analysis",
        "progress": 0.3,
        "message": "Device analysis 30% complete"
      },
      {
        "id": "12_1719235560.345678",
        "timestamp": "2025-06-24T08:59:20.345678",
        "type": "user_activity",
        "user_id": "investigator-2",
        "investigation_id": "demo-investigation",
        "activity": "viewing_results"
      }
    ],
    "total_messages": 25,
    "returned_count": 3
  }
}
```

### Parameters
- `user_id` (required): User ID for access control
- `include_status` (optional, default: true): Include status information
- `include_messages` (optional, default: true): Include recent messages
- `message_limit` (optional, default: 10, max: 50): Number of recent messages to include

---

## Message Types

The polling endpoints return the same message types as WebSocket connections:

### Agent Messages
- `agent_started`: Agent begins processing
- `agent_progress`: Agent progress update with percentage
- `agent_completed`: Agent finished with results

### Investigation Messages
- `investigation_status`: Status update
- `investigation_completed`: Investigation finished
- `custom_update`: Custom investigation message

### User Messages
- `user_joined`: User connected to investigation
- `user_left`: User disconnected from investigation
- `user_activity`: User activity update

### System Messages
- `ping`/`pong`: Heartbeat messages
- `participants_list`: Current participants update

---

## Error Responses

### Investigation Not Found (404)
```json
{
  "detail": "Investigation not found"
}
```

### Invalid Timestamp Format (400)
```json
{
  "detail": "Invalid timestamp format"
}
```

### Missing User ID (422)
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["query", "user_id"],
      "msg": "Field required"
    }
  ]
}
```

---

## WebSocket Message Format Compatibility

All polling responses maintain the same structure as WebSocket messages:

### Required Fields
- `type`: Message type identifier
- `timestamp`: ISO format timestamp
- `investigation_id`: Investigation identifier

### Optional Fields
- `message`: Human-readable message text
- `user_id`: User identifier (for user-related messages)
- `agent_name`: Agent identifier (for agent messages)
- `progress`: Progress percentage (for progress messages)
- `result`: Result data (for completion messages)

This ensures that clients can seamlessly switch between WebSocket real-time updates and HTTP polling without changing their message processing logic.

---

## Usage Examples

### Polling Loop Example
```bash
#!/bin/bash

INVESTIGATION_ID="demo-investigation"
USER_ID="demo-user"
BASE_URL="http://127.0.0.1:8090"

# Poll every 5 seconds
while true; do
    echo "$(date): Polling investigation status..."
    
    # Get latest data
    curl -s "${BASE_URL}/investigations/${INVESTIGATION_ID}/poll/latest" \
        -G \
        -d "user_id=${USER_ID}" \
        -d "include_status=true" \
        -d "include_messages=true" \
        -d "message_limit=5" | jq .
    
    sleep 5
done
```

### Timestamp-based Message Fetching
```bash
#!/bin/bash

INVESTIGATION_ID="demo-investigation"
USER_ID="demo-user"
BASE_URL="http://127.0.0.1:8090"
LAST_TIMESTAMP=""

while true; do
    if [ -n "$LAST_TIMESTAMP" ]; then
        # Get messages since last timestamp
        RESPONSE=$(curl -s "${BASE_URL}/investigations/${INVESTIGATION_ID}/poll/messages" \
            -G \
            -d "user_id=${USER_ID}" \
            -d "since_timestamp=${LAST_TIMESTAMP}" \
            -d "limit=50")
    else
        # Get recent messages
        RESPONSE=$(curl -s "${BASE_URL}/investigations/${INVESTIGATION_ID}/poll/messages" \
            -G \
            -d "user_id=${USER_ID}" \
            -d "limit=10")
    fi
    
    echo "$RESPONSE" | jq .
    
    # Extract latest timestamp for next poll
    LAST_TIMESTAMP=$(echo "$RESPONSE" | jq -r '.messages[-1].timestamp // empty')
    
    sleep 3
done
``` 