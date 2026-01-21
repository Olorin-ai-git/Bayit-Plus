# Investigation-Level Comparison Implementation

## Overview

The comparison feature has been updated to support **investigation-level comparison** - comparing investigation results (risk scores and LLM insights) rather than transaction-level fraud detection metrics.

## What Changed

### Backend

1. **New Service**: `investigation_comparison_service.py`
   - Compares two investigations by their investigation IDs
   - Extracts investigation-level metrics:
     - `overall_risk_score` (0.0-1.0)
     - Domain risk scores: `device_risk_score`, `location_risk_score`, `network_risk_score`, `logs_risk_score`
     - LLM insights: `device_llm_thoughts`, `location_llm_thoughts`, `network_llm_thoughts`, `logs_llm_thoughts`
   - Computes deltas between investigations
   - Generates human-readable summary

2. **New API Endpoint**: `POST /api/investigation/compare/investigations`
   - Accepts `InvestigationComparisonRequest` with two investigation IDs
   - Returns comparison results with metrics, deltas, and summary

3. **Updated Models**: Added `InvestigationComparisonRequest` model

### Frontend

1. **Updated Comparison Service**: Added `compareInvestigations()` method
   - Calls the new investigation-level comparison endpoint
   - Returns investigation comparison results

2. **Updated Comparison Page**: 
   - Detects when investigation IDs are present in URL params
   - Automatically uses investigation-level comparison endpoint
   - Falls back to transaction-level comparison for backward compatibility

3. **Updated Investigations Management Page**:
   - When comparing investigations, navigates to comparison page with investigation IDs
   - Uses investigation-level comparison instead of transaction-level

## Usage

### Comparing Investigations from Management Page

1. Select exactly 2 investigations in the investigations-management page
2. Click "Compare (2)" button
3. System navigates to `/compare?invA=<id>&invB=<id>&...`
4. Comparison page automatically calls investigation-level comparison endpoint
5. Results show investigation metrics (risk scores, LLM insights) comparison

### API Usage

```bash
POST /api/investigation/compare/investigations
{
  "investigation_id_a": "inv-123",
  "investigation_id_b": "inv-456"
}
```

Response:
```json
{
  "investigation_a": {
    "id": "inv-123",
    "entity_type": "email",
    "entity_id": "kuku@gmail.com",
    "metrics": {
      "overall_risk_score": 0.86,
      "device_risk_score": 0.75,
      "location_risk_score": 0.90,
      "network_risk_score": 0.82,
      "logs_risk_score": 0.88,
      "device_llm_thoughts": "...",
      "location_llm_thoughts": "...",
      ...
    },
    "time_window": {
      "from": "2025-01-01T00:00:00Z",
      "to": "2025-01-15T00:00:00Z"
    }
  },
  "investigation_b": {
    "id": "inv-456",
    "entity_type": "email",
    "entity_id": "kuku@gmail.com",
    "metrics": {
      "overall_risk_score": 0.72,
      ...
    },
    "time_window": {
      "from": "2024-07-01T00:00:00Z",
      "to": "2024-07-15T00:00:00Z"
    }
  },
  "deltas": {
    "overall_risk_score": 0.14,
    "device_risk_score": 0.05,
    ...
  },
  "summary": "Comparison of investigations for email:kuku@gmail.com. Overall risk score increased from 0.72 to 0.86 (+0.14)..."
}
```

## Benefits

1. **Validates Investigation Methodology**: Compares how investigations performed for the same entity at different times
2. **Risk Score Tracking**: See how risk scores changed over time
3. **LLM Insights Comparison**: Compare LLM-generated insights between investigations
4. **Domain-Level Analysis**: Compare risk scores across different domains (device, location, network, logs)

## Backward Compatibility

- Transaction-level comparison (`/api/investigation/compare`) still works
- Comparison page automatically detects which type of comparison to use
- Existing transaction-level comparison workflows remain unchanged

## Next Steps

1. Update comparison page UI to display investigation-level metrics properly
2. Add visualization for risk score changes over time
3. Add side-by-side LLM insights comparison view
4. Add domain-level risk score comparison charts

