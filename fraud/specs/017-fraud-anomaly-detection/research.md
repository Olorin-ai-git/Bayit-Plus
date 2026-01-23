# Research: Fraud Anomaly Detection Service

**Feature**: Fraud Anomaly Detection  
**Date**: 2025-11-09  
**Status**: Complete

## Overview

This document consolidates research findings and decisions for implementing the Fraud Anomaly Detection service, resolving all technical unknowns and establishing implementation patterns.

## Research Tasks & Findings

### 1. STL+MAD Detector Implementation

**Decision**: Use `statsmodels.tsa.seasonal.STL` with robust=True and MAD-based scoring

**Rationale**:
- `statsmodels` provides production-ready STL decomposition with robust option for outlier handling
- MAD (Median Absolute Deviation) is robust to outliers, suitable for fraud detection
- Period of 7 days (672 windows at 15-minute granularity) captures weekly seasonality patterns
- Score calculation: `|residual| / (1.4826 * MAD)` provides normalized anomaly scores

**Alternatives Considered**:
- Simple moving average: Rejected - doesn't handle seasonality
- Exponential smoothing: Rejected - less robust to outliers than STL
- Z-score: Rejected - assumes normal distribution, MAD is more robust

**Implementation Pattern**:
```python
from statsmodels.tsa.seasonal import STL
import numpy as np

def score_stl_mad(series: np.ndarray, period: int = 672) -> np.ndarray:
    res = STL(series, period=period, robust=True).fit()
    residuals = series - (res.trend + res.seasonal)
    mad = np.median(np.abs(residuals - np.median(residuals))) or 1e-9
    return np.abs(residuals) / (1.4826 * mad)
```

### 2. CUSUM Detector Implementation

**Decision**: Implement CUSUM (Cumulative Sum) with configurable delta and threshold

**Rationale**:
- CUSUM detects sustained level shifts and variance changes, complementing STL+MAD
- Configurable delta (default: 0.75 * std) balances sensitivity vs false positives
- Configurable threshold (default: 5 * std) determines when to flag anomalies
- Tracks both positive and negative shifts (s_pos, s_neg)

**Alternatives Considered**:
- Page-Hinkley test: Similar to CUSUM, but CUSUM is more widely understood
- Change point detection (PELT): More complex, CUSUM sufficient for this use case
- Simple threshold: Rejected - doesn't detect gradual shifts

**Implementation Pattern**:
```python
def score_cusum(series: np.ndarray, delta: float = None, threshold: float = None) -> np.ndarray:
    mu = np.mean(series)
    std = np.std(series)
    delta = delta or (std * 0.75)
    threshold = threshold or (std * 5.0)
    
    s_pos = np.zeros_like(series, dtype=float)
    s_neg = np.zeros_like(series, dtype=float)
    scores = np.zeros_like(series, dtype=float)
    
    for i, x in enumerate(series):
        s_pos[i] = max(0, (x - mu - delta) + (s_pos[i-1] if i > 0 else 0))
        s_neg[i] = max(0, (mu - x - delta) + (s_neg[i-1] if i > 0 else 0))
        scores[i] = max(s_pos[i], s_neg[i]) / (threshold or 1e-9)
    
    return scores
```

### 3. Isolation Forest Detector Implementation

**Decision**: Use `sklearn.ensemble.IsolationForest` with contamination ~0.5%

**Rationale**:
- Isolation Forest is efficient for multivariate anomaly detection
- Contamination parameter controls expected anomaly rate (0.5% = 1 in 200 windows)
- Works well with window feature vectors (all metrics combined)
- Returns anomaly scores that can be normalized and thresholded

**Alternatives Considered**:
- One-Class SVM: Rejected - slower and requires more tuning
- Local Outlier Factor (LOF): Rejected - computationally expensive for large datasets
- DBSCAN: Rejected - requires distance metric tuning, Isolation Forest more robust

**Implementation Pattern**:
```python
from sklearn.ensemble import IsolationForest
import numpy as np

def score_isoforest(X: np.ndarray, contamination: float = 0.005) -> np.ndarray:
    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples='auto',
        random_state=42
    )
    model.fit(X)
    scores = -model.score_samples(X)  # Negative because lower = more anomalous
    return (scores - scores.mean()) / (scores.std() or 1e-9)  # Normalize
```

### 4. Database Schema Design

**Decision**: Use PostgreSQL with JSONB for flexible detector params and evidence

**Rationale**:
- PostgreSQL JSONB provides flexibility for detector-specific parameters
- JSONB supports indexing and querying for common fields
- Evidence storage (residuals, changepoints, feature vectors) benefits from JSONB
- Follows existing olorin database patterns (UUID primary keys, timestamps)

**Schema Pattern**:
```sql
CREATE TABLE detectors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stl_mad', 'cusum', 'isoforest', 'rcf', 'matrix_profile')),
  cohort_by JSONB NOT NULL,
  metrics JSONB NOT NULL,
  params JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE detection_runs (
  id UUID PRIMARY KEY,
  detector_id UUID REFERENCES detectors(id),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  window_from TIMESTAMPTZ NOT NULL,
  window_to TIMESTAMPTZ NOT NULL,
  info JSONB
);

CREATE TABLE anomaly_events (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES detection_runs(id),
  detector_id UUID REFERENCES detectors(id),
  cohort JSONB NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  metric TEXT NOT NULL,
  observed DOUBLE PRECISION NOT NULL,
  expected DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warn', 'critical')),
  persisted_n INT DEFAULT 1,
  evidence JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. WebSocket Streaming Pattern

**Decision**: Use FastAPI WebSocket endpoint with async generator pattern

**Rationale**:
- FastAPI WebSocket support provides efficient real-time streaming
- Async generator pattern allows efficient event broadcasting
- Follows existing olorin WebSocket patterns for consistency
- Supports reconnection with last timestamp resume

**Implementation Pattern**:
```python
from fastapi import WebSocket
import asyncio
from datetime import datetime

async def stream_anomalies(websocket: WebSocket, last_timestamp: datetime = None):
    await websocket.accept()
    try:
        async for anomaly in anomaly_event_stream(last_timestamp):
            await websocket.send_json(anomaly.dict())
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))
```

### 6. LangGraph Tools Registration Pattern

**Decision**: Register tools in `tool_registry.py` under 'olorin' category using `_register_tool()` method

**Rationale**:
- Follows existing tool registry pattern for consistency
- 'olorin' category groups Olorin-specific tools together
- Tools become available to all LangGraph agents automatically
- Supports tool discovery and filtering by category

**Implementation Pattern**:
```python
from app.service.agent.tools.tool_registry import tool_registry
from app.service.agent.tools.anomaly_tools.fetch_series import FetchSeriesTool

def _initialize_anomaly_tools():
    """Register anomaly detection tools in LangGraph registry."""
    tool_registry._register_tool(FetchSeriesTool(), 'olorin')
    tool_registry._register_tool(DetectAnomaliesTool(), 'olorin')
    tool_registry._register_tool(ListAnomaliesTool(), 'olorin')
    tool_registry._register_tool(OpenInvestigationTool(), 'olorin')
    tool_registry._register_tool(AttachEvidenceTool(), 'olorin')
```

### 7. Investigation Integration Pattern

**Decision**: Create investigation with merchant_id as primary entity, channel/geo in metadata

**Rationale**:
- Merchant is the primary business entity for fraud investigations
- Channel and geo are contextual attributes, not primary entities
- Matches existing investigation patterns in olorin
- Enables investigation agents to focus on merchant while having context

**Implementation Pattern**:
```python
investigation_params = {
    "entity_type": "merchant_id",
    "entity_id": cohort["merchant_id"],
    "time_range": {
        "start": anomaly.window_start.isoformat(),
        "end": anomaly.window_end.isoformat()
    },
    "metadata": {
        "channel": cohort.get("channel"),
        "geo": cohort.get("geo"),
        "metric": anomaly.metric,
        "score": anomaly.score,
        "severity": anomaly.severity,
        "evidence": anomaly.evidence
    }
}
```

### 8. Scheduled Detection Runs Pattern

**Decision**: Use APScheduler (or existing cron infrastructure) with configurable interval

**Rationale**:
- APScheduler integrates well with FastAPI async applications
- Configurable interval allows tuning per environment
- Supports both scheduled and manual trigger patterns
- Can be disabled/enabled per detector

**Implementation Pattern**:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os

scheduler = AsyncIOScheduler()
detection_interval_minutes = int(os.getenv('ANOMALY_DETECTION_INTERVAL_MINUTES', '15'))

@scheduler.scheduled_job('interval', minutes=detection_interval_minutes)
async def run_scheduled_detections():
    enabled_detectors = await get_enabled_detectors()
    for detector in enabled_detectors:
        await trigger_detection_run(detector.id)
```

### 9. RAG Context Retrieval Pattern

**Decision**: Use existing RAG service (reuse existing retrieval chain)

**Rationale**:
- Maintains consistency with existing investigation workflows
- Leverages tested RAG infrastructure
- Reduces code duplication
- Supports same context retrieval patterns as other investigations

**Implementation Pattern**:
```python
from app.service.rag import retrieve_context  # Existing RAG service

def summarize_node(state: Dict[str, Any]) -> Dict[str, Any]:
    anomaly = state["anomaly"]
    ctx = retrieve_context(anomaly)  # Use existing RAG service
    # ... generate summary with LLM
```

### 10. LLM Provider/Model Selection

**Decision**: Use existing LLM config from investigation system

**Rationale**:
- Consistency with existing investigation summarization
- Leverages existing LLM infrastructure and configuration
- No need for separate LLM setup
- Supports same model selection patterns

**Implementation Pattern**:
```python
from app.service.agent.orchestration.assistant import _get_llm_with_tools  # Existing LLM config

llm = _get_llm_with_tools()  # Uses existing LLM configuration
summary = await llm.ainvoke(build_incident_prompt(anomaly, ctx, series_preview))
```

## Best Practices Applied

### Time Series Analysis
- Use robust methods (STL with robust=True, MAD) for fraud detection
- Handle missing data gracefully (skip windows with insufficient data)
- Apply persistence filters to reduce false positives
- Use hysteresis for threshold crossing to prevent flapping

### Multivariate Detection
- Normalize features before multivariate analysis
- Use contamination parameter to control false positive rate
- Combine univariate and multivariate scores for comprehensive detection

### Performance Optimization
- Batch process cohorts in parallel where possible
- Use database indexes on frequently queried fields (detector_id, window_start, severity)
- Cache detector configurations to avoid repeated database queries
- Stream anomaly events via WebSocket for real-time updates

### Error Handling
- Fail fast on configuration errors (invalid detector params)
- Log all detection run failures with context
- Allow partial success (some cohorts succeed, others fail)
- Retry transient failures (database connection, Snowflake timeouts)

## Dependencies & Versions

**Backend**:
- statsmodels >= 0.14.0 (STL decomposition)
- scikit-learn >= 1.3.0 (Isolation Forest)
- pandas >= 2.0.0 (data manipulation)
- numpy >= 1.24.0 (numerical operations)
- apscheduler >= 3.10.0 (scheduled tasks, if not using existing cron)

**Frontend**:
- No new dependencies (uses existing React, TypeScript, Tailwind)

## Open Questions Resolved

- ✅ **Q1**: RAG context retrieval → Use existing RAG service
- ✅ **Q2**: LLM provider/model → Use existing LLM config
- ✅ **Q3**: Sumo Logic enrichment → Optional, can be added later if needed
- ✅ **Q4**: Detection run schedule → Configurable interval (default 15 min) + manual trigger
- ✅ **Q5**: Severity thresholds → Configurable per detector with global defaults
- ✅ **Q6**: Anomaly-to-investigation mapping → merchant_id primary, channel/geo in metadata
- ✅ **Q7**: Evidence format → Metadata (JSONB) + evidence items (visualizations)

## Next Steps

1. Generate data model documentation (data-model.md)
2. Create API contracts (contracts/api.yaml, contracts/websocket.md)
3. Write quickstart guide (quickstart.md)
4. Update agent context with new technologies

