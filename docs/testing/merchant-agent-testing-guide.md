# Merchant Agent Testing Guide

## Overview

This guide explains how to test the merchant agent and validation framework using the e2e investigation script.

## Prerequisites

1. **Backend Running**: 
   ```bash
   cd olorin-server
   poetry run uvicorn app.main:app --host 0.0.0.0 --port 8090
   ```

2. **Frontend Running** (for full e2e):
   ```bash
   cd olorin-front
   npm start
   ```

3. **Database**: Ensure Snowflake connection is configured

## Testing Methods

### Method 1: Via Investigation API (Recommended)

**Script**: `olorin-server/scripts/testing/test_merchant_via_api.py`

**Usage**:
```bash
cd olorin-server
python scripts/testing/test_merchant_via_api.py
```

**What it tests**:
- Creates investigation via API
- Waits for investigation completion
- Checks for merchant agent execution
- Verifies validation results are saved
- Checks HTML report for validation section

### Method 2: Full E2E Test (Playwright)

**Script**: `olorin-server/scripts/run_real_e2e_investigation.py`

**Usage**:
```bash
cd olorin-server
python scripts/run_real_e2e_investigation.py
```

**What it tests**:
- Full investigation through frontend UI
- Real-time progress updates
- Complete investigation lifecycle
- Merchant agent execution
- Validation framework execution

### Method 3: Direct Investigation Creation

**Via API**:
```bash
curl -X POST http://localhost:8090/api/v1/investigation-state/ \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_id": "test-merchant-001",
    "lifecycle_stage": "IN_PROGRESS",
    "status": "IN_PROGRESS",
    "settings": {
      "name": "Test Merchant Investigation",
      "entities": [{"entity_type": "user_id", "entity_value": "test_user_12345"}],
      "time_range": {
        "start_time": "2024-07-11T00:00:00Z",
        "end_time": "2025-01-11T23:59:59Z"
      },
      "investigation_type": "hybrid",
      "investigation_mode": "entity",
      "tools": [],
      "correlation_mode": "OR"
    }
  }'
```

Then poll for completion:
```bash
curl http://localhost:8090/api/v1/investigation-state/test-merchant-001
```

## What to Verify

### 1. Merchant Agent Execution

Check investigation progress JSON for merchant agent:
```json
{
  "agent_statuses": [
    {
      "agent_name": "merchant",
      "status": "completed",
      "risk_score": 0.75
    }
  ]
}
```

### 2. Validation Results File

Check investigation folder for:
```
logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
└── merchant_validation_results.json
```

File should contain:
- `validation_complete`: true
- `predicted_risk_score`: number
- `actual_fraud_rate`: number
- `prediction_correct`: boolean
- `risk_correlation_error`: number
- `validation_quality`: string

### 3. HTML Report Section

Open the comprehensive HTML report and verify:
- "Merchant Agent Validation" section exists
- Shows predicted vs actual comparison
- Displays validation quality assessment
- Shows prediction accuracy indicator

## Expected Behavior

1. **Merchant Agent Runs**: After other domain agents complete
2. **Validation Executes**: Automatically after merchant agent completes
3. **Results Saved**: `merchant_validation_results.json` in investigation folder
4. **Report Updated**: HTML report includes validation section

## Troubleshooting

### Merchant Agent Not Executing

- Check orchestration graph includes merchant agent
- Verify domain agent routing includes "merchant_agent"
- Check investigation logs for errors

### Validation Not Running

- Check Snowflake connection
- Verify historical data exists (6 months ago)
- Check investigation folder is accessible
- Review merchant agent logs for validation errors

### Validation Results Not in Report

- Verify `merchant_validation_results.json` exists
- Check report generator processes validation file
- Ensure report generation runs after investigation completes

## Success Criteria

✅ Merchant agent executes during investigation  
✅ Validation framework runs automatically  
✅ Validation results saved to file  
✅ Validation section appears in HTML report  
✅ Validation metrics are accurate  

## Next Steps

After successful testing:
1. Monitor validation quality over multiple investigations
2. Analyze validation metrics for strategy refinement
3. Adjust merchant agent logic based on validation findings
4. Expand validation to other domain agents

