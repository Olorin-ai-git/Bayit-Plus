# Server Log Tracing for Investigations

## Overview

The Olorin investigation system now automatically captures and saves server logs during investigation execution. This provides a complete audit trail of what happened on the server during each investigation, making debugging and analysis much easier.

## How It Works

When an investigation runs, the system:

1. **Starts Log Capture**: Creates a custom log handler that intercepts all server logs
2. **Captures Logs**: Stores all log messages during investigation execution 
3. **Saves to Investigation Folder**: When investigation completes, saves all captured logs to a `server_logs` file in the investigation folder

## Investigation Folder Structure

Each investigation now has the following standardized structure:

```
{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
├── investigation.log              # Main investigation log
<<<<<<< HEAD
├── autonomous_activities.jsonl    # Agent activities log  
=======
├── structured_activities.jsonl    # Agent activities log  
>>>>>>> 001-modify-analyzer-method
├── journey_tracking.json          # Journey tracking data
├── metadata.json                  # Investigation metadata
├── server_logs                    # 🆕 Server logs during investigation
└── results/                       # Investigation results
```

## Server Logs File Format

The `server_logs` file contains JSON data with:

```json
{
  "investigation_id": "unified_test_device_spoofing_1694278836",
  "capture_session": {
    "start_time": "2025-09-09T21:05:45.123456+00:00",
    "end_time": "2025-09-09T21:07:32.654321+00:00", 
    "duration_seconds": 107.53,
    "total_log_count": 1247,
    "level_counts": {
      "DEBUG": 856,
      "INFO": 298,
      "WARNING": 67,
      "ERROR": 24,
      "CRITICAL": 2
    }
  },
  "server_logs": [
    {
      "timestamp": "2025-09-09T21:05:45.124000+00:00",
      "level": "INFO",
      "logger_name": "app.service.agent.orchestration", 
<<<<<<< HEAD
      "message": "Starting autonomous investigation for device_spoofing scenario",
=======
      "message": "Starting structured investigation for device_spoofing scenario",
>>>>>>> 001-modify-analyzer-method
      "thread_id": "140234567890",
      "process_id": "12345",
      "source_file": "/path/to/file.py",
      "line_number": 142,
      "extra_data": {
        "module": "orchestration",
        "funcName": "start_investigation",
        "investigation_id": "unified_test_device_spoofing_1694278836"
      }
    }
    // ... more log entries
  ]
}
```

## Key Features

### Automatic Integration
- **No Manual Setup**: Log capture starts/stops automatically with investigations
- **Zero Configuration**: Works out-of-the-box with existing investigation workflow
- **Thread Safe**: Handles multiple concurrent investigations safely

### Complete Coverage
- **All Server Logs**: Captures logs from all components (FastAPI, agents, tools, etc.)
- **All Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Rich Metadata**: Includes timestamps, source files, line numbers, thread/process info

### Performance Optimized
- **Background Processing**: Logs processed in separate thread to avoid blocking
- **Memory Efficient**: Uses queues to handle high-volume logging
- **Automatic Cleanup**: Cleans up resources when investigation completes

## Usage Examples

### Manual Usage (for custom scripts)

```python
from app.service.logging.server_log_capture import capture_server_logs
from pathlib import Path

investigation_id = "my_custom_investigation"
investigation_folder = Path("logs/investigations/my_investigation")

# Context manager automatically handles start/stop
with capture_server_logs(investigation_id, investigation_folder):
    # Your investigation code here
    logger.info("Running custom investigation")
    # Server logs are automatically captured
# Logs saved to investigation_folder/server_logs
```

### Checking Capture Status

```python
from app.service.logging.server_log_capture import get_server_log_capture

capture = get_server_log_capture()

# Check if capturing logs for an investigation
is_active = capture.is_capturing("investigation_123")

# Get capture statistics
stats = capture.get_capture_stats("investigation_123") 
# Returns: {"logs_captured": 1247, "duration_seconds": 107.5, ...}
```

## Integration Points

<<<<<<< HEAD
### Unified Autonomous Test Runner
The `unified_autonomous_test_runner.py` automatically:
=======
### Unified Structured Test Runner
The `unified_structured_test_runner.py` automatically:
>>>>>>> 001-modify-analyzer-method
- Starts server log capture when investigation folder is created
- Stops capture and saves logs when investigation completes (success or failure)
- Logs capture status and file location

### Investigation Folder Manager  
The `investigation_folder_manager.py` includes `server_logs` in standardized file paths:

```python
file_paths = folder_manager.get_log_file_paths(investigation_id)
server_logs_path = file_paths["server_logs"]
```

## Benefits

### Debugging
- **Complete Context**: See exactly what the server was doing during investigation
- **Error Tracking**: Full stack traces and error details captured
- **Timeline**: Correlate investigation events with server activity

### Audit Trail
- **Compliance**: Complete record of server activity during investigations
- **Forensics**: Detailed logs for post-investigation analysis
- **Performance**: Identify bottlenecks and optimization opportunities

### Development
- **Testing**: Verify server behavior during test investigations
- **Monitoring**: Track system health during automated testing
- **Troubleshooting**: Quick access to server logs for failed investigations

## Troubleshooting

### Server Logs File Not Created
1. Check if investigation folder exists and is writable
2. Verify log capture was started before investigation began
3. Look for error messages about log processing threads

### Missing Log Entries
1. Ensure investigation ran long enough for logs to be processed
2. Check if specific loggers have different log levels set
3. Verify log handlers weren't removed by other code

### Performance Issues
1. High log volume can impact performance - consider adjusting log levels
2. Log processing thread should handle most overhead automatically
3. Monitor queue sizes during investigation if concerned about memory

## Technical Implementation

### Components
- `ServerLogCapture`: Main capture manager class
- `LogCaptureSession`: Individual investigation capture session
- `InvestigationLogHandler`: Custom logging handler for capture
- `ServerLogEntry`: Data structure for individual log entries

### Threading Model
- Main thread: Runs investigation, starts/stops capture
- Background thread: Processes log queue, stores entries
- Logging thread: Emits logs via custom handler to queue

### Error Handling
- Non-blocking log processing to avoid investigation delays
- Graceful degradation if log capture fails
- Automatic cleanup on investigation completion or failure

---

*For more information about the investigation system, see the [Investigation Architecture Documentation](diagrams/investigation-system-architecture.md).*