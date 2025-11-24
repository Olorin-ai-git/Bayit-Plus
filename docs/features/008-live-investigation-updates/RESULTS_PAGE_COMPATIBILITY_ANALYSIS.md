# Results Page Compatibility Analysis

## Executive Summary

The Results Page has **critical compatibility issues** with server endpoints:

1. ❌ **Not fetching real data** - Uses hardcoded mock data instead of API calls
2. ❌ **Field name mismatch** - Accesses `overall_risk_score` (snake_case) from wrong source
3. ❌ **Missing data fetching hook** - No proper hook to fetch results from `/investigations/{id}/results`
4. ⚠️ **Data transformation** - BaseApiService will transform snake_case → camelCase, but ResultsPage expects snake_case

## Backend Endpoint Analysis

### Endpoint: `GET /api/investigations/{investigation_id}/results`

**Location**: `olorin-server/app/router/hybrid_graph_investigations_router.py:142`

**Response Schema**: `InvestigationResultsSchema` (snake_case)
```python
{
  "investigation_id": str,
  "overall_risk_score": float,  # 0-100
  "status": "completed" | "failed",
  "started_at": datetime,
  "completed_at": datetime,
  "duration_ms": int,
  "findings": [FindingSchema],  # snake_case fields
  "evidence": [EvidenceSchema],  # snake_case fields
  "agent_decisions": [AgentDecisionSchema],  # snake_case fields
  "summary": str,
  "metadata": InvestigationMetadataSchema  # snake_case fields
}
```

**FindingSchema** (snake_case):
```python
{
  "finding_id": str,
  "severity": "critical" | "high" | "medium" | "low",
  "domain": "device" | "location" | "network" | "logs" | "risk",
  "title": str,
  "description": str,
  "affected_entities": List[str],
  "evidence_ids": List[str],
  "confidence_score": float,  # 0-1
  "timestamp": datetime,
  "metadata": Dict[str, Any]
}
```

## Frontend Current State

### ResultsPage.tsx Issues

1. **Line 55**: `investigation?.results?.overall_risk_score` 
   - ❌ Accessing from `investigation.results` which may not exist
   - ❌ Using snake_case field name (should be camelCase after BaseApiService transformation)

2. **Lines 60-81**: Hardcoded mock findings
   - ❌ Not fetching from API
   - ❌ Field structure doesn't match backend response

3. **Lines 83-97**: Hardcoded mock recommendations
   - ❌ Not from backend
   - ❌ No backend endpoint for recommendations

4. **Line 99**: `useResultsData` hook
   - ⚠️ Only transforms mock data, doesn't fetch from API

### Frontend Type Definitions

**hybridGraphTypes.ts** - `InvestigationResults` (snake_case):
```typescript
interface InvestigationResults {
  investigation_id: string;
  overall_risk_score: number;  // 0-100
  status: "completed" | "failed";
  started_at: string;  // ISO 8601
  completed_at: string;  // ISO 8601
  duration_ms: number;
  findings: Finding[];  // snake_case fields
  evidence: Evidence[];  // snake_case fields
  agent_decisions: AgentDecision[];  // snake_case fields
  summary: string;
  metadata: InvestigationMetadata;  // snake_case fields
}
```

**Note**: This interface uses snake_case because it's for hybrid graph, but BaseApiService will transform it to camelCase.

## Data Transformation Flow

### Current Flow (Broken)
```
ResultsPage → investigation.results.overall_risk_score (doesn't exist)
           → Hardcoded mock data
```

### Expected Flow (After Fix)
```
Backend (snake_case)
  ↓
BaseApiService.get() → snakeToCamel() → camelCase
  ↓
hybridGraphInvestigationService.getInvestigationResults()
  ↓
InvestigationResults (camelCase after transformation)
  ↓
ResultsPage → Uses camelCase fields
```

## Compatibility Issues Found

### 1. Field Name Mismatches

| Backend (snake_case) | After BaseApiService (camelCase) | Frontend Usage |
|---------------------|----------------------------------|----------------|
| `overall_risk_score` | `overallRiskScore` | ❌ Using `overall_risk_score` |
| `investigation_id` | `investigationId` | ❌ Not used |
| `started_at` | `startedAt` | ❌ Not used |
| `completed_at` | `completedAt` | ❌ Not used |
| `duration_ms` | `durationMs` | ❌ Not used |
| `finding_id` | `findingId` | ❌ Using `id` |
| `affected_entities` | `affectedEntities` | ❌ Using `affectedEntities` (correct) |
| `evidence_ids` | `evidenceIds` | ❌ Not used |
| `confidence_score` | `confidenceScore` | ❌ Not used |
| `agent_decisions` | `agentDecisions` | ❌ Not used |

### 2. Missing API Integration

- ❌ No hook to fetch results from `/investigations/{id}/results`
- ❌ `useResultsData` doesn't fetch from API
- ❌ ResultsPage doesn't call `hybridGraphInvestigationService.getInvestigationResults()`

### 3. Data Structure Mismatches

**Backend Finding**:
```python
{
  "finding_id": str,
  "severity": str,
  "domain": str,
  "title": str,
  "description": str,
  "affected_entities": List[str],
  "evidence_ids": List[str],
  "confidence_score": float,
  "timestamp": datetime,
  "metadata": Dict
}
```

**Frontend Mock Finding**:
```typescript
{
  id: string,  // Should be findingId after transformation
  severity: string,
  category: string,  // Backend uses "domain"
  title: string,
  description: string,
  affectedEntities: string[],  // Correct
  affectedEntities: string[],  // Also used
  timestamp: string
}
```

## Required Fixes

### 1. Create Results Fetching Hook

Create `useInvestigationResults.ts`:
```typescript
export function useInvestigationResults(investigationId: string | undefined) {
  const [results, setResults] = useState<InvestigationResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!investigationId) {
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const data = await hybridGraphInvestigationService.getInvestigationResults(investigationId);
        setResults(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch results'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [investigationId]);

  return { results, isLoading, error };
}
```

### 2. Fix ResultsPage.tsx

- Replace hardcoded data with API fetch
- Use camelCase field names after BaseApiService transformation
- Map backend findings to frontend format
- Handle loading and error states

### 3. Fix Field Name Access

After BaseApiService transformation:
- `overall_risk_score` → `overallRiskScore`
- `finding_id` → `findingId`
- `affected_entities` → `affectedEntities`
- `evidence_ids` → `evidenceIds`
- `confidence_score` → `confidenceScore`
- `started_at` → `startedAt`
- `completed_at` → `completedAt`
- `duration_ms` → `durationMs`

### 4. Verify BaseApiService Transformation

Ensure `hybridGraphInvestigationService` extends `BaseApiService` and uses `this.get<T>()` which automatically transforms snake_case → camelCase.

## Testing Checklist

- [ ] ResultsPage fetches data from `/investigations/{id}/results`
- [ ] Field names use camelCase after transformation
- [ ] Findings are mapped correctly from backend format
- [ ] Loading states are handled
- [ ] Error states are handled
- [ ] Empty results are handled
- [ ] All field mappings are correct

## Priority

**CRITICAL** - Results page is completely non-functional with real data.

