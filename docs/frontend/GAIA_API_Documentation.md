# 📚 OLORIN API Documentation - Complete Request/Response Guide

## Table of Contents

- [Investigation Management APIs](#investigation-management-apis)
- [Network Analysis API](#network-analysis-api)
- [Device Analysis API](#device-analysis-api)
- [Location Analysis API](#location-analysis-api)
- [Logs Analysis API](#logs-analysis-api)
- [Risk Assessment API](#risk-assessment-api)
- [Comments API](#comments-api)
- [Agent API](#agent-api)
- [WebSocket API](#websocket-api)
- [Autonomous Investigation APIs](#autonomous-investigation-apis)
- [Autonomous Investigation Guide](#autonomous-investigation-guide)
- [Demo Mode APIs](#demo-mode-apis)
- [Additional Endpoints](#additional-endpoints)
- [Authentication Headers](#authentication-headers)
- [Common Query Parameters](#common-query-parameters)
- [Error Responses](#error-responses)

---

## 🔍 **Investigation Management APIs**

### **POST /api/investigation**

Create a new investigation

**Request:**

```json
{
  "id": "INV-12345",
  "entity_id": "user123456",
  "entity_type": "user_id"
}
```

**Response:**

```json
{
  "id": "INV-12345",
  "entity_id": "user123456",
  "entity_type": "user_id",
  "user_id": null,
  "status": "IN_PROGRESS",
  "policy_comments": "",
  "investigator_comments": "",
  "overall_risk_score": 0.0,
  "device_llm_thoughts": "",
  "location_llm_thoughts": "",
  "network_llm_thoughts": "",
  "logs_llm_thoughts": "",
  "device_risk_score": 0.0,
  "location_risk_score": 0.0,
  "network_risk_score": 0.0,
  "logs_risk_score": 0.0
}
```

### **GET /api/investigation/{investigation_id}**

Get or create investigation

**Request:**

```bash
GET /api/investigation/INV-12345?entity_id=user123456&entity_type=user_id
```

**Response:** Same as POST response above

### **PUT /api/investigation/{investigation_id}**

Update investigation

**Request:**

```json
{
  "status": "COMPLETED",
  "policy_comments": "Investigation completed",
  "investigator_comments": "No issues found"
}
```

**Response:**

```json
{
  "id": "INV-12345",
  "user_id": "user123456",
  "status": "COMPLETED",
  "policy_comments": "Investigation completed",
  "investigator_comments": "No issues found",
  "overall_risk_score": 0.5
}
```

### **GET /api/investigations**

List all investigations

**Response:**

```json
[
  {
    "id": "INV-12345",
    "entity_id": "user123456",
    "entity_type": "user_id",
    "status": "IN_PROGRESS",
    "overall_risk_score": 0.3
  },
  {
    "id": "INV-67890",
    "entity_id": "user789012",
    "entity_type": "user_id",
    "status": "COMPLETED",
    "overall_risk_score": 0.8
  }
]
```

### **DELETE /api/investigation/{investigation_id}**

**Response:**

```json
{
  "deleted": true,
  "id": "INV-12345"
}
```

### **DELETE /api/investigation**

Delete multiple investigations

**Request:**

```json
["INV-12345", "INV-67890", "INV-11111"]
```

**Response:**

```json
{
  "deleted": true,
  "ids": ["INV-12345", "INV-67890", "INV-11111"]
}
```

### **DELETE /api/investigations/delete_all**

Delete all investigations

**Response:**

```json
{
  "detail": "All investigations deleted"
}
```

### **GET /api/investigations/active**

Get all active (running) investigations

**Response:**

```json
[
  {
    "id": "INV-12345",
    "entity_id": "user123456",
    "entity_type": "user_id",
    "status": "IN_PROGRESS",
    "current_phase": "network_analysis",
    "progress": 0.4,
    "started_at": "2024-01-15T10:25:00Z",
    "execution_mode": "parallel"
  },
  {
    "id": "INV-67890",
    "entity_id": "device789012",
    "entity_type": "device_id",
    "status": "PAUSED",
    "current_phase": "device_analysis",
    "progress": 0.7,
    "started_at": "2024-01-15T10:20:00Z",
    "execution_mode": "sequential"
  }
]
```

### **POST /api/investigations/batch-stop**

Stop multiple running investigations

**Request:**

```json
{
  "investigation_ids": ["INV-12345", "INV-67890", "INV-11111"]
}
```

**Response:**

```json
{
  "stopped": [
    {
      "investigation_id": "INV-12345",
      "status": "CANCELLED",
      "stopped_at": "2024-01-15T10:30:00Z"
    },
    {
      "investigation_id": "INV-67890",
      "status": "CANCELLED",
      "stopped_at": "2024-01-15T10:30:00Z"
    }
  ],
  "failed": [
    {
      "investigation_id": "INV-11111",
      "error": "Investigation not found or already completed"
    }
  ]
}
```

### **GET /api/investigations/status**

Get status of multiple investigations

**Request:**

```bash
GET /api/investigations/status?ids=INV-12345,INV-67890,INV-11111
```

**Response:**

```json
[
  {
    "investigation_id": "INV-12345",
    "status": "IN_PROGRESS",
    "current_phase": "network_analysis",
    "progress": 0.4,
    "execution_mode": "parallel"
  },
  {
    "investigation_id": "INV-67890",
    "status": "COMPLETED",
    "overall_risk_score": 0.65,
    "completed_at": "2024-01-15T10:28:00Z"
  },
  {
    "investigation_id": "INV-11111",
    "error": "Investigation not found"
  }
]
```

---

## 🌐 **Network Analysis API**

### **GET /api/network/{user_id}**

Analyze network risk for a user

**Request:**

```bash
GET /api/network/user123456?investigation_id=INV-12345&time_range=30d&entity_type=user_id
```

**Optional Parameters:**

- `splunk_host`: Override Splunk host
- `raw_splunk_override`: Override with raw Splunk data

**Response:**

```json
{
  "user_id": "user123456",
  "raw_splunk_results_count": 45,
  "extracted_network_signals": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "source_ip": "192.168.1.100",
      "destination_ip": "10.0.0.50",
      "port": 443,
      "protocol": "HTTPS",
      "bytes_transferred": 2048,
      "location": "San Francisco, CA"
    }
  ],
  "network_risk_assessment": {
    "risk_level": 0.3,
    "risk_factors": [
      "Multiple IP addresses detected",
      "Cross-region network activity"
    ],
    "anomaly_details": [
      {
        "type": "unusual_location",
        "description": "Network activity from unexpected geographic location",
        "severity": "medium"
      }
    ],
    "confidence": 0.8,
    "summary": "Moderate network risk detected due to geographic anomalies",
    "thoughts": "The user shows consistent patterns but some cross-region activity warrants monitoring"
  }
}
```

---

## 💻 **Device Analysis API**

### **GET /api/device/{entity_id}**

Analyze device risk for a user or device

**Request:**

```bash
GET /api/device/user123456?investigation_id=INV-12345&time_range=30d&entity_type=user_id&profile_id=9341450868951246
```

**Required Parameters:**

- `entity_type`: Must be either `user_id` or `device_id`
- `investigation_id`: Investigation identifier

**Optional Parameters:**

- `splunk_host`: Override Splunk host
- `raw_splunk_override`: Override with raw Splunk data
- `profile_id`: Profile ID for identity services (default: "9341450868951246")

**Response:**

```json
{
  "entity_id": "user123456",
  "entity_type": "user_id",
  "raw_splunk_results_count": 23,
  "extracted_device_signals": [
    {
      "device_id": "DEV-ABC123",
      "os": "iOS",
      "os_version": "17.2.1",
      "browser": "Safari",
      "screen_resolution": "1170x2532",
      "timezone": "America/Los_Angeles",
      "last_seen": "2024-01-15T10:30:00Z",
      "location": {
        "city": "San Francisco",
        "region": "CA",
        "country": "US"
      }
    }
  ],
  "device_risk_assessment": {
    "risk_level": 0.4,
    "risk_factors": [
      "New device detected",
      "Location mismatch with historical pattern"
    ],
    "confidence": 0.75,
    "summary": "Moderate device risk due to new device usage",
    "thoughts": "New device registration from expected geographic region, monitoring recommended"
  },
  "chronos_entities": [
    {
      "sessionId": "sess_123456789",
      "smartId": "smart_abc123",
      "kdid": "kdid_def456",
      "offeringId": "TurboTax"
    }
  ]
}
```

### **POST /api/device/chronos**

Call Chronos tool directly

**Request:**

```json
{
  "user_id": "user123456",
  "fields": ["sessionId", "os", "osVersion", "trueIpCity"],
  "time_range": "30d"
}
```

**Query Parameters:**

- `time_range`: Time range for data retrieval (default: "30d")
- `profile_id`: Profile ID for authentication (default: "9341450868951246")

**Response:**

```json
{
  "results": [
    {
      "sessionId": "sess_123456789",
      "os": "iOS",
      "osVersion": "17.2.1",
      "trueIpCity": "San Francisco",
      "ts": "2024-01-15T10:30:00Z"
    }
  ],
  "total_count": 45,
  "query_metadata": {
    "time_range": "30d",
    "fields_requested": 4
  }
}
```

**Default Fields (when none specified):**

- sessionId
- os
- osVersion
- trueIpCity
- trueIpGeo
- ts
- kdid
- smartId
- offeringId
- trueIpFirstSeen
- trueIpRegion
- trueIpLatitude
- trueIpLongitude
- agentType
- browserString
- fuzzyDeviceFirstSeen
- timezone
- tmResponse.tmxReasonCodes

---

## 📍 **Location Analysis API**

### **GET /api/location/{entity_id}**

Analyze location risk

**Request:**

```bash
GET /api/location/user123456?investigation_id=INV-12345&time_range=30d&entity_type=user_id
```

**Required Parameters:**

- `entity_type`: Must be either `user_id` or `device_id`
- `investigation_id`: Investigation identifier

**Optional Parameters:**

- `splunk_host`: Override Splunk host
- `raw_splunk_override`: Override with raw Splunk data

**Response:**

```json
{
  "entity_id": "user123456",
  "entity_type": "user_id",
  "oii_location_info": {
    "city": "San Francisco",
    "region": "CA",
    "country": "US",
    "postal_code": "94105",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "confidence": 0.9
  },
  "business_location_info": {
    "city": "Mountain View",
    "region": "CA",
    "country": "US",
    "postal_code": "94041"
  },
  "phone_location_info": {
    "city": "San Francisco",
    "region": "CA",
    "country": "US",
    "postal_code": "94105"
  },
  "device_analysis_results": {
    "device_locations": [
      {
        "city": "San Francisco",
        "country": "US",
        "last_seen": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "overall_location_risk_assessment": {
    "risk_level": 0.2,
    "risk_factors": [
      "Consistent geographic pattern",
      "All locations within expected region"
    ],
    "confidence": 0.85,
    "summary": "Low location risk - consistent patterns observed",
    "thoughts": "User demonstrates stable location patterns consistent with profile"
  }
}
```

### **GET /api/location/source/oii/{user_id}**

Get OII location source only

**Response:**

```json
{
  "city": "San Francisco",
  "region": "CA",
  "country": "US",
  "postal_code": "94105",
  "confidence": 0.9,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

### **GET /api/location/source/business/{user_id}**

Get business location sources

**Response:**

```json
[
  {
    "city": "Mountain View",
    "region": "CA",
    "country": "US",
    "postal_code": "94041",
    "business_type": "headquarters"
  }
]
```

### **GET /api/location/source/phone/{user_id}**

Get phone location sources

**Response:**

```json
[
  {
    "city": "San Francisco",
    "region": "CA",
    "country": "US",
    "postal_code": "94105",
    "carrier": "Verizon"
  }
]
```

### **GET /api/location/risk-analysis/{user_id}**

Consolidated location risk analysis

**Request:**

```bash
GET /api/location/risk-analysis/user123456?investigation_id=INV-12345&time_range=30d&splunk_host=splunk.example.com
```

**Response:**

```json
{
  "entity_id": "user123456",
  "entity_type": "user_id",
  "user_id": "user123456",
  "oii_location_info": {
    "city": "San Francisco",
    "region": "CA",
    "country": "US"
  },
  "business_location_info": {
    "city": "Mountain View",
    "region": "CA",
    "country": "US"
  },
  "phone_location_info": {
    "city": "San Francisco",
    "region": "CA",
    "country": "US"
  },
  "device_analysis_results": {
    "entity_id": "user123456",
    "device_risk_assessment": {
      "risk_level": 0.3,
      "summary": "Low device risk detected"
    }
  },
  "overall_location_risk_assessment": {
    "risk_level": 0.2,
    "risk_factors": [
      "Consistent geographic patterns",
      "All sources align within expected region"
    ],
    "confidence": 0.88,
    "summary": "Low location risk - all sources consistent",
    "thoughts": "Strong geographic consistency across all data sources"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📊 **Logs Analysis API**

### **GET /api/logs/{entity_id}**

Analyze authentication and system logs

**Request:**

```bash
GET /api/logs/user123456?investigation_id=INV-12345&time_range=30d&entity_type=user_id
```

**Required Parameters:**

- `investigation_id`: Investigation identifier

**Optional Parameters:**

- `entity_type`: `user_id` or `device_id` (default: "user_id")
- `raw_splunk_override`: Override with raw Splunk data

**Response:**

```json
{
  "entity_id": "user123456",
  "entity_type": "user_id",
  "raw_splunk_results_count": 156,
  "extracted_log_signals": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "event_type": "authentication",
      "status": "success",
      "source_ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X)",
      "location": {
        "city": "San Francisco",
        "country": "US"
      },
      "originating_ips": ["192.168.1.100"],
      "cities": ["San Francisco"],
      "transaction": ["login_success"]
    },
    {
      "timestamp": "2024-01-15T09:15:00Z",
      "event_type": "authentication",
      "status": "failed",
      "source_ip": "10.0.0.50",
      "reason": "invalid_credentials",
      "originating_ips": ["10.0.0.50"],
      "cities": ["New York"],
      "transaction": ["login_failed"]
    }
  ],
  "chronos_entities": [
    {
      "sessionId": "sess_789012345",
      "kdid": "kdid_abc789",
      "smartId": "smart_def456"
    }
  ],
  "logs_risk_assessment": {
    "risk_level": 0.6,
    "risk_factors": [
      "Multiple failed authentication attempts",
      "Authentication from multiple IP addresses",
      "Authentication from multiple countries: US, IN"
    ],
    "confidence": 0.7,
    "summary": "Elevated logs risk due to failed authentication patterns",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🔍 **Risk Assessment API**

### **GET /api/risk-assessment/{user_id}**

Overall risk assessment combining all domains

**Request:**

```bash
GET /api/risk-assessment/user123456?investigation_id=INV-12345
```

**Response:**

```json
{
  "user_id": "user123456",
  "investigation_id": "INV-12345",
  "overall_risk_score": 0.45,
  "risk_breakdown": {
    "device_risk": 0.4,
    "network_risk": 0.3,
    "location_risk": 0.2,
    "logs_risk": 0.6
  },
  "domain_assessments": {
    "device": {
      "risk_level": 0.4,
      "risk_factors": ["New device detected"],
      "summary": "Moderate device risk"
    },
    "network": {
      "risk_level": 0.3,
      "risk_factors": ["Cross-region activity"],
      "summary": "Low-moderate network risk"
    },
    "location": {
      "risk_level": 0.2,
      "risk_factors": ["Consistent patterns"],
      "summary": "Low location risk"
    },
    "logs": {
      "risk_level": 0.6,
      "risk_factors": ["Failed authentication attempts"],
      "summary": "Elevated logs risk"
    }
  },
  "overall_risk_factors": [
    "Multiple failed authentication attempts",
    "New device detected",
    "Cross-region network activity"
  ],
  "confidence": 0.78,
  "summary": "Moderate overall risk detected across multiple domains",
  "recommendation": "Enhanced monitoring recommended",
  "thoughts": "Combination of authentication issues and device anomalies warrants investigation",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 💬 **Comments API**

### **GET /api/investigation/{investigation_id}/comment**

Get comments for investigation

**Request:**

```bash
GET /api/investigation/INV-12345/comment?sender=investigator
```

**Optional Parameters:**

- `sender`: Filter by sender (e.g., "investigator", "system")

**Response:**

```json
[
  {
    "id": 1,
    "investigation_id": "INV-12345",
    "entity_id": "user123456",
    "entity_type": "user_id",
    "sender": "investigator",
    "text": "Initial investigation started",
    "timestamp": 1705320600
  },
  {
    "id": 2,
    "investigation_id": "INV-12345",
    "entity_id": "user123456",
    "entity_type": "user_id",
    "sender": "system",
    "text": "Risk assessment completed",
    "timestamp": 1705324200
  }
]
```

### **POST /api/investigation/{investigation_id}/comment**

Add comment to investigation

**Request:**

```json
{
  "entity_id": "user123456",
  "entity_type": "user_id",
  "sender": "investigator",
  "text": "Investigation requires follow-up",
  "timestamp": 1705327800
}
```

**Response:**

```json
{
  "id": 3,
  "investigation_id": "INV-12345",
  "entity_id": "user123456",
  "entity_type": "user_id",
  "sender": "investigator",
  "text": "Investigation requires follow-up",
  "timestamp": 1705327800
}
```

---

## 🤖 **Agent API**

### **POST /api/agent/start**

Start autonomous investigation for an entity

**Request:**

```bash
POST /api/agent/start?entity_id=user123456&entity_type=user_id
```

**Required Parameters:**

- `entity_type`: Must be either `user_id` or `device_id`

**Response:**

```json
{
  "agentOutput": {
    "plainText": "Starting autonomous investigation for user123456. Investigation ID: inv-abc123-def456",
    "outputs": []
  },
  "agentMetadata": {
    "agentTraceId": "trace-abc123def456"
  }
}
```

### **WebSocket: /ws/{investigation_id}**

Real-time autonomous investigation progress monitoring

**Connection:**

```javascript
// Parallel execution (default)
const ws = new WebSocket(
  'ws://localhost:8000/ws/inv-abc123-def456?parallel=true',
);

// Sequential execution
const ws = new WebSocket(
  'ws://localhost:8000/ws/inv-abc123-def456?parallel=false',
);
```

**Query Parameters:**

- `parallel`: Boolean (default: `true`)
  - `true`: Run investigation agents in parallel (faster)
  - `false`: Run investigation agents sequentially (network → location → logs →
    device → risk)

**WebSocket Message Format:**

```json
{
  "phase": "network_analysis",
  "progress": 1.0,
  "message": "Network analysis completed with risk assessment",
  "agent_response": {
    "entity_id": "user123456",
    "investigation_id": "INV-12345",
    "extracted_network_signals": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "ip_address": "192.168.1.1",
        "country": "US",
        "city": "Mountain View",
        "isp": "intuit inc."
      }
    ],
    "network_risk_assessment": {
      "risk_level": 0.5,
      "risk_factors": ["Multiple ISPs detected"],
      "confidence": 0.7,
      "summary": "Network signals show potential geographic inconsistency",
      "thoughts": "The user appears to switch quickly between different ISPs..."
    },
    "num_network_signals": 23
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Investigation Phases:**

- `initialization`: Investigation setup
- `network_analysis`: Network behavior analysis
- `location_analysis`: Geographic risk analysis
- `device_analysis`: Device fingerprinting analysis
- `behavior_analysis`: Authentication logs analysis
- `risk_assessment`: Final risk assessment
- `completed`: Investigation finished

### **POST /api/v1/agent/invoke**

Invoke AI agent for analysis

**Required Headers:**

- `intuit_experience_id`: Experience identifier
- `intuit_originating_assetalias`: Originating asset alias

**Request:**

```json
{
  "agent": {
    "name": "Intuit.cas.hri.olorin:fpl-splunk"
  },
  "agentInput": {
    "content": [
      {
        "type": "text",
        "text": "Analyze the risk for user123456"
      }
    ]
  },
  "metadata": {
    "interactionGroupId": "ig-12345",
    "supportedOutputFormats": [
      {
        "format": "json",
        "formatterVersion": "1.0",
        "formatterName": "standard"
      }
    ],
    "additionalMetadata": {
      "investigation_id": "INV-12345"
    }
  },
  "context": {
    "interactionType": "investigation",
    "platform": "web",
    "taxYear": "2024",
    "additionalContext": {
      "user_id": "user123456",
      "time_range": "30d"
    }
  }
}
```

**Response:**

```json
{
  "agentOutput": {
    "plainText": "Based on my analysis of user123456, I've identified moderate risk factors including failed authentication attempts and device anomalies. The overall risk score is 0.45.",
    "outputs": []
  },
  "agentMetadata": {
    "agentTraceId": "trace-abc123def456"
  }
}
```

**Available Agent Names:**

- `Intuit.cas.hri.olorin:fpl-splunk` - Splunk-based fraud prevention analysis
- `Intuit.cas.hri.olorin:device-analysis` - Device fingerprinting analysis
- `Intuit.cas.hri.olorin:location-analysis` - Location-based risk analysis
- `Intuit.cas.hri.olorin:network-analysis` - Network behavior analysis

### **POST /api/agent/stop/{investigation_id}**

Stop a running autonomous investigation

**Request:**

```bash
POST /api/agent/stop/inv-abc123-def456
```

**Response:**

```json
{
  "investigation_id": "inv-abc123-def456",
  "status": "CANCELLED",
  "message": "Investigation stopped successfully",
  "stopped_at": "2024-01-15T10:30:00Z"
}
```

### **POST /api/agent/pause/{investigation_id}**

Pause a running autonomous investigation

**Request:**

```bash
POST /api/agent/pause/inv-abc123-def456
```

**Response:**

```json
{
  "investigation_id": "inv-abc123-def456",
  "status": "PAUSED",
  "message": "Investigation paused successfully",
  "paused_at": "2024-01-15T10:30:00Z",
  "current_phase": "device_analysis"
}
```

### **POST /api/agent/resume/{investigation_id}**

Resume a paused autonomous investigation

**Request:**

```bash
POST /api/agent/resume/inv-abc123-def456
```

**Response:**

```json
{
  "investigation_id": "inv-abc123-def456",
  "status": "IN_PROGRESS",
  "message": "Investigation resumed successfully",
  "resumed_at": "2024-01-15T10:30:00Z",
  "current_phase": "device_analysis"
}
```

### **GET /api/agent/status/{investigation_id}**

Get current status of autonomous investigation

**Request:**

```bash
GET /api/agent/status/inv-abc123-def456
```

**Response:**

```json
{
  "investigation_id": "inv-abc123-def456",
  "status": "IN_PROGRESS",
  "current_phase": "network_analysis",
  "progress": 0.6,
  "started_at": "2024-01-15T10:25:00Z",
  "estimated_completion": "2024-01-15T10:31:00Z",
  "execution_mode": "parallel",
  "completed_phases": ["initialization", "network_analysis"],
  "remaining_phases": [
    "location_analysis",
    "device_analysis",
    "behavior_analysis",
    "risk_assessment"
  ]
}
```

---

## 🎭 **WebSocket API**

### **WebSocket Endpoint: /ws/{investigation_id}**

Real-time monitoring of autonomous investigation progress with complete API
response data.

**Connection URL:**

```
ws://localhost:8000/ws/{investigation_id}?parallel={true|false}
```

**Query Parameters:**

- `parallel`: Boolean (default: `true`)
  - `true`: Run investigation agents in parallel (faster, 30-60 seconds)
  - `false`: Run investigation agents sequentially (slower, 2-5 minutes)

**Connection Examples:**

```javascript
// Parallel execution (default) - all agents run simultaneously
const ws = new WebSocket(
  'ws://localhost:8000/ws/inv-abc123-def456?parallel=true',
);

// Sequential execution - agents run one after another
const ws = new WebSocket(
  'ws://localhost:8000/ws/inv-abc123-def456?parallel=false',
);

// Default behavior (parallel if parameter omitted)
const ws = new WebSocket('ws://localhost:8000/ws/inv-abc123-def456');
```

### **WebSocket Message Format**

Each WebSocket message contains complete API response data from the
investigation agents:

```json
{
  "phase": "network_analysis",
  "progress": 1.0,
  "message": "Network analysis completed with risk assessment",
  "agent_response": {
    "entity_id": "user123456",
    "investigation_id": "INV-12345",
    "extracted_network_signals": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "ip_address": "192.168.1.1",
        "country": "US",
        "city": "Mountain View",
        "isp": "intuit inc."
      }
    ],
    "network_risk_assessment": {
      "risk_level": 0.5,
      "risk_factors": ["Multiple ISPs detected"],
      "confidence": 0.7,
      "summary": "Network signals show potential geographic inconsistency",
      "thoughts": "The user appears to switch quickly between different ISPs..."
    },
    "num_network_signals": 23
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **WebSocket Control Messages**

The WebSocket connection also supports control messages for managing
investigations:

**Status Update Message:**

```json
{
  "type": "status_update",
  "investigation_id": "inv-abc123-def456",
  "status": "PAUSED",
  "current_phase": "device_analysis",
  "progress": 0.6,
  "message": "Investigation paused by user request",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Message:**

```json
{
  "type": "error",
  "investigation_id": "inv-abc123-def456",
  "error_code": "AGENT_FAILURE",
  "message": "Network agent failed due to timeout",
  "phase": "network_analysis",
  "timestamp": "2024-01-15T10:30:00Z",
  "retry_available": true
}
```

**Cancellation Message:**

```json
{
  "type": "cancellation",
  "investigation_id": "inv-abc123-def456",
  "status": "CANCELLED",
  "message": "Investigation cancelled by user",
  "cancelled_at": "2024-01-15T10:30:00Z",
  "completed_phases": ["initialization", "network_analysis"]
}
```

**Heartbeat Message:**

```json
{
  "type": "heartbeat",
  "investigation_id": "inv-abc123-def456",
  "status": "IN_PROGRESS",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **Investigation Phases**

The autonomous investigation progresses through these phases:

| Phase               | Description                       | Typical Duration |
| ------------------- | --------------------------------- | ---------------- |
| `initialization`    | Investigation setup               | 1-2 seconds      |
| `network_analysis`  | Network behavior and ISP analysis | 5-15 seconds     |
| `location_analysis` | Geographic risk assessment        | 5-15 seconds     |
| `device_analysis`   | Device fingerprinting analysis    | 5-15 seconds     |
| `behavior_analysis` | Authentication logs analysis      | 10-20 seconds    |
| `risk_assessment`   | Final overall risk calculation    | 3-5 seconds      |
| `completed`         | Investigation finished            | -                |

### **Execution Modes**

**Parallel Execution (Default)**

- All domain agents (network, location, device, logs) run simultaneously
- Faster completion: typically 30-60 seconds
- Agents coordinate through central fraud investigation node
- Best for real-time applications requiring quick results

**Sequential Execution**

- Agents run in order: network → location → logs → device → risk
- Slower completion: typically 2-5 minutes
- More predictable execution flow
- Better for debugging or when resource constraints exist

### **WebSocket Client Implementation**

**JavaScript Example:**

```javascript
class AutonomousInvestigationClient {
  constructor(investigationId, parallel = true) {
    this.investigationId = investigationId;
    this.parallel = parallel;
    this.results = {};
    this.ws = null;
  }

  connect() {
    const wsUrl = `ws://localhost:8000/ws/${this.investigationId}?parallel=${this.parallel}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to autonomous investigation');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleProgress(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Investigation monitoring ended');
    };
  }

  handleProgress(data) {
    const { phase, progress, message, agent_response } = data;

    console.log(
      `[${phase.toUpperCase()}] ${(progress * 100).toFixed(1)}% - ${message}`,
    );

    // Store complete API response data
    if (agent_response) {
      this.results[phase] = agent_response;
    }

    // Handle completion
    if (phase === 'completed') {
      this.onInvestigationComplete(this.results);
    }
  }

  onInvestigationComplete(results) {
    console.log('Investigation completed with results:', results);
    // Process final results
    const finalRisk = results.completed?.overall_risk_score || 0;
    console.log(`Final Risk Score: ${finalRisk}`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  stopInvestigation() {
    if (this.monitor && this.monitor.ws) {
      this.monitor.ws.close();
      this.monitor = null;
    }
  }

  // Send control messages to server
  pauseInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'pause',
          investigation_id: this.investigationId,
        }),
      );
    }
  }

  resumeInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'resume',
          investigation_id: this.investigationId,
        }),
      );
    }
  }

  cancelInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'cancel',
          investigation_id: this.investigationId,
        }),
      );
    }
  }
}

// Usage
const client = new AutonomousInvestigationClient('inv-123', true);
client.connect();
```

**Python Example:**

```python
import asyncio
import json
import websockets

class AutonomousInvestigationClient:
    def __init__(self, investigation_id, parallel=True):
        self.investigation_id = investigation_id
        self.parallel = parallel
        self.results = {}

    async def connect(self):
        uri = f"ws://localhost:8000/ws/{self.investigation_id}?parallel={'true' if self.parallel else 'false'}"

        async with websockets.connect(uri) as websocket:
            print(f"Connected to investigation {self.investigation_id}")

            async for message in websocket:
                data = json.loads(message)
                await self.handle_progress(data)

                if data.get('phase') == 'completed':
                    break

    async def handle_progress(self, data):
        phase = data.get('phase', 'unknown')
        progress = data.get('progress', 0)
        message = data.get('message', '')
        agent_response = data.get('agent_response')

        print(f"[{phase.upper()}] {progress:.1%} - {message}")

        if agent_response:
            self.results[phase] = agent_response

        if phase == 'completed':
            await self.on_investigation_complete()

    async def on_investigation_complete(self):
        print("Investigation completed!")
        final_risk = self.results.get('completed', {}).get('overall_risk_score', 0)
        print(f"Final Risk Score: {final_risk}")

    # Control methods for investigation management
    async def pause_investigation(self, websocket):
        await websocket.send(json.dumps({
            'type': 'control',
            'action': 'pause',
            'investigation_id': self.investigation_id
        }))

    async def resume_investigation(self, websocket):
        await websocket.send(json.dumps({
            'type': 'control',
            'action': 'resume',
            'investigation_id': self.investigation_id
        }))

    async def cancel_investigation(self, websocket):
        await websocket.send(json.dumps({
            'type': 'control',
            'action': 'cancel',
            'investigation_id': self.investigation_id
        }))

# Usage
async def main():
    client = AutonomousInvestigationClient('inv-123', parallel=True)
    await client.connect()

asyncio.run(main())
```

### **WebSocket Error Handling**

The WebSocket connection should handle various error scenarios:

**Connection Errors:**

- Network timeouts
- Authentication failures
- Investigation not found
- Server unavailable

**Investigation Errors:**

- Agent failures
- Data unavailable
- Resource limits exceeded
- Invalid configurations

**Example Error Handling:**

```python
async def robust_connect(self):
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            uri = f"ws://localhost:8000/ws/{self.investigation_id}?parallel={'true' if self.parallel else 'false'}"

            async with websockets.connect(uri) as websocket:
                print(f"Connected to investigation {self.investigation_id}")

                async for message in websocket:
                    try:
                        data = json.loads(message)

                        # Handle different message types
                        if data.get('type') == 'error':
                            await self.handle_error(data)
                        elif data.get('type') == 'status_update':
                            await self.handle_status_update(data)
                        else:
                            await self.handle_progress(data)

                        if data.get('phase') == 'completed' or data.get('type') == 'cancellation':
                            break

                    except json.JSONDecodeError:
                        print(f"Invalid JSON received: {message}")
                        continue

        except websockets.exceptions.ConnectionClosed:
            print(f"Connection closed, attempt {attempt + 1}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            else:
                raise

        except Exception as e:
            print(f"Connection failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            else:
                raise

async def handle_error(self, error_data):
    error_code = error_data.get('error_code')
    message = error_data.get('message')
    phase = error_data.get('phase')
    retry_available = error_data.get('retry_available', False)

    print(f"Error in {phase}: {message} (Code: {error_code})")

    if retry_available:
        print("Retry option available")
        # Implement retry logic here
    else:
        print("Investigation failed permanently")

async def handle_status_update(self, status_data):
    status = status_data.get('status')
    current_phase = status_data.get('current_phase')
    progress = status_data.get('progress', 0)

    print(f"Status update: {status} - Phase: {current_phase} ({progress:.1%})")
```

---

## 🤖 **Autonomous Investigation APIs**

### **POST /api/autonomous/start**

Start an autonomous investigation with AI-powered analysis

**Request:**

```json
{
  "investigation_id": "INV-12345",
  "entity_id": "user123456",
  "entity_type": "user_id",
  "execution_mode": "parallel",
  "agents": ["network", "device", "location", "logs"],
  "time_range": "30d"
}
```

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "STARTED",
  "execution_mode": "parallel",
  "websocket_url": "ws://localhost:8000/ws/INV-12345?parallel=true",
  "estimated_duration": "30-60 seconds",
  "phases": [
    "initialization",
    "network_analysis",
    "device_analysis",
    "location_analysis",
    "behavior_analysis",
    "risk_assessment"
  ],
  "started_at": "2024-01-15T10:30:00Z"
}
```

### **POST /api/autonomous/pause**

Pause a running autonomous investigation

**Request:**

```json
{
  "investigation_id": "INV-12345"
}
```

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "PAUSED",
  "current_phase": "device_analysis",
  "progress": 0.6,
  "paused_at": "2024-01-15T10:32:00Z",
  "can_resume": true
}
```

### **POST /api/autonomous/resume**

Resume a paused autonomous investigation

**Request:**

```json
{
  "investigation_id": "INV-12345"
}
```

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "RESUMED",
  "current_phase": "device_analysis",
  "progress": 0.6,
  "resumed_at": "2024-01-15T10:35:00Z",
  "estimated_remaining": "15-30 seconds"
}
```

### **POST /api/autonomous/cancel**

Cancel a running autonomous investigation

**Request:**

```json
{
  "investigation_id": "INV-12345",
  "reason": "User requested cancellation"
}
```

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "CANCELLED",
  "cancelled_at": "2024-01-15T10:33:00Z",
  "completed_phases": ["initialization", "network_analysis"],
  "partial_results": {
    "network_analysis": {
      "risk_score": 0.4,
      "completed": true
    }
  }
}
```

### **GET /api/autonomous/status/{investigation_id}**

Get current status of autonomous investigation

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "IN_PROGRESS",
  "execution_mode": "parallel",
  "current_phase": "device_analysis",
  "progress": 0.6,
  "started_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-15T10:31:00Z",
  "phases_completed": ["initialization", "network_analysis"],
  "phases_remaining": [
    "device_analysis",
    "location_analysis",
    "behavior_analysis",
    "risk_assessment"
  ],
  "agent_status": {
    "network": "COMPLETED",
    "device": "IN_PROGRESS",
    "location": "PENDING",
    "logs": "PENDING"
  }
}
```

### **GET /api/autonomous/results/{investigation_id}**

Get results from completed autonomous investigation

**Response:**

```json
{
  "investigation_id": "INV-12345",
  "status": "COMPLETED",
  "overall_risk_score": 0.75,
  "execution_mode": "parallel",
  "duration": "45 seconds",
  "completed_at": "2024-01-15T10:30:45Z",
  "agent_results": {
    "network": {
      "risk_score": 0.6,
      "risk_factors": ["Multiple ISPs", "Geographic inconsistency"],
      "confidence": 0.8,
      "data_points": 23
    },
    "device": {
      "risk_score": 0.8,
      "risk_factors": ["Unknown device", "Suspicious fingerprint"],
      "confidence": 0.9,
      "data_points": 15
    },
    "location": {
      "risk_score": 0.7,
      "risk_factors": ["High-risk location", "Rapid location changes"],
      "confidence": 0.7,
      "data_points": 8
    },
    "logs": {
      "risk_score": 0.9,
      "risk_factors": ["Failed login attempts", "Unusual access patterns"],
      "confidence": 0.85,
      "data_points": 42
    }
  },
  "final_assessment": {
    "risk_level": "HIGH",
    "confidence": 0.85,
    "recommendation": "BLOCK",
    "summary": "Multiple high-risk indicators detected across all analysis domains"
  }
}
```

### **GET /api/autonomous/history**

Get history of autonomous investigations

**Query Parameters:**

- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (IN_PROGRESS, COMPLETED, CANCELLED, FAILED)
- `entity_type`: Filter by entity type (user_id, device_id)

**Response:**

```json
{
  "investigations": [
    {
      "investigation_id": "INV-12345",
      "entity_id": "user123456",
      "entity_type": "user_id",
      "status": "COMPLETED",
      "overall_risk_score": 0.75,
      "execution_mode": "parallel",
      "duration": "45 seconds",
      "started_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:30:45Z"
    },
    {
      "investigation_id": "INV-67890",
      "entity_id": "device789012",
      "entity_type": "device_id",
      "status": "IN_PROGRESS",
      "current_phase": "location_analysis",
      "progress": 0.7,
      "execution_mode": "sequential",
      "started_at": "2024-01-15T10:25:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### **DELETE /api/autonomous/cleanup**

Clean up completed autonomous investigations older than specified days

**Request:**

```json
{
  "days_old": 30,
  "status_filter": ["COMPLETED", "CANCELLED", "FAILED"]
}
```

**Response:**

```json
{
  "deleted_count": 15,
  "deleted_investigations": ["INV-11111", "INV-22222", "INV-33333"],
  "cleanup_date": "2024-01-15T10:30:00Z"
}
```

---

## 🚀 **Autonomous Investigation Guide**

### **Step-by-Step Client Implementation**

This guide shows how to implement autonomous investigation monitoring in your
client application.

#### **Step 1: Start Autonomous Investigation**

First, initiate the autonomous investigation for a user or device:

```javascript
async function startInvestigation(entityId, entityType = 'user_id') {
  const response = await fetch(
    `/api/agent/start?entity_id=${entityId}&entity_type=${entityType}`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer your-jwt-token',
        'Content-Type': 'application/json',
        intuit_tid: 'your-transaction-id',
      },
    },
  );

  const result = await response.json();

  // Extract investigation ID from response
  const investigationId = extractInvestigationId(result.agentOutput.plainText);

  return investigationId;
}

function extractInvestigationId(plainText) {
  // Look for investigation ID pattern in response
  const match = plainText.match(/investigation[_\s]+([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}
```

#### **Step 2: Choose Execution Mode**

Decide whether to use parallel or sequential execution:

```javascript
// Configuration options
const EXECUTION_MODES = {
  PARALLEL: true, // Faster (30-60 seconds)
  SEQUENTIAL: false, // Slower but predictable (2-5 minutes)
};

// Choose based on your requirements
const useParallel = EXECUTION_MODES.PARALLEL; // or SEQUENTIAL
```

#### **Step 3: Connect to WebSocket**

Establish WebSocket connection with the parallel parameter:

```javascript
function connectToInvestigation(investigationId, parallel = true) {
  const wsUrl = `ws://localhost:8000/ws/${investigationId}?parallel=${parallel}`;
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log(
        `Connected to investigation ${investigationId} (parallel: ${parallel})`,
      );
      resolve(ws);
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection failed:', error);
      reject(error);
    };
  });
}
```

#### **Step 4: Handle Real-Time Updates**

Process investigation progress and collect results:

```javascript
class InvestigationMonitor {
  constructor(websocket) {
    this.ws = websocket;
    this.results = {};
    this.phases = [];
    this.startTime = Date.now();

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handlePhaseUpdate(data);
    };

    this.ws.onclose = () => {
      console.log('Investigation monitoring ended');
      this.onComplete();
    };
  }

  handlePhaseUpdate(data) {
    const { phase, progress, message, agent_response, timestamp } = data;

    // Log progress
    console.log(
      `[${phase.toUpperCase()}] ${(progress * 100).toFixed(1)}% - ${message}`,
    );

    // Store phase information
    this.phases.push({
      phase,
      progress,
      message,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Store complete API response data
    if (agent_response) {
      this.results[phase] = agent_response;
      this.onPhaseComplete(phase, agent_response);
    }

    // Update UI
    this.updateProgressUI(phase, progress, message);

    // Handle completion
    if (phase === 'completed') {
      this.onInvestigationComplete();
    }
  }

  onPhaseComplete(phase, response) {
    // Handle individual phase completion
    switch (phase) {
      case 'network_analysis':
        this.displayNetworkResults(response);
        break;
      case 'location_analysis':
        this.displayLocationResults(response);
        break;
      case 'device_analysis':
        this.displayDeviceResults(response);
        break;
      case 'behavior_analysis':
        this.displayLogsResults(response);
        break;
      case 'completed':
        this.displayFinalResults(response);
        break;
    }
  }

  onInvestigationComplete() {
    const duration = (Date.now() - this.startTime) / 1000;
    console.log(`Investigation completed in ${duration.toFixed(1)} seconds`);

    // Generate summary
    this.generateSummary();
  }

  updateProgressUI(phase, progress, message) {
    // Update your UI components
    const progressBar = document.getElementById('investigation-progress');
    const statusText = document.getElementById('status-text');
    const phaseIndicator = document.getElementById(`phase-${phase}`);

    if (progressBar) {
      const overallProgress = this.calculateOverallProgress();
      progressBar.style.width = `${overallProgress}%`;
    }

    if (statusText) {
      statusText.textContent = message;
    }

    if (phaseIndicator) {
      phaseIndicator.classList.add(progress === 1.0 ? 'completed' : 'active');
    }
  }

  calculateOverallProgress() {
    const totalPhases = 6; // initialization, network, location, device, logs, risk
    const completedPhases = this.phases.filter(
      (p) => p.progress === 1.0,
    ).length;
    return (completedPhases / totalPhases) * 100;
  }

  displayNetworkResults(response) {
    const riskLevel = response.network_risk_assessment?.risk_level || 0;
    const riskFactors = response.network_risk_assessment?.risk_factors || [];

    console.log(`Network Risk: ${riskLevel} (${riskFactors.join(', ')})`);
    // Update network section in UI
  }

  displayLocationResults(response) {
    const riskLevel = response.location_risk_assessment?.risk_level || 0;
    const locations = response.device_locations || [];

    console.log(`Location Risk: ${riskLevel} (${locations.length} locations)`);
    // Update location section in UI
  }

  displayDeviceResults(response) {
    const riskLevel = response.llm_assessment?.risk_level || 0;
    const deviceCount = response.retrieved_signals?.length || 0;

    console.log(`Device Risk: ${riskLevel} (${deviceCount} devices)`);
    // Update device section in UI
  }

  displayLogsResults(response) {
    const riskLevel = response.logs_risk_assessment?.risk_level || 0;
    const logCount = response.parsed_logs?.length || 0;

    console.log(`Logs Risk: ${riskLevel} (${logCount} log entries)`);
    // Update logs section in UI
  }

  displayFinalResults(response) {
    const overallRisk = response.overall_risk_score || 0;
    const riskBreakdown = response.risk_breakdown || {};

    console.log(`Final Risk Score: ${overallRisk}`);
    console.log('Risk Breakdown:', riskBreakdown);

    // Update final results in UI
    this.showFinalSummary(response);
  }

  generateSummary() {
    return {
      investigationId: this.investigationId,
      duration: (Date.now() - this.startTime) / 1000,
      phases: this.phases,
      results: this.results,
      overallRisk: this.results.completed?.overall_risk_score || 0,
    };
  }
}
```

#### **Step 5: Complete Implementation Example**

Here's a complete implementation that ties everything together:

```javascript
class AutonomousInvestigationClient {
  constructor(apiBaseUrl = '/api', wsBaseUrl = 'ws://localhost:8000') {
    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = wsBaseUrl;
    this.monitor = null;
  }

  async startInvestigation(entityId, entityType = 'user_id', parallel = true) {
    try {
      // Step 1: Start the investigation
      console.log(
        `Starting ${
          parallel ? 'parallel' : 'sequential'
        } investigation for ${entityType}: ${entityId}`,
      );

      const investigationId = await this.initiateInvestigation(
        entityId,
        entityType,
      );

      if (!investigationId) {
        throw new Error('Failed to extract investigation ID from response');
      }

      console.log(`Investigation ID: ${investigationId}`);

      // Step 2: Connect to WebSocket
      const ws = await this.connectToWebSocket(investigationId, parallel);

      // Step 3: Start monitoring
      this.monitor = new InvestigationMonitor(ws);

      return {
        investigationId,
        monitor: this.monitor,
      };
    } catch (error) {
      console.error('Failed to start investigation:', error);
      throw error;
    }
  }

  async initiateInvestigation(entityId, entityType) {
    const response = await fetch(
      `${this.apiBaseUrl}/agent/start?entity_id=${entityId}&entity_type=${entityType}`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer your-jwt-token',
          'Content-Type': 'application/json',
          intuit_tid: 'your-transaction-id',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to start investigation: ${response.status}`);
    }

    const result = await response.json();
    return this.extractInvestigationId(result.agentOutput.plainText);
  }

  extractInvestigationId(plainText) {
    const match = plainText.match(/investigation[_\s]+([a-f0-9-]{36})/i);
    return match ? match[1] : null;
  }

  async connectToWebSocket(investigationId, parallel) {
    const wsUrl = `${this.wsBaseUrl}/ws/${investigationId}?parallel=${parallel}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`Connected to WebSocket: ${wsUrl}`);
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error('WebSocket connection failed:', error);
        reject(error);
      };

      // Set timeout for connection
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  stopInvestigation() {
    if (this.monitor && this.monitor.ws) {
      this.monitor.ws.close();
      this.monitor = null;
    }
  }

  // Send control messages to server
  pauseInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'pause',
          investigation_id: this.investigationId,
        }),
      );
    }
  }

  resumeInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'resume',
          investigation_id: this.investigationId,
        }),
      );
    }
  }

  cancelInvestigation() {
    if (
      this.monitor &&
      this.monitor.ws &&
      this.monitor.ws.readyState === WebSocket.OPEN
    ) {
      this.monitor.ws.send(
        JSON.stringify({
          type: 'control',
          action: 'cancel',
          investigation_id: this.investigationId,
        }),
      );
    }
  }
}

// Usage Example
async function runInvestigation() {
  const client = new AutonomousInvestigationClient();

  try {
    // Start parallel investigation
    const { investigationId, monitor } = await client.startInvestigation(
      'user123456',
      'user_id',
      true, // parallel execution
    );

    console.log(`Monitoring investigation ${investigationId}...`);

    // The monitor will automatically handle all progress updates
    // and display results as they come in
  } catch (error) {
    console.error('Investigation failed:', error);
  }
}

// Start the investigation
runInvestigation();
```

#### **Step 6: Error Handling and Best Practices**

```javascript
class RobustInvestigationClient extends AutonomousInvestigationClient {
  constructor(apiBaseUrl, wsBaseUrl) {
    super(apiBaseUrl, wsBaseUrl);
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async startInvestigationWithRetry(entityId, entityType, parallel) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.startInvestigation(entityId, entityType, parallel);
      } catch (error) {
        console.warn(`Investigation attempt ${attempt} failed:`, error.message);

        if (attempt === this.retryAttempts) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * attempt),
        );
      }
    }
  }

  async connectToWebSocket(investigationId, parallel) {
    const ws = await super.connectToWebSocket(investigationId, parallel);

    // Add reconnection logic
    ws.addEventListener('close', (event) => {
      if (event.code !== 1000) {
        // Not a normal closure
        console.log(
          'WebSocket closed unexpectedly, attempting reconnection...',
        );
        this.attemptReconnection(investigationId, parallel);
      }
    });

    return ws;
  }

  async attemptReconnection(investigationId, parallel, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Reconnection attempt ${attempt}...`);
        const ws = await super.connectToWebSocket(investigationId, parallel);

        // Update monitor with new WebSocket
        if (this.monitor) {
          this.monitor.ws = ws;
          this.monitor.setupEventHandlers();
        }

        console.log('Reconnected successfully');
        return;
      } catch (error) {
        console.warn(`Reconnection attempt ${attempt} failed:`, error.message);

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    console.error('Failed to reconnect after maximum attempts');
  }
}
```

### **UI Integration Examples**

**React Component:**

```jsx
import React, { useState, useEffect } from 'react';

const AutonomousInvestigation = ({ entityId, entityType }) => {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [results, setResults] = useState({});
  const [parallel, setParallel] = useState(true);

  const startInvestigation = async () => {
    setStatus('starting');

    const client = new AutonomousInvestigationClient();

    try {
      const { investigationId, monitor } = await client.startInvestigation(
        entityId,
        entityType,
        parallel,
      );

      setStatus('running');

      // Listen to monitor events
      monitor.onPhaseUpdate = (phase, progress, message, response) => {
        setCurrentPhase(phase);
        setProgress(progress);

        if (response) {
          setResults((prev) => ({ ...prev, [phase]: response }));
        }
      };

      monitor.onComplete = () => {
        setStatus('completed');
      };
    } catch (error) {
      setStatus('error');
      console.error('Investigation failed:', error);
    }
  };

  return (
    <div className="investigation-panel">
      <div className="controls">
        <label>
          <input
            type="checkbox"
            checked={parallel}
            onChange={(e) => setParallel(e.target.checked)}
            disabled={status === 'running'}
          />
          Parallel Execution
        </label>

        <button onClick={startInvestigation} disabled={status === 'running'}>
          {status === 'running' ? 'Running...' : 'Start Investigation'}
        </button>
      </div>

      {status === 'running' && (
        <div className="progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="status">
            Phase: {currentPhase} ({(progress * 100).toFixed(1)}%)
          </div>
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="results">
          {Object.entries(results).map(([phase, data]) => (
            <div key={phase} className="result-section">
              <h3>{phase.replace('_', ' ').toUpperCase()}</h3>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

This comprehensive guide provides everything needed to implement autonomous
investigation monitoring in client applications, with support for both parallel
and sequential execution modes.

---

## 🎭 **Demo Mode APIs**

### **POST /api/demo/{user_id}/off**

Disable demo mode for a user

**Response:**

```json
{
  "message": "Demo mode disabled for user user123456"
}
```

### **GET /api/demo/{user_id}/all**

Get all demo data for a user

**Response:**

```json
{
  "user_id": "user123456",
  "demo_mode": true,
  "network": {
    "user_id": "user123456",
    "risk_level": 0.3,
    "summary": "Demo network analysis - moderate risk detected"
  },
  "device": {
    "entity_id": "user123456",
    "risk_level": 0.4,
    "summary": "Demo device analysis - new device detected"
  },
  "location": {
    "entity_id": "user123456",
    "risk_level": 0.2,
    "summary": "Demo location analysis - consistent patterns"
  },
  "logs": {
    "entity_id": "user123456",
    "risk_level": 0.6,
    "summary": "Demo logs analysis - authentication issues detected"
  },
  "oii": {
    "user_id": "user123456",
    "profile_data": {
      "city": "Mountain View",
      "region": "CA"
    }
  }
}
```

---

## 🔧 **Additional Endpoints**

### **GET /api/oii/{user_id}**

Get Online Identity Information

**Response:**

```json
{
  "user_id": "user123456",
  "profile_data": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "verified": true,
    "account_age_days": 365,
    "last_login": "2024-01-15T10:30:00Z"
  },
  "location_info": {
    "city": "San Francisco",
    "region": "CA",
    "country": "US",
    "postal_code": "94105"
  },
  "risk_indicators": {
    "account_takeover_risk": 0.2,
    "synthetic_identity_risk": 0.1
  }
}
```

### **POST /api/splunk/job/cancel/{job_id}**

Cancel a running Splunk job

**Response:**

```json
{
  "job_id": "job123456",
  "status": "cancelled",
  "message": "Splunk job cancelled successfully",
  "cancelled_at": "2024-01-15T10:30:00Z"
}
```

---

## 🔒 **Authentication Headers**

All API requests require these headers:

```bash
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
intuit_tid: <transaction-id>
intuit_originating_assetalias: <your-asset-alias>
```

**Optional Headers:**

```bash
intuit_experience_id: <experience-identifier>
accept: application/json
user-agent: <your-application-name>
```

---

## 📊 **Common Query Parameters**

### **Required Parameters:**

- `investigation_id`: Investigation identifier (required for most analysis
  endpoints)

### **Common Optional Parameters:**

- `time_range`: Time window for data analysis
  - Format: `{number}{unit}` where unit is `d` (days) or `m` (months)
  - Examples: `7d`, `30d`, `1m`, `2m`
  - Default: `30d`
- `entity_type`: Type of entity being analyzed
  - Values: `user_id` or `device_id`
  - Default: `user_id`
- `entity_id`: The identifier for the user or device

### **Analysis-Specific Parameters:**

- `splunk_host`: Override default Splunk host
- `raw_splunk_override`: Provide raw Splunk data instead of querying
- `profile_id`: Profile ID for identity services (default: "9341450868951246")

### **Filtering Parameters:**

- `sender`: Filter comments by sender (for comment endpoints)

---

## 🚨 **Error Responses**

### **400 Bad Request**

```json
{
  "detail": "Investigation not found and entity_id is required to create it.",
  "status_code": 400
}
```

```json
{
  "detail": "Invalid time_range format: 30x. Use format like '30d' or '1m'",
  "status_code": 400
}
```

### **401 Unauthorized**

```json
{
  "detail": "Authentication failed - invalid or missing token",
  "status_code": 401
}
```

### **403 Forbidden**

```json
{
  "detail": "Access denied - insufficient permissions for this resource",
  "status_code": 403
}
```

### **404 Not Found**

```json
{
  "detail": "Investigation not found",
  "status_code": 404
}
```

### **422 Validation Error**

```json
{
  "detail": [
    {
      "loc": ["query", "entity_type"],
      "msg": "string does not match regex '^(user_id|device_id)$'",
      "type": "value_error.str.regex",
      "ctx": { "pattern": "^(user_id|device_id)$" }
    }
  ],
  "status_code": 422
}
```

### **500 Internal Server Error**

```json
{
  "detail": "Internal server error occurred during risk assessment",
  "status_code": 500
}
```

### **503 Service Unavailable**

```json
{
  "detail": "External service dependency (Splunk/Chronos) temporarily unavailable",
  "status_code": 503
}
```

---

## 📝 **Usage Examples**

### **Complete Investigation Workflow**

1. **Create Investigation:**

```bash
curl -X POST "https://olorin-api.intuit.com/api/investigation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "INV-12345",
    "entity_id": "user123456",
    "entity_type": "user_id"
  }'
```

2. **Analyze All Domains:**

```bash
# Device Analysis
curl -X GET "https://olorin-api.intuit.com/api/device/user123456?investigation_id=INV-12345&entity_type=user_id" \
  -H "Authorization: Bearer $TOKEN"

# Network Analysis
curl -X GET "https://olorin-api.intuit.com/api/network/user123456?investigation_id=INV-12345" \
  -H "Authorization: Bearer $TOKEN"

# Location Analysis
curl -X GET "https://olorin-api.intuit.com/api/location/user123456?investigation_id=INV-12345&entity_type=user_id" \
  -H "Authorization: Bearer $TOKEN"

# Logs Analysis
curl -X GET "https://olorin-api.intuit.com/api/logs/user123456?investigation_id=INV-12345" \
  -H "Authorization: Bearer $TOKEN"
```

3. **Get Overall Risk Assessment:**

```bash
curl -X GET "https://olorin-api.intuit.com/api/risk-assessment/user123456?investigation_id=INV-12345" \
  -H "Authorization: Bearer $TOKEN"
```

4. **Add Investigation Comments:**

```bash
curl -X POST "https://olorin-api.intuit.com/api/investigation/INV-12345/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "user123456",
    "entity_type": "user_id",
    "sender": "investigator",
    "text": "Risk assessment completed - moderate risk detected",
    "timestamp": 1705327800
  }'
```

5. **Update Investigation Status:**

```bash
curl -X PUT "https://olorin-api.intuit.com/api/investigation/INV-12345" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "policy_comments": "Investigation completed successfully",
    "investigator_comments": "Moderate risk - enhanced monitoring recommended"
  }'
```

---

## 🎯 **API Best Practices**

### **Rate Limiting**

- Maximum 100 requests per minute per API key
- Burst limit of 20 requests per 10 seconds
- Use exponential backoff for retries

### **Data Retention**

- Investigation data retained for 90 days
- Comment data retained for 1 year
- Demo mode data cleared after 24 hours

### **Performance Tips**

- Use appropriate `time_range` values to limit data volume
- Cache investigation IDs to avoid repeated creation calls
- Use batch endpoints when available (e.g., delete multiple investigations)

### **Security**

- Always use HTTPS endpoints
- Rotate API tokens regularly
- Validate all input parameters
- Log API usage for audit purposes

---

## 🔄 **API Versioning**

Current API version: **v1**

- Agent endpoints use `/api/v1/` prefix
- All other endpoints use `/api/` prefix
- Breaking changes will increment version number
- Deprecated endpoints supported for 6 months

---

## 📞 **Support & Contact**

For API support and questions:

- **Documentation**: [Internal Wiki](https://wiki.intuit.com/olorin-api)
- **Support Channel**: #olorin-api-support
- **On-call**: Page OLORIN-API team for production issues

---

_Last Updated: January 2024_ _Version: 1.0_
