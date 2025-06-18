# Autonomous Investigation Scripts

This directory contains scripts for testing the autonomous investigation flow with real-time WebSocket monitoring.

## Scripts

### 1. `run_autonomous_investigation_for_user.py`
Tests the autonomous investigation flow for a user entity with real-time WebSocket progress monitoring.

**Usage:**
```bash
python tests/run_autonomous_investigation_for_user.py
```

**Configuration:**
- Edit the `parallel_execution` variable in the script to control execution mode:
  - `parallel_execution = True` (default): Agents run simultaneously for faster completion
  - `parallel_execution = False`: Agents run sequentially (network → location → logs → device → risk)

**Features:**
- Starts autonomous investigation for user ID `4621097846089147992`
- Connects to WebSocket for real-time progress updates with parallel/sequential execution control
- Monitors all investigation phases (initialization, network analysis, location analysis, device analysis, behavior analysis, risk assessment)
- Captures complete API response data from each phase
- Generates comprehensive PDF report with investigation results
- Handles investigation ID extraction and WebSocket connection management

### 2. `run_autonomous_investigation_for_device.py`
Tests the autonomous investigation flow for a device entity with real-time WebSocket progress monitoring.

**Usage:**
```bash
# Use default device ID with parallel execution (default)
python tests/run_autonomous_investigation_for_device.py

# Run with sequential execution
python tests/run_autonomous_investigation_for_device.py --sequential

# Use custom device ID with parallel execution
python tests/run_autonomous_investigation_for_device.py --device-id f394742f39214c908476c01623bf4bcd --parallel

# Use custom API endpoints with sequential execution
python tests/run_autonomous_investigation_for_device.py --base-url http://localhost:8000/api --ws-url ws://localhost:8000/ws --sequential
```

**Command Line Options:**
- `--device-id`: Device ID to investigate (default: `f394742f39214c908476c01623bf4bcd`)
- `--base-url`: Base URL for the API (default: `http://localhost:8000/api`)
- `--ws-url`: WebSocket URL (default: `ws://localhost:8000/ws`)
- `--parallel`: Run investigation agents in parallel (default: True)
- `--sequential`: Run investigation agents sequentially (overrides --parallel)

## How It Works

### 1. Autonomous Investigation Flow
1. **Start Investigation**: Calls `POST /api/agent/start/{entity_id}` to initiate the autonomous investigation
2. **WebSocket Connection**: Connects to `/ws/{investigation_id}` for real-time updates
3. **Progress Monitoring**: Receives progress updates for each investigation phase
4. **Data Capture**: Captures complete API response data from each agent (network, location, device, logs, risk assessment)
5. **PDF Generation**: Creates comprehensive PDF report with all investigation results

### 2. Investigation Phases
The autonomous investigation flows through these phases:
- **Initialization**: Investigation setup and ID generation
- **Network Analysis**: Network risk assessment with ISP and geographic analysis
- **Location Analysis**: Geographic risk assessment with device location tracking
- **Device Analysis**: Device fingerprinting and risk assessment
- **Behavior Analysis**: Logs analysis and behavioral risk assessment
- **Risk Assessment**: Final overall risk calculation
- **Completed**: Investigation finished with final results

### 3. Execution Modes

**Parallel Execution (Default)**
- All domain agents (network, location, device, logs) run simultaneously
- Faster completion time (typically 30-60 seconds)
- WebSocket URL: `ws://localhost:8000/ws/{investigation_id}?parallel=true`
- Agents coordinate through the central fraud investigation node

**Sequential Execution**
- Agents run one after another in order: network → location → logs → device → risk
- Slower but more predictable execution (typically 2-5 minutes)
- WebSocket URL: `ws://localhost:8000/ws/{investigation_id}?parallel=false`
- Each agent completes before the next one starts

### 4. WebSocket Message Format
Each WebSocket message contains:
```json
{
  "phase": "network_analysis",
  "progress": 0.8,
  "message": "Network analysis completed with risk assessment",
  "data": {
    // Complete API response data from the agent
    "network_risk_assessment": {
      "risk_level": 0.5,
      "confidence": 0.7,
      "thoughts": "...",
      "risk_factors": ["..."]
    },
    "raw_splunk_results_count": 23,
    // ... other response fields
  }
}
```

### 5. PDF Report Generation
The scripts generate comprehensive PDF reports containing:
- Investigation summary with entity details and overall risk score
- Phase-by-phase progress tracking
- Detailed results from each analysis module
- Risk assessments with confidence scores and LLM thoughts
- Device-specific analysis (for device investigations)

## Prerequisites

1. **API Server**: Ensure the OLORIN API server is running on `localhost:8000`
2. **WebSocket Support**: The server must have WebSocket support enabled
3. **Font File**: `DejaVuSans.ttf` must be available in the project root for PDF generation
4. **Dependencies**: All required Python packages (websockets, requests, fpdf) must be installed

## Output Files

- **User Investigation**: `autonomous_investigation_user_{entity_id}.pdf`
- **Device Investigation**: `autonomous_investigation_device_{device_id}.pdf`

## Comparison with Traditional Scripts

| Feature | Traditional Scripts | Autonomous Scripts |
|---------|-------------------|-------------------|
| Investigation Type | Manual API calls | Autonomous LangGraph flow |
| Progress Monitoring | None | Real-time WebSocket updates |
| Data Collection | Sequential API calls | Parallel agent execution |
| Investigation ID | Pre-defined | Auto-generated by system |
| Real-time Updates | No | Yes, with complete API data |
| Coordination | Manual | Intelligent agent coordination |

## Troubleshooting

### WebSocket Connection Issues
- Ensure the investigation ID is correctly extracted from the agent response
- Check that the WebSocket endpoint is accessible
- Verify the investigation is actually running (check server logs)

### Missing Investigation Data
- The autonomous investigation may take time to complete
- WebSocket messages contain the real-time data as it becomes available
- Check the server logs for any agent execution errors

### PDF Generation Issues
- Ensure `DejaVuSans.ttf` font file is available
- Check that all investigation data was captured via WebSocket
- Verify the investigation completed successfully

## Example Output

```
🚀 Starting Autonomous Investigation for user_id: 4621097846089147992
============================================================

1️⃣ Starting autonomous investigation...
Status: 200
{'agentOutput': {'plainText': '...', 'outputs': []}, 'agentMetadata': {'agentTraceId': '...'}}

2️⃣ Starting WebSocket listener for real-time updates...
   Note: The real investigation ID will be captured from WebSocket messages

Connecting to WebSocket: ws://localhost:8000/ws/abc123...
✅ WebSocket connected successfully

📡 [INITIALIZATION] 10.0% - Starting investigation for user_id 4621097846089147992
🔍 Real investigation ID captured: def456-789-abc-123-456789
📡 [INITIALIZATION] 100.0% - Investigation initialized successfully
📡 [NETWORK_ANALYSIS] 10.0% - Starting network analysis...
   📊 Received detailed network_analysis data
📡 [NETWORK_ANALYSIS] 100.0% - Network analysis completed with risk assessment
📡 [LOCATION_ANALYSIS] 10.0% - Starting location analysis...
   📊 Received detailed location_analysis data
📡 [LOCATION_ANALYSIS] 100.0% - Location analysis completed with geographic risk assessment
📡 [DEVICE_ANALYSIS] 10.0% - Starting device analysis...
   📊 Received detailed device_analysis data
📡 [DEVICE_ANALYSIS] 100.0% - Device analysis completed with device risk assessment
📡 [BEHAVIOR_ANALYSIS] 10.0% - Starting logs analysis...
   📊 Received detailed behavior_analysis data
📡 [BEHAVIOR_ANALYSIS] 100.0% - Logs analysis completed with behavioral risk assessment
📡 [RISK_ASSESSMENT] 10.0% - Starting final risk assessment...
   📊 Received detailed completed data
📡 [COMPLETED] 100.0% - Investigation completed successfully with final risk assessment
🎉 Investigation completed!

4️⃣ Investigation Summary
========================================

📊 INITIALIZATION:
   10.0% - Starting investigation for user_id 4621097846089147992
   100.0% - Investigation initialized successfully

📊 NETWORK_ANALYSIS:
   10.0% - Starting network analysis...
   100.0% - Network analysis completed with risk assessment

... (other phases)

5️⃣ Generating PDF Summary...
📄 PDF summary saved as autonomous_investigation_user_4621097846089147992.pdf

✅ Autonomous investigation test completed!
📊 Total WebSocket messages received: 12
🔍 Investigation phases completed: 6
🎉 Investigation completed successfully! 