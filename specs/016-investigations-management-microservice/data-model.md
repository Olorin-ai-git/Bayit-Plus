# Data Model: Investigations Management Microservice

**Phase**: 1 - Design  
**Date**: 2025-01-31  
**Status**: ✅ Complete

## Overview

This document defines the data models, types, and structures used by the Investigations Management Microservice. The models align with existing backend API contracts and extend them for frontend-specific needs.

## Core Entities

### Investigation

Represents a fraud investigation case with all its metadata, status, and execution details.

```typescript
interface Investigation {
  // Identity
  id: string;                    // Unique investigation ID (UUID)
  name: string;                   // Investigation name/title
  owner: string;                  // Owner/creator username
  
  // Metadata
  description?: string;           // Optional description
  status: InvestigationStatus;   // Current status
  created: string;                // ISO 8601 timestamp
  updated: string;                // ISO 8601 timestamp
  
  // Configuration
  riskModel?: string;            // Risk model version (e.g., "v3.2")
  sources: string[];              // Data sources (e.g., ["SIEM", "EDR"])
  tools: string[];               // Investigation tools (e.g., ["YARA", "Sandbox"])
  from?: string;                 // Start time (ISO 8601)
  to?: string;                   // End time (ISO 8601)
  
  // Progress
  progress: number;              // Overall progress (0-100)
  phases: InvestigationPhase[];  // Execution phases
  
  // Backend fields (from API)
  entity_id?: string;            // Entity being investigated
  entity_type?: string;          // Entity type (user_id, email, etc.)
  overall_risk_score?: number;   // Computed risk score (0-1)
}
```

### InvestigationStatus

Enumeration of possible investigation statuses.

```typescript
type InvestigationStatus = 
  | 'pending'      // Created but not started
  | 'in-progress'  // Currently executing
  | 'completed'   // Successfully finished
  | 'failed'       // Execution failed
  | 'archived';    // Archived/deleted
```

### InvestigationPhase

Represents a phase in the investigation execution workflow.

```typescript
interface InvestigationPhase {
  name: string;                   // Phase name (e.g., "Initialization")
  status: PhaseStatus;           // Phase status
  pct: number;                   // Phase progress (0-100)
  started?: string;              // Start timestamp (ISO 8601)
  ended?: string;                // End timestamp (ISO 8601)
  summary?: string;              // Phase summary/description
}

type PhaseStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed';
```

### ActivityLogEntry

Represents an event in the activity log for audit and debugging.

```typescript
interface ActivityLogEntry {
  time: string;                  // ISO 8601 timestamp
  text: string;                   // Event description
  source: string;                 // Event source (e.g., "ui", "engine", "export")
}
```

## Request/Response Models

### CreateInvestigationRequest

Request model for creating a new investigation.

```typescript
interface CreateInvestigationRequest {
  name: string;                   // Required
  owner: string;                  // Required
  description?: string;
  riskModel?: string;
  sources?: string[];
  tools?: string[];
  from?: string;                  // ISO 8601
  to?: string;                    // ISO 8601
  status?: InvestigationStatus;  // Default: 'pending'
  autoRun?: boolean;              // Auto-start after creation
}
```

### UpdateInvestigationRequest

Request model for updating an existing investigation.

```typescript
interface UpdateInvestigationRequest {
  name?: string;
  owner?: string;
  description?: string;
  status?: InvestigationStatus;
  riskModel?: string;
  sources?: string[];
  tools?: string[];
  from?: string;
  to?: string;
}
```

### InvestigationListResponse

Response model for listing investigations.

```typescript
interface InvestigationListResponse {
  investigations: Investigation[];
  total: number;
  page?: number;
  pageSize?: number;
}
```

## Frontend-Specific Models

### InvestigationFilters

Filter criteria for investigation list.

```typescript
interface InvestigationFilters {
  searchQuery?: string;           // Search by name/description
  status?: InvestigationStatus;  // Filter by status
  owner?: string;                 // Filter by owner
  tab?: InvestigationTab;        // Tab-based filter
}

type InvestigationTab = 
  | 'all'
  | 'mine'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'archived';
```

### InvestigationFormData

Form data structure for create/edit forms.

```typescript
interface InvestigationFormData {
  name: string;
  owner: string;
  description: string;
  riskModel: string;
  sources: string[];             // Selected source chips
  tools: string[];               // Selected tool chips
  from: string;                  // datetime-local format
  to: string;                    // datetime-local format
  status: InvestigationStatus;
  autoRun: boolean;
}
```

### ExportData

Structure for JSON export/import.

```typescript
interface ExportData {
  version: string;                // Export format version
  exportedAt: string;            // ISO 8601 timestamp
  investigations: Investigation[];
}
```

## Constants & Enums

### Default Sources

```typescript
const DEFAULT_SOURCES = [
  'SIEM',
  'EDR',
  'Cloud',
  'Identity',
  'Payments'
] as const;
```

### Default Tools

```typescript
const DEFAULT_TOOLS = [
  'YARA',
  'Sandbox',
  'Graph',
  'LLM',
  'Risk'
] as const;
```

### Risk Models

```typescript
const RISK_MODELS = [
  'v3.2',
  'v3.1',
  'v2.9'
] as const;
```

### Phase Templates

Default phase structure for new investigations.

```typescript
const DEFAULT_PHASES: InvestigationPhase[] = [
  {
    name: 'Initialization',
    status: 'completed',
    pct: 100,
    started: new Date().toISOString(),
    ended: new Date().toISOString(),
    summary: 'Preparing environment and validating settings'
  },
  {
    name: 'Data Collection',
    status: 'in-progress',
    pct: 0,
    started: new Date().toISOString(),
    summary: 'Gathering data from configured sources'
  },
  {
    name: 'Tool Execution',
    status: 'pending',
    pct: 0,
    summary: 'Running selected investigation tools'
  },
  {
    name: 'Analysis',
    status: 'pending',
    pct: 0,
    summary: 'Analyzing collected data and generating insights'
  },
  {
    name: 'Finalization',
    status: 'pending',
    pct: 0,
    summary: 'Compiling report and artifacts'
  }
];
```

## Data Transformations

### Backend to Frontend

Transform backend API response to frontend model.

```typescript
function transformBackendInvestigation(backend: BackendInvestigation): Investigation {
  return {
    id: backend.id,
    name: backend.name || `Investigation ${backend.id}`,
    owner: backend.owner || 'unknown',
    description: backend.description,
    status: mapBackendStatus(backend.status),
    created: backend.created_at || backend.created,
    updated: backend.updated_at || backend.updated,
    riskModel: backend.risk_model,
    sources: backend.sources || [],
    tools: backend.tools || [],
    from: backend.from || backend.time_range?.start,
    to: backend.to || backend.time_range?.end,
    progress: backend.progress || 0,
    phases: backend.phases || DEFAULT_PHASES,
    entity_id: backend.entity_id,
    entity_type: backend.entity_type,
    overall_risk_score: backend.overall_risk_score
  };
}
```

### Frontend to Backend

Transform frontend form data to backend API request.

```typescript
function transformToBackendRequest(formData: InvestigationFormData): CreateInvestigationRequest {
  return {
    name: formData.name,
    owner: formData.owner,
    description: formData.description || undefined,
    riskModel: formData.riskModel,
    sources: formData.sources,
    tools: formData.tools,
    from: formData.from ? new Date(formData.from).toISOString() : undefined,
    to: formData.to ? new Date(formData.to).toISOString() : undefined,
    status: formData.status,
    autoRun: formData.autoRun
  };
}
```

## Validation Rules

### Investigation Name
- Required
- Max length: 80 characters
- Cannot be empty or whitespace only

### Owner
- Required
- Format: alphanumeric with underscores (e.g., "gil_klainert")
- Max length: 50 characters

### Description
- Optional
- Max length: 240 characters

### Time Range
- `from` must be before `to`
- Both must be valid ISO 8601 dates
- Cannot be in the future (for `to`)

### Sources & Tools
- Arrays of strings
- Must select at least one source
- Must select at least one tool

## State Management

### Local State (React Hooks)

```typescript
interface InvestigationsState {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  filters: InvestigationFilters;
  isLoading: boolean;
  error: string | null;
  realtimeEnabled: boolean;
  activityLog: ActivityLogEntry[];
}
```

### Service Layer State

The service layer manages:
- API request/response caching
- Optimistic updates
- Error retry logic
- Real-time polling state

## Data Persistence

### Backend Storage
- PostgreSQL database via FastAPI
- Investigation records persisted in `investigations` table
- Activity log stored separately (if backend supports)

### Frontend Storage
- No local persistence required (all data from backend)
- Optional: localStorage for user preferences (filters, realtime toggle)

## Migration & Compatibility

### Version Handling
- Export format includes version field
- Import validates version compatibility
- Backward compatibility for older export formats

### Data Migration
- None required (new microservice)
- Backend API already supports required fields

