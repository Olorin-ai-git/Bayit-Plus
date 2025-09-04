# Enhanced WebSocket Progress Updates with API Responses

## Overview
The WebSocket progress updates now include the complete API response data from each agent, matching the individual API call responses.

## Connection Parameters
The WebSocket endpoint supports a `parallel` query parameter to control investigation execution:

```javascript
// Parallel execution (default) - agents run simultaneously
const ws = new WebSocket('ws://localhost:8090/ws/investigation-id?parallel=true');

// Sequential execution - agents run one after another
const ws = new WebSocket('ws://localhost:8090/ws/investigation-id?parallel=false');
```

**Execution Modes:**
- **Parallel (default)**: All domain agents (network, location, device, logs) run simultaneously for faster completion
- **Sequential**: Agents run in order: network → location → logs → device → risk assessment

## Example WebSocket Messages

### 1. Investigation Initialization
```json
{
  "phase": "initialization",
  "progress": 0.1,
  "message": "Starting investigation for user_id 4621097846089147992",
  "data": null
}
```

### 2. Network Analysis Completion
```json
{
  "phase": "network_analysis",
  "progress": 1.0,
  "message": "Network analysis completed with risk assessment",
  "agent_response": {
    "userId": "4621097846089147992",
    "investigationId": "INV-12345",
    "extracted_network_signals": [
      {
        "entity_id": "4621097846089147992",
        "timestamp": "2025-05-15T07:08:47.527-07:00",
        "ip_address": "192.168.1.1",
        "country": "US",
        "city": "Mountain View",
        "isp": "olorin inc.",
        "organization": "Olorin Inc"
      }
    ],
    "network_risk_assessment": {
      "risk_level": 0.5,
      "risk_factors": [
        "Multiple ISPs detected (one likely India-based, one US-based) within a short time"
      ],
      "anomaly_details": [
        "Rapid ISP change from 'bharti airtel ltd.' to 'olorin inc.' within roughly one hour"
      ],
      "confidence": 0.7,
      "summary": "Network signals show potential geographic inconsistency due to different ISPs possibly from different countries in a short timespan.",
      "thoughts": "The user appears to switch quickly between Bharti Airtel (India-based ISP) and Olorin Inc. (US-based ISP). This might indicate legitimate corporate VPN use or rapid geolocation change.",
      "timestamp": "2025-05-15T07:08:47.527-07:00"
    },
    "num_network_signals": 23,
    "splunk_warning": null
  },
  "timestamp": "2025-05-15T07:08:47.527-07:00"
}
```

### 3. Location Analysis Completion
```json
{
  "phase": "location_analysis",
  "progress": 1.0,
  "message": "Location analysis completed with geographic risk assessment",
  "agent_response": {
    "entity_id": "4621097846089147992",
    "investigation_id": "INV-12345",
    "device_locations": [
      {
        "fuzzy_device_id": "f394742f39214c908476c01623bf4bcd",
        "timestamp": "2025-05-15T07:08:47.527-07:00",
        "cities": ["Bengaluru", "Mountain View"],
        "countries": ["IN", "US"]
      }
    ],
    "location_risk_assessment": {
      "risk_level": 0.6,
      "risk_factors": [
        "Geographic inconsistency detected",
        "Multiple countries accessed within short timeframe"
      ],
      "confidence": 0.8,
      "summary": "User accessed from multiple geographic locations indicating potential account compromise",
      "thoughts": "The rapid geographic changes between India and US suggest either legitimate travel or potential fraudulent access.",
      "timestamp": "2025-05-15T07:08:47.527-07:00"
    },
    "num_location_signals": 15,
    "oii_locations": []
  },
  "timestamp": "2025-05-15T07:08:47.527-07:00"
}
```

### 4. Device Analysis Completion
```json
{
  "phase": "device_analysis",
  "progress": 1.0,
  "message": "Device analysis completed with device risk assessment",
  "agent_response": {
    "entity_id": "4621097846089147992",
    "investigation_id": "INV-12345",
    "retrieved_signals": [
      {
        "fuzzy_device_id": "f394742f39214c908476c01623bf4bcd",
        "tm_smartid": "smart123",
        "cities": ["Bengaluru", "Mountain View"],
        "countries": ["IN", "US"],
        "timestamp": "2025-05-15T07:08:47.527-07:00"
      }
    ],
    "llm_assessment": {
      "risk_level": 0.8,
      "risk_factors": [
        "Multiple devices detected",
        "Cross-country device usage",
        "Rapid device switching"
      ],
      "confidence": 0.9,
      "summary": "High risk device activity with multiple devices across different countries",
      "thoughts": "The user is using multiple devices across different geographic locations which is highly suspicious for fraud.",
      "timestamp": "2025-05-15T07:08:47.527-07:00"
    },
    "num_device_signals": 8,
    "splunk_warning": null
  },
  "timestamp": "2025-05-15T07:08:47.527-07:00"
}
```

### 5. Behavior Analysis (Logs) Completion
```json
{
  "phase": "behavior_analysis",
  "progress": 1.0,
  "message": "Logs analysis completed with behavioral risk assessment",
  "agent_response": {
    "entity_id": "4621097846089147992",
    "investigation_id": "INV-12345",
    "parsed_logs": [
      {
        "olorin_userid": "4621097846089147992",
        "originating_ips": ["192.168.1.1", "10.0.0.1"],
        "cities": ["Bengaluru", "Mountain View"],
        "transaction": ["login_success", "login_failed"],
        "timestamp": "2025-05-15T07:08:47.527-07:00"
      }
    ],
    "logs_risk_assessment": {
      "risk_level": 0.4,
      "risk_factors": [
        "Multiple IP addresses in authentication logs",
        "Failed login attempts detected"
      ],
      "confidence": 0.6,
      "summary": "Moderate behavioral risk with some authentication anomalies",
      "thoughts": "Authentication patterns show some irregularities but within acceptable bounds for a traveling user.",
      "timestamp": "2025-05-15T07:08:47.527-07:00"
    },
    "num_log_entries": 45,
    "chronos_entities": []
  },
  "timestamp": "2025-05-15T07:08:47.527-07:00"
}
```

### 6. Final Risk Assessment Completion
```json
{
  "phase": "completed",
  "progress": 1.0,
  "message": "Investigation completed successfully with final risk assessment",
  "agent_response": {
    "investigation_id": "INV-12345",
    "entity_id": "4621097846089147992",
    "overall_risk_score": 0.65,
    "risk_breakdown": {
      "network_risk": 0.5,
      "location_risk": 0.6,
      "device_risk": 0.8,
      "behavior_risk": 0.4
    },
    "final_assessment": {
      "risk_level": 0.65,
      "risk_category": "HIGH",
      "risk_factors": [
        "Cross-country device usage",
        "Multiple ISP changes",
        "Geographic inconsistencies",
        "Multiple devices detected"
      ],
      "confidence": 0.85,
      "summary": "High risk investigation with multiple fraud indicators across device, network, and location domains",
      "thoughts": "The combination of rapid geographic changes, multiple devices, and ISP switching strongly suggests fraudulent activity.",
      "timestamp": "2025-05-15T07:08:47.527-07:00"
    },
    "investigation_summary": {
      "total_signals_analyzed": 91,
      "domains_analyzed": ["network", "location", "device", "behavior"],
      "duration_seconds": 45.2,
      "status": "completed"
    }
  },
  "timestamp": "2025-05-15T07:08:47.527-07:00"
}
```

## Client Implementation Example

```javascript
const ws = new WebSocket(`ws://localhost:8090/ws/${investigationId}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  console.log(`Phase: ${update.phase}, Progress: ${update.progress * 100}%`);
  console.log(`Message: ${update.message}`);
  
  if (update.agent_response) {
    // Full API response available for processing
    console.log('Agent Response:', update.agent_response);
    
    // Extract specific data based on phase
    switch (update.phase) {
      case 'network_analysis':
        const networkRisk = update.agent_response.network_risk_assessment;
        updateNetworkRiskUI(networkRisk);
        break;
        
      case 'location_analysis':
        const locationRisk = update.agent_response.location_risk_assessment;
        updateLocationRiskUI(locationRisk);
        break;
        
      case 'device_analysis':
        const deviceRisk = update.agent_response.llm_assessment;
        updateDeviceRiskUI(deviceRisk);
        break;
        
      case 'behavior_analysis':
        const behaviorRisk = update.agent_response.logs_risk_assessment;
        updateBehaviorRiskUI(behaviorRisk);
        break;
        
      case 'completed':
        const finalAssessment = update.agent_response.final_assessment;
        updateFinalRiskUI(finalAssessment);
        break;
    }
  }
};
```

## Benefits

1. **Real-time Data Access**: Clients receive complete API responses as they're generated
2. **Consistent Format**: WebSocket updates match individual API endpoint responses
3. **Rich Progress Updates**: Both progress tracking and actual data in one message
4. **Flexible Client Processing**: Clients can process data immediately or store for later
5. **Debugging Support**: Full response data available for troubleshooting 