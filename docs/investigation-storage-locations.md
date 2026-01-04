# Investigation Storage Locations

This document describes where investigation logs, artifacts, and reports are saved in the Olorin server.

## Overview

The system uses **two different directory structures** depending on how investigations are created:

1. **New Structure** (via `InvestigationFolderManager`): `logs/investigations/`
2. **Legacy Structure** (via `INVESTIGATION_LOGS_DIR` env var): `investigation_logs/` (default)

## Directory Structures

### New Structure: `logs/investigations/`

**Base Directory**: `olorin-server/logs/investigations/` (default)
- Can be overridden via `InvestigationFolderManager` constructor

**Folder Naming**: `{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`
- Example: `LIVE_unified_test_account_takeover_1757296960_20250907_220236/`

**Folder Contents**:
```
{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
├── investigation.log              # Main investigation log (JSONL format)
├── structured_activities.jsonl    # Agent activities log
├── journey_tracking.json          # Journey tracking data
├── metadata.json                  # Investigation metadata
├── server_logs                    # Server logs during investigation
├── comprehensive_investigation_report.html  # Generated HTML report (when /generate is called)
├── thought_process_*.json         # Agent thought processes
└── results/                       # Investigation results directory
    ├── investigation_result.json
    ├── agent_results.json
    ├── validation_results.json
    ├── performance_metrics.json
    └── journey_data.json
```

**Implementation**: `app/service/logging/investigation_folder_manager.py`
- Default base: `Path("logs/investigations")`
- Creates standardized folder structure
- Tracks active investigations

### Legacy Structure: `investigation_logs/`

**Base Directory**: `investigation_logs/` (default, relative to server root)
- Can be overridden via `INVESTIGATION_LOGS_DIR` environment variable

**Folder Naming**: `{investigation_id}/`
- Example: `unified_test_account_takeover_1757296960/`

**Folder Contents**:
```
{investigation_id}/
├── comprehensive_investigation_report.html  # Generated HTML report
└── [various log files depending on logger used]
```

**Implementation**: Used by `app/service/report_service.py`
- Default: `os.getenv("INVESTIGATION_LOGS_DIR", "investigation_logs")`
- Used when calling `/api/v1/reports/investigation/generate`

## Report Generation Flow

### When `/api/v1/reports/investigation/generate` is Called

1. **Endpoint**: `POST /api/v1/reports/investigation/generate`
   - Location: `app/router/reports_router.py:185-210`

2. **Service Method**: `ReportService.generate_investigation_report()`
   - Location: `app/service/report_service.py:262-318`
   - Base directory: `os.getenv("INVESTIGATION_LOGS_DIR", "investigation_logs")`
   - Expected folder: `{INVESTIGATION_LOGS_DIR}/{investigation_id}/`

3. **Report Generator**: `ComprehensiveInvestigationReportGenerator.generate_comprehensive_report()`
   - Location: `app/service/reporting/comprehensive_investigation_report.py:75-118`
   - Output file: `{investigation_folder}/comprehensive_investigation_report.html`
   - Default filename: `comprehensive_investigation_report.html`

4. **Report Location**: 
   ```
   {INVESTIGATION_LOGS_DIR}/{investigation_id}/comprehensive_investigation_report.html
   ```
   - Default: `investigation_logs/{investigation_id}/comprehensive_investigation_report.html`

## Investigation Logs and Artifacts

### During Investigation Execution

**InvestigationFolderManager** (New Structure):
- Base: `logs/investigations/`
- Creates: `{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`
- Files saved:
  - `investigation.log` - Main log (via `InvestigationLogWriter`)
  - `structured_activities.jsonl` - Agent activities
  - `journey_tracking.json` - Journey data
  - `metadata.json` - Investigation metadata
  - `server_logs` - Server log capture
  - `results/` - Investigation results

**Legacy Log Writers**:
- `InvestigationLogWriter`: `./investigation_logs/` (default)
- `InvestigationInstrumentationLogger`: `./investigation_logs/` (default)

### Artifacts Saved During Execution

1. **Thought Processes**: 
   - Location: Investigation folder root (if folder manager available)
   - Filename: `thought_process_{investigation_id}_{agent_name}_{timestamp}.json`
   - Implementation: `app/service/agent/chain_of_thought_logger.py:691-724`

2. **Investigation Results**:
   - Location: `{investigation_folder}/results/`
   - Files:
     - `investigation_result.json`
     - `agent_results.json`
     - `validation_results.json`
     - `performance_metrics.json`
     - `journey_data.json`
   - Implementation: `scripts/testing/unified_ai_investigation_test_runner.py:3081-3125`

3. **Server Logs**:
   - Location: `{investigation_folder}/server_logs`
   - Captured during investigation execution
   - Implementation: `app/service/logging/server_log_capture.py`

## Key Files and Locations

### Configuration Files

1. **InvestigationFolderManager** (`app/service/logging/investigation_folder_manager.py`):
   - Default base: `Path("logs/investigations")`
   - Can be overridden in constructor

2. **ReportService** (`app/service/report_service.py`):
   - Uses: `os.getenv("INVESTIGATION_LOGS_DIR", "investigation_logs")`
   - Line 279: Base directory resolution
   - Line 280: Investigation folder path

3. **ComprehensiveInvestigationReportGenerator** (`app/service/reporting/comprehensive_investigation_report.py`):
   - Line 96: Default output path: `investigation_folder / "comprehensive_investigation_report.html"`
   - Line 110: Writes HTML report to file

### Router Endpoints

1. **Report Generation**: `app/router/reports_router.py:185-210`
   - Endpoint: `POST /api/v1/reports/investigation/generate`
   - Calls: `ReportService.generate_investigation_report()`

2. **Report Retrieval**: `app/router/reports_router.py:249-278`
   - Endpoint: `GET /api/v1/reports/investigation/{investigation_id}/html`
   - Reads: `{INVESTIGATION_LOGS_DIR}/{investigation_id}/comprehensive_investigation_report.html`

## Important Notes

### Directory Structure Compatibility

✅ **The directory mismatch has been fixed!**

The report service now supports **both directory structures**:

1. **New Structure** (via `InvestigationFolderManager`): 
   - First attempts to locate folders using `InvestigationFolderManager.get_investigation_folder()`
   - Supports folders with format: `logs/investigations/{MODE}_{ID}_{TIMESTAMP}/`

2. **Legacy Structure** (via `INVESTIGATION_LOGS_DIR`):
   - Falls back to legacy structure if not found in new structure
   - Supports folders with format: `investigation_logs/{investigation_id}/`
   - Also searches for folders containing the investigation_id in the name

### Implementation Details

**Updated Methods:**

1. **`ReportService.generate_investigation_report()`**:
   - Uses `InvestigationFolderManager` to locate folders first
   - Falls back to legacy structure with search capability
   - Works with both folder naming conventions

2. **`ReportService.list_investigation_reports()`**:
   - Scans both `logs/investigations/` and `investigation_logs/` directories
   - Extracts investigation_id from metadata.json when available
   - Parses folder names to extract investigation_id from `{MODE}_{ID}_{TIMESTAMP}` format
   - Prevents duplicate entries

3. **`GET /api/v1/reports/investigation/{investigation_id}/html`**:
   - Uses same folder resolution logic as report generation
   - Supports both directory structures

### Recommendations

1. **Environment Variable**:
   - Set `INVESTIGATION_LOGS_DIR` if you want to use a custom legacy location
   - Default is `investigation_logs/` (relative to server root)

2. **Folder Resolution**:
   - The system automatically searches both structures
   - New investigations should use `InvestigationFolderManager` for consistency
   - Legacy investigations continue to work without changes

## Summary

| Item | Location | Default Path |
|------|----------|--------------|
| **New Investigation Folders** | `logs/investigations/` | `olorin-server/logs/investigations/` |
| **Legacy Investigation Folders** | `investigation_logs/` | `olorin-server/investigation_logs/` |
| **Generated Reports** | `{investigation_folder}/comprehensive_investigation_report.html` | `investigation_logs/{id}/comprehensive_investigation_report.html` |
| **Investigation Results** | `{investigation_folder}/results/` | `logs/investigations/{MODE}_{ID}_{TS}/results/` |
| **Investigation Logs** | `{investigation_folder}/investigation.log` | `logs/investigations/{MODE}_{ID}_{TS}/investigation.log` |
| **Metadata** | `{investigation_folder}/metadata.json` | `logs/investigations/{MODE}_{ID}_{TS}/metadata.json` |

