# Autonomous Investigation Mode Demo

This document demonstrates how to use the new autonomous investigation mode in
the OLORIN Web Plugin.

## Overview

The autonomous investigation mode allows users to run fraud investigations
automatically using AI agents that communicate via WebSocket connections. This
mode provides real-time progress updates and allows for investigation control
(pause, resume, cancel).

## Features

### 🚀 **Autonomous Execution**

- **Parallel Mode**: All agents run simultaneously for faster results
- **Sequential Mode**: Agents run one after another for detailed step-by-step
  analysis
- **Real-time Progress**: Live updates via WebSocket connection
- **Investigation Control**: Pause, resume, or cancel investigations at any time

### 🔧 **Investigation Control**

- **Start**: Begin autonomous investigation with entity ID and type
- **Pause**: Temporarily halt the investigation
- **Resume**: Continue a paused investigation
- **Cancel**: Stop and terminate the investigation
- **Reset**: Clear results and start fresh

### 📊 **Real-time Monitoring**

- **Phase Updates**: Track current investigation phase (Network, Device, Log,
  Location, Risk Assessment)
- **Progress Tracking**: Visual progress bar with percentage completion
- **Status Updates**: Investigation status (Running, Paused, Completed, Error)
- **Live Logs**: Real-time log messages with different severity levels

## How to Use

### 1. **Toggle Autonomous Mode**

In the Investigation Page, you'll see a toggle switch at the top:

- **Manual Mode**: Traditional step-by-step investigation control
- **Autonomous Mode**: AI-powered automatic investigation

### 2. **Configure Investigation**

- **Entity ID**: Enter the user ID or device ID to investigate
- **Entity Type**: Select between "User ID" or "Device ID"
- **Execution Mode**: Choose "Parallel" or "Sequential" execution

### 3. **Start Investigation**

Click either:

- **⚡ Start Parallel**: Run all agents simultaneously
- **📝 Start Sequential**: Run agents one after another

### 4. **Monitor Progress**

Watch the real-time updates:

- **Current Phase**: Shows which analysis is currently running
- **Progress Bar**: Visual indication of completion percentage
- **Investigation ID**: Unique identifier for tracking
- **Status Indicator**: Color-coded status (Running, Paused, Completed, Error)

### 5. **Control Investigation**

During execution, you can:

- **⏸️ Pause**: Temporarily halt the investigation
- **▶️ Resume**: Continue from where you paused
- **❌ Cancel**: Stop and terminate the investigation
- **🔄 Reset**: Clear results and start over

## Technical Implementation

### WebSocket Communication

```javascript
// Example WebSocket message for phase update
{
  "phase": "network_analysis",
  "progress": 0.4,
  "message": "Analyzing network patterns for suspicious activity",
  "agent_response": {
    "risk_score": 0.3,
    "findings": ["Unusual login patterns detected"]
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### Control Messages

```javascript
// Pause investigation
{
  "type": "control",
  "action": "pause",
  "investigation_id": "12345678-1234-5678-9012-123456789012"
}

// Resume investigation
{
  "type": "control",
  "action": "resume",
  "investigation_id": "12345678-1234-5678-9012-123456789012"
}
```

### Error Handling

```javascript
// Error message format
{
  "type": "error",
  "investigation_id": "12345678-1234-5678-9012-123456789012",
  "error_code": "AGENT_FAILURE",
  "message": "Network agent failed to respond",
  "phase": "network_analysis",
  "retry_available": true
}
```

## Investigation Phases

### 1. **Initialization**

- Set up investigation parameters
- Establish WebSocket connection
- Prepare agent configurations

### 2. **Network Analysis**

- Analyze network traffic patterns
- Detect suspicious connections
- Identify anomalous behavior

### 3. **Device Analysis**

- Examine device characteristics
- Check for device fingerprinting
- Analyze device reputation

### 4. **Log Analysis**

- Process system and application logs
- Identify suspicious events
- Correlate log entries

### 5. **Location Analysis**

- Analyze geographical patterns
- Detect location anomalies
- Map device locations

### 6. **Risk Assessment**

- Calculate overall risk score
- Combine all agent findings
- Generate final assessment

## Results Display

After completion, the autonomous investigation displays:

### **Investigation Summary**

- **Overall Risk Score**: Calculated from all agent responses
- **Individual Agent Scores**: Risk scores from each analysis phase
- **Investigation Timeline**: Start and end times
- **Execution Mode**: Parallel or Sequential

### **Detailed Results**

- **Phase Results**: Detailed findings from each investigation phase
- **Risk Factors**: Specific risk indicators identified
- **Agent Thoughts**: AI reasoning behind risk assessments
- **Raw Data**: Complete API responses for further analysis

## Error Scenarios

### **Connection Errors**

- WebSocket connection failures
- Automatic reconnection attempts
- Fallback to manual mode if needed

### **Agent Failures**

- Individual agent timeout handling
- Retry mechanisms for failed agents
- Partial results display

### **Investigation Errors**

- Invalid entity ID handling
- Permission and authorization errors
- Network connectivity issues

## Best Practices

### **When to Use Autonomous Mode**

- ✅ Routine fraud investigations
- ✅ High-volume case processing
- ✅ Initial risk assessment screening
- ✅ Automated monitoring workflows

### **When to Use Manual Mode**

- ✅ Complex investigation scenarios
- ✅ Custom analysis requirements
- ✅ Step-by-step result review
- ✅ Training and educational purposes

### **Performance Optimization**

- Use **Parallel Mode** for faster results when agents are independent
- Use **Sequential Mode** when agents need to build on previous results
- Monitor WebSocket connection stability
- Handle network interruptions gracefully

## Troubleshooting

### **Common Issues**

1. **WebSocket Connection Failed**

   - Check network connectivity
   - Verify WebSocket endpoint configuration
   - Review firewall and proxy settings

2. **Investigation Stuck**

   - Use pause/resume to reset connection
   - Check agent service availability
   - Review investigation logs for errors

3. **Partial Results**

   - Some agents may fail while others succeed
   - Review individual agent error messages
   - Retry failed phases manually if needed

4. **Performance Issues**
   - Switch from Parallel to Sequential mode
   - Check system resource usage
   - Monitor WebSocket message frequency

### **Support**

For technical support or feature requests, please refer to the OLORIN API
documentation or contact the development team.

---

_This autonomous investigation mode represents a significant advancement in
automated fraud detection, providing both speed and control for modern
investigation workflows._
