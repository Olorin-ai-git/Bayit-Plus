# Autonomous Investigation Testing System

Complete testing framework for autonomous investigation capabilities in olorin-server with comprehensive logging, real-time monitoring, and curl-based triggering.

## 🚀 Quick Start

### Prerequisites

1. **Start olorin-server:**
   ```bash
   cd olorin-server
   poetry run python -m app.local_server
   # or
   npm run olorin
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:8000/health
   ```

### Run Tests

#### Test Single Scenario
```bash
./run_autonomous_test.sh device_spoofing
```

#### Test All Scenarios
```bash
./run_autonomous_test.sh --all
```

#### Verbose Output
```bash
./run_autonomous_test.sh device_spoofing --verbose
```

## 📋 Available Test Scenarios

### Fraud Scenarios
- **`device_spoofing`** - Fraudster using spoofed device fingerprint
- **`impossible_travel`** - User appearing in impossible locations

### Legitimate Scenarios  
- **`normal_behavior`** - Legitimate user with typical patterns

## 🛠️ Manual Curl Testing

### Start Investigation
```bash
curl -X POST "http://localhost:8000/autonomous/start_investigation" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "USER_12345",
    "entity_type": "user_id",
    "scenario": "device_spoofing",
    "enable_verbose_logging": true,
    "enable_journey_tracking": true,
    "enable_chain_of_thought": true
  }'
```

### Monitor Progress
```bash
curl "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/status"
```

### Get Comprehensive Logs
```bash
curl "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/logs"
```

### Get LangGraph Journey
```bash
curl "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/journey"
```

## 🔍 What Gets Tested

### 1. Investigation Execution
- ✅ Curl-based investigation triggering
- ✅ Real-time progress monitoring
- ✅ Investigation completion verification
- ✅ Error handling and recovery

### 2. Verbose Logging System
- ✅ **LLM Interactions** - Complete prompts, responses, token usage
- ✅ **Agent Decisions** - Decision-making process and reasoning
- ✅ **Tool Executions** - Tool selection and execution results
- ✅ **Investigation Progress** - Phase transitions and milestones

### 3. LangGraph Journey Tracking
- ✅ **Node Execution** - Every node with timing and state changes
- ✅ **State Transitions** - State flow between nodes
- ✅ **Agent Coordination** - Agent handoffs and collaboration
- ✅ **Journey Visualization** - Complete investigation flow

### 4. Agent Chain of Thought
- ✅ **Reasoning Steps** - Step-by-step agent reasoning
- ✅ **Tool Selection Logic** - Why agents choose specific tools
- ✅ **Confidence Assessment** - Agent confidence in decisions
- ✅ **Collaborative Thinking** - Inter-agent coordination reasoning

## 📊 Test Reports

Test reports are automatically generated in `logs/test_runs/` with:

- **Executive Summary** - Pass rates and quality scores
- **Individual Results** - Per-scenario detailed analysis
- **Performance Metrics** - Execution times and resource usage
- **Quality Assessment** - Logging and journey tracking validation

### Sample Report Structure
```markdown
# Autonomous Investigation Test Report
Generated: 2025-08-29T14:30:00Z

## Executive Summary
- **Total Scenarios Tested:** 3
- **Pass Rate:** 100.0%
- **Average Quality Score:** 87.5/100

### Quality Distribution
- Excellent (≥90): 1
- Good (70-89): 2
- Fair (50-69): 0
- Poor (<50): 0

## Individual Test Results
### 1. device_spoofing ✅
- **Status:** completed
- **Overall Score:** 92/100
- **Execution Time:** 18.3s
```

## 🏗️ Architecture Overview

### Mock Data System
```
app/test/data/mock_transactions/
├── fraud_scenarios/           # Realistic fraud patterns
│   ├── device_spoofing.json
│   └── impossible_travel.json
├── legitimate_scenarios/      # Normal user behavior
│   └── normal_behavior.json
└── mock_data_loader.py       # Data loading and validation
```

### Logging Infrastructure
```
app/service/logging/
└── autonomous_investigation_logger.py  # Comprehensive interaction logging
```

### Journey Tracking
```
app/service/agent/
├── journey_tracker.py              # LangGraph node tracking
└── chain_of_thought_logger.py      # Agent reasoning capture
```

### API Endpoints
```
app/router/
└── autonomous_investigation_router.py  # REST API for testing
```

## 🔧 Advanced Usage

### Custom Investigation Request
```bash
curl -X POST "http://localhost:8000/autonomous/start_investigation" \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_id": "CUSTOM_TEST_001",
    "entity_id": "CUSTOM_USER_789",
    "entity_type": "user_id",
    "enable_verbose_logging": true,
    "enable_journey_tracking": true,
    "enable_chain_of_thought": true,
    "investigation_priority": "critical",
    "metadata": {
      "test_type": "performance_benchmark",
      "custom_parameter": "value"
    }
  }'
```

### Real-time WebSocket Monitoring
```javascript
const ws = new WebSocket('ws://localhost:8000/autonomous/investigation/INVESTIGATION_ID/monitor');
ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    console.log('Investigation Update:', update);
};
```

### Python API Usage
```python
from app.test.autonomous_investigation_test_runner import AutonomousInvestigationTestRunner

async def custom_test():
    async with AutonomousInvestigationTestRunner() as runner:
        result = await runner.run_single_scenario_test("device_spoofing", verbose=True)
        print(f"Test Score: {result['overall_score']}/100")
```

## 📝 Logs and Output

### Log Locations
- **Investigation Logs:** `logs/autonomous_investigations/`
- **Journey Tracking:** `logs/journey_tracking/`
- **Chain of Thought:** `logs/chain_of_thought/`
- **Test Reports:** `logs/test_runs/`

### Log Formats
- **Structured JSON** for programmatic analysis
- **Human-readable** console output with colors
- **Mermaid diagrams** for journey visualization

## 🐛 Troubleshooting

### Server Not Accessible
```bash
# Check if server is running
curl http://localhost:8000/health

# Start server if needed
cd olorin-server
poetry run python -m app.local_server
```

### Investigation Timeout
- Default timeout: 5 minutes
- Check server logs for errors
- Verify mock data scenarios are loading correctly

### Missing Dependencies
```bash
# Install test dependencies
poetry install
# or
pip3 install aiohttp asyncio
```

### Permission Issues
```bash
# Make scripts executable
chmod +x run_autonomous_test.sh
chmod +x app/test/autonomous_investigation_test_runner.py
```

## 🎯 Key Features Demonstrated

1. **Complete Autonomous Investigation** - End-to-end testing from curl trigger to completion
2. **Comprehensive Logging** - Every LLM call, agent decision, and tool execution logged
3. **Real-time Monitoring** - WebSocket updates and REST API status checks
4. **Journey Visualization** - Complete LangGraph flow tracking with state transitions
5. **Agent Reasoning** - Chain of thought capture for all agent decisions
6. **Quality Validation** - Automated scoring and validation against expected outcomes
7. **Production Readiness** - Full audit trail and monitoring for production deployment

## 📚 Additional Resources

- **Mock Data Examples:** See `app/test/data/mock_transactions/fraud_scenarios/`
- **API Documentation:** Server auto-generates docs at `http://localhost:8000/docs`
- **Log Analysis:** Use structured logs for custom analysis and debugging
- **Performance Tuning:** Monitor execution metrics in test reports

---

**🎉 Ready to test autonomous investigations with complete visibility and comprehensive logging!**