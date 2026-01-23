# Data Model: Investigation Reports Integration

**Feature**: `002-investigation-reports-integration`
**Created**: 2025-01-11
**Status**: Planning

## Overview

This document defines the data models, database schema, and TypeScript types for the Investigation Reports Integration feature.

## Database Schema

### Table: investigation_reports

Primary table storing generated investigation reports with metadata.

```sql
CREATE TABLE investigation_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Investigation Link
    investigation_id VARCHAR(255) NOT NULL,
    investigation_folder TEXT NOT NULL,

    -- Report Metadata
    title VARCHAR(500) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'investigation_comprehensive',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Content
    html_content TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Risk Metrics
    risk_score DECIMAL(5,2),
    risk_level VARCHAR(20),

    -- Investigation Metrics
    agents_count INTEGER DEFAULT 0,
    tools_count INTEGER DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    duration_seconds DECIMAL(10,2),

    -- Ownership & Timestamps
    owner VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    generated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- File Info
    file_size_bytes BIGINT,
    pdf_url TEXT,

    -- Indexes for Performance
    CONSTRAINT investigation_reports_status_check
        CHECK (status IN ('draft', 'generating', 'ready', 'failed')),
    CONSTRAINT investigation_reports_risk_level_check
        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT investigation_reports_risk_score_check
        CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Indexes
CREATE INDEX idx_investigation_reports_investigation_id
    ON investigation_reports(investigation_id);
CREATE INDEX idx_investigation_reports_owner
    ON investigation_reports(owner);
CREATE INDEX idx_investigation_reports_status
    ON investigation_reports(status);
CREATE INDEX idx_investigation_reports_risk_level
    ON investigation_reports(risk_level);
CREATE INDEX idx_investigation_reports_created_at
    ON investigation_reports(created_at DESC);
CREATE INDEX idx_investigation_reports_generated_at
    ON investigation_reports(generated_at DESC);

-- Full-text search on metadata
CREATE INDEX idx_investigation_reports_metadata_gin
    ON investigation_reports USING GIN(metadata);
```

### Table: investigation_report_sections

Stores individual sections of investigation reports for lazy loading and granular access.

```sql
CREATE TABLE investigation_report_sections (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key
    report_id UUID NOT NULL REFERENCES investigation_reports(id) ON DELETE CASCADE,

    -- Section Info
    section_type VARCHAR(100) NOT NULL,
    section_title VARCHAR(255) NOT NULL,
    render_order INTEGER NOT NULL DEFAULT 0,

    -- Content
    content_html TEXT,
    data_json JSONB,

    -- Status
    is_rendered BOOLEAN DEFAULT FALSE,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT investigation_report_sections_section_type_check
        CHECK (section_type IN (
            'executive_summary',
            'risk_dashboard',
            'llm_timeline',
            'flow_graph',
            'explanations',
            'tools_analysis',
            'journey_visualization',
            'langgraph_visualization'
        ))
);

-- Indexes
CREATE INDEX idx_investigation_report_sections_report_id
    ON investigation_report_sections(report_id);
CREATE INDEX idx_investigation_report_sections_section_type
    ON investigation_report_sections(section_type);
CREATE UNIQUE INDEX idx_investigation_report_sections_unique
    ON investigation_report_sections(report_id, section_type);
```

### Table: report_generation_jobs

Tracks background jobs for report generation with status and progress.

```sql
CREATE TABLE report_generation_jobs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links
    investigation_id VARCHAR(255) NOT NULL,
    report_id UUID REFERENCES investigation_reports(id) ON DELETE SET NULL,

    -- Job Info
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    triggered_by VARCHAR(255) NOT NULL,

    -- Progress
    progress_percentage INTEGER DEFAULT 0,
    current_step VARCHAR(255),

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT report_generation_jobs_status_check
        CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT report_generation_jobs_trigger_type_check
        CHECK (trigger_type IN ('manual', 'automatic', 'scheduled')),
    CONSTRAINT report_generation_jobs_progress_check
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Indexes
CREATE INDEX idx_report_generation_jobs_investigation_id
    ON report_generation_jobs(investigation_id);
CREATE INDEX idx_report_generation_jobs_status
    ON report_generation_jobs(status);
CREATE INDEX idx_report_generation_jobs_created_at
    ON report_generation_jobs(created_at DESC);
```

## Pydantic Schemas (Backend)

### InvestigationReport Schema

```python
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from enum import Enum

class ReportStatus(str, Enum):
    """Report generation status."""
    DRAFT = "draft"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"

class RiskLevel(str, Enum):
    """Risk level classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InvestigationReportBase(BaseModel):
    """Base schema for investigation reports."""
    investigation_id: str = Field(..., description="Investigation identifier")
    investigation_folder: str = Field(..., description="Path to investigation folder")
    title: str = Field(..., description="Report title")
    report_type: str = Field(default="investigation_comprehensive")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    owner: str = Field(..., description="Report owner")

class InvestigationReportCreate(InvestigationReportBase):
    """Schema for creating investigation report."""
    pass

class InvestigationReportUpdate(BaseModel):
    """Schema for updating investigation report."""
    title: Optional[str] = None
    status: Optional[ReportStatus] = None
    html_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    agents_count: Optional[int] = None
    tools_count: Optional[int] = None
    evidence_count: Optional[int] = None
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None
    pdf_url: Optional[str] = None

    @validator('risk_score')
    def validate_risk_score(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Risk score must be between 0 and 100')
        return v

class InvestigationReportResponse(InvestigationReportBase):
    """Schema for investigation report response."""
    id: str
    status: ReportStatus
    html_content: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    agents_count: int = 0
    tools_count: int = 0
    evidence_count: int = 0
    duration_seconds: Optional[float] = None
    generated_at: Optional[datetime] = None
    generated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    file_size_bytes: Optional[int] = None
    pdf_url: Optional[str] = None

    class Config:
        from_attributes = True

class InvestigationReportListResponse(BaseModel):
    """Schema for paginated investigation reports list."""
    reports: List[InvestigationReportResponse]
    total: int
    page: int
    limit: int
    pages: int

class InvestigationReportMetadata(BaseModel):
    """Schema for investigation report metadata."""
    scenario: Optional[str] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    mode: Optional[str] = None  # LIVE, MOCK, DEMO
    timestamp: Optional[str] = None
    agents_executed: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    critical_findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
```

### Report Section Schemas

```python
class SectionType(str, Enum):
    """Report section types."""
    EXECUTIVE_SUMMARY = "executive_summary"
    RISK_DASHBOARD = "risk_dashboard"
    LLM_TIMELINE = "llm_timeline"
    FLOW_GRAPH = "flow_graph"
    EXPLANATIONS = "explanations"
    TOOLS_ANALYSIS = "tools_analysis"
    JOURNEY_VISUALIZATION = "journey_visualization"
    LANGGRAPH_VISUALIZATION = "langgraph_visualization"

class InvestigationReportSectionBase(BaseModel):
    """Base schema for report sections."""
    section_type: SectionType
    section_title: str
    render_order: int = 0

class InvestigationReportSectionCreate(InvestigationReportSectionBase):
    """Schema for creating report section."""
    report_id: str
    content_html: Optional[str] = None
    data_json: Optional[Dict[str, Any]] = None

class InvestigationReportSectionResponse(InvestigationReportSectionBase):
    """Schema for report section response."""
    id: str
    report_id: str
    content_html: Optional[str] = None
    data_json: Optional[Dict[str, Any]] = None
    is_rendered: bool = False
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

### Report Generation Job Schemas

```python
class JobStatus(str, Enum):
    """Report generation job status."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TriggerType(str, Enum):
    """Job trigger type."""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    SCHEDULED = "scheduled"

class ReportGenerationJobCreate(BaseModel):
    """Schema for creating report generation job."""
    investigation_id: str
    trigger_type: TriggerType = TriggerType.MANUAL
    triggered_by: str

class ReportGenerationJobResponse(BaseModel):
    """Schema for report generation job response."""
    id: str
    investigation_id: str
    report_id: Optional[str] = None
    status: JobStatus
    trigger_type: TriggerType
    triggered_by: str
    progress_percentage: int = 0
    current_step: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

## TypeScript Types (Frontend)

### Investigation Report Types

```typescript
// src/microservices/reporting/types/investigation-reports.ts

export type ReportStatus = 'draft' | 'generating' | 'ready' | 'failed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SectionType =
  | 'executive_summary'
  | 'risk_dashboard'
  | 'llm_timeline'
  | 'flow_graph'
  | 'explanations'
  | 'tools_analysis'
  | 'journey_visualization'
  | 'langgraph_visualization';

export interface InvestigationReportMetadata {
  scenario?: string;
  entity_id?: string;
  entity_type?: string;
  mode?: 'LIVE' | 'MOCK' | 'DEMO';
  timestamp?: string;
  agents_executed: string[];
  tools_used: string[];
  critical_findings: string[];
  recommendations: string[];
}

export interface InvestigationReport {
  id: string;
  investigation_id: string;
  investigation_folder: string;
  title: string;
  report_type: string;
  status: ReportStatus;
  html_content?: string;
  metadata: InvestigationReportMetadata;
  risk_score?: number;
  risk_level?: RiskLevel;
  agents_count: number;
  tools_count: number;
  evidence_count: number;
  duration_seconds?: number;
  owner: string;
  generated_at?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
  file_size_bytes?: number;
  pdf_url?: string;
}

export interface InvestigationReportSection {
  id: string;
  report_id: string;
  section_type: SectionType;
  section_title: string;
  render_order: number;
  content_html?: string;
  data_json?: any;
  is_rendered: boolean;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationJob {
  id: string;
  investigation_id: string;
  report_id?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  trigger_type: 'manual' | 'automatic' | 'scheduled';
  triggered_by: string;
  progress_percentage: number;
  current_step?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface InvestigationReportListResponse {
  reports: InvestigationReport[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface InvestigationReportFilters {
  investigation_id?: string;
  scenario?: string;
  risk_level?: RiskLevel;
  date_range?: {
    start: string;
    end: string;
  };
  owner?: string;
  status?: ReportStatus;
  search?: string;
}
```

### Risk Score Types

```typescript
// Risk score progression data structure
export interface RiskScoreEntry {
  timestamp: string;
  risk_score: number;
  risk_factors: string[];
  confidence: number;
  category: string;
  details: Record<string, any>;
}

export interface RiskCategoryScore {
  category: string;
  score: number;
  confidence: number;
  factors: string[];
}

export interface RiskDashboardData {
  final_score: number;
  risk_level: RiskLevel;
  score_progression: RiskScoreEntry[];
  category_scores: RiskCategoryScore[];
  volatility: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
```

### LLM Thought Process Types

```typescript
// LLM agent reasoning data structure
export interface LLMThoughtProcess {
  agent_name: string;
  timestamp: string;
  question: string;
  evidence_considered: string[];
  reasoning_steps: ReasoningStep[];
  confidence_level: number;
  conclusion: string;
  alternative_scenarios?: string[];
  key_insights: string[];
}

export interface ReasoningStep {
  step_number: number;
  description: string;
  evidence_used: string[];
  intermediate_conclusion: string;
  confidence: number;
}

export interface AgentExplanation {
  agent_id: string;
  agent_name: string;
  execution_time: string;
  thought_processes: LLMThoughtProcess[];
  final_assessment: string;
  risk_contribution: number;
}
```

### Agent & Tool Metrics Types

```typescript
// Agent performance data structure
export interface AgentMetrics {
  agent_name: string;
  execution_count: number;
  success_rate: number;
  average_duration_ms: number;
  total_tokens_used: number;
  error_count: number;
  risk_contributions: number[];
}

export interface ToolMetrics {
  tool_name: string;
  execution_count: number;
  success_rate: number;
  average_duration_ms: number;
  error_count: number;
  data_points_collected: number;
}

export interface ToolsAnalysisData {
  agents: AgentMetrics[];
  tools: ToolMetrics[];
  total_execution_time_ms: number;
  total_api_calls: number;
  total_tokens_consumed: number;
}
```

## Data Flow

### Report Generation Flow

```
Investigation Completion
    ↓
Event: "investigation.completed"
    ↓
Auto-trigger Report Generation Job
    ↓
[Job Status: queued]
    ↓
Background Worker picks up job
    ↓
[Job Status: processing]
    ↓
1. Find Investigation Folder
    ↓
2. Extract Data from Files:
   - metadata.json
   - structured_activities.jsonl
   - journey_tracking.json
   - agent_outputs/*.json
    ↓
3. Generate Report Sections (7):
   - Executive Summary
   - Risk Dashboard
   - LLM Timeline
   - Flow Graph
   - Explanations
   - Tools Analysis
   - Journey Visualization
    ↓
4. Combine Sections into HTML
    ↓
5. Persist to Database:
   - investigation_reports
   - investigation_report_sections
    ↓
[Job Status: completed]
    ↓
WebSocket Notification to Frontend
    ↓
User Views Report
```

### Report Retrieval Flow

```
Frontend Request: GET /api/v1/reports/investigations/{id}
    ↓
Backend: Query database
    ↓
Check if report exists
    ├─ Yes: Return cached report
    │   ↓
    │   Frontend renders HTML content
    │
    └─ No: Return 404
        ↓
        Frontend offers "Generate Report" option
```

### Section Lazy Loading Flow

```
Report Viewer Loads
    ↓
Load Executive Summary (above fold)
    ↓
User scrolls down
    ↓
Trigger lazy load for next section
    ↓
GET /api/v1/reports/investigations/{id}/sections/{section_type}
    ↓
Backend: Return section HTML + data
    ↓
Frontend: Inject into DOM
    ↓
Repeat for remaining sections
```

## Data Validation Rules

### Report Level Validation

- `investigation_id`: Required, max 255 chars, alphanumeric + hyphens
- `title`: Required, max 500 chars
- `risk_score`: Optional, 0-100 range, 2 decimal places
- `risk_level`: Must match score: low (0-39), medium (40-59), high (60-79), critical (80-100)
- `status`: Must be valid enum value
- `html_content`: Max 10MB (enforced at application level)
- `metadata`: Valid JSON, max 1MB

### Section Level Validation

- `section_type`: Required, must be valid enum
- `report_id`: Required, must reference existing report
- Unique constraint: (report_id, section_type) - one section of each type per report
- `render_order`: 0-7 (maps to 7 section types)
- `data_json`: Valid JSON, max 5MB per section

### Job Level Validation

- `progress_percentage`: 0-100 integer
- `retry_count`: Cannot exceed `max_retries`
- `status`: State transitions enforced: queued → processing → completed/failed
- `completed_at`: Must be after `started_at`

## Storage Estimates

### Per Investigation Report

- **Metadata**: ~2KB (JSON)
- **HTML Content**: ~500KB - 5MB (depends on investigation size)
- **Sections Data**: ~200KB per section × 7 = ~1.4MB
- **Total per report**: ~2-7MB average

### Database Growth Projections

Assuming 100 investigations per month with reports:

- **Monthly**: 100 reports × 5MB avg = 500MB
- **Yearly**: 500MB × 12 = 6GB
- **5 Years**: 30GB (without compression or archival)

With compression (70% reduction):
- **5 Years**: ~9GB

**Mitigation**: Implement archival policy for reports older than 1 year to blob storage.

## API Response Examples

### GET /api/v1/reports/investigations/{investigation_id}

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "investigation_id": "inv-2025-01-11-fraud-001",
  "investigation_folder": "/logs/investigations/LIVE_inv-2025-01-11-fraud-001_20250111_143022/",
  "title": "Fraud Investigation Report - Account Takeover Scenario",
  "report_type": "investigation_comprehensive",
  "status": "ready",
  "metadata": {
    "scenario": "account_takeover",
    "entity_id": "user-12345",
    "entity_type": "email",
    "mode": "LIVE",
    "timestamp": "2025-01-11T14:30:22Z",
    "agents_executed": ["device_agent", "location_agent", "network_agent", "logs_agent"],
    "tools_used": ["splunk_query", "geo_lookup", "device_fingerprint"],
    "critical_findings": [
      "Device fingerprint mismatch detected",
      "Login from suspicious location",
      "Unusual network characteristics"
    ],
    "recommendations": [
      "Require additional authentication",
      "Block suspicious IP addresses",
      "Monitor account activity"
    ]
  },
  "risk_score": 87.5,
  "risk_level": "critical",
  "agents_count": 4,
  "tools_count": 12,
  "evidence_count": 23,
  "duration_seconds": 45.7,
  "owner": "analyst@olorin.com",
  "generated_at": "2025-01-11T14:32:15Z",
  "generated_by": "system",
  "created_at": "2025-01-11T14:32:15Z",
  "updated_at": "2025-01-11T14:32:15Z",
  "file_size_bytes": 3145728,
  "pdf_url": null
}
```

### POST /api/v1/reports/investigations/{investigation_id}/generate

Request:
```json
{
  "trigger_type": "manual",
  "options": {
    "include_sections": ["all"],
    "format": "html"
  }
}
```

Response:
```json
{
  "job_id": "job-550e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "investigation_id": "inv-2025-01-11-fraud-001",
  "estimated_completion_seconds": 30,
  "created_at": "2025-01-11T14:35:00Z"
}
```

---

**Document Status**: Draft - Ready for Review
**Next Steps**: Review data model, validate schema design, approve before implementation
